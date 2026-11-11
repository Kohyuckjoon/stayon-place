import { useState, useEffect, useRef } from "react";
import { ScrollRestoration, useSearchParams } from "react-router-dom";
import {
  CheckCircle, XCircle, Clock, Eye,
  Search, Building2, Calendar, AlertTriangle,
  User, MapPin, Phone, Info,
  Users, CreditCard, MessageSquare,
  RotateCcw, ChevronRight, ChevronLeft, Mail, ClipboardCheck,
  CalendarCheck, Trash2, Check, MapPinned, Tent, Receipt, Coins, ShieldOff, BarChart3, Megaphone, Ban, Volume2, CalendarDays,
  LayoutDashboard, ClipboardList, MessageSquareText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, functions } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, orderBy, deleteDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";

// [디자인] 통계 카드 - 스타일
const StatCard = ({ title, value, icon: Icon, colorClass, textColor }: any) => (
  <div className="bg-white px-4 py-3.5 md:px-5 md:py-4 rounded-2xl border border-gray-100 shadow-[0_4px_16px_rgb(0,0,0,0.03)] flex items-center justify-between group transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
    <div>
      <p className="text-[12px] md:text-[13px] font-bold text-[#8B95A1] mb-0.5 md:mb-1">{title}</p>
      <p className={`text-[17px] md:text-[20px] font-black ${textColor || "text-[#191F28]"}`}>{value}</p>
    </div>
    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass} transition-transform group-hover:scale-110`}>
      <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
    </div>
  </div>
);

// [디자인] 정보 행 - 가독성 강화
const InfoRow = ({ label, value, icon: Icon }: any) => (
  <div className="flex items-center gap-3 md:gap-4 p-3.5 md:p-5 bg-[#F9FAFB] rounded-xl md:rounded-2xl border border-gray-50 transition-colors hover:bg-[#F2F4F6]">
    <div className="p-2.5 md:p-3 bg-white rounded-xl shadow-sm text-[#3182F6] shrink-0">
      <Icon className="w-4 h-4 md:w-5 md:h-5" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] md:text-[11px] font-black text-[#ADB5BD] uppercase tracking-widest mb-0.5">{label}</span>
      <span className="text-[14px] md:text-[16px] font-black text-[#333D4B] leading-tight break-words">{value || "-"}</span>
    </div>
  </div>
);

type BookingTab = "pending" | "confirmed" | "inspection_confirmed" | "approved" | "deposit_paid" | "cancelled";
const VALID_TABS: BookingTab[] = ["pending", "confirmed", "inspection_confirmed", "approved", "deposit_paid", "cancelled"];

// "답사 가능 승인" 시 관리자가 고를 수 있는 시간대 목록 (09:00~18:00, 30분 단위)
const INSPECTION_TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let totalMin = 9 * 60; totalMin <= 18 * 60; totalMin += 30) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
})();

// 대관 기간 변경 시 숙박 요금을 다시 계산한다. Booking.tsx의 calculateTotalPrice에서
// 숙박 요금 부분만 같은 기준으로 옮긴 것으로, 추가 인원·옵션 요금은 포함하지 않는다.
function calculateStayPrice(venue: any, booking: any, startDate: string, endDate: string) {
  const basePrice = Number(booking.selectedTimeSlot?.price ?? venue.price ?? 0);
  const nights = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  if (nights <= 0) return basePrice;

  let total = 0;
  for (let i = 0; i < nights; i++) {
    const currentDay = new Date(startDate);
    currentDay.setDate(currentDay.getDate() + i);
    const currentMMDD = `${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;

    let dayPrice = basePrice;
    if (venue.useSeasonalPrice && venue.seasonPrices?.length > 0) {
      const matchedSeason = venue.seasonPrices.find((season: any) => {
        if (!season.start || !season.end || season.price === "" || season.price == null) return false;
        let startSeason = season.start.replace(/\//g, '-').trim();
        let endSeason = season.end.replace(/\//g, '-').trim();
        if (startSeason.length === 10) startSeason = startSeason.substring(5);
        if (endSeason.length === 10) endSeason = endSeason.substring(5);
        return startSeason <= endSeason
          ? (currentMMDD >= startSeason && currentMMDD <= endSeason)
          : (currentMMDD >= startSeason || currentMMDD <= endSeason);
      });
      if (matchedSeason) {
        const hasExtraNightPrice = matchedSeason.extraNightPrice !== "" && matchedSeason.extraNightPrice != null;
        dayPrice = i > 0 && hasExtraNightPrice ? Number(matchedSeason.extraNightPrice) : Number(matchedSeason.price);
      }
    }
    total += dayPrice;
  }
  return total;
}

// 새 숙박 요금에 추가 인원·옵션 요금을 더한다. 기존 금액이 숙박 요금보다 적으면
// (날짜만 먼저 바뀐 예약 등) 추가 요금이 없는 것으로 본다.
function calculateChangedBookingPrices(venue: any, booking: any, startDate: string, endDate: string) {
  const oldTotal = Number(booking.totalPrice || 0);
  const extraFees = Math.max(0, oldTotal - calculateStayPrice(venue, booking, booking.startDate, booking.endDate));
  const totalPrice = calculateStayPrice(venue, booking, startDate, endDate) + extraFees;
  // depositPercent가 0이면 정액 예약금이라 그대로 둔다.
  const depositPercent = Number(booking.depositPercent ?? (venue.depositType === "amount" ? 0 : (venue.depositPercent || 10)));
  const depositPrice = depositPercent > 0 ? Math.floor((totalPrice * depositPercent) / 100) : Number(booking.depositPrice || 0);
  return { totalPrice, depositPrice, balancePrice: totalPrice - depositPrice };
}

// Booking.tsx의 MaterialCalendar(토스 스타일 달력)와 동일한 디자인을 그대로 복제한 것.
// Booking.tsx(결제 흐름 보호 파일)는 절대 건드리지 않기 위해 여기서 별도로 둔다.
function MaterialCalendar({ value, onChange, label }: { value: string, onChange: (date: string) => void, label: string }) {
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

  // 이 달력은 스크롤 가능한 모달 안에서 열리는데, 팝업이 입력창 아래로 펼쳐지다 보니
  // 입력창이 모달 하단 쪽에 있으면 펼쳐진 달력이 보이는 영역 밖으로 내려가서 사용자가
  // 직접 스크롤해야만 보였다. 열릴 때 자동으로 스크롤해서 바로 보이게 한다.
  useEffect(() => {
    if (isOpen) {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isOpen]);

  return (
    <div className="relative flex-1 space-y-2.5" ref={containerRef}>
      <label className="text-[13px] font-black ml-1 text-[#6B7684]">{label}</label>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-[56px] px-5 bg-[#F9FAFB] border-2 flex items-center justify-between rounded-[20px] transition-all cursor-pointer
          ${isOpen ? "border-[#3182F6] bg-white shadow-[0_0_0_1px_#3182F6]" : "border-transparent hover:bg-[#F2F4F6]"}`}
      >
        <span className={`font-black text-[15px] leading-tight ${value ? "text-[#191F28]" : "text-[#ADB5BD]"}`}>
          {value || "날짜 선택"}
        </span>
        <CalendarDays className={`w-5 h-5 ${isOpen ? "text-[#3182F6]" : "text-[#B0B8C1]"}`} />
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

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { onChange(dateStr); setIsOpen(false); }}
                    className={`aspect-square flex items-center justify-center text-[14px] font-black rounded-[14px] transition-all
                      ${isSelected ? "bg-[#3182F6] text-white" : "text-[#4E5968] hover:bg-[#F2F8FF] hover:text-[#3182F6]"}`}
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

export function AdminDashboard2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") as BookingTab) ? (searchParams.get("tab") as BookingTab) : "pending";
  const [activeTab, setActiveTabState] = useState<BookingTab>(initialTab);
  const setActiveTab = (tab: BookingTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  // 교회 내부 일정이 아직 안 정해진 채로 일단 신청부터 하는 경우가 있어서, 신청자가
  // 사전답사 희망일을 안 넣었어도 관리자가 나중에 직접 추가/삭제할 수 있게 한다.
  const [newInspectionDateInput, setNewInspectionDateInput] = useState("");
  // "답사 가능 승인" 시 신청자가 제출한 희망 날짜 중 최종 1건 + 시간을 같이 확정한다.
  const [confirmDateChoice, setConfirmDateChoice] = useState("");
  const [confirmTimeChoice, setConfirmTimeChoice] = useState("");
  // 신청자가 수련회 날짜를 바꾸고 싶어 할 때 관리자가 대관 기간을 직접 변경한다.
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [isSavingDates, setIsSavingDates] = useState(false);

  // 다른 예약 카드를 선택할 때마다 이전 선택이 남아있지 않도록 초기화하고,
  // 이미 희망 날짜가 하나뿐이면 편의상 기본으로 선택해둔다.
  useEffect(() => {
    setIsEditingDates(false);
    if (!selectedBooking) return;
    setConfirmDateChoice(selectedBooking.confirmedInspectionDate || (selectedBooking.inspectionDate?.length === 1 ? selectedBooking.inspectionDate[0] : ""));
    setConfirmTimeChoice(selectedBooking.confirmedInspectionTime || "");
  }, [selectedBooking?.id]);

  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 사이드바의 "장소 등록 관리" 그룹 배지 표시용 (실제 목록/상세는 /admin/venues에서 관리)
  useEffect(() => {
    const q = query(collection(db, "venues"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVenues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 사이드바의 "차단된 회원" 배지 표시용 (실제 목록/상세는 /admin/users에서 관리)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setSuspendedCount(snapshot.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => unsubscribe();
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  const handleDeleteBooking = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("이 신청 내역을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
    try {
      await deleteDoc(doc(db, "bookings", id));
      alert("성공적으로 삭제되었습니다.");
      if (selectedBooking?.id === id) setSelectedBooking(null);
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const bookingRef = doc(db, "bookings", id);
      await updateDoc(bookingRef, { status: newStatus });

      const statusMap: any = {
        confirmed: "사전답사 가능 승인",
        approved: "최종 예약 승인 (결제 대기)",
        cancelled: "신청 반려",
        pending: "대기 상태로 복원",
        deposit_paid: "입금 확인 및 완료"
      };

      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");

      await triggerAdminNotification({
        type: 'APPROVE',
        payload: {
          status: statusMap[newStatus] || newStatus,
          venueName: selectedBooking?.venueName || "장소 정보 없음",
          userName: `${selectedBooking?.churchName} (${selectedBooking?.contactName})`
        }
      });

      alert(`상태가 [${statusMap[newStatus]}]로 변경되었습니다.`);
      setSelectedBooking(null);
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  // "답사 가능 승인"은 일반 상태 변경과 달리, 신청자가 제출(또는 관리자가 직접 추가)한
  // 희망 날짜 중 최종 1건과 시간을 같이 확정해서 저장해야 해서 별도 핸들러로 분리했다.
  const handleConfirmInspectionApproval = async () => {
    if (!selectedBooking || !confirmDateChoice || !confirmTimeChoice) return;
    try {
      const bookingRef = doc(db, "bookings", selectedBooking.id);
      await updateDoc(bookingRef, {
        status: "confirmed",
        confirmedInspectionDate: confirmDateChoice,
        confirmedInspectionTime: confirmTimeChoice,
      });

      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
      await triggerAdminNotification({
        type: 'APPROVE',
        payload: {
          status: "사전답사 가능 승인",
          venueName: selectedBooking?.venueName || "장소 정보 없음",
          userName: `${selectedBooking?.churchName} (${selectedBooking?.contactName})`
        }
      });

      alert(`답사 일정이 [${confirmDateChoice} ${confirmTimeChoice}]로 확정되어 승인되었습니다.`);
      setSelectedBooking(null);
    } catch (error) {
      console.error("답사 승인 처리 실패:", error);
      alert("답사 승인 처리 중 오류가 발생했습니다.");
    }
  };

  const handleAddInspectionDate = async () => {
    if (!newInspectionDateInput || !selectedBooking) return;
    const current: string[] = selectedBooking.inspectionDate || [];
    if (current.includes(newInspectionDateInput)) {
      setNewInspectionDateInput("");
      return;
    }
    const updated = [...current, newInspectionDateInput].sort();
    try {
      await updateDoc(doc(db, "bookings", selectedBooking.id), { inspectionDate: updated });
      setSelectedBooking((prev: any) => prev ? { ...prev, inspectionDate: updated } : prev);
      setNewInspectionDateInput("");
    } catch (error) {
      console.error("답사 일정 추가 실패:", error);
      alert("답사 일정 추가 중 오류가 발생했습니다.");
    }
  };

  const handleRemoveInspectionDate = async (targetDate: string) => {
    if (!selectedBooking) return;
    const updated: string[] = (selectedBooking.inspectionDate || []).filter((d: string) => d !== targetDate);
    try {
      await updateDoc(doc(db, "bookings", selectedBooking.id), { inspectionDate: updated });
      setSelectedBooking((prev: any) => prev ? { ...prev, inspectionDate: updated } : prev);
    } catch (error) {
      console.error("답사 일정 삭제 실패:", error);
      alert("답사 일정 삭제 중 오류가 발생했습니다.");
    }
  };

  // 예약금 입금 완료(deposit_paid) 예약도 일정 변경 요청이 있어 날짜를 바꿀 수 있게 한다.
  // 이때 예약금은 이미 받은 금액이라 그대로 두고, 총 금액·잔금만 다시 계산한다(아래 changedPrices).
  const canChangeDates = selectedBooking && !["completed", "cancelled"].includes(selectedBooking.status);
  const isDepositPaidBooking = selectedBooking?.status === "deposit_paid";
  const isDateRangeInvalid = !newStartDate || !newEndDate || newEndDate < newStartDate;
  const isDateRangeUnchanged = newStartDate === selectedBooking?.startDate && newEndDate === selectedBooking?.endDate;
  const overlappingBookings = !selectedBooking || isDateRangeInvalid ? [] : bookings.filter(b =>
    b.id !== selectedBooking.id
    && b.venueId === selectedBooking.venueId
    && b.status !== "cancelled"
    && b.startDate && b.endDate
    && newStartDate <= b.endDate && newEndDate >= b.startDate
  );
  // 결제 대기 이후 단계의 예약이나 관리자가 막아둔 날짜와 겹치면 저장할 수 없고,
  // 그 이전 단계의 예약과 겹치면 안내만 하고 저장은 허용한다.
  const hasOccupiedOverlap = overlappingBookings.some(b => ["approved", "deposit_paid", "completed"].includes(b.status));
  const selectedBookingVenue = venues.find(v => v.id === selectedBooking?.venueId);
  const selectedBookingBlockedDates: string[] = selectedBookingVenue?.blockedDates || [];
  // 사전답사 예약의 금액은 날짜와 상관없는 답사비라서 일반 예약만 다시 계산한다.
  const isInspectionBooking = selectedBooking?.type === "inspection" || selectedBooking?.depositLabel === "사전답사비";
  const recalculatedPrices = selectedBooking && selectedBookingVenue && !isInspectionBooking && !isDateRangeInvalid
    ? calculateChangedBookingPrices(selectedBookingVenue, selectedBooking, newStartDate, newEndDate)
    : null;
  // 입금 완료 예약: 받은 예약금은 고정, 잔금 = 새 총 금액 - 받은 예약금
  const paidDeposit = Number(selectedBooking?.depositPrice || 0);
  const changedPrices = recalculatedPrices && isDepositPaidBooking
    ? { totalPrice: recalculatedPrices.totalPrice, depositPrice: paidDeposit, balancePrice: recalculatedPrices.totalPrice - paidDeposit }
    : recalculatedPrices;
  const isPriceUnavailable = !!selectedBooking && !isInspectionBooking && !selectedBookingVenue;
  // 날짜가 같아도 저장된 금액이 틀어져 있으면 바로잡을 수 있게 한다.
  const hasNoDateChanges = isDateRangeUnchanged && (!changedPrices || changedPrices.totalPrice === Number(selectedBooking?.totalPrice || 0));
  const hasBlockedDateOverlap = !isDateRangeInvalid && selectedBookingBlockedDates.some(dateStr => {
    const d = new Date(dateStr);
    return d >= new Date(newStartDate) && d <= new Date(newEndDate);
  });

  const handleStartEditingDates = () => {
    setNewStartDate(selectedBooking?.startDate || "");
    setNewEndDate(selectedBooking?.endDate || "");
    setIsEditingDates(true);
  };

  const handleSaveBookingDates = async () => {
    if (!selectedBooking || isDateRangeInvalid || hasNoDateChanges || hasOccupiedOverlap || hasBlockedDateOverlap || isPriceUnavailable || isSavingDates) return;
    const priceMessage = changedPrices && isDepositPaidBooking
      ? `총 금액: ${Number(selectedBooking.totalPrice || 0).toLocaleString()}원 → ${changedPrices.totalPrice.toLocaleString()}원\n예약금(입금 완료): ${paidDeposit.toLocaleString()}원 (변동 없음)\n잔금: ${(Number(selectedBooking.totalPrice || 0) - paidDeposit).toLocaleString()}원 → ${changedPrices.balancePrice.toLocaleString()}원`
      : changedPrices
      ? `총 금액:${Number(selectedBooking.totalPrice || 0).toLocaleString()}원 → ${changedPrices.totalPrice.toLocaleString()}원\n예약금: ${Number(selectedBooking.depositPrice || 0).toLocaleString()}원 → ${changedPrices.depositPrice.toLocaleString()}원`
      : "사전답사비는 바뀌지 않습니다.";
    if (!window.confirm(`대관 기간을 변경할까요?\n\n기존: ${selectedBooking.startDate} ~ ${selectedBooking.endDate}\n변경: ${newStartDate} ~ ${newEndDate}\n\n${priceMessage}`)) return;
    try {
      setIsSavingDates(true);
      const updates = { startDate: newStartDate, endDate: newEndDate, ...(changedPrices || {}) };
      await updateDoc(doc(db, "bookings", selectedBooking.id), updates);
      setSelectedBooking((prev: any) => prev ? { ...prev, ...updates } : prev);
      setIsEditingDates(false);
      alert("대관 기간이 변경되었습니다.");
    } catch (error) {
      console.error("대관 기간 변경 실패:", error);
      alert("대관 기간 변경 중 오류가 발생했습니다.");
    } finally {
      setIsSavingDates(false);
    }
  };

  const filteredData = bookings.filter(b => b.status === activeTab && (b.churchName?.includes(searchQuery) || b.contactName?.includes(searchQuery)));
  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const inspectionReadyCount = bookings.filter(b => b.status === "inspection_confirmed").length;
  const approvedCount = bookings.filter(b => b.status === "approved" || b.status === "deposit_paid").length;

  return (
    <AdminSidebarLayout
      brandSubtitle="예약 및 답사 문의 관리자"
      sections={[
        {
          label: "개요",
          items: [
            { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin/dashboard" },
            { id: "pre_visit_checklists", label: "사전답사 체크리스트", icon: ClipboardList, href: "/admin/checklists" },
          ],
        },
        {
          label: "회원 관리",
          items: [
            { id: "users", label: "전체 회원", icon: Users, href: "/admin/users" },
            { id: "suspended", label: "차단된 회원", count: suspendedCount, icon: ShieldOff, accentColor: "#F04452", href: "/admin/users?tab=suspended" },
          ],
        },
        {
          label: "장소 등록 관리",
          items: [
            { id: "v_pending", label: "검토 대기", count: venues.filter(v => v.status === "pending").length, icon: Clock, accentColor: "#FF9500", href: "/admin/venues?tab=pending" },
            { id: "v_approved", label: "승인 완료", count: venues.filter(v => v.status === "approved").length, icon: CheckCircle, href: "/admin/venues?tab=approved" },
            { id: "v_rejected", label: "반려 / 삭제", count: venues.filter(v => v.status === "rejected").length, icon: XCircle, href: "/admin/venues?tab=rejected" },
            { id: "v_schedule", label: "장소별 일정관리", count: venues.filter(v => v.status === "approved").length, icon: Calendar, href: "/admin/venues?tab=schedule" },
            { id: "v_blockrequests", label: "차단 신청 승인", icon: Ban, accentColor: "#F04452", href: "/admin/venues?tab=blockRequests" },
            { id: "venue_suggestions", label: "장소 추천 제보", icon: Megaphone, accentColor: "#F2994A", href: "/admin/venue-suggestions" },
          ],
        },
        {
          label: "국내선교 관리",
          items: [
            { id: "mv_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/mission-venues?tab=pending" },
            { id: "mv_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/mission-venues?tab=approved" },
            { id: "mv_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/mission-venues?tab=rejected" },
            { id: "mv_schedule", label: "장소별 일정관리", icon: Calendar, href: "/admin/mission-venues?tab=schedule" },
          ],
        },
        {
          label: "예약 및 답사 문의",
          items: [
            { id: "pending", label: "예약 대기", count: pendingCount, icon: ClipboardCheck, accentColor: "#FF9500" },
            { id: "confirmed", label: "답사 승인", count: bookings.filter(b => b.status === "confirmed").length, icon: CalendarCheck },
            { id: "inspection_confirmed", label: "답사 확정", count: inspectionReadyCount, icon: MapPinned, accentColor: "#3182F6" },
            { id: "approved", label: "결제 대기", count: bookings.filter(b => b.status === "approved").length, icon: CreditCard },
            { id: "deposit_paid", label: "완료", count: bookings.filter(b => b.status === "deposit_paid").length, icon: CheckCircle },
          ],
        },
        {
          label: "외부 사역팀 관리",
          items: [
            { id: "t_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/teams?tab=pending" },
            { id: "t_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/teams?tab=approved" },
            { id: "t_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/teams?tab=rejected" },
            { id: "t_inquiries", label: "문의 현황", icon: BarChart3, href: "/admin/team-inquiries" },
            { id: "t_ads", label: "광고 설정", icon: Megaphone, href: "/admin/team-ads" },
          ],
        },
        {
          label: "합주실 관리",
          items: [
            { id: "r_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/band-rooms?tab=pending" },
            { id: "r_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/band-rooms?tab=approved" },
            { id: "r_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/band-rooms?tab=rejected" },
            { id: "r_bookings", label: "예약 관리", icon: CreditCard, href: "/admin/band-room-bookings" },
            { id: "r_ads", label: "광고 설정", icon: Megaphone, href: "/admin/band-room-ads" },
          ],
        },
        {
          label: "교회 관리",
          items: [
            { id: "c_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/churches?tab=pending" },
            { id: "c_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/churches?tab=approved" },
            { id: "c_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/churches?tab=rejected" },
          ],
        },
        {
          label: "굿즈 관리",
          items: [
            { id: "g_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/goods?tab=pending" },
            { id: "g_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/goods?tab=approved" },
            { id: "g_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/goods?tab=rejected" },
          ],
        },
        {
          label: "단체티 관리",
          items: [
            { id: "s_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/shirts?tab=pending" },
            { id: "s_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/shirts?tab=approved" },
            { id: "s_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/shirts?tab=rejected" },
          ],
        },
        {
          label: "차량 대여 관리",
          items: [
            { id: "vh_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/vehicles?tab=pending" },
            { id: "vh_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/vehicles?tab=approved" },
            { id: "vh_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/vehicles?tab=rejected" },
          ],
        },
        {
          label: "음향 시공 관리",
          items: [
            { id: "sc_requests", label: "시공 문의 목록", icon: Volume2, href: "/admin/sound-construction" },
          ],
        },
        {
          label: "영업 도구",
          items: [
            { id: "message_templates", label: "문자 템플릿", icon: MessageSquareText, badge: "NEW", href: "/admin/message-templates" },
          ],
        },
      ]}
      activeId={activeTab}
      onSelect={(id) => setActiveTab(id as BookingTab)}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
      <ScrollRestoration />

      <main className="max-w-[1300px] px-4 py-4 md:px-10 md:py-8">
        {/* 모바일 전용 탭 (사이드바가 숨겨지는 좁은 화면) */}
        <div className="flex md:hidden bg-[#E5E8EB] p-1.5 rounded-[18px] w-full mb-4 overflow-x-auto">
          {[
            { id: "pending", label: `대기 ${pendingCount}` },
            { id: "confirmed", label: `승인 ${bookings.filter(b => b.status === "confirmed").length}` },
            { id: "inspection_confirmed", label: `답사확정 ${inspectionReadyCount}` },
            { id: "approved", label: `결제대기 ${bookings.filter(b => b.status === "approved").length}` },
            { id: "deposit_paid", label: `완료 ${bookings.filter(b => b.status === "deposit_paid").length}` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-none px-3.5 py-2 rounded-[14px] text-[12px] font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-4 md:mb-5">
          <h1 className="text-[19px] md:text-[26px] font-black tracking-tight leading-tight mb-1">예약 시스템 관리</h1>
          <p className="text-[#4E5968] font-bold text-[12px] md:text-[14px]">사용자의 답사 확정 및 결제 단계를 제어하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3 mb-4 md:mb-6">
          <StatCard title="검토 대기" value={`${pendingCount}건`} icon={Clock} colorClass="bg-[#FF4545]" textColor="text-[#FF4545]" />
          <StatCard title="답사 확정(긴급)" value={`${inspectionReadyCount}건`} icon={CalendarCheck} colorClass="bg-[#3182F6]" textColor="text-[#3182F6]" />
          <StatCard title="결제 및 완료" value={`${approvedCount}건`} icon={ClipboardCheck} colorClass="bg-[#00D082]" textColor="text-[#00D082]" />
        </div>

        <div className="bg-white rounded-[16px] md:rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.02)] border border-[#F2F4F6] overflow-hidden">
          <div className="px-4 py-3 md:px-5 md:py-4 border-b border-[#F9FAFB] flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-3">
            <div className="flex items-center gap-2 text-[13px] md:text-[14px] font-black shrink-0">
              <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${activeTab === 'inspection_confirmed' ? 'bg-blue-500' : 'bg-gray-400'}`} />
              {activeTab === 'pending' ? '새로 들어온 문의' : activeTab === 'inspection_confirmed' ? '유저가 선택한 답사 일정' : '내역 조회'}
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
              <input
                type="text"
                placeholder="검색어를 입력하세요"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F2F4F6] border-none rounded-xl text-[13px] md:text-[14px] font-medium outline-none focus:ring-2 ring-[#3182F6]/10 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <p className="text-[11px] md:text-[12px] font-bold text-[#8B95A1] shrink-0">
              총 <span className="text-[#3182F6]">{filteredData.length}</span>개의 검색 결과
            </p>
          </div>

          {/* 모바일: 카드 리스트 (테이블은 좁은 화면에서 옆으로 밀려 읽기 힘들어서 아예 다른 레이아웃을 씀) */}
          <div className="md:hidden divide-y divide-gray-50">
            <AnimatePresence>
              {filteredData.length > 0 ? filteredData.map((booking) => (
                <motion.div
                  key={booking.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setSelectedBooking(booking)}
                  className="p-4 active:bg-[#F9FAFB] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F2F4F6] rounded-xl flex items-center justify-center font-black text-[#3182F6] text-[14px] uppercase shrink-0">
                      {booking.churchName?.substring(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-black text-[#191F28] leading-tight truncate">{booking.churchName}</p>
                      <p className="text-[12px] font-bold text-[#8B95A1] truncate">{booking.contactName} · {booking.phone}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#D1D6DB] shrink-0" />
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2.5 pl-[52px]">
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#4E5968]">
                      <Calendar className="w-3.5 h-3.5 shrink-0" /> {booking.startDate}
                      {booking.inspectionDate && <span className="text-[#3182F6]">· 답사 희망</span>}
                    </div>
                    <button onClick={(e) => handleDeleteBooking(booking.id, e)} className="p-1.5 text-[#D1D6DB] active:text-red-500 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )) : (
                <div className="py-16 text-center text-[#ADB5BD] font-bold text-[13px]">해당하는 신청 내역이 없습니다.</div>
              )}
            </AnimatePresence>
          </div>

          {/* 데스크톱: 기존 테이블 그대로 */}
          <div className="hidden md:block overflow-x-auto scrollbar-hide">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#F9FAFB] border-b border-gray-50 text-left">
                <tr>
                  <th className="px-5 py-2.5 text-[11px] font-black text-[#8B95A1] uppercase tracking-widest">신청 정보</th>
                  <th className="px-5 py-2.5 text-[11px] font-black text-[#8B95A1] uppercase tracking-widest">행사/답사일</th>
                  <th className="px-5 py-2.5 text-[11px] font-black text-[#8B95A1] uppercase tracking-widest text-center">관리</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {filteredData.length > 0 ? filteredData.map((booking) => (
                    <motion.tr
                      key={booking.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="group hover:bg-[#F9FAFB] transition-all cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#F2F4F6] rounded-xl flex items-center justify-center font-black text-[#3182F6] text-[14px] uppercase shrink-0">
                            {booking.churchName?.substring(0, 1)}
                          </div>
                          <div className="min-w-0 whitespace-nowrap">
                            <p className="text-[14px] font-black text-[#191F28] group-hover:text-[#3182F6] transition-colors leading-tight">{booking.churchName}</p>
                            <p className="text-[12px] font-bold text-[#8B95A1]">{booking.contactName} · {booking.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1 text-[13px] font-bold text-[#4E5968] whitespace-nowrap">
                          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {booking.startDate}</div>
                          {booking.inspectionDate && <div className="flex items-center gap-1.5 text-[#3182F6]"><Clock className="w-3.5 h-3.5" /> 답사 희망함</div>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={(e) => handleDeleteBooking(booking.id, e)} className="p-2 text-[#E5E8EB] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ChevronRight className="w-5 h-5 text-[#D1D6DB] group-hover:translate-x-1 transition-transform" />
                      </td>
                    </motion.tr>
                  )) : (
                    <tr><td colSpan={4} className="py-20 text-center text-[#ADB5BD] font-bold text-[14px]">해당하는 신청 내역이 없습니다.</td></tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-[#191F28]/60 backdrop-blur-md"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 30 }}
              className="bg-white w-full sm:max-w-xl rounded-t-[28px] sm:rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 sm:p-8 pb-3 sm:pb-4 flex justify-between items-center">
                <div className="flex gap-1.5 sm:gap-2">
                  <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-50 text-[#3182F6] rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest">Management</span>
                  <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-[#F2F4F6] text-[#8B95A1] rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest">{selectedBooking.status}</span>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                  <XCircle className="w-6 h-6 sm:w-7 sm:h-7 text-[#D1D6DB]" />
                </button>
              </div>

              <div className="px-5 sm:p-10 sm:pt-4 pb-5 overflow-y-auto space-y-5 sm:space-y-8 custom-scrollbar">
                <div className="bg-[#191F28] p-5 sm:p-7 rounded-[24px] sm:rounded-[32px] text-white shadow-xl flex items-center gap-3.5 sm:gap-5">
                  <div className="p-3 sm:p-4 bg-white/10 rounded-2xl sm:rounded-[20px] backdrop-blur-sm shrink-0">
                    <Tent className="w-6 h-6 sm:w-8 sm:h-8 text-[#3182F6]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-[12px] font-black text-blue-400 uppercase tracking-widest mb-1">Target Venue</p>
                    <h2 className="text-[17px] sm:text-2xl font-black leading-tight break-keep">{selectedBooking.venueName || "장소명 정보 없음"}</h2>
                  </div>
                </div>

                {/* Firebase 'selectedTimeSlot' 데이터 표시를 위한 토스 스타일 카드 추가 */}
                {selectedBooking.selectedTimeSlot && (
                  <section>
                    <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> {/* 수정위치 표시 */}
                      선택한 시간대 옵션
                    </h4>
                    <div className="bg-[#F8FAFF] p-4 sm:p-6 rounded-[20px] sm:rounded-[28px] border border-[#3182F6]/20">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="text-[14px] sm:text-[16px] font-black text-[#191F28]">{selectedBooking.selectedTimeSlot.label}</span>
                        <span className="text-[13px] sm:text-[14px] font-black text-[#3182F6] shrink-0">{Number(selectedBooking.selectedTimeSlot.price).toLocaleString()}원</span>
                      </div>
                      <div className="text-[12px] sm:text-[13px] font-bold text-[#6B7684]">
                        {selectedBooking.selectedTimeSlot.start} ~ {selectedBooking.selectedTimeSlot.end} 운영
                      </div>
                    </div>
                  </section>
                )}

                <section>
                  <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase">예약 및 인원 정보</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <InfoRow icon={Users} label="총 인원" value={`${selectedBooking.additionalAttendees || 0}명`} />
                    <InfoRow icon={Calendar} label="대관 기간" value={`${selectedBooking.startDate} ~ ${selectedBooking.endDate}`} />
                  </div>

                  {canChangeDates && !isEditingDates && (
                    <button
                      type="button"
                      onClick={handleStartEditingDates}
                      className="w-full mt-2.5 sm:mt-3 py-3.5 bg-[#F2F8FF] text-[#3182F6] rounded-xl sm:rounded-2xl font-black text-[13px] sm:text-[14px] hover:bg-[#E8F3FF] transition-colors active:scale-[0.99]"
                    >
                      날짜 변경
                    </button>
                  )}

                  {canChangeDates && isEditingDates && (
                    <div className="mt-2.5 sm:mt-3 bg-[#F2F8FF] p-4 sm:p-6 rounded-[20px] sm:rounded-[28px] border border-blue-50 space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        <MaterialCalendar label="새 시작일" value={newStartDate} onChange={setNewStartDate} />
                        <MaterialCalendar label="새 종료일" value={newEndDate} onChange={setNewEndDate} />
                      </div>

                      {newStartDate && newEndDate && newEndDate < newStartDate && (
                        <p className="text-[13px] font-bold text-[#F04452] break-keep">종료일이 시작일보다 빠릅니다.</p>
                      )}
                      {hasBlockedDateOverlap && (
                        <p className="text-[13px] font-bold text-[#F04452] break-keep">예약을 막아둔 날짜가 포함되어 있어 변경할 수 없습니다.</p>
                      )}
                      {overlappingBookings.length > 0 && (
                        <div className={`text-[13px] font-bold break-keep ${hasOccupiedOverlap ? "text-[#F04452]" : "text-[#B25E09]"}`}>
                          <p>{hasOccupiedOverlap ? "결제 대기 또는 결제 완료된 예약과 겹쳐 변경할 수 없습니다." : "진행 중인 다른 신청과 날짜가 겹칩니다. 확인 후 변경해 주세요."}</p>
                          <ul className="mt-1 space-y-0.5">
                            {overlappingBookings.map(b => (
                              <li key={b.id}>· {b.churchName || "교회명 없음"} ({b.startDate} ~ {b.endDate})</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {isPriceUnavailable && (
                        <p className="text-[13px] font-bold text-[#F04452] break-keep">장소 요금 정보를 찾을 수 없어 변경할 수 없습니다.</p>
                      )}
                      {changedPrices && !hasNoDateChanges && (
                        <div className="bg-white p-4 rounded-2xl space-y-2 text-[13px] font-bold text-[#4E5968]">
                          <div className="flex justify-between gap-2">
                            <span>총 금액</span>
                            <span className="text-right font-black text-[#191F28]">{Number(selectedBooking.totalPrice || 0).toLocaleString()}원 → {changedPrices.totalPrice.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>예약금</span>
                            <span className="text-right font-black text-[#3182F6]">{Number(selectedBooking.depositPrice || 0).toLocaleString()}원 → {changedPrices.depositPrice.toLocaleString()}원</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span>잔금</span>
                            <span className="text-right font-black text-[#191F28]">{Number(selectedBooking.balancePrice || 0).toLocaleString()}원 → {changedPrices.balancePrice.toLocaleString()}원</span>
                          </div>
                        </div>
                      )}

                      <p className="text-[12px] font-bold text-[#6B7684] break-keep">
                        {isInspectionBooking ? "사전답사비는 바뀌지 않으며, " : "현재 장소 요금 기준으로 계산되며, "}신청자에게 자동으로 안내되지 않습니다.
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingDates(false)}
                          className="flex-1 h-[52px] bg-white text-[#4E5968] rounded-2xl font-black text-[14px] hover:bg-[#F2F4F6] transition-colors"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBookingDates}
                          disabled={isDateRangeInvalid || hasNoDateChanges || hasOccupiedOverlap || hasBlockedDateOverlap || isPriceUnavailable || isSavingDates}
                          className="flex-[2] h-[52px] bg-[#3182F6] text-white rounded-2xl font-black text-[14px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2272eb] transition-colors"
                        >
                          {isSavingDates ? "저장 중..." : "변경 저장"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <section>
                  <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase">금액 및 결제 상세</h4>
                  <div className="bg-[#F9FAFB] p-4 sm:p-6 rounded-[20px] sm:rounded-[28px] border border-[#E5E8EB] space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[13px] sm:text-[14px] font-bold text-[#6B7684]">총 이용 요금</span>
                      <span className="text-[15px] sm:text-[16px] font-black text-[#191F28]">{Number(selectedBooking.totalPrice || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 pt-3 border-t border-[#E5E8EB]">
                      <span className="text-[13px] sm:text-[14px] font-black text-[#3182F6]">{selectedBooking.depositLabel || "예약금"}</span>
                      <span className="text-[16px] sm:text-[18px] font-black text-[#3182F6]">{Number(selectedBooking.depositPrice || 0).toLocaleString()}원</span>
                    </div>
                  </div>
                </section>

                {selectedBooking.status === 'inspection_confirmed' && (
                  <div className="bg-[#3182F6] p-4 sm:p-6 rounded-[18px] sm:rounded-[24px] text-white shadow-lg shadow-blue-100 flex items-center gap-3 sm:gap-4">
                    <div className="bg-white/20 p-2.5 sm:p-3 rounded-xl shrink-0"><AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
                    <div className="font-bold text-[13px] sm:text-base break-keep">사용자가 답사 일정을 확정했습니다. 답사 후 승인하세요.</div>
                  </div>
                )}

                <section>
                  <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase">신청 교회 정보</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="p-4 sm:p-5 bg-[#F9FAFB] rounded-[18px] sm:rounded-[24px] border border-gray-50">
                      <p className="text-[10px] sm:text-[11px] font-black text-[#ADB5BD] uppercase mb-1">신청 교회</p>
                      <p className="text-[15px] sm:text-[17px] font-black text-[#191F28] break-words">{selectedBooking.churchName}</p>
                    </div>
                    <div className="p-4 sm:p-5 bg-[#F9FAFB] rounded-[18px] sm:rounded-[24px] border border-gray-50">
                      <p className="text-[10px] sm:text-[11px] font-black text-[#ADB5BD] uppercase mb-1">소속 교단</p>
                      <p className="text-[15px] sm:text-[17px] font-black text-[#191F28] break-words">{selectedBooking.denomination || "미지정"}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-2.5 sm:space-y-3">
                  <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase">담당자 및 상세</h4>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                    <InfoRow icon={User} label="담당자 성함" value={selectedBooking.contactName} />
                    <InfoRow icon={Phone} label="담당자 연락처" value={selectedBooking.phone} />
                    <InfoRow icon={Mail} label="이메일" value={selectedBooking.email} />
                    {selectedBooking.specialRequests && <InfoRow icon={MessageSquare} label="요청사항" value={selectedBooking.specialRequests} />}
                  </div>
                </section>

                <section>
                  <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase">사전답사 희망 일자</h4>
                  <div className="bg-[#F2F8FF] p-4 sm:p-6 rounded-[20px] sm:rounded-[28px] border border-blue-50">
                    <div className="flex flex-wrap gap-2">
                      {selectedBooking.inspectionDate?.length > 0 ? (
                        selectedBooking.inspectionDate.map((date: any, i: number) => (
                          <div key={i} className="px-4 sm:px-5 py-2.5 sm:py-3 bg-white rounded-xl sm:rounded-2xl text-[13px] sm:text-[15px] font-black text-[#3182F6] shadow-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 shrink-0" /> {date}
                            <button
                              type="button"
                              onClick={() => handleRemoveInspectionDate(date)}
                              className="ml-1 text-[#ADB5BD] hover:text-[#F04452] transition-colors"
                              aria-label="이 날짜 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm font-bold text-[#8B95A1]">희망 날짜 정보가 없습니다. 신청자가 교회 내부 일정이 아직 안 정해져 비워둔 경우, 아래에서 관리자가 직접 추가할 수 있습니다.</p>
                      )}
                    </div>
                    <div className="flex items-end gap-2 mt-4 pt-4 border-t border-blue-100">
                      <MaterialCalendar
                        label="날짜 추가"
                        value={newInspectionDateInput}
                        onChange={setNewInspectionDateInput}
                      />
                      <button
                        type="button"
                        onClick={handleAddInspectionDate}
                        disabled={!newInspectionDateInput}
                        className="h-[56px] px-4 sm:px-5 bg-[#3182F6] text-white rounded-[20px] font-black text-[13px] sm:text-[15px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2272eb] transition-colors active:scale-95 shrink-0"
                      >
                        추가
                      </button>
                    </div>

                    {selectedBooking.status === 'pending' && (
                      <div className="mt-4 pt-4 border-t border-blue-100 space-y-3">
                        <p className="text-[12px] sm:text-[13px] font-black text-[#3182F6] ml-1">답사 가능 승인 시 최종 날짜·시간 확정</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedBooking.inspectionDate?.length > 0 ? (
                            selectedBooking.inspectionDate.map((date: any, i: number) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setConfirmDateChoice(date)}
                                className={`px-4 py-2.5 rounded-xl text-[13px] sm:text-[14px] font-black border-2 transition-all ${confirmDateChoice === date ? "bg-[#3182F6] text-white border-[#3182F6]" : "bg-white text-[#4E5968] border-[#E5E8EB] hover:border-[#3182F6]"}`}
                              >
                                {date}
                              </button>
                            ))
                          ) : (
                            <p className="text-sm font-bold text-[#8B95A1]">위에서 날짜를 먼저 추가해주세요.</p>
                          )}
                        </div>
                        <select
                          value={confirmTimeChoice}
                          onChange={(e) => setConfirmTimeChoice(e.target.value)}
                          className="w-full h-[48px] px-4 bg-white border-2 border-[#E5E8EB] rounded-xl text-[14px] font-bold text-[#191F28] focus:outline-none focus:border-[#3182F6]"
                        >
                          <option value="">시간 선택</option>
                          {INSPECTION_TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="p-4 sm:p-8 bg-[#FAFBFC] border-t border-gray-50">
                <div className="flex gap-2.5 sm:gap-3">
                  <button onClick={() => handleDeleteBooking(selectedBooking.id)} className="p-3.5 sm:p-5 bg-white text-[#F04452] border border-[#FEECEE] rounded-[18px] sm:rounded-[24px] font-black hover:bg-red-50 transition-all active:scale-95 shrink-0">
                    <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  {selectedBooking.status === 'pending' && (
                    <>
                      <button onClick={() => handleStatusChange(selectedBooking.id, "cancelled")} className="flex-1 py-3.5 sm:py-5 bg-[#E5E8EB] text-[#6B7684] rounded-[18px] sm:rounded-[24px] font-black text-[13px] sm:text-base hover:bg-gray-300 transition-all">반려</button>
                      <button
                        onClick={handleConfirmInspectionApproval}
                        disabled={!confirmDateChoice || !confirmTimeChoice}
                        className="flex-[2] py-3.5 sm:py-5 bg-[#3182F6] text-white rounded-[18px] sm:rounded-[24px] font-black text-[13px] sm:text-base shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all break-keep disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        답사 가능 승인{!confirmDateChoice || !confirmTimeChoice ? " (날짜·시간 선택 필요)" : ""}
                      </button>
                    </>
                  )}

                  {selectedBooking.status === 'inspection_confirmed' && (
                    <button onClick={() => handleStatusChange(selectedBooking.id, "approved")} className="flex-1 py-3.5 sm:py-5 bg-[#191F28] text-white rounded-[18px] sm:rounded-[24px] font-black text-[13px] sm:text-base shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 break-keep">
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#00D082] shrink-0" /> 실물 답사 완료 및 최종 승인
                    </button>
                  )}

                  {(selectedBooking.status === 'approved' || selectedBooking.status === 'deposit_paid' || selectedBooking.status === 'confirmed') && (
                    <button onClick={() => handleStatusChange(selectedBooking.id, "pending")} className="flex-1 py-3.5 sm:py-5 bg-white border-2 border-[#E5E8EB] text-[#4E5968] rounded-[18px] sm:rounded-[24px] font-black text-[13px] sm:text-base hover:bg-[#F2F4F6] transition-all break-keep">신청 초기화 (대기로 이동)</button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E8EB; border-radius: 10px; }
      `}</style>
      </div>
    </AdminSidebarLayout>
  );
}
