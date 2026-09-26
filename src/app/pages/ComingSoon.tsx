import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";

// 아직 실제 콘텐츠가 없는 신규 메뉴 항목을 위한 공용 "준비중" 페이지.
// 라우트별로 title/description만 다르게 넘겨서 재사용한다 (예: 연합 수련회 장소 서브메뉴 2개).
export function ComingSoon({ title, description }: { title: string; description: string }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f4f6] px-6 text-center">
      <div className="max-w-sm">
        <div className="w-16 h-16 mx-auto mb-6 bg-white rounded-full flex items-center justify-center shadow-sm">
          <Sparkles className="w-7 h-7 text-[#3182f6]" />
        </div>
        <span className="inline-block px-3 py-1 bg-[#f2f8ff] text-[#3182f6] rounded-full text-[12px] font-black mb-4">
          준비중
        </span>
        <h1 className="text-[20px] font-black text-[#191f28] mb-2 break-keep">{title}</h1>
        <p className="text-[14px] font-bold text-[#8b95a1] leading-relaxed break-keep mb-8">{description}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-5 py-3 bg-white border border-[#e5e8eb] rounded-2xl font-bold text-[14px] text-[#4e5968] hover:bg-[#f9fafb] transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> 이전 화면으로
        </button>
      </div>
    </div>
  );
}
