import { useState, useEffect, useMemo } from "react";
import { useNavigate, ScrollRestoration } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Search, Users, ShieldOff,
  Eye, Copy, PhoneCall, BarChart3, ArrowUpDown, Megaphone, CreditCard, Ban,
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: "검토 대기", bg: "bg-[#FFF7E6]", text: "text-[#FF9500]" },
  approved: { label: "승인 완료", bg: "bg-[#E7F9F3]", text: "text-[#00D082]" },
  rejected: { label: "반려 / 삭제", bg: "bg-[#FFF0F0]", text: "text-[#F04452]" },
};

type SortKey = "total" | "reveal" | "copy" | "call" | "lastContactAt";

export function AdminTeamInquiries() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, "ministryTeams"), (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    const unsubVenues = onSnapshot(collection(db, "venues"), (snap) => setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setSuspendedCount(snap.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => { unsubTeams(); unsubVenues(); unsubBookings(); unsubUsers(); };
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  const pendingCount = teams.filter((t) => t.status === "pending").length;
  const approvedCount = teams.filter((t) => t.status === "approved").length;
  const rejectedCount = teams.filter((t) => t.status === "rejected").length;

  const rows = useMemo(() => {
    const withCounts = teams
      .filter((t) => !searchQuery.trim() || (t.teamName || "").toLowerCase().includes(searchQuery.trim().toLowerCase()))
      .map((t) => {
        const reveal = t.contactRevealCount || 0;
        const copy = t.contactCopyCount || 0;
        const call = t.contactCallCount || 0;
        return { ...t, reveal, copy, call, total: reveal + copy + call };
      });

    return withCounts.sort((a, b) => {
      if (sortKey === "lastContactAt") {
        const at = a.lastContactAt?.toMillis?.() || 0;
        const bt = b.lastContactAt?.toMillis?.() || 0;
        return bt - at;
      }
      return b[sortKey] - a[sortKey];
    });
  }, [teams, searchQuery, sortKey]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    reveal: acc.reveal + r.reveal,
    copy: acc.copy + r.copy,
    call: acc.call + r.call,
  }), { reveal: 0, copy: 0, call: 0 }), [rows]);

  const SortButton = ({ label, value }: { label: string; value: SortKey }) => (
    <button
      type="button"
      onClick={() => setSortKey(value)}
      className={`flex items-center gap-1 text-[12px] font-black uppercase tracking-wider transition-colors ${sortKey === value ? "text-[#3182F6]" : "text-[#8B95A1] hover:text-[#4E5968]"
        }`}
    >
      {label} <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <AdminSidebarLayout
      brandSubtitle="외부 사역팀 관리자"
      sections={[
        {
          label: "회원 관리",
          items: [
            { id: "users", label: "전체 회원", icon: Users, href: "/admin/users" },
            { id: "suspended", label: "차단된 회원", count: suspendedCount, icon: ShieldOff, accentColor: "#F04452", href: "/admin/users?tab=suspended" },
          ],
        },
        {
          label: "장소 등록 관리",
          items: [
            { id: "v_pending", label: "검토 대기", count: venues.filter((v) => v.status === "pending").length, icon: Clock, accentColor: "#FF9500", href: "/admin/venues?tab=pending" },
            { id: "v_approved", label: "승인 완료", count: venues.filter((v) => v.status === "approved").length, icon: CheckCircle, href: "/admin/venues?tab=approved" },
            { id: "v_rejected", label: "반려 / 삭제", count: venues.filter((v) => v.status === "rejected").length, icon: XCircle, href: "/admin/venues?tab=rejected" },
            { id: "v_blockrequests", label: "차단 신청 승인", icon: Ban, accentColor: "#F04452", href: "/admin/venues?tab=blockRequests" },
          ],
        },
        {
          label: "국내선교 관리",
          items: [
            { id: "mv_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/mission-venues?tab=pending" },
            { id: "mv_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/mission-venues?tab=approved" },
            { id: "mv_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/mission-venues?tab=rejected" },
          ],
        },
        {
          label: "예약 및 답사 문의",
          items: [
            { id: "bk_pending", label: "예약 대기", count: bookings.filter((b) => b.status === "pending").length, icon: Clock, accentColor: "#FF9500", href: "/admin/bookings?tab=pending" },
            { id: "bk_approved", label: "결제 대기", count: bookings.filter((b) => b.status === "approved").length, icon: CheckCircle, href: "/admin/bookings?tab=approved" },
          ],
        },
        {
          label: "외부 사역팀 관리",
          items: [
            { id: "t_pending", label: "검토 대기", count: pendingCount, icon: Clock, accentColor: "#FF9500", href: "/admin/teams?tab=pending" },
            { id: "t_approved", label: "승인 완료", count: approvedCount, icon: CheckCircle, href: "/admin/teams?tab=approved" },
            { id: "t_rejected", label: "반려 / 삭제", count: rejectedCount, icon: XCircle, href: "/admin/teams?tab=rejected" },
            { id: "t_inquiries", label: "문의 현황", icon: BarChart3 },
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
      activeId="t_inquiries"
      onSelect={() => { /* 이 페이지엔 로컬 탭이 없음 */ }}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />

        <main className="max-w-[1300px] px-6 md:px-10 py-6 md:py-8">
          <div className="mb-6">
            <h1 className="text-[24px] font-black text-[#191F28] mb-1">외부 사역팀 문의 현황</h1>
            <p className="text-[14px] font-medium text-[#8B95A1]">등록된 모든 팀의 연락처 확인·복사·통화시도 신호를 한눈에 확인하세요.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-widest mb-1.5">전체 팀</p>
              <p className="text-[24px] font-black text-[#191F28]">{teams.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-widest mb-1.5 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> 확인</p>
              <p className="text-[24px] font-black text-[#191F28]">{totals.reveal}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-widest mb-1.5 flex items-center gap-1"><Copy className="w-3.5 h-3.5" /> 복사</p>
              <p className="text-[24px] font-black text-[#191F28]">{totals.copy}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-widest mb-1.5 flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5" /> 통화시도</p>
              <p className="text-[24px] font-black text-[#191F28]">{totals.call}</p>
            </div>
          </div>

          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="팀명으로 검색"
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#E5E8EB] rounded-2xl text-[14px] font-bold focus:border-[#3182F6] outline-none transition-all"
            />
          </div>

          <div className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#F2F4F6] bg-[#FAFAFB]">
                    <th className="text-left px-5 py-3.5 text-[12px] font-black text-[#8B95A1] uppercase tracking-wider">팀명</th>
                    <th className="text-left px-5 py-3.5 text-[12px] font-black text-[#8B95A1] uppercase tracking-wider">상태</th>
                    <th className="text-center px-5 py-3.5"><SortButton label="확인" value="reveal" /></th>
                    <th className="text-center px-5 py-3.5"><SortButton label="복사" value="copy" /></th>
                    <th className="text-center px-5 py-3.5"><SortButton label="통화시도" value="call" /></th>
                    <th className="text-center px-5 py-3.5"><SortButton label="합계" value="total" /></th>
                    <th className="text-right px-5 py-3.5"><SortButton label="최근 문의" value="lastContactAt" /></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-16 text-[#ADB5BD] font-bold">불러오는 중...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-16 text-[#ADB5BD] font-bold">등록된 팀이 없습니다.</td></tr>
                  ) : (
                    rows.map((r) => {
                      const status = STATUS_LABEL[r.status] || STATUS_LABEL.pending;
                      return (
                        <tr
                          key={r.id}
                          onClick={() => navigate(`/admin/teams?tab=${r.status || "pending"}`)}
                          className="border-b border-[#F2F4F6] last:border-0 hover:bg-[#FAFAFB] cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <p className="text-[14px] font-black text-[#191F28]">{r.teamName || "-"}</p>
                            <p className="text-[12px] font-bold text-[#8B95A1]">{r.category || "-"}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-1 text-[11px] font-black rounded-lg ${status.bg} ${status.text}`}>{status.label}</span>
                          </td>
                          <td className="px-5 py-3.5 text-center text-[14px] font-bold text-[#4E5968]">{r.reveal}</td>
                          <td className="px-5 py-3.5 text-center text-[14px] font-bold text-[#4E5968]">{r.copy}</td>
                          <td className="px-5 py-3.5 text-center text-[14px] font-bold text-[#4E5968]">{r.call}</td>
                          <td className="px-5 py-3.5 text-center text-[14px] font-black text-[#3182F6]">{r.total}</td>
                          <td className="px-5 py-3.5 text-right text-[12px] font-medium text-[#ADB5BD]">
                            {r.lastContactAt?.toDate?.()
                              ? r.lastContactAt.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
                              : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </AdminSidebarLayout>
  );
}
