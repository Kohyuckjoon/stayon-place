import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, ScrollRestoration } from "react-router-dom";
import { Check, Gift, Camera, X, Lock, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadPartnerImage } from "../lib/storage";
import { functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { CustomInput } from "../components/forms/TeamFormControls";
import { PartnerStoreFields, PartnerStoreFieldsValue } from "../components/forms/PartnerStoreFields";

const MAX_GOODS_PHOTOS = 3;
const GOODS_STORAGE_FOLDER = "goods-store";

const SUGGESTED_ITEM_TAGS = [
  "단체티", "후드/맨투맨", "에코백", "스티커/뱃지", "우산", "텀블러", "명찰/랜야드", "인쇄물(현수막·배너)",
];

interface GoodsFormData {
  applicantName: string;
  applicantContact: string;
  businessName: string;
  consultPhone: string;
  contactInfo: string;
  businessRegistrationNumber: string;
  introduction: string;
  description: string;
  agreedToPrivacyPolicy: boolean;
  agreedToFeeNotice: boolean;
}

export default function GoodsStoreRegistrationForm() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<GoodsFormData>({
    applicantName: "",
    applicantContact: "",
    businessName: "",
    consultPhone: "",
    contactInfo: "",
    businessRegistrationNumber: "",
    introduction: "",
    description: "",
    agreedToPrivacyPolicy: false,
    agreedToFeeNotice: false,
  });

  const [storeFields, setStoreFields] = useState<PartnerStoreFieldsValue>({
    itemTags: [],
    onlineStoreUrl: "",
    minPrice: "",
  });

  const [errors, setErrors] = useState({ applicantContact: "" });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const formatBizRegNumber = (rawValue: string) => {
    const number = rawValue.replace(/[^\d]/g, "");
    if (number.length <= 3) return number;
    if (number.length <= 5) return `${number.slice(0, 3)}-${number.slice(3)}`;
    return `${number.slice(0, 3)}-${number.slice(3, 5)}-${number.slice(5, 10)}`;
  };

  const formatPhoneNumber = (rawValue: string, trackError: boolean) => {
    const number = rawValue.replace(/[^\d]/g, "");
    if (trackError) {
      if (/[^0-9-]/.test(rawValue)) {
        setErrors((prev) => ({ ...prev, applicantContact: "숫자만 입력해주세요!" }));
      } else {
        setErrors((prev) => ({ ...prev, applicantContact: "" }));
      }
    }
    if (number.length <= 3) return number;
    if (number.length <= 7) return `${number.slice(0, 3)}-${number.slice(3)}`;
    return `${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7, 11)}`;
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...files].slice(0, MAX_GOODS_PHOTOS));
  };

  const removePhotoAt = (idx: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    const urls = photoFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photoFiles]);

  const isFormValid = useMemo(() => {
    return (
      formData.applicantName.trim() !== "" &&
      formData.applicantContact.length >= 12 &&
      formData.businessName.trim() !== "" &&
      formData.businessRegistrationNumber.trim() !== "" &&
      storeFields.itemTags.length > 0 &&
      storeFields.onlineStoreUrl.trim() !== "" &&
      storeFields.minPrice.trim() !== "" &&
      formData.consultPhone.trim() !== "" &&
      formData.contactInfo.trim() !== "" &&
      formData.introduction.trim() !== "" &&
      formData.agreedToPrivacyPolicy &&
      formData.agreedToFeeNotice &&
      !errors.applicantContact
    );
  }, [formData, storeFields, errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isFormValid || !user) return;
    try {
      setIsSubmitting(true);

      const photos = photoFiles.length > 0
        ? await Promise.all(photoFiles.map((file) => uploadPartnerImage(file, GOODS_STORAGE_FOLDER, formData.businessName, formData.applicantName)))
        : [];

      await addDoc(collection(db, "goodsStore"), {
        applicantName: formData.applicantName,
        applicantContact: formData.applicantContact,
        applicantUid: user.uid,
        businessName: formData.businessName,
        itemTags: storeFields.itemTags,
        onlineStoreUrl: storeFields.onlineStoreUrl.trim(),
        minPrice: Number(storeFields.minPrice) || 0,
        consultPhone: formData.consultPhone,
        contactInfo: formData.contactInfo.trim(),
        businessRegistrationNumber: formData.businessRegistrationNumber.trim(),
        introduction: formData.introduction,
        description: formData.description,
        photos,
        agreedToPrivacyPolicy: formData.agreedToPrivacyPolicy,
        agreedToFeeNotice: formData.agreedToFeeNotice,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
      await triggerAdminNotification({
        type: "GOODS",
        payload: {
          businessName: formData.businessName,
          applicantName: formData.applicantName,
          applicantContact: formData.applicantContact,
          businessRegistrationNumber: formData.businessRegistrationNumber,
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
        <div className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f2f8ff] text-[#3182f6] rounded-full mb-6 text-sm font-black">
          <Gift className="w-4 h-4" /> 굿즈 매장 등록
        </div>
        <p className="text-[18px] font-black text-[#191f28] mb-3">로그인이 필요해요</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">업체 등록 신청서를 작성하려면 먼저 로그인해주세요. 계정이 없다면 로그인 과정에서 바로 가입할 수 있어요.</p>
        <button
          onClick={() => loginWithGoogle().catch(() => { })}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#3182f6] text-white rounded-xl font-bold text-[14px] hover:bg-[#1b64da] transition-all"
        >
          <Lock className="w-4 h-4" /> 로그인하고 계속하기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#191f28] selection:bg-[#3182f6]/10 font-sans antialiased">
      <ScrollRestoration />

      {/* 완료 모달 */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-white flex flex-col items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }} className="w-24 h-24 bg-[#f2f8ff] rounded-full flex items-center justify-center mb-8">
              <Check className="w-12 h-12 text-[#3182f6]" strokeWidth={4} />
            </motion.div>
            <h2 className="text-3xl font-bold mb-4 tracking-tight">등록 신청이 완료되었어요</h2>
            <p>관리자 확인 후 등록이 반영되기까지<br /><span className="font-semibold text-[#333d4b]">영업일 기준 최대 7일</span> 정도 소요될 수 있어요.</p>
            <br />
            <p className="text-sm text-[#8b95a1] pt-2 border-t border-[#f2f4f6] max-w-sm mx-auto">
              허위 정보 또는 확인이 어려운 업체 정보는 등록이 거절될 수 있어요.
            </p>
            <br />
            <button onClick={() => navigate("/")} className="w-full max-w-sm py-5 bg-[#3182f6] text-white rounded-[22px] font-bold text-xl shadow-xl shadow-[#3182f6]/20 transition-transform active:scale-95">확인</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-xl mx-auto px-6 pt-16 pb-24">
        {/* 안내 헤더 */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f2f8ff] text-[#3182f6] rounded-full mb-6 text-sm font-black">
            <Gift className="w-4 h-4" /> 굿즈 매장 등록
          </div>
          <h1 className="text-[30px] font-black text-[#191f28] mb-3 leading-tight tracking-tight break-keep">
            우리 매장의 굿즈를<br />
            <span className="text-[#3182f6]">더 많은 교회와 성도들에게 알려보세요</span>
          </h1>
          <p className="text-[15px] text-[#4e5968] leading-relaxed break-keep font-medium">
            등록 및 이용에 비용이 발생하지 않아요.
          </p>

          <div className="mt-6 p-5 bg-[#f9fafb] rounded-[20px] border border-[#f2f4f6]">
            <p className="text-[13px] text-[#8b95a1] font-bold leading-relaxed break-keep">
              등록은 현재 무료로 제공되고 있어요. 다만 플랫폼 유지를 위해 추후 소정의 연간 게시 비용이 청구될 수 있어요. 연회비가 발생할 경우 사전에 스테이온에서 안내드려요.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* 신청자 정보 */}
          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">신청자 정보</h3>
            <CustomInput label="신청자 이름" required value={formData.applicantName} onChange={(v) => setFormData({ ...formData, applicantName: v })} placeholder="홍길동" autoFocus />
            <CustomInput
              label="신청자 연락처" required
              value={formData.applicantContact}
              onChange={(v) => setFormData({ ...formData, applicantContact: formatPhoneNumber(v, true) })}
              placeholder="010-0000-0000"
              error={errors.applicantContact}
              hint="공개되지 않아요. 관리자만 확인할 수 있어요."
            />
            <div className="flex items-center gap-2.5 mb-8 px-1">
              <Mail className="w-4 h-4 text-[#adb5bd] shrink-0" />
              <span className="text-[13px] font-bold text-[#8b95a1]">등록 이메일: {user.email}</span>
            </div>
          </section>

          {/* 업체 기본 정보 */}
          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">업체 기본 정보</h3>
            <CustomInput label="업체명(상호)" required value={formData.businessName} onChange={(v) => setFormData({ ...formData, businessName: v })} placeholder="예: 은혜공방" />

            <PartnerStoreFields
              value={storeFields}
              onChange={setStoreFields}
              suggestedItemTags={SUGGESTED_ITEM_TAGS}
              minPriceHint="예: 10장 기준 개당 ○○원부터"
            />

            <CustomInput
              label="사업자등록번호" required
              value={formData.businessRegistrationNumber}
              onChange={(v) => setFormData({ ...formData, businessRegistrationNumber: formatBizRegNumber(v) })}
              placeholder="000-00-00000"
            />
          </section>

          {/* 업체 소개 */}
          <section className="mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">업체 소개</h3>
            <CustomInput label="업체 한줄 소개" required value={formData.introduction} onChange={(v) => setFormData({ ...formData, introduction: v })} placeholder="예: 정성껏 만드는 손글씨 캘리그래피 굿즈" />
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
              상세 설명 <span className="text-[#b0b8c1] font-medium">(선택)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="취급하는 품목, 제작 방식, 주문/배송 절차 등을 자유롭게 적어주세요."
              className="w-full bg-[#f9fafb] rounded-[24px] p-6 outline-none text-[15px] font-bold text-[#191f28] min-h-[140px] resize-none focus:bg-white border border-[#f2f4f6] focus:border-[#3182f6] transition-all placeholder:text-[#d1d6db] placeholder:font-medium"
            />
          </section>

          {/* 대표 상품 사진 */}
          <section className="mb-10">
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
              대표 상품 이미지 <span className="text-[#b0b8c1] font-medium">(선택, 최대 {MAX_GOODS_PHOTOS}장)</span>
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {photoPreviews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img src={src} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#3182f6] text-white text-[9px] font-black rounded-full pointer-events-none">
                      대표
                    </span>
                  )}
                  <button type="button" onClick={() => removePhotoAt(idx)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#191f28] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photoPreviews.length < MAX_GOODS_PHOTOS && (
                <button type="button" onClick={() => photoInputRef.current?.click()} className="aspect-square bg-[#f9fafb] border-2 border-dashed border-[#e5e8eb] rounded-2xl flex flex-col items-center justify-center gap-1 text-[#adb5bd] hover:bg-[#f2f4f6] hover:border-[#3182f6]/30 transition-all group">
                  <Camera className="w-5 h-5 group-hover:text-[#3182f6]" />
                  <span className="text-[11px] font-bold group-hover:text-[#3182f6]">추가</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#b0b8c1] mt-2 ml-1">첫 번째로 올린 사진이 대표 이미지로 표시돼요.</p>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoFileChange} />
          </section>

          {/* 연락 가능한 방법 */}
          <section className="mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">연락 가능한 방법</h3>
            <CustomInput
              label="상담 전화번호 (대량 주문 문의 전용)" required
              value={formData.consultPhone}
              onChange={(v) => setFormData({ ...formData, consultPhone: formatPhoneNumber(v, false) })}
              placeholder="010-0000-0000 또는 02-000-0000"
              hint="공개됩니다. 방문객이 이 번호로 바로 문의할 수 있어요."
            />
            <CustomInput
              label="연락처(카카오톡/문자)" required
              value={formData.contactInfo}
              onChange={(v) => setFormData({ ...formData, contactInfo: v })}
              placeholder="예: 카카오톡 ID: xxx 또는 전화/문자 가능 번호"
              hint="공개됩니다. 방문객이 참고할 수 있는 연락 방법을 자유롭게 적어주세요."
            />
          </section>

          {/* 필수 동의 사항 */}
          <section className="mb-10 space-y-3">
            <div
              onClick={() => setFormData({ ...formData, agreedToPrivacyPolicy: !formData.agreedToPrivacyPolicy })}
              className="flex items-start gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${formData.agreedToPrivacyPolicy ? "bg-[#3182f6] border-[#3182f6]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.agreedToPrivacyPolicy && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <div>
                <span className="text-[15px] font-bold text-[#191f28] block mb-1">개인정보 및 업체정보 등록에 대한 동의 (필수)</span>
                <span className="text-[12px] font-bold text-[#8b95a1] leading-relaxed break-keep">
                  수집 목적: 업체 소개 및 문의 연락 · 보유 기간: 등록 삭제 시까지
                </span>
              </div>
            </div>

            <div
              onClick={() => setFormData({ ...formData, agreedToFeeNotice: !formData.agreedToFeeNotice })}
              className="flex items-start gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${formData.agreedToFeeNotice ? "bg-[#3182f6] border-[#3182f6]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.agreedToFeeNotice && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <div>
                <span className="text-[15px] font-bold text-[#191f28] block mb-1">연간 게시 비용 안내 확인 (필수)</span>
                <span className="text-[12px] font-bold text-[#8b95a1] leading-relaxed break-keep">
                  연간 게시 비용이 발생할 수 있으며, 발생 시 사전에 스테이온에서 안내드립니다.
                </span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-5 rounded-[22px] font-bold text-lg transition-all active:scale-95 ${!isFormValid || isSubmitting ? "bg-[#e5e8eb] text-[#b0b8c1] cursor-not-allowed" : "bg-[#3182f6] text-white shadow-xl shadow-[#3182f6]/10 hover:bg-[#1b64da]"
              }`}
          >
            {isSubmitting ? "신청 중..." : "등록 신청하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
