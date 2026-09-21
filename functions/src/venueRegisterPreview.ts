import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta} from "./utils/pageMeta";

// /register는 장소 등록 폼 고정 페이지라 teamRegisterPreview/programsPreview처럼
// Firestore 조회 없이 고정된 메타 정보로 치환한다. 카톡 등 SNS 미리보기 이미지는
// stayon_place_register.png(public/ 폴더에 있어 배포 시 사이트 루트에 그대로 서빙됨)로 지정한다.
const TITLE = "장소 등록하기 | 스테이온(STAYON)에서";
const DESCRIPTION =
  "수양관, 교회, 캠프장 등 수련회 장소를 스테이온에 무료로 등록하고 예약 문의를 받아보세요.";
const KEYWORDS = [
  "장소등록", "수양관등록", "수련회장소등록", "교회수련회", "스테이온",
].join(", ");
const IMAGE = "https://place.stayon-platform.com/stayon_place_register.png";

/**
 * Firebase Hosting에서 /register 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 장소 등록 폼 페이지에 맞는
 * title / description / keywords / og:image 메타 태그로 치환해서 반환한다.
 */
export const venueRegisterPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, {
        title: TITLE,
        description: DESCRIPTION,
        keywords: KEYWORDS,
        image: IMAGE,
      }));
    } catch (error) {
      logger.error("venueRegisterPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
