import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * STAYON Legal Modal - Toss Style Design
 * 기능(Firebase 연동 로직)은 유지하고 UI/UX만 개선한 버전입니다.
 * 가독성을 위해 Material Design의 타이포그래피와 여백 시스템을 적용했습니다.
 */

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, title, content }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[9999] backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[10000] bg-white rounded-t-[32px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Handle Bar */}
            <div className="flex justify-center py-4">
              <div className="w-12 h-1.5 bg-[#E5E8EB] rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 flex justify-between items-center border-b border-[#F2F4F6]">
              <h2 className="text-[20px] font-bold text-[#191F28] tracking-tight">
                {title}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-[#F2F4F6] rounded-full transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#8B95A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Content Area - 가독성을 극대화한 텍스트 렌더링 */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
              <div className="text-[15px] leading-[1.6] text-[#4E5968] whitespace-pre-line space-y-4">
                {content}
              </div>
            </div>

            {/* Bottom Button - 고정 영역 */}
            <div className="p-6 pt-2 bg-gradient-to-t from-white via-white to-transparent">
              <button
                onClick={onClose}
                className="w-full py-4 bg-[#3182F6] hover:bg-[#2C6ED5] text-white font-bold text-[17px] rounded-[18px] transition-all active:scale-[0.98]"
              >
                확인했습니다
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LegalModal;

/**
 * 스타일 가이드:
 * 1. 배경색: #F9FAFB (내용물), #FFFFFF (헤더/푸터)
 * 2. 텍스트: 제목 #191F28, 본문 #4E5968, 서브 #8B95A1
 * 3. 강조색: #3182F6 (Toss Blue)
 * 4. 둥근 모서리: 24px ~ 32px (Bottom Sheet 기준)
 */
