import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta, escapeHtml} from "./utils/pageMeta";
import {STYLE_MAIN, STYLE_H2, txt} from "./utils/prerender";

// /reviews(이용 후기 게시판)는 다른 페이지와 똑같은 빈 index.html이 그대로
// 나가서 구글이 "내용 없는 중복 페이지"로 보던 문제를 막기 위해, 고유한
// 제목/설명과 최근 후기 글자를 본문에 미리 채워 보낸다. 작성자 정보는 넣지 않는다.
const TITLE = "수련회 장소 이용 후기 | 스테이온(STAYON PLACE)";
const DESCRIPTION =
  "스테이온에서 예약한 교회 수련회 장소의 실제 이용 후기를 확인해보세요.";
const KEYWORDS = [
  "수련회 후기", "수련회장소 후기", "교회수련회", "스테이온",
].join(", ");
const MAX_REVIEWS = 30;
const MAX_CONTENT_LENGTH = 300;

/**
 * 최근 이용 후기를 본문 HTML로 만든다.
 * @return {Promise<string>} 본문 HTML, 후기가 없으면 빈 문자열.
 */
async function buildReviewsBodyHtml(): Promise<string> {
  const snap = await admin.firestore().collection("reviews").get();
  const reviews = snap.docs.map((doc) => {
    const r = doc.data();
    return {
      title: txt(r.title),
      venueName: txt(r.venueName),
      content: txt(r.content).slice(0, MAX_CONTENT_LENGTH),
      createdAt: Number(r.createdAt?.toMillis?.() ?? 0),
    };
  }).filter((r) => r.title || r.content)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_REVIEWS);
  if (reviews.length === 0) return "";

  const articles = reviews.map((r) =>
    "<article>" +
    (r.title ? `<h2 style="${STYLE_H2}">${escapeHtml(r.title)}</h2>` : "") +
    (r.venueName ?
      `<p style="margin:0;color:#3182f6">${escapeHtml(r.venueName)}</p>` :
      "") +
    (r.content ?
      "<p style=\"white-space:pre-wrap;margin:4px 0 0\">" +
        `${escapeHtml(r.content)}</p>` :
      "") +
    "</article>"
  ).join("");

  return `<main style="${STYLE_MAIN}">` +
    "<h1 style=\"font-size:24px;font-weight:900;margin:0 0 8px\">" +
    "수련회 장소 이용 후기</h1>" +
    `<p style="margin:0 0 16px">${escapeHtml(DESCRIPTION)}</p>` +
    `${articles}</main>`;
}

/**
 * Firebase Hosting에서 /reviews 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 후기 게시판에 맞는 title / description /
 * canonical로 치환하고 최근 후기를 본문에 미리 채워서 반환한다.
 */
export const reviewsPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    let bodyHtml = "";
    try {
      bodyHtml = await buildReviewsBodyHtml();
    } catch (error) {
      logger.error("reviewsPreview: 후기 조회 실패, 본문 없이 진행", error);
    }

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, {
        title: TITLE,
        description: DESCRIPTION,
        keywords: KEYWORDS,
        path: "/reviews",
        bodyHtml: bodyHtml || undefined,
      }));
    } catch (error) {
      logger.error("reviewsPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
