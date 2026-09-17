import { useState, useEffect, useMemo } from "react";
import { ScrollRestoration, useSearchParams } from "react-router-dom";
import {
  Users, UserX, UserCheck, Search, Clock, CheckCircle, XCircle,
  Calendar, ClipboardCheck, CalendarCheck, MapPinned, CreditCard,
  ShieldOff, ShieldCheck, Trash2, AlertTriangle, Mail, BarChart3, Megaphone,
} from "lucide-react";
import { db, functions } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
// NOTE: 회원 목록 자체는 더 이상 Firestore users 컬렉션을 거치지 않는다.
// (아래 adminListUsers 참고) collection/onSnapshot은 사이드바 배지용 venues/bookings 구독에만 쓰인다.
import { httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";

// [디자인] 통계 카드 - AdminDashboard2.tsx의 StatCard와 동일한 스타일
const StatCard = ({ title, value, icon: Icon, colorClass, textColor }: any) => (
  <div className="bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-[0_4px_16px_rgb(0,0,0,0.03)] flex items-center justify-between group transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
    <div>
      <p className="text-[13px] font-bold text-[#8B95A1] mb-1">{title}</p>
      <p className={`text-[20px] font-black ${textColor || "text-[#191F28]"}`}>{value}</p>
    </div>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} transition-transform group-hover:scale-110`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
  </div>
);

// Header.tsx / AuthModal.tsx 두 가입 경로의 필드명 차이(name vs displayName)를 흡수
const getUserDisplayName = (u: any) => u.name || u.displayName || "이름 미확인";

// createdAt이 ISO 문자열이거나 Firestore Timestamp이거나 아예 없을 수 있어 방어적으로 처리
const formatJoinedDate = (u: any) => {
  const raw = u.createdAt;
  if (!raw) return "-";
  const date = typeof raw?.toDate === "function" ? raw.toDate() : new Date(raw);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const isToday = (raw: any) => {
  if (!raw) return false;
  const date = typeof raw?.toDate === "function" ? raw.toDate() : new Date(raw);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  return date.toDateString() === now.toDateString();
};

// createdAt이 없는 문서까지 항상 포함해서 정렬하기 위한 헬퍼 (없으면 맨 뒤로)
const getCreatedAtMs = (u: any): number => {
  const raw = u.createdAt;
  if (!raw) return 0;
  const date = typeof raw?.toDate === "function" ? raw.toDate() : new Date(raw);
  return isNaN(date.getTime()) ? 0 : date.getTime();
};

type UserTab = "all" | "suspended";
const VALID_TABS: UserTab[] = ["all", "suspended"];

export function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") as UserTab) ? (searchParams.get("tab") as UserTab) : "all";
  const [activeTab, setActiveTabState] = useState<UserTab>(initialTab);
  const setActiveTab = (tab: UserTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // 사이드바 배지용: 장소/예약 현황도 함께 구독 (다른 관리자 페이지와 동일한 패턴)
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  // Firestore users 컬렉션은 가입 과정에서 동기화가 실패하면 실제 가입자와 어긋날 수 있어,
  // 회원 목록은 Firebase Authentication을 직접 조회하는 adminListUsers를 통해 가져온다.
  const fetchUsers = async () => {
    try {
      const call = httpsCallable(functions, "adminListUsers");
      const result: any = await call();
      const list = (result.data?.users || []).map((u: any) => ({
        ...u,
        status: u.disabled ? "suspended" : "active",
      }));
      list.sort((a: any, b: any) => getCreatedAtMs(b) - getCreatedAtMs(a));
      setUsers(list);
    } catch (error) {
      console.error("회원 목록 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const unsubVenues = onSnapshot(collection(db, "venues"), (snap) => {
      setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubVenues(); unsubBookings(); };
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  const suspendedCount = users.filter((u) => u.status === "suspended").length;
  const todayJoinedCount = users.filter((u) => isToday(u.createdAt)).length;

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => (activeTab === "suspended" ? u.status === "suspended" : true))
      .filter((u) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.trim().toLowerCase();
        return getUserDisplayName(u).toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
      });
  }, [users, activeTab, searchQuery]);

  const handleToggleSuspend = async (targetUser: any) => {
    const willSuspend = targetUser.status !== "suspended";
    const confirmMsg = willSuspend
      ? `${getUserDisplayName(targetUser)}님의 로그인을 차단하시겠습니까?\n언제든 다시 해제할 수 있습니다.`
      : `${getUserDisplayName(targetUser)}님의 차단을 해제하시겠습니까?`;
    if (!window.confirm(confirmMsg)) return;

    setProcessingUid(targetUser.uid);
    try {
      const call = httpsCallable(functions, "adminSetUserDisabled");
      await call({ uid: targetUser.uid, disabled: willSuspend });
      await fetchUsers();
    } catch (error) {
      console.error("회원 차단 처리 실패:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingUid(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmText.trim().toLowerCase() !== (deleteTarget.email || "").toLowerCase()) return;

    setProcessingUid(deleteTarget.uid);
    try {
      const call = httpsCallable(functions, "adminDeleteUserAccount");
      await call({ uid: deleteTarget.uid });
      setDeleteTarget(null);
      setDeleteConfirmText("");
      await fetchUsers();
    } catch (error) {
      console.error("회원 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setProcessingUid(null);
    }
  };

  return (
    <AdminSidebarLayout
      brandSubtitle="회원 관리자"
      sections={[
        {
          label: "회원 관리",
          items: [
            { id: "all", label: "전체 회원", count: users.length, icon: Users },
            { id: "suspended", label: "차단된 회원", count: suspendedCount, icon: ShieldOff, accentColor: "#F04452" },
          ],
        },
        {
          label: "장소 등록 관리",
          items: [
            { id: "v_pending", label: "검토 대기", count: venues.filter((v) => v.status === "pending").length, icon: Clock, accentColor: "#FF9500", href: "/admin/venues?tab=pending" },
            { id: "v_approved", label: "승인 완료", count: venues.filter((v) => v.status === "approved").length, icon: CheckCircle, href: "/admin/venues?tab=approved" },
            { id: "v_rejected", label: "반려 / 삭제", count: venues.filter((v) => v.status === "rejected").length, icon: XCircle, href: "/admin/venues?tab=rejected" },
            { id: "v_schedule", label: "장소별 일정관리", count: venues.filter((v) => v.status === "approved").length, icon: Calendar, href: "/admin/venues?tab=schedule" },
          ],
        },
        {
          label: "예약 및 답사 문의",
          items: [
            { id: "bk_pending", label: "예약 대기", count: bookings.filter((b) => b.status === "pending").length, icon: ClipboardCheck, accentColor: "#FF9500", href: "/admin/bookings?tab=pending" },
            { id: "bk_confirmed", label: "답사 승인", count: bookings.filter((b) => b.status === "confirmed").length, icon: CalendarCheck, href: "/admin/bookings?tab=confirmed" },
            { id: "bk_inspection_confirmed", label: "답사 확정", count: bookings.filter((b) => b.status === "inspection_confirmed").length, icon: MapPinned, accentColor: "#3182F6", href: "/admin/bookings?tab=inspection_confirmed" },
            { id: "bk_approved", label: "결제 대기", count: bookings.filter((b) => b.status === "approved").length, icon: CreditCard, href: "/admin/bookings?tab=approved" },
            { id: "bk_deposit_paid", label: "완료", count: bookings.filter((b) => b.status === "deposit_paid").length, icon: CheckCircle, href: "/admin/bookings?tab=deposit_paid" },
          ],
        },
        {
          label: "외부 사역팀 관리",
          items: [
            { id: "t_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/teams?tab=pending" },
            { id: "t_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/teams?tab=approved" },
            { id: "t_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/teams?tab=rejected" },
            { id: "t_inquiries", label: "문의 현황", icon: BarChart3, href: "/admin/team-inquiries" },
            { id: "t_ads", label: "광고 설정", icon: Megaphone, href: "/admin/team-ads" },
          ],
        },
        {
          label: "합주실 관리",
          items: [
            { id: "r_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/band-rooms?tab=pending" },
            { id: "r_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/band-rooms?tab=approved" },
            { id: "r_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/band-rooms?tab=rejected" },
            { id: "r_bookings", label: "예약 관리", icon: CreditCard, href: "/admin/band-room-bookings" },
            { id: "r_ads", label: "광고 설정", icon: Megaphone, href: "/admin/band-room-ads" },
          ],
        },
        {
          label: "교회 관리",
          items: [
            { id: "c_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/churches?tab=pending" },
            { id: "c_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/churches?tab=approved" },
            { id: "c_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/churches?tab=rejected" },
          ],
        },
        {
          label: "굿즈 관리",
          items: [
            { id: "g_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/goods?tab=pending" },
            { id: "g_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/goods?tab=approved" },
            { id: "g_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/goods?tab=rejected" },
          ],
        },
        {
          label: "단체티 관리",
          items: [
            { id: "s_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/shirts?tab=pending" },
            { id: "s_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/shirts?tab=approved" },
            { id: "s_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/shirts?tab=rejected" },
          ],
        },
        {
          label: "차량 대여 관리",
          items: [
            { id: "vh_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/vehicles?tab=pending" },
            { id: "vh_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/vehicles?tab=approved" },
            { id: "vh_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/vehicles?tab=rejected" },
          ],
        },
      ]}
      activeId={activeTab}
      onSelect={(id) => setActiveTab(id as UserTab)}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />

        <main className="max-w-[1300px] px-6 md:px-10 py-6 md:py-8">
          {/* 모바일 전용 탭 */}
          <div className="flex md:hidden bg-[#E5E8EB] p-1.5 rounded-[18px] w-full mb-5 overflow-x-auto">
            {[
              { id: "all", label: `전체 ${users.length}` },
              { id: "suspended", label: `차단 ${suspendedCount}` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as UserTab)}
                className={`flex-none px-4 py-2.5 rounded-[14px] text-[13px] font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684]"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <h1 className="text-[22px] md:text-[26px] font-black tracking-tight leading-tight mb-1">회원 관리</h1>
            <p className="text-[#4E5968] font-bold text-[13px] md:text-[14px]">플랫폼에 가입한 회원 목록을 확인하고 관리하세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <StatCard title="전체 회원" value={`${users.length}명`} icon={Users} colorClass="bg-[#3182F6]" textColor="text-[#3182F6]" />
            <StatCard title="오늘 가입" value={`${todayJoinedCount}명`} icon={UserCheck} colorClass="bg-[#00D082]" textColor="text-[#00D082]" />
            <StatCard title="차단된 회원" value={`${suspendedCount}명`} icon={UserX} colorClass="bg-[#F04452]" textColor="text-[#F04452]" />
          </div>

          <div className="relative mb-5 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름 또는 이메일로 검색"
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#3182F6] transition-all"
            />
          </div>

          {loading ? (
            <div className="py-32 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#3182F6] rounded-full animate-spin" />
              <p className="text-[14px] font-bold text-[#8B95A1]">회원 목록을 불러오고 있어요</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
              <p className="text-[16px] font-black text-[#8B95A1]">
                {activeTab === "suspended" ? "차단된 회원이 없어요" : "조건에 맞는 회원이 없어요"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-[24px] border border-[#F2F4F6] overflow-hidden divide-y divide-[#F2F4F6]">
              {filteredUsers.map((u) => {
                const isSuspended = u.status === "suspended";
                const isProcessing = processingUid === u.uid;
                return (
                  <div key={u.uid} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFB] transition-colors">
                    <div className="w-11 h-11 rounded-full bg-[#F2F4F6] flex items-center justify-center text-[#4E5968] font-black text-[15px] shrink-0">
                      {getUserDisplayName(u).slice(0, 1)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-black text-[#191F28] truncate">{getUserDisplayName(u)}</p>
                        {isSuspended && (
                          <span className="shrink-0 px-2 py-0.5 bg-[#FFF0F0] text-[#F04452] rounded-md text-[11px] font-black">차단됨</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[#8B95A1] text-[13px] font-bold mt-0.5">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{u.email || "-"}</span>
                      </div>
                    </div>

                    <div className="hidden sm:block text-[13px] font-bold text-[#8B95A1] shrink-0 w-24 text-center">
                      {formatJoinedDate(u)}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleSuspend(u)}
                        disabled={isProcessing}
                        title={isSuspended ? "차단 해제" : "차단하기"}
                        className={`p-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isSuspended
                          ? "bg-[#E8F3FF] text-[#3182F6] hover:bg-[#D6E9FF]"
                          : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]"
                          }`}
                      >
                        {isSuspended ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(u); setDeleteConfirmText(""); }}
                        disabled={isProcessing}
                        title="회원 삭제"
                        className="p-2 bg-[#FFF0F0] text-[#F04452] rounded-lg hover:bg-[#FFE0E0] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* 삭제 확인 모달: 이메일을 직접 입력해야만 삭제 가능 (돌이킬 수 없는 작업이라 강한 확인 절차) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[28px] p-7 shadow-2xl">
            <div className="w-12 h-12 bg-[#FFF0F0] rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-[#F04452]" />
            </div>
            <h3 className="text-[18px] font-black text-[#191F28] mb-2">회원 계정을 완전히 삭제할까요?</h3>
            <p className="text-[13px] font-bold text-[#8B95A1] leading-relaxed mb-5">
              <span className="text-[#191F28]">{getUserDisplayName(deleteTarget)}</span>({deleteTarget.email}) 계정과 관련 데이터가 영구적으로 삭제되며 되돌릴 수 없습니다.
              확인을 위해 아래에 이메일을 정확히 입력해주세요.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteTarget.email || ""}
              className="w-full h-12 bg-[#F9FAFB] rounded-xl px-4 text-[14px] font-bold outline-none border-2 border-transparent focus:border-[#F04452] transition-all mb-5"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
                className="flex-1 py-3.5 bg-[#F2F4F6] text-[#4E5968] rounded-xl font-bold text-[14px] transition-all active:scale-95"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText.trim().toLowerCase() !== (deleteTarget.email || "").toLowerCase() || processingUid === deleteTarget.uid}
                className="flex-1 py-3.5 bg-[#F04452] text-white rounded-xl font-bold text-[14px] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {processingUid === deleteTarget.uid ? "삭제 중..." : "영구 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminSidebarLayout>
  );
}
