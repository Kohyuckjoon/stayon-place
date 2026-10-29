import { useState, useEffect, useMemo, useRef } from "react";
import { ScrollRestoration } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Users, ShieldOff, Megaphone, CreditCard, Volume2,
  LayoutDashboard, BarChart3, Calendar, Ban, ClipboardCheck, CalendarCheck, MapPinned,
  MessageSquareText, Pencil, Plus, ChevronLeft, Check, Trash2, HelpCircle, Copy, X, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import {
  collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch,
  orderBy, query, limit, serverTimestamp, getDocs, getDoc, where,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import {
  DEFAULT_MESSAGE_TEMPLATES, MESSAGE_TEMPLATE_TABS, type MessageTemplateTab,
} from "../lib/messageTemplateDefaults";
import {
  analyzeTemplate, renderTemplate, partsToText, emptyFieldNames, resolveFieldValue,
} from "../lib/messageTemplateEngine";

interface MessageTemplate {
  id: string;
  tab: MessageTemplateTab;
  group: string;
  icon: string;
  title: string;
  subtitle: string;
  body: string;
  order: number;
}

interface HistoryItem {
  id: string;
  templateId: string;
  templateTitle: string;
  icon?: string;
  label: string;
  values: Record<string, string>;
  toggles: Record<string, boolean>;
  createdAt?: any;
}

type Draft = Omit<MessageTemplate, "id" | "order"> & { id?: string };

const TEMPLATES_COL = "adminMessageTemplates";
const HISTORY_COL = "adminMessageHistory";

const TAB_ICON_BG: Record<MessageTemplateTab, string> = {
  proposal: "bg-[#F2F8FF]",
  notice: "bg-[#FFF8E8]",
  guide: "bg-[#F2FDF5]",
};

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 구형 브라우저/권한 거부 대비. 이모지도 유니코드 그대로 들어가서 깨지지 않는다.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function formatSentAt(ts: any): string {
  const d: Date | null = ts?.toDate?.() ?? null;
  if (!d) return "방금";
  const hm = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `오늘 ${hm}`;
  if (d.toDateString() === yesterday.toDateString()) return `어제 ${hm}`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${hm}`;
}

// "예약에서 불러오기" - 예약(bookings) 데이터는 읽기만 하고 절대 수정하지 않는다.
const BOOKING_IMPORT_GROUP = "수련회";
const BOOKING_STATUS_LABELS: Record<string, string> = {
  confirmed: "답사 승인",
  inspection_confirmed: "답사 확정",
  approved: "결제 대기",
  deposit_paid: "완료",
};
const BOOKING_STATUSES = Object.keys(BOOKING_STATUS_LABELS);

function formatKoreanDate(value?: string): string {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]})`;
}

function bookingScheduleText(b: any): string {
  if (!b.startDate) return "";
  return b.endDate && b.endDate !== b.startDate
    ? `${formatKoreanDate(b.startDate)} ~ ${formatKoreanDate(b.endDate)}`
    : formatKoreanDate(b.startDate);
}

function bookingInspectionText(b: any): string {
  if (!b.confirmedInspectionDate) return "";
  return [formatKoreanDate(b.confirmedInspectionDate), b.confirmedInspectionTime].filter(Boolean).join(" ");
}

function countChars(text: string): number {
  // 이모지(서로게이트 쌍)를 1자로 센다
  return Array.from(text).length;
}

export function AdminMessageTemplates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [tab, setTab] = useState<MessageTemplateTab>("proposal");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 입력값은 템플릿끼리 이름으로 공유한다 - "장소 이름"을 한 번 넣으면 다른 템플릿에서도 그대로 쓰인다.
  const [values, setValues] = useState<Record<string, string>>({});
  const [toggleState, setToggleState] = useState<Record<string, Record<string, boolean>>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seedingRef = useRef(false);
  const [bookingPickerOpen, setBookingPickerOpen] = useState(false);
  const [bookingList, setBookingList] = useState<any[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [importedBookingLabel, setImportedBookingLabel] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, TEMPLATES_COL), (snap) => {
      // 컬렉션이 완전히 비어 있을 때(최초 1회)만 기본 템플릿을 넣는다. 캐시 기준으로 비어 보이는
      // 순간에 넣으면 이미 수정해둔 템플릿을 덮어쓸 수 있어서 서버 응답일 때만 판단한다.
      if (snap.empty && !snap.metadata.fromCache && !seedingRef.current) {
        seedingRef.current = true;
        const batch = writeBatch(db);
        DEFAULT_MESSAGE_TEMPLATES.forEach(({ id, ...rest }) => {
          batch.set(doc(db, TEMPLATES_COL, id), { ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        });
        batch.commit().catch((error) => {
          console.error("기본 템플릿 생성 실패:", error);
          seedingRef.current = false;
        });
        return;
      }
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MessageTemplate));
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setTemplates(list);
      setLoading(false);
    }, (error) => {
      console.error("템플릿 불러오기 실패:", error);
      setLoading(false);
    });

    const unsubHistory = onSnapshot(
      query(collection(db, HISTORY_COL), orderBy("createdAt", "desc"), limit(20)),
      (snap) => setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HistoryItem))),
      (error) => console.error("최근 보낸 곳 불러오기 실패:", error),
    );
    return () => { unsub(); unsubHistory(); };
  }, []);

  const tabTemplates = useMemo(() => templates.filter((t) => t.tab === tab), [templates, tab]);
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    templates.forEach((t) => { counts[t.tab] = (counts[t.tab] || 0) + 1; });
    return counts;
  }, [templates]);

  // 탭을 바꾸거나 선택한 템플릿이 지워지면 그 탭의 첫 번째 템플릿을 선택
  useEffect(() => {
    if (draft && !draft.id) return;
    if (!selectedId || !tabTemplates.some((t) => t.id === selectedId)) {
      setSelectedId(tabTemplates[0]?.id ?? null);
    }
  }, [tabTemplates, selectedId, draft]);

  const selected = templates.find((t) => t.id === selectedId) || null;
  const activeBody = draft ? draft.body : selected?.body || "";
  const activeKey = draft ? draft.id || "__new__" : selectedId || "";
  const { fields, toggles } = useMemo(() => analyzeTemplate(activeBody), [activeBody]);
  const activeToggles = toggleState[activeKey] || {};
  const parts = useMemo(() => renderTemplate(activeBody, values, activeToggles), [activeBody, values, activeToggles]);
  const plainText = partsToText(parts);

  // 그룹(소제목) 묶음 - 탭 이름과 같은 그룹은 소제목 없이 보여준다.
  const tabLabel = MESSAGE_TEMPLATE_TABS.find((t) => t.id === tab)?.label || "";
  const grouped = useMemo(() => {
    const map = new Map<string, MessageTemplate[]>();
    tabTemplates.forEach((t) => {
      const key = t.group || tabLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries());
  }, [tabTemplates, tabLabel]);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const copyTemplate = async (template: MessageTemplate) => {
    const tToggles = toggleState[template.id] || {};
    const tParts = renderTemplate(template.body, values, tToggles);
    const empties = emptyFieldNames(tParts);
    if (empties.length > 0 && !window.confirm(`아직 비어 있는 칸이 있어요: ${empties.join(", ")}\n그대로 복사할까요?`)) return;

    const ok = await copyToClipboard(partsToText(tParts));
    if (!ok) {
      alert("복사에 실패했어요. 미리보기 글을 길게 눌러 직접 복사해 주세요.");
      return;
    }
    showToast("복사됐어요. 카카오톡에 붙여넣어 보내세요");

    const { fields: tFields, toggles: tToggleDefs } = analyzeTemplate(template.body);
    const usedValues: Record<string, string> = {};
    tFields.forEach((f) => { usedValues[f.name] = resolveFieldValue(f, values); });
    const usedToggles: Record<string, boolean> = {};
    tToggleDefs.forEach((t) => { usedToggles[t.name] = tToggles[t.name] ?? t.defaultOn; });
    const firstText = tFields.find((f) => f.kind === "text" && usedValues[f.name]);
    try {
      await addDoc(collection(db, HISTORY_COL), {
        templateId: template.id,
        templateTitle: template.subtitle && tab === "notice" ? `${template.title}(${template.subtitle})` : template.title,
        icon: template.icon,
        label: firstText ? usedValues[firstText.name] : template.title,
        values: usedValues,
        toggles: usedToggles,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("최근 보낸 곳 기록 실패:", error);
    }
  };

  const restoreHistory = (h: HistoryItem) => {
    const template = templates.find((t) => t.id === h.templateId);
    if (!template) {
      showToast("이 템플릿은 삭제돼서 불러올 수 없어요");
      return;
    }
    setDraft(null);
    setTab(template.tab);
    setSelectedId(template.id);
    setValues((prev) => ({ ...prev, ...(h.values || {}) }));
    setToggleState((prev) => ({ ...prev, [template.id]: { ...(h.toggles || {}) } }));
    setMobileDetailOpen(true);
  };

  const selectTemplate = (id: string) => {
    if (draft && !window.confirm("편집 중인 내용이 저장되지 않아요. 나갈까요?")) return;
    setDraft(null);
    setSelectedId(id);
    setMobileDetailOpen(true);
  };

  const changeTab = (next: MessageTemplateTab) => {
    if (draft && !window.confirm("편집 중인 내용이 저장되지 않아요. 나갈까요?")) return;
    setDraft(null);
    setTab(next);
    setMobileDetailOpen(false);
  };

  const startEdit = () => {
    if (!selected) return;
    const { id, tab: tTab, group, icon, title, subtitle, body } = selected;
    setDraft({ id, tab: tTab, group, icon, title, subtitle, body });
    setShowSyntaxHelp(false);
  };

  const startNew = () => {
    if (draft && !window.confirm("편집 중인 내용이 저장되지 않아요. 나갈까요?")) return;
    setDraft({ tab, group: grouped[0]?.[0] || tabLabel, icon: "💬", title: "", subtitle: "", body: "" });
    setShowSyntaxHelp(true);
    setMobileDetailOpen(true);
  };

  const cancelEdit = () => {
    const wasNew = draft && !draft.id;
    setDraft(null);
    if (wasNew) setMobileDetailOpen(false);
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.title.trim()) { alert("제목을 입력해 주세요."); return; }
    if (!draft.body.trim()) { alert("문자 내용을 입력해 주세요."); return; }
    setSaving(true);
    const payload = {
      tab: draft.tab,
      group: draft.group.trim() || MESSAGE_TEMPLATE_TABS.find((t) => t.id === draft.tab)?.label || "",
      icon: draft.icon.trim() || "💬",
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      body: draft.body,
      updatedAt: serverTimestamp(),
    };
    try {
      if (draft.id) {
        await updateDoc(doc(db, TEMPLATES_COL, draft.id), payload);
        setSelectedId(draft.id);
      } else {
        const maxOrder = templates.reduce((m, t) => Math.max(m, t.order ?? 0), 0);
        const ref = await addDoc(collection(db, TEMPLATES_COL), { ...payload, order: maxOrder + 1, createdAt: serverTimestamp() });
        setSelectedId(ref.id);
      }
      setTab(draft.tab);
      setDraft(null);
      showToast("저장했어요");
    } catch (error) {
      console.error("템플릿 저장 실패:", error);
      alert("저장 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    if (!draft?.id) return;
    if (!window.confirm(`"${draft.title}" 템플릿을 삭제할까요?\n삭제하면 되돌릴 수 없어요.`)) return;
    try {
      await deleteDoc(doc(db, TEMPLATES_COL, draft.id));
      setDraft(null);
      setSelectedId(null);
      setMobileDetailOpen(false);
      showToast("삭제했어요");
    } catch (error) {
      console.error("템플릿 삭제 실패:", error);
      alert("삭제 중 오류가 발생했어요.");
    }
  };

  const openBookingPicker = async () => {
    setBookingPickerOpen(true);
    setBookingSearch("");
    setBookingLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "bookings"), where("status", "in", BOOKING_STATUSES)));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setBookingList(list);
    } catch (error) {
      console.error("예약 목록 불러오기 실패:", error);
      setBookingList([]);
    } finally {
      setBookingLoading(false);
    }
  };

  const importBooking = async (b: any) => {
    const next: Record<string, string> = {};
    if (b.contactName) next["예약자 이름"] = b.contactName;
    if (b.churchName) next["교회 이름"] = b.churchName;
    if (b.venueName) next["장소 이름"] = b.venueName;
    const inspection = bookingInspectionText(b);
    if (inspection) next["답사 일시"] = inspection;
    const schedule = bookingScheduleText(b);
    if (schedule) next["수련회 일정"] = schedule;
    if (b.venueId) {
      try {
        const venueSnap = await getDoc(doc(db, "venues", b.venueId));
        const v = venueSnap.data();
        const address = [v?.location, v?.addressDetail].filter(Boolean).join(" ");
        if (address) next["장소 주소"] = address;
      } catch (error) {
        console.error("장소 주소 불러오기 실패:", error);
      }
    }
    setValues((prev) => ({ ...prev, ...next }));
    setImportedBookingLabel(`${b.churchName || b.contactName || "예약"} · ${b.venueName || ""}`.trim());
    setBookingPickerOpen(false);
    showToast("예약 정보를 불러왔어요");
  };

  const filteredBookings = useMemo(() => {
    const q = bookingSearch.trim();
    if (!q) return bookingList;
    return bookingList.filter((b) =>
      [b.churchName, b.contactName, b.venueName, b.phone].some((v) => typeof v === "string" && v.includes(q)),
    );
  }, [bookingList, bookingSearch]);

  const showBookingImport = !!selected && !draft && selected.tab === "notice" && selected.group === BOOKING_IMPORT_GROUP;

  const setToggle = (name: string, on: boolean) => {
    setToggleState((prev) => ({ ...prev, [activeKey]: { ...(prev[activeKey] || {}), [name]: on } }));
  };

  const draftGroups = useMemo(() => {
    if (!draft) return [];
    const set = new Set(templates.filter((t) => t.tab === draft.tab).map((t) => t.group).filter(Boolean));
    return Array.from(set);
  }, [templates, draft]);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";
  const now = new Date();
  const nowLabel = `${now.getHours() < 12 ? "오전" : "오후"} ${((now.getHours() + 11) % 12) + 1}:${String(now.getMinutes()).padStart(2, "0")}`;

  // ───────── 좌측: 템플릿 목록 + 최근 보낸 곳 ─────────
  const listPanel = (
    <section className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4 md:p-5">
      {loading ? (
        <p className="text-center py-16 text-[#ADB5BD] font-bold">불러오는 중...</p>
      ) : tabTemplates.length === 0 ? (
        <p className="text-center py-16 text-[#ADB5BD] font-bold text-[14px]">이 탭에는 아직 템플릿이 없어요.</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([group, items]) => (
            <div key={group}>
              <p className="px-1 mb-2 text-[13px] font-bold text-[#8B95A1]">{group === tabLabel ? "템플릿" : group}</p>
              <div className="space-y-1.5">
                {items.map((t) => {
                  const isActive = t.id === selectedId && !(draft && !draft.id);
                  return (
                    <div
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectTemplate(t.id)}
                      onKeyDown={(e) => { if (e.key === "Enter") selectTemplate(t.id); }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                        isActive ? "lg:border-[#3182F6] lg:bg-[#F2F8FF] border-transparent" : "border-transparent hover:bg-[#F9FAFB]"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[22px] shrink-0 ${TAB_ICON_BG[t.tab] || "bg-[#F2F4F6]"}`}>
                        {t.icon || "💬"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-black text-[#191F28] truncate">{t.title}</p>
                        {t.subtitle && <p className="text-[12.5px] font-medium text-[#8B95A1] truncate">{t.subtitle}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyTemplate(t); }}
                        className={`shrink-0 px-3.5 py-2 rounded-xl text-[13px] font-black transition-all active:scale-95 ${
                          isActive ? "bg-[#F2F8FF] text-[#3182F6] lg:bg-[#3182F6] lg:text-white" : "bg-[#F2F8FF] text-[#3182F6] hover:bg-[#E8F3FF]"
                        }`}
                      >
                        복사
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-[#F2F4F6] mt-5 pt-5">
        <p className="px-1 mb-2 text-[13px] font-bold text-[#8B95A1]">최근 보낸 곳</p>
        {history.length === 0 ? (
          <p className="px-1 py-3 text-[13px] font-medium text-[#ADB5BD]">복사하면 여기에 기록돼요. 누르면 그때 입력한 내용을 다시 불러와요.</p>
        ) : (
          <div className="space-y-1 max-h-[320px] overflow-y-auto">
            {history.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => restoreHistory(h)}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-[#F9FAFB] text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-[#F2F4F6] flex items-center justify-center text-[17px] shrink-0">{h.icon || "💬"}</div>
                <div className="min-w-0">
                  <p className="text-[14px] font-black text-[#191F28] truncate">{h.label}</p>
                  <p className="text-[12px] font-medium text-[#8B95A1] truncate">{formatSentAt(h.createdAt)} · {h.templateTitle}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );

  // ───────── 가운데: 빈칸 채우기 / 편집 ─────────
  const fieldsPanel = selected && !draft ? (
    <section className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-[20px] md:text-[22px] font-black text-[#191F28] break-keep">{selected.title}</h2>
          {selected.subtitle && <p className="text-[13.5px] font-medium text-[#8B95A1] mt-0.5 break-keep">{selected.subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={startEdit}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F2F4F6] text-[#4E5968] text-[13px] font-black hover:bg-[#E5E8EB] active:scale-95 transition-all"
        >
          <Pencil className="w-3.5 h-3.5" /> 편집
        </button>
      </div>

      {showBookingImport && (
        <div className="mb-5 p-3.5 rounded-2xl bg-[#F2F8FF] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-black text-[#191F28]">예약에서 불러오기</p>
            <p className="text-[12.5px] font-medium text-[#6B7684] truncate">
              {importedBookingLabel ? `불러옴: ${importedBookingLabel}` : "답사 승인·확정, 결제 대기·완료 예약의 정보로 빈칸을 채워요"}
            </p>
          </div>
          <button
            type="button"
            onClick={openBookingPicker}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#3182F6] text-white text-[13px] font-black active:scale-95 transition-all"
          >
            <CalendarCheck className="w-4 h-4" /> 예약 선택
          </button>
        </div>
      )}

      {fields.length === 0 && toggles.length === 0 ? (
        <p className="py-6 text-[14px] font-medium text-[#8B95A1] break-keep">이 템플릿은 채울 빈칸이 없어요. 바로 복사하시면 돼요.</p>
      ) : (
        <div className="space-y-5">
          {fields.map((f) => (
            <div key={f.name}>
              <p className="text-[14px] font-bold text-[#4E5968] mb-2">{f.name}</p>
              {f.kind === "text" ? (
                <input
                  type="text"
                  value={values[f.name] || ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  placeholder={`${f.name} 입력`}
                  className="w-full h-12 px-4 rounded-2xl border-2 border-[#E5E8EB] bg-white text-[16px] font-bold text-[#191F28] placeholder:text-[#ADB5BD] placeholder:font-medium outline-none focus:border-[#3182F6] transition-colors"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {f.options.map((opt) => {
                    const on = resolveFieldValue(f, values) === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setValues((prev) => ({ ...prev, [f.name]: opt }))}
                        className={`px-4 py-2.5 rounded-full text-[14px] font-bold transition-all active:scale-95 ${
                          on ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {toggles.length > 0 && (
            <div className={`space-y-1 ${fields.length > 0 ? "border-t border-[#F2F4F6] pt-4" : ""}`}>
              {toggles.map((t) => {
                const on = activeToggles[t.name] ?? t.defaultOn;
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setToggle(t.name, !on)}
                    className="w-full flex items-center justify-between gap-3 py-2.5 text-left"
                  >
                    <span className="text-[15px] font-bold text-[#191F28] break-keep">{t.name} 넣기</span>
                    <span className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${on ? "bg-[#3182F6]" : "bg-[#E5E8EB]"}`}>
                      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  ) : draft ? (
    <section className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 md:p-6">
      <h2 className="text-[20px] font-black text-[#191F28] mb-5">{draft.id ? "템플릿 편집" : "새 템플릿"}</h2>

      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="w-20 shrink-0">
            <p className="text-[13px] font-bold text-[#4E5968] mb-1.5">아이콘</p>
            <input
              type="text"
              value={draft.icon}
              onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              className="w-full h-12 text-center rounded-2xl border-2 border-[#E5E8EB] text-[22px] outline-none focus:border-[#3182F6]"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#4E5968] mb-1.5">제목</p>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="예) 수련회 장소"
              className="w-full h-12 px-4 rounded-2xl border-2 border-[#E5E8EB] text-[15px] font-bold outline-none focus:border-[#3182F6] placeholder:text-[#ADB5BD] placeholder:font-medium"
            />
          </div>
        </div>

        <div>
          <p className="text-[13px] font-bold text-[#4E5968] mb-1.5">설명 <span className="text-[#ADB5BD] font-medium">(목록에 작게 보여요)</span></p>
          <input
            type="text"
            value={draft.subtitle}
            onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
            placeholder="예) 교회·수양관·기도원·펜션"
            className="w-full h-12 px-4 rounded-2xl border-2 border-[#E5E8EB] text-[15px] font-bold outline-none focus:border-[#3182F6] placeholder:text-[#ADB5BD] placeholder:font-medium"
          />
        </div>

        <div>
          <p className="text-[13px] font-bold text-[#4E5968] mb-1.5">탭</p>
          <div className="flex flex-wrap gap-2">
            {MESSAGE_TEMPLATE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDraft({ ...draft, tab: t.id, group: draft.tab === t.id ? draft.group : t.label })}
                className={`px-4 py-2 rounded-full text-[14px] font-bold transition-all ${
                  draft.tab === t.id ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[13px] font-bold text-[#4E5968] mb-1.5">소제목 <span className="text-[#ADB5BD] font-medium">(고르거나 새로 입력)</span></p>
          {draftGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {draftGroups.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setDraft({ ...draft, group: g })}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all ${
                    draft.group === g ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={draft.group}
            onChange={(e) => setDraft({ ...draft, group: e.target.value })}
            placeholder="예) 수련회"
            className="w-full h-11 px-4 rounded-2xl border-2 border-[#E5E8EB] text-[14px] font-bold outline-none focus:border-[#3182F6] placeholder:text-[#ADB5BD] placeholder:font-medium"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[13px] font-bold text-[#4E5968]">문자 내용</p>
            <button
              type="button"
              onClick={() => setShowSyntaxHelp((v) => !v)}
              className="flex items-center gap-1 text-[12.5px] font-bold text-[#3182F6]"
            >
              <HelpCircle className="w-3.5 h-3.5" /> 빈칸 만드는 법
            </button>
          </div>
          <AnimatePresence initial={false}>
            {showSyntaxHelp && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mb-2.5 p-4 rounded-2xl bg-[#F9FAFB] border border-[#F2F4F6] space-y-2.5 text-[13px] text-[#4E5968] font-medium leading-relaxed">
                  <p><code className="px-1.5 py-0.5 rounded bg-white border border-[#E5E8EB] font-bold text-[#191F28]">{"{장소 이름}"}</code> → 입력칸이 생겨요.</p>
                  <p><code className="px-1.5 py-0.5 rounded bg-white border border-[#E5E8EB] font-bold text-[#191F28]">{"{호칭:목사님|전도사님}"}</code> → 고르기 버튼이 생겨요. 첫 번째가 기본값이에요.</p>
                  <p><code className="px-1.5 py-0.5 rounded bg-white border border-[#E5E8EB] font-bold text-[#191F28]">{"[[문단 이름]]"}</code> 내용 <code className="px-1.5 py-0.5 rounded bg-white border border-[#E5E8EB] font-bold text-[#191F28]">{"[[/]]"}</code> → 넣기/빼기 스위치가 생겨요. 처음부터 빼두려면 <code className="px-1.5 py-0.5 rounded bg-white border border-[#E5E8EB] font-bold text-[#191F28]">{"[[문단 이름:끔]]"}</code></p>
                  <p><code className="px-1.5 py-0.5 rounded bg-white border border-[#E5E8EB] font-bold text-[#191F28]">{"{장소 이름}을(를)"}</code> → 입력한 이름 받침에 맞춰 을/를이 자동으로 골라져요. 이(가), 은(는), 과(와), 으로(로)도 돼요.</p>
                  <p>같은 이름의 빈칸은 한 번만 입력하면 다른 템플릿에도 그대로 들어가요.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={16}
            placeholder={"안녕하세요, {호칭:목사님|전도사님}!\n스테이온(STAYON)입니다."}
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#E5E8EB] text-[14px] font-medium leading-relaxed text-[#191F28] outline-none focus:border-[#3182F6] resize-y placeholder:text-[#ADB5BD]"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          {draft.id && (
            <button
              type="button"
              onClick={deleteTemplate}
              className="p-3 rounded-2xl bg-[#FFF0F0] text-[#F04452] active:scale-95 transition-all"
              title="삭제"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={cancelEdit}
            className="flex-1 h-12 rounded-2xl bg-[#F2F4F6] text-[#4E5968] text-[15px] font-black active:scale-[0.98] transition-all"
          >
            취소
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="flex-[2] h-12 rounded-2xl bg-[#3182F6] text-white text-[15px] font-black active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </section>
  ) : (
    <section className="bg-white rounded-[24px] border border-[#F2F4F6] p-10 text-center text-[#ADB5BD] font-bold">
      왼쪽에서 템플릿을 골라주세요.
    </section>
  );

  // ───────── 우측: 카카오톡 미리보기 ─────────
  const previewPanel = (selected || draft) ? (
    <section className="bg-[#B2C7DA] rounded-[28px] p-4 md:p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-[14px] font-bold text-[#3D4F61]">미리보기</p>
        <span className="px-2.5 py-1 rounded-full bg-white/60 text-[12px] font-black text-[#3D4F61]">카카오톡</span>
      </div>
      <div className="2xl:max-h-[calc(100vh-320px)] 2xl:overflow-y-auto rounded-[20px]">
        <div className="bg-[#FEE500] rounded-[20px] rounded-tr-md px-4 py-4 text-[14.5px] leading-[1.7] text-[#191F28] whitespace-pre-wrap break-keep [overflow-wrap:anywhere]">
          {plainText ? parts.map((p, i) => (
            p.kind === "value" ? (
              <span key={i} className="font-bold bg-white/70 rounded px-0.5">{p.text}</span>
            ) : p.kind === "empty" ? (
              <span key={i} className="font-bold text-[#8B6E00] bg-white/40 border border-dashed border-[#B89B00] rounded px-1">{p.text}</span>
            ) : (
              <span key={i}>{p.text}</span>
            )
          )) : <span className="text-[#8B6E00]">문자 내용을 입력하면 여기에 보여요.</span>}
        </div>
      </div>
      <p className="text-right text-[11.5px] font-medium text-[#3D4F61] mt-1.5 mr-1">{nowLabel}</p>

      {!draft && selected && (
        <div className="hidden lg:block mt-4">
          <button
            type="button"
            onClick={() => copyTemplate(selected)}
            className="w-full h-14 rounded-2xl bg-[#3182F6] text-white text-[17px] font-black shadow-lg shadow-[#3182F6]/25 hover:bg-[#1B64DA] active:scale-[0.98] transition-all"
          >
            복사하기
          </button>
        </div>
      )}
      <p className="text-center text-[12.5px] font-medium text-[#3D4F61] mt-2.5">공백 포함 {countChars(plainText).toLocaleString()}자</p>
    </section>
  ) : null;

  return (
    <AdminSidebarLayout
      brandSubtitle="문자 템플릿"
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
      activeId="message_templates"
      onSelect={() => { /* 이 페이지엔 사이드바 로컬 탭이 없음 */ }}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-32 lg:pb-20">
        <ScrollRestoration />

        <main className="max-w-[1400px] px-4 py-5 md:px-10 md:py-8">
          {/* 모바일 상세 화면에서는 제목/탭 대신 "목록으로" 버튼만 */}
          {mobileDetailOpen && (
            <button
              type="button"
              onClick={() => {
                if (draft && !window.confirm("편집 중인 내용이 저장되지 않아요. 나갈까요?")) return;
                setDraft(null);
                setMobileDetailOpen(false);
              }}
              className="lg:hidden flex items-center gap-1 mb-4 text-[#4E5968] font-bold"
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="text-[16px]">목록으로</span>
            </button>
          )}

          <div className={mobileDetailOpen ? "hidden lg:block" : ""}>
            <div className="mb-5 md:mb-6">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h1 className="text-[24px] md:text-[30px] font-black text-[#191F28]">문자 템플릿</h1>
                {/* 모바일은 탭 줄에 다 안 들어가서 제목 옆으로 */}
                <button
                  type="button"
                  onClick={startNew}
                  className="md:hidden shrink-0 flex items-center gap-1 px-3.5 py-2 rounded-full text-[13.5px] font-black bg-white text-[#191F28] border border-[#E5E8EB] active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" /> 추가
                </button>
              </div>
              <p className="text-[14px] md:text-[15px] font-medium text-[#6B7684] break-keep">빈칸만 채우고 복사하면 카카오톡에 바로 붙여넣을 수 있어요.</p>
            </div>

            <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar">
              {MESSAGE_TEMPLATE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => changeTab(t.id)}
                  className={`shrink-0 px-4 md:px-5 py-2.5 md:py-3 rounded-full text-[14px] md:text-[15px] font-black transition-all active:scale-95 ${
                    tab === t.id ? "bg-[#191F28] text-white" : "bg-white text-[#4E5968] border border-[#E5E8EB] hover:bg-[#F9FAFB]"
                  }`}
                >
                  {t.label} <span className={tab === t.id ? "text-white/60 ml-1" : "text-[#ADB5BD] ml-1"}>{tabCounts[t.id] || 0}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={startNew}
                className="hidden md:flex shrink-0 items-center gap-1 px-5 py-3 rounded-full text-[15px] font-black bg-white text-[#191F28] border border-[#E5E8EB] hover:bg-[#F9FAFB] active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" /> 템플릿 추가
              </button>
            </div>
          </div>

          {/* 1536px(2xl) 이상: 시안처럼 목록 | 입력 | 미리보기 3단.
              노트북 폭(lg~2xl)에서 3단이면 가운데 입력칸이 너무 좁아져서, 목록 | (입력 위 + 미리보기 아래) 2단. */}
          <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_400px] gap-4 lg:gap-5 items-start">
            <div className={`${mobileDetailOpen ? "hidden lg:block" : ""} lg:row-span-2 2xl:row-span-1`}>{listPanel}</div>
            <div className={mobileDetailOpen ? "" : "hidden lg:block"}>{fieldsPanel}</div>
            <div className={`${mobileDetailOpen ? "" : "hidden lg:block"} lg:col-start-2 2xl:col-start-3 2xl:row-start-1 2xl:sticky 2xl:top-6`}>{previewPanel}</div>
          </div>
        </main>

        {/* 모바일 상세: 화면 하단 고정 복사 버튼 */}
        {mobileDetailOpen && selected && !draft && (
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-[60] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t border-[#F2F4F6]">
            <button
              type="button"
              onClick={() => copyTemplate(selected)}
              className="w-full h-14 rounded-2xl bg-[#3182F6] text-white text-[17px] font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Copy className="w-5 h-5" /> 복사하기
            </button>
          </div>
        )}

        {/* 예약 선택 - 모바일은 아래에서 올라오는 시트, PC는 가운데 창 */}
        <AnimatePresence>
          {bookingPickerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] bg-black/40 flex items-end md:items-center justify-center md:p-6"
              onClick={() => setBookingPickerOpen(false)}
            >
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full md:max-w-[560px] max-h-[85vh] bg-white rounded-t-[28px] md:rounded-[28px] flex flex-col overflow-hidden"
              >
                <div className="px-5 pt-5 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[18px] font-black text-[#191F28]">예약 선택</h3>
                    <button type="button" onClick={() => setBookingPickerOpen(false)} className="p-2 -mr-2 rounded-full hover:bg-[#F2F4F6]" aria-label="닫기">
                      <X className="w-5 h-5 text-[#4E5968]" />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#ADB5BD] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      placeholder="교회, 담당자, 장소, 연락처로 찾기"
                      className="w-full h-11 pl-10 pr-4 rounded-2xl bg-[#F2F4F6] text-[15px] font-bold text-[#191F28] placeholder:text-[#ADB5BD] placeholder:font-medium outline-none focus:ring-2 focus:ring-[#3182F6]"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-5">
                  {bookingLoading ? (
                    <p className="text-center py-12 text-[#ADB5BD] font-bold">불러오는 중...</p>
                  ) : filteredBookings.length === 0 ? (
                    <p className="text-center py-12 text-[#ADB5BD] font-bold text-[14px]">해당하는 예약이 없어요.</p>
                  ) : (
                    BOOKING_STATUSES.map((status) => {
                      const items = filteredBookings.filter((b) => b.status === status);
                      if (items.length === 0) return null;
                      return (
                        <div key={status} className="mb-3">
                          <p className="px-2 py-2 text-[13px] font-bold text-[#8B95A1]">{BOOKING_STATUS_LABELS[status]} <span className="text-[#ADB5BD]">{items.length}</span></p>
                          {items.map((b) => {
                            const when = bookingInspectionText(b) ? `답사 ${bookingInspectionText(b)}` : bookingScheduleText(b);
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => importBooking(b)}
                                className="w-full text-left px-3 py-3 rounded-2xl hover:bg-[#F9FAFB] active:bg-[#F2F4F6] transition-colors"
                              >
                                <p className="text-[15px] font-black text-[#191F28] truncate">
                                  {b.churchName || "교회 이름 없음"} <span className="font-bold text-[#6B7684]">· {b.contactName || "-"}</span>
                                </p>
                                <p className="text-[13px] font-medium text-[#6B7684] truncate">{b.venueName || "장소 정보 없음"}{when ? ` · ${when}` : ""}</p>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="fixed inset-x-0 bottom-28 lg:bottom-10 z-[70] flex justify-center px-4 pointer-events-none"
            >
              <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-[#191F28] text-white text-[14px] md:text-[15px] font-bold shadow-xl break-keep">
                <span className="w-5 h-5 rounded-full bg-[#3182F6] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                {toast}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminSidebarLayout>
  );
}
