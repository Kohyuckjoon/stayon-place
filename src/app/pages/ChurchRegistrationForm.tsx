import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, ScrollRestoration } from "react-router-dom";
import {
  Check, Church, Camera, X, Ban, ChevronDown, Lock, MapPin, FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadChurchImage } from "../lib/storage";
import { functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { DENOMINATION_GROUPS } from "../lib/denominations";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { CustomInput } from "../components/forms/TeamFormControls";
import { useFeatureFlag } from "../lib/featureFlags";
import { FeatureDisabledScreen } from "../components/FeatureDisabledScreen";
import { showAlert } from "../lib/dialog";

const MAX_CHURCH_PHOTOS = 10;
const MAX_YOUTUBE_URLS = 3;
const KAKAO_CHANNEL_URL = "https://pf.kakao.com/_AtexfX/chat";

interface ChurchFormData {
  applicantName: string;
  applicantContact: string;
  churchName: string;
  pastorName: string;
  pastorContact: string;
  churchContact: string;
  denomination: string;
  churchAddress: string;
  churchAddressDetail: string;
  youtubeUrls: string[];
  introduction: string;
  vision: string;
  agreedToPrivacyPolicy: boolean;
  agreedToFeeNotice: boolean;
}

export default function ChurchRegistrationForm() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const churchDirectoryEnabled = useFeatureFlag("churchDirectoryEnabled");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const bulletinInputRef = useRef<HTMLInputElement>(null);
  const [isDenoOpen, setIsDenoOpen] = useState(false);
  const [isCustomDeno, setIsCustomDeno] = useState(false);
  const [denoSearchTerm, setDenoSearchTerm] = useState("");

  const [formData, setFormData] = useState<ChurchFormData>({
    applicantName: "",
    applicantContact: "",
    churchName: "",
    pastorName: "",
    pastorContact: "",
    churchContact: "",
    denomination: "",
    churchAddress: "",
    churchAddressDetail: "",
    youtubeUrls: [""],
    introduction: "",
    vision: "",
    agreedToPrivacyPolicy: false,
    agreedToFeeNotice: false,
  });

  const [pastorSameAsApplicant, setPastorSameAsApplicant] = useState(false);
  const [churchContactSameAsPastor, setChurchContactSameAsPastor] = useState(false);

  const [errors, setErrors] = useState({ applicantContact: "" });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [bulletinFile, setBulletinFile] = useState<File | null>(null);
  const [bulletinPreview, setBulletinPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const handleChurchAddressSearch = () => {
    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        setFormData((prev) => ({ ...prev, churchAddress: data.address }));
      },
    }).open();
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

  const togglePastorSameAsApplicant = () => {
    const next = !pastorSameAsApplicant;
    setPastorSameAsApplicant(next);
    setFormData((prev) => ({
      ...prev,
      pastorName: next ? prev.applicantName : "",
      pastorContact: next ? prev.applicantContact : "",
    }));
  };

  const toggleChurchContactSameAsPastor = () => {
    const next = !churchContactSameAsPastor;
    setChurchContactSameAsPastor(next);
    setFormData((prev) => ({
      ...prev,
      churchContact: next ? prev.pastorContact : "",
    }));
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...files].slice(0, MAX_CHURCH_PHOTOS));
  };

  const removePhotoAt = (idx: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    const urls = photoFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photoFiles]);

  const handleBulletinFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBulletinFile(file);
  };

  const removeBulletin = () => {
    setBulletinFile(null);
  };

  useEffect(() => {
    if (!bulletinFile) {
      setBulletinPreview(null);
      return;
    }
    const url = URL.createObjectURL(bulletinFile);
    setBulletinPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bulletinFile]);

  const updateYoutubeUrlAt = (idx: number, value: string) => {
    const next = [...formData.youtubeUrls];
    next[idx] = value;
    setFormData({ ...formData, youtubeUrls: next });
  };

  const addYoutubeUrlRow = () => {
    if (formData.youtubeUrls.length >= MAX_YOUTUBE_URLS) return;
    setFormData({ ...formData, youtubeUrls: [...formData.youtubeUrls, ""] });
  };

  const removeYoutubeUrlRow = (idx: number) => {
    const next = formData.youtubeUrls.filter((_, i) => i !== idx);
    setFormData({ ...formData, youtubeUrls: next.length > 0 ? next : [""] });
  };

  const isFormValid = useMemo(() => {
    return (
      formData.applicantName.trim() !== "" &&
      formData.applicantContact.length >= 12 &&
      formData.churchName.trim() !== "" &&
      formData.pastorName.trim() !== "" &&
      formData.pastorContact.trim() !== "" &&
      formData.churchContact.trim() !== "" &&
      formData.denomination.trim() !== "" &&
      formData.churchAddress.trim() !== "" &&
      formData.introduction.trim() !== "" &&
      formData.vision.trim() !== "" &&
      formData.agreedToPrivacyPolicy &&
      formData.agreedToFeeNotice &&
      !errors.applicantContact
    );
  }, [formData, errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isFormValid || !user) return;
    try {
      setIsSubmitting(true);

      const photos = photoFiles.length > 0
        ? await Promise.all(photoFiles.map((file) => uploadChurchImage(file, formData.churchName, formData.applicantName)))
        : [];

      const bulletinImage = bulletinFile
        ? await uploadChurchImage(bulletinFile, formData.churchName, formData.applicantName)
        : "";

      const youtubeUrls = formData.youtubeUrls.map((u) => u.trim()).filter(Boolean);

      await addDoc(collection(db, "churches"), {
        ...formData,
        youtubeUrls,
        photos,
        bulletinImage,
        status: "pending",
        applicantUid: user.uid,
        applicantEmail: user.email || "",
        createdAt: serverTimestamp(),
      });

      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
      await triggerAdminNotification({
        type: "CHURCH",
        payload: {
          applicantName: formData.applicantName,
          applicantContact: formData.applicantContact,
          churchName: formData.churchName,
          churchContact: formData.churchContact,
          denomination: formData.denomination,
          churchAddress: formData.churchAddress,
        },
      });

      setIsSuccessModalOpen(true);
    } catch (error) {
      await showAlert("등록 중 오류가 발생했습니다." + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!churchDirectoryEnabled) {
    return <FeatureDisabledScreen />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#10b981] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ecfdf5] text-[#10b981] rounded-full mb-6 text-sm font-black">
          <Church className="w-4 h-4" /> 전국 교회 등록
        </div>
        <p className="text-[18px] font-black text-[#191f28] mb-3">로그인이 필요해요</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">교회 등록 신청서를 작성하려면 먼저 로그인해주세요. 계정이 없다면 로그인 과정에서 바로 가입할 수 있어요.</p>
        <button
          onClick={() => loginWithGoogle().catch(() => { })}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#10b981] text-white rounded-xl font-bold text-[14px] hover:bg-[#0ea975] transition-all"
        >
          <Lock className="w-4 h-4" /> 로그인하고 계속하기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#191f28] selection:bg-[#10b981]/10 font-sans antialiased">
      <ScrollRestoration />

      {/* 완료 모달 */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-white flex flex-col items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }} className="w-24 h-24 bg-[#ecfdf5] rounded-full flex items-center justify-center mb-8">
              <Check className="w-12 h-12 text-[#10b981]" strokeWidth={4} />
            </motion.div>
            <h2 className="text-3xl font-bold mb-4 tracking-tight">등록 신청이 완료되었어요</h2>
            <p>관리자 확인 후 등록이 반영되기까지<br /><span className="font-semibold text-[#333d4b]">영업일 기준 최대 7일</span> 정도 소요될 수 있어요.</p>
            <br />
            <p className="text-sm text-[#8b95a1] pt-2 border-t border-[#f2f4f6] max-w-sm mx-auto">
              소속 확인 과정에서 등록이 거절될 수 있으며, <span className="font-semibold text-rose-500">이단 및 신천지 등은 등록이 엄격히 제한됩니다.</span>
            </p>
            <br />
            <button onClick={() => navigate("/")} className="w-full max-w-sm py-5 bg-[#10b981] text-white rounded-[22px] font-bold text-xl shadow-xl shadow-[#10b981]/20 transition-transform active:scale-95">확인</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-xl mx-auto px-6 pt-16 pb-24">
        {/* 안내 헤더 */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ecfdf5] text-[#10b981] rounded-full mb-6 text-sm font-black">
            <Church className="w-4 h-4" /> 전국 교회 등록
          </div>
          <h1 className="text-[30px] font-black text-[#191f28] mb-3 leading-tight tracking-tight break-keep">
            수련회 장소와 상관없이<br />
            <span className="text-[#10b981]">지역별로 우리 교회를 알려보세요</span>
          </h1>
          <p className="text-[15px] text-[#4e5968] leading-relaxed break-keep font-medium">
            등록 및 이용에 비용이 발생하지 않아요.
          </p>

          <div className="mt-6 p-5 bg-[#f9fafb] rounded-[20px] border border-[#f2f4f6]">
            <p className="text-[13px] text-[#8b95a1] font-bold leading-relaxed break-keep">
              등록은 현재 무료로 제공되고 있어요. 다만 플랫폼 유지를 위해 추후 소정의 연간 게시 비용이 청구될 수 있어요. 연회비가 발생할 경우 사전에 스테이온에서 안내 연락 드려요.
            </p>
          </div>

          <div className="mt-4 bg-white border-2 border-red-100 rounded-[24px] p-5 shadow-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full mb-3">
              <Ban className="w-3.5 h-3.5" />
              <span className="text-[12px] font-black tracking-tight">이단 · 신천지 원천 차단 정책</span>
            </div>
            <p className="text-[#4e5968] text-[13px] font-medium leading-relaxed break-keep">
              스테이온은 신천지, 이단을 절대 금지하며, 소속이 불분명한 경우 등록이 거절될 수 있습니다.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* 신청자 정보 */}
          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">신청자 정보</h3>
            <CustomInput label="신청자 이름" required value={formData.applicantName} onChange={(v) => setFormData({ ...formData, applicantName: v })} placeholder="홍길동" />
            <CustomInput
              label="신청자 연락처" required
              value={formData.applicantContact}
              onChange={(v) => setFormData({ ...formData, applicantContact: formatPhoneNumber(v, true) })}
              placeholder="010-0000-0000"
              error={errors.applicantContact}
            />
          </section>

          {/* 교회 기본 정보 */}
          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">교회 기본 정보</h3>
            <CustomInput label="교회명" required value={formData.churchName} onChange={(v) => setFormData({ ...formData, churchName: v })} placeholder="예: 은혜교회" />

            {/* 교단 선택 섹션 - TeamRegistrationForm.tsx와 동일한 목록/UI를 그대로 재사용 */}
            <div className="mb-8 relative">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">
                소속 교단 <span className="text-[#10b981]">*</span>
              </label>
              <div
                onClick={() => setIsDenoOpen(!isDenoOpen)}
                className={`flex justify-between items-center text-[18px] font-bold py-3 border-b-2 transition-all cursor-pointer ${isDenoOpen ? "border-[#10b981]" : "border-[#f2f4f6] hover:border-[#e5e8eb]"}`}
              >
                <span className={(formData.denomination || isCustomDeno) ? "text-[#191f28]" : "text-[#d1d6db]"}>
                  {isCustomDeno ? "직접 입력" : (formData.denomination || "선택해주세요")}
                </span>
                <ChevronDown className={`w-5 h-5 text-[#adb5bd] transition-transform ${isDenoOpen ? "rotate-180 text-[#10b981]" : ""}`} />
              </div>

              <AnimatePresence>
                {isDenoOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setIsDenoOpen(false)}
                      className="fixed inset-0 z-40"
                    />
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 w-full mt-2 bg-white rounded-[24px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-[#f2f4f6] overflow-hidden">
                      <div className="p-4 bg-[#f9fafb] border-b border-[#f2f4f6]">
                        <input className="w-full bg-transparent font-bold outline-none text-[15px] text-[#191f28] placeholder:text-[#adb5bd]" placeholder="교단명을 입력해보세요" autoFocus onChange={(e) => setDenoSearchTerm(e.target.value)} />
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2 no-scrollbar">
                        {DENOMINATION_GROUPS.flatMap((g) => g.items).filter((i) => i.includes(denoSearchTerm)).map((item) => (
                          <div
                            key={item}
                            onClick={() => {
                              if (item === "기타(직접 입력)") {
                                setIsCustomDeno(true);
                                setFormData({ ...formData, denomination: "" });
                              } else {
                                setIsCustomDeno(false);
                                setFormData({ ...formData, denomination: item });
                              }
                              setIsDenoOpen(false);
                            }}
                            className="p-3.5 hover:bg-[#f2f4f6] rounded-[18px] font-bold text-[14px] text-[#333d4b] cursor-pointer transition-colors flex justify-between items-center group"
                          >
                            {item} <Check className={`w-4 h-4 text-[#10b981] opacity-0 group-hover:opacity-100 transition-opacity ${formData.denomination === item ? "opacity-100" : ""}`} />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isCustomDeno && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden">
                    <CustomInput label="교단명 직접 입력" required value={formData.denomination} onChange={(v) => setFormData({ ...formData, denomination: v })} placeholder="예: 한국기독교00연합" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 교회 주소 */}
            <div className="mb-2">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">
                교회 위치(주소) <span className="text-[#10b981]">*</span>
              </label>
              <div onClick={handleChurchAddressSearch} className="flex items-center gap-3 text-[18px] font-bold py-3 border-b-2 border-[#f2f4f6] cursor-pointer hover:border-[#e5e8eb] transition-all">
                <MapPin className="w-5 h-5 text-[#10b981] shrink-0" strokeWidth={2.5} />
                <span className={formData.churchAddress ? "text-[#191f28]" : "text-[#d1d6db]"}>
                  {formData.churchAddress || "주소 검색하기"}
                </span>
              </div>
              {formData.churchAddress && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                  <input
                    className="w-full text-[16px] font-bold py-3 outline-none border-b-2 border-[#f2f4f6] focus:border-[#10b981] bg-transparent placeholder:text-[#d1d6db] transition-all"
                    placeholder="상세 주소를 입력해주세요"
                    value={formData.churchAddressDetail}
                    onChange={(e) => setFormData({ ...formData, churchAddressDetail: e.target.value })}
                  />
                </motion.div>
              )}
            </div>
          </section>

          {/* 담임목사님 정보 */}
          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">담임목사님 정보</h3>

            <div
              onClick={togglePastorSameAsApplicant}
              className="flex items-center gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mb-8"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${pastorSameAsApplicant ? "bg-[#10b981] border-[#10b981]" : "bg-white border-[#e5e8eb]"}`}>
                {pastorSameAsApplicant && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <span className="text-[15px] font-bold text-[#191f28]">신청자명과 담임목사님 성명이 같아요</span>
            </div>

            <CustomInput label="담임목사님 성함" required value={formData.pastorName} onChange={(v) => setFormData({ ...formData, pastorName: v })} placeholder="김목사" />
            <CustomInput
              label="담임목사님 연락처" required
              value={formData.pastorContact}
              onChange={(v) => setFormData({ ...formData, pastorContact: formatPhoneNumber(v, false) })}
              placeholder="010-0000-0000"
              hint="공개되지 않아요. 관리자만 확인할 수 있어요."
            />
          </section>

          {/* 교회 연락처 */}
          <section className="mb-10">
            <div
              onClick={toggleChurchContactSameAsPastor}
              className="flex items-center gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mb-8"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${churchContactSameAsPastor ? "bg-[#10b981] border-[#10b981]" : "bg-white border-[#e5e8eb]"}`}>
                {churchContactSameAsPastor && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <span className="text-[15px] font-bold text-[#191f28]">담임목사 연락처와 교회 연락처가 동일한 경우 체크해주세요</span>
            </div>
            <CustomInput
              label="교회 연락처" required
              value={formData.churchContact}
              onChange={(v) => setFormData({ ...formData, churchContact: formatPhoneNumber(v, false) })}
              placeholder="010-0000-0000 또는 02-000-0000"
              hint="공개됩니다. 방문객이 이 번호로 바로 문의할 수 있어요."
            />
          </section>

          {/* 교회 소개 */}
          <section className="mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">교회 소개</h3>
            <CustomInput label="교회 한줄 소개" required value={formData.introduction} onChange={(v) => setFormData({ ...formData, introduction: v })} placeholder="예: 지역과 함께 성장하는 은혜교회입니다" />
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
              교회 비전 소개 <span className="text-[#10b981]">*</span>
            </label>
            <textarea
              value={formData.vision}
              onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
              placeholder="우리 교회가 그리는 비전, 주요 사역 방향 등을 자유롭게 적어주세요."
              className="w-full bg-[#f9fafb] rounded-[24px] p-6 outline-none text-[15px] font-bold text-[#191f28] min-h-[140px] resize-none focus:bg-white border border-[#f2f4f6] focus:border-[#10b981] transition-all placeholder:text-[#d1d6db] placeholder:font-medium"
            />
          </section>

          {/* 교회 주보 */}
          <section className="mb-10">
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
              교회 주보 <span className="text-[#b0b8c1] font-medium">(선택)</span>
            </label>
            {bulletinPreview ? (
              <div className="relative w-40 aspect-[3/4] rounded-2xl overflow-hidden">
                <img src={bulletinPreview} className="w-full h-full object-cover" />
                <button type="button" onClick={removeBulletin} className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#191f28] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => bulletinInputRef.current?.click()} className="w-40 aspect-[3/4] bg-[#f9fafb] border-2 border-dashed border-[#e5e8eb] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[#adb5bd] hover:bg-[#f2f4f6] hover:border-[#10b981]/30 transition-all group">
                <FileText className="w-6 h-6 group-hover:text-[#10b981]" />
                <span className="text-[11px] font-bold group-hover:text-[#10b981]">주보 추가</span>
              </button>
            )}
            <input ref={bulletinInputRef} type="file" accept="image/*" className="hidden" onChange={handleBulletinFileChange} />
            <p className="text-[12px] text-[#8b95a1] font-bold leading-relaxed break-keep mt-3">
              주보는 이후{" "}
              <a href={KAKAO_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="text-[#10b981] underline">
                1:1 문의(카카오톡 플러스 친구)
              </a>
              로도 보내주실 수 있어요. 다만 주보가 없으면 최종 승인이 어려울 수 있어요.
            </p>
          </section>

          {/* 교회 사진 */}
          <section className="mb-10">
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
              교회 사진 <span className="text-[#b0b8c1] font-medium">(선택, 최대 {MAX_CHURCH_PHOTOS}장)</span>
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {photoPreviews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img src={src} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#10b981] text-white text-[9px] font-black rounded-full pointer-events-none">
                      대표
                    </span>
                  )}
                  <button type="button" onClick={() => removePhotoAt(idx)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#191f28] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photoPreviews.length < MAX_CHURCH_PHOTOS && (
                <button type="button" onClick={() => photoInputRef.current?.click()} className="aspect-square bg-[#f9fafb] border-2 border-dashed border-[#e5e8eb] rounded-2xl flex flex-col items-center justify-center gap-1 text-[#adb5bd] hover:bg-[#f2f4f6] hover:border-[#10b981]/30 transition-all group">
                  <Camera className="w-5 h-5 group-hover:text-[#10b981]" />
                  <span className="text-[11px] font-bold group-hover:text-[#10b981]">추가</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#b0b8c1] mt-2 ml-1">첫 번째로 올린 사진이 대표 이미지로 표시돼요.</p>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoFileChange} />
          </section>

          {/* 유튜브 링크 */}
          <section className="mb-10">
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
              교회 유튜브 채널/영상 링크 <span className="text-[#b0b8c1] font-medium">(선택, 최대 {MAX_YOUTUBE_URLS}개)</span>
            </label>
            <div className="space-y-2">
              {formData.youtubeUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => updateYoutubeUrlAt(i, e.target.value)}
                    placeholder="https://youtube.com/@..."
                    className="flex-1 text-[15px] font-bold py-3 px-1 border-b-2 border-[#f2f4f6] outline-none focus:border-[#10b981] bg-transparent placeholder:text-[#d1d6db] transition-all"
                  />
                  {formData.youtubeUrls.length > 1 && (
                    <button type="button" onClick={() => removeYoutubeUrlRow(i)} className="shrink-0 p-2 text-[#adb5bd] hover:text-[#f04452] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {formData.youtubeUrls.length < MAX_YOUTUBE_URLS && (
                <button type="button" onClick={addYoutubeUrlRow} className="w-full py-2.5 border border-dashed border-[#e5e8eb] rounded-xl text-[12px] font-bold text-[#8b95a1] hover:border-[#10b981] hover:text-[#10b981] transition-all">
                  + 링크 추가
                </button>
              )}
            </div>
          </section>

          {/* 필수 동의 사항 */}
          <section className="mb-10 space-y-3">
            <div
              onClick={() => setFormData({ ...formData, agreedToPrivacyPolicy: !formData.agreedToPrivacyPolicy })}
              className="flex items-start gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${formData.agreedToPrivacyPolicy ? "bg-[#10b981] border-[#10b981]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.agreedToPrivacyPolicy && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <div>
                <span className="text-[15px] font-bold text-[#191f28] block mb-1">개인정보 및 교회정보 등록에 대한 동의 (필수)</span>
                <span className="text-[12px] font-bold text-[#8b95a1] leading-relaxed break-keep">
                  수집 목적: 교회 소개 및 문의 연락 · 보유 기간: 등록 삭제 시까지
                </span>
              </div>
            </div>

            <div
              onClick={() => setFormData({ ...formData, agreedToFeeNotice: !formData.agreedToFeeNotice })}
              className="flex items-start gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${formData.agreedToFeeNotice ? "bg-[#10b981] border-[#10b981]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.agreedToFeeNotice && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <div>
                <span className="text-[15px] font-bold text-[#191f28] block mb-1">연간 게시 비용 안내 확인 (필수)</span>
                <span className="text-[12px] font-bold text-[#8b95a1] leading-relaxed break-keep">
                  등록은 현재 무료로 제공되고 있어요. 다만 플랫폼 유지를 위해 추후 소정의 연간 게시 비용이 청구될 수 있어요. 연회비 발생 시 사전에 스테이온에서 안내 연락 드려요.
                </span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-5 rounded-[22px] font-bold text-lg transition-all active:scale-95 ${!isFormValid || isSubmitting ? "bg-[#e5e8eb] text-[#b0b8c1] cursor-not-allowed" : "bg-[#10b981] text-white shadow-xl shadow-[#10b981]/10 hover:bg-[#0ea975]"
              }`}
          >
            {isSubmitting ? "신청 중..." : "등록 신청하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
