import { useState, useEffect, useRef } from "react";
import { ScrollRestoration, useSearchParams } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Search, Mic2, Users, Speaker, PlaySquare,
  Phone, Mail, Church, User, ClipboardCheck, CalendarCheck, MapPinned, MapPin,
  CreditCard, Calendar, Trash2, X, RotateCcw, Share2, Edit3, Save, ShieldOff, Lock, ImagePlus, ChevronDown, TrendingUp,
  Eye, Copy, PhoneCall, BarChart3, Megaphone, Download, Camera, AtSign,
} from "lucide-react";
import { db, functions } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { uploadTeamImage } from "../lib/storage";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import { DENOMINATION_GROUPS } from "../lib/denominations";
import { REGION_OPTIONS } from "../lib/regions";
import { EQUIPMENT_OPTIONS } from "../lib/teamDisplay";

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
          className="w-full px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold focus:border-[#3182F6] outline-none transition-all"
        />
      ) : (
        <p className="text-[15px] font-bold text-[#333D4B] leading-snug break-words">{value || "-"}</p>
      )}
    </div>
  </div>
);

// [소속 교단 선택] /team-register 등록 폼과 동일한 검색형 드롭다운(DENOMINATION_GROUPS)을
// 재사용해서, 관리자도 텍스트 직접 입력 대신 같은 목록에서 선택할 수 있게 한다.
const DENOMINATION_ITEMS = DENOMINATION_GROUPS.flatMap((g: any) => g.items) as string[];
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
              className="w-full px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold focus:border-[#3182F6] outline-none transition-all cursor-pointer flex items-center justify-between"
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
                className="w-full mt-2 px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-bold focus:border-[#3182F6] outline-none transition-all"
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

