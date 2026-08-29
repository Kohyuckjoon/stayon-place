// 외부 사역팀 공개 화면(목록/상세)에서 장비 보유 여부·팀 규모를 사람이 읽기 편한
// 형태로 바꿔주는 공용 헬퍼. 등록 폼(TeamRegistrationForm.tsx)에 저장되는 원본 값은
// 그대로 두고, 화면에 보여줄 때만 이 함수들을 거친다.

// 장비 보유 여부 선택지. 등록 폼(/team-register)과 관리자 페이지(AdminTeams.tsx)가
// 동일한 선택지를 공유한다.
export const EQUIPMENT_OPTIONS = [
  { value: "자체 보유", desc: "필요한 장비를 모두 보유하고 있어요" },
  { value: "장소 장비 필요", desc: "보유 장비가 없어요 (섭외율이 낮아질 수 있어요)" },
  { value: "둘 다 가능", desc: "장비를 보유하고 있고, 장소 장비도 다룰 수 있어요" },
] as const;

// "자체 보유" / "장소 장비 필요" / "둘 다 가능" 세 가지 저장값을 뱃지 문구 목록으로 변환한다.
export function getEquipmentBadges(equipment: string): string[] {
  switch (equipment) {
    case "자체 보유":
      return ["장비 자체 보유"];
    case "둘 다 가능":
      return ["장비 자체 보유", "장소 장비 사용 가능"];
    case "장소 장비 필요":
      return ["장소 장비 필요"];
    default:
      return equipment ? [equipment] : [];
  }
}

// "5인 이하" / "6~10명" 등 팀 규모 값을 "팀 단위(00~00명 이하)" 형태로 바꾼다.
export function formatTeamSize(teamSize: string): string {
  if (!teamSize) return "";
  return `팀 단위(${teamSize.replace(/인/g, "명")})`;
}

// 개인 지원자의 활동명 옆에 붙는 분야 뱃지 문구. 세션은 실제 세션 파트(예: "베이스 기타")를
// 그대로 쓰고, 나머지 분야는 고정 문구를 붙인다.
export function getIndividualBadgeLabel(category: string, sessionLabel?: string, categoryCustomLabel?: string): string | null {
  switch (category) {
    case "세션":
      return sessionLabel || null;
    case "음향·조명":
      return "음향·조명";
    case "찬양팀":
      return "외부사역찬양팀";
    case "외부 강사":
    case "레크리에이션 강사":
      return "기독교 강사";
    case "기독교 문화 사역":
      return categoryCustomLabel || "기독교 문화 사역";
    default:
      return null;
  }
}

// 섭외율 높이기(끌어올리기 / 메인 배너) 신청·노출에서 공용으로 쓰는 슬롯 상수.
// 실제 하드 제한은 아니고(관리자가 직접 판단해서 처리), 신청 페이지·관리자 페이지에
// "현재 몇 자리 찼는지" 안내할 때 기준으로만 쓴다.
export const TOP_BOOST_MAX_SLOTS = 4;
export const MAIN_BANNER_MAX_SLOTS = 5;

// 끌어올리기(boostedUntil이 아직 안 지난) 상태인지 여부.
// TeamList.tsx에 있던 동일 로직을 신청 페이지/관리자 페이지에서도 그대로 쓰기 위해 공용화했다.
export function isTeamBoosted(team: any): boolean {
  const until = team?.boostedUntil?.toDate?.();
  return !!(until && until.getTime() > Date.now());
}
