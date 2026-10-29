// 사전답사 체크리스트 문항. 전부 "체크 + 한 줄 메모"라는 동일한 형태로 통일해서
// 보여준다 - 항목마다 숫자/시간/날짜 등 다른 입력 형식을 쓰면 서식처럼 느껴져서
// 답사 현장에서 폰으로 빠르게 체크하기 불편하다는 피드백을 반영했다.
// 장소 사용료/최대 숙박 인원/샤워실·화장실 개수/음향·빔 장비/식당 수용 인원/
// 식사 제공 여부/직접 취사/주방 기구/바비큐 가능 여부/찬양 마감 시간/드럼·건반 사용 가능
// 여부/시설·여행자 보험 여부는 스테이온에 "등록된 장소"라면 이미 장소 상세페이지에
// 구조화된 데이터로 나와있어서(그리고 바뀔 일이 거의 없는 값이라) 기본적으로는 다시
// 물어보지 않는다. 다만 이건 "스테이온 데이터를 믿고 뺀 것"이라 스테이온에 등록 안 된
// 장소(venueId 없이 들어온 경우)는 그 데이터 자체가 없으니, unregisteredOnly 항목들만
// 그 경우에 한해 자동으로 다시 보여준다(getVisibleSections 참고). STAYON은 기본적으로
// 단독 대여라 "외부 교회도 빌릴 수 있는지" 같은 질문은 등록 여부와 무관하게 의미가
// 없어서 아예 뺐다.
// 체크인/체크아웃 시간과 잔금 처리는 일반 체크 항목이 아니라 ChecklistForm.tsx에서
// 별도 UI(기본값 안내 + 필요할 때만 여는 입력, 절차 안내 문구)로 따로 보여준다.
// 섹션은 상단 탭으로 전환하며 보여준다(아코디언 X) - 탭 이름은 "예배당/취침공간/주차공간"
// 처럼 실제 공간·항목 단위로 붙여서 지금 어디를 체크하고 있는지 바로 감이 오게 했다.
export interface ChecklistItem { id: string; label: string; unregisteredOnly?: boolean }
export interface ChecklistSection { title: string; items: ChecklistItem[] }

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    title: "기본 정보",
    items: [
      { id: "basic-1", label: "교회에서 걸리는 시간 / 대중교통 접근성을 확인했나요?" },
      { id: "basic-2", label: "장소 사진을 충분히 찍었나요?" },
    ],
  },
  {
    title: "예약·연락",
    items: [
      { id: "res-1", label: "원하는 날짜에 예약이 가능한지 확인했나요?" },
    ],
  },
  {
    title: "비용",
    items: [
      { id: "cost-1", label: "장소 사용료를 확인했나요? (인당 요금인지, 통대관인지)", unregisteredOnly: true },
      { id: "cost-2", label: "예약금을 확인했나요?" },
      { id: "cost-4", label: "최소 인원 기준과 인원 추가 시 요금을 확인했나요?" },
    ],
  },
  {
    title: "취침공간",
    items: [
      { id: "lodge-1", label: "최대 숙박 인원을 확인했나요?", unregisteredOnly: true },
      { id: "lodge-2", label: "방 개수와 방당 인원을 확인했나요?" },
      { id: "lodge-3", label: "남녀 층·동이 분리되는지 확인했나요?" },
      { id: "lodge-4", label: "이불·침구 제공 여부를 확인했나요?" },
      { id: "lodge-5", label: "샤워실·화장실 개수를 확인했나요?", unregisteredOnly: true },
      { id: "lodge-6", label: "냉난방 상태를 확인했나요? (겨울 수련회면 꼭 확인)" },
    ],
  },
  {
    title: "예배당",
    items: [
      { id: "worship-1", label: "예배·찬양이 가능한지 확인했나요?" },
      { id: "worship-2", label: "예배실 수용 인원을 확인했나요?" },
      { id: "worship-3", label: "밤 몇 시까지 찬양 가능한지 확인했나요?", unregisteredOnly: true },
      { id: "worship-4", label: "음향 장비(스피커·믹서 등)가 있나요?", unregisteredOnly: true },
      { id: "worship-8", label: "피아노·드럼 등 악기가 있나요?" },
      { id: "worship-9", label: "마이크는 몇 개까지 쓸 수 있나요?" },
    ],
  },
  {
    title: "식사",
    items: [
      { id: "meal-1", label: "식사 제공 여부를 확인했나요?", unregisteredOnly: true },
      { id: "meal-2", label: "직접 취사가 가능한지 확인했나요?", unregisteredOnly: true },
      { id: "meal-3", label: "주방 기구·식기 제공 여부를 확인했나요?", unregisteredOnly: true },
      { id: "meal-4", label: "식당 수용 인원을 확인했나요? (한 번에 다 먹을 수 있는지)", unregisteredOnly: true },
      { id: "meal-5", label: "바비큐·야외 취사가 가능한지 확인했나요?", unregisteredOnly: true },
    ],
  },
  {
    title: "시설·활동",
    items: [
      { id: "fac-1", label: "운동장·체육관이 있는지 확인했나요?" },
      { id: "fac-2", label: "캠프파이어·바베큐·야외 활동이 가능한지 확인했나요?" },
      { id: "fac-3", label: "수영장·물놀이 시설을 확인했나요? (여름 수련회용)" },
      { id: "fac-4", label: "와이파이가 되는지 확인했나요?" },
    ],
  },
  {
    title: "주차공간",
    items: [
      { id: "parking-1", label: "몇 대 정도 주차가 가능한가요?" },
    ],
  },
  {
    title: "교통·안전",
    items: [
      { id: "safe-1", label: "대형버스 진입이 가능한지 확인했나요?" },
      { id: "safe-3", label: "근처 병원·응급실까지 거리를 확인했나요?" },
      { id: "safe-4", label: "근처 편의점·마트가 있는지 확인했나요?" },
      // { id: "safe-5", label: "시설 보험·여행자보험 필요 여부를 확인했나요?", unregisteredOnly: true },
    ],
  },
  {
    title: "이용 규칙",
    items: [
      { id: "rule-1", label: "퇴실 청소와 쓰레기 처리 방법을 확인했나요?" },
      { id: "rule-2", label: "주의사항을 확인했나요?" },
    ],
  },
];

// 로그인 전 체크해둔 내용을 로그인 시점에 그대로 저장할 때(ChecklistForm.tsx) 쓰는
// 전체 id 목록 - 그 시점엔 이미 체크된 것만 골라내므로 등록/미등록 구분 없이 전부 포함.
export const ALL_CHECKLIST_ITEM_IDS: string[] = CHECKLIST_SECTIONS.flatMap((s) => s.items.map((i) => i.id));

// 등록된 장소(venueId 있음)면 unregisteredOnly 항목은 스테이온 장소 페이지에 이미 있는
// 정보라 숨기고, 등록 안 된 장소면 그 데이터가 없으니 전부 보여준다. 항목이 하나도 안
// 남는 섹션(예: "식사")은 통째로 숨긴다.
export function getVisibleSections(isRegisteredVenue: boolean): ChecklistSection[] {
  return CHECKLIST_SECTIONS
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.unregisteredOnly || !isRegisteredVenue) }))
    .filter((s) => s.items.length > 0);
}

export function getTotalChecklistItems(isRegisteredVenue: boolean): number {
  return getVisibleSections(isRegisteredVenue).reduce((sum, s) => sum + s.items.length, 0);
}
