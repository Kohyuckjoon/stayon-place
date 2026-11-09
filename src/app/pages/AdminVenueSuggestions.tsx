import { useState, useEffect } from "react";
import { ScrollRestoration } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Users, ShieldOff, Megaphone, CreditCard, Volume2,
  LayoutDashboard, ClipboardList, MapPin, Phone, Trash2, Check, BarChart3, MessageSquareText,
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, orderBy, query } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";

export function AdminVenueSuggestions() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "venueSuggestions"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setSuggestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    const unsubVenues = onSnapshot(collection(db, "venues"), (snap) => setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubTeams = onSnapshot(collection(db, "ministryTeams"), (snap) => setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setSuspendedCount(snap.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => { unsub(); unsubVenues(); unsubBookings(); unsubTeams(); unsubUsers(); };
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";
  const newCount = suggestions.filter((s) => s.status !== "reviewed").length;

  const toggleReviewed = async (s: any) => {
    try {
      await updateDoc(doc(db, "venueSuggestions", s.id), { status: s.status === "reviewed" ? "new" : "reviewed" });
    } catch (error) {
      console.error("상태 변경 실패:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 추천 내용을 삭제할까요?")) return;
    try {
      await deleteDoc(doc(db, "venueSuggestions", id));
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <AdminSidebarLayout
      brandSubtitle="장소 추천 제보 관리자"
      sections={[
        {
          label: "개요",
          items: [
            { id: "dashboard", label: "대시보드", icon: LayoutDashboard, href: "/admin/dashboard" },
            { id: "pre_visit_checklists", label: "사전답사 체크리스트", icon: ClipboardList, href: "/admin/checklists" },
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
            { id: "venue_suggestions", label: "장소 추천 제보", count: newCount, icon: Megaphone, accentColor: "#F2994A", href: "/admin/venue-suggestions" },
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
            { id: "t_pending", label: "검토 대기", count: teams.filter((t) => t.status === "pending").length, icon: Clock, accentColor: "#FF9500", href: "/admin/teams?tab=pending" },
            { id: "t_inquiries", label: "문의 현황", icon: BarChart3, href: "/admin/team-inquiries" },
            { id: "t_ads", label: "광고 설정", icon: Megaphone, href: "/admin/team-ads" },
          ],
        },
        {
          label: "합주실 관리",
          items: [
            { id: "r_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/band-rooms?tab=pending" },
            { id: "r_bookings", label: "예약 관리", icon: CreditCard, href: "/admin/band-room-bookings" },
          ],
        },
        {
          label: "음향 시공 관리",
          items: [
            { id: "sc_requests", label: "시공 문의 목록", icon: Volume2, href: "/admin/sound-construction" },
          ],
        },
        {
          label: "영업 도구",
          items: [
            { id: "message_templates", label: "문자 템플릿", icon: MessageSquareText, badge: "NEW", href: "/admin/message-templates" },
          ],
        },
      ]}
      activeId="venue_suggestions"
      onSelect={() => { /* 이 페이지엔 로컬 탭이 없음 */ }}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />

        <main className="max-w-[900px] px-6 md:px-10 py-6 md:py-8">
          <div className="mb-6">
            <h1 className="text-[24px] font-black text-[#191F28] mb-1">장소 추천 제보</h1>
            <p className="text-[14px] font-medium text-[#8B95A1]">사용자가 사전답사 체크리스트에서 "장소 추천하기"로 제보한 장소 목록입니다. 로그인 없이도 제출할 수 있어요.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6 max-w-sm">
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-widest mb-1.5">전체</p>
              <p className="text-[24px] font-black text-[#191F28]">{suggestions.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-[12px] font-black text-[#FF9500] uppercase tracking-widest mb-1.5">미확인</p>
              <p className="text-[24px] font-black text-[#191F28]">{newCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] divide-y divide-[#F2F4F6] overflow-hidden">
            {loading ? (
              <div className="text-center py-16 text-[#ADB5BD] font-bold">불러오는 중...</div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-16 text-[#ADB5BD] font-bold">아직 제보된 장소가 없어요.</div>
            ) : (
              suggestions.map((s) => (
                <div key={s.id} className="p-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[15px] font-black text-[#191F28]">{s.venueName || "이름 없음"}</p>
                      {s.status === "reviewed" ? (
                        <span className="px-2 py-0.5 bg-[#E7F9F3] text-[#00D082] rounded-md text-[11px] font-black shrink-0">확인됨</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-[#FFF7E6] text-[#FF9500] rounded-md text-[11px] font-black shrink-0">미확인</span>
                      )}
                    </div>
                    {s.location && (
                      <p className="text-[13px] font-bold text-[#6B7684] flex items-center gap-1"><MapPin className="w-3.5 h-3.5 shrink-0" /> {s.location}</p>
                    )}
                    {s.contact && (
                      <p className="text-[13px] font-bold text-[#6B7684] flex items-center gap-1"><Phone className="w-3.5 h-3.5 shrink-0" /> {s.contact}</p>
                    )}
                    <p className="text-[11px] font-bold text-[#ADB5BD] mt-1.5">
                      {s.createdAt?.toDate?.() ? s.createdAt.toDate().toLocaleString("ko-KR") : "-"}
                      {s.suggestedByEmail ? ` · ${s.suggestedByEmail}` : " · 비로그인 제보"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleReviewed(s)}
                      className={`p-2.5 rounded-xl active:scale-90 transition-all ${s.status === "reviewed" ? "bg-[#F2F4F6] text-[#8B95A1]" : "bg-[#E7F9F3] text-[#00D082]"}`}
                      title="확인 처리"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-2.5 bg-[#FFF0F0] text-[#F04452] rounded-xl active:scale-90 transition-all" title="삭제">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </AdminSidebarLayout>
  );
}
