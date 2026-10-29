import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  accentColor?: string;
  // "NEW" 같은 짧은 표시 (count 대신 보여줌)
  badge?: string;
  // 지정 시 로컬 탭 전환 대신 해당 경로로 이동하는 링크로 렌더링됨 (다른 관리자 페이지로 넘어갈 때 사용)
  href?: string;
}

export interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

interface AdminSidebarLayoutProps {
  brandTitle?: string;
  brandSubtitle?: string;
  backHref?: string;
  sections: AdminNavSection[];
  activeId: string;
  onSelect: (id: string) => void;
  adminEmail?: string;
  children: ReactNode;
}

// 관리자 페이지 전반에서 재사용할 좌측 사이드바 셸.
// 기존 화이트/토스 톤(블루 #3182F6)을 유지하며, 다른 관리자 페이지에서도 sections만 바꿔 재사용 가능.
// 섹션의 각 항목은 href가 있으면 다른 관리자 페이지로 이동하는 링크로, 없으면 현재 페이지 내 로컬 탭 전환 버튼으로 렌더링됨.
export function AdminSidebarLayout({
  brandTitle = "StayOn Admin",
  brandSubtitle = "관리자 콘솔",
  backHref = "/admin",
  sections,
  activeId,
  onSelect,
  adminEmail = "admin@stayon.com",
  children,
}: AdminSidebarLayoutProps) {
  // 모바일에서 사이드바를 항상 펼쳐두면(240px 고정폭) 남는 공간이 너무 좁아서 콘텐츠가
  // 다 깨져 보였다. md 미만에서는 사이드바를 감추고, 상단 바의 햄버거 버튼으로 여닫는
  // 슬라이드 드로어로 바꿨다 — 공개 사이트 Header.tsx의 모바일 메뉴와 같은 패턴.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 섹션이 12개 가까이 쌓이면서 전체를 다 펼쳐두면 스크롤해야만 아래쪽 메뉴가 보였다.
  // 한 번에 하나만 펼쳐지는 순수 아코디언 - 다른 섹션을 열면 열려있던 섹션은 자동으로
  // 닫히고, 항상 최소 하나는 펼쳐져 있다(이미 펼쳐진 섹션을 다시 눌러도 닫히지 않음).
  const [expandedLabel, setExpandedLabel] = useState<string>(() => {
    const activeSection = sections.find((s) => s.items.some((i) => i.id === activeId));
    return activeSection?.label ?? sections[0]?.label ?? "";
  });

  // 로컬 탭 전환(같은 페이지 안에서 activeId만 바뀌는 경우)으로 활성 섹션이 달라지면
  // 그 섹션을 펼친다.
  useEffect(() => {
    const activeSection = sections.find((s) => s.items.some((i) => i.id === activeId));
    if (activeSection) setExpandedLabel(activeSection.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const renderNavItem = (item: AdminNavItem, onNavigate?: () => void) => {
    const isActive = item.id === activeId;
    const Icon = item.icon;
    const hasAlert = !isActive && (item.count ?? 0) > 0 && !!item.accentColor;

    const content = (
      <>
        <span className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          {item.label}
        </span>
        {typeof item.count === "number" && (
          <span
            className={`text-[13px] font-black px-2 py-0.5 rounded-full min-w-[28px] text-center ${
              isActive ? "bg-white/20 text-white" : hasAlert ? "text-white" : "bg-[#F2F4F6] text-[#8B95A1]"
            }`}
            style={hasAlert ? { backgroundColor: item.accentColor } : undefined}
          >
            {item.count}
          </span>
        )}
        {typeof item.count !== "number" && item.badge && (
          <span
            className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
              isActive ? "bg-white text-[#3182F6]" : "bg-[#E8F3FF] text-[#3182F6]"
            }`}
          >
            {item.badge}
          </span>
        )}
      </>
    );

    const className = `flex items-center justify-between px-4 py-3.5 rounded-2xl text-[16px] font-bold transition-all ${
      isActive ? "bg-[#3182F6] text-white shadow-md shadow-[#3182F6]/20" : "text-[#4E5968] hover:bg-[#F2F4F6]"
    }`;

    if (item.href) {
      return (
        <Link key={item.id} to={item.href} className={className} onClick={onNavigate}>
          {content}
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          onSelect(item.id);
          onNavigate?.();
        }}
        className={className}
      >
        {content}
      </button>
    );
  };

  const sidebarBody = (onNavigate?: () => void) => (
    <>
      <div className="p-6 flex flex-col gap-7 overflow-y-auto">
        <Link to={backHref} className="flex items-center gap-3 group px-1" onClick={onNavigate}>
          <div className="w-10 h-10 rounded-2xl bg-[#3182F6] flex items-center justify-center text-white font-black text-[16px] shrink-0 group-hover:bg-[#1B64DA] transition-colors">
            S
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-black text-[#191F28] leading-tight truncate">{brandTitle}</p>
            <p className="text-[12px] font-bold text-[#8B95A1] leading-tight truncate">{brandSubtitle}</p>
          </div>
        </Link>

        {sections.map((section) => {
          // "개요"(대시보드 바로가기)만 예외 - 다른 모든 메뉴로 넘어갈 때도 기준점
          // 역할을 하는 고정 앵커라서 접지 않는다. 항목이 하나뿐인 다른 일반 섹션
          // (음향 시공 관리 등)은 여기 해당 안 되고 아래의 보통 아코디언을 그대로 쓴다.
          if (section.label === "개요") {
            return (
              <nav key={section.label} className="flex flex-col gap-1.5">
                <p className="px-3 mb-1 text-[12px] font-black text-[#ADB5BD] uppercase tracking-widest">{section.label}</p>
                {section.items.map((item) => renderNavItem(item, onNavigate))}
              </nav>
            );
          }

          const isExpanded = expandedLabel === section.label;
          const sectionHasAlert = !isExpanded && section.items.some(
            (item) => item.id !== activeId && (item.count ?? 0) > 0 && !!item.accentColor
          );
          return (
            <nav key={section.label} className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setExpandedLabel(section.label)}
                className="flex items-center justify-between px-3 py-2 -my-1 text-[12px] font-black text-[#ADB5BD] uppercase tracking-widest hover:text-[#6B7684] transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  {section.label}
                  {sectionHasAlert && <span className="w-1.5 h-1.5 rounded-full bg-[#FF4545]" />}
                </span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
              </button>
              {isExpanded && section.items.map((item) => renderNavItem(item, onNavigate))}
            </nav>
          );
        })}
      </div>

      <div className="p-6 border-t border-[#F2F4F6]">
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-full bg-[#F2F4F6] flex items-center justify-center text-[#4E5968] font-black text-[13px] shrink-0">
            AD
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#191F28] leading-tight">관리자 계정</p>
            <p className="text-[12px] font-medium text-[#ADB5BD] leading-tight truncate">{adminEmail}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] flex">
      {/* 데스크톱: 항상 펼쳐진 사이드바 (기존 그대로) */}
      <aside className="hidden md:flex w-[240px] sm:w-[272px] shrink-0 flex-col justify-between bg-white border-r border-[#F2F4F6] sticky top-0 h-screen overflow-y-auto">
        {sidebarBody()}
      </aside>

      {/* 모바일: 항상 옆으로 나란히 두는 flex-row 구조라, 상단 바+콘텐츠를 세로로 쌓을
          별도 flex-col 컨테이너로 감싼다 (안 그러면 상단 바가 콘텐츠 옆에 나란히 붙어버림). */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="md:hidden sticky top-0 z-[150] flex items-center justify-between px-4 py-3 bg-white border-b border-[#F2F4F6] shrink-0 w-full h-14">
          <Link to={backHref} className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#3182F6] flex items-center justify-center text-white font-black text-[13px] shrink-0">S</div>
            <p className="text-[14px] font-black text-[#191F28] truncate">{brandTitle}</p>
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 -mr-2 text-[#4E5968] shrink-0">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[200]">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-[#191F28]/50 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "tween", duration: 0.25 }}
              className="absolute left-0 top-0 h-full w-[280px] max-w-[82vw] bg-white flex flex-col justify-between shadow-2xl"
            >
              <div className="flex items-center justify-end px-4 pt-3">
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-[#8B95A1]"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 min-h-0 flex flex-col justify-between -mt-2">
                {sidebarBody(() => setMobileMenuOpen(false))}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
