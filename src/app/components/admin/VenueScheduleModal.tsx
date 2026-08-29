import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styled from "styled-components";
import { X, MapPin } from "lucide-react";

interface VenueScheduleModalVenue {
  id: string;
  venueName: string;
  location?: string;
  denomination?: string;
  blockedDates?: string[];
}

interface VenueScheduleModalProps {
  venue: VenueScheduleModalVenue;
  onToggleDate: (dateStr: string, isCurrentlyBlocked: boolean) => void;
  onClose: () => void;
}

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

  .block-tag {
    font-size: 9px;
    font-weight: 800;
    color: #F04452;
    line-height: 1;
  }
`;

export function VenueScheduleModal({ venue, onToggleDate, onClose }: VenueScheduleModalProps) {
  const blockedDates = venue.blockedDates || [];

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isBlocked = (date: Date) => blockedDates.includes(formatDate(date));

  const handleClickDay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;
    onToggleDate(formatDate(date), isBlocked(date));
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#191F28]/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[560px] rounded-[28px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[#F2F4F6] flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-block px-3 py-1 bg-[#191F28] text-white rounded-full text-[11px] font-black mb-2">
              예약 차단 설정
            </span>
            <h2 className="text-[19px] font-black text-[#191F28] truncate">{venue.venueName}</h2>
            {venue.location && (
              <div className="flex items-center gap-1.5 text-[#8B95A1] text-[13px] font-bold mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#3182F6] shrink-0" />
                <span className="truncate">{venue.location}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-[#ADB5BD] hover:bg-[#F2F4F6] rounded-xl transition-all shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <CalendarWrapper>
            <Calendar
              locale="ko-KR"
              calendarType="gregory"
              formatDay={(_, date) => date.getDate().toString()}
              next2Label={null}
              prev2Label={null}
              showNeighboringMonth={false}
              minDetail="month"
              tileClassName={({ date, view }: any) => (view === "month" && isBlocked(date) ? "blocked-day" : null)}
              tileContent={({ date, view }: any) =>
                view === "month" && isBlocked(date) ? <span className="block-tag">차단</span> : null
              }
              tileDisabled={({ date, view }: any) => {
                if (view !== "month") return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              onClickDay={handleClickDay}
            />
          </CalendarWrapper>

          <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-2">
            <div className="flex items-center gap-3 text-[12px] font-bold text-[#8B95A1]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-[#E5E8EB] bg-white" /> 예약 가능
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F04452]" /> 예약 불가
              </span>
            </div>
            <span className="text-[12px] font-bold text-[#3182F6]">날짜를 클릭하여 차단/해제하세요</span>
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
