import { useState, useEffect, useMemo } from "react";
import { ScrollRestoration } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Search, Users, ShieldOff,
  BarChart3, Megaphone, CreditCard, Ban, Volume2, Phone, MapPin,
  Lightbulb, Church, Check, RotateCcw,
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";

export function AdminSoundConstruction() {
  const [requests, setRequests] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubRequests = onSnapshot(collection(db, "soundConstructionRequests"), (snap) => {
      setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    const unsubTeams = onSnapshot(collection(db, "ministryTeams"), (snap) => setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubVenues = onSnapshot(collection(db, "venues"), (snap) => setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setSuspendedCount(snap.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => { unsubRequests(); unsubTeams(); unsubVenues(); unsubBookings(); unsubUsers(); };
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  const pendingCount = teams.filter((t) => t.status === "pending").length;
  const approvedCount = teams.filter((t) => t.status === "approved").length;
  const rejectedCount = teams.filter((t) => t.status === "rejected").length;

  const scPendingCount = requests.filter((r) => r.status === "pending").length;

  const rows = useMemo(() => {
    const q = searchQuery.trim();
    return requests
      .filter((r) => !q || (r.churchName || "").includes(q) || (r.applicantName || "").includes(q))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [requests, searchQuery]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, "soundConstructionRequests", id), {
        status: currentStatus === "done" ? "pending" : "done",
      });
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminSidebarLayout
      brandSubtitle="음향 시공 관리"
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
        {
          label: "음향 시공 관리",
          items: [
            { id: "sc_requests", label: "시공 문의 목록", count: scPendingCount, icon: Volume2, accentColor: "#FF9500", href: "/admin/sound-construction" },
          ],
        },
      ]}
      activeId="sc_requests"
      onSelect={() => { /* 이 페이지엔 로컬 탭이 없음 */ }}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />

        <main className="max-w-[1100px] px-6 md:px-10 py-6 md:py-8">
          <div className="mb-6">
            <h1 className="text-[24px] font-black text-[#191F28] mb-1">음향 시공 문의 목록</h1>
            <p className="text-[14px] font-medium text-[#8B95A1]">/sound-register를 통해 들어온 견적 신청을 확인하세요.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-widest mb-1.5">전체 신청</p>
              <p className="text-[24px] font-black text-[#191F28]">{requests.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#FF9500] uppercase tracking-widest mb-1.5">대기중</p>
              <p className="text-[24px] font-black text-[#191F28]">{scPendingCount}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#00D082] uppercase tracking-widest mb-1.5">완료</p>
              <p className="text-[24px] font-black text-[#191F28]">{requests.filter((r) => r.status === "done").length}</p>
            </div>
          </div>

          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="교회 이름, 신청자명으로 검색"
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#E5E8EB] rounded-2xl text-[14px] font-bold focus:border-[#3182F6] outline-none transition-all"
            />
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-16 text-[#ADB5BD] font-bold bg-white rounded-[24px] border border-[#F2F4F6]">불러오는 중...</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16 text-[#ADB5BD] font-bold bg-white rounded-[24px] border border-[#F2F4F6]">신청 내역이 없습니다.</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="bg-white p-5 rounded-2xl border border-[#F2F4F6] shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <p className="text-[15px] font-black text-[#191F28]">{r.churchName}</p>
                        <span className="px-2 py-0.5 bg-[#F2F8FF] text-[#3182F6] rounded-full text-[11px] font-black">{r.denomination}</span>
                        {r.lightingStatus && r.lightingStatus !== "조명 시공 받지 않음" && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[#FFF7ED] text-[#EA580C] rounded-full text-[11px] font-black">
                            <Lightbulb className="w-3 h-3" /> 조명 동시
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] font-bold text-[#8B95A1]">
                        {r.createdAt?.toDate?.() ? r.createdAt.toDate().toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"} 신청
                      </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-black ${r.status === "done" ? "bg-[#E7F9F3] text-[#00D082]" : "bg-[#FFF7E6] text-[#FF9500]"}`}>
                      {r.status === "done" ? "완료" : "대기중"}
                    </span>
                  </div>
                  <div className="bg-[#F9FAFB] rounded-xl p-4 space-y-2.5 mb-4">
                    <div className="flex items-start gap-2.5">
                      <Church className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wider mb-0.5">담임목사님</p>
                        <p className="text-[13px] font-bold text-[#4E5968]">{r.pastorName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wider mb-0.5">교회 주소</p>
                        <p className="text-[13px] font-bold text-[#4E5968] break-keep">{r.churchAddress} {r.churchAddressDetail}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Volume2 className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wider mb-0.5">시공 면적</p>
                        <p className="text-[13px] font-bold text-[#4E5968]">{r.areaPyeong}평</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Volume2 className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wider mb-0.5">기존 음향 설치 상태</p>
                        <p className="text-[13px] font-bold text-[#4E5968]">{r.existingSoundStatus || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Lightbulb className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wider mb-0.5">조명 설치 상태</p>
                        <p className="text-[13px] font-bold text-[#4E5968]">{r.lightingStatus || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Phone className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wider mb-0.5">신청자 연락처</p>
                        <p className="text-[13px] font-bold text-[#4E5968]">{r.applicantName} · {r.applicantContact}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(r.id, r.status)}
                    disabled={updatingId === r.id}
                    className={`w-full py-3 rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 ${r.status === "done" ? "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]" : "bg-[#3182F6] text-white hover:bg-[#1B64DA]"}`}
                  >
                    {r.status === "done" ? (
                      <><RotateCcw className="w-3.5 h-3.5" /> 대기중으로 되돌리기</>
                    ) : (
                      <><Check className="w-3.5 h-3.5" /> 완료 처리</>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </AdminSidebarLayout>
  );
}
