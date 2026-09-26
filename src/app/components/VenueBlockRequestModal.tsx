import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styled from "styled-components";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { X, MapPin, Phone, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface VenueBlockRequestModalVenue {
  id: string;
  venueName: string;
  location?: string;
  blockedDates?: string[];
}

interface VenueBlockRequestModalProps {
  venue: VenueBlockRequestModalVenue;
  onUnblock: (dateStr: string) => void;
  onClose: () => void;
}

// AdminDashboard.tsx가 쓰는 VenueScheduleModal.tsx의 CalendarWrapper를 그대로 복사해
// 재사용하고, 여기서는 "승인 대기중" 색상(pending-day)만 추가했다.
const CalendarWrapper = styled.div`
  width: 100%;

  .react-calendar {
    border: none;
    width: 100%;
    background: transparent;
    font-family: inherit;
  }

  .react-calendar__navigation {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 16px;
    height: 40px;
  }
  .react-calendar__navigation button {
    min-width: 40px;
    background: none;
    font-size: 16px;
    font-weight: 700;
    color: #4E5968;
    border-radius: 10px;
    transition: all 0.15s ease;
  }
  .react-calendar__navigation button:enabled:hover { background: #F2F4F6; color: #191F28; }
  .react-calendar__navigation button:disabled { opacity: 0.3; }
  .react-calendar__navigation__label { flex-grow: 0 !important; padding: 0 16px; font-size: 16px; font-weight: 800; color: #191F28; }

  .react-calendar__month-view__weekdays {
    text-align: center;
    font-weight: 700;
    font-size: 12px;
    color: #8B95A1;
    margin-bottom: 8px;
  }
  .react-calendar__month-view__weekdays abbr { text-decoration: none; cursor: default; }

  .react-calendar__tile {
    max-width: 100%;
    aspect-ratio: 1 / 1;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    font-size: 14px;
    font-weight: 600;
    color: #333D4B;
    border-radius: 14px;
    position: relative;
    margin: 2px 0;
    transition: all 0.1s ease-out;
  }
  .react-calendar__tile:enabled:hover { background: #F2F4F6 !important; transform: scale(0.96); }
  .react-calendar__tile--now { background: transparent !important; color: #3182F6 !important; font-weight: 800; }
  .react-calendar__month-view__days__day--weekend { color: #F04452; }
  .react-calendar__month-view__days__day--neighboringMonth { opacity: 0.25; }
  .react-calendar__tile:disabled { color: #D1D6DB; cursor: not-allowed; }

  .blocked-day {
    background: #FFF0F0 !important;
    color: #F04452 !important;
  }
  .blocked-day:enabled:hover { background: #FFE0E0 !important; }

  .pending-day {
    background: #FFF8E8 !important;
    color: #B45309 !important;
  }
  .pending-day:enabled:hover { background: #FFF1D1 !important; }

  .selected-day {
    background: #F2F8FF !important;
    color: #1B64DA !important;
    box-shadow: inset 0 0 0 2px #3182F6;
  }
  .selected-day:enabled:hover { background: #E8F3FF !important; }

  .block-tag {
    font-size: 9px;
    font-weight: 800;
    line-height: 1;
  }
`;

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function VenueBlockRequestModal({ venue, onUnblock, onClose }: VenueBlockRequestModalProps) {
  const blockedDates = venue.blockedDates || [];
  const [pendingDates, setPendingDates] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [churchName, setChurchName] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "venueBlockRequests"),
      where("venueId", "==", venue.id),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dates = new Set<string>();
      snapshot.docs.forEach((docSnap) => {
        (docSnap.data().dates || []).forEach((d: string) => dates.add(d));
      });
      setPendingDates(Array.from(dates));
    });
    return () => unsubscribe();
  }, [venue.id]);

  const isBlocked = (date: Date) => blockedDates.includes(formatDate(date));
  const isPending = (date: Date) => pendingDates.includes(formatDate(date));
  const isSelected = (date: Date) => selectedDates.includes(formatDate(date));

  const handleClickDay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;

    const dateStr = formatDate(date);
    if (isBlocked(date)) {
      onUnblock(dateStr);
      return;
    }
    if (isPending(date)) return;

    setSubmitSuccess(false);
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
    );
  };

  const canSubmit = selectedDates.length > 0 && churchName.trim() !== "" && reason.trim() !== "" && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const submitVenueBlockRequest = httpsCallable(functions, "submitVenueBlockRequest");
      const res = await submitVenueBlockRequest({
        venueId: venue.id,
        dates: selectedDates,
        churchName: churchName.trim(),
        reason: reason.trim(),
      });
      const result = res.data as { success: boolean; error?: string };
      if (!result.success) {
        setSubmitError(result.error || "신청 중 오류가 발생했습니다.");
        return;
      }
      setSelectedDates([]);
      setChurchName("");
      setReason("");
      setSubmitSuccess(true);
    } catch (err) {
      console.error("예약 차단 신청 실패:", err);
      setSubmitError("신청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedDates([]);
    setChurchName("");
    setReason("");
    setSubmitError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#191F28]/70 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div
        className="bg-white w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-[24px] md:rounded-[28px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 md:p-6 border-b border-[#F2F4F6] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-block px-3 py-1 bg-[#191F28] text-white rounded-full text-[11px] font-black mb-2">
              예약 차단 신청
            </span>
            <h2 className="text-[17px] md:text-[19px] font-black text-[#191F28] truncate">{venue.venueName}</h2>
            {venue.location && (
              <div className="flex items-center gap-1.5 text-[#8B95A1] text-[13px] font-bold mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#3182F6] shrink-0" />
                <span className="truncate">{venue.location}</span>
              </div>
            )}
          </div>
          <button onClick={handleCancel} className="p-2 text-[#ADB5BD] hover:bg-[#F2F4F6] rounded-xl transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 md:p-6">
          <CalendarWrapper>
            <Calendar
              locale="ko-KR"
              calendarType="gregory"
              formatDay={(_, date) => date.getDate().toString()}
              next2Label={null}
              prev2Label={null}
              showNeighboringMonth={false}
              minDetail="month"
              tileClassName={({ date, view }: any) => {
                if (view !== "month") return null;
                if (isBlocked(date)) return "blocked-day";
                if (isPending(date)) return "pending-day";
                if (isSelected(date)) return "selected-day";
                return null;
              }}
              tileContent={({ date, view }: any) => {
                if (view !== "month") return null;
                if (isBlocked(date)) return <span className="block-tag" style={{ color: "#F04452" }}>차단</span>;
                if (isPending(date)) return <span className="block-tag" style={{ color: "#B45309" }}>대기</span>;
                if (isSelected(date)) return <span className="block-tag" style={{ color: "#1B64DA" }}>선택</span>;
                return null;
              }}
              tileDisabled={({ date, view }: any) => {
                if (view !== "month") return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              onClickDay={handleClickDay}
            />
          </CalendarWrapper>

          <div className="flex items-center gap-3 mt-4 px-1 flex-wrap text-[12px] font-bold text-[#8B95A1]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-[#E5E8EB] bg-white" /> 예약 가능
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F04452]" /> 차단됨 (클릭 시 즉시 해제)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F5B942]" /> 승인 대기중
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3182F6]" /> 이번에 선택함
            </span>
          </div>

          {selectedDates.length > 0 && (
            <div className="mt-4 p-3 bg-[#F2F8FF] border border-[#D6E8FF] rounded-xl">
              <p className="text-[12px] font-black text-[#1B64DA] mb-1">선택한 날짜 ({selectedDates.length}일)</p>
              <p className="text-[13px] font-bold text-[#191F28] break-keep">
                {selectedDates.map((d) => d.slice(5).replace("-", "/")).join(", ")}
              </p>
            </div>
          )}

          <div className="mt-5 space-y-3">
            <div>
              <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">장소 사용 신청 교회명</label>
              <input
                value={churchName}
                onChange={(e) => { setChurchName(e.target.value); setSubmitSuccess(false); }}
                placeholder="예: 사랑교회"
                className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#3182F6] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">예약 차단 사유</label>
              <textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value); setSubmitSuccess(false); }}
                placeholder="차단 사유를 입력해주세요"
                className="w-full min-h-[80px] px-4 py-3 bg-[#F9FAFB] rounded-xl text-[13px] font-medium outline-none border border-transparent focus:border-[#3182F6] focus:bg-white transition-all resize-none"
              />
            </div>
          </div>

          <div className="mt-4 p-4 bg-[#FFF8E8] border border-[#FFE8B8] rounded-2xl space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
              <p className="text-[12.5px] font-bold text-[#8A5A00] leading-relaxed break-keep">
                직거래 발견 시 STAYON 수련회 장소 리스트에서 장소 리스트가 삭제될 수 있습니다.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
              <p className="text-[12.5px] font-bold text-[#8A5A00] leading-relaxed break-keep">
                예약 차단 신청을 한 후 STAYON에서 최대 48시간 이내로 승인하지 않는 경우 자동 승인됩니다.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
              <p className="text-[12.5px] font-bold text-[#8A5A00] leading-relaxed break-keep">
                긴급의 경우 STAYON 고객센터로 문의해주세요. 문의 번호 : 0502-1937-0615
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
              <p className="text-[12.5px] font-bold text-[#8A5A00] leading-relaxed break-keep">
                직거래와 관련된 이슈 발생 시, 신청이 거절될 수 있습니다.
              </p>
            </div>
          </div>

          {submitError && (
            <div className="mt-4 p-3 bg-[#FFF0F0] border border-[#FFD7D7] rounded-xl text-[13px] font-bold text-[#F04452]">{submitError}</div>
          )}
          {submitSuccess && (
            <div className="mt-4 p-3 bg-[#EFFDF5] border border-[#C8F3DC] rounded-xl flex items-center gap-2 text-[13px] font-bold text-[#0E9F6E]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              신청이 접수됐어요. 운영자 승인 후(최대 48시간 이내) 반영돼요.
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 pt-0 flex gap-2">
          {submitSuccess ? (
            <button
              onClick={onClose}
              className="flex-1 py-3.5 bg-[#3182F6] text-white rounded-2xl font-black text-[15px] transition-all active:scale-95"
            >
              완료
            </button>
          ) : (
            <>
              <button
                onClick={handleCancel}
                className="flex-1 py-3.5 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95"
              >
                취소하기
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-[2] py-3.5 bg-[#3182F6] text-white rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-[#1B64DA] transition-all active:scale-95"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {submitting ? "신청 중..." : "신청하기"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
