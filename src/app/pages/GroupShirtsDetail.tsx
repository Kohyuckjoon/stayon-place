import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import {
  ChevronLeft, ChevronRight, Shirt, Tag, X, ZoomIn, Eye, MousePointerClick,
  BadgeCheck, Banknote, ExternalLink,
} from "lucide-react";
import { motion } from "framer-motion";
import { showAlert } from "../lib/dialog";

// 상세페이지 조회수/"온라인몰 바로가기" 클릭수는 소유권 검사가 필요 없는 익명 카운터라
// 서버의 logStoreEvent(공용 함수, functions/src/index.ts)를 fire-and-forget으로 호출한다 -
// 응답을 기다리지 않아 페이지 로딩이나 외부 링크 이동이 느려지지 않는다.
const logShirtEvent = (id: string, type: "view" | "onlineStoreClick") => {
  const fn = httpsCallable(functions, "logStoreEvent");
  fn({ store: "shirts", id, type }).catch((err) => console.error("스토어 이벤트 기록 실패:", err));
};

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

// 단체티·기념품(수련회 티셔츠) 업체 상세 페이지. 로그인 없이도 누구나 열람할 수 있고,
// 개인정보 노출 우려로 상담 전화 연결은 제거됐다 - 업체가 등록한 온라인몰 링크로만 연결된다.
export function GroupShirtsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shirt, setShirt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const fetchShirt = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "groupShirts", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().status === "approved") {
          const data = docSnap.data();
          setShirt({ ...data, viewCount: (Number(data.viewCount) || 0) + 1 });
          logShirtEvent(id, "view");
        } else {
          await showAlert("업체 정보를 찾을 수 없습니다.");
          navigate("/shirts");
        }
      } catch (error) {
        console.error("업체 정보 조회 실패:", error);
        navigate("/shirts");
      } finally {
        setLoading(false);
      }
    };
    fetchShirt();
  }, [id, navigate]);

  useEffect(() => {
    if (shirt?.businessName) {
      document.title = `${shirt.businessName} | 수련회 티셔츠 | 스테이온`;
    }
  }, [shirt?.businessName]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full" />
    </div>
  );

  if (!shirt) return null;

  const galleryImages: string[] = (shirt.photos || []).filter(Boolean);
  const currentImageIndex = Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1));
  const goToImage = (idx: number) => setActiveImageIndex((idx + galleryImages.length) % galleryImages.length);
  const itemTags: string[] = (shirt.itemTags || []).filter(Boolean);
  const priceLabel = shirt.minPrice ? `${Number(shirt.minPrice).toLocaleString()}원부터` : "가격 문의";

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
                alt={shirt.businessName}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#F2F8FF]">
                <Shirt className="w-12 h-12 text-[#93C5FD]" />
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
                <span className="px-3.5 py-1.5 text-[12px] font-black rounded-xl bg-[#F2F8FF] text-[#3182f6]">
                  수련회 티셔츠
                </span>
                {shirt.businessRegistrationNumber && (
                  <span className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[12px] font-black rounded-xl bg-[#ECFDF5] text-[#10b981]">
                    <BadgeCheck className="w-3.5 h-3.5" /> 사업자인증
                  </span>
                )}
              </div>
              <h1 className="text-[22px] md:text-[24px] font-black text-[#191f28] mb-2 tracking-tighter leading-tight break-keep">
                {shirt.businessName}
              </h1>
              <div className="flex items-center gap-3 mb-2.5 md:mb-3 text-[12px] font-bold text-[#8b95a1]">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> 조회 {Number(shirt.viewCount || 0).toLocaleString()}
                </span>
                {shirt.onlineStoreUrl && (
                  <span className="flex items-center gap-1">
                    <MousePointerClick className="w-3.5 h-3.5" /> 바로가기 클릭 {Number(shirt.onlineStoreClickCount || 0).toLocaleString()}
                  </span>
                )}
              </div>
              {shirt.introduction && (
                <p className="text-[14px] font-bold text-[#4e5968] leading-relaxed break-keep mb-3 md:mb-4">
                  {shirt.introduction}
                </p>
              )}

              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] p-3.5 md:p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                  <Banknote className="w-4 h-4 text-[#3182f6] shrink-0" />
                  {priceLabel}
                </div>
              </div>
            </div>

            <div className="mt-3 md:mt-4 flex flex-col gap-2">
              {shirt.onlineStoreUrl && (
                <a
                  href={shirt.onlineStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (id) logShirtEvent(id, "onlineStoreClick");
                    setShirt((prev: any) => ({ ...prev, onlineStoreClickCount: (Number(prev.onlineStoreClickCount) || 0) + 1 }));
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 md:py-4 bg-[#3182f6] text-white rounded-2xl font-black text-[15px] hover:bg-[#1b64da] transition-all active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" /> 온라인몰 바로가기
                </a>
              )}
            </div>
          </section>

          {/* 취급 품목 / 가격 */}
          {(itemTags.length > 0 || shirt.minPrice) && (
            <section className="lg:col-span-2 bg-white rounded-[24px] p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
              <h3 className="text-[15px] md:text-[16px] font-black text-[#191f28] mb-2.5 md:mb-3 flex items-center gap-2 md:gap-2.5">
                <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 취급 품목 &amp; 가격
              </h3>
              {itemTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
                  {itemTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-bold bg-[#F2F4F6] text-[#4e5968]">
                      <Tag className="w-3 h-3" /> {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] overflow-hidden">
                <InfoRow icon={<Banknote className="w-4 h-4" />} label="개당 최소가" value={priceLabel} />
              </div>
            </section>
          )}

          {/* 상세 설명 */}
          {shirt.description && (
            <section className="lg:col-span-2 bg-white rounded-[24px] p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
              <h3 className="text-[15px] md:text-[16px] font-black text-[#191f28] mb-2.5 md:mb-3 flex items-center gap-2 md:gap-2.5">
                <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 상세 설명
              </h3>
              <p className="text-[14px] font-semibold text-[#4e5968] leading-relaxed whitespace-pre-wrap break-words">
                {shirt.description}
              </p>
            </section>
          )}

          {/* 상품 목록 - /teams 카드뷰와 동일하게, 카드들을 또 다른 흰 카드로 감싸지 않고
              페이지 배경 위에 바로 노출한다 (/teams가 카드 그리드를 감싸는 컨테이너 카드 없이 쓰는 것과 동일).
              지금은 3개씩(grid-cols-2 sm:grid-cols-3), 추후 한 줄 5개로 늘릴 계획이라 컬럼 클래스만 바꾸면 됨. */}
          {Array.isArray(shirt.products) && shirt.products.length > 0 && (
            <div className="lg:col-span-2">
              <h3 className="text-[15px] md:text-[16px] font-black text-[#191f28] mb-2.5 md:mb-3 flex items-center gap-2 md:gap-2.5">
                <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 상품 목록
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {shirt.products.map((product: any) => (
                  <div
                    key={product.id}
                    className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500"
                  >
                    <div className="relative aspect-video overflow-hidden bg-[#F2F4F6]">
                      {product.photo ? (
                        <img src={product.photo} className="w-full h-full object-cover" alt={product.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Shirt className="w-6 h-6 text-[#D1D6DB]" />
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 flex flex-col gap-1">
                      <h4 className="text-[13px] font-black text-[#191f28] line-clamp-1">{product.name || "상품"}</h4>
                      {product.description && (
                        <p className="text-[10.5px] font-bold text-[#8b95a1] line-clamp-2 break-keep">{product.description}</p>
                      )}
                      {product.price > 0 && (
                        <span className="self-end px-2.5 py-1 rounded-lg text-[13px] font-black bg-[#F2F8FF] text-[#3182f6]">
                          {Number(product.price).toLocaleString()}원
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            alt={shirt.businessName}
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
