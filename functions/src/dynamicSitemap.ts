import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const HOSTING_ORIGIN = "https://place.stayon-platform.com";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

/**
 * Firestore Timestamp를 사이트맵 lastmod에 쓸 "YYYY-MM-DD" 문자열로 바꾼다.
 * @param {admin.firestore.Timestamp | undefined} ts Firestore Timestamp
 * @return {string | undefined} "YYYY-MM-DD" 문자열, 값이 없으면 undefined
 */
function toLastmod(
  ts: admin.firestore.Timestamp | undefined
): string | undefined {
  if (!ts) return undefined;
  return ts.toDate().toISOString().slice(0, 10);
}

/**
 * 사이트맵 URL 목록을 XML 문자열로 조립한다.
 * @param {SitemapUrl[]} urls 사이트맵에 넣을 URL 목록
 * @return {string} sitemap.xml 형식의 XML 문자열
 */
function buildXml(urls: SitemapUrl[]): string {
  const items = urls.map((u) => {
    const lastmodTag = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "";
    return `  <url>
    <loc>${u.loc}</loc>${lastmodTag}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;
}

// Firebase Hosting에서 /sitemap.xml 요청을 이 함수로 rewrite한다. 기존
// public/sitemap.xml(정적 파일, 홈페이지 1개만 들어있었음)을 대체한다. 정적 페이지
// 몇 개에 더해, 승인된(status=="approved") 장소(venues)와 국내 선교 장소
// (missionVenues)를 Firestore에서 매 요청마다 읽어와 자동으로 포함시킨다 - 새 장소가
// 승인될 때마다 사이트맵을 따로 손볼 필요가 없다. 우선 장소 계열만 포함하고,
// 굿즈/단체티/차량/합주실/외부사역팀 등은 필요해지면 추가한다.
export const dynamicSitemap = onRequest(
  {region: "asia-northeast3"},
  async (req, res) => {
    const urls: SitemapUrl[] = [
      {loc: `${HOSTING_ORIGIN}/`, changefreq: "daily", priority: "1.0"},
      {loc: `${HOSTING_ORIGIN}/venues`, changefreq: "daily", priority: "0.9"},
    ];

    try {
      const venuesSnap = await admin.firestore()
        .collection("venues")
        .where("status", "==", "approved")
        .get();
      venuesSnap.forEach((doc) => {
        const data = doc.data();
        urls.push({
          loc: `${HOSTING_ORIGIN}/venue/${doc.id}`,
          lastmod: toLastmod(data.updatedAt || data.createdAt),
          changefreq: "weekly",
          priority: "0.8",
        });
      });

      const missionVenuesSnap = await admin.firestore()
        .collection("missionVenues")
        .where("status", "==", "approved")
        .get();
      missionVenuesSnap.forEach((doc) => {
        const data = doc.data();
        urls.push({
          loc: `${HOSTING_ORIGIN}/mission-venues/${doc.id}`,
          lastmod: toLastmod(data.updatedAt || data.createdAt),
          changefreq: "weekly",
          priority: "0.7",
        });
      });
    } catch (error) {
      logger.error("dynamicSitemap: 장소 목록 조회 실패", error);
    }

    res.set("Content-Type", "application/xml; charset=UTF-8");
    res.set("Cache-Control", "public, max-age=1800");
    res.status(200).send(buildXml(urls));
  }
);
