import { useState, useEffect } from "react";
import { ScrollRestoration, useSearchParams } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Search, Compass, Users, MapPin,
  Phone, Mail, ClipboardCheck, CalendarCheck, MapPinned, CreditCard,
  Calendar, Trash2, X, RotateCcw, Edit3, Save, ShieldOff, ImagePlus,
  BarChart3, Megaphone, Church, Building2, ChevronLeft,
  Wind, Bed, Car, Bath, Volume2, Tag as TagIcon, Ban,
} from "lucide-react";
import { db, functions } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, arrayRemove, arrayUnion } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { uploadVenueImage } from "../lib/storage";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import { VenueScheduleModal } from "../components/admin/VenueScheduleModal";
import { VENUE_IMAGE_CATEGORIES, VenueImageCategoryKey, flattenVenueImages } from "../lib/missionVenueImageCategories";

const STORAGE_FOLDER_LABEL_FALLBACK = "mission-venue";

const CHURCH_SITUATION_OPTIONS = ["미자립교회", "농어촌교회", "개척교회", "소규모교회(30명 이하)", "다문화교회", "특별한 상황 없음"];
const DESIRED_SERVICE_OPTIONS = ["노방전도", "구제·봉사활동", "어린이·청소년 사역", "찬양·문화사역", "건축·시설보수", "교육·멘토링", "행정·사무지원"];

const InfoRow = ({ label, value, icon: Icon, isEdit, name, onChange, type = "text", multiline = false }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
    <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
      <Icon className="w-4 h-4 text-[#ADB5BD]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">{label}</p>
      {isEdit ? (
        multiline ? (
          <textarea
            name={name}
            value={value ?? ""}
            onChange={onChange}
            rows={10}
            className="w-full px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold focus:border-[#3182F6] outline-none transition-all resize-y min-h-[240px]"
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value ?? ""}
            onChange={onChange}
            className="w-full px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold focus:border-[#3182F6] outline-none transition-all"
          />
        )
      ) : (
        <p className="text-[15px] font-bold text-[#333D4B] leading-snug break-words whitespace-pre-wrap">{value || "-"}</p>
      )}
    </div>
  </div>
);

