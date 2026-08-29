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

export {
  adminSetUserDisabled,
  adminDeleteUserAccount,
  adminListUsers,
} from "./adminUsers";

export {
  verifyBandRoomPayment,
  expireStaleBandRoomBookings,
} from "./bandRoomPaymentHandler";
