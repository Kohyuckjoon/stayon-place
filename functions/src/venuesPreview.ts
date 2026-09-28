import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta, escapeHtml} from "./utils/pageMeta";
import {STYLE_MAIN, STYLE_UL, txt} from "./utils/prerender";

// /venues는 목록형 고정 페이지라 메타 정보(제목/설명 등)는 고정값으로 치환하고,
// 추가로 승인된 장소 목록(이름+링크)을 본문에 미리 채워 보낸다.
// venuePreview(단수, /venue/:id 상세페이지)와는 별개.
const TITLE = "전국 수련회 장소 찾기 | 스테이온(STAYON PLACE)";
const DESCRIPTION =
  "예배당, 수양관, 캠프장 등 전국 수련회 장소를 한눈에 비교하고 간편하게 예약하세요.";
const KEYWORDS = [
  "수련회장소", "수양관", "캠프장", "교회수련회", "수련회예약", "스테이온",
].join(", ");
const IMAGE = "https://place.stayon-platform.com/place_find_place.png";

// /venues?category=mission (국내선교 탭)으로 접근했을 때 보여줄 메타 정보. teamsPreview의
// category=bandroom 분기와 동일한 방식 - 쿼리스트링은 Hosting rewrite의 source 매칭에
// 영향을 주지 않아 /venues와 똑같이 이 함수로 들어오므로, 여기서 category 쿼리로 분기한다.
const MISSION_TITLE = "국내 선교 장소 찾기 | 스테이온(STAYON PLACE)";
const MISSION_DESCRIPTION =
  "국내 선교지를 찾는 교회와 협력·봉사할 선교 장소를 스테이온에서 찾아보세요.";
const MISSION_KEYWORDS = [
  "국내선교", "선교지", "선교봉사", "교회봉사", "스테이온",
].join(", ");
const MISSION_IMAGE = "https://place.stayon-platform.com/place_missionary.png";

const MAX_LIST_ITEMS = 300;

/**
 * 승인된 장소 목록을 "이름(링크) - 한 줄 정보" 본문 HTML로 만든다. 구글봇이
 * 자바스크립트 없이도 각 장소 상세페이지로 가는 링크를 따라갈 수 있게 한다.
 * @param {boolean} isMission true면 국내 선교 장소, false면 수련회 장소.
 * @param {string} heading 페이지 제목(h1)으로 쓸 문구.
 * @param {string} intro 제목 아래에 넣을 소개 문구.
 * @return {Promise<string>} 본문 HTML, 승인된 장소가 없으면 빈 문자열.
 */
async function buildListBodyHtml(
  isMission: boolean, heading: string, intro: string
): Promise<string> {
  const basePath = isMission ? "/mission-venues/" : "/venue/";
  const snap = await admin.firestore()
    .collection(isMission ? "missionVenues" : "venues")
    .where("status", "==", "approved")
    .get();

  const items = snap.docs.map((doc) => {
    const v = doc.data();
    const capacity = Number(v.capacity) > 0 ?
      `최대 ${Number(v.capacity)}명` : "";
    const info = [txt(v.denomination), txt(v.location), capacity]
      .filter(Boolean).join(" · ");
    return {name: txt(v.venueName), id: doc.id, info};
  }).filter((item) => item.name)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .slice(0, MAX_LIST_ITEMS);
  if (items.length === 0) return "";

  const listHtml = items.map((item) =>
    "<li style=\"margin-bottom:8px\">" +
    `<a href="${basePath}${encodeURIComponent(item.id)}">` +
    `${escapeHtml(item.name)}</a>` +
    `${item.info ? ` - ${escapeHtml(item.info)}` : ""}</li>`
  ).join("");

  return `<main style="${STYLE_MAIN}">` +
    "<h1 style=\"font-size:24px;font-weight:900;margin:0 0 8px\">" +
    `${escapeHtml(heading)}</h1>` +
    `<p style="margin:0 0 16px">${escapeHtml(intro)}</p>` +
    `<ul style="${STYLE_UL}">${listHtml}</ul></main>`;
}

/**
 * Firebase Hosting에서 /venues 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 수련회 장소 목록 페이지(또는 category=mission
 * 쿼리가 붙은 국내선교 탭)에 맞는 title / description / keywords / og:image 메타 태그로
 * 치환하고, 승인된 장소 목록(이름+링크)을 본문에 미리 채워서 반환한다.
 */
export const venuesPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const isMissionTab = req.query.category === "mission";
    const description = isMissionTab ? MISSION_DESCRIPTION : DESCRIPTION;

    let bodyHtml = "";
    try {
      bodyHtml = await buildListBodyHtml(
        isMissionTab,
        isMissionTab ? "국내 선교 장소" : "전국 수련회 장소 찾기",
        description
      );
    } catch (error) {
      logger.error("venuesPreview: 장소 목록 조회 실패, 목록 없이 진행", error);
    }

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, {
        title: isMissionTab ? MISSION_TITLE : TITLE,
        description,
        keywords: isMissionTab ? MISSION_KEYWORDS : KEYWORDS,
        image: isMissionTab ? MISSION_IMAGE : IMAGE,
        path: isMissionTab ? "/venues?category=mission" : "/venues",
        bodyHtml: bodyHtml || undefined,
      }));
    } catch (error) {
      logger.error("venuesPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
