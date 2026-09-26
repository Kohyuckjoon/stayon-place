/* eslint-disable @typescript-eslint/no-explicit-any */

// 마이페이지 "OO 관리자" 탭들(manageMy*)과 새 장소 차단 신청(venueBlockRequest.ts)이
// 공통으로 쓰는 소유권 검사 - 최초 등록자(applicantUid) 뿐 아니라, 관리자가 /admin에서
// 문서의 managerEmails 배열에 추가해준 이메일로 로그인한 사람도 같은 쓰기 권한을 갖는다.
// Google 로그인만 지원하는 프로젝트라 request.auth.token.email은 항상 검증된 이메일이다.
// index.ts와 venueBlockRequest.ts 양쪽에서 import하므로, 순환 참조를 피하려고
// index.ts가 아니라 이 공용 유틸 파일에 둔다.
/**
 * @param {any} data Firestore 문서 데이터
 * @param {string} uid 호출자의 uid
 * @param {string | undefined} callerEmail 호출자의 검증된 이메일
 * @return {boolean} 본인 소유이거나 위임받은 매니저인지 여부
 */
export function isOwnerOrManager(
  data: any, uid: string, callerEmail: string | undefined
): boolean {
  const isOwner = data.applicantUid === uid;
  const isManager = Array.isArray(data.managerEmails) && !!callerEmail &&
    data.managerEmails.includes(callerEmail.toLowerCase());
  return isOwner || isManager;
}
