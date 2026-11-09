import { useState, useEffect, useRef } from "react";
import { ScrollRestoration, useSearchParams } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Search, Church, Users, MapPin,
  Phone, Mail, ClipboardCheck, CalendarCheck, MapPinned, CreditCard,
  Calendar, Trash2, X, RotateCcw, Edit3, Save, ShieldOff, ImagePlus, ChevronDown,
  BarChart3, Megaphone, PlaySquare, FileText, Power, Ban, Volume2,
  LayoutDashboard, ClipboardList, MessageSquareText,
} from "lucide-react";
import { db, functions } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { uploadChurchImage } from "../lib/storage";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import { DENOMINATION_GROUPS } from "../lib/denominations";

const DENOMINATION_ITEMS = DENOMINATION_GROUPS.flatMap((g: any) => g.items) as string[];
const MAX_CHURCH_PHOTOS = 10;
const MAX_YOUTUBE_URLS = 3;

const InfoRow = ({ label, value, icon: Icon, isEdit, name, onChange, type = "text" }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
    <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
      <Icon className="w-4 h-4 text-[#ADB5BD]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">{label}</p>
      {isEdit ? (
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          className="w-full px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold focus:border-[#10B981] outline-none transition-all"
        />
      ) : (
        <p className="text-[15px] font-bold text-[#333D4B] leading-snug break-words">{value || "-"}</p>
      )}
    </div>
  </div>
);

