/* eslint-disable @typescript-eslint/no-explicit-any */
import {setGlobalOptions} from "firebase-functions/v2";
import {onCall, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {sendMailNotification} from "./utils/adminNotify";
import {defineSecret} from "firebase-functions/params";

const gmailUser = defineSecret("GMAIL_USER");
const gmailPass = defineSecret("GMAIL_PASS");

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({
  region: "asia-northeast3",
  maxInstances: 10,
});

export const triggerAdminNotification = onCall({
  region: "asia-northeast3",
  cors: true,
  secrets: [gmailUser, gmailPass],
}, async (request: CallableRequest<any>) => {
  process.env.GMAIL_USER = gmailUser.value();
  process.env.GMAIL_PASS = gmailPass.value();
  const {type, payload} = request.data;
  try {
    await sendMailNotification(type, payload);
    return {success: true};
  } catch (error) {
    console.error("알림 전송 에러:", error);
    return {success: false, error: "알림 전송 실패"};
  }
});

const CONTACT_EVENT_FIELDS: Record<string, string> = {
  reveal: "contactRevealCount",
  copy: "contactCopyCount",
  call: "contactCallCount",
};

export const logTeamContactEvent = onCall({
  region: "asia-northeast3",
  cors: true,
}, async (request: CallableRequest<any>) => {
  const {teamId, type} = request.data ?? {};
  const field = typeof type === "string" ?
    CONTACT_EVENT_FIELDS[type] : undefined;
  if (!teamId || typeof teamId !== "string" || !field) {
    return {success: false, error: "잘못된 요청"};
  }
  try {
    await admin.firestore().collection("ministryTeams").doc(teamId).update({
      [field]: admin.firestore.FieldValue.increment(1),
      lastContactAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {success: true};
  } catch (error) {
    console.error("문의 이벤트 기록 에러:", error);
    return {success: false, error: "기록 실패"};
  }
});

export {
  registerPaymentAndSchedule,
  scheduledBalancePayment,
} from "./paymentHandler";

export {venuePreview} from "./venuePreview";
export {teamsPreview} from "./teamsPreview";
export {teamRegisterPreview} from "./teamRegisterPreview";
export {teamDetailPreview} from "./teamDetailPreview";
export {bandRoomPreview} from "./bandRoomPreview";
export {programsPreview} from "./programsPreview";

export {
  adminSetUserDisabled,
  adminDeleteUserAccount,
  adminListUsers,
} from "./adminUsers";

export {
  verifyBandRoomPayment,
  expireStaleBandRoomBookings,
} from "./bandRoomPaymentHandler";

// 단체티 업체(마이페이지 "티셔츠 관리자" 탭)가 본인 상품을 직접 등록/수정/삭제할 수 있게
// 하는 서버측 처리. Firestore 규칙이 이 저장소 밖에서 관리되고 있어(firestore.rules 파일
// 없음) 클라이언트에서 바로 updateDoc을 허용해도 되는지 확인할 수 없으므로, 소유권
// (applicantUid) 검사를 서버에서 직접 하고 Admin SDK로 대신 써준다 - 규칙 설정과 무관하게
// 항상 동작한다.
const MAX_MY_SHIRT_PRODUCTS = 30;

export const manageMyShirtProduct = onCall({
  region: "asia-northeast3",
  cors: true,
}, async (request: CallableRequest<any>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    return {success: false, error: "로그인이 필요합니다."};
  }

  const {shirtId, action, product, productId} = request.data ?? {};
  if (typeof shirtId !== "string" || !shirtId) {
    return {success: false, error: "잘못된 요청입니다."};
  }

  const shirtRef = admin.firestore().collection("groupShirts").doc(shirtId);

  try {
    const snap = await shirtRef.get();
    if (!snap.exists) {
      return {success: false, error: "업체 정보를 찾을 수 없습니다."};
    }
    const data = snap.data() || {};
    if (data.applicantUid !== uid) {
      return {success: false, error: "본인 업체만 관리할 수 있습니다."};
    }
    if (data.status !== "approved") {
      return {success: false, error: "승인된 업체만 상품을 관리할 수 있습니다."};
    }

    const products: any[] = Array.isArray(data.products) ? data.products : [];

    if (action === "add") {
      if (products.length >= MAX_MY_SHIRT_PRODUCTS) {
        return {
          success: false,
          error: `상품은 최대 ${MAX_MY_SHIRT_PRODUCTS}개까지 등록할 수 있습니다.`,
        };
      }
      const newProduct = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: String(product?.name || "").slice(0, 60),
        price: Number(product?.price) || 0,
        description: String(product?.description || "").slice(0, 300),
        photo: String(product?.photo || ""),
      };
      await shirtRef.update({products: [...products, newProduct]});
      return {success: true, product: newProduct};
    }

    if (action === "update") {
      if (typeof productId !== "string" || !productId) {
        return {success: false, error: "잘못된 요청입니다."};
      }
      const next = products.map((p) => (p.id === productId ? {
        ...p,
        name: String(product?.name ?? p.name ?? "").slice(0, 60),
        price: Number(product?.price ?? p.price) || 0,
        description: String(product?.description ?? p.description ?? "")
          .slice(0, 300),
        photo: String(product?.photo ?? p.photo ?? ""),
      } : p));
      await shirtRef.update({products: next});
      return {success: true};
    }

    if (action === "delete") {
      if (typeof productId !== "string" || !productId) {
        return {success: false, error: "잘못된 요청입니다."};
      }
      const next = products.filter((p) => p.id !== productId);
      await shirtRef.update({products: next});
      return {success: true};
    }

    return {success: false, error: "알 수 없는 요청입니다."};
  } catch (error) {
    console.error("상품 관리 처리 에러:", error);
    return {success: false, error: "처리 중 오류가 발생했습니다."};
  }
});

// 굿즈 업체(마이페이지 "굿즈 관리자" 탭)용 - manageMyShirtProduct와 동일한 이유로
// 서버에서 소유권을 검사하고 대신 써준다. 굿즈/단체티/차량 렌트 3개 카테고리는 이 세션
// 내내 "완전히 분리 관리"로 만들어왔던 관례를 그대로 따라 컬렉션별로 함수를 따로 둔다.
const MAX_MY_GOODS_PRODUCTS = 30;

export const manageMyGoodsProduct = onCall({
  region: "asia-northeast3",
  cors: true,
}, async (request: CallableRequest<any>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    return {success: false, error: "로그인이 필요합니다."};
  }

  const {goodsId, action, product, productId} = request.data ?? {};
  if (typeof goodsId !== "string" || !goodsId) {
    return {success: false, error: "잘못된 요청입니다."};
  }

  const goodsRef = admin.firestore().collection("goodsStore").doc(goodsId);

  try {
    const snap = await goodsRef.get();
    if (!snap.exists) {
      return {success: false, error: "업체 정보를 찾을 수 없습니다."};
    }
    const data = snap.data() || {};
    if (data.applicantUid !== uid) {
      return {success: false, error: "본인 업체만 관리할 수 있습니다."};
    }
    if (data.status !== "approved") {
      return {success: false, error: "승인된 업체만 상품을 관리할 수 있습니다."};
    }

    const products: any[] = Array.isArray(data.products) ? data.products : [];

    if (action === "add") {
      if (products.length >= MAX_MY_GOODS_PRODUCTS) {
        return {
          success: false,
          error: `상품은 최대 ${MAX_MY_GOODS_PRODUCTS}개까지 등록할 수 있습니다.`,
        };
      }
      const newProduct = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: String(product?.name || "").slice(0, 60),
        price: Number(product?.price) || 0,
        description: String(product?.description || "").slice(0, 300),
        photo: String(product?.photo || ""),
      };
      await goodsRef.update({products: [...products, newProduct]});
      return {success: true, product: newProduct};
    }

    if (action === "update") {
      if (typeof productId !== "string" || !productId) {
        return {success: false, error: "잘못된 요청입니다."};
      }
      const next = products.map((p) => (p.id === productId ? {
        ...p,
        name: String(product?.name ?? p.name ?? "").slice(0, 60),
        price: Number(product?.price ?? p.price) || 0,
        description: String(product?.description ?? p.description ?? "")
          .slice(0, 300),
        photo: String(product?.photo ?? p.photo ?? ""),
      } : p));
      await goodsRef.update({products: next});
      return {success: true};
    }

    if (action === "delete") {
      if (typeof productId !== "string" || !productId) {
        return {success: false, error: "잘못된 요청입니다."};
      }
      const next = products.filter((p) => p.id !== productId);
      await goodsRef.update({products: next});
      return {success: true};
    }

    return {success: false, error: "알 수 없는 요청입니다."};
  } catch (error) {
    console.error("상품 관리 처리 에러:", error);
    return {success: false, error: "처리 중 오류가 발생했습니다."};
  }
});

