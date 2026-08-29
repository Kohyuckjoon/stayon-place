import React, { useState } from 'react';
import { Calendar, ShieldAlert, CheckCircle2, X, Plus, Trash2, Clock, MapPin, Layers } from 'lucide-react';

interface BlockedDateRange {
  id: string;
  venueId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: string;    // 제한 사유
  createdAt: string;
}

interface VenueBlockManagerProps {
  currentVenue: {
    id: string;
    name: string;
    location: string;
  };
  blockedDates: BlockedDateRange[];
  onAddBlock: (blockData: Omit<BlockedDateRange, 'id' | 'createdAt'>) => Promise<void>;
  onRemoveBlock: (blockId: string) => Promise<void>;
}

export default function VenueBlockManager({
  currentVenue = { id: "PMHe4JY7PyUIdj7LUVp", name: "강원동상교회", location: "강원특별자치도 양양군 손양면 선사유적로 190-11" },
  blockedDates = [],
  onAddBlock,
  onRemoveBlock
}: VenueBlockManagerProps) {
  
  // 🟢 [구조 보존] 파이어베이스 데이터 바인딩용 원본 스테이트 유지
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      setNotification({ type: 'error', message: '모든 항목을 입력해주세요.' });
      return;
    }

    try {
      setIsSubmitting(true);
      if (onAddBlock) {
        await onAddBlock({
          venueId: currentVenue.id,
          startDate,
          endDate,
          reason
        });
      }
      
      setNotification({ type: 'success', message: '예약 제한 기간이 성공적으로 적용되었습니다.' });
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (error) {
      setNotification({ type: 'error', message: '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBlock = async (id: string) => {
    if (window.confirm('해당 기간의 예약 제한을 해제하시겠습니까?')) {
      try {
        if (onRemoveBlock) {
          await onRemoveBlock(id);
        }
        setNotification({ type: 'success', message: '예약 제한이 해제되었습니다.' });
      } catch (error) {
        setNotification({ type: 'error', message: '해제 중 오류가 발생했습니다.' });
      }
    }
  };

  return (
    // 토스 특유의 톤앤매너 배경색(#F2F4F6)과 편안한 탑 패딩 구조로 전체 레이아웃 리디자인
    <div className="w-full max-w-5xl mx-auto px-6 py-14 bg-[#F2F4F6] min-h-screen text-[#191F28] antialiased font-sans flex flex-col gap-7">
      
      {/* 상단 헤더: 입체감을 제거하고 볼드한 타이포그래피와 미니멀한 면 분할로 토스 아키텍처 재현 */}
      <header className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-transparent">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#F04452] animate-pulse"></div>
          <span className="text-[13px] font-bold text-[#F04452] tracking-wide">실시간 지정 일정 차단 모드 🔴</span>
        </div>
        <h1 className="text-[28px] md:text-[34px] font-black tracking-tight text-[#191F28] mb-2 leading-tight">
          {currentVenue.name} <span className="text-[#6B7684] font-medium text-[22px] md:text-[26px]">일정 제한</span>
        </h1>
        <div className="flex items-center gap-1.5 text-[#4E5968] text-[14px] font-medium">
          <MapPin className="w-4 h-4 text-[#3182F6]" />
          <span>{currentVenue.location}</span>
        </div>
      </header>

      {/* 알림 창: 컴포넌트 간격을 넓히고 토스의 흐르는 듯한 플로팅 인앱 배너 스타일로 수정 */}
      {notification && (
        <div className={`p-5 rounded-2xl flex items-center justify-between text-[15px] font-semibold transition-all shadow-sm ${
          notification.type === 'success' 
            ? 'bg-[#E8F3FF] text-[#3182F6]' 
            : 'bg-[#FFF0F0] text-[#F04452]'
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-[#3182F6]" /> : <ShieldAlert className="w-5 h-5 text-[#F04452]" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 레이아웃: 대칭 비례(1:1 변형 그리드) 구조로 가독성과 스캔 효율성(눈의 피로도) 극대화 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 items-start">
        
        {/* 폼 카드: 인풋 테두리를 최소화하고 라운딩 값을 키워 메테리얼 디자인 인터페이스 적용 */}
        <section className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col gap-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-[#F2F4F6]">
            <Calendar className="w-5 h-5 text-[#3182F6]" strokeWidth={2.5} />
            <h2 className="text-[19px] font-black text-[#191F28]">새 차단 일정 등록 🔴</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold text-[#6B7684] mb-2 pl-1">시작일 선택 🔴</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#F2F4F6] border border-transparent rounded-2xl text-[15px] font-bold text-[#191F28] focus:outline-none focus:bg-white focus:border-[#3182F6] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-[#6B7684] mb-2 pl-1">종료일 선택 🔴</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#F2F4F6] border border-transparent rounded-2xl text-[15px] font-bold text-[#191F28] focus:outline-none focus:bg-white focus:border-[#3182F6] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#6B7684] mb-2 pl-1">차단 사유 입력 🔴</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 교회 자체 여름수련회, 전화 개별예약 마감 등"
                className="w-full px-4 py-4 bg-[#F2F4F6] border border-transparent rounded-2xl text-[15px] font-medium text-[#191F28] placeholder-[#ADB5BD] focus:outline-none focus:bg-white focus:border-[#3182F6] transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-[#3182F6] text-white py-4 px-5 rounded-2xl text-[16px] font-bold shadow-sm hover:bg-[#1b64da] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              {isSubmitting ? '안전하게 처리 중...' : '예약 차단 설정하기'}
            </button>
          </form>
        </section>

        {/* 복수 리스트 타임라인 카드: 다중 일정이 세로로 유연하게 쌓이도록 리스트 모듈 전면 개편 */}
        <section className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] min-h-[460px] flex flex-col gap-6">
          <div className="flex items-center justify-between pb-2 border-b border-[#F2F4F6]">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-[#4E5968]" strokeWidth={2.5} />
              <h2 className="text-[19px] font-black text-[#191F28]">차단된 일정 목록 🔴</h2>
            </div>
            <span className="text-[13px] bg-[#FFF0F0] text-[#F04452] font-black px-3 py-1 rounded-full">
              총 {blockedDates.length}개 날짜 격리 중
            </span>
          </div>

          {/* 날짜별/요청별 무제한 독립 복수 차단 리스트 렌더링 뷰 레이어 */}
          {blockedDates.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-[#ADB5BD]">
              <Clock className="w-14 h-14 text-[#E5E8EB] mb-4" strokeWidth={1.5} />
              <p className="text-[16px] font-bold text-[#4E5968]">제한된 일정이 없습니다.</p>
              <p className="text-[13px] text-[#8B95A1] mt-1">현재 모든 일정이 오픈되어 예약 가능합니다.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[520px] pr-1 scrollbar-hide">
              {blockedDates.map((block) => (
                <div 
                  key={block.id}
                  className="group flex items-center justify-between p-5 bg-[#FAFAFB] hover:bg-[#F2F4F6] border border-[#F2F4F6] rounded-2xl transition-all duration-200"
                >
                  <div className="flex flex-col gap-1.5">
                    {/* 배지 디자인 변경 */}
                    <div className="flex items-center gap-2.5">
                      <span className="inline-block text-[11px] font-black bg-[#F04452] text-white px-2 py-0.5 rounded-md tracking-wider">
                        예약 불가 🔴
                      </span>
                      <span className="text-[16px] font-black text-[#333D4B]">
                        {block.startDate} ~ {block.endDate}
                      </span>
                    </div>
                    {/* 제한 사유 가독성 고도화 */}
                    <p className="text-[14px] text-[#4E5968] font-bold pl-0.5">
                      <span className="text-[#8B95A1] font-normal mr-2">사유</span>
                      {block.reason}
                    </p>
                  </div>

                  {/* 해제 버튼: 토스식 부드러운 텍스트/아이콘 일체형 인터랙티브 버튼으로 전면 교체 */}
                  <button
                    onClick={() => handleCancelBlock(block.id)}
                    className="p-3 text-[#ADB5BD] hover:text-[#F04452] bg-transparent hover:bg-white border border-transparent hover:border-[#E5E8EB] rounded-xl transition-all shadow-none hover:shadow-sm"
                    title="차단 일정 해제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
