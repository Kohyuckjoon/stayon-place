import { useState, useEffect, useMemo } from "react";
import { ScrollRestoration } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Search, Users, ShieldOff,
  BarChart3, Megaphone, CreditCard, RotateCcw,
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import { formatHourlyRate } from "../lib/bandRoomDisplay";

const STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  pending_payment: { label: "결제 대기", bg: "bg-[#FFF7E6]", text: "text-[#FF9500]" },
  paid: { label: "결제 완료", bg: "bg-[#E7F9F3]", text: "text-[#00D082]" },
  cancelled: { label: "취소됨", bg: "bg-[#F2F4F6]", text: "text-[#8B95A1]" },
  refunded: { label: "환불 완료", bg: "bg-[#F5F3FF]", text: "text-[#8B5CF6]" },
  expired: { label: "만료(미결제)", bg: "bg-[#FFF0F0]", text: "text-[#F04452]" },
};

type StatusFilter = "all" | "pending_payment" | "paid" | "refunded" | "expired";

export function AdminBandRoomBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [venueBookings, setVenueBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [churches, setChurches] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const unsubBookings = onSnapshot(collection(db, "bandRoomBookings"), (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    const unsubTeams = onSnapshot(collection(db, "ministryTeams"), (snap) => setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubVenues = onSnapshot(collection(db, "venues"), (snap) => setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubVenueBookings = onSnapshot(collection(db, "bookings"), (snap) => setVenueBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubRooms = onSnapshot(collection(db, "bandRooms"), (snap) => setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubChurches = onSnapshot(collection(db, "churches"), (snap) => setChurches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setSuspendedCount(snap.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => { unsubBookings(); unsubTeams(); unsubVenues(); unsubVenueBookings(); unsubRooms(); unsubChurches(); unsubUsers(); };
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  const teamPendingCount = teams.filter((t) => t.status === "pending").length;
  const teamApprovedCount = teams.filter((t) => t.status === "approved").length;
  const teamRejectedCount = teams.filter((t) => t.status === "rejected").length;
  const roomPendingCount = rooms.filter((r) => r.status === "pending").length;
  const churchPendingCount = churches.filter((c) => c.status === "pending").length;

  const rows = useMemo(() => {
    return bookings
      .filter((b) => statusFilter === "all" || b.status === statusFilter)
      .filter((b) => !searchQuery.trim() || (b.bandRoomName || "").includes(searchQuery) || (b.userName || "").includes(searchQuery))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [bookings, statusFilter, searchQuery]);

  const totals = useMemo(() => {
    const paid = bookings.filter((b) => b.status === "paid");
    return {
      count: bookings.length,
      paidCount: paid.length,
      paidAmount: paid.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    };
  }, [bookings]);

  const handleRefund = async (id: string) => {
    if (!window.confirm("이 예약을 환불 처리하시겠습니까?\n실제 PG 환불은 별도로 진행하셔야 하며, 여기서는 상태만 변경됩니다.")) return;
    try {
      await updateDoc(doc(db, "bandRoomBookings", id), { status: "refunded" });
    } catch (error) {
      console.error("환불 처리 실패:", error);
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  const FILTERS: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "pending_payment", label: "결제 대기" },
    { id: "paid", label: "결제 완료" },
    { id: "refunded", label: "환불" },
    { id: "expired", label: "만료" },
  ];

  return (
    <AdminSidebarLayout
      brandSubtitle="합주실 관리자"
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
          ],
        },
        {
          label: "예약 및 답사 문의",
          items: [
            { id: "bk_pending", label: "예약 대기", count: venueBookings.filter((b) => b.status === "pending").length, icon: Clock, accentColor: "#FF9500", href: "/admin/bookings?tab=pending" },
          ],
        },
        {
          label: "외부 사역팀 관리",
          items: [
            { id: "t_pending", label: "검토 대기", count: teamPendingCount, icon: Clock, accentColor: "#FF9500", href: "/admin/teams?tab=pending" },
            { id: "t_approved", label: "승인 완료", count: teamApprovedCount, icon: CheckCircle, href: "/admin/teams?tab=approved" },
            { id: "t_rejected", label: "반려 / 삭제", count: teamRejectedCount, icon: XCircle, href: "/admin/teams?tab=rejected" },
            { id: "t_inquiries", label: "문의 현황", icon: BarChart3, href: "/admin/team-inquiries" },
            { id: "t_ads", label: "광고 설정", icon: Megaphone, href: "/admin/team-ads" },
          ],
        },
        {
          label: "합주실 관리",
          items: [
            { id: "r_pending", label: "검토 대기", count: roomPendingCount, icon: Clock, accentColor: "#FF9500", href: "/admin/band-rooms?tab=pending" },
            { id: "r_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/band-rooms?tab=approved" },
            { id: "r_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/band-rooms?tab=rejected" },
            { id: "r_bookings", label: "예약 관리", icon: CreditCard },
            { id: "r_ads", label: "광고 설정", icon: Megaphone, href: "/admin/band-room-ads" },
          ],
        },
        {
          label: "교회 관리",
          items: [
            { id: "c_pending", label: "검토 대기", count: churchPendingCount, icon: Clock, accentColor: "#FF9500", href: "/admin/churches?tab=pending" },
          ],
        },
      ]}
      activeId="r_bookings"
      onSelect={() => { /* 이 페이지엔 로컬 탭이 없음 */ }}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />

        <main className="max-w-[1300px] px-6 md:px-10 py-6 md:py-8">
          <div className="mb-6">
            <h1 className="text-[24px] font-black text-[#191F28] mb-1">합주실 예약 관리</h1>
            <p className="text-[14px] font-medium text-[#8B95A1]">Track2(예약·결제 지원) 공간의 예약·결제 내역을 확인하세요.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-widest mb-1.5">전체 예약</p>
              <p className="text-[24px] font-black text-[#191F28]">{totals.count}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-widest mb-1.5">결제 완료</p>
              <p className="text-[24px] font-black text-[#191F28]">{totals.paidCount}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-widest mb-1.5">결제 완료 총액</p>
              <p className="text-[20px] font-black text-[#191F28]">{formatHourlyRate(totals.paidAmount) || "0원"}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1 bg-[#E5E8EB] p-1 rounded-xl">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3.5 py-2 rounded-[12px] text-[12px] font-bold whitespace-nowrap transition-all ${statusFilter === f.id ? "bg-white text-[#0EA5E9] shadow-sm" : "text-[#6B7684]"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="공간명 또는 예약자명으로 검색"
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold focus:border-[#0EA5E9] outline-none transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#F2F4F6] bg-[#FAFAFB]">
                    <th className="text-left px-5 py-3.5 text-[12px] font-black text-[#8B95A1] uppercase tracking-wider">공간명</th>
                    <th className="text-left px-5 py-3.5 text-[12px] font-black text-[#8B95A1] uppercase tracking-wider">예약자</th>
                    <th className="text-left px-5 py-3.5 text-[12px] font-black text-[#8B95A1] uppercase tracking-wider">일시</th>
                    <th className="text-right px-5 py-3.5 text-[12px] font-black text-[#8B95A1] uppercase tracking-wider">금액</th>
                    <th className="text-center px-5 py-3.5 text-[12px] font-black text-[#8B95A1] uppercase tracking-wider">상태</th>
                    <th className="text-right px-5 py-3.5 text-[12px] font-black text-[#8B95A1] uppercase tracking-wider">처리</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-16 text-[#ADB5BD] font-bold">불러오는 중...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-16 text-[#ADB5BD] font-bold">해당하는 예약이 없어요.</td></tr>
                  ) : (
                    rows.map((b) => {
                      const status = STATUS_LABEL[b.status] || STATUS_LABEL.pending_payment;
                      return (
                        <tr key={b.id} className="border-b border-[#F2F4F6] last:border-0 hover:bg-[#FAFAFB] transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-[14px] font-black text-[#191F28]">{b.bandRoomName || "-"}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-[13px] font-bold text-[#4E5968]">{b.userName || "-"}</p>
                            <p className="text-[12px] font-bold text-[#ADB5BD]">{b.userContact || "-"}</p>
                          </td>
                          <td className="px-5 py-3.5 text-[13px] font-bold text-[#4E5968]">
                            {b.date} {b.startTime}~{b.endTime}
                          </td>
                          <td className="px-5 py-3.5 text-right text-[14px] font-black text-[#191F28]">
                            {formatHourlyRate(b.totalPrice)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2.5 py-1 text-[11px] font-black rounded-lg ${status.bg} ${status.text}`}>{status.label}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {b.status === "paid" && (
                              <button
                                onClick={() => handleRefund(b.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F2F4F6] text-[#4E5968] rounded-lg text-[12px] font-black hover:bg-[#E5E8EB] transition-all"
                              >
                                <RotateCcw className="w-3 h-3" /> 환불 처리
                              </button>
                            )}
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
