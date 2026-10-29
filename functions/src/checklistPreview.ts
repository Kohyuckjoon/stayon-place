import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta} from "./utils/pageMeta";

// /checklist/new(사전답사 체크리스트)는 Firestore 조회 없이 고정된 메타 정보로
// 치환한다. 카톡/스레드/인스타 등 링크 미리보기 이미지는
// stayon_checklist_og_1200x630.png(public/ 폴더 → 사이트 루트에 서빙)로 지정한다.
const TITLE = "수련회 사전답사 체크리스트 | 스테이온(STAYON)";
const DESCRIPTION =
  "답사 가서 뭘 봐야 할지, 스테이온이 33개 항목으로 미리 정리했어요. " +
  "로그인 없이 바로 체크하세요.";
const KEYWORDS = [
  "수련회답사", "사전답사", "수련회체크리스트", "수련회장소", "스테이온",
].join(", ");
const IMAGE =
  "https://place.stayon-platform.com/stayon_checklist_og_1200x630.png";

/**
 * Firebase Hosting에서 /checklist/new 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 사전답사 체크리스트에 맞는
 * title / description / keywords / og:image 메타 태그로 치환해서 반환한다.
 */
export const checklistPreview = onRequest(
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
        path: "/checklist/new",
      }));
    } catch (error) {
      logger.error("checklistPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
