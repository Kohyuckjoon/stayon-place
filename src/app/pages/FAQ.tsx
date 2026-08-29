import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, HelpCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// FAQ 데이터셋 정의
const FAQ_DATA = [
  { id: 1, category: "서비스 안내", q: "스테이온은 어떤 플랫폼인가요?", a: "전국의 기독교 수련회 장소(수양관, 기도원, 청소년 수련장 등)를 한눈에 비교하고, 실시간 예약 가능 날짜를 확인하여 사역에만 집중할 수 있도록 돕는 국내 최초의 수련회 전문 큐레이션 플랫폼입니다." },
  { id: 2, category: "예약/결제", q: "예약 프로세스는 어떻게 진행되나요?", a: "마음에 드는 장소와 날짜를 선택하여 예약 신청을 하시면, 스테이온 매니저가 장소 제공자(수양관 측)와 즉시 스케줄을 크로스 체크합니다. 최종 확정 후 장소 예약금 안내 문자가 발송되며, 입금이 확인되면 예약이 최종 완료됩니다." },
  { id: 3, category: "예약/결제", q: "장소 예약금외에 플랫폼 이용료나 수수료가 따로 있나요?", a: "예약을 진행하는 교회가 지불하는 추가 플랫폼 수수료는 0원입니다. 스테이온은 사역자분들의 예산 절감과 편리함을 위해 투명하게 운영됩니다." },
  { id: 4, category: "검증 시스템", q: "장소 검증 시스템이란 무엇인가요?", a: "현장 사역자들의 후기와 스테이온 매니저의 꼼꼼한 시설 전수조사(예배당 방송 장비 상태, 숙소 위생, 식사 퀄리티, 냉난방 성능 등)를 통과한 안전한 장소에만 '인증 마크'를 부여하는 검증 제도입니다." },
  { id: 5, category: "안전성", q: "이단/사이비 단체의 장소도 필터링이 되나요?", a: "스테이온은 정통 기독교 교단 연합 기준을 철저히 준수합니다. 등록 요청 시 철저한 교단 검증 절차를 거치며, 검증되지 않은 단체나 장소의 등록은 원천 차단됩니다." },
  { id: 6, category: "예약/결제", q: "예약 취소 및 환불 규정은 어떻게 되나요?", a: "각 수양관 및 장소 제공자의 고유 약관에 기반하되, 표준 정산 규정을 준수합니다. 장소 상세 페이지 하단의 '환불 정책' 탭에서 장소별 상세 규정을 바로 확인하실 수 있습니다." },
  { id: 7, category: "증빙 서류", q: "세금계산서나 현금영수증 발행이 가능한가요?", a: "네, 가능합니다. 예약 확정 단계에서 교회나 사업 등 사업자등록증을 제출해 주시면, 이용하신 수양관을 통해 정식 지출증빙을 발행해 드립니다." },
  { id: 8, category: "서비스 안내", q: "인원이나 예산에 맞는 맞춤형 장소 추천을 받을 수 있나요?", a: "상단 메뉴의 [스마트 플래너]와 [예산 플래너]를 활용하시면 입력하신 데이터에 맞춤화된 장소가 자동으로 큐레이션됩니다. 추가적인 단체 맞춤 문의는 [고객지원 -> 문의하기] 구글 폼을 통해 신청해 주시면 담당 매니저가 24시간 내에 연락드립니다." },
  { id: 9, category: "시설/장비", q: "음향 및 영상 장비 지원 범위는 어디까지인가요?", a: "각 장소의 상세 페이지 [보유 시설/장비] 섹션에 마이크 개수, 빔프로젝터 안시(Ansi) 밝기, 엔지니어 상주 여부 등이 상세히 기록되어 있습니다. 방문 전 체크리스트로 확인해 보세요." },
  { id: 10, category: "장소 제공자", q: "수양관을 운영 중인데 우리 장소도 등록할 수 있나요?", a: "네, 환영합니다! 우측 상단의 [➕ 장소 등록 문의] 버튼을 통해 간단한 정보만 입력해 주시면, 스테이온 검증 팀이 연락을 드려 입점 프로세스(최초 1회차 수수료 면제 혜택 등)를 안내해 드립니다." }
  // { id: 11, category: "장소 제공자", q: "꼭 교회나 수양관 이런 장소만 등록이 가능한가요?", a: "아닙니다! 꼭 그렇진 않습니다. 장소제공측에서 수련회 장소로 사용하기 적합하다라고 판단이 된다면 우선 스테이온에 먼저 문의를 주세요! 교회나 외부 단체 등 교육이나 세미나 장소로 사용되는 카페나 글램핑장, 혹은 특수한 장소도 가능하나, 장소의 특수성을 가지고 있는 경우 스테이온과 상담 후에 장소 등록이 이루어집니다. 주저 말고 문의 주세요." }
];