// 차량 렌트 업체(마이페이지 "차량 관리자" 탭)용 - manageMyShirtProduct/manageMyGoodsProduct와
// 동일한 이유로 서버에서 소유권을 검사하고 대신 써준다. 차량은 상품이 아니라 vehicleFleet
// 배열(차종·댓수·기사 포함 여부 등)을 관리하므로 productId 대신 배열 인덱스로 항목을 찾는다.
const MAX_MY_VEHICLE_FLEET_ROWS = 10;
const LARGE_BUS_TYPES_SERVER = [
  "카운티미니버스(25인승)", "중형버스(35인승 내외)", "45인승 대형 버스",
];
const VALID_DRIVER_INCLUDED_OPTIONS = ["included", "separate", "optional"];
const VALID_DRIVER_CHRISTIAN_OPTIONS = ["yes", "no", "unknown"];
const VALID_INSURANCE_OPTIONS = ["covered", "separate_needed"];

/**
 * 클라이언트가 보낸 기사 포함 여부 배열을 유효한 값만 남기고,
 * "포함"과 "별도"가 동시에 있으면 "별도"를 제거해 서로 배타적으로 맞춘다.
 * @param {any} raw 클라이언트가 보낸 원본 값
 * @return {string[]} 정제된 기사 포함 여부 배열
 */
