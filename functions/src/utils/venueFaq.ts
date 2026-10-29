// 장소 상세 "자주 묻는 질문"(Q&A)과 검색용 지역 문구를 만드는 공용 도구.
// 서버(venuePreview / missionVenueDetailPreview)가 검색엔진용 HTML·구조화
// 데이터(FAQPage)를 만들 때와, 화면(VenueDetail.tsx / MissionVenueDetail.tsx)이
// 실제 Q&A 칸을 그릴 때 같은 파일을 쓴다. 구글은 화면에 안 보이는 Q&A를
// 구조화 데이터에만 넣으면 감점하므로, 두 곳의 내용이 항상 똑같아야 한다.
// 화면 쪽에서도 import하므로 firebase 등 외부 의존성 없이 순수 함수만 둔다.

export interface VenueFaqItem {
  q: string;
  a: string;
}

type VenueLike = Record<string, unknown>;

/**
 * 값이 문자열/숫자일 때만 앞뒤 공백을 뺀 문자열로 돌려준다.
 * @param {unknown} value 필드 값.
 * @return {string} 정리된 문자열, 값이 없으면 빈 문자열.
 */
function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return "";
}

/**
 * 0보다 큰 숫자면 그 숫자를, 아니면 0을 돌려준다.
 * @param {unknown} value 필드 값.
 * @return {number} 양수 또는 0.
 */
function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * 단어 끝 받침에 맞춰 "은/는" 같은 조사를 고른다.
 * @param {string} word 앞 단어.
 * @param {string} withJong 받침 있을 때 조사.
 * @param {string} withoutJong 받침 없을 때 조사.
 * @return {string} 고른 조사.
 */
function josa(word: string, withJong: string, withoutJong: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return withoutJong;
  return code % 28 > 0 ? withJong : withoutJong;
}

/**
 * 주소("경기 용인시 처인구 ...")에서 검색에 쓰는 지역 이름을 뽑는다.
 * 예: "경기 용인시", "서울 마포구", "강원 양양군".
 * @param {unknown} location venues.location 값.
 * @return {{full: string, province: string, city: string}} 지역 정보.
 */
export function venueRegion(
  location: unknown
): {full: string; province: string; city: string} {
  const tokens = str(location).split(/\s+/).filter(Boolean);
  const province = (tokens[0] || "")
    .replace(/(특별자치도|특별자치시|특별시|광역시)$/, "");
  const second = tokens[1] || "";
  const city = /[시군구]$/.test(second) ? second : "";
  return {full: [province, city].filter(Boolean).join(" "), province, city};
}

/**
 * "용인시" → "용인"처럼 검색어로 많이 쓰는 짧은 지역 이름을 만든다.
 * 두 글자 이하("중구" 등)는 그대로 둔다.
 * @param {string} city 시/군/구 이름.
 * @return {string} 짧은 이름.
 */
export function shortCity(city: string): string {
  return city.length > 2 ? city.replace(/[시군구]$/, "") : city;
}

/**
 * 수련회 장소(venues) 문서로 자주 묻는 질문 목록을 만든다. 등록된 값이 있는
 * 항목만 만든다(빈 값을 지어내지 않는다).
 * @param {VenueLike} v venues 문서 데이터.
 * @return {VenueFaqItem[]} 질문/답변 목록.
 */
export function buildVenueFaq(v: VenueLike): VenueFaqItem[] {
  const name = str(v.venueName);
  if (!name) return [];
  const faq: VenueFaqItem[] = [];
  const address = [str(v.location), str(v.addressDetail)]
    .filter(Boolean).join(" ");
  const region = venueRegion(v.location).full;
  const capacity = num(v.capacity);
  const price = num(v.price);
  const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

  if (address) {
    faq.push({
      q: `${name}${josa(name, "은", "는")} 어디에 있나요?`,
      a: `${address}에 있습니다.` +
        (region ? ` ${region} 지역의 교회 수련회 장소입니다.` : ""),
    });
  }

  if (capacity) {
    faq.push({
      q: `${name}에서는 몇 명까지 수련회를 할 수 있나요?`,
      a: `최대 ${capacity}명까지 이용할 수 있습니다.`,
    });
  }

  if (price) {
    faq.push({
      q: "1박 사용료는 얼마인가요?",
      a: `1박 사용료는 ${won(price)}입니다.`,
    });
  }

  const meal = Array.isArray(v.mealOption) ? v.mealOption : [];
  const mealParts = [
    meal.includes("provided") ? "장소에서 식사를 제공합니다" : "",
    meal.includes("self") ? "직접 취사하거나 음식을 반입할 수 있습니다" : "",
  ].filter(Boolean);
  const mealPrice = num(v.mealPrice);
  if (mealParts.length > 0 || meal.includes("none")) {
    let a = mealParts.length > 0 ?
      `${mealParts.join(". 또한 ")}.` :
      "장소에서 식사는 제공하지 않습니다.";
    if (mealPrice) a += ` 1인당 식비는 ${won(mealPrice)}입니다.`;
    const note = str(v.mealNote);
    if (note) a += ` ${note}`;
    faq.push({q: "식사는 어떻게 하나요?", a});
  }

  const parking = str(v.parkingCapacity);
  if (parking) {
    faq.push({q: "주차가 가능한가요?", a: `주차 안내: ${parking}`});
  }

  if (typeof v.airConditioner === "boolean") {
    faq.push({
      q: "에어컨(냉방) 시설이 있나요?",
      a: v.airConditioner ?
        "네, 에어컨 시설이 설치되어 있습니다." :
        "에어컨 시설은 없습니다.",
    });
  }

  const hall = str(v.hallSize);
  const worship = [
    hall ? `강당 크기: ${hall}평` : "",
    str(v.soundSystem) ? `음향/조명: ${str(v.soundSystem)}` : "",
    str(v.instruments) ? `보유 악기: ${str(v.instruments)}` : "",
    str(v.projector) ? `프로젝터: ${str(v.projector)}` : "",
  ].filter(Boolean);
  if (worship.length > 0) {
    faq.push({
      q: "예배·집회를 위한 강당과 음향 장비가 있나요?",
      a: worship.join(" / "),
    });
  }

  faq.push({
    q: "예약은 어떻게 하나요?",
    a: "스테이온(STAYON PLACE)의 이 페이지에서 실시간 예약 현황을 확인한 뒤, " +
      "원하는 날짜로 예약 상담을 신청하시면 됩니다.",
  });

  return faq;
}

