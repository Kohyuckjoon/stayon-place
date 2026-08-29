import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import {
  ChevronLeft, ChevronRight, Phone, User, Church, Mic2, Users, Speaker, MapPinned,
  PlaySquare, Check, Lock, X, Copy, Play, ChevronDown, Info, ZoomIn, Camera, AtSign,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { REGION_OPTIONS as ALL_REGIONS } from "../lib/regions";
import { getEquipmentBadges, getIndividualBadgeLabel } from "../lib/teamDisplay";

// 처음 보는 사람도 바로 이해할 수 있도록, 값만 보여주지 않고 쉬운 설명을 함께 붙인다.
const EQUIPMENT_DESCRIPTIONS: Record<string, string> = {
  "자체 보유": "필요한 장비를 모두 보유하고 있어요",
  "장소 장비 필요": "보유 장비가 없으므로 장비를 제공해주셔야 해요",
  "둘 다 가능": "장비를 보유하고 있고, 장소 장비도 다룰 수 있어요",
};

const getCategoryStyle = (category: string) => {
  switch (category) {
    case "찬양팀": return { bg: "bg-[#E8F3FF]", text: "text-[#3182F6]" };
    case "음향·조명": return { bg: "bg-[#F5F3FF]", text: "text-[#8B5CF6]" };
    case "찬양사역자": return { bg: "bg-[#FFF0F6]", text: "text-[#F04452]" };
    case "세션": return { bg: "bg-[#E7F9F3]", text: "text-[#00D082]" };
    case "외부 강사": return { bg: "bg-[#FFF7E6]", text: "text-[#F59E0B]" };
    case "레크리에이션 강사": return { bg: "bg-[#E6FFFA]", text: "text-[#14B8A6]" };
    case "기독교 문화 사역": return { bg: "bg-[#EEF2FF]", text: "text-[#6366F1]" };
    default: return { bg: "bg-[#F2F4F6]", text: "text-[#8B95A1]" };
  }
};

const INSTRUCTOR_CATEGORIES = ["외부 강사", "레크리에이션 강사"];

const videoSlideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -32 : 32, opacity: 0 }),
};

// 개인정보 보호를 위해 목록/상세 화면에서는 가운데 자리를 가려서 보여준다.
// 문의 집계용 이벤트 기록. 사용자 경험에 영향 없이 조용히 실패해도 무방하다.
function logContactEvent(teamId: string, type: "reveal" | "copy" | "call") {
  const fn = httpsCallable(functions, "logTeamContactEvent");
  fn({ teamId, type }).catch(() => { /* 집계 실패는 무시 */ });
}

function maskPhone(phone: string): string {
  const parts = phone.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-${"*".repeat(parts[1].length)}-${parts[2]}`;
  }
  return phone;
}

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

// 인스타그램/쓰레드는 유튜브 oEmbed 같은 공개 API가 없어서(사업자 인증 토큰 필요·쓰레드는
// 아예 없음) 실제 게시물 썸네일을 가져올 수 없다. 대신 URL에서 계정 핸들만 뽑아
// 브랜드 컬러 카드로 "바로가기" 형태로 보여준다.
function getInstagramHandle(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("instagram.com")) return null;
    const seg = u.pathname.split("/").filter(Boolean)[0];
    if (!seg || ["p", "reel", "tv", "stories"].includes(seg)) return null;
    return `@${seg}`;
  } catch {
    return null;
  }
}

function getThreadsHandle(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("threads.net") && !u.hostname.includes("threads.com")) return null;
    const seg = u.pathname.split("/").filter(Boolean)[0];
    if (!seg) return null;
    return seg.startsWith("@") ? seg : `@${seg}`;
  } catch {
    return null;
  }
}

function SocialLinkCard({ platform, url }: { platform: "instagram" | "threads"; url: string }) {
  const isInstagram = platform === "instagram";
  const handle = isInstagram ? getInstagramHandle(url) : getThreadsHandle(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] ${isInstagram
        ? "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45]"
        : "bg-[#191f28]"
        }`}
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
        {isInstagram ? <Camera className="w-5 h-5 text-white" /> : <AtSign className="w-5 h-5 text-white" />}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-black text-white">{isInstagram ? "Instagram" : "Threads"}</p>
        <p className="text-[12px] font-bold text-white/80 truncate">{handle || "바로가기"}</p>
      </div>
    </a>
  );
}

