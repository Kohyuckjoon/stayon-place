import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta} from "./utils/pageMeta";

// /team-register는 고정 등록 폼 페이지라 Firestore 조회 없이 고정된 메타 정보로 치환한다.
const TITLE = "외부 사역팀 섭외 등록하기 | 스테이온(STAYON)에서";
const DESCRIPTION =
  "찬양팀, 음향·조명팀, 찬양사역자, 세션 등 외부 사역팀을 스테이온에 무료로 등록하고 섭외 문의를 받아보세요.";
const KEYWORDS = [
  "외부사역팀등록", "찬양팀등록", "찬양사역자등록", "세션등록", "교회찬양팀", "스테이온",
].join(", ");

/**
 * Firebase Hosting에서 /team-register 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 외부 사역팀 등록 폼 페이지에 맞는
 * title / description / keywords 메타 태그로 치환해서 반환한다.
 */
export const teamRegisterPreview = onRequest(
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
      }));
    } catch (error) {
      logger.error("teamRegisterPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
