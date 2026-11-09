import { useState, useEffect, useMemo } from "react";
import { Link, ScrollRestoration } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Users, ShieldOff, Megaphone, CreditCard, Volume2,
  LayoutDashboard, BarChart3, Calendar, Ban, ClipboardCheck, CalendarCheck, MapPinned,
  MessageSquareText, ClipboardList, Search, ChevronLeft, ChevronRight, Check, Star, ExternalLink,
} from "lucide-react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import { getVisibleSections, getTotalChecklistItems } from "../lib/preVisitChecklistItems";

type VenueFilter = "all" | "registered" | "unregistered";

const FILTERS: { id: VenueFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "registered", label: "스테이온 장소" },
  { id: "unregistered", label: "스테이온에 없는 장소" },
];

const formatDateTime = (ts: any) => (ts?.toDate?.() ? ts.toDate().toLocaleString("ko-KR") : "-");
const venueLabel = (c: any) => c.venueName?.trim() || "장소 이름 미입력";

function checkedCount(c: any): number {
  return getVisibleSections(!!c.venueId)
    .flatMap((s) => s.items)
    .filter((item) => !!c.items?.[item.id]?.checked).length;
}

function Rating({ value }: { value?: number | null }) {
  if (!value) return <span className="text-[12px] font-bold text-[#ADB5BD]">별점 없음</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-black text-[#F2994A]">
      <Star className="w-3.5 h-3.5 fill-[#F2994A]" /> {value}
    </span>
  );
}

