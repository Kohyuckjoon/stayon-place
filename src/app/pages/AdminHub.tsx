import { useState, useEffect } from "react";
import { db, functions } from "../lib/firebase"; // firebase 설정 불러오기
import { httpsCallable } from "firebase/functions";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom"; // 라우터 연동 필수
import { motion } from "framer-motion";
import {
  Building2, ClipboardCheck, ChevronRight, Home, Users, Mic2, Music,
  LayoutDashboard, ClipboardList, Megaphone, MapPinned, BarChart3, CreditCard,
  Church, Gift, Shirt, Car, Volume2, MessageSquareText
} from "lucide-react";

// --- 디자인 컴포넌트 (스타일 카드) ---

interface HubCardProps {
  to: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string; // 카드 배경 그라데이션 (메인 배너와 같은 톤)
  count?: number; // 대기 중인 신청 건수
  // alert: 검토 대기 건수 / info: 총 회원 수처럼 단순 안내 / plain: 건수 없는 바로가기(문자 템플릿)
  badgeVariant?: "alert" | "info" | "plain";
  badgeLabel?: (count: number) => string;
}

// 컬러 카드 - 항목마다 다른 그라데이션 배경 + 흰 글씨 + 오른쪽 아래 큰 반투명 아이콘.
// 대기 건수는 카드 가운데 큰 숫자로, 대기가 없으면 흐린 "대기 없음".
const HubCard = ({ to, title, description, icon: Icon, gradient, count = 0, badgeVariant = "alert", badgeLabel }: HubCardProps) => {
  const hasPending = badgeVariant === "alert" && count > 0;
  return (
    <Link to={to} className="group block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -4 }}
        className={`relative overflow-hidden ${gradient} text-white p-5 rounded-[24px] h-[176px] flex flex-col shadow-[0_12px_32px_rgba(0,0,0,0.12)] group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition-shadow`}
      >
        {/* 큰 반투명 아이콘 장식 */}
        <Icon className="absolute -right-5 -bottom-5 w-32 h-32 text-white/15 rotate-12 stroke-[1.5] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110" />

        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[18px] font-black leading-snug tracking-tight break-keep">{title}</h2>
            <p className="text-white/75 text-[12px] font-medium leading-snug break-keep line-clamp-1 mt-0.5">{description}</p>
          </div>
          {hasPending && <span className="mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full bg-[#FFE066] shadow-[0_0_0_4px_rgba(255,224,102,0.3)] animate-pulse" />}
        </div>

        <div className="relative mt-auto flex items-end justify-between gap-2">
          {badgeVariant === "info" ? (
            <p className="text-[26px] font-black leading-none tracking-tight">{badgeLabel ? badgeLabel(count) : `${count}`}</p>
          ) : hasPending ? (
            // 컬러 배경 위 흰 숫자는 눈에 잘 안 들어와서, 흰 바탕 + 빨간 숫자 배지로 띄운다.
            // "검토 대기" 문구는 위에 따로, 건수만 배지 안에.
            <div>
              <p className="text-[12px] font-black text-white/85 mb-1.5">{badgeLabel ? badgeLabel(count) : "검토 대기"}</p>
              <div className="inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 bg-white rounded-2xl shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
                <span className="w-2 h-2 rounded-full bg-[#F04452] animate-pulse" />
                <span className="text-[26px] font-black text-[#F04452] leading-none tracking-tight">{count}<span className="text-[15px] ml-0.5">건</span></span>
              </div>
            </div>
          ) : badgeVariant === "plain" ? (
            <span />
          ) : (
            <p className="text-[15px] font-black text-white/60">대기 없음</p>
          )}
          <span className="shrink-0 flex items-center gap-0.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-[12px] font-black group-hover:bg-white group-hover:text-[#191F28] transition-colors">
            바로 가기 <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
};

// "전체 메뉴" - 위 큰 카드에 없는 관리자 페이지들. (굿즈·단체티는 위 큰 카드로 올렸고,
// 대기 건수는 아래 MENU_PENDING_SOURCES에서 같이 센다.) 신청이 들어오는 메뉴(pendingKey)는
// 대기 건이 있으면 빨간 "N건 대기" 배지를 붙여 한눈에 보이게 한다.
type PendingKey = "churches" | "goods" | "shirts" | "vehicles" | "missionVenues" | "suggestions" | "sound";
type MenuItem = { label: string; desc: string; href: string; icon: React.ElementType; color: string; bg: string; pendingKey?: PendingKey };
const MENU_ITEMS: MenuItem[] = [
  // 개요
  { label: "대시보드", desc: "방문·예약 현황을 한눈에", href: "/admin/dashboard", icon: LayoutDashboard, color: "text-white", bg: "bg-gradient-to-br from-[#4D94FF] to-[#1B5FCC]" },
  { label: "사전답사 체크리스트", desc: "사용자 답사 기록 보기", href: "/admin/checklists", icon: ClipboardList, color: "text-white", bg: "bg-gradient-to-br from-[#1FD38D] to-[#00875A]" },
  // 장소
  { label: "장소 추천 제보", desc: "답사 중 제보된 장소 검토", href: "/admin/venue-suggestions", icon: Megaphone, color: "text-white", bg: "bg-gradient-to-br from-[#FFB067] to-[#E07B1F]", pendingKey: "suggestions" },
  { label: "국내선교 장소", desc: "선교 장소 승인·일정 관리", href: "/admin/mission-venues?tab=pending", icon: MapPinned, color: "text-white", bg: "bg-gradient-to-br from-[#4D94FF] to-[#1B5FCC]", pendingKey: "missionVenues" },
  // 외부 사역팀
  { label: "사역팀 문의 현황", desc: "팀별 섭외 문의 통계", href: "/admin/team-inquiries", icon: BarChart3, color: "text-white", bg: "bg-gradient-to-br from-[#A78BFA] to-[#6D28D9]" },
  { label: "사역팀 광고 설정", desc: "상단 노출 팀 관리", href: "/admin/team-ads", icon: Megaphone, color: "text-white", bg: "bg-gradient-to-br from-[#A78BFA] to-[#6D28D9]" },
  // 합주실
  { label: "합주실 예약 관리", desc: "합주실 예약·결제 내역", href: "/admin/band-room-bookings", icon: CreditCard, color: "text-white", bg: "bg-gradient-to-br from-[#38BDF8] to-[#0369A1]" },
  { label: "합주실 광고 설정", desc: "상단 노출 합주실 관리", href: "/admin/band-room-ads", icon: Megaphone, color: "text-white", bg: "bg-gradient-to-br from-[#38BDF8] to-[#0369A1]" },
  // 그 외
  { label: "교회 관리", desc: "전국 교회 등록 신청 검토", href: "/admin/churches?tab=pending", icon: Church, color: "text-white", bg: "bg-gradient-to-br from-[#818CF8] to-[#4338CA]", pendingKey: "churches" },
  { label: "차량 대여", desc: "차량 대여 업체 승인 관리", href: "/admin/vehicles?tab=pending", icon: Car, color: "text-white", bg: "bg-gradient-to-br from-[#6B7684] to-[#333D4B]", pendingKey: "vehicles" },
  { label: "음향 시공 문의", desc: "시공 문의 목록 확인", href: "/admin/sound-construction", icon: Volume2, color: "text-white", bg: "bg-gradient-to-br from-[#6B7684] to-[#333D4B]", pendingKey: "sound" },
];

// status == "pending" 으로 세는 메뉴들 (각 관리 페이지의 "검토 대기" 탭과 같은 기준)
const MENU_PENDING_SOURCES: { key: Exclude<PendingKey, "suggestions">; collection: string }[] = [
  { key: "churches", collection: "churches" },
  { key: "goods", collection: "goodsStore" },
  { key: "shirts", collection: "groupShirts" },
  { key: "vehicles", collection: "vehicleRentals" },
  { key: "missionVenues", collection: "missionVenues" },
  { key: "sound", collection: "soundConstructionRequests" },
];

// --- 메인 AdminHub 페이지 컴포넌트 ---

export function AdminHub() {
  const [pendingCounts, setPendingCounts] = useState({
    venues: 0,
    bookings: 0,
    teams: 0,
    bandRooms: 0
  });
  const [memberCount, setMemberCount] = useState(0);
  const [menuPending, setMenuPending] = useState<Partial<Record<PendingKey, number>>>({});

  useEffect(() => {
    // 1. 장소 신청 대기 건수 감시 (status가 pending인 것들)
    const qVenues = query(collection(db, "venues"), where("status", "==", "pending"));
    const unsubVenues = onSnapshot(qVenues, (snapshot) => {
      setPendingCounts(prev => ({ ...prev, venues: snapshot.size }));
    });

    // 2. 예약 문의 신규 건수 감시 (status가 pending인 것들)
    const qBookings = query(collection(db, "bookings"), where("status", "==", "pending"));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      setPendingCounts(prev => ({ ...prev, bookings: snapshot.size }));
    });

    // 3. 전체 가입 회원 수 - 회원 관리 화면과 같은 기준(실제 로그인 계정 수, adminListUsers).
    // Firestore users 문서 수는 가입 동기화가 빠진 계정이 있어 실제보다 적게 나온다.
    let cancelled = false;
    httpsCallable(functions, "adminListUsers")()
      .then((result: any) => { if (!cancelled) setMemberCount((result.data?.users || []).length); })
      .catch((error) => console.error("회원 수 조회 실패:", error));
    const unsubUsers = () => { cancelled = true; };

    // 4. 외부 사역팀 신청 대기 건수 감시
    const qTeams = query(collection(db, "ministryTeams"), where("status", "==", "pending"));
    const unsubTeams = onSnapshot(qTeams, (snapshot) => {
      setPendingCounts(prev => ({ ...prev, teams: snapshot.size }));
    });

    // 5. 합주실·연습실 신청 대기 건수 감시
    const qBandRooms = query(collection(db, "bandRooms"), where("status", "==", "pending"));
    const unsubBandRooms = onSnapshot(qBandRooms, (snapshot) => {
      setPendingCounts(prev => ({ ...prev, bandRooms: snapshot.size }));
    });

    // 6. 전체 메뉴 쪽 신청 대기 건수 (교회·굿즈·단체티·차량·국내선교·음향 시공)
    const unsubMenu = MENU_PENDING_SOURCES.map(({ key, collection: name }) =>
      onSnapshot(
        query(collection(db, name), where("status", "==", "pending")),
        (snapshot) => setMenuPending(prev => ({ ...prev, [key]: snapshot.size })),
        (error) => console.error(`${name} 대기 건수 불러오기 실패:`, error)
      )
    );

    // 7. 장소 추천 제보 - status가 "reviewed"가 아닌 건이 새 제보 (AdminVenueSuggestions와 동일 기준)
    const unsubSuggestions = onSnapshot(
      collection(db, "venueSuggestions"),
      (snapshot) => setMenuPending(prev => ({ ...prev, suggestions: snapshot.docs.filter((d) => d.data().status !== "reviewed").length })),
      (error) => console.error("장소 추천 제보 불러오기 실패:", error)
    );

    // 페이지를 나갈 때 감시를 종료합니다.
    return () => {
      unsubVenues();
      unsubBookings();
      unsubUsers();
      unsubTeams();
      unsubBandRooms();
      unsubMenu.forEach((unsub) => unsub());
      unsubSuggestions();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#191F28] font-sans selection:bg-blue-100 pb-20">

      {/* 관리자 공통 GNB (기존 디자인 유지) */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#F2F4F6]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <Home className="w-6 h-6 text-[#3182F6]" />
            <h1 className="text-[18px] font-black tracking-tighter">수련회 준비, StayOn Place</h1>
          </div>
          <div className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg text-xs font-black tracking-wider uppercase">ADMIN PORTAL</div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-6">
        {/* 상단 안내 섹션 - 한 화면에 다 들어오도록 한 줄로 줄였다 */}
        <section className="mb-5">
          <h1 className="text-[24px] font-black text-[#191F28] leading-tight tracking-tight mb-1 break-keep">
             오늘 처리할 업무를 선택해주세요
          </h1>
          <p className="text-[#6B7684] text-[14px] font-medium break-keep">
            실시간으로 접수된 새로운 소식을 확인하고 빠르게 처리하세요.
          </p>
        </section>

        {/* 메인 업무 선택 카드 그리드 - 8개라 PC에서 4개씩 두 줄 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HubCard
            to="/admin/users"
            title="회원 관리"
            description="회원 조회·차단·삭제"
            icon={Users}
            gradient="bg-gradient-to-br from-[#4B5563] via-[#374151] to-[#111827]"
            count={memberCount}
            badgeVariant="info"
            badgeLabel={(c) => `총 ${c}명`}
          />
          <HubCard
            to="/admin/venues"
            title="장소 등록 신청 관리"
            description="수양관 등록 신청 검토·승인"
            icon={Building2}
            gradient="bg-gradient-to-br from-[#4D94FF] via-[#3182F6] to-[#1B5FCC]"
            count={pendingCounts.venues}
          />
          <HubCard
            to="/admin/bookings"
            title="수련회 예약 / 답사 문의 관리"
            description="예약 문의·사전 답사 신청 확인"
            icon={ClipboardCheck}
            gradient="bg-gradient-to-br from-[#1FD38D] via-[#00B373] to-[#00875A]"
            count={pendingCounts.bookings}
          />
          <HubCard
            to="/admin/teams"
            title="외부사역팀 등록 신청 관리"
            description="찬양팀·세션 등록 신청 검토"
            icon={Mic2}
            gradient="bg-gradient-to-br from-[#A78BFA] via-[#8B5CF6] to-[#6D28D9]"
            count={pendingCounts.teams}
          />
          <HubCard
            to="/admin/band-rooms"
            title="합주실 등록 신청 관리"
            description="합주실·연습실 등록 신청 검토"
            icon={Music}
            gradient="bg-gradient-to-br from-[#38BDF8] via-[#0EA5E9] to-[#0369A1]"
            count={pendingCounts.bandRooms}
          />
          <HubCard
            to="/admin/goods?tab=pending"
            title="굿즈 등록 신청 관리"
            description="굿즈몰 업체 등록 신청 검토"
            icon={Gift}
            gradient="bg-gradient-to-br from-[#FF7A7E] via-[#FF5A5F] to-[#C83C41]"
            count={menuPending.goods || 0}
          />
          <HubCard
            to="/admin/shirts?tab=pending"
            title="단체티 등록 신청 관리"
            description="티셔츠몰 업체 등록 신청 검토"
            icon={Shirt}
            gradient="bg-gradient-to-br from-[#FFA25C] via-[#FF8A3D] to-[#E0640F]"
            count={menuPending.shirts || 0}
          />
          <HubCard
            to="/admin/message-templates"
            title="문자 템플릿"
            description="영업용 문자 문구 관리"
            icon={MessageSquareText}
            gradient="bg-gradient-to-br from-[#2DD4BF] via-[#14B8A6] to-[#0F766E]"
            badgeVariant="plain"
          />
        </section>

        {/* 분류 제목 줄을 따로 두면 화면이 길어져서, 분류 순서대로 한 그리드에 이어 붙인다 */}
        <section className="mt-7">
          <h2 className="text-[17px] font-black text-[#191F28] tracking-tight mb-3 px-1">전체 메뉴</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {MENU_ITEMS.map(({ label, desc, href, icon: Icon, color, bg, pendingKey }) => {
              const pending = pendingKey ? menuPending[pendingKey] || 0 : 0;
              return (
                <Link
                  key={href}
                  to={href}
                  className={`group relative flex items-center gap-3 bg-white px-4 py-3.5 rounded-[20px] border shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:border-[#3182F6] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(0,0,0,0.06)] transition-all min-w-0 ${pending > 0 ? "border-[#FFB4B4]" : "border-gray-100"}`}
                >
                  <div className={`p-2.5 rounded-xl shrink-0 shadow-sm ${bg}`}>
                    <Icon className={`w-[18px] h-[18px] ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14.5px] font-black text-[#191F28] tracking-tight truncate group-hover:text-[#3182F6] transition-colors">{label}</p>
                    <p className="text-[12px] font-medium text-[#6B7684] truncate">{desc}</p>
                  </div>
                  {pending > 0 && (
                    <span className="absolute -top-2 right-3 flex items-center gap-1 px-2 py-0.5 bg-[#FF4545] text-white rounded-full text-[10.5px] font-black shadow-md shadow-red-200 whitespace-nowrap">
                      <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                      {pending}건 대기
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="mt-12 px-5 text-center pb-10">
        <div className="flex items-center justify-center gap-4 text-[#B0B8C1] text-sm font-black">
          <span>스테이온 고객센터</span>
          <span>|</span>
          <span>서비스 이용약관</span>
        </div>
      </footer>

      <style>{`
        body { background-color: #F2F4F6; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