/**
 * 국내 선교 장소(missionVenues) 문서로 자주 묻는 질문 목록을 만든다.
 * 연락처 같은 개인정보는 답변에 넣지 않는다.
 * @param {VenueLike} v missionVenues 문서 데이터.
 * @return {VenueFaqItem[]} 질문/답변 목록.
 */
export function buildMissionVenueFaq(v: VenueLike): VenueFaqItem[] {
  const name = str(v.venueName);
  if (!name) return [];
  const faq: VenueFaqItem[] = [];
  const address = [str(v.location), str(v.addressDetail)]
    .filter(Boolean).join(" ");
  const region = venueRegion(v.location).full;
  const capacity = num(v.capacity);
  const list = (arr: unknown, other: unknown) => [
    ...(Array.isArray(arr) ? arr.map(str) : []), str(other),
  ].filter(Boolean);
  const services = list(v.desiredService, v.desiredServiceOther);
  const situations = list(v.churchSituation, v.churchSituationOther);

  if (address) {
    faq.push({
      q: `${name}${josa(name, "은", "는")} 어디에 있나요?`,
      a: `${address}에 있습니다.` +
        (region ? ` ${region} 지역의 국내 선교 장소입니다.` : ""),
    });
  }

  if (capacity) {
    faq.push({
      q: "몇 명까지 선교팀이 머물 수 있나요?",
      a: `최대 ${capacity}명까지 이용할 수 있습니다.`,
    });
  }

  if (services.length > 0) {
    const joined = services.join(", ");
    faq.push({
      q: "이 교회는 어떤 봉사·사역을 원하나요?",
      a: `${joined}${josa(joined, "을", "를")} 원하고 있습니다.`,
    });
  }

  if (situations.length > 0) {
    faq.push({
      q: "교회는 어떤 상황인가요?",
      a: situations.join(", "),
    });
  }

  const stay = [
    typeof v.beddingAvailable === "boolean" ?
      (v.beddingAvailable ? "침구류를 보유하고 있습니다." :
        "침구류는 없습니다.") : "",
    str(v.showerBathroom) ? `샤워실/화장실: ${str(v.showerBathroom)}` : "",
  ].filter(Boolean);
  if (stay.length > 0) {
    faq.push({q: "숙박(침구·샤워) 시설은 어떤가요?", a: stay.join(" ")});
  }

  const parking = str(v.parkingCapacity);
  if (parking) {
    faq.push({q: "주차가 가능한가요?", a: `주차 안내: ${parking}`});
  }

  if (typeof v.airConditioner === "boolean") {
    faq.push({
      q: "냉방 시설이 있나요?",
      a: v.airConditioner ? "네, 냉방 시설이 있습니다." : "냉방 시설은 없습니다.",
    });
  }

  // 화면의 "전화 문의하기" 버튼은 연락처가 있을 때만 보이므로 이 답변도 같은 조건.
  if (str(v.contactPhone)) {
    faq.push({
      q: "선교 일정은 어떻게 문의하나요?",
      a: "스테이온(STAYON PLACE)의 이 페이지에서 '전화 문의하기' 버튼으로 " +
        "담당자에게 직접 문의하실 수 있습니다.",
    });
  }

  return faq;
}

/**
 * Q&A 목록을 schema.org FAQPage 구조화 데이터 객체로 바꾼다.
 * @param {VenueFaqItem[]} faq 질문/답변 목록.
 * @return {Record<string, unknown>} FAQPage JSON-LD 객체(@context 제외).
 */
export function faqJsonLd(faq: VenueFaqItem[]): Record<string, unknown> {
  return {
    "@type": "FAQPage",
    "mainEntity": faq.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {"@type": "Answer", "text": item.a},
    })),
  };
}
