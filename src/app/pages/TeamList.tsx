import { useState, useEffect, useMemo } from "react";
import { ScrollRestoration, useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, Users, Speaker, PlaySquare, Phone, Church, LayoutGrid, List, ShieldCheck, Lock,
  Music, MapPin, CreditCard, Sparkles, Zap,
} from "lucide-react";
import { getEquipmentBadges, formatTeamSize, getIndividualBadgeLabel } from "../lib/teamDisplay";
import { formatHourlyRate } from "../lib/bandRoomDisplay";

const CATEGORIES = ["전체", "찬양팀", "음향·조명", "찬양사역자", "세션", "외부 강사", "레크리에이션 강사", "기독교 문화 사역"] as const;
const MAIN_TABS = [
  { id: "team", label: "외부사역" },
  { id: "bandroom", label: "합주실·연습실" },
] as const;

const getCategoryStyle = (category: string) => {
  switch (category) {
    case "찬양팀": return { bg: "bg-[#E8F3FF]", text: "text-[#3182F6]" };
    case "음향·조명": return { bg: "bg-[#F5F3FF]", text: "text-[#8B5CF6]" };
    case "찬양사역자": return { bg: "bg-[#FFF0F6]", text: "text-[#F04452]" };
    case "세션": return { bg: "bg-[#E7F9F3]", text: "text-[#00D082]" };
    case "외부 강사": return { bg: "bg-[#FFF7E6]", text: "text-[#F59E0B]" };
    case "레크리에이션 강사": return { bg: "bg-[#E6FFFA]", text: "text-[#14B8A6]" };
    case "기독교 문화 사역": return { bg: "bg-[#EEF2FF]", text: "text-[#6366F1]" };
    default: return { bg: "bg-[#F2F4F6]", text: "text-[#8B95A1]" };
  }
};

const getRoomTypeStyle = (roomType: string) => {
  switch (roomType) {
    case "연습실": return { bg: "bg-[#F0F9FF]", text: "text-[#0EA5E9]" };
    case "합주실": return { bg: "bg-[#F5F3FF]", text: "text-[#8B5CF6]" };
    case "겸용": return { bg: "bg-[#ECFDF5]", text: "text-[#10B981]" };
    default: return { bg: "bg-[#F2F4F6]", text: "text-[#8B95A1]" };
  }
};

// 끌어올리기(boostedUntil이 아직 안 지난 팀)인지 여부. 리스트 정렬과 헤더 티커 양쪽에서 쓴다.
const isBoosted = (team: any) => {
  const until = team.boostedUntil?.toDate?.();
  return !!(until && until.getTime() > Date.now());
};

