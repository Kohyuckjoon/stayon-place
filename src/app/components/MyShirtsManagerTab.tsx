import { useEffect, useRef, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { uploadPartnerImage } from "../lib/storage";
import { Camera, ChevronLeft, ChevronRight, GripVertical, Info, Loader2, Pencil, Plus, Save, Shirt, Trash2, X } from "lucide-react";
import { showConfirm } from "../lib/dialog";

const STORAGE_FOLDER = "group-shirts";

interface ProductItem {
  id: string;
  name: string;
  price: number | string;
  description: string;
  photo: string;
}

// 마이페이지 "티셔츠 관리자" 탭 - 승인된 단체티 업체 사장님이 본인 상품을
// 직접 등록/수정/삭제할 수 있게 해준다. Firestore에 직접 쓰지 않고 서버측
// Cloud Function(manageMyShirtProduct)을 통해서만 쓰기가 이뤄진다 - 이 프로젝트엔
// firestore.rules 파일이 없어서 클라이언트 쓰기 권한을 확인할 수 없기 때문에,
// 소유권 검사를 서버에서 하고 Admin SDK로 대신 쓰게 만들었다.
export function MyShirtsManagerTab({ shirt }: { shirt: any }) {
  const products: ProductItem[] = Array.isArray(shirt.products) ? shirt.products : [];

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<{ name: string; price: string; description: string; photoFile: File | null; photoPreview: string | null }>({
    name: "", price: "", description: "", photoFile: null, photoPreview: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ name: string; price: string; description: string; photoFile: File | null; photoPreview: string | null }>({
    name: "", price: "", description: "", photoFile: null, photoPreview: null,
  });
  const [savingId, setSavingId] = useState<string | null>(null); // "new" | product.id
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const draftPhotoInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (draft.photoPreview) URL.revokeObjectURL(draft.photoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const callManage = async (payload: any) => {
    const manageMyShirtProduct = httpsCallable(functions, "manageMyShirtProduct");
    const res = await manageMyShirtProduct({ shirtId: shirt.id, ...payload });
    return res.data as { success: boolean; error?: string };
  };

  const resetDraft = () => {
    if (draft.photoPreview) URL.revokeObjectURL(draft.photoPreview);
    setDraft({ name: "", price: "", description: "", photoFile: null, photoPreview: null });
    setIsAdding(false);
  };

  const handleDraftPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (draft.photoPreview) URL.revokeObjectURL(draft.photoPreview);
    setDraft((prev) => ({ ...prev, photoFile: file, photoPreview: URL.createObjectURL(file) }));
  };

  const handleAddSubmit = async () => {
    if (!draft.name.trim()) {
      setError("상품명을 입력해주세요.");
      return;
    }
    setError("");
    setSavingId("new");
    try {
      const photo = draft.photoFile
        ? await uploadPartnerImage(draft.photoFile, STORAGE_FOLDER, shirt.businessName, shirt.applicantName)
        : "";
      const result = await callManage({
        action: "add",
        product: { name: draft.name.trim(), price: Number(draft.price) || 0, description: draft.description.trim(), photo },
      });
      if (!result.success) {
        setError(result.error || "상품 등록 중 오류가 발생했습니다.");
        return;
      }
      resetDraft();
    } catch (err) {
      console.error("상품 등록 실패:", err);
      setError("상품 등록 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const startEdit = (product: ProductItem) => {
    setEditingId(product.id);
    setEditDraft({ name: product.name || "", price: String(product.price || ""), description: product.description || "", photoFile: null, photoPreview: null });
    setError("");
  };

  const cancelEdit = () => {
    if (editDraft.photoPreview) URL.revokeObjectURL(editDraft.photoPreview);
    setEditingId(null);
    setEditDraft({ name: "", price: "", description: "", photoFile: null, photoPreview: null });
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (editDraft.photoPreview) URL.revokeObjectURL(editDraft.photoPreview);
    setEditDraft((prev) => ({ ...prev, photoFile: file, photoPreview: URL.createObjectURL(file) }));
  };

  const handleEditSubmit = async (product: ProductItem) => {
    if (!editDraft.name.trim()) {
      setError("상품명을 입력해주세요.");
      return;
    }
    setError("");
    setSavingId(product.id);
    try {
      const photo = editDraft.photoFile
        ? await uploadPartnerImage(editDraft.photoFile, STORAGE_FOLDER, shirt.businessName, shirt.applicantName)
        : product.photo;
      const result = await callManage({
        action: "update",
        productId: product.id,
        product: { name: editDraft.name.trim(), price: Number(editDraft.price) || 0, description: editDraft.description.trim(), photo },
      });
      if (!result.success) {
        setError(result.error || "상품 수정 중 오류가 발생했습니다.");
        return;
      }
      cancelEdit();
    } catch (err) {
      console.error("상품 수정 실패:", err);
      setError("상품 수정 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (product: ProductItem) => {
    if (!(await showConfirm(`"${product.name || "이 상품"}"을 삭제하시겠어요?`))) return;
    setError("");
    setDeletingId(product.id);
    try {
      const result = await callManage({ action: "delete", productId: product.id });
      if (!result.success) {
        setError(result.error || "상품 삭제 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("상품 삭제 실패:", err);
      setError("상품 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const reorderTo = async (orderedIds: string[]) => {
    setError("");
    setReordering(true);
    try {
      const result = await callManage({ action: "reorder", orderedIds });
      if (!result.success) {
        setError(result.error || "순서 변경 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("상품 순서 변경 실패:", err);
      setError("순서 변경 중 오류가 발생했습니다.");
    } finally {
      setReordering(false);
    }
  };

  const moveProduct = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= products.length) return;
    const next = [...products];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    reorderTo(next.map((p) => p.id));
  };

  const handleDropOn = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const ids = products.map((p) => p.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    setDraggedId(null);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, draggedId);
    reorderTo(next);
  };

  return (
    <div className="space-y-5 md:space-y-8">
      <div className="bg-[#3182F6] p-6 md:p-10 rounded-[24px] md:rounded-[40px] text-white flex flex-col md:flex-row items-center text-center md:text-left justify-between gap-4 md:gap-8 shadow-xl shadow-blue-100">
        <div>
          <h3 className="text-[19px] md:text-[26px] font-black mb-2 md:mb-3 text-white break-keep">{shirt.businessName}</h3>
          <p className="text-white/80 font-bold text-[13px] md:text-[16px] leading-relaxed">
            등록한 상품이 승인된 상세 페이지에 바로 노출돼요
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto justify-center bg-white text-[#3182F6] px-5 py-3.5 md:px-8 md:py-5 rounded-[18px] md:rounded-[22px] font-black hover:scale-105 transition-all text-[14px] md:text-[16px] flex items-center gap-2 shadow-lg shrink-0"
        >
          <Plus className="w-5 h-5 md:w-6 md:h-6" /> 상품 추가
        </button>
      </div>

      <div className="flex items-start gap-2.5 p-4 bg-[#F2F8FF] border border-[#D6E8FF] rounded-2xl">
        <Info className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[#1B64DA] font-bold leading-relaxed break-keep">
          지금은 상품 정보 안내만 제공돼요. 결제 기능이 필요하시면 요청해주시면 별도로 도입을 검토해요.
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
            <h4 className="text-[15px] font-black text-[#191F28]">새 상품 등록</h4>
            <button type="button" onClick={resetDraft} className="p-1.5 text-[#ADB5BD] hover:text-[#4E5968] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-4">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[#F9FAFB] border border-gray-100 shrink-0">
              {draft.photoPreview ? (
                <img src={draft.photoPreview} className="w-full h-full object-cover" />
              ) : (
                <button type="button" onClick={() => draftPhotoInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center gap-1 text-[#ADB5BD] hover:text-[#3182F6] transition-colors">
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-bold">사진</span>
                </button>
              )}
              {draft.photoPreview && (
                <button type="button" onClick={() => draftPhotoInputRef.current?.click()} className="absolute bottom-1 right-1 p-1.5 bg-[#191F28] text-white rounded-full shadow-md hover:bg-black transition-all">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
              <input ref={draftPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleDraftPhotoChange} />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <input
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="상품명"
                className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#3182F6] focus:bg-white transition-all"
              />
              <input
                value={draft.price}
                onChange={(e) => setDraft((prev) => ({ ...prev, price: e.target.value.replace(/[^0-9]/g, "") }))}
                placeholder="가격 (원)"
                inputMode="numeric"
                className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#3182F6] focus:bg-white transition-all"
              />
            </div>
          </div>
          <p className="text-[11px] font-bold text-[#B0B8C1] -mt-2">카드에는 16:9 비율로 표시돼요. 가로가 긴 사진(예: 1200x675)을 올리면 안 잘려요.</p>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="간단 설명 (선택)"
            className="w-full min-h-[80px] px-4 py-3 bg-[#F9FAFB] rounded-xl text-[13px] font-medium outline-none border border-transparent focus:border-[#3182F6] focus:bg-white transition-all resize-none"
          />
          <button
            type="button"
            onClick={handleAddSubmit}
            disabled={savingId === "new"}
            className="w-full py-3.5 bg-[#3182F6] text-white rounded-2xl font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[#1B64DA] transition-all"
          >
            {savingId === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingId === "new" ? "등록 중..." : "상품 등록하기"}
          </button>
        </div>
      )}

      {products.length === 0 && !isAdding ? (
        <div className="py-14 md:py-20 text-center bg-white rounded-[22px] md:rounded-[32px] border border-dashed border-gray-200">
          <Shirt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-[#ADB5BD] font-bold text-[13px] md:text-base">등록된 상품이 없어요. "상품 추가"로 첫 상품을 올려보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {products.map((product, idx) => {
            return (
              <div
                key={product.id}
                draggable
                onDragStart={() => setDraggedId(product.id)}
                onDragEnd={() => setDraggedId(null)}
                onDragOver={(e) => { if (draggedId) e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); handleDropOn(product.id); }}
                className={`bg-white rounded-[20px] md:rounded-[24px] border shadow-sm overflow-hidden transition-opacity ${draggedId === product.id ? "opacity-40 border-[#3182F6]" : "border-gray-100"}`}
              >
                <div className="relative aspect-video bg-[#F2F4F6]">
                  {product.photo ? (
                    <img src={product.photo} draggable={false} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Shirt className="w-7 h-7 text-[#D1D6DB]" /></div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    <button type="button" onClick={() => startEdit(product)} className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-[#4E5968] hover:bg-white transition-all shadow-sm">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product)}
                      disabled={deletingId === product.id}
                      className="p-1.5 bg-white/90 backdrop-blur rounded-lg text-[#F04452] hover:bg-white transition-all shadow-sm disabled:opacity-60"
                    >
                      {deletingId === product.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 p-1.5 bg-white/90 text-[#4E5968] rounded-full shadow-md hidden sm:flex cursor-grab" title="드래그해서 순서 변경">
                    <GripVertical className="w-3 h-3" />
                  </div>
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveProduct(idx, -1)}
                      disabled={idx === 0 || reordering}
                      className="p-1.5 bg-white/90 text-[#4E5968] rounded-full shadow-md hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="이전으로 이동"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveProduct(idx, 1)}
                      disabled={idx === products.length - 1 || reordering}
                      className="p-1.5 bg-white/90 text-[#4E5968] rounded-full shadow-md hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="다음으로 이동"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="p-3.5 md:p-4">
                  <h4 className="text-[14px] md:text-[15px] font-black text-[#191F28] truncate">{product.name || "상품"}</h4>
                  {Number(product.price) > 0 && (
                    <p className="text-[13px] font-black text-[#3182F6] mt-0.5">{Number(product.price).toLocaleString()}원</p>
                  )}
                  {product.description && (
                    <p className="text-[11px] md:text-[12px] font-medium text-[#8B95A1] mt-1 line-clamp-2 break-keep">{product.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingId && (() => {
        const product = products.find((p) => p.id === editingId);
        if (!product) return null;
        return (
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#191F28]/70 backdrop-blur-sm"
            onClick={cancelEdit}
          >
            <div
              className="bg-white w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-[28px] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[#F2F4F6] flex items-center justify-between gap-4">
                <h4 className="text-[17px] font-black text-[#191F28]">상품 수정</h4>
                <button type="button" onClick={cancelEdit} className="p-1.5 text-[#ADB5BD] hover:text-[#4E5968] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-[#F9FAFB] border border-gray-100 shrink-0">
                    {(editDraft.photoPreview || product.photo) ? (
                      <img src={editDraft.photoPreview || product.photo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#ADB5BD]"><Camera className="w-5 h-5" /></div>
                    )}
                    <button type="button" onClick={() => editPhotoInputRef.current?.click()} className="absolute bottom-1 right-1 p-1.5 bg-[#191F28] text-white rounded-full shadow-md hover:bg-black transition-all">
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                    <input ref={editPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleEditPhotoChange} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      value={editDraft.name}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#3182F6] focus:bg-white transition-all"
                    />
                    <input
                      value={editDraft.price}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, price: e.target.value.replace(/[^0-9]/g, "") }))}
                      inputMode="numeric"
                      className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#3182F6] focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <textarea
                  value={editDraft.description}
                  onChange={(e) => setEditDraft((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full min-h-[80px] px-4 py-3 bg-[#F9FAFB] rounded-xl text-[13px] font-medium outline-none border border-transparent focus:border-[#3182F6] focus:bg-white transition-all resize-none"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={cancelEdit} className="flex-1 py-3 bg-[#F2F4F6] text-[#4E5968] rounded-xl font-bold text-[13px]">취소</button>
                  <button
                    type="button"
                    onClick={() => handleEditSubmit(product)}
                    disabled={savingId === product.id}
                    className="flex-[2] py-3 bg-[#3182F6] text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {savingId === product.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    저장하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
