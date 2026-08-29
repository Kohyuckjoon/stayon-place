// import React, { useState } from 'react';

// // [RED: 스테이온 출동대 서비스 - 전체 풀 코드 (토스 스타일/메테리얼 디자인 적용)]
// export default function StayOnRescue() {
//   const [step, setStep] = useState(0); 
//   const [showOther, setShowOther] = useState(false);
//   const [formData, setFormData] = useState({
//     packageType: '', 
//     parts: [] as string[], 
//     location: '',
//     placeType: '',
//     otherPlace: '',
//     date: '',
//     time: '',
//     contact: ''
//   });

//   // [RED: 디자인 스타일 정의 - 토스 스타일의 클린하고 가독성 높은 디자인]
//   const cardStyle = "w-full p-6 text-left bg-white border border-gray-200 rounded-3xl shadow-sm hover:border-blue-500 transition-all active:scale-[0.98]";
//   const nextBtnStyle = "w-full py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all";
//   const titleStyle = "text-3xl font-extrabold text-gray-900 leading-tight mb-2";

//   // [RED: 전체 흐름 렌더링 로직]
//   const renderContent = () => {
//     switch (step) {
//       case 0: // Intro Page
//         return (
//           <div className="space-y-8 animate-in fade-in duration-500">
//             <div>
//               <h2 className={titleStyle}>악기와 음향 때문에<br />고민이신가요?</h2>
//               <p className="text-gray-500 text-lg">장소마다 상황은 다르지만, 우리가 해결하는 방식은 확실합니다.</p>
//             </div>
            
//             {/* [RED: 상황별 카드 리스트] */}
//             <div className="grid gap-3">
//               {[
//                 { title: '셋팅이 막막할 때', sub: '통째로 맡기거나, 일부만 세밀하게' },
//                 { title: '악기가 갑자기 고장 났을 때', sub: '긴급 수리 및 튜닝' },
//                 { title: '악기가 부족해서 급할 때', sub: '당일 렌탈 서비스' },
//                 { title: '소리가 이상하게 들릴 때', sub: '음향 밸런스 조율' }
//               ].map((item, i) => (
//                 <div key={i} className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
//                   <div className="font-bold text-blue-600">{item.title}</div>
//                   <div className="text-sm text-gray-600">{item.sub}</div>
//                 </div>
//               ))}
//             </div>

//             <div className="space-y-3">
//               <button onClick={() => setStep(1)} className={nextBtnStyle}>지금 바로 견적 요청하기</button>
//               <button className="w-full py-5 bg-gray-100 text-gray-800 rounded-2xl font-bold">전화로 상담 요청하기</button>
//             </div>
//             <p className="text-center text-sm text-gray-400">경기 남부 지역(이천, 용인, 광주, 성남, 여주) 전문가 즉시 출동</p>
//           </div>
//         );

//       case 1: // 서비스 선택
//         return (
//           <div className="space-y-6">
//             <h2 className="text-2xl font-extrabold">무엇을 도와드릴까요?</h2>
//             <div className="grid gap-4">
//               {['수리', '셋팅', '렌탈'].map((p) => (
//                 <button key={p} onClick={() => { setFormData({...formData, packageType: p}); setStep(2); }} className={cardStyle}>
//                   <div className="text-xl font-bold">{p} 서비스</div>
//                 </button>
//               ))}
//             </div>
//           </div>
//         );

//       case 2: // 지역 선택
//         return (
//           <div className="space-y-6">
//             <h2 className="text-2xl font-extrabold">어느 지역으로<br />출동할까요?</h2>
//             <div className="grid grid-cols-2 gap-3">
//               {['광주시', '여주시', '이천시', '성남시', '용인시'].map((loc) => (
//                 <button key={loc} onClick={() => { setFormData({...formData, location: loc}); setStep(3); }} className={cardStyle}>
//                   {loc}
//                 </button>
//               ))}
//             </div>
//           </div>
//         );

//       case 3: // 장소 특성
//         return (
//           <div className="space-y-6">
//             <h2 className="text-2xl font-extrabold">방문 장소의 특성을<br />알려주세요</h2>
//             <div className="grid gap-3">
//               {['교회 등 종교시설', '음악학원/연습실', '공연장', '카페', '기타'].map((p) => (
//                 <button key={p} onClick={() => { 
//                   setFormData({...formData, placeType: p}); 
//                   if(p === '기타') setShowOther(true); 
//                   else setStep(4); 
//                 }} className={cardStyle}>{p}</button>
//               ))}
//               {showOther && <input placeholder="상세 장소를 입력하세요" className="w-full p-4 border rounded-2xl" onBlur={() => setStep(4)} />}
//             </div>
//           </div>
//         );

