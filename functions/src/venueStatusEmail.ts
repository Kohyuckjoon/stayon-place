/* eslint-disable @typescript-eslint/no-explicit-any */
import {onCall, CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {sendVenueStatusEmail} from "./utils/adminNotify";

// 관리자가 /admin에서 장소를 승인/반려할 때, 신청자 본인 이메일로 결과를 안내한다.
// 기존에는 등록 폼에 "입력하신 이메일로 승인 결과가 안내됩니다"라는 문구만 있고
// 실제로 보내는 코드가 없었다 - 이 함수가 그 공백을 메운다.

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

interface SendVenueStatusEmailPayload {
  applicantEmail: string;
  venueName: string;
  status: "approved" | "rejected";
}

export const sendVenueApplicantStatusEmail = onCall({
  region: "asia-northeast3",
  cors: true,
  secrets: [gmailUser, gmailPass],
}, async (request: CallableRequest<SendVenueStatusEmailPayload>) => {
  assertIsAdmin(request);
  process.env.GMAIL_USER = gmailUser.value();
  process.env.GMAIL_PASS = gmailPass.value();

  const {applicantEmail, venueName, status} = request.data;
  if (!applicantEmail || !venueName || !status) {
    throw new HttpsError(
      "invalid-argument",
      "applicantEmail, venueName, status가 모두 필요합니다."
    );
  }

  try {
    await sendVenueStatusEmail({applicantEmail, venueName, status});
    return {success: true};
  } catch (error) {
    console.error("장소 승인/반려 안내 이메일 전송 에러:", error);
    return {success: false, error: "이메일 전송 실패"};
  }
});
