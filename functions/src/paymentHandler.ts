import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";

export const registerPaymentAndSchedule = onCall(
  {region: "asia-northeast3"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "인증 필요");
    }
    const {venueId, totalPrice, deposit, balance, paymentDate} =
      request.data;
    try {
      const paymentDoc = await admin.firestore().collection("payments").add({
        userId: request.auth.uid,
        venueId,
        totalPrice,
        deposit,
        balance,
        status: "DEPOSIT_PAID",
        scheduledDate: admin.firestore.Timestamp.fromDate(
          new Date(paymentDate)
        ),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return {success: true, paymentId: paymentDoc.id};
    } catch (error) {
      throw new HttpsError("internal", "DB 저장 오류");
    }
  }
);

export const scheduledBalancePayment = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    console.log("스케줄러 실행");
    return Promise.resolve();
  }
);
