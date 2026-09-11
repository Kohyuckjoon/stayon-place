import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta} from "./utils/pageMeta";

// /programs는 목록형 고정 페이지라 venuePreview처럼 Firestore 조회 없이
// 고정된 메타 정보로 치환한다. 카톡 등 SNS 미리보기 이미지는 recreation.png
// (public/ 폴더에 있어 배포 시 사이트 루트에 그대로 서빙됨)로 지정한다.
const TITLE = "교회 수련회 & 행사 프로그램 추천받기 | 스테이온(STAYON)에서";
const DESCRIPTION =
  "청소년부·여름·겨울 수련회부터 각종 교회 행사까지, 검증된 레크리에이션 " +
  "프로그램을 스테이온에서 무료로 찾아보세요.";
const KEYWORDS = [
  "레크리에이션", "수련회프로그램", "교회행사", "레크리에이션강사", "스테이온",
].join(", ");
const IMAGE = "https://place.stayon-platform.com/recreation.png";

/**
 * Firebase Hosting에서 /programs 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 레크리에이션 프로그램 게시판에 맞는
 * title / description / keywords / og:image 메타 태그로 치환해서 반환한다.
 */
export const programsPreview = onRequest(
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
      logger.error("programsPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
