import { useState, useEffect, useRef } from "react";
import { ScrollRestoration, useSearchParams } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Search, Gift, Users,
  Phone, ClipboardCheck, CalendarCheck, MapPinned, CreditCard,
  Calendar, Trash2, X, RotateCcw, Edit3, Save, ShieldOff, ImagePlus,
  BarChart3, Megaphone, Tag, Banknote, FileText, MessageCircle, Building2, Link2,
  Plus, ChevronLeft, Download,
} from "lucide-react";
import { db, functions } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { uploadPartnerImage } from "../lib/storage";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import { TagEditor } from "../components/TagEditor";

const MAX_GOODS_PHOTOS = 3;
const GOODS_STORAGE_FOLDER = "goods-store";
const SUGGESTED_ITEM_TAGS = [
  "단체티", "후드/맨투맨", "에코백", "스티커/뱃지", "우산", "텀블러", "명찰/랜야드", "인쇄물(현수막·배너)",
];

interface ProductItem {
  id: string;
  name: string;
  price: string | number;
  description: string;
  photo: string;
}

const emptyProduct = (): ProductItem => ({
  id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`,
  name: "",
  price: "",
  description: "",
  photo: "",
});

const InfoRow = ({ label, value, icon: Icon, isEdit, name, onChange, type = "text" }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
    <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
      <Icon className="w-4 h-4 text-[#ADB5BD]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">{label}</p>
      {isEdit ? (
        type === "textarea" ? (
          <textarea
            name={name}
            value={value || ""}
            onChange={onChange}
            className="w-full min-h-[100px] px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-medium focus:border-[#3182F6] outline-none transition-all resize-none"
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value || ""}
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

// [취급 품목 태그] 자유 입력형 태그 - 등록 폼과 동일한 TagEditor를 그대로 재사용
const TagsRow = ({ isEdit, value, onChange }: any) => {
  const tags: string[] = Array.isArray(value) ? value : [];
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
        <Tag className="w-4 h-4 text-[#ADB5BD]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">취급 품목</p>
        {isEdit ? (
          <TagEditor tags={tags} onChange={onChange} suggestedTags={SUGGESTED_ITEM_TAGS} />
        ) : tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="px-2.5 py-1 bg-[#F2F4F6] text-[#4E5968] rounded-full text-[12px] font-bold">#{tag}</span>
            ))}
          </div>
        ) : (
          <p className="text-[15px] font-bold text-[#333D4B]">-</p>
        )}
      </div>
    </div>
  );
};

type GoodsTab = "pending" | "approved" | "rejected";
const VALID_TABS: GoodsTab[] = ["pending", "approved", "rejected"];

export function AdminGoodsStore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") as GoodsTab) ? (searchParams.get("tab") as GoodsTab) : "pending";
  const [activeTab, setActiveTabState] = useState<GoodsTab>(initialTab);
  const setActiveTab = (tab: GoodsTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  const [goodsList, setGoodsList] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [churches, setChurches] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGoods, setSelectedGoods] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "products">("info");
  const [editedGoods, setEditedGoods] = useState<any>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [productPhotoUploadingId, setProductPhotoUploadingId] = useState<string | null>(null);
  const [photoReplacingIdx, setPhotoReplacingIdx] = useState<number | null>(null);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const remainingSlots = MAX_GOODS_PHOTOS - (editedGoods.photos?.length || 0);
    if (remainingSlots <= 0) return;
    setPhotoUploading(true);
    try {
      const urls = await Promise.all(
        files.slice(0, remainingSlots).map((file) => uploadPartnerImage(file, GOODS_STORAGE_FOLDER, editedGoods.businessName, editedGoods.applicantName))
      );
      setEditedGoods((prev: any) => ({ ...prev, photos: [...(prev.photos || []), ...urls] }));
    } catch (error) {
      console.error("사진 업로드 실패:", error);
      alert("사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    setEditedGoods((prev: any) => ({ ...prev, photos: (prev.photos || []).filter((p: string) => p !== url) }));
  };

  // Storage 이미지를 실제로 "다운로드"시킨다. <a download>는 다른 도메인(Storage) 파일에는
  // 브라우저가 무시하고 그냥 열어버리는 경우가 많아서, fetch로 blob을 받아 강제로 내려받게
  // 하고, CORS 등으로 실패하면 새 탭으로 열어서 최소한 수동 저장은 가능하게 폴백한다.
  const downloadImage = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("이미지 요청 실패");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("이미지 다운로드 실패, 새 탭으로 엽니다:", error);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // 대표/카탈로그 사진을 삭제 후 재추가하지 않고 "그 자리에서" 바로 교체할 수 있게 한다 -
  // 삭제 후 새로 추가하면 배열 맨 뒤에 붙어서 순서(=대표 이미지 여부)가 바뀌어버리는 문제가 있었다.
  const replacePhotoAt = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoReplacingIdx(idx);
    try {
      const url = await uploadPartnerImage(file, GOODS_STORAGE_FOLDER, editedGoods.businessName, editedGoods.applicantName);
      setEditedGoods((prev: any) => ({
        ...prev,
        photos: (prev.photos || []).map((p: string, i: number) => (i === idx ? url : p)),
      }));
    } catch (error) {
      console.error("사진 교체 실패:", error);
      alert("사진 교체 중 오류가 발생했습니다.");
    } finally {
      setPhotoReplacingIdx(null);
    }
  };

  const addProduct = () => {
    setEditedGoods((prev: any) => ({ ...prev, products: [...(prev.products || []), emptyProduct()] }));
  };

  const updateProduct = (id: string, field: "name" | "price" | "description", value: string) => {
    setEditedGoods((prev: any) => ({
      ...prev,
      products: (prev.products || []).map((p: ProductItem) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  };

  const removeProduct = (id: string) => {
    setEditedGoods((prev: any) => ({ ...prev, products: (prev.products || []).filter((p: ProductItem) => p.id !== id) }));
  };

  const handleProductPhotoChange = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProductPhotoUploadingId(id);
    try {
      const url = await uploadPartnerImage(file, GOODS_STORAGE_FOLDER, editedGoods.businessName, editedGoods.applicantName);
      setEditedGoods((prev: any) => ({
        ...prev,
        products: (prev.products || []).map((p: ProductItem) => (p.id === id ? { ...p, photo: url } : p)),
      }));
    } catch (error) {
      console.error("상품 사진 업로드 실패:", error);
      alert("상품 사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setProductPhotoUploadingId(null);
    }
  };

  const openGoodsModal = (goods: any) => {
    setSelectedGoods(goods);
    setEditedGoods({ ...goods });
    setIsEditMode(false);
    setDetailTab("info");
  };

  const closeGoodsModal = () => {
    setSelectedGoods(null);
    setEditedGoods(null);
    setIsEditMode(false);
    setDetailTab("info");
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedGoods((prev: any) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const q = query(collection(db, "goodsStore"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGoodsList(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubVenues = onSnapshot(collection(db, "venues"), (snap) => setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubTeams = onSnapshot(collection(db, "ministryTeams"), (snap) => setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubChurches = onSnapshot(collection(db, "churches"), (snap) => setChurches(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setSuspendedCount(snap.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => { unsubVenues(); unsubBookings(); unsubTeams(); unsubChurches(); unsubUsers(); };
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  const pendingCount = goodsList.filter((g) => g.status === "pending").length;
  const approvedCount = goodsList.filter((g) => g.status === "approved").length;
  const rejectedCount = goodsList.filter((g) => g.status === "rejected").length;
  const teamPendingCount = teams.filter((t) => t.status === "pending").length;
  const churchPendingCount = churches.filter((c) => c.status === "pending").length;

  const filteredGoods = goodsList
    .filter((g) => g.status === activeTab)
    .filter((g) => !searchQuery.trim() || (g.businessName || "").includes(searchQuery) || (g.applicantName || "").includes(searchQuery));

  const handleStatusChange = async (id: string, newStatus: GoodsTab) => {
    try {
      await updateDoc(doc(db, "goodsStore", id), { status: newStatus });

      if (newStatus === "approved" && selectedGoods) {
        const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
        await triggerAdminNotification({
          type: "GOODS_APPROVE",
          payload: {
            businessName: selectedGoods.businessName,
            applicantName: selectedGoods.applicantName,
          },
        });
      }

      closeGoodsModal();
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 신청 내역을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
    try {
      await deleteDoc(doc(db, "goodsStore", id));
      closeGoodsModal();
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = async () => {
    try {
      const { id, ...rest } = editedGoods;
      const payload = {
        ...rest,
        minPrice: Number(rest.minPrice) || 0,
        products: (rest.products || []).map((p: ProductItem) => ({ ...p, price: Number(p.price) || 0 })),
      };
      await updateDoc(doc(db, "goodsStore", selectedGoods.id), payload);
      setSelectedGoods({ ...selectedGoods, ...payload });
      setEditedGoods({ ...selectedGoods, ...payload });
      setIsEditMode(false);
      alert("수정 내용이 저장되었습니다.");
    } catch (error) {
      console.error("굿즈 업체 정보 수정 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <AdminSidebarLayout
      brandSubtitle="굿즈 관리자"
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
            { id: "c_pending", label: "검토 대기", count: churchPendingCount, icon: Clock, accentColor: "#FF9500", href: "/admin/churches?tab=pending" },
            { id: "c_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/churches?tab=approved" },
            { id: "c_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/churches?tab=rejected" },
          ],
        },
        {
          label: "굿즈 관리",
          items: [
            { id: "pending", label: "검토 대기", count: pendingCount, icon: Clock, accentColor: "#FF9500" },
            { id: "approved", label: "승인 완료", count: approvedCount, icon: CheckCircle },
            { id: "rejected", label: "반려 / 삭제", count: rejectedCount, icon: XCircle },
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
      onSelect={(id) => setActiveTab(id as GoodsTab)}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />

        <main className="max-w-[1300px] px-6 md:px-10 py-6 md:py-8">
          {selectedGoods && editedGoods ? (
            <div className="bg-white rounded-[24px] border border-[#F2F4F6] overflow-hidden">
              <div className="border-b border-[#F2F4F6] p-6 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <button onClick={closeGoodsModal} className="flex items-center gap-1 text-[#8B95A1] hover:text-[#191F28] font-bold text-[13px] mb-3 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> 목록으로
                  </button>
                  {isEditMode ? (
                    <input name="businessName" value={editedGoods.businessName || ""} onChange={handleEditChange} className="text-[22px] font-black text-[#191F28] px-2 py-1 border border-[#E5E8EB] rounded-xl outline-none focus:border-[#3182F6]" />
                  ) : (
                    <>
                      <span className="px-3 py-1 bg-[#F0F7FF] text-[#3182F6] rounded-full text-[12px] font-black">굿즈 매장</span>
                      <h2 className="text-[22px] font-black text-[#191F28] mt-2">{selectedGoods.businessName}</h2>
                      <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        신청일자: {selectedGoods.createdAt?.toDate?.() ? selectedGoods.createdAt.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "-"}
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
                </div>
              </div>

              <div className="px-6 pt-5">
                <div className="flex bg-[#F2F4F6] p-1.5 rounded-[18px] w-full max-w-sm">
                  <button
                    onClick={() => setDetailTab("info")}
                    className={`flex-1 py-2.5 rounded-[14px] text-[13px] font-bold transition-all ${detailTab === "info" ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684] hover:text-[#4E5968]"}`}
                  >
                    기본 정보
                  </button>
                  <button
                    onClick={() => setDetailTab("products")}
                    className={`flex-1 py-2.5 rounded-[14px] text-[13px] font-bold transition-all ${detailTab === "products" ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684] hover:text-[#4E5968]"}`}
                  >
                    상품 관리{Array.isArray(selectedGoods.products) && selectedGoods.products.length > 0 ? ` (${selectedGoods.products.length})` : ""}
                  </button>
                </div>
              </div>

              {detailTab === "info" && (
              <div className="p-6 space-y-6">
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest">대표/카탈로그 사진 (최대 {MAX_GOODS_PHOTOS}장, 첫 장이 대표)</h3>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading || (editedGoods.photos?.length || 0) >= MAX_GOODS_PHOTOS}
                      className="px-3 py-1.5 bg-[#F0F7FF] text-[#3182F6] rounded-lg text-[12px] font-black flex items-center gap-1 disabled:opacity-60"
                    >
                      <ImagePlus className="w-3.5 h-3.5" /> {photoUploading ? "업로드 중..." : "사진 추가"}
                    </button>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoFileChange} />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(isEditMode ? editedGoods.photos : selectedGoods.photos)?.map((url: string, idx: number) => (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-[#F2F4F6]">
                      <img src={url} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#3182F6] text-white text-[9px] font-black rounded-full pointer-events-none">대표</span>
                      )}
                      {photoReplacingIdx === idx && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-white">교체중...</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => downloadImage(url, `${selectedGoods.businessName || "goods"}_photo_${idx + 1}.jpg`)}
                        className="absolute bottom-1 left-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all"
                        title="다운로드"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      {isEditMode && (
                        <>
                          <button
                            type="button"
                            onClick={() => removePhoto(url)}
                            className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {/* 삭제 후 재추가하면 맨 뒤에 붙어 순서가 바뀌므로, 같은 자리에서
                              바로 교체할 수 있는 버튼을 따로 둔다. */}
                          <label className="absolute bottom-1 right-1 p-1 bg-[#191F28] text-white rounded-full shadow-md hover:bg-black transition-all cursor-pointer">
                            <ImagePlus className="w-3 h-3" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => replacePhotoAt(idx, e)} disabled={photoReplacingIdx === idx} />
                          </label>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">신청자 정보</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={Users} label="신청자 이름" name="applicantName" value={editedGoods.applicantName} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Phone} label="신청자 연락처" name="applicantContact" value={editedGoods.applicantContact} isEdit={isEditMode} onChange={handleEditChange} />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">업체 정보</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={Building2} label="업체명(상호)" name="businessName" value={editedGoods.businessName} isEdit={isEditMode} onChange={handleEditChange} />
                  <TagsRow value={editedGoods.itemTags} isEdit={isEditMode} onChange={(v: string[]) => setEditedGoods({ ...editedGoods, itemTags: v })} />
                  <InfoRow icon={Link2} label="온라인 주문 제작 URL" name="onlineStoreUrl" value={editedGoods.onlineStoreUrl} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Banknote} label="개당 최소 가격(원)" name="minPrice" type="number" value={editedGoods.minPrice} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Building2} label="사업자등록번호" name="businessRegistrationNumber" value={editedGoods.businessRegistrationNumber} isEdit={isEditMode} onChange={handleEditChange} />
                </div>
              </section>

              </div>
              )}

              {detailTab === "products" && (
              <div className="p-6 space-y-6">
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest">상품 목록 (상세 페이지에 카드로 노출)</h3>
                  {isEditMode && (
                    <button type="button" onClick={addProduct} className="px-3 py-1.5 bg-[#F0F7FF] text-[#3182F6] rounded-lg text-[12px] font-black flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> 상품 추가
                    </button>
                  )}
                </div>
                {isEditMode && (
                  <p className="text-[11px] font-bold text-[#B0B8C1] px-1">카드에는 16:9 비율로 표시돼요. 가로가 긴 사진(예: 1200x675)을 올리면 안 잘려요.</p>
                )}
                {isEditMode ? (
                  <div className="space-y-2">
                    {(editedGoods.products || []).map((product: ProductItem) => (
                      <div key={product.id} className="flex gap-3 p-3 bg-[#FAFAFB] rounded-2xl border border-[#F2F4F6]">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white border border-[#E5E8EB] shrink-0">
                          {product.photo ? (
                            <img src={product.photo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#ADB5BD]">
                              <ImagePlus className="w-4 h-4" />
                            </div>
                          )}
                          {/* 사진 업로드 중에는 (기존 사진이 있어도) 이렇게 오버레이로 표시해야
                              "업로드 끝나기 전에 저장하기를 눌러서 두 번째 사진 변경이 통째로
                              날아가는" 문제를 막을 수 있다. */}
                          {productPhotoUploadingId === product.id && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-[9px] font-bold text-white">업로드중...</span>
                            </div>
                          )}
                          {/* 항상 보이는 교체 버튼 - hover에만 의존하면 모바일/터치에서 클릭할 방법이
                              없어서 사진을 못 바꾸는 것처럼 보였다. */}
                          <label className="absolute bottom-1 right-1 p-1.5 bg-[#191F28] text-white rounded-full shadow-md hover:bg-black transition-all cursor-pointer">
                            <ImagePlus className="w-3 h-3" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProductPhotoChange(product.id, e)} disabled={productPhotoUploadingId === product.id} />
                          </label>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex gap-1.5">
                            <input
                              value={product.name}
                              onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                              placeholder="상품명"
                              className="flex-1 px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded-lg text-[13px] font-bold outline-none focus:border-[#3182F6]"
                            />
                            <input
                              value={product.price}
                              onChange={(e) => updateProduct(product.id, "price", e.target.value.replace(/[^0-9]/g, ""))}
                              placeholder="가격"
                              inputMode="numeric"
                              className="w-24 px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded-lg text-[13px] font-bold outline-none focus:border-[#3182F6]"
                            />
                          </div>
                          <input
                            value={product.description}
                            onChange={(e) => updateProduct(product.id, "description", e.target.value)}
                            placeholder="간단 설명 (선택)"
                            className="w-full px-2.5 py-1.5 bg-white border border-[#E5E8EB] rounded-lg text-[12px] font-medium outline-none focus:border-[#3182F6]"
                          />
                        </div>
                        <button type="button" onClick={() => removeProduct(product.id)} className="shrink-0 p-1.5 text-[#ADB5BD] hover:text-[#F04452] transition-colors self-start">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(editedGoods.products || []).length === 0 && (
                      <p className="text-[13px] font-bold text-[#ADB5BD] px-1">등록된 상품이 없어요. "상품 추가"를 눌러 등록하세요.</p>
                    )}
                  </div>
                ) : (selectedGoods.products || []).length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedGoods.products.map((product: ProductItem) => (
                      <div key={product.id} className="bg-[#FAFAFB] rounded-xl overflow-hidden border border-[#F2F4F6]">
                        <div className="relative aspect-square bg-white">
                          {product.photo ? (
                            <>
                              <img src={product.photo} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => downloadImage(product.photo, `${product.name || "product"}.jpg`)}
                                className="absolute bottom-1 left-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all"
                                title="다운로드"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Gift className="w-5 h-5 text-[#D1D6DB]" /></div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-[12px] font-black text-[#191F28] truncate">{product.name || "이름 없음"}</p>
                          <p className="text-[11px] font-bold text-[#3182F6]">{product.price ? `${Number(product.price).toLocaleString()}원` : "-"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[15px] font-bold text-[#333D4B] px-1">등록된 상품이 없어요.</p>
                )}
              </section>
              </div>
              )}

              {detailTab === "info" && (
              <div className="p-6 pt-0 space-y-6">
              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">업체 소개</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={Gift} label="한줄 소개" name="introduction" value={editedGoods.introduction} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={FileText} label="상세 설명" name="description" type="textarea" value={editedGoods.description} isEdit={isEditMode} onChange={handleEditChange} />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">연락 가능한 방법 (공개)</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={Phone} label="상담 전화번호(대량 주문 문의 전용)" name="consultPhone" value={editedGoods.consultPhone} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={MessageCircle} label="연락처(카카오톡/문자)" name="contactInfo" value={editedGoods.contactInfo} isEdit={isEditMode} onChange={handleEditChange} />
                </div>
              </section>
              </div>
              )}

              <div className="sticky bottom-0 bg-white border-t border-[#F2F4F6] p-6 flex gap-2">
                {isEditMode ? (
                  <>
                    <button onClick={() => { setEditedGoods({ ...selectedGoods }); setIsEditMode(false); }} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                      취소
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={photoUploading || productPhotoUploadingId !== null || photoReplacingIdx !== null}
                      className="flex-[2] py-4 bg-[#3182F6] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#3182F6]/10 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                    >
                      <Save className="w-4 h-4" /> {productPhotoUploadingId !== null || photoUploading || photoReplacingIdx !== null ? "사진 업로드 중..." : "저장하기"}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleDelete(selectedGoods.id)} className="p-4 bg-[#FFF0F0] text-[#F04452] rounded-2xl hover:bg-[#FFE0E0] transition-all active:scale-95">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {selectedGoods.status !== "pending" && (
                      <button onClick={() => handleStatusChange(selectedGoods.id, "pending")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95">
                        <RotateCcw className="w-4 h-4" /> 대기로 되돌리기
                      </button>
                    )}
                    {selectedGoods.status !== "rejected" && (
                      <button onClick={() => handleStatusChange(selectedGoods.id, "rejected")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                        반려하기
                      </button>
                    )}
                    {selectedGoods.status !== "approved" && (
                      <button onClick={() => handleStatusChange(selectedGoods.id, "approved")} className="flex-[2] py-4 bg-[#3182F6] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#3182F6]/10 transition-all active:scale-95">
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
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as GoodsTab)}
                    className={`flex-none px-4 py-2.5 rounded-[14px] text-[13px] font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684]"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mb-5">
                <h1 className="text-[22px] md:text-[26px] font-black tracking-tight leading-tight mb-1">굿즈 매장 관리</h1>
                <p className="text-[#4E5968] font-bold text-[13px] md:text-[14px]">굿즈 업체 등록 신청을 검토하고 승인하세요.</p>
              </div>

              <div className="relative mb-5 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="업체명 또는 신청자명으로 검색"
                  className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#3182F6] transition-all"
                />
              </div>

              {loading ? (
                <div className="py-32 flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#3182F6] rounded-full animate-spin" />
                  <p className="text-[14px] font-bold text-[#8B95A1]">목록을 불러오고 있어요</p>
                </div>
              ) : filteredGoods.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
                  <p className="text-[16px] font-black text-[#8B95A1]">해당하는 신청이 없어요</p>
                </div>
              ) : (
                <div className="bg-white rounded-[24px] border border-[#F2F4F6] overflow-hidden divide-y divide-[#F2F4F6]">
                  {filteredGoods.map((goods) => (
                    <div key={goods.id} onClick={() => openGoodsModal(goods)} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFB] transition-colors cursor-pointer">
                      <div className="w-11 h-11 rounded-2xl bg-[#F0F7FF] flex items-center justify-center shrink-0 overflow-hidden">
                        {goods.photos?.[0] ? <img src={goods.photos[0]} className="w-full h-full object-cover" /> : <Gift className="w-5 h-5 text-[#3182F6]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-black text-[#191F28] truncate">{goods.businessName}</p>
                        <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-0.5 min-w-0">
                          <span className="truncate">{(goods.itemTags || []).slice(0, 2).join(", ") || "품목 미입력"}</span><span className="w-1 h-1 bg-[#D1D6DB] rounded-full shrink-0" /><span className="truncate">{goods.applicantName}</span>
                        </div>
                        <p className="text-[11px] font-bold text-[#ADB5BD] mt-1">
                          신청일 {goods.createdAt?.toDate?.() ? goods.createdAt.toDate().toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "-"}
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
    </AdminSidebarLayout>
  );
}
