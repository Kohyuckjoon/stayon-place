import { useState, useEffect } from "react";
import { db } from "../lib/firebase"; // firebase 설정 불러오기
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom"; // 라우터 연동 필수
import { motion } from "framer-motion";
import {
  Building2, ClipboardCheck, ChevronRight, Home, ShieldCheck, Users, Mic2, Music
} from "lucide-react";

// --- 디자인 컴포넌트 (스타일 카드) ---

interface HubCardProps {
  to: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  count?: number; // 대기 중인 신청 건수 (나중에 Firebase 연동 시 사용)
  // alert: 검토 대기처럼 긴급함을 알리는 빨간 배지 / info: 총 회원 수처럼 단순 안내용 회색 배지
  badgeVariant?: "alert" | "info";
  badgeLabel?: (count: number) => string;
}

const HubCard = ({ to, title, description, icon: Icon, iconColor, bgColor, count, badgeVariant = "alert", badgeLabel }: HubCardProps) => (
  <Link to={to} className="group flex flex-col justify-between h-[240px]">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.03, boxShadow: "0 20px 40px rgba(0,0,0,0.06)" }}
      className="bg-white p-6 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0,04)] flex flex-col h-full border border-gray-100 transition-all hover:border-[#3182F6]"
    >
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className={`p-3.5 rounded-2xl shrink-0 ${bgColor}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        {typeof count === "number" && count > 0 && (
          badgeVariant === "alert" ? (
            <div className="px-3 py-1.5 bg-[#FF4545] text-white rounded-full text-[11px] font-black tracking-wider flex items-center gap-1.5 shadow-md shadow-red-200 shrink-0">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              {badgeLabel ? badgeLabel(count) : `새로운 ${count}건 검토 대기`}
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-[#F2F4F6] text-[#4E5968] rounded-full text-[11px] font-black tracking-wider shrink-0">
              {badgeLabel ? badgeLabel(count) : `${count}건`}
            </div>
          )
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h2 className="text-[20px] font-black leading-snug tracking-tight text-[#191F28] mb-2 break-keep group-hover:text-[#3182F6] transition-colors">
          {title}
        </h2>
        <p className="text-[#6B7684] text-[13px] font-medium leading-relaxed break-keep">
          {description}
        </p>
      </div>

      <div className="flex items-center justify-end text-[#3182F6] font-black text-[13px] gap-1.5">
        관리 페이지로 이동 <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
      </div>
    </motion.div>
  </Link>
);

// --- 메인 AdminHub 페이지 컴포넌트 ---

export function AdminHub() {
  // 나중에 Firebase에서 대기 건수를 실시간으로 가져와야 합니다.
  // 예시 데이터입니다.
  const [pendingCounts, setPendingCounts] = useState({
    venues: 0,
    bookings: 0,
    teams: 0,
    bandRooms: 0
  });
  const [memberCount, setMemberCount] = useState(0);

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

    // 3. 전체 가입 회원 수 감시
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setMemberCount(snapshot.size);
    });

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

    // 페이지를 나갈 때 감시를 종료합니다.
    return () => {
      unsubVenues();
      unsubBookings();
      unsubUsers();
      unsubTeams();
      unsubBandRooms();
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

      <main className="max-w-6xl mx-auto px-6 pt-10">
        {/* 상단 안내 섹션 */}
        <section className="mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
            <span className="text-[#6B7684] font-bold text-sm bg-white/50 px-3 py-1.5 rounded-full border border-gray-100 shadow-inner">
               Welcome to Admin Portal
            </span>
          </motion.div>
          <h1 className="text-[28px] font-black text-[#191F28] leading-tight tracking-tight mb-2 break-keep">
             오늘 처리할 업무를 선택해주세요
          </h1>
          <p className="text-[#6B7684] text-[15px] font-medium break-keep">
            수양관 승인 및 예약 문의를 한곳에서 관리합니다.<br />
            실시간으로 접수된 새로운 소식을 확인하고 빠르게 처리하세요.
          </p>
        </section>

        {/* 메인 업무 선택 카드 그리드 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <HubCard
            to="/admin/venues"
            title="장소 제공 신청 관리"
            description="전국 교회들이 StayOn에 제출한 수양관 등록 신청을 검토하고 최종 승인/반려합니다."
            icon={Building2}
            iconColor="text-[#3182F6]"
            bgColor="bg-[#E8F3FF]"
            count={pendingCounts.venues} // Firebase 실시간 연동 예정
          />
          <HubCard
          // 나중에 admin2 URL을 좀 더 구조적으로 /admin/bookings로 바꿀 수 있습니다.
            to="/admin/bookings"
            title="예약 및 답사 문의 관리"
            description="사역자들이 남긴 수양관 예약 문의 및 사전 답사 신청을 확인하고 상담 상태를 확정합니다."
            icon={ClipboardCheck}
            iconColor="text-[#00D082]"
            bgColor="bg-emerald-50"
            count={pendingCounts.bookings} // Firebase 실시간 연동 예정
          />
          <HubCard
            to="/admin/users"
            title="회원 관리"
            description="가입한 회원 목록을 조회하고 차단·삭제 등 관리 작업을 수행합니다."
            icon={Users}
            iconColor="text-indigo-600"
            bgColor="bg-indigo-50"
            count={memberCount}
            badgeVariant="info"
            badgeLabel={(c) => `총 ${c}명`}
          />
          <HubCard
            to="/admin/teams"
            title="외부 사역팀 관리"
            description="찬양팀·찬양사역자·세션 등 외부 사역팀 등록 신청을 검토하고 승인합니다."
            icon={Mic2}
            iconColor="text-[#8B5CF6]"
            bgColor="bg-[#F5F3FF]"
            count={pendingCounts.teams}
          />
          <HubCard
            to="/admin/band-rooms"
            title="합주실 관리"
            description="합주실·연습실 공간 등록 신청을 검토하고 승인합니다."
            icon={Music}
            iconColor="text-[#0EA5E9]"
            bgColor="bg-[#F0F9FF]"
            count={pendingCounts.bandRooms}
          />
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
