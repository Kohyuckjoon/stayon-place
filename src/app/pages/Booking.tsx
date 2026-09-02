import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db, functions } from "../lib/firebase";
import { ScrollRestoration } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../lib/AuthContext";
import { httpsCallable } from "firebase/functions";
// import { getFunctions, httpsCallable } from "firebase/functions";

import {
  Calendar, Church, Phone, Shield, CheckCircle2, ChevronLeft, Info, ChevronRight, X, CalendarDays, ChevronDown, AlertCircle, Clock, Settings, Check
} from "lucide-react";

// --- 커스텀 메테리얼 캘린더 컴포넌트 ---
function MaterialCalendar({ value, onChange, label, error, disabledDates = [] }: { value: string, onChange: (date: string) => void, label: string, error?: boolean, disabledDates?: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  const days = [];
  const totalDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startDay = firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex-1 space-y-2.5" ref={containerRef}>
      <label className={`text-[13px] font-black ml-1 transition-colors ${error ? "text-[#F04452]" : "text-[#6B7684]"}`}>{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[64px] px-5 bg-[#F9FAFB] border-2 flex items-center justify-between rounded-[20px] transition-all cursor-pointer 
          ${isOpen ? "border-[#3182F6] bg-white shadow-[0_0_0_1px_#3182F6]" :
            error ? "border-[#F04452] bg-[#FFF8F8]" : "border-transparent hover:bg-[#F2F4F6]"}`}
      >
        <div className="flex flex-col">
          <span className={`font-black text-[16px] leading-tight ${value ? (error ? "text-[#F04452]" : "text-[#191F28]") : "text-[#ADB5BD]"}`}>
            {value || "날짜 선택"}
          </span>
        </div>
        <CalendarDays className={`w-5 h-5 ${isOpen ? "text-[#3182F6]" : error ? "text-[#F04452]" : "text-[#B0B8C1]"}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="absolute z-[100] top-[100%] left-0 w-full sm:w-[340px] mt-2 bg-white rounded-[24px] p-6 shadow-[0_24px_54px_rgba(0,0,0,0.12)] border border-[#F2F4F6]"
          >
            <div className="flex items-center justify-between mb-5 px-1">
              <span className="text-[17px] font-black text-[#191F28]">
                {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
              </span>
              <div className="flex gap-1">
                <button type="button" onClick={handlePrevMonth} className="p-2 hover:bg-[#F2F4F6] rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-[#4E5968]" /></button>
                <button type="button" onClick={handleNextMonth} className="p-2 hover:bg-[#F2F4F6] rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-[#4E5968]" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                <div key={d} className="text-center text-[12px] font-bold text-[#B0B8C1] py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = value === dateStr;
                const isPast = new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isPast}
                    onClick={() => { onChange(dateStr); setIsOpen(false); }}
                    className={`aspect-square flex items-center justify-center text-[14px] font-black rounded-[14px] transition-all
                      ${isSelected ? "bg-[#3182F6] text-white" : isPast ? "text-[#E5E8EB] cursor-not-allowed" : "text-[#4E5968] hover:bg-[#F2F8FF] hover:text-[#3182F6]"}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Booking() {
  const [selectedExtraOptions, setSelectedExtraOptions] = useState<any[]>([]);
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isInspection = searchParams.get("type") === "inspection";

  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  // 실제 성수기 요금이 하루라도 적용되었는지 여부를 관리할 상태값 추가
  const [isPeakSeasonApplied, setIsPeakSeasonApplied] = useState(false);

  const [formData, setFormData] = useState({
    churchName: "",
    denomination: "",
    contactName: "",
    phone: "",
    email: "",
    startDate: searchParams.get("start") || "",
    endDate: searchParams.get("end") || "",
    additionalAttendees: 0,
    // attendees: "",
    specialRequests: "",
    inspectionDate: [] as string[],
  });

  // 상단 상태 관리 부분에 추가
  const [additionalAttendees, setAdditionalAttendees] = useState(0);

  // 인원 핸들러 함수 추가
  // const handleAdditionalAttendeesChange = (value: number) => {
  //   const val = Math.max(0, value);
  //   setFormData(prev => ({ ...prev, additionalAttendees: val }));
  // };
  const handleAdditionalAttendeesChange = (value: number | string) => {
    // 입력값이 숫자가 아니거나(빈 값 등) 0보다 작으면 0으로 처리
    const val = typeof value === 'string' && value.trim() === ''
      ? ''
      : Math.max(0, Number(value));

    setFormData(prev => ({ ...prev, additionalAttendees: val as number }));
  };

  const [dateError, setDateError] = useState("");
  const [isOverlapping, setIsOverlapping] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const nums = value.replace(/[^\d]/g, "");
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7, 11)}`;
  };

  useEffect(() => {
    // user 객체가 로딩 중이거나 없을 때도 대응할 수 있도록 if문 없이 작성
    setFormData(prev => ({
      ...prev,
      email: user?.email ?? "" // user나 email이 없으면 자동으로 빈 문자열("")이 들어감
    }));
  }, [user]);

  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [agreeToRefund, setAgreeToRefund] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null); // 선택된 옵션 상태
  const [selectedOptionData, setSelectedOptionData] = useState<any>(null);


  useEffect(() => {
    if (venue?.timeSlotOptions) {
      const filtered = venue.timeSlotOptions.filter((opt: any) => opt.price && Number(opt.price) > 0);
      if (filtered.length > 0 && selectedOptionIndex === null) {
        const labels = ["주중 데이 패키지", "주말 데이 패키지", "평일 올나잇 패키지", "주말 올나잇 패키지", "평일 올데이 패키지", "주말 올데이 패키지"];
        const firstOpt = filtered[0];
        const displayLabel = firstOpt.label || labels[0] || "일반 시간대";
        setSelectedOptionIndex(0);
        setSelectedOptionData({ ...firstOpt, label: displayLabel });
      }
    }
  }, [venue]);





  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "venues", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVenue(docSnap.data());
        } else {
          alert("장소를 찾을 수 없습니다.");
          navigate("/venues");
        }

        // status가 'confirmed', 'deposit_paid', 'completed'인 것들 모두 체크해야 안전함
        const q = query(
          collection(db, "bookings"),
          where("venueId", "==", id),
          where("status", "in", ["confirmed", "deposit_paid", "completed"])
        );
        const querySnapshot = await getDocs(q);
        const bookings = querySnapshot.docs.map(doc => doc.data());
        setExistingBookings(bookings);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  // 실시간 중복 체크 로직
  useEffect(() => {
    if (!formData.startDate || !formData.endDate) {
      setDateError("");
      setIsOverlapping(false);
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (end < start) {
      setDateError("종료일이 시작일보다 빠릅니다.");
      setIsOverlapping(false);
      return;
    }

    const overlap = existingBookings.some(b => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return start <= bEnd && end >= bStart;
    });

    if (overlap) {
      setDateError("이미 예약된 날짜가 포함되어 있습니다.");
      setIsOverlapping(true);
      return;
    }

    // 관리자가 지정한 예약 차단 일정(수동 휴무 등)에 포함되는지 확인
    const blockedDates: string[] = venue?.blockedDates || [];
    const hasBlockedDate = blockedDates.some(dateStr => {
      const d = new Date(dateStr);
      return d >= start && d <= end;
    });

    if (hasBlockedDate) {
      setDateError("관리자가 예약을 제한한 날짜가 포함되어 있습니다.");
      setIsOverlapping(true);
    } else {
      setDateError("");
      setIsOverlapping(false);
    }
  }, [formData.startDate, formData.endDate, existingBookings, venue]);

  const handleAddInspectionDate = (date: string) => {
    if (!date) return;
    if (formData.inspectionDate.includes(date)) return;
    setFormData({
      ...formData,
      inspectionDate: [...formData.inspectionDate, date].sort()
    });
  };

  const handleRemoveInspectionDate = (targetDate: string) => {
    setFormData({
      ...formData,
      inspectionDate: formData.inspectionDate.filter(date => date !== targetDate)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dateError) return;
    if (!agreeToTerms || !agreeToRefund) {
      alert("모든 약관에 동의해주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Firebase에 데이터 저장
      const bookingData = {
        venueId: id,
        venueName: venue.venueName,
        ...formData,
        selectedTimeSlot: selectedOptionData,
        userId: user?.uid,
        type: isInspection ? "inspection" : "booking",
        status: "pending",
        totalPrice: totalPrice,
        depositPrice: depositPrice,              // 🌟 [추가] 선결제 예약금 금액 확보
        balancePrice: totalPrice - depositPrice, // 🌟 [추가] 현장 결제 잔금 금액 확보
        depositLabel: getDepositLabel(),         // 🌟 [추가] 예약금 정산 타입 라벨 (% 혹은 확정금액 여부)
        createdAt: serverTimestamp(),            // 서버 시간 기준으로 등록 타임스탬프 마크
        depositPercent: venue.depositType === "amount" ? 0 : Number(venue.depositPercent || 10),
      };

      await addDoc(collection(db, "bookings"), bookingData);
      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");

      await triggerAdminNotification({
        type: 'RESERVE',
        payload: {
          userName: `${formData.churchName} (${formData.contactName})`,
          dateTime: isInspection
            ? `[사전답사] 희망일: ${formData.inspectionDate.join(", ")}`
            : `[본예약] ${formData.startDate} ~ ${formData.endDate} (${nights}박)`,
          phone: formData.phone,
          venueName: venue.venueName,
          priceInfo: isInspection
            ? `사전답사비: ${inspectionFee.toLocaleString()}원`
            : `총액: ${totalPrice.toLocaleString()}원 (예약금: ${depositPrice.toLocaleString()}원 / 잔금: ${(totalPrice - depositPrice).toLocaleString()}원)`
        }
      });

      alert(isInspection ? "사전 답사 신청이 완료되었습니다." : "예약 문의가 완료되었습니다.");
      navigate("/");
    } catch (error) {
      console.error("전송 에러:", error);
      alert("신청 중 오류가 발생했습니다.");
      console.error("전송 에러 상세:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-[4px] border-[#f2f4f6] border-t-[#3182f6] rounded-full animate-spin" />
    </div>
  );

  if (!venue) return null;

  const inspectionFee = 30000;
  const nights = formData.startDate && formData.endDate
    ? Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  // 총 금액 계산 
  // const calculateTotalPrice = () => {
  //   if (isInspection) return inspectionFee;

  //   let basePrice = venue.price || 0;
  //   if (selectedOptionIndex !== null && venue.timeSlotOptions[selectedOptionIndex]) {
  //     basePrice = Number(venue.timeSlotOptions[selectedOptionIndex].price || 0);
  //   }

  //   if (!formData.startDate || !formData.endDate || nights <= 0) return basePrice;
  //   // if (!formData.startDate || !formData.endDate || nights <= 0) return venue.price || 0;

  //   let totalCalculated = 0;
  //   let peakDetected = false;

  //   for (let i = 0; i < nights; i++) {
  //     const currentDay = new Date(formData.startDate);
  //     currentDay.setDate(currentDay.getDate() + i);

  //     // 'MM-DD' 형태로 비교 기준 문자열 생성
  //     const currentMMDD = `${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;

  //     let dayPrice = basePrice;
  //     // let dayPrice = Number(venue.price || 0);

  //     if (venue.useSeasonalPrice && venue.seasonPrices && venue.seasonPrices.length > 0) {
  //       const matchedSeason = venue.seasonPrices.find((season: any) => {
  //         if (!season.start || !season.end || !season.price) return false;

  //         // 디비 데이터에 슬래시가 섞여있거나 연도(YYYY)가 껴있을 경우를 대비해 'MM-DD' 형태로 완전 정제
  //         let startSeason = season.start.replace(/\//g, '-').trim();
  //         let endSeason = season.end.replace(/\//g, '-').trim();

  //         if (startSeason.length === 10) startSeason = startSeason.substring(5);
  //         if (endSeason.length === 10) endSeason = endSeason.substring(5);

  //         // 성수기 기간 대소비교 연산
  //         if (startSeason <= endSeason) {
  //           return currentMMDD >= startSeason && currentMMDD <= endSeason;
  //         } else {
  //           return currentMMDD >= startSeason || currentMMDD <= endSeason;
  //         }
  //       });

  //       if (matchedSeason) {
  //         dayPrice = Number(matchedSeason.price);
  //         // 성수기 요금이 기본 가격보다 높을 때만 뱃지 활성화 플래그 적용
  //         if (dayPrice > Number(venue.price || 0)) {
  //           peakDetected = true;
  //         }
  //       }
  //     }

  //     totalCalculated += dayPrice;
  //   }

  //   // 상태값 동기화 후 안전하게 리렌더링 처리
  //   if (isPeakSeasonApplied !== peakDetected) {
  //     setTimeout(() => setIsPeakSeasonApplied(peakDetected), 0);
  //   }

  //   return totalCalculated;
  // };

  const calculateTotalPrice = () => {
    if (isInspection) return inspectionFee;

    // let basePrice = venue.price || 0;
    let basePrice = Number(venue.price || 0);
    if (selectedOptionIndex !== null && venue.timeSlotOptions?.[selectedOptionIndex]) {
      basePrice = Number(venue.timeSlotOptions[selectedOptionIndex].price || 0);
    }

    const baseCapacity = Number(venue.baseCapacity || 0);
    const excessAttendees = Math.max(0, Number(formData.additionalAttendees) - baseCapacity);
    // const excessAttendees = Math.max(0, formData.additionalAttendees - baseCapacity);

    // 추가 인원 요금 계산
    const perPersonPrice = Number(venue.perPersonPrice || 0);
    // const additionalFee = perPersonPrice * formData.additionalAttendees;
    const additionalFee = perPersonPrice * excessAttendees;

    const extraOptionsTotal = selectedExtraOptions.reduce((sum, opt) => sum + Number(opt.price || 0), 0);

    if (!formData.startDate || !formData.endDate || nights <= 0) return basePrice + additionalFee + extraOptionsTotal;

    let totalCalculated = 0;
    let peakDetected = false;

    for (let i = 0; i < nights; i++) {
      const currentDay = new Date(formData.startDate);
      currentDay.setDate(currentDay.getDate() + i);
      const currentMMDD = `${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;

      let dayPrice = basePrice;
      if (venue.useSeasonalPrice && venue.seasonPrices?.length > 0) {
        const matchedSeason = venue.seasonPrices.find((season: any) => {
          let startSeason = season.start.replace(/\//g, '-').trim();
          let endSeason = season.end.replace(/\//g, '-').trim();
          if (startSeason.length === 10) startSeason = startSeason.substring(5);
          if (endSeason.length === 10) endSeason = endSeason.substring(5);
          return startSeason <= endSeason
            ? (currentMMDD >= startSeason && currentMMDD <= endSeason)
            : (currentMMDD >= startSeason || currentMMDD <= endSeason);
        });
        if (matchedSeason) {
          dayPrice = Number(matchedSeason.price);
          if (dayPrice > Number(venue.price || 0)) peakDetected = true;
        }
      }
      // totalCalculated += dayPrice;
      totalCalculated += Number(dayPrice);
    }

    if (isPeakSeasonApplied !== peakDetected) {
      setTimeout(() => setIsPeakSeasonApplied(peakDetected), 0);
    }

    // return totalCalculated + additionalFee; // 추가 금액 합산
    return totalCalculated + additionalFee + extraOptionsTotal;
  };

  const totalPrice = calculateTotalPrice();

  // 관리자 단말에서 실시간 지정한 예약금 산출 타입(percent / amount) 분기 연산 및 텍스트 렌더링 모델
  const calculateDepositPrice = () => {
    if (isInspection) return inspectionFee;

    const dType = venue.depositType || "percent";
    if (dType === "amount") {
      return Number(venue.depositAmount || 0);
    } else {
      const percent = Number(venue.depositPercent || 10);
      return Math.floor((totalPrice * percent) / 100);
    }
  };

  const depositPrice = calculateDepositPrice();

  // 화면 하단 고정 바 및 안내 텍스트에 들어갈 conditional label string
  const getDepositLabel = () => {
    if (isInspection) return "사전답사비";
    return venue.depositType === "amount" ? "확정 예약금" : `예약금 (${venue.depositPercent || 10}%)`;
  };

  // 요일 숫자 배열을 "월 - 목" 형태로 변환하는 유틸리티 함수
  const getDayLabel = (days: number[]) => {
    if (!days || days.length === 0) return "";
    const sorted = [...days].sort((a, b) => a - b);

    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const ranges = [];

    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? dayNames[start] : `${dayNames[start]} - ${dayNames[end]}`);
        start = sorted[i];
        end = sorted[i];
      }
    }
    ranges.push(start === end ? dayNames[start] : `${dayNames[start]} - ${dayNames[end]}`);
    return ranges.join(", ");
  };

  const TimeSlotCard = ({ option, isSelected, onClick }: { option: any, isSelected: boolean, onClick: () => void }) => {
    // 1. 데이터 확인을 위한 로그 (브라우저 개발자 도구 콘솔에서 확인)
    console.log("Option Data Check:", option);

    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full p-6 rounded-[24px] border-[2px] transition-all duration-300 text-left flex items-center justify-between group
          ${isSelected
            ? "border-[#3182F6] bg-[#F8FAFF] shadow-[0_4px_20px_rgba(49,130,246,0.15)]"
            : "border-[#F2F4F6] bg-white hover:border-[#E5E8EB]"}`}
      >
        <div className="flex flex-col gap-1.5">
          {/* 라벨을 강제로 출력 시도 */}
          <span className={`text-[14px] font-bold ${isSelected ? "text-[#3182F6]" : "text-[#8B95A1]"}`}>
            {option.label ? option.label : "라벨 없음(데이터 확인 필요)"}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-[18px] font-black ${isSelected ? "text-[#191F28]" : "text-[#191F28]"}`}>
              {option.start} - {option.end}
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-[#F2F4F6] text-[11px] font-bold text-[#6B7684]">
              {getDayLabel(option.days)}
            </span>
          </div>
          <span className="text-[15px] font-bold text-[#4E5968]">
            {Number(option.price).toLocaleString()}원
          </span>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
          ${isSelected ? "border-[#3182F6] bg-[#3182F6]" : "border-[#E5E8EB]"}`}>
          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F4F6] text-[#191F28] font-sans selection:bg-blue-100 pb-32">
      <ScrollRestoration />

      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-[#F2F4F6]/60">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-[#F2F4F6] rounded-full transition-colors">
            <ChevronLeft className="w-7 h-7 text-[#4E5968]" />
          </button>
          <span className="font-black text-[16px] text-[#4E5968]">{isInspection ? "사전답사 신청" : "장소 예약 신청"}</span>
          <div className="w-11" /> {/* Spacer */}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 pt-8">
        <section className="mb-10 px-1">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-[28px] font-black leading-[1.35] tracking-tight mb-3 text-[#191F28]">
              {venue.venueName}<br />
              <span className="text-[#3182F6]">신청 정보를 입력해주세요</span>
            </h2>
            <p className="text-[#6B7684] text-[15px] font-bold">작성하신 정보는 장소 담당자에게만 전달됩니다.</p>
          </motion.div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          {venue.timeSlotOptions && venue.timeSlotOptions.filter((opt: any) => opt.price && Number(opt.price) > 0).length > 0 && (
            <div className="bg-white rounded-[32px] p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#F2F4F6]">
              <h3 className="text-[19px] font-black mb-7 flex items-center gap-2.5 text-[#191F28]">
                <Clock className="w-5 h-5 text-[#3182F6]" /> 시간대별 운영 옵션
                <span className="text-[#F04452] text-[14px] ml-auto">* 필수</span>
              </h3>

              <div className="space-y-3">
                {venue.timeSlotOptions
                  .filter((opt: any) => opt.price && Number(opt.price) > 0)
                  .map((opt: any, idx: number) => {
                    // 라벨 매핑 로직 통합
                    const labels = ["주중 데이 패키지", "주말 데이 패키지", "평일 올나잇 패키지", "주말 올나잇 패키지", "평일 올데이 패키지", "주말 올데이 패키지"];
                    const displayLabel = opt.label || labels[idx] || "일반 시간대";

                    return (
                      // <TimeSlotCard
                      //   key={idx}
                      //   option={{ ...opt, label: displayLabel }}
                      //   isSelected={selectedOptionIndex === idx}
                      //   onClick={() => setSelectedOptionIndex(idx)}
                      // />

                      <TimeSlotCard
                        key={idx}
                        option={{ ...opt, label: displayLabel }}
                        isSelected={selectedOptionIndex === idx}
                        onClick={() => {
                          setSelectedOptionIndex(idx);
                          setSelectedOptionData({ ...opt, label: displayLabel }); // 데이터 저장
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          )}

          {venue.extraOptions && venue.extraOptions.filter((opt: any) => opt.name && opt.name.trim() !== "").length > 0 && (
            <div className="bg-white rounded-[32px] p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#F2F4F6] mt-4">
              <h3 className="text-[19px] font-black mb-7 flex items-center gap-2.5 text-[#191F28]">
                <Settings className="w-5 h-5 text-[#3182F6]" /> 추가 옵션
              </h3>
              
              <div className="space-y-3">
                {venue.extraOptions
                  .filter((opt: any) => opt.name && opt.name.trim() !== "")
                  .map((opt: any, idx: number) => {
                    const isSelected = selectedExtraOptions.some((item) => item.name === opt.name);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedExtraOptions(selectedExtraOptions.filter((item) => item.name !== opt.name));
                          } else {
                            setSelectedExtraOptions([...selectedExtraOptions, opt]);
                          }
                        }}
                        className={`w-full p-6 rounded-[24px] border-[2px] transition-all duration-300 text-left flex items-center justify-between
                          ${isSelected 
                            ? "border-[#3182F6] bg-[#F8FAFF]" 
                            : "border-[#F2F4F6] bg-white hover:border-[#E5E8EB]"}`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[16px] font-bold ${isSelected ? "text-[#191F28]" : "text-[#4E5968]"}`}>
                            {opt.name}
                          </span>
                          <span className="text-[14px] font-bold text-[#8B95A1]">
                            {Number(opt.price).toLocaleString()}원
                          </span>
                        </div>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                          ${isSelected ? "border-[#3182F6] bg-[#3182F6]" : "border-[#E5E8EB]"}`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 일정 선택 섹션 */}
          <div className="bg-white rounded-[32px] p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#F2F4F6]">
            <h3 className="text-[19px] font-black mb-7 flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-[#3182F6]" /> 일정 및 인원
            </h3>

            <div className="space-y-6">
              {/* 모바일에서는 두 칸이 나란히 있으면 각 칸 폭이 반토막 나서, 그 위에 뜨는
                  달력 팝업(mobile 기준 w-full)까지 같이 좁아져 숫자가 다닥다닥 붙어
                  제대로 선택하기 어려웠다. 모바일에서는 한 줄씩 쌓고, sm 이상에서만
                  기존처럼 두 칸으로 나란히 보여준다. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                <MaterialCalendar
                  label="행사 시작일"
                  value={formData.startDate}
                  error={!!dateError}
                  onChange={(date) => setFormData({ ...formData, startDate: date })}
                />
                <MaterialCalendar
                  label="행사 종료일"
                  value={formData.endDate}
                  error={!!dateError}
                  onChange={(date) => setFormData({ ...formData, endDate: date })}
                />
              </div>

              {/* 중복/에러 메시지 (Toss Style) */}
              <AnimatePresence>
                {dateError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 px-5 py-4 bg-[#FFF0F0] rounded-2xl border border-[#F04452]/10"
                  >
                    <AlertCircle className="w-5 h-5 text-[#F04452]" />
                    <span className="text-[#F04452] text-[14px] font-black">{dateError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isInspection && formData.startDate && formData.endDate && !dateError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[32px] p-7 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#F2F4F6] space-y-5"
                >
                  {/* 타이틀 및 성수기 안내 뱃지 영역 - 토스 스타일로 직관성 극대화 */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-[17px] font-black text-[#191F28]">예약 금액 상세 확인</h3>

                    {/* 성수기 마크 뱃지 (기존 데이터 흐름을 깨지 않기 위해 조건부 렌더링 배치)
                    * 만약 백엔드에서 성수기 여부 변수(예: isPeakSeason)를 주면 매칭하고, 
                    * 현재는 가독성을 위해 항상 노출되거나 관련 상태에 따라 켜지도록 스타일링 셋업 완료 */}
                    {isPeakSeasonApplied && (
                      <div className="flex items-center bg-[#E8F3FF] px-3 py-1.5 rounded-full transition-all animate-pulse">
                        <span className="text-[12px] font-black text-[#1B64DA] tracking-tight">
                          🔥 성수기 요금 적용 기간
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 성수기 금액 변동에 피로감을 느끼지 않도록 돕는 친절한 토스풍 서브 안내 문구 */}
                  {isPeakSeasonApplied && (
                    <div className="bg-[#F9FAFB] rounded-2xl p-4 text-[13px] font-bold text-[#6B7684] leading-relaxed">
                      💡 선택하신 일정(<span className="text-[#1B64DA] font-black">{nights}박</span>) 중 <span className="text-[#191F28] font-black">성수기 시즌</span>이 포함되어 있어 이용 요금이 조정되었습니다.
                    </div>
                  )}

                  {/* 금액 상세 항목 레이아웃 */}
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between text-[14px] font-bold">
                      <span className="text-[#6B7684]">총 행사 기간</span>
                      <span className="text-[#191F28] font-black">{nights}박 {nights + 1}일</span>
                    </div>

                    <div className="flex justify-between text-[14px] font-bold">
                      <span className="text-[#6B7684]">총 이용 요금 (합계)</span>
                      <span className="text-[#191F28] font-black text-[15px]">{totalPrice.toLocaleString()}원</span>
                    </div>

                    <hr className="border-[#F2F4F6] my-3" />

                    {/* 주 결제 데이터 연동 영역 */}
                    <div className="flex justify-between text-[15px] font-black items-center">
                      <span className="text-[#3182F6]">{getDepositLabel()}</span>
                      <span className="text-[#3182F6] text-[18px] font-black">{depositPrice.toLocaleString()}원</span>
                    </div>

                    <div className="flex justify-between text-[13px] font-bold text-[#8B95A1] items-center">
                      <span>현장 결제 잔금</span>
                      <span className="font-black text-[#4E5968]">{(totalPrice - depositPrice).toLocaleString()}원</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* <div className="space-y-2.5">
                <label className="text-[13px] font-black text-[#6B7684] ml-1">참가 예상 인원</label>
                <div className="relative group">
                  <input
                    type="number" required
                    // value={formData.attendees}
                    value={additionalAttendees}
                    onChange={(e) => handleAdditionalAttendeesChange(Number(e.target.value))}
                    // onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                    className="w-full h-[64px] pl-6 pr-14 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] transition-all font-black outline-none text-[17px]"
                    placeholder={`최대 ${venue.capacity}명`}
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[#6B7684]">명</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[13px] font-black text-[#6B7684] ml-1">추가 인원</label>
                <div className="flex items-center gap-2">
                  // 마이너스 버튼 *
                  <button
                    type="button"
                    onClick={() => handleAdditionalAttendeesChange(formData.additionalAttendees - 1)}
                    className="w-[64px] h-[64px] bg-[#F9FAFB] rounded-[20px] flex items-center justify-center text-[24px] font-black text-[#6B7684] hover:bg-[#F2F4F6]"
                  >-</button>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      required
                      value={formData.additionalAttendees}
                      onChange={(e) => handleAdditionalAttendeesChange(Number(e.target.value))}
                      className="w-full h-[64px] text-center bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] transition-all font-black outline-none text-[17px]"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[#6B7684]">명</span>
                  </div>

                  // 플러스 버튼
                  <button
                    type="button"
                    onClick={() => handleAdditionalAttendeesChange(formData.additionalAttendees + 1)}
                    className="w-[64px] h-[64px] bg-[#F9FAFB] rounded-[20px] flex items-center justify-center text-[24px] font-black text-[#6B7684] hover:bg-[#F2F4F6]"
                  >+</button>
                </div>
              </div> */}

              <div className="space-y-6">
                {/* 기본 인원 안내 섹션 */}
                {/* <div className="p-4 bg-[#F2F4F6] rounded-[20px]">
                  <p className="text-[14px] font-bold text-[#4E5968]">
                    기본 인원: <span className="text-[#3182F6]">{venue.baseCapacity || 0}명</span>
                  </p>
                  <p className="text-[12px] text-[#8B95A1] mt-1">
                    기본 인원 초과 시 1인당 {Number(venue.perPersonPrice || 0).toLocaleString()}원이 추가됩니다.
                  </p>
                </div> */}
                {venue.baseCapacity > 0 && (
                  <div className="p-4 bg-[#F2F4F6] rounded-[20px]">
                    <p className="text-[14px] font-bold text-[#4E5968]">
                      기본 인원: <span className="text-[#3182F6]">{venue.baseCapacity}명</span>
                    </p>
                    <p className="text-[12px] text-[#8B95A1] mt-1">
                      기본 인원 초과 시 1인당 {Number(venue.perPersonPrice || 0).toLocaleString()}원이 추가됩니다.
                    </p>
                  </div>
                )}

                {/* 추가 인원 입력 섹션 */}
                <div className="space-y-2.5">
                  <label className="text-[13px] font-black text-[#6B7684] ml-1">총 인원</label>
                  <div className="flex items-center gap-2">
                    {/* 마이너스 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleAdditionalAttendeesChange(Math.max(0, formData.additionalAttendees - 1))}
                      className="w-[64px] h-[64px] bg-[#F9FAFB] rounded-[20px] flex items-center justify-center text-[24px] font-black text-[#6B7684] hover:bg-[#F2F4F6]"
                    >-</button>

                    <div className="relative flex-1">
                      {/* <input
                        type="number"
                        required
                        value={formData.additionalAttendees}
                        onChange={(e) => handleAdditionalAttendeesChange(Number(e.target.value))}
                        className="w-full h-[64px] text-center bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] transition-all font-black outline-none text-[17px]"
                      /> */}
                      <input
                        type="number"
                        required
                        // value가 0일 때도 표시되도록 처리
                        value={formData.additionalAttendees === 0 ? "" : formData.additionalAttendees}
                        onChange={(e) => handleAdditionalAttendeesChange(e.target.value)}
                        className="w-full h-[64px] text-center bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] transition-all font-black outline-none text-[17px]"
                        placeholder="0"
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[#6B7684]">명</span>
                    </div>

                    {/* 플러스 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleAdditionalAttendeesChange(formData.additionalAttendees + 1)}
                      className="w-[64px] h-[64px] bg-[#F9FAFB] rounded-[20px] flex items-center justify-center text-[24px] font-black text-[#6B7684] hover:bg-[#F2F4F6]"
                    >+</button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#F2F4F6]">
                <MaterialCalendar
                  label="사전답사 희망 일자 (다중 선택 가능)"
                  value=""
                  onChange={handleAddInspectionDate}
                />
                <div className="flex flex-wrap gap-2 mt-4 min-h-[40px]">
                  <AnimatePresence mode="popLayout">
                    {formData.inspectionDate.length > 0 ? (
                      formData.inspectionDate.map((date) => (
                        <motion.div
                          key={date} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-2 bg-[#F2F4F6] px-4 py-2.5 rounded-full"
                        >
                          <span className="text-[14px] font-black text-[#4E5968]">{date}</span>
                          <button type="button" onClick={() => handleRemoveInspectionDate(date)} className="p-0.5 hover:bg-[#E5E8EB] rounded-full transition-colors">
                            <X className="w-4 h-4 text-[#8B95A1]" />
                          </button>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-[13px] text-[#B0B8C1] font-bold ml-1">방문 가능한 날짜를 선택해주세요</p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* 교회 정보 섹션 */}
          <div className="bg-white rounded-[32px] p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#F2F4F6]">
            <h3 className="text-[19px] font-black mb-7 flex items-center gap-2.5">
              <Church className="w-5 h-5 text-[#3182F6]" /> 교회 정보
            </h3>
            <div className="space-y-5">
              <div className="space-y-2.5">
                <label className="text-[13px] font-black text-[#6B7684] ml-1">교회명</label>
                <input
                  type="text" required value={formData.churchName}
                  onChange={(e) => setFormData({ ...formData, churchName: e.target.value })}
                  placeholder="정확한 교회 명칭을 입력해주세요"
                  className="w-full h-[64px] px-6 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] transition-all font-black outline-none text-[17px]"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[13px] font-black text-[#6B7684] ml-1">소속 교단</label>
                <div className="relative">
                  <select
                    required value={formData.denomination}
                    onChange={(e) => setFormData({ ...formData, denomination: e.target.value })}
                    className="w-full h-[64px] px-6 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] transition-all font-black appearance-none outline-none text-[17px]"
                  >
                    <option value="">교단 선택</option>
                    <option value="예장통합">예장통합</option>
                    <option value="예장합동">예장합동</option>
                    <option value="기감">기독교대한감리회</option>
                    <option value="기성">기독교대한성결교회</option>
                    <option value="기하성">기독교대한하나님의성회</option>
                    <option value="기타">기타 / 독립교단</option>
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B0B8C1] pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 담당자 섹션 */}
          <div className="bg-white rounded-[32px] p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#F2F4F6]">
            <h3 className="text-[19px] font-black mb-7 flex items-center gap-2.5">
              <Phone className="w-5 h-5 text-[#3182F6]" /> 담당자 정보
            </h3>
            <div className="space-y-5">
              <div className="space-y-2.5">
                <label className="text-[13px] font-black text-[#6B7684] ml-1">담당자 성함</label>
                <input
                  type="text" required value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full h-[64px] px-6 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] transition-all font-black outline-none text-[17px]"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-[13px] font-black text-[#6B7684] ml-1">휴대폰 번호</label>
                <input
                  type="tel" required value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                  placeholder="010-0000-0000"
                  className="w-full h-[64px] px-6 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] transition-all font-black outline-none text-[17px]"
                />
              </div>
            </div>
          </div>

          {/* 약관 섹션 */}
          <div className="bg-white rounded-[32px] p-7 space-y-2 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#F2F4F6]">
            <div className="flex items-center justify-between py-3 cursor-pointer" onClick={() => setAgreeToTerms(!agreeToTerms)}>
              <div className="flex flex-col">
                <span className="font-black text-[16px] text-[#333D4B]">이용약관 동의 (필수)</span>
                <span className="text-[13px] text-[#3182F6] font-bold underline" onClick={(e) => { e.stopPropagation(); setExpandedIndex(expandedIndex === 0 ? null : 0); }}>자세히 보기</span>
              </div>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${agreeToTerms ? "bg-[#3182F6]" : "bg-[#F2F4F6]"}`}>
                <CheckCircle2 className={`w-5 h-5 ${agreeToTerms ? "text-white" : "text-[#ADB5BD]"}`} />
              </div>
            </div>
            <AnimatePresence>
              {expandedIndex === 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="bg-[#F9FAFB] rounded-2xl p-5 mb-4 text-[13px] leading-[1.6] text-[#6B7684] font-bold">
                    본 서비스 이용을 위해 선교지 및 장소 제공자의 운영 규정을 준수해야 합니다. 기물 파손 시 원상 복구의 의무가 있으며, 종교적 목적 외 사용을 금합니다.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-[1px] bg-[#F2F4F6]" />

            <div className="flex items-center justify-between py-3 cursor-pointer" onClick={() => setAgreeToRefund(!agreeToRefund)}>
              <div className="flex flex-col">
                <span className="font-black text-[16px] text-[#333D4B]">취소 및 환불 규정 (필수)</span>
                <span className="text-[13px] text-[#3182F6] font-bold underline" onClick={(e) => { e.stopPropagation(); setExpandedIndex(expandedIndex === 1 ? null : 1); }}>자세히 보기</span>
              </div>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${agreeToRefund ? "bg-[#3182F6]" : "bg-[#F2F4F6]"}`}>
                <CheckCircle2 className={`w-5 h-5 ${agreeToRefund ? "text-white" : "text-[#ADB5BD]"}`} />
              </div>
            </div>
            <AnimatePresence>
              {expandedIndex === 1 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="bg-[#F9FAFB] rounded-2xl p-5 mt-2 text-[13px] leading-[1.6] text-[#6B7684] font-bold">
                    예약 확정 후 7일 전 취소 시 100% 환불, 3일 전 취소 시 50% 환불, 당일 취소 시 환불이 불가합니다. 단, 사전답사 이후 최종  반환되지 않습니다.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-4">
            <div className="bg-[#191F28] rounded-[32px] p-6 sm:p-8 shadow-2xl transition-all duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">

                {/* 왼쪽 : 다이나믹 산출 금액 요약 영역 (토스 스타일의 직관적인 위계 구조로 개선) */}
                <div className="flex flex-col gap-2">
                  {/* 상단 라벨: 텍스트 굵기를 약간 조절하고 자간을 넓혀 가독성 및 세련미 확보 */}
                  <span className="text-[#8B95A1] font-bold text-[13px] tracking-wider uppercase">
                    {isInspection ? "답사 장소 예약금" : `${nights}박 총 합계`} — {getDepositLabel()}
                  </span>

                  {/* 실시간 계산 처리 데이터 금액 바인딩 */}
                  <div className="flex flex-col gap-1.5">
                    {/* 1) 장소 예약금 (depositPrice) 표시 단락: 금액을 토스 블루 컬러로 변경하고 폰트 크기를 키워 시선을 집중시킴 */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-[14px] text-[#ADB5BD] font-medium mr-1">결제할 예약금</span>
                      <span className="text-[32px] font-black text-[#3182F6] tracking-tight leading-none">
                        {depositPrice.toLocaleString()}
                      </span>
                      <span className="text-[18px] font-bold text-[#3182F6]">원</span>
                    </div>

                    {/* 2) 전체 총 금액 (totalPrice) 서브 텍스트 표기: 가독성을 위해 배경 색상 칩(Badge) 형태로 감싸 시각적 분리 제공 */}
                    {!isInspection && (
                      <div className="inline-flex items-center bg-[#202937] px-3 py-1.5 rounded-xl w-fit mt-1">
                        <span className="text-[13px] text-[#ADB5BD] font-medium">
                          현장 정산 잔금 포함 총액: <strong className="text-white font-semibold">{totalPrice.toLocaleString()}원</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 오른쪽: 메인 액션 버튼 레이아웃 */}
                <div className="w-full sm:w-auto flex items-center gap-4 flex-1 sm:flex-none justify-end">
                  <button
                    type="submit"
                    // disabled={isSubmitting || !!dateError || (!isInspection && (!formData.startDate || !formData.endDate))}
                    // className={`w-full sm:w-[240px] h-[60px] rounded-[20px] font-black text-[16px] transition-all duration-200 flex items-center justify-center gap-2
                    //   ${(isSubmitting || !!dateError || (!isInspection && (!formData.startDate || !formData.endDate)))
                    //     ? "bg-[#333D4B] text-[#6B7684] cursor-not-allowed opacity-50"
                    //     : "bg-[#3182F6] text-white hover:bg-[#1b64da] active:scale-[0.97] shadow-[0_8px_24px_rgba(49,130,246,0.25)]"}`}
                    disabled={
                      isSubmitting ||
                      !!dateError ||
                      (!isInspection && (!formData.startDate || !formData.endDate)) ||
                      (venue.timeSlotOptions && venue.timeSlotOptions.length > 0 && selectedOptionIndex === null)
                    }
                    className={`w-full sm:w-[240px] h-[60px] rounded-[20px] font-black text-[16px] transition-all duration-200 flex items-center justify-center gap-2
            ${(isSubmitting || !!dateError || (!isInspection && (!formData.startDate || !formData.endDate)) || (venue.timeSlotOptions && venue.timeSlotOptions.length > 0 && selectedOptionIndex === null))
                        ? "bg-[#333D4B] text-[#6B7684] cursor-not-allowed opacity-50"
                        : "bg-[#3182F6] text-white hover:bg-[#1b64da] active:scale-[0.97] shadow-[0_8px_24px_rgba(49,130,246,0.25)]"}`}

                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {isInspection ? "사전답사 신청하기" : "예약 신청 완료하기"}
                        <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </div>

              </div>

              {/* 하단 안내 가이드 문구: 가독성을 위해 투명도를 낮추고 깔끔한 레이아웃 유지 */}
              <div className="mt-6 pt-5 border-t border-white/[0.04] text-center text-[#8B95A1] text-[13px] font-medium space-y-1.5">
                <div className="flex items-center gap-2 justify-center">
                  <Shield className="w-4 h-4 text-[#3182F6] shrink-0" />
                  <p className="leading-relaxed">
                    {isInspection
                      ? "답사 신청 후 담당자가 확인하여 신속하게 연락을 드립니다."
                      : "신청 완료 후 담당자 확인 과정을 거쳐 예약이 최종 확정됩니다."}
                  </p>
                </div>
                <p className="leading-relaxed">예약금은 사전답사 이후 최종 확정단계에서 진행하게 됩니다.</p>
              </div>
            </div>
          </div>
        </form>
      </main>

      <footer className="mt-20 px-6 text-center text-[#B0B8C1] text-[13px] font-bold">
        <p>© STAYON. All rights reserved.</p>
      </footer>
    </div>
  );
}
