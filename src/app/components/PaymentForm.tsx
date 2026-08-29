import React, { useState } from 'react';
// import { CheckCircle2, ShieldCheck, ChevronRight, Lock, X } from 'lucide-react';
import { CheckCircle2, ShieldCheck, ChevronRight, Lock, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { functions } from "../lib/firebase";
// import { httpsCallable } from "firebase/functions";
import { getFunctions, httpsCallable } from "firebase/functions";

interface PaymentFormProps {
    venueId: string;
    onSuccess: (paymentId: string) => void;
    isLoading: boolean;
    totalPrice: number;
    deposit: number;
    balance: number;
    bookingDetail?: {
        startDate: string;
        endDate?: string;
    };
}

/**
 * [INTERNAL COMPONENT] LegalModal
 */
const LegalModal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; content: string }> = ({ isOpen, onClose, title, content }) => (
    <AnimatePresence>
        {isOpen && (
            <>
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/40 z-[9999] backdrop-blur-sm"
                />
                <motion.div
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed bottom-0 left-0 right-0 z-[10000] bg-white rounded-t-[32px] max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
                >
                    <div className="flex justify-center py-4"><div className="w-12 h-1.5 bg-[#E5E8EB] rounded-full" /></div>
                    <div className="px-6 pb-4 flex justify-between items-center border-b border-[#F2F4F6]">
                        <h2 className="text-[20px] font-bold text-[#191F28]">{title}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-[#F2F4F6] rounded-full transition-colors"><X className="w-6 h-6 text-[#8B95A1]" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-8">
                        <div className="text-[15px] leading-[1.8] text-[#4E5968] whitespace-pre-line font-medium">{content}</div>
                    </div>
                    <div className="p-6 bg-white border-t border-[#F2F4F6]">
                        <button onClick={onClose} className="w-full py-4 bg-[#3182F6] text-white font-bold text-[17px] rounded-[18px] active:scale-[0.98] transition-transform">확인했습니다</button>
                    </div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
);

// const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess, isLoading, totalPrice, deposit, balance }) => {
const PaymentForm: React.FC<PaymentFormProps> = ({ onSuccess, isLoading, totalPrice, deposit, balance, bookingDetail, venueId}) => {
    const [isAgreed, setIsAgreed] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ title: '', content: '' });

    const PRIVACY_THIRD_PARTY_TEXT = `[개인정보 제3자 제공 동의]\n
                                    1. 개인정보를 제공받는 자
                                    - STAYON과 계약된 장소 운영사(동역자) 및 해당 예약 건의 시설 담당자

                                    2. 개인정보를 제공받는 자의 이용 목적
                                    - 예약 내역의 확인 및 확정, 장소 이용 서비스 제공
                                    - 이용객 식별 및 노쇼(No-Show) 방지
                                    - 서비스 이용 관련 긴급 연락 및 고객 응대(CS)
                                    - 시설 이용 수칙 안내 및 사고 발생 시 연락

                                    3. 제공하는 개인정보의 항목
                                    - 예약자 정보: 성명, 휴대폰 번호
                                    - 예약 상세: 예약 일시, 이용 인원, 요청 사항(선택 시)

                                    4. 개인정보를 제공받는 자의 보유 및 이용 기간
                                    - 서비스 제공 완료 후 6개월까지 보관 (단, 관계 법령에 따라 보존이 필요한 경우 해당 기간까지 보관)
                                    - 이용자는 본 동의를 거부할 권리가 있으나, 거부 시 장소 예약 및 이용 서비스 제공이 제한될 수 있습니다.`;

    const openLegal = (type: 'refund' | 'privacy') => {
        if (type === 'refund') {
            setModalContent({
                title: 'STAYON 환불 규정',
                content: `[환불 규정 상세 내용]\n
                        1. 예약 확정 후 3일(72시간) 이내 취소 시 전액 환불
                        2. 결제 후 3일 초과 ~ 행사일 30일 전 취소 시 장소 예약금 50% 환불(카드사 수수료 별도 공제)
                        3. 행사일 30일 전 ~ 당일 취소 시 장소 예약금 환불 불가
                        4. 천재지변 등 특수 상황(장소 예약금 최소 50%환불(고객센터로 문의))
                        STAYON은 장소 제공자와 예약자 간의 원활한 거래를 지원합니다.\n
                        보다 더 자세한 내용은 메인화면 > STAYON 정보 > 환불 정책을 참고해주시기 바랍니다.`
            });
        } else {
            setModalContent({
                title: '개인정보 제3자 제공 동의',
                content: PRIVACY_THIRD_PARTY_TEXT
            });
        }
        setIsModalOpen(true);
    };

    const handleRequestPayment = async () => {
        if (!isAgreed) {
            alert('필수 약관에 동의해주셔야 예약 확정이 가능합니다.');
            return;
        }

        const { IMP } = window as any;
        if (!IMP) {
            alert("결제 모듈을 불러올 수 없습니다.");
            return;
        }

        // 1. SDK 초기화 (V1 고객사 식별코드 사용)
        IMP.init("imp68402647");

        const currentPaymentId = `STAYON_${new Date().getTime()}`;

        // 2. 결제창 호출 (channelKey 제거)
        IMP.request_pay({
            pg: "galaxia.POS260404043", // PG사 설정
            pay_method: "card",
            merchant_uid: currentPaymentId,
            name: "STAYON 장소 예약금",
            amount: deposit,
            buyer_email: "akhj123akhjK@gmail.com",
            buyer_name: "고혁준",
            buyer_tel: "010-9231-1175",
            // m_redirect_url: window.location.href,
            customer_id: "STAYON_USER"
        }, async (rsp: any) => {
            console.log("포트원 응답 객체 확인:", rsp);

            if (rsp.error_code != null) {
                console.error("결제 실패:", rsp.error_msg);
                alert(`결제에 실패하였습니다: ${rsp.error_msg || "알 수 없는 오류"}`);
                return;
            }

            try {
                console.log("결제 성공, Firebase Function 호출 시작");
    
                // const functions = getFunctions();
                const functions = getFunctions(undefined, "asia-northeast3");
                const verifyPayment = httpsCallable(functions, 'registerPaymentAndSchedule');
                
                // [중요 수정] 서버(V2)가 기대하는 5가지 데이터를 모두 보냅니다.
                const result = await verifyPayment({
                    imp_uid: rsp.imp_uid,
                    merchant_uid: rsp.merchant_uid,
                    venueId: venueId,
                    totalPrice: totalPrice,
                    deposit: deposit,
                    balance: balance,
                    paymentDate: new Date().toISOString() // 서버가 날짜를 기대하므로 ISO 문자열로 전달
                });

                console.log("서버 검증 결과:", result.data);
                onSuccess(rsp.merchant_uid);
                // console.log("결제 성공, Firebase Function 호출 시작");
                
                // // fetch 대신 이걸 쓰세요. URL을 직접 안 쳐도 됩니다.
                // const functions = getFunctions();
                // const verifyPayment = httpsCallable(functions, 'registerPaymentAndSchedule');
                
                // const result = await verifyPayment({
                //     imp_uid: rsp.imp_uid,
                //     merchant_uid: rsp.merchant_uid
                // });

                // console.log("서버 검증 결과:", result.data);
                // onSuccess(rsp.merchant_uid);
                
            } catch (error: any) {
                console.error("에러 발생:", error);
                // 여기서는 error.message를 찍어도 됩니다 (Firebase 에러 객체니까요)
                alert(`서버 검증 실패: ${error.message || "알 수 없는 에러"}`);
            }
        });
    };

    return (
        <div className="bg-white rounded-[32px] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.06)] border border-[#F2F4F6] space-y-8 sticky top-10 overflow-hidden">
            <div className="space-y-6">
                <div className="flex items-center gap-2.5 px-1">
                    <div className="w-8 h-8 bg-[#E8F3FF] rounded-xl flex items-center justify-center">
                        <ShieldCheck className="w-5 h-5 text-[#3182F6]" />
                    </div>
                    <h3 className="text-[18px] font-bold text-[#191F28] tracking-tight">결제 전 확인해 주세요</h3>
                </div>

                {/* 약관 동의 섹션 */}
                <div className="bg-[#F9FAFB] rounded-[24px] p-6 border border-[#F2F4F6] transition-all hover:bg-[#F2F4F7]">
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="relative mt-0.5">
                            <input
                                type="checkbox"
                                checked={isAgreed}
                                onChange={(e) => setIsAgreed(e.target.checked)}
                                className="peer appearance-none w-6 h-6 border-2 border-[#E5E8EB] rounded-full checked:bg-[#3182F6] checked:border-[#3182F6] transition-all cursor-pointer"
                            />
                            <CheckCircle2 className="absolute top-0 left-0 w-6 h-6 text-white scale-0 peer-checked:scale-75 transition-transform pointer-events-none" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[15px] font-bold text-[#4E5968] leading-[1.4]">
                                <span className="text-[#3182F6]">예약 결제</span> 및 <span className="text-[#3182F6]">이용 약관</span>에 모두 동의합니다.
                            </p>
                        </div>
                    </label>

                    <div className="mt-4 flex flex-col gap-3 ml-10">
                        <button onClick={() => openLegal('refund')} className="flex items-center justify-between w-full group/btn">
                            <span className="text-[13px] font-medium text-[#8B95A1] group-hover/btn:text-[#3182F6] transition-colors">STAYON 환불 규정 상세 보기</span>
                            <ChevronRight className="w-4 h-4 text-[#B0B8C1]" />
                        </button>
                        <button onClick={() => openLegal('privacy')} className="flex items-center justify-between w-full group/btn">
                            <span className="text-[13px] font-medium text-[#8B95A1] group-hover/btn:text-[#3182F6] transition-colors">개인정보 제3자 제공 동의 보기</span>
                            <ChevronRight className="w-4 h-4 text-[#B0B8C1]" />
                        </button>
                    </div>
                </div>

                {/* 금액 안내 섹션 */}
                {/* <div className="space-y-3 bg-[#FFFFFF] border border-[#F2F4F6] p-6 rounded-[24px]">
                    <div className="flex justify-between items-center">
                        <span className="text-[14px] font-semibold text-[#6B7684]">장소 예약금 (10%)</span>
                        <div className="text-right">
                            <span className="text-[18px] font-bold text-[#3182F6]">{deposit.toLocaleString()}원</span>
                            <span className="block text-[11px] text-[#3182F6] font-bold opacity-80">지금 결제</span>
                        </div>
                    </div>
                    <div className="h-[1px] bg-[#F2F4F6] w-full" />
                    <div className="flex justify-between items-center">
                        <span className="text-[14px] font-semibold text-[#6B7684]">잔금 (90%)</span>
                        <div className="text-right">
                            <span className="text-[17px] font-bold text-[#8B95A1]">{balance.toLocaleString()}원</span>
                            <span className="block text-[11px] text-[#B0B8C1] font-bold">현장 결제</span>
                        </div>
                    </div>
                </div> */}

                <div className="space-y-3 bg-[#FFFFFF] border border-[#F2F4F6] p-6 rounded-[24px]">

                    {/* [수정 및 가독성 패치]: 장소 예약금 10% 바로 위에 렌더링되는 수련회 일정 영역입니다. */}
                    {/* 부모가 데이터를 전송하지 않았을 때 화면이 비어버리는 현상을 방지하기 위해 단축평가 백업 문구를 추가했습니다. */}
                    {/* <div className="flex justify-between items-center py-0.5">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#8B95A1]" />
                            <span className="text-[14px] font-semibold text-[#6B7684]">수련회 일정</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[15px] font-bold text-[#191F28]">
                                {bookingDetail?.startDate ? (
                                    `${bookingDetail.startDate} ${bookingDetail.endDate ? `~ ${bookingDetail.endDate}` : ''}`
                                ) : (
                                    <span className="text-[#B0B8C1] font-normal text-[13px]">일정 정보 확인중</span>
                                )}
                            </span>
                        </div>
                    </div> */}

                    <div className="flex justify-between items-center py-1">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Calendar className="w-4 h-4 text-[#8B95A1]" />
                            <span className="text-[14px] font-semibold text-[#6B7684]">수련회 일정</span>
                        </div>
                        <div className="text-right pl-4">
                            {bookingDetail?.startDate ? (
                                // 명세서 스타일의 콤팩트 라이트 그레이 배지
                                <div className="inline-flex items-center px-2.5 py-1 bg-[#F2F4F6] rounded-[10px]">
                                    <span className="text-[12px] font-bold text-[#4E5968] tracking-tighter whitespace-nowrap">
                                        {(() => {
                                            // "2026-08-16" -> "26.08.16" 형태로 2자리 연도 포맷팅 (글자 수 압축)
                                            const formatWithYear = (dateStr: string) => {
                                                const parts = dateStr.split('-');
                                                if (parts.length !== 3) return dateStr;
                                                const shortYear = parts[0].slice(2); // "2026" -> "26"
                                                return `${shortYear}.${parts[1]}.${parts[2]}`;
                                            };

                                            const start = formatWithYear(bookingDetail.startDate);
                                            const end = bookingDetail.endDate ? formatWithYear(bookingDetail.endDate) : '';

                                            return end ? `${start} ~ ${end}` : start;
                                        })()}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[#B0B8C1] font-normal text-[13px]">일정 정보 확인중</span>
                            )}
                        </div>
                    </div>

                    {/* 디자인 레이아웃 구분을 위한 미니멀 구분선 */}
                    <div className="h-[1px] bg-[#F2F4F6] w-full" />

                    <div className="flex justify-between items-center">
                        <span className="text-[14px] font-semibold text-[#6B7684]">장소 예약금</span>
                        <div className="text-right">
                            <span className="text-[18px] font-bold text-[#3182F6]">{deposit.toLocaleString()}원</span>
                            <span className="block text-[11px] text-[#3182F6] font-bold opacity-80">지금 결제</span>
                        </div>
                    </div>
                    <div className="h-[1px] bg-[#F2F4F6] w-full" />
                    <div className="flex justify-between items-center">
                        <span className="text-[14px] font-semibold text-[#6B7684]">잔금</span>
                        <div className="text-right">
                            <span className="text-[17px] font-bold text-[#8B95A1]">{balance.toLocaleString()}원</span>
                            <span className="block text-[11px] text-[#B0B8C1] font-bold">현장 결제</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 결제 버튼 섹션 */}
            <div className="space-y-4">
                <button
                    onClick={handleRequestPayment}
                    disabled={isLoading}
                    className={`
                        w-full h-[72px] rounded-[24px] font-bold text-[18px] transition-all
                        flex items-center justify-center gap-3
                        ${isLoading ? 'bg-[#E5E8EB] text-[#ADB5BD]' : 'bg-[#191F28] text-white hover:bg-[#000000] active:scale-[0.98] shadow-lg shadow-black/5'}
                    `}
                >
                    {isLoading ? (
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                        <CheckCircle2 className="w-5 h-5" />
                    )}
                    <span>{deposit.toLocaleString()}원 결제하기</span>
                </button>

                <div className="flex items-center justify-center gap-1.5 py-1">
                    <Lock className="w-3 h-3 text-[#B0B8C1]" />
                    <span className="text-[12px] font-medium text-[#B0B8C1]">안전한 보안 결제 환경</span>
                </div>
            </div>

            <LegalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalContent.title}
                content={modalContent.content}
            />
        </div>
    );
};

export default PaymentForm;
