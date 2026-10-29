import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  fetchIndexHtml, patchMeta, escapeHtml, HOSTING_ORIGIN, MetaPatch,
} from "./utils/pageMeta";
import {STYLE_MAIN, STYLE_H2, STYLE_UL, txt} from "./utils/prerender";
import {shortCity, venueRegion} from "./utils/venueFaq";

const DEFAULT_TITLE = "국내 선교 장소 찾기 | 스테이온(STAYON PLACE)";

type MissionDoc = admin.firestore.DocumentData;

/**
 * 배열 필드 + "기타" 직접 입력값을 하나의 목록으로 합친다.
 * @param {unknown} arr 선택지 배열 필드.
 * @param {unknown} other 기타 직접 입력값.
 * @return {string[]} 비어 있지 않은 값 목록.
 */
function joinList(arr: unknown, other: unknown): string[] {
  return [...(Array.isArray(arr) ? arr.map(txt) : []), txt(other)]
    .filter(Boolean);
}

/**
 * 선교지 문서로 <div id="root"> 안에 미리 채울 소개 본문 HTML을 만든다.
 * 연락처 등 개인정보는 넣지 않는다.
 * @param {MissionDoc} v missionVenues 문서 데이터.
 * @return {string} 본문 HTML 문자열.
 */
function buildMissionBodyHtml(v: MissionDoc): string {
  const li = (label: string, value: string) => value ?
    `<li><strong>${escapeHtml(label)}</strong>: ` +
      `<span style="white-space:pre-wrap">${escapeHtml(value)}</span></li>` :
    "";
  const section = (title: string, inner: string) => inner ?
    `<h2 style="${STYLE_H2}">${escapeHtml(title)}</h2>${inner}` : "";
  const address = [txt(v.location), txt(v.addressDetail)]
    .filter(Boolean).join(" ");
  const region = venueRegion(v.location).full;
  const tags = Array.isArray(v.tags) ?
    v.tags.map(txt).filter(Boolean).map((t: string) => `#${t}`).join(" ") : "";
  const denomination = txt(v.denomination);
  const capacity = Number(v.capacity) > 0 ? `${Number(v.capacity)}명` : "";
  const info = [
    li("교회 사정/상황", joinList(v.churchSituation, v.churchSituationOther)
      .join(", ")),
    li("원하는 봉사/헌신", joinList(v.desiredService, v.desiredServiceOther)
      .join(", ")),
  ].join("");
  const facilities = [
    li("수용 인원", capacity),
    li("냉방 시설", typeof v.airConditioner === "boolean" ?
      (v.airConditioner ? "있음" : "없음") : ""),
    li("침구류", typeof v.beddingAvailable === "boolean" ?
      (v.beddingAvailable ? "보유" : "미보유") : ""),
    li("주차 정보", txt(v.parkingCapacity)),
    li("샤워실/화장실", txt(v.showerBathroom)),
  ].join("");
  const description = txt(v.description);

  const head = [
    denomination ? "<p style=\"margin:0;color:#3182f6;font-weight:800;" +
      `font-size:13px">${escapeHtml(denomination)}</p>` : "",
    "<h1 style=\"font-size:24px;font-weight:900;margin:4px 0 8px\">" +
      `${escapeHtml(txt(v.venueName))} 국내 선교 장소 소개</h1>`,
    region ? "<p style=\"margin:0 0 4px;color:#4e5968\">" +
      `${escapeHtml(region)} 국내 선교지</p>` : "",
    address ? `<p style="margin:0 0 8px">${escapeHtml(address)}</p>` : "",
    tags ? "<p style=\"margin:0 0 8px;color:#3182f6\">" +
      `${escapeHtml(tags)}</p>` : "",
  ].join("");

  return `<main style="${STYLE_MAIN}">${head}` +
    section("시설 정보", facilities ?
      `<ul style="${STYLE_UL}">${facilities}</ul>` : "") +
    section("선교지 소개", info ? `<ul style="${STYLE_UL}">${info}</ul>` : "") +
    section("장소 소개", description ?
      "<p style=\"white-space:pre-wrap;margin:0\">" +
        `${escapeHtml(description)}</p>` : "") +
    "<p style=\"margin-top:24px\">스테이온(STAYON PLACE)에서 국내 선교지를 " +
    "찾고 직접 문의하세요.</p>" +
    "<p><a href=\"/venues?category=mission\">다른 국내 선교 장소 보기</a></p>" +
    "</main>";
}