function VenueTypeBadge({ registered }: { registered: boolean }) {
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-black ${registered ? "bg-[#E8F3FF] text-[#3182F6]" : "bg-[#FFF8E8] text-[#F2994A]"}`}>
      {registered ? "스테이온 장소" : "스테이온에 없는 장소"}
    </span>
  );
}

// 체크리스트 작성 화면(ChecklistForm)은 입력 즉시 자동 저장되므로, 관리자가 실수로
// 사용자 내용을 바꾸지 않도록 이 페이지는 읽기만 하고 수정 버튼을 두지 않는다.
function ChecklistDetail({ checklist: c, onBack }: { checklist: any; onBack: () => void }) {
  const registered = !!c.venueId;
  const evaluation = c.evaluation || {};
  const photos: string[] = c.photos || [];
  const hasEvaluation = !!(evaluation.rating || evaluation.pros || evaluation.cons || evaluation.memo);

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-[14px] font-bold text-[#4E5968] hover:text-[#191F28]">
        <ChevronLeft className="w-5 h-5" /> 목록으로
      </button>

      <section className="bg-white rounded-2xl border border-[#F2F4F6] p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <VenueTypeBadge registered={registered} />
          <span className="text-[11px] font-bold text-[#8B95A1]">보기 전용</span>
        </div>
        <h2 className="text-[20px] font-black text-[#191F28] break-keep">{venueLabel(c)}</h2>
        <p className="mt-1 text-[13px] font-bold text-[#6B7684] break-all">{c.ownerEmail || "이메일 없음"}</p>
        <p className="mt-1 text-[12px] font-bold text-[#8B95A1]">
          작성 {formatDateTime(c.createdAt)} · 수정 {formatDateTime(c.updatedAt)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-[13px] font-black text-[#3182F6]">
            체크 {checkedCount(c)} / {getTotalChecklistItems(registered)}
          </span>
          <Rating value={evaluation.rating} />
          {registered && (
            <Link to={`/venue/${c.venueId}`} target="_blank" className="inline-flex items-center gap-1 text-[12px] font-bold text-[#4E5968] hover:text-[#3182F6]">
              장소 상세 보기 <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </section>

      {hasEvaluation && (
        <section className="bg-white rounded-2xl border border-[#F2F4F6] p-5 space-y-3">
          <h3 className="text-[16px] font-black text-[#191F28]">평가</h3>
          {[["장점", evaluation.pros], ["단점", evaluation.cons], ["메모", evaluation.memo]].map(([label, text]) => text && (
            <div key={label}>
              <p className="text-[12px] font-black text-[#8B95A1] mb-0.5">{label}</p>
              <p className="text-[14px] font-semibold text-[#333D4B] whitespace-pre-wrap break-words">{text}</p>
            </div>
          ))}
        </section>
      )}

      {c.checkinOverride?.enabled && (
        <section className="bg-white rounded-2xl border border-[#F2F4F6] p-5">
          <h3 className="text-[16px] font-black text-[#191F28] mb-2">체크인·체크아웃</h3>
          <p className="text-[14px] font-semibold text-[#333D4B]">
            체크인 {c.checkinOverride.checkIn || "-"} / 체크아웃 {c.checkinOverride.checkOut || "-"}
          </p>
        </section>
      )}

      {photos.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#F2F4F6] p-5">
          <h3 className="text-[16px] font-black text-[#191F28] mb-3">사진 {photos.length}장</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-xl overflow-hidden bg-[#F2F4F6]">
                <img src={url} alt="답사 사진" loading="lazy" className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </section>
      )}

      {getVisibleSections(registered).map((section) => (
        <section key={section.title} className="bg-white rounded-2xl border border-[#F2F4F6] p-5">
          <h3 className="text-[16px] font-black text-[#191F28] mb-2">{section.title}</h3>
          <div className="divide-y divide-[#F2F4F6]">
            {section.items.map((item) => {
              const saved = c.items?.[item.id];
              return (
                <div key={item.id} className="flex items-start gap-2.5 py-2.5">
                  <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-md flex items-center justify-center ${saved?.checked ? "bg-[#3182F6]" : "bg-[#F2F4F6]"}`}>
                    {saved?.checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-[14px] font-bold break-keep ${saved?.checked ? "text-[#191F28]" : "text-[#8B95A1]"}`}>{item.label}</p>
                    {saved?.note && <p className="mt-1 text-[13px] font-semibold text-[#4E5968] whitespace-pre-wrap break-words">{saved.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// 사용자가 저장한 사전답사 체크리스트를 스테이온 장소/없는 장소 구분 없이 모아 보는 관리자 페이지.
export function AdminChecklists() {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState<VenueFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  useEffect(() => {
    // updatedAt이 비어 있는 문서도 빠지지 않도록 전체를 받아 화면에서 정렬한다.
    return onSnapshot(
      query(collection(db, "preVisitChecklists")),
      (snap) => {
        const sortTime = (c: any) => (c.updatedAt || c.createdAt)?.toMillis?.() ?? 0;
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setChecklists(rows.sort((a, b) => sortTime(b) - sortTime(a)));
        setLoadError(false);
        setLoading(false);
      },
      (error) => {
        console.error("체크리스트 조회 실패:", error);
        setLoadError(true);
        setLoading(false);
      },
    );
  }, []);

  const counts = useMemo(() => ({
    all: checklists.length,
    registered: checklists.filter((c) => !!c.venueId).length,
    unregistered: checklists.filter((c) => !c.venueId).length,
  }), [checklists]);

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return checklists.filter((c) => {
      if (filter === "registered" && !c.venueId) return false;
      if (filter === "unregistered" && c.venueId) return false;
      if (!keyword) return true;
      return `${c.venueName || ""} ${c.ownerEmail || ""}`.toLowerCase().includes(keyword);
    });
  }, [checklists, filter, search]);

  const selected = checklists.find((c) => c.id === selectedId);

  return (
    <AdminSidebarLayout
      brandSubtitle="사전답사 체크리스트 관리자"
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
      activeId="pre_visit_checklists"
      onSelect={() => { /* 이 페이지엔 사이드바 로컬 탭이 없음 */ }}
      adminEmail={adminEmail}
    >
      <ScrollRestoration />
      <div className="flex-1 min-w-0">
        <main className="max-w-[900px] px-4 md:px-10 py-6 md:py-8">
          {selected ? (
            <ChecklistDetail checklist={selected} onBack={() => setSelectedId(null)} />
          ) : (
            <>
              <div className="mb-5">
                <h1 className="text-[24px] font-black text-[#191F28] mb-1">사전답사 체크리스트</h1>
                <p className="text-[13px] font-bold text-[#8B95A1]">사용자가 저장한 체크리스트를 모아 봅니다. 내용은 수정할 수 없습니다.</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`px-3.5 py-2 rounded-xl text-[13px] font-black transition-all ${filter === f.id ? "bg-[#3182F6] text-white" : "bg-white text-[#6B7684] border border-[#E5E8EB]"}`}
                  >
                    {f.label} {counts[f.id]}
                  </button>
                ))}
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B95A1]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="장소 이름 또는 이메일 검색"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold outline-none focus:border-[#3182F6]"
                />
              </div>

              {loading ? (
                <p className="py-16 text-center text-[14px] font-bold text-[#8B95A1]">불러오는 중...</p>
              ) : loadError ? (
                <p className="py-16 text-center text-[14px] font-bold text-[#F04452]">체크리스트를 불러오지 못했습니다. 관리자 계정과 Firestore 규칙을 확인해 주세요.</p>
              ) : visible.length === 0 ? (
                <p className="py-16 text-center text-[14px] font-bold text-[#8B95A1]">표시할 체크리스트가 없습니다.</p>
              ) : (
                <div className="space-y-2.5">
                  {visible.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedId(c.id); window.scrollTo(0, 0); }}
                      className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#F2F4F6] text-left hover:border-[#3182F6] transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[15px] font-black text-[#191F28] break-keep">{venueLabel(c)}</p>
                          <VenueTypeBadge registered={!!c.venueId} />
                        </div>
                        <p className="mt-1 text-[12px] font-bold text-[#6B7684] break-all">{c.ownerEmail || "이메일 없음"}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-[12px] font-black text-[#3182F6]">
                            체크 {checkedCount(c)} / {getTotalChecklistItems(!!c.venueId)}
                          </span>
                          <Rating value={c.evaluation?.rating} />
                          <span className="text-[12px] font-bold text-[#8B95A1]">{formatDateTime(c.updatedAt || c.createdAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#B0B8C1] shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </AdminSidebarLayout>
  );
}
