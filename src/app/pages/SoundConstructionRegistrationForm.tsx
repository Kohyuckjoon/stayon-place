import { useState, useMemo, useEffect } from "react";
import { useNavigate, ScrollRestoration } from "react-router-dom";
import { Check, Volume2, MapPin, ChevronDown, Lightbulb, Lock, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { DENOMINATION_GROUPS } from "../lib/denominations";
import { CustomInput } from "../components/forms/TeamFormControls";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { showAlert } from "../lib/dialog";

const NO_DENOMINATION_LABEL = "교단 가입 예정";
const PASTOR_SAME_AS_APPLICANT_LABEL = "신청자와 이름이 같아요";
const CUSTOMER_CENTER_PHONE = "0502-1937-0615";

interface SoundFormData {
  applicantName: string;
  applicantContact: string;
  churchName: string;
  denomination: string;
  pastorName: string;
  churchAddress: string;
  churchAddressDetail: string;
  areaPyeong: string;
}

export default function SoundConstructionRegistrationForm() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isDenoOpen, setIsDenoOpen] = useState(false);
  const [isCustomDeno, setIsCustomDeno] = useState(false);
  const [denoSearchTerm, setDenoSearchTerm] = useState("");
  const [noDenomination, setNoDenomination] = useState(false);
  const [pastorSameAsApplicant, setPastorSameAsApplicant] = useState(false);
  const [existingSoundStatus, setExistingSoundStatus] = useState<"removal" | "new_site" | "">("");
  const [lightingStatus, setLightingStatus] = useState<"removal" | "new_site" | "none">("none");

  const [formData, setFormData] = useState<SoundFormData>({
    applicantName: "",
    applicantContact: "",
    churchName: "",
    denomination: "",
    pastorName: "",
    churchAddress: "",
    churchAddressDetail: "",
    areaPyeong: "",
  });

  const [errors, setErrors] = useState({ applicantContact: "" });
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

  // 체크박스를 켜면 교단/담임목사님 성함 칸이 고정 문구로 바뀌고 입력창은 숨긴다. 끄면
  // 원래 입력했던 값으로 돌아간다(formData 값 자체는 체크 해제 전까지 건드리지 않는다).
  const toggleNoDenomination = () => setNoDenomination((prev) => !prev);
  const togglePastorSameAsApplicant = () => setPastorSameAsApplicant((prev) => !prev);

  const isFormValid = useMemo(() => {
    return (
      formData.applicantName.trim() !== "" &&
      formData.applicantContact.length >= 12 &&
      formData.churchName.trim() !== "" &&
      (noDenomination || formData.denomination.trim() !== "") &&
      (pastorSameAsApplicant || formData.pastorName.trim() !== "") &&
      formData.churchAddress.trim() !== "" &&
      formData.areaPyeong.trim() !== "" &&
      existingSoundStatus !== "" &&
      !errors.applicantContact
    );
  }, [formData, noDenomination, pastorSameAsApplicant, existingSoundStatus, errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isFormValid || !user) return;
    try {
      setIsSubmitting(true);

      const denominationValue = noDenomination ? NO_DENOMINATION_LABEL : formData.denomination.trim();
      const pastorNameValue = pastorSameAsApplicant ? PASTOR_SAME_AS_APPLICANT_LABEL : formData.pastorName.trim();
      const existingSoundStatusLabel = existingSoundStatus === "removal" ? "기존 음향 철거 후 재시공" : "신규 설치(기존 장비 없음)";
      const lightingStatusLabel = lightingStatus === "removal" ? "기존 조명 철거 후 재시공" : lightingStatus === "new_site" ? "신규 설치(기존 장비 없음)" : "조명 시공 받지 않음";

      await addDoc(collection(db, "soundConstructionRequests"), {
        applicantUid: user.uid,
        applicantName: formData.applicantName.trim(),
        applicantContact: formData.applicantContact,
        churchName: formData.churchName.trim(),
        denomination: denominationValue,
        pastorName: pastorNameValue,
        churchAddress: formData.churchAddress,
        churchAddressDetail: formData.churchAddressDetail.trim(),
        areaPyeong: Number(formData.areaPyeong) || 0,
        existingSoundStatus: existingSoundStatusLabel,
        lightingStatus: lightingStatusLabel,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
      await triggerAdminNotification({
        type: "SOUND_CONSTRUCTION",
        payload: {
          applicantName: formData.applicantName.trim(),
          applicantContact: formData.applicantContact,
          churchName: formData.churchName.trim(),
          denomination: denominationValue,
          pastorName: pastorNameValue,
          churchAddress: formData.churchAddress,
          areaPyeong: Number(formData.areaPyeong) || 0,
          existingSoundStatus: existingSoundStatusLabel,
          lightingStatus: lightingStatusLabel,
        },
      });

      setIsSuccessModalOpen(true);
    } catch (error) {
      await showAlert("신청 중 오류가 발생했습니다." + error);
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
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F2F8FF] text-[#3182f6] rounded-full mb-6 text-sm font-black">
          <Volume2 className="w-4 h-4" /> 음향 시공 견적 신청
        </div>
        <p className="text-[18px] font-black text-[#191f28] mb-3">로그인이 필요해요</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">시공 견적 신청서를 작성하려면 먼저 로그인해주세요. 계정이 없다면 로그인 과정에서 바로 가입할 수 있어요.</p>
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
            <h2 className="text-3xl font-bold mb-4 tracking-tight">견적 신청이 완료되었어요</h2>
            <p>담당자가 확인 후<br /><span className="font-semibold text-[#333d4b]">입력하신 연락처로</span> 최대 48시간 안에 연락드려요.</p>

            <a
              href={`tel:${CUSTOMER_CENTER_PHONE}`}
              className="mt-6 flex items-center gap-2 px-5 py-3.5 bg-[#f9fafb] rounded-2xl text-[13px] font-bold text-[#6b7684] hover:bg-[#f2f4f6] transition-all"
            >
              <Phone className="w-4 h-4 text-[#3182f6] shrink-0" />
              더 빠른 처리를 원하시면 고객센터로 직접 문의 주세요 · {CUSTOMER_CENTER_PHONE}
            </a>

            <button onClick={() => navigate("/")} className="mt-8 w-full max-w-sm py-5 bg-[#3182f6] text-white rounded-[22px] font-bold text-xl shadow-xl shadow-[#3182f6]/20 transition-transform active:scale-95">확인</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-xl mx-auto px-6 pt-6 md:pt-10 pb-24">
        {/* 안내 헤더 */}
        <div className="mb-6 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 md:px-4 py-1.5 md:py-2 bg-[#F2F8FF] text-[#3182f6] rounded-full mb-3 md:mb-6 text-[12px] md:text-sm font-black">
            <Volume2 className="w-4 h-4" /> 음향 시공 견적 신청
          </div>
          <h1 className="text-[21px] md:text-[30px] font-black text-[#191f28] mb-2 md:mb-3 leading-tight tracking-tight break-keep">
            교회 정보를 입력하시면<br />
            <span className="text-[#3182f6]">맞춤 견적을 안내해드려요</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* 신청자 정보 */}
          <section className="mb-3 md:mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-4 md:mb-6 ml-1 uppercase tracking-wider">신청자 정보</h3>
            <CustomInput label="신청자 이름" required value={formData.applicantName} onChange={(v) => setFormData({ ...formData, applicantName: v })} placeholder="홍길동" />
            <CustomInput
              label="연락처" required
              value={formData.applicantContact}
              onChange={(v) => setFormData({ ...formData, applicantContact: formatPhoneNumber(v) })}
              placeholder="010-0000-0000"
              error={errors.applicantContact}
            />
          </section>

          {/* 교회 정보 */}
          <section className="mb-6 md:mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-4 md:mb-6 ml-1 uppercase tracking-wider">교회 정보</h3>
            <CustomInput label="교회 이름" required value={formData.churchName} onChange={(v) => setFormData({ ...formData, churchName: v })} placeholder="예: 은혜교회" />

            {/* 교단 선택 - RegisterVenue.tsx/TeamRegistrationForm.tsx와 동일한 목록/UI 재사용 */}
            <div className="mb-3 relative">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">
                소속 교단 {!noDenomination && <span className="text-[#3182f6]">*</span>}
              </label>
              {noDenomination ? (
                <div className="text-[15px] md:text-[18px] font-bold py-2.5 md:py-3 border-b-2 border-[#f2f4f6] text-[#adb5bd]">
                  {NO_DENOMINATION_LABEL}
                </div>
              ) : (
                <>
                  <div
                    onClick={() => setIsDenoOpen(!isDenoOpen)}
                    className={`flex justify-between items-center text-[15px] md:text-[18px] font-bold py-2.5 md:py-3 border-b-2 transition-all cursor-pointer ${isDenoOpen ? "border-[#3182f6]" : "border-[#f2f4f6] hover:border-[#e5e8eb]"}`}
                  >
                    <span className={(formData.denomination || isCustomDeno) ? "text-[#191f28]" : "text-[#d1d6db]"}>
                      {isCustomDeno ? "직접 입력" : (formData.denomination || "선택해주세요")}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-[#adb5bd] transition-transform ${isDenoOpen ? "rotate-180 text-[#3182f6]" : ""}`} />
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
                </>
              )}
            </div>
            <div
              onClick={toggleNoDenomination}
              className="flex items-center gap-2 p-2.5 md:gap-3 md:p-4 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mb-4 md:mb-8"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${noDenomination ? "bg-[#3182f6] border-[#3182f6]" : "bg-white border-[#e5e8eb]"}`}>
                {noDenomination && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <span className="text-[13px] font-bold text-[#191f28]">개척교회이며 현재 교단에 미가입되어있어요</span>
            </div>

            {/* 담임목사님 성함 */}
            <div className="mb-3">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">
                담임목사님 성함 {!pastorSameAsApplicant && <span className="text-[#3182f6]">*</span>}
              </label>
              {pastorSameAsApplicant ? (
                <div className="text-[15px] md:text-[18px] font-bold py-2.5 md:py-3 border-b-2 border-[#f2f4f6] text-[#adb5bd]">
                  {PASTOR_SAME_AS_APPLICANT_LABEL}
                </div>
              ) : (
                <input
                  value={formData.pastorName}
                  onChange={(e) => setFormData({ ...formData, pastorName: e.target.value })}
                  placeholder="김목사"
                  className="w-full text-[15px] md:text-[18px] font-bold py-2.5 md:py-3 px-1 border-b-2 border-[#f2f4f6] focus:border-[#3182f6] outline-none transition-all bg-transparent placeholder:text-[#d1d6db] text-[#191f28]"
                />
              )}
            </div>
            <div
              onClick={togglePastorSameAsApplicant}
              className="flex items-center gap-2 p-2.5 md:gap-3 md:p-4 bg-[#f9fafb] rounded-2xl cursor-pointer select-none mb-4 md:mb-8"
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${pastorSameAsApplicant ? "bg-[#3182f6] border-[#3182f6]" : "bg-white border-[#e5e8eb]"}`}>
                {pastorSameAsApplicant && <Check className="w-4 h-4 text-white" strokeWidth={4} />}
              </div>
              <span className="text-[13px] font-bold text-[#191f28]">신청자와 담임목사님이 동일인이에요</span>
            </div>

            {/* 교회 주소 */}
            <div className="mb-8">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">
                장소(교회/수양관 등) 주소 <span className="text-[#3182f6]">*</span>
              </label>
              <div onClick={handleChurchAddressSearch} className="flex items-center gap-3 text-[15px] md:text-[18px] font-bold py-2.5 md:py-3 border-b-2 border-[#f2f4f6] cursor-pointer hover:border-[#e5e8eb] transition-all">
                <MapPin className="w-5 h-5 text-[#3182f6] shrink-0" strokeWidth={2.5} />
                <span className={formData.churchAddress ? "text-[#191f28]" : "text-[#d1d6db]"}>
                  {formData.churchAddress || "주소 검색하기"}
                </span>
              </div>
              {formData.churchAddress && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                  <input
                    className="w-full text-[14px] md:text-[16px] font-bold py-2.5 md:py-3 outline-none border-b-2 border-[#f2f4f6] focus:border-[#3182f6] bg-transparent placeholder:text-[#d1d6db] transition-all"
                    placeholder="상세 주소를 입력해주세요"
                    value={formData.churchAddressDetail}
                    onChange={(e) => setFormData({ ...formData, churchAddressDetail: e.target.value })}
                  />
                </motion.div>
              )}
            </div>

            <CustomInput
              label="시공 면적(평수)" required
              value={formData.areaPyeong}
              onChange={(v) => setFormData({ ...formData, areaPyeong: v.replace(/[^0-9]/g, "") })}
              placeholder="예: 60"
              hint="대략 평수로 입력해주세요"
            />
          </section>

          {/* 기존 음향 설치 상태 - 체크박스(선택적 추가)와 달리 둘 중 하나를 반드시 골라야 하는
              현장 조건이라 라디오(단일 선택) 형태로 분리했다. */}
          <section className="mb-4 md:mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-2.5 md:mb-6 ml-1 uppercase tracking-wider">
              현재 음향 설치 상태 <span className="text-[#3182f6]">*</span>
            </h3>
            <div className="space-y-2 md:space-y-2.5">
              <div
                onClick={() => setExistingSoundStatus("removal")}
                className={`flex items-center gap-2.5 p-3 md:gap-3 md:p-5 rounded-2xl cursor-pointer select-none border-2 transition-all ${existingSoundStatus === "removal" ? "bg-[#F2F8FF] border-[#3182f6]" : "bg-[#f9fafb] border-transparent"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${existingSoundStatus === "removal" ? "border-[#3182f6]" : "border-[#d1d6db]"}`}>
                  {existingSoundStatus === "removal" && <div className="w-2.5 h-2.5 rounded-full bg-[#3182f6]" />}
                </div>
                <span className="text-[14px] md:text-[15px] font-bold text-[#191f28]">기존 음향을 철거하고 시공하고 싶어요</span>
              </div>
              <div
                onClick={() => setExistingSoundStatus("new_site")}
                className={`flex items-center gap-2.5 p-3 md:gap-3 md:p-5 rounded-2xl cursor-pointer select-none border-2 transition-all ${existingSoundStatus === "new_site" ? "bg-[#F2F8FF] border-[#3182f6]" : "bg-[#f9fafb] border-transparent"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${existingSoundStatus === "new_site" ? "border-[#3182f6]" : "border-[#d1d6db]"}`}>
                  {existingSoundStatus === "new_site" && <div className="w-2.5 h-2.5 rounded-full bg-[#3182f6]" />}
                </div>
                <span className="text-[14px] md:text-[15px] font-bold text-[#191f28]">신규 장소예요 (아무것도 설치되어 있지 않아요)</span>
              </div>
            </div>
          </section>

          {/* 조명 설치 상태 - 음향 설치 상태와 동일하게 3가지 중 하나를 고르는 라디오 형태.
              기본값은 "조명 설치는 안받을래요"(조명 시공을 원치 않는 경우가 기본). */}
          <section className="mb-4 md:mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-2.5 md:mb-6 ml-1 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#F59E0B]" /> 조명 설치 상태
            </h3>
            <div className="space-y-2 md:space-y-2.5">
              <div
                onClick={() => setLightingStatus("removal")}
                className={`flex items-center gap-2.5 p-3 md:gap-3 md:p-5 rounded-2xl cursor-pointer select-none border-2 transition-all ${lightingStatus === "removal" ? "bg-[#F2F8FF] border-[#3182f6]" : "bg-[#f9fafb] border-transparent"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${lightingStatus === "removal" ? "border-[#3182f6]" : "border-[#d1d6db]"}`}>
                  {lightingStatus === "removal" && <div className="w-2.5 h-2.5 rounded-full bg-[#3182f6]" />}
                </div>
                <span className="text-[14px] md:text-[15px] font-bold text-[#191f28]">기존 조명을 철거하고 같이 시공 받고 싶어요</span>
              </div>
              <div
                onClick={() => setLightingStatus("new_site")}
                className={`flex items-center gap-2.5 p-3 md:gap-3 md:p-5 rounded-2xl cursor-pointer select-none border-2 transition-all ${lightingStatus === "new_site" ? "bg-[#F2F8FF] border-[#3182f6]" : "bg-[#f9fafb] border-transparent"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${lightingStatus === "new_site" ? "border-[#3182f6]" : "border-[#d1d6db]"}`}>
                  {lightingStatus === "new_site" && <div className="w-2.5 h-2.5 rounded-full bg-[#3182f6]" />}
                </div>
                <span className="text-[14px] md:text-[15px] font-bold text-[#191f28]">신규 장소예요 (아무것도 설치되어 있지 않아요)</span>
              </div>
              <div
                onClick={() => setLightingStatus("none")}
                className={`flex items-center gap-2.5 p-3 md:gap-3 md:p-5 rounded-2xl cursor-pointer select-none border-2 transition-all ${lightingStatus === "none" ? "bg-[#F2F8FF] border-[#3182f6]" : "bg-[#f9fafb] border-transparent"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${lightingStatus === "none" ? "border-[#3182f6]" : "border-[#d1d6db]"}`}>
                  {lightingStatus === "none" && <div className="w-2.5 h-2.5 rounded-full bg-[#3182f6]" />}
                </div>
                <span className="text-[14px] md:text-[15px] font-bold text-[#191f28]">조명 설치는 안받을래요</span>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-5 rounded-[22px] font-bold text-lg transition-all active:scale-95 ${!isFormValid || isSubmitting ? "bg-[#e5e8eb] text-[#b0b8c1] cursor-not-allowed" : "bg-[#3182f6] text-white shadow-xl shadow-[#3182f6]/10 hover:bg-[#1b64da]"
              }`}
          >
            {isSubmitting ? "신청 중..." : "견적 신청하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
