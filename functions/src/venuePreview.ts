import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  fetchIndexHtml, patchMeta, escapeHtml, HOSTING_ORIGIN, MetaPatch,
} from "./utils/pageMeta";
import {STYLE_MAIN, STYLE_H2, STYLE_UL, txt} from "./utils/prerender";
import {shortCity, venueRegion} from "./utils/venueFaq";

const DEFAULT_TITLE = "교회 수련회 장소 예약 | 스테이온(STAYON PLACE)";

type VenueDoc = admin.firestore.DocumentData;

/**
 * "라벨: 값" 목록 항목(li) HTML을 만든다. 값이 비어 있으면 빈 문자열이다.
 * @param {string} label 항목 이름.
 * @param {string} value 항목 값.
 * @return {string} li HTML 문자열.
 */
function li(label: string, value: string): string {
  if (!value) return "";
  return `<li><strong>${escapeHtml(label)}</strong>: ` +
    `<span style="white-space:pre-wrap">${escapeHtml(value)}</span></li>`;
}

/**
 * 제목 + 내용 묶음(섹션) HTML을 만든다. 내용이 비어 있으면 통째로 생략한다.
 * @param {string} title 섹션 제목.
 * @param {string} inner 섹션 내용 HTML.
 * @return {string} 섹션 HTML 문자열.
 */
function section(title: string, inner: string): string {
  if (!inner) return "";
  return `<h2 style="${STYLE_H2}">${escapeHtml(title)}</h2>${inner}`;
}

/**
 * 장소 문서로 <div id="root"> 안에 미리 채울 소개 본문 HTML을 만든다.
 * 구글봇이 자바스크립트 실행 없이도 실제 내용을 보게 하기 위한 용도다.
 * @param {VenueDoc} v venues 문서 데이터.
 * @return {string} 본문 HTML 문자열.
 */
function buildVenueBodyHtml(v: VenueDoc): string {
  const won = (n: unknown) => Number(n) > 0 ?
    `${Number(n).toLocaleString("ko-KR")}원` : "";
  const count = (n: unknown) => Number(n) > 0 ? `${Number(n)}명` : "";
  const address = [txt(v.location), txt(v.addressDetail)]
    .filter(Boolean).join(" ");
  const tags = Array.isArray(v.tags) ?
    v.tags.map(txt).filter(Boolean).map((t: string) => `#${t}`).join(" ") : "";
  const hallUnit = v.hallSizeUnit === "명" ? "명" : "평";
  const hall = txt(v.hallSize) ? `${txt(v.hallSize)}${hallUnit}` : "";
  const rooms = Number(v.maleRooms) > 0 || Number(v.femaleRooms) > 0 ?
    `남 ${Number(v.maleRooms) || 0} / 여 ${Number(v.femaleRooms) || 0}` : "";
  const mealOption = Array.isArray(v.mealOption) ? v.mealOption : [];
  const meals = [
    mealOption.includes("provided") ? "자체 식사 제공" : "",
    mealOption.includes("self") ? "직접 취사 및 외부 반입" : "",
    mealOption.includes("none") ? "식사 미제공" : "",
  ].filter(Boolean).join(", ");

  const facilities = [
    li("강당 크기", hall),
    li("음향/조명", txt(v.soundSystem)),
    li("보유 악기", txt(v.instruments)),
    li("샤워실/화장실", txt(v.showerBathroom)),
    li("남녀 숙소", rooms),
    li("식당 인원", count(v.cafeteriaCapacity)),
  ].join("");
  const meal = [
    li("식사", meals),
    li("1인당 식비", won(v.mealPrice)),
    li("식사 안내", txt(v.mealNote)),
  ].join("");
  const description = txt(v.description);
  const denomination = txt(v.denomination);
  const region = venueRegion(v.location).full;

  const head = [
    denomination ? "<p style=\"margin:0;color:#3182f6;font-weight:800;" +
      `font-size:13px">${escapeHtml(denomination)}</p>` : "",
    "<h1 style=\"font-size:24px;font-weight:900;margin:4px 0 8px\">" +
      `${escapeHtml(txt(v.venueName))} 수련회 장소 소개</h1>`,
    region ? "<p style=\"margin:0 0 4px;color:#4e5968\">" +
      `${escapeHtml(region)} 교회 수련회 장소</p>` : "",
    address ? `<p style="margin:0 0 8px">${escapeHtml(address)}</p>` : "",
    tags ? "<p style=\"margin:0 0 8px;color:#3182f6\">" +
      `${escapeHtml(tags)}</p>` : "",
    `<ul style="${STYLE_UL}">` +
      `${li("수용 인원", count(v.capacity))}${li("1박 사용료", won(v.price))}` +
      "</ul>",
  ].join("");

  const intro = description ?
    "<p style=\"white-space:pre-wrap;margin:0\">" +
      `${escapeHtml(description)}</p>` : "";

  return `<main style="${STYLE_MAIN}">${head}` +
    section("장소 소개", intro) +
    section("상세 시설 정보", facilities ?
      `<ul style="${STYLE_UL}">${facilities}</ul>` : "") +
    section("식사 정보", meal ? `<ul style="${STYLE_UL}">${meal}</ul>` : "") +
    "<p style=\"margin-top:24px\">스테이온(STAYON PLACE)에서 실시간 예약 " +
    "현황을 확인하고 예약하세요.</p>" +
    "<p><a href=\"/venues\">다른 수련회 장소 보기</a></p></main>";
}

