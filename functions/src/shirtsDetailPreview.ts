import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta, MetaPatch} from "./utils/pageMeta";

const DEFAULT_TITLE = "단체티·기념품 업체 찾기 | 스테이온(STAYON PLACE)";

/**
 * Firebase Hosting에서 /shirts/** 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 해당 업체명과 대표(첫 번째) 사진 기반으로
 * title / og:title / og:image 등을 치환해서 반환한다.
 */
export const shirtsDetailPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const meta: MetaPatch = {title: DEFAULT_TITLE, path: req.path};

    try {
      const match = req.path.match(/\/shirts\/([^/]+)/);
      const shirtId = match?.[1];

      if (shirtId) {
        const shirtRef = admin.firestore()
          .collection("groupShirts").doc(shirtId);
        const snap = await shirtRef.get();
        const shirtData = snap.exists ? snap.data() : undefined;
        const businessName = shirtData?.businessName as string | undefined;
        const photos = shirtData?.photos as string[] | undefined;

        // 등록한 첫 번째(대표) 사진이 있으면 카카오톡 등 미리보기 이미지를 그걸로
        // 바꾼다. 없으면 index.html의 기본 스테이온 배너 이미지가 그대로 유지된다.
        if (photos && photos.length > 0) {
          meta.image = photos[0];
        }

        if (businessName) {
          meta.title = `${businessName} | 단체티·기념품 소개 | STAYON`;
        }
      }
    } catch (error) {
      logger.error("shirtsDetailPreview: 업체 정보 조회 실패, 기본 제목으로 폴백", error);
    }

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, meta));
    } catch (error) {
      logger.error("shirtsDetailPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