export function FAQ() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("전체");

  // 카테고리 추출
  const categories = ["전체", "서비스 안내", "예약/결제", "검증 시스템", "안전성", "증빙 서류", "시설/장비", "장소 제공자"];

  // 검색 및 카테고리 필터링 로직 (파이어베이스 영향 무관 독립 데이터)
  const filteredFAQ = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory === "전체" || item.category === selectedCategory;
      const matchesSearch = item.q.toLowerCase().includes(searchTerm.toLowerCase()) || item.a.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  const toggleAccordion = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    /* UI 포인트: 앱 고유의 미니멀 쿨그레이 색상배경 매칭 */
    <div className="min-h-screen bg-[#F9FAFB] font-sans antialiased text-[#191F28] pt-10 pb-24">
      <div className="max-w-[768px] mx-auto px-6">
        
        {/* 헤더 네비게이션 */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-[#4E5968] hover:text-[#191F28] transition-colors mb-8 font-bold text-[15px]"
        >
          <ArrowLeft className="w-5 h-5" />
          뒤로가기
        </button>

        {/* 타이틀 영역 */}
        <div className="mb-10">
          <span className="text-[#3182F6] font-black text-[15px] tracking-tight block mb-2">고객지원센터</span>
          <h2 className="text-[32px] font-black tracking-tight text-[#191F28] leading-tight">
            자주 묻는 질문
          </h2>
          <p className="text-[#8B95A1] text-[16px] font-semibold mt-2">
            스테이온 플래폼 이용에 대해 궁금한 점을 빠르게 찾아보세요.
          </p>
        </div>

        {/* 스타일 커스텀 큰 검색 바 디자인 적용 */}
        <div className="relative mb-10">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-[#B0B8C1]" />
          <input 
            type="text" 
            placeholder="궁금한 단어나 키워드를 입력해 보세요" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-white rounded-[24px] font-bold text-[16px] text-[#191F28] outline-none border border-[#E5E8EB] shadow-[0_4px_20px_rgba(0,0,0,0.02)] focus:border-[#3182F6] focus:ring-4 focus:ring-[#3182F6]/10 transition-all placeholder-[#B0B8C1]" 
          />
        </div>

        {/* 세로 스크롤/가로 칩 스크롤 형태의 카테고리 탭 배치 */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-8 pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setExpandedId(null); }}
              className={`px-5 py-3 rounded-full text-[14px] font-black shrink-0 transition-all border ${
                selectedCategory === cat
                  ? "bg-[#3182F6] border-[#3182F6] text-white shadow-sm"
                  : "bg-white border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 아코디언 리스트 영역 */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredFAQ.length > 0 ? (
              filteredFAQ.map((item) => {
                const isOpen = expandedId === item.id;
                return (
                  /* 메테리얼 디자인 기준 둥글고 정돈된 백그라운드 리스트 컴포넌트 */
                  <div 
                    key={item.id}
                    className="bg-white border border-[#F2F4F6] rounded-[24px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.02)] transition-all duration-300"
                  >
                    <button
                      onClick={() => toggleAccordion(item.id)}
                      className="w-full flex items-start justify-between p-6 text-left gap-4 hover:bg-[#F9FAFB] transition-colors"
                    >
                      <div className="flex gap-3 items-start">
                        <HelpCircle className={`w-5 h-5 mt-0.5 shrink-0 ${isOpen ? "text-[#3182F6]" : "text-[#B0B8C1]"}`} />
                        <div className="space-y-1">
                          <span className="text-[11px] font-black text-[#3182F6] bg-[#E8F3FF] px-2 py-0.5 rounded-md">
                            {item.category}
                          </span>
                          <h4 className="text-[17px] font-bold text-[#191F28] tracking-tight pt-1">
                            {item.q}
                          </h4>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-[#8B95A1] mt-1 transition-transform duration-300 ${isOpen ? "rotate-180 text-[#3182F6]" : ""}`} />
                    </button>

                    {/* 부드러운 아코디언 슬라이드 펼침 애니메이션 처리 */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                          {/* 고객센터 고유의 은은한 회색 음영 답변창 */}
                          <div className="px-6 pb-6 pt-2 bg-[#F9FAFB] border-t border-[#F2F4F6] text-[#4E5968] text-[15px] font-medium leading-relaxed tracking-tight whitespace-pre-line">
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              /* 결과 없음 빈 화면 */
              <div className="text-center py-20 bg-white rounded-[24px] border border-[#F2F4F6]">
                <p className="text-[16px] font-black text-[#B0B8C1]">검색 결과에 맞는 질문이 없어요</p>
                <p className="text-[13px] font-bold text-[#D1D6DB] mt-1">다른 키워드로 다시 검색해 보세요</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* 하단 배너: 만족스러운 답을 찾지 못했을 때 */}
        {/* 메테리얼 입체 쉐도우 및 그라디언트 안내 배너 단독 처리 */}
        <div className="mt-12 p-6 bg-white rounded-[24px] border border-[#E5E8EB] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h5 className="text-[16px] font-black text-[#333D4B]">원하는 답변을 찾기 어려우신가요?</h5>
            <p className="text-[13px] font-semibold text-[#8B95A1] mt-0.5">스테이온 매니저가 직접 친절하게 안내해 드립니다.</p>
          </div>
          <button 
            // onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSemG4_fbEYEct7zo9tZ2EN-cY-Jg5pP63ODqDkRNEhq0l47yQ/viewform?usp=publish-editor", "_blank")}
            onClick={() => {
              const win = window.open("https://pf.kakao.com/_AtexfX/chat", "_blank", "noreferrer");
              if (win) win.opener = null;
            }}
            className="px-6 py-3 bg-[#191F28] hover:bg-[#333D4B] text-white text-[14px] font-black rounded-xl transition-all whitespace-nowrap shadow-sm"
          >
            1:1 문의하기
          </button>
        </div>

      </div>
    </div>
  );
}