/**
 * 선교지 구조화 데이터(장소 + 이동 경로)를 만든다.
 * @param {string} path 페이지 경로(예: "/mission-venues/abc").
 * @param {MissionDoc} v missionVenues 문서 데이터.
 * @param {string} fallbackDesc 소개글이 없을 때 쓸 설명.
 * @return {Record<string, unknown>} JSON-LD 객체.
 */
function buildMissionJsonLd(
  path: string, v: MissionDoc, fallbackDesc: string
): Record<string, unknown> {
  const url = `${HOSTING_ORIGIN}${path}`;
  const images: string[] = Array.isArray(v.images) ?
    v.images.filter((i: unknown) => typeof i === "string").slice(0, 5) : [];
  const address = [txt(v.location), txt(v.addressDetail)]
    .filter(Boolean).join(" ");
  const region = venueRegion(v.location);
  const place: Record<string, unknown> = {
    "@type": "Church",
    "@id": `${url}#venue`,
    "name": txt(v.venueName),
    "description": txt(v.description).slice(0, 300) || fallbackDesc,
    "url": url,
  };
  if (images.length > 0) place.image = images;
  if (address) {
    const postal: Record<string, string> = {
      "@type": "PostalAddress",
      "streetAddress": address,
      "addressCountry": "KR",
    };
    if (region.province) postal.addressRegion = region.province;
    if (region.city) postal.addressLocality = region.city;
    place.address = postal;
  }
  if (Number(v.capacity) > 0) {
    place.maximumAttendeeCapacity = Number(v.capacity);
  }
  const breadcrumb = {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "홈",
        "item": `${HOSTING_ORIGIN}/`},
      {"@type": "ListItem", "position": 2, "name": "국내 선교 장소",
        "item": `${HOSTING_ORIGIN}/venues?category=mission`},
      {"@type": "ListItem", "position": 3, "name": txt(v.venueName),
        "item": url},
    ],
  };
  const graph: Record<string, unknown>[] = [place, breadcrumb];
  return {"@context": "https://schema.org", "@graph": graph};
}

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

        if (venueName && venueData) {
          const region = venueRegion(venueData.location);
          const capacity = Number(venueData.capacity);
          const capacityText = capacity > 0 ? `최대 ${capacity}명` : "";
          meta.title = `${venueName} | ` +
            `${region.full ? `${region.full} ` : ""}국내 선교 장소` +
            `${capacityText ? ` (${capacityText})` : ""} | 스테이온(STAYON PLACE)`;
          const pagePath = `/mission-venues/${encodeURIComponent(venueId)}`;
          meta.path = pagePath;

          const tags = Array.isArray(venueData.tags) ?
            (venueData.tags as unknown[]).map(txt).filter(Boolean) : [];
          const services =
            joinList(venueData.desiredService, venueData.desiredServiceOther);
          meta.description = [
            `${region.full ? `${region.full} ` : ""}${venueName} 국내 선교 장소`,
            [
              capacityText,
              services.length > 0 ? `원하는 봉사: ${services.join(", ")}` : "",
              tags.map((t) => `#${t}`).join(" "),
            ].filter(Boolean).join(" · "),
            "스테이온에서 국내 선교지를 찾고 직접 문의하세요.",
          ].filter(Boolean).join(" | ");

          const city = shortCity(region.city);
          meta.keywords = Array.from(new Set([
            venueName,
            city ? `${city} 국내선교` : "",
            region.province ? `${region.province} 국내선교` : "",
            ...tags,
            "국내선교", "국내 선교지", "단기선교", "스테이온",
          ].filter(Boolean))).join(", ");

          meta.bodyHtml = buildMissionBodyHtml(venueData);
          meta.jsonLd =
            buildMissionJsonLd(pagePath, venueData, meta.description);
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
