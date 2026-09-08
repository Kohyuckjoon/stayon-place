// 장소 사진을 8개 카테고리로 나눠서 등록/관리/열람하기 위한 공용 정의.
// 등록 폼(RegisterVenue.tsx), 관리자 승인 화면(AdminDashboard.tsx),
// 장소 상세 화면(VenueDetail.tsx) 3곳이 이 정의를 공유한다.
//
// 전체 최대 장수는 VENUE_IMAGE_TOTAL_MAX가 아래 카테고리별 한도 합계로 자동 계산하므로,
// 카테고리별 한도만 지키면 전체 한도도 자동으로 지켜진다(따로 검사할 필요 없음).
export type VenueImageCategoryKey =
  | "entrance"
  | "mainHall"
  | "worshipSetup"
  | "kitchen"
  | "lodging"
  | "outdoor"
  | "restroom"
  | "etc";

export interface VenueImageCategoryDef {
  key: VenueImageCategoryKey;
  label: string;
  max: number;
}

export const VENUE_IMAGE_CATEGORIES: VenueImageCategoryDef[] = [
  { key: "entrance", label: "예배당 / 입구", max: 3 },
  { key: "mainHall", label: "예배당 전체", max: 4 },
  { key: "worshipSetup", label: "예배 셋팅 (음향 / 세션 / 마이크 / 보면대 / 스탠드 등)", max: 20 },
  { key: "kitchen", label: "주방 및 식당 시설 (에어컨 유무 포함)", max: 12 },
  { key: "lodging", label: "숙소 (에어컨 유무 포함)", max: 15 },
  { key: "outdoor", label: "야외 및 바베큐장", max: 5 },
  { key: "restroom", label: "화장실 / 샤워실", max: 5 },
  { key: "etc", label: "기타", max: 5 },
];

export const VENUE_IMAGE_TOTAL_MAX = VENUE_IMAGE_CATEGORIES.reduce((sum, c) => sum + c.max, 0);

export type VenueImagesByCategory = Partial<Record<VenueImageCategoryKey, string[]>>;

export function emptyVenueImagesByCategory(): Record<VenueImageCategoryKey, string[]> {
  return VENUE_IMAGE_CATEGORIES.reduce((acc, c) => {
    acc[c.key] = [];
    return acc;
  }, {} as Record<VenueImageCategoryKey, string[]>);
}

// 카테고리 순서(예배당/입구 → ... → 기타)대로 이어붙여, 기존에 쓰던 평평한 배열과
// 호환되는 목록을 만든다. venue.images[0]을 대표 사진으로 쓰는 기존 화면들
// (장소 카드, 카카오톡 링크 미리보기 등)이 이 순서를 그대로 이어받는다.
export function flattenVenueImages(byCategory: VenueImagesByCategory | undefined | null): string[] {
  if (!byCategory) return [];
  return VENUE_IMAGE_CATEGORIES.flatMap((c) => byCategory[c.key] || []);
}

// 카테고리 구분이 없던 기존 장소 데이터를 "카테고리별 보기"에 표시할 때만 쓰는
// 화면 전용 변환. DB에는 절대 쓰지 않는다 — 관리자가 실제로 편집·저장하기 전까지는
// 매번 이 함수로 그때그때 만들어서 보여줄 뿐이다. 기존 사진은 전부 "기타"로 취급한다.
export function toDisplayImagesByCategory(venue: {
  imagesByCategory?: VenueImagesByCategory;
  images?: string[];
}): VenueImagesByCategory {
  if (venue.imagesByCategory && Object.keys(venue.imagesByCategory).length > 0) {
    return venue.imagesByCategory;
  }
  return venue.images && venue.images.length > 0 ? { etc: venue.images } : {};
}