// [사역 가능 지역 선택] /team-register 등록 폼과 동일하게 버튼 클릭으로 다중 선택한다
// (기존에는 쉼표로 구분된 텍스트를 직접 입력해야 해서 등록 폼과 UX가 달랐다).
const RegionRow = ({ label, value, isEdit, onChange }: any) => {
  const list: string[] = Array.isArray(value)
    ? value
    : (typeof value === "string" ? value.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
  const allSelected = REGION_OPTIONS.every((r) => list.includes(r));
  const toggleAll = () => onChange(allSelected ? [] : [...REGION_OPTIONS]);
  const toggleOne = (r: string) => onChange(list.includes(r) ? list.filter((v) => v !== r) : [...list, r]);

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
        <MapPinned className="w-4 h-4 text-[#ADB5BD]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">{label}</p>
        {isEdit ? (
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            <button
              type="button"
              onClick={toggleAll}
              className={`py-2 rounded-xl text-[12px] font-bold border transition-all ${allSelected
                ? "border-[#3182F6] bg-[#E8F3FF] text-[#3182F6]"
                : "border-[#E5E8EB] bg-white text-[#8B95A1]"
                }`}
            >
              전체
            </button>
            {REGION_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => toggleOne(r)}
                className={`py-2 rounded-xl text-[12px] font-bold border transition-all ${list.includes(r)
                  ? "border-[#3182F6] bg-[#E8F3FF] text-[#3182F6]"
                  : "border-[#E5E8EB] bg-white text-[#8B95A1]"
                  }`}
              >
                {r}
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

// [장비 보유 여부 선택] /team-register 등록 폼과 동일한 3지선다 버튼(EQUIPMENT_OPTIONS)을 재사용한다.
const EquipmentRow = ({ label, value, isEdit, onChange }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
    <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
      <Speaker className="w-4 h-4 text-[#ADB5BD]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">{label}</p>
      {isEdit ? (
        <div className="flex flex-col gap-1.5 mt-1">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`text-left px-3 py-2.5 rounded-xl border transition-all ${value === opt.value
                ? "border-[#3182F6] bg-[#E8F3FF]"
                : "border-[#E5E8EB] bg-white hover:border-[#D1D6DB]"
                }`}
            >
              <span className={`block text-[13px] font-bold ${value === opt.value ? "text-[#3182F6]" : "text-[#191F28]"}`}>
                {opt.value}
              </span>
              <span className={`block text-[11px] font-bold mt-0.5 ${value === opt.value ? "text-[#3182F6]/70" : "text-[#8B95A1]"}`}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[15px] font-bold text-[#333D4B] leading-snug break-words">{value || "-"}</p>
      )}
    </div>
  </div>
);

// [활동 이력 링크] 기본 1칸에서 시작해 최대 10개까지 늘릴 수 있는 유튜브 링크 목록.
// 공개 상세페이지 "활동 영상" 섹션에서 대표 링크(youtubeUrl) 다음으로 이어서 보여준다.
const ActivityVideoLinksRow = ({ value, isEdit, onChange }: any) => {
  const list: string[] = Array.isArray(value) && value.length > 0 ? value : [""];
  const updateAt = (i: number, v: string) => {
    const next = [...list];
    next[i] = v;
    onChange(next);
  };
  const addRow = () => {
    if (list.length >= 10) return;
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
          활동 이력 링크 {isEdit && `(${list.filter(Boolean).length}/10)`}
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
                  className="flex-1 px-3 py-2 bg-white border border-[#E5E8EB] rounded-xl text-[13px] font-bold outline-none focus:border-[#3182F6]"
                />
                {list.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} className="shrink-0 p-2 text-[#ADB5BD] hover:text-[#F04452] transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {list.length < 10 && (
              <button
                type="button"
                onClick={addRow}
                className="w-full py-2 border border-dashed border-[#E5E8EB] rounded-xl text-[12px] font-bold text-[#8B95A1] hover:border-[#3182F6] hover:text-[#3182F6] transition-all"
              >
                + 링크 추가
              </button>
            )}
          </div>
        ) : list.filter(Boolean).length > 0 ? (
          <div className="space-y-1">
            {list.filter(Boolean).map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-[13px] font-bold text-[#3182F6] hover:underline break-all">
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

// [토글형 입력] 소속 여부/개인·팀 구분/음향 담당자처럼 boolean으로 저장되는 필드를 편집할 때 사용
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
                ? "border-[#3182F6] bg-[#E8F3FF] text-[#3182F6]"
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

type TeamTab = "pending" | "approved" | "rejected";
const VALID_TABS: TeamTab[] = ["pending", "approved", "rejected"];
const MAX_TEAM_IMAGES = 3;
const INSTRUCTOR_CATEGORIES = ["외부 강사", "레크리에이션 강사"];

export function AdminTeams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") as TeamTab) ? (searchParams.get("tab") as TeamTab) : "pending";
  const [activeTab, setActiveTabState] = useState<TeamTab>(initialTab);
  const setActiveTab = (tab: TeamTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  const [teams, setTeams] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTeam, setEditedTeam] = useState<any>(null);
  const [posterUploading, setPosterUploading] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const [boostAmount, setBoostAmount] = useState("7");
  const [boostUnit, setBoostUnit] = useState<"일" | "개월">("일");

  const getPosterImages = (team: any): string[] =>
    team.posterImages?.length ? team.posterImages : (team.posterImage ? [team.posterImage] : []);

  // Firebase Storage 이미지는 CORS가 열려 있어 fetch로 받아온 뒤 blob URL로 강제 다운로드시킬 수 있다.
  // 그냥 <a href download>만 쓰면 다른 출처(storage.googleapis.com)라 브라우저가 다운로드 대신
  // 새 탭에서 열어버리는 경우가 있어서, blob으로 한 번 감싸는 방식을 쓴다.
  const downloadImage = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("이미지 다운로드 실패:", error);
      alert("이미지 다운로드 중 오류가 발생했습니다.");
    }
  };

  const handlePosterFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const remainingSlots = MAX_TEAM_IMAGES - getPosterImages(editedTeam).length;
    if (remainingSlots <= 0) return;
    setPosterUploading(true);
    try {
      const urls = await Promise.all(
        files.slice(0, remainingSlots).map((file) => uploadTeamImage(file, editedTeam.teamName, editedTeam.applicantName))
      );
      setEditedTeam((prev: any) => {
        const images = [...getPosterImages(prev), ...urls].slice(0, MAX_TEAM_IMAGES);
        return { ...prev, posterImages: images, posterImage: images[0] || "" };
      });
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setPosterUploading(false);
    }
  };

  const removePosterImageAt = (idx: number) => {
    setEditedTeam((prev: any) => {
      const images = getPosterImages(prev).filter((_: string, i: number) => i !== idx);
      return { ...prev, posterImages: images, posterImage: images[0] || "" };
    });
  };

  const openTeamModal = (team: any) => {
    setSelectedTeam(team);
    setEditedTeam({ ...team });
    setIsEditMode(false);
  };

  const closeTeamModal = () => {
    setSelectedTeam(null);
    setEditedTeam(null);
    setIsEditMode(false);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedTeam((prev: any) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const q = query(collection(db, "ministryTeams"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeams(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubVenues = onSnapshot(collection(db, "venues"), (snap) => setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    // 사이드바 배지용: 차단된 회원 수도 함께 구독 (다른 관리자 페이지와 동일한 패턴)
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setSuspendedCount(snap.docs.filter((d) => d.data().status === "suspended").length);
    });
    return () => { unsubVenues(); unsubBookings(); unsubUsers(); };
  }, []);

  const adminEmail = getAuth().currentUser?.email || "admin@stayon.com";

  const pendingCount = teams.filter((t) => t.status === "pending").length;
  const approvedCount = teams.filter((t) => t.status === "approved").length;
  const rejectedCount = teams.filter((t) => t.status === "rejected").length;

  const filteredTeams = teams
    .filter((t) => t.status === activeTab)
    .filter((t) => !searchQuery.trim() || (t.teamName || "").includes(searchQuery) || (t.applicantName || "").includes(searchQuery));

  const handleStatusChange = async (id: string, newStatus: TeamTab) => {
    try {
      await updateDoc(doc(db, "ministryTeams", id), { status: newStatus });

      if (newStatus === "approved" && selectedTeam) {
        const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
        await triggerAdminNotification({
          type: "TEAM_APPROVE",
          payload: {
            teamName: selectedTeam.teamName,
            category: selectedTeam.category,
            applicantName: selectedTeam.applicantName,
          },
        });
      }

      closeTeamModal();
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  // 끌어올리기: 지정한 기간(일 단위) 뒤에 자동으로 상단 노출이 풀리도록 만료 시각을 저장한다.
  // 공개 목록(TeamList.tsx)에서 boostedUntil이 현재보다 미래인 팀을 최상단으로 정렬한다.
  const handleSetBoost = async (id: string, days: number) => {
    if (!days || days <= 0) return;
    try {
      const boostedAt = new Date();
      const boostedUntil = new Date(boostedAt.getTime() + days * 24 * 60 * 60 * 1000);
      const updateData = {
        boostedAt: Timestamp.fromDate(boostedAt),
        boostedUntil: Timestamp.fromDate(boostedUntil),
      };
      await updateDoc(doc(db, "ministryTeams", id), updateData);
      setSelectedTeam((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
      setEditedTeam((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
    } catch (error) {
      console.error("끌어올리기 설정 실패:", error);
      alert("끌어올리기 설정 중 오류가 발생했습니다.");
    }
  };

  const handleClearBoost = async (id: string) => {
    try {
      const updateData = { boostedAt: null, boostedUntil: null };
      await updateDoc(doc(db, "ministryTeams", id), updateData);
      setSelectedTeam((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
      setEditedTeam((prev: any) => (prev && prev.id === id ? { ...prev, ...updateData } : prev));
    } catch (error) {
      console.error("끌어올리기 해제 실패:", error);
      alert("끌어올리기 해제 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 신청 내역을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
    try {
      await deleteDoc(doc(db, "ministryTeams", id));
      closeTeamModal();
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = async () => {
    try {
      const { id, ...rest } = editedTeam;
      const updateData = {
        ...rest,
        serviceRegions: typeof rest.serviceRegions === "string"
          ? rest.serviceRegions.split(",").map((s: string) => s.trim()).filter(Boolean)
          : (rest.serviceRegions || []),
        teamComposition: typeof rest.teamComposition === "string"
          ? rest.teamComposition.split(",").map((s: string) => s.trim()).filter(Boolean)
          : (rest.teamComposition || []),
        activityVideoUrls: Array.isArray(rest.activityVideoUrls)
          ? rest.activityVideoUrls.map((u: string) => u.trim()).filter(Boolean).slice(0, 10)
          : [],
      };
      await updateDoc(doc(db, "ministryTeams", selectedTeam.id), updateData);
      setSelectedTeam({ ...selectedTeam, ...updateData });
      setEditedTeam({ ...selectedTeam, ...updateData });
      setIsEditMode(false);
      alert("수정 내용이 저장되었습니다.");
    } catch (error) {
      console.error("팀 정보 수정 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <AdminSidebarLayout
      brandSubtitle="외부 사역팀 관리자"
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
            { id: "pending", label: "검토 대기", count: pendingCount, icon: Clock, accentColor: "#FF9500" },
            { id: "approved", label: "승인 완료", count: approvedCount, icon: CheckCircle },
            { id: "rejected", label: "반려 / 삭제", count: rejectedCount, icon: XCircle },
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
      onSelect={(id) => setActiveTab(id as TeamTab)}
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
                onClick={() => setActiveTab(tab.id as TeamTab)}
                className={`flex-none px-4 py-2.5 rounded-[14px] text-[13px] font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684]"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <h1 className="text-[22px] md:text-[26px] font-black tracking-tight leading-tight mb-1">외부 사역팀 관리</h1>
            <p className="text-[#4E5968] font-bold text-[13px] md:text-[14px]">찬양팀/찬양사역자/세션 등 사역팀 등록 신청을 검토하고 승인하세요.</p>
          </div>

          <div className="relative mb-5 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="팀 이름 또는 대표자명으로 검색"
              className="w-full h-11 bg-white rounded-xl pl-10 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#3182F6] transition-all"
            />
          </div>

          {loading ? (
            <div className="py-32 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#3182F6] rounded-full animate-spin" />
              <p className="text-[14px] font-bold text-[#8B95A1]">목록을 불러오고 있어요</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="py-24 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
              <p className="text-[16px] font-black text-[#8B95A1]">해당하는 신청이 없어요</p>
            </div>
          ) : (
            <div className="bg-white rounded-[24px] border border-[#F2F4F6] overflow-hidden divide-y divide-[#F2F4F6]">
              {filteredTeams.map((team) => (
                <div key={team.id} onClick={() => openTeamModal(team)} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFB] transition-colors cursor-pointer">
                  <div className="w-11 h-11 rounded-2xl bg-[#F5F3FF] flex items-center justify-center shrink-0 overflow-hidden">
                    {team.posterImage ? <img src={team.posterImage} className="w-full h-full object-cover" /> : <Mic2 className="w-5 h-5 text-[#8B5CF6]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[15px] font-black text-[#191F28] truncate">{team.teamName}</p>
                      {team.boostedUntil?.toDate?.() && team.boostedUntil.toDate() > new Date() && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FFF7ED] text-[#C2410C] rounded text-[10px] font-black">
                          <TrendingUp className="w-2.5 h-2.5" /> 끌올중
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-0.5 min-w-0">
                      <span className="truncate">{team.category}</span><span className="w-1 h-1 bg-[#D1D6DB] rounded-full shrink-0" /><span className="truncate">{team.applicantName}</span>
                    </div>
                    <p className="text-[11px] font-bold text-[#ADB5BD] mt-1">
                      신청일 {team.createdAt?.toDate?.() ? team.createdAt.toDate().toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 상세 검토 모달 */}
      {selectedTeam && editedTeam && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#191F28]/80 backdrop-blur-md" onClick={closeTeamModal}>
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-[#F2F4F6] p-6 flex items-center justify-between z-10">
              <div className="flex-1 min-w-0">
                {isEditMode ? (
                  <div className="flex flex-col gap-2">
                    <select
                      name="category"
                      value={editedTeam.category}
                      onChange={(e) => setEditedTeam({ ...editedTeam, category: e.target.value, categoryCustom: e.target.value === "기독교 문화 사역" ? editedTeam.categoryCustom : "" })}
                      className="w-fit px-3 py-1.5 bg-[#F5F3FF] text-[#8B5CF6] rounded-full text-[12px] font-black outline-none border border-[#E5E8EB]"
                    >
                      {["찬양팀", "음향·조명", "찬양사역자", "세션", "외부 강사", "레크리에이션 강사", "기독교 문화 사역"].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {editedTeam.category === "기독교 문화 사역" && (
                      <input
                        name="categoryCustom"
                        value={editedTeam.categoryCustom || ""}
                        onChange={handleEditChange}
                        placeholder="구체적인 문화 사역 (예: 연극 사역)"
                        className="text-[12px] font-bold text-[#4E5968] px-3 py-1.5 border border-[#E5E8EB] rounded-full outline-none focus:border-[#3182F6]"
                      />
                    )}
                    <input name="teamName" value={editedTeam.teamName || ""} onChange={handleEditChange} className="text-[22px] font-black text-[#191F28] px-2 py-1 border border-[#E5E8EB] rounded-xl outline-none focus:border-[#3182F6]" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-3 py-1 bg-[#F5F3FF] text-[#8B5CF6] rounded-full text-[12px] font-black">{selectedTeam.category}</span>
                      {selectedTeam.category === "기독교 문화 사역" && selectedTeam.categoryCustom && (
                        <span className="px-3 py-1 bg-[#F2F4F6] text-[#4E5968] rounded-full text-[12px] font-black">{selectedTeam.categoryCustom}</span>
                      )}
                    </div>
                    <h2 className="text-[22px] font-black text-[#191F28] mt-2">{selectedTeam.teamName}</h2>
                    <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      신청일자: {selectedTeam.createdAt?.toDate?.() ? selectedTeam.createdAt.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "-"}
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
                <button onClick={closeTeamModal} className="p-2 bg-[#F2F4F6] rounded-full hover:bg-[#E5E8EB] transition-all">
                  <X className="w-5 h-5 text-[#4E5968]" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {isEditMode ? (
                <div>
                  <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-2">
                    팀 이미지 (최대 {MAX_TEAM_IMAGES}장, 첫 번째가 대표 이미지)
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {getPosterImages(editedTeam).map((src: string, idx: number) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-[#F2F4F6]">
                        <img src={src} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#3182F6] text-white text-[9px] font-black rounded-full pointer-events-none">
                            대표
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => downloadImage(src, `${editedTeam.teamName || "team"}_사진${idx + 1}.jpg`)}
                          className="absolute bottom-1.5 left-1.5 w-6 h-6 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all"
                          title="이미지 다운로드"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePosterImageAt(idx)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all"
                          title="이미지 제거"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {getPosterImages(editedTeam).length < MAX_TEAM_IMAGES && (
                      <button
                        type="button"
                        onClick={() => posterInputRef.current?.click()}
                        disabled={posterUploading}
                        className="aspect-square bg-[#FAFAFB] border-2 border-dashed border-[#E5E8EB] rounded-2xl flex flex-col items-center justify-center gap-1 text-[#ADB5BD] hover:bg-[#F2F4F6] hover:border-[#3182F6]/30 transition-all disabled:opacity-60"
                      >
                        <ImagePlus className="w-5 h-5" />
                        <span className="text-[11px] font-black">{posterUploading ? "업로드 중..." : "추가"}</span>
                      </button>
                    )}
                  </div>
                  <input ref={posterInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePosterFileChange} />
                </div>
              ) : (
                <div>
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-[#F2F4F6] mb-2">
                    <img
                      src={getPosterImages(selectedTeam)[0] || "/STAYON_TEAM_COVER_IMAGE.png"}
                      className="w-full h-full object-cover"
                    />
                    {getPosterImages(selectedTeam)[0] && (
                      <button
                        type="button"
                        onClick={() => downloadImage(getPosterImages(selectedTeam)[0], `${selectedTeam.teamName || "team"}_사진1.jpg`)}
                        className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1.5 bg-black/50 backdrop-blur-md text-white rounded-full text-[11px] font-bold hover:bg-black/70 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> 다운로드
                      </button>
                    )}
                  </div>
                  {getPosterImages(selectedTeam).length > 1 && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {getPosterImages(selectedTeam).slice(1).map((src: string, idx: number) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-[#F2F4F6] group">
                          <img src={src} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => downloadImage(src, `${selectedTeam.teamName || "team"}_사진${idx + 2}.jpg`)}
                            className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all"
                            title="이미지 다운로드"
                          >
                            <Download className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">끌어올리기</h3>
                <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-2xl p-4">
                  {selectedTeam.boostedUntil?.toDate?.() && selectedTeam.boostedUntil.toDate() > new Date() ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-[13px] font-bold text-[#C2410C]">
                        <TrendingUp className="w-4 h-4 shrink-0" />
                        {selectedTeam.boostedUntil.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}까지 상단 노출 중
                      </div>
                      <button
                        type="button"
                        onClick={() => handleClearBoost(selectedTeam.id)}
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
                        onClick={() => handleSetBoost(selectedTeam.id, Number(boostAmount) * (boostUnit === "개월" ? 30 : 1))}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#EA580C] text-white rounded-xl text-[13px] font-black hover:bg-[#C2410C] transition-all active:scale-95"
                      >
                        <TrendingUp className="w-4 h-4" /> 끌어올리기
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">팀 대표자 정보</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <InfoRow icon={User} label="대표자 이름" name="applicantName" value={editedTeam.applicantName} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Phone} label="연락처" name="applicantContact" value={editedTeam.applicantContact} isEdit={isEditMode} onChange={handleEditChange} />
                  <InfoRow icon={Mail} label="이메일" name="applicantEmail" value={editedTeam.applicantEmail} isEdit={isEditMode} onChange={handleEditChange} />
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">문의 현황</h3>
                <div className="bg-[#FAFAFB] rounded-2xl p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#4E5968]">
                    <Eye className="w-4 h-4 text-[#8B95A1]" /> 확인 {selectedTeam.contactRevealCount || 0}회
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#4E5968]">
                    <Copy className="w-4 h-4 text-[#8B95A1]" /> 복사 {selectedTeam.contactCopyCount || 0}회
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#4E5968]">
                    <PhoneCall className="w-4 h-4 text-[#8B95A1]" /> 통화시도 {selectedTeam.contactCallCount || 0}회
                  </div>
                </div>
                {selectedTeam.lastContactAt?.toDate?.() && (
                  <p className="text-[12px] font-medium text-[#8B95A1] px-1">
                    최근 문의: {selectedTeam.lastContactAt.toDate().toLocaleString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </section>

              {editedTeam.pastorDifferent && (
                <section className="space-y-2">
                  <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">담임목사님 정보</h3>
                  <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                    <InfoRow icon={User} label="성함" name="pastorName" value={editedTeam.pastorName} isEdit={isEditMode} onChange={handleEditChange} />
                    <ToggleRow icon={ClipboardCheck} label="담임목사님 상의 동의" value={editedTeam.pastorConsentAgreed} isEdit={isEditMode} onChange={(v: boolean) => setEditedTeam({ ...editedTeam, pastorConsentAgreed: v })} trueLabel="동의함" falseLabel="미동의" />
                    <InfoRow icon={Phone} label="연락처" name="pastorContact" value={editedTeam.pastorContact} isEdit={isEditMode} onChange={handleEditChange} />
                    <InfoRow icon={Mail} label="이메일" name="pastorEmail" value={editedTeam.pastorEmail} isEdit={isEditMode} onChange={handleEditChange} />
                  </div>
                </section>
              )}

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">소속 정보</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <ToggleRow icon={Church} label="소속 여부" value={editedTeam.hasChurch} isEdit={isEditMode} onChange={(v: boolean) => setEditedTeam({ ...editedTeam, hasChurch: v })} trueLabel="있음" falseLabel="없음 (검토 필요)" />
                  {editedTeam.hasChurch && (
                    <>
                      <InfoRow icon={Church} label="소속 교회명" name="churchName" value={editedTeam.churchName} isEdit={isEditMode} onChange={handleEditChange} />
                      <DenominationRow value={editedTeam.denomination} isEdit={isEditMode} onChange={(v: string) => setEditedTeam({ ...editedTeam, denomination: v })} />
                      {isEditMode ? (
                        <>
                          <InfoRow icon={MapPin} label="소속 교회 주소" name="churchAddress" value={editedTeam.churchAddress} isEdit onChange={handleEditChange} />
                          <InfoRow icon={MapPin} label="상세 주소" name="churchAddressDetail" value={editedTeam.churchAddressDetail} isEdit onChange={handleEditChange} />
                        </>
                      ) : (
                        <InfoRow
                          icon={MapPin}
                          label="소속 교회 주소"
                          value={[selectedTeam.churchAddress, selectedTeam.churchAddressDetail].filter(Boolean).join(" ")}
                        />
                      )}
                      <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                        <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
                          <Lock className="w-4 h-4 text-[#ADB5BD]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">소속 교회 공개 여부</p>
                          {isEditMode ? (
                            <div className="flex gap-2">
                              {[{ label: "공개", val: false }, { label: "비공개", val: true }].map((opt) => (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() => setEditedTeam({ ...editedTeam, churchNamePrivate: opt.val })}
                                  className={`flex-1 py-2 text-[13px] font-bold rounded-xl border transition-all ${(editedTeam.churchNamePrivate ?? false) === opt.val
                                    ? "border-[#3182F6] bg-[#E8F3FF] text-[#3182F6]"
                                    : "border-[#E5E8EB] bg-white text-[#8B95A1]"
                                    }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          ) : selectedTeam.churchNamePrivate ? (
                            <p className="text-[14px] font-bold text-[#333D4B] leading-snug">🔒 소속교회를 비공개 처리로 요청했어요</p>
                          ) : (
                            <p className="text-[15px] font-bold text-[#333D4B] leading-snug">공개</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">활동 이력 / 경력 소개</h3>
                <div className="bg-[#FAFAFB] rounded-2xl p-5">
                  {isEditMode ? (
                    <textarea name="experience" value={editedTeam.experience || ""} onChange={handleEditChange} className="w-full min-h-[140px] p-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-medium outline-none focus:border-[#3182F6] resize-none" />
                  ) : (
                    <p className="text-[14px] font-medium text-[#333D4B] leading-relaxed whitespace-pre-wrap break-words">{selectedTeam.experience || "-"}</p>
                  )}
                </div>
              </section>

              {/* 추가 이력: 공개 상세페이지의 "더보기" 버튼으로 노출되는 별도 내용.
                  등록 폼에는 없고 관리자가 직접 입력/공개 여부를 관리한다. 모든 분야 공통. */}
              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">추가 이력</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <ToggleRow icon={ClipboardCheck} label="추가 이력 표시 여부" value={editedTeam.showExtraHistory} isEdit={isEditMode} onChange={(v: boolean) => setEditedTeam({ ...editedTeam, showExtraHistory: v })} trueLabel="표시" falseLabel="미표시" />
                </div>
                <div className="bg-[#FAFAFB] rounded-2xl p-5">
                  {isEditMode ? (
                    <textarea
                      name="extraHistory"
                      value={editedTeam.extraHistory || ""}
                      onChange={handleEditChange}
                      placeholder="공개 상세페이지 '더보기' 클릭 시 노출될 추가 이력 내용을 입력하세요."
                      className="w-full min-h-[140px] p-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] font-medium outline-none focus:border-[#3182F6] resize-none"
                    />
                  ) : (
                    <p className="text-[14px] font-medium text-[#333D4B] leading-relaxed whitespace-pre-wrap break-words">{selectedTeam.extraHistory || "-"}</p>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">팀 정보</h3>
                <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                  <ToggleRow icon={User} label="구분" value={!editedTeam.isIndividual} isEdit={isEditMode} onChange={(v: boolean) => setEditedTeam({ ...editedTeam, isIndividual: !v })} trueLabel="팀" falseLabel="개인" />
                  {editedTeam.isIndividual && editedTeam.category === "세션" && (
                    isEditMode ? (
                      <InfoRow icon={Mic2} label="세션 파트" name="sessionPart" value={editedTeam.sessionPart === "직접 입력" ? editedTeam.sessionPartCustom : editedTeam.sessionPart} isEdit onChange={(e: any) => setEditedTeam({ ...editedTeam, sessionPart: e.target.value, sessionPartCustom: e.target.value })} />
                    ) : (
                      <InfoRow
                        icon={Mic2}
                        label="세션 파트"
                        value={selectedTeam.sessionPart === "직접 입력" ? selectedTeam.sessionPartCustom : selectedTeam.sessionPart}
                      />
                    )
                  )}
                  {!editedTeam.isIndividual && (
                    <InfoRow icon={Users} label="팀 규모" name="teamSize" value={editedTeam.teamSize} isEdit={isEditMode} onChange={handleEditChange} />
                  )}
                  {!editedTeam.isIndividual && (editedTeam.category === "찬양팀" || editedTeam.category === "찬양사역자") && (
                    isEditMode ? (
                      <InfoRow
                        icon={Mic2}
                        label="팀 구성 (쉼표로 구분)"
                        value={Array.isArray(editedTeam.teamComposition) ? editedTeam.teamComposition.join(", ") : (editedTeam.teamComposition || "")}
                        isEdit
                        onChange={(e: any) => setEditedTeam({ ...editedTeam, teamComposition: e.target.value })}
                      />
                    ) : (
                      selectedTeam.teamComposition?.length > 0 && (
                        <InfoRow icon={Mic2} label="팀 구성" value={selectedTeam.teamComposition.join(", ")} />
                      )
                    )
                  )}
                  {!editedTeam.isIndividual && !INSTRUCTOR_CATEGORIES.includes(editedTeam.category) && (
                    <ToggleRow icon={Speaker} label="음향 담당자" value={editedTeam.hasSoundEngineer} isEdit={isEditMode} onChange={(v: boolean) => setEditedTeam({ ...editedTeam, hasSoundEngineer: v })} />
                  )}
                  {editedTeam.category === "음향·조명" && (
                    <ToggleRow icon={Speaker} label="조명 보유 여부" value={editedTeam.hasLighting} isEdit={isEditMode} onChange={(v: boolean) => setEditedTeam({ ...editedTeam, hasLighting: v })} trueLabel="보유중" falseLabel="미보유" />
                  )}
                  {!INSTRUCTOR_CATEGORIES.includes(editedTeam.category) && (
                    <EquipmentRow label="장비 보유 여부" value={editedTeam.equipment} isEdit={isEditMode} onChange={(v: string) => setEditedTeam({ ...editedTeam, equipment: v })} />
                  )}
                  {(isEditMode || selectedTeam.serviceRegions?.length > 0) && (
                    <RegionRow
                      label={INSTRUCTOR_CATEGORIES.includes(editedTeam.category) ? "진행 가능 지역" : "반주 가능 허용 지역"}
                      value={isEditMode ? editedTeam.serviceRegions : selectedTeam.serviceRegions}
                      isEdit={isEditMode}
                      onChange={(v: string[]) => setEditedTeam({ ...editedTeam, serviceRegions: v })}
                    />
                  )}
                  {isEditMode ? (
                    <InfoRow icon={PlaySquare} label="대표 링크" name="youtubeUrl" value={editedTeam.youtubeUrl} isEdit onChange={handleEditChange} />
                  ) : (
                    selectedTeam.youtubeUrl && (
                      <div className="flex items-start gap-4 p-4">
                        <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm"><PlaySquare className="w-4 h-4 text-[#ADB5BD]" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">대표 링크</p>
                          <a href={selectedTeam.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] font-bold text-[#3182F6] hover:underline break-all">{selectedTeam.youtubeUrl}</a>
                        </div>
                      </div>
                    )
                  )}
                  {(isEditMode || selectedTeam.activityVideoUrls?.some(Boolean)) && (
                    <ActivityVideoLinksRow
                      value={isEditMode ? editedTeam.activityVideoUrls : selectedTeam.activityVideoUrls}
                      isEdit={isEditMode}
                      onChange={(v: string[]) => setEditedTeam({ ...editedTeam, activityVideoUrls: v })}
                    />
                  )}
                  {isEditMode ? (
                    <InfoRow icon={Camera} label="인스타그램 링크" name="instagramUrl" value={editedTeam.instagramUrl} isEdit onChange={handleEditChange} />
                  ) : (
                    selectedTeam.instagramUrl && (
                      <div className="flex items-start gap-4 p-4">
                        <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm"><Camera className="w-4 h-4 text-[#ADB5BD]" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">인스타그램 링크</p>
                          <a href={selectedTeam.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] font-bold text-[#3182F6] hover:underline break-all">{selectedTeam.instagramUrl}</a>
                        </div>
                      </div>
                    )
                  )}
                  {isEditMode ? (
                    <InfoRow icon={AtSign} label="쓰레드 링크" name="threadsUrl" value={editedTeam.threadsUrl} isEdit onChange={handleEditChange} />
                  ) : (
                    selectedTeam.threadsUrl && (
                      <div className="flex items-start gap-4 p-4">
                        <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm"><AtSign className="w-4 h-4 text-[#ADB5BD]" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">쓰레드 링크</p>
                          <a href={selectedTeam.threadsUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] font-bold text-[#3182F6] hover:underline break-all">{selectedTeam.threadsUrl}</a>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>

              {(selectedTeam.referralSource || isEditMode) && (
                <section className="space-y-2">
                  <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">등록 경로</h3>
                  <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                    {isEditMode ? (
                      <>
                        <InfoRow icon={Share2} label="등록 경로" name="referralSource" value={editedTeam.referralSource} isEdit onChange={handleEditChange} />
                        <InfoRow icon={Share2} label="상세 내용" name="referralDetail" value={editedTeam.referralDetail} isEdit onChange={handleEditChange} />
                      </>
                    ) : (
                      <InfoRow
                        icon={Share2}
                        label="등록 경로"
                        value={selectedTeam.referralDetail ? `${selectedTeam.referralSource} (${selectedTeam.referralDetail})` : selectedTeam.referralSource}
                      />
                    )}
                  </div>
                </section>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-[#F2F4F6] p-6 flex gap-2">
              {isEditMode ? (
                <>
                  <button onClick={() => { setEditedTeam({ ...selectedTeam }); setIsEditMode(false); }} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                    취소
                  </button>
                  <button onClick={handleUpdate} className="flex-[2] py-4 bg-[#3182F6] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#3182F6]/10 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> 저장하기
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleDelete(selectedTeam.id)} className="p-4 bg-[#FFF0F0] text-[#F04452] rounded-2xl hover:bg-[#FFE0E0] transition-all active:scale-95">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  {selectedTeam.status !== "pending" && (
                    <button onClick={() => handleStatusChange(selectedTeam.id, "pending")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95">
                      <RotateCcw className="w-4 h-4" /> 대기로 되돌리기
                    </button>
                  )}
                  {selectedTeam.status !== "rejected" && (
                    <button onClick={() => handleStatusChange(selectedTeam.id, "rejected")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                      반려하기
                    </button>
                  )}
                  {selectedTeam.status !== "approved" && (
                    <button onClick={() => handleStatusChange(selectedTeam.id, "approved")} className="flex-[2] py-4 bg-[#3182F6] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#3182F6]/10 transition-all active:scale-95">
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
