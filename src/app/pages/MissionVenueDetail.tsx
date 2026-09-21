import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  ChevronLeft, ChevronRight, Phone, MapPin, Compass, X, ZoomIn, Users, Wind, Bed, Car, Bath, Tag,
} from "lucide-react";
import { motion } from "framer-motion";

function InfoRow({ icon, label, value }: any) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-b border-[#f2f4f6] last:border-0 md:flex-row md:items-start md:justify-between md:gap-3 md:px-5 md:py-3.5">
      <div className="text-[#8b95a1] font-bold text-[12px] md:text-[14px] flex items-center gap-1.5 md:gap-2.5 shrink-0">
        <div className="opacity-70 shrink-0">{icon}</div>
        <span className="whitespace-nowrap">{label}</span>
      </div>
      <span className="text-[#191f28] font-black text-[15px] md:text-[14px] md:text-right break-keep">{value}</span>
    </div>
  );
}

// 국내 선교 장소 상세 - 수련회 장소(VenueDetail.tsx)와 달리 예약/결제 시스템이 없어
// 전화 문의(contactPhone)만으로 연결한다.
export function MissionVenueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const fetchVenue = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "missionVenues", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().status === "approved") {
          setVenue(docSnap.data());
        } else {
          alert("선교지 정보를 찾을 수 없습니다.");
          navigate("/venues?category=mission");
        }
      } catch (error) {
        console.error("선교지 정보 조회 실패:", error);
        navigate("/venues?category=mission");
      } finally {
        setLoading(false);
      }
    };
    fetchVenue();
  }, [id, navigate]);

  useEffect(() => {
    if (venue?.venueName) {
      document.title = `${venue.venueName} | 국내 선교 장소 | 스테이온`;
    }
  }, [venue?.venueName]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full" />
    </div>
  );

  if (!venue) return null;

  const galleryImages: string[] = Array.from(new Set((venue.images || []) as string[]));
  const currentImageIndex = Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1));
  const goToImage = (idx: number) => setActiveImageIndex((idx + galleryImages.length) % galleryImages.length);
  const situations = [...(venue.churchSituation || []), venue.churchSituationOther].filter(Boolean);
  const desiredServices = [...(venue.desiredService || []), venue.desiredServiceOther].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#f2f4f6] text-[#191f28] font-sans selection:bg-blue-100 pb-40">
      <main className="max-w-[1120px] mx-auto px-4 md:px-6">
        <section className="flex items-center justify-between pt-4 md:pt-6 pb-2 md:pb-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#4e5968] hover:text-[#191f28] transition-all font-bold group">
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[16px]">뒤로가기</span>
          </button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-5 pb-6">
          <section className="relative lg:col-start-1 lg:row-start-1 rounded-[24px] overflow-hidden border border-[#f2f4f6] aspect-video bg-white group">
            {galleryImages.length > 0 ? (
              <img src={galleryImages[currentImageIndex]} className="w-full h-full object-cover" alt={venue.venueName} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#EFF6FF]">
                <Compass className="w-12 h-12 text-[#93C5FD]" />
              </div>
            )}

            {galleryImages.length > 1 && (
              <>
                <button type="button" onClick={() => goToImage(currentImageIndex - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all active:scale-90" aria-label="이전 이미지">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => goToImage(currentImageIndex + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-all active:scale-90" aria-label="다음 이미지">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {galleryImages.map((_, i) => (
                    <button key={i} type="button" onClick={() => goToImage(i)} className={`rounded-full transition-all ${i === currentImageIndex ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"}`} aria-label={`${i + 1}번째 이미지`} />
                  ))}
                </div>
              </>
            )}

            {galleryImages.length > 0 && (
              <button type="button" onClick={() => setIsImageLightboxOpen(true)} className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 bg-black/40 backdrop-blur-md text-white rounded-full text-[11px] font-bold hover:bg-black/60 transition-all active:scale-95">
                <ZoomIn className="w-3.5 h-3.5" /> 확대해서 보기
              </button>
            )}
          </section>

          <section className="lg:col-start-2 lg:row-start-1 bg-white rounded-[24px] p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6] h-full flex flex-col justify-between">
            <div>
              {venue.denomination && (
                <div className="flex items-center gap-1.5 flex-wrap mb-2.5 md:mb-3">
                  <span className="px-3.5 py-1.5 text-[12px] font-black rounded-xl bg-[#F2F8FF] text-[#3182f6]">
                    {venue.denomination}
                  </span>
                </div>
              )}
              <h1 className="text-[22px] md:text-[24px] font-black text-[#191f28] mb-2.5 md:mb-3 tracking-tighter leading-tight break-keep">
                {venue.venueName}
              </h1>
              {venue.description && (
                <p className="text-[14px] font-bold text-[#4e5968] leading-relaxed break-keep whitespace-pre-wrap mb-3 md:mb-4">
                  {venue.description}
                </p>
              )}

              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] p-3.5 md:p-4 space-y-2.5">
                {venue.location && (
                  <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                    <MapPin className="w-4 h-4 text-[#3182f6] shrink-0" />
                    {venue.location} {venue.addressDetail}
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                  <Users className="w-4 h-4 text-[#3182f6] shrink-0" />
                  최대 {Number(venue.capacity || 0).toLocaleString()}명
                </div>
              </div>
            </div>

            <div className="mt-3 md:mt-4">
              {venue.contactPhone && (
                <a href={`tel:${venue.contactPhone}`} className="w-full flex items-center justify-center gap-2 py-3.5 md:py-4 bg-[#191f28] text-white rounded-2xl font-black text-[15px] hover:bg-black transition-all active:scale-[0.98]">
                  <Phone className="w-4 h-4" /> 전화 문의하기
                </a>
              )}
            </div>
          </section>

          <section className="lg:col-span-2 bg-white rounded-[24px] p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
            <h3 className="text-[15px] md:text-[16px] font-black text-[#191f28] mb-2.5 md:mb-3 flex items-center gap-2 md:gap-2.5">
              <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 시설 정보
            </h3>
            <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] overflow-hidden">
              <InfoRow icon={<Wind className="w-4 h-4" />} label="냉방 시설" value={venue.airConditioner ? "있음" : "없음"} />
              <InfoRow icon={<Bed className="w-4 h-4" />} label="침구류" value={venue.beddingAvailable ? "보유" : "미보유"} />
              <InfoRow icon={<Car className="w-4 h-4" />} label="주차 정보" value={venue.parkingCapacity || "문의"} />
              <InfoRow icon={<Bath className="w-4 h-4" />} label="샤워실/화장실" value={venue.showerBathroom || "문의"} />
            </div>
          </section>

          {(situations.length > 0 || desiredServices.length > 0) && (
            <section className="lg:col-span-2 bg-white rounded-[24px] p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
              <h3 className="text-[15px] md:text-[16px] font-black text-[#191f28] mb-2.5 md:mb-3 flex items-center gap-2 md:gap-2.5">
                <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 선교지 소개
              </h3>
              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] overflow-hidden">
                {situations.length > 0 && <InfoRow icon={<Compass className="w-4 h-4" />} label="교회 사정/상황" value={situations.join(", ")} />}
                {desiredServices.length > 0 && <InfoRow icon={<Compass className="w-4 h-4" />} label="원하는 봉사/헌신" value={desiredServices.join(", ")} />}
              </div>
            </section>
          )}

          {(venue.tags || []).length > 0 && (
            <section className="lg:col-span-2 bg-white rounded-[24px] p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
              <h3 className="text-[15px] md:text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2 md:gap-2.5">
                <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 태그
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {venue.tags.map((tag: string) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px] font-bold bg-[#F2F4F6] text-[#6B7684]">
                    <Tag className="w-3 h-3" />{tag}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {isImageLightboxOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setIsImageLightboxOpen(false)}>
          <button type="button" onClick={() => setIsImageLightboxOpen(false)} className="absolute top-4 right-4 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-90">
            <X className="w-5 h-5" />
          </button>
          <img src={galleryImages[currentImageIndex]} className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" alt={venue.venueName} onClick={(e) => e.stopPropagation()} />
          {galleryImages.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); goToImage(currentImageIndex - 1); }} className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-90" aria-label="이전 이미지">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); goToImage(currentImageIndex + 1); }} className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-90" aria-label="다음 이미지">
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {galleryImages.map((_, i) => (
                  <button key={i} type="button" onClick={(e) => { e.stopPropagation(); goToImage(i); }} className={`rounded-full transition-all ${i === currentImageIndex ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"}`} aria-label={`${i + 1}번째 이미지`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
