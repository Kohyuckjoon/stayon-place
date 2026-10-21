import { createBrowserRouter, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { VenueList } from "./pages/VenueList";
import { VenueDetail } from "./pages/VenueDetail";
import VenueReviewWrite from "./pages/VenueReviewWrite";
import { Booking } from "./pages/Booking";
import { MyPage } from "./pages/MyPage";
import { RegisterVenue } from "./pages/RegisterVenue";
import MissionVenueRegistrationForm from "./pages/MissionVenueRegistrationForm";
import { About } from "./pages/About";
import { Story } from "./pages/Story";
import { ComparisonPlanner } from "./pages/ComparisonPlanner";
import { BudgetPlanner } from "./pages/BudgetPlanner";
import { SmartSchedulePlanner } from "./pages/SmartSchedulePlanner";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminDashboard2 } from "./pages/AdminDashboard2";
import { AdminAnalytics } from "./pages/AdminAnalytics";
import { AdminHub } from "./pages/AdminHub";
import { AdminUsers } from "./pages/AdminUsers";
import { AdminTeams } from "./pages/AdminTeams";
import { AdminTeamInquiries } from "./pages/AdminTeamInquiries";
import { AdminTeamAds } from "./pages/AdminTeamAds";
import { AdminBandRooms } from "./pages/AdminBandRooms";
import { AdminBandRoomBookings } from "./pages/AdminBandRoomBookings";
import { AdminBandRoomAds } from "./pages/AdminBandRoomAds";
import { AdminChurches } from "./pages/AdminChurches";
import TeamRegistrationForm from "./pages/TeamRegistrationForm";
import BandRoomRegistrationForm from "./pages/BandRoomRegistrationForm";
import ChurchRegistrationForm from "./pages/ChurchRegistrationForm";
import { TeamList } from "./pages/TeamList";
import { TeamDetail } from "./pages/TeamDetail";
import { TeamBoost } from "./pages/TeamBoost";
import { BandRoomDetail } from "./pages/BandRoomDetail";
import { BandRoomBooking } from "./pages/BandRoomBooking";
import { ChurchList } from "./pages/ChurchList";
import { ChurchDetail } from "./pages/ChurchDetail";
import GoodsStoreRegistrationForm from "./pages/GoodsStoreRegistrationForm";
import { AdminGoodsStore } from "./pages/AdminGoodsStore";
import { GoodsStoreList } from "./pages/GoodsStoreList";
import { GoodsStoreDetail } from "./pages/GoodsStoreDetail";
import GroupShirtsRegistrationForm from "./pages/GroupShirtsRegistrationForm";
import { AdminGroupShirts } from "./pages/AdminGroupShirts";
import { GroupShirtsList } from "./pages/GroupShirtsList";
import { GroupShirtsDetail } from "./pages/GroupShirtsDetail";
import VehicleRentalRegistrationForm from "./pages/VehicleRentalRegistrationForm";
import { AdminVehicleRentals } from "./pages/AdminVehicleRentals";
import { SoundConstructionGuide } from "./pages/SoundConstructionGuide";
import SoundConstructionRegistrationForm from "./pages/SoundConstructionRegistrationForm";
import { AdminSoundConstruction } from "./pages/AdminSoundConstruction";
import { AdminMissionVenues } from "./pages/AdminMissionVenues";
import { VehicleRentalList } from "./pages/VehicleRentalList";
import { VehicleRentalDetail } from "./pages/VehicleRentalDetail";
import { MissionVenueDetail } from "./pages/MissionVenueDetail";
import { PrivateRoute } from "./lib/PrivateRoute";
import ProfileSettings from "./pages/ProfileSettings";
import SafetyGuide from "./pages/SafetyGuide"; // 추가
import PaymentSetup from "./pages/PaymentSetup";
import PaymentMethodSetup from "./pages/PaymentMethodSetup";
import { Terms, Privacy } from "./pages/LegalPages";
import { FAQ } from "./pages/FAQ";
import { VenueGuide } from "./pages/VenueGuide";
import { AdminGuard } from "./components/AdminGuard";
// import { Login } from "./pages/Login";
import { Notice } from "./pages/Notice"; 
import NoticeDetail from "./pages/NoticeDetail";
import ProgramHub from "./pages/ProgramHub";
import StayOnRescue from "./pages/StayOnRescue";
import ReviewList from "./pages/ReviewList";
import ReviewWrite from "./pages/ReviewWrite";
import FreeBoardList from "./pages/FreeBoardList";
import FreeBoardWrite from "./pages/FreeBoardWrite";
import PartnerGuide from "./pages/PartnerGuide";
// import BookingProcess from "./pages/BookingGuide";
import BookingGuide from "./pages/BookingGuide";
import { SmartPlannerGuide } from "./pages/SmartPlannerGuide";
import { ScheduleGuide } from "./pages/ScheduleGuide";
import { CustomGoodsPlanner } from "./pages/CustomGoodsPlanner";
import { ComingSoon } from "./pages/ComingSoon";

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
    element: <AdminGuard><Outlet /></AdminGuard>,
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
    ],
  },
]);
