import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import PaymentSummaryCard from '../components/PaymentSummaryCard';
import PaymentForm from '../components/PaymentForm';
import { Check, Calendar, CreditCard, ChevronRight } from 'lucide-react';

interface BookingDetail {
  // id: string;
  // venueName: string;
  // totalPrice: number;
  // startDate: string;
  // endDate?: string;
  // depositType?: "percent" | "amount";
  // depositValue?: number;
  // venueId: string;

  id: string;
  venueName: string;
  totalPrice: number;
  depositPrice: number;    // 🌟 추가 (DB의 실제 예약금 금액)
  balancePrice: number;    // 🌟 추가 (DB의 실제 잔금 금액)
  depositPercent: number;  // 🌟 추가 (DB의 실제 예약금 퍼센트)
  startDate: string;
  endDate?: string;
  venueId: string;
}

const PaymentSetup: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchBookingData = async () => {
      if (!bookingId) return;

      try {
        const docRef = doc(db, "bookings", bookingId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setBookingDetail({
            // id: docSnap.id,
            // venueName: data.venueName || "장소명 없음",
            // totalPrice: data.totalPrice || 0,
            // startDate: data.startDate || "",
            // endDate: data.endDate || "",
            // depositType: data.depositType || "percent",
            // depositValue: data.depositValue ?? 10, // 기본값 10%
            // venueId: data.venueId,

            id: docSnap.id,
            venueName: data.venueName || "장소명 없음",
            totalPrice: data.totalPrice || 0,
            depositPrice: data.depositPrice || 0,       // DB에서 직접 파싱
            balancePrice: data.balancePrice || 0,       // DB에서 직접 파싱
            depositPercent: data.depositPercent ?? 10,  // DB에서 직접 파싱 (없으면 기본 10)
            startDate: data.startDate || "",
            endDate: data.endDate || "",
            venueId: data.venueId,
          });
        } else {
          alert("예약 정보를 찾을 수 없습니다.");
          navigate('/mypage');
        }
      } catch (error) {
        console.error("데이터 로딩 오류:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingData();
  }, [bookingId, navigate]);

  if (isLoading || !bookingId) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center font-sans">
        <p className="text-[#8B95A1] font-bold animate-pulse text-lg">결제 정보를 불러오고 있어요...</p>
      </div>
    );
  }

  if (!bookingDetail) return null;

  const deposit = bookingDetail.depositPrice;
  const balance = bookingDetail.balancePrice;

  // const deposit = bookingDetail.totalPrice * 0.1;
  // const balance = bookingDetail.totalPrice * 0.9;

  // const deposit = bookingDetail.depositType === "amount" 
  //   ? (bookingDetail.depositValue || 0) 
  //   : bookingDetail.totalPrice * ((bookingDetail.depositValue || 10) / 100);
    
  // const balance = bookingDetail.totalPrice - deposit;

  const depositLabel = bookingDetail.depositPercent === 0
    ? "고정 예약금"
    : `${bookingDetail.depositPercent}%`;


//////////////
  const balanceDate = new Date(bookingDetail.startDate);
  balanceDate.setHours(9, 0, 0, 0);

  // 날짜 포맷팅 (예: 2026년 08월 15일)
  const formattedBalanceDate = balanceDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePaymentSuccess = async (billingKey: string) => {
    setIsProcessing(true);
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        status: "deposit_paid",
        billingKey: billingKey,
        depositAmount: deposit,
        balanceAmount: balance,
        balancePaymentDate: balanceDate.toISOString(),
        paymentRegisteredAt: new Date().toISOString()
      });

      alert('카드 등록 및 장소 예약금 처리가 완료되었습니다! 확정 문자를 보내드릴게요.');
      navigate('/mypage');
    } catch (error) {
      console.error('백엔드 처리 중 오류:', error);
      alert('카드 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F4F6] p-6 md:p-10 font-sans antialiased text-[#191F28]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <div className="lg:col-span-2 space-y-6">
          {/* 스타일 메시지 카드 */}
          <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-gray-100 transition-all">
            <div className="mb-8">
              <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-[#3182F6] rounded-full text-[13px] font-bold mb-4">
                마지막 단계
              </span>
              <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4 tracking-tight">
                {bookingDetail.venueName}<br />
                <span className="text-[#3182F6]">결제 구조</span>를 확인해 주세요
              </h1>
            </div>

            {/* 직관적인 결제 프로세스 안내 UI */}
            <div className="space-y-4">
              <div className="flex items-center gap-5 p-6 bg-[#F9FAFB] rounded-2xl border border-gray-50">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-100">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#8B95A1] mb-1">지금 즉시 결제</p>
                  <h3 className="text-xl font-black text-[#191F28]">
                    장소 예약금 {deposit.toLocaleString()}원 
                    {/* <span className="text-blue-600">(10%)</span> */}
                  </h3>
                </div>
                <div className="hidden md:block">
                  <Check className="w-6 h-6 text-[#3182F6]" />
                </div>
              </div>

              <div className="flex items-center gap-5 p-6 bg-[#F9FAFB] rounded-2xl border border-gray-50">
                <div className="w-12 h-12 bg-white border-2 border-[#E5E8EB] rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-[#4E5968]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#8B95A1] mb-1">{formattedBalanceDate} 오전 9:00</p>
                  <h3 className="text-xl font-black text-[#191F28]">
                    잔금 {balance.toLocaleString()}원 
                    <span className="text-[#4E5968]">(잔금 현장결제)</span>
                  </h3>
                </div>
                <div className="hidden md:block">
                  <div className="px-3 py-1 bg-gray-200 rounded-lg text-[11px] font-black text-white tracking-widest uppercase">AUTO</div>
                </div>
              </div>
            </div>
          </div>

          <PaymentSummaryCard
            totalPrice={bookingDetail.totalPrice}
            deposit={deposit}
            balance={balance}
            balanceDate={balanceDate}
          />
        </div>

        <div className="lg:col-span-1 sticky top-10 h-fit">
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
            <PaymentForm
              onSuccess={handlePaymentSuccess}
              isLoading={isProcessing}
              totalPrice={bookingDetail.totalPrice} 
              deposit={deposit} 
              balance={balance}
              bookingDetail={bookingDetail}
              venueId={bookingDetail.venueId || ""}
            />
          </div>

          <div className="mt-8 px-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
              <div className="w-5 h-5 mt-0.5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">!</span>
              </div>
              <p className="text-[13px] text-[#4E5968] font-medium leading-relaxed">
                잔금 결제 전일, 카카오톡을 통해 <br />
                잔금 결제 안내를 미리 드립니다.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSetup;
