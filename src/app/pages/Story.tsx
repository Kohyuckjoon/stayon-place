import { Header } from "../components/Header";
import { Heart, Calendar, CheckCircle2, MessageSquare, MapPin, Sparkles, ArrowRight, Quote, ShieldCheck, CreditCard, ChevronRight, } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, Variants, HTMLMotionProps } from "framer-motion";
import { ScrollRestoration } from "react-router-dom";

export function Story() {
  const navigate = useNavigate();

  // [극강의 부드러움을 위한 설정]
  const scrollReveal: HTMLMotionProps<"div"> = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: {
      once: false,
      amount: 0.15,
      margin: "-100px 0px -100px 0px"
    },
    transition: {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1]
    }
  };

  const staggerContainer: Variants = {
    initial: { opacity: 0 },
    whileInView: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const staggerItem: Variants = {
    initial: { opacity: 0, y: 15 },
    whileInView: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-gray-900 overflow-x-hidden">
      <ScrollRestoration />

      {/* 필기체 및 세련된 붓글씨 폰트 import */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=East+Sea+Dokdo&display=swap');
        `}
      </style>

      {/* [순서 1] Hero Section */}
      <section className="pt-20 pb-5 px-6 bg-gradient-to-b from-blue-50/50 to-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100/50 text-blue-600 rounded-full mb-6">
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span className="text-xs font-bold tracking-widest uppercase">Our Mission</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.15]">
            수련회 준비, <br />
            <span className="text-blue-600 font-black text-5xl md:text-7xl block mt-4">더 본질적인 것</span>에 집중할 순 없을까?
          </h1>
          <p className="text-lg md:text-xl text-gray-500 leading-relaxed font-medium max-w-2xl mx-auto">
            매 시즌 발로 뛰며 확인한 수백 곳의 장소와 수만 번의 문서 수정.<br className="hidden md:block" />
            그 치열한 고민 끝에 탄생한 수련회 준비,<br className="hidden md:block" />StayOn Place이 모든 사역의 여정에 함께합니다.
          </p>
        </motion.div>
      </section>

      {/* [순서 2] Message Section */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Black Card */}
          <motion.div
            {...(scrollReveal as any)}
            className="mb-16 p-8 md:p-10 bg-gray-900 rounded-[32px] text-white overflow-hidden relative group shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 blur-[120px] rounded-full -mr-20 -mt-20"></div>
            <div className="relative z-10">
              <motion.h2
                variants={staggerItem}
                initial="initial"
                whileInView="whileInView"
                className="text-2xl md:text-4xl font-bold mb-6 leading-tight"
              >
                "올해 수련회 장소는 또 어디로 가나..."
              </motion.h2>
              <div className="space-y-5">
                {/* 첫 번째 문구: 현실 공감 */}
                <motion.p
                  variants={staggerItem}
                  initial="initial"
                  whileInView="whileInView"
                  className="flex items-center gap-4 text-gray-400 text-lg md:text-xl transition-colors duration-500 hover:text-gray-300"
                >
                  <span className="w-1.5 h-1.5 bg-gray-600 rounded-full shrink-0"></span>
                  <span>기도보다 <span className="text-blue-400 font-medium border-b border-blue-400/50 pb-0.5">장소 검색</span>을 더 많이 하는 나를 발견할 때,</span>
                </motion.p>

                {/* 두 번째 문구: 행정적 피로감 */}
                <motion.p
                  variants={staggerItem}
                  initial="initial"
                  whileInView="whileInView"
                  className="flex items-center gap-4 text-gray-400 text-lg md:text-xl"
                >
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full shrink-0"></span>
                  <span>은혜를 구하기 전 <span className="text-blue-400 font-medium border-b border-blue-400/50 pb-0.5">예산안</span>부터 맞춰야 하는 현실에 지칠 때,</span>
                </motion.p>

                {/* 세 번째 문구: 문제 제기 (강조) */}
                <motion.p
                  variants={staggerItem}
                  initial="initial"
                  whileInView="whileInView"
                  className="flex items-center gap-4 text-white text-xl md:text-2xl font-bold"
                >
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                  <span>수련회는 사역이 아니라 <span className="text-red-400 underline underline-offset-8 decoration-2">'행사'</span>가 되어버리곤 합니다.</span>
                </motion.p>

                {/* 추가 문구: 해결책 제시 (Toss Style 포인트) */}
                <motion.div
                  variants={staggerItem}
                  initial="initial"
                  whileInView="whileInView"
                  className="mt-6 pt-5 border-t border-white/10"
                >
                  <p className="text-gray-300 text-lg mb-2">전도사님, 목사님. 장소 고민은 <span className="text-white font-bold">저희가 할게요.</span></p>
                  <p className="text-blue-400 text-2xl md:text-3xl font-black tracking-tight">
                    오직 <span className="text-white px-1">말씀과 기도</span>에만 집중하세요.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Text Flow */}
          <div className="relative space-y-16 text-gray-700 leading-[1.9] text-lg md:text-xl font-medium">
            <motion.p {...(scrollReveal as any)} className="text-center md:text-left">
              매년 돌아오는 수련회 시즌, 장소 섭외부터 인원 관리, 끝없는 일정 조율과 예산 정리까지...
              쏟아지는 행정 업무 속에서 우리는 정작 가장 중요한 질문을 놓치곤 합니다.
            </motion.p>

            <motion.p {...(scrollReveal as any)} className="text-center md:text-left">
              수련회 준비, StayOn Place의 기획자는, <strong className="text-gray-900 font-bold underline underline-offset-8 decoration-blue-200">단 한 사람의 영혼이 변화되는 순간</strong>을 보고 싶어서 이 일을 시작했습니다.
              수련회는 단순한 행사가 아니라 한 영혼이 하나님과 깊이 교제하며 회복되는 귀한 시간입니다.
            </motion.p>

            {/* Accent Block */}
            <motion.div
              {...(scrollReveal as any)}
              className="relative overflow-hidden py-12 px-6 md:px-12 rounded-[32px] border border-white shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
              style={{
                /* 이미지에서 보여주신 부드러운 종이 질감을 구현한 배경 */
                backgroundColor: '#f9f9fb',
                backgroundImage: `url("https://www.transparenttextures.com/patterns/clean-gray-paper.png")`,
              }}
            >
              {/* 스타일의 상단 강조 뱃지 */}
              <motion.div
                variants={staggerItem}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-blue-600 text-sm font-bold tracking-tight">본질에 집중하는 시간</span>
              </motion.div>

              {/* 메인 질문: 서체 굵기와 행간 최적화 */}
              <div className="max-w-3xl mx-auto mb-8">
                <h2 className="text-[#191F28] font-black text-3xl md:text-5xl leading-[1.3] tracking-tighter">
                  "목사님, 우리의 기도는 <br className="hidden md:block" />
                  언제 <span className="text-blue-600 inline-block relative">
                    시작
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 25 0, 50 5 T 100 5" stroke="#3182F6" strokeWidth="4" fill="transparent" strokeLinecap="round" />
                    </svg>
                  </span>되어야 할까요?"
                </h2>
              </div>

              {/* 서브 설명: 직관적인 카드형 레이아웃 */}
              <div className="space-y-6 mb-10">
                <p className="text-[#4E5968] text-xl md:text-2xl font-bold tracking-tight">
                  한 달 전? 2주 전? <br className="md:hidden" />
                  아니면 행정 준비가 끝난 후에야 <br className="md:hidden" />
                  <span className="text-[#8B95A1]">겨우 무릎 꿇고 계신 건 아닌가요?</span>
                </p>

                <div className="max-w-2xl mx-auto transition-all duration-300 hover:scale-[1.02]">
                  <div className="relative p-6 md:p-8 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
                    {/* 따옴표 아이콘 강조 */}
                    <div className="absolute -top-4 -left-4 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H11.017C10.4647 12 10.017 11.5523 10.017 11V6C10.017 4.89543 10.9124 4 12.017 4H19.017C21.2261 4 23.017 5.79086 23.017 8V15C23.017 18.3137 20.3307 21 17.017 21H14.017ZM3.0166 21L3.0166 18C3.0166 16.8954 3.91203 16 5.0166 16H8.0166C8.56888 16 9.0166 15.5523 9.0166 15V9C9.0166 8.44772 8.56888 8 8.0166 8H4.0166C3.46432 8 3.0166 8.44772 3.0166 9V11C3.0166 11.5523 2.56888 12 2.0166 12H0.0166016C-0.535684 12 -0.983398 11.5523 -0.983398 11V6C-0.983398 4.89543 -0.0879673 4 1.0166 4H8.0166C10.2257 4 12.0166 5.79086 12.0166 8V15C12.0166 18.3137 9.3303 21 6.0166 21H3.0166Z" /></svg>
                    </div>

                    <p className="text-[#333D4B] text-lg md:text-xl font-medium leading-[1.6] text-left">
                      아이들의 명단을 정리하고, 숙소 배정표를 짜고, 예산을 맞추는 시간들. <br className="hidden md:block" />
                      그 귀한 준비의 시간이 정작 중요한 <span className="text-blue-600 font-bold">영적인 훈련</span>을 깎아먹고 있다면
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                      <span className="text-[#191F28] text-xl md:text-2xl font-black italic tracking-tight">
                        "그것은 과연 사역일까요, 노동일까요?"
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 결론: 하단 강조 섹션 */}
              <div className="space-y-4">
                <p className="text-[#4E5968] text-lg font-bold">
                  영적인 준비에 전념해야 할 골든타임, <span className="text-red-500">행정에 빼앗기지 마세요.</span>
                </p>
                <div className="bg-white inline-block py-5 px-8 rounded-2xl shadow-[0_15px_40px_rgba(49,130,246,0.15)] border border-blue-50">
                  <p className="text-[#191F28] font-black text-2xl md:text-4xl tracking-tighter">
                    사역자님께서 기도로 깨어있을 때, <br className="md:hidden" />
                    수련회는 <span className="text-blue-600">비로소 시작됩니다.</span>
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.p {...(scrollReveal as any)} className="text-center md:text-left leading-relaxed text-gray-700">
              끝 없는 장소 검색과 복잡한 행정 문서 사이에 쏟는 시간들.. <br />
              <strong className="text-gray-900 font-bold decoration-red-500/30 underline underline-offset-[-2px] decoration-[8px]">공동체를 위해 기도하는 데</strong> 사용하셨으면 좋겠습니다.
              <br /><br />
              준비의 모든 과정을 <span className="text-blue-600 font-black">수련회 준비, StayOn Place</span>가 함께하겠습니다.
            </motion.p>

            {/* [메인 하이라이트] 로마서 말씀 섹션 */}
            <motion.div {...(scrollReveal as any)} className="pt-12 border-t border-gray-100">
              <div className="bg-white p-8 md:p-14 rounded-[32px] relative overflow-hidden border border-gray-50 shadow-sm">
                {/* 배경 노이즈 텍스처 */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
                </div>

                <div className="relative z-10 text-center">
                  <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="flex justify-center items-center gap-2 mb-8">
                    <div className="w-8 h-[1px] bg-blue-200"></div>
                    <span className="text-xs md:text-sm text-blue-400 font-bold tracking-[0.3em] uppercase">The Core Promise</span>
                    <div className="w-8 h-[1px] bg-blue-200"></div>
                  </motion.div>

                  <div className="inline-block relative">
                    <p
                      className="text-3xl md:text-5xl text-gray-800 leading-[1.7] mb-8 font-medium"
                      style={{
                        fontFamily: "'Nanum Pen Script', cursive",
                        wordBreak: 'keep-all',
                        /* 글자 깨짐 방지 핵심 속성 */
                        WebkitFontSmoothing: 'antialiased',
                        textRendering: 'optimizeLegibility'
                      }}
                    >
                      "우리가 알거니와 하나님을 사랑하는 자<br className="md:hidden" /><br />
                      곧 그의 뜻대로 부르심을 입은 자들에게는<br />
                      <span className="relative inline-block mt-4 md:mt-2">
                        <motion.svg
                          initial={{ width: 0, opacity: 0 }}
                          whileInView={{ width: '110%', opacity: 1 }}
                          transition={{ delay: 0.6, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute -left-[5%] -bottom-1 -z-10 h-[130%] w-[110%]"
                          viewBox="0 0 300 40"
                          preserveAspectRatio="none"
                        >
                          <path d="M5 25C60 21 110 29 160 25C210 21 250 25 295 18C275 28 230 36 150 34C70 32 25 29 5 25Z" fill="#EFF6FF" className="opacity-90" />
                          <motion.path initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ delay: 0.8, duration: 1.2 }} d="M10 28C70 26 130 32 190 28C240 24 270 28 290 22" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" fill="none" className="opacity-20" />
                        </motion.svg>

                        {/* 1. font-bold를 제거 (깨짐의 주원인)
                          2. text-shadow로 미세하게 두께감만 보정
                      */}
                        <span
                          className="relative z-10 text-gray-900 px-3"
                          style={{
                            fontWeight: 400, // 굵기를 일반으로 고정
                            textShadow: '0.2px 0 0px #000, -0.2px 0 0px #000', // 미세하게 두께 보정
                            letterSpacing: '-0.02em'
                          }}
                        >
                          모든 것이 합력하여 선을 이루느니라
                        </span>
                      </span>"
                    </p>
                  </div>

                  <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-8 flex flex-col items-center gap-3">
                    <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    <p className="text-xs md:text-sm font-bold text-gray-400 tracking-[0.4em] ml-[0.4em]">ROMANS 8:28</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Signature Section */}
            <motion.div {...(scrollReveal as any)} className="pt-12 border-t border-gray-100 flex flex-col items-center md:items-start">
              <p className="font-bold text-gray-900 mb-6 italic text-xl md:text-2xl leading-relaxed text-center md:text-left">
                "수많은 사역자와 헌신자들에게 실질적인 가이드와 편의를 제공하여, <br className="hidden md:block" />
                사역의 본질인 하나님과의 관계를 회복시키는 도구가 되길 소망합니다."
              </p>
              <div className="flex items-center gap-4">
                {/* <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-xl shadow-blue-200">SO</div> */}
                <img 
                  src="/logo_image_F0F7FF.png"
                  
                  alt="StayOn 로고"
                  className="h-12 w-auto object-contain select-none"
                />
                <div>
                  <p className="text-gray-900 font-bold text-lg leading-none">수련회 장소 큐레이션 플랫폼 / StayOn Place 기획자</p>
                  <p className="text-gray-400 text-sm mt-2 font-semibold">스테이온(StayOn) 드림</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* [순서 3] Features Section */}
      <section className="py-16 px-6 bg-[#f9fafb]">
        <div className="max-w-7xl mx-auto">
          <motion.div {...(scrollReveal as any)} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-bold mb-4">
              STAYON 솔루션
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-[#191f28] mb-4 tracking-tight">
              우리가 해결하려는 불편함
            </h2>
            <p className="text-[#4e5968] text-xl font-medium leading-relaxed">
              번거로운 행정은 줄이고, 사역의 본질은 더합니다.
            </p>
          </motion.div>

          {/* 1-2-3 / 4-5 배치를 위한 Grid 레이아웃 */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 lg:gap-5">
            {[
              {
                icon: MapPin,
                color: "red",
                title: "파편화된 정보",
                desc1: "흩어진 장소 정보를 한곳에 모았습니다.",
                desc2: "장소 검색에 쏟는 시간을 아끼세요.",
                gridClass: "md:col-span-2" // 첫 줄 3개 (2+2+2 = 6)
              },
              {
                icon: Calendar,
                color: "blue",
                title: "지치게 하는 행정",
                desc1: "한글, 워드, 엑셀 문서 양식 지원",
                desc2: "준비 시간을 50% 이상 단축해 드립니다.",
                gridClass: "md:col-span-2"
              },
              {
                icon: CheckCircle2,
                color: "emerald",
                title: "신뢰할 수 있는 장소",
                desc1: "철저한 이단 검증 및 시설 확인",
                desc2: "검증된 장소만 안심하고 선택하세요.",
                gridClass: "md:col-span-2"
              },
              {
                icon: ShieldCheck,
                color: "indigo",
                title: "안전한 보험 가입",
                desc1: "수련회 전용 단체 여행자 보험",
                desc2: "클릭 한 번으로 간편하게 가입하세요.",
                gridClass: "md:col-start-2 md:col-span-2" // 두 번째 줄 중앙 배치 시작
              },
              {
                icon: CreditCard,
                color: "orange",
                title: "한큐에 예산 관리",
                desc1: "복잡한 수련회 예산 산출 지원",
                desc2: "지출 증빙까지 한 번에 관리하세요.",
                gridClass: "md:col-span-2"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: idx * 0.1 }}
                className={`${feature.gridClass} bg-white p-6 md:p-8 rounded-[28px] shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-[#f2f4f6] hover:shadow-[0_40px_70px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden`}
              >
                {/* 아이콘 섹션: 원본 이미지의 풍부한 컬러 배경 재현 */}
                <div className={`w-14 h-14 md:w-16 md:h-16 bg-${feature.color}-50 rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500`}>
                  <feature.icon className={`w-7 h-7 md:w-8 md:h-8 text-${feature.color}-500`} />
                </div>

                {/* 타이틀 */}
                <h3 className="text-2xl font-black mb-3 text-[#191f28] tracking-tight">
                  {feature.title}
                </h3>

                {/* 설명 섹션: 가독성 중심의 불렛포인트 */}
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="mt-2 w-1.5 h-1.5 rounded-full bg-[#d1d6db] shrink-0" />
                    <p className="text-[#4e5968] font-bold leading-snug break-keep">
                      {feature.desc1}
                    </p>
                  </div>

                  {/* 핵심 혜택 강조: Sparkles 아이콘과 컬러 텍스트 */}
                  <div className="flex gap-2 items-center pt-2">
                    <Sparkles className={`w-5 h-5 text-${feature.color}-500 shrink-0 opacity-80`} />
                    <p className={`text-${feature.color}-600 font-black leading-snug text-[15px]`}>
                      {feature.desc2}
                    </p>
                  </div>
                </div>

                {/* 하단 화살표 디자인: 직관적인 다음 단계 표시 */}
                {/* <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="text-sm font-bold text-gray-400">자세히 보기</span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div> */}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 text-center bg-white">
        <motion.div {...(scrollReveal as any)} className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-8 text-gray-900 tracking-tight">함께 사역의 기쁨을 회복해요</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button onClick={() => navigate("/venues")} className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 active:scale-95 flex items-center justify-center gap-3">
              장소 찾아보기 <ArrowRight className="w-6 h-6" />
            </button>
            <button onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSemG4_fbEYEct7zo9tZ2EN-cY-Jg5pP63ODqDkRNEhq0l47yQ/viewform", "_blank")} className="w-full sm:w-auto px-10 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black text-xl hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-3">
              <MessageSquare className="w-6 h-6" /> 기획자 제안
            </button>
          </div>
          <p className="mt-8 text-gray-400 text-base font-bold italic">현재 베타 서비스 기간으로 모든 기능이 무료입니다.</p>
        </motion.div>
      </section>
    </div>
  );
}