//       case 4: // 일정 선택
//         return (
//           <div className="space-y-6">
//             <h2 className="text-2xl font-extrabold">방문 일정을<br />선택해주세요</h2>
//             <button className="w-full py-4 border-2 border-blue-500 text-blue-600 rounded-2xl font-bold">지금 당장</button>
//             <input type="date" className="w-full p-4 border rounded-2xl" onChange={(e) => setFormData({...formData, date: e.target.value})} />
//             <button onClick={() => setStep(5)} className={nextBtnStyle}>다음</button>
//           </div>
//         );

//       case 5: // 신청 완료
//         return (
//           <div className="text-center py-20 space-y-4">
//             <div className="text-6xl">✨</div>
//             <h2 className="text-3xl font-extrabold">신청 완료!</h2>
//             <p className="text-gray-500">전문가가 확인 후 곧 연락드릴게요.<br></br>(평균 30분 - 1시간 이내)</p>
//             <button onClick={() => setStep(0)} className={nextBtnStyle}>처음으로</button>
//           </div>
//         );
//     }
//   };

//   return (
//     <div className="max-w-md mx-auto p-6 min-h-screen bg-white">
//       {/* [RED: 상단 네비게이션 - 토스식 디자인] */}
//       {step > 0 && (
//         <div className="flex items-center mb-10 gap-4">
//           <button onClick={() => setStep(step - 1)} className="font-bold text-gray-500">뒤로</button>
//           <div className="flex-1 h-1 bg-gray-100 rounded-full">
//             <div className="h-full bg-blue-600 transition-all" style={{width: `${(step/5)*100}%`}}></div>
//           </div>
//         </div>
//       )}
//       {renderContent()}
//     </div>
//   );
// }


import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Wrench,
  Settings2,
  Package,
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  Volume2,
  ShoppingBag,
  Zap,
  AlertCircle,
  Check,
  Building2,
  GraduationCap,
  Coffee,
  Music2,
  MessageCircle,
  Star,
  Users,
  X,
  Camera,
} from "lucide-react";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
type View = "intro" | "quote" | "consultation";

interface QuoteData {
  service?: string;
  serviceDetail?: string;
  region?: string;
  subArea?: string;
  venueType?: string;
  venueCustom?: string;
  isUrgent?: boolean;
  year?: string;
  month?: string;
  day?: string;
  timeSlot?: string;
  phone?: string;
  name?: string;
}

interface ConsultNeeds {
  needs: string[];
  region: string;
  address: string;
  date: string;
  timeSlot: string;
  phone: string;
  name: string;
}

// ─────────────────────────────────────────
// Constants
// ─────────────────────────────────────────
const SUPPORTED_REGIONS = ["광주시", "여주시", "이천시", "성남시", "용인시"];

const SERVICES = [
  {
    id: "repair",
    icon: Wrench,
    label: "수리",
    desc: "긴급 수리 · 현장 출동",
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    details: [{ id: "emergency", label: "현장 긴급 수리", desc: "바로 출동해서 수리해요" }],
  },
  {
    id: "setup",
    icon: Settings2,
    label: "셋팅",
    desc: "전체 or 부분 음향 셋팅",
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    details: [
      { id: "full", label: "올인원 풀 패키지", desc: "전체 기획부터 설치까지" },
      { id: "partial", label: "부분 셋팅", desc: "특정 악기 · 음향만 최적화" },
    ],
  },
  {
    id: "rental",
    icon: Package,
    label: "렌탈",
    desc: "당일 배송 · 설치 확인",
    color: "text-green-500",
    bg: "bg-green-50",
    border: "border-green-200",
    details: [{ id: "single", label: "단품 렌탈", desc: "필요한 악기만 빌려드려요" }],
  },
];

const PROBLEM_CARDS = [
  { icon: Settings2, title: "셋팅이 막막할 때", desc: "통째로 맡기거나, 일부만 세밀하게", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: ShoppingBag, title: "악기 구매, 잘 모를 때", desc: "전문가가 함께 골라드려요", color: "text-purple-500", bg: "bg-purple-50" },
  { icon: Wrench, title: "악기가 갑자기 고장 났을 때", desc: "긴급 수리 · 튜닝 출동", color: "text-orange-500", bg: "bg-orange-50" },
  { icon: Package, title: "악기가 부족해서 급할 때", desc: "당일 렌탈 가능해요", color: "text-green-500", bg: "bg-green-50" },
  { icon: Volume2, title: "소리가 이상하게 들릴 때", desc: "음향 점검 · 전문 셋팅", color: "text-red-500", bg: "bg-red-50" },
  { icon: MapPin, title: "수련회 악기 · 음향이 필요할 때", desc: "이동 셋팅 + 렌탈 패키지", color: "text-teal-500", bg: "bg-teal-50" },
];

