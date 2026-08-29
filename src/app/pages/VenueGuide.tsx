import { motion } from "framer-motion";
import { Coffee, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function VenueGuide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] text-center border border-gray-100"
      >
        {/* 아이콘 영역 */}
        <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Coffee className="w-10 h-10 text-blue-600" />
        </div>

        {/* 텍스트 영역 */}
        <h1 className="text-2xl md:text-3xl font-black text-[#191F28] mb-4 tracking-tight">
          장소 등록 가이드를<br />준비하고 있어요
        </h1>
        <p className="text-[#4E5968] text-lg leading-relaxed mb-10">
          더 쉽고 편리하게 장소를 등록하실 수 있도록<br />
          꼼꼼하게 가이드를 작성 중입니다.<br />
          조금만 기다려주세요!
        </p>

        {/* 액션 버튼 */}
        <button
          onClick={() => navigate(-1)}
          className="w-full py-5 bg-[#191F28] hover:bg-black text-white rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          이전으로 돌아가기
        </button>
      </motion.div>

      {/* 하단 푸터 느낌의 부연 설명 */}
      <p className="mt-8 text-[#8B95A1] text-sm font-medium">
        문의사항은 고객센터를 통해 말씀해주세요.
      </p>
    </div>
  );
}
