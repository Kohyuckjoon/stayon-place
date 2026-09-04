import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom"; // useLocation 추가
// import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BoardSwitcher } from "./BoardSwitcher";
import { getPageTitle } from "../lib/pageTitles";

export function Layout() {
  const location = useLocation(); // 현재 경로 감지
  const isVenuesPage = location.pathname === "/venues"; // 장소 목록 페이지 여부

  // 라우트가 바뀔 때마다 탭 제목을 갱신한다. 링크로 들어온 최초 페이지 제목이
  // 이후 다른 화면으로 이동해도 안 바뀌고 그대로 남아있던 문제 수정.
  // 이름이 있는 상세 페이지(장소/팀/합주실/교회)는 여기서 일반 제목을 먼저 넣고,
  // 각 상세 페이지가 데이터를 불러온 뒤 더 구체적인 제목으로 한 번 더 덮어쓴다.
  useEffect(() => {
    document.title = getPageTitle(location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      {/* Outlet 자리에 Home, VenueList 같은 실제 페이지가 들어옵니다 */}
      <main className="flex-1">
        <BoardSwitcher />
        <Outlet />

        <a
          href="https://pf.kakao.com/_AtexfX/chat"
          target="_blank"
          rel="noreferrer"
          className={`fixed z-[999] flex items-center gap-3 px-6 py-4 bg-[#FEE500] hover:bg-[#FDD800] text-[#373206] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition-all duration-300 hover:scale-105 active:scale-95 group ${
            isVenuesPage ? "bottom-[110px] right-10" : "bottom-10 right-10"
          }`}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 2C6.48 2 2 5.52 2 9.85c0 2.72 1.7 5.12 4.29 6.46-.23.82-.82 2.97-.93 3.42-.1.41.13.56.42.36.4-.28 3.52-2.38 4.02-2.73.74.15 1.51.24 2.3.24 5.52 0 10-3.52 10-7.85C22 5.52 17.52 2 12 2z" />
            </svg>
          </div>
          <span className="font-black text-[14px]">1:1 문의하기</span>
        </a>
      </main>
      <Footer />
    </div>
  );
}
