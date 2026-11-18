import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, ScrollRestoration } from "react-router-dom";
import { Check, Bus, X, Lock, FileText, Minus, Plus, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { uploadPartnerImage } from "../lib/storage";
import { functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { CustomInput } from "../components/forms/TeamFormControls";
import { REGION_OPTIONS } from "../lib/regions";
import { FIXED_VEHICLE_TYPES, CUSTOM_VEHICLE_TYPE_LABEL, MAX_VEHICLE_PHOTOS, DriverIncludedOption, isLargeBusType } from "../lib/vehicleTypes";
import { showAlert } from "../lib/dialog";

const STORAGE_FOLDER = "vehicle-rentals";
const MAX_VEHICLE_FLEET_ROWS = 10;
const REGION_ALL = "전국";

interface VehicleFleetRow {
  type: string;
  count: string;
  driverIncluded?: DriverIncludedOption[];
}

interface VehicleRentalFormData {
  applicantName: string;
  applicantContact: string;
  businessName: string;
  businessRegistrationNumber: string;
  contactPhone: string;
  introduction: string;
  agreedToPrivacyPolicy: boolean;
  agreedToFeeNotice: boolean;
}

export default function VehicleRentalRegistrationForm() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const insuranceInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<VehicleRentalFormData>({
    applicantName: "",
    applicantContact: "",
    businessName: "",
    businessRegistrationNumber: "",
    contactPhone: "",
    introduction: "",
    agreedToPrivacyPolicy: false,
    agreedToFeeNotice: false,
  });

  const [vehicleFleet, setVehicleFleet] = useState<VehicleFleetRow[]>([]);
  const [serviceRegions, setServiceRegions] = useState<string[]>([]);
  const [errors, setErrors] = useState({ applicantContact: "" });
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [insurancePreview, setInsurancePreview] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

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

  const updateFleetAt = (idx: number, field: "type" | "count", value: string) => {
    const next = [...vehicleFleet];
    next[idx] = { ...next[idx], [field]: value };
    setVehicleFleet(next);
  };

  const toggleFixedVehicleType = (type: string) => {
    const idx = vehicleFleet.findIndex((row) => row.type === type);
    if (idx >= 0) {
      setVehicleFleet(vehicleFleet.filter((_, i) => i !== idx));
      return;
    }
    if (vehicleFleet.length >= MAX_VEHICLE_FLEET_ROWS) return;
    // 25인승 이상 버스는 여객자동차운수사업법상 전문 기사 동행이 필수라 자동으로 체크해둔다.
    const driverIncluded: DriverIncludedOption[] | undefined = isLargeBusType(type) ? ["included"] : undefined;
    setVehicleFleet([...vehicleFleet, { type, count: "1", driverIncluded }]);
  };

  const addCustomFleetRow = () => {
    if (vehicleFleet.length >= MAX_VEHICLE_FLEET_ROWS) return;
    setVehicleFleet([...vehicleFleet, { type: "", count: "1" }]);
  };

  const setFleetDriverIncluded = (idx: number, option: DriverIncludedOption) => {
    const next = [...vehicleFleet];
    next[idx] = { ...next[idx], driverIncluded: [option] };
    setVehicleFleet(next);
  };

  const removeFleetRow = (idx: number) => {
    setVehicleFleet(vehicleFleet.filter((_, i) => i !== idx));
  };

  const toggleServiceRegion = (region: string) => {
    if (region === REGION_ALL) {
      setServiceRegions((prev) => (prev.includes(REGION_ALL) ? [] : [REGION_ALL]));
      return;
    }
    setServiceRegions((prev) => {
      const withoutAll = prev.filter((r) => r !== REGION_ALL);
      return withoutAll.includes(region)
        ? withoutAll.filter((r) => r !== region)
        : [...withoutAll, region];
    });
  };

  const handleLicenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLicenseFile(file);
  };
  const removeLicense = () => setLicenseFile(null);

  const handleInsuranceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setInsuranceFile(file);
  };
  const removeInsurance = () => setInsuranceFile(null);

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...files].slice(0, MAX_VEHICLE_PHOTOS));
  };

  const removePhotoAt = (idx: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCoverPhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverPhotoFile(file);
  };
  const removeCoverPhoto = () => setCoverPhotoFile(null);

  useEffect(() => {
    const urls = photoFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photoFiles]);

  useEffect(() => {
    if (!coverPhotoFile) {
      setCoverPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(coverPhotoFile);
    setCoverPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverPhotoFile]);

  useEffect(() => {
    if (!licenseFile) {
      setLicensePreview(null);
      return;
    }
    const url = URL.createObjectURL(licenseFile);
    setLicensePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [licenseFile]);

  useEffect(() => {
    if (!insuranceFile) {
      setInsurancePreview(null);
      return;
    }
    const url = URL.createObjectURL(insuranceFile);
    setInsurancePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [insuranceFile]);

  const isFormValid = useMemo(() => {
    const hasValidFleetRow =
      vehicleFleet.length > 0 &&
      vehicleFleet.every((row) => row.type.trim() !== "" && Number(row.count) > 0 && (row.driverIncluded?.length ?? 0) > 0);
    return (
      formData.applicantName.trim() !== "" &&
      formData.applicantContact.length >= 12 &&
      formData.businessName.trim() !== "" &&
      formData.businessRegistrationNumber.trim() !== "" &&
      hasValidFleetRow &&
      serviceRegions.length > 0 &&
      !!licenseFile &&
      formData.contactPhone.length >= 12 &&
      formData.agreedToPrivacyPolicy &&
      formData.agreedToFeeNotice &&
      !errors.applicantContact
    );
  }, [formData, vehicleFleet, serviceRegions, licenseFile, errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isFormValid || !user || !licenseFile) return;
    try {
      setIsSubmitting(true);

      const licenseDocument = await uploadPartnerImage(licenseFile, STORAGE_FOLDER, formData.businessName, formData.applicantName);
      const insuranceDocument = insuranceFile
        ? await uploadPartnerImage(insuranceFile, STORAGE_FOLDER, formData.businessName, formData.applicantName)
        : null;
      const photos = photoFiles.length > 0
        ? await Promise.all(photoFiles.map((file) => uploadPartnerImage(file, STORAGE_FOLDER, formData.businessName, formData.applicantName)))
        : [];
      const coverPhoto = coverPhotoFile
        ? await uploadPartnerImage(coverPhotoFile, STORAGE_FOLDER, formData.businessName, formData.applicantName)
        : null;

      const cleanFleet = vehicleFleet
        .filter((row) => row.type.trim() !== "" && Number(row.count) > 0)
        .map((row) => ({ type: row.type.trim(), count: Number(row.count), driverIncluded: row.driverIncluded || [] }));

      await addDoc(collection(db, "vehicleRentals"), {
        applicantName: formData.applicantName,
        applicantContact: formData.applicantContact,
        applicantUid: user.uid,
        businessName: formData.businessName,
        businessRegistrationNumber: formData.businessRegistrationNumber,
        vehicleFleet: cleanFleet,
        serviceRegions,
        licenseDocument,
        insuranceDocument,
        photos,
        coverPhoto,
        contactPhone: formData.contactPhone,
        introduction: formData.introduction,
        agreedToPrivacyPolicy: formData.agreedToPrivacyPolicy,
        agreedToFeeNotice: formData.agreedToFeeNotice,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
      await triggerAdminNotification({
        type: "VEHICLE",
        payload: {
          businessName: formData.businessName,
          applicantName: formData.applicantName,
          businessRegistrationNumber: formData.businessRegistrationNumber,
          vehicleFleet: cleanFleet,
          serviceRegions,
          contactPhone: formData.contactPhone,
        },
      });

      setIsSuccessModalOpen(true);
    } catch (error) {
      await showAlert("등록 중 오류가 발생했습니다." + error);
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
          <Bus className="w-4 h-4" /> 차량·버스 대여 업체 등록
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
            <button onClick={() => navigate("/")} className="w-full max-w-sm py-5 bg-[#3182f6] text-white rounded-[22px] font-bold text-xl shadow-xl shadow-[#3182f6]/20 transition-transform active:scale-95">확인</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-xl mx-auto px-6 pt-16 pb-24">
        {/* 안내 헤더 */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f2f8ff] text-[#3182f6] rounded-full mb-6 text-sm font-black">
            <Bus className="w-4 h-4" /> 차량·버스 대여 업체 등록
          </div>
          <h1 className="text-[30px] font-black text-[#191f28] mb-3 leading-tight tracking-tight break-keep">
            수련회 이동 수단이 필요한<br />
            <span className="text-[#3182f6]">교회·단체에게 우리 업체를 알려보세요</span>
          </h1>
          <p className="text-[15px] text-[#4e5968] leading-relaxed break-keep font-medium">
            등록 및 이용에 비용이 발생하지 않아요.
          </p>

          <div className="mt-6 p-5 bg-[#f9fafb] rounded-[20px] border border-[#f2f4f6]">
            <p className="text-[13px] text-[#8b95a1] font-bold leading-relaxed break-keep">
              등록은 현재 무료로 제공되고 있어요. 다만 플랫폼 유지를 위해 추후 소정의 연간 게시 비용이 청구될 수 있어요. 연회비가 발생할 경우 사전에 스테이온에서 안내 연락 드려요.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* 신청자 정보 */}
          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">신청자 정보</h3>
            <CustomInput label="신청자(대표자) 이름" required value={formData.applicantName} onChange={(v) => setFormData({ ...formData, applicantName: v })} placeholder="홍길동" />
            <CustomInput
              label="신청자(대표자) 연락처" required
              value={formData.applicantContact}
              onChange={(v) => setFormData({ ...formData, applicantContact: formatPhoneNumber(v, true) })}
              placeholder="010-0000-0000"
              error={errors.applicantContact}
            />
          </section>

          {/* 업체 기본 정보 */}
          <section className="mb-4">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">업체 기본 정보</h3>
            <CustomInput label="업체명(상호)" required value={formData.businessName} onChange={(v) => setFormData({ ...formData, businessName: v })} placeholder="예: 스테이온 관광" />
            <CustomInput
              label="사업자등록번호" required
              value={formData.businessRegistrationNumber}
              onChange={(v) => setFormData({ ...formData, businessRegistrationNumber: v })}
              placeholder="000-00-00000"
            />

            <div className="mb-5">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
                보유 차량 종류·댓수 <span className="text-[#3182f6]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {FIXED_VEHICLE_TYPES.map((type) => {
                  const selected = vehicleFleet.some((row) => row.type === type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleFixedVehicleType(type)}
                      className={`py-3 px-3 rounded-2xl text-[13px] font-bold border-2 transition-all ${selected
                        ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]"
                        : "border-[#f2f4f6] bg-white text-[#4e5968] hover:border-[#e5e8eb]"
                        }`}
                    >
                      {type}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={addCustomFleetRow}
                  disabled={vehicleFleet.length >= MAX_VEHICLE_FLEET_ROWS}
                  className="py-3 px-3 rounded-2xl text-[13px] font-bold border-2 border-dashed border-[#e5e8eb] bg-white text-[#8b95a1] hover:border-[#3182f6] hover:text-[#3182f6] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + {CUSTOM_VEHICLE_TYPE_LABEL}
                </button>
              </div>

              {vehicleFleet.length > 0 && (
                <div className="space-y-2">
                  {vehicleFleet.map((row, i) => {
                    const isFixed = (FIXED_VEHICLE_TYPES as readonly string[]).includes(row.type);
                    const isLargeBus = isLargeBusType(row.type);
                    const driverIncluded = row.driverIncluded?.[0];
                    return (
                      <div key={i} className="p-3 bg-[#f9fafb] rounded-2xl border border-[#f2f4f6]">
                        <div className="flex items-center gap-2">
                          {isFixed ? (
                            <span className="flex-1 text-[14px] font-bold text-[#191f28] truncate">{row.type}</span>
                          ) : (
                            <input
                              type="text"
                              value={row.type}
                              onChange={(e) => updateFleetAt(i, "type", e.target.value)}
                              placeholder="차종을 직접 입력해주세요"
                              className="flex-1 h-10 px-3 bg-white rounded-lg text-[13px] font-bold outline-none border border-[#e5e8eb] focus:border-[#3182f6] transition-all placeholder:text-[#d1d6db]"
                            />
                          )}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateFleetAt(i, "count", String(Math.max(1, Number(row.count || 1) - 1)))}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-[#e5e8eb] text-[#8b95a1] hover:border-[#3182f6] hover:text-[#3182f6] transition-all"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-[14px] font-bold text-[#191f28]">{row.count || 1}</span>
                            <button
                              type="button"
                              onClick={() => updateFleetAt(i, "count", String(Number(row.count || 1) + 1))}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-[#e5e8eb] text-[#8b95a1] hover:border-[#3182f6] hover:text-[#3182f6] transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[12px] font-bold text-[#8b95a1]">대</span>
                          </div>
                          <button type="button" onClick={() => removeFleetRow(i)} className="shrink-0 p-1.5 text-[#adb5bd] hover:text-[#f04452] transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-2.5 pt-2.5 border-t border-[#f2f4f6]">
                          <p className="text-[12px] font-bold text-[#6b7684] mb-1.5">
                            기사 동행 여부 {isLargeBus && <span className="text-[#3182f6]">*필수</span>}
                          </p>
                          {isLargeBus ? (
                            <>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f2f8ff] text-[#3182f6] text-[12px] font-black">
                                <Check className="w-3.5 h-3.5" strokeWidth={3} /> 기사 동행 (필수)
                              </div>
                              <p className="text-[11px] text-[#b0b8c1] mt-1.5">25인승 이상 버스는 여객자동차운수사업법상 전문 기사님이 반드시 동행해야 해요.</p>
                            </>
                          ) : (
                            <>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setFleetDriverIncluded(i, "included")}
                                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${driverIncluded === "included" ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]" : "border-[#e5e8eb] bg-white text-[#8b95a1]"}`}
                                >
                                  기사 동행
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFleetDriverIncluded(i, "separate")}
                                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${driverIncluded === "separate" ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]" : "border-[#e5e8eb] bg-white text-[#8b95a1]"}`}
                                >
                                  기사 동행 안함
                                </button>
                              </div>
                              <p className="text-[11px] text-[#b0b8c1] mt-1.5">승합차는 자가 운전이 가능해 기사 동행 여부를 선택할 수 있어요.</p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-[#b0b8c1] mt-2 ml-1">보유한 차종을 선택하면 아래에 카드가 추가돼요. 최소 1개는 선택해야 하고, 각 차종마다 기사 동행 여부도 선택해야 해요.</p>
            </div>

            <div className="mb-5">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
                운행 가능 지역 <span className="text-[#3182f6]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => toggleServiceRegion(REGION_ALL)}
                  className={`py-3 rounded-2xl text-[13px] font-bold border-2 transition-all ${serviceRegions.includes(REGION_ALL)
                    ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]"
                    : "border-[#f2f4f6] bg-white text-[#4e5968] hover:border-[#e5e8eb]"
                    }`}
                >
                  {REGION_ALL}
                </button>
                {REGION_OPTIONS.map((region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => toggleServiceRegion(region)}
                    className={`py-3 rounded-2xl text-[13px] font-bold border-2 transition-all ${serviceRegions.includes(region)
                      ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]"
                      : "border-[#f2f4f6] bg-white text-[#4e5968] hover:border-[#e5e8eb]"
                      }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#b0b8c1] mt-2 ml-1">전국을 선택하면 다른 지역 선택은 해제돼요. 특정 지역을 선택하면 전국 선택은 해제돼요.</p>
            </div>
          </section>

          {/* 서류 등록 */}
          <section className="mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">서류 등록</h3>

            <div className="mb-6">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
                여객자동차운수사업 또는 렌트카사업 등록증 사본 <span className="text-[#3182f6]">*필수</span>
              </label>
              {licensePreview ? (
                <div className="relative w-40 aspect-[3/4] rounded-2xl overflow-hidden">
                  <img src={licensePreview} className="w-full h-full object-cover" />
                  <button type="button" onClick={removeLicense} className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#191f28] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => licenseInputRef.current?.click()} className="w-40 aspect-[3/4] bg-[#f9fafb] border-2 border-dashed border-[#e5e8eb] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[#adb5bd] hover:bg-[#f2f4f6] hover:border-[#3182f6]/30 transition-all group">
                  <FileText className="w-6 h-6 group-hover:text-[#3182f6]" />
                  <span className="text-[11px] font-bold group-hover:text-[#3182f6]">등록증 추가</span>
                </button>
              )}
              <input ref={licenseInputRef} type="file" accept="image/*" className="hidden" onChange={handleLicenseFileChange} />
            </div>

            <div>
              <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
                보험가입증명 <span className="text-[#b0b8c1] font-medium">(선택 — 등록하면 "보험가입" 뱃지가 붙어요)</span>
              </label>
              {insurancePreview ? (
                <div className="relative w-40 aspect-[3/4] rounded-2xl overflow-hidden">
                  <img src={insurancePreview} className="w-full h-full object-cover" />
                  <button type="button" onClick={removeInsurance} className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#191f28] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => insuranceInputRef.current?.click()} className="w-40 aspect-[3/4] bg-[#f9fafb] border-2 border-dashed border-[#e5e8eb] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[#adb5bd] hover:bg-[#f2f4f6] hover:border-[#3182f6]/30 transition-all group">
                  <FileText className="w-6 h-6 group-hover:text-[#3182f6]" />
                  <span className="text-[11px] font-bold group-hover:text-[#3182f6]">서류 추가</span>
                </button>
              )}
              <input ref={insuranceInputRef} type="file" accept="image/*" className="hidden" onChange={handleInsuranceFileChange} />
            </div>
          </section>

          {/* 차량/업체 사진 */}
          <section className="mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">차량 사진</h3>

            <div className="mb-6">
              <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
                대표 사진 <span className="text-[#b0b8c1] font-medium">(선택, 1장)</span>
              </label>
              {coverPhotoPreview ? (
                <div className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden">
                  <img src={coverPhotoPreview} className="w-full h-full object-cover" />
                  <button type="button" onClick={removeCoverPhoto} className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#191f28] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => coverPhotoInputRef.current?.click()} className="w-full aspect-[2/1] bg-[#f9fafb] border-2 border-dashed border-[#e5e8eb] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[#adb5bd] hover:bg-[#f2f4f6] hover:border-[#3182f6]/30 transition-all group">
                  <Camera className="w-6 h-6 group-hover:text-[#3182f6]" />
                  <span className="text-[11px] font-bold group-hover:text-[#3182f6]">대표 사진 추가</span>
                </button>
              )}
              <p className="text-[11px] text-[#b0b8c1] mt-2 ml-1">목록/상세 화면 상단에 노출돼요. 800 x 400 사이즈를 권장해요.</p>
              <input ref={coverPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverPhotoFileChange} />
            </div>

            <label className="block text-[13px] font-bold text-[#6b7684] mb-3 ml-1 tracking-tight">
              보유 차량/업체 사진 <span className="text-[#b0b8c1] font-medium">(선택, 최대 {MAX_VEHICLE_PHOTOS}장)</span>
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {photoPreviews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group">
                  <img src={src} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhotoAt(idx)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#191f28] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photoPreviews.length < MAX_VEHICLE_PHOTOS && (
                <button type="button" onClick={() => photoInputRef.current?.click()} className="aspect-square bg-[#f9fafb] border-2 border-dashed border-[#e5e8eb] rounded-2xl flex flex-col items-center justify-center gap-1 text-[#adb5bd] hover:bg-[#f2f4f6] hover:border-[#3182f6]/30 transition-all group">
                  <Camera className="w-5 h-5 group-hover:text-[#3182f6]" />
                  <span className="text-[11px] font-bold group-hover:text-[#3182f6]">추가</span>
                </button>
              )}
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoFileChange} />
          </section>

          {/* 업체 소개 */}
          <section className="mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">업체 소개</h3>
            <CustomInput label="한줄 소개" value={formData.introduction} onChange={(v) => setFormData({ ...formData, introduction: v })} placeholder="예: 수련회 전문 대형버스 대여 업체입니다" hint="선택 입력이에요." />
          </section>

          {/* 연락처 정보 */}
          <section className="mb-10">
            <h3 className="text-[13px] font-bold text-[#6b7684] mb-6 ml-1 uppercase tracking-wider">연락 가능 방법</h3>
            <CustomInput
              label="대표 전화번호" required
              value={formData.contactPhone}
              onChange={(v) => setFormData({ ...formData, contactPhone: formatPhoneNumber(v, false) })}
              placeholder="010-0000-0000 또는 02-000-0000"
              hint="공개됩니다. 방문객이 이 번호로 바로 문의할 수 있어요."
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
