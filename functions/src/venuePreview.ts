import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {fetchIndexHtml, patchMeta, MetaPatch} from "./utils/pageMeta";

const DEFAULT_TITLE = "교회 수련회 장소 예약 | 스테이온(STAYON PLACE)";

/**
 * Firebase Hosting에서 /venue/** 요청을 이 함수로 rewrite한다.
 * 정적 index.html을 그대로 서빙하되, 해당 장소명 기반으로
 * title / og:title / twitter:title 만 치환해서 반환한다.
 */
export const venuePreview = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const meta: MetaPatch = {title: DEFAULT_TITLE};

    try {
      const match = req.path.match(/\/venue\/([^/]+)/);
      const venueId = match?.[1];

      if (venueId) {
        const venueRef = admin.firestore().collection("venues").doc(venueId);
        const snap = await venueRef.get();
        const venueData = snap.exists ? snap.data() : undefined;
        const venueName = venueData?.venueName as string | undefined;
        const tags = (venueData?.tags as string[] | undefined) ?? [];
        const capacity = venueData?.capacity as number | undefined;

        if (venueName) {
          meta.title = `${venueName} 수련회 장소 소개 | 스테이온(STAYON PLACE)`;

          const tagText = tags.length > 0 ?
            tags.map((t) => `#${t}`).join(" ") : "";
          const capacityText = capacity ? `최대 ${capacity}명 수용` : "";
          meta.description = [
            `${venueName} 수련회 장소 정보`,
            [capacityText, tagText].filter(Boolean).join(" · "),
            "스테이온에서 실시간 예약 현황을 확인하세요.",
          ].filter(Boolean).join(" | ");

          if (tags.length > 0) {
            meta.keywords = [venueName, ...tags, "수련회장소", "스테이온"].join(", ");
          }
        }
      }
    } catch (error) {
      logger.error("venuePreview: 장소 정보 조회 실패, 기본 제목으로 폴백", error);
    }

    try {
      const html = await fetchIndexHtml();
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patchMeta(html, meta));
    } catch (error) {
      logger.error("venuePreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
