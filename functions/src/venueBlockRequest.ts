/* eslint-disable @typescript-eslint/no-explicit-any */
import {onCall, CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";
import {sendMailNotification} from "./utils/adminNotify";
import {isOwnerOrManager} from "./utils/ownership";

// 장소 예약 차단 "신청 → 관리자 승인(또는 72시간 자동승인)" 흐름. 직거래(스테이온을
// 거치지 않고 교회-장소가 직접 계약)를 억제하기 위해, 장소 담당자가 마이페이지에서
// 날짜를 즉시 차단하지 못하게 하고 반드시 어느 교회가 왜 그 날짜를 요청했는지 신고한
// 뒤 관리자 승인을 받게 한다. 관리자(/admin) 본인이 장소별 일정관리에서 직접 차단/
// 해제하는 기존 흐름(AdminDashboard.tsx, VenueScheduleModal.tsx)은 이 파일과 무관하게
// 그대로 유지된다. 해제(이미 승인된 차단을 다시 여는 것)는 직거래 위험이 없어 승인
// 없이 manageMyVenueCore의 기존 toggleBlockedDate 액션으로 즉시 처리한다.

const gmailUser = defineSecret("GMAIL_USER");
const gmailPass = defineSecret("GMAIL_PASS");

// AdminGuard.tsx / adminEmails.ts / adminUsers.ts와 동일한 관리자 목록.
// 프론트엔드와 별도 빌드라 공유 import는 못하므로 값만 동일하게 유지한다.
const ADMIN_EMAILS = ["akhj123akhjk@gmail.com", "stayon.platform@gmail.com"];

/**
 * 호출자가 관리자 이메일 목록에 포함되는지 검증한다. 아니면 예외를 던진다.
 * @param {CallableRequest<unknown>} request 콜러블 함수 요청 객체.
 */
function assertIsAdmin(request: CallableRequest<unknown>): void {
  const email = request.auth?.token?.email as string | undefined;
  const normalized = email?.toLowerCase().trim();
  const isAdmin = !!normalized &&
    ADMIN_EMAILS.map((e) => e.toLowerCase().trim()).includes(normalized);
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }
}

/**
 * "2026-09-24" -> "9월 24일" 형태로 변환한다.
 * @param {string} dateStr "YYYY-MM-DD" 형식의 날짜 문자열
 * @return {string} "M월 D일" 형식의 한국어 날짜 표기
 */
function toKoreanDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

interface DateSummary {
  titleLabel: string;
  fullLabel: string;
}

/**
 * 여러 날짜를 이메일 제목/본문에 쓸 한국어 라벨로 요약한다.
 * @param {string[]} dates "YYYY-MM-DD" 문자열 배열
 * @return {DateSummary} 제목용 요약, 전체 목록 라벨
 */
function summarizeDates(dates: string[]): DateSummary {
  const sorted = [...dates].sort();
  const labels = sorted.map(toKoreanDateLabel);
  const titleLabel = labels.length > 1 ?
    `${labels[0]} 외 ${labels.length - 1}건` :
    labels[0];
  return {titleLabel, fullLabel: labels.join(", ")};
}

const MAX_BLOCK_REQUEST_DATES = 60;

