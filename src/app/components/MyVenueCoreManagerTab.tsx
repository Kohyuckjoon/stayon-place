import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { uploadVenueImage } from "../lib/storage";
import { Calendar, Camera, ImagePlus, Info, Loader2, Save, X } from "lucide-react";
import { VENUE_IMAGE_CATEGORIES, VenueImageCategoryKey } from "../lib/venueImageCategories";
import { VenueBlockRequestModal } from "./VenueBlockRequestModal";

// 마이페이지 "장소 관리자" 탭 - 승인된 장소 사장님이 설명·가격·사진·예약 차단 날짜 같은
// 핵심 정보만 직접 수정할 수 있게 해준다. 시설/정책처럼 복잡한 필드는 관리자만 다룬다.
// AdminDashboard.tsx와 같은 이유로 Firestore에 직접 쓰지 않고 Cloud
// Function(manageMyVenueCore)을 통해서만 쓴다. 예약 차단 날짜는 관리자 페이지·사용자
// 예약 페이지와 완전히 같은 문서(venues/{id}.blockedDates)를 보므로, 여기서 바꾸면
// 별도 동기화 없이 양쪽에 그대로 반영된다. 직거래 방지를 위해 새 차단은 운영자 승인
// (또는 72시간 자동승인)을 거쳐야 하므로 VenueBlockRequestModal로 신청만 받고,
// 이미 승인된 차단을 다시 여는 해제만 승인 없이 즉시 처리한다(toggleBlockedDate).
export function MyVenueCoreManagerTab({ venue }: { venue: any }) {
  const [description, setDescription] = useState(venue.description || "");
  const [price, setPrice] = useState(String(venue.price || ""));
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState("");
  const [infoSaved, setInfoSaved] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<VenueImageCategoryKey | null>(null);
  const [removingPhoto, setRemovingPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>(venue.blockedDates || []);
  const [scheduleError, setScheduleError] = useState("");

  const callManage = async (payload: any) => {
    const manageMyVenueCore = httpsCallable(functions, "manageMyVenueCore");
    const res = await manageMyVenueCore({ venueId: venue.id, ...payload });
    return res.data as { success: boolean; error?: string };
  };

  const handleSaveInfo = async () => {
    setInfoError("");
    setInfoSaved(false);
    setSavingInfo(true);
    try {
      const result = await callManage({ action: "updateInfo", description, price: Number(price) || 0 });
      if (!result.success) {
        setInfoError(result.error || "저장 중 오류가 발생했습니다.");
        return;
      }
      setInfoSaved(true);
    } catch (err) {
      console.error("장소 정보 저장 실패:", err);
      setInfoError("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingInfo(false);
    }
  };

  const handlePhotoAdd = async (category: VenueImageCategoryKey, files: File[]) => {
    if (files.length === 0) return;
    setPhotoError("");
    setUploadingCategory(category);
    try {
      const urls = await Promise.all(files.map((file) => uploadVenueImage(file, venue.venueName, venue.applicantName)));
      const result = await callManage({ action: "addPhoto", category, photoUrls: urls });
      if (!result.success) setPhotoError(result.error || "사진 추가 중 오류가 발생했습니다.");
    } catch (err) {
      console.error("사진 추가 실패:", err);
      setPhotoError("사진 추가 중 오류가 발생했습니다.");
    } finally {
      setUploadingCategory(null);
    }
  };

  const handlePhotoRemove = async (category: VenueImageCategoryKey, url: string) => {
    if (!window.confirm("이 사진을 삭제하시겠어요?")) return;
    setPhotoError("");
    setRemovingPhoto(url);
    try {
      const result = await callManage({ action: "removePhoto", category, photoUrl: url });
      if (!result.success) setPhotoError(result.error || "사진 삭제 중 오류가 발생했습니다.");
    } catch (err) {
      console.error("사진 삭제 실패:", err);
      setPhotoError("사진 삭제 중 오류가 발생했습니다.");
    } finally {
      setRemovingPhoto(null);
    }
  };

  const handleToggleBlockedDate = async (dateStr: string, isCurrentlyBlocked: boolean) => {
    setScheduleError("");
    // 달력 클릭 반응성을 위해 먼저 화면에 낙관적으로 반영하고, 실패하면 되돌린다.
    setBlockedDates((prev) => (isCurrentlyBlocked ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]));
    try {
      const result = await callManage({ action: "toggleBlockedDate", dateStr, isCurrentlyBlocked });
      if (!result.success) {
        setBlockedDates((prev) => (isCurrentlyBlocked ? [...prev, dateStr] : prev.filter((d) => d !== dateStr)));
        setScheduleError(result.error || "날짜 변경 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("예약 차단 날짜 변경 실패:", err);
      setBlockedDates((prev) => (isCurrentlyBlocked ? [...prev, dateStr] : prev.filter((d) => d !== dateStr)));
      setScheduleError("날짜 변경 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-5 md:space-y-8">
      <div className="bg-[#3182F6] p-6 md:p-10 rounded-[24px] md:rounded-[40px] text-white flex flex-col md:flex-row items-center text-center md:text-left justify-between gap-4 md:gap-8 shadow-xl shadow-blue-100">
        <div>
          <h3 className="text-[19px] md:text-[26px] font-black mb-2 md:mb-3 text-white break-keep">{venue.venueName}</h3>
          <p className="text-white/80 font-bold text-[13px] md:text-[16px] leading-relaxed">
            설명·가격·사진을 수정하면 바로 상세 페이지에 반영돼요
          </p>
        </div>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-[15px] font-black text-[#191F28] mb-1">예약 차단 날짜</h4>
            <p className="text-[12px] font-bold text-[#8B95A1]">
              {blockedDates.length > 0 ? `승인된 차단 ${blockedDates.length}일` : "승인된 차단 날짜가 없어요"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsScheduleOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-[#F2F8FF] text-[#3182F6] rounded-xl font-black text-[13px] hover:bg-[#E8F3FF] transition-all"
          >
            <Calendar className="w-4 h-4" /> 차단 신청
          </button>
        </div>
        {scheduleError && (
          <div className="mt-3 p-3 bg-[#FFF0F0] border border-[#FFD7D7] rounded-xl text-[13px] font-bold text-[#F04452]">{scheduleError}</div>
        )}
      </div>

      {isScheduleOpen && (
        <VenueBlockRequestModal
          venue={{ id: venue.id, venueName: venue.venueName, location: venue.location, blockedDates }}
          onUnblock={(dateStr) => handleToggleBlockedDate(dateStr, true)}
          onClose={() => setIsScheduleOpen(false)}
        />
      )}

      <div className="flex items-start gap-2.5 p-4 bg-[#F2F8FF] border border-[#D6E8FF] rounded-2xl">
        <Info className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[#1B64DA] font-bold leading-relaxed break-keep">
          여기서는 소개·가격·사진만 직접 수정할 수 있어요. 시설/정책처럼 복잡한 항목을 바꾸고 싶으시면 관리자에게 문의해주세요.
        </p>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm space-y-4">
        <h4 className="text-[15px] font-black text-[#191F28]">핵심 정보</h4>
        {infoError && (
          <div className="p-3 bg-[#FFF0F0] border border-[#FFD7D7] rounded-xl text-[13px] font-bold text-[#F04452]">{infoError}</div>
        )}
        <div>
          <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">장소 설명</label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setInfoSaved(false); }}
            placeholder="장소 소개를 입력해주세요"
            className="w-full min-h-[120px] px-4 py-3 bg-[#F9FAFB] rounded-xl text-[13px] font-medium outline-none border border-transparent focus:border-[#3182F6] focus:bg-white transition-all resize-none"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-[#6B7684] mb-1.5">가격 (원)</label>
          <input
            value={price}
            onChange={(e) => { setPrice(e.target.value.replace(/[^0-9]/g, "")); setInfoSaved(false); }}
            inputMode="numeric"
            placeholder="가격"
            className="w-full px-4 py-2.5 bg-[#F9FAFB] rounded-xl text-[14px] font-bold outline-none border border-transparent focus:border-[#3182F6] focus:bg-white transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleSaveInfo}
          disabled={savingInfo}
          className="w-full py-3.5 bg-[#3182F6] text-white rounded-2xl font-black text-[14px] flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[#1B64DA] transition-all"
        >
          {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {savingInfo ? "저장 중..." : infoSaved ? "저장됨" : "저장하기"}
        </button>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm space-y-5">
        <h4 className="text-[15px] font-black text-[#191F28]">사진 관리</h4>
        {photoError && (
          <div className="p-3 bg-[#FFF0F0] border border-[#FFD7D7] rounded-xl text-[13px] font-bold text-[#F04452]">{photoError}</div>
        )}
        {VENUE_IMAGE_CATEGORIES.map((cat) => {
          const photos: string[] = venue.imagesByCategory?.[cat.key] || [];
          const isUploading = uploadingCategory === cat.key;
          const canAddMore = photos.length < cat.max;
          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-bold text-[#6B7684]">{cat.label} <span className="text-[#ADB5BD]">({photos.length}/{cat.max})</span></p>
                {canAddMore && (
                  <label className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#F2F8FF] text-[#3182F6] rounded-lg text-[11px] font-black cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5" /> {isUploading ? "업로드 중..." : "사진 추가"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []).slice(0, cat.max - photos.length);
                        e.target.value = "";
                        handlePhotoAdd(cat.key, files);
                      }}
                    />
                  </label>
                )}
              </div>
              {photos.length > 0 ? (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {photos.map((url) => (
                    <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-[#F2F4F6]">
                      <img src={url} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handlePhotoRemove(cat.key, url)}
                        disabled={removingPhoto === url}
                        className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all disabled:opacity-60"
                      >
                        {removingPhoto === url ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#F9FAFB] border border-dashed border-[#E5E8EB] text-[#ADB5BD]">
                  <Camera className="w-4 h-4" />
                  <span className="text-[12px] font-bold">등록된 사진이 없어요</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
