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
    margin-bottom: 6px;
    height: 36px;
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
    margin-bottom: 2px;
    abbr { text-decoration: none; cursor: default; }
    .react-calendar__month-view__weekdays__weekday { padding: 4px 0; }
  }

  /* 예전엔 칸을 정사각형(aspect-ratio 1/1)으로 잡아서 PC에서는 한 칸이 70px 넘게 커지고
     달력이 세로로 너무 길었다. 높이를 고정해서 폭과 상관없이 콤팩트하게 보이게 한다.
     (아래쪽 "예약 완료" 뱃지가 X와 겹치지 않을 만큼의 높이) */
  .react-calendar__tile {
    max-width: 100%;
    height: 52px;
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
    margin: 1px 0;
    @media (max-width: 480px) { height: 48px; font-size: 15px; }

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

  /* 예약 완료(X 표시 + 파란 뱃지) 스타일 - 입금 완료된 날짜에만 적용.
     오늘 날짜(.react-calendar__tile--now)가 동시에 예약 완료 날짜이면, 두 클래스가
     같은 버튼에 함께 붙는데 둘 다 단일 클래스 선택자라 CSS 파일에서 나중에 나오는
     쪽(.react-calendar__tile--now)이 이겨서 오늘 날짜만 파란 숫자가 X 위로 비쳐
     보이는 문제가 있었다. .react-calendar__tile을 덧붙여 선택자 우선순위를 올려서
     예약 완료 날짜는 오늘이든 아니든 항상 동일하게(회색 배경 + X만) 보이게 한다. */
  .react-calendar__tile.booked-day {
    background-color: #F2F4F6 !important; /* 배경을 살짝 더 어둡게 하여 대비 증폭 */
    color: #ADB5BD !important; /* 숫자 색상 */
    cursor: not-allowed !important;
    pointer-events: none;
    position: relative; /* 자식 요소인 X 표시·"예약 완료" 뱃지의 기준점 */
    overflow: hidden; /* X 표시·뱃지가 타일을 벗어나지 않도록 설정 */

    /* 날짜 숫자와 같은 정중앙에 X를 겹쳐서 숫자를 정확히 가린다.
       두 자리 숫자도 덮이도록 숫자 폭보다 조금 길게 잡는다. */
    &::before, &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 22px;
      height: 2px;
      background: #333D4B;
      border-radius: 2px;
      z-index: 1; /* 숫자보다 위에 보이도록 설정 */
    }
    &::before { transform: translate(-50%, -50%) rotate(45deg); }
    &::after { transform: translate(-50%, -50%) rotate(-45deg); }

    &:enabled:hover {
      background: #F9FAFB !important;
      transform: none;
    }

    /* 파란 "예약 완료" 뱃지 */
    /* 칸 정중앙에 대각선(도장처럼 비스듬히)으로 얹는다 */
    .booked-badge {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      padding: 2px 6px;
      background: #3182F6;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.3;
      border-radius: 999px;
      white-space: nowrap;
      z-index: 2;
    }
    @media (max-width: 480px) {
      .booked-badge { font-size: 8px; padding: 1px 4px; letter-spacing: -0.3px; }
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
  margin-bottom: 4px;
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

  const tileContent = ({ date, view }: any) => {
    if (view === 'month' && isBooked(date)) return <span className="booked-badge">예약 완료</span>;
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
        tileContent={tileContent}
        tileDisabled={tileDisabled}
        calendarType="gregory"
        formatDay={(_, date) => date.getDate().toString()}
        next2Label={null}
        prev2Label={null}
        // 달마다 주 수가 4~6줄로 달라 달력 높이가 들쑥날쑥하지 않도록 항상 6줄로 그린다.
        // 남는 칸은 빈칸 대신 앞뒤 달 날짜를 흐리게(opacity 0.2) 채워서 공백처럼 보이지 않게 한다.
        showFixedNumberOfWeeks
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