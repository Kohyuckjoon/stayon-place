import { useState, useEffect, useMemo } from "react";
import { ScrollRestoration } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Search, Users, ShieldOff,
  Megaphone, GripVertical, X, Plus, Mic2, Save, BarChart3, CreditCard,
  Zap, Ban, PartyPopper, TrendingUp, Volume2,
  LayoutDashboard,
} from "lucide-react";
import { db } from "../lib/firebase";
import {
  collection, onSnapshot, doc, setDoc, query, orderBy, updateDoc, arrayUnion, Timestamp, serverTimestamp,
} from "firebase/firestore";
import { Reorder } from "framer-motion";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import { TOP_BOOST_MAX_SLOTS, MAIN_BANNER_MAX_SLOTS, isTeamBoosted } from "../lib/teamDisplay";

const PLAN_LABELS: Record<string, { emoji: string; title: string }> = {
  top: { emoji: "🔼", title: "상단 노출" },
  banner: { emoji: "⭐", title: "메인 배너" },
};

const getCategoryStyle = (category: string) => {
  switch (category) {
    case "찬양팀": return { bg: "bg-[#E8F3FF]", text: "text-[#3182F6]" };
    case "음향·조명": return { bg: "bg-[#F5F3FF]", text: "text-[#8B5CF6]" };
    case "찬양사역자": return { bg: "bg-[#FFF0F6]", text: "text-[#F04452]" };
    case "세션": return { bg: "bg-[#E7F9F3]", text: "text-[#00D082]" };
    case "외부 강사": return { bg: "bg-[#FFF7E6]", text: "text-[#F59E0B]" };
    case "레크리에이션 강사": return { bg: "bg-[#E6FFFA]", text: "text-[#14B8A6]" };
    case "기독교 문화 사역": return { bg: "bg-[#EEF2FF]", text: "text-[#6366F1]" };
    default: return { bg: "bg-[#F2F4F6]", text: "text-[#8B95A1]" };
  }
};

