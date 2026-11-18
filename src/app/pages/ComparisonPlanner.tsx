import { ScrollRestoration } from "react-router-dom";
import {
  ChevronLeft, Trash2, Users, MapPin,
  CreditCard, Music2, Coffee, FileText,
  Plus, CalendarDays, ExternalLink, FileDown, X,
  Quote, HelpCircle, AlertCircle, Image as ImageIcon,
  CheckCircle2, Star, Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { exportToPNG, exportToExcel, exportToPDF, exportToHWP, type Venue } from '../../utils/ExportUtils';
import { showConfirm } from "../lib/dialog";

export function ComparisonPlanner() {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // --- 상태 관리 (기존 유지) ---
  const [viewType, setViewType] = useState<'card' | 'table'>('card');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [eventDate, setEventDate] = useState("2026-08-15");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 메뉴 영역(ref) 바깥을 클릭했을 때만 닫음
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setIsDownloadMenuOpen(false);
      }
    };

    if (isDownloadMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDownloadMenuOpen]);

  // --- 데이터 불러오기 (기존 로직 유지) ---
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        const saved = localStorage.getItem("stayon_planner_member");
        setVenues(saved ? JSON.parse(saved) : []);
      } else {
        setIsLoggedIn(false);
        const saved = sessionStorage.getItem("stayon_planner_guest");
        setVenues(saved ? JSON.parse(saved) : []);
      }
      setIsAuthChecked(true);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // if (venues.length === 0) return;
    if (!isAuthChecked) return;
    if (isLoggedIn) {
      localStorage.setItem("stayon_planner_member", JSON.stringify(venues));
    } else {
      sessionStorage.setItem("stayon_planner_guest", JSON.stringify(venues));
    }
  }, [venues, isLoggedIn]);

  // --- 분석 및 정렬 로직 (기존 유지) ---
  const sortedVenues = useMemo(() => {
    if (venues.length === 0) return [];
    const cheapest = [...venues].sort((a, b) => (a.price || 0) - (b.price || 0))[0];
    const others = venues.filter(v => v.id !== cheapest.id);
    return [cheapest, ...others];
  }, [venues]);

  const analysis = useMemo(() => {
    if (sortedVenues.length === 0) return null;
    return {
      cheapestId: sortedVenues[0].id,
      recommendedId: sortedVenues[0].id
    };
  }, [sortedVenues]);

  const handleDelete = async (id: string | number) => {
    if ((await showConfirm("이 장소를 플래너에서 제외할까요?"))) {
      // 1. 현재 상태 업데이트
      const updatedVenues = venues.filter(v => v.id !== id);
      setVenues(updatedVenues);

      // 2. 저장소(Storage) 즉시 동기화
      // (useEffect에만 의존하지 않고 명시적으로 저장합니다)
      const storageKey = isLoggedIn ? "stayon_planner_member" : "stayon_planner_guest";

      // if (updatedVenues.length === 0) {
      //   // 모든 리스트가 지워졌다면 키 자체를 제거하거나 빈 배열 저장
      //   if (isLoggedIn) {
      //     localStorage.removeItem("stayon_planner_member");
      //   } else {
      //     sessionStorage.removeItem("stayon_planner_guest");
      //   }
      // } else {
      //   // 남은 데이터가 있다면 업데이트된 리스트 저장
      //   const storage = isLoggedIn ? localStorage : sessionStorage;
      //   storage.setItem(storageKey, JSON.stringify(updatedVenues));
      // }

      if (isLoggedIn) {
        if (updatedVenues.length === 0) localStorage.removeItem("stayon_planner_member");
        else localStorage.setItem("stayon_planner_member", JSON.stringify(updatedVenues));
      } else {
        if (updatedVenues.length === 0) sessionStorage.removeItem("stayon_planner_guest");
        else sessionStorage.setItem("stayon_planner_guest", JSON.stringify(updatedVenues));
      }
    }
  };

  // --- 내보내기 함수 (기존 유지) ---
  const handleDownloadPNG = () => { setIsDownloadMenuOpen(false); exportToPNG(sortedVenues, eventDate, analysis); };
  const handleDownloadExcel = () => { setIsDownloadMenuOpen(false); exportToExcel(sortedVenues, eventDate); };
  const handleDownloadHWP = () => { setIsDownloadMenuOpen(false); exportToHWP(sortedVenues, eventDate); };
  // const handleDownloadPDF = async () => { setIsDownloadMenuOpen(false); await exportToPDF(printRef.current, eventDate); };
  const handleDownloadPDF = async () => { 
  setIsDownloadMenuOpen(false); 
  await exportToPDF(sortedVenues, eventDate, analysis); 
};

  // --- 테이블 데이터 매핑 (기존 유지) ---
  const tableRows = [
    { label: "위치", icon: MapPin, getValue: (v: Venue) => v.address || v.location || "정보 없음" },
    { label: "수용 인원", icon: Users, getValue: (v: Venue) => v.capacity ? `${v.capacity}명` : "정보 없음" },
    { label: "예상 비용", icon: CreditCard, getValue: (v: Venue) => v.priceText || (v.price ? `${v.price.toLocaleString()}원` : "별도 문의"), highlight: true },
    { label: "특징/한줄평", icon: Quote, getValue: (v: Venue) => v.highlight || "스테이온 추천 장소", isItalic: true },
    { label: "음향/악기", icon: Music2, getValue: (v: Venue) => v.features?.audio || (v as any).audio || v.instruments || "별도 문의" },
    {
      label: "식사/취사",
      icon: Coffee,
      getValue: (v: Venue) => {
        const options = Array.isArray(v.mealOption)
          ? v.mealOption.map(opt => opt === 'provided' ? '식사 제공' : '자체 취사').join(", ")
          : (v.mealOption || "");
        const price = v.mealPrice ? `(인당 ${v.mealPrice.toLocaleString()}원)` : "";
        return `${options} ${price}`.trim() || "정보 없음";
      }
    },
    { label: "숙소 구성", icon: FileText, getValue: (v: Venue) => v.features?.accommodation || (v as any).accommodation || "정보 없음" },
  ];

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#191F28] pb-24 font-sans tracking-tight">
      <ScrollRestoration />

      {/* 네비게이션바: 스타일의 초슬림/클린 배경 */}
      <nav className="bg-white/80 backdrop-blur-xl sticky top-0 z-[50] border-b border-[#F2F4F6]">
        <div className="max-w-7xl mx-auto px-4 py-3 md:px-5 md:py-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 md:gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-[#F2F4F6] rounded-full transition-all shrink-0">
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-[#4E5968]" />
            </button>
            <h1 className="text-[15px] md:text-[18px] font-bold tracking-tighter whitespace-nowrap">스마트 플래너</h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-[#F2F4F6] p-1 rounded-full flex items-center">
              <button onClick={() => setViewType('card')} className={`px-2.5 py-1.5 md:px-4 rounded-full text-[12px] md:text-sm font-bold whitespace-nowrap transition-all ${viewType === 'card' ? 'bg-white shadow-sm text-[#3182F6]' : 'text-[#8B95A1]'}`}>카드</button>
              <button onClick={() => setViewType('table')} className={`px-2.5 py-1.5 md:px-4 rounded-full text-[12px] md:text-sm font-bold whitespace-nowrap transition-all ${viewType === 'table' ? 'bg-white shadow-sm text-[#3182F6]' : 'text-[#8B95A1]'}`}>표</button>
            </div>

            <div className="relative" ref={downloadMenuRef}>
              <button
                disabled={sortedVenues.length === 0}
                onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 md:px-4 bg-[#3182F6] text-white rounded-xl font-bold text-[12px] md:text-sm whitespace-nowrap hover:bg-[#1B64DA] transition-all active:scale-95 disabled:bg-[#D1D6DB]"
              >
                내보내기
              </button>
              <AnimatePresence>
                {isDownloadMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 mt-3 w-44 md:w-48 bg-white rounded-2xl shadow-xl border border-[#F2F4F6] p-2 z-[110] origin-top-right">
                    <button onClick={handleDownloadPDF} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F9FAFB] rounded-xl text-[13px] md:text-sm font-semibold text-[#4E5968] border-none"><FileDown className="w-4 h-4 text-rose-500 shrink-0" /> PDF</button>
                    <button onClick={handleDownloadHWP} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F9FAFB] rounded-xl text-[13px] md:text-sm font-semibold text-[#4E5968] border-none"><FileText className="w-4 h-4 text-blue-600 shrink-0" /> 한글(HWP)</button>
                    <button onClick={handleDownloadExcel} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F9FAFB] rounded-xl text-[13px] md:text-sm font-semibold text-[#4E5968] border-none"><FileText className="w-4 h-4 text-emerald-500 shrink-0" /> 엑셀</button>
                    <button onClick={handleDownloadPNG} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F9FAFB] rounded-xl text-[13px] md:text-sm font-semibold text-[#4E5968] border-none"><ImageIcon className="w-4 h-4 text-sky-500 shrink-0" /> 이미지</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-5 md:px-5 md:py-8">

        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-5 md:mb-10 bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-[#E5E8EB] flex items-start md:items-center justify-between gap-3"
            >
              <div className="flex items-start md:items-center gap-3 md:gap-4 min-w-0">
                <div className="bg-[#E8F3FF] p-2.5 md:p-3 rounded-xl md:rounded-2xl shrink-0">
                  <Star className="w-5 h-5 md:w-6 md:h-6 text-[#3182F6]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13px] md:text-[16px] font-bold text-[#191F28] break-keep leading-snug">장소들을 비교하고 보고서를 생성하고 빠르게 편집 해보세요</h3>
                  <p className="text-[12px] md:text-[14px] text-[#8B95A1] break-keep mt-0.5">저장된 장소들의 정보를 한눈에 비교하고, PDF나 엑셀로 깔끔하게 정리된 보고서를 다운로드할 수 있습니다.</p>
                </div>
              </div>
              <button onClick={() => setShowGuide(false)} className="p-2 hover:bg-[#F2F4F6] rounded-full transition-colors shrink-0">
                <X className="w-4 h-4 md:w-5 md:h-5 text-[#8B95A1]" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 날짜 선택 섹션: 더 직관적인 레이아웃 */}
        <div className="mb-10 group">
          {/* <label className="text-[#8B95A1] text-[13px] font-semibold mb-1 block px-1">수련회 일정</label>
          <div onClick={() => setShowCalendar(!showCalendar)} className="inline-flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-70">
            <span className="text-3xl font-bold tracking-tight text-[#191F28]">{eventDate.replace(/-/g, '. ')}</span>
            <div className="w-6 h-6 rounded-full bg-[#E8F3FF] flex items-center justify-center">
              <Plus className="w-4 h-4 text-[#3182F6]" />
            </div>
          </div> */}
          {showCalendar && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="absolute z-50 mt-2 bg-white shadow-xl rounded-2xl p-4 border border-[#F2F4F6]">
              <input type="date" value={eventDate} onChange={(e) => { setEventDate(e.target.value); setShowCalendar(false); }} className="p-2 border-none font-bold text-[#3182F6] bg-[#F2F4F6] rounded-lg focus:outline-none" />
            </motion.div>
          )}
        </div>

        <div ref={contentRef}>
          {sortedVenues.length === 0 ? (
            <div className="py-16 md:py-32 flex flex-col items-center justify-center bg-white rounded-2xl md:rounded-3xl shadow-sm border border-[#F2F4F6]">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-[#F2F4F6] rounded-full flex items-center justify-center mb-4"><Plus className="w-7 h-7 md:w-8 md:h-8 text-[#B0B8C1]" /></div>
              <p className="text-[#8B95A1] font-bold text-[15px] md:text-lg">아직 비교할 장소가 없어요</p>
              <button onClick={() => navigate('/venues')} className="mt-5 md:mt-6 px-6 py-3 bg-[#3182F6] text-white rounded-xl font-bold text-[14px] md:text-[15px] shadow-lg shadow-blue-500/10 active:scale-95 transition-all">장소 찾기</button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewType === 'card' ? (
                <motion.div key="card-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {sortedVenues.map((venue) => (
                    <div key={venue.id} className="bg-white rounded-[20px] md:rounded-[28px] shadow-sm overflow-hidden flex flex-col transition-all border border-[#F2F4F6] hover:shadow-md">

                      {/* 카드 상단 헤더: 요청하신 한 줄 배치 적용 */}
                      <div className="px-4 pt-4 pb-3 md:px-7 md:pt-7 md:pb-4 flex items-center justify-between gap-2 md:gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <h3 className="text-[17px] md:text-[22px] font-bold truncate text-[#191F28]">
                            {venue.venueName || venue.name || "이름 없는 장소"}
                          </h3>
                          {analysis?.recommendedId === venue.id && (
                            <span className="shrink-0 bg-[#E8F3FF] text-[#3182F6] text-[11px] md:text-[12px] font-extrabold px-2.5 md:px-3 py-1 rounded-lg flex items-center gap-1 tracking-tight">
                              최저가 강추
                            </span>
                          )}
                        </div>
                        <button onClick={() => handleDelete(venue.id)} className="shrink-0 p-1.5 md:p-2 text-[#D1D6DB] hover:text-[#FF4545] hover:bg-[#FFF1F1] rounded-full transition-colors">
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>

                      {/* 한줄평 섹션: 더 깔끔한 버블 형태 */}
                      <div className="px-4 py-2 md:px-7 md:py-3">
                        <div className="bg-[#F9FAFB] px-3.5 py-3 md:px-5 md:py-4 rounded-xl md:rounded-2xl border border-[#F2F4F6]">
                          <p className="text-[13px] md:text-[14px] font-medium text-[#4E5968] leading-snug break-keep">
                            {venue.highlight || "스테이온이 엄선하여 추천하는 장소입니다."}
                          </p>
                        </div>
                      </div>

                      {/* 기본 정보 태그 */}
                      <div className="px-4 py-2 md:px-7 md:py-3 flex gap-2">
                        <div className="flex items-center gap-1.5 bg-[#F2F4F6] px-2.5 py-1.5 md:px-3 rounded-lg text-[#6B7684]">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px] md:text-[12px] font-bold">{(venue.address || venue.location || "").split(' ')[0] || "지역정보"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#F2F4F6] px-2.5 py-1.5 md:px-3 rounded-lg text-[#6B7684]">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px] md:text-[12px] font-bold">{venue.capacity || 0}명</span>
                        </div>
                      </div>

                      {/* 상세 기능 목록: 가독성 중심 리스트 */}
                      <div className="px-4 py-3 md:px-7 md:py-4 space-y-3 md:space-y-4 flex-1">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-9 md:h-9 bg-[#F9FAFB] rounded-full flex items-center justify-center shrink-0">
                            <Music2 className="w-[16px] h-[16px] md:w-[18px] md:h-[18px] text-[#B0B8C1]" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] md:text-[10px] text-[#B0B8C1] font-bold block leading-none mb-1">음향/악기</span>
                            <p className="text-[13px] md:text-[14px] font-semibold text-[#4E5968] break-keep">{venue.features?.audio || (venue as any).audio || venue.instruments || "별도 문의"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-9 md:h-9 bg-[#F9FAFB] rounded-full flex items-center justify-center shrink-0">
                            <Coffee className="w-[16px] h-[16px] md:w-[18px] md:h-[18px] text-[#B0B8C1]" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] md:text-[10px] text-[#B0B8C1] font-bold block leading-none mb-1">식사 방식</span>
                            <p className="text-[13px] md:text-[14px] font-semibold text-[#4E5968] break-keep">
                              {venue.mealOption
                                ? `${Array.isArray(venue.mealOption) ? (venue.mealOption.includes('provided') ? '식사 제공' : '자체 취사') : venue.mealOption} ${venue.mealPrice ? `(${venue.mealPrice.toLocaleString()}원)` : ''}`
                                : "정보 없음"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 하단 금액 & 버튼: 시각적 계층 명확화 */}
                      <div className="px-4 pb-4 pt-3 md:px-7 md:pb-7 md:pt-4">
                        <div className="flex items-end justify-between mb-3 md:mb-4 gap-2">
                          <span className="text-[#8B95A1] text-[11px] md:text-[12px] font-bold shrink-0">최종 예상 비용</span>
                          <span className="text-[18px] md:text-[22px] font-extrabold text-[#3182F6] leading-none text-right">
                            {venue.priceText || (venue.price ? `${venue.price.toLocaleString()}원` : "별도 문의")}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate(`/venue/${venue.id}`)}
                          className="w-full py-3 md:py-3.5 bg-[#191F28] text-white rounded-xl md:rounded-2xl font-bold text-[14px] md:text-[15px] flex items-center justify-center gap-1.5 hover:bg-[#2C3441] active:scale-[0.98] transition-all"
                        >  장소 상세 보기 <ExternalLink className="w-4 h-4 opacity-40" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* 추가 버튼 카드 */}
                  <button onClick={() => navigate('/venues')} className="border-2 border-dashed border-[#E5E8EB] rounded-[20px] md:rounded-[28px] flex flex-col items-center justify-center gap-2.5 md:gap-3 text-[#B0B8C1] hover:bg-white hover:border-[#3182F6] hover:text-[#3182F6] transition-all min-h-[140px] md:min-h-[450px] group">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#F2F4F6] flex items-center justify-center group-hover:bg-blue-50 transition-all">
                      <Plus className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <p className="font-bold text-[14px] md:text-[15px]">장소 추가하기</p>
                  </button>
                </motion.div>
              ) : (
                <motion.div key="table-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-[#F2F4F6] overflow-hidden">
                  {/* 비교표는 장소를 나란히 놓고 봐야 해서(구조상 카드처럼 세로로 쌓을 수 없음) 모바일에선
                      좌우 스크롤로 보되, 첫 열(항목명)만 sticky로 고정해서 스크롤해도 뭘 보고 있는지 알 수 있게 했다. */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#F9FAFB]">
                          <th className="sticky left-0 z-10 bg-[#F9FAFB] p-3 md:p-6 text-left text-[#B0B8C1] text-[10px] md:text-[11px] font-bold uppercase tracking-wider min-w-[100px] md:min-w-[160px] border-b border-r md:border-r-0 border-[#F2F4F6]">항목</th>
                          {sortedVenues.map(v => (
                            <th key={v.id} className="p-3 md:p-6 text-left min-w-[190px] md:min-w-[280px] border-l border-[#F2F4F6] border-b border-[#F2F4F6]">
                              <div className="flex flex-col gap-1.5">
                                {analysis?.recommendedId === v.id && (
                                  <span className="w-fit shrink-0 bg-[#E8F3FF] text-[#3182F6] text-[10px] md:text-[12px] font-extrabold px-2.5 md:px-3 py-1 rounded-lg flex items-center gap-1 tracking-tight mb-0.5">
                                    최저가 강추
                                  </span>
                                )}
                                <p className="text-[14px] md:text-lg font-bold text-[#191F28] break-keep">{v.venueName || v.name}</p>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row, idx) => (
                          <tr key={idx} className="border-b last:border-none border-[#F9FAFB] hover:bg-[#F9FAFB]/50 transition-colors">
                            <td className="sticky left-0 z-10 bg-white p-3 md:p-6 font-semibold text-[#4E5968] flex items-center gap-2 md:gap-3 text-[12px] md:text-[14px] border-r md:border-r-0 border-[#F2F4F6]">
                              <row.icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#B0B8C1] shrink-0" />
                              {row.label}
                            </td>
                            {sortedVenues.map(v => (
                              <td key={v.id} className={`p-3 md:p-6 border-l border-[#F2F4F6] break-keep ${row.highlight ? 'text-[#3182F6] font-bold text-[15px] md:text-lg' : 'text-[#4E5968] font-medium text-[12px] md:text-[14px]'} ${row.isItalic ? 'italic' : ''}`}>
                                {row.getValue(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* PDF 레포트 (기존 유지) */}
      <div className="fixed -left-[9999px] top-0">
        <div ref={printRef} className="w-[210mm] min-h-[297mm] bg-white p-[20mm] text-black">
          <h1 style={{ textAlign: 'center', fontSize: '24pt', fontWeight: 'bold', marginBottom: '40px' }}>수련회 장소 선정 비교 보고서</h1>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th className="border border-gray-300 p-4 text-center">항목</th>
                {sortedVenues.map(v => <th key={v.id} className="border border-gray-300 p-4 text-center">{v.venueName || v.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 p-4 font-bold text-center bg-gray-50">{row.label}</td>
                  {sortedVenues.map(v => <td key={v.id} className="border border-gray-300 p-4 text-center">{row.getValue(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