function sanitizeDriverIncluded(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  let opts = Array.from(
    new Set(raw.filter((v) => VALID_DRIVER_INCLUDED_OPTIONS.includes(v)))
  );
  if (opts.includes("included") && opts.includes("separate")) {
    opts = opts.filter((v) => v !== "separate");
  }
  return opts;
}

/**
 * 보유 차량 한 항목을 서버에서 검증·정제한다. 25인승 이상 버스는
 * 법규상 기사 동행이 필수라 driverIncluded를 무조건 ["included"]로 고정한다.
 * @param {any} input 클라이언트가 보낸 항목 데이터
 * @param {any} existing 수정 시 기존에 저장돼 있던 항목 (없으면 신규 등록)
 * @return {object} 정제된 보유 차량 항목
 */
function sanitizeFleetEntry(input: any, existing?: any) {
  const type = String(input?.type ?? existing?.type ?? "").slice(0, 60);
  const isLargeBus = LARGE_BUS_TYPES_SERVER.includes(type);
  const cargoSpace = typeof input?.cargoSpace === "boolean" ?
    input.cargoSpace :
    !!existing?.cargoSpace;
  const driverChristianRaw =
    input?.driverChristian ?? existing?.driverChristian;
  const insuranceRaw = input?.insurance ?? existing?.insurance;
  const isValidChristian =
    VALID_DRIVER_CHRISTIAN_OPTIONS.includes(driverChristianRaw);
  const isValidInsurance = VALID_INSURANCE_OPTIONS.includes(insuranceRaw);
  const cargoCapacityRaw =
    input?.cargoCapacity ?? existing?.cargoCapacity ?? "";
  return {
    type,
    count: Math.max(1, Number(input?.count ?? existing?.count) || 1),
    driverIncluded: isLargeBus ?
      ["included"] :
      sanitizeDriverIncluded(input?.driverIncluded ?? existing?.driverIncluded),
    lodging: typeof input?.lodging === "boolean" ?
      input.lodging :
      !!existing?.lodging,
    driverChristian: isValidChristian ?
      driverChristianRaw :
      existing?.driverChristian,
    cargoSpace,
    cargoCapacity: cargoSpace ? String(cargoCapacityRaw).slice(0, 60) : "",
    insurance: isValidInsurance ? insuranceRaw : existing?.insurance,
  };
}

