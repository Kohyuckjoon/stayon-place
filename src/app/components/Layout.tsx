import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom"; // useLocation 추가
// import { Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, AtSign } from "lucide-react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BoardSwitcher } from "./BoardSwitcher";
import { getPageTitle } from "../lib/pageTitles";

export function Layout() {
  const location = useLocation(); // 현재 경로 감지
  const isVenuesPage = location.pathname === "/venues"; // 장소 목록 페이지 여부
  const [socialOpen, setSocialOpen] = useState(false); // 카카오 버튼 위 소셜 플로팅 메뉴 펼침 여부

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

        {/* 인스타그램/쓰레드 플로팅 버튼 - 카카오 문의 버튼 바로 위에 원형 + 버튼으로 접혀있다가
            누르면 위로 펼쳐진다. 카카오는 원래 있던 문의 버튼을 그대로 쓰면 돼서 여기 안 넣었다. */}
        <div
          className={`fixed z-[999] right-10 flex flex-col-reverse items-center gap-3 ${
            isVenuesPage ? "bottom-[178px]" : "bottom-[108px]"
          }`}
        >
          <button
            type="button"
            onClick={() => setSocialOpen((v) => !v)}
            className="w-14 h-14 rounded-full bg-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-300"
            aria-label="소셜 채널 더보기"
          >
            <motion.div animate={{ rotate: socialOpen ? 45 : 0 }} transition={{ duration: 0.25 }}>
              <Plus className="w-6 h-6 text-[#191F28]" />
            </motion.div>
          </button>
          <AnimatePresence>
            {socialOpen && (
              <>
                <motion.a
                  key="threads"
                  href="https://www.threads.com/@place.stayon"
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 12, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="w-12 h-12 rounded-full bg-[#111111] text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-300"
                  aria-label="쓰레드"
                >
                  <AtSign className="w-5 h-5" />
                </motion.a>
                <motion.a
                  key="instagram"
                  href="https://www.instagram.com/place.stayon/"
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, y: 12, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.8 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-300"
                  aria-label="인스타그램"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.98-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.198-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                </motion.a>
              </>
            )}
          </AnimatePresence>
        </div>

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
