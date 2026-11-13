import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

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

export interface ListItem {
  href: string;
  name: string;
  info?: string;
}

/**
 * h1 + 소개 문단 + 링크 목록으로 된 본문 HTML을 만든다. 구글봇이 자바스크립트
 * 없이도 페이지 주제와 하위 상세페이지 링크를 읽을 수 있게 하기 위함이다.
 * @param {string} heading h1 문구.
 * @param {string} intro h1 아래 소개 문구.
 * @param {ListItem[]} items 링크 목록(비어 있으면 목록 없이 제목/소개만).
 * @param {string[]} paragraphs 소개 아래에 덧붙일 문단들.
 * @return {string} 본문 HTML.
 */
export function buildListPageHtml(
  heading: string,
  intro: string,
  items: ListItem[] = [],
  paragraphs: string[] = []
): string {
  const esc = (v: string) => v
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paraHtml = paragraphs
    .map((p) => `<p style="margin:0 0 12px">${esc(p)}</p>`).join("");
  const listHtml = items.length === 0 ? "" :
    `<ul style="${STYLE_UL}">` + items.map((item) =>
      "<li style=\"margin-bottom:8px\">" +
      `<a href="${esc(item.href)}">${esc(item.name)}</a>` +
      `${item.info ? ` - ${esc(item.info)}` : ""}</li>`
    ).join("") + "</ul>";
  return `<main style="${STYLE_MAIN}">` +
    "<h1 style=\"font-size:24px;font-weight:900;margin:0 0 8px\">" +
    `${esc(heading)}</h1>` +
    `<p style="margin:0 0 16px">${esc(intro)}</p>` +
    paraHtml + listHtml + "</main>";
}

/**
 * 승인된(status=="approved") 문서를 읽어 링크 목록 항목으로 바꾼다.
 * 조회에 실패하면 빈 배열을 돌려준다(본문 없이 메타만 나가도록).
 * @param {string} collection Firestore 컬렉션 이름.
 * @param {string} basePath 상세페이지 경로 앞부분(예: "/teams/").
 * @param {Function} toItem 문서 데이터 → {name, info}.
 * @return {Promise<ListItem[]>} 이름순 정렬된 목록(최대 300개).
 */
export async function fetchApprovedItems(
  collection: string,
  basePath: string,
  toItem: (d: admin.firestore.DocumentData) => {name: string; info?: string}
): Promise<ListItem[]> {
  try {
    const snap = await admin.firestore().collection(collection)
      .where("status", "==", "approved").get();
    return snap.docs.map((doc) => ({
      href: `${basePath}${encodeURIComponent(doc.id)}`,
      ...toItem(doc.data()),
    })).filter((item) => item.name)
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      .slice(0, 300);
  } catch (error) {
    logger.error(`fetchApprovedItems(${collection}) 실패`, error);
    return [];
  }
}
