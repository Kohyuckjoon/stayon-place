import React from 'react';
import { BookOpen, AlertTriangle, Download, Share2, MousePointerClick } from 'lucide-react';

export function ScheduleGuide() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 섹션 */}
        <div className="mb-10">
          <h1 className="text-[28px] font-black text-[#191F28] mb-2">일정표 만들기 가이드</h1>
          <p className="text-[16px] text-[#4E5968] font-medium">수련회 일정표를 간편하게 구성하고 공유해보세요.</p>
        </div>

        {/* 일정표 소개 섹션 */}
        <section className="bg-white p-8 rounded-[28px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#F2F4F6] mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#F2F8FF] rounded-2xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#3182F6]" />
            </div>
            <h2 className="text-[20px] font-black text-[#191F28]">일정표란?</h2>
          </div>
          <p className="text-[16px] leading-[1.6] text-[#4E5968] font-medium">
            일정표는 수련회 일정을 체계적으로 구성할 수 있는 도구입니다. 
            완성된 일정표는 <strong className="text-[#191F28]">PNG 이미지 파일로 즉시 다운로드</strong>할 수 있으며, 
            카카오톡 등 다양한 메신저를 통해 팀원들과 손쉽게 공유할 수 있습니다.
          </p>
        </section>

        {/* 주의사항 섹션 */}
        <section className="bg-[#FFF5F5] p-8 rounded-[28px] border border-[#FFE3E3]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#FFE3E3] rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-[#F04438]" />
            </div>
            <h2 className="text-[20px] font-black text-[#191F28]">사전 안내 사항</h2>
          </div>
          <p className="text-[16px] leading-[1.6] text-[#4E5968] font-medium">
            로그인하지 않은 상태에서 일정표를 작성하실 경우, <strong className="text-[#F04438]">웹 브라우저를 종료하면 작성 중인 데이터가 저장되지 않습니다.</strong> 
            중요한 일정은 작성을 완료한 후 바로 이미지로 다운로드하여 보관하시길 권장합니다.
          </p>
        </section>

        {/* 팁 섹션 */}
        <div className="mt-10 grid grid-cols-2 gap-4">
          <div className="p-6 bg-white rounded-2xl border border-[#F2F4F6]">
            <Download className="w-6 h-6 text-[#3182F6] mb-3" />
            <p className="text-[14px] font-bold text-[#191F28]">이미지 저장</p>
            <p className="text-[12px] text-[#8B95A1] mt-1">파일로 즉시 저장</p>
          </div>
          <div className="p-6 bg-white rounded-2xl border border-[#F2F4F6]">
            <Share2 className="w-6 h-6 text-[#2DCA72] mb-3" />
            <p className="text-[14px] font-bold text-[#191F28]">간편 공유</p>
            <p className="text-[12px] text-[#8B95A1] mt-1">카톡으로 바로 전달</p>
          </div>
        </div>
      </div>
    </div>
  );
}
