import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  ChevronLeft, ChevronRight, Phone, MapPin, Bus, X, ZoomIn, ShieldCheck, BadgeCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { getVehicleTypeImage, extractSeatCount } from "../lib/vehicleTypes";
import { showAlert } from "../lib/dialog";

const DRIVER_INCLUDED_LABELS: Record<string, string> = { included: "기사 포함", separate: "기사 별도", optional: "기사 협의 가능" };
const DRIVER_CHRISTIAN_LABELS: Record<string, string> = { yes: "기사님 기독교인", no: "기사님 비기독교인", unknown: "기사님 신앙 무관" };
const INSURANCE_LABELS: Record<string, string> = { covered: "보험 적용되어 있음", separate_needed: "보험 별도 처리 필요함" };

export function VehicleRentalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const fetchVehicle = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "vehicleRentals", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().status === "approved") {
          setVehicle(docSnap.data());
        } else {
          await showAlert("업체 정보를 찾을 수 없습니다.");
          navigate("/vehicles");
        }
      } catch (error) {
        console.error("업체 정보 조회 실패:", error);
        navigate("/vehicles");
      } finally {
        setLoading(false);
      }
    };
    fetchVehicle();
  }, [id, navigate]);

  useEffect(() => {
    if (vehicle?.businessName) {
      document.title = `${vehicle.businessName} | 차량·버스 대여 | 스테이온`;
    }
  }, [vehicle?.businessName]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full" />
    </div>
  );

  if (!vehicle) return null;

  const fleet: any[] = Array.isArray(vehicle.vehicleFleet) ? vehicle.vehicleFleet.filter((row: any) => row?.type) : [];
  const fleetSummary = fleet.length > 0 ? fleet.map((row) => `${row.type} ${row.count}대`).join(", ") : "";
  const hasInsurance = !!vehicle.insuranceDocument;
  const galleryImages: string[] = Array.from(
    new Set([vehicle.coverPhoto, ...((vehicle.photos || []) as string[])].filter(Boolean))
  );
  const currentImageIndex = Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1));
  const goToImage = (idx: number) => setActiveImageIndex((idx + galleryImages.length) % galleryImages.length);

  return (
    <div className="min-h-screen bg-[#f2f4f6] text-[#191f28] font-sans selection:bg-blue-100 pb-40">
      <main className="max-w-[1120px] mx-auto px-4 md:px-6">
        {/* 상단 네비게이션 */}
        <section className="flex items-center justify-between pt-4 md:pt-6 pb-2 md:pb-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#4e5968] hover:text-[#191f28] transition-all font-bold group">
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[16px]">뒤로가기</span>
          </button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-5 pb-6">
          {/* 대표 사진 */}
          <section className="relative lg:col-start-1 lg:row-start-1 rounded-[24px] overflow-hidden border border-[#f2f4f6] aspect-video bg-white group">
            {galleryImages.length > 0 ? (
              <img
                src={galleryImages[currentImageIndex]}
                className="w-full h-full object-cover"
                alt={vehicle.businessName}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#F2F8FF]">
                <Bus className="w-12 h-12 text-[#93C5FD]" />
              </div>
            )}

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goToImage(currentImageIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all active:scale-90"
                  aria-label="이전 이미지"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goToImage(currentImageIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all active:scale-90"
                  aria-label="다음 이미지"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {galleryImages.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goToImage(i)}
                      className={`rounded-full transition-all ${i === currentImageIndex ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"}`}
                      aria-label={`${i + 1}번째 이미지`}
                    />
                  ))}
                </div>
              </>
            )}

            {galleryImages.length > 0 && (
              <button
                type="button"
                onClick={() => setIsImageLightboxOpen(true)}
                className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 bg-black/40 backdrop-blur-md text-white rounded-full text-[11px] font-bold hover:bg-black/60 transition-all active:scale-95"
              >
                <ZoomIn className="w-3.5 h-3.5" /> 확대해서 보기
              </button>
            )}
          </section>

          {/* 타이틀/연락처 카드 */}
          <section className="lg:col-start-2 lg:row-start-1 bg-white rounded-[24px] p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6] h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-2.5 md:mb-3">
                {fleetSummary && (
                  <span className="px-3.5 py-1.5 text-[12px] font-black rounded-xl bg-[#F2F8FF] text-[#3182f6]">
                    {fleetSummary}
                  </span>
                )}
                {hasInsurance && (
                  <span className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[12px] font-black rounded-xl bg-[#ECFDF5] text-[#10b981]">
                    <ShieldCheck className="w-3.5 h-3.5" /> 보험가입
                  </span>
                )}
                {vehicle.businessRegistrationNumber && (
                  <span className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[12px] font-black rounded-xl bg-[#F2F8FF] text-[#3182f6]">
                    <BadgeCheck className="w-3.5 h-3.5" /> 사업자인증
                  </span>
                )}
              </div>
              <h1 className="text-[22px] md:text-[24px] font-black text-[#191f28] mb-2.5 md:mb-3 tracking-tighter leading-tight break-keep">
                {vehicle.businessName}
              </h1>
              {vehicle.introduction && (
                <p className="text-[14px] font-bold text-[#4e5968] leading-relaxed break-keep mb-3 md:mb-4">
                  {vehicle.introduction}
                </p>
              )}

              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] p-3.5 md:p-4 space-y-2.5">
                {Array.isArray(vehicle.serviceRegions) && vehicle.serviceRegions.length > 0 && (
                  <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                    <MapPin className="w-4 h-4 text-[#3182f6] shrink-0" />
                    운행 가능 지역: {vehicle.serviceRegions.join(", ")}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 md:mt-4">
              {vehicle.contactPhone && (
                <a
                  href={`tel:${vehicle.contactPhone}`}
                  className="w-full flex items-center justify-center gap-2 py-3.5 md:py-4 bg-[#191f28] text-white rounded-2xl font-black text-[15px] hover:bg-black transition-all active:scale-[0.98]"
                >
                  <Phone className="w-4 h-4" /> 전화 상담하기
                </a>
              )}
            </div>
          </section>

          {/* 보유 차량 */}
          <div className="lg:col-span-2">
            <h3 className="text-[15px] md:text-[16px] font-black text-[#191f28] mb-2.5 md:mb-3 flex items-center gap-2 md:gap-2.5">
              <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 보유 차량
            </h3>
            {fleet.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
                {fleet.map((row, i) => {
                  const image = getVehicleTypeImage(row.type);
                  const seatCount = extractSeatCount(row.type);
                  return (
                    <div key={i} className="rounded-2xl border border-[#f2f4f6] overflow-hidden bg-[#f9fafb]">
                      <div className="relative aspect-video bg-[#F2F8FF] flex items-center justify-center">
                        {image ? (
                          <img src={image} className="w-full h-full object-contain" alt={row.type} />
                        ) : (
                          <Bus className="w-7 h-7 md:w-8 md:h-8 text-[#93C5FD]" />
                        )}
                        <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black bg-black/60 text-white">
                          {row.count}대
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-[12px] md:text-[13px] font-black text-[#191f28] mb-1 truncate">{row.type}</p>
                        <div className="flex flex-wrap gap-1">
                          {seatCount && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F8FF] text-[#3182f6]">{seatCount}</span>
                          )}
                          {(row.driverIncluded || []).map((opt: string) => (
                            <span key={opt} className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4e5968]">{DRIVER_INCLUDED_LABELS[opt]}</span>
                          ))}
                          {row.lodging && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4e5968]">숙박·숙식 제공 필요</span>
                          )}
                          {row.driverChristian && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4e5968]">{DRIVER_CHRISTIAN_LABELS[row.driverChristian]}</span>
                          )}
                          {row.cargoSpace && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#F2F4F6] text-[#4e5968]">
                              짐 적재칸 있음{row.cargoCapacity ? ` (캐리어 ${row.cargoCapacity})` : ""}
                            </span>
                          )}
                          {row.insurance && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#ECFDF5] text-[#10b981]">{INSURANCE_LABELS[row.insurance]}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] px-5 py-4 text-[14px] font-bold text-[#8b95a1]">보유 차량 정보가 없어요</div>
            )}
          </div>
        </div>
      </main>

      {/* 이미지 라이트박스 */}
      {isImageLightboxOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsImageLightboxOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>

          <img
            src={galleryImages[currentImageIndex]}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            alt={vehicle.businessName}
            onClick={(e) => e.stopPropagation()}
          />

          {galleryImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goToImage(currentImageIndex - 1); }}
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
                aria-label="이전 이미지"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goToImage(currentImageIndex + 1); }}
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
                aria-label="다음 이미지"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {galleryImages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goToImage(i); }}
                    className={`rounded-full transition-all ${i === currentImageIndex ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"}`}
                    aria-label={`${i + 1}번째 이미지`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
