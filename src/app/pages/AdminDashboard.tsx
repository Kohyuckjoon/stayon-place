import { useState, useEffect, useRef } from "react";
// import { ScrollRestoration } from "react-router-dom";
import { ScrollRestoration, useSearchParams } from "react-router-dom";
import {
  CheckCircle, XCircle, Clock, Eye,
  Search, Building2, AlertTriangle,
  MapPin, Users, CreditCard, Music, Mic2, Info,
  Trash2, RotateCcw, Edit3, Save, X, ChevronRight,
  Maximize2, Video, Utensils, Plus, Image as ImageIcon,
  ShieldCheck, Award, Check, Calendar, Settings,
  ClipboardCheck, CalendarCheck, MapPinned,
  Wind, Car, Volume2, GripVertical, ChevronUp, ChevronDown, ArrowLeft, ChevronLeft, ZoomIn, ShieldOff, TrendingUp, BarChart3, Megaphone, Bath, Phone, Ban, Church, Mail,
  LayoutDashboard, ClipboardList, Link2, ExternalLink, MessageSquareText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, storage, functions } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, where, arrayUnion, arrayRemove, Timestamp, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { VENUE_IMAGE_COMPRESSION, VENUE_IMAGE_CACHE_CONTROL } from "../lib/storage";
import { httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import { VenueScheduleModal } from "../components/admin/VenueScheduleModal";
import { TagEditor } from "../components/TagEditor";
import { VENUE_PURPOSE_OPTIONS } from "../lib/venuePurposes";
import {
  VENUE_IMAGE_CATEGORIES, VENUE_IMAGE_TOTAL_MAX, VenueImageCategoryKey, emptyVenueImagesByCategory,
  flattenVenueImages, toDisplayImagesByCategory,
} from "../lib/venueImageCategories";

// [유틸리티] 숫자 콤마 포맷팅
const formatNumber = (val: any) => {
  if (!val) return "";
  const num = val.toString().replace(/[^0-9]/g, "");
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// [유틸리티] 콤마 제거
const unformatNumber = (val: string) => val.replace(/,/g, "");

// 통계 카드 컴포넌트 (클릭 시 해당 탭으로 이동 + 현재 탭 하이라이트)
// 시즌별 요금 달력. 시즌은 매년 반복되므로 연도 없이 월-일("MM-DD")만 고르고 저장한다.
// 2월은 윤년까지 고려해 29일까지 표시하고, 요일은 해마다 달라서 표시하지 않는다.
const SEASON_MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const SeasonDatePicker = ({ value, onChange, disabled, alignRight }: { value: string; onChange: (monthDay: string) => void; disabled?: boolean; alignRight?: boolean }) => {
  // 예전 데이터에 "YYYY-MM-DD"나 슬래시 형식이 섞여 있어도 월-일만 읽는다.
  const normalized = (value || "").replace(/\//g, "-").trim();
  const monthDay = normalized.length === 10 ? normalized.substring(5) : normalized;
  const selectedMonth = Number(monthDay.split("-")[0]) || 0;
  const selectedDay = Number(monthDay.split("-")[1]) || 0;

  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(selectedMonth || new Date().getMonth() + 1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!isOpen && selectedMonth) setMonth(selectedMonth);
          setIsOpen(!isOpen);
        }}
        className={`w-full h-[46px] px-3.5 bg-white border flex items-center justify-between gap-1.5 rounded-xl transition-all ${isOpen ? "border-[#3182F6] shadow-[0_0_0_1px_#3182F6]" : "border-[#E5E8EB]"} ${disabled ? "cursor-default" : "hover:border-[#B0B8C1]"}`}
      >
        <span className={`text-[14px] font-black whitespace-nowrap ${selectedMonth && selectedDay ? "text-[#191F28]" : "text-[#ADB5BD]"}`}>
          {selectedMonth && selectedDay ? `${selectedMonth}월 ${selectedDay}일` : "날짜 선택"}
        </span>
        <Calendar className={`w-4 h-4 shrink-0 ${isOpen ? "text-[#3182F6]" : "text-[#B0B8C1]"}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className={`absolute z-[100] top-[100%] ${alignRight ? "right-0" : "left-0"} w-[280px] mt-2 bg-white rounded-[24px] p-5 shadow-[0_24px_54px_rgba(0,0,0,0.12)] border border-[#F2F4F6]`}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="text-[17px] font-black text-[#191F28]">{month}월</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setMonth(month === 1 ? 12 : month - 1)} className="p-2 hover:bg-[#F2F4F6] rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-[#4E5968]" /></button>
                <button type="button" onClick={() => setMonth(month === 12 ? 1 : month + 1)} className="p-2 hover:bg-[#F2F4F6] rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-[#4E5968]" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: SEASON_MONTH_DAYS[month - 1] }, (_, i) => i + 1).map((day) => {
                const isSelected = month === selectedMonth && day === selectedDay;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      onChange(`${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
                      setIsOpen(false);
                    }}
                    className={`aspect-square flex items-center justify-center text-[13px] font-black rounded-[12px] transition-all ${isSelected ? "bg-[#3182F6] text-white shadow-md shadow-[#3182F6]/20" : "text-[#333D4B] hover:bg-[#F2F4F6]"}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] font-bold text-[#8B95A1] text-center">매년 같은 날짜에 반복 적용됩니다</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, colorClass, onClick, isActive }: any) => (
  <button
    onClick={onClick}
    className={`bg-white px-5 py-4 rounded-2xl border shadow-[0_4px_16px_rgb(0,0,0,0.03)] flex items-center justify-between transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] group text-left w-full ${
      isActive ? "border-[#3182F6] ring-2 ring-[#3182F6]/15" : "border-transparent"
    }`}
  >
    <div>
      <p className="text-[13px] font-medium text-[#6B7684] mb-1">{title}</p>
      <p className="text-[20px] font-bold text-[#191F28]">{value}</p>
    </div>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} bg-opacity-10 transition-transform group-hover:scale-110`}>
      <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
    </div>
  </button>
);

// 상세 정보 라벨 컴포넌트
const InfoRow = ({ label, value, icon: Icon, isEdit, name, onChange, type = "text", multiline = false }: any) => {
  const displayValue = name === "price" ? formatNumber(value) : value;

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#F2F4F6] hover:border-[#E5E8EB] transition-colors">
      <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
        <Icon className="w-4 h-4 text-[#ADB5BD]" />
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">{label}</p>
        {isEdit ? (
          <div className="relative">
            {multiline ? (
              <textarea
                name={name}
                rows={2}
                value={displayValue || ""}
                onChange={onChange}
                className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[15px] font-black focus:border-[#3182F6] focus:ring-4 ring-[#3182F6]/5 outline-none transition-all resize-y leading-snug"
              />
            ) : (
              <input
                type={type}
                name={name}
                value={displayValue || ""}
                onChange={onChange}
                placeholder={name === "price" ? "0" : ""}
                className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[15px] font-black focus:border-[#3182F6] focus:ring-4 ring-[#3182F6]/5 outline-none transition-all"
              />
            )}
            {name === "price" && displayValue && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#8B95A1]">원</span>
            )}
          </div>
        ) : (
          <p className={`text-[16px] font-black text-[#3182F6] leading-snug ${multiline ? "whitespace-pre-wrap" : ""}`}>
            {name === "price" && value ? `${formatNumber(value)}원` : (value || "-")}
          </p>
        )}
      </div>
    </div>
  );
};

// 드래그 중인 사진 하나를 가리킨다 — 어느 칸의 몇 번째 사진인지. 다른 카테고리
// 그리드로 드롭하는 걸 지원하려면(예: "전체" → "예배당 전체") 여러 CategoryImageGrid가
// 이 드래그 상태를 공유해야 해서, 부모(AdminDashboard) 쪽 state로 끌어올려뒀다.
// "pending"은 카테고리 미분류 "전체" 보관함을 가리키는 특수 키다.
type VenueImageSlotKey = VenueImageCategoryKey | "pending";
interface DraggedVenueImage {
  categoryKey: VenueImageSlotKey;
  idx: number;
}

// 장소 사진 카테고리 하나(예: "예배당 / 입구")를 편집하는 그리드.
// 예전엔 framer-motion의 Reorder를 여러 줄로 감싸지는 CSS 그리드에 그대로 써서
// (Reorder는 원래 한 줄짜리 리스트 전용이라) 드래그가 세로로만 되거나 사진이
// 사라지는 것처럼 보이는 버그가 있었다. 그리드 줄바꿈과 무관하게 동작하는 순수
// HTML5 드래그 앤 드롭(draggable/dragover/drop)으로 바꿔서 그 버그 자체를 없앴고,
// 같은 매커니즘으로 다른 카테고리 그리드까지 드롭 대상으로 받아서 카테고리 간
// 사진 이동도 지원한다. (참고: HTML5 드래그 앤 드롭은 데스크톱 브라우저 전용이라
// 모바일에선 드래그가 안 먹는다 — 그 경우엔 아래 이전/다음 화살표 버튼을 쓰면 된다.)
const CategoryImageGrid = ({
  categoryKey, label, max, images, isRepresentative, draggedImage, onDragStartImage, onDragEndImage, onDropAt,
  onAdd, onRemove, onMove, onImageClick, isUploading,
}: {
  categoryKey: VenueImageSlotKey;
  label: string;
  max: number | null; // null = "전체" 보관함처럼 정해진 상한이 없는 칸
  images: string[];
  isRepresentative: boolean; // 전체 카테고리를 순서대로 이어붙였을 때 대표 사진(첫 장)을 포함하는 카테고리인지
  draggedImage: DraggedVenueImage | null;
  onDragStartImage: (idx: number) => void;
  onDragEndImage: () => void; // 어디에도 드롭되지 않고 드래그가 끝났을 때 공유 상태를 정리
  onDropAt: (targetIdx: number | null) => void; // null = 맨 끝(또는 빈 카테고리)에 놓기
  onAdd: (files: FileList) => void;
  onRemove: (idx: number) => void;
  onMove: (idx: number, direction: -1 | 1) => void;
  onImageClick: (idx: number) => void;
  isUploading: boolean;
}) => {
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [isSectionOver, setIsSectionOver] = useState(false);
  const isFull = max !== null && images.length >= max;
  const isDraggingFromHere = draggedImage?.categoryKey === categoryKey;
  // 다른 카테고리에서 사진을 끌고 온 상태로 이 섹션 위에 있는지 — 드롭 가능한 대상임을 알려준다.
  const isDropTargetFromOtherCategory = !!draggedImage && !isDraggingFromHere;

  return (
    <div
      onDragEnter={() => { if (isDropTargetFromOtherCategory) setIsSectionOver(true); }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsSectionOver(false);
      }}
      onDragOver={(e) => { if (draggedImage) e.preventDefault(); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsSectionOver(false);
        onDropAt(null); // 그리드 빈 공간(또는 카드 사이가 아닌 곳)에 놓으면 맨 끝에 추가
      }}
      className={`rounded-2xl transition-all ${isSectionOver ? "ring-2 ring-[#3182F6] ring-offset-2 bg-[#F2F8FF]/60 -m-2 p-2" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-black text-[#4E5968]">
          {label} <span className="text-[#ADB5BD] font-bold">{max !== null ? `${images.length}/${max}` : `${images.length}장`}</span>
        </p>
        <label
          className={`cursor-pointer bg-[#3182F6] text-white px-3 py-1.5 rounded-xl hover:bg-[#1B64DA] transition-all flex items-center gap-1 text-[12px] font-bold shadow-sm ${isFull || isUploading ? "opacity-40 pointer-events-none" : ""
            }`}
        >
          <Plus className="w-3.5 h-3.5" /> 추가
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            disabled={isFull || isUploading}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) onAdd(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {images.length === 0 ? (
        <div className={`py-6 rounded-2xl border border-dashed text-center text-[12px] font-bold transition-colors ${isSectionOver ? "border-[#3182F6] text-[#3182F6]" : "border-[#E5E8EB] text-[#ADB5BD]"
          }`}>
          {isDropTargetFromOtherCategory ? "여기에 놓으면 이 카테고리로 옮겨져요" : "등록된 사진이 없어요"}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {images.map((img, idx) => (
            <div
              key={img}
              draggable
              onDragStart={() => onDragStartImage(idx)}
              onDragEnter={(e) => { e.stopPropagation(); setOverIdx(idx); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.stopPropagation(); setIsSectionOver(false); onDropAt(idx); }}
              onDragEnd={() => { setOverIdx(null); onDragEndImage(); }}
              className={`relative group rounded-2xl overflow-hidden border bg-white transition-all cursor-grab active:cursor-grabbing ${overIdx === idx && draggedImage && !(isDraggingFromHere && draggedImage.idx === idx) ? "border-[#3182F6] ring-2 ring-[#3182F6]/30" : "border-[#E5E8EB]"
                } ${isDraggingFromHere && draggedImage.idx === idx ? "opacity-40" : ""}`}
            >
              <img
                src={img}
                className="w-full aspect-[4/3] object-cover cursor-zoom-in"
                alt=""
                draggable={false}
                onClick={() => onImageClick(idx)}
              />

              {isRepresentative && idx === 0 && (
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#3182F6] text-white text-[10px] font-black rounded-full shadow-md pointer-events-none">
                  대표 사진
                </span>
              )}

              <div className="absolute bottom-2 left-2 p-1.5 bg-white/90 text-[#4E5968] rounded-full shadow-md" title="드래그해서 순서/카테고리 변경">
                <GripVertical className="w-3 h-3" />
              </div>

              <div className="absolute bottom-2 right-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => onMove(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 bg-white/90 text-[#4E5968] rounded-full shadow-md hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="이전으로 이동"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(idx, 1)}
                  disabled={idx === images.length - 1}
                  className="p-1.5 bg-white/90 text-[#4E5968] rounded-full shadow-md hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="다음으로 이동"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-2 right-2 p-1.5 bg-[#F04452] text-white rounded-full shadow-md hover:bg-red-600 transition-all border border-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

type VenueTab = "pending" | "approved" | "rejected" | "schedule" | "blockRequests";
const VALID_VENUE_TABS: VenueTab[] = ["pending", "approved", "rejected", "schedule", "blockRequests"];

export function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_VENUE_TABS.includes(searchParams.get("tab") as VenueTab) ? (searchParams.get("tab") as VenueTab) : "pending";
  const [activeTab, setActiveTabState] = useState<VenueTab>(initialTab);
  const setActiveTab = (tab: VenueTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [blockRequests, setBlockRequests] = useState<any[]>([]);
  const [decidingBlockRequestId, setDecidingBlockRequestId] = useState<string | null>(null);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [scheduleVenueId, setScheduleVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // 승인 전에도 담임목사님께 미리 보여드릴 상세페이지 링크를 복사할 수 있게 - 버튼 누른
  // 직후 잠깐 "복사됨" 표시를 하기 위한 상태. VenueDetail.tsx는 status를 따로 검사하지
  // 않아서(확인 완료, 2026-10-21) 승인 전 pending 상태에서도 이 링크로 바로 들어가진다.
  const [copiedVenueId, setCopiedVenueId] = useState<string | null>(null);

  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedVenue, setEditedVenue] = useState<any>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // 카테고리(또는 "전체" 미분류 보관함) 사진 그리드 사이에서 드래그 중인 항목 —
  // 다른 칸으로 드롭하면 이동시킨다.
  const [draggedVenueImage, setDraggedVenueImage] = useState<DraggedVenueImage | null>(null);

  // 로컬 추가 UI 상태 (구조 파괴 방지용 로컬 state 결합)
  const [depositType, setDepositType] = useState<"percent" | "amount">("percent");
  const [boostAmount, setBoostAmount] = useState("7");
  const [boostUnit, setBoostUnit] = useState<"일" | "개월">("일");
  const [managerEmailInput, setManagerEmailInput] = useState("");

  const AVAILABLE_BADGES = [
    { id: "stayon", label: "스테이온 인증", icon: ShieldCheck, color: "#3182F6", bg: "#E8F3FF" },
    { id: "partyroom", label: "파티룸(소그룹)", icon: ShieldCheck, color: "#3182F6", bg: "#E8F3FF" },
  ];

  const handleToggleBadge = (badgeId: string) => {
    const currentBadges = editedVenue.badges || [];
    let updatedBadges = [];
    if (currentBadges.includes(badgeId)) {
      updatedBadges = currentBadges.filter((b: string) => b !== badgeId);
    } else {
      updatedBadges = [...currentBadges, badgeId];
    }
    setEditedVenue({ ...editedVenue, badges: updatedBadges });
  };

  const handleTogglePurpose = (purpose: string) => {
    const current = editedVenue.purposes || [];
    const updated = current.includes(purpose)
      ? current.filter((p: string) => p !== purpose)
      : [...current, purpose];
    setEditedVenue({ ...editedVenue, purposes: updated });
  };

  // 8개 카테고리 + "전체"(pending) 미분류 보관함, 총 9개 칸을 같은 방식으로 다루기
  // 위한 헬퍼들. 드래그 이동/삭제/순서변경이 소스가 카테고리든 "전체"든 동일하게
  // 동작하게 한다.
  const getSlotImages = (venue: any, key: VenueImageSlotKey): string[] =>
    key === "pending" ? (venue.pendingImages || []) : (venue.imagesByCategory?.[key] || []);
  const getSlotMax = (key: VenueImageSlotKey): number | null =>
    key === "pending" ? null : (VENUE_IMAGE_CATEGORIES.find((c) => c.key === key)?.max ?? null);
  const getSlotLabel = (key: VenueImageSlotKey): string =>
    key === "pending" ? "전체" : (VENUE_IMAGE_CATEGORIES.find((c) => c.key === key)?.label ?? key);

  // 카테고리 하나(또는 "전체" 보관함) 의 사진 배열이 바뀔 때마다, 기존 화면들(장소
  // 카드·카카오톡 미리보기 등)이 계속 쓰는 평평한 images 배열도 다시 이어붙여
  // 함께 갱신해둔다("전체" 보관함 사진은 맨 뒤에 붙인다). 이렇게 해두면 저장
  // (handleUpdate)이 editedVenue를 그대로 스프레드해서 저장할 때 images가 항상
  // imagesByCategory/pendingImages와 일치한 상태로 저장된다.
  const updateSlotImages = (key: VenueImageSlotKey, newImages: string[]) => {
    setEditedVenue((prev: any) => {
      const imagesByCategory = key === "pending"
        ? (prev.imagesByCategory || emptyVenueImagesByCategory())
        : { ...(prev.imagesByCategory || emptyVenueImagesByCategory()), [key]: newImages };
      const pendingImages = key === "pending" ? newImages : (prev.pendingImages || []);
      return {
        ...prev,
        imagesByCategory,
        pendingImages,
        images: [...flattenVenueImages(imagesByCategory), ...pendingImages],
      };
    });
  };

  const handleRemoveImage = (key: VenueImageSlotKey, index: number) => {
    const current = [...getSlotImages(editedVenue, key)];
    current.splice(index, 1);
    updateSlotImages(key, current);
  };

  const handleMoveImage = (key: VenueImageSlotKey, index: number, direction: -1 | 1) => {
    const current = [...getSlotImages(editedVenue, key)];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    [current[index], current[targetIndex]] = [current[targetIndex], current[index]];
    updateSlotImages(key, current);
  };

  // 카테고리(또는 "전체" 보관함) 그리드에 사진을 드롭했을 때 처리 — 같은 칸이면
  // 순서만 바꾸고, 다른 칸이면 그리로 옮긴다(대상이 카테고리이고 이미 꽉 찼으면
  // 옮기지 않음 — "전체" 보관함은 상한이 없어 항상 받을 수 있다).
  const handleImageDrop = (targetKey: VenueImageSlotKey, targetIdx: number | null) => {
    if (!draggedVenueImage) return;
    const { categoryKey: sourceKey, idx: sourceIdx } = draggedVenueImage;
    setDraggedVenueImage(null);

    const sourceImages = getSlotImages(editedVenue, sourceKey);
    const moved = sourceImages[sourceIdx];
    if (!moved) return;

    if (sourceKey === targetKey) {
      if (targetIdx === null || targetIdx === sourceIdx) return;
      const next = [...sourceImages];
      next.splice(sourceIdx, 1);
      next.splice(targetIdx, 0, moved);
      updateSlotImages(sourceKey, next);
      return;
    }

    const targetImages = getSlotImages(editedVenue, targetKey);
    const targetMax = getSlotMax(targetKey);
    if (targetMax !== null && targetImages.length >= targetMax) {
      alert(`"${getSlotLabel(targetKey)}"은(는) 이미 최대 ${targetMax}장이 등록되어 있어 옮길 수 없어요.`);
      return;
    }

    const newSourceImages = [...sourceImages];
    newSourceImages.splice(sourceIdx, 1);
    const newTargetImages = [...targetImages];
    newTargetImages.splice(targetIdx === null ? newTargetImages.length : targetIdx, 0, moved);

    setEditedVenue((prev: any) => {
      let imagesByCategory = prev.imagesByCategory || emptyVenueImagesByCategory();
      let pendingImages = prev.pendingImages || [];
      if (sourceKey === "pending") pendingImages = newSourceImages;
      else imagesByCategory = { ...imagesByCategory, [sourceKey]: newSourceImages };
      if (targetKey === "pending") pendingImages = newTargetImages;
      else imagesByCategory = { ...imagesByCategory, [targetKey]: newTargetImages };
      return {
        ...prev,
        imagesByCategory,
        pendingImages,
        images: [...flattenVenueImages(imagesByCategory), ...pendingImages],
      };
    });
  };

  const handleImageUpload = async (key: VenueImageCategoryKey, fileList: FileList) => {
    // FileList를 그대로 들고 있으면 안 된다 - 이 함수가 비동기라 파일 업로드 도중에
    // (첫 파일 올리는 동안 대기하는 사이) 호출한 쪽에서 input.value를 초기화하면,
    // 그 순간 이 FileList까지 같이 비워져서 반복문이 첫 번째 파일만 처리하고 멈춰버린다
    // (여러 장 선택해도 한 장만 올라가던 버그의 원인). 그래서 넘겨받자마자 제일 먼저
    // 독립된 배열로 복사해둔다.
    const files = Array.from(fileList);
    const category = VENUE_IMAGE_CATEGORIES.find((c) => c.key === key)!;
    const current = editedVenue.imagesByCategory?.[key] || [];
    if (current.length + files.length > category.max) {
      alert(`"${category.label}"은(는) 최대 ${category.max}장까지 등록 가능합니다.`);
      return;
    }

    setIsUploading(true);
    const newImageUrls = [...current];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `venues/${editedVenue.venueName || 'unnamed'}_${key}_${Date.now()}_${i}`);
        // 카메라 원본(3~5MB)이 그대로 올라가 상세페이지가 느려지던 문제 - 장소 등록 화면과 같이 줄여서 올린다.
        const compressed = await imageCompression(file, VENUE_IMAGE_COMPRESSION);
        const snapshot = await uploadBytes(storageRef, compressed, { contentType: compressed.type || file.type, cacheControl: VENUE_IMAGE_CACHE_CONTROL });
        const url = await getDownloadURL(snapshot.ref);
        newImageUrls.push(url);
      }
      updateSlotImages(key, newImageUrls);
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  // "전체" 일괄 업로드 - 카테고리를 미리 고르지 않고 여러 장을 한 번에 올린다.
  // 자동으로 어느 카테고리에 분류하지 않고, 전부 "전체" 미분류 보관함(pendingImages)에
  // 그대로 쌓아둔다 — 관리자가 여기서 직접 드래그해서 원하는 카테고리로 옮기면 된다.
  const handleBulkImageUpload = async (fileList: FileList) => {
    // handleImageUpload와 같은 이유로, FileList를 그대로 들고 있지 않고 바로 배열로
    // 복사해둔다 - 안 그러면 첫 파일 업로드 중에 input이 초기화되면서 나머지가
    // 통째로 사라져 한 장만 올라가는 버그가 생긴다.
    const files = Array.from(fileList);
    const totalCurrent = (editedVenue.images || []).length;
    const remaining = VENUE_IMAGE_TOTAL_MAX - totalCurrent;
    if (files.length > remaining) {
      alert(`전체 사진은 최대 ${VENUE_IMAGE_TOTAL_MAX}장까지 등록 가능해요. 지금은 ${remaining}장 더 올릴 수 있어요.`);
      return;
    }

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `venues/${editedVenue.venueName || 'unnamed'}_bulk_${Date.now()}_${i}`);
        const compressed = await imageCompression(file, VENUE_IMAGE_COMPRESSION);
        const snapshot = await uploadBytes(storageRef, compressed, { contentType: compressed.type || file.type, cacheControl: VENUE_IMAGE_CACHE_CONTROL });
        const url = await getDownloadURL(snapshot.ref);
        uploadedUrls.push(url);
      }
      updateSlotImages("pending", [...(editedVenue.pendingImages || []), ...uploadedUrls]);
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleVisibility = async (id: string, currentStatus: boolean) => {
    try {
      const venueRef = doc(db, "venues", id);
      await updateDoc(venueRef, { isVisible: !currentStatus });
    } catch (error) {
      console.error("Error toggling visibility:", error);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "venues"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const venueData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVenues(venueData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 사이드바의 "예약 및 답사 문의" 그룹 배지 표시용 (실제 목록/상세는 /admin/bookings에서 관리)
  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 장소 관리자(마이페이지)가 신청한, 아직 처리 안 된 예약 차단 신청 목록.
  // 승인/거절은 decideVenueBlockRequest(functions/src/venueBlockRequest.ts)로만 처리한다.
  useEffect(() => {
    const q = query(collection(db, "venueBlockRequests"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBlockRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleDecideBlockRequest = async (requestId: string, action: "approve" | "reject") => {
    setDecidingBlockRequestId(requestId);
    try {
      const decideVenueBlockRequest = httpsCallable(functions, "decideVenueBlockRequest");
      const res = await decideVenueBlockRequest({ requestId, action });
      const result = res.data as { success: boolean; error?: string };
      if (!result.success) alert(result.error || "처리 중 오류가 발생했습니다.");
    } catch (error) {
      console.error("장소 차단 신청 처리 실패:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setDecidingBlockRequestId(null);
    }
  };

  // 사이드바의 "차단된 회원" 배지 표시용 (실제 목록/상세는 /admin/users에서 관리)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setSuspendedCount(snapshot.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => unsubscribe();
  }, []);

  // 사진 확대보기(라이트박스) 키보드 내비게이션: ← → 로 사진 넘기기, Esc로 닫기
  useEffect(() => {
    if (lightboxIndex === null) return;
    const images = editedVenue?.images || [];
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? null : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, editedVenue?.images]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const venueRef = doc(db, "venues", id);
      await updateDoc(venueRef, { status: newStatus });

      // 승인/반려 결과를 신청자 본인 이메일로 안내한다 (기존엔 안내 문구만 있고
      // 실제로 보내는 코드가 없었음).
      if (newStatus === "approved" || newStatus === "rejected") {
        const target = venues.find((v) => v.id === id);
        if (target?.applicantEmail) {
          const sendVenueApplicantStatusEmail = httpsCallable(functions, "sendVenueApplicantStatusEmail");
          sendVenueApplicantStatusEmail({
            applicantEmail: target.applicantEmail,
            venueName: target.venueName,
            status: newStatus,
          }).catch((error) => console.error("승인/반려 안내 이메일 전송 실패:", error));
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // 수련회 장소(venues) 데이터를 국내 선교 장소(missionVenues, 완전히 분리된 컬렉션)로
  // 그대로 복사해서 넘겨준다. missionVenues에는 없는 필드(price, 예약/정산 관련 필드,
  // "야외 및 바베큐장" 사진 카테고리)는 빼고, missionVenues에만 있는 새 필드(교회 사정/원하는
  // 봉사·헌신, 공개용 전화번호)는 원본에 없으니 빈 값으로 시작한다. 복사한 장소는 새 필드를
  // 채워 넣어야 하니 "검토 대기" 상태로 만들고, 중복 복사를 막기 위해 원본 venues 문서에
  // missionVenueId를 남겨 다시 복사하지 못하게 한다.
  const handleCopyToMissionVenue = async (venue: any) => {
    if (venue.missionVenueId) return;
    if (!window.confirm(`"${venue.venueName}"을(를) 국내 선교 장소로 추가하시겠습니까?\n검토 대기 상태로 국내선교 관리에 추가됩니다.`)) return;
    try {
      // missionVenueImageCategories.ts와 동일한 순서(야외 및 바베큐장 제외 7개)
      const missionCategoryOrder = ["entrance", "mainHall", "worshipSetup", "kitchen", "lodging", "restroom", "etc"];
      const imagesByCategory: Record<string, string[]> = { ...(venue.imagesByCategory || {}) };
      delete imagesByCategory.outdoor; // missionVenues엔 "야외 및 바베큐장" 카테고리가 없음
      const images = missionCategoryOrder.flatMap((c) => imagesByCategory[c] || []);

      const missionVenueRef = await addDoc(collection(db, "missionVenues"), {
        applicantName: venue.applicantName || "",
        applicantContact: venue.applicantContact || "",
        applicantEmail: venue.applicantEmail || "",
        applicantUid: venue.applicantUid || "",
        venueName: venue.venueName || "",
        location: venue.location || "",
        addressDetail: venue.addressDetail || "",
        denomination: venue.denomination || "",
        capacity: venue.capacity || 0,
        hallSize: venue.hallSize || "",
        soundSystem: venue.soundSystem || "",
        instruments: venue.instruments || "",
        projector: venue.projector || "",
        description: venue.description || "",
        mealOption: venue.mealOption || [],
        mealPrice: venue.mealPrice || 0,
        mealNote: venue.mealNote || "",
        cafeteriaCapacity: venue.cafeteriaCapacity || 0,
        parkingCapacity: venue.parkingCapacity || "",
        beddingAvailable: venue.beddingAvailable || false,
        airConditioner: venue.airConditioner ?? true,
        showerBathroom: venue.showerBathroom || "",
        nightEventLimit: venue.nightEventLimit || "",
        tags: venue.tags || [],
        images,
        imagesByCategory,
        churchSituation: [],
        churchSituationOther: "",
        desiredService: [],
        desiredServiceOther: "",
        contactPhone: "",
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "venues", venue.id), { missionVenueId: missionVenueRef.id });
      setSelectedVenue((prev: any) => (prev && prev.id === venue.id ? { ...prev, missionVenueId: missionVenueRef.id } : prev));
      setEditedVenue((prev: any) => (prev && prev.id === venue.id ? { ...prev, missionVenueId: missionVenueRef.id } : prev));
      alert("국내 선교 장소(검토 대기)로 추가되었습니다.");
    } catch (error) {
      console.error("국내 선교 장소 복사 실패:", error);
      alert("국내 선교 장소로 추가하는 중 오류가 발생했습니다.");
    }
  };

  // 끌어올리기: 지정한 기간(일 단위) 뒤에 자동으로 상단 노출이 풀리도록 만료 시각을 저장한다.
  // 공개 목록(VenueList.tsx)에서 boostedUntil이 현재보다 미래인 장소를 최상단으로 정렬한다.
  const handleSetBoost = async (id: string, days: number) => {
    if (!days || days <= 0) return;
    try {
      const boostedAt = new Date();
      const boostedUntil = new Date(boostedAt.getTime() + days * 24 * 60 * 60 * 1000);
      const updateData = {
        boostedAt: Timestamp.fromDate(boostedAt),
        boostedUntil: Timestamp.fromDate(boostedUntil),
      };
      await updateDoc(doc(db, "venues", id), updateData);
      setSelectedVenue((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
      setEditedVenue((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
    } catch (error) {
      console.error("끌어올리기 설정 실패:", error);
      alert("끌어올리기 설정 중 오류가 발생했습니다.");
    }
  };

  const handleClearBoost = async (id: string) => {
    try {
      const updateData = { boostedAt: null, boostedUntil: null };
      await updateDoc(doc(db, "venues", id), updateData);
      setSelectedVenue((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
      setEditedVenue((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
    } catch (error) {
      console.error("끌어올리기 해제 실패:", error);
      alert("끌어올리기 해제 중 오류가 발생했습니다.");
    }
  };

  // 마이페이지 관리자 위임: applicantUid(최초 등록자)가 아니어도, 여기서 추가한 이메일로
  // 로그인하면 마이페이지 "장소 관리자" 탭에서 이 장소를 관리할 수 있게 된다(서버측
  // 권한 검사는 functions/src/index.ts의 manageMyVenueCore 참고). 끌어올리기와 같은
  // 이유로 수정 모드/저장 버튼과 무관하게 클릭 즉시 반영한다.
  const handleAddManagerEmail = async (id: string) => {
    const email = managerEmailInput.trim().toLowerCase();
    if (!email) return;
    const current: string[] = selectedVenue?.managerEmails || [];
    if (current.includes(email)) {
      setManagerEmailInput("");
      return;
    }
    try {
      const updateData = { managerEmails: [...current, email] };
      await updateDoc(doc(db, "venues", id), updateData);
      setSelectedVenue((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
      setEditedVenue((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
      setManagerEmailInput("");
    } catch (error) {
      console.error("관리자 계정 추가 실패:", error);
      alert("관리자 계정 추가 중 오류가 발생했습니다.");
    }
  };

  const handleRemoveManagerEmail = async (id: string, email: string) => {
    try {
      const next = (selectedVenue?.managerEmails || []).filter((e: string) => e !== email);
      const updateData = { managerEmails: next };
      await updateDoc(doc(db, "venues", id), updateData);
      setSelectedVenue((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
      setEditedVenue((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
    } catch (error) {
      console.error("관리자 계정 삭제 실패:", error);
      alert("관리자 계정 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("이 장소의 데이터를 영구적으로 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) {
      try {
        await deleteDoc(doc(db, "venues", id));
      } catch (error) {
        console.error("Error deleting:", error);
      }
    }
  };

  const handleCopyVenueUrl = async (venueId: string) => {
    const url = `${window.location.origin}/venue/${venueId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("아래 링크를 복사하세요", url);
    }
    setCopiedVenueId(venueId);
    setTimeout(() => setCopiedVenueId((prev) => (prev === venueId ? null : prev)), 2000);
  };

  const handleToggleBlockedDate = async (venueId: string, dateStr: string, isCurrentlyBlocked: boolean) => {
    try {
      const venueRef = doc(db, "venues", venueId);
      await updateDoc(venueRef, {
        blockedDates: isCurrentlyBlocked ? arrayRemove(dateStr) : arrayUnion(dateStr)
      });
    } catch (error) {
      console.error("Error toggling blocked date:", error);
    }
  };

  const openEditModal = (venue: any) => {
    const initialDepositType = venue.depositType || (venue.depositAmount ? "amount" : "percent");
    // 카테고리 구분 없이 등록됐던 기존 장소는 사진이 전부 "기타"로 들어간 것처럼 보여준다
    // (실제 DB엔 저장하지 않고 화면에서만 이렇게 채워서 보여줌 — 저장을 눌러야 반영됨).
    const initialImagesByCategory = {
      ...emptyVenueImagesByCategory(),
      ...toDisplayImagesByCategory(venue),
    };

    setEditedVenue({
      ...venue,
      imagesByCategory: initialImagesByCategory,
      pendingImages: venue.pendingImages ?? [], // "전체" 미분류 보관함
      tags: venue.tags ?? [],
      useSeasonalPrice: venue.useSeasonalPrice ?? false,
      depositType: initialDepositType,
      depositPercent: venue.depositPercent ?? 10,
      depositAmount: venue.depositAmount ?? "",
      seasonPrices: venue.seasonPrices ?? [
        { label: "성수기", start: "08-01", end: "08-15", price: "" },
        { label: "비수기", start: "10-01", end: "01-30", price: "" }
      ]
    });
    setDepositType(initialDepositType);
    setSelectedVenue(venue);
    setIsEditMode(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "price") {
      const onlyNum = unformatNumber(value);
      setEditedVenue((prev: any) => ({ ...prev, [name]: onlyNum === "" ? "" : Number(onlyNum) }));
    } else {
      setEditedVenue((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleSeasonPriceChange = (index: number, field: string, value: string) => {
    const updatedSeasons = [...editedVenue.seasonPrices];

    if (field === "start" || field === "end") {
      // 🟢 인풋에서 YYYY-MM-DD 형태로 넘어오면 앞의 YYYY- 부분을 잘라내고 MM-DD 포맷만 추출
      if (value.length === 10 && value.includes("-")) {
        const [_, month, day] = value.split("-");
        updatedSeasons[index][field] = `${month}-${day}`;
      } else {
        updatedSeasons[index][field] = value.trim();
      }
    } else if (field === "price" || field === "extraNightPrice") {
      updatedSeasons[index][field] = unformatNumber(value);
    } else {
      updatedSeasons[index][field] = value;
    }

    setEditedVenue({ ...editedVenue, seasonPrices: updatedSeasons });
  };

  const handleUpdate = async () => {
    try {
      const venueRef = doc(db, "venues", editedVenue.id);

      const currentOptions = editedVenue.timeSlotOptions || [];
      const sanitizedTimeSlotOptions = currentOptions.map((opt: any) => ({
        days: opt.days || [],
        start: opt.start || "",
        end: opt.end || "",
        price: opt.price ? opt.price.toString() : "",
        label: opt.label || "" // 여기서 입력된 값을 확실히 가져옵니다
      }));

      // 선택한 탭 모드에 따라 디비에 최종 저장될 데이터를 트림 처리합니다.
      // const finalUpdateData = {
      //   ...editedVenue,
      //   depositType: depositType,
      //   depositPercent: depositType === "percent" ? Number(editedVenue.depositPercent || 10) : 0,
      //   depositAmount: depositType === "amount" ? unformatNumber(editedVenue.depositAmount.toString()) : "",

      //   // 옵션 추가
      //   useTimeSlotPrice: editedVenue.useTimeSlotPrice ?? false,
      //   timeSlotOptions: sanitizedTimeSlotOptions
      //   // timeSlotOptions: editedVenue.timeSlotOptions || []
      // };

      const updateData = {
        ...editedVenue,
        depositType: depositType,
        depositPercent: depositType === "percent" ? Number(editedVenue.depositPercent || 10) : 0,
        depositAmount: depositType === "amount" ? unformatNumber(editedVenue.depositAmount?.toString() || "0") : "",
        useTimeSlotPrice: editedVenue.useTimeSlotPrice ?? false,
        timeSlotOptions: sanitizedTimeSlotOptions, // 여기서 명확하게 정제된 데이터를 주입
        perPersonPrice: editedVenue.perPersonPrice ? editedVenue.perPersonPrice.toString() : "0"
      };

      delete updateData.id;
      // 조회수는 서버가 올리는 값이라, 편집 화면을 연 시점의 값으로 덮어쓰지 않는다.
      delete (updateData as any).viewCount;

      // const { id, ...updateData } = finalUpdateData;
      await updateDoc(venueRef, updateData);

      setIsEditMode(false);
      setSelectedVenue(null);
      alert("성공적으로 저장되었습니다.");
    } catch (error) {
      console.error("Error updating venue:", error);
      alert("설정 저장 중 오류가 발생했습니다.");
    }
  };

  const filteredData = venues.filter(v => v.status === activeTab && (v.venueName || "").includes(searchQuery));
  const pendingCount = venues.filter(v => v.status === "pending").length;
  const approvedCount = venues.filter(v => v.status === "approved").length;
  const rejectedCount = venues.filter(v => v.status === "rejected").length;

  const headerCopy: Record<string, { title: string; subtitle: string }> = {
    pending: { title: "검토 대기중인 신청", subtitle: "실시간 수련회 장소 등록 및 승인 현황을 관리하세요." },
    approved: { title: "승인 완료된 장소", subtitle: "현재 운영 중인 장소 목록을 확인하고 관리하세요." },
    rejected: { title: "반려 / 삭제 내역", subtitle: "반려되었거나 삭제된 신청 내역을 확인하세요." },
    schedule: { title: "장소별 일정 관리", subtitle: "오픈된 장소의 예약 불가(차단) 일정을 관리하세요." },
    blockRequests: { title: "장소 차단 신청 승인", subtitle: "직거래 방지를 위해 접수된 예약 차단 신청을 검토하세요. 48시간 내 미처리 시 자동 승인됩니다." },
  };
  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";
  const openVenues = venues.filter(v => v.status === "approved" && (v.venueName || "").includes(searchQuery));
  const scheduleVenue = venues.find(v => v.id === scheduleVenueId) || null;

  const handleTimeSlotChange = (index: number, field: string, value: any) => {
    const updatedOptions = editedVenue.timeSlotOptions
      ? [...editedVenue.timeSlotOptions]
      : Array.from({ length: 8 }).map(() => ({ days: [], start: "", end: "", price: "", label: "" }));

    if (!updatedOptions[index]) {
      updatedOptions[index] = { days: [], start: "", end: "", price: "", label: "" };
    }

    updatedOptions[index] = {
      ...updatedOptions[index],
      [field]: value
    };

    setEditedVenue({ ...editedVenue, timeSlotOptions: updatedOptions });
  };

  return (
    <AdminSidebarLayout
      brandSubtitle="수련회 장소 관리자"
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
            { id: "pending", label: "검토 대기", count: pendingCount, icon: Clock, accentColor: "#FF9500" },
            { id: "approved", label: "승인 완료", count: approvedCount, icon: CheckCircle, accentColor: "#3182F6" },
            { id: "rejected", label: "반려 / 삭제", count: rejectedCount, icon: XCircle, accentColor: "#F04452" },
            { id: "schedule", label: "장소별 일정관리", count: approvedCount, icon: Calendar },
            { id: "blockRequests", label: "차단 신청 승인", count: blockRequests.length, icon: Ban, accentColor: "#F04452" },
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
            { id: "bk_pending", label: "예약 대기", count: bookings.filter(b => b.status === "pending").length, icon: ClipboardCheck, accentColor: "#FF9500", href: "/admin/bookings?tab=pending" },
            { id: "bk_confirmed", label: "답사 승인", count: bookings.filter(b => b.status === "confirmed").length, icon: CalendarCheck, href: "/admin/bookings?tab=confirmed" },
            { id: "bk_inspection_confirmed", label: "답사 확정", count: bookings.filter(b => b.status === "inspection_confirmed").length, icon: MapPinned, accentColor: "#3182F6", href: "/admin/bookings?tab=inspection_confirmed" },
            { id: "bk_approved", label: "결제 대기", count: bookings.filter(b => b.status === "approved").length, icon: CreditCard, href: "/admin/bookings?tab=approved" },
            { id: "bk_deposit_paid", label: "완료", count: bookings.filter(b => b.status === "deposit_paid").length, icon: CheckCircle, href: "/admin/bookings?tab=deposit_paid" },
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
      activeId={activeTab}
      onSelect={(id) => setActiveTab(id as any)}
      adminEmail={adminEmail}
    >
      <ScrollRestoration />

      <main className="max-w-[1300px] px-6 md:px-10 py-6 md:py-8">
        {/* 목록/상세 화면 전환: 장소를 선택하면 팝업이 아니라 이 영역 안에서 목록 대신
            상세·수정 패널이 그대로 대체되어 표시된다 (좌측 사이드바 선택에 따라 우측
            영역이 바뀌는 것과 동일한 방식). */}
        {selectedVenue && editedVenue ? null : (
        <>
        {/* 모바일 전용 탭 (사이드바가 숨겨지는 좁은 화면) */}
        <div className="flex md:hidden bg-[#E5E8EB] p-1.5 rounded-[18px] w-full mb-5 overflow-x-auto">
          {[
            { id: "pending", label: "검토 대기", count: pendingCount },
            { id: "approved", label: "승인 완료", count: approvedCount },
            { id: "rejected", label: "반려/삭제", count: rejectedCount },
            { id: "schedule", label: "일정관리", count: approvedCount },
            { id: "blockRequests", label: "차단 신청", count: blockRequests.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[14px] text-[13px] font-bold whitespace-nowrap transition-all duration-200 ${activeTab === tab.id ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684]"
                }`}
            >
              {tab.label}
              <span className={`text-[12px] ${activeTab === tab.id ? "text-[#3182F6]" : "text-[#ADB5BD]"}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="mb-5">
          <h1 className="text-[22px] md:text-[26px] font-black tracking-tight leading-tight mb-1">{headerCopy[activeTab].title}</h1>
          <p className="text-[#4E5968] font-bold text-[13px] md:text-[14px]">{headerCopy[activeTab].subtitle}</p>
        </div>

        {activeTab !== "schedule" && activeTab !== "blockRequests" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <StatCard title="검토 대기중" value={`${pendingCount}건`} icon={Clock} colorClass="bg-[#FF9500]" onClick={() => setActiveTab("pending")} isActive={activeTab === "pending"} />
            <StatCard title="운영 중인 장소" value={`${approvedCount}개`} icon={Building2} colorClass="bg-[#3182F6]" onClick={() => setActiveTab("approved")} isActive={activeTab === "approved"} />
            <StatCard title="반려된 내역" value={`${rejectedCount}건`} icon={XCircle} colorClass="bg-[#F04452]" onClick={() => setActiveTab("rejected")} isActive={activeTab === "rejected"} />
          </div>
        )}

        {activeTab === "blockRequests" ? (
          <div className="space-y-3">
            {blockRequests.length > 0 ? blockRequests.map((req) => (
              <div key={req.id} className="bg-white p-5 rounded-2xl border border-[#F2F4F6] shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-[#191F28] truncate">{req.venueName}</p>
                    <p className="text-[12px] font-bold text-[#8B95A1] mt-0.5">
                      {req.createdAt?.toDate?.() ? req.createdAt.toDate().toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"} 신청 · {req.requestedByEmail}
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 bg-[#FFF7ED] text-[#C2410C] rounded-full text-[11px] font-black">승인 대기</span>
                </div>
                <div className="bg-[#F9FAFB] rounded-xl p-4 space-y-2.5 mb-4">
                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wider mb-0.5">신청 날짜</p>
                      <p className="text-[13px] font-bold text-[#4E5968] break-keep">{(req.dates || []).join(", ")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Church className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wider mb-0.5">장소 사용 신청 교회명</p>
                      <p className="text-[13px] font-bold text-[#4E5968] break-keep">{req.churchName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wider mb-0.5">예약 차단 사유</p>
                      <p className="text-[13px] font-bold text-[#4E5968] break-keep">{req.reason}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecideBlockRequest(req.id, "reject")}
                    disabled={decidingBlockRequestId === req.id}
                    className="flex-1 py-3 bg-[#F2F4F6] text-[#4E5968] rounded-xl font-bold text-[13px] hover:bg-[#E5E8EB] transition-all disabled:opacity-60"
                  >
                    거절
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecideBlockRequest(req.id, "approve")}
                    disabled={decidingBlockRequestId === req.id}
                    className="flex-[2] py-3 bg-[#3182F6] text-white rounded-xl font-bold text-[13px] hover:bg-[#1B64DA] transition-all disabled:opacity-60"
                  >
                    승인
                  </button>
                </div>
              </div>
            )) : (
              <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-[#E5E8EB]">
                <Ban className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-[#ADB5BD] font-bold text-[14px]">대기 중인 차단 신청이 없어요.</p>
              </div>
            )}
          </div>
        ) : activeTab === "schedule" ? (
          <div>
            <div className="relative w-full md:w-80 mb-5">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
              <input
                type="text"
                placeholder="장소 이름 검색"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-medium outline-none focus:ring-2 ring-[#3182F6]/10 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {openVenues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openVenues.map((venue) => {
                  const blockedCount = (venue.blockedDates || []).length;
                  return (
                    <div key={venue.id} className="bg-white p-5 rounded-2xl border border-[#F2F4F6] shadow-[0_4px_16px_rgba(0,0,0,0.03)] flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-1 bg-[#E8F3FF] text-[#3182F6] rounded-full text-[11px] font-black shrink-0">예약 가능</span>
                        <span className="text-[11px] font-bold text-[#ADB5BD] truncate">{venue.denomination}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#F2F4F6] overflow-hidden flex items-center justify-center shrink-0">
                          {venue.images?.[0] ? <img src={venue.images[0]} className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-[#8B95A1]" />}
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
            ) : (
              <div className="bg-white rounded-[20px] border border-[#F2F4F6] py-20 text-center">
                <div className="flex flex-col items-center gap-3 text-[#ADB5BD]">
                  <AlertTriangle className="w-10 h-10 opacity-10" />
                  <p className="font-bold text-[14px]">오픈된 장소가 없습니다.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
        <div className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.02)] border border-[#F2F4F6] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#F9FAFB] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
              <input
                type="text"
                placeholder="장소 이름 검색"
                className="w-full pl-10 pr-4 py-2.5 bg-[#F2F4F6] border-none rounded-xl text-[14px] font-medium outline-none focus:ring-2 ring-[#3182F6]/10 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <p className="text-[12px] font-bold text-[#8B95A1] shrink-0">
              총 <span className="text-[#3182F6]">{filteredData.length}</span>개의 검색 결과
            </p>
          </div>

          {/* 모바일: 카드 리스트 (테이블은 좁은 화면에서 옆으로 밀려 읽기 힘들어서 아예 다른 레이아웃을 씀) */}
          <div className="md:hidden divide-y divide-[#F2F4F6]">
            <AnimatePresence mode="popLayout">
              {filteredData.length > 0 ? filteredData.map((venue) => (
                <motion.div
                  key={venue.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => openEditModal(venue)}
                  className="p-4 active:bg-[#F9FAFB] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#F2F4F6] overflow-hidden shrink-0 border border-[#F2F4F6]">
                      {venue.images?.[0] ? <img src={venue.images[0]} className="w-full h-full object-cover" /> : <Building2 className="w-full p-3 text-[#ADB5BD]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[14px] font-black text-[#191F28] leading-tight truncate">{venue.venueName}</p>
                        {venue.boostedUntil?.toDate?.() && venue.boostedUntil.toDate() > new Date() && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FFF7ED] text-[#C2410C] rounded text-[10px] font-black">
                            <TrendingUp className="w-2.5 h-2.5" /> 끌올중
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] font-bold text-[#8B95A1] truncate">{venue.applicantName || "익명"} · {venue.denomination} · 조회 {Number(venue.viewCount || 0).toLocaleString()}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#D1D6DB] shrink-0" />
                  </div>

                  <div className="flex items-center gap-1.5 mt-2.5 pl-[60px] text-[12px] font-bold text-[#4E5968]">
                    <MapPin className="w-3.5 h-3.5 text-[#3182F6] shrink-0" />
                    <span className="truncate">{venue.location}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2.5 pl-[60px]">
                    <span className="text-[11px] font-bold text-[#ADB5BD] shrink-0">
                      {venue.createdAt?.toDate?.() ? venue.createdAt.toDate().toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }) : "-"}
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {activeTab === "pending" && (
                        <>
                          <button onClick={() => handleStatusChange(venue.id, "approved")} className="px-3 py-1.5 bg-[#3182F6] text-white rounded-lg font-bold text-[12px] active:scale-95">승인</button>
                          <button onClick={() => handleStatusChange(venue.id, "rejected")} className="px-3 py-1.5 bg-[#F2F4F6] text-[#4E5968] rounded-lg font-bold text-[12px] active:scale-95">반려</button>
                        </>
                      )}
                      {activeTab === "approved" && (
                        <button onClick={() => handleStatusChange(venue.id, "pending")} className="flex items-center justify-center w-7 h-7 bg-[#FFF0F0] text-[#F04452] rounded-lg active:scale-95">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {activeTab === "rejected" && (
                        <>
                          <button onClick={() => handleStatusChange(venue.id, "pending")} className="px-3 py-1.5 bg-[#E8F3FF] text-[#3182F6] rounded-lg font-black text-[12px] active:scale-95">재검토</button>
                          <button onClick={() => handleDelete(venue.id)} className="flex items-center justify-center w-7 h-7 bg-[#FFF0F0] text-[#F04452] rounded-lg active:scale-95">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button onClick={() => window.open(`/venue/${venue.id}`, "_blank", "noopener,noreferrer")} title="바로가기" className="flex items-center justify-center w-7 h-7 bg-[#F2F8FF] text-[#3182F6] rounded-lg active:scale-95 shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleCopyVenueUrl(venue.id)} title="URL 복사" className={`flex items-center justify-center w-7 h-7 rounded-lg active:scale-95 shrink-0 ${copiedVenueId === venue.id ? "bg-[#E6F9F2] text-[#00D082]" : "bg-[#F2F8FF] text-[#3182F6]"}`}>
                        {copiedVenueId === venue.id ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="py-16 text-center text-[#ADB5BD] font-bold text-[13px]">해당 내역이 없습니다.</div>
              )}
            </AnimatePresence>
          </div>

          {/* 데스크톱: 기존 테이블 그대로 */}
          <div className="hidden md:block overflow-x-auto scrollbar-hide">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] text-left">
                  <th className="px-5 py-2.5 text-[11px] font-black text-[#8B95A1] uppercase tracking-widest">장소 및 신청자</th>
                  <th className="px-5 py-2.5 text-[11px] font-black text-[#8B95A1] uppercase tracking-widest">지역 정보</th>
                  <th className="px-5 py-2.5 text-[11px] font-black text-[#8B95A1] uppercase tracking-widest">신청 일자</th>
                  <th className="px-5 py-2.5 text-[11px] font-black text-[#8B95A1] uppercase tracking-widest text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F6]">
                <AnimatePresence mode="popLayout">
                  {filteredData.length > 0 ? filteredData.map((venue) => (
                    <motion.tr key={venue.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="group hover:bg-[#F9FAFB]/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#F2F4F6] overflow-hidden shrink-0 cursor-pointer border border-[#F2F4F6]" onClick={() => openEditModal(venue)}>
                            {venue.images?.[0] ? <img src={venue.images[0]} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <Building2 className="w-full p-2.5 text-[#ADB5BD]" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[14px] font-black text-[#191F28] mb-0.5 leading-tight truncate max-w-[170px]" title={venue.venueName}>{venue.venueName}</p>
                              {venue.boostedUntil?.toDate?.() && venue.boostedUntil.toDate() > new Date() && (
                                <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FFF7ED] text-[#C2410C] rounded text-[10px] font-black">
                                  <TrendingUp className="w-2.5 h-2.5" /> 끌올중
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 max-w-[220px] overflow-hidden whitespace-nowrap">
                              <span className="text-[12px] font-bold text-[#8B95A1] shrink-0">{venue.applicantName || "익명"}</span>
                              {venue.applicantContact && (
                                <>
                                  <span className="w-1 h-1 bg-[#D1D6DB] rounded-full shrink-0" />
                                  <span className="text-[12px] font-bold text-[#8B95A1] shrink-0">{venue.applicantContact}</span>
                                </>
                              )}
                              <span className="w-1 h-1 bg-[#D1D6DB] rounded-full shrink-0" />
                              <span className="text-[12px] font-bold text-[#3182F6] truncate">{venue.denomination}</span>
                              <span className="w-1 h-1 bg-[#D1D6DB] rounded-full shrink-0" />
                              <span className="text-[12px] font-bold text-[#8B95A1] shrink-0">조회 {Number(venue.viewCount || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-[#4E5968] font-bold text-[13px] max-w-[170px]">
                          <MapPin className="w-3.5 h-3.5 text-[#3182F6] shrink-0" />
                          <span className="truncate" title={venue.location}>{venue.location}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[13px] font-bold text-[#8B95A1] whitespace-nowrap">
                        {venue.createdAt?.toDate?.() ? venue.createdAt.toDate().toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }) : "-"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            onClick={() => setScheduleVenueId(venue.id)}
                            title="예약 불가 일정 설정"
                            className="p-2 bg-white border border-[#F2F4F6] text-[#F04452] hover:bg-[#FFF0F0] rounded-lg transition-all active:scale-95 flex items-center justify-center"
                          >
                            <Calendar className="w-4 h-4 text-[#F04452]" />
                          </button>

                          <button onClick={() => openEditModal(venue)} className="flex items-center gap-1 px-3 py-2 bg-white border border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6] rounded-lg transition-all active:scale-95 font-bold text-[13px] whitespace-nowrap">
                            <Eye className="w-4 h-4" /> 보기
                          </button>

                          {activeTab === "approved" && (
                            <>
                              <button onClick={() => handleStatusChange(venue.id, "pending")} className="flex items-center justify-center w-8 h-8 bg-[#FFF0F0] text-[#F04452] hover:bg-[#FFE0E0] rounded-lg transition-all active:scale-95">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button onClick={() => openEditModal(venue)} className="p-2 bg-[#F2F4F6] text-[#3182F6] hover:bg-[#E8F3FF] rounded-lg transition-all active:scale-95">
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {activeTab === "pending" && (
                            <>
                              <button onClick={() => handleStatusChange(venue.id, "approved")} className="px-4 py-2 bg-[#3182F6] text-white rounded-lg font-bold text-[13px] hover:bg-[#1B64DA] transition-all active:scale-95 whitespace-nowrap">
                                승인
                              </button>
                              <button onClick={() => handleStatusChange(venue.id, "rejected")} className="px-4 py-2 bg-[#F2F4F6] text-[#4E5968] rounded-lg font-bold text-[13px] hover:bg-[#E5E8EB] transition-all active:scale-95 whitespace-nowrap">
                                반려
                              </button>
                            </>
                          )}

                          {activeTab === "rejected" && (
                            <>
                              <button onClick={() => handleStatusChange(venue.id, "pending")} className="px-3 py-2 bg-[#E8F3FF] text-[#3182F6] rounded-lg font-black text-[13px] hover:bg-[#D1E5FF] transition-all active:scale-95">재검토</button>
                              <button onClick={() => handleDelete(venue.id)} className="p-2 bg-[#FFF0F0] text-[#F04452] hover:bg-[#FFE0E0] rounded-lg transition-all active:scale-95">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => window.open(`/venue/${venue.id}`, "_blank", "noopener,noreferrer")}
                            title="바로가기 - 승인 전에도 실제 상세페이지로 바로 이동"
                            className="flex items-center justify-center w-8 h-8 bg-[#F2F8FF] text-[#3182F6] hover:bg-[#E8F3FF] rounded-lg transition-all active:scale-95 shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleCopyVenueUrl(venue.id)}
                            title="URL 복사 - 승인 전에도 상세페이지 링크를 미리 복사"
                            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all active:scale-95 shrink-0 ${
                              copiedVenueId === venue.id ? "bg-[#E6F9F2] text-[#00D082]" : "bg-[#F2F8FF] text-[#3182F6] hover:bg-[#E8F3FF]"
                            }`}
                          >
                            {copiedVenueId === venue.id ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-[#ADB5BD]">
                          <AlertTriangle className="w-10 h-10 opacity-10" />
                          <p className="font-bold text-[14px]">해당 내역이 없습니다.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
        )}
        </>
        )}

        {/* 상세/수정 패널: 팝업이 아니라 목록을 대체해 같은 영역 안에서 바로 표시된다 */}
        {selectedVenue && editedVenue && (
          <div>
            <button
              onClick={() => { setSelectedVenue(null); setIsEditMode(false); }}
              className="flex items-center gap-2 mb-5 px-4 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold text-[#4E5968] hover:bg-[#F2F4F6] hover:text-[#3182F6] transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
            </button>

            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6"
            >
              {/* 끌어올리기: 지정 기간 동안 공개 목록 최상단에 노출시키는 관리자 전용 기능. */}
              <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-2xl p-4">
                {selectedVenue.boostedUntil?.toDate?.() && selectedVenue.boostedUntil.toDate() > new Date() ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[13px] font-bold text-[#C2410C]">
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      {selectedVenue.boostedUntil.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}까지 상단 노출 중
                    </div>
                    <button
                      type="button"
                      onClick={() => handleClearBoost(selectedVenue.id)}
                      className="shrink-0 px-3 py-1.5 bg-white border border-[#FFEDD5] rounded-lg text-[12px] font-black text-[#C2410C] hover:bg-[#FFF1E6] transition-all"
                    >
                      해제
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={boostAmount}
                      onChange={(e) => setBoostAmount(e.target.value)}
                      className="w-20 px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold outline-none focus:border-[#C2410C]"
                    />
                    <select
                      value={boostUnit}
                      onChange={(e) => setBoostUnit(e.target.value as "일" | "개월")}
                      className="px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold outline-none focus:border-[#C2410C]"
                    >
                      <option value="일">일</option>
                      <option value="개월">개월</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleSetBoost(selectedVenue.id, Number(boostAmount) * (boostUnit === "개월" ? 30 : 1))}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#EA580C] text-white rounded-xl text-[13px] font-black hover:bg-[#C2410C] transition-all active:scale-95"
                    >
                      <TrendingUp className="w-4 h-4" /> 끌어올리기
                    </button>
                  </div>
                )}
              </div>

              {/* 마이페이지 관리자 계정: 최초 등록자가 아니어도 이 이메일로 로그인하면
                  마이페이지 "장소 관리자" 탭에서 이 장소를 관리할 수 있다. */}
              <div className="bg-[#F0F7FF] border border-[#DBEAFE] rounded-2xl p-4">
                <p className="text-[13px] font-black text-[#1D4ED8] mb-2.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 shrink-0" /> 마이페이지 관리자 계정
                </p>
                {(selectedVenue.managerEmails || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {selectedVenue.managerEmails.map((email: string) => (
                      <span key={email} className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-white border border-[#DBEAFE] rounded-full text-[12px] font-bold text-[#1D4ED8]">
                        {email}
                        <button type="button" onClick={() => handleRemoveManagerEmail(selectedVenue.id, email)} className="p-0.5 text-[#93C5FD] hover:text-[#F04452] transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={managerEmailInput}
                    onChange={(e) => setManagerEmailInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddManagerEmail(selectedVenue.id); }}
                    placeholder="담당자 이메일 입력"
                    className="flex-1 px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold outline-none focus:border-[#3182F6]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddManagerEmail(selectedVenue.id)}
                    className="shrink-0 px-3.5 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-black hover:bg-[#1B64DA] transition-all active:scale-95"
                  >
                    추가
                  </button>
                </div>
              </div>

              {/* 사진: 카테고리(예배당/입구, 예배당 전체, 예배 셋팅 ... 기타)별로 나눠서 관리한다.
                  각 카드를 클릭하면 라이트박스로 확대해서 볼 수 있고, 대표사진/삭제/순서이동은
                  카테고리를 순서대로 이어붙였을 때의 맨 첫 사진 기준으로 계산된다. */}
              <div className="bg-white rounded-[28px] border border-[#E5E8EB] shadow-sm p-5 md:p-8">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[14px] font-black text-[#8B95A1] uppercase tracking-wider">
                    현장 사진 {editedVenue.images?.length || 0}
                  </p>
                </div>

                {/* 가독성을 위해 사진 영역은 일정 높이까지만 보이고, 그 이상은 이 안에서만
                    스크롤된다(스크롤바를 숨기지 않아 사진이 더 있다는 걸 바로 알 수 있게 한다). */}
                <div className="max-h-[560px] lg:max-h-[720px] overflow-y-auto pr-1 space-y-8">
                  {isEditMode ? (
                    <>
                    {VENUE_IMAGE_CATEGORIES.map((category) => {
                      const categoryImages = editedVenue.imagesByCategory?.[category.key] || [];
                      const isRepresentative = VENUE_IMAGE_CATEGORIES.find(
                        (c) => (editedVenue.imagesByCategory?.[c.key]?.length || 0) > 0
                      )?.key === category.key;
                      // 라이트박스는 여전히 평평한 images 배열 인덱스를 쓰므로, 이 카테고리 앞에
                      // 몇 장이 이어붙여져 있는지 계산해서 클릭한 사진의 실제 전체 인덱스를 구한다.
                      const offset = VENUE_IMAGE_CATEGORIES
                        .slice(0, VENUE_IMAGE_CATEGORIES.indexOf(category))
                        .reduce((sum, c) => sum + (editedVenue.imagesByCategory?.[c.key]?.length || 0), 0);
                      return (
                        <CategoryImageGrid
                          key={category.key}
                          categoryKey={category.key}
                          label={category.label}
                          max={category.max}
                          images={categoryImages}
                          isRepresentative={isRepresentative}
                          isUploading={isUploading}
                          draggedImage={draggedVenueImage}
                          onDragStartImage={(idx) => setDraggedVenueImage({ categoryKey: category.key, idx })}
                          onDragEndImage={() => setDraggedVenueImage(null)}
                          onDropAt={(targetIdx) => handleImageDrop(category.key, targetIdx)}
                          onAdd={(files) => handleImageUpload(category.key, files)}
                          onRemove={(idx) => handleRemoveImage(category.key, idx)}
                          onMove={(idx, direction) => handleMoveImage(category.key, idx, direction)}
                          onImageClick={(idx) => setLightboxIndex(offset + idx)}
                        />
                      );
                    })}

                    {/* 전체 - 카테고리를 미리 고르지 않고 여러 장을 한 번에 올리는 일괄 업로드.
                        올린 사진은 그대로 이 칸에 쌓이고(자동으로 다른 카테고리에 흩어지지
                        않음), 위 카드들처럼 드래그해서 원하는 카테고리로 옮기면 된다. */}
                    <div className="pt-6 border-t border-dashed border-[#E5E8EB]">
                      <CategoryImageGrid
                        categoryKey="pending"
                        label="전체"
                        max={null}
                        images={editedVenue.pendingImages || []}
                        isRepresentative={false}
                        isUploading={isUploading}
                        draggedImage={draggedVenueImage}
                        onDragStartImage={(idx) => setDraggedVenueImage({ categoryKey: "pending", idx })}
                        onDragEndImage={() => setDraggedVenueImage(null)}
                        onDropAt={(targetIdx) => handleImageDrop("pending", targetIdx)}
                        onAdd={(files) => handleBulkImageUpload(files)}
                        onRemove={(idx) => handleRemoveImage("pending", idx)}
                        onMove={(idx, direction) => handleMoveImage("pending", idx, direction)}
                        onImageClick={(idx) => {
                          const pendingOffset = flattenVenueImages(editedVenue.imagesByCategory).length;
                          setLightboxIndex(pendingOffset + idx);
                        }}
                      />
                      <p className="text-[11px] font-bold text-[#ADB5BD] mt-2">
                        카테고리 상관없이 여러 장을 한 번에 올려요. 올라온 사진 카드를 위 카테고리로 드래그해서 옮길 수 있어요.
                      </p>
                    </div>
                    </>
                  ) : (
                    (() => {
                      const displayByCategory = toDisplayImagesByCategory(editedVenue);
                      let runningOffset = 0;
                      const categorySections = VENUE_IMAGE_CATEGORIES.map((category) => {
                        const categoryImages = displayByCategory[category.key] || [];
                        if (categoryImages.length === 0) return null;
                        const offset = runningOffset;
                        runningOffset += categoryImages.length;
                        return (
                          <div key={category.key}>
                            <p className="text-[13px] font-black text-[#4E5968] mb-3">
                              {category.label} <span className="text-[#ADB5BD] font-bold">{categoryImages.length}</span>
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                              {categoryImages.map((img: string, idx: number) => (
                                <div key={idx} className="relative rounded-2xl overflow-hidden border border-[#E5E8EB]">
                                  <img src={img} className="w-full aspect-[4/3] object-cover cursor-zoom-in" alt="" onClick={() => setLightboxIndex(offset + idx)} />
                                  {offset + idx === 0 && (
                                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#3182F6] text-white text-[10px] font-black rounded-full shadow-md pointer-events-none">
                                      대표 사진
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                      const pendingImages: string[] = editedVenue.pendingImages || [];
                      const pendingOffset = runningOffset;
                      return (
                        <>
                          {categorySections}
                          {pendingImages.length > 0 && (
                            <div>
                              <p className="text-[13px] font-black text-[#4E5968] mb-3">
                                전체 (미분류) <span className="text-[#ADB5BD] font-bold">{pendingImages.length}</span>
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {pendingImages.map((img: string, idx: number) => (
                                  <div key={idx} className="relative rounded-2xl overflow-hidden border border-[#E5E8EB]">
                                    <img src={img} className="w-full aspect-[4/3] object-cover cursor-zoom-in" alt="" onClick={() => setLightboxIndex(pendingOffset + idx)} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>

                {isUploading && (
                  <div className="w-full h-32 mt-3 bg-[#E5E8EB] animate-pulse rounded-2xl flex flex-col items-center justify-center text-[#8B95A1] gap-2">
                    <ImageIcon className="w-6 h-6 animate-bounce" />
                    <span className="text-[13px] font-bold">업로드 중...</span>
                  </div>
                )}
              </div>

              {/* 소속 및 상세 정보: 교회 이름/주소 · 기본 정보 · 시설 및 장비 · 가이드라인 정보 */}
              <div className="w-full bg-white rounded-[28px] border border-[#E5E8EB] shadow-sm p-6 md:p-10">
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-4 py-1.5 bg-[#E8F3FF] text-[#3182F6] rounded-full text-[13px] font-black">{editedVenue.denomination}</span>
                    <span className="text-[14px] font-bold text-[#8B95A1]">신청자: {editedVenue.applicantName}</span>
                    {editedVenue.applicantContact && (
                      <a
                        href={`tel:${editedVenue.applicantContact}`}
                        className="flex items-center gap-1 text-[14px] font-black text-[#3182F6] hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" /> {editedVenue.applicantContact}
                      </a>
                    )}
                  </div>

                  {isEditMode ? (
                    <input name="venueName" value={editedVenue.venueName || ""} onChange={handleEditChange} className="text-[28px] font-black w-full bg-[#F2F4F6] rounded-2xl p-4 border border-[#E5E8EB] outline-none focus:border-[#3182F6] text-[#191F28]" />
                  ) : (
                    <h2 className="text-[36px] font-black text-[#191F28] leading-tight mb-2">{editedVenue.venueName}</h2>
                  )}

                  <div className="flex items-center gap-1.5 text-[#4E5968] text-[15px] font-bold mt-3">
                    <MapPin className="w-4 h-4 text-[#3182F6]" /> {editedVenue.location}
                  </div>

                  <div className="p-5 bg-[#FAFAFB] rounded-[24px] border border-[#F2F4F6] mt-6">
                    <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ClipboardCheck className="w-4 h-4 text-[#3182F6]" /> 장소 제공 목적
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {VENUE_PURPOSE_OPTIONS.map((purpose) => {
                        const isActive = (editedVenue.purposes || []).includes(purpose);
                        return (
                          <button
                            key={purpose}
                            disabled={!isEditMode}
                            onClick={() => handleTogglePurpose(purpose)}
                            className={`px-4 py-2.5 rounded-full text-[13px] font-bold border flex items-center gap-2 transition-all ${isActive ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#6B7684]"} ${isEditMode ? "cursor-pointer active:scale-95" : "cursor-default opacity-80"}`}
                          >
                            {purpose}
                            {isEditMode && isActive && <Check className="w-3.5 h-3.5 ml-0.5" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-5 bg-[#FAFAFB] rounded-[24px] border border-[#F2F4F6] mt-4">
                    <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#3182F6]" /> 장소 부여 뱃지 관리
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_BADGES.map((badge) => {
                        const isTargetActive = (editedVenue.badges || []).includes(badge.id);
                        const IconComponent = badge.icon;
                        return (
                          <button
                            key={badge.id}
                            disabled={!isEditMode}
                            onClick={() => handleToggleBadge(badge.id)}
                            style={{
                              borderColor: isTargetActive ? badge.color : "#E5E8EB",
                              backgroundColor: isTargetActive ? badge.bg : "#FFFFFF",
                              color: isTargetActive ? badge.color : "#6B7684"
                            }}
                            className={`px-4 py-2.5 rounded-full text-[13px] font-bold border flex items-center gap-2 transition-all ${isEditMode ? "cursor-pointer active:scale-95" : "cursor-default opacity-80"
                              }`}
                          >
                            <IconComponent className="w-4 h-4 shrink-0" />
                            {badge.label}
                            {isEditMode && isTargetActive && <Check className="w-3.5 h-3.5 ml-0.5" strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-5 bg-[#FAFAFB] rounded-[24px] border border-[#F2F4F6] mt-4">
                    <p className="text-[12px] font-black text-[#8B95A1] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#3182F6]" /> 장소 태그 키워드
                    </p>
                    <TagEditor
                      tags={editedVenue.tags || []}
                      onChange={(tags) => setEditedVenue({ ...editedVenue, tags })}
                      readOnly={!isEditMode}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <section className="space-y-4">
                    <h3 className="text-[16px] font-black text-[#191F28] flex items-center gap-2 px-1">
                      <Info className="w-4 h-4 text-[#3182F6]" /> 기본 정보
                    </h3>
                    <div className="bg-[#FAFAFB] rounded-3xl p-3 border border-[#F2F4F6] grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <InfoRow icon={Users} label="수용 인원" name="capacity" value={editedVenue.capacity} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Utensils} label="식당 인원" name="cafeteriaCapacity" value={editedVenue.cafeteriaCapacity} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={CreditCard} label="기본 1박 요금" name="price" value={editedVenue.price} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Maximize2} label="주강당 면적" name="hallSize" value={editedVenue.hallSize} isEdit={isEditMode} onChange={handleEditChange} />
                    </div>
                  </section>

                  {/* 신청/소개 정보 - 승인·반려 안내 메일을 받을 주소, 유입 경로, 정보 사용 동의 여부 */}
                  <section className="space-y-4">
                    <h3 className="text-[16px] font-black text-[#191F28] flex items-center gap-2 px-1">
                      <Mail className="w-4 h-4 text-[#3182F6]" /> 신청/소개 정보
                    </h3>
                    <div className="bg-[#FAFAFB] rounded-3xl p-3 border border-[#F2F4F6] grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <InfoRow icon={Mail} label="안내 이메일" name="applicantEmail" value={editedVenue.applicantEmail} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow
                        icon={Megaphone}
                        label="유입 경로"
                        value={editedVenue.referralSource
                          ? (editedVenue.referralDetail ? `${editedVenue.referralSource} (${editedVenue.referralDetail})` : editedVenue.referralSource)
                          : "미응답"}
                        isEdit={false}
                      />
                      <InfoRow
                        icon={ClipboardCheck}
                        label="정보 사용 동의"
                        value={editedVenue.agreedToDataUse ? "동의함" : "미동의"}
                        isEdit={false}
                      />
                      <InfoRow
                        icon={Ban}
                        label="부적합 시 취소 동의"
                        value={editedVenue.agreedToCancellationPolicy ? "동의함" : "미동의"}
                        isEdit={false}
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[16px] font-black text-[#191F28] flex items-center gap-2 px-1">
                      <Music className="w-4 h-4 text-[#3182F6]" /> 시설 및 장비
                    </h3>
                    <div className="bg-[#FAFAFB] rounded-3xl p-3 border border-[#F2F4F6] grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <InfoRow icon={Music} label="보유 악기" name="instruments" value={editedVenue.instruments} isEdit={isEditMode} onChange={handleEditChange} multiline />
                      <InfoRow icon={Mic2} label="음향 시스템" name="soundSystem" value={editedVenue.soundSystem} isEdit={isEditMode} onChange={handleEditChange} multiline />
                      <InfoRow icon={Video} label="영상 장비" name="projector" value={editedVenue.projector} isEdit={isEditMode} onChange={handleEditChange} multiline />

                      {/* 에어컨 시설: Firestore에 boolean으로 저장되므로 텍스트가 아닌 있음/없음 토글로 편집 */}
                      <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-[#F2F4F6]">
                        <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
                          <Wind className="w-4 h-4 text-[#ADB5BD]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">에어컨 시설</p>
                          {isEditMode ? (
                            <div className="flex gap-2">
                              {['있음', '없음'].map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setEditedVenue({ ...editedVenue, airConditioner: opt === '있음' })}
                                  className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl border transition-all ${(editedVenue.airConditioner ?? false) === (opt === '있음')
                                    ? 'border-[#3182F6] bg-[#E8F3FF] text-[#3182F6]'
                                    : 'border-[#E5E8EB] bg-white text-[#8B95A1]'
                                    }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[16px] font-black text-[#3182F6] leading-snug">{editedVenue.airConditioner ? '설치됨' : '없음'}</p>
                          )}
                        </div>
                      </div>

                      <InfoRow icon={Car} label="주차 정보" name="parkingCapacity" value={editedVenue.parkingCapacity} isEdit={isEditMode} onChange={handleEditChange} multiline />
                      <InfoRow icon={Bath} label="샤워실 / 화장실 구성" name="showerBathroom" value={editedVenue.showerBathroom} isEdit={isEditMode} onChange={handleEditChange} multiline />
                      <InfoRow icon={Volume2} label="야간 소음 제한" name="nightEventLimit" value={editedVenue.nightEventLimit} isEdit={isEditMode} onChange={handleEditChange} />
                    </div>
                  </section>
                </div>

                <div className="mt-10">
                  <section className="space-y-4">
                    <h3 className="text-[16px] font-black text-[#191F28] flex items-center gap-2 px-1">
                      <Utensils className="w-4 h-4 text-[#3182F6]" /> 가이드라인 정보
                    </h3>
                    <div className="space-y-3">
                      <div className="p-5 bg-[#FAFAFB] border border-[#F2F4F6] rounded-[24px]">
                        <p className="text-[12px] font-black text-[#8B95A1] mb-2 uppercase tracking-wider">식사 안내</p>
                        {isEditMode ? (
                          <textarea name="mealNote" value={editedVenue.mealNote || ""} onChange={handleEditChange} placeholder="식사 정보를 기술하세요." className="w-full p-4 bg-white border border-[#E5E8EB] rounded-xl text-[15px] font-medium min-h-[250px] outline-none focus:border-[#3182F6] transition-all" />
                        ) : (
                          <p className="text-[15px] font-bold text-[#4E5968] whitespace-pre-wrap">{editedVenue.mealNote || "정보가 비어있습니다."}</p>
                        )}
                      </div>

                      <div className="p-5 bg-[#FAFAFB] border border-[#F2F4F6] rounded-[24px]">
                        <p className="text-[12px] font-black text-[#8B95A1] mb-2 uppercase tracking-wider">장소 상세 소개</p>
                        {isEditMode ? (
                          <textarea name="description" value={editedVenue.description || ""} onChange={handleEditChange} placeholder="상세 정보를 기술하세요." className="w-full p-4 bg-white border border-[#E5E8EB] rounded-xl text-[15px] font-medium min-h-[1000px] outline-none focus:border-[#3182F6] transition-all" />
                        ) : (
                          <p className="text-[15px] font-bold text-[#4E5968] leading-relaxed whitespace-pre-wrap">{editedVenue.description || "정보가 비어있습니다."}</p>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* 예약금/요금 정책: 정밀 정산 및 정책 패널 */}
              <div className="w-full bg-white rounded-[28px] border border-[#E5E8EB] shadow-sm p-5 md:p-10">
                <div className="space-y-8">

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* 블록 1: 장소 예약금 설정 정밀 필드 */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[#3182F6]" />
                      <h3 className="text-[18px] font-black text-[#191F28]">장소 예약금 설정</h3>
                    </div>
                    <p className="text-[13px] text-[#6B7684] leading-relaxed font-medium">
                      플랫폼에서 유저가 예약 요청을 보낼 때 선결제 처리할 <span className="text-[#3182F6] font-bold">확정 예약금 비율 혹은 금액</span>을 설정합니다.
                    </p>

                    {/* 선택 방식 스위치 탭 */}
                    <div className="flex p-1 bg-[#F2F4F6] rounded-xl border border-[#E5E8EB]">
                      <button
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => setDepositType("percent")}
                        className={`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all ${depositType === "percent" ? "bg-white text-[#3182F6] shadow-sm" : "text-[#8B95A1]"}`}
                      >
                        퍼센트(%) 기준
                      </button>
                      <button
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => setDepositType("amount")}
                        className={`flex-1 py-2 text-[14px] font-bold rounded-lg transition-all ${depositType === "amount" ? "bg-white text-[#3182F6] shadow-sm" : "text-[#8B95A1]"}`}
                      >
                        직접 금액 명시
                      </button>
                    </div>

                    {/* 정산 액션 바디 */}
                    <div className="p-5 bg-[#FAFAFB] border border-[#F2F4F6] rounded-2xl space-y-4">
                      {depositType === "percent" ? (
                        <div className="space-y-3">
                          <label className="text-[11px] font-black text-[#8B95A1] uppercase tracking-wider">예약금 비율 선점</label>
                          <div className="flex gap-2">
                            {[10, 20, 30].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                disabled={!isEditMode}
                                onClick={() => setEditedVenue({ ...editedVenue, depositPercent: pct, depositAmount: "" })}
                                className={`flex-1 py-3 text-[14px] font-bold rounded-xl border transition-all ${(editedVenue.depositPercent === pct || (!editedVenue.depositPercent && pct === 10))
                                  ? "border-[#3182F6] bg-[#E8F3FF] text-[#3182F6]"
                                  : "border-[#E5E8EB] bg-white text-[#6B7684]"
                                  }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>

                          {/* 실시간 시뮬레이터 안내 피드백 */}
                          <div className="pt-2 border-t border-[#E5E8EB] flex justify-between text-[13px] font-bold">
                            <span className="text-[#6B7684]">현재 기준 예약금액:</span>
                            <span className="text-[#191F28]">
                              {formatNumber(Math.floor((Number(editedVenue.price || 0) * (editedVenue.depositPercent || 10)) / 100))} 원
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-[#8B95A1] uppercase tracking-wider">확정 예약 금액 입력</label>
                          <div className="relative">
                            <input
                              type="text"
                              disabled={!isEditMode}
                              placeholder="예: 400,000"
                              value={formatNumber(editedVenue.depositAmount)}
                              onChange={(e) => setEditedVenue({ ...editedVenue, depositAmount: unformatNumber(e.target.value), depositPercent: 0 })}
                              className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[15px] font-bold outline-none focus:border-[#3182F6] text-[#191F28]"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#8B95A1]">원</span>
                          </div>
                          {Number(editedVenue.depositAmount) > Number(editedVenue.price) && (
                            <p className="text-[11px] text-[#F04452] font-semibold mt-1">⚠️ 총 금액보다 예약금이 더 큽니다.</p>
                          )}

                          {Number(editedVenue.depositAmount) <= Number(editedVenue.price) && (
                            <div className="pt-3 mt-1 border-t border-[#E5E8EB] flex flex-col gap-1 text-[13px] font-bold">
                              <div className="flex justify-between">
                                <span className="text-[#6B7684]">현장 결제 잔금:</span>
                                <span className="text-[#3182F6]">
                                  {formatNumber(Number(editedVenue.price || 0) - Number(editedVenue.depositAmount || 0))} 원
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 블록 2: 시즌별 요금 연간 반복 커스텀 제어 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#3182F6]" />
                        <h3 className="text-[18px] font-black text-[#191F28]">시즌별 요금 관리</h3>
                      </div>

                      {/* 스위치 컴포넌트 */}
                      {/* <button
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => setEditedVenue({ ...editedVenue, useSeasonalPrice: !editedVenue.useSeasonalPrice })}
                        className={`w-12 h-7 rounded-full transition-colors relative outline-none border border-transparent ${editedVenue.useSeasonalPrice ? "bg-[#3182F6]" : "bg-[#D1D6DB]"
                          }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${editedVenue.useSeasonalPrice ? "translate-x-5" : "translate-x-0"
                          }`} />
                      </button> */}
                      <button
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => setEditedVenue({ ...editedVenue, useSeasonalPrice: !editedVenue.useSeasonalPrice })}
                        className={`w-12 h-7 rounded-full transition-colors relative outline-none border border-transparent ${editedVenue.useSeasonalPrice ? "bg-[#3182F6]" : "bg-[#D1D6DB]"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${editedVenue.useSeasonalPrice ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                    <p className="text-[13px] text-[#6B7684] leading-relaxed font-medium">
                      연도 스케일 없이 <span className="text-[#191F28] font-bold">월-일 정보만 매핑</span>하여 매년 돌아오는 특정 기간의 요금을 자동 체인징 빌드합니다.
                    </p>

                    {/* 시즌 설정 폼 동적 락킹 */}
                    <div className={`space-y-3 transition-opacity ${editedVenue.useSeasonalPrice ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                      {(editedVenue.seasonPrices || []).map((season: any, idx: number) => {
                        return (
                          <div key={idx} className="p-4 bg-[#FAFAFB] border border-[#E5E8EB] rounded-2xl space-y-3">
                            <div className="flex justify-between items-center gap-2">
                              <div className="flex gap-1.5">
                                {["성수기", "비성수기"].map((label) => {
                                  // 기존 장소의 기본 이름 "비수기"도 비성수기로 표시한다.
                                  const isSelected = season.label === label || (label === "비성수기" && season.label === "비수기");
                                  return (
                                    <button
                                      key={label}
                                      type="button"
                                      disabled={!isEditMode}
                                      onClick={() => handleSeasonPriceChange(idx, "label", label)}
                                      className={`px-3 py-1.5 rounded-lg text-[12px] font-black transition-all ${isSelected ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#8B95A1]"}`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                              {isEditMode && (
                                <button
                                  type="button"
                                  onClick={() => setEditedVenue({ ...editedVenue, seasonPrices: editedVenue.seasonPrices.filter((_: any, i: number) => i !== idx) })}
                                  aria-label="시즌 삭제"
                                  className="p-1.5 text-[#8B95A1] hover:text-[#F04452] hover:bg-[#FFF0F0] rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-[#8B95A1] block mb-1">시작일</label>
                                <SeasonDatePicker
                                  value={season.start}
                                  disabled={!isEditMode}
                                  onChange={(monthDay) => handleSeasonPriceChange(idx, "start", monthDay)}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-[#8B95A1] block mb-1">종료일</label>
                                <SeasonDatePicker
                                  value={season.end}
                                  disabled={!isEditMode}
                                  alignRight
                                  onChange={(monthDay) => handleSeasonPriceChange(idx, "end", monthDay)}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-[#8B95A1] block mb-1">1박 요금</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="해당 시즌 적용 요금"
                                  disabled={!isEditMode}
                                  value={formatNumber(season.price)}
                                  onChange={(e) => handleSeasonPriceChange(idx, "price", e.target.value)}
                                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold text-right outline-none focus:border-[#3182F6]"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#8B95A1]">원</span>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-[#8B95A1] block mb-1">추가 1박 요금 (선택)</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="비워 두면 1박 요금과 동일"
                                  disabled={!isEditMode}
                                  value={formatNumber(season.extraNightPrice)}
                                  onChange={(e) => handleSeasonPriceChange(idx, "extraNightPrice", e.target.value)}
                                  className="w-full pl-4 pr-10 py-2.5 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold text-right outline-none focus:border-[#3182F6]"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#8B95A1]">원</span>
                              </div>
                              <p className="mt-1 text-[11px] font-bold text-[#8B95A1] break-keep">입력하면 이 장소의 3박 이상 예약은 스테이온 문의로 안내됩니다.</p>
                            </div>
                          </div>
                        );
                      })}

                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => setEditedVenue({
                            ...editedVenue,
                            seasonPrices: [...(editedVenue.seasonPrices || []), { label: "성수기", start: "", end: "", price: "", extraNightPrice: "" }],
                          })}
                          className="w-full py-3 flex items-center justify-center gap-1.5 bg-white border border-dashed border-[#B0B8C1] rounded-2xl text-[13px] font-black text-[#4E5968] hover:border-[#3182F6] hover:text-[#3182F6] transition-all"
                        >
                          <Plus className="w-4 h-4" /> 시즌 추가
                        </button>
                      )}
                      {(editedVenue.seasonPrices || []).length > 2 && (
                        <p className="text-[11px] font-bold text-[#8B95A1] break-keep">기간이 겹치면 목록에서 위에 있는 시즌의 요금이 적용됩니다.</p>
                      )}
                    </div>
                  </div>
                </div>

                  <div className="mt-10 pt-8 border-t border-[#E5E8EB] space-y-8">
                    {/* 기존 운영 옵션 설정 유지 및 수정 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#3182F6]" />
                        <h3 className="text-[18px] font-black text-[#191F28]">운영 옵션 설정</h3>
                      </div>
                      <button
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => setEditedVenue({ ...editedVenue, useTimeSlotPrice: !editedVenue.useTimeSlotPrice })}
                        className={`w-12 h-7 rounded-full transition-colors relative outline-none border border-transparent ${editedVenue.useTimeSlotPrice ? "bg-[#3182F6]" : "bg-[#D1D6DB]"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${editedVenue.useTimeSlotPrice ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>

                    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity ${editedVenue.useTimeSlotPrice ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                      {(editedVenue.timeSlotOptions || Array.from({ length: 8 }).map(() => ({ days: [], start: "", end: "", price: "" }))).map((option: any, i: number) => (
                        <div key={i} className="p-5 bg-[#FAFAFB] border border-[#E5E8EB] rounded-2xl space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-black text-[#4E5968]">운영 옵션 {i + 1}</span>
                          </div>
                          

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#8B95A1]">옵션 명칭 (예: 데이권, 올인원)</label>
                            <input 
                              type="text" 
                              placeholder="예: 주간권" 
                              value={option.label || ""} 
                              onChange={(e) => handleTimeSlotChange(i, "label", e.target.value)} 
                              className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl text-[14px] font-bold outline-none focus:border-[#3182F6] transition-all" 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#8B95A1]">운영 요일</label>
                            <div className="flex gap-1.5">
                              {['일', '월', '화', '수', '목', '금', '토'].map((day, dIdx) => {
                                const currentDays = Array.isArray(option.days) ? option.days : [];
                                const isSelected = currentDays.includes(dIdx);
                                return (
                                  <button key={day} type="button" onClick={() => {
                                    const newDays = isSelected ? currentDays.filter((d: number) => d !== dIdx) : [...currentDays, dIdx].sort((a, b) => a - b);
                                    handleTimeSlotChange(i, "days", newDays);
                                  }} className={`flex-1 py-2.5 text-[12px] font-black border rounded-xl transition-all ${isSelected ? "bg-[#3182F6] text-white border-[#3182F6]" : "bg-[#F9FAFB] border-[#E5E8EB] text-[#8B95A1]"}`}>
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-[#8B95A1]">시작 시간</label>
                              <input type="time" value={option.start || ""} onChange={(e) => handleTimeSlotChange(i, "start", e.target.value)} className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold text-center outline-none focus:border-[#3182F6]" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-[#8B95A1]">종료 시간</label>
                              <input type="time" value={option.end || ""} onChange={(e) => handleTimeSlotChange(i, "end", e.target.value)} className="w-full px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold text-center outline-none focus:border-[#3182F6]" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-[#8B95A1]">대여 금액</label>
                            <div className="relative">
                              <input type="text" value={option.price ? formatNumber(option.price) : ""} onChange={(e) => handleTimeSlotChange(i, "price", e.target.value.replace(/[^0-9]/g, ''))} className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold text-right outline-none focus:border-[#3182F6]" />
                              <span className="absolute left-4 top-3.5 text-[14px] font-bold text-[#4E5968]">₩</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity ${editedVenue.useTimeSlotPrice ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                      {/* 인당 추가 금액 옵션 */}
                      {/* <div className="bg-white p-5 border border-[#E5E8EB] rounded-2xl space-y-3">
                        <h4 className="text-[14px] font-black text-[#191F28] flex items-center gap-2">인당 추가 금액 설정</h4>
                        <div className="relative">
                          <input type="text" value={editedVenue.perPersonPrice ? formatNumber(editedVenue.perPersonPrice) : ""} onChange={(e) => setEditedVenue({ ...editedVenue, perPersonPrice: e.target.value.replace(/[^0-9]/g, '') })} className="w-full pl-10 pr-4 py-3 bg-[#FAFAFB] border border-[#E5E8EB] rounded-xl text-[14px] font-bold text-right outline-none focus:border-[#3182F6]" />
                          <span className="absolute left-4 top-3.5 text-[14px] font-bold text-[#4E5968]">₩</span>
                        </div>
                      </div> */}

                      <div className="bg-white p-5 border border-[#E5E8EB] rounded-2xl space-y-3">
                        <h4 className="text-[14px] font-black text-[#191F28] flex items-center gap-2">
                          기본 인원 설정 🔴
                        </h4>
                        <div className="relative">
                          <input 
                            type="number" 
                            value={editedVenue.baseCapacity || ""} 
                            onChange={(e) => setEditedVenue({ ...editedVenue, baseCapacity: Number(e.target.value) })} 
                            className="w-full px-4 py-3 bg-[#FAFAFB] border border-[#E5E8EB] rounded-xl text-[14px] font-bold outline-none focus:border-[#3182F6]"
                            placeholder="예: 4"
                          />
                          <span className="absolute right-4 top-3.5 text-[14px] font-bold text-[#8B95A1]">명</span>
                        </div>
                        <p className="text-[12px] text-[#8B95A1] font-medium">기본 인원 초과 시 아래 설정한 추가 금액이 적용됩니다.</p>
                      </div>

                      <div className="bg-white p-5 border border-[#E5E8EB] rounded-2xl space-y-3">
                        <h4 className="text-[14px] font-black text-[#191F28] flex items-center gap-2">인당 추가 금액 설정 🔴</h4>
                        <div className="relative">
                          <input type="text" value={editedVenue.perPersonPrice ? formatNumber(editedVenue.perPersonPrice) : ""} onChange={(e) => setEditedVenue({ ...editedVenue, perPersonPrice: e.target.value.replace(/[^0-9]/g, '') })} className="w-full pl-10 pr-4 py-3 bg-[#FAFAFB] border border-[#E5E8EB] rounded-xl text-[14px] font-bold text-right outline-none focus:border-[#3182F6]" />
                          <span className="absolute left-4 top-3.5 text-[14px] font-bold text-[#4E5968]">₩</span>
                        </div>
                      </div>

                      {/* 유상 옵션 항목 설정 (1~5) */}
                      <div className="lg:col-span-2 bg-white p-5 border border-[#E5E8EB] rounded-2xl space-y-6">
                        <h4 className="text-[14px] font-black text-[#191F28] flex items-center gap-2">
                          추가 유상 옵션 설정 🔴
                        </h4>

                        {Array.from({ length: 5 }).map((_, idx) => {
                          // 여기서 각 항목의 기본값을 안전하게 가져옵니다.
                          const opt = (editedVenue.extraOptions && editedVenue.extraOptions[idx]) || { name: "", price: "" };

                          return (
                            <div key={idx} className="space-y-3 pb-4 border-b border-[#F2F4F6] last:border-0 last:pb-0">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#8B95A1]">유상 옵션 항목명 {idx + 1}</label>
                                <input
                                  type="text"
                                  placeholder={`항목명 ${idx + 1}`}
                                  value={opt.name || ""}
                                  onChange={(e) => {
                                    const newOpts = editedVenue.extraOptions ? [...editedVenue.extraOptions] : Array.from({ length: 5 }).map(() => ({ name: "", price: "" }));
                                    newOpts[idx] = { ...newOpts[idx], name: e.target.value };
                                    setEditedVenue({ ...editedVenue, extraOptions: newOpts });
                                  }}
                                  className="w-full px-4 py-3 bg-[#FAFAFB] border border-[#E5E8EB] rounded-xl text-[14px] font-bold outline-none focus:border-[#3182F6]"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#8B95A1]">유상 옵션 항목 금액 {idx + 1}</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="0"
                                    value={opt.price ? formatNumber(opt.price) : ""}
                                    onChange={(e) => {
                                      const newOpts = editedVenue.extraOptions ? [...editedVenue.extraOptions] : Array.from({ length: 5 }).map(() => ({ name: "", price: "" }));
                                      newOpts[idx] = { ...newOpts[idx], price: e.target.value.replace(/[^0-9]/g, '') };
                                      setEditedVenue({ ...editedVenue, extraOptions: newOpts });
                                    }}
                                    className="w-full pl-10 pr-4 py-3 bg-[#FAFAFB] border border-[#E5E8EB] rounded-xl text-[14px] font-bold text-right outline-none focus:border-[#3182F6]"
                                  />
                                  <span className="absolute left-4 top-3.5 text-[14px] font-bold text-[#4E5968]">₩</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 하단 제어 결합 인터랙션 버튼 바 - "국내 선교 장소로 추가"는 편집 모드 여부와
                    무관한 별개 동작이라 두 모드 버튼 줄 모두에 넣는다. */}
                <div className="pt-8 border-t border-[#F2F4F6] flex gap-3 mt-8">
                  {isEditMode ? (
                    <>
                      <button onClick={() => setIsEditMode(false)} className="flex-1 py-4.5 bg-[#F2F4F6] text-[#6B7684] rounded-2xl font-bold text-[16px] transition-all active:scale-95">취소</button>
                      {selectedVenue.missionVenueId ? (
                        <button disabled className="flex-1 py-4.5 bg-[#F2F4F6] text-[#ADB5BD] rounded-2xl font-bold text-[16px] cursor-not-allowed">이미 국내선교로 추가됨</button>
                      ) : (
                        <button onClick={() => handleCopyToMissionVenue(selectedVenue)} className="flex-1 py-4.5 bg-[#EFF6FF] text-[#2563EB] rounded-2xl font-bold text-[16px] transition-all active:scale-95">국내 선교 장소로 추가</button>
                      )}
                      <button onClick={handleUpdate} className="flex-[2] py-4.5 bg-[#3182F6] text-white rounded-2xl font-bold text-[16px] transition-all active:scale-95 shadow-md shadow-[#3182F6]/10">설정 저장</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => openEditModal(selectedVenue)} className="flex-1 py-4.5 bg-[#E8F3FF] text-[#3182F6] rounded-2xl font-bold text-[16px] transition-all active:scale-95">정보 및 정산 수정</button>
                      {selectedVenue.missionVenueId ? (
                        <button disabled className="flex-1 py-4.5 bg-[#F2F4F6] text-[#ADB5BD] rounded-2xl font-bold text-[16px] cursor-not-allowed">이미 국내선교로 추가됨</button>
                      ) : (
                        <button onClick={() => handleCopyToMissionVenue(selectedVenue)} className="flex-1 py-4.5 bg-[#EFF6FF] text-[#2563EB] rounded-2xl font-bold text-[16px] transition-all active:scale-95">국내 선교 장소로 추가</button>
                      )}
                      <button onClick={() => setSelectedVenue(null)} className="flex-1 py-4.5 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[16px] transition-all active:scale-95">닫기</button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      {/* 사진 확대보기(라이트박스): 전체화면으로 크게 보고, 좌우 화살표/방향키로 다른 사진도 넘겨볼 수 있다 */}
      <AnimatePresence>
        {lightboxIndex !== null && editedVenue?.images?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4 md:p-10"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-5 right-5 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            <span className="absolute top-6 left-6 text-white/70 text-[14px] font-bold">
              {lightboxIndex + 1} / {editedVenue.images.length}
            </span>

            {editedVenue.images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i: number | null) => ((i ?? 0) - 1 + editedVenue.images.length) % editedVenue.images.length); }}
                className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <motion.img
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              src={editedVenue.images[lightboxIndex]}
              className="max-w-full max-h-full object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
              alt=""
            />

            {editedVenue.images.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i: number | null) => ((i ?? 0) + 1) % editedVenue.images.length); }}
                className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {scheduleVenue && (
        <VenueScheduleModal
          venue={scheduleVenue}
          onToggleDate={(dateStr, isCurrentlyBlocked) => handleToggleBlockedDate(scheduleVenue.id, dateStr, isCurrentlyBlocked)}
          onClose={() => setScheduleVenueId(null)}
        />
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </AdminSidebarLayout>
  );
}