const TEAMS = [
  { icon: Settings2, name: "셋팅팀", desc: "현장 파악부터 최적화까지" },
  { icon: Package, name: "렌탈팀", desc: "당일 배송 및 설치 확인" },
  { icon: Wrench, name: "수리팀", desc: "현장 수리 → 완료 보고" },
];

const VENUE_TYPES = [
  { id: "church", label: "교회 등 종교시설", icon: Building2 },
  { id: "academy", label: "음악학원 · 연습실 · 실습실", icon: GraduationCap },
  { id: "stage", label: "공연장", icon: Star },
  { id: "center", label: "문화센터", icon: Users },
  { id: "cafe", label: "카페", icon: Coffee },
  { id: "other", label: "기타 (직접 입력)", icon: ChevronRight },
];

const TIME_SLOTS = ["오전 (9~12시)", "오후 (13~17시)", "저녁 (18~20시)", "시간 협의 필요"];

const CONSULT_NEEDS = [
  { id: "piano", label: "피아노", icon: Music2 },
  { id: "drum", label: "드럼", icon: Volume2 },
  { id: "electric", label: "기타 (일렉)", icon: Zap },
  { id: "bass", label: "기타 (베이스)", icon: Zap },
  { id: "acoustic", label: "기타 (어쿠스틱)", icon: Music2 },
  { id: "audio", label: "음향 점검 및 셋팅", icon: Settings2 },
  { id: "consult_only", label: "간단히 상담만", icon: MessageCircle },
];

const YEARS = ["2025", "2026"];
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1));

// ─────────────────────────────────────────
// Slide variants
// ─────────────────────────────────────────
const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};

