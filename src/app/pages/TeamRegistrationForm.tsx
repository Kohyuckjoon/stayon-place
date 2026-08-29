import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, ScrollRestoration } from "react-router-dom";
import {
  Check, AlertCircle, Mic2, Camera, X, Ban, ChevronDown, Lock, MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadTeamImage } from "../lib/storage";
import { functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { DENOMINATION_GROUPS } from "../lib/denominations";
import { REGION_OPTIONS } from "../lib/regions";
import { EQUIPMENT_OPTIONS } from "../lib/teamDisplay";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { CustomInput, PillSelector, MultiPillSelector, CardSelector as EquipmentSelector } from "../components/forms/TeamFormControls";

const CATEGORY_OPTIONS = ["찬양팀", "음향·조명", "찬양사역자", "세션", "외부 강사", "레크리에이션 강사", "기독교 문화 사역"] as const;
const INSTRUCTOR_CATEGORIES = ["외부 강사", "레크리에이션 강사"] as const;
const MAX_TEAM_IMAGES = 3;
const TEAM_SIZE_OPTIONS = ["5인 이하", "6~10명", "11~15명", "16명 이상"] as const;
const SESSION_PART_OPTIONS = [
  "피아노", "세컨피아노", "드럼", "기타(통기타)", "기타(베이스)", "기타(일렉)", "직접 입력",
] as const;
const TEAM_COMPOSITION_OPTIONS = [
  "인도자", "보컬", "피아노", "세컨피아노", "드럼", "기타(어쿠스틱)", "기타(일렉)", "기타(베이스)",
] as const;
const REFERRAL_OPTIONS = ["쓰레드", "인스타그램", "카카오 오픈채팅방", "지인 소개", "기타"] as const;

interface TeamFormData {
  applicantName: string;
  applicantContact: string;
  applicantEmail: string;
  pastorDifferent: boolean;
  pastorName: string;
  pastorConsentAgreed: boolean;
  hasChurch: boolean | null;
  churchName: string;
  denomination: string;
  churchAddress: string;
  churchAddressDetail: string;
  churchNamePrivate: boolean;
  experience: string;
  isIndividual: boolean;
  teamName: string;
  category: string;
  categoryCustom: string;
  sessionPart: string;
  sessionPartCustom: string;
  teamSize: string;
  teamComposition: string[];
  hasSoundEngineer: boolean;
  hasLighting: boolean;
  equipment: string;
  serviceRegions: string[];
  youtubeUrl: string;
  instagramUrl: string;
  threadsUrl: string;
  referralSource: string;
  referralDetail: string;
  agreedToPrivacyPolicy: boolean;
  agreedToFeeNotice: boolean;
}

export default function TeamRegistrationForm() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDenoOpen, setIsDenoOpen] = useState(false);
  const [isCustomDeno, setIsCustomDeno] = useState(false);
  const [denoSearchTerm, setDenoSearchTerm] = useState("");

  const [formData, setFormData] = useState<TeamFormData>({
    applicantName: "",
    applicantContact: "",
    applicantEmail: "",
    pastorDifferent: false,
    pastorName: "",
    pastorConsentAgreed: false,
    hasChurch: true,
    churchName: "",
    denomination: "",
    churchAddress: "",
    churchAddressDetail: "",
    churchNamePrivate: false,
    experience: "",
    isIndividual: false,
    teamName: "",
    category: "",
    categoryCustom: "",
    sessionPart: "",
    sessionPartCustom: "",
    teamSize: "",
    teamComposition: [],
    hasSoundEngineer: false,
    hasLighting: false,
    equipment: "",
    serviceRegions: [],
    youtubeUrl: "",
    instagramUrl: "",
    threadsUrl: "",
    referralSource: "",
    referralDetail: "",
    agreedToPrivacyPolicy: false,
    agreedToFeeNotice: false,
  });

  const [errors, setErrors] = useState({ applicantContact: "" });
  const [posterFiles, setPosterFiles] = useState<File[]>([]);
  const [posterPreviews, setPosterPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const isInstructorCategory = (INSTRUCTOR_CATEGORIES as readonly string[]).includes(formData.category);

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

  const formatPhoneNumber = (rawValue: string, field: "applicantContact") => {
    const number = rawValue.replace(/[^\d]/g, "");
    if (/[^0-9-]/.test(rawValue)) {
      setErrors((prev) => ({ ...prev, [field]: "숫자만 입력해주세요!" }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    if (number.length <= 3) return number;
    if (number.length <= 7) return `${number.slice(0, 3)}-${number.slice(3)}`;
    return `${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7, 11)}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setPosterFiles((prev) => [...prev, ...files].slice(0, MAX_TEAM_IMAGES));
  };

  const removePosterAt = (idx: number) => {
    setPosterFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // 파일이 바뀔 때마다 미리보기 URL을 새로 만들고, 이전 URL은 메모리 누수 방지를 위해 해제한다.
  useEffect(() => {
    const urls = posterFiles.map((file) => URL.createObjectURL(file));
    setPosterPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [posterFiles]);

  const isFormValid = useMemo(() => {
    return (
      formData.applicantName.trim() !== "" &&
      formData.applicantContact.length >= 12 &&
      (!formData.pastorDifferent || (formData.pastorName.trim() !== "" && formData.pastorConsentAgreed)) &&
      formData.churchName.trim() !== "" &&
      formData.denomination.trim() !== "" &&
      formData.churchAddress.trim() !== "" &&
      formData.experience.trim() !== "" &&
      formData.teamName.trim() !== "" &&
      formData.category !== "" &&
      (formData.category !== "기독교 문화 사역" || formData.categoryCustom.trim() !== "") &&
      (!(formData.isIndividual && formData.category === "세션") ||
        (formData.sessionPart !== "" &&
          (formData.sessionPart !== "직접 입력" || formData.sessionPartCustom.trim() !== ""))) &&
      (formData.isIndividual || formData.teamSize !== "") &&
      (formData.isIndividual || !(formData.category === "찬양팀" || formData.category === "찬양사역자") || formData.teamComposition.length > 0) &&
      (isInstructorCategory || formData.equipment !== "") &&
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

      const posterImages = posterFiles.length > 0
        ? await Promise.all(posterFiles.map((file) => uploadTeamImage(file, formData.teamName, formData.applicantName)))
        : [];

      await addDoc(collection(db, "ministryTeams"), {
        ...formData,
        posterImage: posterImages[0] || "",
        posterImages,
        status: "pending",
        applicantUid: user.uid,
        createdAt: serverTimestamp(),
      });

      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
      await triggerAdminNotification({
        type: "TEAM",
        payload: {
          teamName: formData.teamName,
          category: formData.category,
          applicantName: formData.applicantName,
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
        <div className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#8b5cf6] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f5f3ff] text-[#8b5cf6] rounded-full mb-6 text-sm font-black">
          <Mic2 className="w-4 h-4" /> 외부 사역팀 등록
        </div>
        <p className="text-[18px] font-black text-[#191f28] mb-3">로그인이 필요해요</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">사역팀 등록 신청서를 작성하려면 먼저 로그인해주세요. 계정이 없다면 로그인 과정에서 바로 가입할 수 있어요.</p>
        <button
          onClick={() => loginWithGoogle().catch(() => { })}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#8b5cf6] text-white rounded-xl font-bold text-[14px] hover:bg-[#7c4ded] transition-all"
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
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }} className="w-24 h-24 bg-[#f5f3ff] rounded-full flex items-center justify-center mb-8">
              <Check className="w-12 h-12 text-[#8b5cf6]" strokeWidth={4} />
            </motion.div>
            <h2 className="text-3xl font-bold mb-4 tracking-tight">등록 신청이 완료되었어요</h2>
            <p>관리자 확인 후 등록이 반영되기까지<br /><span className="font-semibold text-[#333d4b]">영업일 기준 최대 7일</span> 정도 소요될 수 있어요.</p>
            <br />
            <p className="text-sm text-[#8b95a1] pt-2 border-t border-[#f2f4f6] max-w-sm mx-auto">
              건전한 사역 문화를 위해 소속 확인 과정에서 등록이 거절될 수 있으며, <span className="font-semibold text-rose-500">이단 및 신천지 등은 등록이 엄격히 제한됩니다.</span>
            </p>
            <br />
            <button onClick={() => navigate("/")} className="w-full max-w-sm py-5 bg-[#8b5cf6] text-white rounded-[22px] font-bold text-xl shadow-xl shadow-[#8b5cf6]/20 transition-transform active:scale-95">확인</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-xl mx-auto px-6 pt-16 pb-24">
        {/* 안내 헤더 */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f5f3ff] text-[#8b5cf6] rounded-full mb-6 text-sm font-black">
            <Mic2 className="w-4 h-4" /> 외부 사역팀 등록
          </div>
          <h1 className="text-[30px] font-black text-[#191f28] mb-3 leading-tight tracking-tight break-keep">
            찬양팀·찬양사역자·세션팀을<br />
            <span className="text-[#8b5cf6]">교회에 소개해보세요</span>
          </h1>
          <p className="text-[15px] text-[#4e5968] leading-relaxed break-keep font-medium">
            수련회 장소와 상관없이 섭외를 진행할 수 있고, 등록 및 이용에 비용이 발생하지 않아요.
          </p>

          <div className="mt-6 p-5 bg-[#f9fafb] rounded-[20px] border border-[#f2f4f6]">
            <p className="text-[13px] text-[#8b95a1] font-bold leading-relaxed break-keep">
              등록은 현재 무료로 제공되고 있어요. 다만 플랫폼 유지를 위해 추후 연간 게시 비용이 청구될 수 있는 점 참고 부탁드려요.
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
          {/* 대표자 정보 */}
          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">팀 대표자 정보</h3>
            <CustomInput label="대표자 이름" required value={formData.applicantName} onChange={(v) => setFormData({ ...formData, applicantName: v })} placeholder="홍길동" autoFocus />
            <CustomInput
              label="연락처" required
              value={formData.applicantContact}
              onChange={(v) => setFormData({ ...formData, applicantContact: formatPhoneNumber(v, "applicantContact") })}
              placeholder="010-0000-0000"
              error={errors.applicantContact}
            />
            <CustomInput label="이메일" value={formData.applicantEmail} onChange={(v) => setFormData({ ...formData, applicantEmail: v })} placeholder="example@email.com" />
          </section>

          {/* 담임목사님 다름 여부 */}
          <section className="mb-4">
            <div
              onClick={() => setFormData({ ...formData, pastorDifferent: !formData.pastorDifferent })}
              className="flex items-center gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${formData.pastorDifferent ? "bg-[#3182f6] border-[#3182f6]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.pastorDifferent && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <span className="text-[15px] font-bold text-[#191f28]">팀 대표자와 담임목사님이 다릅니다</span>
            </div>

            <AnimatePresence>
              {formData.pastorDifferent && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="pt-8 pl-2 border-l-2 border-[#f2f4f6] ml-3 mt-2">
                    <div className="pl-6">
                      <CustomInput label="담임목사님 성함" required value={formData.pastorName} onChange={(v) => setFormData({ ...formData, pastorName: v })} placeholder="김목사" />
                      <div
                        onClick={() => setFormData({ ...formData, pastorConsentAgreed: !formData.pastorConsentAgreed })}
                        className="flex items-start gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mb-8"
                      >
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${formData.pastorConsentAgreed ? "bg-[#3182f6] border-[#3182f6]" : "bg-white border-[#e5e8eb]"}`}>
                          {formData.pastorConsentAgreed && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                        </div>
                        <div>
                          <span className="text-[14px] font-bold text-[#191f28] block mb-1">담임(대표) 목사님과 상의 후 등록하는 것에 동의합니다.</span>
                          <span className="text-[12px] font-bold text-[#8b95a1] leading-relaxed break-keep">
                            스테이온은 등록 사실을 별도로 확인하지 않습니다.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* 소속 교회 정보 - 모든 신청자(개인/팀/업체 불문)가 항상 입력해야 하는 필수 정보.
              스테이온은 정식 교단에 소속된 교회/사역지 소속만 등록을 받으므로 예/아니오 분기 없이
              바로 입력받는다. */}
          <section className="mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">소속 교회 정보</h3>
            <div>
                <CustomInput label="소속 교회명" required value={formData.churchName} onChange={(v) => setFormData({ ...formData, churchName: v })} placeholder="예: 은혜교회" />

                {/* 교단 선택 섹션 - RegisterVenue.tsx와 동일한 목록/UI를 그대로 재사용 */}
                <div className="mb-8 relative">
                  <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">
                    소속 교단 <span className="text-[#3182f6]">*</span>
                  </label>
                  <div
                    onClick={() => setIsDenoOpen(!isDenoOpen)}
                    className={`flex justify-between items-center text-[18px] font-bold py-3 border-b-2 transition-all cursor-pointer ${isDenoOpen ? "border-[#3182f6]" : "border-[#f2f4f6] hover:border-[#e5e8eb]"}`}
                  >
                    <span className={(formData.denomination || isCustomDeno) ? "text-[#191f28]" : "text-[#d1d6db]"}>
                      {isCustomDeno ? "직접 입력" : (formData.denomination || "선택해주세요")}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-[#adb5bd] transition-transform ${isDenoOpen ? "rotate-180 text-[#3182f6]" : ""}`} />
                  </div>

                  <AnimatePresence>
                    {isDenoOpen && (
                      <>
                        {/* 드롭다운이 열려 있는 동안은 화면 전체를 이 백드롭이 덮어서, 아래에 깔린
                            다른 필드(활동 이력 등)로 탭/스크롤이 잘못 전달되는 것을 원천 차단한다.
                            백드롭을 탭하면 드롭다운만 닫힌다. */}
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
                                {item} <Check className={`w-4 h-4 text-[#3182f6] opacity-0 group-hover:opacity-100 transition-opacity ${formData.denomination === item ? "opacity-100" : ""}`} />
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

                {/* 소속 교회 주소 - RegisterVenue.tsx의 "위치 정보" 검색 UI와 동일한 패턴 */}
                <div className="mb-2">
                  <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">
                    소속 교회 주소 <span className="text-[#3182f6]">*</span>
                  </label>
                  <div onClick={handleChurchAddressSearch} className="flex items-center gap-3 text-[18px] font-bold py-3 border-b-2 border-[#f2f4f6] cursor-pointer hover:border-[#e5e8eb] transition-all">
                    <MapPin className="w-5 h-5 text-[#3182f6] shrink-0" strokeWidth={2.5} />
                    <span className={formData.churchAddress ? "text-[#191f28]" : "text-[#d1d6db]"}>
                      {formData.churchAddress || "주소 검색하기"}
                    </span>
                  </div>
                  {formData.churchAddress && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                      <input
                        className="w-full text-[16px] font-bold py-3 outline-none border-b-2 border-[#f2f4f6] focus:border-[#3182f6] bg-transparent placeholder:text-[#d1d6db] transition-all"
                        placeholder="상세 주소를 입력해주세요"
                        value={formData.churchAddressDetail}
                        onChange={(e) => setFormData({ ...formData, churchAddressDetail: e.target.value })}
                      />
                    </motion.div>
                  )}
                  <div className="flex items-start gap-2 mt-3 px-1">
                    <AlertCircle className="w-3.5 h-3.5 text-[#8b95a1] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#8b95a1] font-bold leading-relaxed break-keep">
                      소속 교회 주소는 정상 교단에 소속된 교회인지 확인하기 위한 절차예요. 정상 교단 소속이 확인되지 않으면 등록이 거절될 수 있어요.
                    </p>
                  </div>
                </div>
            </div>

            <div
              onClick={() => setFormData({ ...formData, churchNamePrivate: !formData.churchNamePrivate })}
              className="flex items-center gap-3 p-4 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mt-2"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${formData.churchNamePrivate ? "bg-[#3182f6] border-[#3182f6]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.churchNamePrivate && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <span className="text-[14px] font-bold text-[#191f28]">소속 교회를 비공개 처리 요청합니다.</span>
            </div>
            <AnimatePresence>
              {formData.churchNamePrivate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="flex items-start gap-2 mt-3 px-1">
                    <AlertCircle className="w-3.5 h-3.5 text-[#3182f6] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#3182f6] font-bold leading-relaxed break-keep">
                      등록자의 개인 정보를 보호하기 위해 소속교회가 비공개 처리됩니다.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* 활동 이력 */}
          <section className="mb-8">
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
              활동 이력 / 경력 소개 <span className="text-[#3182f6]">*</span>
            </label>
            <textarea
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              placeholder="주요 활동 이력, 수련회/집회 인도 경험, 참고할 만한 링크 등을 자유롭게 적어주세요. 관리자 승인의 주요 근거가 됩니다."
              className="w-full bg-[#f9fafb] rounded-[24px] p-6 outline-none text-[15px] font-bold text-[#191f28] min-h-[140px] resize-none focus:bg-white border border-[#f2f4f6] focus:border-[#3182f6] transition-all placeholder:text-[#d1d6db] placeholder:font-medium"
            />
          </section>

          {/* 팀 정보 */}
          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">팀 정보</h3>

            <div
              onClick={() => setFormData({ ...formData, isIndividual: !formData.isIndividual })}
              className="flex items-center gap-3 p-4 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mb-8"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${formData.isIndividual ? "bg-[#3182f6] border-[#3182f6]" : "bg-white border-[#e5e8eb]"}`}>
                {formData.isIndividual && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <span className="text-[14px] font-bold text-[#191f28]">개인입니다 (팀이 아닌 개인 참여)</span>
            </div>

            <PillSelector
              label="분야"
              required
              options={CATEGORY_OPTIONS}
              value={formData.category}
              onChange={(v) => setFormData({ ...formData, category: v, categoryCustom: v === "기독교 문화 사역" ? formData.categoryCustom : "" })}
              columns={3}
            />

            <AnimatePresence>
              {formData.category === "기독교 문화 사역" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <CustomInput
                    label="어떤 문화 사역인지 구체적으로 알려주세요"
                    required
                    value={formData.categoryCustom}
                    onChange={(v) => setFormData({ ...formData, categoryCustom: v })}
                    placeholder="예: 연극·드라마 사역, 미술 사역, 미디어·영상 사역"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {formData.isIndividual && formData.category === "세션" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <PillSelector
                    label="세션 파트"
                    required
                    options={SESSION_PART_OPTIONS}
                    value={formData.sessionPart}
                    onChange={(v) => setFormData({ ...formData, sessionPart: v, sessionPartCustom: v === "직접 입력" ? formData.sessionPartCustom : "" })}
                    columns={2}
                  />
                  <AnimatePresence>
                    {formData.sessionPart === "직접 입력" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <CustomInput label="세션 파트 직접 입력" required value={formData.sessionPartCustom} onChange={(v) => setFormData({ ...formData, sessionPartCustom: v })} placeholder="예: 퍼커션" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 팀인 경우 "팀 이름", 개인인 경우 공개 페이지에 노출될 "업체명/활동명"을 받는다.
                대표자 실명(applicantName)과는 별개로 유지되며, 이 값이 그대로 관리자·공개 목록의
                표시 이름(teamName)이 된다. */}
            <CustomInput
              label={formData.isIndividual ? (formData.category === "음향·조명" ? "업체명 (상호)" : "활동명") : "팀 이름"}
              required
              value={formData.teamName}
              onChange={(v) => setFormData({ ...formData, teamName: v })}
              placeholder={
                formData.isIndividual
                  ? (formData.category === "음향·조명" ? "예: OO사운드" : "예: 다윗의노래")
                  : "예: 은혜와진리 찬양팀"
              }
              hint={formData.isIndividual ? "스테이온 플랫폼에 등록이 완료될 경우 표시될 활동명이나 업체명이 필요해요." : undefined}
            />

            {formData.category === "음향·조명" && (
              <div
                onClick={() => setFormData({ ...formData, hasLighting: !formData.hasLighting })}
                className="flex items-center gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mb-8"
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${formData.hasLighting ? "bg-[#3182f6] border-[#3182f6]" : "bg-white border-[#e5e8eb]"}`}>
                  {formData.hasLighting && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                </div>
                <span className="text-[15px] font-bold text-[#191f28]">조명도 보유중이신가요?</span>
              </div>
            )}

            {!formData.isIndividual && (
              <PillSelector label="팀 규모" required options={TEAM_SIZE_OPTIONS} value={formData.teamSize} onChange={(v) => setFormData({ ...formData, teamSize: v })} columns={2} />
            )}

            {!formData.isIndividual && (formData.category === "찬양팀" || formData.category === "찬양사역자") && (
              <MultiPillSelector
                label="팀 구성"
                required
                options={TEAM_COMPOSITION_OPTIONS}
                value={formData.teamComposition}
                onChange={(v) => setFormData({ ...formData, teamComposition: v })}
                columns={4}
              />
            )}

            {!formData.isIndividual && !isInstructorCategory && (
              <div
                onClick={() => setFormData({ ...formData, hasSoundEngineer: !formData.hasSoundEngineer })}
                className="flex items-center gap-3 p-5 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mb-8"
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${formData.hasSoundEngineer ? "bg-[#3182f6] border-[#3182f6]" : "bg-white border-[#e5e8eb]"}`}>
                  {formData.hasSoundEngineer && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
                </div>
                <div>
                  <span className="text-[15px] font-bold text-[#191f28] block">음향 담당자 있음</span>
                  <span className="text-[12px] font-bold text-[#8b95a1]">음향 담당자가 꼭 있어야 하는 건 아니에요</span>
                </div>
              </div>
            )}

            {!isInstructorCategory && (
              <EquipmentSelector label="장비 보유 여부" required options={EQUIPMENT_OPTIONS} value={formData.equipment} onChange={(v) => setFormData({ ...formData, equipment: v })} />
            )}
            <MultiPillSelector
              label={isInstructorCategory ? "진행 가능 지역" : "반주 가능 허용 지역"}
              options={REGION_OPTIONS}
              value={formData.serviceRegions}
              onChange={(v) => setFormData({ ...formData, serviceRegions: v })}
              columns={3}
            />
            <CustomInput label="유튜브 채널 링크" value={formData.youtubeUrl} onChange={(v) => setFormData({ ...formData, youtubeUrl: v })} placeholder="https://youtube.com/@..." />
            <CustomInput label="인스타그램 계정 링크" value={formData.instagramUrl} onChange={(v) => setFormData({ ...formData, instagramUrl: v })} placeholder="https://instagram.com/..." />
            <CustomInput label="쓰레드 계정 링크" value={formData.threadsUrl} onChange={(v) => setFormData({ ...formData, threadsUrl: v })} placeholder="https://threads.net/@..." />
          </section>

          {/* 팀 이미지 */}
          <section className="mb-10">
            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
              팀 포스터/소개 이미지 <span className="text-[#b0b8c1] font-medium">(선택, 최대 {MAX_TEAM_IMAGES}장)</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {posterPreviews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img src={src} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#3182f6] text-white text-[9px] font-black rounded-full pointer-events-none">
                      대표
                    </span>
                  )}
                  <button type="button" onClick={() => removePosterAt(idx)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#191f28] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {posterPreviews.length < MAX_TEAM_IMAGES && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square bg-[#f9fafb] border-2 border-dashed border-[#e5e8eb] rounded-2xl flex flex-col items-center justify-center gap-1 text-[#adb5bd] hover:bg-[#f2f4f6] hover:border-[#3182f6]/30 transition-all group">
                  <Camera className="w-5 h-5 group-hover:text-[#3182f6]" />
                  <span className="text-[11px] font-bold group-hover:text-[#3182f6]">추가</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#b0b8c1] mt-2 ml-1">없으면 기본 이미지로 표시돼요. 첫 번째 이미지가 대표 이미지로 사용됩니다.</p>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
          </section>

          {/* 가입 경로 */}
          <section className="mb-10">
            <PillSelector
              label="어떤 경로로 등록하게 되셨나요?"
              options={REFERRAL_OPTIONS}
              value={formData.referralSource}
              onChange={(v) =>
                setFormData({
                  ...formData,
                  referralSource: v,
                  referralDetail: v === "카카오 오픈채팅방" || v === "기타" ? formData.referralDetail : "",
                })
              }
              columns={3}
            />
            <AnimatePresence>
              {(formData.referralSource === "카카오 오픈채팅방" || formData.referralSource === "기타") && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <CustomInput
                    label={formData.referralSource === "카카오 오픈채팅방" ? "오픈채팅방 이름" : "직접 입력"}
                    value={formData.referralDetail}
                    onChange={(v) => setFormData({ ...formData, referralDetail: v })}
                    placeholder={formData.referralSource === "카카오 오픈채팅방" ? "예: OO교회 찬양팀 모임방" : "예: 네이버 카페, 유튜브 등"}
                  />
                </motion.div>
              )}
            </AnimatePresence>
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
                <span className="text-[15px] font-bold text-[#191f28] block mb-1">개인정보 수집·이용 동의 (필수)</span>
                <span className="text-[12px] font-bold text-[#8b95a1] leading-relaxed break-keep">
                  수집 목적: 사역팀 섭외 문의 연락 · 보유 기간: 등록 삭제 시까지
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
                  등록은 현재 무료로 제공되고 있어요. 다만 플랫폼 유지를 위해 추후 연간 게시 비용이 청구될 수 있어요.
                </span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-5 rounded-[22px] font-bold text-lg transition-all active:scale-95 ${!isFormValid || isSubmitting ? "bg-[#e5e8eb] text-[#b0b8c1] cursor-not-allowed" : "bg-[#8b5cf6] text-white shadow-xl shadow-[#8b5cf6]/10 hover:bg-[#7c4ded]"
              }`}
          >
            {isSubmitting ? "신청 중..." : "등록 신청하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
