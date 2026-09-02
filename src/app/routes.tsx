import { createBrowserRouter, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { VenueList } from "./pages/VenueList";
import { VenueDetail } from "./pages/VenueDetail";
import VenueReviewWrite from "./pages/VenueReviewWrite";
import { Booking } from "./pages/Booking";
import { MyPage } from "./pages/MyPage";
import { RegisterVenue } from "./pages/RegisterVenue";
import { About } from "./pages/About";
import { Story } from "./pages/Story";
import { ComparisonPlanner } from "./pages/ComparisonPlanner";
import { BudgetPlanner } from "./pages/BudgetPlanner";
import { SmartSchedulePlanner } from "./pages/SmartSchedulePlanner";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminDashboard2 } from "./pages/AdminDashboard2";
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
      { path: "users", element: <AdminUsers /> },
      { path: "teams", element: <AdminTeams /> },
      { path: "team-inquiries", element: <AdminTeamInquiries /> },
      { path: "team-ads", element: <AdminTeamAds /> },
      { path: "band-rooms", element: <AdminBandRooms /> },
      { path: "band-room-bookings", element: <AdminBandRoomBookings /> },
      { path: "band-room-ads", element: <AdminBandRoomAds /> },
      { path: "churches", element: <AdminChurches /> },
    ],
  },
]);