/**
 * 구글·네이버에 "이 페이지는 이런 이름/주소/시설의 수련회 장소 소개"라고
 * 알려주는 구조화 데이터(JSON-LD)를 만든다. 장소 정보(EventVenue), 이동 경로
 * (홈 > 수련회 장소 > 장소명)을 한 묶음(@graph)으로 넣는다.
 * @param {string} path 페이지 경로(예: "/venue/abc").
 * @param {VenueDoc} v venues 문서 데이터.
 * @param {string} fallbackDesc 소개글이 없을 때 쓸 설명.
 * @return {Record<string, unknown>} JSON-LD 객체.
 */
function buildVenueJsonLd(
  path: string, v: VenueDoc, fallbackDesc: string
): Record<string, unknown> {
  const url = `${HOSTING_ORIGIN}${path}`;
  const images: string[] = Array.isArray(v.images) ?
    v.images.filter((i: unknown) => typeof i === "string").slice(0, 5) : [];
  const address = [txt(v.location), txt(v.addressDetail)]
    .filter(Boolean).join(" ");
  const region = venueRegion(v.location);
  const venue: Record<string, unknown> = {
    "@type": "EventVenue",
    "@id": `${url}#venue`,
    "name": txt(v.venueName),
    "description": txt(v.description).slice(0, 300) || fallbackDesc,
    "url": url,
  };
  if (images.length > 0) venue.image = images;
  if (address) {
    const postal: Record<string, string> = {
      "@type": "PostalAddress",
      "streetAddress": address,
      "addressCountry": "KR",
    };
    if (region.province) postal.addressRegion = region.province;
    if (region.city) postal.addressLocality = region.city;
    venue.address = postal;
  }
  if (Number(v.capacity) > 0) {
    venue.maximumAttendeeCapacity = Number(v.capacity);
  }
  if (Number(v.price) > 0) {
    venue.priceRange =
      `1박 ${Number(v.price).toLocaleString("ko-KR")}원`;
  }
  const mealOption = Array.isArray(v.mealOption) ? v.mealOption : [];
  const amenities: Array<[string, boolean]> = [];
  if (typeof v.airConditioner === "boolean") {
    amenities.push(["에어컨", v.airConditioner]);
  }
  if (txt(v.parkingCapacity)) amenities.push(["주차", true]);
  if (mealOption.includes("provided")) amenities.push(["식사 제공", true]);
  if (mealOption.includes("self")) amenities.push(["직접 취사", true]);
  if (txt(v.soundSystem)) amenities.push(["음향 장비", true]);
  if (txt(v.projector)) amenities.push(["프로젝터", true]);
  if (amenities.length > 0) {
    venue.amenityFeature = amenities.map(([name, value]) => ({
      "@type": "LocationFeatureSpecification", name, value,
    }));
  }

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "홈",
        "item": `${HOSTING_ORIGIN}/`},
      {"@type": "ListItem", "position": 2, "name": "수련회 장소",
        "item": `${HOSTING_ORIGIN}/venues`},
      {"@type": "ListItem", "position": 3, "name": txt(v.venueName),
        "item": url},
    ],
  };

  const graph: Record<string, unknown>[] = [venue, breadcrumb];
  return {"@context": "https://schema.org", "@graph": graph};
}

// 장소 상세 화면(VenueDetail.tsx)이 실제로 그리는 공개 필드만 담는다. 신청자
// 연락처/이메일/uid 같은 개인정보는 절대 HTML에 실어 보내지 않는다.
const PRELOAD_FIELDS = [
  "venueName", "denomination", "location", "addressDetail", "tags",
  "capacity", "price", "description", "images", "hallSize", "hallSizeUnit",
  "soundSystem",
  "instruments", "showerBathroom", "maleRooms", "femaleRooms",
  "cafeteriaCapacity", "mealOption", "mealPrice", "mealNote", "airConditioner",
  "nightEventLimit", "parkingCapacity", "projector", "blockedDates",
];

