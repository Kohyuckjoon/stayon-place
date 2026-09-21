import { useState, useEffect, useRef } from "react";
import { ScrollRestoration, useSearchParams } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Search, Bus, Users, MapPin,
  Phone, ClipboardCheck, CalendarCheck, MapPinned, CreditCard,
  Calendar, Trash2, X, RotateCcw, Edit3, Save, ShieldOff, ImagePlus,
  BarChart3, Megaphone, FileText, Church, Building2, Hash, ShieldCheck,
  Minus, Plus, ChevronLeft,
} from "lucide-react";
import { db, functions } from "../lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { uploadPartnerImage } from "../lib/storage";
import { getAuth } from "firebase/auth";
import { AdminSidebarLayout } from "../components/admin/AdminSidebarLayout";
import { REGION_OPTIONS } from "../lib/regions";
import { FIXED_VEHICLE_TYPES, CUSTOM_VEHICLE_TYPE_LABEL, MAX_VEHICLE_PHOTOS, DriverIncludedOption, isLargeBusType } from "../lib/vehicleTypes";

const STORAGE_FOLDER = "vehicle-rentals";
const REGION_ALL = "전국";

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

const ServiceRegionsRow = ({ value, isEdit, onChange }: any) => {
  const regions: string[] = Array.isArray(value) ? value : [];
  const toggleRegion = (region: string) => {
    if (region === REGION_ALL) {
      onChange(regions.includes(REGION_ALL) ? [] : [REGION_ALL]);
      return;
    }
    const withoutAll = regions.filter((r) => r !== REGION_ALL);
    onChange(
      withoutAll.includes(region) ? withoutAll.filter((r) => r !== region) : [...withoutAll, region]
    );
  };
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
      <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
        <MapPin className="w-4 h-4 text-[#ADB5BD]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest mb-1">운행 가능 지역</p>
        {isEdit ? (
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => toggleRegion(REGION_ALL)}
              className={`py-2 rounded-xl text-[12px] font-bold border-2 transition-all ${regions.includes(REGION_ALL) ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#4E5968]"}`}
            >
              {REGION_ALL}
            </button>
            {REGION_OPTIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => toggleRegion(region)}
                className={`py-2 rounded-xl text-[12px] font-bold border-2 transition-all ${regions.includes(region) ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#4E5968]"}`}
              >
                {region}
              </button>
            ))}
          </div>
        ) : regions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {regions.map((r) => (
              <span key={r} className="px-2.5 py-1 bg-[#F2F8FF] text-[#3182F6] rounded-lg text-[12px] font-black">{r}</span>
            ))}
          </div>
        ) : (
          <p className="text-[15px] font-bold text-[#333D4B]">-</p>
        )}
      </div>
    </div>
  );
};

type FleetEntry = {
  type: string;
  count: number;
  driverIncluded?: DriverIncludedOption[];
  lodging?: boolean;
  driverChristian?: "yes" | "no" | "unknown";
  cargoSpace?: boolean;
  cargoCapacity?: string;
  insurance?: "covered" | "separate_needed";
};

const DRIVER_INCLUDED_LABELS: Record<string, string> = { included: "기사 포함", separate: "기사 별도", optional: "협의 가능" };
const DRIVER_CHRISTIAN_LABELS: Record<string, string> = { yes: "기사님 기독교인", no: "기사님 비기독교인", unknown: "무관" };
const INSURANCE_LABELS: Record<string, string> = { covered: "보험 적용되어 있음", separate_needed: "보험 별도 처리 필요함" };

// 기사 포함 여부는 여러 개 동시 선택이 가능하지만(별도+협의가능, 포함+협의가능),
// "포함"과 "별도"는 서로 배타적이라 하나를 고르면 다른 하나는 자동으로 빠진다.
function toggleDriverIncluded(current: DriverIncludedOption[] | undefined, option: DriverIncludedOption): DriverIncludedOption[] {
  const set = new Set(current || []);
  if (set.has(option)) {
    set.delete(option);
    return Array.from(set);
  }
  if (option === "included") set.delete("separate");
  if (option === "separate") set.delete("included");
  set.add(option);
  return Array.from(set);
}

