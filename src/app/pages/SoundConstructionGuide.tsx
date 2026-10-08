import { Link } from "react-router-dom";
import { ScrollRestoration } from "react-router-dom";
import { Volume2, FileText, Phone, ChevronRight, Lightbulb, Ruler, Church } from "lucide-react";

const PHONE_NUMBER = "0502-1937-0615";

// "음향 시공 문의" 안내 페이지 - 짧은 소개 뒤에 두 가지 신청 방법 중 하나를 고르게 한다.
// 1) 온라인으로 견적 신청 -> /sound-register(상세 폼)로 이동
// 2) 전화로 문의 -> 별도 폼 없이 바로 고객센터 전화번호로 연결(tel: 링크)
export function SoundConstructionGuide() {
  return (
    <div className="min-h-screen bg-white text-[#191f28] font-sans antialiased">
      <ScrollRestoration />

      <div className="max-w-xl mx-auto px-6 pt-10 md:pt-16 pb-24">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F2F8FF] text-[#3182f6] rounded-full mb-6 text-sm font-black">
          <Volume2 className="w-4 h-4" /> 음향 시공 문의
        </div>
        <h1 className="text-[26px] md:text-[30px] font-black text-[#191f28] mb-3 leading-tight tracking-tight break-keep">
          교회 음향 시공,<br />
          <span className="text-[#3182f6]">STAYON에 맡겨보세요</span>
        </h1>
        <p className="text-[14px] md:text-[15px] text-[#4e5968] leading-relaxed break-keep font-medium mb-10">
          예배당 음향 시스템 신규 설치부터 노후 장비 교체까지, 교회 사정에 맞춰 견적을 안내해드려요. 조명 시공도 함께 받으실 수 있어요.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-10 text-center">
          <div className="p-3 bg-[#F9FAFB] rounded-2xl border border-[#F2F4F6]">
            <Church className="w-5 h-5 text-[#3182f6] mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-[#8b95a1]">교회 전문</p>
          </div>
          <div className="p-3 bg-[#F9FAFB] rounded-2xl border border-[#F2F4F6]">
            <Ruler className="w-5 h-5 text-[#3182f6] mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-[#8b95a1]">면적별 맞춤 견적</p>
          </div>
          <div className="p-3 bg-[#F9FAFB] rounded-2xl border border-[#F2F4F6]">
            <Lightbulb className="w-5 h-5 text-[#3182f6] mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-[#8b95a1]">조명 동시 진행</p>
          </div>
        </div>

        <p className="text-[13px] font-bold text-[#8b95a1] mb-3 ml-1">아래 두 가지 방법 중 편하신 걸로 문의해주세요</p>

        <Link
          to="/sound-register"
          className="flex items-center gap-4 p-5 bg-white border-2 border-[#3182f6] rounded-[24px] mb-3 hover:bg-[#F2F8FF] transition-all group"
        >
          <div className="w-12 h-12 bg-[#F2F8FF] rounded-2xl flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-[#3182f6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-black text-[#191f28]">온라인으로 견적 신청하기</p>
            <p className="text-[12px] font-bold text-[#8b95a1]">교회 정보와 시공 면적을 입력하면 돼요</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#3182f6] shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>

        <a
          href={`tel:${PHONE_NUMBER}`}
          className="flex items-center gap-4 p-5 bg-white border border-[#E5E8EB] rounded-[24px] hover:bg-[#F9FAFB] transition-all group"
        >
          <div className="w-12 h-12 bg-[#F9FAFB] rounded-2xl flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-[#4e5968]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-black text-[#191f28]">전화로 문의하기</p>
            <p className="text-[12px] font-bold text-[#8b95a1]">STAYON 고객센터 {PHONE_NUMBER}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#8b95a1] shrink-0 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>
    </div>
  );
}
