import { useEffect, useState } from "react";
import { ScrollRestoration } from "react-router-dom";
import {
  Users, Clock, CheckCircle, XCircle, Calendar, ClipboardCheck, CalendarCheck,
  CreditCard, Ban, BarChart3, Megaphone, Volume2, ShieldOff, MapPinned,
  Eye, UserPlus, Link2, MessageCircle, Activity, LayoutDashboard, RefreshCw, MessageSquareText,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { db, functions } from "../lib/firebase";
import {
  collection, query, onSnapshot, orderBy, limit, getCountFromServer, where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";

const StatCard = ({ title, value, sub, icon: Icon, colorClass }: any) => (
  <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-[0_4px_16px_rgb(0,0,0,0.03)] flex items-center justify-between gap-3">
    <div className="min-w-0">
      <p className="text-[12px] md:text-[13px] font-bold text-[#8B95A1] mb-0.5 md:mb-1 truncate">{title}</p>
      <p className="text-[20px] md:text-[24px] font-black text-[#191F28] leading-tight">{value}</p>
      {sub && <p className="text-[11px] font-bold text-[#ADB5BD] mt-0.5">{sub}</p>}
    </div>
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 ${colorClass}`}>
      <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
    </div>
  </div>
);

// "YYYY-MM-DD" 로컬 날짜 문자열. 관리자가 한국에서 접속한다는 전제로 브라우저
// 로컬 시간을 그대로 쓴다 (백엔드 siteStats 문서 id도 KST 기준으로 똑같이 만듦).
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=일 ... 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return monday;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// start~end(둘 다 포함) 사이 날짜 문자열 배열
function dateRange(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    out.push(fmtDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function AdminAnalytics() {
  const [siteStatsDaily, setSiteStatsDaily] = useState<Record<string, any>>({});
  const [siteTotals, setSiteTotals] = useState<any>({});
  const [referralStats, setReferralStats] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [depositPaidCount, setDepositPaidCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "siteStats"), (snap) => {
      const daily: Record<string, any> = {};
      let totals: any = {};
      snap.docs.forEach((d) => {
        if (d.id === "_totals") totals = d.data();
        else daily[d.id] = d.data();
      });
      setSiteStatsDaily(daily);
      setSiteTotals(totals);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "referralStats"), (snap) => {
      setReferralStats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "activityLog"), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setActivityLog(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // 예약/결제완료는 건수가 정확해야 해서(이 기능을 켜기 전 과거 데이터도 다 포함),
  // 매번 실시간 구독하는 대신 집계 전용 쿼리(getCountFromServer)로 필요할 때만 받아온다.
  // 회원수는 Firestore users 컬렉션 문서 수 대신, /admin/users와 똑같이 Firebase
  // Authentication을 직접 세는 adminListUsers를 쓴다 - 가입 과정에서 Firestore 문서
  // 생성이 실패한 계정도 있어서(AdminUsers.tsx 주석 참고), 두 화면 숫자가 어긋났었다.
  const loadCounts = async () => {
    setCountsLoading(true);
    try {
      const [bookingSnap, depositSnap, userResult] = await Promise.all([
        getCountFromServer(collection(db, "bookings")),
        getCountFromServer(query(collection(db, "bookings"), where("status", "==", "deposit_paid"))),
        httpsCallable(functions, "adminListUsers")() as Promise<any>,
      ]);
      setBookingCount(bookingSnap.data().count);
      setDepositPaidCount(depositSnap.data().count);
      setUserCount((userResult.data?.users || []).length);
    } catch (error) {
      console.error("집계 건수 조회 실패:", error);
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    loadCounts();
  }, []);

  const now = new Date();
  const today = fmtDate(now);
  const weekDates = dateRange(startOfWeek(now), now);
  const monthDates = dateRange(startOfMonth(now), now);
  const last30Dates = dateRange(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29), now);

  const sumVisitors = (dates: string[]) =>
    dates.reduce((sum, d) => sum + (siteStatsDaily[d]?.visitorCount || 0), 0);

  const todayVisitors = siteStatsDaily[today]?.visitorCount || 0;
  const weekVisitors = sumVisitors(weekDates);
  const monthVisitors = sumVisitors(monthDates);
  const totalVisitors = siteTotals.visitorCount || 0;

  const todayKakaoClicks = siteStatsDaily[today]?.kakaoClickCount || 0;
  const totalKakaoClicks = siteTotals.kakaoClickCount || 0;

  const referralVisitTotal = referralStats.reduce((sum, r) => sum + (r.visitCount || 0), 0);
  const referralRegistrationTotal = referralStats.reduce((sum, r) => sum + (r.registrationCount || 0), 0);

  const chartData = last30Dates.map((d) => ({
    date: d.slice(5), // "MM-DD"
    방문자: siteStatsDaily[d]?.visitorCount || 0,
  }));

  const fmtTime = (ts: any) => {
    if (!ts?.toDate) return "";
    const d: Date = ts.toDate();
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <AdminSidebarLayout
      brandSubtitle="시스템 대시보드"
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
            { id: "suspended", label: "차단된 회원", icon: ShieldOff, accentColor: "#F04452", href: "/admin/users?tab=suspended" },
          ],
        },
        {
          label: "장소 등록 관리",
          items: [
            { id: "v_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/venues?tab=pending" },
            { id: "v_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/venues?tab=approved" },
            { id: "v_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/venues?tab=rejected" },
            { id: "v_schedule", label: "장소별 일정관리", icon: Calendar, href: "/admin/venues?tab=schedule" },
            { id: "v_blockrequests", label: "차단 신청 승인", icon: Ban, accentColor: "#F04452", href: "/admin/venues?tab=blockRequests" },
            { id: "venue_suggestions", label: "장소 추천 제보", icon: Megaphone, accentColor: "#F2994A", href: "/admin/venue-suggestions" },
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
            { id: "bk_pending", label: "예약 대기", icon: ClipboardCheck, accentColor: "#FF9500", href: "/admin/bookings?tab=pending" },
            { id: "bk_confirmed", label: "답사 승인", icon: CalendarCheck, href: "/admin/bookings?tab=confirmed" },
            { id: "bk_inspection_confirmed", label: "답사 확정", icon: MapPinned, href: "/admin/bookings?tab=inspection_confirmed" },
            { id: "bk_approved", label: "결제 대기", icon: CreditCard, href: "/admin/bookings?tab=approved" },
            { id: "bk_deposit_paid", label: "완료", icon: CheckCircle, href: "/admin/bookings?tab=deposit_paid" },
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
      activeId="dashboard"
      onSelect={() => {}}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />
        <main className="max-w-[1300px] px-4 py-4 md:px-10 md:py-8">
          <div className="flex items-start justify-between gap-3 mb-5 md:mb-6">
            <div>
              <h1 className="text-[19px] md:text-[26px] font-black tracking-tight leading-tight mb-1">시스템 대시보드</h1>
              <p className="text-[#4E5968] font-bold text-[12px] md:text-[14px]">사이트 전체 방문·가입·예약 현황을 한눈에 확인하세요.</p>
            </div>
            <button
              onClick={loadCounts}
              disabled={countsLoading}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-100 rounded-xl text-[12px] md:text-[13px] font-black text-[#4E5968] shadow-sm hover:bg-[#F2F4F6] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${countsLoading ? "animate-spin" : ""}`} /> 새로고침
            </button>
          </div>

          {/* 방문자 */}
          <h3 className="text-[13px] font-black text-[#ADB5BD] mb-2.5 ml-1 tracking-widest uppercase">방문자</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 mb-6">
            <StatCard title="오늘 방문자" value={`${todayVisitors}명`} icon={Eye} colorClass="bg-[#3182F6]" />
            <StatCard title="이번 주 방문자" value={`${weekVisitors}명`} sub="월요일~오늘" icon={Eye} colorClass="bg-[#3182F6]" />
            <StatCard title="이번 달 방문자" value={`${monthVisitors}명`} sub="1일~오늘" icon={Eye} colorClass="bg-[#3182F6]" />
            <StatCard title="누적 방문자" value={`${totalVisitors}명`} icon={Eye} colorClass="bg-[#191F28]" />
          </div>

          {/* 트래픽 그래프 */}
          <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_4px_16px_rgb(0,0,0,0.03)] p-4 md:p-6 mb-6">
            <h4 className="text-[13px] md:text-[14px] font-black text-[#191F28] mb-4">최근 30일 방문자 추이</h4>
            <div className="h-[220px] md:h-[280px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitorFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3182F6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3182F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#ADB5BD" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#ADB5BD" }} axisLine={false} tickLine={false} allowDecimals={false} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #F2F4F6", fontSize: 12, fontWeight: 700 }}
                    labelStyle={{ color: "#191F28", fontWeight: 900 }}
                  />
                  <Area type="monotone" dataKey="방문자" stroke="#3182F6" strokeWidth={2.5} fill="url(#visitorFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 운영 지표 */}
          <h3 className="text-[13px] font-black text-[#ADB5BD] mb-2.5 ml-1 tracking-widest uppercase">운영 지표</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3 mb-6">
            <StatCard title="예약 건수" value={bookingCount === null ? "..." : `${bookingCount}건`} icon={ClipboardCheck} colorClass="bg-[#FF9500]" />
            <StatCard title="결제 완료(입금확인)" value={depositPaidCount === null ? "..." : `${depositPaidCount}건`} icon={CreditCard} colorClass="bg-[#00D082]" />
            <StatCard title="누적 전체 회원수" value={userCount === null ? "..." : `${userCount}명`} icon={UserPlus} colorClass="bg-[#191F28]" />
            <StatCard title="카카오 1:1 문의 클릭" value={`${totalKakaoClicks}회`} sub={`오늘 ${todayKakaoClicks}회`} icon={MessageCircle} colorClass="bg-[#FEE500]" />
          </div>

          {/* 추천 링크 */}
          <h3 className="text-[13px] font-black text-[#ADB5BD] mb-2.5 ml-1 tracking-widest uppercase">추천 링크 유입</h3>
          <div className="grid grid-cols-2 gap-2.5 md:gap-3 mb-3">
            <StatCard title="링크 통한 방문자" value={`${referralVisitTotal}명`} icon={Link2} colorClass="bg-[#3182F6]" />
            <StatCard title="링크 통한 가입" value={`${referralRegistrationTotal}명`} icon={UserPlus} colorClass="bg-[#00D082]" />
          </div>
          {referralStats.length > 0 && (
            <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_4px_16px_rgb(0,0,0,0.03)] p-4 md:p-6 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {referralStats
                  .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
                  .map((r) => (
                    <div key={r.id} className="bg-[#FAFAFB] rounded-2xl p-4 border border-[#F2F4F6]">
                      <p className="text-[13px] font-black text-[#191F28] mb-2">
                        {r.label || r.ref}
                        {r.label && <span className="text-[11px] font-bold text-[#ADB5BD] ml-1.5">({r.ref})</span>}
                      </p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div>
                          <p className="text-[11px] font-bold text-[#8B95A1]">유입</p>
                          <p className="text-[16px] font-black text-[#3182F6]">{r.visitCount || 0}명</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#8B95A1]">가입</p>
                          <p className="text-[16px] font-black text-[#00D082]">{r.registrationCount || 0}명</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {referralStats.length === 0 && (
            <div className="bg-white rounded-[20px] border border-dashed border-gray-200 p-6 text-center mb-6">
              <p className="text-[13px] font-bold text-[#ADB5BD]">아직 추천 링크로 들어온 방문이 없습니다.</p>
            </div>
          )}

          {/* 최근 활동 로그 */}
          <h3 className="text-[13px] font-black text-[#ADB5BD] mb-2.5 ml-1 tracking-widest uppercase">최근 활동 로그</h3>
          <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_4px_16px_rgb(0,0,0,0.03)] divide-y divide-gray-50 overflow-hidden">
            {activityLog.length > 0 ? activityLog.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 md:px-6 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-[#F2F8FF] flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4 text-[#3182F6]" />
                </div>
                <p className="flex-1 min-w-0 text-[13px] md:text-[14px] font-bold text-[#191F28] truncate">{a.message}</p>
                <p className="text-[11px] font-bold text-[#ADB5BD] shrink-0">{fmtTime(a.createdAt)}</p>
              </div>
            )) : (
              <div className="py-14 text-center text-[#ADB5BD] font-bold text-[13px]">아직 활동 내역이 없습니다.</div>
            )}
          </div>
        </main>
      </div>
    </AdminSidebarLayout>
  );
}
