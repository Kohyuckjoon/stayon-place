import { Header } from "../components/Header";
import {
  Search, Shield, CheckCircle, Heart, TrendingDown,
  LayoutGrid, FileText, Sparkles, Lock, BookOpen, Coffee, Utensils,
  ChevronRight, AlertCircle, ShieldCheck, Umbrella, Zap, Star, MapPin,
  Users, Check, Calculator, BarChart3, Home as HomeIcon, Bell, FileEdit, Trash2, Plus, CreditCard, PlusCircle, CalendarDays, CheckCircle2, Calendar, Mic2, Play
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ScrollRestoration } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MainBanner } from "../components/MainBanner";
import { Helmet } from 'react-helmet-async';

const bannerData = [
  // {
  //   "id": 1,
  //   "title": "STAYON 유튜브 출연! 📺",
  //   "desc": "사역자들을 위한 스테이온 활용 가이드와 생생한 소개 영상을 확인해보세요.",
  //   "tag": "MEDIA",
  //   "bgColor": "bg-gradient-to-br from-[#FF0000] via-[#D31919] to-[#990000]",
  //   "textColor": "text-white",
  //   "icon": <Play className="w-32 h-32 text-white/10 absolute -right-4 -bottom-4 rotate-12 fill-white/5 stroke-[1.5]" />
  // },
  {
    "id": 2,
    "title": "카드 결제 정식 오픈 🎉",
    "desc": "이제 모든 장소를 신용카드로 안전하고 편리하게 예약할 수 있습니다.",
    "tag": "오픈",
    "bgColor": "bg-gradient-to-br from-[#3182F6] via-[#2370E0] to-[#1253B3]",
    "textColor": "text-white",
    "icon": <CreditCard className="w-32 h-32 text-white/10 absolute -right-4 -bottom-4 rotate-12 stroke-[1.5]" />
  },
  {
    id: 3,
    title: "수련회 장소 등록 이벤트 🎁",
    desc: "수련회 장소로 등록 완료시, 전원 소정의 선물을 드립니다.",
    tag: "EVENT",
    bgColor: "bg-gradient-to-br from-[#FF5A5F] via-[#E14B50] to-[#C83C41]",
    textColor: "text-white",
    "icon": <Sparkles className="w-32 h-32 text-white/10 absolute -right-4 -bottom-4 -rotate-12 stroke-[1.5]" />
  },
  {
    id: 4,
    title: "외부 사역 단체 페이지 오픈! 🎤",
    desc: "찬양팀, 음향·조명, 찬양사역자, 세션까지. 스테이온에서 외부 사역팀을 무료로 찾고 섭외해보세요.",
    tag: "NEW",
    bgColor: "bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#5B21B6]",
    textColor: "text-white",
    icon: <Mic2 className="w-32 h-32 text-white/10 absolute -right-4 -bottom-4 rotate-12 stroke-[1.5]" />
  },
];
const circleMenus = [
  { name: "장소찾기", icon: <Search className="w-6 h-6" />, color: "bg-blue-50 text-blue-600", link: "/venues" },
  { name: "최저가비교", icon: <Sparkles className="w-6 h-6" />, color: "bg-purple-50 text-purple-600", link: "/planner" },
  { name: "일정 짜기", icon: <Calendar className="w-6 h-6" />, color: "bg-orange-50 text-orange-600", link: "/smart-planner" },
  // { name: "예산플래너", icon: <Calculator className="w-6 h-6" />, color: "bg-emerald-50 text-emerald-600", link: "/budget" },

  { name: "보험신청", icon: <ShieldCheck className="w-6 h-6" />, color: "bg-red-50 text-red-600", link: "#" },
  // { name: "커핏(Coffit)", icon: <Coffee className="w-6 h-6" />, color: "bg-amber-50 text-amber-900", link: "#" },
  // { name: "전체보기", icon: <LayoutGrid className="w-6 h-6" />, color: "bg-gray-50 text-gray-600", link: "#" },
  { name: "프로그램", icon: <CalendarDays className="w-6 h-6" />, color: "bg-teal-50 text-teal-600", link: "/programs" },
  { name: "장소등록", icon: <HomeIcon className="w-6 h-6" />, color: "bg-indigo-50 text-indigo-600", link: "/register" },
  { name: "온라인주보", icon: <BookOpen className="w-6 h-6" />, color: "bg-orange-50 text-orange-600", link: "https://bulletin.stayon-platform.com/" },
  { name: "외부 사역팀 찾기", icon: <Mic2 className="w-6 h-6" />, color: "bg-pink-50 text-pink-600", link: "/teams" },
];

const familyServices = [
  {
    id: "bulletin",
    title: "온라인(모바일) 주보",
    description: "종이 주보를 넘어선 우리 교회만의 디지털 소통 창구. 스테이온에서 지금 바로 시작해보세요.",
    tag: "런칭 완료",
    tagColor: "bg-blue-100 text-blue-600",
    icon: <BookOpen className="w-10 h-10" />,
    isReady: true,
    link: "https://bulletin.stayon-platform.com/"
  },
  {
    id: "teams",
    title: "외부 사역 단체 페이지 오픈",
    description: "찬양팀, 음향·조명, 찬양사역자, 세션까지. 스테이온에서 외부 사역팀을 무료로 찾고 섭외해보세요.",
    tag: "런칭 완료",
    tagColor: "bg-blue-100 text-blue-600",
    icon: <Mic2 className="w-10 h-10" />,
    isReady: true,
    link: "/teams"
  },
  // {
  //   id: "coffit",
  //   title: "Coffit (커핏)",
  //   description: "교회 카페와 성도들을 잇는 커피 커뮤니티 플랫폼. 로스팅 정보부터 원두 구매까지.",
  //   tag: "준비 중",
  //   tagColor: "bg-slate-100 text-slate-500",
  //   icon: <Coffee className="w-10 h-10" />,
  //   isReady: false,
  //   link: "#"
  // },
  // {
  //   id: "meal",
  //   title: "심방 식탁",
  //   description: "성도들과의 소중한 식사 교제, 장소 예약부터 메뉴 선정까지 한 번에 관리하세요.",
  //   tag: "준비 중",
  //   tagColor: "bg-slate-100 text-slate-500",
  //   icon: <Utensils className="w-10 h-10" />,
  //   isReady: false,
  //   link: "#"
  // },
  {
    id: "coming-soon",
    title: "새로운 서비스",
    description: "더 나은 사역을 위해 새로운 서비스를 준비하고 있어요.",
    tag: "준비 중",
    tagColor: "bg-slate-100 text-slate-500",
    icon: <Sparkles className="w-10 h-10" />,
    isReady: false,
    link: "#"
  },
];

