import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, ScrollRestoration } from "react-router-dom";
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db, functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { ChevronLeft, Zap, Calendar, Check, AlertCircle, Lock, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { TIME_OPTIONS, formatHourlyRate } from "../lib/bandRoomDisplay";
import { PORTONE_STORE_ID, PORTONE_PG_CHANNEL } from "../lib/portoneBandRoomConfig";

// JS Date.getDay()는 0=일요일 순서라, 등록 폼의 WEEKDAY_OPTIONS(월화수목금토일)와 매핑하기 위한 배열.
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatPhoneNumber(raw: string): string {
  const number = raw.replace(/[^\d]/g, "");
  if (number.length <= 3) return number;
  if (number.length <= 7) return `${number.slice(0, 3)}-${number.slice(3)}`;
  return `${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7, 11)}`;
}

export function BandRoomBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"slot" | "payment">("slot");

  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [agreedToRefundPolicy, setAgreedToRefundPolicy] = useState(false);

  const [booking, setBooking] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "bandRooms", id));
        const data = snap.data();
        if (snap.exists() && data?.status === "approved" && data?.track === "booking") {
          setRoom(data);
        } else {
          alert("예약 가능한 공간이 아니에요.");
          navigate(`/band-room/${id}`);
        }
      } catch (error) {
        console.error("공간 정보 조회 실패:", error);
        navigate(`/band-room/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id, navigate]);

  useEffect(() => {
    if (!user) return;
    setContactName((prev) => prev || user.displayName || "");
    setContactEmail((prev) => prev || user.email || "");
  }, [user]);

  const dateOptions = useMemo(() => {
    const availableDays: string[] = room?.availableDays || [];
    const days: { date: string; label: string; weekday: string; disabled: boolean }[] = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const weekday = DAY_LABELS[d.getDay()];
      const disabled = availableDays.length > 0 && !availableDays.includes(weekday);
      days.push({ date: toDateStr(d), label: `${d.getMonth() + 1}/${d.getDate()}`, weekday, disabled });
    }
    return days;
  }, [room]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!id || !selectedDate) {
        setExistingBookings([]);
        return;
      }
      try {
        const q = query(collection(db, "bandRoomBookings"), where("bandRoomId", "==", id), where("date", "==", selectedDate));
        const snap = await getDocs(q);
        const tenMinAgo = Date.now() - 10 * 60 * 1000;
        const active = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter((b) => {
            if (b.status === "paid") return true;
            if (b.status === "pending_payment") {
              const createdMs = b.createdAt?.toMillis?.() ?? Date.now();
              return createdMs > tenMinAgo;
            }
            return false;
          });
        setExistingBookings(active);
      } catch (error) {
        console.error("예약 현황 조회 실패:", error);
      }
    };
    fetchBookings();
  }, [id, selectedDate]);

  const hours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const diff = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
    return diff > 0 ? diff : 0;
  }, [startTime, endTime]);

  const minRentalHours = useMemo(() => {
    const match = String(room?.minRentalHours || "").match(/\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }, [room]);

  const hasOverlap = useMemo(() => {
    if (!startTime || !endTime) return false;
    const s = timeToMinutes(startTime);
    const e = timeToMinutes(endTime);
    return existingBookings.some((b) => s < timeToMinutes(b.endTime) && e > timeToMinutes(b.startTime));
  }, [existingBookings, startTime, endTime]);

  const totalPrice = Math.round((room?.hourlyRate || 0) * hours);

  const isSlotStepValid =
    !!selectedDate && !!startTime && !!endTime && hours > 0 &&
    (minRentalHours === 0 || hours >= minRentalHours) &&
    !hasOverlap &&
    contactName.trim() !== "" && contactPhone.replace(/[^\d]/g, "").length >= 10 &&
    agreedToRefundPolicy;

  const handleCreateBooking = async () => {
    if (!isSlotStepValid || !user || !id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "bandRoomBookings"), {
        bandRoomId: id,
        bandRoomName: room.roomName,
        userId: user.uid,
        userName: contactName,
        userContact: contactPhone,
        userEmail: contactEmail,
        date: selectedDate,
        startTime,
        endTime,
        hours,
        hourlyRate: room.hourlyRate,
        totalPrice,
        status: "pending_payment",
        agreedToRefundPolicy: true,
        createdAt: serverTimestamp(),
      });
      setBooking({ id: docRef.id, bandRoomName: room.roomName, date: selectedDate, startTime, endTime, totalPrice });
      setStep("payment");
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("예약 생성 실패:", error);
      alert("예약 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePay = () => {
    const { IMP } = window as any;
    if (!IMP) {
      alert("결제 모듈을 불러올 수 없습니다.");
      return;
    }
    if (!PORTONE_STORE_ID || !PORTONE_PG_CHANNEL) {
      alert("결제 채널이 아직 설정되지 않았어요. PG사 연동이 완료되면 이용하실 수 있어요.");
      return;
    }

    setIsPaying(true);
    IMP.init(PORTONE_STORE_ID);
    const merchantUid = `STAYON_BANDROOM_${Date.now()}`;

    IMP.request_pay({
      pg: PORTONE_PG_CHANNEL,
      pay_method: "card",
      merchant_uid: merchantUid,
      name: `STAYON 합주실 예약 - ${booking.bandRoomName}`,
      amount: booking.totalPrice,
      buyer_email: contactEmail,
      buyer_name: contactName,
      buyer_tel: contactPhone,
      customer_id: user?.uid,
    }, async (rsp: any) => {
      if (rsp.error_code != null) {
        setIsPaying(false);
        alert(`결제에 실패했습니다: ${rsp.error_msg || "알 수 없는 오류"}`);
        return;
      }
      try {
        const verify = httpsCallable(functions, "verifyBandRoomPayment");
        const result: any = await verify({ imp_uid: rsp.imp_uid, merchant_uid: rsp.merchant_uid, bookingId: booking.id });
        if (result.data?.success) {
          alert("결제가 완료되었어요! 예약이 확정되었습니다.");
          navigate(`/band-room/${id}`);
        } else {
          alert(`결제 검증에 실패했습니다: ${result.data?.error || "알 수 없는 오류"}`);
        }
      } catch (error: any) {
        alert(`결제 검증 중 오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`);
      } finally {
        setIsPaying(false);
      }
    });
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#0ea5e9] rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0f9ff] text-[#0ea5e9] rounded-full mb-6 text-sm font-black">
          <Zap className="w-4 h-4" /> 합주실 예약
        </div>
        <p className="text-[18px] font-black text-[#191f28] mb-3">로그인이 필요해요</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">예약을 진행하려면 먼저 로그인해주세요.</p>
        <button
          onClick={() => loginWithGoogle().catch(() => { })}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0ea5e9] text-white rounded-xl font-bold text-[14px] hover:bg-[#0284c7] transition-all"
        >
          <Lock className="w-4 h-4" /> 로그인하고 계속하기
        </button>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="min-h-screen bg-white text-[#191f28] selection:bg-[#0ea5e9]/10 font-sans antialiased">
      <ScrollRestoration />

      <div className="max-w-xl mx-auto px-6 pt-16 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#4e5968] hover:text-[#191f28] transition-all font-bold group mb-8">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[15px]">뒤로가기</span>
        </button>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0f9ff] text-[#0ea5e9] rounded-full mb-4 text-sm font-black">
            <Zap className="w-4 h-4" /> 바로예약
          </div>
          <h1 className="text-[24px] font-black text-[#191f28] leading-tight tracking-tight break-keep">{room.roomName}</h1>
          {room.hourlyRate > 0 && (
            <p className="text-[14px] text-[#8b95a1] font-bold mt-1">시간당 {formatHourlyRate(room.hourlyRate)}</p>
          )}
        </div>

        {step === "slot" ? (
          <div className="space-y-8">
            <section>
              <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
                날짜 선택 <span className="text-[#0ea5e9]">*</span>
              </label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {dateOptions.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    disabled={d.disabled}
                    onClick={() => setSelectedDate(d.date)}
                    className={`shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-2xl border-2 transition-all ${d.disabled
                      ? "border-[#f2f4f6] bg-[#fafafa] text-[#d1d6db] cursor-not-allowed"
                      : selectedDate === d.date
                        ? "border-[#0ea5e9] bg-[#0ea5e9] text-white"
                        : "border-[#f2f4f6] bg-white text-[#4e5968] hover:border-[#e5e8eb]"
                      }`}
                  >
                    <span className="text-[10px] font-bold opacity-80">{d.weekday}</span>
                    <span className="text-[13px] font-black mt-0.5">{d.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
                시간 선택 <span className="text-[#0ea5e9]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#f2f4f6] bg-white text-[14px] font-bold text-[#191f28] outline-none focus:border-[#0ea5e9] transition-all"
                >
                  <option value="">시작 시간</option>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#f2f4f6] bg-white text-[14px] font-bold text-[#191f28] outline-none focus:border-[#0ea5e9] transition-all"
                >
                  <option value="">종료 시간</option>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {minRentalHours > 0 && hours > 0 && hours < minRentalHours && (
                <p className="text-[12px] text-[#f04452] font-bold mt-2 ml-1">최소 대여시간은 {minRentalHours}시간이에요.</p>
              )}
              {hasOverlap && (
                <div className="flex items-center gap-1.5 mt-2 ml-1 text-[#f04452]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <p className="text-[12px] font-bold">이미 예약된 시간대예요. 다른 시간을 선택해주세요.</p>
                </div>
              )}
            </section>

            {hours > 0 && (
              <section className="bg-[#f9fafb] rounded-2xl p-5 flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#6b7684]">예상 결제 금액 ({hours}시간)</span>
                <span className="text-[20px] font-black text-[#191f28]">{formatHourlyRate(totalPrice)}</span>
              </section>
            )}

            <section>
              <h3 className="text-[13px] font-bold text-[#6b7684] mb-4 ml-1 uppercase tracking-wider">예약자 정보</h3>
              <div className="space-y-4">
                <input
                  type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="이름"
                  className="w-full text-[16px] font-bold py-3 px-1 border-b-2 border-[#f2f4f6] outline-none focus:border-[#0ea5e9] transition-all bg-transparent placeholder:text-[#d1d6db]"
                />
                <input
                  type="text" value={contactPhone} onChange={(e) => setContactPhone(formatPhoneNumber(e.target.value))} placeholder="010-0000-0000"
                  className="w-full text-[16px] font-bold py-3 px-1 border-b-2 border-[#f2f4f6] outline-none focus:border-[#0ea5e9] transition-all bg-transparent placeholder:text-[#d1d6db]"
                />
                <input
                  type="text" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="이메일"
                  className="w-full text-[16px] font-bold py-3 px-1 border-b-2 border-[#f2f4f6] outline-none focus:border-[#0ea5e9] transition-all bg-transparent placeholder:text-[#d1d6db]"
                />
              </div>
            </section>

            <section>
              <h3 className="text-[13px] font-bold text-[#6b7684] mb-3 ml-1 uppercase tracking-wider">취소·환불 정책</h3>
              <div className="bg-[#f9fafb] rounded-2xl p-5 text-[13px] font-bold text-[#4e5968] leading-relaxed space-y-1">
                <p>· 이용 시작 72시간(3일) 전까지 취소: 전액 환불</p>
                <p>· 이용 시작 48~72시간(2일) 전 취소: 50% 차감 후 환불</p>
                <p>· 이용 시작 24~48시간(1일) 전 취소: 70% 차감 후 환불</p>
                <p>· 이용 시작 24시간 이내 취소: 환불 불가</p>
              </div>
              <div
                onClick={() => setAgreedToRefundPolicy(!agreedToRefundPolicy)}
                className="flex items-start gap-3 p-4 mt-3 bg-[#f9fafb] rounded-2xl cursor-pointer select-none"
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${agreedToRefundPolicy ? "bg-[#0ea5e9] border-[#0ea5e9]" : "bg-white border-[#e5e8eb]"}`}>
                  {agreedToRefundPolicy && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                </div>
                <span className="text-[13px] font-bold text-[#191f28]">위 취소·환불 정책에 동의합니다 (필수)</span>
              </div>
            </section>

            <button
              type="button"
              onClick={handleCreateBooking}
              disabled={!isSlotStepValid || isSubmitting}
              className={`w-full py-5 rounded-[22px] font-bold text-lg transition-all active:scale-95 ${!isSlotStepValid || isSubmitting ? "bg-[#e5e8eb] text-[#b0b8c1] cursor-not-allowed" : "bg-[#0ea5e9] text-white shadow-xl shadow-[#0ea5e9]/10 hover:bg-[#0284c7]"
                }`}
            >
              {isSubmitting ? "처리 중..." : "다음 (결제하기)"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="bg-[#f9fafb] rounded-[24px] p-6 space-y-3">
              <div className="flex items-center gap-2 text-[#0ea5e9]">
                <Calendar className="w-4 h-4" />
                <span className="text-[13px] font-black">예약 내역</span>
              </div>
              <div className="space-y-2 text-[14px] font-bold text-[#4e5968]">
                <div className="flex justify-between"><span>공간</span><span className="text-[#191f28]">{booking.bandRoomName}</span></div>
                <div className="flex justify-between"><span>일시</span><span className="text-[#191f28]">{booking.date} {booking.startTime}~{booking.endTime}</span></div>
              </div>
              <div className="h-[1px] bg-[#e5e8eb]" />
              <div className="flex justify-between items-center">
                <span className="text-[14px] font-bold text-[#4e5968]">결제 금액</span>
                <span className="text-[22px] font-black text-[#0ea5e9]">{formatHourlyRate(booking.totalPrice)}</span>
              </div>
            </section>

            <button
              type="button"
              onClick={handlePay}
              disabled={isPaying}
              className={`w-full py-5 rounded-[22px] font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${isPaying ? "bg-[#e5e8eb] text-[#b0b8c1] cursor-not-allowed" : "bg-[#191f28] text-white shadow-xl shadow-black/10 hover:bg-black"
                }`}
            >
              <CreditCard className="w-5 h-5" />
              {isPaying ? "결제 진행 중..." : `${formatHourlyRate(booking.totalPrice)} 결제하기`}
            </button>
            <button type="button" onClick={() => setStep("slot")} className="w-full py-3 text-[13px] font-bold text-[#8b95a1]">
              이전으로
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
