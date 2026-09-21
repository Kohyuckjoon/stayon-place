import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta} from "./utils/pageMeta";

// /goods-register는 고정 등록 폼 페이지라 teamRegisterPreview처럼 Firestore
// 조회 없이 고정된 메타 정보로 치환한다. 카톡 등 SNS 미리보기 이미지는
// place_goods_register.png(public/ 폴더에 있어 배포 시 사이트 루트에 그대로
// 서빙됨)로 지정한다.
const TITLE = "굿즈 매장 등록하기 | 스테이온(STAYON)에서";
const DESCRIPTION =
  "크리스천 굿즈 매장을 스테이온에 무료로 등록하고 수련회·행사 굿즈 문의를 받아보세요.";
const KEYWORDS = [
  "굿즈매장등록", "크리스천굿즈", "수련회굿즈", "교회굿즈", "스테이온",
].join(", ");
const IMAGE = "https://place.stayon-platform.com/place_goods_register.png";

/**
 * Firebase Hosting에서 /goods-register 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 굿즈 매장 등록 폼 페이지에 맞는
 * title / description / keywords / og:image 메타 태그로 치환해서 반환한다.
 */
export const goodsRegisterPreview = onRequest(
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
      logger.error("goodsRegisterPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
