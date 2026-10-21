/* eslint-disable @typescript-eslint/no-explicit-any */
// 관리자 대시보드("대시보드" 탭)용 집계 전용 파일. 결제 흐름(paymentHandler.ts 등)과는
// 완전히 무관하며, 전부 Firestore 트리거(문서가 이미 쓰여진 뒤 반응)와 단순 카운터 onCall
// 함수로만 구성돼 있어 기존 신청/결제 코드(Booking.tsx 등)를 단 한 줄도 건드리지 않는다.
import * as admin from "firebase-admin";
import {onCall} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";

const REGION = "asia-northeast3";

/**
 * 대시보드의 "오늘/이번 주/이번 달"은 한국 달력 기준이어야 하는데, Cloud Functions
 * 서버 시계는 UTC라서 그냥 new Date()로 날짜를 자르면 자정 전후로 하루가 밀린다.
 * UTC+9시간 보정 후 "YYYY-MM-DD"로 자른 문자열을 siteStats 문서 id로 쓴다.
 * @param {Date} date 기준 시각(기본값: 지금).
 * @return {string} "YYYY-MM-DD" 형식의 KST 날짜 문자열.
 */
function getKstDateString(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * 오늘 날짜 문서(siteStats/{YYYY-MM-DD})와 누적 문서(siteStats/_totals)를 한 번에
 * +1 한다. 둘 다 단순 집계용이라 트랜잭션까지는 필요 없고, 배치로 묶어서 왕복만 줄인다.
 * @param {"visitorCount"|"kakaoClickCount"} field 증가시킬 필드.
 * @return {Promise<void>} 완료 시 resolve.
 */
async function bumpSiteStat(
  field: "visitorCount" | "kakaoClickCount"
): Promise<void> {
  const today = getKstDateString();
  const db = admin.firestore();
  const batch = db.batch();
  batch.set(db.collection("siteStats").doc(today), {
    date: today,
    [field]: admin.firestore.FieldValue.increment(1),
  }, {merge: true});
  batch.set(db.collection("siteStats").doc("_totals"), {
    [field]: admin.firestore.FieldValue.increment(1),
  }, {merge: true});
  await batch.commit();
}

/**
 * 관리자 대시보드 "최근 활동 로그"에 항목 하나를 추가한다.
 * @param {string} type 활동 종류 ("signup" | "booking" | "content").
 * @param {string} message 화면에 그대로 보여줄 한국어 메시지.
 * @return {Promise<void>} 완료 시 resolve.
 */
async function addActivityLog(type: string, message: string): Promise<void> {
  await admin.firestore().collection("activityLog").add({
    type,
    message,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// 사이트 전체 방문(세션당 1회, 어느 페이지든) - Layout.tsx에서 세션스토리지로
// 중복 방지 후 호출.
export const logSiteVisit = onCall({region: REGION, cors: true}, async () => {
  try {
    await bumpSiteStat("visitorCount");
    return {success: true};
  } catch (error) {
    console.error("방문 기록 에러:", error);
    return {success: false};
  }
});

// 카카오 1:1 문의 버튼 클릭 - Layout.tsx의 카카오 버튼 onClick에서 호출.
export const logKakaoClick = onCall({region: REGION, cors: true}, async () => {
  try {
    await bumpSiteStat("kakaoClickCount");
    return {success: true};
  } catch (error) {
    console.error("카카오 클릭 기록 에러:", error);
    return {success: false};
  }
});

// 신규 회원가입(users/{uid} 최초 생성) 시: 활동 로그 기록 + (추천 링크로 들어온
// 가입이면) referralStats의 가입 수도 같이 올린다. AuthContext.tsx가 문서를 만들
// 때 referredBy 필드에 세션에 저장된 ref를 같이 써주는 걸 그대로 읽기만 한다 -
// 클라이언트가 별도로 집계 함수를 또 호출할 필요가 없어서 네트워크 실패로 집계가
// 누락될 걱정이 없다.
export const onUserRegistered = onDocumentCreated({
  document: "users/{uid}",
  region: REGION,
}, async (event) => {
  const data = event.data?.data();
  if (!data) return;
  try {
    const name = data.displayName || data.name || data.email || "알 수 없음";
    await addActivityLog("signup", `${name}님이 회원가입했습니다`);

    const ref = typeof data.referredBy === "string" ?
      data.referredBy.trim() : "";
    if (ref) {
      await admin.firestore().collection("referralStats").doc(ref).set({
        ref,
        registrationCount: admin.firestore.FieldValue.increment(1),
        lastRegistrationAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
    }
  } catch (error) {
    console.error("신규 가입 집계 에러:", error);
  }
});

// 예약/사전답사 신청(bookings/{id} 최초 생성) 시 활동 로그만 남긴다. 예약 "건수"는
// 집계 카운터가 아니라 대시보드에서 bookings 컬렉션을 직접 세는
// (getCountFromServer) 방식이라 여기서는 숫자를 따로 올리지 않는다 - 그래야 이
// 기능을 켜기 전부터 있던 예약들도 정확히 잡힌다.
export const onBookingRegistered = onDocumentCreated({
  document: "bookings/{id}",
  region: REGION,
}, async (event) => {
  const data = event.data?.data();
  if (!data) return;
  try {
    const church = data.churchName || "이름 미상";
    const venue = data.venueName || "장소";
    const label = data.type === "inspection" ? "사전답사" : "예약";
    await addActivityLog("booking", `${church}님이 '${venue}' ${label}을 신청했습니다`);
  } catch (error) {
    console.error("예약 신청 활동 로그 에러:", error);
  }
});

/**
 * 장소/팀/굿즈 등 "콘텐츠 등록 신청" 9종 - 전부 "문서 하나 생성 → 활동 로그
 * 한 줄" 패턴이라 공장 함수로 만들어서 중복을 없앴다. 각 신청 폼
 * (RegisterVenue.tsx 등)은 전혀 건드리지 않고, 이미 쓰고 있던 Firestore
 * 쓰기에 서버가 반응만 하는 방식.
 * @param {string} collectionName Firestore 컬렉션 이름.
 * @param {string} typeLabel 활동 로그에 쓸 한국어 유형명.
 * @param {string} nameField 신청자/업체명이 들어있는 필드명.
 * @return {object} onDocumentCreated 트리거 함수.
 */
function makeContentSubmissionTrigger(
  collectionName: string,
  typeLabel: string,
  nameField: string
) {
  return onDocumentCreated({
    document: `${collectionName}/{id}`,
    region: REGION,
  }, async (event) => {
    const data = event.data?.data();
    if (!data) return;
    try {
      const name = data[nameField] || data.applicantName || "이름 미상";
      await addActivityLog("content", `${name}님이 ${typeLabel} 등록을 신청했습니다`);
    } catch (error) {
      console.error(`${collectionName} 등록 신청 활동 로그 에러:`, error);
    }
  });
}

export const onVenueRegistered =
  makeContentSubmissionTrigger("venues", "장소", "venueName");
export const onMissionVenueRegistered =
  makeContentSubmissionTrigger("missionVenues", "국내선교 장소", "venueName");
export const onTeamRegistered =
  makeContentSubmissionTrigger("ministryTeams", "외부사역팀", "teamName");
export const onBandRoomRegistered =
  makeContentSubmissionTrigger("bandRooms", "합주실", "roomName");
export const onChurchRegistered =
  makeContentSubmissionTrigger("churches", "교회", "churchName");
export const onGoodsStoreRegistered =
  makeContentSubmissionTrigger("goodsStore", "굿즈 업체", "businessName");
export const onGroupShirtsRegistered =
  makeContentSubmissionTrigger("groupShirts", "단체티 업체", "businessName");
export const onVehicleRentalRegistered = makeContentSubmissionTrigger(
  "vehicleRentals", "차량 대여 업체", "businessName"
);
export const onSoundConstructionRegistered = makeContentSubmissionTrigger(
  "soundConstructionRequests", "음향 시공", "churchName"
);