const ToggleRow = ({ label, icon: Icon, isEdit, value, onChange, onLabel = "있음", offLabel = "없음" }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
    <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
      <Icon className="w-4 h-4 text-[#ADB5BD]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">{label}</p>
      {isEdit ? (
        <div className="flex bg-[#F2F4F6] p-1 rounded-xl max-w-[220px]">
          {[onLabel, offLabel].map((opt) => (
            <button key={opt} type="button" onClick={() => onChange(opt === onLabel)} className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${value === (opt === onLabel) ? "bg-white text-[#3182F6] shadow-sm" : "text-[#8B95A1]"}`}>
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[15px] font-bold text-[#333D4B]">{value ? onLabel : offLabel}</p>
      )}
    </div>
  </div>
);

// 교회 사정/상황, 원하는 봉사/헌신 - 등록 폼(MissionVenueRegistrationForm.tsx)과 동일한
// 고정 체크박스 + 기타 직접입력 구조를 관리자 화면에서도 그대로 보여주고 수정할 수 있게 한다.
const CheckboxGroupRow = ({ label, icon: Icon, isEdit, options, values, other, onToggle, onOtherChange }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
    <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
      <Icon className="w-4 h-4 text-[#ADB5BD]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">{label}</p>
      {isEdit ? (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {options.map((opt: string) => {
              const selected = (values || []).includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onToggle(opt)}
                  className={`px-2.5 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${selected ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#8B95A1]"}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={other || ""}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="기타 (직접 입력)"
            className="w-full px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold outline-none focus:border-[#3182F6]"
          />
        </div>
      ) : (
        <p className="text-[15px] font-bold text-[#333D4B]">{[...(values || []), other].filter(Boolean).join(", ") || "-"}</p>
      )}
    </div>
  </div>
);

type MissionVenueTab = "pending" | "approved" | "rejected" | "schedule";
const VALID_TABS: MissionVenueTab[] = ["pending", "approved", "rejected", "schedule"];

export function AdminMissionVenues() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") as MissionVenueTab) ? (searchParams.get("tab") as MissionVenueTab) : "pending";
  const [activeTab, setActiveTabState] = useState<MissionVenueTab>(initialTab);
  const setActiveTab = (tab: MissionVenueTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  const [venues, setVenues] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedVenue, setEditedVenue] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<"info" | "photos">("info");
  const [uploadingCategory, setUploadingCategory] = useState<VenueImageCategoryKey | null>(null);
  const [scheduleVenueId, setScheduleVenueId] = useState<string | null>(null);

  const openVenueModal = (venue: any) => {
    setSelectedVenue(venue);
    setEditedVenue({ ...venue });
    setIsEditMode(false);
    setDetailTab("info");
  };

  const closeVenueModal = () => {
    setSelectedVenue(null);
    setEditedVenue(null);
    setIsEditMode(false);
    setDetailTab("info");
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedVenue((prev: any) => ({ ...prev, [name]: value }));
  };

  const toggleEditCheckbox = (field: "churchSituation" | "desiredService", option: string) => {
    setEditedVenue((prev: any) => {
      const current: string[] = prev[field] || [];
      return {
        ...prev,
        [field]: current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
      };
    });
  };

  const handleCategoryPhotoAdd = async (key: VenueImageCategoryKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const category = VENUE_IMAGE_CATEGORIES.find((c) => c.key === key)!;
    const current: string[] = editedVenue.imagesByCategory?.[key] || [];
    if (current.length + files.length > category.max) {
      alert(`"${category.label}"은(는) 최대 ${category.max}장까지 등록 가능합니다.`);
      return;
    }
    setUploadingCategory(key);
    try {
      const urls = await Promise.all(
        files.map((file) => uploadVenueImage(file, editedVenue.venueName || STORAGE_FOLDER_LABEL_FALLBACK, editedVenue.applicantName || "admin"))
      );
      setEditedVenue((prev: any) => ({
        ...prev,
        imagesByCategory: { ...(prev.imagesByCategory || {}), [key]: [...current, ...urls] },
      }));
    } catch (error) {
      console.error("사진 업로드 실패:", error);
      alert("사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleCategoryPhotoRemove = (key: VenueImageCategoryKey, url: string) => {
    setEditedVenue((prev: any) => ({
      ...prev,
      imagesByCategory: { ...(prev.imagesByCategory || {}), [key]: (prev.imagesByCategory?.[key] || []).filter((u: string) => u !== url) },
    }));
  };

  useEffect(() => {
    const q = query(collection(db, "missionVenues"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVenues(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setSuspendedCount(snap.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => unsubUsers();
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  const pendingCount = venues.filter((v) => v.status === "pending").length;
  const approvedCount = venues.filter((v) => v.status === "approved").length;
  const rejectedCount = venues.filter((v) => v.status === "rejected").length;
  const approvedVenues = venues.filter((v) => v.status === "approved");

  const filteredVenues = venues
    .filter((v) => v.status === activeTab)
    .filter((v) => !searchQuery.trim() || (v.venueName || "").includes(searchQuery) || (v.applicantName || "").includes(searchQuery));

  const scheduleFilteredVenues = approvedVenues.filter((v) => !searchQuery.trim() || (v.venueName || "").includes(searchQuery));
  const scheduleVenue = approvedVenues.find((v) => v.id === scheduleVenueId) || null;

  const handleToggleBlockedDate = async (venueId: string, dateStr: string, isCurrentlyBlocked: boolean) => {
    try {
      await updateDoc(doc(db, "missionVenues", venueId), {
        blockedDates: isCurrentlyBlocked ? arrayRemove(dateStr) : arrayUnion(dateStr),
      });
    } catch (error) {
      console.error("일정 차단 처리 실패:", error);
    }
  };

  const handleStatusChange = async (id: string, newStatus: MissionVenueTab) => {
    try {
      await updateDoc(doc(db, "missionVenues", id), { status: newStatus });
      closeVenueModal();
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 신청 내역을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
    try {
      await deleteDoc(doc(db, "missionVenues", id));
      closeVenueModal();
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = async () => {
    try {
      const { id, ...rest } = editedVenue;
      const imagesByCategory = rest.imagesByCategory || {};
      const images = flattenVenueImages(imagesByCategory);
      const updateData = { ...rest, imagesByCategory, images };
      await updateDoc(doc(db, "missionVenues", selectedVenue.id), updateData);
      setSelectedVenue({ ...selectedVenue, ...updateData });
      setEditedVenue({ ...selectedVenue, ...updateData });
      setIsEditMode(false);
      alert("수정 내용이 저장되었습니다.");
    } catch (error) {
      console.error("국내 선교 장소 정보 수정 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <AdminSidebarLayout
      brandSubtitle="국내 선교 관리자"
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
            { id: "v_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/venues?tab=pending" },
            { id: "v_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/venues?tab=approved" },
            { id: "v_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/venues?tab=rejected" },
            { id: "v_schedule", label: "장소별 일정관리", icon: Calendar, href: "/admin/venues?tab=schedule" },
            { id: "v_blockrequests", label: "차단 신청 승인", icon: Ban, accentColor: "#F04452", href: "/admin/venues?tab=blockRequests" },
          ],
        },
        {
          label: "국내선교 관리",
          items: [
            { id: "pending", label: "검토 대기", count: pendingCount, icon: Clock, accentColor: "#FF9500" },
            { id: "approved", label: "승인 완료", count: approvedCount, icon: CheckCircle },
            { id: "rejected", label: "반려 / 삭제", count: rejectedCount, icon: XCircle },
            { id: "schedule", label: "장소별 일정관리", icon: Calendar },
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
          label: "차량 대여 관리",
          items: [
            { id: "vh_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/vehicles?tab=pending" },
            { id: "vh_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/vehicles?tab=approved" },
            { id: "vh_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/vehicles?tab=rejected" },
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
          label: "음향 시공 관리",
          items: [
            { id: "sc_requests", label: "시공 문의 목록", icon: Volume2, href: "/admin/sound-construction" },
          ],
        },
      ]}
      activeId={activeTab}
      onSelect={(id) => { closeVenueModal(); setActiveTab(id as MissionVenueTab); }}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />

        <main className="max-w-[1300px] px-6 md:px-10 py-6 md:py-8">
          {selectedVenue && editedVenue ? (
            <div className="bg-white rounded-[32px] shadow-sm">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-[#F2F4F6] p-6 flex items-center justify-between z-10 rounded-t-[32px]">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button onClick={closeVenueModal} className="p-2 -ml-2 hover:bg-[#F2F4F6] rounded-full transition-all shrink-0" title="목록으로">
                    <ChevronLeft className="w-5 h-5 text-[#4E5968]" />
                  </button>
                  <div className="flex-1 min-w-0">
                    {isEditMode ? (
                      <input name="venueName" value={editedVenue.venueName || ""} onChange={handleEditChange} className="text-[22px] font-black text-[#191F28] px-2 py-1 border border-[#E5E8EB] rounded-xl outline-none focus:border-[#3182F6]" />
                    ) : (
                      <>
                        <span className="px-3 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-full text-[12px] font-black">{selectedVenue.denomination || "교단 미입력"}</span>
                        <h2 className="text-[22px] font-black text-[#191F28] mt-2">{selectedVenue.venueName}</h2>
                        <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          신청일자: {selectedVenue.createdAt?.toDate?.() ? selectedVenue.createdAt.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "-"}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isEditMode && (
                    <button onClick={() => setIsEditMode(true)} className="p-2 bg-[#F2F4F6] rounded-full hover:bg-[#E5E8EB] transition-all" title="수정하기">
                      <Edit3 className="w-5 h-5 text-[#4E5968]" />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 pt-4">
                <div className="flex bg-[#F2F4F6] p-1.5 rounded-[18px] w-full max-w-xs">
                  {[
                    { id: "info", label: "기본 정보" },
                    { id: "photos", label: "사진" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id as "info" | "photos")}
                      className={`flex-1 py-2 rounded-[14px] text-[13px] font-bold transition-all ${detailTab === tab.id ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684]"}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {detailTab === "info" && (
                <div className="p-6 space-y-6">
                  <section className="space-y-2">
                    <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">신청자 정보</h3>
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <InfoRow icon={Users} label="신청자 이름" name="applicantName" value={editedVenue.applicantName} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Phone} label="신청자 연락처" name="applicantContact" value={editedVenue.applicantContact} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Mail} label="안내 이메일" name="applicantEmail" value={editedVenue.applicantEmail} isEdit={isEditMode} onChange={handleEditChange} />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">장소 기본 정보</h3>
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <InfoRow icon={Compass} label="장소 이름 (교회명/센터명)" name="venueName" value={editedVenue.venueName} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Church} label="소속 교단" name="denomination" value={editedVenue.denomination} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={MapPin} label="위치" name="location" value={editedVenue.location} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={MapPin} label="상세 주소" name="addressDetail" value={editedVenue.addressDetail} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Users} label="최대 수용 인원" name="capacity" type="number" value={editedVenue.capacity} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Phone} label="대표 전화번호 (공개)" name="contactPhone" value={editedVenue.contactPhone} isEdit={isEditMode} onChange={handleEditChange} />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">시설 정보</h3>
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <ToggleRow icon={Wind} label="냉방 시설" isEdit={isEditMode} value={editedVenue.airConditioner} onLabel="있음" offLabel="없음" onChange={(v: boolean) => setEditedVenue({ ...editedVenue, airConditioner: v })} />
                      <ToggleRow icon={Bed} label="침구류" isEdit={isEditMode} value={editedVenue.beddingAvailable} onLabel="보유" offLabel="미보유" onChange={(v: boolean) => setEditedVenue({ ...editedVenue, beddingAvailable: v })} />
                      <InfoRow icon={Car} label="주차 시설" name="parkingCapacity" value={editedVenue.parkingCapacity} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Bath} label="샤워실/화장실" name="showerBathroom" value={editedVenue.showerBathroom} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Volume2} label="야간 소음/민원 주의사항" name="nightEventLimit" value={editedVenue.nightEventLimit} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Building2} label="주강당 면적" name="hallSize" value={editedVenue.hallSize} isEdit={isEditMode} onChange={handleEditChange} />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">소개 및 태그</h3>
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <InfoRow icon={Compass} label="공간 소개 및 메모" name="description" value={editedVenue.description} isEdit={isEditMode} onChange={handleEditChange} multiline />
                      <InfoRow icon={TagIcon} label="태그" name="tags" value={Array.isArray(editedVenue.tags) ? editedVenue.tags.join(", ") : editedVenue.tags} isEdit={false} />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">국내 선교지 소개</h3>
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <CheckboxGroupRow
                        icon={Compass}
                        label="교회의 전반적인 사정이나 상황"
                        isEdit={isEditMode}
                        options={CHURCH_SITUATION_OPTIONS}
                        values={editedVenue.churchSituation}
                        other={editedVenue.churchSituationOther}
                        onToggle={(opt: string) => toggleEditCheckbox("churchSituation", opt)}
                        onOtherChange={(v: string) => setEditedVenue({ ...editedVenue, churchSituationOther: v })}
                      />
                      <CheckboxGroupRow
                        icon={Compass}
                        label="원하는 봉사나 헌신"
                        isEdit={isEditMode}
                        options={DESIRED_SERVICE_OPTIONS}
                        values={editedVenue.desiredService}
                        other={editedVenue.desiredServiceOther}
                        onToggle={(opt: string) => toggleEditCheckbox("desiredService", opt)}
                        onOtherChange={(v: string) => setEditedVenue({ ...editedVenue, desiredServiceOther: v })}
                      />
                    </div>
                  </section>
                </div>
              )}

              {detailTab === "photos" && (
                <div className="p-6 space-y-6">
                  {VENUE_IMAGE_CATEGORIES.map((category) => {
                    const photos: string[] = editedVenue.imagesByCategory?.[category.key] || [];
                    const isUploading = uploadingCategory === category.key;
                    return (
                      <section key={category.key} className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest">{category.label} ({photos.length}/{category.max})</h3>
                          {isEditMode && photos.length < category.max && (
                            <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F0F7FF] text-[#3182F6] rounded-lg text-[12px] font-black cursor-pointer">
                              <ImagePlus className="w-3.5 h-3.5" /> {isUploading ? "업로드 중..." : "사진 추가"}
                              <input type="file" accept="image/*" multiple className="hidden" disabled={isUploading} onChange={(e) => handleCategoryPhotoAdd(category.key, e)} />
                            </label>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {photos.map((url) => (
                            <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-[#F2F4F6]">
                              <img src={url} className="w-full h-full object-cover" />
                              {isEditMode && (
                                <button type="button" onClick={() => handleCategoryPhotoRemove(category.key, url)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          {photos.length === 0 && (
                            <div className="col-span-4 py-4 text-center text-[13px] font-bold text-[#ADB5BD]">등록된 사진이 없어요</div>
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}

              <div className="sticky bottom-0 bg-white border-t border-[#F2F4F6] p-6 flex gap-2 rounded-b-[32px]">
                {isEditMode ? (
                  <>
                    <button onClick={() => { setEditedVenue({ ...selectedVenue }); setIsEditMode(false); }} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                      취소
                    </button>
                    <button onClick={handleUpdate} disabled={uploadingCategory !== null} className="flex-[2] py-4 bg-[#3182F6] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#3182F6]/10 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
                      <Save className="w-4 h-4" /> 저장하기
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleDelete(selectedVenue.id)} className="p-4 bg-[#FFF0F0] text-[#F04452] rounded-2xl hover:bg-[#FFE0E0] transition-all active:scale-95">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {selectedVenue.status !== "pending" && (
                      <button onClick={() => handleStatusChange(selectedVenue.id, "pending")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95">
                        <RotateCcw className="w-4 h-4" /> 대기로 되돌리기
                      </button>
                    )}
                    {selectedVenue.status !== "rejected" && (
                      <button onClick={() => handleStatusChange(selectedVenue.id, "rejected")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                        반려하기
                      </button>
                    )}
                    {selectedVenue.status !== "approved" && (
                      <button onClick={() => handleStatusChange(selectedVenue.id, "approved")} className="flex-[2] py-4 bg-[#3182F6] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#3182F6]/10 transition-all active:scale-95">
                        승인하기
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex md:hidden bg-[#E5E8EB] p-1.5 rounded-[18px] w-full mb-5 overflow-x-auto">
                {[
                  { id: "pending", label: `대기 ${pendingCount}` },
                  { id: "approved", label: `승인 ${approvedCount}` },
                  { id: "rejected", label: `반려 ${rejectedCount}` },
                  { id: "schedule", label: "일정관리" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as MissionVenueTab)}
                    className={`flex-none px-4 py-2.5 rounded-[14px] text-[13px] font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684]"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mb-5">
                <h1 className="text-[22px] md:text-[26px] font-black tracking-tight leading-tight mb-1">국내 선교 장소 관리</h1>
                <p className="text-[#4E5968] font-bold text-[13px] md:text-[14px]">국내 선교 장소 등록 신청을 검토하고 승인하세요.</p>
              </div>

              <div className="relative mb-5 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === "schedule" ? "장소 이름으로 검색" : "장소명 또는 신청자명으로 검색"}
                  className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#3182F6] transition-all"
                />
              </div>

              {activeTab === "schedule" ? (
                loading ? (
                  <div className="py-32 flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#3182F6] rounded-full animate-spin" />
                  </div>
                ) : scheduleFilteredVenues.length === 0 ? (
                  <div className="py-24 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
                    <p className="text-[16px] font-black text-[#8B95A1]">승인된 장소가 없어요</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scheduleFilteredVenues.map((venue) => {
                      const blockedCount = (venue.blockedDates || []).length;
                      return (
                        <div key={venue.id} className="bg-white p-5 rounded-2xl border border-[#F2F4F6] shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col gap-4">
                          <div className="flex items-start justify-between gap-2">
                            <span className="px-2.5 py-1 bg-[#EFF6FF] text-[#2563EB] rounded-full text-[11px] font-black shrink-0">예약 가능</span>
                            <span className="text-[11px] font-bold text-[#ADB5BD] truncate">{venue.denomination}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-[#F2F4F6] overflow-hidden flex items-center justify-center shrink-0">
                              {venue.images?.[0] ? <img src={venue.images[0]} className="w-full h-full object-cover" /> : <Compass className="w-5 h-5 text-[#8B95A1]" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[15px] font-black text-[#191F28] truncate">{venue.venueName}</p>
                              <div className="flex items-center gap-1 text-[12px] font-bold text-[#8B95A1]">
                                <MapPin className="w-3 h-3 text-[#3182F6] shrink-0" />
                                <span className="truncate">{venue.location}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between px-1 py-2 border-t border-[#F2F4F6]">
                            <span className="text-[12px] font-bold text-[#8B95A1]">차단된 날짜</span>
                            <span className="text-[13px] font-black text-[#F04452]">{blockedCount}일 선택됨</span>
                          </div>
                          <button
                            onClick={() => setScheduleVenueId(venue.id)}
                            className="w-full py-3 bg-[#3182F6] text-white rounded-xl font-bold text-[13px] hover:bg-[#1B64DA] transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Calendar className="w-4 h-4" /> 일정 관리
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : loading ? (
                <div className="py-32 flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#3182F6] rounded-full animate-spin" />
                  <p className="text-[14px] font-bold text-[#8B95A1]">목록을 불러오고 있어요</p>
                </div>
              ) : filteredVenues.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
                  <p className="text-[16px] font-black text-[#8B95A1]">해당하는 신청이 없어요</p>
                </div>
              ) : (
                <div className="bg-white rounded-[24px] border border-[#F2F4F6] overflow-hidden divide-y divide-[#F2F4F6]">
                  {filteredVenues.map((venue) => (
                    <div key={venue.id} onClick={() => openVenueModal(venue)} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFB] transition-colors cursor-pointer">
                      <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] flex items-center justify-center shrink-0 overflow-hidden">
                        {venue.images?.[0] ? <img src={venue.images[0]} className="w-full h-full object-cover" /> : <Compass className="w-5 h-5 text-[#2563EB]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-black text-[#191F28] truncate">{venue.venueName}</p>
                        <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-0.5 min-w-0">
                          <span className="truncate">{venue.location || "위치 미입력"}</span><span className="w-1 h-1 bg-[#D1D6DB] rounded-full shrink-0" /><span className="truncate">{venue.applicantName}</span>
                        </div>
                        <p className="text-[11px] font-bold text-[#ADB5BD] mt-1">
                          신청일 {venue.createdAt?.toDate?.() ? venue.createdAt.toDate().toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {scheduleVenue && (
        <VenueScheduleModal
          venue={scheduleVenue}
          onToggleDate={(dateStr, isCurrentlyBlocked) => handleToggleBlockedDate(scheduleVenue.id, dateStr, isCurrentlyBlocked)}
          onClose={() => setScheduleVenueId(null)}
        />
      )}
    </AdminSidebarLayout>
  );
}