// 상단 노출(끌어올리기) 한 줄 — AdminTeams.tsx 상세 모달의 "끌어올리기" 섹션과 같은 로직을,
// 목록 형태로 여러 팀을 한 번에 다루기 위해 로우 단위로 뺐다. 입력값(기간)은 팀마다 따로
// 관리해야 해서 별도 컴포넌트로 분리(각자 useState).
function TopBoostRow({
  team, onBoost, onClear, busy,
}: { team: any; onBoost: (id: string, days: number) => void; onClear: (id: string) => void; busy: boolean }) {
  const [amount, setAmount] = useState("7");
  const [unit, setUnit] = useState<"일" | "개월">("일");
  const boosted = isTeamBoosted(team);
  const style = getCategoryStyle(team.category);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-[#F2F4F6] p-3.5">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#FAFAFB] border border-[#F2F4F6]">
          {team.posterImage ? (
            <img src={team.posterImage} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Mic2 className="w-4 h-4 text-[#D1D6DB]" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-black text-[#191F28] truncate">{team.teamName}</p>
          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${style.bg} ${style.text}`}>
            {team.category}
          </span>
        </div>
      </div>

      {boosted ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#C2410C]">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            {team.boostedUntil.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}까지
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => onClear(team.id)}
            className="px-3 py-1.5 bg-white border border-[#FFEDD5] rounded-lg text-[12px] font-black text-[#C2410C] hover:bg-[#FFF1E6] transition-all disabled:opacity-40"
          >
            해제
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-14 px-2 py-1.5 bg-white border border-[#E5E8EB] rounded-lg text-[12px] font-bold outline-none focus:border-[#EA580C]"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as "일" | "개월")}
            className="px-2 py-1.5 bg-white border border-[#E5E8EB] rounded-lg text-[12px] font-bold outline-none focus:border-[#EA580C]"
          >
            <option value="일">일</option>
            <option value="개월">개월</option>
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => onBoost(team.id, Number(amount) * (unit === "개월" ? 30 : 1))}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#EA580C] text-white rounded-lg text-[12px] font-black hover:bg-[#C2410C] transition-all active:scale-95 disabled:opacity-40"
          >
            <TrendingUp className="w-3.5 h-3.5" /> 끌어올리기
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminTeamAds() {
  const [teams, setTeams] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // "섭외율 높이기" 셀프서비스 신청함 — 실제 결제·활성화는 여기서 자동으로 되지 않고,
  // 관리자가 확인 후 아래 버튼으로 기존 끌어올리기/티커 기능을 그대로 발동시키는 방식.
  const [adminView, setAdminView] = useState<"ticker" | "top" | "requests">("ticker");
  const [boostRequests, setBoostRequests] = useState<any[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [topSearchQuery, setTopSearchQuery] = useState("");
  const [topBoostBusyId, setTopBoostBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubTeams = onSnapshot(collection(db, "ministryTeams"), (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubVenues = onSnapshot(collection(db, "venues"), (snap) => setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setSuspendedCount(snap.docs.filter((d) => d.data().status === "suspended").length);
    });
    const unsubSettings = onSnapshot(doc(db, "settings", "teamTicker"), (snap) => {
      const ids = snap.exists() ? (snap.data().teamIds || []) : [];
      setSelectedIds(ids);
      setSavedIds(ids);
    });
    const unsubRequests = onSnapshot(
      query(collection(db, "teamBoostRequests"), orderBy("createdAt", "desc")),
      (snap) => setBoostRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubTeams(); unsubVenues(); unsubBookings(); unsubUsers(); unsubSettings(); unsubRequests(); };
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";
  const approvedTeams = useMemo(() => teams.filter((t) => t.status === "approved"), [teams]);
  const teamsById = useMemo(() => new Map(approvedTeams.map((t) => [t.id, t])), [approvedTeams]);

  const pendingCount = teams.filter((t) => t.status === "pending").length;
  const approvedCount = teams.filter((t) => t.status === "approved").length;
  const rejectedCount = teams.filter((t) => t.status === "rejected").length;

  const poolTeams = useMemo(() => {
    return approvedTeams
      .filter((t) => !selectedIds.includes(t.id))
      .filter((t) => !searchQuery.trim() || (t.teamName || "").toLowerCase().includes(searchQuery.trim().toLowerCase()));
  }, [approvedTeams, selectedIds, searchQuery]);

  const hasChanges = JSON.stringify(selectedIds) !== JSON.stringify(savedIds);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "teamTicker"), { teamIds: selectedIds });
    } catch (error) {
      console.error("광고 티커 설정 저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 이 페이지는 외부 사역팀 전용이라, 합주실·연습실 신청(targetType: "bandroom")은 제외한다.
  // targetType이 없는 옛 데이터는 팀 신청으로 취급한다.
  const teamBoostRequests = boostRequests.filter((r) => r.targetType !== "bandroom");
  const pendingRequests = teamBoostRequests.filter((r) => r.status === "pending");
  const processedRequests = teamBoostRequests.filter((r) => r.status !== "pending");
  const topBoostedCount = approvedTeams.filter(isTeamBoosted).length;
  const bannerSlotCount = savedIds.length;

  // 상단 노출 신청 승인: 기존 관리자 끌어올리기 로직(AdminTeams.tsx)과 동일하게
  // 30일짜리 boostedUntil을 부여한다. 실제 결제 확인은 관리자가 신청 목록을 보고 직접 처리.
  const handleApproveTopRequest = async (request: any) => {
    setProcessingRequestId(request.id);
    try {
      const boostedAt = new Date();
      const boostedUntil = new Date(boostedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, "ministryTeams", request.targetId), {
        boostedAt: Timestamp.fromDate(boostedAt),
        boostedUntil: Timestamp.fromDate(boostedUntil),
      });
      await updateDoc(doc(db, "teamBoostRequests", request.id), { status: "done", processedAt: serverTimestamp() });
    } catch (error) {
      console.error("상단 노출 승인 실패:", error);
      alert("승인 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 메인 배너 신청 승인: 이미 있는 티커 설정(settings/teamTicker)에 팀을 추가한다.
  const handleApproveBannerRequest = async (request: any) => {
    setProcessingRequestId(request.id);
    try {
      await setDoc(doc(db, "settings", "teamTicker"), { teamIds: arrayUnion(request.targetId) }, { merge: true });
      await updateDoc(doc(db, "teamBoostRequests", request.id), { status: "done", processedAt: serverTimestamp() });
    } catch (error) {
      console.error("메인 배너 승인 실패:", error);
      alert("승인 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCancelRequest = async (request: any) => {
    if (!window.confirm("이 신청을 취소 처리할까요?")) return;
    setProcessingRequestId(request.id);
    try {
      await updateDoc(doc(db, "teamBoostRequests", request.id), { status: "cancelled", processedAt: serverTimestamp() });
    } catch (error) {
      console.error("신청 취소 실패:", error);
      alert("취소 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingRequestId(null);
    }
  };

  // 상단 노출(끌어올리기) 직접 부여/해제 — AdminTeams.tsx의 handleSetBoost/handleClearBoost와 동일한 로직.
  const handleSetTopBoost = async (id: string, days: number) => {
    if (!days || days <= 0) return;
    setTopBoostBusyId(id);
    try {
      const boostedAt = new Date();
      const boostedUntil = new Date(boostedAt.getTime() + days * 24 * 60 * 60 * 1000);
      await updateDoc(doc(db, "ministryTeams", id), {
        boostedAt: Timestamp.fromDate(boostedAt),
        boostedUntil: Timestamp.fromDate(boostedUntil),
      });
    } catch (error) {
      console.error("끌어올리기 설정 실패:", error);
      alert("끌어올리기 설정 중 오류가 발생했습니다.");
    } finally {
      setTopBoostBusyId(null);
    }
  };

  const handleClearTopBoost = async (id: string) => {
    setTopBoostBusyId(id);
    try {
      await updateDoc(doc(db, "ministryTeams", id), { boostedAt: null, boostedUntil: null });
    } catch (error) {
      console.error("끌어올리기 해제 실패:", error);
      alert("끌어올리기 해제 중 오류가 발생했습니다.");
    } finally {
      setTopBoostBusyId(null);
    }
  };

  const topBoostListTeams = useMemo(() => {
    return approvedTeams
      .filter((t) => !topSearchQuery.trim() || (t.teamName || "").toLowerCase().includes(topSearchQuery.trim().toLowerCase()))
      .sort((a, b) => Number(isTeamBoosted(b)) - Number(isTeamBoosted(a)));
  }, [approvedTeams, topSearchQuery]);

  return (
    <AdminSidebarLayout
      brandSubtitle="외부 사역팀 관리자"
      sections={[
        {
          label: "개요",
          items: [
            { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin/dashboard" },
          ],
        },
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
            { id: "t_ads", label: "광고 설정", count: pendingRequests.length, icon: Megaphone, accentColor: "#F59E0B" },
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
            { id: "sc_requests", label: "시공 문의 목록", icon: Volume2, href: "/admin/sound-construction" },
          ],
        },
      ]}
      activeId="t_ads"
      onSelect={() => { /* 이 페이지엔 로컬 탭이 없음 */ }}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />

        <main className="max-w-[1100px] px-6 md:px-10 py-6 md:py-8">
          <div className="flex items-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => setAdminView("ticker")}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-black transition-all ${adminView === "ticker" ? "bg-[#191F28] text-white" : "bg-white text-[#8B95A1] border border-[#E5E8EB]"
                }`}
            >
              티커 노출
            </button>
            <button
              type="button"
              onClick={() => setAdminView("top")}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-black transition-all ${adminView === "top" ? "bg-[#191F28] text-white" : "bg-white text-[#8B95A1] border border-[#E5E8EB]"
                }`}
            >
              상단 노출
            </button>
            <button
              type="button"
              onClick={() => setAdminView("requests")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-black transition-all ${adminView === "requests" ? "bg-[#191F28] text-white" : "bg-white text-[#8B95A1] border border-[#E5E8EB]"
                }`}
            >
              신청 현황
              {pendingRequests.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${adminView === "requests" ? "bg-white/20" : "bg-[#FFF7E6] text-[#F59E0B]"}`}>
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>

          {adminView === "ticker" && (
          <>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-[24px] font-black text-[#191F28] mb-1">광고 설정</h1>
              <p className="text-[14px] font-medium text-[#8B95A1]">
                여기서 고른 팀들이 /teams 상단의 가로 티커에 이 순서로 계속 흐르며 노출됩니다. 아무것도 고르지 않으면 끌어올리기 팀 우선 + 나머지 무작위로 자동 노출됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="shrink-0 flex items-center gap-2 px-5 py-3 bg-[#3182F6] text-white rounded-2xl font-black text-[14px] shadow-md shadow-[#3182F6]/20 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            >
              <Save className="w-4 h-4" /> {saving ? "저장 중..." : hasChanges ? "저장" : "저장됨"}
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <section className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5">
              <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest mb-3">
                선택된 팀 (노출 순서, 드래그로 변경) · {selectedIds.length}개
              </h3>
              {selectedIds.length === 0 ? (
                <div className="py-12 text-center text-[#ADB5BD] font-bold text-[13px]">
                  아직 고른 팀이 없어요. 오른쪽 목록에서 추가해보세요.
                </div>
              ) : (
                <Reorder.Group axis="y" values={selectedIds} onReorder={setSelectedIds} className="flex flex-col gap-2">
                  {selectedIds.map((id) => {
                    const team = teamsById.get(id);
                    if (!team) return null;
                    const style = getCategoryStyle(team.category);
                    return (
                      <Reorder.Item
                        key={id}
                        value={id}
                        className="flex items-center gap-3 bg-[#FAFAFB] rounded-2xl border border-[#F2F4F6] p-2.5 cursor-grab active:cursor-grabbing"
                      >
                        <GripVertical className="w-4 h-4 text-[#ADB5BD] shrink-0" />
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-white border border-[#F2F4F6]">
                          {team.posterImage ? (
                            <img src={team.posterImage} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Mic2 className="w-4 h-4 text-[#D1D6DB]" /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-black text-[#191F28] truncate">{team.teamName}</p>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${style.bg} ${style.text}`}>
                            {team.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedIds((prev) => prev.filter((x) => x !== id))}
                          className="p-1.5 rounded-full hover:bg-[#FFF0F0] text-[#8B95A1] hover:text-[#F04452] transition-all shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              )}
            </section>

            <section className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5">
              <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest mb-3">전체 승인된 팀</h3>
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="팀명으로 검색"
                  className="w-full pl-10 pr-3 py-2.5 bg-[#FAFAFB] border border-[#E5E8EB] rounded-xl text-[13px] font-bold focus:border-[#3182F6] outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto">
                {poolTeams.length === 0 ? (
                  <div className="py-12 text-center text-[#ADB5BD] font-bold text-[13px]">더 추가할 팀이 없어요.</div>
                ) : (
                  poolTeams.map((team) => {
                    const style = getCategoryStyle(team.category);
                    return (
                      <div key={team.id} className="flex items-center gap-3 rounded-2xl border border-[#F2F4F6] p-2.5">
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-[#FAFAFB] border border-[#F2F4F6]">
                          {team.posterImage ? (
                            <img src={team.posterImage} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Mic2 className="w-4 h-4 text-[#D1D6DB]" /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-black text-[#191F28] truncate">{team.teamName}</p>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${style.bg} ${style.text}`}>
                            {team.category}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedIds((prev) => [...prev, team.id])}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black border border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6] hover:text-[#3182F6] transition-all"
                        >
                          <Plus className="w-3 h-3" /> 추가
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
          </>
          )}

          {adminView === "top" && (
          <>
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h1 className="text-[24px] font-black text-[#191F28] mb-1">상단 노출</h1>
              <p className="text-[14px] font-medium text-[#8B95A1] break-keep">
                기간을 정해 끌어올리면 /teams 목록 최상단에 고정되고 "🔥 추천" 배지가 붙어요.
              </p>
            </div>
            <span className="px-3 py-1.5 rounded-full text-[12px] font-black bg-[#FFF7ED] text-[#C2410C]">
              현재 {topBoostedCount} / {TOP_BOOST_MAX_SLOTS} 노출 중
            </span>
          </div>

          <div className="relative mb-5 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
            <input
              type="text"
              value={topSearchQuery}
              onChange={(e) => setTopSearchQuery(e.target.value)}
              placeholder="팀명으로 검색"
              className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold focus:border-[#3182F6] outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            {topBoostListTeams.length === 0 ? (
              <div className="py-12 text-center text-[#ADB5BD] font-bold text-[13px] bg-white rounded-[24px] border border-[#F2F4F6]">검색 결과가 없어요.</div>
            ) : (
              topBoostListTeams.map((team) => (
                <TopBoostRow
                  key={team.id}
                  team={team}
                  busy={topBoostBusyId === team.id}
                  onBoost={handleSetTopBoost}
                  onClear={handleClearTopBoost}
                />
              ))
            )}
          </div>
          </>
          )}

          {adminView === "requests" && (
          <>
          <div className="mb-6">
            <h1 className="text-[24px] font-black text-[#191F28] mb-1">섭외율 높이기 신청 현황</h1>
            <p className="text-[14px] font-medium text-[#8B95A1]">
              사용자가 /teams/boost에서 접수한 신청이에요. 결제 확인 후 아래 버튼으로 승인하면, 기존 끌어올리기·티커 기능이 그대로 적용돼요.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-[#F2F4F6] p-4 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-black text-[#8B95A1]">🔼 상단 노출 슬롯</p>
                <p className="text-[20px] font-black">{topBoostedCount} / {TOP_BOOST_MAX_SLOTS}</p>
              </div>
              {topBoostedCount >= TOP_BOOST_MAX_SLOTS && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#FFF0F0] text-[#F04452]">슬롯 마감</span>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-[#F2F4F6] p-4 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-black text-[#8B95A1]">⭐ 메인 배너 슬롯</p>
                <p className="text-[20px] font-black">{bannerSlotCount} / {MAIN_BANNER_MAX_SLOTS}</p>
              </div>
              {bannerSlotCount >= MAIN_BANNER_MAX_SLOTS && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-[#FFF0F0] text-[#F04452]">슬롯 마감</span>
              )}
            </div>
          </div>

          <section className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 mb-5">
            <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest mb-3">대기 중 · {pendingRequests.length}건</h3>
            {pendingRequests.length === 0 ? (
              <div className="py-12 text-center text-[#ADB5BD] font-bold text-[13px]">대기 중인 신청이 없어요.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingRequests.map((r) => {
                  const planInfo = PLAN_LABELS[r.plan] || { emoji: "🚀", title: r.plan };
                  const busy = processingRequestId === r.id;
                  return (
                    <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-[#F2F4F6] p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-[#FFF7E6] text-[#F59E0B]">
                            {planInfo.emoji} {planInfo.title}
                          </span>
                          <p className="text-[14px] font-black text-[#191F28] truncate">{r.targetName}</p>
                        </div>
                        <p className="text-[12px] font-bold text-[#8B95A1]">
                          {r.applicantName} · {r.applicantContact} · {r.applicantEmail}
                        </p>
                        {r.createdAt?.toDate && (
                          <p className="text-[11px] font-bold text-[#ADB5BD] mt-0.5">
                            {r.createdAt.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} 신청
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => (r.plan === "banner" ? handleApproveBannerRequest(r) : handleApproveTopRequest(r))}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-black bg-[#191F28] text-white disabled:opacity-40 transition-all active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5" /> {r.plan === "banner" ? "메인 배너에 추가" : "30일 끌어올리기 적용"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleCancelRequest(r)}
                          className="p-2 rounded-xl border border-[#E5E8EB] text-[#8B95A1] hover:text-[#F04452] hover:border-[#F04452] transition-all disabled:opacity-40"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {processedRequests.length > 0 && (
            <section className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5">
              <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest mb-3">처리 완료 · {processedRequests.length}건</h3>
              <div className="flex flex-col gap-2">
                {processedRequests.map((r) => {
                  const planInfo = PLAN_LABELS[r.plan] || { emoji: "🚀", title: r.plan };
                  return (
                    <div key={r.id} className="flex items-center gap-3 rounded-xl p-3 text-[13px]">
                      {r.status === "done" ? (
                        <PartyPopper className="w-4 h-4 text-[#00D082] shrink-0" />
                      ) : (
                        <Ban className="w-4 h-4 text-[#ADB5BD] shrink-0" />
                      )}
                      <span className="font-bold text-[#8B95A1] truncate flex-1">
                        {planInfo.emoji} {planInfo.title} · {r.targetName} · {r.applicantName}
                      </span>
                      <span className={`font-black text-[11px] shrink-0 ${r.status === "done" ? "text-[#00D082]" : "text-[#ADB5BD]"}`}>
                        {r.status === "done" ? "승인 완료" : "취소됨"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          </>
          )}
        </main>
      </div>
    </AdminSidebarLayout>
  );
}
