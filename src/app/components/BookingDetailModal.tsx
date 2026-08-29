import { motion, AnimatePresence } from "framer-motion";
import { XCircle, User, Phone, Mail, Calendar, Users, CreditCard, MessageSquare, Building2, Search, AlertCircle } from "lucide-react";
import { InfoRow } from "./InfoRow";

export function BookingDetailModal({ selectedBooking, onClose }: any) {
  if (!selectedBooking) return null;

  // 스타일 상태 설정 (사용자 관점 용어)
  const statusConfig = {
    pending: { label: '확인 중', color: 'text-[#8B95A1]', bg: 'bg-[#F2F4F6]' },
    confirmed: { label: '답사 가능', color: 'text-[#3182F6]', bg: 'bg-[#E8F3FF]' },
    inspection_confirmed: { label: '답사 확정', color: 'text-[#3182F6]', bg: 'bg-[#E8F3FF]' },
    approved: { label: '장소 확정', color: 'text-[#00D082]', bg: 'bg-[#E6F9F2]' },
    deposit_paid: { label: '결제 완료', color: 'text-[#00D082]', bg: 'bg-[#E6F9F2]' },
    cancelled: { label: '취소됨', color: 'text-[#F04452]', bg: 'bg-[#FEECEE]' },
    rejected: { label: '반려됨', color: 'text-[#F04452]', bg: 'bg-[#FEECEE]' }
  };

  const currentStatus = statusConfig[selectedBooking.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <>
      <motion.div
        key="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#191f28]/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          key="modal-content"
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-white w-full max-w-[500px] rounded-[32px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] flex flex-col relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="pt-10 px-8 pb-6">
            <div className="flex justify-between items-start mb-6">
              <div className={`px-3 py-1.5 ${currentStatus.bg} ${currentStatus.color} rounded-lg text-[12px] font-black`}>
                {currentStatus.label}
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-[#F2F4F6] rounded-full text-[#8B95A1] hover:bg-[#E5E8EB] transition-all"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <h2 className="text-[26px] font-black text-[#191F28] leading-tight tracking-tight mb-2">
              {selectedBooking.venueName}
            </h2>
            <div className="flex items-center gap-1.5 text-[#6B7684] font-bold text-[15px]">
              <Building2 className="w-4 h-4 opacity-70" />
              <span>{selectedBooking.churchName || "StayOn 연합"}</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar max-h-[65vh]">
            <div className="space-y-8 pb-10">

              {/* 사전답사 희망일 (가장 중요하므로 상단 배치) */}
              <section>
                <h4 className="text-[13px] font-black text-[#ADB5BD] mb-3 ml-1 tracking-wider uppercase">사전답사 희망 정보</h4>
                <div className="bg-[#F2F8FF] rounded-[24px] p-6 border border-[#E8F3FF] flex items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl shadow-sm text-[#3182F6]">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#4E5968] font-bold mb-0.5">답사 희망 일시</p>
                    <p className="text-[16px] text-[#191F28] font-black whitespace-pre-line">
                      {Array.isArray(selectedBooking.inspectionDate)
                        ? selectedBooking.inspectionDate.join('\n')
                        : (selectedBooking.inspectionDate || "정보가 없습니다.")}
                    </p>
                  </div>
                </div>
              </section>

              {/* 행사 일정 및 인원 */}
              <section>
                <h4 className="text-[13px] font-black text-[#ADB5BD] mb-3 ml-1 tracking-wider uppercase">본 행사 예약 상세</h4>
                <div className="bg-[#F9FAFB] rounded-[24px] p-6 space-y-5 border border-[#F2F4F6]">
                  <InfoRow
                    icon={Calendar}
                    label="행사 기간"
                    value={selectedBooking.startDate ? `${selectedBooking.startDate} ~ ${selectedBooking.endDate}` : "미정"}
                  />
                  <InfoRow
                    icon={Users}
                    label="예상 인원"
                    value={`${selectedBooking.attendees || selectedBooking.headcount || 0}명`}
                  />
                  <InfoRow
                    icon={CreditCard}
                    label="신청 구분"
                    value={selectedBooking.type === 'inspection' ? '답사 후 결정' : '즉시 예약'}
                  />
                </div>
              </section>

              {/* 신청자 정보 */}
              <section>
                <h4 className="text-[13px] font-black text-[#ADB5BD] mb-3 ml-1 tracking-wider uppercase">신청 담당자</h4>
                <div className="bg-[#F9FAFB] rounded-[24px] p-6 space-y-5 border border-[#F2F4F6]">
                  <InfoRow icon={User} label="이름" value={selectedBooking.contactName || selectedBooking.name} />
                  <InfoRow icon={Phone} label="연락처" value={selectedBooking.phone || selectedBooking.contact} />
                  <InfoRow icon={Mail} label="이메일" value={selectedBooking.email} />
                </div>
              </section>

              {/* 추가 요청사항 */}
              <section>
                <h4 className="text-[13px] font-black text-[#ADB5BD] mb-3 ml-1 tracking-wider uppercase">추가 요청사항</h4>
                <div className="p-6 bg-[#F2F4F6] rounded-[24px]">
                  <div className="flex gap-3">
                    <MessageSquare className="w-5 h-5 text-[#8B95A1] shrink-0 mt-0.5" />
                    <p className="text-[#4E5968] font-bold leading-relaxed text-[15px]">
                      {selectedBooking.specialRequests || "남겨주신 추가 요청 사항이 없습니다."}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Footer - 안내 문구로 대체 */}
          <div className="p-8 bg-white border-t border-[#F2F4F6]">
            <div className="flex items-start gap-3 p-4 bg-[#F9FAFB] rounded-[20px]">
              <AlertCircle className="w-5 h-5 text-[#3182F6] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#6B7684] font-bold leading-relaxed">
                현재 예약은 관리자가 확인 중입니다. 답사가 확정되거나 장소 승인이 완료되면 카카오톡 알림톡으로 안내해 드릴게요.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E8EB; border-radius: 10px; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #E5E8EB transparent; }
      `}</style>
    </>
  );
}