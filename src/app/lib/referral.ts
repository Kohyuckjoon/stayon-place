// 릴스/SNS 홍보 링크(예: /teams?ref=jueun)로 들어온 유입을 같은 브라우저 세션 동안
// "기억"하기 위한 공용 sessionStorage 키. TeamList.tsx(유입 기록)와
// TeamDetail.tsx(연락처 열람 시 함께 전송)가 같이 쓴다. 탭을 닫으면 사라진다 -
// 릴스 보고 바로 들어오는 즉시성 트래픽을 보는 용도라 긴 보관은 필요 없다고 판단.
const REFERRAL_SESSION_KEY = "stayon_ref";

export function storeReferral(ref: string) {
  try {
    sessionStorage.setItem(REFERRAL_SESSION_KEY, ref);
  } catch {
    // 시크릿 모드 등 sessionStorage 접근 불가 시 조용히 무시
  }
}

export function getStoredReferral(): string | null {
  try {
    return sessionStorage.getItem(REFERRAL_SESSION_KEY);
  } catch {
    return null;
  }
}
