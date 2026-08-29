import {onCall, CallableRequest, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// AdminGuard.tsx / adminEmails.ts와 동일한 관리자 목록.
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

interface SetDisabledPayload {
  uid: string;
  disabled: boolean;
}

/**
 * 관리자가 특정 회원의 로그인 가능 여부(차단/차단 해제)를 전환한다.
 * Firebase Auth 계정을 disabled 처리하고, Firestore users 문서의
 * status 필드도 함께 갱신해 목록에서 즉시 반영되도록 한다.
 */
export const adminSetUserDisabled = onCall(
  {region: "asia-northeast3", cors: true},
  async (request: CallableRequest<SetDisabledPayload>) => {
    assertIsAdmin(request);
    const {uid, disabled} = request.data;
    if (!uid) {
      throw new HttpsError("invalid-argument", "uid가 필요합니다.");
    }

    await admin.auth().updateUser(uid, {disabled});
    await admin.firestore().collection("users").doc(uid).set(
      {status: disabled ? "suspended" : "active"},
      {merge: true}
    );

    return {success: true};
  }
);

/**
 * 관리자가 회원 전체 목록을 조회한다. Firestore users 컬렉션을 거치지 않고
 * Firebase Authentication을 직접 조회해 반환한다 (가입 시 Firestore 문서
 * 동기화가 실패해도 여기서는 항상 실제 가입자 전체가 정확히 보인다).
 */
export const adminListUsers = onCall(
  {region: "asia-northeast3", cors: true},
  async (request: CallableRequest<unknown>) => {
    assertIsAdmin(request);

    const users: Array<{
      uid: string;
      email: string | null;
      displayName: string | null;
      photoURL: string | null;
      disabled: boolean;
      providerId: string | null;
      createdAt: string;
      lastSignInAt: string | null;
    }> = [];

    let pageToken: string | undefined;
    do {
      const result = await admin.auth().listUsers(1000, pageToken);
      result.users.forEach((u) => {
        users.push({
          uid: u.uid,
          email: u.email ?? null,
          displayName: u.displayName ?? null,
          photoURL: u.photoURL ?? null,
          disabled: u.disabled,
          providerId: u.providerData[0]?.providerId ?? null,
          createdAt: u.metadata.creationTime,
          lastSignInAt: u.metadata.lastSignInTime ?? null,
        });
      });
      pageToken = result.pageToken;
    } while (pageToken);

    return {users};
  }
);

interface DeleteUserPayload {
  uid: string;
}

/**
 * 관리자가 회원 계정을 완전히 삭제한다.
 * Firebase Auth 계정, users 문서, 해당 유저의 planner 문서를 모두 제거한다.
 * (자체 탈퇴 플로우인 Header.tsx의 handleDeleteAccount와 동일한 정리 범위)
 */
export const adminDeleteUserAccount = onCall(
  {region: "asia-northeast3", cors: true},
  async (request: CallableRequest<DeleteUserPayload>) => {
    assertIsAdmin(request);
    const {uid} = request.data;
    if (!uid) {
      throw new HttpsError("invalid-argument", "uid가 필요합니다.");
    }

    const db = admin.firestore();
    const plannerSnap = await db.collection("planner")
      .where("userId", "==", uid).get();
    const batch = db.batch();
    plannerSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    batch.delete(db.collection("users").doc(uid));
    await batch.commit();

    await admin.auth().deleteUser(uid);

    return {success: true};
  }
);
