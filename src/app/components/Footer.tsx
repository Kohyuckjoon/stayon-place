import React from "react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-[#191F28] text-white py-24 px-6 border-t border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* 상단 섹션: 서비스 링크 및 소셜 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-black text-2xl mb-6 tracking-tighter text-white">STAYON</h4>
            <p className="text-[#8B95A1] text-[15px] leading-relaxed font-bold opacity-90">
              사역자의 마음으로 만든<br />
              가장 안전한 수련회 장소 플랫폼
            </p>
          </div>
          <div>
            <h5 className="font-bold text-[#D1D6DB] mb-6 text-sm uppercase tracking-wider">서비스</h5>
            <ul className="space-y-4 text-[#8B95A1] text-sm font-bold">
              <li><Link to="/venues" className="hover:text-white transition-colors">장소 찾기</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">장소 등록</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">검증 시스템</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#D1D6DB] mb-6 text-sm uppercase tracking-wider">고객지원</h5>
            <ul className="space-y-4 text-[#8B95A1] text-sm font-bold">
              <li><Link to="/faq" className="hover:text-white transition-colors">자주 묻는 질문</Link></li>
              <li><Link to="/safety" className="hover:text-white transition-colors">환불 규정</Link></li>
              <li>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open("https://docs.google.com/forms/d/e/1FAIpQLSemG4_fbEYEct7zo9tZ2EN-cY-Jg5pP63ODqDkRNEhq0l47yQ/viewform?usp=publish-editor", "_blank");
                  }}
                  className="hover:text-white transition-colors">문의하기</a>
              </li>
            </ul>
          </div>
          <div>
            <div>
            <h5 className="font-bold text-[#D1D6DB] mb-6 text-sm uppercase tracking-wider">공식 소셜</h5>
            <div className="flex flex-col gap-3">
              <SocialLink label="인스타그램" url="https://www.instagram.com/place.stayon/" color="hover:bg-[#E1306C]" />
              <SocialLink label="쓰레드" url="https://www.threads.com/@place.stayon" color="hover:bg-[#111111]" />
              <SocialLink label="카카오톡" url="https://pf.kakao.com/_AtexfX/chat" color="hover:bg-[#FEE500] hover:text-[#373206]" />
            </div>
          </div>
          </div>
        </div>

        {/* 하단 섹션: 사업자 정보 (스타일) */}
        <div className="border-t border-[#2F343C] pt-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[#8B95A1] text-[13px] font-bold">
                <span className="text-white font-black tracking-tight">상호: 스테이온 (STAYON)</span>
                <span className="w-px h-3 bg-gray-700 hidden md:block"></span>
                <span>대표자: 고혁준</span>
                <span className="w-px h-3 bg-gray-700 hidden md:block"></span>
                <span>사업자등록번호: 861-05-03692</span>
              </div>
              <div className="text-[#6B7684] text-[13px] font-medium leading-relaxed">
                주소: 경기도 용인시 처인구 경안천로 196-1<br />
                통신판매업신고: 제 2026-용인처인-00852 호
              </div>
              <div className="text-[#6B7684] text-[13px] font-medium flex flex-wrap gap-x-4">
                <span>고객센터: <a href="tel:0502-1937-0615" className="hover:text-white underline underline-offset-4 decoration-gray-700">0502-1937-0615</a></span>
                <span className="text-[11px] opacity-70">(평일 10:00 - 18:00 | 주말 08:30 - 21:00)</span>
              </div>
            </div>

            <div className="flex flex-col md:items-end justify-end gap-6 text-[#6B7684] text-xs font-medium">
              <div className="flex gap-8 order-1 md:order-2">
                {/* href="#" 에서 실제 경로 /terms 로 변경 및 Link 컴포넌트 적용 */}
                <Link to="/terms" className="hover:text-[#ADB5BD] transition-colors">이용약관</Link>
                {/* href="#" 에서 실제 경로 /privacy 로 변경 및 Link 컴포넌트 적용 */}
                <Link to="/privacy" className="hover:text-white transition-colors font-black text-[#D1D6DB]">개인정보처리방침</Link>
              </div>
              <div className="group cursor-default order-2 md:order-1 flex items-center">
                © 2026 STAYON. All rights reserved.
                {/* <span
                  onClick={() => window.open('/admin', '_blank')}
                  className="ml-2 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-500 font-bold text-[#3182F6] hover:text-blue-400"
                >
                  • 관리자
                </span> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialButton({ label, color }: { label: string, color: string }) {
  return (
    <div className={`w-11 h-11 bg-[#2F343C] rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer font-black text-sm text-[#D1D6DB] hover:text-white ${color}`}>
      {label}
    </div>
  );
}


function SocialLink({ label, url, color }: { label: string, url: string, color: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`w-full py-3 px-4 bg-[#2F343C] rounded-xl flex items-center justify-between transition-all duration-300 font-bold text-sm text-[#D1D6DB] hover:text-white ${color}`}
    >
      {label}
      <span className="opacity-50">→</span>
    </a>
  );
}