const DenominationRow = ({ value, isEdit, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCustom, setIsCustom] = useState(!!value && !DENOMINATION_ITEMS.includes(value));

  useEffect(() => {
    setIsCustom(!!value && !DENOMINATION_ITEMS.includes(value));
  }, [value]);

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
        <Church className="w-4 h-4 text-[#ADB5BD]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">소속 교단</p>
        {isEdit ? (
          <div className="relative">
            <div
              onClick={() => setIsOpen(!isOpen)}
              className="w-full px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold focus:border-[#10B981] outline-none transition-all cursor-pointer flex items-center justify-between"
            >
              <span className={value ? "text-[#191F28]" : "text-[#ADB5BD]"}>
                {isCustom ? "직접 입력" : (value || "선택해주세요")}
              </span>
              <ChevronDown className={`w-4 h-4 text-[#ADB5BD] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>

            {isOpen && (
              <>
                <div onClick={() => setIsOpen(false)} className="fixed inset-0 z-40" />
                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-[#E5E8EB] overflow-hidden">
                  <div className="p-3 bg-[#F9FAFB] border-b border-[#E5E8EB]">
                    <input
                      className="w-full bg-transparent font-bold outline-none text-[13px] text-[#191F28] placeholder:text-[#ADB5BD]"
                      placeholder="교단명을 입력해보세요"
                      autoFocus
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto p-2">
                    {DENOMINATION_ITEMS.filter((item) => item.includes(searchTerm)).map((item) => (
                      <div
                        key={item}
                        onClick={() => {
                          if (item === "기타(직접 입력)") {
                            setIsCustom(true);
                            onChange("");
                          } else {
                            setIsCustom(false);
                            onChange(item);
                          }
                          setIsOpen(false);
                        }}
                        className="p-2.5 hover:bg-[#F2F4F6] rounded-xl font-bold text-[13px] text-[#333D4B] cursor-pointer transition-colors"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {isCustom && (
              <input
                type="text"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="교단명 직접 입력"
                className="w-full mt-2 px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold focus:border-[#10B981] outline-none transition-all"
              />
            )}
          </div>
        ) : (
          <p className="text-[15px] font-bold text-[#333D4B] leading-snug break-words">{value || "-"}</p>
        )}
      </div>
    </div>
  );
};

// [유튜브 링크 최대 3개] 등록 폼과 동일하게 동적으로 추가/삭제
const YoutubeLinksRow = ({ value, isEdit, onChange }: any) => {
  const list: string[] = Array.isArray(value) && value.length > 0 ? value : [""];
  const updateAt = (i: number, v: string) => {
    const next = [...list];
    next[i] = v;
    onChange(next);
  };
  const addRow = () => {
    if (list.length >= MAX_YOUTUBE_URLS) return;
    onChange([...list, ""]);
  };
  const removeRow = (i: number) => {
    const next = list.filter((_: string, idx: number) => idx !== i);
    onChange(next.length > 0 ? next : [""]);
  };

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
        <PlaySquare className="w-4 h-4 text-[#ADB5BD]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">
          유튜브 링크 {isEdit && `(${list.filter(Boolean).length}/${MAX_YOUTUBE_URLS})`}
        </p>
        {isEdit ? (
          <div className="space-y-1.5">
            {list.map((url, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => updateAt(i, e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold outline-none focus:border-[#10B981]"
                />
                {list.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} className="shrink-0 p-2 text-[#ADB5BD] hover:text-[#F04452] transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {list.length < MAX_YOUTUBE_URLS && (
              <button
                type="button"
                onClick={addRow}
                className="w-full py-2 border border-dashed border-[#E5E8EB] rounded-xl text-[12px] font-bold text-[#8B95A1] hover:border-[#10B981] hover:text-[#10B981] transition-all"
              >
                + 링크 추가
              </button>
            )}
          </div>
        ) : list.filter(Boolean).length > 0 ? (
          <div className="space-y-1">
            {list.filter(Boolean).map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-[13px] font-bold text-[#10B981] hover:underline break-all">
                {url}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-[15px] font-bold text-[#333D4B]">-</p>
        )}
      </div>
    </div>
  );
};

type ChurchTab = "pending" | "approved" | "rejected";
const VALID_TABS: ChurchTab[] = ["pending", "approved", "rejected"];

export function AdminChurches() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") as ChurchTab) ? (searchParams.get("tab") as ChurchTab) : "pending";
  const [activeTab, setActiveTabState] = useState<ChurchTab>(initialTab);
  const setActiveTab = (tab: ChurchTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  const [churches, setChurches] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChurch, setSelectedChurch] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedChurch, setEditedChurch] = useState<any>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [bulletinUploading, setBulletinUploading] = useState(false);
  const [directoryEnabled, setDirectoryEnabled] = useState(true);
  const [directoryToggling, setDirectoryToggling] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bulletinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "featureFlags"), (snap) => {
      const data = snap.data();
      setDirectoryEnabled(data?.churchDirectoryEnabled !== false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleDirectory = async () => {
    const next = !directoryEnabled;
    if (!window.confirm(next
      ? "전국 교회 찾기 기능을 다시 사용자에게 노출할까요?"
      : "전국 교회 찾기 기능을 끄면, 사용자 화면 헤더에서 관련 메뉴가 사라지고 /churches, /church-register 페이지도 '준비 중' 안내로 바뀝니다. 계속할까요?")) {
      return;
    }
    setDirectoryToggling(true);
    try {
      await setDoc(doc(db, "settings", "featureFlags"), { churchDirectoryEnabled: next }, { merge: true });
    } catch (error) {
      console.error("기능 사용 설정 변경 실패:", error);
      alert("설정 변경 중 오류가 발생했습니다.");
    } finally {
      setDirectoryToggling(false);
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const remainingSlots = MAX_CHURCH_PHOTOS - (editedChurch.photos?.length || 0);
    if (remainingSlots <= 0) return;
    setPhotoUploading(true);
    try {
      const urls = await Promise.all(
        files.slice(0, remainingSlots).map((file) => uploadChurchImage(file, editedChurch.churchName, editedChurch.applicantName))
      );
      setEditedChurch((prev: any) => ({ ...prev, photos: [...(prev.photos || []), ...urls] }));
    } catch (error) {
      console.error("사진 업로드 실패:", error);
      alert("사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    setEditedChurch((prev: any) => ({ ...prev, photos: (prev.photos || []).filter((p: string) => p !== url) }));
  };

  const handleBulletinFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBulletinUploading(true);
    try {
      const url = await uploadChurchImage(file, editedChurch.churchName, editedChurch.applicantName);
      setEditedChurch((prev: any) => ({ ...prev, bulletinImage: url }));
    } catch (error) {
      console.error("주보 업로드 실패:", error);
      alert("주보 업로드 중 오류가 발생했습니다.");
    } finally {
      setBulletinUploading(false);
    }
  };

  const openChurchModal = (church: any) => {
    setSelectedChurch(church);
    setEditedChurch({ ...church });
    setIsEditMode(false);
  };

  const closeChurchModal = () => {
    setSelectedChurch(null);
    setEditedChurch(null);
    setIsEditMode(false);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedChurch((prev: any) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const q = query(collection(db, "churches"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChurches(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubVenues = onSnapshot(collection(db, "venues"), (snap) => setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubTeams = onSnapshot(collection(db, "ministryTeams"), (snap) => setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setSuspendedCount(snap.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => { unsubVenues(); unsubBookings(); unsubTeams(); unsubUsers(); };
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  const pendingCount = churches.filter((c) => c.status === "pending").length;
  const approvedCount = churches.filter((c) => c.status === "approved").length;
  const rejectedCount = churches.filter((c) => c.status === "rejected").length;
  const teamPendingCount = teams.filter((t) => t.status === "pending").length;

  const filteredChurches = churches
    .filter((c) => c.status === activeTab)
    .filter((c) => !searchQuery.trim() || (c.churchName || "").includes(searchQuery) || (c.applicantName || "").includes(searchQuery));

  const handleStatusChange = async (id: string, newStatus: ChurchTab) => {
    try {
      await updateDoc(doc(db, "churches", id), { status: newStatus });

      if (newStatus === "approved" && selectedChurch) {
        const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
        await triggerAdminNotification({
          type: "CHURCH_APPROVE",
          payload: {
            churchName: selectedChurch.churchName,
            applicantName: selectedChurch.applicantName,
          },
        });
      }

      closeChurchModal();
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 신청 내역을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
    try {
      await deleteDoc(doc(db, "churches", id));
      closeChurchModal();
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = async () => {
    try {
      const { id, ...rest } = editedChurch;
      await updateDoc(doc(db, "churches", selectedChurch.id), rest);
      setSelectedChurch({ ...selectedChurch, ...rest });
      setEditedChurch({ ...selectedChurch, ...rest });
      setIsEditMode(false);
      alert("수정 내용이 저장되었습니다.");
    } catch (error) {
      console.error("교회 정보 수정 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <AdminSidebarLayout
      brandSubtitle="교회 관리자"
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
            { id: "v_schedule", label: "장소별 일정관리", count: venues.filter((v) => v.status === "approved").length, icon: Calendar, href: "/admin/venues?tab=schedule" },
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
            { id: "bk_pending", label: "예약 대기", count: bookings.filter((b) => b.status === "pending").length, icon: ClipboardCheck, accentColor: "#FF9500", href: "/admin/bookings?tab=pending" },
            { id: "bk_confirmed", label: "답사 승인", count: bookings.filter((b) => b.status === "confirmed").length, icon: CalendarCheck, href: "/admin/bookings?tab=confirmed" },
            { id: "bk_inspection_confirmed", label: "답사 확정", count: bookings.filter((b) => b.status === "inspection_confirmed").length, icon: MapPinned, href: "/admin/bookings?tab=inspection_confirmed" },
            { id: "bk_approved", label: "결제 대기", count: bookings.filter((b) => b.status === "approved").length, icon: CreditCard, href: "/admin/bookings?tab=approved" },
            { id: "bk_deposit_paid", label: "완료", count: bookings.filter((b) => b.status === "deposit_paid").length, icon: CheckCircle, href: "/admin/bookings?tab=deposit_paid" },
          ],
        },
        {
          label: "외부 사역팀 관리",
          items: [
            { id: "t_pending", label: "검토 대기", count: teamPendingCount, icon: Clock, accentColor: "#FF9500", href: "/admin/teams?tab=pending" },
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
            { id: "pending", label: "검토 대기", count: pendingCount, icon: Clock, accentColor: "#FF9500" },
            { id: "approved", label: "승인 완료", count: approvedCount, icon: CheckCircle },
            { id: "rejected", label: "반려 / 삭제", count: rejectedCount, icon: XCircle },
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
      activeId={activeTab}
      onSelect={(id) => setActiveTab(id as ChurchTab)}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />

        <main className="max-w-[1300px] px-6 md:px-10 py-6 md:py-8">
          <div className="flex md:hidden bg-[#E5E8EB] p-1.5 rounded-[18px] w-full mb-5 overflow-x-auto">
            {[
              { id: "pending", label: `대기 ${pendingCount}` },
              { id: "approved", label: `승인 ${approvedCount}` },
              { id: "rejected", label: `반려 ${rejectedCount}` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ChurchTab)}
                className={`flex-none px-4 py-2.5 rounded-[14px] text-[13px] font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-[#10B981] shadow-sm" : "text-[#6B7684]"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <h1 className="text-[22px] md:text-[26px] font-black tracking-tight leading-tight mb-1">전국 교회 관리</h1>
            <p className="text-[#4E5968] font-bold text-[13px] md:text-[14px]">교회 등록 신청을 검토하고 승인하세요.</p>
          </div>

          <div className={`flex items-center justify-between gap-4 p-4 md:p-5 rounded-[20px] border mb-5 transition-colors ${directoryEnabled ? "bg-white border-[#F2F4F6]" : "bg-[#FFF5F5] border-[#FFDBDB]"
            }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${directoryEnabled ? "bg-[#ECFDF5]" : "bg-[#FFEBEB]"
                }`}>
                <Power className={`w-5 h-5 ${directoryEnabled ? "text-[#10B981]" : "text-[#F04452]"}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-black text-[#191F28]">전국 교회 찾기 기능 사용</p>
                <p className="text-[12px] font-bold text-[#8B95A1] break-keep">
                  {directoryEnabled
                    ? "사용자 헤더에 메뉴가 노출되고 있어요. 끄면 헤더 메뉴가 사라지고 페이지도 '준비 중' 안내로 바뀝니다."
                    : "지금은 꺼져 있어요. 사용자 헤더 메뉴가 숨겨지고, /churches·/church-register 접속 시 '준비 중' 화면이 표시돼요."}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleDirectory}
              disabled={directoryToggling}
              className={`shrink-0 relative w-14 h-8 rounded-full transition-colors disabled:opacity-60 ${directoryEnabled ? "bg-[#10B981]" : "bg-[#D1D6DB]"
                }`}
            >
              <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${directoryEnabled ? "translate-x-6" : "translate-x-0"
                }`} />
            </button>
          </div>

          <div className="relative mb-5 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="교회명 또는 신청자명으로 검색"
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#10B981] transition-all"
            />
          </div>

          {loading ? (
            <div className="py-32 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#10B981] rounded-full animate-spin" />
              <p className="text-[14px] font-bold text-[#8B95A1]">목록을 불러오고 있어요</p>
            </div>
          ) : filteredChurches.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
              <p className="text-[16px] font-black text-[#8B95A1]">해당하는 신청이 없어요</p>
            </div>
          ) : (
            <div className="bg-white rounded-[24px] border border-[#F2F4F6] overflow-hidden divide-y divide-[#F2F4F6]">
              {filteredChurches.map((church) => (
                <div key={church.id} onClick={() => openChurchModal(church)} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFB] transition-colors cursor-pointer">
                  <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] flex items-center justify-center shrink-0 overflow-hidden">
                    {church.photos?.[0] ? <img src={church.photos[0]} className="w-full h-full object-cover" /> : <Church className="w-5 h-5 text-[#10B981]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black text-[#191F28] truncate">{church.churchName}</p>
                    <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-0.5 min-w-0">
                      <span className="truncate">{church.denomination}</span><span className="w-1 h-1 bg-[#D1D6DB] rounded-full shrink-0" /><span className="truncate">{church.applicantName}</span>
                    </div>
                    <p className="text-[11px] font-bold text-[#ADB5BD] mt-1">
                      신청일 {church.createdAt?.toDate?.() ? church.createdAt.toDate().toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 상세 검토 모달 */}
      {selectedChurch && editedChurch && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#191F28]/80 backdrop-blur-md" onClick={closeChurchModal}>
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-[#F2F4F6] p-6 flex items-center justify-between z-10">
              <div className="flex-1 min-w-0">
                {isEditMode ? (
                  <input name="churchName" value={editedChurch.churchName || ""} onChange={handleEditChange} className="text-[22px] font-black text-[#191F28] px-2 py-1 border border-[#E5E8EB] rounded-xl outline-none focus:border-[#10B981]" />
                ) : (
                  <>
                    <span className="px-3 py-1 bg-[#ECFDF5] text-[#10B981] rounded-full text-[12px] font-black">{selectedChurch.denomination}</span>
                    <h2 className="text-[22px] font-black text-[#191F28] mt-2">{selectedChurch.churchName}</h2>
                    <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      신청일자: {selectedChurch.createdAt?.toDate?.() ? selectedChurch.createdAt.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "-"}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isEditMode && (
                  <button onClick={() => setIsEditMode(true)} className="p-2 bg-[#F2F4F6] rounded-full hover:bg-[#E5E8EB] transition-all" title="수정하기">
                    <Edit3 className="w-5 h-5 text-[#4E5968]" />
                  </button>
                )}
                <button onClick={closeChurchModal} className="p-2 bg-[#F2F4F6] rounded-full hover:bg-[#E5E8EB] transition-all">
                  <X className="w-5 h-5 text-[#4E5968]" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest">교회 사진 (최대 {MAX_CHURCH_PHOTOS}장, 첫 장이 대표)</h3>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading || (editedChurch.photos?.length || 0) >= MAX_CHURCH_PHOTOS}
                      className="px-3 py-1.5 bg-[#ECFDF5] text-[#10B981] rounded-lg text-[12px] font-black flex items-center gap-1 disabled:opacity-60"
                    >
                      <ImagePlus className="w-3.5 h-3.5" /> {photoUploading ? "업로드 중..." : "사진 추가"}
                    </button>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoFileChange} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(isEditMode ? editedChurch.photos : selectedChurch.photos)?.map((url: string, idx: number) => (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-[#F2F4F6]">
                      <img src={url} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#10B981] text-white text-[9px] font-black rounded-full pointer-events-none">대표</span>
                      )}
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => removePhoto(url)}
                          className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest">교회 주보</h3>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => bulletinInputRef.current?.click()}
                      disabled={bulletinUploading}
                      className="px-3 py-1.5 bg-[#ECFDF5] text-[#10B981] rounded-lg text-[12px] font-black flex items-center gap-1 disabled:opacity-60"
                    >
                      <ImagePlus className="w-3.5 h-3.5" /> {bulletinUploading ? "업로드 중..." : (editedChurch.bulletinImage ? "주보 변경" : "주보 추가")}
                    </button>
                  )}
                  <input ref={bulletinInputRef} type="file" accept="image/*" className="hidden" onChange={handleBulletinFileChange} />
                </div>
                {(isEditMode ? editedChurch.bulletinImage : selectedChurch.bulletinImage) ? (
                  <div className="relative w-32 aspect-[3/4] rounded-xl overflow-hidden bg-[#F2F4F6]">
                    <img src={isEditMode ? editedChurch.bulletinImage : selectedChurch.bulletinImage} className="w-full h-full object-cover" />
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => setEditedChurch((prev: any) => ({ ...prev, bulletinImage: "" }))}
                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[#ADB5BD] text-[13px] font-bold px-1">
                    <FileText className="w-4 h-4" /> 아직 제출된 주보가 없어요
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">신청자 정보</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={Users} label="신청자 이름" name="applicantName" value={editedChurch.applicantName} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Phone} label="신청자 연락처" name="applicantContact" value={editedChurch.applicantContact} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Mail} label="등록 이메일" name="applicantEmail" value={editedChurch.applicantEmail} isEdit={isEditMode} onChange={handleEditChange} />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">교회 기본 정보</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <DenominationRow value={editedChurch.denomination} isEdit={isEditMode} onChange={(v: string) => setEditedChurch({ ...editedChurch, denomination: v })} />
                  <InfoRow icon={MapPin} label="교회 위치(주소)" name="churchAddress" value={editedChurch.churchAddress} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={MapPin} label="상세 주소" name="churchAddressDetail" value={editedChurch.churchAddressDetail} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Phone} label="교회 연락처 (공개)" name="churchContact" value={editedChurch.churchContact} isEdit={isEditMode} onChange={handleEditChange} />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">담임목사님 정보 (비공개)</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={Users} label="담임목사님 성함" name="pastorName" value={editedChurch.pastorName} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Phone} label="담임목사님 연락처" name="pastorContact" value={editedChurch.pastorContact} isEdit={isEditMode} onChange={handleEditChange} />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">교회 소개</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={Church} label="한줄 소개" name="introduction" value={editedChurch.introduction} isEdit={isEditMode} onChange={handleEditChange} />
                  {isEditMode ? (
                    <div className="p-4">
                      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">비전 소개</p>
                      <textarea name="vision" value={editedChurch.vision || ""} onChange={handleEditChange} className="w-full min-h-[100px] p-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-medium outline-none focus:border-[#10B981] resize-none" />
                    </div>
                  ) : (
                    <div className="p-4">
                      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">비전 소개</p>
                      <p className="text-[14px] font-medium text-[#333D4B] leading-relaxed whitespace-pre-wrap break-words">{selectedChurch.vision || "-"}</p>
                    </div>
                  )}
                  <YoutubeLinksRow value={editedChurch.youtubeUrls} isEdit={isEditMode} onChange={(v: string[]) => setEditedChurch({ ...editedChurch, youtubeUrls: v })} />
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#F2F4F6] p-6 flex gap-2">
              {isEditMode ? (
                <>
                  <button onClick={() => { setEditedChurch({ ...selectedChurch }); setIsEditMode(false); }} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                    취소
                  </button>
                  <button onClick={handleUpdate} className="flex-[2] py-4 bg-[#10B981] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#10B981]/10 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> 저장하기
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleDelete(selectedChurch.id)} className="p-4 bg-[#FFF0F0] text-[#F04452] rounded-2xl hover:bg-[#FFE0E0] transition-all active:scale-95">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  {selectedChurch.status !== "pending" && (
                    <button onClick={() => handleStatusChange(selectedChurch.id, "pending")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95">
                      <RotateCcw className="w-4 h-4" /> 대기로 되돌리기
                    </button>
                  )}
                  {selectedChurch.status !== "rejected" && (
                    <button onClick={() => handleStatusChange(selectedChurch.id, "rejected")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                      반려하기
                    </button>
                  )}
                  {selectedChurch.status !== "approved" && (
                    <button onClick={() => handleStatusChange(selectedChurch.id, "approved")} className="flex-[2] py-4 bg-[#10B981] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#10B981]/10 transition-all active:scale-95">
                      승인하기
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminSidebarLayout>
  );
}