// "다른 서비스도 이용해보세요" 모바일 전용 티커 — /teams 화면의 TeamTicker와 동일한 구조
// (목록을 두 번 이어붙여 -50%만큼 이동시키는 방식의 무한 가로 마퀴)를 그대로 가져오되,
// familyServices엔 사진이 없어서 카드 안쪽만 아이콘 중심으로 새로 구성했다. PC는 기존
// 3D 코스플로우 슬라이더를 그대로 쓰고, 모바일에서만 이 티커로 바뀐다.
function FamilyServiceTicker({ services, navigate }: { services: typeof familyServices; navigate: (path: string) => void }) {
  const [isPaused, setIsPaused] = useState(false);
  if (services.length < 2) return null;
  const MIN_TRACK_ITEMS = 10;
  const repeatCount = Math.max(1, Math.ceil(MIN_TRACK_ITEMS / services.length));
  const baseList = Array.from({ length: repeatCount }, () => services).flat();
  const items = [...baseList, ...baseList];
  const duration = baseList.length * 4;

  const handleClick = (service: (typeof familyServices)[number]) => {
    if (!service.isReady) return;
    if (service.link.startsWith("http://") || service.link.startsWith("https://")) {
      window.open(service.link, "_blank");
    } else {
      navigate(service.link);
    }
  };

  return (
    // 티커 전용 배경 패널. 이게 없으면 섹션 전체 배경(bg-slate-50/50) 위에 카드가
    // 바로 얹혀서 카드 그림자만으로 입체감을 내야 했는데, 카드보다 위아래로 여백이
    // 확실히 넓은 진한 회색 패널을 따로 깔아서 "박스 여러 개가 트레이 위에 놓인" 느낌을 낸다.
    <div className="relative rounded-[28px] bg-[#F2F4F6] py-6 overflow-hidden">
      <div
        className="relative w-full overflow-hidden"
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        <style>{`
          @keyframes family-ticker-scroll-x {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
        <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-[#F2F4F6] to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-[#F2F4F6] to-transparent z-10 pointer-events-none" />
        <div
          className="flex items-stretch gap-3 w-max px-4"
          style={{
            animation: `family-ticker-scroll-x ${duration}s linear infinite`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
        >
          {items.map((service, i) => (
            <div
              key={`${service.id}-${i}`}
              onClick={() => handleClick(service)}
              className={`relative w-[176px] p-4 rounded-[20px] shrink-0 bg-white border border-slate-200/80 shadow-[0_6px_18px_rgba(15,23,42,0.09)] ${service.isReady ? "cursor-pointer active:scale-95 active:shadow-[0_2px_8px_rgba(15,23,42,0.08)]" : "opacity-90"} transition-all`}
            >
              {!service.isReady && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-sm">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              )}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 bg-blue-50 text-blue-600 ring-1 ring-blue-100 [&_svg]:w-5 [&_svg]:h-5">
                {service.icon}
              </div>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black mb-1.5 ${service.tagColor}`}>
                {service.tag}
              </span>
              <p className="text-[14px] font-black text-gray-900 leading-snug break-keep line-clamp-2 mb-2.5">
                {service.title}
              </p>
              <div className={`flex items-center gap-0.5 text-[11px] font-black ${service.isReady ? "text-blue-600" : "text-slate-300"}`}>
                {service.isReady ? "바로가기" : "준비 중"} <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [extraSliderIndex, setExtraSliderIndex] = useState(0);

  // 슬라이더를 위한 현재 인덱스 상태 추가
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);

  // StayOn 섹션의 자동 하이라이트를 위한 상태
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFamilyHovered, setIsFamilyHovered] = useState(false);
  const insuranceRef = useRef<HTMLDivElement>(null);

  // 3초마다 다음 카드를 강조 (마우스 호버 시 정지)
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveFeatureIndex((prev) => (prev + 1) % 4);
      setCurrentNoticeIndex((prev) => (prev + 1) % bannerData.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isHovered, bannerData.length]);

  // "다른 서비스도 이용해보세요" 카드도 5초마다 자동 슬라이드 (마우스 호버 시 정지)
  useEffect(() => {
    if (isFamilyHovered) return;
    const interval = setInterval(() => {
      setExtraSliderIndex((prev) => (prev + 1) % familyServices.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isFamilyHovered]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/venues?search=${searchQuery}`);
  };

  const scrollToInsurance = () => {
    console.log("보험 섹션으로 이동 시도..."); // 작동 확인용 콘솔
    if (insuranceRef.current) {
      insuranceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    } else {
      console.error("insuranceRef가 연결되지 않았습니다.");
    }
  };

  const features = [
    {
      title: "상세한 시설 정보",
      desc: "강단 크기, 음향 장비 사양 등 사역자가 꼭 필요한 정보를 규격화했습니다.",
      icon: <Search className="w-8 h-8 text-emerald-600" />,
      iconBg: "bg-emerald-50",
      linkText: "장소 둘러보기 →",
      link: "/venues",
      accent: "text-emerald-600"
    },
    {
      title: "자동 비교 분석",
      desc: "여러 후보지를 한 눈에 비교 하고, 클릭 한번으로 내부 보고용 문서를 완성하세요.",
      icon: <BarChart3 className="w-8 h-8 text-orange-500" />,
      iconBg: "bg-orange-50",
      linkText: "플래너 활용법 →",
      link: "/planner",
      accent: "text-orange-600"
    },
    {
      title: "프로그램 공유",
      desc: "교회에서 진행했던 최고의 레크리에이션이나 프로그램 기획안을 공유하고, 다른 교회의 소중한 사역 노하우도 함께 탐색해 보세요.",
      icon: <PlusCircle className="w-8 h-8 text-blue-600" />, // 상황에 따라 Plus, Lightbulb, Sparkles 등으로 변경 가능
      iconBg: "bg-blue-100/50",
      linkText: "프로그램 등록하기 →",
      link: "/programs",
      accent: "text-blue-700",
      isWide: true
    },
    {
      title: "수련회 예산 플래너",
      desc: "인원과 일정에 따른 복잡한 수련회 예산 산출, 이젠 모두 자동 계산으로 오차 없이 관리하세요.",
      icon: <Calculator className="w-8 h-8 text-purple-600" />,
      iconBg: "bg-purple-50",
      linkText: "예산 세우기 →",
      link: "/budget",
      accent: "text-purple-600"
    },
    {
      title: "이단 방지 검증",
      desc: "교단 소속 증명서 제출과 블랙리스트 연동으로 안전한 장소만 제공합니다.",
      icon: <ShieldCheck className="w-8 h-8 text-blue-600" />,
      iconBg: "bg-blue-50",
      linkText: "검증 시스템 보기 →",
      link: "/about",
      accent: "text-blue-600"
    },
    {
      title: "투명한 수수료",
      desc: "에스크로 기반 안전 결제와 명확한 환불 규정으로 교회 예산을 보호합니다.",
      icon: <Lock className="w-8 h-8 text-indigo-600" />,
      iconBg: "bg-indigo-50",
      linkText: "환불 규정 보기 →",
      isButton: true,
      accent: "text-indigo-600",
      onClick: () => navigate('/safety'),
    },
    {
      title: "원 클릭 단체 보험 가입",
      desc: "번거로운 명단 입력 없이 단체 여행자 보험 가입까지, 이동 중 발생할 안전 사고에 대비하세요.",
      icon: <Umbrella className="w-8 h-8 text-red-500" />,
      iconBg: "bg-red-50",
      linkText: "보험 가입 안내 →",
      isButton: true,
      onClick: () => scrollToInsurance(),
      accent: "text-red-600"
    },
    {
      title: "우리 교회 등록",
      desc: "비어 있는 수양관이나 예배당을 등록해 사역을 돕고, 예약부터 정산까지 STAY ON으로 간편하게 관리하세요.",
      icon: <HomeIcon className="w-8 h-8 text-blue-600" />,
      iconBg: "bg-blue-100/50",
      linkText: "장소 등록 문의 →",
      link: "/register",
      accent: "text-blue-700",
      isWide: true // 와이드 레이아웃 구분을 위한 플래그
    },

  ];

  return (
    <div className="bg-gradient-to-b from-blue-50 to-white font-sans selection:bg-blue-100 selection:text-blue-600">
      <ScrollRestoration />

      <Helmet>
        <title>교회 수련회 장소 찾기 및 예약은 스테이온 (STAYON)</title>
        <meta name="description" content="전국 120여 곳의 검증된 교회 수련회 장소와 수양관을 인원, 시설, 교단별로 쉽고 편리하게 비교하고 즉시 예약하세요." />
        <meta property="og:title" content="교회 수련회 장소 찾기 및 예약은 스테이온 (STAYON)" />
        <meta property="og:description" content="전국 120여 곳의 검증된 교회 수련회 장소와 수양관을 인원, 시설, 교단별로 쉽고 편리하게 비교하고 즉시 예약하세요." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative pt-2 pb-6 md:pt-1 md:pb-8 overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className=" bg-white font-sans">

            <ScrollRestoration />

            {/* [Section 1] Naver Style Top Slider Banner */}
            {/* <section className="pt-6 pb-8 md:pt-8 md:pb-10">
              <div className="max-w-[1280px] mx-auto px-4">

                <div 
                  onClick={() => navigate(`/notice/${bannerData[currentNoticeIndex].id}`)}
                  className="relative h-[160px] md:h-[190px] overflow-hidden rounded-[28px] shadow-[0_12px_32px_rgba(0,0,0,0.04)] cursor-pointer transition-all duration-400 hover:shadow-[0_16px_40px_rgba(49,130,246,0.12)] active:scale-[0.995]"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentNoticeIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
                      className={`absolute inset-0 ${bannerData[currentNoticeIndex % bannerData.length].bgColor} px-8 md:px-14 flex items-center justify-between`}
                    >
                      <div className="space-y-1.5 md:space-y-2 z-10 max-w-[65%]">
                        <span className="inline-flex px-2.5 py-0.5 bg-white/15 rounded-full text-[11px] font-bold text-white tracking-wide backdrop-blur-sm">
                          {bannerData[currentNoticeIndex % bannerData.length].tag}
                        </span>
                        <h2 className="text-xl md:text-2xl lg:text-[27px] font-black text-white leading-tight tracking-tight break-keep">
                          {bannerData[currentNoticeIndex % bannerData.length].title}
                        </h2>
                        <p className="text-white/85 text-xs md:text-[14px] font-medium tracking-tight break-keep">
                          {bannerData[currentNoticeIndex % bannerData.length].desc}
                        </p>
                      </div>

                      <div className="relative w-[30%] h-full hidden sm:flex items-center justify-end pr-4 overflow-hidden select-none pointer-events-none">
                        {currentNoticeIndex % bannerData.length === 0 ? (
                          <div className="relative w-40 h-full flex items-center justify-center">
                            <div className="w-[110px] h-[70px] bg-gradient-to-tr from-white/20 to-white/5 rounded-xl border border-white/20 rotate-[-12deg] translate-x-4 shadow-lg backdrop-blur-sm flex flex-col justify-between p-2.5">
                              <div className="w-5 h-4 bg-yellow-400/80 rounded-sm" />
                              <div className="w-8 h-2 bg-white/40 rounded-full" />
                            </div>
                            <div className="absolute w-[110px] h-[70px] bg-gradient-to-tr from-white/30 to-white/10 rounded-xl border border-white/30 rotate-[8deg] -translate-x-2 shadow-2xl backdrop-blur-md flex flex-col justify-between p-2.5">
                              <div className="flex justify-between items-start">
                                <div className="w-5 h-4 bg-amber-300 rounded-sm" />
                                <div className="w-4 h-4 rounded-full bg-white/20" />
                              </div>
                              <div className="w-12 h-2 bg-white/60 rounded-full" />
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-40 h-full flex items-center justify-center">
                            <div className="w-[76px] h-[76px] bg-gradient-to-br from-yellow-300 to-amber-400 rounded-2xl shadow-xl rotate-[15px] flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                              <Sparkles className="w-10 h-10 text-white stroke-[2]" />
                            </div>
                            <div className="absolute -top-2 -right-1 w-4 h-4 bg-white rounded-full blur-[10px] opacity-60" />
                          </div>
                        )}
                        {bannerData[currentNoticeIndex % bannerData.length].icon}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <div className="absolute bottom-4 right-6 flex items-center gap-1.5 bg-black/15 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-bold z-20 select-none">
                    <span className="opacity-90">{(currentNoticeIndex % bannerData.length) + 1}</span>
                    <span className="text-white/30 text-[9px]">/</span>
                    <span className="text-white/50">{bannerData.length}</span>
                    <div className="w-[1px] h-2.5 bg-white/20 mx-0.5" />
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentNoticeIndex(prev => prev + 1); }}
                      className="p-0.5 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            </section> */}

            <section className="pt-6 pb-8 md:pt-8 md:pb-10">
              <div className="max-w-[1280px] mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                  {/* 좌측: 배너 슬라이더 영역 (높이를 h-[220px] md:h-[250px]로 대폭 확장) */}
                  <div className="lg:col-span-8 relative h-[220px] md:h-[250px] overflow-hidden rounded-[32px] shadow-[0_16px_40px_rgba(0,0,0,0.03)] border border-slate-100 cursor-pointer transition-all duration-400 active:scale-[0.995]"
                    // onClick={() => navigate(`/notice/${bannerData[currentNoticeIndex].id}`)}
                    onClick={() => {
                      const index = currentNoticeIndex % bannerData.length + 1;
                      // if (index === 0) {
                      //   window.open("https://youtu.be/VqkVecqG_Sg?si=V-cyya7xSkRK-Fp1", "_blank", "noopener,noreferrer");
                      // } else 
                        
                        if (index === 1) {
                        navigate("/notice/1");
                      } else if (index === 2) {
                        navigate("/notice/2");
                      } else if (index === 3) {
                        navigate("/teams");
                      }
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentNoticeIndex}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
                        className={`absolute inset-0 ${bannerData[currentNoticeIndex % bannerData.length].bgColor} px-5 md:px-9 flex items-center justify-between`}
                      >
                        {/* 텍스트 디테일 정돈 */}
                        <div className="space-y-2 md:space-y-3 z-10 max-w-[60%] text-left">
                          <span className="inline-flex px-3 py-1 bg-white/15 rounded-full text-[11px] md:text-xs font-bold text-white tracking-wide backdrop-blur-sm">
                            {bannerData[currentNoticeIndex % bannerData.length].tag}
                          </span>
                          <h2 className="text-2xl md:text-3xl lg:text-[29px] font-black text-white leading-tight tracking-tight break-keep">
                            {bannerData[currentNoticeIndex % bannerData.length].title}
                          </h2>
                          <p className="text-white/85 text-xs md:text-[15px] font-medium tracking-tight break-keep leading-relaxed">
                            {bannerData[currentNoticeIndex % bannerData.length].desc}
                          </p>
                        </div>

                        {/* 우측 그래픽/썸네일 일러스트 반응형 영역 */}
                        <div className="relative w-[40%] h-full hidden sm:flex items-center justify-end overflow-hidden select-none pointer-events-none">
                          {(() => {
                            const index = currentNoticeIndex % bannerData.length + 1;

                            // 1. 유튜브 슬라이드 (index 0)
                            // if (index === 0) {
                            //   return (
                            //     <div className="relative w-full h-full flex items-center justify-end transform rotate-[-6deg] transition-transform duration-500 hover:rotate-0">
                            //       <div className="w-[270px] h-[155px] bg-slate-950 rounded-2xl p-1 shadow-[0_25px_60px_rgba(0,0,0,0.5)] border border-white/25 overflow-hidden relative">
                            //         <div
                            //           className="w-full h-full bg-cover bg-center rounded-xl relative flex flex-col justify-between"
                            //           style={{ backgroundImage: `url('/youtube_cover.png')`, backgroundColor: '#111' }}
                            //         >
                            //           <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 rounded-xl z-10" />
                            //           <div className="absolute inset-0 flex items-center justify-center z-20">
                            //             <div className="w-14 h-14 bg-black/25 backdrop-blur-md rounded-full flex items-center justify-center p-1.5 transition-transform duration-300 hover:scale-115">
                            //               <div className="w-full h-full bg-red-600 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(220,38,38,0.4)] border border-white/20">
                            //                 <Play className="w-6 h-6 text-white fill-white translate-x-[2px]" />
                            //               </div>
                            //             </div>
                            //           </div>
                            //           <div className="absolute bottom-2 right-2 bg-black/85 px-1.5 py-0.5 rounded text-[10px] text-white font-mono z-20 tracking-wider">
                            //             12:40
                            //           </div>
                            //         </div>
                            //       </div>
                            //     </div>
                            //   );
                            // }
                            // 🔴 2. 신용카드 오픈 슬라이드 (index 1) - 요청하신 코드로 구현된 카드 뭉치
                            // else 
                              if (index === 1) {
                              return (
                                <div className="relative w-full h-full flex items-center justify-end transform transition-transform duration-500 hover:scale-105">
                                  <div className="relative w-[240px] h-[150px] mr-4">
                                    {/* 1번 카드: 신한카드 (맨 뒤) */}
                                    <div className="absolute top-2 right-16 w-[140px] h-[85px] bg-gradient-to-br from-[#0046FF] to-[#0033CC] rounded-xl shadow-lg border border-white/20 transform -rotate-[15deg] flex flex-col justify-between p-3 opacity-90 backdrop-blur-sm">
                                      <span className="text-white/90 text-[11px] font-black tracking-tight">신한카드</span>
                                      <div className="w-6 h-4 bg-white/30 rounded-[3px]" />
                                    </div>
                                    {/* 2번 카드: 현대카드 */}
                                    <div className="absolute top-5 right-10 w-[140px] h-[85px] bg-slate-900 rounded-xl shadow-xl border border-slate-700 transform -rotate-[5deg] flex flex-col justify-between p-3 opacity-95">
                                      <span className="text-white text-[11px] font-black tracking-widest">HYUNDAI</span>
                                      <div className="w-6 h-4 bg-slate-400 rounded-[3px]" />
                                    </div>
                                    {/* 3번 카드: 삼성카드 */}
                                    <div className="absolute top-9 right-4 w-[140px] h-[85px] bg-[#034EA2] rounded-xl shadow-2xl border border-blue-400 transform rotate-[5deg] flex flex-col justify-between p-3 opacity-95">
                                      <span className="text-white text-[11px] font-black italic tracking-tighter">SAMSUNG</span>
                                      <div className="w-6 h-4 bg-blue-300/80 rounded-[3px]" />
                                    </div>
                                    {/* 4번 카드: KB국민카드 (맨 앞) */}
                                    <div className="absolute top-12 -right-2 w-[140px] h-[85px] bg-[#FFCC00] rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-yellow-200 transform rotate-[15deg] flex flex-col justify-between p-3">
                                      <span className="text-[#5B5A5A] text-[12px] font-black tracking-tighter">KB국민카드</span>
                                      <div className="w-6 h-4 bg-[#D1B875] rounded-[3px]" />
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            // 3. 장소 등록 이벤트 슬라이드 (index 2)
                            else if (index === 2) {
                              return (
                                <div className="relative w-full h-full flex items-center justify-end select-none pointer-events-none pr-3 md:pr-6">
                                  <div className="relative w-[145px] md:w-[160px] h-[180px] md:h-[200px] flex flex-col items-center justify-center transform transition-all duration-500 hover:scale-105">
                                    <img
                                      src="/register_event.png"
                                      alt="Coffee Reward"
                                      className="w-full h-auto object-contain drop-shadow-[0_20px_32px_rgba(0,0,0,0.3)]"
                                    />
                                  </div>
                                </div>
                              );
                            }
                            // 4. 외부 사역팀 페이지 오픈 슬라이드 (index 3)
                            else {
                              return (
                                <div className="relative w-full h-full flex items-center justify-end select-none pointer-events-none pr-3 md:pr-6">
                                  <div className="relative w-[160px] h-[160px] flex items-center justify-center transform transition-transform duration-500 hover:scale-105">
                                    <div className="absolute w-full h-full bg-white/10 rounded-[2.5rem] rotate-12 backdrop-blur-sm border border-white/20" />
                                    <div className="absolute w-[120px] h-[120px] bg-white/20 rounded-[2rem] -rotate-6 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-2xl">
                                      <Mic2 className="w-14 h-14 text-white drop-shadow-lg" strokeWidth={1.8} />
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* 슬라이드 넘버 인디케이터 수치바 */}
                    <div className="absolute bottom-5 right-6 flex items-center gap-1.5 bg-black/15 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[11px] font-bold z-20 select-none">
                      <span className="opacity-90">{(currentNoticeIndex % bannerData.length) + 1}</span>
                      <span className="text-white/30 text-[9px]">/</span>
                      <span className="text-white/50">{bannerData.length}</span>
                      <div className="w-[1px] h-2.5 bg-white/20 mx-0.5" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentNoticeIndex(prev => (prev + 1) % bannerData.length); }}
                        className="p-0.5 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* 우측: KB Pay 스타일 로그인/시작하기 공간 유도 유닛 (높이 자동 동기화 매칭) */}
                  <div className="lg:col-span-4 bg-[#F9FAFB] border border-slate-100 rounded-[32px] p-7 flex flex-col justify-between items-start text-left gap-5 lg:gap-0 shadow-[0_16px_40px_rgba(0,0,0,0.01)]">
                    <div className="space-y-1.5 mt-2">
                      <p className="text-blue-600 text-xs font-black tracking-tight uppercase">Smart Platform</p>
                      <h3 className="text-xl font-black text-[#191F28] leading-tight break-keep">
                        STAYON 플랫폼에서<br />안전하고 빠르게 시작하세요.
                      </h3>
                    </div>

                    <button
                      onClick={() => navigate('/venues')}
                      className="w-full mb-2 py-4 bg-[#3182F6] hover:bg-[#2370E0] text-white font-bold text-[15px] rounded-2xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1 active:scale-[0.99]"
                    >
                      지금 시작하기
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                </div>
              </div>
            </section>

            <section className="pb-10">
              <div className="max-w-[1280px] mx-auto px-4">
                <div className="flex flex-wrap justify-between gap-y-6 md:px-4">
                  {circleMenus.map((menu, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col items-center gap-3 w-[25%] md:w-auto cursor-pointer group"
                      // onClick={() => navigate(menu.link)}
                      onClick={() => {
                        if (menu.link === "#") return;

                        if (menu.link.startsWith("http://") || menu.link.startsWith("https://")) {
                          // 1. 온라인주보 같은 외부 URL은 새 탭으로 열기
                          window.open(menu.link, "_blank", "noopener,noreferrer");

                          // 만약 새 탭이 아니라 현재 화면에서 그대로 이동하길 원하시면 아래 코드를 사용하세요.
                          // window.location.href = menu.link;
                        } else {
                          // 2. 기존 내부 페이지(/venues, /planner 등) 라우팅 유지
                          navigate(menu.link);
                        }
                      }}
                    >

                      <div className={`w-14 h-14 md:w-16 md:h-16 ${menu.color} rounded-full flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-1`}>
                        {menu.icon}
                      </div>
                      <span className="text-[13px] md:text-[15px] font-bold text-[#333D4B]">{menu.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* <div className="bg-[#F9FAFB] rounded-[3.5rem] p-8 md:p-20 border border-gray-100 shadow-sm relative overflow-hidden"> */}
          {/* <div className="bg-[#F9FAFB] rounded-[3.5rem] p-8 md:p-20 border border-gray-100 shadow-sm relative overflow-hidden mx-4 md:mx-auto max-w-7xl"> */}

          <div className="px-4 md:px-5">
            <div className="bg-[#F9FAFB] rounded-[1.75rem] md:rounded-[3rem] p-5 md:p-12 border border-gray-100 shadow-sm relative overflow-hidden my-5 md:my-8 md:mx-auto max-w-7xl md:px-10">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-50/50 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none"></div>

              <div className="grid md:grid-cols-12 gap-10 items-center relative z-10">
                {/* 왼쪽 콘텐츠 Area */}
                {/* <div className="md:col-span-7">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-blue-600 rounded-lg mb-8 shadow-sm border border-blue-50">
                  <Shield className="w-4 h-4 fill-blue-600/10" />
                  <span className="text-xs font-black tracking-tight">이단 걱정 없는 안전한 장소</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#191F28] mb-8 leading-[1.1] tracking-tight break-keep">
                  수련회 장소 찾기,<br />
                  <span className="text-blue-600">이번엔 어디로 가지?</span>
                </h1>
                <p className="text-xl md:text-2xl text-[#4E5968] mb-12 leading-relaxed break-keep font-medium opacity-90">
                  스테이온이 직접 검증한 <b>120여 곳의 장소</b>를
                  각 상황에 맞는 조건으로 장소를 지금 바로 비교해 보세요.
                </p>
                <div className="relative group max-w-lg">
                  <form onSubmit={handleSearch} className="relative z-10">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="어떤 지역, 어떤 장소를 찾으시나요?"
                      className="w-full px-8 py-6 rounded-[2rem] bg-white border-none focus:ring-4 focus:ring-blue-500/10 text-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all placeholder:text-[#ADB5BD] font-bold text-[#191F28]"
                      // className="w-full px-6 md:px-8 py-5 md:py-6 rounded-[2rem] bg-white border-none focus:ring-4 focus:ring-blue-500/10 text-lg md:text-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all placeholder:text-[#ADB5BD] font-bold text-[#191F28] truncate"
                    />
                    <button
                      type="submit"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-4 rounded-[1.5rem] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      <Search className="w-7 h-7 stroke-[3px]" />
                    </button>
                  </form>
                </div>
              </div> */}

                <div className="md:col-span-7">
                  {/* [Badge] 그대로 유지 */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 bg-white text-blue-600 rounded-lg mb-3 md:mb-5 shadow-sm border border-blue-50">
                    <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 fill-blue-600/10" />
                    <span className="text-[11px] md:text-xs font-black tracking-tight">이단 걱정 없는 안전한 장소</span>
                  </div>

                  {/* [Headline] 조금 더 정돈된 느낌으로 */}
                  <h1 className="text-[26px] md:text-5xl lg:text-6xl font-black text-[#191F28] mb-2.5 md:mb-5 leading-[1.2] md:leading-[1.1] tracking-tight break-keep">
                    수련회 장소 찾기,<br />
                    <span className="text-blue-600">이번엔 어디로 가지?</span>
                  </h1>

                  {/* [Description] */}
                  <p className="text-[13px] md:text-xl text-[#4E5968] mb-4 md:mb-7 leading-relaxed break-keep font-medium opacity-90 max-w-lg">
                    스테이온이 직접 검증한 <b>120여 곳의 장소</b>를
                    교단, 인원, 시설 조건별로 한눈에 비교해 보세요.
                  </p>

                  {/* [Action Card] 검색창 대신 들어갈 직관적인 버튼 */}
                  <div className="max-w-md flex flex-col gap-2.5 md:gap-4">
                    <button
                      onClick={() => navigate('/venues')}
                      className="w-full group flex items-center justify-between p-3.5 md:p-5 bg-[#3182f6] hover:bg-[#2c75e0] rounded-[1.25rem] md:rounded-[2rem] shadow-[0_15px_30px_rgba(49,130,246,0.3)] transition-all border border-transparent active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white/20 rounded-2xl md:rounded-3xl flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
                          <Search className="w-5 h-5 md:w-7 md:h-7 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="text-[14px] md:text-[17px] font-black text-white">수련회 장소 보기</div>
                          <div className="text-[11px] md:text-[13px] font-medium text-white/80 mt-0.5">지역/인원별 맞춤 장소 리스트</div>
                        </div>
                      </div>
                      {/* [수정: 버튼 내부 시각적 중심을 위해 아이콘 컨테이너 색상 유지] */}
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors shrink-0">
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white" />
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/booking-guide')}
                      // [수정: 토스 스타일의 깔끔한 흰색 카드 디자인 적용, 가독성을 위해 border와 shadow 최적화]
                      className="w-full group flex items-center justify-between p-3.5 md:p-5 bg-white hover:bg-[#F9FAFB] rounded-[1.25rem] md:rounded-[2rem] shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all border border-[#E5E8EB] active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        {/* [수정: 아이콘 배경색을 더 부드러운 그린 계열로 변경하여 시각적 차별화] */}
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-[#E7F9ED] rounded-2xl md:rounded-3xl flex items-center justify-center group-hover:bg-[#D4F5E0] transition-colors shrink-0">
                          <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7 text-[#00A855]" />
                        </div>
                        <div className="text-left">
                          <div className="text-[14px] md:text-[17px] font-black text-[#191F28]">예약 절차 가이드</div>
                          <div className="text-[11px] md:text-[13px] font-medium text-[#8B95A1] mt-0.5">안전하고 쉬운 예약 방법 안내</div>
                        </div>
                      </div>
                      {/* [수정: 우측 화살표 아이콘을 명확한 회색으로 변경] */}
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-[#F9FAFB] rounded-full flex items-center justify-center group-hover:bg-[#F2F4F6] transition-colors shrink-0">
                        <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-[#8B95A1]" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* 오른쪽 추천 비주얼 Area */}
                <div className="md:col-span-5 relative hidden lg:block h-[520px]">
                  <div className="relative w-full h-full">
                    {/* 베이스 장소 카드 */}
                    <div className="rounded-[3rem] p-8 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] border border-gray-100 transform rotate-3 -translate-x-14 hover:rotate-0 transition-transform duration-700 h-full flex flex-col relative overflow-hidden group z-10">
                      <div className="flex gap-2 mb-6 border-b border-gray-100 pb-5">
                        <div className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1.5 ring-1 ring-blue-100">
                          <Check className="w-3 h-3 stroke-[3px]" /> 장로교(합동)
                        </div>
                        <div className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">100~150명</div>
                        <div className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">수영장</div>
                      </div>

                      <div className="space-y-4 flex-grow custom-scrollbar overflow-y-auto pr-2">
                        {[
                          { name: "높은뜻감사 교회", location: "제주 서귀포", capacity: 200, rate: 4.7 },
                          { name: "푸른숲 수양관", location: "강원 평창", capacity: 150, rate: 4.8 },
                          { name: "은혜광장 기도원", location: "경기 가평", capacity: 120, rate: 4.9 },
                          { name: "로뎀나무 교육관", location: "충남 천안", capacity: 200, rate: 4.7 },
                        ].map((venue, idx) => (
                          <div key={idx} className="p-2 bg-white rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm hover:border-blue-100 hover:shadow-md transition-all cursor-pointer">
                            <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center"><MapPin className="w-7 h-7 text-blue-300" /></div>
                            <div className="flex-grow">
                              <h4 className="font-bold text-[#191F28] mb-0.5">{venue.name}</h4>
                              <p className="text-xs text-[#8B95A1] font-medium flex items-center gap-1"><MapPin className="w-3 h-3" /> {venue.location}</p>
                            </div>
                            <div className="flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-bold shrink-0">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {venue.rate}
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                          </div>
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-[#F9FAFB] to-transparent pointer-events-none" />

                      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/95 to-transparent z-10 flex items-center justify-center">
                        <button className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-black shadow-lg transform translate-y-4 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                          120여 곳 장소 한눈에 비교하기
                        </button>
                      </div>
                    </div>

                    {/* [수정된 뱃지 위치] 예시 이미지 참고하여 오른쪽 하단으로 이동 */}
                    <div className="absolute -bottom-13 -right-4 bg-white p-6 rounded-[2.5rem] shadow-[0_25px_50px_rgba(0,0,0,0.15)] border border-gray-50 animate-float z-20">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#00D084] rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                          <CheckCircle className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <p className="text-[#8B95A1] text-[8px] font-black uppercase tracking-[0.2em] mb-0.5">Verified</p>
                          <p className="font-black text-2xl text-[#191F28]">120+</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
          }
          .animate-float { animation: float 4s infinite ease-in-out; }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f1f1; border-radius: 4px; }
        `}</style>
      </section>


      {/* Why StayOn Section */}
      <section className="py-10 md:py-16 px-4 md:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-[20px] md:text-5xl font-black text-[#191F28] mb-1.5 md:mb-4 tracking-tight break-keep">
              수련회 준비, 스테이온으로 한 번에 끝내세요
            </h2>
            <p className="text-[13px] md:text-2xl text-[#4E5968] font-medium opacity-80 break-keep">
              안전한 장소 검증부터 예산 산출까지, 가장 스마트한 사역 파트너
            </p>
          </div>

          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {features.map((feature, i) => {
              const isPreparing = i === 3;
              const isActive = !isHovered && activeFeatureIndex === i;

              // return (
              //   <div
              //     key={i}
              //     className={`group relative p-10 rounded-[2.5rem] border transition-all duration-500 flex flex-col h-full cursor-pointer
              //       ${isActive
              //         ? "bg-white border-gray-100 shadow-[0_20px_40px_rgba(0,0,0,0.06)] scale-[1.03] z-10"
              //         : "bg-[#F9FAFB] border-transparent hover:bg-white hover:border-gray-100 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:scale-[1.03]"
              //       }`}
              //   >
              //     <div className={`w-16 h-16 ${feature.iconBg} rounded-[1.25rem] flex items-center justify-center mb-8 transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>
              //       {feature.icon}
              //     </div>

              //     <h3 className="text-2xl font-black text-[#191F28] mb-4">
              //       {feature.title}
              //     </h3>

              //     <p className="text-[#4E5968] text-[16px] leading-[1.6] mb-8 font-medium break-keep flex-grow">
              //       {feature.desc}
              //     </p>

              //     {feature.isButton ? (
              //       <button
              //         // onClick={(e) => {
              //         //   e.preventDefault();
              //         //   if (feature.onClick) feature.onClick();
              //         // }}
              //         onClick={(e) => {
              //           e.preventDefault();
              //           if (feature.onClick) feature.onClick();
              //         }}
              //         className={`${feature.accent} text-[15px] font-black inline-flex items-center group/btn`}>
              //         {feature.linkText}
              //         <ChevronRight className="ml-1 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              //       </button>
              //     ) : (
              //       <Link to={feature.link || "#"} className={`${feature.accent} text-[15px] font-black inline-flex items-center group/btn`}>
              //         {feature.linkText}
              //         <ChevronRight className="ml-1 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              //       </Link>
              //     )}
              //   </div>
              // );
              return (
                <div
                  key={i}
                  className={`group relative p-3 md:p-7 rounded-[1.25rem] md:rounded-[2rem] border transition-all duration-500 flex flex-col h-full
              ${isPreparing ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
              ${isActive
                      ? "bg-white border-gray-100 md:shadow-[0_20px_40px_rgba(0,0,0,0.06)] md:scale-[1.03] md:z-10"
                      : "bg-[#F9FAFB] border-transparent hover:bg-white hover:border-gray-100 md:hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] md:hover:scale-[1.03]"
                    }`}
                  onClick={isPreparing ? undefined : (e) => { /* 기존 로직 유지 */ }}
                >
                  {/* [수정: 준비 중인 기능에 자물쇠 아이콘 오버레이 추가] */}
                  {isPreparing && (
                    <div className="absolute top-3 right-3 md:top-6 md:right-6 bg-white p-1.5 md:p-2 rounded-full shadow-md z-20">
                      <Lock className="w-3.5 h-3.5 md:w-5 md:h-5 text-[#8B95A1]" />
                    </div>
                  )}

                  <div className={`w-9 h-9 md:w-14 md:h-14 ${feature.iconBg} rounded-2xl md:rounded-3xl flex items-center justify-center mb-2.5 md:mb-5 transition-transform md:group-hover:scale-110 [&_svg]:w-5 [&_svg]:h-5 md:[&_svg]:w-8 md:[&_svg]:h-8 ${isActive ? 'md:scale-110' : ''}`}>
                    {feature.icon}
                  </div>

                  <h3 className="text-[14px] md:text-2xl font-black text-[#191F28] mb-1 md:mb-3 break-keep">
                    {feature.title}
                    {isPreparing && <span className="ml-1.5 text-[10px] md:text-[12px] font-bold text-[#FF8E21] bg-[#FFF8F2] px-1.5 py-0.5 rounded-lg align-middle whitespace-nowrap">준비 중</span>}
                  </h3>

                  <p className="text-[#4E5968] text-[11.5px] md:text-[16px] leading-[1.45] md:leading-[1.6] mb-2.5 md:mb-5 font-medium break-keep flex-grow line-clamp-3 md:line-clamp-none">
                    {feature.desc}
                  </p>

                  {/* [수정: 준비 중일 때 버튼 비활성화 및 텍스트 변경] */}
                  {isPreparing ? (
                    <div className="text-[12px] md:text-[15px] font-black text-[#8B95A1] flex items-center">
                      곧 오픈 예정입니다
                    </div>
                  ) : feature.isButton ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (feature.onClick) feature.onClick();
                      }}
                      className={`${feature.accent} text-[12px] md:text-[15px] font-black inline-flex items-center group/btn`}>
                      {feature.linkText}
                      <ChevronRight className="ml-1 w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover/btn:translate-x-1 shrink-0" />
                    </button>
                  ) : (
                    <Link to={feature.link || "#"} className={`${feature.accent} text-[12px] md:text-[15px] font-black inline-flex items-center group/btn`}>
                      {feature.linkText}
                      <ChevronRight className="ml-1 w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover/btn:translate-x-1 shrink-0" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Planner CTA Section */}
      <section className="py-8 md:py-16 px-4 md:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#191F28] rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-12 text-white overflow-hidden relative shadow-2xl shadow-slate-200">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-5 md:gap-10">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 bg-blue-500/20 text-blue-400 rounded-full mb-3 md:mb-5 border border-blue-500/30">
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="text-[12px] md:text-sm font-bold">무료 스마트 도구</span>
                </div>
                <h2 className="text-[24px] md:text-6xl font-black mb-2.5 md:mb-5 leading-[1.25] md:leading-[1.15] tracking-tight break-keep">
                  번거로운 문서 정리,<br />
                  <span className="text-blue-400">클릭 한 번으로 끝내세요.</span>
                </h2>

                <p className="text-slate-400 text-[13px] md:text-xl mb-4 md:mb-7 leading-relaxed break-keep font-medium">
                  장소 비교부터 보고서 생성까지.<br className="hidden md:block" />
                  현직 사역자가 만든 <br /><b>비교 보고서 자동 생성기</b>로 <br className="hidden md:block" />
                  소요되는 시간을 획기적으로 줄여드립니다.
                </p>
                <button
                  onClick={() => navigate("/planner")}
                  className="inline-flex items-center gap-2 md:gap-3 px-6 py-3.5 md:px-10 md:py-5 bg-blue-500 text-white rounded-2xl md:rounded-3xl font-black text-[15px] md:text-xl hover:bg-blue-400 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                >
                  <FileText className="w-4 h-4 md:w-6 md:h-6" />
                  스마트 플래너 시작하기
                </button>
              </div>
              <div className="flex-1 w-full max-w-md">
                <div className="bg-[#222B38] rounded-[1.25rem] md:rounded-[2rem] p-4 md:p-6 border border-white/5 shadow-2xl relative overflow-hidden group">
                  <div className="flex gap-2 mb-3 md:mb-5">
                    <div className="w-10 h-2 bg-blue-500 rounded-full"></div>
                    <div className="w-4 h-2 bg-slate-700 rounded-full"></div>
                    <div className="w-4 h-2 bg-slate-700 rounded-full"></div>
                  </div>
                  <div className="space-y-2.5 md:space-y-4">
                    {[
                      { label: "장소명", value: "숲속 수련원", color: "bg-blue-400" },
                      { label: "수용인원", value: "150명", color: "bg-emerald-400" },
                      { label: "예산범위", value: "협의 가능", color: "bg-orange-400" },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col gap-1.5 md:gap-2 p-2.5 md:p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] md:text-xs text-slate-500 font-bold">{item.label}</span>
                          <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                          <span className="text-[13px] md:text-sm font-bold text-slate-200">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-3 right-3 md:bottom-6 md:right-6 px-3 py-1.5 md:px-4 md:py-2 bg-blue-500 text-white rounded-lg text-[11px] md:text-xs font-black shadow-lg animate-bounce-subtle">
                    보고서 생성 완료!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ★ New Section: Travel Insurance (Toss Inspired) ★ */}
      <section
        className="py-8 md:py-16 px-4 md:px-6 bg-white scroll-mt-32"
        ref={insuranceRef}
        id="insurance-section"
      >
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#F2F4F6] rounded-[1.75rem] md:rounded-[3rem] p-5 md:p-10 flex flex-col md:flex-row items-center gap-5 md:gap-8 border border-gray-50 overflow-hidden relative group">

            <div className="absolute inset-0 z-50 bg-[#F2F4F6]/40 backdrop-blur-[1.5px] flex items-center justify-center p-4 md:p-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 backdrop-blur-2xl px-6 py-5 md:px-8 md:py-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.06)] border border-white flex flex-col items-center text-center max-w-[340px]"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-2xl md:rounded-3xl flex items-center justify-center mb-3 md:mb-4">
                  <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-blue-600 animate-pulse" />
                </div>
                <h3 className="text-[15px] md:text-[18px] font-black text-[#191F28] mb-1.5 md:mb-2 tracking-tight break-keep">
                  보험 서비스를 준비하고 있어요
                </h3>
                <p className="text-[12px] md:text-[14px] font-bold text-[#8B95A1] leading-relaxed break-keep">
                  현재 대형 보험사와 서비스 계약을 진행 중입니다.<br />
                  곧 가장 안전하고 합리적인 보험으로 함께하겠습니다.
                </p>
              </motion.div>
            </div>
            {/* Background Decoration */}
            <Umbrella className="absolute -right-20 -bottom-20 w-80 h-80 text-blue-100 opacity-50 group-hover:rotate-12 transition-transform duration-1000" />

            <div className="flex-1 z-10">
              <div className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:px-4 md:py-1.5 bg-white text-blue-600 rounded-full mb-2.5 md:mb-4 shadow-sm border border-blue-50">
                <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-[11px] md:text-sm font-black">사역자 안심 케어</span>
              </div>
              <h2 className="text-[19px] md:text-4xl font-black text-[#191F28] mb-2 md:mb-4 leading-[1.3] md:leading-tight break-keep">
                단체 이동이 걱정되시나요? <br />
                <span className="text-blue-600 underline decoration-blue-200 underline-offset-4 md:underline-offset-8">수련회 여행자 보험</span>도 한 번에.
              </h2>
              <p className="text-[13px] md:text-2xl text-[#4E5968] mb-3.5 md:mb-7 leading-relaxed break-keep font-medium opacity-90">
                복잡한 명단 입력 없이, 스테이온 예약 정보만으로 <br className="hidden md:block" />
                성도님들의 안전을 위한 보험 가입을 단 1분 만에 끝낼 수 있습니다.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6 text-[12px] md:text-[15px]">
                <div className="flex items-center gap-2 md:gap-3 bg-white/60 p-2.5 md:p-4 rounded-2xl md:rounded-3xl">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                    <Zap className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                  </div>
                  <span className="font-bold text-[#333D4B]">명단 자동 연동으로 간편 가입</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 bg-white/60 p-2.5 md:p-4 rounded-2xl md:rounded-3xl">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                  </div>
                  <span className="font-bold text-[#333D4B]">대형 보험사 제휴로 확실한 보장</span>
                </div>
              </div>

              <button className="px-5 py-3 md:px-10 md:py-5 bg-[#191F28] text-white rounded-[1.1rem] md:rounded-[1.5rem] font-black text-[13px] md:text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 flex items-center gap-2">
                보험 서비스 자세히 보기 <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>

            <div className="flex-1 w-full max-w-sm z-10">
              <div className="bg-white rounded-[1.25rem] md:rounded-[2rem] p-4 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 rotate-2">
                <div className="flex justify-between items-center mb-3 md:mb-5 pb-2.5 md:pb-3 border-b border-gray-50">
                  <span className="font-black text-[13px] md:text-base text-[#191F28]">예약 장소 보험 가입</span>
                  <span className="text-blue-600 text-[11px] md:text-xs font-black">신청 가능</span>
                </div>
                <div className="space-y-2.5 md:space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8B95A1] text-[12px] md:text-sm font-bold">참여 인원</span>
                    <span className="text-[#191F28] font-black text-[13px] md:text-base">총 120명</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8B95A1] text-[12px] md:text-sm font-bold">보장 기간</span>
                    <span className="text-[#191F28] font-black text-[13px] md:text-base">2박 3일</span>
                  </div>
                  <div className="py-2.5 px-4 md:py-4 md:px-6 bg-blue-50 rounded-2xl md:rounded-3xl border border-blue-100">
                    <div className="flex justify-between items-center text-blue-700">
                      <span className="text-[12px] md:text-sm font-bold opacity-80">1인 평균 보험료</span>
                      <span className="text-lg md:text-xl font-black">1,200원</span>
                    </div>
                  </div>
                  <div className="text-[10px] md:text-[11px] text-gray-400 font-medium text-center leading-relaxed">
                    * 스테이온 예약 정보로 보험료 산출이 완료되었습니다. <br />
                    클릭 한 번으로 가입을 완료하세요.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Special Program: 빈자리 나눔 */}
      <section className="py-8 md:py-16 px-4 md:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
            <div className="grid md:grid-cols-12 gap-5 md:gap-8 items-center">

              <div className="absolute inset-0 z-50 bg-white/40 backdrop-blur-[2px] flex items-center justify-center p-4">
                <div className="bg-white/90 backdrop-blur-xl px-5 py-3 md:px-8 md:py-4 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center gap-3 md:gap-4 animate-in fade-in zoom-in duration-500">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                  <span className="text-[13px] md:text-[17px] font-black text-[#191F28] tracking-tight break-keep">
                    더 좋은 소식을 위해 서비스를 준비하고 있어요
                  </span>
                </div>
              </div>

              <div className="md:col-span-7 z-10">
                <div className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:px-3 md:py-1.5 bg-emerald-50 text-emerald-600 rounded-lg mb-2.5 md:mb-4">
                  <TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="text-[10px] md:text-xs font-bold tracking-wider uppercase">Flash Deal</span>
                </div>
                <h2 className="text-[22px] md:text-5xl font-black text-gray-900 mb-2 md:mb-4 leading-[1.25] md:leading-[1.2] tracking-tight break-keep">
                  갑자기 생긴 빈자리,<br />
                  <span className="text-emerald-500">가격은 최대 반값 할인가로.</span>
                </h2>
                <p className="text-[13px] md:text-xl text-gray-500 mb-3.5 md:mb-6 leading-relaxed break-keep font-medium">
                  취소된 수련회 장소를 번개 특가로 연결해 드립니다.<br className="hidden md:block" />
                  미자립 교회의 건강한 사역을 스테이온이 응원합니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5 md:gap-4 items-start sm:items-center">
                  <button className="px-6 py-3.5 md:px-8 md:py-5 bg-emerald-500 text-white rounded-2xl md:rounded-3xl font-black text-[14px] md:text-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95">
                    빈자리 특가 확인하기
                  </button>
                  <div className="flex items-center gap-1.5 md:gap-2 px-1 md:px-4 py-1 md:py-2 text-gray-400">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                    <span className="text-[12px] md:text-sm font-semibold">매일 오전 10시 업데이트</span>
                  </div>
                </div>
              </div>
              <div className="md:col-span-5 relative">
                <div className="relative bg-slate-50 rounded-[1.25rem] md:rounded-[2rem] p-4 md:p-6 border border-slate-100 transform md:rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="absolute -top-4 -right-4 md:-top-6 md:-right-6 bg-orange-500 text-white w-16 h-16 md:w-24 md:h-24 rounded-full flex flex-col items-center justify-center shadow-xl z-20 animate-bounce-slow">
                    <span className="text-[10px] md:text-sm font-bold">UP TO</span>
                    <span className="text-base md:text-2xl font-black">50%</span>
                  </div>
                  <div className="bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border border-slate-200/50">
                    <div className="h-28 md:h-40 bg-gray-200 relative">
                      {/* @ts-ignore */}
                      <ImageWithFallback
                        src="sharing-project.jpg"
                        alt="빈자리 나눔 장소"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 md:top-3 md:left-3 px-1.5 py-0.5 md:px-2 md:py-1 bg-black/50 backdrop-blur-md text-white text-[9px] md:text-[10px] font-bold rounded">
                        강원도 원주
                      </div>
                    </div>
                    <div className="p-3.5 md:p-5">
                      <div className="flex justify-between items-start mb-1.5 md:mb-2">
                        <h4 className="font-bold text-gray-900 text-[14px] md:text-lg">숲속 그리심 수련원</h4>
                        <div className="text-right">
                          <span className="text-[11px] md:text-xs text-gray-400 line-through block">1,200,000원</span>
                          <span className="text-emerald-600 font-bold text-[13px] md:text-base">600,000원~</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 md:gap-2">
                        <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-slate-100 text-slate-500 text-[10px] md:text-xs rounded font-medium">8월 14일~16일</span>
                        <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-slate-100 text-slate-500 text-[10px] md:text-xs rounded font-medium">100명 규모</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 border border-slate-200 rounded-[1.25rem] md:rounded-[2rem] -z-10 translate-x-3 translate-y-3 md:translate-x-4 md:translate-y-4 bg-white/50"></div>
                </div>
              </div>
            </div>
            <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
          </div>
        </div>
        <style>{`
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0) rotate(12deg); }
            50% { transform: translateY(-10px) rotate(12deg); }
          }
          .animate-bounce-slow {
            animation: bounce-slow 3s infinite ease-in-out;
            transform: rotate(12deg);
          }
        `}</style>
      </section>

            {/* Partnership Request Section */}
<section className="py-8 md:py-16 px-4 md:px-6 bg-white border-y border-gray-100">
  <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-5 md:gap-8">
    <div className="flex-1">
      <div className="inline-block px-2.5 py-1 md:px-3 bg-blue-50 text-blue-600 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-wider mb-2 md:mb-3">
        For Church Leaders
      </div>
      <h2 className="text-[20px] md:text-4xl font-black text-gray-900 mb-2 md:mb-4 leading-[1.3] md:leading-tight break-keep">
        교회 내 보고를 위한<br />
        <span className="text-blue-600">공식 소개 자료를 받아보세요</span>
      </h2>
      <p className="text-[13px] md:text-base text-gray-500 font-medium leading-relaxed break-keep">
        당회 또는 제직회 보고를 위한 상세 소개서와 수수료 체계, 정산 프로세스가 담긴 가이드를 제공해 드립니다. 사역자 인증 후 안전하게 전달해 드립니다.
      </p>
    </div>

    <div className="w-full md:w-auto">
      <button
        // 카카오 플러스 친구
        // onClick={() => {
        //   const win = window.open("https://pf.kakao.com/_AtexfX/chat", "_blank", "noreferrer");
        //   if (win) win.opener = null;
        // }}

        // 구글 신청폼
        onClick={() => {
          const win = window.open("https://docs.google.com/forms/d/e/1FAIpQLSfFd0sDiHnx746mCw5KIWtalpmDE-IiyrVoGBdpwXFipdEg4A/viewform", "_blank", "noreferrer");
          if (win) win.opener = null;
        }}
        className="w-full md:w-64 py-3.5 md:py-5 bg-gray-900 text-white rounded-2xl md:rounded-3xl font-black text-[14px] md:text-base hover:bg-gray-800 transition-all active:scale-95 shadow-xl"
      >
        소개 자료 요청하기
      </button>
    </div>
  </div>
</section>

      {/* Start Now Section */}
      <section className="py-10 md:py-20 px-4 md:px-6 text-center">
        <h2 className="text-[24px] md:text-5xl font-black text-gray-900 mb-2 md:mb-5 tracking-tight break-keep">지금 바로 시작하세요</h2>
        <p className="text-[14px] md:text-xl text-gray-600 mb-4 md:mb-7 font-medium break-keep">검증되고 안전한 수련회 장소를 찾아보세요</p>
        <div className="flex flex-col sm:flex-row gap-2.5 md:gap-4 justify-center">
          <Link to="/venues" className="px-8 py-3.5 md:px-12 md:py-5 bg-blue-600 text-white rounded-2xl md:rounded-3xl font-black text-[14px] md:text-base hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95">장소 찾기</Link>
          <Link to="/register" className="px-8 py-3.5 md:px-12 md:py-5 bg-white text-blue-600 border-2 border-blue-600 rounded-2xl md:rounded-3xl font-black text-[14px] md:text-base hover:bg-blue-50 transition-all active:scale-95">장소 등록하기</Link>
        </div>
      </section>


      {/* ★ 3D Sliding Section: Family Services ★ */}
      <section className="py-10 md:py-20 px-4 md:px-6 bg-slate-50/50 relative overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-5 md:mb-8">
            <div className="inline-flex items-center gap-1.5 md:gap-2 text-blue-600 font-black text-[11px] md:text-sm mb-2 md:mb-4 uppercase tracking-[0.15em] md:tracking-[0.2em]">
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" /> StayOn Family Services
            </div>
            <h2 className="text-[20px] md:text-5xl font-black text-gray-900 tracking-tight break-keep mb-1.5 md:mb-4">
              다른 서비스도 이용해보세요!
            </h2>
            <p className="text-[12px] md:text-base text-slate-400 font-bold break-keep">
              StayOn이 만들어갈 새로운 사역의 변화를 기대해 주세요.
            </p>
          </div>

          {/* 모바일 전용: /teams "지금 주목받는 사역팀"과 같은 가로 자동 스크롤 티커 */}
          <div className="md:hidden">
            <FamilyServiceTicker services={familyServices} navigate={navigate} />
          </div>

          {/* PC 전용: 기존 3D 코스플로우(가운데 카드 + 좌우 겹침) 슬라이더 */}
          <div
            className="hidden md:flex relative h-[600px] justify-center items-center overflow-visible"
            onMouseEnter={() => setIsFamilyHovered(true)}
            onMouseLeave={() => setIsFamilyHovered(false)}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-100/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="relative w-full max-w-5xl flex justify-center items-center h-full">
              {familyServices.map((service, index) => {
                let position = (index - extraSliderIndex + familyServices.length) % familyServices.length;
                const isCenter = position === 0;
                const isRight = position === 1;
                const isLeft = position === familyServices.length - 1;
                // 카드가 4개 이상이면 정면/좌우 이웃 외에는 겹쳐 보이므로 아예 숨긴다.
                if (!isCenter && !isRight && !isLeft) return null;

                return (
                  <div
                    key={service.id}
                    onClick={() => !isCenter && setExtraSliderIndex(index)}
                    className={`absolute w-full max-w-[260px] md:max-w-[380px] p-5 md:p-10 rounded-[2rem] md:rounded-[3.5rem] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col justify-between h-[360px] md:h-[520px] shadow-2xl border-0 ${isCenter
                      ? "z-30 opacity-100 translate-x-0 scale-110 bg-white shadow-blue-100"
                      : isRight
                        ? "z-10 opacity-30 translate-x-[90%] md:translate-x-[110%] scale-90 bg-white/40 blur-[1.5px] cursor-pointer"
                        : "z-10 opacity-30 -translate-x-[90%] md:-translate-x-[110%] scale-90 bg-white/40 blur-[1.5px] cursor-pointer"
                      }`}
                  >
                    {!service.isReady && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 backdrop-blur-md rounded-[2rem] md:rounded-[3.5rem] transition-opacity">
                        <div className="w-11 h-11 md:w-16 md:h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl mb-2.5 md:mb-4">
                          <Lock className="w-4 h-4 md:w-6 md:h-6" />
                        </div>
                        <span className="text-slate-900 font-black text-[13px] md:text-base">서비스 준비 중</span>
                      </div>
                    )}

                    <div className="relative z-10 h-full flex flex-col transition-opacity duration-500 opacity-100">
                      <div className={`inline-flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-[11px] font-black mb-3 md:mb-6 w-fit ${service.tagColor}`}>
                        <AlertCircle className="w-3 h-3 md:w-3.5 md:h-3.5" /> {service.tag}
                      </div>
                      <div className={`w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-3.5 md:mb-8 shadow-inner transition-colors duration-500 [&_svg]:w-6 [&_svg]:h-6 md:[&_svg]:w-8 md:[&_svg]:h-8 ${isCenter ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                        {service.icon}
                      </div>
                      <h3 className={`text-[16px] md:text-2xl font-black mb-1.5 md:mb-4 text-gray-900 leading-tight transition-all duration-500 break-keep ${isCenter ? 'scale-105' : 'scale-100'}`}>
                        {service.title}
                      </h3>
                      <p className="text-gray-500 text-[11.5px] md:text-sm font-semibold leading-relaxed break-keep line-clamp-3 md:line-clamp-none">
                        {service.description}
                      </p>
                      <div className="mt-auto pt-3.5 md:pt-8">
                        <button
                          onClick={(e) => {
                            if (isCenter && service.isReady) {
                              e.stopPropagation();
                              if (service.link.startsWith("http://") || service.link.startsWith("https://")) {
                                window.open(service.link, '_blank');
                              } else {
                                navigate(service.link);
                              }
                            }
                          }}
                          className={`w-full rounded-2xl md:rounded-3xl py-3 md:py-5 font-black text-[13px] md:text-lg transition-all duration-500 flex items-center justify-center gap-1.5 md:gap-2 ${isCenter && service.isReady
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'
                            : 'bg-slate-100 text-slate-400 cursor-default'
                            }`}
                        >
                          바로가기 <ChevronRight className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="absolute -bottom-6 md:-bottom-10 flex gap-2 md:gap-3">
              {familyServices.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setExtraSliderIndex(i)}
                  className={`h-2 md:h-2.5 rounded-full transition-all duration-500 cursor-pointer ${extraSliderIndex === i ? "w-8 md:w-10 bg-blue-600" : "w-2 md:w-2.5 bg-gray-200"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
