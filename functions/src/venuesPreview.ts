import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta} from "./utils/pageMeta";

// /venues는 목록형 고정 페이지라 teamsPreview처럼 Firestore 조회 없이 고정된
// 메타 정보로 치환한다. venuePreview(단수, /venue/:id 상세페이지)와는 별개.
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

/**
 * Firebase Hosting에서 /venues 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 수련회 장소 목록 페이지(또는 category=mission
 * 쿼리가 붙은 국내선교 탭)에 맞는 title / description / keywords / og:image 메타 태그로
 * 치환해서 반환한다.
 */
export const venuesPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const isMissionTab = req.query.category === "mission";
    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, {
        title: isMissionTab ? MISSION_TITLE : TITLE,
        description: isMissionTab ? MISSION_DESCRIPTION : DESCRIPTION,
        keywords: isMissionTab ? MISSION_KEYWORDS : KEYWORDS,
        image: isMissionTab ? MISSION_IMAGE : IMAGE,
      }));
    } catch (error) {
      logger.error("venuesPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