export function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  const [isExtraHistoryOpen, setIsExtraHistoryOpen] = useState(false);
  const [videoPage, setVideoPage] = useState(0);
  const [videoSlideDirection, setVideoSlideDirection] = useState(1);
  const [isMobileVideosExpanded, setIsMobileVideosExpanded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "ministryTeams", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().status === "approved") {
          setTeam(docSnap.data());
        } else {
          alert("사역팀 정보를 찾을 수 없습니다.");
          navigate("/teams");
        }
      } catch (error) {
        console.error("사역팀 정보 조회 실패:", error);
        navigate("/teams");
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [id, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full" />
    </div>
  );

  if (!team) return null;

  const style = getCategoryStyle(team.category);
  // 기존에 posterImage(단일 문자열)만 있던 팀도 있으므로, posterImages 배열이 없으면
  // posterImage 하나짜리 배열로 대체한다.
  const galleryImages: string[] = (team.posterImages?.length ? team.posterImages : [team.posterImage]).filter(Boolean);
  const currentImageIndex = Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1));
  const goToImage = (idx: number) => setActiveImageIndex((idx + galleryImages.length) % galleryImages.length);
  const sessionLabel = team.sessionPart === "직접 입력" ? team.sessionPartCustom : team.sessionPart;
  const individualBadge = team.isIndividual ? getIndividualBadgeLabel(team.category, sessionLabel, team.categoryCustom) : null;
  const isInstructorCategory = INSTRUCTOR_CATEGORIES.includes(team.category);
  // 대표 링크(youtubeUrl)를 항상 먼저, 그 뒤로 활동 이력 링크들을 이어 붙인다.
  const allVideoUrls: string[] = [team.youtubeUrl, ...(team.activityVideoUrls || [])].filter(Boolean);
  const VIDEOS_PER_PAGE = 4;
  const videoTotalPages = Math.max(1, Math.ceil(allVideoUrls.length / VIDEOS_PER_PAGE));
  const currentVideoPage = Math.min(videoPage, videoTotalPages - 1);
  const visibleDesktopVideos = allVideoUrls.slice(
    currentVideoPage * VIDEOS_PER_PAGE,
    currentVideoPage * VIDEOS_PER_PAGE + VIDEOS_PER_PAGE
  );
  const MOBILE_COLLAPSED_COUNT = 2;
  const visibleMobileVideos = isMobileVideosExpanded ? allVideoUrls : allVideoUrls.slice(0, MOBILE_COLLAPSED_COUNT);

  const goToVideoPage = (page: number) => {
    setVideoSlideDirection(page > currentVideoPage ? 1 : -1);
    setVideoPage(page);
  };

  return (
    <div className="min-h-screen bg-[#f2f4f6] text-[#191f28] font-sans selection:bg-blue-100 pb-40">
      <main className="max-w-[1120px] mx-auto px-4 md:px-6">
        {/* 상단 네비게이션 */}
        <section className="flex items-center justify-between pt-6 pb-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#4e5968] hover:text-[#191f28] transition-all font-bold group">
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[16px]">뒤로가기</span>
          </button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 pb-6">
          {/* 포스터 이미지 */}
          <section className="relative lg:col-start-1 lg:row-start-1 rounded-[24px] overflow-hidden border border-[#f2f4f6] aspect-video bg-white group">
            <img
              src={galleryImages[currentImageIndex] || "/STAYON_TEAM_COVER_IMAGE.png"}
              className="w-full h-full object-cover"
              alt={team.teamName}
            />

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

            <button
              type="button"
              onClick={() => setIsImageLightboxOpen(true)}
              className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 bg-black/40 backdrop-blur-md text-white rounded-full text-[11px] font-bold hover:bg-black/60 transition-all active:scale-95"
            >
              <ZoomIn className="w-3.5 h-3.5" /> 확대해서 보기
            </button>
          </section>

          {/* 타이틀/대표자/연락처 카드 */}
          <section className="lg:col-start-2 lg:row-start-1 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6] h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                <span className={`px-3.5 py-1.5 text-[12px] font-black rounded-xl ${style.bg} ${style.text}`}>
                  {team.category}
                </span>
                {team.category === "기독교 문화 사역" && team.categoryCustom && !team.isIndividual && (
                  <span className="px-3.5 py-1.5 text-[12px] font-black rounded-xl bg-[#F2F4F6] text-[#4E5968]">
                    {team.categoryCustom}
                  </span>
                )}
                {individualBadge && (
                  <span className={`px-3.5 py-1.5 text-[12px] font-black rounded-xl ${style.bg} ${style.text}`}>
                    {individualBadge}
                  </span>
                )}
              </div>
              <h1 className="text-[24px] font-black text-[#191f28] mb-3 tracking-tighter leading-tight break-keep">
                {team.teamName}
              </h1>

              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                  <User className="w-4 h-4 text-[#3182f6] shrink-0" />
                  {team.applicantName} | {team.category}
                </div>
                {team.applicantContact && (
                  <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                    <Phone className="w-4 h-4 text-[#3182f6] shrink-0" />
                    {maskPhone(team.applicantContact)}
                  </div>
                )}
              </div>
            </div>

            {team.applicantContact && (
              <button
                type="button"
                onClick={() => {
                  setShowContactModal(true);
                  if (id) logContactEvent(id, "reveal");
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-[#191f28] text-white rounded-2xl font-black text-[15px] hover:bg-black transition-all active:scale-[0.98]"
              >
                <Phone className="w-4 h-4" /> 전화로 문의하기
              </button>
            )}
          </section>

          {/* 소속 정보 */}
          {team.hasChurch && (
            <section className="lg:col-start-1 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
              <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 소속 정보
              </h3>
              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] overflow-hidden">
                <InfoRow
                  icon={<Church className="w-4 h-4" />}
                  label="소속 교회"
                  value={
                    team.churchNamePrivate ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F2F4F6] text-[#6b7684] rounded-lg text-[12px] font-black">
                        <Lock className="w-3 h-3" /> 비공개
                      </span>
                    ) : (team.churchName || "-")
                  }
                />
                <InfoRow
                  icon={<Church className="w-4 h-4" />}
                  label="소속 교단"
                  value={team.denomination || "-"}
                />
                <InfoRow
                  icon={<Check className="w-4 h-4" />}
                  label="교단 인증 여부"
                  value={
                    <span className="inline-flex items-center gap-1 text-[#3182f6] font-black whitespace-nowrap">
                      <span className="bg-[#3182f6] rounded-full p-0.5 shrink-0"><Check className="w-2.5 h-2.5 text-white" strokeWidth={4} /></span>
                      정상교단 인증 완료
                    </span>
                  }
                  last
                />
              </div>
            </section>
          )}

          {/* 활동 이력 / 경력 소개 */}
          <section className={`bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6] ${team.hasChurch ? "lg:col-start-2" : "lg:col-start-1"}`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[16px] font-black text-[#191f28] flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 활동 이력 / 경력 소개
              </h3>
              {team.showExtraHistory && team.extraHistory && (
                <button
                  type="button"
                  onClick={() => setIsExtraHistoryOpen(!isExtraHistoryOpen)}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold text-[#3182f6] bg-[#f2f8ff] hover:bg-[#e8f3ff] transition-all active:scale-95"
                >
                  {isExtraHistoryOpen ? "접기" : "더보기"}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExtraHistoryOpen ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
            <p className="text-[14px] font-semibold text-[#4e5968] leading-relaxed whitespace-pre-wrap break-words">
              {team.experience || "등록된 소개 내용이 없어요."}
            </p>
            <AnimatePresence>
              {isExtraHistoryOpen && team.showExtraHistory && team.extraHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-5 border-t-2 border-dashed border-[#e5e8eb]">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div className="w-1.5 h-1.5 bg-[#3182f6] rounded-full" />
                      <span className="text-[12px] font-black text-[#3182f6] uppercase tracking-wider">추가 이력</span>
                    </div>
                    <div className="bg-[#f2f8ff] rounded-2xl border border-[#e8f3ff] p-4">
                      <p className="text-[14px] font-semibold text-[#4e5968] leading-relaxed whitespace-pre-wrap break-words">
                        {team.extraHistory}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* 팀 상세 정보 */}
          <section className="lg:col-span-2 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
            <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
              <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 팀 상세 정보
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <CheckItem icon={<Users className="w-5 h-5" />} label="구분" value={team.isIndividual ? "개인" : "팀"} />
              {!team.isIndividual && (
                <CheckItem icon={<Users className="w-5 h-5" />} label="팀 규모" value={team.teamSize || "-"} />
              )}
              {team.isIndividual && sessionLabel && (
                <CheckItem icon={<Mic2 className="w-5 h-5" />} label="세션 파트" value={sessionLabel} />
              )}
              {!team.isIndividual && team.teamComposition?.length > 0 && (
                <CheckItem icon={<Mic2 className="w-5 h-5" />} label="팀 구성" value={team.teamComposition.join(", ")} />
              )}
              {!team.isIndividual && !isInstructorCategory && (
                <CheckItem icon={<Speaker className="w-5 h-5" />} label="음향 담당자" value={team.hasSoundEngineer ? "있음" : "없음"} />
              )}
              {!isInstructorCategory && (
                <CheckItem
                  icon={<Speaker className="w-5 h-5" />}
                  label="장비 보유 여부"
                  value={
                    team.equipment ? (
                      <>
                        <span className="flex flex-wrap justify-end gap-1">
                          {getEquipmentBadges(team.equipment).map((badge) => (
                            <span key={badge} className="inline-block px-2 py-0.5 bg-[#f2f8ff] text-[#3182f6] rounded-md text-[12px] font-black">
                              {badge}
                            </span>
                          ))}
                        </span>
                        <span className="block text-[12px] font-bold text-[#8b95a1] mt-1">
                          {EQUIPMENT_DESCRIPTIONS[team.equipment] || ""}
                        </span>
                      </>
                    ) : "-"
                  }
                />
              )}
              {team.serviceRegions?.length > 0 && (
                <CheckItem
                  icon={<MapPinned className="w-5 h-5" />}
                  label={isInstructorCategory ? "진행 가능 지역" : "집회(반주) 가능 허용 지역"}
                  value={
                    team.serviceRegions.length >= ALL_REGIONS.length
                      ? (isInstructorCategory ? "전국 지역 진행 가능" : "전국 지역 집회(반주) 가능")
                      : team.serviceRegions.join(", ")
                  }
                />
              )}
            </div>
          </section>

          {/* 활동 영상 / SNS */}
          {(allVideoUrls.length > 0 || team.instagramUrl || team.threadsUrl) && (
            <section className="lg:col-span-2 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-[16px] font-black text-[#191f28] flex items-center gap-2.5">
                  <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 활동 영상 / SNS
                </h3>
                {allVideoUrls.length > MOBILE_COLLAPSED_COUNT && (
                  <button
                    type="button"
                    onClick={() => setIsMobileVideosExpanded(!isMobileVideosExpanded)}
                    className="md:hidden shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-bold text-[#3182f6] bg-[#f2f8ff] hover:bg-[#e8f3ff] transition-all active:scale-95"
                  >
                    {isMobileVideosExpanded ? "접기" : "더보기"}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMobileVideosExpanded ? "rotate-180" : ""}`} />
                  </button>
                )}
              </div>

              {(team.instagramUrl || team.threadsUrl) && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {team.instagramUrl && <SocialLinkCard platform="instagram" url={team.instagramUrl} />}
                  {team.threadsUrl && <SocialLinkCard platform="threads" url={team.threadsUrl} />}
                </div>
              )}

              {/* PC: 4개씩 그리드 + 화살표/인디케이터 페이지네이션 */}
              {allVideoUrls.length > 0 && (
              <>
              <div className="hidden md:block overflow-hidden">
                <AnimatePresence mode="wait" custom={videoSlideDirection} initial={false}>
                  <motion.div
                    key={currentVideoPage}
                    custom={videoSlideDirection}
                    variants={videoSlideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="grid grid-cols-4 gap-3"
                  >
                    {visibleDesktopVideos.map((url, i) => (
                      <VideoCard key={i} url={url} />
                    ))}
                  </motion.div>
                </AnimatePresence>
                {videoTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => goToVideoPage(Math.max(0, currentVideoPage - 1))}
                      disabled={currentVideoPage === 0}
                      className="p-1.5 rounded-full border border-[#e5e8eb] text-[#8b95a1] hover:border-[#3182f6] hover:text-[#3182f6] transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: videoTotalPages }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => goToVideoPage(i)}
                          className={`rounded-full transition-all ${i === currentVideoPage ? "w-5 h-1.5 bg-[#3182f6]" : "w-1.5 h-1.5 bg-[#e5e8eb] hover:bg-[#d1d6db]"}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => goToVideoPage(Math.min(videoTotalPages - 1, currentVideoPage + 1))}
                      disabled={currentVideoPage === videoTotalPages - 1}
                      className="p-1.5 rounded-full border border-[#e5e8eb] text-[#8b95a1] hover:border-[#3182f6] hover:text-[#3182f6] transition-all disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 모바일: 가로 스크롤, 기본 2개까지만 노출(더보기로 전체 해제) */}
              <div className="md:hidden -mx-5 px-5 flex gap-3 overflow-x-auto no-scrollbar">
                {visibleMobileVideos.map((url, i) => (
                  <VideoCard key={i} url={url} className="w-[78%] shrink-0" />
                ))}
              </div>
              </>
              )}
            </section>
          )}
        </div>
      </main>

      {showContactModal && team.applicantContact && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#191f28]/80 backdrop-blur-md"
          onClick={() => setShowContactModal(false)}
        >
          <div className="bg-white w-full max-w-[300px] rounded-3xl p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-black text-[#191f28]">전화 문의</h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="p-1 rounded-full hover:bg-[#f2f4f6] transition-all"
              >
                <X className="w-4 h-4 text-[#8b95a1]" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 mb-3 px-3 py-2 bg-[#f0f7ff] rounded-xl">
              <Info className="w-3.5 h-3.5 text-[#3182f6] shrink-0" />
              <p className="text-[11.5px] font-bold text-[#3182f6] leading-snug break-keep">
                "스테이온 플랫폼에서 보고 문의드립니다"라고 하시면 더 빠른 문의가 가능해요.
              </p>
            </div>

            <div className="bg-[#f9fafb] rounded-2xl p-3.5 mb-3">
              <p className="text-[11px] font-bold text-[#8b95a1] mb-1 truncate">{team.teamName}</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[18px] font-black text-[#191f28] tracking-tight">
                  {maskPhone(team.applicantContact)}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(team.applicantContact);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                      if (id) logContactEvent(id, "copy");
                    } catch {
                      /* 클립보드 접근 실패 시 조용히 무시 */
                    }
                  }}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition-all ${copied
                    ? "border-[#3182f6] bg-[#f2f8ff] text-[#3182f6]"
                    : "border-[#e5e8eb] bg-white text-[#4e5968] hover:border-[#3182f6] hover:text-[#3182f6]"
                    }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "복사됨" : "복사"}
                </button>
              </div>
            </div>

            <a
              href={`tel:${team.applicantContact}`}
              onClick={() => { if (id) logContactEvent(id, "call"); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#191f28] text-white rounded-2xl font-black text-[14px] hover:bg-black transition-all active:scale-[0.98]"
            >
              <Phone className="w-4 h-4" /> 전화로 문의하기
            </a>
          </div>
        </div>
      )}

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
            alt={team.teamName}
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

// 유튜브 공식 oEmbed API로 제목/채널명을 가져온다. 별도 API 키가 필요 없고,
// 기존에 등록된 영상에도 소급 적용된다. 실패해도 썸네일만으로 카드는 정상 동작한다.
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

function VideoCard({ url, className = "" }: { url: string; className?: string }) {
  const videoId = getYoutubeVideoId(url);
  const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const meta = useYoutubeMeta(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`group block rounded-2xl overflow-hidden border border-[#f2f4f6] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all bg-white ${className}`}
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
          <p className="text-[12.5px] font-bold text-[#191f28] leading-snug line-clamp-2 break-keep group-hover:text-[#3182f6] transition-colors">
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

function CheckItem({ icon, label, value }: any) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white rounded-2xl border border-[#f2f4f6]">
      <div className="flex items-center gap-2.5">
        <div className="text-[#3182f6] bg-[#f2f8ff] p-2 rounded-xl">
          {icon}
        </div>
        <span className="text-[#8b95a1] font-bold text-[13px]">{label}</span>
      </div>
      <div className="text-[#191f28] font-black text-[15px] leading-relaxed">
        {value}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, last }: any) {
  return (
    <div className={`flex items-start justify-between gap-3 px-5 py-3.5 ${!last ? "border-b border-[#f2f4f6]" : ""}`}>
      <div className="text-[#8b95a1] font-bold text-[14px] flex items-center gap-2.5 shrink-0 pt-0.5">
        <div className="opacity-70 shrink-0">{icon}</div>
        <span className="whitespace-nowrap">{label}</span>
      </div>
      <span className="text-[#191f28] font-black text-[14px] text-right break-keep">{value}</span>
    </div>
  );
}
