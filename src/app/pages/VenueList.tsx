import { useState, useMemo, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { AuthModal } from "../components/AuthModal";
import {
  RotateCcw,
  Check,
  ChevronDown,
  X,
  Users,
  MapPin,
  CircleDollarSign,
  ShieldCheck,
  Briefcase,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Filter,
  Search,
  Award,
  LayoutGrid,
  List,
  Compass,
  Tag
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollRestoration, useNavigate, useSearchParams } from "react-router-dom";

// 지자체 데이터
const LOCATIONS = [
  "전체", "서울시", "경기도", "인천시", "강원도",
  "충청남도", "충청북도", "세종시", "대전시",
  "전라남도", "전라북도", "광주시", "경상남도",
  "경상북도", "대구시", "울산시", "부산시", "제주도"
];

/**
 * 행정구역 명칭을 비교하기 쉽도록 2글자 형태의 핵심 키워드로 표준화하는 함수입니다.
 * 예: "서울특별시", "서울시" -> "서울"
 *     "경상남도", "경남" -> "경남"
 *     "강원도", "강원특별자치도" -> "강원"
 */
const normalizeLocation = (locName: string): string => {
  if (!locName) return "";

  // 공백 제거 및 기본 트리밍
  const clean = locName.trim();

  // 1. 대표적인 줄임말 처리
  if (clean.startsWith("서울")) return "서울";
  if (clean.startsWith("경기")) return "경기";
  if (clean.startsWith("인천")) return "인천";
  if (clean.startsWith("강원")) return "강원";
  if (clean.startsWith("세종")) return "세종";
  if (clean.startsWith("대전")) return "대전";
  if (clean.startsWith("광주")) return "광주";
  if (clean.startsWith("대구")) return "대구";
  if (clean.startsWith("울산")) return "울산";
  if (clean.startsWith("부산")) return "부산";
  if (clean.startsWith("제주")) return "제주";

  // 2. 충청, 전라, 경상도 처리 (풀네임 및 축약어 대응)
  if (clean.startsWith("충청남도") || clean.startsWith("충남")) return "충남";
  if (clean.startsWith("충청북도") || clean.startsWith("충북")) return "충북";
  if (clean.startsWith("전라남도") || clean.startsWith("전남")) return "전남";
  if (clean.startsWith("전라북도") || clean.startsWith("전북") || clean.startsWith("전북특별자치도")) return "전북";
  if (clean.startsWith("경상남도") || clean.startsWith("경남")) return "경남";
  if (clean.startsWith("경상북도") || clean.startsWith("경북")) return "경북";

  return clean;
};

// [데이터 반영] 교단 리스트 정리
const DENOMINATIONS = [
  { category: "전체", name: "전체" },
  { category: "장로교", name: "대한예수교장로회(합동)" },
  { category: "장로교", name: "대한예수교장로회(통합)" },
  { category: "장로교", name: "대한예수교장로회(백석)" },
  { category: "장로교", name: "대한예수교장로회(고신)" },
  { category: "장로교", name: "대한예수교장로회(합신)" },
  { category: "장로교", name: "대한예수교장로회(대신)" },
  { category: "장로교", name: "한국기독교장로회(기장)" },
  { category: "감리교", name: "기독교대한감리회(기감)" },
  { category: "순복음", name: "기독교대한하나님의성회(기하성)" },
  { category: "순복음", name: "예수교대한하나님의성회(예하성)" },
  { category: "침례교", name: "기독교대한침례회(기침)" },
  { category: "성결교", name: "기독교대한성결교회(기성)" },
  { category: "성결교", name: "예수교대한성결교회(예성)" },
  { category: "성결교", name: "대한기독교나사렛성결회(나사렛)" },
  { category: "초교파", name: "한국독립교회선교단체연합회(KAICAM)" },
  { category: "기타", name: "대한성공회" },
  { category: "기타", name: "구세군 대한본영" }
];

// 세부 교파(합동/통합/백석 등)가 아닌 상위 교단 단위로 색상을 통일한다.
// 프리셋 목록에 없는 자유 입력 값은 어떤 키워드에도 걸리지 않아 자연스럽게 기본 회색으로 남는다.
const getDenominationStyle = (denom: string) => {
  const name = denom || "";
  if (name.includes("장로회")) return "bg-[#E8F3FF] text-[#3182F6]"; // 장로교 - 파랑
  if (name.includes("감리회")) return "bg-[#FFF9E5] text-[#FFBB00]"; // 감리교 - 노랑
  if (name.includes("하나님의성회")) return "bg-[#F3F0FF] text-[#8B5CF6]"; // 순복음 - 보라
  if (name.includes("침례회")) return "bg-[#E7F9F3] text-[#00D082]"; // 침례교 - 그린
  if (name.includes("성결교") || name.includes("성결회")) return "bg-[#FFF0F6] text-[#F04452]"; // 성결교 - 핑크
  return "bg-[#F2F4F6] text-[#8B95A1]"; // 기타/초교파/직접 입력 - 회색
};

// 필터 칩 컴포넌트
// const FilterChip = ({ label, active, onClick, isOpen, icon }: any) => (
//   <button
//     onClick={onClick}
//     className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[14px] font-bold transition-all shrink-0 border
//       ${active 
//         ? "bg-[#3182F6] border-[#3182F6] text-white shadow-sm" 
//         : "bg-white border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6]"
//       } ${isOpen ? "ring-2 ring-[#3182F6]/30" : ""}`}
//   >
//     {icon}
//     {label}
//     <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
//   </button>
// );

export function VenueList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // "수련회" / "국내선교" 상단 탭. /teams?category=bandroom과 동일한 방식으로 쿼리스트링
  // 하나로 두 목록을 같은 페이지 안에서 전환한다 - 페이지 이동 없이 즉시 바뀌어야
  // "탭 전환"처럼 느껴지고, 카카오톡 미리보기(venuesPreview.ts)도 이 쿼리로 분기한다.
  // 헤더의 "국내선교 장소 찾기" 링크는 같은 /venues 라우트에 쿼리스트링만 바꿔서 이동하므로
  // 컴포넌트가 새로 마운트되지 않는다. activeMainTab을 useState로 한 번만 초기화하면 그
  // 이후 헤더에서 넘어오는 쿼리스트링 변경을 못 따라가므로, 매 렌더마다 searchParams에서
  // 직접 계산해서 URL을 유일한 소스로 둔다 (TeamList.tsx의 mainTab과 동일한 패턴).
  const activeMainTab: "domestic" | "mission" =
    searchParams.get("category") === "mission" ? "mission" : "domestic";
  // 국내선교 탭 전용 상태 - 수련회 탭의 복잡한 지역/날짜/인원 필터와는 무관하게
  // 검색어·태그 필터만 쓰는 단순한 목록이라 별도로 둔다 (MissionVenueList.tsx와 동일한 로직).
  const [missionVenues, setMissionVenues] = useState<any[]>([]);
  const [missionLoading, setMissionLoading] = useState(true);
  const [missionSearchQuery, setMissionSearchQuery] = useState("");
  const [missionActiveTagFilter, setMissionActiveTagFilter] = useState<string | null>(null);
  const [dbVenues, setDbVenues] = useState<any[]>([]);
  // [기능 추가] 예약 데이터 상태
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [plannerItems, setPlannerItems] = useState<any[]>([]);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedDenominations, setSelectedDenominations] = useState<string[]>(["전체"]);
  const [capacityRange, setCapacityRange] = useState<number>(10); // 수용인원 기본 값 10명
  const [isUnlimitedCapacity, setIsUnlimitedCapacity] = useState<boolean>(true); // 기본값은 '제한 없음'
  const [selectedLocation, setSelectedLocation] = useState<string>("전체");
  const [totalBudget, setTotalBudget] = useState<number>(10000000);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // 로그인 / 회원가입 관련 상태 추가
  const [viewMode, setViewMode] = useState<"card" | "list">("card"); // 카드뷰 / 리스트뷰 전환

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");

  const handleDenominationSelect = (name: string) => {
    if (name === "전체") {
      setSelectedDenominations(["전체"]);
      return;
    }
    let next = [...selectedDenominations].filter(item => item !== "전체");
    if (next.includes(name)) {
      next = next.filter(item => item !== name);
    } else {
      next.push(name);
    }
    if (next.length === 0) {
      setSelectedDenominations(["전체"]);
    } else {
      setSelectedDenominations(next);
    }
  };

  const handleGoToPlanner = () => {
    if (plannerItems.length === 0) {
      alert("비교할 장소를 먼저 담아주세요.");
      return;
    }
    setIsPlannerOpen(false);
    navigate("/planner");
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        const saved = localStorage.getItem("stayon_planner_member");
        setPlannerItems(saved ? JSON.parse(saved) : []);
      } else {
        setIsLoggedIn(false);
        const saved = sessionStorage.getItem("stayon_planner_guest");
        setPlannerItems(saved ? JSON.parse(saved) : []);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem("stayon_planner_member", JSON.stringify(plannerItems));
    } else {
      sessionStorage.setItem("stayon_planner_guest", JSON.stringify(plannerItems));
    }
  }, [plannerItems, isLoggedIn]);

  // [수정] venues와 bookings 컬렉션 동시 구독
  useEffect(() => {
    const q = query(collection(db, "venues"), where("status", "==", "approved"));
    const unsubscribeVenues = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedData = data.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setDbVenues(sortedData);
      setLoading(false);
    });

    const qBookings = query(collection(db, "bookings"));
    const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
      const bData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllBookings(bData);
    });

    return () => {
      unsubscribeVenues();
      unsubscribeBookings();
    };
  }, []);

  // 국내선교 탭용 - missionVenues는 venues와 완전히 분리된 컬렉션이라 별도로 구독한다.
  useEffect(() => {
    const q = query(collection(db, "missionVenues"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMissionVenues(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setMissionLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const togglePlannerItem = (venue: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const exists = plannerItems.find(item => item.id === venue.id);
    if (exists) {
      setPlannerItems(plannerItems.filter(item => item.id !== venue.id));
    } else {
      setPlannerItems([...plannerItems, venue]);
    }
  };

  // [기능 완성] 변수명 절대 유지 + 필터링 로직 작동하도록 수정
  // const filteredVenues = useMemo(() => {
  //   return dbVenues.filter((venue) => {
  //     // 1. 기본 필터 (변수명 고정)
  //     const venueLoc = venue.address || venue.location || "";
  //     // const locMatch = selectedLocation === "전체" || venueLoc.includes(selectedLocation);
  //     let locMatch = false;

  //     if (selectedLocation === "전체") {
  //       locMatch = true;
  //     } else {
  //       // 선택된 필터값 정규화 (예: "경상남도" -> "경남")
  //       const targetToken = normalizeLocation(selectedLocation);
  //       // 실제 주소 텍스트 정규화 (예: "경남 창원시..." -> "경남")
  //       // 주소의 첫 단어(시/도)를 가져와서 정규화합니다.
  //       const firstWord = venueLoc.split(" ")[0];
  //       const venueToken = normalizeLocation(firstWord);

  //       // 두 토큰이 일치하거나, 정규화된 키워드가 전체 주소에 포함되어 있는지 교차 검증
  //       locMatch = targetToken === venueToken || (targetToken !== "" && venueLoc.includes(targetToken));
  //     }

  //     const denomMatch = selectedDenominations.includes("전체") || selectedDenominations.includes(venue.denomination);
  //     // const capMatch = (venue.capacity || 0) >= capacityRange;

  //     // 제한 없음 로직 추가 : 제한없음 켜져 있으면 통과 / 꺼져 있으면 이상조건으로 비교
  //     const capMatch = isUnlimitedCapacity ? true : (venue.capacity || 0) >= capacityRange;

  //     // 2. 예약 가능 여부 필터 (변수명 고정)
  //     let dateAvailable = true;
  //     // if (startDate && endDate) {
  //     if (startDate) { // 시작일만 있어도 체크 시작 (종료일이 없으면 시작일 당일로 간주)
  //       const userS = new Date(startDate)
  //       userS.setHours(0, 0, 0, 0);

  //       // 종료일이 없으면 시작일과 같게 설정 (하루 조회 대응)
  //       const userE = endDate ? new Date(endDate) : new Date(startDate);
  //       userE.setHours(23, 59, 59, 999);

  //       // [핵심] 최상위 컬렉션에서 이 venueName과 매칭되는 예약 추출
  //       const currentVenueBookings = allBookings.filter(b => b.venueName === venue.venueName);


  //       const hasConflict = currentVenueBookings.some((b: any) => {
  //         // 확정된 예약만 체크
  //         const isConfirmed = b.status === "deposit_paid" || b.status === "completed";
  //         if (!isConfirmed) return false;

  //         const bS = new Date(b.startDate);
  //         bS.setHours(0, 0, 0, 0);
  //         const bE = new Date(b.endDate);
  //         bE.setHours(23, 59, 59, 999);

  //         // [핵심 논리] 겹침 판단 공식 (A기간의 시작이 B의 종료보다 작고, A의 종료가 B의 시작보다 크면 무조건 겹침)
  //         const overlap = userS <= bE && userE >= bS;
  //         return overlap;
  //       });

  //       if (hasConflict) dateAvailable = false;
  //     }

  //     return locMatch && denomMatch && capMatch && dateAvailable;
  //   });
  // }, [dbVenues, allBookings, selectedLocation, selectedDenominations, capacityRange, startDate, endDate]);
  const isBoosted = (venue: any) => {
    const until = venue.boostedUntil?.toDate?.();
    return !!(until && until.getTime() > Date.now());
  };
  const boostRank = (venue: any) => (isBoosted(venue) ? (venue.boostedAt?.toDate?.()?.getTime() || 0) : -1);

  const filteredVenues = useMemo(() => {
    return dbVenues.filter((venue) => {
      // 1. 지역 필터
      const venueLoc = venue.address || venue.location || "";
      let locMatch = false;

      if (selectedLocation === "전체") {
        locMatch = true;
      } else {
        const targetToken = normalizeLocation(selectedLocation);
        const firstWord = venueLoc.split(" ")[0];
        const venueToken = normalizeLocation(firstWord);
        locMatch = targetToken === venueToken || (targetToken !== "" && venueLoc.includes(targetToken));
      }

      // 2. 교단 필터
      const denomMatch = selectedDenominations.includes("전체") || selectedDenominations.includes(venue.denomination);

      // 3. 인원 필터 (★핵심: 제한 없음이 true면 아래 capacityRange 값에 상관없이 무조건 true 패스!)
      const capMatch = isUnlimitedCapacity ? true : (venue.capacity || 0) >= capacityRange;

      // 4. 예약 가능 여부 필터
      let dateAvailable = true;
      if (startDate) {
        const userS = new Date(startDate);
        userS.setHours(0, 0, 0, 0);

        const userE = endDate ? new Date(endDate) : new Date(startDate);
        userE.setHours(23, 59, 59, 999);

        // const currentVenueBookings = allBookings.filter(b => b.venueName === venue.venueName);
        const currentVenueBookings = allBookings.filter(b => b.venueId === venue.id || b.venueName === venue.venueName);

        const hasConflict = currentVenueBookings.some((b: any) => {
          const isConfirmed = b.status === "deposit_paid" || b.status === "completed";
          if (!isConfirmed) return false;

          const bS = new Date(b.startDate);
          bS.setHours(0, 0, 0, 0);
          const bE = new Date(b.endDate);
          bE.setHours(23, 59, 59, 999);

          const overlap = userS <= bE && userE >= bS;
          return overlap;
        });

        if (hasConflict) dateAvailable = false;
      }

      // 최종 결합
      return locMatch && denomMatch && capMatch && dateAvailable;
    })
      // 끌어올리기(boostedUntil이 아직 안 지난 장소)를 최상단으로, 그중에서는 최근에
      // 끌어올린 순으로 정렬한다. 나머지는 기존 필터 결과 순서를 그대로 유지한다.
      .sort((a, b) => boostRank(b) - boostRank(a));
  }, [dbVenues, allBookings, selectedLocation, selectedDenominations, capacityRange, isUnlimitedCapacity, startDate, endDate]);

  const MISSION_VISIBLE_TAG_FILTER_COUNT = 12;
  const missionAllTags = useMemo(() => {
    const set = new Set<string>();
    missionVenues.forEach((v) => (v.tags || []).forEach((t: string) => set.add(t)));
    return Array.from(set).slice(0, MISSION_VISIBLE_TAG_FILTER_COUNT);
  }, [missionVenues]);

  const missionFilteredVenues = useMemo(() => {
    const q = missionSearchQuery.trim();
    return missionVenues
      .filter((v) => !q || (v.venueName || "").includes(q) || (v.location || "").includes(q) || (v.tags || []).some((t: string) => t.includes(q)))
      .filter((v) => !missionActiveTagFilter || (v.tags || []).includes(missionActiveTagFilter));
  }, [missionVenues, missionSearchQuery, missionActiveTagFilter]);

  const resetFilters = () => {
    setSelectedDenominations(["전체"]);
    setSelectedLocation("전체");
    setCapacityRange(10); // 초기화 값
    setIsUnlimitedCapacity(true); // 초기화 시 인원 제한 없음 켜기
    setTotalBudget(10000000);
    setVerifiedOnly(false);
    setStartDate("");
    setEndDate("");
    setActiveFilter(null);
  };

  const getDateLabel = () => {
    if (!startDate && !endDate) return "날짜 선택";
    const start = startDate ? startDate.split('-').slice(1).join('.') : "미정";
    const end = endDate ? endDate.split('-').slice(1).join('.') : "미정";
    return `${start} ~ ${end}`;
  };

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(i);
    return days;
  }, [viewDate]);

  const handleDateClick = (day: number) => {
    const selected = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!startDate || (startDate && endDate)) {
      setStartDate(selected);
      setEndDate("");
    } else {
      if (new Date(selected) < new Date(startDate)) {
        setStartDate(selected);
        setEndDate("");
      } else {
        setEndDate(selected);
      }
    }
  };

  const searchedDenominations = useMemo(() => {
    if (!searchTerm) {
      return DENOMINATIONS.filter(d => activeCategory === "전체" ? true : d.category === activeCategory);
    }
    return DENOMINATIONS.filter(d =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, activeCategory]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans antialiased text-[#191F28] pb-24">
      <ScrollRestoration />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {activeMainTab === "domestic" && (
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-[#F2F4F6]">
        <div className="max-w-[1100px] mx-auto px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center flex-1">
              <FilterChip
                label={getDateLabel()}
                active={!!(startDate && endDate)}
                isOpen={activeFilter === "date"}
                onClick={() => setActiveFilter(activeFilter === "date" ? null : "date")}
                icon={<Calendar className={`w-4 h-4 ${startDate && endDate ? "text-white" : "text-[#B0B8C1]"}`} />}
              />
              <FilterChip
                label={selectedLocation === "전체" ? "전국" : selectedLocation}
                active={selectedLocation !== "전체"}
                isOpen={activeFilter === "location"}
                onClick={() => setActiveFilter(activeFilter === "location" ? null : "location")}
                icon={<MapPin className={`w-4 h-4 ${selectedLocation !== "전체" ? "text-white" : "text-[#B0B8C1]"}`} />}
              />
              {/* <FilterChip
                label={selectedDenominations.includes("전체") ? "교단 전체" : `${selectedDenominations[0].split("(")[0]} ${selectedDenominations.length > 1 ? `외 ${selectedDenominations.length - 1}` : ""}`}
                active={!selectedDenominations.includes("전체")}
                isOpen={activeFilter === "denomination"}
                onClick={() => setActiveFilter(activeFilter === "denomination" ? null : "denomination")}
              /> */}
              {/* <FilterChip label={capacityRange >= 1000 ? "인원 전체" : `~${capacityRange}명`} active={capacityRange < 1000} isOpen={activeFilter === "capacity"} onClick={() => setActiveFilter(activeFilter === "capacity" ? null : "capacity")} /> */}
              <FilterChip
                label={isUnlimitedCapacity ? "인원 전체" : `${capacityRange}명 이상`}
                active={!isUnlimitedCapacity}
                isOpen={activeFilter === "capacity"}
                onClick={() => setActiveFilter(activeFilter === "capacity" ? null : "capacity")}
              />

              <div className="relative shrink-0">
                <button disabled className="px-3.5 py-2 rounded-full text-[12px] font-black flex items-center gap-1.5 bg-white border border-[#F2F4F6] text-[#B0B8C1] cursor-not-allowed">
                  스테이온 인증 <span className="text-[9px] text-[#3182F6] bg-[#F2F8FF] px-1.5 py-0.5 rounded ml-0.5">출시예정</span>
                </button>
              </div>
              <button onClick={resetFilters} className="p-2 text-[#B0B8C1] hover:text-[#4E5968] transition-colors shrink-0">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {activeFilter && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveFilter(null)} className="fixed inset-0 bg-[#191F28]/10 z-[-1] backdrop-blur-[2px]" />
              <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="absolute left-0 right-0 top-full bg-white border-b border-[#F2F4F6] shadow-[0_25px_50px_rgba(0,0,0,0.08)]">
                <div className="max-w-[900px] mx-auto px-5 py-6">

                  {activeFilter === "date" && (
                    <div className="flex flex-col items-center">
                      <div className="w-full max-w-[360px]">
                        <div className="flex justify-between items-center mb-3">
                          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))} className="p-1.5 hover:bg-[#F2F4F6] rounded-full"><ChevronLeft className="w-4 h-4" /></button>
                          <h4 className="text-[15px] font-black">{viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월</h4>
                          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))} className="p-1.5 hover:bg-[#F2F4F6] rounded-full"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-7 mb-1">
                          {["일", "월", "화", "수", "목", "금", "토"].map(d => (
                            <div key={d} className="text-center text-[11px] font-bold text-[#B0B8C1] py-1">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-y-0.5">
                          {calendarDays.map((day, idx) => {
                            if (!day) return <div key={idx} />;
                            const current = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isStart = startDate === current;
                            const isEnd = endDate === current;
                            const inRange = startDate && endDate && new Date(current) > new Date(startDate) && new Date(current) < new Date(endDate);
                            return (
                              <button key={idx} onClick={() => handleDateClick(day)} className={`relative py-2.5 text-[14px] font-bold transition-all rounded-xl ${isStart || isEnd ? "bg-[#3182F6] text-white z-10 shadow-sm" : "hover:bg-[#F2F4F6] text-[#4E5968]"} ${inRange ? "bg-[#E8F3FF] !rounded-none text-[#3182F6]" : ""}`}>
                                {day}
                                {(isStart && endDate) && <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[#E8F3FF] -z-10" />}
                                {(isEnd && startDate) && <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-[#E8F3FF] -z-10" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-5 w-full max-w-[360px]">
                        <button onClick={() => { setStartDate(""); setEndDate(""); }} className="flex-1 py-3 bg-[#F2F4F6] text-[#4E5968] rounded-xl font-black text-[14px]">초기화</button>
                        <button onClick={() => setActiveFilter(null)} className="flex-[2] py-3 bg-[#3182F6] text-white rounded-xl font-black text-[14px] shadow-sm shadow-[#3182F6]/20">선택 완료</button>
                      </div>
                    </div>
                  )}

                  {activeFilter === "location" && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {LOCATIONS.map((loc) => (
                        <button key={loc} onClick={() => { setSelectedLocation(loc); setActiveFilter(null); }} className={`py-2.5 rounded-xl text-[13px] font-bold transition-all ${selectedLocation === loc ? "bg-[#3182F6] text-white shadow-sm" : "bg-[#F9FAFB] text-[#4E5968] hover:bg-[#F2F4F6]"}`}>{loc}</button>
                      ))}
                    </div>
                  )}

                  {activeFilter === "denomination" && (
                    <div className="flex flex-col h-[550px] -mx-6 -my-10 bg-white overflow-hidden">
                      <div className="px-8 pt-10 pb-6 space-y-6 border-b border-[#F2F4F6]">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[22px] font-black tracking-tight text-[#191F28]">교단 선택</h4>
                          <div className="relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0B8C1]" />
                            <input type="text" placeholder="교단명을 검색하세요" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-12 py-5 bg-[#F9FAFB] rounded-[24px] font-bold outline-none focus:border-[#3182F6] border-2 border-transparent transition-all" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 flex overflow-hidden">
                        <div className={`w-[130px] bg-[#F9FAFB] overflow-y-auto no-scrollbar border-r border-[#F2F4F6] ${searchTerm ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                          {Array.from(new Set(DENOMINATIONS.map(d => d.category))).map((cat) => (
                            <button key={cat} onClick={() => setActiveCategory(cat)} className={`w-full px-6 py-5 text-left text-[15px] font-black transition-all relative ${(activeCategory === cat) ? "bg-white text-[#3182F6]" : "text-[#8B95A1] hover:text-[#4E5968]"}`}>
                              {cat}
                              {activeCategory === cat && <motion.div layoutId="activeTab" className="absolute left-0 top-1/4 bottom-1/4 w-[4px] bg-[#3182F6] rounded-r-full" />}
                            </button>
                          ))}
                        </div>
                        <div className="flex-1 bg-white overflow-y-auto p-6 no-scrollbar">
                          {searchedDenominations.length > 0 ? (
                            <div className="grid grid-cols-1 gap-1.5">
                              {searchedDenominations.map((denom) => {
                                const isSelected = selectedDenominations.includes(denom.name);
                                return (
                                  <button key={denom.name} onClick={() => handleDenominationSelect(denom.name)} className={`flex items-center justify-between p-5 rounded-[22px] transition-all ${isSelected ? "bg-[#E8F3FF] text-[#3182F6]" : "hover:bg-[#F2F4F6]"}`}>
                                    <span className="text-[16px] font-bold">{denom.name}</span>
                                    {isSelected && <Check className="w-5 h-5" strokeWidth={4} />}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center py-10">
                              <p className="text-[15px] font-black text-[#B0B8C1]">검색 결과가 없어요</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-6 bg-white border-t border-[#F2F4F6] flex items-center justify-between">
                        <div className="flex flex-col"><span className="text-[12px] font-bold text-[#B0B8C1]">현재 선택</span><span className="text-[15px] font-black text-[#191F28]">{selectedDenominations.join(", ")}</span></div>
                        <button onClick={() => setActiveFilter(null)} className="px-10 py-4 bg-[#3182F6] text-white rounded-[20px] font-black text-[16px]">선택 완료</button>
                      </div>
                    </div>
                  )}

                  {/* {activeFilter === "capacity" && (
                    <div className="flex flex-col items-center py-4">
                      <h4 className="text-[20px] font-black mb-10">최대 수용 인원: <span className="text-[#3182F6]">{capacityRange}명</span></h4>
                      <input type="range" min="10" max="1000" step="10" value={capacityRange} onChange={(e) => setCapacityRange(Number(e.target.value))} className="w-full max-w-[500px] h-2 bg-[#F2F4F6] rounded-lg appearance-none cursor-pointer accent-[#3182F6]" />
                      <button onClick={() => setActiveFilter(null)} className="mt-12 px-16 py-4 bg-[#3182F6] text-white rounded-2xl font-black">확인</button>
                    </div>
                  )} */}

                  {activeFilter === "capacity" && (
                    <div className="flex flex-col items-center">
                      {/* 타이틀 영역: 토스 특유의 연한 회색과 볼드한 서체 조합 */}
                      <div className="text-center mb-4">
                        <span className="text-[12px] font-bold text-[#8B95A1] block mb-0.5">수용 인원</span>
                        <h4 className="text-[19px] font-black tracking-tight text-[#191F28]">
                          {isUnlimitedCapacity ? "제한 없이 전체 보기" : `${capacityRange}명 이상`}
                        </h4>
                      </div>

                      {/* [토스 스타일 체크 행] 클릭하면 토글되는 깔끔한 컴포넌트 */}
                      <div
                        onClick={() => setIsUnlimitedCapacity(!isUnlimitedCapacity)}
                        className="w-full max-w-[360px] flex items-center justify-between p-4 rounded-xl bg-[#F9FAFB] cursor-pointer hover:bg-[#F2F4F6] transition-all mb-5 select-none"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[14px] font-black text-[#333D4B]">인원 제한 없음</span>
                          <span className="text-[12px] font-bold text-[#8B95A1]">모든 규모의 장소를 다 볼래요</span>
                        </div>

                        {/* 토스 고유의 라운드 체크박스 형태 구현 */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all border-2 shrink-0
        ${isUnlimitedCapacity
                            ? "bg-[#3182F6] border-[#3182F6] text-white"
                            : "bg-white border-[#E5E8EB] text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={4} />
                        </div>
                      </div>

                      {/* 슬라이더 영역 */}
                      <div className={`w-full max-w-[360px] transition-all duration-300 ${isUnlimitedCapacity ? "opacity-20 pointer-events-none scale-[0.98]" : "opacity-100"}`}>
                        <input
                          type="range"
                          min="10"
                          max="500"
                          step="10"
                          value={capacityRange}
                          onChange={(e) => setCapacityRange(Number(e.target.value))}
                          // 토스 스타일의 얇고 매끄러운 커스텀 슬라이더 바 디자인
                          className="w-full h-1.5 bg-[#E5E8EB] rounded-lg appearance-none cursor-pointer accent-[#3182F6]"
                        />
                        <div className="flex justify-between text-[11px] font-black text-[#B0B8C1] mt-2 px-0.5">
                          <span>10명</span>
                          <span>250명</span>
                          <span>500명+</span>
                        </div>
                      </div>

                      {/* 확인 버튼: 하단에 딱 떨어지는 토스형 프라이머리 버튼 */}
                      <button
                        onClick={() => setActiveFilter(null)}
                        className="mt-6 w-full max-w-[360px] py-3 bg-[#3182F6] text-white rounded-xl font-black text-[14px] shadow-sm hover:bg-[#1B64DA] active:scale-[0.99] transition-all"
                      >
                        확인
                      </button>
                    </div>
                  )}

                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      )}

      <main className="max-w-[1100px] mx-auto px-5 py-6">
        {/* {!isLoggedIn && (
          <div className="mb-10 flex items-start gap-4 p-7 bg-white border border-[#F2F4F6] rounded-[32px] shadow-[0_15px_45px_rgba(240,68,82,0.06)]">
            <div className="p-3 bg-[#FFF0F0] rounded-2xl"><AlertCircle className="w-6 h-6 text-[#F04452]" /></div>
            <div className="flex flex-col gap-1">
              <p className="text-[#191F28] text-[17px] font-black">기록을 안전하게 보관할까요?</p>
              <p className="text-[#8B95A1] text-[15px] font-bold">브라우저를 닫으면 사라져요. <span className="text-[#3182F6] underline cursor-pointer" onClick={() => navigate('/login')}>로그인하기</span></p>
            </div>
          </div>
        )} */}

        {!isLoggedIn && (
          <div className="mb-4 flex items-center gap-3 p-4 bg-white border border-[#F2F4F6] rounded-2xl shadow-[0_4px_16px_rgba(240,68,82,0.04)]">
            <div className="p-2 bg-[#FFF0F0] rounded-xl shrink-0">
              <AlertCircle className="w-5 h-5 text-[#F04452]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[#191F28] text-[14px] font-black">기록을 안전하게 보관할까요?</p>
              <p className="text-[#8B95A1] text-[13px] font-bold">
                브라우저를 닫으면 사라져요.{" "}
                <span
                  className="text-[#3182F6] underline cursor-pointer"
                  onClick={() => setIsAuthModalOpen(true)} // 여기서 모달 열기
                >
                  로그인하기
                </span>
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-40 flex flex-col items-center gap-6">
            <div className="w-12 h-12 border-[4px] border-[#F2F4F6] border-t-[#3182F6] rounded-full animate-spin" />
            <p className="text-[17px] font-black text-[#B0B8C1]">멋진 장소를 찾고 있어요</p>
          </div>
        ) : (
          <>
            {/* <div className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="text-[28px] font-black text-[#191F28] tracking-tight">
                  {selectedLocation === "전체" ? "전국" : selectedLocation} 추천 장소 <span className="text-[#3182F6] ml-1">{filteredVenues.length}</span>
                </h2>
                <p className="text-[#8B95A1] text-[16px] mt-2 font-bold">최신 등록 순으로 보여드릴게요.</p>
              </div>
            </div> */}

            {/* 오픈 기념 배너 */}
            <div className="bg-[#F2F8FF] rounded-2xl p-4 border border-[#E8F3FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-xl mt-0.5 shrink-0">🚀</div>
                <div className="flex-1">
                  <h4 className="text-[14px] font-black text-[#191F28] mb-0.5">
                    수련회 장소 서비스를 마음껏 이용해보세요!
                  </h4>
                  <p className="text-[12px] text-[#6B7684] font-medium leading-relaxed">
                    오픈 기념 장소 등록 시 다양한 혜택을 제공하고 있습니다. 지금 우리만의 멋진 공간을 공유하고 특별한 리워드를 받아보세요.
                  </p>
                  <a
                    href="https://place.stayon-platform.com/register"
                    className="inline-block mt-2 text-[12px] font-bold text-[#3182F6] hover:text-[#1B64DA] transition-colors"
                  >
                    지금 장소 등록하고 혜택받기 →
                  </a>
                </div>
              </div>

              <div className="flex shrink-0 items-center">
                <a
                  href="https://place.stayon-platform.com/register"
                  className="inline-flex items-center justify-center bg-[#3182F6] text-white text-[13px] font-bold px-4 py-2.5 rounded-xl hover:bg-[#1B64DA] active:scale-[0.98] transition-all tracking-tight shadow-sm"
                >
                  장소 등록하기
                  <svg
                    className="w-3.5 h-3.5 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
              </div>
            </div>

            {/* "수련회" / "국내선교" 탭 - 토스 스타일 슬라이딩 애니메이션(framer-motion layoutId).
                BoardSwitcher.tsx와 같은 방식(흰 알약이 탭 사이를 부드럽게 이동)으로 통일했다. */}
            <div className="inline-flex items-center gap-1 bg-[#F2F4F6] p-1 rounded-full mb-4">
              {([
                { id: "domestic", label: "수련회" },
                { id: "mission", label: "국내선교" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSearchParams(tab.id === "mission" ? { category: "mission" } : {}, { replace: true });
                  }}
                  className="relative px-5 py-2.5 rounded-full text-[14px] font-black whitespace-nowrap"
                >
                  {activeMainTab === tab.id && (
                    <motion.div
                      layoutId="venue-main-tab-pill"
                      className="absolute inset-0 bg-white rounded-full shadow-sm"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className={`relative z-10 transition-colors ${activeMainTab === tab.id ? "text-[#3182F6]" : "text-[#8B95A1]"}`}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {activeMainTab === "mission" ? (
              <div>
                <div className="relative mb-5">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
                  <input
                    type="text"
                    value={missionSearchQuery}
                    onChange={(e) => setMissionSearchQuery(e.target.value)}
                    placeholder="장소명, 지역, 태그로 검색"
                    className="w-full h-12 bg-white rounded-2xl pl-11 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#3182F6] transition-all"
                  />
                </div>

                {missionAllTags.length > 0 && (
                  <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
                    <button
                      onClick={() => setMissionActiveTagFilter(null)}
                      className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-bold border transition-all whitespace-nowrap ${!missionActiveTagFilter ? "bg-[#191F28] border-[#191F28] text-white" : "bg-white border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6]/50"}`}
                    >
                      전체
                    </button>
                    {missionAllTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setMissionActiveTagFilter(missionActiveTagFilter === tag ? null : tag)}
                        className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-bold border transition-all whitespace-nowrap ${missionActiveTagFilter === tag ? "bg-[#3182F6] border-[#3182F6] text-white" : "bg-white border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6]/50"}`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {missionLoading ? (
                  <div className="py-32 flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#3182F6] rounded-full animate-spin" />
                    <p className="text-[14px] font-bold text-[#8B95A1]">목록을 불러오고 있어요</p>
                  </div>
                ) : missionFilteredVenues.length === 0 ? (
                  <div className="py-32 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
                    <h3 className="text-[18px] font-black text-[#4E5968]">등록된 선교지가 없어요</h3>
                    <p className="text-[13px] font-bold text-[#B0B8C1] mt-2">곧 새로운 선교지가 소개될 예정이에요.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[13px] font-bold text-[#8B95A1]">총 {missionFilteredVenues.length}곳</p>
                      <div className="flex items-center gap-1 bg-[#F2F4F6] p-1 rounded-xl shrink-0">
                        <button
                          onClick={() => setViewMode("card")}
                          className={`p-2 rounded-lg transition-all ${viewMode === "card" ? "bg-white text-[#3182F6] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                          aria-label="카드뷰"
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode("list")}
                          className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-[#3182F6] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                          aria-label="리스트뷰"
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className={viewMode === "card" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-6" : "flex flex-col gap-3"}>
                      <AnimatePresence mode="popLayout">
                        {missionFilteredVenues.map((venue) => {
                          const photo = venue.images?.[0];

                          if (viewMode === "list") {
                            return (
                              <motion.div
                                key={venue.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                onClick={() => navigate(`/mission-venues/${venue.id}`)}
                                className="flex items-center gap-4 bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
                              >
                                <div className="relative w-24 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-[#F2F4F6]">
                                  {photo ? (
                                    <img src={photo} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center"><Compass className="w-6 h-6 text-[#D1D6DB]" /></div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  {venue.denomination && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap bg-[#EFF6FF] text-[#2563EB]">
                                        {venue.denomination}
                                      </span>
                                    </div>
                                  )}
                                  <h3 className="text-[15px] sm:text-[16px] font-black text-[#191F28] truncate mt-1">{venue.venueName}</h3>
                                  {venue.location && (
                                    <p className="text-[12px] font-bold text-[#4E5968] mt-1.5 truncate">{venue.location}</p>
                                  )}
                                </div>
                              </motion.div>
                            );
                          }

                          return (
                            <motion.div
                              key={venue.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                              onClick={() => navigate(`/mission-venues/${venue.id}`)}
                              className="flex flex-col bg-white rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer"
                            >
                              <div className="relative aspect-video overflow-hidden bg-[#F2F4F6]">
                                {photo ? (
                                  <img src={photo} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Compass className="w-8 h-8 text-[#D1D6DB]" /></div>
                                )}
                                {venue.denomination && (
                                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm bg-[#EFF6FF] text-[#2563EB]">
                                    {venue.denomination}
                                  </span>
                                )}
                              </div>
                              <div className="p-5 flex flex-col gap-3">
                                <div>
                                  <h3 className="text-[17px] font-black text-[#191F28] line-clamp-1">{venue.venueName}</h3>
                                  {venue.location && (
                                    <p className="text-[13px] font-bold text-[#4E5968] line-clamp-1 break-keep mt-1">{venue.location}</p>
                                  )}
                                </div>
                                {(venue.tags || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {venue.tags.slice(0, 3).map((tag: string) => (
                                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#F2F4F6] text-[#6B7684]">
                                        <Tag className="w-2.5 h-2.5" />{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </div>
            ) : (
            <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold text-[#8B95A1]">총 {filteredVenues.length}곳</p>
              <div className="flex items-center gap-1 bg-[#F2F4F6] p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "card" ? "bg-white text-[#3182F6] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                  aria-label="카드뷰"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-[#3182F6] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                  aria-label="리스트뷰"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={viewMode === "card" ? "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-4 md:gap-x-5 md:gap-y-6" : "flex flex-col gap-3"}>
              <AnimatePresence mode="popLayout">
                {filteredVenues.map((venue) => {
                  const isAdded = plannerItems.some(item => item.id === venue.id);

                  if (viewMode === "list") {
                    return (
                      <motion.div
                        key={venue.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(`/venue/${venue.id}`)}
                        className="cursor-pointer group flex items-center gap-4 bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300"
                      >
                        <div className="relative w-28 h-24 sm:w-40 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-[#F2F4F6]">
                          <img src={venue.images?.[0] || "/placeholder.jpg"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          {(venue.verified || venue.badges?.includes("stayon")) && (
                            <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-md p-1 rounded-md shadow-sm">
                              <ShieldCheck className="w-3 h-3 text-[#3182F6]" strokeWidth={2.5} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-[15px] sm:text-[16px] font-black text-[#191F28] truncate">{venue.venueName}</h3>
                              <div className="flex items-center gap-1.5 text-[#8B95A1] font-bold text-[12px] mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{(venue.address || venue.location || "").split(" ").slice(0, 3).join(" ")}</span>
                              </div>
                            </div>
                            <button onClick={(e) => togglePlannerItem(venue, e)} className={`shrink-0 p-2 rounded-lg transition-all active:scale-90 ${isAdded ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#191F28] hover:bg-[#E5E8EB]"}`}>
                              {isAdded ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Plus className="w-3.5 h-3.5" strokeWidth={3} />}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {isBoosted(venue) && (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-[#FFF7ED] text-[#EA580C]">🔥 추천</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${getDenominationStyle(venue.denomination)}`}>{venue.denomination?.split("(")[0] || "기타"}</span>
                            <div className="flex items-center gap-1 text-[#4E5968] font-black text-[12px]"><Users className="w-3 h-3 opacity-40" /> 최대 {venue.capacity}명</div>
                            {venue.tags?.slice(0, 2).map((tag: string) => (
                              <span key={tag} className="text-[10px] font-bold text-[#3182F6] bg-[#F2F8FF] px-1.5 py-0.5 rounded-md whitespace-nowrap">#{tag}</span>
                            ))}
                          </div>

                          <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-[12px] font-bold text-[#8B95A1] mr-1">1박</span>
                            <span className="text-[16px] sm:text-[17px] font-black text-[#3182F6]">{Number(venue.price || 0).toLocaleString()}</span>
                            <span className="text-[12px] font-black text-[#3182F6]">원</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={venue.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      onClick={() => navigate(`/venue/${venue.id}`)}
                      className="cursor-pointer group relative flex flex-col bg-white rounded-2xl md:rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500"
                    >
                      <button onClick={(e) => togglePlannerItem(venue, e)} className={`absolute top-2 left-2 md:top-4 md:left-4 z-10 p-1.5 md:p-2.5 rounded-lg md:rounded-xl backdrop-blur-xl transition-all active:scale-90 shadow-lg ${isAdded ? "bg-[#3182F6] text-white" : "bg-white/80 text-[#191F28] hover:bg-white"}`}>
                        {isAdded ? <Check className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={3} /> : <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" strokeWidth={3} />}
                      </button>
                      <div className="relative aspect-[16/10.5] overflow-hidden bg-[#F2F4F6]">
                        <img src={venue.images?.[0] || "/placeholder.jpg"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        {/* {venue.verified && (
                          <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-1.5 border border-[#3182F6]/10 shadow-sm">
                            <ShieldCheck className="w-4 h-4 text-[#3182F6]" strokeWidth={2.5} />
                            <span className="text-[12px] font-black text-[#191F28]">StayOn 인증</span>
                          </div>
                        )} */}

                        {/* 리포미디어 이슈 : 사용자 뱃지 추천 제안 */}
                        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10 flex flex-col gap-1 md:gap-1.5 items-end">
                          {isBoosted(venue) && (
                            <div className="bg-[#FFF7ED]/95 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-full flex items-center gap-1 border border-[#FFEDD5] shadow-sm whitespace-nowrap">
                              <span className="text-[9.5px] md:text-[11px] font-black text-[#EA580C]">🔥 추천</span>
                            </div>
                          )}
                          {/* 1. 기본 boolean 기반의 StayOn 인증 데이터 처리 */}
                          {venue.verified && (
                            <div className="bg-white/95 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-full flex items-center gap-1 border border-[#3182F6]/10 shadow-sm whitespace-nowrap">
                              <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#3182F6]" strokeWidth={2.5} />
                              <span className="text-[9.5px] md:text-[11px] font-black text-[#191F28]">StayOn 인증</span>
                            </div>
                          )}

                          {/* 2. StayOn 인증 (신규 어드민 badges 배열에 'stayon'이 있고, 기존 verified와 중복되지 않을 때만) */}
                          {venue.badges?.includes("stayon") && !venue.verified && (
                            <div className="bg-white/95 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-full flex items-center gap-1 border border-[#3182F6]/10 shadow-sm whitespace-nowrap">
                              <ShieldCheck className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#3182F6]" strokeWidth={2.5} />
                              <span className="text-[9.5px] md:text-[11px] font-black text-[#191F28]">StayOn 인증</span>
                            </div>
                          )}

                          {/* 3. 리포미디어 인증 (새 관리자 페이지에서 추가된 동적 뱃지 - 시안 피드백 그린 아이덴티티 반영) */}
                          {/* {venue.badges?.includes("repomedia") && (
                            <div className="bg-[#E6F4EA]/95 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-1.5 border border-[#10B981]/10 shadow-sm whitespace-nowrap">
                              <Award className="w-4 h-4 text-[#10B981]" strokeWidth={2.5} />
                              <span className="text-[12px] font-black text-[#191F28]">리포미디어 인증</span>
                            </div>
                          )} */}
                        </div>


                      </div>
                      <div className="p-2.5 md:p-5 flex flex-col gap-2.5 md:gap-4">
                        <div className="space-y-1 md:space-y-2">
                          <h3 className="text-[14px] md:text-[18px] font-black text-[#191F28] line-clamp-1">{venue.venueName}</h3>
                          <div className="flex items-center gap-1 md:gap-1.5 text-[#8B95A1] font-bold text-[11px] md:text-[13px]">
                            <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" />
                              <span className="truncate">
                                {/* {venue.address || venue.location} */}
                                {(venue.address || venue.location || "").split(" ").slice(0, 3).join(" ")}
                              </span>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2 pt-1 flex-wrap">
                            <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[9px] md:text-[10px] font-black whitespace-nowrap ${getDenominationStyle(venue.denomination)}`}>{venue.denomination?.split("(")[0] || "기타"}</span>
                            <div className="flex items-center gap-1 text-[#4E5968] font-black text-[11px] md:text-[13px] whitespace-nowrap"><Users className="w-3 h-3 md:w-3.5 md:h-3.5 opacity-40" /> <span>최대 {venue.capacity}명</span></div>
                          </div>
                          {venue.tags?.length > 0 && (
                            <div className="flex items-center gap-1 md:gap-1.5 pt-1 flex-wrap">
                              {venue.tags.slice(0, 3).map((tag: string) => (
                                <span key={tag} className="text-[9.5px] md:text-[11px] font-bold text-[#3182F6] bg-[#F2F8FF] px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg whitespace-nowrap">#{tag}</span>
                              ))}
                              {venue.tags.length > 3 && (
                                <span className="text-[9.5px] md:text-[11px] font-bold text-[#8B95A1] bg-[#F2F4F6] px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg shrink-0">+{venue.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="w-full h-[1px] bg-[#F2F4F6]" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] md:text-[13px] font-bold text-[#8B95A1]">1박 기준</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[15px] md:text-[21px] font-black text-[#3182F6]">{Number(venue.price || 0).toLocaleString()}</span><span className="text-[11px] md:text-[14px] font-black text-[#3182F6]">원</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            {filteredVenues.length === 0 && (
              <div className="py-40 text-center bg-white rounded-[40px] border border-[#F2F4F6]">
                <h3 className="text-[24px] font-black text-[#4E5968]">조건에 맞는 장소가 없어요</h3>
                <button onClick={resetFilters} className="mt-6 text-[#3182F6] font-black underline">필터 초기화</button>
              </div>
            )}
            </>
            )}
          </>
        )}
      </main>

      {/* 스마트 플래너 플로팅 버튼 - 모바일에서는 아이콘만 있는 동그란 버튼으로 줄여서
          같은 화면 구석에 뜨는 1:1 문의하기(Layout.tsx) 버튼과 겹쳐 보이지 않게 한다.
          PC(md 이상)는 기존 글자 포함 알약 버튼 그대로 유지. */}
      <motion.button
        whileHover={{ scale: 1.05, y: -5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsPlannerOpen(true)}
        className="fixed bottom-4 md:bottom-10 right-4 md:right-10 z-[60] bg-[#191F28] text-white w-14 h-14 md:w-auto md:h-auto px-0 md:pl-6 md:pr-7 py-0 md:py-5 rounded-full md:rounded-[30px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex items-center justify-center md:gap-4 transition-all"
      >
        <div className="relative flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-[#3182F6]" strokeWidth={2.5} />
          {plannerItems.length > 0 && (
            <span className="absolute -top-2.5 -right-2.5 md:-top-3 md:-right-3 bg-[#F04452] text-[10px] md:text-[11px] font-black w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center border-[2px] md:border-[3px] border-[#191F28] animate-in zoom-in duration-300">
              {plannerItems.length}
            </span>
          )}
        </div>
        <span className="hidden md:inline font-black text-[17px] tracking-tight">
          {isLoggedIn ? "스마트 플래너" : "임시 플래너"}
        </span>
      </motion.button>

      <AnimatePresence>
        {isPlannerOpen && (
          <>
            {/* 백드롭 레이어 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlannerOpen(false)}
              className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-[4px]"
            />

            {/* 플래너 사이드 패널 */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-white z-[80] shadow-2xl flex flex-col rounded-l-[40px] overflow-hidden"
            >
              {/* 헤더 섹션 */}
              <div className="px-8 pt-12 pb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-[24px] font-black flex items-center gap-2 text-[#191F28]">
                    <Briefcase className="w-7 h-7 text-[#3182F6]" strokeWidth={3} />
                    플래너
                  </h3>
                  <p className="text-[14px] text-[#8B95A1] font-bold mt-1">관심 있는 장소를 한눈에 비교하세요</p>
                </div>
                <button
                  onClick={() => setIsPlannerOpen(false)}
                  className="p-3 hover:bg-[#F2F4F6] rounded-full transition-all text-[#4E5968]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* 메인 리스트 섹션 */}
              <div className="flex-1 overflow-y-auto px-8 py-4 no-scrollbar">
                <AnimatePresence mode="popLayout">
                  {plannerItems.length > 0 ? (
                    plannerItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex gap-5 p-5 mb-4 rounded-[28px] bg-white border border-[#F2F4F6] hover:border-[#3182F6]/20 hover:shadow-lg hover:shadow-[#3182F6]/5 transition-all group relative"
                      >
                        <div className="w-20 h-20 rounded-[20px] overflow-hidden bg-[#F2F4F6] shrink-0 border border-[#F2F4F6]">
                          <img src={item.images?.[0]} className="w-full h-full object-cover" alt={item.venueName} />
                        </div>
                        <div className="flex-1 flex flex-col justify-center pr-8">
                          <span className="text-[12px] text-[#8B95A1] font-bold mb-0.5">{item.address?.split(' ')[1] || "지역 미정"}</span>
                          <h4 className="font-black text-[17px] text-[#191F28] line-clamp-1">{item.venueName}</h4>
                          <p className="text-[15px] text-[#3182F6] font-extrabold mt-1">
                            {Number(item.price) > 0 ? `${Number(item.price).toLocaleString()}원~` : "가격 문의"}
                          </p>
                        </div>

                        {/* 제어 버튼 영역 */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/venue/${item.id}`)}
                            className="p-2 bg-[#F2F4F6] text-[#4E5968] rounded-full hover:bg-[#E8F3FF] hover:text-[#3182F6] transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => togglePlannerItem(item, e as any)}
                            className="p-2 bg-[#FFF0F6] text-[#F04452] rounded-full hover:bg-[#F04452] hover:text-white transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    /* --- EMPTY STATE: 장소가 없을 때 --- */
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center pb-20"
                    >
                      <div className="w-20 h-20 bg-[#F2F4F6] rounded-[30px] flex items-center justify-center mb-6">
                        <Plus className="w-8 h-8 text-[#B0B8C1]" />
                      </div>
                      <h4 className="text-[19px] font-black text-[#333D4B] mb-2">플래너가 비어있어요</h4>
                      <p className="text-[15px] text-[#6B7684] font-medium leading-relaxed">
                        마음에 드는 장소를 추가하고<br />
                        똑똑하게 비교 견적을 받아보세요
                      </p>
                      <button
                        onClick={() => setIsPlannerOpen(false)}
                        className="mt-8 px-6 py-3 bg-[#E8F3FF] text-[#3182F6] rounded-full font-black text-[14px] hover:bg-[#3182F6] hover:text-white transition-all"
                      >
                        장소 둘러보기
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 하단 액션 버튼 영역 */}
              {plannerItems.length > 0 && (
                <div className="p-8 pt-4 bg-white border-t border-[#F2F4F6]">
                  <div className="flex justify-between items-center mb-6 px-2">
                    <span className="text-[#6B7684] font-bold text-[15px]">선택한 장소</span>
                    <span className="text-[#191F28] font-black text-[17px]">{plannerItems.length}곳</span>
                  </div>
                  <button
                    onClick={handleGoToPlanner}
                    className="w-full py-6 bg-[#3182F6] text-white rounded-[24px] font-black text-[19px] shadow-xl shadow-[#3182F6]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                  >
                    비교 견적 요청하기
                    <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        input[type="range"]::-webkit-slider-thumb {
          width: 32px; height: 32px; background: white; border: 4px solid #3182F6;
          border-radius: 50%; cursor: pointer; box-shadow: 0 4px 15px rgba(49, 130, 246, 0.2); appearance: none;
        }
      `}</style>
    </div>
  );
}

function FilterChip({ label, active, isOpen, onClick, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full text-[13px] font-black transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${active
        ? "bg-[#3182F6] border-[#3182F6] text-white shadow-sm"
        : isOpen
          ? "bg-[#E8F3FF] border-[#3182F6] text-[#3182F6]"
          : "bg-white border-[#E5E8EB] text-[#4E5968] hover:border-[#B0B8C1]"
        }`}
    >
      {icon && icon}
      {label}
      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? "rotate-180" : "opacity-30"}`} />
    </button>
  );
}
