import React from 'react';
import { useNavigate } from 'react-router-dom';

export const SmartPlannerGuide = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 bg-white min-h-screen">
      {/* 헤더 */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">스마트 플래너 사용법</h1>
      <p className="text-gray-500 mb-8">수련회 장소를 한눈에 비교하고 관리해보세요.</p>

      {/* 안내 박스 (토스 스타일) */}
      <div className="bg-blue-50 rounded-2xl p-6 mb-10 border border-blue-100">
        <h3 className="text-blue-700 font-bold mb-2">⚠️ 꼭 확인해주세요</h3>
        <p className="text-blue-900 text-sm leading-relaxed">
          로그인하지 않은 상태에서 이용 시, 웹 브라우저를 종료하면 작성하신 플래너 내용이 저장되지 않습니다. 
          안전한 저장을 위해 로그인을 권장합니다.
        </p>
      </div>

      {/* 단계별 안내 */}
      <div className="space-y-10">
        <StepItem 
          number="01" 
          title="장소 찾기 및 추가" 
          desc="원하는 수련회 장소를 검색하세요. 각 장소 상세페이지 또는 목록 좌측 상단의 '+' 버튼을 클릭하면 플래너에 바로 담을 수 있습니다." 
        />
        <StepItem 
          number="02" 
          title="비교하기" 
          desc="추가한 장소들을 스마트 플래너에서 한눈에 비교해보세요. 가장 저렴한 장소가 어디인지 직관적으로 확인할 수 있습니다." 
        />
        <StepItem 
          number="03" 
          title="보고서 만들기" 
          desc="PDF, PNG, 한글, 엑셀 등 교회 상황에 맞는 양식으로 문서를 내려받으세요. 스테이온 기본 양식을 바탕으로 자유롭게 편집이 가능합니다." 
        />
      </div>

      {/* 하단 버튼 */}
      <div className="mt-16 pt-8 border-t border-gray-100">
        <button 
          onClick={() => navigate('/smart-planner')}
          className="w-full bg-gray-900 text-white font-semibold py-4 rounded-2xl hover:bg-gray-800 transition-all"
        >
          스마트 플래너 시작하기
        </button>
      </div>
    </div>
  );
};

const StepItem = ({ number, title, desc }: { number: string; title: string; desc: string }) => (
  <div className="flex gap-6">
    <div className="text-2xl font-black text-blue-500 pt-1">{number}</div>
    <div>
      <h4 className="text-lg font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
  </div>
);
