import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

// 모바일 전용 게시판 전환 탭(프로그램/자유게시판/장소후기). PC에는 안 보임(md:hidden).
//
// 예전엔 이 UI를 페이지 3개(ProgramHub.tsx/FreeBoardList.tsx/ReviewList.tsx)에 각각
// 복제해서 넣었는데, 그러다 보니 페이지마다 배경색 맥락이 달라서(프로그램 페이지만
// 회색 배경 위에 떠 있어서 파란 배경 알약 트랙이 안 보이는 등) 스타일이 미묘하게
// 달라 보였다. Layout.tsx에서 한 번만 렌더링해서 항상 똑같이 보이게 했고, 이 페이지들은
// 전부 같은 <Layout>을 쓰기 때문에(라우트만 바뀌고 이 컴포넌트 자체는 언마운트되지
// 않음) framer-motion의 layoutId로 활성 탭 배경이 탭 사이를 부드럽게 슬라이드하는
// 토스 스타일 전환도 자연스럽게 가능해졌다(라우트가 완전히 바뀌는데도 이 컴포넌트는
// 그대로 유지되니까 애니메이션이 끊기지 않는다).
const TABS = [
  { id: "programs", label: "프로그램", path: "/programs" },
  { id: "freeboard", label: "자유게시판", path: "/freeboard" },
  { id: "reviews", label: "장소후기", path: "/reviews" },
] as const;

export function BoardSwitcher() {
  const location = useLocation();
  const activeId = TABS.find((tab) => location.pathname.startsWith(tab.path))?.id;

  // 세 게시판 페이지가 아니면 아예 렌더링하지 않는다.
  if (!activeId) return null;

  return (
    <div className="md:hidden max-w-7xl mx-auto px-4 pt-4">
      <div className="flex items-center gap-1 bg-[#F2F4F6] p-1 rounded-full">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            className="relative flex-1 text-center py-2.5 rounded-full text-[12.5px] font-black whitespace-nowrap"
          >
            {activeId === tab.id && (
              <motion.div
                layoutId="board-switcher-pill"
                className="absolute inset-0 bg-white rounded-full shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative z-10 transition-colors ${activeId === tab.id ? "text-[#3182F6]" : "text-[#8B95A1]"}`}>
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
