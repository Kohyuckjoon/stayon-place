import React from 'react';
import { Shield, Clock } from 'lucide-react'; // 아이콘 활용

interface PaymentSummaryCardProps {
  totalPrice: number;
  deposit: number;
  balance: number;
  balanceDate: Date;
}

const PaymentSummaryCard: React.FC<PaymentSummaryCardProps> = ({ totalPrice, deposit, balance, balanceDate }) => {
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  };

  return (
    <div className="bg-white rounded-[22px] md:rounded-[32px] p-5 md:p-10 shadow-sm border border-[#E5E8EB] space-y-5 md:space-y-10">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <span className="text-[13px] md:text-lg font-bold text-[#8B95A1]">총 이용 금액(VAT포함)</span>
        <div className="flex items-center gap-1.5 md:gap-2 bg-[#E8F3FF] px-3 py-1.5 md:px-4 md:py-2 rounded-full shrink-0"> {/* 블루 틴트 처리 */}
          <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#3182F6]" />
          <span className="text-[11px] md:text-sm font-bold text-[#3182F6]">에스크로 안전보호</span>
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 md:gap-2 mb-6 md:mb-12">
        <span className="text-[32px] md:text-6xl font-extrabold text-[#191F28] tracking-tighter">
          {totalPrice.toLocaleString()}
        </span>
        <span className="text-[18px] md:text-3xl font-bold text-[#4E5968]">원</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-8 border-t border-[#E5E8EB] pt-5 md:pt-10">
        {/* 1차: 장소 예약금 */}
        <div className="bg-[#F9FAFB] rounded-xl md:rounded-2xl p-4 md:p-6 border border-[#E5E8EB]">
          <span className="text-[12px] md:text-sm font-bold text-[#4E5968] mb-1 block">1차 결제 (장소 예약금)</span>
          <p className="text-[20px] md:text-3xl font-extrabold text-[#FF0000] tracking-tight mb-1.5 md:mb-2">
            {deposit.toLocaleString()}원
          </p>
          <div className="flex items-start gap-1.5 md:gap-2 text-[#4E5968]">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 mt-0.5" />
            <span className="text-[12px] md:text-sm font-medium break-keep">지금 [예약 확정하기] 누르는 순간 예약금이 결제됩니다.</span>
          </div>
        </div>

        {/* 2차: 잔금 (자동) */}
        <div className="bg-[#F9FAFB] rounded-xl md:rounded-2xl p-4 md:p-6 border border-[#E5E8EB]">
          <span className="text-[12px] md:text-sm font-bold text-[#4E5968] mb-1 block">2차 결제 (잔금)</span>
          <p className="text-[20px] md:text-3xl font-extrabold text-[#3182F6] tracking-tight mb-1.5 md:mb-2">
            {balance.toLocaleString()}원
          </p>
          <div className="flex items-start gap-1.5 md:gap-2 text-[#4E5968]">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 mt-0.5" />
            <span className="text-[12px] md:text-sm font-medium break-keep">{formatDate(balanceDate)} <span className="text-[#3182F6] font-bold">(잔금 결제)</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryCard;
