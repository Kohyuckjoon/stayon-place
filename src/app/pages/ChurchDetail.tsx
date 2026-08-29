import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  ChevronLeft, ChevronRight, Phone, MapPin, Church, User, PlaySquare, Play, X, ZoomIn,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFeatureFlag } from "../lib/featureFlags";
import { FeatureDisabledScreen } from "../components/FeatureDisabledScreen";

// 다양한 형태의 유튜브 링크(watch/shorts/youtu.be/embed)에서 영상 ID만 추출한다.
function getYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId = "";
    if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.slice(1);
    } else if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") videoId = u.searchParams.get("v") || "";
      else if (u.pathname.startsWith("/shorts/")) videoId = u.pathname.split("/")[2] || "";
      else if (u.pathname.startsWith("/embed/")) videoId = u.pathname.split("/")[2] || "";
    }
    return videoId || null;
  } catch {
    return null;
  }
}

// 유튜브 공식 oEmbed API로 제목/채널명을 가져온다. 별도 API 키가 필요 없다.
function useYoutubeMeta(url: string) {
  const [meta, setMeta] = useState<{ title: string; author: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.title) {
          setMeta({ title: data.title, author: data.author_name || "" });
        }
      })
      .catch(() => { /* 제목을 못 가져와도 썸네일만으로 충분히 동작 */ });
    return () => { cancelled = true; };
  }, [url]);

  return meta;
}

function VideoCard({ url }: { url: string }) {
  const videoId = getYoutubeVideoId(url);
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const meta = useYoutubeMeta(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl overflow-hidden border border-[#f2f4f6] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all bg-white"
    >
      <div className="relative aspect-video bg-[#0f0f0f] overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PlaySquare className="w-8 h-8 text-white/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 bg-black/25 backdrop-blur-md rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <div className="w-full h-full bg-red-600 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(220,38,38,0.4)] border border-white/20">
              <Play className="w-4 h-4 text-white fill-white translate-x-[1px]" />
            </div>
          </div>
        </div>
      </div>
      {meta?.title && (
        <div className="p-2.5">
          <p className="text-[12.5px] font-bold text-[#191f28] leading-snug line-clamp-2 break-keep group-hover:text-[#10b981] transition-colors">
            {meta.title}
          </p>
          {meta.author && (
            <p className="text-[11px] font-medium text-[#8b95a1] mt-0.5 truncate">{meta.author}</p>
          )}
        </div>
      )}
    </a>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-[#f2f4f6] last:border-0">
      <div className="text-[#8b95a1] font-bold text-[14px] flex items-center gap-2.5 shrink-0 pt-0.5">
        <div className="opacity-70 shrink-0">{icon}</div>
        <span className="whitespace-nowrap">{label}</span>
      </div>
      <span className="text-[#191f28] font-black text-[14px] text-right break-keep">{value}</span>
    </div>
  );
}

export function ChurchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const churchDirectoryEnabled = useFeatureFlag("churchDirectoryEnabled");
  const [church, setChurch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const fetchChurch = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "churches", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().status === "approved") {
          setChurch(docSnap.data());
        } else {
          alert("교회 정보를 찾을 수 없습니다.");
          navigate("/churches");
        }
      } catch (error) {
        console.error("교회 정보 조회 실패:", error);
        navigate("/churches");
      } finally {
        setLoading(false);
      }
    };
    fetchChurch();
  }, [id, navigate]);

  if (!churchDirectoryEnabled) return <FeatureDisabledScreen />;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#10b981] rounded-full" />
    </div>
  );

  if (!church) return null;

  const galleryImages: string[] = (church.photos || []).filter(Boolean);
  const currentImageIndex = Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1));
  const goToImage = (idx: number) => setActiveImageIndex((idx + galleryImages.length) % galleryImages.length);
  const youtubeUrls: string[] = (church.youtubeUrls || []).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#f2f4f6] text-[#191f28] font-sans selection:bg-emerald-100 pb-40">
      <main className="max-w-[1120px] mx-auto px-4 md:px-6">
        {/* 상단 네비게이션 */}
        <section className="flex items-center justify-between pt-6 pb-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#4e5968] hover:text-[#191f28] transition-all font-bold group">
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[16px]">뒤로가기</span>
          </button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 pb-6">
          {/* 교회 사진 */}
          <section className="relative lg:col-start-1 lg:row-start-1 rounded-[24px] overflow-hidden border border-[#f2f4f6] aspect-video bg-white group">
            {galleryImages.length > 0 ? (
              <img
                src={galleryImages[currentImageIndex]}
                className="w-full h-full object-cover"
                alt={church.churchName}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#ECFDF5]">
                <Church className="w-12 h-12 text-[#6EE7B7]" />
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
          <section className="lg:col-start-2 lg:row-start-1 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6] h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                <span className="px-3.5 py-1.5 text-[12px] font-black rounded-xl bg-[#ECFDF5] text-[#10b981]">
                  {church.denomination}
                </span>
              </div>
              <h1 className="text-[24px] font-black text-[#191f28] mb-3 tracking-tighter leading-tight break-keep">
                {church.churchName}
              </h1>
              {church.introduction && (
                <p className="text-[14px] font-bold text-[#4e5968] leading-relaxed break-keep mb-4">
                  {church.introduction}
                </p>
              )}

              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] p-4 space-y-2.5">
                {church.churchAddress && (
                  <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                    <MapPin className="w-4 h-4 text-[#10b981] shrink-0" />
                    {church.churchAddress} {church.churchAddressDetail}
                  </div>
                )}
                {church.pastorName && (
                  <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                    <User className="w-4 h-4 text-[#10b981] shrink-0" />
                    담임목사 {church.pastorName}
                  </div>
                )}
              </div>
            </div>

            {church.churchContact && (
              <a
                href={`tel:${church.churchContact}`}
                className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-[#191f28] text-white rounded-2xl font-black text-[15px] hover:bg-black transition-all active:scale-[0.98]"
              >
                <Phone className="w-4 h-4" /> 전화로 문의하기
              </a>
            )}
          </section>

          {/* 비전 소개 */}
          {church.vision && (
            <section className="lg:col-span-2 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
              <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-[#10b981] rounded-full" /> 교회 비전
              </h3>
              <p className="text-[14px] font-semibold text-[#4e5968] leading-relaxed whitespace-pre-wrap break-words">
                {church.vision}
              </p>
            </section>
          )}

          {/* 유튜브 영상 */}
          {youtubeUrls.length > 0 && (
            <section className="lg:col-span-2 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
              <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-[#10b981] rounded-full" /> 교회 영상
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {youtubeUrls.map((url, i) => (
                  <VideoCard key={i} url={url} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

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
            alt={church.churchName}
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