// 헤더 우측의 "광고" 티커: 2~3개씩 보이면서 아래에서 끊김 없이 계속 위로 흐르는 세로 마퀴.
// 목록을 두 번 이어붙이고 딱 절반(-50%)만큼 이동시켰다가 처음으로 되돌리는 방식이라 CSS만으로 무한 루프가 된다.
function TeamTicker({ teams, navigate }: { teams: any[]; navigate: (path: string) => void }) {
  const [isPaused, setIsPaused] = useState(false);
  if (teams.length < 2) return null;
  // 등록된 팀이 적으면 한 바퀴 트랙 너비가 화면보다 좁아져서, 끝까지 흐른 뒤
  // 빈 공백이 보였다가 처음으로 순간 리셋되는 것처럼 뚝뚝 끊겨 보인다. 화면 폭보다
  // 넉넉히 길어지도록(카드 10개 이상 분량) 같은 목록을 충분히 반복해 채운 뒤,
  // 그 반복된 목록을 다시 두 번 이어붙여야 -50% 지점에서 완전히 매끄럽게 루프된다.
  const MIN_TRACK_ITEMS = 10;
  const repeatCount = Math.max(1, Math.ceil(MIN_TRACK_ITEMS / teams.length));
  const baseList = Array.from({ length: repeatCount }, () => teams).flat();
  const items = [...baseList, ...baseList];
  const duration = baseList.length * 4;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 md:mb-2.5 text-[#ADB5BD]">
        <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
        <span className="text-[11px] md:text-[12px] font-black tracking-tight">지금 주목받는 사역팀</span>
      </div>
      <div
        className="relative w-full overflow-hidden -mx-5 px-5 md:mx-0 md:px-0"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <style>{`
          @keyframes team-ticker-scroll-x {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
        <div className="absolute top-0 bottom-0 left-0 w-8 md:w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-8 md:w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div
          className="flex items-center gap-3 md:gap-4 w-max"
          style={{
            animation: `team-ticker-scroll-x ${duration}s linear infinite`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          {items.map((team, i) => {
            const style = getCategoryStyle(team.category);
            return (
              <div
                key={`${team.id}-${i}`}
                onClick={() => navigate(`/teams/${team.id}`)}
                className="group relative w-[136px] h-[86px] md:w-[172px] md:h-[108px] rounded-xl md:rounded-2xl overflow-hidden shrink-0 cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition-shadow"
              >
                {team.posterImage ? (
                  <img
                    src={team.posterImage}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${style.bg}`}>
                    <Mic2 className={`w-5 h-5 md:w-6 md:h-6 opacity-40 ${style.text}`} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                {isBoosted(team) && (
                  <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 text-[11px] md:text-[12px] drop-shadow">🔥</span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2 md:p-2.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-black mb-1 ${style.bg} ${style.text}`}>
                    {team.category}
                  </span>
                  <p className="text-[11px] md:text-[12.5px] font-black text-white leading-snug truncate">{team.teamName}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 합주실·연습실 탭용 메인 배너 티커 — TeamTicker와 완전히 동일한 구조를 필드명만 바꿔 재사용.
function BandRoomTicker({ rooms, navigate }: { rooms: any[]; navigate: (path: string) => void }) {
  const [isPaused, setIsPaused] = useState(false);
  if (rooms.length < 2) return null;
  const MIN_TRACK_ITEMS = 10;
  const repeatCount = Math.max(1, Math.ceil(MIN_TRACK_ITEMS / rooms.length));
  const baseList = Array.from({ length: repeatCount }, () => rooms).flat();
  const items = [...baseList, ...baseList];
  const duration = baseList.length * 4;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 md:mb-2.5 text-[#ADB5BD]">
        <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5" />
        <span className="text-[11px] md:text-[12px] font-black tracking-tight">지금 주목받는 공간</span>
      </div>
      <div
        className="relative w-full overflow-hidden -mx-5 px-5 md:mx-0 md:px-0"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <style>{`
          @keyframes room-ticker-scroll-x {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
        <div className="absolute top-0 bottom-0 left-0 w-8 md:w-12 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-8 md:w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div
          className="flex items-center gap-3 md:gap-4 w-max"
          style={{
            animation: `room-ticker-scroll-x ${duration}s linear infinite`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          {items.map((room, i) => {
            const style = getRoomTypeStyle(room.roomType);
            const photo = room.photos?.[0];
            return (
              <div
                key={`${room.id}-${i}`}
                onClick={() => navigate(`/band-room/${room.id}`)}
                className="group relative w-[136px] h-[86px] md:w-[172px] md:h-[108px] rounded-xl md:rounded-2xl overflow-hidden shrink-0 cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition-shadow"
              >
                {photo ? (
                  <img
                    src={photo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${style.bg}`}>
                    <Music className={`w-5 h-5 md:w-6 md:h-6 opacity-40 ${style.text}`} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                {isBoosted(room) && (
                  <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 text-[11px] md:text-[12px] drop-shadow">🔥</span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-2 md:p-2.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-black mb-1 ${style.bg} ${style.text}`}>
                    {room.roomType}
                  </span>
                  <p className="text-[11px] md:text-[12.5px] font-black text-white leading-snug truncate">{room.roomName}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TeamList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // 헤더의 "합주실·연습실 찾기" 링크는 같은 /teams 라우트에 쿼리스트링만 바꿔서
  // 이동하기 때문에 컴포넌트가 새로 마운트되지 않는다. mainTab을 useState로 한 번만
  // 초기화하면 그 이후 헤더에서 넘어오는 쿼리스트링 변경을 못 따라가므로, 매 렌더마다
  // searchParams에서 직접 계산해서 URL을 유일한 소스로 둔다.
  const mainTab: (typeof MAIN_TABS)[number]["id"] =
    MAIN_TABS.some((t) => t.id === searchParams.get("category"))
      ? (searchParams.get("category") as (typeof MAIN_TABS)[number]["id"])
      : "team";
  const setMainTab = (tab: (typeof MAIN_TABS)[number]["id"]) => {
    setSearchParams(tab === "team" ? {} : { category: tab });
  };

  const [teams, setTeams] = useState<any[]>([]);
  const [bandRooms, setBandRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("전체");
  const [viewMode, setViewMode] = useState<"card" | "list">("card"); // 카드뷰 / 리스트뷰 전환
  const [instantBookingOnly, setInstantBookingOnly] = useState(false); // "즉시예약 가능"(Track2) 필터

  useEffect(() => {
    const q = query(collection(db, "ministryTeams"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeams(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "bandRooms"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBandRooms(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 관리자가 "광고 설정"에서 직접 고른 티커 노출 순서. 아직 설정한 적이 없으면 빈 배열.
  const [adTickerTeamIds, setAdTickerTeamIds] = useState<string[]>([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "teamTicker"), (snap) => {
      setAdTickerTeamIds(snap.exists() ? (snap.data().teamIds || []) : []);
    });
    return () => unsubscribe();
  }, []);

  // 합주실·연습실용 "예약률 높이기" 메인 배너 노출 순서 (팀 티커와 동일한 방식, 별도 설정 문서).
  const [adTickerRoomIds, setAdTickerRoomIds] = useState<string[]>([]);
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "bandRoomTicker"), (snap) => {
      setAdTickerRoomIds(snap.exists() ? (snap.data().roomIds || []) : []);
    });
    return () => unsubscribe();
  }, []);

  // 끌어올리기(boostedUntil이 아직 안 지난 팀)를 최상단으로, 그중에서는 최근에
  // 끌어올린 순으로 정렬한다. 나머지는 하루에 한 번 순서가 바뀌도록 오늘 날짜(한국 시간)와
  // 팀 id로 만든 값으로 섞는다 - 같은 날에는 누가 언제 들어와도 같은 순서로 보인다.
  const filteredTeams = useMemo(() => {
    const filtered = activeCategory === "전체" ? teams : teams.filter((t) => t.category === activeCategory);
    const boostRank = (t: any) => (isBoosted(t) ? (t.boostedAt?.toDate?.()?.getTime() || 0) : -1);
    const dateKey = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dailyRank = (id: string) => {
      let h = 2166136261;
      for (const ch of `${dateKey}:${id}`) {
        h ^= ch.charCodeAt(0);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };
    return [...filtered].sort((a, b) => boostRank(b) - boostRank(a) || dailyRank(a.id) - dailyRank(b.id));
  }, [teams, activeCategory]);

  // "예약률 높이기"로 끌어올린 공간을 최상단으로(그중에서는 최근에 끌어올린 순), 그다음
  // Track2(예약·결제 지원)를 우선 정렬하고, "즉시예약 가능" 필터가 켜져 있으면 Track1(정보 제공)은
  // 아예 숨긴다.
  const filteredBandRooms = useMemo(() => {
    const filtered = instantBookingOnly ? bandRooms.filter((r) => r.track === "booking") : bandRooms;
    const boostRank = (r: any) => (isBoosted(r) ? (r.boostedAt?.toDate?.()?.getTime() || 0) : -1);
    return [...filtered].sort((a, b) => {
      const boostDiff = boostRank(b) - boostRank(a);
      if (boostDiff !== 0) return boostDiff;
      return (b.track === "booking" ? 1 : 0) - (a.track === "booking" ? 1 : 0);
    });
  }, [bandRooms, instantBookingOnly]);

  // 헤더 티커 후보: 관리자가 "광고 설정"에서 팀을 골라뒀다면 그 순서 그대로 노출.
  // 아직 아무것도 고르지 않았다면, 끌어올리기 팀을 우선 채우고 모자란 자리는 나머지
  // 승인팀으로 채운다. teams 배열은 문의 카운트 등 무관한 필드 변경에도 새 참조로
  // 바뀌므로, id 구성이 실제로 바뀔 때만 다시 섞이도록 id 목록을 의존성으로 둔다.
  const teamIdsKey = teams.map((t) => t.id).sort().join(",");
  const tickerTeams = useMemo(() => {
    if (adTickerTeamIds.length > 0) {
      const byId = new Map(teams.map((t) => [t.id, t]));
      return adTickerTeamIds.map((id) => byId.get(id)).filter(Boolean);
    }
    const boosted = teams.filter(isBoosted);
    const rest = [...teams.filter((t) => !isBoosted(t))].sort(() => Math.random() - 0.5);
    return [...boosted, ...rest].slice(0, 7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamIdsKey, adTickerTeamIds]);

  // 합주실·연습실용 메인 배너 후보 — 위 tickerTeams와 완전히 동일한 로직.
  const roomIdsKey = bandRooms.map((r) => r.id).sort().join(",");
  const tickerRooms = useMemo(() => {
    if (adTickerRoomIds.length > 0) {
      const byId = new Map(bandRooms.map((r) => [r.id, r]));
      return adTickerRoomIds.map((id) => byId.get(id)).filter(Boolean);
    }
    const boosted = bandRooms.filter(isBoosted);
    const rest = [...bandRooms.filter((r) => !isBoosted(r))].sort(() => Math.random() - 0.5);
    return [...boosted, ...rest].slice(0, 7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIdsKey, adTickerRoomIds]);

  const isBandRoomTab = mainTab === "bandroom";

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans antialiased text-[#191F28] pb-24">
      <ScrollRestoration />

      <div className="bg-white border-b border-[#F2F4F6]">
        <div className="max-w-[1100px] mx-auto px-5 pt-10 pb-6">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-black ${isBandRoomTab ? "bg-[#F0F9FF] text-[#0EA5E9]" : "bg-[#F5F3FF] text-[#8B5CF6]"}`}>
            {isBandRoomTab ? <Music className="w-4 h-4" /> : <Mic2 className="w-4 h-4" />}
            {isBandRoomTab ? "합주실·연습실" : "외부 사역팀"}
          </div>
          {isBandRoomTab ? (
            <>
              <h1 className="text-[26px] font-black text-[#191F28] mb-2 tracking-tight break-keep">
                외부사역으로 인한 합주할 공간을 찾고 계신가요?<br />녹음이 가능한 장소를 찾고 계신가요?
              </h1>
              <p className="text-[14px] text-[#8B95A1] font-bold break-keep">
                스테이온에서 해결해보세요!
              </p>
            </>
          ) : (
            <>
              <h1 className="text-[26px] font-black text-[#191F28] mb-2 tracking-tight break-keep">
                수련회에 함께할 사역팀을 찾아보세요
              </h1>
              <p className="text-[14px] text-[#8B95A1] font-bold break-keep">
                장소와 상관없이 섭외를 진행할 수 있고, 문의에는 비용이 발생하지 않아요.
              </p>
            </>
          )}

          {/* 상위 탭: 외부사역 / 합주실·연습실 + 우측 "섭외율 높이기" 진입 버튼 */}
          <div className="flex items-center justify-between gap-2 mt-6">
            <div className="flex items-center gap-2">
              {MAIN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id)}
                  className={`px-5 py-2.5 rounded-xl text-[14px] font-black transition-all ${mainTab === tab.id
                    ? "bg-[#191F28] text-white"
                    : "bg-[#F2F4F6] text-[#8B95A1] hover:text-[#4E5968]"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate(isBandRoomTab ? "/teams/boost?type=bandroom" : "/teams/boost")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-black text-[#F59E0B] bg-[#FFF7E6] hover:bg-[#FFEFC7] transition-all shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              {isBandRoomTab ? (
                <><span className="hidden sm:inline">예약률 높이기</span><span className="sm:hidden">예약률↑</span></>
              ) : (
                <><span className="hidden sm:inline">섭외율 높이기</span><span className="sm:hidden">섭외율↑</span></>
              )}
            </button>
          </div>

          {!isBandRoomTab && tickerTeams.length >= 2 && (
            <div className="mt-4 md:mt-5">
              <TeamTicker teams={tickerTeams} navigate={navigate} />
            </div>
          )}
          {isBandRoomTab && tickerRooms.length >= 2 && (
            <div className="mt-4 md:mt-5">
              <BandRoomTicker rooms={tickerRooms} navigate={navigate} />
            </div>
          )}
        </div>
      </div>

      <main className="max-w-[1100px] mx-auto px-5 py-6" key={mainTab}>
        {isBandRoomTab ? (
          <>
            <div className="flex items-start gap-2.5 p-4 bg-[#F0F9FF] border border-[#E0F2FE] rounded-2xl mb-6">
              <ShieldCheck className="w-4 h-4 text-[#0EA5E9] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#0284C7] font-bold leading-relaxed break-keep">
                자체 예배팀(교회 소속 찬양팀·워십팀)의 정기 연습부터, 일정이 잡힌 외부 사역(수련회·집회) 전 리허설까지 — 필요한 합주실·연습실을 찾아보세요.
              </p>
            </div>

            {bandRooms.length === 0 ? (
              <div className="py-32 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
                <h3 className="text-[18px] font-black text-[#4E5968]">등록된 공간이 없어요</h3>
                <p className="text-[13px] font-bold text-[#B0B8C1] mt-2">곧 새로운 합주실·연습실이 소개될 예정이에요.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <p className="text-[13px] font-bold text-[#8B95A1]">총 {filteredBandRooms.length}곳</p>
                    <button
                      type="button"
                      onClick={() => setInstantBookingOnly((v) => !v)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-black border transition-all ${instantBookingOnly
                        ? "border-[#0EA5E9] bg-[#0EA5E9] text-white"
                        : "border-[#E5E8EB] bg-white text-[#8B95A1] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
                        }`}
                    >
                      ⚡ 즉시예약 가능
                    </button>
                  </div>
                  <div className="flex items-center gap-1 bg-[#F2F4F6] p-1 rounded-xl shrink-0">
                    <button
                      onClick={() => setViewMode("card")}
                      className={`p-2 rounded-lg transition-all ${viewMode === "card" ? "bg-white text-[#0EA5E9] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                      aria-label="카드뷰"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-[#0EA5E9] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                      aria-label="리스트뷰"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {filteredBandRooms.length === 0 ? (
                  <div className="py-24 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
                    <h3 className="text-[16px] font-black text-[#4E5968]">즉시예약 가능한 공간이 아직 없어요</h3>
                    <p className="text-[13px] font-bold text-[#B0B8C1] mt-2">필터를 꺼서 전체 공간을 확인해보세요.</p>
                  </div>
                ) : (
                <div className={viewMode === "card" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-6" : "flex flex-col gap-3"}>
                  <AnimatePresence mode="popLayout">
                    {filteredBandRooms.map((room) => {
                      const style = getRoomTypeStyle(room.roomType);
                      const photo = room.photos?.[0];
                      const isInstantBooking = room.track === "booking";

                      if (viewMode === "list") {
                        return (
                          <motion.div
                            key={room.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            onClick={() => navigate(`/band-room/${room.id}`)}
                            className="flex items-center gap-4 bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
                          >
                            <div className="relative w-24 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-[#F2F4F6]">
                              {photo ? (
                                <img src={photo} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><Music className="w-6 h-6 text-[#D1D6DB]" /></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                {isBoosted(room) && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap bg-[#FFF7ED] text-[#EA580C]">
                                    🔥 추천
                                  </span>
                                )}
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap ${style.bg} ${style.text}`}>
                                  {room.roomType}
                                </span>
                                {isInstantBooking && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap bg-[#0EA5E9] text-white">
                                    ⚡ 바로예약
                                  </span>
                                )}
                              </div>
                              <h3 className="text-[15px] sm:text-[16px] font-black text-[#191F28] truncate mt-1">{room.roomName}</h3>
                              {room.address && (
                                <div className="flex items-center gap-1.5 text-[#8B95A1] font-bold text-[12px] mt-0.5">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{room.address}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-3 text-[12px] font-bold text-[#4E5968] mt-1.5">
                                {room.capacity && (
                                  <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5 opacity-40" /> {room.capacity}</div>
                                )}
                                {room.hourlyRate && (
                                  <div className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 opacity-40" /> {formatHourlyRate(room.hourlyRate)}</div>
                                )}
                              </div>
                            </div>
                            {isInstantBooking ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); navigate(`/band-room/${room.id}/book`); }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0EA5E9] text-white rounded-xl text-[12px] font-black hover:bg-[#0284C7] transition-all active:scale-95 whitespace-nowrap shrink-0"
                              >
                                <Zap className="w-3 h-3" /> 예약하기
                              </button>
                            ) : (
                              room.applicantContact && (
                                <a
                                  href={`tel:${room.applicantContact}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#191F28] text-white rounded-xl text-[12px] font-black hover:bg-black transition-all active:scale-95 whitespace-nowrap shrink-0"
                                >
                                  <Phone className="w-3 h-3" /> 문의하기
                                </a>
                              )
                            )}
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={room.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                          onClick={() => navigate(`/band-room/${room.id}`)}
                          className="flex flex-col bg-white rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer"
                        >
                          <div className="relative aspect-video overflow-hidden bg-[#F2F4F6]">
                            {photo ? (
                              <img src={photo} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Music className="w-8 h-8 text-[#D1D6DB]" /></div>
                            )}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                              {isBoosted(room) && (
                                <span className="px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm bg-[#FFF7ED] text-[#EA580C]">
                                  🔥 추천
                                </span>
                              )}
                              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm ${style.bg} ${style.text}`}>
                                {room.roomType}
                              </span>
                              {isInstantBooking && (
                                <span className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm bg-[#0EA5E9] text-white">
                                  ⚡ 바로예약
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="p-5 flex flex-col gap-3">
                            <div>
                              <h3 className="text-[17px] font-black text-[#191F28] line-clamp-1">{room.roomName}</h3>
                              {room.address && (
                                <div className="flex items-center gap-1.5 text-[#8B95A1] font-bold text-[12px] mt-1">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{room.address}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[12px] font-bold text-[#4E5968]">
                              {room.capacity && (
                                <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5 opacity-40" /> {room.capacity}</div>
                              )}
                              {room.hourlyRate && (
                                <div className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 opacity-40" /> {formatHourlyRate(room.hourlyRate)}</div>
                              )}
                            </div>
                            <div className="w-full h-[1px] bg-[#F2F4F6]" />
                            <div className="flex items-center justify-between">
                              <div className="text-[12px] font-bold text-[#8B95A1]">{room.applicantName}</div>
                              {isInstantBooking ? (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); navigate(`/band-room/${room.id}/book`); }}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0EA5E9] text-white rounded-xl text-[12px] font-black hover:bg-[#0284C7] transition-all active:scale-95"
                                >
                                  <Zap className="w-3 h-3" /> 예약하기
                                </button>
                              ) : (
                                room.applicantContact && (
                                  <a
                                    href={`tel:${room.applicantContact}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#191F28] text-white rounded-xl text-[12px] font-black hover:bg-black transition-all active:scale-95"
                                  >
                                    <Phone className="w-3 h-3" /> 문의하기
                                  </a>
                                )
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start gap-2.5 p-4 bg-[#F2F8FF] border border-[#E8F3FF] rounded-2xl mb-6">
              <ShieldCheck className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#1B64DA] font-bold leading-relaxed break-keep">
                스테이온에 등록된 외부 사역팀(찬양팀·찬양사역자·세션 등, 개인 포함)은 모두 정식 교단에 소속된 교회에 출석 중인 팀 또는 개인만 등록할 수 있어요.
              </p>
            </div>

            <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-4 py-2.5 rounded-full text-[13px] font-black transition-all border ${activeCategory === cat
                    ? "bg-[#191F28] border-[#191F28] text-white"
                    : "bg-white border-[#E5E8EB] text-[#4E5968] hover:border-[#B0B8C1]"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-40 flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-[4px] border-[#F2F4F6] border-t-[#8B5CF6] rounded-full animate-spin" />
                <p className="text-[15px] font-black text-[#B0B8C1]">사역팀을 찾고 있어요</p>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="py-32 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
                <h3 className="text-[18px] font-black text-[#4E5968]">등록된 사역팀이 없어요</h3>
                <p className="text-[13px] font-bold text-[#B0B8C1] mt-2">곧 새로운 사역팀이 소개될 예정이에요.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[13px] font-bold text-[#8B95A1]">총 {filteredTeams.length}팀</p>
                  <div className="flex items-center gap-1 bg-[#F2F4F6] p-1 rounded-xl shrink-0">
                    <button
                      onClick={() => setViewMode("card")}
                      className={`p-2 rounded-lg transition-all ${viewMode === "card" ? "bg-white text-[#8B5CF6] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                      aria-label="카드뷰"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-[#8B5CF6] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                      aria-label="리스트뷰"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className={viewMode === "card" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-4" : "flex flex-col gap-3"}>
                  <AnimatePresence mode="popLayout">
                    {filteredTeams.map((team) => {
                      const style = getCategoryStyle(team.category);
                      const sessionLabel = team.sessionPart === "직접 입력" ? team.sessionPartCustom : team.sessionPart;
                      const individualBadge = team.isIndividual ? getIndividualBadgeLabel(team.category, sessionLabel, team.categoryCustom) : null;
                      const equipmentBadges = getEquipmentBadges(team.equipment);

                      if (viewMode === "list") {
                        return (
                          <motion.div
                            key={team.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            onClick={() => navigate(`/teams/${team.id}`)}
                            className="flex items-center gap-4 bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
                          >
                            <div className="relative w-24 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-[#F2F4F6]">
                              {team.posterImage ? (
                                <img src={team.posterImage} className="w-full h-full object-cover" />
                              ) : (
                                <img src="/STAYON_TEAM_COVER_IMAGE.png" className="w-full h-full object-cover" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isBoosted(team) && (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap bg-[#FFF7ED] text-[#EA580C]">
                                    🔥 추천
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap ${style.bg} ${style.text}`}>
                                  {team.category}
                                </span>
                                {individualBadge && (
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap ${style.bg} ${style.text}`}>
                                    {individualBadge}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-[15px] sm:text-[16px] font-black text-[#191F28] truncate mt-1">{team.teamName}</h3>
                              {team.hasChurch && (team.churchName || team.churchNamePrivate) && (
                                <div className="flex items-center gap-1.5 text-[#8B95A1] font-bold text-[12px] mt-0.5">
                                  {team.churchNamePrivate ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#F2F4F6] text-[#6B7684] rounded-md text-[11px] font-black">
                                      <Lock className="w-2.5 h-2.5" /> 비공개
                                    </span>
                                  ) : (
                                    <>
                                      <Church className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{team.churchName}</span>
                                    </>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 flex-wrap text-[12px] font-bold text-[#4E5968] mt-1.5">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 opacity-40" />
                                  {team.isIndividual
                                    ? (team.category === "세션" ? "개인 세션" : "개인")
                                    : formatTeamSize(team.teamSize)}
                                </div>
                                {equipmentBadges.map((badge) => (
                                  <span key={badge} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F2F4F6] text-[#4E5968] rounded-md text-[11px] font-bold">
                                    <Speaker className="w-3 h-3 opacity-40" /> {badge}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {team.youtubeUrl && (
                                <a
                                  href={team.youtubeUrl} target="_blank" rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 bg-[#F2F4F6] rounded-lg hover:bg-[#E5E8EB] transition-all"
                                  title="유튜브 채널"
                                >
                                  <PlaySquare className="w-3.5 h-3.5 text-[#F04452]" />
                                </a>
                              )}
                              {team.applicantContact && (
                                <a
                                  href={`tel:${team.applicantContact}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#191F28] text-white rounded-xl text-[12px] font-black hover:bg-black transition-all active:scale-95 whitespace-nowrap"
                                >
                                  <Phone className="w-3 h-3" /> 문의하기
                                </a>
                              )}
                            </div>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={team.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                          onClick={() => navigate(`/teams/${team.id}`)}
                          className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer"
                        >
                          <div className="relative aspect-video overflow-hidden bg-[#F2F4F6]">
                            {team.posterImage ? (
                              <img src={team.posterImage} className="w-full h-full object-cover" />
                            ) : (
                              <img src="/STAYON_TEAM_COVER_IMAGE.png" className="w-full h-full object-cover" />
                            )}
                            <div className="absolute top-2 left-2 right-2 flex flex-row flex-wrap items-center gap-1">
                              {isBoosted(team) && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black shadow-sm bg-[#FFF7ED] text-[#EA580C]">
                                  🔥 추천
                                </span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded-md text-[9.5px] font-black shadow-sm ${style.bg} ${style.text}`}>
                                {team.category}
                              </span>
                            </div>
                            {team.youtubeUrl && (
                              <a
                                href={team.youtubeUrl} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-2 right-2 p-1 bg-white/95 backdrop-blur-md rounded-md shadow-sm hover:bg-white transition-all"
                                title="유튜브 채널"
                              >
                                <PlaySquare className="w-3 h-3 text-[#F04452]" />
                              </a>
                            )}
                            {team.applicantContact && (
                              <a
                                href={`tel:${team.applicantContact}`}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-2 right-2 p-1.5 bg-[#191F28] text-white rounded-lg shadow-sm hover:bg-black transition-all active:scale-95"
                                title="전화 문의"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          <div className="p-2.5 flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <h3 className="text-[13px] font-black text-[#191F28] line-clamp-1 flex-1 min-w-0">{team.teamName}</h3>
                            </div>
                            {individualBadge && (
                              <span className={`self-start px-1.5 py-0.5 rounded text-[9px] font-black whitespace-nowrap ${style.bg} ${style.text}`}>
                                {individualBadge}
                              </span>
                            )}
                            {team.hasChurch && (team.churchName || team.churchNamePrivate) && (
                              <div className="flex items-center gap-1 text-[#8B95A1] font-bold text-[10.5px]">
                                {team.churchNamePrivate ? (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-[#F2F4F6] text-[#6B7684] rounded text-[9.5px] font-black">
                                    <Lock className="w-2 h-2" /> 비공개
                                  </span>
                                ) : (
                                  <>
                                    <Church className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">{team.churchName}</span>
                                  </>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1 flex-wrap text-[10.5px] font-bold text-[#4E5968]">
                              <div className="flex items-center gap-0.5">
                                <Users className="w-3 h-3 opacity-40" />
                                {team.isIndividual
                                  ? (team.category === "세션" ? "개인 세션" : "개인")
                                  : formatTeamSize(team.teamSize)}
                              </div>
                              {equipmentBadges.map((badge) => (
                                <span key={badge} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#F2F4F6] text-[#4E5968] rounded text-[9.5px] font-bold">
                                  <Speaker className="w-2.5 h-2.5 opacity-40" /> {badge}
                                </span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
