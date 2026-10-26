import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  FileText,
  PhoneCall,
  MapPin,
  CheckCircle,
  Calendar,
  AlertTriangle,
  Heart,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

export default function BookingGuide() {
  const navigate = useNavigate();

  // 장소 상세페이지 등 다른 화면에서 스크롤을 한참 내린 채로 이 페이지로 들어오면,
  // SPA 특성상 스크롤 위치가 그대로 유지돼서 화면 하단부터 보이는 문제가 있었다.
  // 페이지가 열릴 때 항상 맨 위부터 보이게 고정한다.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const steps = [
    {
      number: 1,
      title: "장소 찾기",
      description: "스테이온에서 수련회 목적과 인원에 맞는 최적의 장소를 검색하고 선택합니다.",
      icon: <Search className="w-5 h-5 text-[#3182F6]" />,
    },
    {
      number: 2,
      title: "예약 및 상담 신청",
      description: "신청자 정보, 교회명, 연락처, 예상 인원 등을 기재하여 신청서를 제출합니다.",
      icon: <FileText className="w-5 h-5 text-[#3182F6]" />,
    },
    {
      number: 3,
      title: "사전답사 가능 여부 확인",
      description: "운영자가 장소 제공자와 확인 후 개별 연락을 드립니다. 예약 진행을 위해 가능한 사전답사를 꼭 진행해 주세요.",
      icon: <PhoneCall className="w-5 h-5 text-[#3182F6]" />,
      subNotes: [
        "사전답사 없이 진행 시 발생하는 모든 책임은 신청자에게 있습니다.",
        "일부 장소 사전답사가 불필요한 경우에는 카카오 플러스 친구 '스테이온'에 문의 주시면 사전답사에서 최종 예약 진행 상태로 변경해드립니다.",
        "사전답사 시에, 장소 제공자의 연락처가 노출되게 됩니다."
      ]
    },
    {
      number: 4,
      title: "사전답사 완료 체크",
      description: "장소를 직접 확인하신 후, 마이페이지에서 사전답사 완료 버튼을 클릭해주세요. (실제로 사전답사를 다녀오신 장소만 완료 버튼을 눌러주세요.)",
      icon: <MapPin className="w-5 h-5 text-[#3182F6]" />,
    },
    {
      number: 5,
      title: "예약금 결제 후 최종 완료",
      description: "사전답사 완료 이후에는 별도의 복잡한 절차 없이 예약금 결제 후 장소 사용 신청이 완료됩니다.",
      icon: <CheckCircle className="w-5 h-5 text-[#10B981]" />,
    },
    {
      number: 6,
      title: "수련회 안내 문자 발송",
      description: "최종 완료일 이전 1주일전 카카오톡으로 수련회 안내 문자를 발송해드립니다.",
      icon: <Calendar className="w-5 h-5 text-[#8B5CF6]" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F2F4F6] py-6 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">

        {/* 뒤로가기 - 장소 상세페이지 등 이전 화면으로 그대로 돌아갈 수 있게.
            navigate(-1)이라 "어디서 왔는지"와 무관하게 항상 바로 직전 화면으로 돌아간다. */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-[#4E5968] hover:text-[#191F28] transition-all font-bold group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[15px]">뒤로가기</span>
        </button>

        {/* 토스 스타일의 메인 타이틀 헤더 */}
        <div className="bg-white rounded-3xl p-5 sm:p-10 shadow-sm border border-[#E5E8EB]/60">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#3182F6] mb-4">
            가이드
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#191F28] tracking-tight leading-tight">
            수련회 장소를 <br />
            <span className="text-[#3182F6]">예약하는 전체 절차</span>입니다
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#4E5968] font-medium leading-relaxed">
            처음 오셨나요? 스테이온이 제공하는 투명하고 직관적인 6단계 프로세스를 따라 쉽고 안전하게 예약을 완료해 보세요.
          </p>

          {/* 한눈에 보는 요약 인디케이터 배너 (직관성 극대화) */}
          <div className="mt-6 pt-5 sm:mt-8 sm:pt-6 border-t border-[#F2F4F6] flex items-center justify-between overflow-x-auto gap-2 no-scrollbar text-[11px] font-bold text-[#8B95A1]">
            <div className="flex items-center gap-1 flex-shrink-0 text-[#3182F6]">
              <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">1</span>
              <span>찾기</span>
            </div>
            <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#D1D6DB]" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="w-5 h-5 rounded-full bg-[#F2F4F6] flex items-center justify-center">2</span>
              <span>신청</span>
            </div>
            <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#D1D6DB]" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="w-5 h-5 rounded-full bg-[#F2F4F6] flex items-center justify-center">3</span>
              <span>답사 확인</span>
            </div>
            <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#D1D6DB]" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="w-5 h-5 rounded-full bg-[#F2F4F6] flex items-center justify-center">4</span>
              <span>답사 완료</span>
            </div>
            <ChevronRight className="w-3 h-3 flex-shrink-0 text-[#D1D6DB]" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="w-5 h-5 rounded-full bg-[#F2F4F6] flex items-center justify-center">5</span>
              <span>결제</span>
            </div>
          </div>
        </div>

        {/* 단계별 절차 리스트 카드 (메터리얼 서페이스 & 넓은 여백) */}
        <div className="bg-white rounded-3xl p-5 sm:p-10 shadow-sm border border-[#E5E8EB]/60 space-y-8 sm:space-y-12">
          {steps.map((step, index) => (
            <div key={step.number} className="relative flex items-start gap-3.5 sm:gap-6 group">
              
              {/* 타임라인 인디케이터 바 */}
              {index !== steps.length - 1 && (
                <span 
                  className="absolute left-6 top-12 bottom-[-48px] w-[3px] bg-[#F2F4F6] rounded-full group-hover:bg-[#E5E8EB] transition-colors" 
                  aria-hidden="true" 
                />
              )}

              {/* 시각적 배지 및 아이콘 */}
              <div className="flex-shrink-0 relative">
                <div className="w-12 h-12 rounded-2xl bg-[#F2F4F6] flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
                  {step.icon}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#191F28] border-2 border-white rounded-full flex items-center justify-center text-[10px] font-extrabold text-white">
                  {step.number}
                </div>
              </div>

              {/* 디테일 내용 컨텐츠 */}
              <div className="flex-1 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#3182F6]">STEP 0{step.number}</span>
                </div>
                <h3 className="text-lg font-bold text-[#191F28] mt-0.5 tracking-tight group-hover:text-[#3182F6] transition-colors">
                  {step.title}
                </h3>
                <p className="mt-2 text-[14px] sm:text-[15px] text-[#4E5968] font-normal leading-relaxed">
                  {step.description}
                </p>

                {/* 3번 단계 중요 특이사항 카드 (독립형 스페셜 컴포넌트 구조) */}
                {step.subNotes && (
                  <div className="mt-3 sm:mt-4 bg-[#F9FAFB] rounded-2xl p-3.5 sm:p-5 border border-[#EFF2F5] space-y-3 shadow-inner">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#F04452]">
                      <AlertTriangle className="w-4 h-4" />
                      <span>운영사 안내 및 주의사항</span>
                    </div>
                    <div className="space-y-2.5 pl-0.5">
                      {step.subNotes.map((note, idx) => {
                        const isImportant = note.includes("중요 표시") || note.includes("카카오 플러스 친구");
                        const cleanNote = note.replace("(중요 표시)", "");
                        
                        return (
                          <div key={idx} className="flex items-start gap-2 text-xs sm:text-[13px] text-[#6B7684] leading-relaxed">
                            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${isImportant ? 'bg-[#3182F6]' : 'bg-[#D1D6DB]'}`} />
                            <span className={isImportant ? 'text-[#191F28] font-semibold bg-blue-50/70 px-1 py-0.5 rounded' : ''}>
                              {cleanNote}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>

        {/* 패널티 및 직거래 방지 주의사항 에티켓 카드 */}
        <div className="bg-white rounded-3xl p-5 sm:p-10 shadow-sm border border-[#E5E8EB]/60 space-y-4 sm:space-y-6">
          <div className="bg-[#FFF1F2] rounded-2xl p-4 sm:p-5 border border-[#FEE2E2] flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-[#F04452] flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-base font-bold text-[#F04452]">장소 제공자와의 직거래는 불가합니다</h4>
              <p className="text-xs sm:text-[14px] text-[#4E5968] leading-relaxed font-normal">
                사전 협의 없는 직거래가 확인될 경우 별도의 <strong className="text-[#F04452] font-bold">경고 없이 즉각적인 제재</strong>가 적용됩니다. 
                장소 사용 신청자는 <span className="text-[#191F28] font-bold">이용 정지</span> 처리가 되며, 장소 제공자는 <span className="text-[#191F28] font-bold">장소 노출 리스트에서 즉시 영구 삭제</span>됩니다.
              </p>
            </div>
          </div>

          {/* 투명한 거래 기독교 가치관 컴포넌트 */}
          <div className="bg-[#F2F4F6]/70 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
            <Heart className="w-5 h-5 text-[#3182F6] flex-shrink-0 mt-0.5 fill-[#3182F6]/10" />
            <p className="text-xs sm:text-[14px] text-[#4E5968] font-medium leading-relaxed">
              그리스도인으로서, 세상 속에서도 구별된 정직하고 투명한 거래 문화가 세워질 수 있도록 적극적이고 선한 협조를 간곡히 부탁드립니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
