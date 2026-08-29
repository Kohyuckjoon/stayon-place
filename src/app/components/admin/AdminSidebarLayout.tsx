import { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  accentColor?: string;
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
  const renderNavItem = (item: AdminNavItem, onNavigate?: () => void) => {
    const isActive = item.id === activeId;
    const Icon = item.icon;
    const hasAlert = !isActive && (item.count ?? 0) > 0 && !!item.accentColor;

    const content = (
      <>
        <span className="flex items-center gap-3">
          <Icon className="w-[18px] h-[18px]" />
          {item.label}
        </span>
        {typeof item.count === "number" && (
          <span
            className={`text-[12px] font-black px-2 py-0.5 rounded-full min-w-[26px] text-center ${
              isActive ? "bg-white/20 text-white" : hasAlert ? "text-white" : "bg-[#F2F4F6] text-[#8B95A1]"
            }`}
            style={hasAlert ? { backgroundColor: item.accentColor } : undefined}
          >
            {item.count}
          </span>
        )}
      </>
    );

    const className = `flex items-center justify-between px-4 py-3.5 rounded-2xl text-[15px] font-bold transition-all ${
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

        {sections.map((section) => (
          <nav key={section.label} className="flex flex-col gap-1.5">
            <p className="px-3 mb-1 text-[11px] font-black text-[#ADB5BD] uppercase tracking-widest">{section.label}</p>
            {section.items.map((item) => renderNavItem(item, onNavigate))}
          </nav>
        ))}
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

  // 사이드바는 화면 크기와 상관없이 항상 전체가 펼쳐진 상태로 보인다.
  // 클릭해야 나타나는 햄버거 메뉴/드로어 방식은 쓰지 않는다.
  return (
    <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] flex">
      <aside className="flex w-[240px] sm:w-[272px] shrink-0 flex-col justify-between bg-white border-r border-[#F2F4F6] sticky top-0 h-screen overflow-y-auto">
        {sidebarBody()}
      </aside>

      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
