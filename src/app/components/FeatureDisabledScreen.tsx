import { Link } from "react-router-dom";
import { Church } from "lucide-react";

// 관리자가 기능을 꺼둔 상태에서 /churches, /church-register, /churches/:id에
// 직접 접근했을 때 보여주는 화면. 헤더에서 링크만 숨기는 걸로는 URL을 아는 사람이
// 그대로 들어올 수 있어서, 페이지 자체도 막아둔다.
export function FeatureDisabledScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
      <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mb-6">
        <Church className="w-7 h-7 text-[#10B981]" />
      </div>
      <p className="text-[18px] font-black text-[#191f28] mb-2">서비스 준비 중이에요</p>
      <p className="text-[14px] font-bold text-[#8b95a1] mb-8 break-keep">전국 교회 서비스는 곧 다시 찾아뵐게요.</p>
      <Link to="/" className="px-6 py-3 bg-[#10b981] text-white rounded-xl font-bold text-[14px] hover:bg-[#0ea975] transition-all">
        홈으로 가기
      </Link>
    </div>
  );
}
