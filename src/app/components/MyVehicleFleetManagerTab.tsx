import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { Bus, ChevronLeft, ChevronRight, GripVertical, Info, Loader2, Minus, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { FIXED_VEHICLE_TYPES, CUSTOM_VEHICLE_TYPE_LABEL, DriverIncludedOption, isLargeBusType } from "../lib/vehicleTypes";
import { showConfirm } from "../lib/dialog";

interface FleetEntry {
  type: string;
  count: number;
  driverIncluded?: DriverIncludedOption[];
  lodging?: boolean;
  driverChristian?: "yes" | "no" | "unknown";
  cargoSpace?: boolean;
  cargoCapacity?: string;
  insurance?: "covered" | "separate_needed";
}

const DRIVER_INCLUDED_LABELS: Record<string, string> = { included: "기사 포함", separate: "기사 별도", optional: "협의 가능" };
const DRIVER_CHRISTIAN_LABELS: Record<string, string> = { yes: "기사님 기독교인", no: "기사님 비기독교인", unknown: "무관" };
const INSURANCE_LABELS: Record<string, string> = { covered: "보험 적용되어 있음", separate_needed: "보험 별도 처리 필요함" };

function emptyDraft(): FleetEntry {
  return { type: "", count: 1, driverIncluded: [], lodging: false, cargoSpace: false, cargoCapacity: "" };
}

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

// 마이페이지 "차량 관리자" 탭 - 승인된 차량 렌트 업체 사장님이 본인 보유 차량을
// 직접 등록/수정/삭제할 수 있게 해준다. AdminVehicleRentals.tsx와 같은 이유로 Firestore에
// 직접 쓰지 않고 서버측 Cloud Function(manageMyVehicleFleet)을 통해서만 쓰기가 이뤄진다.
// 굿즈/티셔츠 관리자 탭과 UX를 맞춰 카드뷰 + 모달 수정 + 순서변경(화살표/드래그)을 그대로
// 적용했다 - 차종에는 사진이 없어서 카드 썸네일은 버스 아이콘으로 대체.
export function MyVehicleFleetManagerTab({ vehicle }: { vehicle: any }) {
  const fleet: FleetEntry[] = Array.isArray(vehicle.vehicleFleet) ? vehicle.vehicleFleet : [];

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<FleetEntry>(emptyDraft());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<FleetEntry>(emptyDraft());
  const [savingIndex, setSavingIndex] = useState<number | "new" | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [error, setError] = useState("");

  const callManage = async (payload: any) => {
    const manageMyVehicleFleet = httpsCallable(functions, "manageMyVehicleFleet");
    const res = await manageMyVehicleFleet({ vehicleId: vehicle.id, ...payload });
    return res.data as { success: boolean; error?: string };
  };

  const resetDraft = () => {
    setDraft(emptyDraft());
    setIsAdding(false);
  };

  const toggleDraftFixedType = (type: string) => {
    setDraft((prev) => ({
      ...prev,
      type,
      driverIncluded: isLargeBusType(type) ? ["included"] : prev.driverIncluded,
    }));
  };

  const handleAddSubmit = async () => {
    if (!draft.type.trim()) {
      setError("차종을 선택하거나 입력해주세요.");
      return;
    }
    if (!isLargeBusType(draft.type) && (draft.driverIncluded?.length ?? 0) === 0) {
      setError("기사 동행 여부를 선택해주세요.");
      return;
    }
    setError("");
    setSavingIndex("new");
    try {
      const result = await callManage({ action: "add", entry: draft });
      if (!result.success) {
        setError(result.error || "등록 중 오류가 발생했습니다.");
        return;
      }
      resetDraft();
    } catch (err) {
      console.error("보유 차량 등록 실패:", err);
      setError("등록 중 오류가 발생했습니다.");
    } finally {
      setSavingIndex(null);
    }
  };

  const startEdit = (index: number, entry: FleetEntry) => {
    setEditingIndex(index);
    setEditDraft({ ...entry, driverIncluded: entry.driverIncluded || [] });
    setError("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditDraft(emptyDraft());
  };

  const handleEditSubmit = async (index: number) => {
    if (!editDraft.type.trim()) {
      setError("차종을 입력해주세요.");
      return;
    }
    if (!isLargeBusType(editDraft.type) && (editDraft.driverIncluded?.length ?? 0) === 0) {
      setError("기사 동행 여부를 선택해주세요.");
      return;
    }
    setError("");
    setSavingIndex(index);
    try {
      const result = await callManage({ action: "update", index, entry: editDraft });
      if (!result.success) {
        setError(result.error || "수정 중 오류가 발생했습니다.");
        return;
      }
      cancelEdit();
    } catch (err) {
      console.error("보유 차량 수정 실패:", err);
      setError("수정 중 오류가 발생했습니다.");
    } finally {
      setSavingIndex(null);
    }
  };

  const handleDelete = async (index: number, entry: FleetEntry) => {
    if (!(await showConfirm(`"${entry.type || "이 차종"}"을 삭제하시겠어요?`))) return;
    setError("");
    setDeletingIndex(index);
    try {
      const result = await callManage({ action: "delete", index });
      if (!result.success) setError(result.error || "삭제 중 오류가 발생했습니다.");
    } catch (err) {
      console.error("보유 차량 삭제 실패:", err);
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingIndex(null);
    }
  };

  const reorderTo = async (orderedIndices: number[]) => {
    setError("");
    setReordering(true);
    try {
      const result = await callManage({ action: "reorder", orderedIndices });
      if (!result.success) {
        setError(result.error || "순서 변경 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("보유 차량 순서 변경 실패:", err);
      setError("순서 변경 중 오류가 발생했습니다.");
    } finally {
      setReordering(false);
    }
  };

  const moveEntry = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= fleet.length) return;
    const order = fleet.map((_, i) => i);
    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    reorderTo(order);
  };

  const handleDropOn = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    const order = fleet.map((_, i) => i);
    const [moved] = order.splice(draggedIndex, 1);
    order.splice(targetIndex, 0, moved);
    setDraggedIndex(null);
    reorderTo(order);
  };

  const renderEditableFields = (entry: FleetEntry, setEntry: (patch: Partial<FleetEntry>) => void, isNew: boolean) => {
    const isLargeBus = isLargeBusType(entry.type);
    return (
      <div className="space-y-4">
        {isNew && (
          <div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {FIXED_VEHICLE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleDraftFixedType(type)}
                  className={`py-2 px-2 rounded-xl text-[12px] font-bold border-2 transition-all ${entry.type === type ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#4E5968]"}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={(FIXED_VEHICLE_TYPES as readonly string[]).includes(entry.type) ? "" : entry.type}
              onChange={(e) => setEntry({ type: e.target.value })}
              placeholder={CUSTOM_VEHICLE_TYPE_LABEL}
              className="w-full px-3 py-2 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl text-[13px] font-bold outline-none focus:border-[#3182F6]"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#6B7684]">보유 대수</span>
          <button type="button" onClick={() => setEntry({ count: Math.max(1, (entry.count || 1) - 1) })} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E5E8EB] text-[#8B95A1]">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-6 text-center text-[14px] font-bold">{entry.count || 1}</span>
          <button type="button" onClick={() => setEntry({ count: (entry.count || 1) + 1 })} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#E5E8EB] text-[#8B95A1]">
            <Plus className="w-3.5 h-3.5" />
          </button>
          <span className="text-[12px] font-bold text-[#8B95A1]">대</span>
        </div>

        <div>
          <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1.5">
            기사 포함 여부 {isLargeBus && <span className="text-[#3182F6]">(필수)</span>}
          </p>
          {isLargeBus ? (
            <>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F2F8FF] text-[#3182F6] text-[12px] font-black">기사 포함 (필수)</div>
              <p className="text-[11px] font-bold text-[#ADB5BD] mt-1">25인승 이상 버스는 여객자동차운수사업법상 전문 기사님이 반드시 동행해야 해요.</p>
            </>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {([{ value: "included", label: "포함" }, { value: "separate", label: "별도" }, { value: "optional", label: "협의 가능" }] as { value: DriverIncludedOption; label: string }[]).map((opt) => {
                const selected = (entry.driverIncluded || []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEntry({ driverIncluded: toggleDriverIncluded(entry.driverIncluded, opt.value) })}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${selected ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#8B95A1]"}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1.5">기사님 숙박·숙식 제공 필요 여부</p>
          <div className="flex gap-1.5">
            {[{ value: true, label: "제공 필요" }, { value: false, label: "제공 불필요" }].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setEntry({ lodging: opt.value })}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${entry.lodging === opt.value ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#8B95A1]"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1.5">기사님 기독교인 여부</p>
          <div className="flex gap-1.5">
            {[{ value: "yes", label: "예" }, { value: "no", label: "아니오" }, { value: "unknown", label: "무관" }].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEntry({ driverChristian: opt.value as FleetEntry["driverChristian"] })}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${entry.driverChristian === opt.value ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#8B95A1]"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1.5">짐 적재칸 여부</p>
          <div className="flex gap-1.5">
            {[{ value: true, label: "있음" }, { value: false, label: "없음" }].map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setEntry({ cargoSpace: opt.value, ...(opt.value === false ? { cargoCapacity: "" } : {}) })}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${entry.cargoSpace === opt.value ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#8B95A1]"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {entry.cargoSpace && (
            <input
              type="text"
              value={entry.cargoCapacity || ""}
              onChange={(e) => setEntry({ cargoCapacity: e.target.value })}
              placeholder="예: 캐리어 4개"
              className="w-full mt-2 px-3 py-2 bg-[#F9FAFB] border border-[#E5E8EB] rounded-xl text-[12px] font-bold outline-none focus:border-[#3182F6]"
            />
          )}
        </div>

        <div>
          <p className="text-[11px] font-black text-[#ADB5BD] uppercase tracking-wide mb-1.5">보험 처리</p>
          <div className="flex gap-1.5 flex-wrap">
            {[{ value: "covered", label: "보험 적용되어 있음" }, { value: "separate_needed", label: "보험 별도 처리 필요함" }].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEntry({ insurance: opt.value as FleetEntry["insurance"] })}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${entry.insurance === opt.value ? "border-[#3182F6] bg-[#F2F8FF] text-[#3182F6]" : "border-[#E5E8EB] bg-white text-[#8B95A1]"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 md:space-y-8">
      <div className="bg-[#3182F6] p-6 md:p-10 rounded-[24px] md:rounded-[40px] text-white flex flex-col md:flex-row items-center text-center md:text-left justify-between gap-4 md:gap-8 shadow-xl shadow-blue-100">
        <div>
          <h3 className="text-[19px] md:text-[26px] font-black mb-2 md:mb-3 text-white break-keep">{vehicle.businessName}</h3>
          <p className="text-white/80 font-bold text-[13px] md:text-[16px] leading-relaxed">
            등록한 보유 차량이 승인된 상세 페이지에 바로 노출돼요
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto justify-center bg-white text-[#3182F6] px-5 py-3.5 md:px-8 md:py-5 rounded-[18px] md:rounded-[22px] font-black hover:scale-105 transition-all text-[14px] md:text-[16px] flex items-center gap-2 shadow-lg shrink-0"
        >
          <Plus className="w-5 h-5 md:w-6 md:h-6" /> 차종 추가
        </button>
      </div>

      <div className="flex items-start gap-2.5 p-4 bg-[#F2F8FF] border border-[#D6E8FF] rounded-2xl">
        <Info className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[#1B64DA] font-bold leading-relaxed break-keep">
          여기서 등록·수정한 보유 차량은 상세 페이지에 카드로 바로 표시돼요.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-[#FFF0F0] border border-[#FFD7D7] rounded-2xl text-[13px] font-bold text-[#F04452]">
          {error}
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] border-2 border-[#3182F6]/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[15px] font-black text-[#191F28]">보유 차량 추가</h4>
            <button type="button" onClick={resetDraft} className="p-1.5 text-[#ADB5BD] hover:text-[#4E5968] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          {renderEditableFields(draft, (patch) => setDraft((prev) => ({ ...prev, ...patch })), true)}
          <button
            type="button"
            onClick={handleAddSubmit}
            disabled={savingIndex === "new"}
            className="w-full py-3.5 bg-[#3182F6] text-white rounded-2xl font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[#1B64DA] transition-all"
          >
            {savingIndex === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingIndex === "new" ? "등록 중..." : "차량 등록하기"}
          </button>
        </div>
      )}

      {fleet.length === 0 && !isAdding ? (
        <div className="py-14 md:py-20 text-center bg-white rounded-[22px] md:rounded-[32px] border border-dashed border-gray-200">
          <Bus className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-[#ADB5BD] font-bold text-[13px] md:text-base">등록된 보유 차량이 없어요. "차종 추가"로 첫 차량을 올려보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {fleet.map((entry, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragEnd={() => setDraggedIndex(null)}
              onDragOver={(e) => { if (draggedIndex !== null) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); handleDropOn(index); }}
              className={`bg-white rounded-[20px] md:rounded-[24px] border shadow-sm overflow-hidden transition-opacity ${draggedIndex === index ? "opacity-40 border-[#3182F6]" : "border-gray-100"}`}
            >
              <div className="relative aspect-video bg-[#F2F8FF] flex items-center justify-center">
                <Bus className="w-8 h-8 text-[#3182F6]" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button type="button" onClick={() => startEdit(index, entry)} className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-[#4E5968] hover:bg-white transition-all shadow-sm">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(index, entry)}
                    disabled={deletingIndex === index}
                    className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-[#F04452] hover:bg-white transition-all shadow-sm disabled:opacity-60"
                  >
                    {deletingIndex === index ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 p-1.5 bg-white/90 text-[#4E5968] rounded-full shadow-md hidden sm:flex cursor-grab" title="드래그해서 순서 변경">
                  <GripVertical className="w-3 h-3" />
                </div>
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveEntry(index, -1)}
                    disabled={index === 0 || reordering}
                    className="p-1.5 bg-white/90 text-[#4E5968] rounded-full shadow-md hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="이전으로 이동"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveEntry(index, 1)}
                    disabled={index === fleet.length - 1 || reordering}
                    className="p-1.5 bg-white/90 text-[#4E5968] rounded-full shadow-md hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="다음으로 이동"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="p-3.5 md:p-4">
                <h4 className="text-[14px] md:text-[15px] font-black text-[#191F28] truncate">
                  {entry.type || "차종"} <span className="text-[#8B95A1] font-bold text-[12px]">· {entry.count || 0}대</span>
                </h4>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(entry.driverIncluded || []).map((opt) => (
                    <span key={opt} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4E5968]">{DRIVER_INCLUDED_LABELS[opt]}</span>
                  ))}
                  {entry.lodging && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4E5968]">숙박·숙식 제공 필요</span>}
                  {entry.driverChristian && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4E5968]">{DRIVER_CHRISTIAN_LABELS[entry.driverChristian]}</span>}
                  {entry.cargoSpace && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4E5968]">
                      짐 적재칸{entry.cargoCapacity ? ` (${entry.cargoCapacity})` : " 있음"}
                    </span>
                  )}
                  {entry.insurance && <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#ECFDF5] text-[#10B981]">{INSURANCE_LABELS[entry.insurance]}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingIndex !== null && fleet[editingIndex] && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#191F28]/70 backdrop-blur-sm"
          onClick={cancelEdit}
        >
          <div
            className="bg-white w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-[28px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#F2F4F6] flex items-center justify-between gap-4">
              <h4 className="text-[17px] font-black text-[#191F28]">보유 차량 수정</h4>
              <button type="button" onClick={cancelEdit} className="p-1.5 text-[#ADB5BD] hover:text-[#4E5968] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {renderEditableFields(editDraft, (patch) => setEditDraft((prev) => ({ ...prev, ...patch })), false)}
              <div className="flex gap-2">
                <button type="button" onClick={cancelEdit} className="flex-1 py-3 bg-[#F2F4F6] text-[#4E5968] rounded-xl font-bold text-[13px]">취소</button>
                <button
                  type="button"
                  onClick={() => handleEditSubmit(editingIndex)}
                  disabled={savingIndex === editingIndex}
                  className="flex-[2] py-3 bg-[#3182F6] text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {savingIndex === editingIndex ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  저장하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
