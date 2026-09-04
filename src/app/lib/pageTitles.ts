// 라우트별 브라우저 탭 제목(document.title) 매핑.
// React Router는 클라이언트 사이드 이동 시 document.title을 알아서 바꿔주지 않아서,
// 링크로 처음 들어온 페이지의 제목이 이후 다른 페이지로 이동해도 그대로 남아있던 문제를
// 고치기 위해 만들었다. Layout.tsx가 라우트가 바뀔 때마다 이 맵을 조회해서 반영한다.
//
// 장소/팀/합주실/교회처럼 이름이 있는 상세 페이지는 여기선 일단 일반적인 제목을 넣어두고,
// 각 상세 페이지(VenueDetail.tsx 등)에서 데이터를 불러온 뒤 실제 이름으로 한 번 더
// document.title을 덮어써서 더 구체적으로 만든다. (크롤러용 미리보기를 만들어주는
// functions/src/venuePreview.ts 등과 같은 제목 문구를 최대한 맞춰 통일감 있게 했다.)
const SITE_NAME = "스테이온";
export const DEFAULT_TITLE = "교회 수련회 장소 예약 | 스테이온(STAYON PLACE)";

const STATIC_TITLES: Record<string, string> = {
  "/": DEFAULT_TITLE,
  "/venues": `전국 수련회 장소 찾기 | ${SITE_NAME}`,
  "/register": `장소 등록 문의 | ${SITE_NAME}`,
  "/team-register": `외부 사역팀 등록 문의 | ${SITE_NAME}`,
  "/teams": `외부 사역팀·합주실 찾기 | ${SITE_NAME}`,
  "/teams/boost": `섭외율 높이기 | ${SITE_NAME}`,
  "/band-room-register": `합주실·연습실 등록 문의 | ${SITE_NAME}`,
  "/church-register": `전국 교회 등록 문의 | ${SITE_NAME}`,
  "/churches": `전국 교회 찾기 | ${SITE_NAME}`,
  "/venue-guide": `장소 등록 안내 | ${SITE_NAME}`,
  "/booking-guide": `예약 절차 가이드 | ${SITE_NAME}`,
  "/about": `검증 시스템 | ${SITE_NAME}`,
  "/story": `STAYON 스토리 | ${SITE_NAME}`,
  "/planner": `스마트 플래너 | ${SITE_NAME}`,
  "/smart-planner": `일정표 만들기 | ${SITE_NAME}`,
  "/schedule-guide": `일정표 가이드 | ${SITE_NAME}`,
  "/smart-planner-guide": `플래너 사용법 안내 | ${SITE_NAME}`,
  "/goods-planner": `굿즈 플래너 | ${SITE_NAME}`,
  "/budget": `예산 플래너 | ${SITE_NAME}`,
  "/programs": `레크리에이션 프로그램 게시판 | ${SITE_NAME}`,
  "/faq": `자주 묻는 질문 | ${SITE_NAME}`,
  "/stayon-rescue": `수리·렌탈 서비스 | ${SITE_NAME}`,
  "/notices": `공지사항 | ${SITE_NAME}`,
  "/safety": `환불 규정 및 안심 가이드 | ${SITE_NAME}`,
  "/partner": `파트너 정산 안내 | ${SITE_NAME}`,
  "/payment-setup": `예약금 결제 | ${SITE_NAME}`,
  "/terms": `이용약관 | ${SITE_NAME}`,
  "/privacy": `개인정보처리방침 | ${SITE_NAME}`,
  "/reviews": `수련회 후기 게시판 | ${SITE_NAME}`,
  "/review/write": `후기 작성하기 | ${SITE_NAME}`,
  "/freeboard": `자유게시판 | ${SITE_NAME}`,
  "/freeboard/write": `글쓰기 | ${SITE_NAME}`,
  "/mypage": `마이페이지 | ${SITE_NAME}`,
  "/settings/profile": `내 정보 관리 | ${SITE_NAME}`,
};

// :id처럼 값이 바뀌는 라우트는 패턴으로 매칭한다. 배열 앞쪽 항목이 우선한다.
const PATTERN_TITLES: { test: RegExp; title: string }[] = [
  { test: /^\/venue\/[^/]+\/review\/write/, title: `후기 작성하기 | ${SITE_NAME}` },
  { test: /^\/venue\/[^/]+$/, title: `수련회 장소 소개 | ${SITE_NAME}` },
  { test: /^\/booking\/[^/]+$/, title: `예약 신청 | ${SITE_NAME}` },
  { test: /^\/payment-setup\/[^/]+$/, title: `예약금 결제 | ${SITE_NAME}` },
  { test: /^\/teams\/boost$/, title: `섭외율 높이기 | ${SITE_NAME}` },
  { test: /^\/teams\/[^/]+$/, title: `외부 사역팀 소개 | ${SITE_NAME}` },
  { test: /^\/band-room\/[^/]+\/book/, title: `합주실 예약하기 | ${SITE_NAME}` },
  { test: /^\/band-room\/[^/]+$/, title: `합주실·연습실 소개 | ${SITE_NAME}` },
  { test: /^\/churches\/[^/]+$/, title: `교회 소개 | ${SITE_NAME}` },
  { test: /^\/notice\/[^/]+$/, title: `공지사항 | ${SITE_NAME}` },
  { test: /^\/admin/, title: `관리자 | ${SITE_NAME}` },
];

/** 현재 경로에 맞는 탭 제목을 반환한다. 매칭되는 게 없으면 기본 제목으로 폴백한다. */
export function getPageTitle(pathname: string): string {
  if (STATIC_TITLES[pathname]) return STATIC_TITLES[pathname];
  const matched = PATTERN_TITLES.find((p) => p.test.test(pathname));
  return matched ? matched.title : DEFAULT_TITLE;
}
