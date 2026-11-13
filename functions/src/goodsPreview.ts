import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta} from "./utils/pageMeta";
import {buildListPageHtml, fetchApprovedItems} from "./utils/prerender";

// /goods는 목록형 고정 페이지라 goodsDetailPreview(단수, /goods/:id 상세페이지)처럼
// Firestore 조회 없이 고정된 메타 정보로 치환한다.
const TITLE = "기독교 굿즈 매장 찾기 | 스테이온(STAYON PLACE)";
const DESCRIPTION =
  "수련회·교회 행사에 쓸 기독교 굿즈, 성경책, 소품을 만드는 업체를 스테이온에서 찾아보세요.";
const KEYWORDS = [
  "기독교굿즈", "교회굿즈", "수련회굿즈", "성경굿즈", "스테이온",
].join(", ");
const IMAGE = "https://place.stayon-platform.com/stayon_market_goods.png";

/**
 * Firebase Hosting에서 /goods 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 굿즈 매장 목록 페이지에 맞는
 * title / description / keywords / og:image 메타 태그로 치환해서 반환한다.
 */
export const goodsPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const items = await fetchApprovedItems("goodsStore", "/goods/", (d) => ({
      name: String(d.businessName || "").trim(),
    }));
    const bodyHtml = buildListPageHtml("기독교 굿즈 매장 찾기", DESCRIPTION, items);

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, {
        path: "/goods",
        bodyHtml,
        title: TITLE,
        description: DESCRIPTION,
        keywords: KEYWORDS,
        image: IMAGE,
      }));
    } catch (error) {
      logger.error("goodsPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