const PillToggle = ({ options, value, onChange }: { options: { value: string; label: string }[]; value: string | undefined; onChange: (v: string) => void }) => (
  <div className="flex gap-1.5 flex-wrap">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${value === opt.value ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#8B95A1]"}`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// 보유 차량 종류·댓수 + 차종별 세부 정보(기사 포함/숙식 제공/기사님 기독교인 여부/짐 적재칸/보험) 관리.
// 관리자 화면에서는 실제 차량 이미지 없이 카드+태그로만 표시하고, 이미지는 /vehicles/:id 쪽에서 붙인다.
const VehicleFleetRow = ({ value, isEdit, onChange }: any) => {
  const list: FleetEntry[] = Array.isArray(value) ? value : [];
  const displayList = list.filter((row) => (row.type || "").trim() !== "");

  // 이 규칙이 추가되기 전에 저장된 25인승 이상 버스 항목도 편집 화면을 열면 "기사 포함"으로 맞춰준다.
  useEffect(() => {
    if (!isEdit) return;
    const needsFix = list.some((row) => isLargeBusType(row.type) && (row.driverIncluded?.length !== 1 || row.driverIncluded[0] !== "included"));
    if (needsFix) {
      onChange(list.map((row) => (isLargeBusType(row.type) ? { ...row, driverIncluded: ["included"] } : row)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, list]);

  const toggleFixedType = (type: string) => {
    const idx = list.findIndex((row) => row.type === type);
    if (idx >= 0) {
      onChange(list.filter((_, i) => i !== idx));
      return;
    }
    if (list.length >= 10) return;
    // 25인승 이상 버스는 법규상 기사 동행이 필수라 추가하는 즉시 "기사 포함"으로 고정한다.
    const driverIncluded: DriverIncludedOption[] | undefined = isLargeBusType(type) ? ["included"] : undefined;
    onChange([...list, { type, count: 1, driverIncluded }]);
  };
  const addCustomRow = () => {
    if (list.length >= 10) return;
    onChange([...list, { type: "", count: 1 }]);
  };
  const updateAt = (i: number, patch: Partial<FleetEntry>) => {
    const next = list.map((row, idx) => (idx === i ? { ...row, ...patch } : row));
    onChange(next);
  };
  const removeRow = (i: number) => {
    onChange(list.filter((_, idx) => idx !== i));
  };

  if (!isEdit) {
    return displayList.length > 0 ? (
      <div className="grid gap-2">
        {displayList.map((row, i) => (
          <div key={i} className="p-3 bg-white border border-[#E5E8EB] rounded-2xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#F2F8FF] rounded-lg shrink-0">
                <Bus className="w-3.5 h-3.5 text-[#3182F6]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-black text-[#191F28] truncate">{row.type}</p>
                <p className="text-[11px] font-bold text-[#8B95A1]">{row.count || 0}대</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(row.driverIncluded || []).map((opt) => (
                <span key={opt} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4E5968]">{DRIVER_INCLUDED_LABELS[opt]}</span>
              ))}
              {row.lodging && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4E5968]">숙박·숙식 제공 필요</span>}
              {row.driverChristian && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4E5968]">{DRIVER_CHRISTIAN_LABELS[row.driverChristian]}</span>
              )}
              {row.cargoSpace && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4E5968]">
                  짐 적재칸 있음{row.cargoCapacity ? ` (캐리어 ${row.cargoCapacity})` : ""}
                </span>
              )}
              {row.insurance && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#ECFDF5] text-[#10B981]">{INSURANCE_LABELS[row.insurance]}</span>}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-[15px] font-bold text-[#333D4B] px-1">등록된 보유 차량이 없어요.</p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {FIXED_VEHICLE_TYPES.map((type) => {
          const selected = list.some((row) => row.type === type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleFixedType(type)}
              className={`py-2 px-2 rounded-xl text-[12px] font-bold border-2 transition-all ${selected ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#4E5968]"}`}
            >
              {type}
            </button>
          );
        })}
        <button
          type="button"
          onClick={addCustomRow}
          disabled={list.length >= 10}
          className="py-2 px-2 rounded-xl text-[12px] font-bold border-2 border-dashed border-[#E5E8EB] bg-white text-[#8B95A1] disabled:opacity-40"
        >
          + {CUSTOM_VEHICLE_TYPE_LABEL}
        </button>
      </div>
      {list.length > 0 && (
        <div className="space-y-3">
          {list.map((row, i) => {
            const isFixed = (FIXED_VEHICLE_TYPES as readonly string[]).includes(row.type);
            return (
              <div key={i} className="p-3.5 bg-white border border-[#E5E8EB] rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#F2F8FF] rounded-lg shrink-0">
                    <Bus className="w-3.5 h-3.5 text-[#3182F6]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isFixed ? (
                      <p className="text-[13px] font-bold text-[#333D4B] truncate">{row.type}</p>
                    ) : (
                      <input
                        type="text"
                        value={row.type}
                        onChange={(e) => updateAt(i, { type: e.target.value })}
                        placeholder="차종 직접 입력"
                        className="w-full px-2 py-1 bg-[#F9FAFB] border border-[#E5E8EB] rounded-lg text-[12px] font-bold outline-none focus:border-[#3182F6]"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => updateAt(i, { count: Math.max(1, (row.count || 1) - 1) })} className="w-5 h-5 flex items-center justify-center rounded-md border border-[#E5E8EB] text-[#8B95A1]">
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="w-5 text-center text-[12px] font-bold">{row.count || 1}</span>
                    <button type="button" onClick={() => updateAt(i, { count: (row.count || 1) + 1 })} className="w-5 h-5 flex items-center justify-center rounded-md border border-[#E5E8EB] text-[#8B95A1]">
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-[10px] font-bold text-[#8B95A1]">대</span>
                  </div>
                  <button type="button" onClick={() => removeRow(i)} className="shrink-0 p-1 text-[#ADB5BD] hover:text-[#F04452] transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <p className="text-[10px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1">
                    기사 포함 여부 {isLargeBusType(row.type) ? <span className="text-[#3182F6]">(필수)</span> : "(중복 선택 가능, 포함·별도는 동시 선택 불가)"}
                  </p>
                  {isLargeBusType(row.type) ? (
                    <>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F2F8FF] text-[#3182F6] text-[11px] font-black">
                        기사 포함 (필수)
                      </div>
                      <p className="text-[10px] font-bold text-[#ADB5BD] mt-1">25인승 이상 버스는 여객자동차운수사업법상 전문 기사님이 반드시 동행해야 해요.</p>
                    </>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {([{ value: "included", label: "포함" }, { value: "separate", label: "별도" }, { value: "optional", label: "협의 가능" }] as { value: DriverIncludedOption; label: string }[]).map((opt) => {
                        const selected = (row.driverIncluded || []).includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => updateAt(i, { driverIncluded: toggleDriverIncluded(row.driverIncluded, opt.value) })}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${selected ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#8B95A1]"}`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1">기사님 숙박·숙식 제공 필요 여부</p>
                  <PillToggle
                    options={[{ value: "true", label: "제공 필요" }, { value: "false", label: "제공 불필요" }]}
                    value={row.lodging === undefined ? undefined : String(row.lodging)}
                    onChange={(v) => updateAt(i, { lodging: v === "true" })}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1">기사님 기독교인 여부</p>
                  <PillToggle
                    options={[{ value: "yes", label: "예" }, { value: "no", label: "아니오" }, { value: "unknown", label: "무관" }]}
                    value={row.driverChristian}
                    onChange={(v) => updateAt(i, { driverChristian: v as FleetEntry["driverChristian"] })}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1">짐 적재칸 여부</p>
                  <PillToggle
                    options={[{ value: "true", label: "있음" }, { value: "false", label: "없음" }]}
                    value={row.cargoSpace === undefined ? undefined : String(row.cargoSpace)}
                    onChange={(v) => updateAt(i, { cargoSpace: v === "true", ...(v === "false" ? { cargoCapacity: "" } : {}) })}
                  />
                  {row.cargoSpace && (
                    <div className="mt-2">
                      <p className="text-[10px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1">캐리어 몇 개 정도 적재 가능한가요?</p>
                      <input
                        type="text"
                        value={row.cargoCapacity || ""}
                        onChange={(e) => updateAt(i, { cargoCapacity: e.target.value })}
                        placeholder="예: 캐리어 4개"
                        className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl text-[12px] font-bold outline-none focus:border-[#3182F6]"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1">보험 처리</p>
                  <PillToggle
                    options={[{ value: "covered", label: "보험 적용되어 있음" }, { value: "separate_needed", label: "보험 별도 처리 필요함" }]}
                    value={row.insurance}
                    onChange={(v) => updateAt(i, { insurance: v as FleetEntry["insurance"] })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DocumentImageRow = ({ label, url, isEdit, onUpload, onRemove, uploading, badge, aspectClass = "aspect-[3/4]", widthClass = "w-32" }: any) => (
  <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
    <div className="mt-0.5 p-2.5 bg-white border border-gray-100 rounded-xl shrink-0 shadow-sm">
      <FileText className="w-4 h-4 text-[#ADB5BD]" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[11px] font-black text-[#8B95A1] uppercase tracking-widest">{label}</p>
        {badge && (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#ECFDF5] text-[#10B981]">
            <ShieldCheck className="w-2.5 h-2.5" /> {badge}
          </span>
        )}
      </div>
      {url ? (
        <div className={`relative ${widthClass} ${aspectClass} rounded-xl overflow-hidden bg-[#F2F4F6]`}>
          <img src={url} className="w-full h-full object-cover" />
          {isEdit && (
            <button type="button" onClick={onRemove} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <p className="text-[13px] font-bold text-[#ADB5BD]">등록된 서류가 없어요</p>
      )}
      {isEdit && (
        <label className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-[#F2F8FF] text-[#3182F6] rounded-lg text-[12px] font-black cursor-pointer">
          <ImagePlus className="w-3.5 h-3.5" /> {uploading ? "업로드 중..." : url ? "교체" : "업로드"}
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      )}
    </div>
  </div>
);

type VehicleTab = "pending" | "approved" | "rejected";
const VALID_TABS: VehicleTab[] = ["pending", "approved", "rejected"];

export function AdminVehicleRentals() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get("tab") as VehicleTab) ? (searchParams.get("tab") as VehicleTab) : "pending";
  const [activeTab, setActiveTabState] = useState<VehicleTab>(initialTab);
  const setActiveTab = (tab: VehicleTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [suspendedCount, setSuspendedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedVehicle, setEditedVehicle] = useState<any>(null);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [insuranceUploading, setInsuranceUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [coverPhotoUploading, setCoverPhotoUploading] = useState(false);
  const [detailTab, setDetailTab] = useState<"info" | "fleet">("info");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleLicenseFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLicenseUploading(true);
    try {
      const url = await uploadPartnerImage(file, STORAGE_FOLDER, editedVehicle.businessName, editedVehicle.applicantName);
      setEditedVehicle((prev: any) => ({ ...prev, licenseDocument: url }));
    } catch (error) {
      console.error("등록증 업로드 실패:", error);
      alert("등록증 업로드 중 오류가 발생했습니다.");
    } finally {
      setLicenseUploading(false);
    }
  };

  const handleInsuranceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setInsuranceUploading(true);
    try {
      const url = await uploadPartnerImage(file, STORAGE_FOLDER, editedVehicle.businessName, editedVehicle.applicantName);
      setEditedVehicle((prev: any) => ({ ...prev, insuranceDocument: url }));
    } catch (error) {
      console.error("보험가입증명 업로드 실패:", error);
      alert("보험가입증명 업로드 중 오류가 발생했습니다.");
    } finally {
      setInsuranceUploading(false);
    }
  };

  const removeLicenseDocument = () => {
    setEditedVehicle((prev: any) => ({ ...prev, licenseDocument: "" }));
  };

  const removeInsuranceDocument = () => {
    setEditedVehicle((prev: any) => ({ ...prev, insuranceDocument: null }));
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const remainingSlots = MAX_VEHICLE_PHOTOS - (editedVehicle.photos?.length || 0);
    if (remainingSlots <= 0) return;
    setPhotoUploading(true);
    try {
      const urls = await Promise.all(
        files.slice(0, remainingSlots).map((file) => uploadPartnerImage(file, STORAGE_FOLDER, editedVehicle.businessName, editedVehicle.applicantName))
      );
      setEditedVehicle((prev: any) => ({ ...prev, photos: [...(prev.photos || []), ...urls] }));
    } catch (error) {
      console.error("사진 업로드 실패:", error);
      alert("사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    setEditedVehicle((prev: any) => ({ ...prev, photos: (prev.photos || []).filter((p: string) => p !== url) }));
  };

  const handleCoverPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverPhotoUploading(true);
    try {
      const url = await uploadPartnerImage(file, STORAGE_FOLDER, editedVehicle.businessName, editedVehicle.applicantName);
      setEditedVehicle((prev: any) => ({ ...prev, coverPhoto: url }));
    } catch (error) {
      console.error("대표 사진 업로드 실패:", error);
      alert("대표 사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setCoverPhotoUploading(false);
    }
  };

  const removeCoverPhoto = () => {
    setEditedVehicle((prev: any) => ({ ...prev, coverPhoto: null }));
  };

  const openVehicleModal = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setEditedVehicle({ ...vehicle });
    setIsEditMode(false);
    setDetailTab("info");
  };

  const closeVehicleModal = () => {
    setSelectedVehicle(null);
    setEditedVehicle(null);
    setIsEditMode(false);
    setDetailTab("info");
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedVehicle((prev: any) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const q = query(collection(db, "vehicleRentals"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVehicles(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  const pendingCount = vehicles.filter((v) => v.status === "pending").length;
  const approvedCount = vehicles.filter((v) => v.status === "approved").length;
  const rejectedCount = vehicles.filter((v) => v.status === "rejected").length;
  const teamPendingCount = teams.filter((t) => t.status === "pending").length;

  const filteredVehicles = vehicles
    .filter((v) => v.status === activeTab)
    .filter((v) => !searchQuery.trim() || (v.businessName || "").includes(searchQuery) || (v.applicantName || "").includes(searchQuery));

  const handleStatusChange = async (id: string, newStatus: VehicleTab) => {
    try {
      await updateDoc(doc(db, "vehicleRentals", id), { status: newStatus });

      if (newStatus === "approved" && selectedVehicle) {
        const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
        await triggerAdminNotification({
          type: "VEHICLE_APPROVE",
          payload: {
            businessName: selectedVehicle.businessName,
            applicantName: selectedVehicle.applicantName,
          },
        });
      }

      closeVehicleModal();
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 신청 내역을 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) return;
    try {
      await deleteDoc(doc(db, "vehicleRentals", id));
      closeVehicleModal();
    } catch (error) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleUpdate = async () => {
    try {
      const { id, ...rest } = editedVehicle;
      await updateDoc(doc(db, "vehicleRentals", selectedVehicle.id), rest);
      setSelectedVehicle({ ...selectedVehicle, ...rest });
      setEditedVehicle({ ...selectedVehicle, ...rest });
      setIsEditMode(false);
      alert("수정 내용이 저장되었습니다.");
    } catch (error) {
      console.error("차량 대여 업체 정보 수정 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <AdminSidebarLayout
      brandSubtitle="차량 대여 관리자"
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
            { id: "c_pending", label: "검토 대기", icon: Clock, accentColor: "#FF9500", href: "/admin/churches?tab=pending" },
            { id: "c_approved", label: "승인 완료", icon: CheckCircle, href: "/admin/churches?tab=approved" },
            { id: "c_rejected", label: "반려 / 삭제", icon: XCircle, href: "/admin/churches?tab=rejected" },
          ],
        },
        {
          label: "차량 대여 관리",
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
      ]}
      activeId={activeTab}
      onSelect={(id) => { closeVehicleModal(); setActiveTab(id as VehicleTab); }}
      adminEmail={adminEmail}
    >
      <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#191F28] pb-20">
        <ScrollRestoration />

        <main className="max-w-[1300px] px-6 md:px-10 py-6 md:py-8">
          {selectedVehicle && editedVehicle ? (
            <div className="bg-white rounded-[32px] shadow-sm">
              <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-[#F2F4F6] p-6 flex items-center justify-between z-10 rounded-t-[32px]">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button onClick={closeVehicleModal} className="p-2 -ml-2 hover:bg-[#F2F4F6] rounded-full transition-all shrink-0" title="목록으로">
                    <ChevronLeft className="w-5 h-5 text-[#4E5968]" />
                  </button>
                  <div className="flex-1 min-w-0">
                    {isEditMode ? (
                      <input name="businessName" value={editedVehicle.businessName || ""} onChange={handleEditChange} className="text-[22px] font-black text-[#191F28] px-2 py-1 border border-[#E5E8EB] rounded-xl outline-none focus:border-[#3182F6]" />
                    ) : (
                      <>
                        <span className="px-3 py-1 bg-[#F2F8FF] text-[#3182F6] rounded-full text-[12px] font-black">{Array.isArray(selectedVehicle.serviceRegions) && selectedVehicle.serviceRegions.length > 0 ? selectedVehicle.serviceRegions.join(", ") : "지역 미입력"}</span>
                        <h2 className="text-[22px] font-black text-[#191F28] mt-2">{selectedVehicle.businessName}</h2>
                        <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          신청일자: {selectedVehicle.createdAt?.toDate?.() ? selectedVehicle.createdAt.toDate().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "-"}
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
                    { id: "fleet", label: "보유 차량" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id as "info" | "fleet")}
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
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <DocumentImageRow
                        label="대표 사진 (800x400 권장)"
                        url={isEditMode ? editedVehicle.coverPhoto : selectedVehicle.coverPhoto}
                        isEdit={isEditMode}
                        onUpload={handleCoverPhotoFileChange}
                        onRemove={removeCoverPhoto}
                        uploading={coverPhotoUploading}
                        aspectClass="aspect-[2/1]"
                        widthClass="w-full max-w-[280px]"
                      />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest">차량/업체 사진 (최대 {MAX_VEHICLE_PHOTOS}장)</h3>
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={() => photoInputRef.current?.click()}
                          disabled={photoUploading || (editedVehicle.photos?.length || 0) >= MAX_VEHICLE_PHOTOS}
                          className="px-3 py-1.5 bg-[#F0F7FF] text-[#3182F6] rounded-lg text-[12px] font-black flex items-center gap-1 disabled:opacity-60"
                        >
                          <ImagePlus className="w-3.5 h-3.5" /> {photoUploading ? "업로드 중..." : "사진 추가"}
                        </button>
                      )}
                      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoFileChange} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {(isEditMode ? editedVehicle.photos : selectedVehicle.photos)?.map((url: string) => (
                        <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-[#F2F4F6]">
                          <img src={url} className="w-full h-full object-cover" />
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
                      {!((isEditMode ? editedVehicle.photos : selectedVehicle.photos)?.length) && (
                        <div className="col-span-4 py-4 text-center text-[13px] font-bold text-[#ADB5BD]">등록된 사진이 없어요</div>
                      )}
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">등록 서류</h3>
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <DocumentImageRow
                        label="여객자동차운수사업/렌트카사업 등록증"
                        url={isEditMode ? editedVehicle.licenseDocument : selectedVehicle.licenseDocument}
                        isEdit={isEditMode}
                        onUpload={handleLicenseFileChange}
                        onRemove={removeLicenseDocument}
                        uploading={licenseUploading}
                      />
                      <DocumentImageRow
                        label="보험가입증명"
                        url={isEditMode ? editedVehicle.insuranceDocument : selectedVehicle.insuranceDocument}
                        isEdit={isEditMode}
                        onUpload={handleInsuranceFileChange}
                        onRemove={removeInsuranceDocument}
                        uploading={insuranceUploading}
                        badge={(isEditMode ? editedVehicle.insuranceDocument : selectedVehicle.insuranceDocument) ? "보험가입" : ""}
                      />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">신청자 정보</h3>
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <InfoRow icon={Users} label="신청자(대표자) 이름" name="applicantName" value={editedVehicle.applicantName} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Phone} label="신청자(대표자) 연락처" name="applicantContact" value={editedVehicle.applicantContact} isEdit={isEditMode} onChange={handleEditChange} />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">업체 기본 정보</h3>
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <InfoRow icon={Building2} label="업체명(상호)" name="businessName" value={editedVehicle.businessName} isEdit={isEditMode} onChange={handleEditChange} />
                      <InfoRow icon={Hash} label="사업자등록번호" name="businessRegistrationNumber" value={editedVehicle.businessRegistrationNumber} isEdit={isEditMode} onChange={handleEditChange} />
                      <ServiceRegionsRow value={editedVehicle.serviceRegions} isEdit={isEditMode} onChange={(v: string[]) => setEditedVehicle({ ...editedVehicle, serviceRegions: v })} />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">업체 소개</h3>
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <InfoRow icon={Church} label="한줄 소개" name="introduction" value={editedVehicle.introduction} isEdit={isEditMode} onChange={handleEditChange} />
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">연락 가능 방법</h3>
                    <div className="bg-[#FAFAFB] rounded-2xl divide-y divide-[#F2F4F6]">
                      <InfoRow icon={Phone} label="대표 전화번호 (공개)" name="contactPhone" value={editedVehicle.contactPhone} isEdit={isEditMode} onChange={handleEditChange} />
                    </div>
                  </section>
                </div>
              )}

              {detailTab === "fleet" && (
                <div className="p-6 space-y-2">
                  <h3 className="text-[13px] font-black text-[#8B95A1] uppercase tracking-widest px-1">보유 차량 종류·댓수</h3>
                  <div className="bg-[#FAFAFB] rounded-2xl p-4">
                    <VehicleFleetRow value={editedVehicle.vehicleFleet} isEdit={isEditMode} onChange={(v: { type: string; count: number }[]) => setEditedVehicle({ ...editedVehicle, vehicleFleet: v })} />
                  </div>
                </div>
              )}

              <div className="sticky bottom-0 bg-white border-t border-[#F2F4F6] p-6 flex gap-2 rounded-b-[32px]">
                {isEditMode ? (
                  <>
                    <button onClick={() => { setEditedVehicle({ ...selectedVehicle }); setIsEditMode(false); }} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                      취소
                    </button>
                    <button onClick={handleUpdate} className="flex-[2] py-4 bg-[#3182F6] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#3182F6]/10 transition-all active:scale-95 flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" /> 저장하기
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleDelete(selectedVehicle.id)} className="p-4 bg-[#FFF0F0] text-[#F04452] rounded-2xl hover:bg-[#FFE0E0] transition-all active:scale-95">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {selectedVehicle.status !== "pending" && (
                      <button onClick={() => handleStatusChange(selectedVehicle.id, "pending")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95">
                        <RotateCcw className="w-4 h-4" /> 대기로 되돌리기
                      </button>
                    )}
                    {selectedVehicle.status !== "rejected" && (
                      <button onClick={() => handleStatusChange(selectedVehicle.id, "rejected")} className="flex-1 py-4 bg-[#F2F4F6] text-[#4E5968] rounded-2xl font-bold text-[15px] transition-all active:scale-95">
                        반려하기
                      </button>
                    )}
                    {selectedVehicle.status !== "approved" && (
                      <button onClick={() => handleStatusChange(selectedVehicle.id, "approved")} className="flex-[2] py-4 bg-[#3182F6] text-white rounded-2xl font-bold text-[15px] shadow-md shadow-[#3182F6]/10 transition-all active:scale-95">
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
                    onClick={() => setActiveTab(tab.id as VehicleTab)}
                    className={`flex-none px-4 py-2.5 rounded-[14px] text-[13px] font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-[#3182F6] shadow-sm" : "text-[#6B7684]"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mb-5">
                <h1 className="text-[22px] md:text-[26px] font-black tracking-tight leading-tight mb-1">차량·버스 대여 업체 관리</h1>
                <p className="text-[#4E5968] font-bold text-[13px] md:text-[14px]">차량·버스 대여 업체 등록 신청을 검토하고 승인하세요.</p>
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
              ) : filteredVehicles.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
                  <p className="text-[16px] font-black text-[#8B95A1]">해당하는 신청이 없어요</p>
                </div>
              ) : (
                <div className="bg-white rounded-[24px] border border-[#F2F4F6] overflow-hidden divide-y divide-[#F2F4F6]">
                  {filteredVehicles.map((vehicle) => {
                    const fleetSummary = Array.isArray(vehicle.vehicleFleet) && vehicle.vehicleFleet.length > 0
                      ? vehicle.vehicleFleet.map((row: any) => `${row.type} ${row.count}대`).join(", ")
                      : "보유차량 미입력";
                    return (
                      <div key={vehicle.id} onClick={() => openVehicleModal(vehicle)} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FAFAFB] transition-colors cursor-pointer">
                        <div className="w-11 h-11 rounded-2xl bg-[#F2F8FF] flex items-center justify-center shrink-0 overflow-hidden">
                          {vehicle.licenseDocument ? <img src={vehicle.licenseDocument} className="w-full h-full object-cover" /> : <Bus className="w-5 h-5 text-[#3182F6]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[15px] font-black text-[#191F28] truncate">{vehicle.businessName}</p>
                            {vehicle.insuranceDocument && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-[#ECFDF5] text-[#10B981] shrink-0">
                                <ShieldCheck className="w-2.5 h-2.5" /> 보험가입
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[#8B95A1] text-[12px] font-bold mt-0.5 min-w-0">
                            <span className="truncate">{fleetSummary}</span><span className="w-1 h-1 bg-[#D1D6DB] rounded-full shrink-0" /><span className="truncate">{vehicle.applicantName}</span>
                          </div>
                          <p className="text-[11px] font-bold text-[#ADB5BD] mt-1">
                            신청일 {vehicle.createdAt?.toDate?.() ? vehicle.createdAt.toDate().toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "-"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </AdminSidebarLayout>
  );
}
