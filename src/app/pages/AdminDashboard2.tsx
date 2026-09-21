import { useState, useEffect } from "react";
import { ScrollRestoration, useSearchParams } from "react-router-dom";
import {
  CheckCircle, XCircle, Clock, Eye,
  Search, Building2, Calendar, AlertTriangle,
  User, MapPin, Phone, Info,
  Users, CreditCard, MessageSquare,
  RotateCcw, ChevronRight, Mail, ClipboardCheck,
  CalendarCheck, Trash2, Check, MapPinned, Tent, Receipt, Coins, ShieldOff, BarChart3, Megaphone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, functions } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, orderBy, deleteDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";

// [디자인] 통계 카드 - 스타일
const StatCard = ({ title, value, icon: Icon, colorClass, textColor }: any) => (
  <div className="bg-white px-4 py-3.5 md:px-5 md:py-4 rounded-2xl border border-gray-100 shadow-[0_4px_16px_rgb(0,0,0,0.03)] flex items-center justify-between group transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
    <div>
      <p className="text-[12px] md:text-[13px] font-bold text-[#8B95A1] mb-0.5 md:mb-1">{title}</p>
      <p className={`text-[17px] md:text-[20px] font-black ${textColor || "text-[#191F28]"}`}>{value}</p>
    </div>
    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass} transition-transform group-hover:scale-110`}>
      <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
    </div>
  </div>
);

// [디자인] 정보 행 - 가독성 강화
const InfoRow = ({ label, value, icon: Icon }: any) => (
  <div className="flex items-center gap-3 md:gap-4 p-3.5 md:p-5 bg-[#F9FAFB] rounded-xl md:rounded-2xl border border-gray-50 transition-colors hover:bg-[#F2F4F6]">
    <div className="p-2.5 md:p-3 bg-white rounded-xl shadow-sm text-[#3182F6] shrink-0">
      <Icon className="w-4 h-4 md:w-5 md:h-5" />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-[10px] md:text-[11px] font-black text-[#ADB5BD] uppercase tracking-widest mb-0.5">{label}</span>
      <span className="text-[14px] md:text-[16px] font-black text-[#333D4B] leading-tight break-words">{value || "-"}</span>
    </div>
  </div>
);

type BookingTab = "pending" | "confirmed" | "inspection_confirmed" | "approved" | "deposit_paid" | "cancelled";
const VALID_TABS: BookingTab[] = ["pending", "confirmed", "inspection_confirmed", "approved", "deposit_paid", "cancelled"];

export function AdminDashboard2() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") as BookingTab) ? (searchParams.get("tab") as BookingTab) : "pending";
  const [activeTab, setActiveTabState] = useState<BookingTab>(initialTab);
  const setActiveTab = (tab: BookingTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBookings(bookingData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 사이드바의 "장소 등록 관리" 그룹 배지 표시용 (실제 목록/상세는 /admin/venues에서 관리)
  useEffect(() => {
    const q = query(collection(db, "venues"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVenues(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 사이드바의 "차단된 회원" 배지 표시용 (실제 목록/상세는 /admin/users에서 관리)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setSuspendedCount(snapshot.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => unsubscribe();
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  const handleDeleteBooking = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("이 신청 내역을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
    try {
      await deleteDoc(doc(db, "bookings", id));
      alert("성공적으로 삭제되었습니다.");
      if (selectedBooking?.id === id) setSelectedBooking(null);
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const bookingRef = doc(db, "bookings", id);
      await updateDoc(bookingRef, { status: newStatus });

      const statusMap: any = {
        confirmed: "사전답사 가능 승인",
        approved: "최종 예약 승인 (결제 대기)",
        cancelled: "신청 반려",
        pending: "대기 상태로 복원",
        deposit_paid: "입금 확인 및 완료"
      };

      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");

      await triggerAdminNotification({
        type: 'APPROVE',
        payload: {
          status: statusMap[newStatus] || newStatus,
          venueName: selectedBooking?.venueName || "장소 정보 없음",
          userName: `${selectedBooking?.churchName} (${selectedBooking?.contactName})`
        }
      });

      alert(`상태가 [${statusMap[newStatus]}]로 변경되었습니다.`);
      setSelectedBooking(null);
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  const filteredData = bookings.filter(b => b.status === activeTab && (b.churchName?.includes(searchQuery) || b.contactName?.includes(searchQuery)));
  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const inspectionReadyCount = bookings.filter(b => b.status === "inspection_confirmed").length;
  const approvedCount = bookings.filter(b => b.status === "approved" || b.status === "deposit_paid").length;

  return (
    <AdminSidebarLayout
      brandSubtitle="예약 및 답사 문의 관리자"
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
            { id: "v_pending", label: "검토 대기", count: venues.filter(v => v.status === "pending").length, icon: Clock, accentColor: "#FF9500", href: "/admin/venues?tab=pending" },
            { id: "v_approved", label: "승인 완료", count: venues.filter(v => v.status === "approved").length, icon: CheckCircle, href: "/admin/venues?tab=approved" },
            { id: "v_rejected", label: "반려 / 삭제", count: venues.filter(v => v.status === "rejected").length, icon: XCircle, href: "/admin/venues?tab=rejected" },
            { id: "v_schedule", label: "장소별 일정관리", count: venues.filter(v => v.status === "approved").length, icon: Calendar, href: "/admin/venues?tab=schedule" },
          ],
        },
        {
          label: "국내선교 관리",
          items: [
            { id: "mv_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/mission-venues?tab=pending" },
            { id: "mv_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/mission-venues?tab=approved" },
            { id: "mv_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/mission-venues?tab=rejected" },
            { id: "mv_schedule", label: "장소별 일정관리", icon: Calendar, href: "/admin/mission-venues?tab=schedule" },
          ],
        },
        {
          label: "예약 및 답사 문의",
          items: [
            { id: "pending", label: "예약 대기", count: pendingCount, icon: ClipboardCheck, accentColor: "#FF9500" },
            { id: "confirmed", label: "답사 승인", count: bookings.filter(b => b.status === "confirmed").length, icon: CalendarCheck },
            { id: "inspection_confirmed", label: "답사 확정", count: inspectionReadyCount, icon: MapPinned, accentColor: "#3182F6" },
            { id: "approved", label: "결제 대기", count: bookings.filter(b => b.status === "approved").length, icon: CreditCard },
            { id: "deposit_paid", label: "완료", count: bookings.filter(b => b.status === "deposit_paid").length, icon: CheckCircle },
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
      onSelect={(id) => setActiveTab(id as BookingTab)}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
      <ScrollRestoration />

      <main className="max-w-[1300px] px-4 py-4 md:px-10 md:py-8">
        {/* 모바일 전용 탭 (사이드바가 숨겨지는 좁은 화면) */}
        <div className="flex md:hidden bg-[#E5E8EB] p-1.5 rounded-[18px] w-full mb-4 overflow-x-auto">
          {[
            { id: "pending", label: `대기 ${pendingCount}` },
            { id: "confirmed", label: `승인 ${bookings.filter(b => b.status === "confirmed").length}` },
            { id: "inspection_confirmed", label: `답사확정 ${inspectionReadyCount}` },
            { id: "approved", label: `결제대기 ${bookings.filter(b => b.status === "approved").length}` },
            { id: "deposit_paid", label: `완료 ${bookings.filter(b => b.status === "deposit_paid").length}` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-none px-3.5 py-2 rounded-[14px] text-[12px] font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-4 md:mb-5">
          <h1 className="text-[19px] md:text-[26px] font-black tracking-tight leading-tight mb-1">예약 시스템 관리</h1>
          <p className="text-[#4E5968] font-bold text-[12px] md:text-[14px]">사용자의 답사 확정 및 결제 단계를 제어하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 md:gap-3 mb-4 md:mb-6">
          <StatCard title="검토 대기" value={`${pendingCount}건`} icon={Clock} colorClass="bg-[#FF4545]" textColor="text-[#FF4545]" />
          <StatCard title="답사 확정(긴급)" value={`${inspectionReadyCount}건`} icon={CalendarCheck} colorClass="bg-[#3182F6]" textColor="text-[#3182F6]" />
          <StatCard title="결제 및 완료" value={`${approvedCount}건`} icon={ClipboardCheck} colorClass="bg-[#00D082]" textColor="text-[#00D082]" />
        </div>

        <div className="bg-white rounded-[16px] md:rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.02)] border border-[#F2F4F6] overflow-hidden">
          <div className="px-4 py-3 md:px-5 md:py-4 border-b border-[#F9FAFB] flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-3">
            <div className="flex items-center gap-2 text-[13px] md:text-[14px] font-black shrink-0">
              <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${activeTab === 'inspection_confirmed' ? 'bg-blue-500' : 'bg-gray-400'}`} />
              {activeTab === 'pending' ? '새로 들어온 문의' : activeTab === 'inspection_confirmed' ? '유저가 선택한 답사 일정' : '내역 조회'}
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
              <input
                type="text"
                placeholder="검색어를 입력하세요"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F2F4F6] border-none rounded-xl text-[13px] md:text-[14px] font-medium outline-none focus:ring-2 ring-[#3182F6]/10 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <p className="text-[11px] md:text-[12px] font-bold text-[#8B95A1] shrink-0">
              총 <span className="text-[#3182F6]">{filteredData.length}</span>개의 검색 결과
            </p>
          </div>

          {/* 모바일: 카드 리스트 (테이블은 좁은 화면에서 옆으로 밀려 읽기 힘들어서 아예 다른 레이아웃을 씀) */}
          <div className="md:hidden divide-y divide-gray-50">
            <AnimatePresence>
              {filteredData.length > 0 ? filteredData.map((booking) => (
                <motion.div
                  key={booking.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setSelectedBooking(booking)}
                  className="p-4 active:bg-[#F9FAFB] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F2F4F6] rounded-xl flex items-center justify-center font-black text-[#3182F6] text-[14px] uppercase shrink-0">
                      {booking.churchName?.substring(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-black text-[#191F28] leading-tight truncate">{booking.churchName}</p>
                      <p className="text-[12px] font-bold text-[#8B95A1] truncate">{booking.contactName} · {booking.phone}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#D1D6DB] shrink-0" />
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2.5 pl-[52px]">
                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#4E5968]">
                      <Calendar className="w-3.5 h-3.5 shrink-0" /> {booking.startDate}
                      {booking.inspectionDate && <span className="text-[#3182F6]">· 답사 희망</span>}
                    </div>
                    <button onClick={(e) => handleDeleteBooking(booking.id, e)} className="p-1.5 text-[#D1D6DB] active:text-red-500 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )) : (
                <div className="py-16 text-center text-[#ADB5BD] font-bold text-[13px]">해당하는 신청 내역이 없습니다.</div>
              )}
            </AnimatePresence>
          </div>

          {/* 데스크톱: 기존 테이블 그대로 */}
          <div className="hidden md:block overflow-x-auto scrollbar-hide">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[#F9FAFB] border-b border-gray-50 text-left">
                <tr>
                  <th className="px-5 py-2.5 text-[11px] font-black text-[#8B95A1] uppercase tracking-widest">신청 정보</th>
                  <th className="px-5 py-2.5 text-[11px] font-black text-[#8B95A1] uppercase tracking-widest">행사/답사일</th>
                  <th className="px-5 py-2.5 text-[11px] font-black text-[#8B95A1] uppercase tracking-widest text-center">관리</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {filteredData.length > 0 ? filteredData.map((booking) => (
                    <motion.tr
                      key={booking.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="group hover:bg-[#F9FAFB] transition-all cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#F2F4F6] rounded-xl flex items-center justify-center font-black text-[#3182F6] text-[14px] uppercase shrink-0">
                            {booking.churchName?.substring(0, 1)}
                          </div>
                          <div className="min-w-0 whitespace-nowrap">
                            <p className="text-[14px] font-black text-[#191F28] group-hover:text-[#3182F6] transition-colors leading-tight">{booking.churchName}</p>
                            <p className="text-[12px] font-bold text-[#8B95A1]">{booking.contactName} · {booking.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1 text-[13px] font-bold text-[#4E5968] whitespace-nowrap">
                          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {booking.startDate}</div>
                          {booking.inspectionDate && <div className="flex items-center gap-1.5 text-[#3182F6]"><Clock className="w-3.5 h-3.5" /> 답사 희망함</div>}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={(e) => handleDeleteBooking(booking.id, e)} className="p-2 text-[#E5E8EB] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ChevronRight className="w-5 h-5 text-[#D1D6DB] group-hover:translate-x-1 transition-transform" />
                      </td>
                    </motion.tr>
                  )) : (
                    <tr><td colSpan={4} className="py-20 text-center text-[#ADB5BD] font-bold text-[14px]">해당하는 신청 내역이 없습니다.</td></tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-[#191F28]/60 backdrop-blur-md"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 30 }}
              className="bg-white w-full sm:max-w-xl rounded-t-[28px] sm:rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 sm:p-8 pb-3 sm:pb-4 flex justify-between items-center">
                <div className="flex gap-1.5 sm:gap-2">
                  <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-blue-50 text-[#3182F6] rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest">Management</span>
                  <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-[#F2F4F6] text-[#8B95A1] rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest">{selectedBooking.status}</span>
                </div>
                <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0">
                  <XCircle className="w-6 h-6 sm:w-7 sm:h-7 text-[#D1D6DB]" />
                </button>
              </div>

              <div className="px-5 sm:p-10 sm:pt-4 pb-5 overflow-y-auto space-y-5 sm:space-y-8 custom-scrollbar">
                <div className="bg-[#191F28] p-5 sm:p-7 rounded-[24px] sm:rounded-[32px] text-white shadow-xl flex items-center gap-3.5 sm:gap-5">
                  <div className="p-3 sm:p-4 bg-white/10 rounded-2xl sm:rounded-[20px] backdrop-blur-sm shrink-0">
                    <Tent className="w-6 h-6 sm:w-8 sm:h-8 text-[#3182F6]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-[12px] font-black text-blue-400 uppercase tracking-widest mb-1">Target Venue</p>
                    <h2 className="text-[17px] sm:text-2xl font-black leading-tight break-keep">{selectedBooking.venueName || "장소명 정보 없음"}</h2>
                  </div>
                </div>

                {/* Firebase 'selectedTimeSlot' 데이터 표시를 위한 토스 스타일 카드 추가 */}
                {selectedBooking.selectedTimeSlot && (
                  <section>
                    <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> {/* 수정위치 표시 */}
                      선택한 시간대 옵션
                    </h4>
                    <div className="bg-[#F8FAFF] p-4 sm:p-6 rounded-[20px] sm:rounded-[28px] border border-[#3182F6]/20">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="text-[14px] sm:text-[16px] font-black text-[#191F28]">{selectedBooking.selectedTimeSlot.label}</span>
                        <span className="text-[13px] sm:text-[14px] font-black text-[#3182F6] shrink-0">{Number(selectedBooking.selectedTimeSlot.price).toLocaleString()}원</span>
                      </div>
                      <div className="text-[12px] sm:text-[13px] font-bold text-[#6B7684]">
                        {selectedBooking.selectedTimeSlot.start} ~ {selectedBooking.selectedTimeSlot.end} 운영
                      </div>
                    </div>
                  </section>
                )}

                <section>
                  <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase">예약 및 인원 정보</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <InfoRow icon={Users} label="총 인원" value={`${selectedBooking.additionalAttendees || 0}명`} />
                    <InfoRow icon={Calendar} label="대관 기간" value={`${selectedBooking.startDate} ~ ${selectedBooking.endDate}`} />
                  </div>
                </section>

                <section>
                  <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase">금액 및 결제 상세</h4>
                  <div className="bg-[#F9FAFB] p-4 sm:p-6 rounded-[20px] sm:rounded-[28px] border border-[#E5E8EB] space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[13px] sm:text-[14px] font-bold text-[#6B7684]">총 이용 요금</span>
                      <span className="text-[15px] sm:text-[16px] font-black text-[#191F28]">{Number(selectedBooking.totalPrice || 0).toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center gap-2 pt-3 border-t border-[#E5E8EB]">
                      <span className="text-[13px] sm:text-[14px] font-black text-[#3182F6]">{selectedBooking.depositLabel || "예약금"}</span>
                      <span className="text-[16px] sm:text-[18px] font-black text-[#3182F6]">{Number(selectedBooking.depositPrice || 0).toLocaleString()}원</span>
                    </div>
                  </div>
                </section>

                {selectedBooking.status === 'inspection_confirmed' && (
                  <div className="bg-[#3182F6] p-4 sm:p-6 rounded-[18px] sm:rounded-[24px] text-white shadow-lg shadow-blue-100 flex items-center gap-3 sm:gap-4">
                    <div className="bg-white/20 p-2.5 sm:p-3 rounded-xl shrink-0"><AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
                    <div className="font-bold text-[13px] sm:text-base break-keep">사용자가 답사 일정을 확정했습니다. 답사 후 승인하세요.</div>
                  </div>
                )}

                <section>
                  <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase">신청 교회 정보</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="p-4 sm:p-5 bg-[#F9FAFB] rounded-[18px] sm:rounded-[24px] border border-gray-50">
                      <p className="text-[10px] sm:text-[11px] font-black text-[#ADB5BD] uppercase mb-1">신청 교회</p>
                      <p className="text-[15px] sm:text-[17px] font-black text-[#191F28] break-words">{selectedBooking.churchName}</p>
                    </div>
                    <div className="p-4 sm:p-5 bg-[#F9FAFB] rounded-[18px] sm:rounded-[24px] border border-gray-50">
                      <p className="text-[10px] sm:text-[11px] font-black text-[#ADB5BD] uppercase mb-1">소속 교단</p>
                      <p className="text-[15px] sm:text-[17px] font-black text-[#191F28] break-words">{selectedBooking.denomination || "미지정"}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-2.5 sm:space-y-3">
                  <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase">담당자 및 상세</h4>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                    <InfoRow icon={User} label="담당자 성함" value={selectedBooking.contactName} />
                    <InfoRow icon={Phone} label="담당자 연락처" value={selectedBooking.phone} />
                    <InfoRow icon={Mail} label="이메일" value={selectedBooking.email} />
                    {selectedBooking.specialRequests && <InfoRow icon={MessageSquare} label="요청사항" value={selectedBooking.specialRequests} />}
                  </div>
                </section>

                <section>
                  <h4 className="text-[12px] sm:text-[13px] font-black text-[#ADB5BD] mb-2.5 sm:mb-4 ml-1 tracking-widest uppercase">사전답사 희망 일자</h4>
                  <div className="bg-[#F2F8FF] p-4 sm:p-6 rounded-[20px] sm:rounded-[28px] border border-blue-50">
                    <div className="flex flex-wrap gap-2">
                      {selectedBooking.inspectionDate?.map((date: any, i: number) => (
                        <div key={i} className="px-4 sm:px-5 py-2.5 sm:py-3 bg-white rounded-xl sm:rounded-2xl text-[13px] sm:text-[15px] font-black text-[#3182F6] shadow-sm flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 shrink-0" /> {date}
                        </div>
                      )) || <p className="text-sm font-bold text-[#8B95A1]">희망 날짜 정보가 없습니다.</p>}
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-4 sm:p-8 bg-[#FAFBFC] border-t border-gray-50">
                <div className="flex gap-2.5 sm:gap-3">
                  <button onClick={() => handleDeleteBooking(selectedBooking.id)} className="p-3.5 sm:p-5 bg-white text-[#F04452] border border-[#FEECEE] rounded-[18px] sm:rounded-[24px] font-black hover:bg-red-50 transition-all active:scale-95 shrink-0">
                    <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  {selectedBooking.status === 'pending' && (
                    <>
                      <button onClick={() => handleStatusChange(selectedBooking.id, "cancelled")} className="flex-1 py-3.5 sm:py-5 bg-[#E5E8EB] text-[#6B7684] rounded-[18px] sm:rounded-[24px] font-black text-[13px] sm:text-base hover:bg-gray-300 transition-all">반려</button>
                      <button onClick={() => handleStatusChange(selectedBooking.id, "confirmed")} className="flex-[2] py-3.5 sm:py-5 bg-[#3182F6] text-white rounded-[18px] sm:rounded-[24px] font-black text-[13px] sm:text-base shadow-xl shadow-blue-100 hover:scale-[1.02] transition-all break-keep">답사 가능 승인</button>
                    </>
                  )}

                  {selectedBooking.status === 'inspection_confirmed' && (
                    <button onClick={() => handleStatusChange(selectedBooking.id, "approved")} className="flex-1 py-3.5 sm:py-5 bg-[#191F28] text-white rounded-[18px] sm:rounded-[24px] font-black text-[13px] sm:text-base shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 break-keep">
                      <Check className="w-5 h-5 sm:w-6 sm:h-6 text-[#00D082] shrink-0" /> 실물 답사 완료 및 최종 승인
                    </button>
                  )}

                  {(selectedBooking.status === 'approved' || selectedBooking.status === 'deposit_paid' || selectedBooking.status === 'confirmed') && (
                    <button onClick={() => handleStatusChange(selectedBooking.id, "pending")} className="flex-1 py-3.5 sm:py-5 bg-white border-2 border-[#E5E8EB] text-[#4E5968] rounded-[18px] sm:rounded-[24px] font-black text-[13px] sm:text-base hover:bg-[#F2F4F6] transition-all break-keep">신청 초기화 (대기로 이동)</button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E8EB; border-radius: 10px; }
      `}</style>
      </div>
    </AdminSidebarLayout>
  );
}
