import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, ScrollRestoration } from "react-router-dom";
import { Check, AlertCircle, Music, Camera, X, Lock, MapPin, Phone, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, functions } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadBandRoomImage } from "../lib/storage";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { CustomInput, PillSelector, MultiPillSelector } from "../components/forms/TeamFormControls";
import { ROOM_TYPE_OPTIONS, EQUIPMENT_CHECKLIST_OPTIONS, MAX_TAGS, WEEKDAY_OPTIONS, TIME_OPTIONS, formatCurrencyInput } from "../lib/bandRoomDisplay";

interface BandRoomFormData {
  track: "info" | "booking";
  applicantName: string;
  applicantContact: string;
  applicantEmail: string;
  roomName: string;
  address: string;
  addressDetail: string;
  roomType: string;
  pyeong: string;
  capacity: string;
  equipmentChecklist: string[];
  micCount: string;
  hasSoundproof: boolean;
  hasParking: boolean;
  parkingInfo: string;
  hourlyRate: string;
  minRentalHours: string;
  availableDays: string[];
  availableStartTime: string;
  availableEndTime: string;
  description: string;
  tags: string[];
  agreedToPrivacyPolicy: boolean;
  agreedToFeeNotice: boolean;
}

export default function BandRoomRegistrationForm() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState("");

  const [formData, setFormData] = useState<BandRoomFormData>({
    track: "info",
    applicantName: "",
    applicantContact: "",
    applicantEmail: "",
    roomName: "",
    address: "",
    addressDetail: "",
    roomType: "",
    pyeong: "",
    capacity: "",
    equipmentChecklist: [],
    micCount: "",
    hasSoundproof: false,
    hasParking: false,
    parkingInfo: "",
    hourlyRate: "",
    minRentalHours: "",
    availableDays: [],
    availableStartTime: "",
    availableEndTime: "",
    description: "",
    tags: [],
    agreedToPrivacyPolicy: false,
    agreedToFeeNotice: false,
  });

  const [errors, setErrors] = useState({ applicantContact: "" });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const handleAddressSearch = () => {
    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        setFormData((prev) => ({ ...prev, address: data.address }));
      },
    }).open();
  };

  const formatPhoneNumber = (rawValue: string) => {
    const number = rawValue.replace(/[^\d]/g, "");
    if (/[^0-9-]/.test(rawValue)) {
      setErrors((prev) => ({ ...prev, applicantContact: "숫자만 입력해주세요!" }));
    } else {
      setErrors((prev) => ({ ...prev, applicantContact: "" }));
    }
    if (number.length <= 3) return number;
    if (number.length <= 7) return `${number.slice(0, 3)}-${number.slice(3)}`;
    return `${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7, 11)}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 10) {
      alert("사진은 최대 10장까지만 등록 가능합니다.");
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
    setPreviewUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeImage = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || formData.tags.includes(tag) || formData.tags.length >= MAX_TAGS) return;
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const toggleEquipment = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      equipmentChecklist: prev.equipmentChecklist.includes(item)
        ? prev.equipmentChecklist.filter((e) => e !== item)
        : [...prev.equipmentChecklist, item],
    }));
  };

  const isFormValid = useMemo(() => {
    return (
      formData.applicantName.trim() !== "" &&
      formData.applicantContact.length >= 12 &&
      formData.roomName.trim() !== "" &&
      formData.address.trim() !== "" &&
      formData.roomType !== "" &&
      selectedFiles.length > 0 &&
      (formData.track !== "booking" || formData.hourlyRate.trim() !== "") &&
      formData.agreedToPrivacyPolicy &&
      formData.agreedToFeeNotice &&
      !errors.applicantContact
    );
  }, [formData, errors, selectedFiles]);

  const compressAndUpload = async (file: File): Promise<string> => uploadBandRoomImage(file, formData.roomName, formData.applicantName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isFormValid || !user) return;
    try {
      setIsSubmitting(true);
      const photos = await Promise.all(selectedFiles.map((file) => compressAndUpload(file)));

      await addDoc(collection(db, "bandRooms"), {
        ...formData,
        hourlyRate: Number(formData.hourlyRate.replace(/[^\d]/g, "")) || 0,
        trackSwitchedAt: null,
        photos,
        applicantUid: user.uid,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
      await triggerAdminNotification({
        type: "BANDROOM",
        payload: {
          roomName: formData.roomName,
          roomType: formData.roomType,
          address: formData.address,
          applicantName: formData.applicantName,
          applicantContact: formData.applicantContact,
          applicantEmail: formData.applicantEmail,
          track: formData.track === "booking" ? "예약·결제 지원" : "정보 제공",
        },
      });

      setIsSuccessModalOpen(true);
    } catch (error) {
      alert("등록 중 오류가 발생했습니다." + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#0ea5e9] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0f9ff] text-[#0ea5e9] rounded-full mb-6 text-sm font-black">
          <Music className="w-4 h-4" /> 합주실·연습실 등록
        </div>
        <p className="text-[18px] font-black text-[#191f28] mb-3">로그인이 필요해요</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">공간 등록 신청서를 작성하려면 먼저 로그인해주세요. 계정이 없다면 로그인 과정에서 바로 가입할 수 있어요.</p>
        <button
          onClick={() => loginWithGoogle().catch(() => { })}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#0ea5e9] text-white rounded-xl font-bold text-[14px] hover:bg-[#0284c7] transition-all"
        >
          <Lock className="w-4 h-4" /> 로그인하고 계속하기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#191f28] selection:bg-[#0ea5e9]/10 font-sans antialiased">
      <ScrollRestoration />

      <AnimatePresence>
        {isSuccessModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-white flex flex-col items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }} className="w-24 h-24 bg-[#f0f9ff] rounded-full flex items-center justify-center mb-8">
              <Check className="w-12 h-12 text-[#0ea5e9]" strokeWidth={4} />
            </motion.div>
            <h2 className="text-3xl font-bold mb-4 tracking-tight">등록 신청이 완료되었어요</h2>
            <p>관리자 확인 후 등록이 반영되기까지<br /><span className="font-semibold text-[#333d4b]">영업일 기준 최대 7일</span> 정도 소요될 수 있어요.</p>
            <br />
            <button onClick={() => navigate("/")} className="w-full max-w-sm py-5 bg-[#0ea5e9] text-white rounded-[22px] font-bold text-xl shadow-xl shadow-[#0ea5e9]/20 transition-transform active:scale-95">확인</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-xl mx-auto px-6 pt-16 pb-24">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0f9ff] text-[#0ea5e9] rounded-full mb-6 text-sm font-black">
            <Music className="w-4 h-4" /> 합주실·연습실 등록
          </div>
          <h1 className="text-[30px] font-black text-[#191f28] mb-3 leading-tight tracking-tight break-keep">
            우리 공간을<br />
            <span className="text-[#0ea5e9]">사역팀에게 소개해보세요</span>
          </h1>
          <p className="text-[15px] text-[#4e5968] leading-relaxed break-keep font-medium">
            정기 연습이나 사역 리허설 공간을 찾는 팀들에게 노출돼요. 등록 및 이용에 비용이 발생하지 않아요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <section className="mb-8">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">노출 방식 선택</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, track: "info" })}
                className={`text-left p-5 rounded-[24px] border-2 transition-all ${formData.track === "info" ? "border-[#0ea5e9] bg-[#f0f9ff]" : "border-[#f2f4f6] bg-white hover:border-[#e5e8eb]"
                  }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${formData.track === "info" ? "bg-[#0ea5e9] text-white" : "bg-[#f2f4f6] text-[#8b95a1]"}`}>
                  <Phone className="w-[18px] h-[18px]" />
                </div>
                <p className="text-[15px] font-black text-[#191f28] mb-1">정보만 제공</p>
                <p className="text-[12px] font-bold text-[#8b95a1] leading-relaxed break-keep">
                  전화문의로 직접 예약을 받아요. 등록·이용 무료 (추후 소정의 연회비 안내 예정)
                </p>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, track: "booking" })}
                className={`text-left p-5 rounded-[24px] border-2 transition-all ${formData.track === "booking" ? "border-[#0ea5e9] bg-[#f0f9ff]" : "border-[#f2f4f6] bg-white hover:border-[#e5e8eb]"
                  }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${formData.track === "booking" ? "bg-[#0ea5e9] text-white" : "bg-[#f2f4f6] text-[#8b95a1]"}`}>
                  <Zap className="w-[18px] h-[18px]" />
                </div>
                <p className="text-[15px] font-black text-[#191f28] mb-1">예약·결제 지원</p>
                <p className="text-[12px] font-bold text-[#8b95a1] leading-relaxed break-keep">
                  스테이온에서 예약과 결제를 대신 처리해요. 예약 성사 시 수수료 10%(부가세 별도), 이후 단계적으로 낮아질 예정. 목록 상단에 우선 노출되고 "바로예약" 배지가 붙어요.
                </p>
              </button>
            </div>
            {formData.track === "booking" && (
              <p className="text-[12px] text-[#0ea5e9] font-bold leading-relaxed break-keep mt-3 px-1">
                예약·결제 시스템은 순차 오픈 예정이에요. 지금 등록해두시면 오픈 즉시 반영돼요.
              </p>
            )}
          </section>

          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">신청자 정보</h3>
            <CustomInput label="신청자 성함" required value={formData.applicantName} onChange={(v) => setFormData({ ...formData, applicantName: v })} placeholder="홍길동" autoFocus />
            <CustomInput
              label="담당자 연락처" required
              value={formData.applicantContact}
              onChange={(v) => setFormData({ ...formData, applicantContact: formatPhoneNumber(v) })}
              placeholder="010-0000-0000"
              error={errors.applicantContact}
            />
            <CustomInput label="안내받으실 이메일 주소" value={formData.applicantEmail} onChange={(v) => setFormData({ ...formData, applicantEmail: v })} placeholder="example@email.com" />
          </section>

          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">공간 정보</h3>
            <CustomInput label="공간명" required value={formData.roomName} onChange={(v) => setFormData({ ...formData, roomName: v })} placeholder="예: OO사운드 합주실" />

            <div className="mb-8">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1 tracking-tight">
                위치 <span className="text-[#0ea5e9]">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddressSearch}
                className="w-full flex items-center justify-between text-left text-[16px] font-bold py-3 px-1 border-b-2 border-[#f2f4f6] hover:border-[#e5e8eb] transition-all"
              >
                <span className={formData.address ? "text-[#191f28]" : "text-[#d1d6db]"}>
                  {formData.address || "주소 검색하기"}
                </span>
                <MapPin className="w-5 h-5 text-[#adb5bd] shrink-0" />
              </button>
              {formData.address && (
                <input
                  type="text"
                  value={formData.addressDetail}
                  onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                  placeholder="상세 주소 (동/호수 등)"
                  className="w-full mt-3 text-[14px] font-bold py-2.5 px-1 border-b-2 border-[#f2f4f6] outline-none focus:border-[#0ea5e9] transition-all bg-transparent placeholder:text-[#d1d6db]"
                />
              )}
            </div>

            <PillSelector label="유형" required options={ROOM_TYPE_OPTIONS} value={formData.roomType} onChange={(v) => setFormData({ ...formData, roomType: v })} columns={3} />

            <div className="grid grid-cols-2 gap-4">
              <CustomInput label="평수" value={formData.pyeong} onChange={(v) => setFormData({ ...formData, pyeong: v })} placeholder="예: 20평" />
              <CustomInput label="수용인원" value={formData.capacity} onChange={(v) => setFormData({ ...formData, capacity: v })} placeholder="예: 10명" />
            </div>
          </section>

          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">보유 장비</h3>
            <MultiPillSelector label="보유 장비 체크리스트" options={EQUIPMENT_CHECKLIST_OPTIONS} value={formData.equipmentChecklist} onChange={(v) => setFormData({ ...formData, equipmentChecklist: v })} columns={3} />
            <CustomInput label="마이크 개수" value={formData.micCount} onChange={(v) => setFormData({ ...formData, micCount: v })} placeholder="예: 4개" />

            <div
              onClick={() => setFormData({ ...formData, hasSoundproof: !formData.hasSoundproof })}
              className="flex items-center gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mb-4"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${formData.hasSoundproof ? "bg-[#0ea5e9] border-[#0ea5e9]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.hasSoundproof && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <span className="text-[15px] font-bold text-[#191f28]">방음시설이 되어 있어요</span>
            </div>

            <div
              onClick={() => setFormData({ ...formData, hasParking: !formData.hasParking })}
              className="flex items-center gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${formData.hasParking ? "bg-[#0ea5e9] border-[#0ea5e9]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.hasParking && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <span className="text-[15px] font-bold text-[#191f28]">주차 가능해요</span>
            </div>
            <AnimatePresence>
              {formData.hasParking && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <CustomInput label="주차 시설 정보" value={formData.parkingInfo} onChange={(v) => setFormData({ ...formData, parkingInfo: v })} placeholder="예: 건물 내 2대 무료 주차" />
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">이용 안내</h3>
            <div className="grid grid-cols-2 gap-4">
              <CustomInput label="시간당 요금 (원)" value={formData.hourlyRate} onChange={(v) => setFormData({ ...formData, hourlyRate: formatCurrencyInput(v) })} placeholder="예: 20,000" />
              <CustomInput label="최소 대여시간" value={formData.minRentalHours} onChange={(v) => setFormData({ ...formData, minRentalHours: v })} placeholder="예: 2시간" />
            </div>
            <MultiPillSelector
              label="예약가능 요일"
              options={WEEKDAY_OPTIONS}
              value={formData.availableDays}
              onChange={(v) => setFormData({ ...formData, availableDays: v })}
              columns={4}
            />

            <div className="mb-8">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">예약가능 시간대</label>
              <div className="grid grid-cols-2 gap-3 items-center">
                <select
                  value={formData.availableStartTime}
                  onChange={(e) => setFormData({ ...formData, availableStartTime: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#f2f4f6] bg-white text-[14px] font-bold text-[#191f28] outline-none focus:border-[#0ea5e9] transition-all"
                >
                  <option value="">시작 시간</option>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={formData.availableEndTime}
                  onChange={(e) => setFormData({ ...formData, availableEndTime: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#f2f4f6] bg-white text-[14px] font-bold text-[#191f28] outline-none focus:border-[#0ea5e9] transition-all"
                >
                  <option value="">종료 시간</option>
                  {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">공간 사진 ({selectedFiles.length}/10) <span className="text-[#0ea5e9]">*</span></label>
            <div className="grid grid-cols-3 gap-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square bg-[#f9fafb] border-2 border-dashed border-[#e5e8eb] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[#adb5bd] hover:bg-[#f2f4f6] hover:border-[#0ea5e9]/30 transition-all group">
                <Camera className="w-5 h-5 group-hover:text-[#0ea5e9]" /> <span className="text-[11px] font-bold group-hover:text-[#0ea5e9]">사진 추가</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
              {previewUrls.map((url, index) => (
                <div key={url} className="relative aspect-square group">
                  <img src={url} className="w-full h-full object-cover rounded-2xl shadow-sm" />
                  <button type="button" onClick={(e) => removeImage(e, index)} className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#191f28] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">공간 소개 및 메모</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="공간의 특징, 이용 시 안내사항 등을 자유롭게 적어주세요."
              className="w-full bg-[#f9fafb] rounded-[24px] p-6 outline-none text-[15px] font-bold text-[#191f28] min-h-[120px] resize-none focus:bg-white border border-[#f2f4f6] focus:border-[#0ea5e9] transition-all placeholder:text-[#d1d6db] placeholder:font-medium"
            />
          </section>

          <section className="mb-10">
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">장소 태그 키워드 (최대 {MAX_TAGS}개)</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="예: 방음완비, 지하철역근처"
                className="flex-1 bg-[#f9fafb] rounded-xl px-4 py-3 text-[14px] font-bold outline-none border border-[#f2f4f6] focus:border-[#0ea5e9] transition-all placeholder:text-[#d1d6db]"
              />
              <button type="button" onClick={addTag} className="px-4 py-3 bg-[#191f28] text-white rounded-xl font-bold text-[13px] shrink-0">추가</button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f9ff] text-[#0ea5e9] rounded-full text-[13px] font-bold">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="mb-10">
            <div
              onClick={() => setFormData({ ...formData, agreedToPrivacyPolicy: !formData.agreedToPrivacyPolicy })}
              className="flex items-start gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${formData.agreedToPrivacyPolicy ? "bg-[#0ea5e9] border-[#0ea5e9]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.agreedToPrivacyPolicy && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <div>
                <span className="text-[15px] font-bold text-[#191f28] block mb-1">개인정보 수집·이용 동의 (필수)</span>
                <span className="text-[12px] font-bold text-[#8b95a1] leading-relaxed break-keep">
                  수집 목적: 공간 대여 문의 연락 · 보유 기간: 등록 삭제 시까지
                </span>
              </div>
            </div>

            <div
              onClick={() => setFormData({ ...formData, agreedToFeeNotice: !formData.agreedToFeeNotice })}
              className="flex items-start gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mt-3"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${formData.agreedToFeeNotice ? "bg-[#0ea5e9] border-[#0ea5e9]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.agreedToFeeNotice && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <div>
                <span className="text-[15px] font-bold text-[#191f28] block mb-1">연간 게시 비용 안내 확인 (필수)</span>
                <span className="text-[12px] font-bold text-[#8b95a1] leading-relaxed break-keep">
                  등록은 현재 무료로 제공되고 있어요. 다만 플랫폼 유지를 위해 추후 연간 게시비용이 청구될 수 있어요.
                </span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-5 rounded-[22px] font-bold text-lg transition-all active:scale-95 ${!isFormValid || isSubmitting ? "bg-[#e5e8eb] text-[#b0b8c1] cursor-not-allowed" : "bg-[#0ea5e9] text-white shadow-xl shadow-[#0ea5e9]/10 hover:bg-[#0284c7]"
              }`}
          >
            {isSubmitting ? "신청 중..." : "등록 신청하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