// ─────────────────────────────────────────
// Shared Components
// ─────────────────────────────────────────
function StepHeader({
  step,
  total,
  onBack,
  title,
  badge,
}: {
  step: number;
  total: number;
  onBack: () => void;
  title: string;
  badge?: string;
}) {
  return (
    <div className="sticky top-0 z-10 bg-background pt-4 pb-3 px-5">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(step / total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            {step}/{total}
          </span>
        </div>
        {badge && (
          <div className="inline-flex items-center gap-1 bg-blue-50 text-primary px-2.5 py-1 rounded-full text-xs font-semibold mb-2">
            {badge}
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground leading-tight">{title}</h1>
      </div>
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-primary text-primary-foreground rounded-2xl py-4 text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-600 active:scale-[0.98] transition-all"
    >
      {children}
    </button>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border px-5 py-4">
      <div className="max-w-lg mx-auto">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────
// Intro Page
// ─────────────────────────────────────────
function IntroPage({ onQuote, onConsult }: { onQuote: () => void; onConsult: () => void }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <Music2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">StayOn</span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">악기 · 음향 전문 출장 서비스</span>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-5 pb-36">
        {/* Hero */}
        <section className="pt-8 pb-8">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-primary px-3 py-1.5 rounded-full text-xs font-bold mb-5 tracking-wide">
            <Zap className="w-3 h-3" />
            견적 신청 무료 · 빠른 출동
          </div>
          <h1 className="text-[2rem] font-black text-foreground leading-[1.25] mb-4">
            악기와 음향 때문에<br />
            <span className="text-primary">고민이신가요?</span>
          </h1>
          <div className="space-y-2.5 mb-5">
            {[
              { icon: Wrench, text: "급히 악기 수리가 필요하신가요?", color: "text-orange-400" },
              { icon: Volume2, text: "음향 셋팅이 필요하신가요?", color: "text-blue-400" },
              { icon: Package, text: "악기 렌탈이 급하게 필요하신가요?", color: "text-green-400" },
            ].map(({ icon: Icon, text, color }, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                <span className="text-base text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-base text-muted-foreground leading-relaxed">
            장소마다 상황은 다르지만,{" "}
            <span className="text-foreground font-bold">우리가 해결하는 방식은 확실합니다.</span>
          </p>
        </section>

        {/* Problem Cards */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-1">이런 상황이신가요?</h2>
          <p className="text-sm text-muted-foreground mb-4">아래 상황 중 하나라도 해당되신다면 저희가 해결해 드려요</p>
          <div className="grid grid-cols-2 gap-3">
            {PROBLEM_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="bg-card rounded-2xl p-4 shadow-sm border border-border hover:shadow-md transition-shadow"
                >
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <p className="text-sm font-bold text-foreground leading-snug mb-1">{card.title}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Urgent Banner */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-orange-500" />
              </div>
              <span className="text-sm font-bold text-orange-600">긴급 상황도 OK</span>
            </div>
            <div className="space-y-2.5">
              {[
                {
                  title: "수련회 준비 중이에요",
                  desc: "악기 + 음향 렌탈 패키지 (일부 포함)",
                },
                {
                  title: "내일 당장 악기가 필요해요",
                  desc: "고장 악기 긴급 수리 당일 출동",
                },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-orange-100">
                  <p className="text-sm font-bold text-foreground mb-0.5">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Service Details */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">제공하는 서비스</h2>
          <div className="space-y-3">
            {[
              {
                icon: Settings2,
                color: "text-blue-500",
                bg: "bg-blue-50",
                title: "셋팅",
                items: ["올인원 풀 패키지 (전체 기획 · 설치)", "부분 셋팅 (특정 악기 · 음향만 최적화)"],
              },
              {
                icon: Package,
                color: "text-green-500",
                bg: "bg-green-50",
                title: "렌탈",
                items: ["단품 렌탈 (필요한 악기만)", "당일 배송 및 설치 확인"],
              },
              {
                icon: Wrench,
                color: "text-orange-500",
                bg: "bg-orange-50",
                title: "수리",
                items: ["현장 긴급 수리", "문제 확인 → 현장 수리 → 완료 보고"],
              },
            ].map((svc, i) => {
              const Icon = svc.icon;
              return (
                <div key={i} className="bg-card rounded-2xl p-4 border border-border flex gap-4">
                  <div className={`w-11 h-11 rounded-xl ${svc.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${svc.color}`} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground mb-1.5">{svc.title}</p>
                    <div className="space-y-1">
                      {svc.items.map((item, j) => (
                        <div key={j} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <span className="text-xs text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Teams */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-1">스테이온은 이 팀이 직접 움직입니다</h2>
          <p className="text-sm text-muted-foreground mb-4">전문 팀이 직접 방문해서 해결해 드려요</p>
          <div className="grid grid-cols-3 gap-3">
            {TEAMS.map((team, i) => {
              const Icon = team.icon;
              return (
                <div key={i} className="bg-card rounded-2xl p-4 border border-border text-center shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-bold text-foreground mb-1">{team.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{team.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Trust signal */}
        <div className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3 mb-2">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">이천 · 용인 · 광주 · 성남 · 여주</p>
            <p className="text-xs text-muted-foreground">경기도 지역 전문가들이 바로 달려갑니다</p>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-border px-5 py-4">
        <div className="max-w-lg mx-auto space-y-2.5">
          <button
            onClick={onQuote}
            className="w-full bg-primary text-white rounded-2xl py-4 text-base font-bold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-lg shadow-blue-200"
          >
            지금 바로 견적 요청하기
          </button>
          <button
            onClick={onConsult}
            className="w-full bg-card text-foreground rounded-2xl py-3.5 text-base font-semibold border border-border hover:bg-muted active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            전화로 상담 요청하기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Quote Steps
// ─────────────────────────────────────────
function Step1Service({
  data,
  onNext,
  onBack,
}: {
  data: Partial<QuoteData>;
  onNext: (d: Partial<QuoteData>) => void;
  onBack: () => void;
}) {
  const [selectedService, setSelectedService] = useState(data.service ?? "");
  const [selectedDetail, setSelectedDetail] = useState(data.serviceDetail ?? "");
  const svc = SERVICES.find((s) => s.id === selectedService);
  const canProceed = selectedService && (!svc || svc.details.length === 0 || selectedDetail);

  const handleServiceClick = (id: string) => {
    setSelectedService(id);
    setSelectedDetail("");
    const s = SERVICES.find((x) => x.id === id);
    if (s && s.details.length === 1) setSelectedDetail(s.details[0].id);
  };

  return (
    <div className="min-h-screen bg-background">
      <StepHeader
        step={1}
        total={5}
        onBack={onBack}
        title={"무엇을 도와드릴까요?"}
        badge="견적 신청 무료"
      />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-5">
        <p className="text-sm text-muted-foreground mb-6">원하는 서비스를 선택해주세요.</p>
        <div className="space-y-3 mb-8">
          {SERVICES.map((svc) => {
            const Icon = svc.icon;
            const isSelected = selectedService === svc.id;
            return (
              <div key={svc.id}>
                <button
                  onClick={() => handleServiceClick(svc.id)}
                  className={`w-full rounded-2xl p-5 border-2 text-left transition-all flex items-center gap-4 ${
                    isSelected
                      ? "border-primary bg-blue-50/60"
                      : "border-border bg-card hover:border-primary/30 hover:bg-blue-50/20"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl ${svc.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${svc.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-foreground">{svc.label}</p>
                    <p className="text-sm text-muted-foreground">{svc.desc}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? "border-primary bg-primary" : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>

                {/* Sub-options */}
                {isSelected && svc.details.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 space-y-2 pl-4"
                  >
                    {svc.details.map((detail) => {
                      const isSel = selectedDetail === detail.id;
                      return (
                        <button
                          key={detail.id}
                          onClick={() => setSelectedDetail(detail.id)}
                          className={`w-full rounded-xl p-4 border-2 text-left transition-all flex items-center gap-3 ${
                            isSel ? "border-primary bg-blue-50/60" : "border-border bg-card hover:border-primary/30"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSel ? "border-primary bg-primary" : "border-border"
                            }`}
                          >
                            {isSel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{detail.label}</p>
                            <p className="text-xs text-muted-foreground">{detail.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <BottomBar>
        <PrimaryButton
          onClick={() => onNext({ service: selectedService, serviceDetail: selectedDetail })}
          disabled={!canProceed}
        >
          다음으로
        </PrimaryButton>
      </BottomBar>
    </div>
  );
}

function Step2Region({
  data,
  onNext,
  onBack,
}: {
  data: Partial<QuoteData>;
  onNext: (d: Partial<QuoteData>) => void;
  onBack: () => void;
}) {
  const [region, setRegion] = useState(data.region ?? "");
  const [subArea, setSubArea] = useState(data.subArea ?? "");
  const isUnsupported = region && !SUPPORTED_REGIONS.includes(region);
  const canProceed = region && SUPPORTED_REGIONS.includes(region) && subArea.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <StepHeader step={2} total={5} onBack={onBack} title="방문 지역을 선택해주세요" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-5">
        <p className="text-sm text-muted-foreground mb-6">
          현재{" "}
          <span className="text-foreground font-semibold">경기도 5개 시</span>에서 서비스가 가능해요.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[...SUPPORTED_REGIONS, "기타 지역"].map((r) => {
            const isSelected = region === r || (r === "기타 지역" && isUnsupported);
            return (
              <button
                key={r}
                onClick={() => { setRegion(r === "기타 지역" ? "기타" : r); setSubArea(""); }}
                className={`rounded-2xl py-4 px-4 text-left border-2 transition-all ${
                  isSelected ? "border-primary bg-blue-50/60" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>{r}</span>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                {r !== "기타 지역" && <p className="text-xs text-muted-foreground mt-0.5">경기도 {r}</p>}
              </button>
            );
          })}
        </div>

        {isUnsupported && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-5 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-700">아쉽게도 준비 중이에요</p>
              <p className="text-xs text-orange-600 mt-0.5">
                현재는 경기도 5개 시만 서비스 가능해요. 빠르게 확장하고 있어요!
              </p>
            </div>
          </motion.div>
        )}

        {region && SUPPORTED_REGIONS.includes(region) && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <label className="block text-sm font-bold text-foreground mb-2">
              읍 / 면 / 동을 입력해주세요
            </label>
            <input
              value={subArea}
              onChange={(e) => setSubArea(e.target.value)}
              placeholder="예) 중부면, 신갈동, 판교동"
              className="w-full bg-card border-2 border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </motion.div>
        )}
      </div>
      <BottomBar>
        <PrimaryButton
          onClick={() => onNext({ region, subArea })}
          disabled={!canProceed}
        >
          다음으로
        </PrimaryButton>
      </BottomBar>
    </div>
  );
}

function Step3Venue({
  data,
  onNext,
  onBack,
}: {
  data: Partial<QuoteData>;
  onNext: (d: Partial<QuoteData>) => void;
  onBack: () => void;
}) {
  const [venueType, setVenueType] = useState(data.venueType ?? "");
  const [venueCustom, setVenueCustom] = useState(data.venueCustom ?? "");
  const canProceed = venueType && (venueType !== "other" || venueCustom.trim().length > 0);

  return (
    <div className="min-h-screen bg-background">
      <StepHeader step={3} total={5} onBack={onBack} title="장소 특성을 알려주세요" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-5">
        <p className="text-sm text-muted-foreground mb-6">방문할 장소 유형을 선택해주세요.</p>
        <div className="space-y-2.5">
          {VENUE_TYPES.map((v) => {
            const Icon = v.icon;
            const isSelected = venueType === v.id;
            return (
              <button
                key={v.id}
                onClick={() => { setVenueType(v.id); setVenueCustom(""); }}
                className={`w-full rounded-2xl p-4 border-2 text-left transition-all flex items-center gap-3 ${
                  isSelected ? "border-primary bg-blue-50/60" : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-primary" : "bg-muted"}`}>
                  <Icon className={`w-4 h-4 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                </div>
                <span className={`text-base font-semibold flex-1 ${isSelected ? "text-primary" : "text-foreground"}`}>{v.label}</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? "border-primary bg-primary" : "border-border"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>

        {venueType === "other" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <input
              value={venueCustom}
              onChange={(e) => setVenueCustom(e.target.value)}
              placeholder="장소 유형을 직접 입력해주세요"
              autoFocus
              className="w-full bg-card border-2 border-primary rounded-xl px-4 py-3.5 text-base text-foreground placeholder-muted-foreground focus:outline-none transition-colors"
            />
          </motion.div>
        )}
      </div>
      <BottomBar>
        <PrimaryButton
          onClick={() => onNext({ venueType, venueCustom })}
          disabled={!canProceed}
        >
          다음으로
        </PrimaryButton>
      </BottomBar>
    </div>
  );
}

function Step4Schedule({
  data,
  onNext,
  onBack,
}: {
  data: Partial<QuoteData>;
  onNext: (d: Partial<QuoteData>) => void;
  onBack: () => void;
}) {
  const [isUrgent, setIsUrgent] = useState(data.isUrgent ?? false);
  const [year, setYear] = useState(data.year ?? "2026");
  const [month, setMonth] = useState(data.month ?? "");
  const [day, setDay] = useState(data.day ?? "");
  const [timeSlot, setTimeSlot] = useState(data.timeSlot ?? "");
  const [phone, setPhone] = useState(data.phone ?? "");
  const [name, setName] = useState(data.name ?? "");

  const canProceed = (isUrgent || (month && day && timeSlot)) && phone.length >= 10 && name.trim().length > 0;

  const handleUrgent = () => {
    setIsUrgent(true);
    setMonth("");
    setDay("");
    setTimeSlot("시간 협의 필요");
  };

  return (
    <div className="min-h-screen bg-background">
      <StepHeader step={4} total={5} onBack={onBack} title="방문 일정을 알려주세요" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-5">
        {/* Urgent button */}
        <button
          onClick={handleUrgent}
          className={`w-full rounded-2xl p-4 border-2 mb-6 transition-all flex items-center gap-3 ${
            isUrgent ? "border-orange-400 bg-orange-50" : "border-border bg-card hover:border-orange-300"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUrgent ? "bg-orange-400" : "bg-orange-50"}`}>
            <Zap className={`w-5 h-5 ${isUrgent ? "text-white" : "text-orange-400"}`} />
          </div>
          <div className="text-left">
            <p className={`text-base font-bold ${isUrgent ? "text-orange-600" : "text-foreground"}`}>지금 당장 필요해요!</p>
            <p className="text-xs text-muted-foreground">긴급 출동 요청 — 전문가가 최대한 빠르게 연락드려요</p>
          </div>
          {isUrgent && <Check className="w-5 h-5 text-orange-500 ml-auto shrink-0" />}
        </button>

        {!isUrgent && (
          <>
            <p className="text-sm font-bold text-foreground mb-3">방문 날짜</p>
            <div className="flex gap-2 mb-3">
              {YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => setYear(y)}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold border-2 transition-all ${
                    year === y ? "border-primary bg-blue-50 text-primary" : "border-border bg-card text-foreground"
                  }`}
                >
                  {y}년
                </button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1.5 mb-3">
              {MONTHS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMonth(m)}
                  className={`rounded-xl py-2.5 text-xs font-semibold border-2 transition-all ${
                    month === m ? "border-primary bg-blue-50 text-primary" : "border-border bg-card text-foreground"
                  }`}
                >
                  {m}월
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-bold text-foreground whitespace-nowrap">일 선택</span>
              <input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="예) 15"
                className="flex-1 bg-card border-2 border-border rounded-xl px-4 py-3 text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </>
        )}

        <p className="text-sm font-bold text-foreground mb-3">선호 시간대</p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              onClick={() => setTimeSlot(t)}
              className={`rounded-xl py-3 px-3 text-xs font-semibold border-2 transition-all ${
                timeSlot === t ? "border-primary bg-blue-50 text-primary" : "border-border bg-card text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <p className="text-sm font-bold text-foreground mb-3">연락처</p>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="w-full bg-card border-2 border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="전화번호 (예: 01012345678)"
            type="tel"
            maxLength={11}
            className="w-full bg-card border-2 border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>
      <BottomBar>
        <PrimaryButton
          onClick={() => onNext({ isUrgent, year, month, day, timeSlot, phone, name })}
          disabled={!canProceed}
        >
          다음으로
        </PrimaryButton>
      </BottomBar>
    </div>
  );
}

function Step5Photo({
  data,
  onNext,
  onBack,
}: {
  data: Partial<QuoteData>;
  onNext: (d: Partial<QuoteData>) => void;
  onBack: () => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => {
      const url = URL.createObjectURL(f);
      setPhotos((prev) => [...prev, url]);
    });
  };

  const svc = SERVICES.find((s) => s.id === data.service);

  return (
    <div className="min-h-screen bg-background">
      <StepHeader step={5} total={5} onBack={onBack} title="사진을 첨부해주세요" />
      <div className="max-w-lg mx-auto px-5 pb-32 pt-5">
        <p className="text-sm text-muted-foreground mb-6">
          현장 사진을 보내주시면 더 정확한 견적을 드릴 수 있어요.{" "}
          <span className="text-foreground font-semibold">선택 사항이에요.</span>
        </p>

        {/* Summary card */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">신청 내용 요약</p>
          <div className="space-y-2.5">
            {[
              { label: "서비스", value: svc ? `${svc.label}` : data.service },
              { label: "지역", value: data.region ? `경기도 ${data.region} ${data.subArea}` : "-" },
              { label: "장소", value: VENUE_TYPES.find((v) => v.id === data.venueType)?.label ?? data.venueCustom ?? "-" },
              {
                label: "일정",
                value: data.isUrgent
                  ? "지금 당장 (긴급)"
                  : `${data.year}.${String(data.month).padStart(2, "0")}.${String(data.day).padStart(2, "0")} · ${data.timeSlot}`,
              },
              { label: "연락처", value: data.phone ? `${data.name} · ${data.phone}` : "-" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="text-xs text-muted-foreground w-12 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm font-semibold text-foreground flex-1">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Photo upload */}
        <label className="flex flex-col items-center justify-center w-full h-36 rounded-2xl border-2 border-dashed border-border bg-card cursor-pointer hover:border-primary/40 hover:bg-blue-50/20 transition-all mb-4">
          <Camera className="w-7 h-7 text-muted-foreground mb-2" />
          <span className="text-sm font-semibold text-muted-foreground">사진 추가하기</span>
          <span className="text-xs text-muted-foreground/60 mt-1">최대 5장</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
        </label>

        {photos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {photos.map((src, i) => (
              <div key={i} className="w-20 h-20 rounded-xl overflow-hidden relative border border-border">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomBar>
        <PrimaryButton onClick={() => onNext({})}>견적 신청 완료하기</PrimaryButton>
      </BottomBar>
    </div>
  );
}

function Step6Complete({ onHome }: { onHome: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="max-w-lg mx-auto px-5 flex-1 flex flex-col items-center justify-center text-center py-20">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
          className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h1 className="text-2xl font-black text-foreground mb-3">신청 완료!</h1>
          <p className="text-base text-muted-foreground mb-2 leading-relaxed">
            견적 신청이 접수되었어요. 🎉
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            전문가가 곧 연락드릴 거예요.<br />
            <span className="text-foreground font-semibold">문자 · 카카오톡</span>으로 알림을 보내드려요.
          </p>

          <div className="bg-card rounded-2xl border border-border p-5 text-left mb-8 w-full max-w-xs mx-auto">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">다음 단계</p>
            {[
              { num: "1", text: "전문가가 연락처로 연락드려요" },
              { num: "2", text: "현장 상황을 확인하고 견적을 드려요" },
              { num: "3", text: "일정을 확정하고 방문해요" },
            ].map((item) => (
              <div key={item.num} className="flex items-start gap-3 mb-3 last:mb-0">
                <div className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.num}
                </div>
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onHome}
            className="w-full max-w-xs mx-auto bg-primary text-white rounded-2xl py-4 text-base font-bold hover:bg-blue-600 active:scale-[0.98] transition-all"
          >
            홈으로 돌아가기
          </button>
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Quote Page router
// ─────────────────────────────────────────
function QuotePage({
  step,
  data,
  onNext,
  onBack,
  onHome,
}: {
  step: number;
  data: Partial<QuoteData>;
  onNext: (d: Partial<QuoteData>) => void;
  onBack: () => void;
  onHome: () => void;
}) {
  if (step === 1) return <Step1Service data={data} onNext={onNext} onBack={onBack} />;
  if (step === 2) return <Step2Region data={data} onNext={onNext} onBack={onBack} />;
  if (step === 3) return <Step3Venue data={data} onNext={onNext} onBack={onBack} />;
  if (step === 4) return <Step4Schedule data={data} onNext={onNext} onBack={onBack} />;
  if (step === 5) return <Step5Photo data={data} onNext={onNext} onBack={onBack} />;
  if (step === 6) return <Step6Complete onHome={onHome} />;
  return null;
}

// ─────────────────────────────────────────
// Consultation Page
// ─────────────────────────────────────────
function ConsultPage({ onBack }: { onBack: () => void }) {
  const [done, setDone] = useState(false);
  const [needs, setNeeds] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");

  const toggleNeed = (id: string) =>
    setNeeds((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));

  const canSubmit = needs.length > 0 && region && phone.length >= 10 && name.trim().length > 0;

  if (done) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
          className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-5"
        >
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-2xl font-black text-foreground mb-2">상담 신청 완료!</h2>
          <p className="text-base text-muted-foreground mb-8 leading-relaxed">
            전문가가 빠르게 연락드릴게요.
          </p>
          <button
            onClick={onBack}
            className="bg-primary text-white rounded-2xl py-4 px-8 text-base font-bold hover:bg-blue-600 active:scale-[0.98] transition-all"
          >
            홈으로 돌아가기
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background pt-4 pb-3 px-5 border-b border-border">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">전화 상담 요청</h1>
            <p className="text-xs text-muted-foreground">정보를 입력하시면 전문가가 연락드려요</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pb-32 pt-6">
        {/* Needs multi-select */}
        <section className="mb-7">
          <h2 className="text-base font-bold text-foreground mb-1">어떤 도움이 필요하신가요?</h2>
          <p className="text-xs text-muted-foreground mb-4">복수 선택 가능해요</p>
          <div className="flex flex-wrap gap-2">
            {CONSULT_NEEDS.map((n) => {
              const Icon = n.icon;
              const isSelected = needs.includes(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => toggleNeed(n.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-semibold transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {n.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Region */}
        <section className="mb-7">
          <h2 className="text-base font-bold text-foreground mb-4">지역 정보</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-2">지역 선택</label>
              <div className="grid grid-cols-3 gap-2">
                {SUPPORTED_REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRegion(r)}
                    className={`rounded-xl py-2.5 text-sm font-semibold border-2 transition-all ${
                      region === r ? "border-primary bg-blue-50 text-primary" : "border-border bg-card text-foreground"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-2">세부 주소</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="읍/면/동 또는 상세 주소"
                className="w-full bg-card border-2 border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Schedule */}
        <section className="mb-7">
          <h2 className="text-base font-bold text-foreground mb-4">방문 희망 일정</h2>
          <div className="space-y-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-card border-2 border-border rounded-xl px-4 py-3.5 text-base text-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeSlot(t)}
                  className={`rounded-xl py-3 text-xs font-semibold border-2 transition-all ${
                    timeSlot === t ? "border-primary bg-blue-50 text-primary" : "border-border bg-card text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-7">
          <h2 className="text-base font-bold text-foreground mb-4">연락처</h2>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              className="w-full bg-card border-2 border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="전화번호 (예: 01012345678)"
              type="tel"
              maxLength={11}
              className="w-full bg-card border-2 border-border rounded-xl px-4 py-3.5 text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </section>
      </div>

      <BottomBar>
        <PrimaryButton onClick={() => setDone(true)} disabled={!canSubmit}>
          상담 신청하기
        </PrimaryButton>
      </BottomBar>
    </div>
  );
}

// ─────────────────────────────────────────
// App
// ─────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<View>("intro");
  const [quoteStep, setQuoteStep] = useState(1);
  const [quoteData, setQuoteData] = useState<Partial<QuoteData>>({});
  const [dir, setDir] = useState(1);

  const goQuote = () => {
    setView("quote");
    setQuoteStep(1);
    setQuoteData({});
    setDir(1);
  };
  const goConsult = () => setView("consultation");
  const goIntro = () => {
    setView("intro");
    setDir(-1);
  };

  const handleNext = (data: Partial<QuoteData>) => {
    setQuoteData((prev) => ({ ...prev, ...data }));
    setDir(1);
    setQuoteStep((s) => s + 1);
  };
  const handleBack = () => {
    setDir(-1);
    if (quoteStep <= 1) {
      goIntro();
    } else {
      setQuoteStep((s) => s - 1);
    }
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
    >
      <AnimatePresence mode="wait" custom={dir}>
        {view === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <IntroPage onQuote={goQuote} onConsult={goConsult} />
          </motion.div>
        )}
        {view === "quote" && (
          <motion.div
            key={`quote-${quoteStep}`}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <QuotePage
              step={quoteStep}
              data={quoteData}
              onNext={handleNext}
              onBack={handleBack}
              onHome={goIntro}
            />
          </motion.div>
        )}
        {view === "consultation" && (
          <motion.div
            key="consultation"
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -48 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <ConsultPage onBack={goIntro} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
