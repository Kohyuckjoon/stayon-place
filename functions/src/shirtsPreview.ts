import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta} from "./utils/pageMeta";
import {buildListPageHtml, fetchApprovedItems} from "./utils/prerender";

// /shirts는 목록형 고정 페이지라 shirtsDetailPreview(단수, /shirts/:id 상세페이지)처럼
// Firestore 조회 없이 고정된 메타 정보로 치환한다.
const TITLE = "단체티·기념품 업체 찾기 | 스테이온(STAYON PLACE)";
const DESCRIPTION =
  "수련회 단체티, 기념품을 제작하는 업체를 스테이온에서 찾아보세요.";
const KEYWORDS = [
  "단체티", "수련회단체티", "기념품제작", "단체티제작", "스테이온",
].join(", ");
const IMAGE = "https://place.stayon-platform.com/stayon_market_shirts.png";

/**
 * Firebase Hosting에서 /shirts 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 단체티·기념품 목록 페이지에 맞는
 * title / description / keywords / og:image 메타 태그로 치환해서 반환한다.
 */
export const shirtsPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const items = await fetchApprovedItems("groupShirts", "/shirts/", (d) => ({
      name: String(d.businessName || "").trim(),
    }));
    const bodyHtml = buildListPageHtml("단체티·기념품 업체 찾기", DESCRIPTION, items);

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, {
        path: "/shirts",
        bodyHtml,
        title: TITLE,
        description: DESCRIPTION,
        keywords: KEYWORDS,
        image: IMAGE,
      }));
    } catch (error) {
      logger.error("shirtsPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
