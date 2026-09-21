import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta, MetaPatch} from "./utils/pageMeta";

const DEFAULT_TITLE = "국내 선교 장소 찾기 | 스테이온(STAYON PLACE)";

/**
 * Firebase Hosting에서 /mission-venues/** 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 해당 선교지 이름과 첫 번째 등록 사진 기반으로
 * title / og:title / og:image 등을 치환해서 반환한다.
 */
export const missionVenueDetailPreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const meta: MetaPatch = {title: DEFAULT_TITLE};

    try {
      const match = req.path.match(/\/mission-venues\/([^/]+)/);
      const venueId = match?.[1];

      if (venueId) {
        const venueRef = admin.firestore()
          .collection("missionVenues").doc(venueId);
        const snap = await venueRef.get();
        const venueData = snap.exists ? snap.data() : undefined;
        const venueName = venueData?.venueName as string | undefined;
        const images = venueData?.images as string[] | undefined;

        // 등록한 첫 번째 사진이 있으면 카카오톡 등 미리보기 이미지를 그걸로 바꾼다.
        // 없으면 index.html의 기본 스테이온 배너 이미지가 그대로 유지된다.
        if (images && images.length > 0) {
          meta.image = images[0];
        }

        if (venueName) {
          meta.title = `${venueName} | 국내 선교 장소 소개 | STAYON 장소 플랫폼`;
        }
      }
    } catch (error) {
      logger.error("missionVenueDetailPreview: 장소 정보 조회 실패, 기본 제목으로 폴백", error);
    }

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, meta));
    } catch (error) {
      logger.error("missionVenueDetailPreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
