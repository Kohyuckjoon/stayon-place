// 구글봇이 자바스크립트 실행 없이도 첫 화면부터 실제 내용을 보게 하려고
// <div id="root"> 안에 미리 채워 보내는 본문 HTML을 만들 때 쓰는 공용 도구.
// venuePreview / venuesPreview / reviewsPreview가 함께 쓴다.
export const STYLE_MAIN = "max-width:720px;margin:0 auto;padding:24px 20px;" +
  "font-family:-apple-system,'Pretendard',sans-serif;" +
  "color:#191f28;line-height:1.7";
export const STYLE_H2 = "font-size:17px;font-weight:800;margin:24px 0 8px";
export const STYLE_UL = "padding-left:18px;margin:0";

/**
 * 값이 문자열/숫자일 때만 앞뒤 공백을 뺀 문자열로 돌려준다.
 * @param {unknown} value Firestore 필드 값.
 * @return {string} 정리된 문자열, 값이 없으면 빈 문자열.
 */
export function txt(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}