export const manageMyVehicleFleet = onCall({
  region: "asia-northeast3",
  cors: true,
}, async (request: CallableRequest<any>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    return {success: false, error: "로그인이 필요합니다."};
  }

  const {vehicleId, action, entry, index} = request.data ?? {};
  if (typeof vehicleId !== "string" || !vehicleId) {
    return {success: false, error: "잘못된 요청입니다."};
  }

  const vehicleRef = admin.firestore()
    .collection("vehicleRentals").doc(vehicleId);

  try {
    const snap = await vehicleRef.get();
    if (!snap.exists) {
      return {success: false, error: "업체 정보를 찾을 수 없습니다."};
    }
    const data = snap.data() || {};
    if (data.applicantUid !== uid) {
      return {success: false, error: "본인 업체만 관리할 수 있습니다."};
    }
    if (data.status !== "approved") {
      return {
        success: false,
        error: "승인된 업체만 보유 차량을 관리할 수 있습니다.",
      };
    }

    const fleet: any[] = Array.isArray(data.vehicleFleet) ?
      data.vehicleFleet :
      [];

    if (action === "add") {
      if (fleet.length >= MAX_MY_VEHICLE_FLEET_ROWS) {
        return {
          success: false,
          error: `보유 차량은 최대 ${MAX_MY_VEHICLE_FLEET_ROWS}종까지 등록할 수 있습니다.`,
        };
      }
      if (!entry?.type || !String(entry.type).trim()) {
        return {success: false, error: "차종을 입력해주세요."};
      }
      const newEntry = sanitizeFleetEntry(entry);
      await vehicleRef.update({vehicleFleet: [...fleet, newEntry]});
      return {success: true, entry: newEntry};
    }

    if (action === "update") {
      if (typeof index !== "number" || index < 0 || index >= fleet.length) {
        return {success: false, error: "잘못된 요청입니다."};
      }
      const next = fleet.map(
        (row, i) => (i === index ? sanitizeFleetEntry(entry, row) : row)
      );
      await vehicleRef.update({vehicleFleet: next});
      return {success: true};
    }

    if (action === "delete") {
      if (typeof index !== "number" || index < 0 || index >= fleet.length) {
        return {success: false, error: "잘못된 요청입니다."};
      }
      const next = fleet.filter((_, i) => i !== index);
      await vehicleRef.update({vehicleFleet: next});
      return {success: true};
    }

    return {success: false, error: "알 수 없는 요청입니다."};
  } catch (error) {
    console.error("보유 차량 관리 처리 에러:", error);
    return {success: false, error: "처리 중 오류가 발생했습니다."};
  }
});

