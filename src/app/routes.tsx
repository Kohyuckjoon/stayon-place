import { Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import { lazyPage, PageLoading } from "./lib/lazyPage";
// 첫 진입이 많은 화면(메인·장소 목록·장소 상세)과 예약·결제 화면은 지금처럼 바로 불러오고,
// 나머지 화면(관리자 포함)은 그 화면에 들어갈 때 따로 받는다(lazyPage). 예전엔 82개 화면이
// 한 파일에 다 들어 있어서 메인만 보려는 방문자도 관리자 화면 코드까지 전부 받아야 했다.
import { Home } from "./pages/Home";
import { VenueList } from "./pages/VenueList";
import { VenueDetail } from "./pages/VenueDetail";
const VenueReviewWrite = lazyPage(() => import("./pages/VenueReviewWrite"), "default");
import { Booking } from "./pages/Booking";
const MyPage = lazyPage(() => import("./pages/MyPage"), "MyPage");
const RegisterVenue = lazyPage(() => import("./pages/RegisterVenue"), "RegisterVenue");
const MissionVenueRegistrationForm = lazyPage(() => import("./pages/MissionVenueRegistrationForm"), "default");
const About = lazyPage(() => import("./pages/About"), "About");
const Story = lazyPage(() => import("./pages/Story"), "Story");
const ComparisonPlanner = lazyPage(() => import("./pages/ComparisonPlanner"), "ComparisonPlanner");
const BudgetPlanner = lazyPage(() => import("./pages/BudgetPlanner"), "BudgetPlanner");
const SmartSchedulePlanner = lazyPage(() => import("./pages/SmartSchedulePlanner"), "SmartSchedulePlanner");
const AdminDashboard = lazyPage(() => import("./pages/AdminDashboard"), "AdminDashboard");
const AdminDashboard2 = lazyPage(() => import("./pages/AdminDashboard2"), "AdminDashboard2");
const AdminAnalytics = lazyPage(() => import("./pages/AdminAnalytics"), "AdminAnalytics");
const AdminHub = lazyPage(() => import("./pages/AdminHub"), "AdminHub");
const AdminUsers = lazyPage(() => import("./pages/AdminUsers"), "AdminUsers");
const AdminTeams = lazyPage(() => import("./pages/AdminTeams"), "AdminTeams");
const AdminTeamInquiries = lazyPage(() => import("./pages/AdminTeamInquiries"), "AdminTeamInquiries");
const AdminTeamAds = lazyPage(() => import("./pages/AdminTeamAds"), "AdminTeamAds");
const AdminBandRooms = lazyPage(() => import("./pages/AdminBandRooms"), "AdminBandRooms");
const AdminBandRoomBookings = lazyPage(() => import("./pages/AdminBandRoomBookings"), "AdminBandRoomBookings");
const AdminBandRoomAds = lazyPage(() => import("./pages/AdminBandRoomAds"), "AdminBandRoomAds");
const AdminChurches = lazyPage(() => import("./pages/AdminChurches"), "AdminChurches");
const TeamRegistrationForm = lazyPage(() => import("./pages/TeamRegistrationForm"), "default");
const BandRoomRegistrationForm = lazyPage(() => import("./pages/BandRoomRegistrationForm"), "default");
const ChurchRegistrationForm = lazyPage(() => import("./pages/ChurchRegistrationForm"), "default");
const TeamList = lazyPage(() => import("./pages/TeamList"), "TeamList");
const TeamDetail = lazyPage(() => import("./pages/TeamDetail"), "TeamDetail");
const TeamBoost = lazyPage(() => import("./pages/TeamBoost"), "TeamBoost");
const BandRoomDetail = lazyPage(() => import("./pages/BandRoomDetail"), "BandRoomDetail");
import { BandRoomBooking } from "./pages/BandRoomBooking";
const ChurchList = lazyPage(() => import("./pages/ChurchList"), "ChurchList");
const ChurchDetail = lazyPage(() => import("./pages/ChurchDetail"), "ChurchDetail");
const GoodsStoreRegistrationForm = lazyPage(() => import("./pages/GoodsStoreRegistrationForm"), "default");
const AdminGoodsStore = lazyPage(() => import("./pages/AdminGoodsStore"), "AdminGoodsStore");
const GoodsStoreList = lazyPage(() => import("./pages/GoodsStoreList"), "GoodsStoreList");
const GoodsStoreDetail = lazyPage(() => import("./pages/GoodsStoreDetail"), "GoodsStoreDetail");
const GroupShirtsRegistrationForm = lazyPage(() => import("./pages/GroupShirtsRegistrationForm"), "default");
const AdminGroupShirts = lazyPage(() => import("./pages/AdminGroupShirts"), "AdminGroupShirts");
const GroupShirtsList = lazyPage(() => import("./pages/GroupShirtsList"), "GroupShirtsList");
const GroupShirtsDetail = lazyPage(() => import("./pages/GroupShirtsDetail"), "GroupShirtsDetail");
const VehicleRentalRegistrationForm = lazyPage(() => import("./pages/VehicleRentalRegistrationForm"), "default");
const AdminVehicleRentals = lazyPage(() => import("./pages/AdminVehicleRentals"), "AdminVehicleRentals");
const SoundConstructionGuide = lazyPage(() => import("./pages/SoundConstructionGuide"), "SoundConstructionGuide");
const SoundConstructionRegistrationForm = lazyPage(() => import("./pages/SoundConstructionRegistrationForm"), "default");
const AdminSoundConstruction = lazyPage(() => import("./pages/AdminSoundConstruction"), "AdminSoundConstruction");
const AdminMissionVenues = lazyPage(() => import("./pages/AdminMissionVenues"), "AdminMissionVenues");
const AdminVenueSuggestions = lazyPage(() => import("./pages/AdminVenueSuggestions"), "AdminVenueSuggestions");
const AdminMessageTemplates = lazyPage(() => import("./pages/AdminMessageTemplates"), "AdminMessageTemplates");
const AdminChecklists = lazyPage(() => import("./pages/AdminChecklists"), "AdminChecklists");
const VehicleRentalList = lazyPage(() => import("./pages/VehicleRentalList"), "VehicleRentalList");
const VehicleRentalDetail = lazyPage(() => import("./pages/VehicleRentalDetail"), "VehicleRentalDetail");
const MissionVenueDetail = lazyPage(() => import("./pages/MissionVenueDetail"), "MissionVenueDetail");
import { PrivateRoute } from "./lib/PrivateRoute";
const ProfileSettings = lazyPage(() => import("./pages/ProfileSettings"), "default");
const SafetyGuide = lazyPage(() => import("./pages/SafetyGuide"), "default"); // 추가
import PaymentSetup from "./pages/PaymentSetup";
import PaymentMethodSetup from "./pages/PaymentMethodSetup";
const Terms = lazyPage(() => import("./pages/LegalPages"), "Terms");
const Privacy = lazyPage(() => import("./pages/LegalPages"), "Privacy");
const FAQ = lazyPage(() => import("./pages/FAQ"), "FAQ");
const VenueGuide = lazyPage(() => import("./pages/VenueGuide"), "VenueGuide");
import { AdminGuard } from "./components/AdminGuard";
// import { Login } from "./pages/Login";
const Notice = lazyPage(() => import("./pages/Notice"), "Notice");
const NoticeDetail = lazyPage(() => import("./pages/NoticeDetail"), "default");
const ProgramHub = lazyPage(() => import("./pages/ProgramHub"), "default");
const StayOnRescue = lazyPage(() => import("./pages/StayOnRescue"), "default");
const ReviewList = lazyPage(() => import("./pages/ReviewList"), "default");
const ReviewWrite = lazyPage(() => import("./pages/ReviewWrite"), "default");
const FreeBoardList = lazyPage(() => import("./pages/FreeBoardList"), "default");
const FreeBoardWrite = lazyPage(() => import("./pages/FreeBoardWrite"), "default");
const PartnerGuide = lazyPage(() => import("./pages/PartnerGuide"), "default");
// import BookingProcess from "./pages/BookingGuide";
const BookingGuide = lazyPage(() => import("./pages/BookingGuide"), "default");
const SmartPlannerGuide = lazyPage(() => import("./pages/SmartPlannerGuide"), "SmartPlannerGuide");
const ScheduleGuide = lazyPage(() => import("./pages/ScheduleGuide"), "ScheduleGuide");
const CustomGoodsPlanner = lazyPage(() => import("./pages/CustomGoodsPlanner"), "CustomGoodsPlanner");
const ComingSoon = lazyPage(() => import("./pages/ComingSoon"), "ComingSoon");
const ChecklistForm = lazyPage(() => import("./pages/ChecklistForm"), "default");
const ChecklistList = lazyPage(() => import("./pages/ChecklistList"), "default");


export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />, // Component 대신 element로 통일하여 안정성 확보
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "venues",
        element: <VenueList />,
      },
      {
        path: "venue/:id",
        element: <VenueDetail />,
      },
      {
        path: "venue/:id/review/write",
        element: <VenueReviewWrite />,
      },
      {
        path: "checklists", // 나의 사전답사 체크리스트 목록
        element: <ChecklistList />,
      },
      {
        path: "checklist/new", // 새 사전답사 체크리스트 작성 (?venueId= 로 등록된 장소 정보 미리 채움)
        element: <ChecklistForm />,
      },
      {
        path: "checklist/:id", // 저장된 사전답사 체크리스트 보기/수정
        element: <ChecklistForm />,
      },
      {
        path: "booking/:id",
        element: <Booking />,
      },
      {
        path: "mypage",
        element: <MyPage />,
      },

      {
        path: "payment-setup/:bookingId",
        element: (
          <PrivateRoute>
            <PaymentSetup />
          </PrivateRoute>
        ),
      },
      {
        path: "settings/profile",
        element: (
          <PrivateRoute>
            <ProfileSettings />
          </PrivateRoute>
        ),
      },
      {
        path: "register", // 헤더의 /register와 매칭
        element: (<RegisterVenue />),
      },
      {
        path: "mission-register", // 국내 선교 장소 등록
        element: (<MissionVenueRegistrationForm />),
      },
      {
        path: "team-register", // 외부 사역팀 등록 문의
        element: <TeamRegistrationForm />,
      },
      {
        path: "teams", // 외부 사역팀 목록
        element: <TeamList />,
      },
      {
        path: "teams/:id", // 외부 사역팀 상세
        element: <TeamDetail />,
      },
      {
        path: "teams/boost", // 섭외율 높이기(상단 노출 / 메인 배너) 신청
        element: <TeamBoost />,
      },
      {
        path: "band-room-register", // 합주실·연습실 등록 문의
        element: <BandRoomRegistrationForm />,
      },
      {
        path: "band-room/:id", // 합주실·연습실 상세
        element: <BandRoomDetail />,
      },
      {
        path: "band-room/:id/book", // 합주실 Track2 슬롯 예약·결제
        element: <BandRoomBooking />,
      },
      {
        path: "church-register", // 전국 교회 등록 문의
        element: <ChurchRegistrationForm />,
      },
      {
        path: "churches", // 전국 교회 목록
        element: <ChurchList />,
      },
      {
        path: "churches/:id", // 전국 교회 상세
        element: <ChurchDetail />,
      },
      {
        path: "goods-register", // 크리스천 굿즈 등록 문의
        element: <GoodsStoreRegistrationForm />,
      },
      {
        path: "goods", // 크리스천 굿즈 목록
        element: <GoodsStoreList />,
      },
      {
        path: "goods/:id", // 크리스천 굿즈 상세
        element: <GoodsStoreDetail />,
      },
      {
        path: "shirts-register", // 단체티·기념품 등록 문의
        element: <GroupShirtsRegistrationForm />,
      },
      {
        path: "shirts", // 단체티·기념품 목록
        element: <GroupShirtsList />,
      },
      {
        path: "shirts/:id", // 단체티·기념품 상세
        element: <GroupShirtsDetail />,
      },
      {
        path: "vehicle-register", // 차량·버스 대여 등록 문의
        element: <VehicleRentalRegistrationForm />,
      },
      {
        path: "sound-guide", // 음향 시공 문의 안내 (온라인 신청/전화 문의 중 선택)
        element: <SoundConstructionGuide />,
      },
      {
        path: "sound-register", // 음향 시공 견적 신청
        element: <SoundConstructionRegistrationForm />,
      },
      {
        path: "vehicles", // 차량·버스 대여 목록
        element: <VehicleRentalList />,
      },
      {
        // 국내 선교 장소 "목록"은 별도 페이지가 아니라 /venues?category=mission으로 흡수됨
        // (VenueList.tsx가 쿼리스트링으로 수련회/국내선교 탭을 전환). 상세 페이지만 유지.
        path: "mission-venues/:id", // 국내 선교 장소 상세
        element: <MissionVenueDetail />,
      },
      {
        // Header.tsx "장소 찾기" > "연합 수련회 장소" 서브메뉴 2개. 아직 실제 콘텐츠가
        // 없어서 우선 공용 준비중 페이지로 연결해둔다.
        path: "union-camp-info",
        element: <ComingSoon title="연합 캠프 수련회 정보" description="여러 교회가 함께하는 연합 캠프 수련회 정보를 준비하고 있어요. 조금만 기다려주세요!" />,
      },
      {
        path: "stayon-union-camp",
        element: <ComingSoon title="STAYON 국내 연합 캠프" description="스테이온이 직접 준비하는 국내 연합 캠프예요. 곧 자세한 내용으로 찾아뵐게요!" />,
      },
      {
        path: "vehicles/:id", // 차량·버스 대여 상세
        element: <VehicleRentalDetail />,
      },
      {
        path: "venue-guide", // 이 부분이 모바일 메뉴의 Link와 매칭됩니다.
        element: <VenueGuide />,
      },
      {
        path: "booking-guide", // 2. 장소 예약 절차 가이드 페이지 경로 추가
        element: <BookingGuide />,
      },
      {
        path: "about",
        element: <About />,
      },
      {
        path: "story",
        element: <Story />,
      },
      {
        path: "planner",
        element: <ComparisonPlanner />,
      },
      {
        path: "smart-planner",
        element: <SmartSchedulePlanner />,
      },
      {
        path: "schedule-guide",
        element: <ScheduleGuide />,
      },
      {
        path: "smart-planner-guide",
        element: <SmartPlannerGuide />,
      },
      {
        path: "goods-planner",
        element: <CustomGoodsPlanner />,
      },
      {
        path: "budget", // 헤더의 /budget과 매칭
        element: (<BudgetPlanner />),
      },
      {
        path: "programs", 
        element: <ProgramHub />,
      },
      {
        path: "faq",
        element: <FAQ />,
      },
      {
        path: "stayon-rescue", // localhost:5173/stayon-rescue 로 접속 가능
        element: <StayOnRescue />,
      },

      /* 공지사항(Notice) 섹션 추가 */
      {
        path: "notices", // 공지사항 목록 페이지 (/notices)
        element: <Notice />,
      },
      {
        path: "notice/:id", // 공지사항 상세 페이지 (/notice/1)
        element: <NoticeDetail />,
      },

      {
        path: "/",
        children: [
          { index: true, element: <Home /> },
          { path: "safety", element: <SafetyGuide /> }, // 환불 규정 및 안심 가이드 페이지 추가
          { path: "partner", element: <PartnerGuide /> }, // 파트너 정산/안내 정책
        ],
      },
      {
        path: "payment-setup", // 주소창에 localhost:5173/test-payment 라고 치면 나옵니다.
        element: <PaymentMethodSetup />,
      },
      {
        path: "terms",
        element: <Terms />,
      },
      {
        path: "privacy",
        element: <Privacy />,
      },
      { path: "reviews",
        element: <ReviewList />
      },
      { path: "review/write",
        element: <ReviewWrite />
      },
      { path: "freeboard",
        element: <FreeBoardList />
      },
      { path: "freeboard/write",
        element: <FreeBoardWrite />
      },
    ],
  },

  /* --- 관리자 섹션: 경로 구조 명확화 --- */
  {
    path: "admin",
    element: <AdminGuard><Suspense fallback={<PageLoading />}><Outlet /></Suspense></AdminGuard>,
    children: [
      { index: true, element: <AdminHub /> },
      { path: "venues", element: <AdminDashboard /> },
      { path: "bookings", element: <AdminDashboard2 /> },
      { path: "dashboard", element: <AdminAnalytics /> },
      { path: "users", element: <AdminUsers /> },
      { path: "teams", element: <AdminTeams /> },
      { path: "team-inquiries", element: <AdminTeamInquiries /> },
      { path: "team-ads", element: <AdminTeamAds /> },
      { path: "band-rooms", element: <AdminBandRooms /> },
      { path: "band-room-bookings", element: <AdminBandRoomBookings /> },
      { path: "band-room-ads", element: <AdminBandRoomAds /> },
      { path: "churches", element: <AdminChurches /> },
      { path: "goods", element: <AdminGoodsStore /> },
      { path: "shirts", element: <AdminGroupShirts /> },
      { path: "vehicles", element: <AdminVehicleRentals /> },
      { path: "mission-venues", element: <AdminMissionVenues /> },
      { path: "sound-construction", element: <AdminSoundConstruction /> },
      { path: "venue-suggestions", element: <AdminVenueSuggestions /> },
      { path: "message-templates", element: <AdminMessageTemplates /> },
      { path: "checklists", element: <AdminChecklists /> },
    ],
  },
]);
