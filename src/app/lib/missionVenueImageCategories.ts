// 국내 선교 장소 등록(/mission-register)이 쓰는 사진 카테고리 정의.
// venueImageCategories.ts(수련회 장소)와 완전히 분리 관리하되, "야외 및 바베큐장" 카테고리만
// 뺀 나머지 7개는 동일하게 유지한다. export하는 이름은 venueImageCategories.ts와 똑같이
// 맞춰서, 이 파일을 가져다 쓰는 쪽(MissionVenueRegistrationForm.tsx 등)이 import 경로만
// 바꾸면 되고 내부 코드는 손댈 필요가 없게 했다.
export type VenueImageCategoryKey =
  | "entrance"
  | "mainHall"
  | "worshipSetup"
  | "kitchen"
  | "lodging"
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

export function flattenVenueImages(byCategory: VenueImagesByCategory | undefined | null): string[] {
  if (!byCategory) return [];
  return VENUE_IMAGE_CATEGORIES.flatMap((c) => byCategory[c.key] || []);
}

export function toDisplayImagesByCategory(venue: {
  imagesByCategory?: VenueImagesByCategory;
  images?: string[];
}): VenueImagesByCategory {
  if (venue.imagesByCategory && Object.keys(venue.imagesByCategory).length > 0) {
    return venue.imagesByCategory;
  }
  return venue.images && venue.images.length > 0 ? { etc: venue.images } : {};
}
