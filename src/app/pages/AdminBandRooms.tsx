import { useState, useEffect, useRef } from "react";
import { ScrollRestoration, useSearchParams } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Search, Music, Users, Speaker, MapPin,
  Phone, Mail, ClipboardCheck, CalendarCheck, MapPinned, CreditCard,
  Calendar, Trash2, X, RotateCcw, Edit3, Save, ShieldOff, ImagePlus, Tag, BarChart3, Megaphone, Zap,
  ChevronLeft, ChevronRight, GripVertical, Ban, Volume2,
} from "lucide-react";
import { db, functions } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { uploadBandRoomImage } from "../lib/storage";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import { ROOM_TYPE_OPTIONS, EQUIPMENT_CHECKLIST_OPTIONS, WEEKDAY_OPTIONS, TIME_OPTIONS, formatAvailableSchedule, formatCurrencyInput, formatHourlyRate } from "../lib/bandRoomDisplay";

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
          className="w-full px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold focus:border-[#0EA5E9] outline-none transition-all"
        />
      ) : (
        <p className="text-[15px] font-bold text-[#333D4B] leading-snug break-words">{value || "-"}</p>
      )}
    </div>
  </div>
);

const ToggleRow = ({ label, icon: Icon, isEdit, value, onChange, trueLabel = "있음", falseLabel = "없음" }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
    <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
      <Icon className="w-4 h-4 text-[#ADB5BD]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">{label}</p>
      {isEdit ? (
        <div className="flex gap-2">
          {[{ label: trueLabel, val: true }, { label: falseLabel, val: false }].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(opt.val)}
              className={`flex-1 py-2 text-[13px] font-bold rounded-xl border transition-all ${value === opt.val
                ? "border-[#0EA5E9] bg-[#F0F9FF] text-[#0EA5E9]"
                : "border-[#E5E8EB] bg-white text-[#8B95A1]"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[15px] font-bold text-[#333D4B] leading-snug">{value ? trueLabel : falseLabel}</p>
      )}
    </div>
  </div>
);

// [다중 선택 리스트형 입력] 보유 장비 체크리스트 / 태그 키워드처럼 string[]으로 저장되는 필드
const MultiListRow = ({ label, icon: Icon, isEdit, value, onChange, options }: any) => {
  const list: string[] = Array.isArray(value) ? value : [];
  const toggleOption = (opt: string) => onChange(list.includes(opt) ? list.filter((v) => v !== opt) : [...list, opt]);

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
        <Icon className="w-4 h-4 text-[#ADB5BD]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">{label}</p>
        {isEdit ? (
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            {options.map((opt: string) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleOption(opt)}
                className={`py-2 rounded-xl text-[12px] font-bold border transition-all ${list.includes(opt)
                  ? "border-[#0EA5E9] bg-[#F0F9FF] text-[#0EA5E9]"
                  : "border-[#E5E8EB] bg-white text-[#8B95A1]"
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[15px] font-bold text-[#333D4B] leading-snug break-words">{list.length > 0 ? list.join(", ") : "-"}</p>
        )}
      </div>
    </div>
  );
};

// [예약가능 요일·시간대] 요일 다중 선택 + 30분 단위 시작/종료 시간 선택 (등록 폼과 동일한 방식)
const AvailabilityRow = ({ isEdit, days, startTime, endTime, onChangeDays, onChangeStartTime, onChangeEndTime }: any) => {
  const dayList: string[] = Array.isArray(days) ? days : [];
  const toggleDay = (d: string) => onChangeDays(dayList.includes(d) ? dayList.filter((v) => v !== d) : [...dayList, d]);

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
        <Calendar className="w-4 h-4 text-[#ADB5BD]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">예약가능 요일·시간대</p>
        {isEdit ? (
          <div className="space-y-2 mt-1">
            <div className="grid grid-cols-4 gap-1.5">
              {WEEKDAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`py-2 rounded-xl text-[12px] font-bold border transition-all ${dayList.includes(d)
                    ? "border-[#0EA5E9] bg-[#F0F9FF] text-[#0EA5E9]"
                    : "border-[#E5E8EB] bg-white text-[#8B95A1]"
                    }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <select value={startTime || ""} onChange={(e) => onChangeStartTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold focus:border-[#0EA5E9] outline-none">
                <option value="">시작 시간</option>
                {TIME_OPTIONS.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={endTime || ""} onChange={(e) => onChangeEndTime(e.target.value)} className="w-full px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold focus:border-[#0EA5E9] outline-none">
                <option value="">종료 시간</option>
                {TIME_OPTIONS.map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        ) : (
          <p className="text-[15px] font-bold text-[#333D4B] leading-snug break-words">{formatAvailableSchedule(dayList, startTime, endTime) || "-"}</p>
        )}
      </div>
    </div>
  );
};

type RoomTab = "pending" | "approved" | "rejected";
const VALID_TABS: RoomTab[] = ["pending", "approved", "rejected"];

export function AdminBandRooms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") as RoomTab) ? (searchParams.get("tab") as RoomTab) : "pending";
  const [activeTab, setActiveTabState] = useState<RoomTab>(initialTab);
  const setActiveTab = (tab: RoomTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  const [rooms, setRooms] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedRoom, setEditedRoom] = useState<any>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // 사진 드래그 순서 변경용 - 그리드에 줄바꿈이 있어도(여러 줄) 정상 동작하도록
  // framer-motion Reorder 대신 순수 HTML5 드래그 앤 드롭을 쓴다(장소 관리 화면과 동일 방식).
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);
  const [overPhotoIndex, setOverPhotoIndex] = useState<number | null>(null);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setPhotoUploading(true);
    try {
      const urls = await Promise.all(files.map((file) => uploadBandRoomImage(file, editedRoom.roomName, editedRoom.applicantName)));
      setEditedRoom((prev: any) => ({ ...prev, photos: [...(prev.photos || []), ...urls] }));
    } catch (error) {
      console.error("사진 업로드 실패:", error);
      alert("사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    setEditedRoom((prev: any) => ({ ...prev, photos: (prev.photos || []).filter((p: string) => p !== url) }));
  };

  // 사진 순서 변경 - photos[0]이 목록 카드/상세 화면의 대표 이미지로 그대로 쓰인다.
  const movePhoto = (index: number, direction: -1 | 1) => {
    setEditedRoom((prev: any) => {
      const photos = [...(prev.photos || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= photos.length) return prev;
      [photos[index], photos[targetIndex]] = [photos[targetIndex], photos[index]];
      return { ...prev, photos };
    });
  };

  const reorderPhoto = (fromIndex: number, toIndex: number) => {
    setEditedRoom((prev: any) => {
      const photos = [...(prev.photos || [])];
      const [moved] = photos.splice(fromIndex, 1);
      photos.splice(toIndex, 0, moved);
      return { ...prev, photos };
    });
  };

  const openRoomModal = (room: any) => {
    setSelectedRoom(room);
    // 편집칸에 들어갈 때부터 천단위 콤마가 보이도록 미리 포맷해둔다.
    setEditedRoom({ ...room, hourlyRate: formatCurrencyInput(String(room.hourlyRate || "")) });
    setIsEditMode(false);
  };

  const closeRoomModal = () => {
    setSelectedRoom(null);
    setEditedRoom(null);
    setIsEditMode(false);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // 시간당 요금은 입력하는 동안에도 천단위 콤마가 붙도록, 저장할 땐 handleUpdate에서 숫자로 변환한다.
    const nextValue = name === "hourlyRate" ? formatCurrencyInput(value) : value;
    setEditedRoom((prev: any) => ({ ...prev, [name]: nextValue }));
  };

  useEffect(() => {
    const q = query(collection(db, "bandRooms"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRooms(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  const pendingCount = rooms.filter((r) => r.status === "pending").length;
  const approvedCount = rooms.filter((r) => r.status === "approved").length;
  const rejectedCount = rooms.filter((r) => r.status === "rejected").length;
  const teamPendingCount = teams.filter((t) => t.status === "pending").length;

  const filteredRooms = rooms
    .filter((r) => r.status === activeTab)
    .filter((r) => !searchQuery.trim() || (r.roomName || "").includes(searchQuery) || (r.applicantName || "").includes(searchQuery));

  // Track1(정보 제공)↔Track2(예약·결제 지원) 전환. Track2로 전환하는 순간마다 trackSwitchedAt을
  // 새로 찍어서(다시 전환해도 갱신됨), Phase 2의 "전환 후 첫 1~2개월 수수료 5% 할인" 기간 계산 기준으로 쓴다.
  const handleSwitchTrack = async (id: string, newTrack: "info" | "booking") => {
    try {
      const updateData: any = { track: newTrack };
      if (newTrack === "booking") updateData.trackSwitchedAt = serverTimestamp();
      await updateDoc(doc(db, "bandRooms", id), updateData);
      setSelectedRoom((prev: any) => (prev ? { ...prev, track: newTrack } : prev));
      setEditedRoom((prev: any) => (prev ? { ...prev, track: newTrack } : prev));
    } catch (error) {
      console.error("노출 방식 전환 실패:", error);
      alert("노출 방식 전환 중 오류가 발생했습니다.");
    }
  };

  const handleStatusChange = async (id: string, newStatus: RoomTab) => {
    try {
      await updateDoc(doc(db, "bandRooms", id), { status: newStatus });

      if (newStatus === "approved" && selectedRoom) {
        const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
        await triggerAdminNotification({
          type: "BANDROOM_APPROVE",
          payload: {
            roomName: selectedRoom.roomName,
            applicantName: selectedRoom.applicantName,
          },
        });
      }

      closeRoomModal();
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 신청 내역을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
    try {
      await deleteDoc(doc(db, "bandRooms", id));
      closeRoomModal();
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = async () => {
    try {
      const { id, ...rest } = editedRoom;
      const updateData = {
        ...rest,
        hourlyRate: Number(String(rest.hourlyRate || "").replace(/[^\d]/g, "")) || 0,
      };
      await updateDoc(doc(db, "bandRooms", selectedRoom.id), updateData);
      setSelectedRoom({ ...selectedRoom, ...updateData });
      setEditedRoom({ ...selectedRoom, ...updateData });
      setIsEditMode(false);
      alert("수정 내용이 저장되었습니다.");
    } catch (error) {
      console.error("공간 정보 수정 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

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
            { id: "v_rejected", label: "반려 / 삭제", count: venues.filter((v) => v.status === "rejected").length, icon: XCircle, href: "/admin/venues?tab=rejected" },
            { id: "v_schedule", label: "장소별 일정관리", count: venues.filter((v) => v.status === "approved").length, icon: Calendar, href: "/admin/venues?tab=schedule" },
            { id: "v_blockrequests", label: "차단 신청 승인", icon: Ban, accentColor: "#F04452", href: "/admin/venues?tab=blockRequests" },
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
            { id: "pending", label: "검토 대기", count: pendingCount, icon: Clock, accentColor: "#FF9500" },
            { id: "approved", label: "승인 완료", count: approvedCount, icon: CheckCircle },
            { id: "rejected", label: "반려 / 삭제", count: rejectedCount, icon: XCircle },
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
      activeId={activeTab}
      onSelect={(id) => setActiveTab(id as RoomTab)}
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
                onClick={() => setActiveTab(tab.id as RoomTab)}
                className={`flex-none px-4 py-2.5 rounded-[14px] text-[13px] font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-[#0EA5E9] shadow-sm" : "text-[#6B7684]"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <h1 className="text-[22px] md:text-[26px] font-black tracking-tight leading-tight mb-1">합주실·연습실 관리</h1>
            <p className="text-[#4E5968] font-bold text-[13px] md:text-[14px]">합주실·연습실 공간 등록 신청을 검토하고 승인하세요.</p>
          </div>

          <div className="relative mb-5 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="공간명 또는 신청자명으로 검색"
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#0EA5E9] transition-all"
            />
          </div>

          {loading ? (
            <div className="py-32 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#0EA5E9] rounded-full animate-spin" />
              <p className="text-[14px] font-bold text-[#8B95A1]">목록을 불러오고 있어요</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
              <p className="text-[16px] font-black text-[#8B95A1]">해당하는 신청이 없어요</p>
            </div>
          ) : (
            <div className="bg-white rounded-[24px] border border-[#F2F4F6] overflow-hidden divide-y divide-[#F2F4F6]">
              {filteredRooms.map((room) => (
                <div key={room.id} onClick={() => openRoomModal(room)} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFB] transition-colors cursor-pointer">
                  <div className="w-11 h-11 rounded-2xl bg-[#F0F9FF] flex items-center justify-center shrink-0 overflow-hidden">
                    {room.photos?.[0] ? <img src={room.photos[0]} className="w-full h-full object-cover" /> : <Music className="w-5 h-5 text-[#0EA5E9]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black text-[#191F28] truncate">{room.roomName}</p>
                    <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-0.5 min-w-0">
                      <span className="truncate">{room.roomType}</span><span className="w-1 h-1 bg-[#D1D6DB] rounded-full shrink-0" /><span className="truncate">{room.applicantName}</span>
                    </div>
                    <p className="text-[11px] font-bold text-[#ADB5BD] mt-1">
                      신청일 {room.createdAt?.toDate?.() ? room.createdAt.toDate().toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 상세 검토 모달 */}
      {selectedRoom && editedRoom && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#191F28]/80 backdrop-blur-md" onClick={closeRoomModal}>
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-[#F2F4F6] p-6 flex items-center justify-between z-10">
              <div className="flex-1 min-w-0">
                {isEditMode ? (
                  <div className="flex flex-col gap-2">
                    <select name="roomType" value={editedRoom.roomType} onChange={handleEditChange} className="w-fit px-3 py-1.5 bg-[#F0F9FF] text-[#0EA5E9] rounded-full text-[12px] font-black outline-none border border-[#E5E8EB]">
                      {ROOM_TYPE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input name="roomName" value={editedRoom.roomName || ""} onChange={handleEditChange} className="text-[22px] font-black text-[#191F28] px-2 py-1 border border-[#E5E8EB] rounded-xl outline-none focus:border-[#0EA5E9]" />
                  </div>
                ) : (
                  <>
                    <span className="px-3 py-1 bg-[#F0F9FF] text-[#0EA5E9] rounded-full text-[12px] font-black">{selectedRoom.roomType}</span>
                    <h2 className="text-[22px] font-black text-[#191F28] mt-2">{selectedRoom.roomName}</h2>
                    <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      신청일자: {selectedRoom.createdAt?.toDate?.() ? selectedRoom.createdAt.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "-"}
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
                <button onClick={closeRoomModal} className="p-2 bg-[#F2F4F6] rounded-full hover:bg-[#E5E8EB] transition-all">
                  <X className="w-5 h-5 text-[#4E5968]" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">노출 방식</h3>
                <div className="bg-[#FAFAFB] rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {selectedRoom.track === "booking" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0EA5E9] text-white rounded-full text-[12px] font-black">
                          <Zap className="w-3 h-3" /> Track2 · 예약·결제 지원
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F2F4F6] text-[#4E5968] rounded-full text-[12px] font-black">
                          <Phone className="w-3 h-3" /> Track1 · 정보 제공
                        </span>
                      )}
                    </div>
                    {selectedRoom.track === "booking" ? (
                      <button
                        type="button"
                        onClick={() => handleSwitchTrack(selectedRoom.id, "info")}
                        className="px-3 py-1.5 bg-white border border-[#E5E8EB] text-[#4E5968] rounded-lg text-[12px] font-black hover:border-[#D1D6DB] transition-all"
                      >
                        Track1로 되돌리기
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSwitchTrack(selectedRoom.id, "booking")}
                        className="px-3 py-1.5 bg-[#0EA5E9] text-white rounded-lg text-[12px] font-black hover:bg-[#0284C7] transition-all"
                      >
                        Track2로 전환
                      </button>
                    )}
                  </div>
                  {selectedRoom.track !== "booking" && (
                    <p className="text-[12px] font-bold text-[#0EA5E9] leading-relaxed break-keep mt-3 pt-3 border-t border-[#F2F4F6]">
                      💡 Track2로 전환하면 "바로예약" 배지와 상단 노출이 즉시 적용돼요. 전환 후 첫 1~2개월은 수수료를 5%로 낮춰드려요.
                    </p>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest">공간 사진</h3>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="px-3 py-1.5 bg-[#F0F9FF] text-[#0EA5E9] rounded-lg text-[12px] font-black flex items-center gap-1 disabled:opacity-60"
                    >
                      <ImagePlus className="w-3.5 h-3.5" /> {photoUploading ? "업로드 중..." : "사진 추가"}
                    </button>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoFileChange} />
                </div>
                {/* photos[0]이 목록 카드/상세 화면의 대표 이미지로 그대로 쓰인다.
                    편집 모드에서는 카드를 드래그해서 순서를 바꿀 수 있고(그리드 줄바꿈과
                    무관하게 동작하는 HTML5 드래그 앤 드롭), 모바일처럼 드래그가 안 되는
                    환경을 위해 이전/다음 화살표 버튼도 같이 둔다. */}
                <div className="grid grid-cols-3 gap-2">
                  {(isEditMode ? editedRoom.photos : selectedRoom.photos)?.map((url: string, idx: number) => (
                    <div
                      key={url}
                      draggable={isEditMode}
                      onDragStart={() => setDraggedPhotoIndex(idx)}
                      onDragEnter={() => isEditMode && setOverPhotoIndex(idx)}
                      onDragOver={(e) => isEditMode && e.preventDefault()}
                      onDrop={(e) => {
                        if (!isEditMode) return;
                        e.preventDefault();
                        if (draggedPhotoIndex !== null && draggedPhotoIndex !== idx) reorderPhoto(draggedPhotoIndex, idx);
                        setDraggedPhotoIndex(null);
                        setOverPhotoIndex(null);
                      }}
                      onDragEnd={() => { setDraggedPhotoIndex(null); setOverPhotoIndex(null); }}
                      className={`relative aspect-video rounded-xl overflow-hidden bg-[#F2F4F6] transition-all ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""} ${overPhotoIndex === idx && draggedPhotoIndex !== null && draggedPhotoIndex !== idx ? "ring-2 ring-[#0EA5E9] ring-offset-2" : ""
                        } ${draggedPhotoIndex === idx ? "opacity-40" : ""}`}
                    >
                      <img src={url} className="w-full h-full object-cover" draggable={false} />

                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#0EA5E9] text-white text-[9px] font-black rounded-full shadow-md pointer-events-none">
                          대표 사진
                        </span>
                      )}

                      {isEditMode && (
                        <>
                          <div className="absolute bottom-1.5 left-1.5 p-1 bg-white/90 text-[#4E5968] rounded-full shadow-md" title="드래그해서 순서 변경">
                            <GripVertical className="w-2.5 h-2.5" />
                          </div>
                          <div className="absolute bottom-1.5 right-1.5 flex gap-0.5">
                            <button
                              type="button"
                              onClick={() => movePhoto(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 bg-white/90 text-[#4E5968] rounded-full shadow-md hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title="이전으로 이동"
                            >
                              <ChevronLeft className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePhoto(idx, 1)}
                              disabled={idx === editedRoom.photos.length - 1}
                              className="p-1 bg-white/90 text-[#4E5968] rounded-full shadow-md hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title="다음으로 이동"
                            >
                              <ChevronRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePhoto(url)}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">신청자 정보</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={Users} label="신청자 성함" name="applicantName" value={editedRoom.applicantName} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Phone} label="담당자 연락처" name="applicantContact" value={editedRoom.applicantContact} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Mail} label="안내 이메일" name="applicantEmail" value={editedRoom.applicantEmail} isEdit={isEditMode} onChange={handleEditChange} />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">공간 정보</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={MapPin} label="주소" name="address" value={editedRoom.address} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={MapPin} label="상세 주소" name="addressDetail" value={editedRoom.addressDetail} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Music} label="평수" name="pyeong" value={editedRoom.pyeong} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Users} label="수용인원" name="capacity" value={editedRoom.capacity} isEdit={isEditMode} onChange={handleEditChange} />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">장비·시설</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <MultiListRow
                    icon={Speaker}
                    label="보유 장비 체크리스트"
                    options={EQUIPMENT_CHECKLIST_OPTIONS}
                    value={editedRoom.equipmentChecklist}
                    isEdit={isEditMode}
                    onChange={(v: string[]) => setEditedRoom({ ...editedRoom, equipmentChecklist: v })}
                  />
                  <InfoRow icon={Speaker} label="싱어 마이크 개수" name="micCount" value={editedRoom.micCount} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Speaker} label="싱어 마이크 유선/무선" name="micType" value={editedRoom.micType} isEdit={isEditMode} onChange={handleEditChange} />
                  <ToggleRow icon={Speaker} label="방음시설 여부" value={editedRoom.hasSoundproof} isEdit={isEditMode} onChange={(v: boolean) => setEditedRoom({ ...editedRoom, hasSoundproof: v })} trueLabel="있음" falseLabel="없음" />
                  <ToggleRow icon={MapPinned} label="주차 가능 여부" value={editedRoom.hasParking} isEdit={isEditMode} onChange={(v: boolean) => setEditedRoom({ ...editedRoom, hasParking: v })} trueLabel="가능" falseLabel="불가능" />
                  {(isEditMode ? editedRoom.hasParking : selectedRoom.hasParking) && (
                    <InfoRow icon={MapPinned} label="주차 시설 정보" name="parkingInfo" value={editedRoom.parkingInfo} isEdit={isEditMode} onChange={handleEditChange} />
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">이용 안내</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={CreditCard} label="시간당 요금" name="hourlyRate" value={isEditMode ? editedRoom.hourlyRate : formatHourlyRate(selectedRoom.hourlyRate)} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Clock} label="최소 대여시간" name="minRentalHours" value={editedRoom.minRentalHours} isEdit={isEditMode} onChange={handleEditChange} />
                  <AvailabilityRow
                    isEdit={isEditMode}
                    days={editedRoom.availableDays}
                    startTime={editedRoom.availableStartTime}
                    endTime={editedRoom.availableEndTime}
                    onChangeDays={(v: string[]) => setEditedRoom({ ...editedRoom, availableDays: v })}
                    onChangeStartTime={(v: string) => setEditedRoom({ ...editedRoom, availableStartTime: v })}
                    onChangeEndTime={(v: string) => setEditedRoom({ ...editedRoom, availableEndTime: v })}
                  />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">소개 및 태그</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  {isEditMode ? (
                    <div className="p-4">
                      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">공간 소개 및 메모</p>
                      <textarea name="description" value={editedRoom.description || ""} onChange={handleEditChange} className="w-full min-h-[100px] p-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-medium outline-none focus:border-[#0EA5E9] resize-none" />
                    </div>
                  ) : (
                    <div className="p-4">
                      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">공간 소개 및 메모</p>
                      <p className="text-[14px] font-medium text-[#333D4B] leading-relaxed whitespace-pre-wrap break-words">{selectedRoom.description || "-"}</p>
                    </div>
                  )}
                  <InfoRow
                    icon={Tag}
                    label="태그 (쉼표로 구분)"
                    name="tags"
                    value={Array.isArray(editedRoom.tags) ? editedRoom.tags.join(", ") : (editedRoom.tags || "")}
                    isEdit={isEditMode}
                    onChange={(e: any) => setEditedRoom({ ...editedRoom, tags: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                  />
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#F2F4F6] p-6 flex gap-2">
              {isEditMode ? (
                <>
                  <button onClick={() => { setEditedRoom({ ...selectedRoom }); setIsEditMode(false); }} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                    취소
                  </button>
                  <button onClick={handleUpdate} className="flex-[2] py-4 bg-[#0EA5E9] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#0EA5E9]/10 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> 저장하기
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleDelete(selectedRoom.id)} className="p-4 bg-[#FFF0F0] text-[#F04452] rounded-2xl hover:bg-[#FFE0E0] transition-all active:scale-95">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  {selectedRoom.status !== "pending" && (
                    <button onClick={() => handleStatusChange(selectedRoom.id, "pending")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95">
                      <RotateCcw className="w-4 h-4" /> 대기로 되돌리기
                    </button>
                  )}
                  {selectedRoom.status !== "rejected" && (
                    <button onClick={() => handleStatusChange(selectedRoom.id, "rejected")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                      반려하기
                    </button>
                  )}
                  {selectedRoom.status !== "approved" && (
                    <button onClick={() => handleStatusChange(selectedRoom.id, "approved")} className="flex-[2] py-4 bg-[#0EA5E9] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#0EA5E9]/10 transition-all active:scale-95">
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