export const submitVenueBlockRequest = onCall({
  region: "asia-northeast3",
  cors: true,
  secrets: [gmailUser, gmailPass],
}, async (request: CallableRequest<any>) => {
  const uid = request.auth?.uid;
  const callerEmail = request.auth?.token.email;
  if (!uid) {
    return {success: false, error: "로그인이 필요합니다."};
  }

  const {venueId, dates, churchName, reason} = request.data ?? {};
  const validDates = Array.isArray(dates) ?
    dates.filter((d: unknown) => typeof d === "string" && d) :
    [];
  const cleanDates: string[] = Array.from(new Set(validDates));
  const cleanChurchName =
    typeof churchName === "string" ? churchName.trim() : "";
  const cleanReason = typeof reason === "string" ? reason.trim() : "";

  if (typeof venueId !== "string" || !venueId) {
    return {success: false, error: "잘못된 요청입니다."};
  }
  if (cleanDates.length === 0) {
    return {success: false, error: "차단할 날짜를 선택해주세요."};
  }
  if (cleanDates.length > MAX_BLOCK_REQUEST_DATES) {
    return {
      success: false,
      error: `한 번에 최대 ${MAX_BLOCK_REQUEST_DATES}일까지 신청할 수 있습니다.`,
    };
  }
  if (!cleanChurchName) {
    return {success: false, error: "장소 사용 신청 교회명을 입력해주세요."};
  }
  if (!cleanReason) {
    return {success: false, error: "예약 차단 사유를 입력해주세요."};
  }

  const venueRef = admin.firestore().collection("venues").doc(venueId);

  try {
    const snap = await venueRef.get();
    if (!snap.exists) {
      return {success: false, error: "장소 정보를 찾을 수 없습니다."};
    }
    const data = snap.data() || {};
    if (!isOwnerOrManager(data, uid, callerEmail)) {
      return {success: false, error: "본인 장소만 관리할 수 있습니다."};
    }

    const blockRequestsRef = admin.firestore().collection("venueBlockRequests");
    const requestRef = await blockRequestsRef.add({
      venueId,
      venueName: data.venueName || "",
      requestedByUid: uid,
      requestedByEmail: callerEmail || "",
      dates: cleanDates,
      churchName: cleanChurchName,
      reason: cleanReason,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    process.env.GMAIL_USER = gmailUser.value();
    process.env.GMAIL_PASS = gmailPass.value();
    const {titleLabel, fullLabel} = summarizeDates(cleanDates);
    try {
      await sendMailNotification("VENUE_BLOCK_REQUEST", {
        titleDatesLabel: titleLabel,
        venueName: data.venueName || "",
        datesLabel: fullLabel,
        churchName: cleanChurchName,
        reason: cleanReason,
        applicantEmail: callerEmail || "",
      });
    } catch (mailError) {
      // 메일 발송 실패해도 신청 자체는 이미 저장됐으니 요청은 성공으로 처리한다.
      logger.error("장소 차단 신청 메일 발송 실패:", mailError);
    }

    return {success: true, requestId: requestRef.id};
  } catch (error) {
    logger.error("장소 차단 신청 처리 에러:", error);
    return {success: false, error: "처리 중 오류가 발생했습니다."};
  }
});

export const decideVenueBlockRequest = onCall({
  region: "asia-northeast3",
  cors: true,
  secrets: [gmailUser, gmailPass],
}, async (request: CallableRequest<any>) => {
  assertIsAdmin(request);

  const {requestId, action} = request.data ?? {};
  if (typeof requestId !== "string" || !requestId) {
    throw new HttpsError("invalid-argument", "잘못된 요청입니다.");
  }
  if (action !== "approve" && action !== "reject") {
    throw new HttpsError("invalid-argument", "잘못된 요청입니다.");
  }

  const requestRef = admin.firestore()
    .collection("venueBlockRequests").doc(requestId);

  try {
    const snap = await requestRef.get();
    if (!snap.exists) {
      return {success: false, error: "신청 내역을 찾을 수 없습니다."};
    }
    const data = snap.data() || {};
    if (data.status !== "pending") {
      return {success: false, error: "이미 처리된 신청입니다."};
    }

    if (action === "approve") {
      const venueRef = admin.firestore()
        .collection("venues").doc(data.venueId);
      await venueRef.update({
        blockedDates:
          admin.firestore.FieldValue.arrayUnion(...(data.dates || [])),
      });
    }

    await requestRef.update({
      status: action === "approve" ? "approved" : "rejected",
      decidedAt: admin.firestore.FieldValue.serverTimestamp(),
      decidedBy: "admin",
    });

    if (action === "approve") {
      process.env.GMAIL_USER = gmailUser.value();
      process.env.GMAIL_PASS = gmailPass.value();
      const {titleLabel, fullLabel} = summarizeDates(data.dates || []);
      try {
        await sendMailNotification("VENUE_BLOCK_APPROVED", {
          titleDatesLabel: titleLabel,
          venueName: data.venueName || "",
          datesLabel: fullLabel,
          churchName: data.churchName || "",
          applicantEmail: data.requestedByEmail || "",
        });
      } catch (mailError) {
        // 승인 자체는 이미 완료됐으니 메일 실패로 전체 요청을 실패 처리하지 않는다.
        logger.error("장소 차단 승인 완료 메일 발송 실패:", mailError);
      }
    }

    return {success: true};
  } catch (error) {
    logger.error("장소 차단 신청 승인/거절 처리 에러:", error);
    return {success: false, error: "처리 중 오류가 발생했습니다."};
  }
});

// const BLOCK_REQUEST_AUTO_APPROVE_HOURS = 72;
// 자동 승인 Time(시간 단위)
const BLOCK_REQUEST_AUTO_APPROVE_HOURS = 48;

// 관리자가 72시간 안에 응답하지 않은 장소 차단 신청을 자동 승인한다.
// expireStaleBandRoomBookings(bandRoomPaymentHandler.ts)와 동일한 스케줄 패턴.
export const expireStaleVenueBlockRequests = onSchedule({
  schedule: "0 * * * *",
  timeZone: "Asia/Seoul",
  region: "asia-northeast3",
  secrets: [gmailUser, gmailPass],
}, async () => {
  const db = admin.firestore();
  const cutoffMs =
    Date.now() - BLOCK_REQUEST_AUTO_APPROVE_HOURS * 60 * 60 * 1000;
  const cutoff = admin.firestore.Timestamp.fromMillis(cutoffMs);
  const snap = await db.collection("venueBlockRequests")
    .where("status", "==", "pending")
    .where("createdAt", "<=", cutoff)
    .get();

  if (snap.empty) return;

  process.env.GMAIL_USER = gmailUser.value();
  process.env.GMAIL_PASS = gmailPass.value();

  for (const doc of snap.docs) {
    const data = doc.data();
    const venueRef = db.collection("venues").doc(data.venueId);
    await venueRef.update({
      blockedDates:
        admin.firestore.FieldValue.arrayUnion(...(data.dates || [])),
    });
    await doc.ref.update({
      status: "approved",
      decidedAt: admin.firestore.FieldValue.serverTimestamp(),
      decidedBy: "auto",
    });

    const {titleLabel, fullLabel} = summarizeDates(data.dates || []);
    try {
      await sendMailNotification("VENUE_BLOCK_AUTO_APPROVED", {
        titleDatesLabel: titleLabel,
        venueName: data.venueName || "",
        datesLabel: fullLabel,
        churchName: data.churchName || "",
        applicantEmail: data.requestedByEmail || "",
      });
    } catch (mailError) {
      // 자동승인 자체는 이미 완료됐으니 메일 실패로 배치 전체를 중단하지 않는다.
      logger.error("장소 차단 자동승인 완료 메일 발송 실패:", mailError);
    }
  }
  logger.info(`자동 승인된 장소 차단 신청: ${snap.size}건`);
});
