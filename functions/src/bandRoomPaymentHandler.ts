/* eslint-disable @typescript-eslint/no-explicit-any */
import * as admin from "firebase-admin";
import {onCall} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";

// 합주실 Track2(예약·결제 지원) 전용 결제 처리. 기존 수련회 장소 결제
// (paymentHandler.ts)와는 완전히 분리된 컬렉션·함수이며, 그 파일은 이번 작업에서
// 전혀 건드리지 않았다.
//
// 기존 registerPaymentAndSchedule은 클라이언트가 보낸 금액을 그대로 신뢰하는 구조였는데,
// 여기서는 그 문제를 반복하지 않기 위해 포트원 REST API로 imp_uid를 직접 조회해서
// 실제 결제 금액·상태를 검증한 뒤에만 예약을 "paid"로 확정한다.
const portoneImpKey = defineSecret("PORTONE_IMP_KEY");
const portoneImpSecret = defineSecret("PORTONE_IMP_SECRET");

const PENDING_EXPIRY_MINUTES = 10;

export const verifyBandRoomPayment = onCall({
  region: "asia-northeast3",
  cors: true,
  secrets: [portoneImpKey, portoneImpSecret],
}, async (request) => {
  const {imp_uid: impUid, merchant_uid: merchantUid, bookingId} =
    request.data ?? {};
  if (!impUid || !merchantUid || !bookingId) {
    return {success: false, error: "잘못된 요청입니다."};
  }

  const db = admin.firestore();
  const bookingRef = db.collection("bandRoomBookings").doc(bookingId);

  try {
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return {success: false, error: "예약 정보를 찾을 수 없습니다."};
    }
    const booking = bookingSnap.data() as any;
    if (booking.status === "paid") {
      return {success: true};
    }
    if (booking.status !== "pending_payment") {
      return {success: false, error: "결제 가능한 상태가 아닙니다."};
    }

    const tokenRes = await fetch("https://api.iamport.kr/users/getToken", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        imp_key: portoneImpKey.value(),
        imp_secret: portoneImpSecret.value(),
      }),
    });
    const tokenJson: any = await tokenRes.json();
    const accessToken = tokenJson?.response?.access_token;
    if (!accessToken) {
      logger.error("포트원 토큰 발급 실패:", tokenJson);
      return {success: false, error: "결제 검증 토큰 발급에 실패했습니다."};
    }

    const paymentRes = await fetch(`https://api.iamport.kr/payments/${impUid}`, {
      headers: {Authorization: accessToken},
    });
    const paymentJson: any = await paymentRes.json();
    const payment = paymentJson?.response;
    if (!payment) {
      logger.error("포트원 결제 조회 실패:", paymentJson);
      return {success: false, error: "결제 내역 조회에 실패했습니다."};
    }

    if (payment.merchant_uid !== merchantUid) {
      logger.error("merchant_uid 불일치", {
        expected: merchantUid, actual: payment.merchant_uid,
      });
      return {success: false, error: "결제 정보가 일치하지 않습니다."};
    }
    if (payment.status !== "paid") {
      const msg = `결제가 완료되지 않았습니다 (상태: ${payment.status}).`;
      return {success: false, error: msg};
    }
    if (payment.amount !== booking.totalPrice) {
      logger.error("결제 금액 불일치", {
        expected: booking.totalPrice, actual: payment.amount,
      });
      return {success: false, error: "결제 금액이 예약 금액과 일치하지 않습니다."};
    }

    await bookingRef.update({
      status: "paid",
      imp_uid: impUid,
      merchant_uid: merchantUid,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {success: true};
  } catch (error) {
    logger.error("합주실 결제 검증 중 오류:", error);
    return {success: false, error: "결제 검증 중 오류가 발생했습니다."};
  }
});

// 결제하지 않고 이탈한 pending_payment 예약을 주기적으로 만료 처리해서 슬롯을 되돌려준다.
// 기존 scheduledBalancePayment(paymentHandler.ts)와는 완전히 별개의 함수다.
export const expireStaleBandRoomBookings = onSchedule({
  schedule: "*/10 * * * *",
  timeZone: "Asia/Seoul",
  region: "asia-northeast3",
}, async () => {
  const db = admin.firestore();
  const cutoffMs = Date.now() - PENDING_EXPIRY_MINUTES * 60 * 1000;
  const cutoff = admin.firestore.Timestamp.fromMillis(cutoffMs);
  const snap = await db.collection("bandRoomBookings")
    .where("status", "==", "pending_payment")
    .where("createdAt", "<=", cutoff)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, {status: "expired"}));
  await batch.commit();
  logger.info(`만료 처리된 합주실 예약: ${snap.size}건`);
});
