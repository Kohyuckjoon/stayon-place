import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {venueRegion} from "./utils/venueFaq";

const HOSTING_ORIGIN = "https://place.stayon-platform.com";
const MAX_ITEMS = 100;

/**
 * XML 본문에 넣을 문자열의 특수문자를 이스케이프한다.
 * @param {string} value 원본 문자열
 * @return {string} 이스케이프된 문자열
 */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Firestore Timestamp를 RSS pubDate 형식(RFC 822) 문자열로 바꾼다.
 * @param {admin.firestore.Timestamp | undefined} ts Firestore Timestamp
 * @return {string | undefined} pubDate 문자열, 값이 없으면 undefined
 */
function toPubDate(
  ts: admin.firestore.Timestamp | undefined
): string | undefined {
  if (!ts?.toDate) return undefined;
  return ts.toDate().toUTCString();
}

// 네이버 서치어드바이저 "RSS 제출"용 피드. /rss.xml 요청을 Firebase Hosting이 이
// 함수로 rewrite한다. dynamicSitemap과 같은 방식으로 승인된 장소(venues)를 매 요청마다
// 읽어 최신 등록순으로 넣는다 - 새 장소가 승인되면 자동으로 피드에 올라간다.
// 제목·설명은 venuePreview(상세페이지 미리보기)와 같은 문구 규칙을 따른다.
export const rssFeed = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const items: string[] = [];
    let lastBuild: string | undefined;

    try {
      const snap = await admin.firestore()
        .collection("venues")
        .where("status", "==", "approved")
        .get();
      const docs = snap.docs.sort((a, b) =>
        (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0)
      ).slice(0, MAX_ITEMS);

      docs.forEach((doc) => {
        const v = doc.data();
        const name = typeof v.venueName === "string" ? v.venueName.trim() : "";
        if (!name) return;
        const region = venueRegion(v.location);
        const capacity = Number(v.capacity);
        const price = Number(v.price);
        const capacityText = capacity > 0 ? `최대 ${capacity}명` : "";
        const priceText = price > 0 ?
          `1박 ${price.toLocaleString("ko-KR")}원` : "";
        const title = [
          name,
          region.full ? `${region.full} 교회 수련회 장소` : "교회 수련회 장소",
        ].join(" | ");
        const description = [
          `${region.full ? `${region.full} ` : ""}${name} 교회 수련회 장소`,
          [capacityText, priceText].filter(Boolean).join(" · "),
          typeof v.location === "string" ? v.location.trim() : "",
          "스테이온에서 실시간 예약 현황을 확인하세요.",
        ].filter(Boolean).join(" | ");
        const link = `${HOSTING_ORIGIN}/venue/${encodeURIComponent(doc.id)}`;
        const pubDate = toPubDate(v.createdAt);
        if (pubDate && !lastBuild) lastBuild = pubDate;

        const pubDateTag = pubDate ?
          `\n      <pubDate>${pubDate}</pubDate>` : "";
        items.push(`    <item>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <description>${esc(description)}</description>${pubDateTag}
    </item>`);
      });
    } catch (error) {
      logger.error("rssFeed: 장소 목록 조회 실패", error);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>스테이온(STAYON PLACE) 교회 수련회 장소</title>
    <link>${HOSTING_ORIGIN}/venues</link>
    <description>전국 교회 수련회 장소를 한눈에 비교하고 실시간 예약 현황을 확인하세요.</description>
    <language>ko</language>${lastBuild ?
    `\n    <lastBuildDate>${lastBuild}</lastBuildDate>` : ""}
${items.join("\n")}
  </channel>
</rss>`;

    res.set("Content-Type", "application/rss+xml; charset=UTF-8");
    res.set("Cache-Control", "public, max-age=1800");
    res.status(200).send(xml);
  }
);
