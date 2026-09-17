// 차량 렌트/버스 대여 등록·관리자 화면이 공유하는 차종 고정 목록.
// 자유 입력이 아니라 실제 교회 수련회 이동에 자주 쓰이는 차량 위주로 고정해두고,
// 목록에 없는 차종은 "기타"로 직접 입력하게 한다.
export const FIXED_VEHICLE_TYPES = [
  "카니발(9인승)", "카니발(11인승)", "스타렉스(12인승)",
  "스타리아(9인승)", "스타리아(11인승)", "카운티미니버스(25인승)", "중형버스(35인승 내외)", "45인승 대형 버스",
] as const;

export const CUSTOM_VEHICLE_TYPE_LABEL = "기타(직접입력)";

export const MAX_VEHICLE_PHOTOS = 20;

// public/car_1.png ~ car_5.png 각각이 실제로 대응하는 고정 차종.
// "중형버스(35인승 내외)"와 "기타(직접입력)"는 대응 이미지가 없어 매핑에서 빠지며,
// 호출하는 쪽에서 기본 버스 아이콘 카드로 대체해야 한다.
export const VEHICLE_TYPE_IMAGES: Record<string, string> = {
  "카니발(9인승)": "/car_1.png",
  "카니발(11인승)": "/car_1.png",
  "스타렉스(12인승)": "/car_2.png",
  "스타리아(9인승)": "/car_3.png",
  "스타리아(11인승)": "/car_3.png",
  "카운티미니버스(25인승)": "/car_4.png",
  "45인승 대형 버스": "/car_5.png",
};

// 관리자가 고정 차종 버튼이 아니라 "기타(직접입력)"에 "카니발"처럼 축약해서 입력해도
// 이미지가 붙도록, 정확히 일치하지 않으면 차종명에 포함된 키워드로 한 번 더 찾아본다.
const VEHICLE_IMAGE_KEYWORDS: { keyword: string; image: string }[] = [
  { keyword: "카니발", image: "/car_1.png" },
  { keyword: "스타렉스", image: "/car_2.png" },
  { keyword: "스타리아", image: "/car_3.png" },
  { keyword: "카운티", image: "/car_4.png" },
  { keyword: "45인승", image: "/car_5.png" },
  { keyword: "대형버스", image: "/car_5.png" },
];

export function getVehicleTypeImage(type: string): string | undefined {
  if (VEHICLE_TYPE_IMAGES[type]) return VEHICLE_TYPE_IMAGES[type];
  return VEHICLE_IMAGE_KEYWORDS.find((rule) => type.includes(rule.keyword))?.image;
}

// 고정 차종명엔 이미 "(9인승)"처럼 인원수가 포함돼 있어 별도 입력 필드 없이 재사용한다.
export function extractSeatCount(type: string): string | null {
  const m = type.match(/(\d+)\s*인승/);
  return m ? `${m[1]}인승` : null;
}

// 관리자 화면(AdminVehicleRentals)과 등록 폼(VehicleRentalRegistrationForm)이 공유하는
// 차종별 "기사 포함 여부" 값 타입. "포함"↔"별도"는 서로 배타적, "협의 가능"은 둘 중 하나와 동시 선택 가능.
export type DriverIncludedOption = "included" | "separate" | "optional";

// 여객자동차운수사업법상 25인승 이상 버스는 전문 기사 동행이 필수라, 등록 폼에서 이 차종들은
// "기사 동행"을 강제로 체크하고 잠가둔다. 그 외(승합차/기타 직접입력)는 신청자가 직접 선택한다.
export const LARGE_BUS_TYPES = ["카운티미니버스(25인승)", "중형버스(35인승 내외)", "45인승 대형 버스"] as const;

export function isLargeBusType(type: string): boolean {
  return (LARGE_BUS_TYPES as readonly string[]).includes(type);
}
