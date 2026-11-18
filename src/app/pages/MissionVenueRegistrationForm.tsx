import { useState, useRef, useEffect, useMemo } from "react";
import { ScrollRestoration } from "react-router-dom";
import {
  Check, ChevronDown, MapPin, Camera, X, AlertCircle, Info, Car, Bed, Wind, Bath, Volume2, UtensilsCrossed, ExternalLink, PenLine, Heart, Phone, ChevronRight, Scale, Ban, Lock, Compass
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { db, functions } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import imageCompression from 'browser-image-compression';
import { uploadVenueImage } from "../lib/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { TagEditor } from "../components/TagEditor";
import { DENOMINATION_GROUPS } from "../lib/denominations";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import {
  VENUE_IMAGE_CATEGORIES, VENUE_IMAGE_TOTAL_MAX, VenueImageCategoryKey, emptyVenueImagesByCategory, flattenVenueImages,
} from "../lib/missionVenueImageCategories";
import { showAlert } from "../lib/dialog";

/**
 * [Input Component] - 스타일의 깔끔한 입력창
 */
const CustomInput = ({ label, value, onChange, placeholder, type = "text", suffix = "", error = "", autoFocus = false, multiline = false }: any) => {
  // const displayValue = (type === "number" && value !== 0) ? value.toLocaleString() : value;
  const getDisplayValue = () => {
    if (type === "number" && value !== null && value !== undefined && value !== "") {
      const num = value.toString().replace(/[^0-9]/g, "");
      return num ? Number(num).toLocaleString() : "";
    }
    return value || "";
  };

  return (
    <div className="group relative mb-6 md:mb-10">
      <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1 group-focus-within:text-[#3182f6] transition-colors tracking-tight">
        {label}
      </label>
      <div className="relative flex items-center">
        {multiline ? (
          // 보유 악기/음향 시스템/영상 장비/주차 시설/샤워실 화장실처럼 항목을 여러 개
          // 나열해야 하는 칸은 한 줄 input이 아니라 textarea로, 엔터로 직접 줄바꿈해서
          // 입력할 수 있게 한다. 기본 2줄 높이로 보이고 필요하면 아래로 더 늘릴 수 있다.
          <textarea
            autoFocus={autoFocus}
            rows={2}
            value={getDisplayValue()}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full text-[16px] md:text-[20px] font-bold py-2.5 md:py-3 px-1 border-b-2 outline-none transition-all bg-transparent placeholder:text-[#d1d6db] text-[#191f28] resize-y leading-snug ${error ? "border-[#f04452]" : "border-[#f2f4f6] focus:border-[#3182f6]"
              }`}
          />
        ) : (
          <input
            type="text"
            autoFocus={autoFocus}
            // value={displayValue || ""}
            value={getDisplayValue()}
            onChange={(e) => {

              if (type === "number") {
                // 숫자 외 문자 제거 후 부모 상태 업데이트 (Firebase 저장용 raw value)
                const rawValue = e.target.value.replace(/[^0-9]/g, "");
                onChange(rawValue);
              } else {
                onChange(e.target.value);
              }

              // const rawValue = e.target.value.replace(/,/g, "");
              // onChange(rawValue);
            }}
            placeholder={placeholder}
            className={`w-full text-[16px] md:text-[20px] font-bold py-2.5 md:py-3 px-1 border-b-2 outline-none transition-all bg-transparent placeholder:text-[#d1d6db] text-[#191f28] ${error ? "border-[#f04452]" : "border-[#f2f4f6] focus:border-[#3182f6]"
              }`}
          />
        )}
        {suffix && (value?.toString().length > 0 || value !== 0) && (
          <span className="absolute right-2 text-[15px] md:text-[18px] font-bold text-[#191f28]">{suffix}</span>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-[#f04452] text-xs font-semibold mt-2 ml-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};


interface VenueFormData {
  applicantName: string;
  applicantContact: string;
  applicantEmail: string;
  venueName: string;
  location: string;
  addressDetail: string;
  denomination: string;
  capacity: number;
  hallSize: string;
  soundSystem: string;
  instruments: string;
  projector: string;
  description: string;
  maleRooms: number;
  femaleRooms: number;
  mealOption: ('none' | 'self' | 'provided')[];
  mealPrice: number;
  cafeteriaCapacity: number;
  parkingCapacity: string;
  beddingAvailable: boolean;
  airConditioner: boolean;
  showerBathroom: string;
  nightEventLimit: string;
  images: string[];
  mealNote?: string;
  tags: string[];
  churchSituation: string[];
  churchSituationOther: string;
  desiredService: string[];
  desiredServiceOther: string;
  contactPhone: string;
}

const CHURCH_SITUATION_OPTIONS = ["미자립교회", "농어촌교회", "개척교회", "소규모교회(30명 이하)", "다문화교회", "특별한 상황 없음"];
const DESIRED_SERVICE_OPTIONS = ["노방전도", "구제·봉사활동", "어린이·청소년 사역", "찬양·문화사역", "건축·시설보수", "교육·멘토링", "행정·사무지원"];

export default function MissionVenueRegistrationForm() {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isMealGuideOpen, setIsMealGuideOpen] = useState(false); // "식사 제공 가이드" 안내 툴팁
  const [isDenoOpen, setIsDenoOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isCustomDeno, setIsCustomDeno] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // 사진을 카테고리(예배당/입구, 예배당 전체, 예배 셋팅 ... 기타)별로 나눠서 받는다.
  // 전체 최대 장수(VENUE_IMAGE_TOTAL_MAX)는 카테고리별 한도 합계라, 카테고리별
  // 한도만 지키면 전체 한도도 자동으로 지켜져서 따로 검사하지 않아도 된다.
  const [categoryFiles, setCategoryFiles] = useState<Record<VenueImageCategoryKey, File[]>>(emptyVenueImagesByCategory() as any);
  const [categoryPreviewUrls, setCategoryPreviewUrls] = useState<Record<VenueImageCategoryKey, string[]>>(emptyVenueImagesByCategory() as any);
  const [isPhoneRequestOpen, setIsPhoneRequestOpen] = useState(false); // 전화 상담 요청 모달 오픈 여부
  const [phoneRequest, setPhoneRequest] = useState({ name: "", phone: "", time: "" }); // 신청자 이름, 연락처, 희망 연락 시간

  const [isPcDeviceModalOpen, setIsPcDeviceModalOpen] = useState(false);
  const ADMIN_PHONE_NUMBER = "0502-1937-0615"; // 실제 전화를 받으실 관리자 번호로 변경하세요.

  const handleCloseModal = () => {
    // 1. 데이터를 빈 값으로 리셋
    setPhoneRequest({ name: "", phone: "", time: "" });
    // 2. 모달 닫기(전화 요청& PC 안내))
    setIsPhoneRequestOpen(false);
    setIsPcDeviceModalOpen(false);
  };

  const [formData, setFormData] = useState<VenueFormData>({
    applicantName: "",
    applicantContact: "",
    applicantEmail: "",
    venueName: "",
    location: "",
    addressDetail: "",
    denomination: "",
    capacity: 0,
    hallSize: "",
    soundSystem: "",
    instruments: "",
    projector: "",
    description: "",
    maleRooms: 0,
    femaleRooms: 0,
    mealOption: [],
    mealPrice: 0,
    cafeteriaCapacity: 0,
    parkingCapacity: "",
    beddingAvailable: false,
    airConditioner: true,
    showerBathroom: "",
    nightEventLimit: "",
    images: [],
    mealNote: "",
    tags: [],
    churchSituation: [],
    churchSituationOther: "",
    desiredService: [],
    desiredServiceOther: "",
    contactPhone: "",
  });

  // const [errors, setErrors] = useState({ contact: "", price: "", mealPrice: "" });
  const [errors, setErrors] = useState({ contact: "", price: "", mealPrice: "", email: "" });

  useEffect(() => {
    return () => Object.values(categoryPreviewUrls).forEach(urls => urls.forEach(url => URL.revokeObjectURL(url)));
  }, [categoryPreviewUrls]);

  const formatPhoneNumber = (value: string) => {
    const number = value.replace(/[^\d]/g, "");
    if (/[^0-9-]/.test(value)) setErrors(prev => ({ ...prev, contact: "숫자만 입력해주세요!" }));
    else setErrors(prev => ({ ...prev, contact: "" }));
    if (number.length <= 3) return number;
    if (number.length <= 7) return `${number.slice(0, 3)}-${number.slice(3)}`;
    return `${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7, 11)}`;
  };

  // 공개용 대표 전화번호(contactPhone) 포맷팅 - applicantContact(신청자 개인 연락처, 비공개)와
  // 별개라 formatPhoneNumber의 errors.contact 상태는 건드리지 않는다.
  const formatPlainPhone = (value: string) => {
    const number = value.replace(/[^\d]/g, "");
    if (number.length <= 3) return number;
    if (number.length <= 7) return `${number.slice(0, 3)}-${number.slice(3)}`;
    return `${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7, 11)}`;
  };

  // 이메일 유효성 검사 함수 추가
  const handleEmailChange = (value: string) => {
    setFormData(prev => ({ ...prev, applicantEmail: value }));
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value.trim() !== "" && !emailRegex.test(value)) {
      setErrors(prev => ({ ...prev, email: "올바른 이메일 형식이 아닙니다." }));
    } else {
      setErrors(prev => ({ ...prev, email: "" }));
    }
  };

  const handleNumberInput = (field: string, value: string) => {
    if (/[^0-9]/.test(value)) {
      setErrors(prev => ({ ...prev, [field]: "숫자만 입력해주세요!" }));
      return;
    }
    setErrors(prev => ({ ...prev, [field]: "" }));
    setFormData(prev => ({ ...prev, [field]: value === "" ? 0 : Number(value) }));
  };

  const isStepValid = useMemo(() => {
    if (currentStep === 1) {
      return (
        formData.applicantName.trim() !== "" &&
        formData.applicantContact.length >= 12 &&
        formData.applicantEmail.trim() !== "" &&
        formData.venueName.trim() !== "" &&
        formData.location !== "" &&
        formData.capacity > 0 &&
        formData.contactPhone.length >= 12 &&
        (isCustomDeno ? formData.denomination.trim() !== "" : formData.denomination !== "") &&
        !errors.contact && !errors.email
      );
    }
    if (currentStep === 2) {
      const totalPhotoCount = Object.values(categoryFiles).reduce((sum, files) => sum + files.length, 0);
      return totalPhotoCount > 0 && formData.mealOption.length > 0;
    }
    return true;
  }, [currentStep, formData, errors, categoryFiles, isCustomDeno]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const handleAddressSearch = () => {
    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        setFormData(prev => ({ ...prev, location: data.address }));
      },
    }).open();
  };

  const handleCategoryFileChange = (key: VenueImageCategoryKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const category = VENUE_IMAGE_CATEGORIES.find(c => c.key === key)!;
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // 같은 파일을 다시 선택할 수 있도록 초기화
    if (files.length === 0) return;
    if (files.length + categoryFiles[key].length > category.max) {
      showAlert(`"${category.label}"은(는) 최대 ${category.max}장까지 등록 가능합니다.`);
      return;
    }
    setCategoryFiles(prev => ({ ...prev, [key]: [...prev[key], ...files] }));
    const newUrls = files.map(file => URL.createObjectURL(file));
    setCategoryPreviewUrls(prev => ({ ...prev, [key]: [...prev[key], ...newUrls] }));
  };

  const removeCategoryImage = (e: React.MouseEvent, key: VenueImageCategoryKey, index: number) => {
    e.stopPropagation();
    setCategoryFiles(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
    URL.revokeObjectURL(categoryPreviewUrls[key][index]);
    setCategoryPreviewUrls(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };

  const toggleMealOption = (option: 'provided' | 'self' | 'none') => {
    setFormData(prev => {
      let newOptions = [...prev.mealOption];
      if (option === 'none') {
        return { ...prev, mealOption: ['none'] };
      } else {
        newOptions = newOptions.filter(o => o !== 'none');
        if (newOptions.includes(option)) {
          newOptions = newOptions.filter(o => o !== option);
        } else {
          newOptions.push(option);
        }
        return { ...prev, mealOption: newOptions as any };
      }
    });
  };

  const toggleChurchSituation = (option: string) => {
    setFormData((prev) => ({
      ...prev,
      churchSituation: prev.churchSituation.includes(option)
        ? prev.churchSituation.filter((o) => o !== option)
        : [...prev.churchSituation, option],
    }));
  };

  const toggleDesiredService = (option: string) => {
    setFormData((prev) => ({
      ...prev,
      desiredService: prev.desiredService.includes(option)
        ? prev.desiredService.filter((o) => o !== option)
        : [...prev.desiredService, option],
    }));
  };

  const compressAndUpload = async (file: File): Promise<string> => {
    const options = { maxSizeMB: 0.4, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.85 };
    try {
      const compressedBlob = await imageCompression(file, options);
      const compressedFile = new File([compressedBlob], file.name, { type: file.type });
      return await uploadVenueImage(compressedFile, formData.venueName, formData.applicantName);
    } catch (error) {
      return await uploadVenueImage(file, formData.venueName, formData.applicantName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isStepValid || !user) return;
    try {
      setIsSubmitting(true);
      const imagesByCategory: Record<string, string[]> = {};
      for (const category of VENUE_IMAGE_CATEGORIES) {
        const files = categoryFiles[category.key];
        imagesByCategory[category.key] = files.length > 0
          ? await Promise.all(files.map(file => compressAndUpload(file)))
          : [];
      }
      // 기존 화면들(장소 카드, 카카오톡 링크 미리보기 등)이 계속 쓸 수 있도록
      // 카테고리 순서대로 이어붙인 평평한 배열도 함께 저장한다.
      const imageUrls = flattenVenueImages(imagesByCategory);

      // 1. 파이어베이스 저장 - 수련회 장소(venues)와 완전히 분리된 컬렉션
      await addDoc(collection(db, "missionVenues"), {
        ...formData,
        applicantUid: user.uid,
        images: imageUrls,
        imagesByCategory,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // 2. 슬랙 알림 추가 (여기에 넣으세요!)
      // const functionsInstance = getFunctions();
      // const triggerAdminNotification = httpsCallable(functionsInstance, "triggerAdminNotification");
      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");

      await triggerAdminNotification({
        type: 'MISSION_VENUE',
        payload: {
          venueName: formData.venueName,
          userPhone: phoneRequest.phone || formData.applicantContact, // 둘 중 존재하는 값으로 매칭
          applicant: formData.applicantName
        }
      });

      setIsSuccessModalOpen(true);
    } catch (error) {
      await showAlert("등록 중 오류가 발생했습니다." + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCallAction = (e: React.MouseEvent) => {
    const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.matchMedia('(max-width: 768px)').matches;

    if (!isMobileDevice) {
      // 1. PC 환경일 경우 브라우저 고유의 'tel:' 프로토콜 실행(경고창)을 강제로 막습니다.
      e.preventDefault();
      // 2. 부드럽고 고급스러운 토스풍 모달 팝업을 활성화합니다.
      setIsPcDeviceModalOpen(true);
    }
    // 모바일 환경일 경우 정상 작동하여 스마트폰 기본 통화 다이얼로그로 연결됩니다.
  };

  const steps = ["기본 정보", "시설 및 상세", "최종 확인"];

  const StepButtons = () => (
    <div className="flex items-center gap-3 pt-12">
      {currentStep > 1 && (
        <button type="button" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentStep(prev => prev - 1); }}
          className="flex-1 py-5 bg-[#f2f4f6] text-[#4e5968] rounded-[22px] font-bold text-lg hover:bg-[#e5e8eb] transition-all active:scale-95">
          이전
        </button>
      )}
      <button type="button" disabled={!isStepValid || isSubmitting}
        onClick={() => {
          if (currentStep < steps.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); setCurrentStep(prev => prev + 1); }
          else { handleSubmit({ preventDefault: () => { } } as any); }
        }}
        className={`flex-[2] py-5 rounded-[22px] font-bold text-lg transition-all active:scale-95 ${!isStepValid || isSubmitting ? "bg-[#e5e8eb] text-[#b0b8c1] cursor-not-allowed" : "bg-[#3182f6] text-white shadow-xl shadow-[#3182f6]/10 hover:bg-[#1b64da]"
          }`}>
        {isSubmitting ? "신청 중..." : currentStep === steps.length ? "신청 완료하기" : "다음으로"}
      </button>
    </div>
  );

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
          <MapPin className="w-4 h-4" /> 국내 선교 장소 등록
        </div>
        <p className="text-[18px] font-black text-[#191f28] mb-3">로그인이 필요해요</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">국내 선교 장소 등록 신청서를 작성하려면 먼저 로그인해주세요. 계정이 없다면 로그인 과정에서 바로 가입할 수 있어요.</p>
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

      {/* 이미지 풀스크린 뷰어 */}
      <AnimatePresence>
        {selectedImageUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImageUrl(null)}>
            <button className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full"><X className="w-8 h-8" /></button>
            <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} src={selectedImageUrl} className="max-w-full max-h-full object-contain rounded-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 완료 모달 */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-white flex flex-col items-center justify-center p-6 text-center">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 15 }} className="w-24 h-24 bg-[#f2f8ff] rounded-full flex items-center justify-center mb-8">
              <Check className="w-12 h-12 text-[#3182f6]" strokeWidth={4} />
            </motion.div>
            <h2 className="text-3xl font-bold mb-4 tracking-tight">등록 신청이 완료되었어요</h2>
            <p>운영자 검토 후 공간이 활성화되기까지<br /><span className="font-semibold text-[#333d4b]">평일 기준 최소 3일에서 최대 7일</span> 정도 소요될 수 있어요.</p>
            <br></br>
            <p className="text-sm text-[#8b95a1] pt-2 border-t border-[#f2f4f6] max-w-sm mx-auto">
              건전한 수련회 문화를 위해 교단 확인 및 심사 과정에서 등록이 거절될 수 있으며, <span className="font-semibold text-rose-500">이단 및 신천지 등은 등록이 엄격히 제한됩니다.</span>
            </p>
            <br></br>
            <button onClick={() => navigate("/")} className="w-full max-w-sm py-5 bg-[#3182f6] text-white rounded-[22px] font-bold text-xl shadow-xl shadow-[#3182f6]/20 transition-transform active:scale-95">확인</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 상단 프로그레스 바 */}
      <div className="fixed top-0 left-0 w-full h-[3px] bg-[#f2f4f6] z-50">
        <motion.div className="h-full bg-[#3182f6]" initial={{ width: "0%" }} animate={{ width: `${(currentStep / steps.length) * 100}%` }} transition={{ duration: 0.5, ease: "circOut" }} />
      </div>

      <div className="max-w-xl mx-auto px-6 pt-6 md:pt-10 pb-24">
        {/* /register(수련회 장소 등록)와 화면이 헷갈리지 않도록, 어느 스텝에서도
            항상 최상단에 이 페이지가 "국내 선교 장소" 등록 화면임을 명시한다. */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white font-black text-[12px] rounded-lg mb-4">
          <Compass className="w-3.5 h-3.5" /> 국내 선교 장소 등록
        </div>

        {/* 가이드 안내 섹션 추가 */}
        {currentStep === 1 && (
          <div className="space-y-3 md:space-y-4 mb-8 md:mb-12">
            {/* 메인 안내 카드 */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 md:p-8 rounded-[28px] md:rounded-[32px] border border-[#f2f4f6] shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
            >
              <div className="flex flex-col gap-4 md:gap-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="bg-[#f2f8ff] p-2.5 md:p-3 rounded-2xl">
                    <Heart className="w-5 h-5 md:w-6 md:h-6 text-[#3182f6] fill-[#3182f6]" />
                  </div>
                  <h3 className="text-[17px] md:text-[20px] font-bold text-[#191f28] tracking-tight">공간 나눔이 처음이신가요?</h3>
                </div>

                <p className="text-[13px] md:text-[15px] text-[#4e5968] leading-relaxed break-keep font-medium">
                  사역지의 소중한 공간을 공유해 주셔서 감사합니다. <br />
                  직접 작성이 번거로우시다면 <span className="text-[#3182f6] font-bold">스테이온이 대신 등록해 드릴게요.</span>
                </p>

                <div className="grid grid-cols-1 gap-2.5 md:gap-3">
                  {/* 옵션 1: 직접 작성 (현재 화면 유지) */}
                  <div className="flex items-center gap-3 p-3.5 md:p-4 bg-[#f9fafb] rounded-2xl border border-transparent">
                    <div className="w-5 h-5 rounded-full bg-[#3182f6] flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={4} />
                    </div>
                    <span className="text-[13px] md:text-[14px] font-bold text-[#3182f6]">아래 신청서를 직접 작성하기</span>
                  </div>

                  {/* 옵션 2: 전화 요청 버튼 */}
                  {/* <button
                    type="button"
                    onClick={() => setIsPhoneRequestOpen(true)}
                    className="flex items-center justify-between p-5 bg-white border-2 border-[#3182f6] rounded-2xl hover:bg-[#f2f8ff] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-[#3182f6]" />
                      <span className="text-[15px] font-bold text-[#3182f6]">전화로 장소 등록 신청하기</span>
                    </div>
                    <ChevronDown className="w-5 h-5 text-[#3182f6] -rotate-90 group-hover:translate-x-1 transition-transform" />
                  </button> */}

                  <a
                    href={`tel:${ADMIN_PHONE_NUMBER}`}
                    onClick={handleCallAction}
                    className="flex items-center justify-between p-4 md:p-5 bg-white border-2 border-[#3182f6] rounded-2xl hover:bg-[#f2f8ff] transition-all group cursor-pointer decoration-none"
                  >
                    {/* <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-[#3182f6] animate-pulse" />
                      <span className="text-[15px] font-bold text-[#3182f6]">전화로 바로 등록 신청하기</span>
                    </div> */}

                    <div className="relative flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-[#3182f6]/10 rounded-2xl flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 md:w-6 md:h-6 text-[#3182f6] animate-bounce" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] md:text-sm font-bold text-[#8B95A1]">상담원 연결</span>
                        <span className="text-[15px] md:text-[17px] font-black text-[#191F28]">전화로 바로 등록 신청하기</span>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-[#3182f6] -rotate-90 group-hover:translate-x-1 transition-transform shrink-0" />
                  </a>
                </div>
              </div>
            </motion.div>
            <AnimatePresence>
              {isPhoneRequestOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsPhoneRequestOpen(false)}
                    className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.12)] text-center overflow-hidden"
                  >
                    <div className="w-16 h-16 bg-[#f2f8ff] rounded-full flex items-center justify-center mx-auto mb-6">
                      <Volume2 className="w-8 h-8 text-[#3182f6]" />
                    </div>
                    <h2 className="text-xl font-bold text-[#191f28] mb-3 tracking-tight">PC에서 진행 중이시군요!</h2>
                    <p className="text-[14px] text-[#4e5968] mb-6 leading-relaxed font-medium break-keep">
                      장소를 손쉽게 등록하실 수 있도록 <br />
                      스테이온 전담 매니저 번호를 안내해 드릴게요.
                    </p>

                    <div className="bg-[#f9fafb] py-4 px-6 rounded-2xl border border-[#f2f4f6] mb-8">
                      <span className="text-[12px] font-bold text-[#8b95a1] block mb-1">상담 및 대행 전용 번호</span>
                      <a href={`tel:${ADMIN_PHONE_NUMBER}`} className="text-[22px] font-black text-[#3182f6] tracking-wide block hover:underline">
                        {ADMIN_PHONE_NUMBER}
                      </a>
                    </div>

                    <button
                      onClick={handleCloseModal}
                      className="w-full py-4 bg-[#3182f6] text-white rounded-2xl font-bold text-[16px] hover:bg-[#1b64da] transition-colors shadow-lg shadow-[#3182f6]/10 active:scale-95"
                    >
                      확인했습니다
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isPcDeviceModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                  {/* 배경 딤드 처리 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsPcDeviceModalOpen(false)}
                    className="absolute inset-0 bg-[#000000]/40 backdrop-blur-sm"
                  />
                  {/* 모달 본체 */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="relative w-full max-w-sm bg-white rounded-[32px] p-8 shadow-[0_24px_64px_rgba(0,0,0,0.12)] text-center overflow-hidden"
                  >
                    <div className="w-16 h-16 bg-[#f2f8ff] rounded-full flex items-center justify-center mx-auto mb-6">
                      <Phone className="w-8 h-8 text-[#3182f6]" />
                    </div>
                    <h2 className="text-xl font-bold text-[#191f28] mb-3 tracking-tight">PC에서 클릭하셨군요!</h2>
                    <p className="text-[14px] text-[#4e5968] mb-6 leading-relaxed font-medium break-keep">
                      스마트폰 환경이 아니라면 바로 전화 연결이 어려울 수 있어요. <br />
                      아래 번호로 직접 전화를 주시거나 번호를 남겨주세요!
                    </p>

                    {/* 전화번호 다이렉트 표시 카드 */}
                    <div className="bg-[#f9fafb] py-4 px-6 rounded-2xl border border-[#f2f4f6] mb-6">
                      <span className="text-[12px] font-bold text-[#8b95a1] block mb-1">상담 및 대행 전용 번호</span>
                      <span className="text-[22px] font-black text-[#3182f6] tracking-wide block">
                        {ADMIN_PHONE_NUMBER}
                      </span>
                    </div>

                    {/* 유저 선택 액션 버튼군 */}
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPcDeviceModalOpen(false);
                          setIsPhoneRequestOpen(true); // 기존의 전화 대행 폼 모달을 열어줍니다.
                        }}
                        className="w-full py-4 bg-[#3182f6] text-white rounded-2xl font-bold text-[15px] hover:bg-[#1b64da] transition-colors shadow-lg shadow-[#3182f6]/10 active:scale-95"
                      >
                        전화 요청 번호 남기기
                      </button>
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="w-full py-4 bg-[#f2f4f6] text-[#4e5968] rounded-2xl font-bold text-[15px] hover:bg-[#e5e8eb] transition-colors"
                      >
                        닫기
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <div className="bg-white border-2 border-red-100 rounded-[24px] md:rounded-[28px] p-4 md:p-6 mb-4 md:mb-6 shadow-sm relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 md:mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full">
                    <Ban className="w-3.5 h-3.5" />
                    <span className="text-[12px] font-black tracking-tight">이단 · 신천지 원천 차단 정책</span>
                  </div>
                  <div className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                    정통교단 전용 플랫폼
                  </div>
                </div>

                <div className="space-y-2 md:space-y-3 mb-3 md:mb-4">
                  <h3 className="text-[15px] md:text-xl font-black text-gray-950 leading-tight">
                    신천지 및 이단 추수꾼의 출입을 <span className="text-red-600">철저히 금지</span>합니다.
                  </h3>
                <p className="text-gray-600 text-[13px] md:text-lg font-medium leading-relaxed">
                  스테이온은 대한예수교장로회(합동·통합), 기독교대한감리회(기감), 기독교대한성결교회(성결교) 등 <strong className="text-gray-950 font-bold">공식 한국 주요 전통교단 소속 및 초교파 바른 신앙을 가진 안전한 장소</strong>만 등록됩니다.
                </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["예장합동", "예장통합", "기독교대한감리회", "기독교대한성결교회", "등등..."].map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[11px] font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 법적 조치 안내 미니 박스 */}
                <div className="bg-gray-950 text-white p-3.5 md:p-4 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 bg-red-600/20 rounded-xl flex items-center justify-center text-red-400 shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-red-400 uppercase tracking-widest">Legal Notice</div>
                      <div className="text-xs font-black">무단 출입 및 적발 시</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-300 font-medium leading-relaxed bg-white/5 p-2.5 md:p-3 rounded-xl border border-white/10">
                    적발 시 예배 및 설교 방해죄(형법 제158조), 퇴거불응죄(형법 제319조 2항), 업무방해죄(형법 제314조), 개인정보보호법 위반 등의 <strong className="text-white font-bold">가능한 모든 법적 조치</strong>를 엄중히 취하겠습니다.
                  </p>
                </div>
              </div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#f9fafb] p-5 md:p-8 rounded-[24px] md:rounded-[32px] border border-[#f2f4f6]"
            >
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-[#3182f6]" />
                </div>
                <h4 className="text-[14px] md:text-[16px] font-black text-[#191f28]">이용 비용 안내</h4>
              </div>
              <p className="text-[12px] md:text-[13px] text-[#4e5968] leading-relaxed break-keep font-medium">
                등록은 현재 무료로 제공되고 있어요. 다만 플랫폼 유지를 위해 추후 소정의 연간 게시 비용이 청구될 수 있어요. 연회비가 발생할 경우 사전에 스테이온에서 안내 연락 드려요.
              </p>
            </motion.div>

            {/* 전화 요청 모달 (AnimatePresence 내부) */}
            <AnimatePresence>
              {isPhoneRequestOpen && (
                <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsPhoneRequestOpen(false)}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl overflow-hidden"
                  >
                    <div className="w-12 h-1.5 bg-[#e5e8eb] rounded-full mx-auto mb-8 sm:hidden" />
                    <h2 className="text-2xl font-bold text-[#191f28] mb-2">등록 대행을 신청할까요?</h2>
                    <p className="text-[#6b7684] mb-8 font-medium">성함과 연락처를 남겨주시면 <br />스테이온 매니저가 연락드려 상담을 통해 직접 등록 해드립니다.</p>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-[#6b7684] ml-1">연락받으실 분 성함</label>
                        <input
                          type="text"
                          placeholder="성함을 입력해주세요"
                          value={phoneRequest.name}
                          className="w-full p-4 bg-[#f9fafb] rounded-xl border-none focus:ring-2 focus:ring-[#3182f6] outline-none font-bold"
                          onChange={(e) => setPhoneRequest(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-[#6b7684] ml-1">연락처</label>
                        <input
                          type="tel"
                          placeholder="010-0000-0000"
                          // value를 지정해서 상태와 동기화시킵니다.
                          value={phoneRequest.phone}
                          className="w-full p-4 bg-[#f9fafb] rounded-xl border-none focus:ring-2 focus:ring-[#3182f6] outline-none font-bold"
                          onChange={(e) => {
                            // 기존에 만들어둔 formatPhoneNumber 함수를 사용해 값을 변환합니다.
                            const formatted = formatPhoneNumber(e.target.value);
                            setPhoneRequest(prev => ({ ...prev, phone: formatted }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-bold text-[#6b7684] ml-1">연락 가능 시간 (2개 정도)</label>
                        <input
                          type="text"
                          placeholder="예: 평일 오후 2시 이후, 토요일 오전"
                          value={phoneRequest.time}
                          className="w-full p-4 bg-[#f9fafb] rounded-xl border-none focus:ring-2 focus:ring-[#3182f6] outline-none font-bold"
                          onChange={(e) => setPhoneRequest(prev => ({ ...prev, time: e.target.value }))}
                        />
                      </div>

                      <button
                        disabled={!phoneRequest.name || !phoneRequest.phone}
                        onClick={async () => {
                          try {
                            // 1. Firebase Functions 인스턴스 생성 및 호출 함수 연결
                            // const functionsInstance = getFunctions();
                            // const triggerAdminNotification = httpsCallable(functionsInstance, "triggerAdminNotification");
                            const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");

                            // 2. Cloud Functions로 알림 데이터 전송
                            await triggerAdminNotification({
                              type: 'RESERVE',
                              payload: {
                                userName: phoneRequest.name,
                                userPhone: phoneRequest.phone,
                                dateTime: phoneRequest.time || "시간 미정"
                              }
                            });

                            // 3. 완료 처리
                            await showAlert("요청이 접수되었습니다. 곧 연락드릴게요!");
                            handleCloseModal();

                          } catch (error) {
                            console.error("Error sending notification:", error);
                            await showAlert("요청 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
                          }
                        }}
                        className="flex-[2] py-4 bg-[#3182f6] text-white rounded-2xl font-bold disabled:bg-[#e5e8eb]"
                      >
                        전화 요청하기
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        <header className="mb-8 md:mb-14">
          <motion.div key={currentStep} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-block px-3 py-1 bg-[#f2f8ff] text-[#3182f6] font-bold text-[12px] rounded-lg mb-3 md:mb-4">STEP 0{currentStep}</motion.div>
          <h1 className="text-[21px] md:text-[28px] font-bold leading-tight tracking-tight text-[#191f28]">
            {currentStep === 1 && <>나의 사역지와<br /><span className="text-[#3182f6]">기본 정보</span>를 등록해볼까요?</>}
            {currentStep === 2 && <>더욱 정확한 매칭을 위해<br /><span className="text-[#3182f6]">시설 상세</span>를 알려주세요</>}
            {currentStep === 3 && <>마지막으로<br /><span className="text-[#3182f6]">입력 내용</span>이 정확한가요?</>}
          </h1>
        </header>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-2">
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <CustomInput label="신청자 성함" value={formData.applicantName} onChange={(v: any) => setFormData({ ...formData, applicantName: v })} placeholder="홍길동" />
                  <CustomInput label="연락처" value={formData.applicantContact} error={errors.contact} onChange={(v: any) => setFormData({ ...formData, applicantContact: formatPhoneNumber(v) })} placeholder="010-0000-0000" />
                </div>

                <CustomInput 
                  label="안내받으실 이메일 주소" 
                  type="email" 
                  value={formData.applicantEmail} 
                  error={errors.email}
                  onChange={(v: any) => setFormData({ ...formData, applicantEmail: v })} 
                  placeholder="example@stayon.com" 
                />

                <CustomInput label="장소 이름 (교회명/센터명)" value={formData.venueName} onChange={(v: any) => setFormData({ ...formData, venueName: v })} placeholder="예: 평화 수양관" />

                {/* 교단 선택 섹션 */}
                <div className="mb-6 md:mb-10 relative" ref={dropdownRef}>
                  <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">소속 교단</label>
                  <div
                    onClick={() => setIsDenoOpen(!isDenoOpen)}
                    className={`flex justify-between items-center text-[16px] md:text-[20px] font-bold py-3 md:py-4 border-b-2 transition-all cursor-pointer ${isDenoOpen ? 'border-[#3182f6]' : 'border-[#f2f4f6] hover:border-[#e5e8eb]'}`}
                  >
                    <span className={(formData.denomination || isCustomDeno) ? 'text-[#191f28]' : 'text-[#d1d6db]'}>
                      {isCustomDeno ? "직접 입력" : (formData.denomination || "선택해주세요")}
                    </span>
                    <ChevronDown className={`w-5 h-5 md:w-6 md:h-6 text-[#adb5bd] transition-transform shrink-0 ${isDenoOpen ? 'rotate-180 text-[#3182f6]' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {isDenoOpen && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 w-full mt-2 bg-white rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-[#f2f4f6] overflow-hidden">
                        <div className="p-4 bg-[#f9fafb] border-b border-[#f2f4f6]">
                          <input className="w-full bg-transparent font-bold outline-none text-[16px] text-[#191f28] placeholder:text-[#adb5bd]" placeholder="교단명을 입력해보세요" autoFocus onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="max-h-72 overflow-y-auto p-2 no-scrollbar">
                          {DENOMINATION_GROUPS.flatMap(g => g.items).filter(i => i.includes(searchTerm)).map(item => (
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
                              className="p-4 hover:bg-[#f2f4f6] rounded-[20px] font-bold text-[#333d4b] cursor-pointer transition-colors flex justify-between items-center group"
                            >
                              {item} <Check className={`w-5 h-5 text-[#3182f6] opacity-0 group-hover:opacity-100 transition-opacity ${formData.denomination === item ? 'opacity-100' : ''}`} />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isCustomDeno && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-6 overflow-hidden">
                        <CustomInput label="교단명 직접 입력" value={formData.denomination} onChange={(v: any) => setFormData({ ...formData, denomination: v })} placeholder="예: 한국기독교00연합" autoFocus={true} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mb-6 md:mb-10">
                  <label className="block text-[13px] font-bold text-[#6b7684] mb-2 ml-1">위치 정보</label>
                  <div onClick={handleAddressSearch} className="flex items-center gap-3 text-[16px] md:text-[20px] font-bold py-3 md:py-4 border-b-2 border-[#f2f4f6] cursor-pointer hover:border-[#e5e8eb] transition-all">
                    <MapPin className="w-5 h-5 text-[#3182f6] shrink-0" strokeWidth={2.5} />
                    <span className={formData.location ? 'text-[#191f28]' : 'text-[#d1d6db]'}>{formData.location || "주소 검색하기"}</span>
                  </div>
                  {formData.location && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                      <input className="w-full text-[15px] md:text-[18px] font-bold py-3 md:py-4 outline-none border-b-2 border-[#f2f4f6] focus:border-[#3182f6] placeholder:text-[#d1d6db] transition-all" placeholder="상세 주소를 입력해주세요" value={formData.addressDetail} onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })} />
                    </motion.div>
                  )}
                </div>
                <CustomInput label="최대 수용 인원" type="number" suffix="명" value={formData.capacity} onChange={(v: any) => handleNumberInput("capacity", v)} placeholder="0" />

                <div className="mb-6 md:mb-10">
                  <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1">교회의 전반적인 사정이나 상황 (선택, 중복 가능)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CHURCH_SITUATION_OPTIONS.map((opt) => {
                      const selected = formData.churchSituation.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleChurchSituation(opt)}
                          className={`py-3 px-3 rounded-2xl text-[13px] font-bold border-2 transition-all ${selected ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]" : "border-[#f2f4f6] bg-white text-[#4e5968] hover:border-[#e5e8eb]"}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <input
                      type="text"
                      value={formData.churchSituationOther}
                      onChange={(e) => setFormData({ ...formData, churchSituationOther: e.target.value })}
                      placeholder="기타 (직접 입력)"
                      className="w-full text-[15px] font-bold py-3 px-1 border-b-2 border-[#f2f4f6] focus:border-[#3182f6] outline-none bg-transparent placeholder:text-[#d1d6db] transition-all"
                    />
                  </div>
                </div>

                <div className="mb-6 md:mb-10">
                  <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1">국내 선교지로서 원하는 봉사나 헌신 (선택, 중복 가능)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DESIRED_SERVICE_OPTIONS.map((opt) => {
                      const selected = formData.desiredService.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleDesiredService(opt)}
                          className={`py-3 px-3 rounded-2xl text-[13px] font-bold border-2 transition-all ${selected ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]" : "border-[#f2f4f6] bg-white text-[#4e5968] hover:border-[#e5e8eb]"}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <input
                      type="text"
                      value={formData.desiredServiceOther}
                      onChange={(e) => setFormData({ ...formData, desiredServiceOther: e.target.value })}
                      placeholder="기타 (직접 입력)"
                      className="w-full text-[15px] font-bold py-3 px-1 border-b-2 border-[#f2f4f6] focus:border-[#3182f6] outline-none bg-transparent placeholder:text-[#d1d6db] transition-all"
                    />
                  </div>
                </div>

                <CustomInput
                  label="대표 전화번호 (공개)"
                  value={formData.contactPhone}
                  onChange={(v: any) => setFormData({ ...formData, contactPhone: formatPlainPhone(v) })}
                  placeholder="010-0000-0000"
                />
                <p className="text-[12px] text-[#8b95a1] font-bold -mt-4 md:-mt-8 mb-6 md:mb-10 ml-1">공개됩니다. 방문객이 이 번호로 바로 문의할 수 있어요.</p>

                <StepButtons />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-12">
                {/* 이미지 업로드 섹션 - 카테고리별로 나눠서 등록 */}
                <section>
                  <div className="flex justify-between items-end mb-1.5 px-1">
                    <label className="text-[13px] font-bold text-[#6b7684] uppercase tracking-wider">
                      공간 사진 (전체 {Object.values(categoryFiles).reduce((sum, files) => sum + files.length, 0)}/{VENUE_IMAGE_TOTAL_MAX})
                    </label>
                    <span className="text-[11px] font-bold text-[#3182f6] bg-[#f2f8ff] px-2 py-1 rounded-md">다중 선택 가능</span>
                  </div>
                  <p className="text-[12.5px] text-[#8b95a1] font-medium mb-6 px-1">카테고리별로 나눠서 올려주시면 사역팀이 장소를 더 정확히 파악할 수 있어요.</p>

                  <div className="space-y-9">
                    {VENUE_IMAGE_CATEGORIES.map((category) => (
                      <div key={category.key}>
                        <div className="flex justify-between items-end mb-3 px-1">
                          <label className="text-[13.5px] font-bold text-[#4e5968]">{category.label}</label>
                          <span className="text-[11px] font-bold text-[#adb5bd]">{categoryFiles[category.key].length}/{category.max}</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                          {categoryFiles[category.key].length < category.max && (
                            <label className="aspect-square bg-[#f9fafb] border-2 border-dashed border-[#e5e8eb] rounded-[24px] flex flex-col items-center justify-center gap-2 text-[#adb5bd] hover:bg-[#f2f4f6] hover:border-[#3182f6]/30 transition-all group cursor-pointer">
                              <Camera className="w-6 h-6 group-hover:text-[#3182f6]" /> <span className="text-[11px] font-bold group-hover:text-[#3182f6]">이미지 추가</span>
                              <input type="file" onChange={(e) => handleCategoryFileChange(category.key, e)} multiple accept="image/*" className="hidden" />
                            </label>
                          )}
                          {categoryPreviewUrls[category.key].map((url, index) => (
                            <div key={url} className="relative aspect-square group">
                              <img src={url} onClick={() => setSelectedImageUrl(url)} className="w-full h-full object-cover rounded-[24px] cursor-pointer shadow-sm group-hover:shadow-md transition-shadow" />
                              <button type="button" onClick={(e) => removeCategoryImage(e, category.key, index)} className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-[#191f28] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"><X className="w-4 h-4" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-[#f9fafb] p-8 rounded-[32px] space-y-10 border border-[#f2f4f6]">
                  <h3 className="text-[17px] font-bold text-[#191f28] flex items-center gap-2.5">
                    <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" />
                    답사 필수 체크포인트
                  </h3>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-[12px] font-bold text-[#6b7684]"><Wind className="w-4 h-4 text-[#3182f6]" /> 냉방 시설</label>
                      <div className="flex bg-white p-1 rounded-2xl border border-[#f2f4f6]">
                        {['있음', '없음'].map((opt) => (
                          <button key={opt} type="button" onClick={() => setFormData({ ...formData, airConditioner: opt === '있음' })} className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all ${formData.airConditioner === (opt === '있음') ? 'bg-[#3182f6] text-white shadow-md' : 'text-[#adb5bd] hover:text-[#4e5968]'}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-[12px] font-bold text-[#6b7684]"><Bed className="w-4 h-4 text-[#3182f6]" /> 침구류 보유</label>
                      <div className="flex bg-white p-1 rounded-2xl border border-[#f2f4f6]">
                        {['보유', '미보유'].map((opt) => (
                          <button key={opt} type="button" onClick={() => setFormData({ ...formData, beddingAvailable: opt === '보유' })} className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all ${formData.beddingAvailable === (opt === '보유') ? 'bg-[#3182f6] text-white shadow-md' : 'text-[#adb5bd] hover:text-[#4e5968]'}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <CustomInput label="주차 시설 정보" value={formData.parkingCapacity} onChange={(v: any) => setFormData({ ...formData, parkingCapacity: v })} placeholder={"예: 소형 20대\n대형버스 2대 진입 가능"} multiline />
                    <CustomInput label="샤워실 / 화장실 구성" value={formData.showerBathroom} onChange={(v: any) => setFormData({ ...formData, showerBathroom: v })} placeholder={"예: 남녀 화장실 분리\n공용 샤워장 완비"} multiline />
                    <div className="group relative">
                      <label className="block text-[13px] font-bold text-[#f04452] mb-2 ml-1 flex items-center gap-2"><Volume2 className="w-4 h-4" /> 야간 소음 / 민원 주의사항</label>
                      <input className="w-full text-[18px] font-bold py-3 px-1 border-b-2 border-[#f2f4f6] focus:border-[#f04452] outline-none bg-transparent transition-all" placeholder="예: 밤 11시 이후 앰프 사용 금지" value={formData.nightEventLimit} onChange={(e) => setFormData({ ...formData, nightEventLimit: e.target.value })} />
                    </div>
                  </div>
                </section>

                {/* <section className="px-1">
                  <h3 className="text-[13px] font-bold text-[#6b7684] mb-8 ml-1 uppercase tracking-wider">강당 및 장비 스펙</h3>
                  <div className="grid grid-cols-2 gap-x-10">
                    <CustomInput label="주강당 면적" value={formData.hallSize} onChange={(v: any) => setFormData({ ...formData, hallSize: v })} placeholder="예: 80평" />
                    <CustomInput label="보유 악기" value={formData.instruments} onChange={(v: any) => setFormData({ ...formData, instruments: v })} placeholder="신디, 드럼 등" />
                    <CustomInput label="음향 시스템" value={formData.soundSystem} onChange={(v: any) => setFormData({ ...formData, soundSystem: v })} placeholder="디지털 믹서 등" />
                    <CustomInput label="영상 장비" value={formData.projector} onChange={(v: any) => setFormData({ ...formData, projector: v })} placeholder="4K 프로젝터" />
                  </div>
                </section> */}

                <section className="px-1 mt-10">
                  <header className="mb-10">
                    <h3 className="text-[15px] font-bold text-[#6b7684] mb-2 ml-1 uppercase tracking-wider">
                      강당 및 장비 스펙
                    </h3>
                    <p className="text-[13px] text-[#8b95a1] ml-1">
                      장소의 규모와 보유 중인 전문 장비 정보를 입력해주세요.
                    </p>
                  </header>

                  <div className="flex flex-col gap-y-2">
                    <CustomInput
                      label="주강당 면적(대략적으로 기재)"
                      value={formData.hallSize}
                      onChange={(v: any) => setFormData({ ...formData, hallSize: v })}
                      placeholder="예: 80"
                      type="number"
                      suffix="평"
                    />

                    <CustomInput
                      label="보유 악기"
                      value={formData.instruments}
                      onChange={(v: any) => setFormData({ ...formData, instruments: v })}
                      placeholder={"신디\n드럼, 앰프 등 보유 품목"}
                      multiline
                    />

                    <CustomInput
                      label="음향 시스템"
                      value={formData.soundSystem}
                      onChange={(v: any) => setFormData({ ...formData, soundSystem: v })}
                      placeholder={"디지털 믹서\n스피커 모델 등"}
                      multiline
                    />

                    <CustomInput
                      label="영상 장비"
                      value={formData.projector}
                      onChange={(v: any) => setFormData({ ...formData, projector: v })}
                      placeholder={"4K 프로젝터\nLED 스크린 사양 등"}
                      multiline
                    />
                  </div>
                </section>

                <section className="space-y-6 md:space-y-8">
                  <div className="flex items-center gap-1.5 px-1">
                    <h3 className="text-[12px] md:text-[13px] font-bold text-[#6b7684] uppercase tracking-wider">식사 제공 가이드</h3>
                    <div
                      className="relative"
                      onMouseEnter={() => setIsMealGuideOpen(true)}
                      onMouseLeave={() => setIsMealGuideOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setIsMealGuideOpen((v) => !v)}
                        className="w-4 h-4 rounded-full bg-[#e5e8eb] text-[#6b7684] hover:bg-[#3182f6] hover:text-white flex items-center justify-center transition-colors"
                        aria-label="식사 제공 가이드 자세히 보기"
                      >
                        <Info className="w-2.5 h-2.5" strokeWidth={3} />
                      </button>
                      <AnimatePresence>
                        {isMealGuideOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-20 top-full left-0 mt-2 w-[260px] md:w-[300px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.14)] border border-[#f2f4f6] p-4 space-y-3"
                          >
                            <div>
                              <p className="text-[12px] font-black text-[#191f28] mb-0.5">1. 장소측에서 식사 제공이 가능한 경우</p>
                              <p className="text-[11px] text-[#8b95a1] font-medium leading-relaxed break-keep">해당 장소의 경우 장소측에서 식사를 만들어주실수 있어요. 단, 1인당 식비가 발생할 수 있어요</p>
                            </div>
                            <div>
                              <p className="text-[12px] font-black text-[#191f28] mb-0.5">2. 직접 취사 가능 / 외부 음식 반입이 가능한 경우</p>
                              <p className="text-[11px] text-[#8b95a1] font-medium leading-relaxed break-keep">주방의 모든 시설을 자유롭게 이용하실 수 있어서 직접 조리가 가능해요.</p>
                            </div>
                            <div>
                              <p className="text-[12px] font-black text-[#191f28] mb-0.5">3. 식사를 할 수 있는 장소가 없어요</p>
                              <p className="text-[11px] text-[#8b95a1] font-medium leading-relaxed break-keep">식당 공간이 따로 없는곳이거나, 분리되어 있지 않아요.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="grid gap-2.5 md:gap-3">
                    {[
                      { id: 'provided', label: '장소 측에서 식사 제공이 가능해요', desc: '직접 조리하여 제공해주실수 있는 경우', icon: <UtensilsCrossed className="w-4 h-4 md:w-5 md:h-5" /> },
                      { id: 'self', label: '직접 취사 가능 / 외부 음식 반입이 가능해요', desc: '주방 시설 이용 및 배달 / 도시락 등 자유롭게 가능', icon: <ExternalLink className="w-4 h-4 md:w-5 md:h-5" /> },
                      { id: 'none', label: '식사할 수 있는 장소가 없어요', desc: '식당 공간이 없거나 사용이 불가능한 경우(장소 선정률이 저조할 수 있어요)', icon: <X className="w-4 h-4 md:w-5 md:h-5" /> },
                    ].map((opt) => {
                      const isSelected = formData.mealOption.includes(opt.id as any);
                      return (
                        <div key={opt.id} onClick={() => toggleMealOption(opt.id as any)} className={`p-4 md:p-6 rounded-[18px] md:rounded-[24px] cursor-pointer border-2 flex gap-3 md:gap-4 transition-all duration-300 ${isSelected ? 'bg-[#f2f8ff] border-[#3182f6] shadow-sm' : 'bg-[#f9fafb] border-transparent hover:border-[#e5e8eb]'}`}>
                          <div className={`mt-1 ${isSelected ? 'text-[#3182f6]' : 'text-[#adb5bd]'}`}>{opt.icon}</div>
                          <div className="flex-1">
                            <p className={`font-bold text-[14px] md:text-[17px] break-keep ${isSelected ? 'text-[#191f28]' : 'text-[#4e5968]'}`}>{opt.label}</p>
                            <p className="text-[11.5px] md:text-[13px] text-[#8b95a1] mt-1 font-medium leading-relaxed tracking-tight break-keep">{opt.desc}</p>
                          </div>
                          <div className="flex items-center">
                            <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-[#3182f6] border-[#3182f6]' : 'bg-white border-[#e5e8eb]'}`}>
                              {isSelected && <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" strokeWidth={4} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    {formData.mealOption.length > 0 && !formData.mealOption.includes('none') && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden bg-[#f9fafb] rounded-[32px] border border-[#f2f4f6] p-8 space-y-8 shadow-inner">
                        {formData.mealOption.includes('provided') && (
                          <CustomInput label="1인 1식 평균 단가" type="number" suffix="원" value={formData.mealPrice} onChange={(v: any) => handleNumberInput("mealPrice", v)} placeholder="7,000" />
                        )}
                        <CustomInput label="식당 최대 수용 인원" type="number" suffix="명" value={formData.cafeteriaCapacity} onChange={(v: any) => handleNumberInput("cafeteriaCapacity", v)} placeholder="50" />
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[13px] font-bold text-[#6b7684] ml-1"><PenLine className="w-4 h-4 text-[#3182f6]" /> 주방/식당 이용 주의사항</label>
                          <textarea className="w-full bg-white rounded-2xl p-5 outline-none text-[16px] font-bold text-[#191f28] min-h-[120px] border border-[#f2f4f6] focus:border-[#3182f6] transition-all shadow-sm placeholder:text-[#d1d6db]" placeholder="예: 외부 음식 반입 시 쓰레기 봉투 지참 필수, 주방 사용 청소비 별도" value={formData.mealNote} onChange={(e) => setFormData({ ...formData, mealNote: e.target.value })} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                <section>
                  <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 uppercase tracking-wider">공간 전체 소개 및 메모</label>
                  <textarea className="w-full bg-[#f9fafb] rounded-[28px] p-6 outline-none text-[17px] font-bold text-[#191f28] min-h-[160px] resize-none focus:bg-white border border-[#f2f4f6] focus:border-[#3182f6] transition-all shadow-sm placeholder:text-[#d1d6db]" placeholder="장소의 장점이나 사역자들이 알면 좋은 팁을 자유롭게 적어주세요." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </section>

                <section className="bg-[#f9fafb] p-8 rounded-[32px] border border-[#f2f4f6]">
                  <header className="mb-6">
                    <h3 className="text-[15px] font-bold text-[#6b7684] mb-2 ml-1 uppercase tracking-wider">장소 태그 키워드 (최대 10개)</h3>
                    <p className="text-[13px] text-[#8b95a1] ml-1">
                      수련회/모임 기획자가 장소를 쉽게 찾을 수 있도록 특징을 표현하는 태그를 선택하거나 입력해 주세요.
                    </p>
                  </header>
                  <TagEditor tags={formData.tags} onChange={(tags) => setFormData({ ...formData, tags })} />
                </section>

                <StepButtons />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="bg-[#f9fafb] p-8 rounded-[40px] border border-[#f2f4f6] shadow-sm">
                  <div className="flex flex-col gap-6 mb-8 px-2">
                    <div><p className="text-[#8b95a1] font-bold text-[12px] uppercase mb-1.5">신청 장소</p><h2 className="text-3xl font-bold text-[#191f28] tracking-tight">{formData.venueName}</h2></div>
                    <div><p className="text-[#8b95a1] font-bold text-[12px] uppercase mb-1.5">위치 정보</p><p className="text-[17px] font-bold text-[#4e5968] leading-snug">{formData.location} {formData.addressDetail}</p></div>
                  </div>
                  <div className="h-px bg-[#f2f4f6] mb-8" />
                  <div className="grid gap-y-6 px-2">
                    {/* <SummaryItem label="소속 교단" value={isCustomDeno ? `${formData.denomination}` : (formData.denomination || "미선택")} />
                    <SummaryItem label="최대 인원" value={`${formData.capacity.toLocaleString()}명`} />
                    <SummaryItem label="1박 이용료" value={`${formData.price.toLocaleString()}원`} />
                    <SummaryItem label="식사 옵션" value={formData.mealOption.includes('none') ? '식사 불가' : formData.mealOption.map(o => o === 'provided' ? '자체 제공' : '취사/외부 가능').join(', ')} />
                    <SummaryItem label="핵심 시설" value={`${formData.airConditioner ? '에어컨 보유' : '에어컨 없음'} / ${formData.beddingAvailable ? '침구 보유' : '침구 없음'}`} />
                  </div> */}
                    <SummaryItem label="안내 이메일" value={formData.applicantEmail || "미입력"} />
                    <SummaryItem label="소속 교단" value={isCustomDeno ? `${formData.denomination}` : (formData.denomination || "미선택")} />
                    <SummaryItem label="최대 인원" value={`${formData.capacity.toLocaleString()}명`} />
                    <SummaryItem label="식사 옵션" value={formData.mealOption.includes('none') ? '식사 불가' : formData.mealOption.map(o => o === 'provided' ? '자체 제공' : '취사/외부 가능').join(', ')} />
                    <SummaryItem label="핵심 시설" value={`${formData.airConditioner ? '에어컨 보유' : '에어컨 없음'} / ${formData.beddingAvailable ? '침구 보유' : '침구 없음'}`} />
                    <SummaryItem label="태그" value={formData.tags.length > 0 ? formData.tags.map((t) => `#${t}`).join(", ") : "미등록"} />
                    <SummaryItem label="교회 사정/상황" value={[...formData.churchSituation, formData.churchSituationOther].filter(Boolean).join(", ") || "미선택"} />
                    <SummaryItem label="원하는 봉사/헌신" value={[...formData.desiredService, formData.desiredServiceOther].filter(Boolean).join(", ") || "미선택"} />
                    <SummaryItem label="대표 전화번호" value={formData.contactPhone || "미입력"} />
                  </div>
                </div>

                <div className="p-4 bg-[#f2f8ff] rounded-2xl border border-[#3182f6]/10">
                  <p className="text-[13px] text-[#3182f6] font-bold leading-relaxed text-center">
                    입력하신 이메일로 장소 승인 결과가 안내됩니다.<br />신청 후 정식 등록까지는 최대 7일~10일 정도 소요됩니다.
                  </p>
                </div>
                <StepButtons />
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      <style>{` .no-scrollbar::-webkit-scrollbar { display: none; } textarea::placeholder { font-weight: 700; color: #d1d6db; } `}</style>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-[15px] font-bold text-[#8b95a1]">{label}</span>
      <span className="text-[16px] font-bold text-[#191f28] text-right">{value}</span>
    </div>
  );
}
