import { Header } from "../components/Header";
import { 
  Shield, 
  FileCheck, 
  Eye, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Check,
  Lock,
  ArrowRight,
  Ban,
  Scale
} from "lucide-react";
import { motion, Variants } from "framer-motion";
import { ScrollRestoration } from "react-router-dom";
import { useNavigate } from "react-router-dom"; // 이 줄이 있는지 확인하세요

export function About() {
  const faderVariants: Variants = {
    initial: { opacity: 0, y: 30 },
    whileInView: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const staggerContainer: Variants = {
    initial: { opacity: 0 },
    whileInView: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const navigate = useNavigate();
  const handleStart = () => {
    // 필요한 경우 여기에 로그 함수 실행
    // handleLogAction("장소 찾아보기 클릭"); 
    navigate("/venues");
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased text-gray-900 selection:bg-blue-100 selection:text-blue-700">
      <ScrollRestoration />

      {/* [1] Hero: 신뢰의 첫인상 */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-blue-50/50 to-transparent -z-10" />
        
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full mb-8"
          >
            <Shield className="w-4 h-4 fill-current" />
            <span className="text-[13px] font-bold tracking-tight">StayOn 안심 보완 시스템</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black mb-8 leading-[1.2] tracking-tight text-gray-950"
          >
            장소 고민은 스테이온에 맡기고, <br />
            <span className="text-blue-600">사역의 본질</span>에만 집중하세요.
          </motion.h1>

          {/* 에러가 났던 지점 수정: motion.p로 열고 motion.p로 닫음 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto mb-12"
          >
            스테이온은 단순한 중개를 하지 않습니다. <br className="hidden md:block" />
            이단 방지부터 시설 안전까지, 기획자가 직접 검증한 장소만 엄선합니다.
          </motion.p>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="whileInView"
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: "이단 사고율", value: "0%", color: "text-blue-600" },
              { label: "교단 검증", value: "100%", color: "text-blue-600" },
              { label: "현장 실사", value: "필수", color: "text-gray-900" },
              { label: "정기 갱신", value: "6개월", color: "text-gray-900" },
            ].map((stat, i) => (
              <div key={i} className="bg-white border border-gray-100 p-6 rounded-[32px] shadow-sm">
                <div className={`text-2xl font-black ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* [2] Core Values */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div variants={faderVariants} initial="initial" whileInView="whileInView">
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-8 leading-tight">
                "안전한 수련회 장소,<br />찾기 너무 막막하셨죠?"
              </h2>
              <div className="space-y-6">
                {[
                  { title: "검증되지 않은 이단 시설 방지", desc: "주요 교단이 금지한 이단 관련 시설을 원천 차단합니다." },
                  { title: "파편화된 정보의 통합", desc: "시설 현황, 가용 인원, 주변 환경까지 한눈에 확인하세요." },
                  { title: "행정 업무의 간소화", desc: "검증 서류 준비 시간을 획기적으로 줄여드립니다." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="mt-1 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-gray-500 text-sm leading-relaxed font-medium">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              variants={faderVariants} 
              initial="initial" 
              whileInView="whileInView"
              className="relative bg-white p-8 rounded-[48px] shadow-2xl shadow-blue-200/50 border border-blue-50"
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl rotate-12">
                <Award className="w-10 h-10" />
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <Lock className="w-6 h-6 text-gray-900" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-blue-600 uppercase mb-1">Status</div>
                    <div className="text-xl font-black">StayOn Verified</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-blue-600" />
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-gray-400">검증 프로세스 완료</span>
                    <span className="text-blue-600">100%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 font-medium leading-relaxed italic text-center">
                  "본 장소는 스테이온의 3단계 검증을 모두 통과하였으며, 사역에 최적화된 안전한 환경임을 보증합니다."
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* [3] Verification Steps */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div variants={faderVariants} initial="initial" whileInView="whileInView" className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight text-gray-950">빈틈없는 3단계 검증 시스템</h2>
            <p className="text-gray-500 font-medium text-lg">가장 까다로운 기준으로 가장 안전한 장소를 고릅니다.</p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                step: "Step 01",
                title: "서류 및 소속 검증",
                icon: FileCheck,
                desc: "운영 주체의 교단 소속과 사업자 등록 여부를 철저히 확인합니다.",
                items: ["교단 소속 증명서 확인", "사업자 운영 허가 검토", "최근 사고 이력 점검"]
              },
              {
                step: "Step 02",
                title: "이단 블랙리스트 대조",
                icon: AlertTriangle,
                desc: "공신력 있는 이단 상담소 및 교단 리스트를 통해 위험 요소를 차단합니다.",
                items: ["이단 상담소 자료 연동", "블랙리스트 실시간 대조", "운영 사상 배경 검증"]
              },
              {
                step: "Step 03",
                title: "운영진 현장 실사",
                icon: Eye,
                desc: "스테이온 매니저가 직접 방문하여 시설과 위생 상태를 최종 점검합니다.",
                items: ["직접 방문 시설 점검", "안전/위생 가이드 준수", "인증 배지 최종 부여"]
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={faderVariants}
                initial="initial"
                whileInView="whileInView"
                className="group relative bg-white p-10 rounded-[48px] border border-gray-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500"
              >
                <div className="text-xs font-black text-gray-300 mb-6 group-hover:text-blue-500 transition-colors uppercase tracking-widest">{item.step}</div>
                <div className={`w-16 h-16 bg-gray-50 rounded-[24px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-8 h-8 text-gray-900" />
                </div>
                <h3 className="text-2xl font-black text-gray-950 mb-4">{item.title}</h3>
                <p className="text-gray-500 text-[15px] leading-relaxed mb-8 font-medium">{item.desc}</p>
                <ul className="space-y-4 pt-8 border-t border-gray-50">
                  {item.items.map((point, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-bold text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 신천지/이단 원천 차단 및 전통교단 등록 원칙 안내 섹션 추가 */}
      <section className="py-20 px-6 bg-gradient-to-b from-white to-red-50/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={faderVariants}
            initial="initial"
            whileInView="whileInView"
            className="bg-white border-2 border-red-100 rounded-[48px] p-8 md:p-14 shadow-xl shadow-red-500/5 relative overflow-hidden"
          >
            {/* 상단 장식 태그 */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full">
                <Ban className="w-4 h-4" />
                <span className="text-[13px] font-black tracking-tight">이단 · 신천지 원천 차단 정책</span>
              </div>
              <div className="text-xs font-bold text-gray-400 bg-gray-50 px-3.5 py-1.5 rounded-full">
                정통교단 전용 플랫폼
              </div>
            </div>

            <div className="grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-6">
                <h3 className="text-2xl md:text-4xl font-black text-gray-950 leading-tight">
                  신천지 및 이단 추수꾼의 출입을 <br />
                  <span className="text-red-600">철저히 금지</span>합니다.
                </h3>
                <p className="text-gray-600 text-base md:text-lg font-medium leading-relaxed">
                  스테이온은 대한예수교장로회(합동·통합), 기독교대한감리회(기감), 기독교대한성결교회(성결교) 등 <strong className="text-gray-950 font-bold">공식 한국 주요 전통교단 소속 및 초교파 바른 신앙을 가진 안전한 장소</strong>만 등록됩니다.
                </p>

                {/* 전통교단 안내 뱃지 리스트 */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["예장합동", "예장통합", "기독교대한감리회", "기독교대한성결교회", "등등..."].map((tag, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[11px] font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 우측 법적 조치 안내 카드 (토스풍 미니멀 박스) */}
              <div className="md:col-span-5 bg-gray-950 text-white p-6 md:p-8 rounded-[32px] shadow-lg flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-600/20 rounded-2xl flex items-center justify-center text-red-400">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-red-400 uppercase tracking-widest">Legal Notice</div>
                    <div className="text-base font-black">무단 출입 및 적발 시</div>
                  </div>
                </div>
                <p className="text-xs md:text-sm text-gray-300 font-medium leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
                  적발 시 예배 및 설교 방해죄(형법 제158조), 퇴거불응죄(형법 제319조 2항), 업무방해죄(형법 제314조), 개인정보보호법 위반 등의 <strong className="text-white font-bold">가능한 모든 법적 조치</strong>를 엄중히 취하겠습니다.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* [4] CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={faderVariants}
            initial="initial"
            whileInView="whileInView"
            className="bg-gray-950 rounded-[60px] p-10 md:p-20 text-white relative overflow-hidden shadow-2xl shadow-gray-200"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full -mr-32 -mt-32"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
              <div className="text-center md:text-left flex-1">
                <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight">
                  안전은 타협하지 <br />않겠습니다.
                </h2>
                <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed mb-10">
                  스테이온 인증 배지는 단순한 마크가 아닙니다.<br className="hidden md:block" />
                  기획자가 직접 발로 뛰어 안전함을 확인했다는 약속입니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <button 
                  onClick={handleStart}
                  className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                    장소 찾아보기
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button 
                  onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSemG4_fbEYEct7zo9tZ2EN-cY-Jg5pP63ODqDkRNEhq0l47yQ/viewform?usp=publish-editor", "_blank")}
                  className="px-10 py-5 bg-white/10 hover:bg-white/20 text-white rounded-[24px] font-black text-lg transition-all backdrop-blur-md">
                    문의하기
                  </button>
                </div>
              </div>
              <div className="shrink-0 w-56 h-56 md:w-72 md:h-72 bg-gradient-to-br from-blue-500 to-blue-700 rounded-[56px] flex flex-col items-center justify-center shadow-2xl rotate-3">
                <Award className="w-24 h-24 md:w-32 md:h-32 text-white mb-2" />
                <span className="font-black text-blue-100 text-lg">STAY ON</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* [5] Simple Footer */}
      <footer className="py-20 px-6 border-t border-gray-100 text-center md:text-left">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="w-4 h-4 text-white fill-current" />
              </div>
              <span className="font-black text-xl tracking-tighter text-gray-950">수련회 장소 큐레이션 / StayOn Place</span>
            </div>
            <p className="text-gray-400 text-sm font-bold">© 2026 StayOn Place. 수련회 / 세미나 모든 사역의 안전한 시작.</p>
          </div>
          <div className="flex gap-8 text-gray-400 text-[13px] font-black uppercase tracking-widest">
            <button className="hover:text-blue-600 transition-colors">Terms</button>
            <button className="hover:text-blue-600 transition-colors">Privacy</button>
            <button className="hover:text-blue-600 transition-colors">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
