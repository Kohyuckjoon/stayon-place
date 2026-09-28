import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  fetchIndexHtml, patchMeta, escapeHtml, HOSTING_ORIGIN, MetaPatch,
} from "./utils/pageMeta";
import {STYLE_MAIN, STYLE_H2, STYLE_UL, txt} from "./utils/prerender";

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
  const hall = txt(v.hallSize) ? `${txt(v.hallSize)}평` : "";
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

  const head = [
    denomination ? "<p style=\"margin:0;color:#3182f6;font-weight:800;" +
      `font-size:13px">${escapeHtml(denomination)}</p>` : "",
    "<h1 style=\"font-size:24px;font-weight:900;margin:4px 0 8px\">" +
      `${escapeHtml(txt(v.venueName))} 수련회 장소 소개</h1>`,
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
 * 구글에 "이 페이지는 이런 이름/주소의 장소 소개"라고 알려주는 구조화 데이터
 * (schema.org Place, JSON-LD)를 만든다.
 * @param {string} path 페이지 경로(예: "/venue/abc").
 * @param {VenueDoc} v venues 문서 데이터.
 * @param {string} fallbackDesc 소개글이 없을 때 쓸 설명.
 * @return {Record<string, unknown>} JSON-LD 객체.
 */
function buildVenueJsonLd(
  path: string, v: VenueDoc, fallbackDesc: string
): Record<string, unknown> {
  const images: string[] = Array.isArray(v.images) ?
    v.images.filter((i: unknown) => typeof i === "string").slice(0, 5) : [];
  const address = [txt(v.location), txt(v.addressDetail)]
    .filter(Boolean).join(" ");
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    "name": txt(v.venueName),
    "description": txt(v.description).slice(0, 300) || fallbackDesc,
    "url": `${HOSTING_ORIGIN}${path}`,
  };
  if (images.length > 0) ld.image = images;
  if (address) {
    ld.address = {
      "@type": "PostalAddress",
      "streetAddress": address,
      "addressCountry": "KR",
    };
  }
  if (Number(v.capacity) > 0) ld.maximumAttendeeCapacity = Number(v.capacity);
  return ld;
}

// 장소 상세 화면(VenueDetail.tsx)이 실제로 그리는 공개 필드만 담는다. 신청자
// 연락처/이메일/uid 같은 개인정보는 절대 HTML에 실어 보내지 않는다.
const PRELOAD_FIELDS = [
  "venueName", "denomination", "location", "addressDetail", "tags",
  "capacity", "price", "description", "images", "hallSize", "soundSystem",
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
          meta.title = `${venueName} 수련회 장소 소개 | 스테이온(STAYON PLACE)`;
          const pagePath = `/venue/${encodeURIComponent(venueId)}`;
          meta.path = pagePath;

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

          meta.preload = {
            globalName: "__PRELOADED_VENUE__",
            data: buildVenuePreload(venueId, venueData),
          };
          meta.bodyHtml = buildVenueBodyHtml(venueData);
          meta.jsonLd = buildVenueJsonLd(pagePath, venueData, meta.description);
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