// 장소(마이페이지 "장소 관리자" 탭)용 - manageMyShirtProduct와 동일한 이유로 서버에서
// 소유권을 검사하고 대신 써준다. 장소는 등록 당시 로그인이 필수가 아니었던 기존 데이터가
// 있어 applicantUid가 없는 문서는 이 함수로 관리할 수 없다(본인 확인 자체가 불가능하기
// 때문). 편집 범위도 "핵심 정보"(설명·가격·사진)로 좁혀, 시설/정책 같은 복잡한 필드는
// 여전히 관리자만 다루게 한다. 사진은 lib/venueImageCategories.ts와 동일한 8개
// 카테고리 구조를 그대로 따른다.
const VENUE_IMAGE_CATEGORY_MAX: Record<string, number> = {
  entrance: 3,
  mainHall: 4,
  worshipSetup: 20,
  kitchen: 12,
  lodging: 15,
  outdoor: 5,
  restroom: 5,
  etc: 5,
};
const VENUE_IMAGE_CATEGORY_KEYS = Object.keys(VENUE_IMAGE_CATEGORY_MAX);

export const manageMyVenueCore = onCall({
  region: "asia-northeast3",
  cors: true,
}, async (request: CallableRequest<any>) => {
  const uid = request.auth?.uid;
  if (!uid) {
    return {success: false, error: "로그인이 필요합니다."};
  }

  const {
    venueId, action, description, price, category, photoUrl, photoUrls,
  } = request.data ?? {};
  if (typeof venueId !== "string" || !venueId) {
    return {success: false, error: "잘못된 요청입니다."};
  }

  const venueRef = admin.firestore().collection("venues").doc(venueId);

  try {
    const snap = await venueRef.get();
    if (!snap.exists) {
      return {success: false, error: "장소 정보를 찾을 수 없습니다."};
    }
    const data = snap.data() || {};
    if (!data.applicantUid || data.applicantUid !== uid) {
      return {success: false, error: "본인 장소만 관리할 수 있습니다."};
    }
    if (data.status !== "approved") {
      return {
        success: false,
        error: "승인된 장소만 관리할 수 있습니다.",
      };
    }

    if (action === "updateInfo") {
      const update: Record<string, unknown> = {};
      if (typeof description === "string") {
        update.description = description.slice(0, 2000);
      }
      if (price !== undefined && price !== null) {
        update.price = Math.max(0, Number(price) || 0);
      }
      if (Object.keys(update).length === 0) {
        return {success: false, error: "수정할 내용이 없습니다."};
      }
      await venueRef.update(update);
      return {success: true};
    }

    if (action === "addPhoto" || action === "removePhoto") {
      if (!VENUE_IMAGE_CATEGORY_KEYS.includes(category)) {
        return {success: false, error: "잘못된 요청입니다."};
      }
      const imagesByCategory: Record<string, string[]> = {
        ...(data.imagesByCategory || {}),
      };
      const current: string[] = Array.isArray(imagesByCategory[category]) ?
        imagesByCategory[category] :
        [];
      let next: string[];

      if (action === "addPhoto") {
        const incoming: string[] = Array.isArray(photoUrls) ?
          photoUrls :
          (photoUrl ? [photoUrl] : []);
        if (incoming.length === 0) {
          return {success: false, error: "추가할 사진이 없습니다."};
        }
        const maxForCategory = VENUE_IMAGE_CATEGORY_MAX[category];
        if (current.length + incoming.length > maxForCategory) {
          return {
            success: false,
            error: `이 카테고리는 최대 ${maxForCategory}장까지 등록할 수 있습니다.`,
          };
        }
        next = [...current, ...incoming];
      } else {
        if (typeof photoUrl !== "string" || !photoUrl) {
          return {success: false, error: "잘못된 요청입니다."};
        }
        next = current.filter((u) => u !== photoUrl);
      }

      imagesByCategory[category] = next;
      const images = VENUE_IMAGE_CATEGORY_KEYS.flatMap(
        (k) => imagesByCategory[k] || []
      );
      await venueRef.update({imagesByCategory, images});
      return {success: true};
    }

    return {success: false, error: "알 수 없는 요청입니다."};
  } catch (error) {
    console.error("장소 핵심 정보 관리 처리 에러:", error);
    return {success: false, error: "처리 중 오류가 발생했습니다."};
  }
});
