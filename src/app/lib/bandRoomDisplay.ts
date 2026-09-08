// 합주실·연습실 등록 폼(BandRoomRegistrationForm.tsx)/상세(BandRoomDetail.tsx)/
// 관리자(AdminBandRooms.tsx) 화면이 공유하는 선택지·상수.

export const ROOM_TYPE_OPTIONS = ["연습실", "합주실", "겸용"] as const;

export const EQUIPMENT_CHECKLIST_OPTIONS = [
  "메인피아노", "세컨 피아노", "드럼(리얼)", "드럼(전자)", "기타 엠프(베이스)", "기타 엠프(일렉)", "싱어 마이크",
] as const;

export const MAX_TAGS = 10;

export const WEEKDAY_OPTIONS = ["월", "화", "수", "목", "금", "토", "일"] as const;

// 00:00 ~ 24:00까지 30분 단위 시간 목록 (예약가능 시간대 선택용)
export const TIME_OPTIONS: string[] = Array.from({ length: 49 }, (_, i) => {
  const totalMinutes = i * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

// 요일 + 시작/종료 시간을 "월,화,수 09:00~22:00" 형태의 읽기 쉬운 문자열로 합친다.
export function formatAvailableSchedule(days: string[], startTime: string, endTime: string): string {
  const dayText = days && days.length > 0 ? days.join(", ") : "";
  const timeText = startTime && endTime ? `${startTime}~${endTime}` : "";
  return [dayText, timeText].filter(Boolean).join(" ");
}

// 입력창에 타이핑하는 동안 숫자만 남기고 천단위 콤마를 붙여 보여준다 (등록/관리자 편집 공용).
export function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

// 시간당 요금 표시용. hourlyRate가 숫자로 저장돼 있으면 그대로, 예전에 문자열로
// 저장된 데이터("20,000원" 등)여도 숫자만 뽑아 같은 형식으로 보여준다.
export function formatHourlyRate(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === "") return "";
  const num = typeof value === "number" ? value : Number(String(value).replace(/[^\d]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return String(value);
  return `${num.toLocaleString("ko-KR")}원`;
}

// "예약률 높이기"(합주실·연습실용 끌어올리기/메인배너) 신청·노출에서 쓰는 슬롯 상수.
// 외부 사역팀용 슬롯(teamDisplay.ts의 TOP_BOOST_MAX_SLOTS/MAIN_BANNER_MAX_SLOTS)과는
// 별개의 풀이라 여기 따로 둔다. boostedUntil/boostedAt 필드명과 만료 판정 로직(isTeamBoosted)
// 자체는 팀·합주실 공용으로 재사용한다(구조가 동일해서 굳이 중복 정의하지 않음).
export const ROOM_TOP_BOOST_MAX_SLOTS = 4;
export const ROOM_MAIN_BANNER_MAX_SLOTS = 5;
