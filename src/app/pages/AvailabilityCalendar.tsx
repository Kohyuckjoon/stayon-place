import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styled from 'styled-components';

interface AvailabilityCalendarProps {
  venueId: string;
  bookings: any[];
  blockedDates?: string[];
}

const CalendarWrapper = styled.div`
  width: 100%;
  background: #ffffff;
  font-family: 'Pretendard', -apple-system, sans-serif;
  user-select: none;

  .react-calendar {
    border: none;
    width: 100%;
    background: transparent;
  }

  .react-calendar__navigation {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 16px;
    height: 40px;
    button {
      min-width: 40px;
      background: none;
      font-size: 16px;
      font-weight: 700;
      color: #4E5968;
      border-radius: 12px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      &:enabled:hover { background-color: #F2F4F6; color: #191F28; }
      &:disabled { opacity: 0.2; }
    }
    .react-calendar__navigation__label {
      flex-grow: 0 !important;
      padding: 0 16px;
      font-size: 16px;
      font-weight: 800;
      color: #191F28;
    }
  }

  .react-calendar__month-view__weekdays {
    text-align: center;
    font-weight: 600;
    font-size: 13px;
    color: #8B95A1;
    margin-bottom: 10px;
    abbr { text-decoration: none; cursor: default; }
  }

  .react-calendar__tile {
    max-width: 100%;
    aspect-ratio: 1 / 1;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 600;
    color: #333D4B;
    border-radius: 14px;
    transition: all 0.1s ease-out;
    position: relative;
    margin: 3px 0;

    &:enabled:hover {
      background: #F2F4F6 !important;
      transform: scale(0.95);
    }

    &:enabled:focus, &.react-calendar__tile--active {
      background: #3182F6 !important;
      color: #FFFFFF !important;
      font-weight: 700;
    }
  }

  /* 예약 완료(X 표시) 스타일 - 입금 완료된 날짜에만 적용 */
  .booked-day {
    background-color: #F2F4F6 !important; /* 배경을 살짝 더 어둡게 하여 대비 증폭 */
    color: #ADB5BD !important; /* 숫자 색상 */
    cursor: not-allowed !important;
    pointer-events: none;
    position: relative; /* 자식 요소인 X 표시의 기준점 */
    overflow: hidden; /* X 표시가 타일을 벗어나지 않도록 설정 */
    
    &::before, &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 18px;
      height: 2px;
      background: #333D4B; /* X 표시 색상을 더 진한 그레이로 변경 */
      border-radius: 2px;
      z-index: 1; /* 숫자보다 위에 보이도록 설정 */
    }
    
    /* X자 형태 정밀 조정 */
    &::before { transform: translate(-50%, -50%) rotate(45deg); }
    &::after { transform: translate(-50%, -50%) rotate(-45deg); }

    &:enabled:hover {
      background: #F9FAFB !important;
      transform: none;
    }
  }

  .react-calendar__tile--now {
    background: transparent !important;
    color: #3182F6 !important;
    font-weight: 800;
  }
  .react-calendar__month-view__days__day--weekend { color: #F04452; }
  .react-calendar__month-view__days__day--neighboringMonth { opacity: 0.2; }
`;

const LegendContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 14px;
  .item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #6B7684;
    padding: 5px 10px;
    background: #F9FAFB;
    border-radius: 10px;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; }
`;

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({ venueId, bookings, blockedDates = [] }) => {
  
  // 날짜 비교 헬퍼 (YYYY-MM-DD 포맷 통일)
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * [수정된 핵심 로직]
   * 모든 기준은 '입금 완료(deposit_paid)' 후 최종 확정이 나야만 사용 불가로 표시.
   * 'approved'는 단순히 사용자가 장소를 고른 상태이므로 캘린더를 막지 않습니다.
   */
  const isBooked = (date: Date) => {
    const targetDateStr = formatDate(date);

    // 관리자가 지정한 예약 차단 일정 (수동 휴무 등)
    if (blockedDates.includes(targetDateStr)) return true;

    if (!bookings || bookings.length === 0) return false;

    return bookings.some(b => {
      // 핵심 수정: 입금 완료(deposit_paid) 또는 이용 완료(completed)인 경우에만 캘린더 점유
      const isConfirmedReservation = b.status === 'deposit_paid' || b.status === 'completed';
      
      const start = new Date(b.startDate);
      const end = new Date(b.endDate || b.startDate);
      
      return isConfirmedReservation && (targetDateStr >= formatDate(start) && targetDateStr <= formatDate(end));
    });
  };

  const tileClassName = ({ date, view }: any) => {
    if (view === 'month' && isBooked(date)) return 'booked-day';
    return null;
  };

  const tileDisabled = ({ date, view }: any) => {
    // 오늘 이전 날짜도 선택 못하게 막는 것이 직관적입니다.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (view === 'month') {
      if (date < today) return true; // 지난 날짜 차단
      if (isBooked(date)) return true; // 예약 완료 날짜 차단
    }
    return false;
  };

  return (
    <CalendarWrapper>
      <LegendContainer>
        <div className="item">
          <div className="dot" style={{ backgroundColor: '#ffffff', border: '1.5px solid #E5E8EB' }}></div>
          <span>예약 가능</span>
        </div>
        <div className="item">
          <div className="dot" style={{ backgroundColor: '#D1D6DB' }}></div>
          <span>예약 완료</span>
        </div>
      </LegendContainer>

      <Calendar
        locale="ko-KR"
        tileClassName={tileClassName}
        tileDisabled={tileDisabled}
        calendarType="gregory"
        formatDay={(_, date) => date.getDate().toString()}
        next2Label={null}
        prev2Label={null}
        showNeighboringMonth={false}
        minDetail="month"
        onClickDay={(date) => {
            if(isBooked(date)) return;
            // 여기서 예약 로직 페이지로 연결 가능
        }}
      />
    </CalendarWrapper>
  );
};

export default AvailabilityCalendar;