/**
 * 화면이 첫 렌더부터 쓸 수 있도록 장소 문서에서 공개 필드만 골라낸다.
 * @param {string} id 장소 문서 ID.
 * @param {VenueDoc} v venues 문서 데이터.
 * @return {Record<string, unknown>} {id, data} 형태의 미리 실어 보낼 값.
 */
function buildVenuePreload(id: string, v: VenueDoc): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of PRELOAD_FIELDS) {
    if (v[key] !== undefined) data[key] = v[key];
  }
  return {id, data};
}

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
        const images = venueData?.images as string[] | undefined;

        // 장소가 등록한 첫 번째 사진이 있으면 카카오톡 등 미리보기 이미지를 그걸로
        // 바꾼다. 없으면 index.html의 기본 스테이온 배너 이미지가 그대로 유지된다.
        if (images && images.length > 0) {
          meta.image = images[0];
        }

        if (venueName && venueData) {
          // 제목·설명에 지역(예: "경기 용인시")을 넣어 "용인 수련회 장소" 같은
          // 지역 검색에 걸리게 한다.
          const region = venueRegion(venueData.location);
          const capacityText = capacity ? `최대 ${capacity}명` : "";
          const titleSuffix = [
            region.full ? `${region.full} 교회 수련회 장소` : "교회 수련회 장소",
            capacityText ? `(${capacityText})` : "",
          ].filter(Boolean).join(" ");
          meta.title = `${venueName} | ${titleSuffix} | 스테이온(STAYON PLACE)`;
          const pagePath = `/venue/${encodeURIComponent(venueId)}`;
          meta.path = pagePath;

          const tagText = tags.length > 0 ?
            tags.map((t) => `#${t}`).join(" ") : "";
          const price = Number(venueData.price);
          const priceText = price > 0 ?
            `1박 ${price.toLocaleString("ko-KR")}원` : "";
          meta.description = [
            `${region.full ? `${region.full} ` : ""}${venueName} 교회 수련회 장소`,
            [capacityText, priceText, tagText].filter(Boolean).join(" · "),
            "스테이온에서 실시간 예약 현황을 확인하세요.",
          ].filter(Boolean).join(" | ");

          const city = shortCity(region.city);
          meta.keywords = Array.from(new Set([
            venueName,
            city ? `${city} 수련회 장소` : "",
            region.province ? `${region.province} 수련회 장소` : "",
            city ? `${city} 교회 수련회` : "",
            ...tags,
            "교회 수련회 장소", "수련회장소", "스테이온",
          ].filter(Boolean))).join(", ");

          meta.preload = {
            globalName: "__PRELOADED_VENUE__",
            data: buildVenuePreload(venueId, venueData),
          };
          meta.bodyHtml = buildVenueBodyHtml(venueData);
          meta.jsonLd =
            buildVenueJsonLd(pagePath, venueData, meta.description);
        }
      }
    } catch (error) {
      logger.error("venuePreview: 장소 정보 조회 실패, 기본 제목으로 폴백", error);
    }

    try {
      const html = await fetchIndexHtml();
      let patched = patchMeta(html, meta);
      // 상세 화면의 첫 사진(슬라이더 첫 장)을 사이트 스크립트가 다 받아지고 실행된 뒤가
      // 아니라 HTML을 받자마자 같이 내려받게 한다. 카카오톡 인앱 브라우저처럼 캐시가
      // 비어 있는 첫 방문에서 사진이 늦게 뜨던 문제를 줄이기 위함.
      if (meta.image && meta.preload) {
        const imageUrl = escapeHtml(meta.image);
        const hints = "\n    <link rel=\"preconnect\" " +
          "href=\"https://firebasestorage.googleapis.com\" />" +
          `\n    <link rel="preload" as="image" href="${imageUrl}" ` +
          "fetchpriority=\"high\" />";
        patched = patched.replace("<head>", () => `<head>${hints}`);
      }
      res.set("Content-Type", "text/html; charset=UTF-8");
      res.set("Cache-Control", "public, max-age=300");
      res.status(200).send(patched);
    } catch (error) {
      logger.error("venuePreview: index.html 서빙 실패", error);
      res.status(500).send("Internal Server Error");
    }
  }
);
