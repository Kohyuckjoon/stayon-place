import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { doc, getDoc, collection, query, where, onSnapshot, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import { isAdminEmail } from "../lib/adminEmails";
import {
  ChevronLeft, MapPin, Share2, Phone, Users,
  Car, Wind, Volume2, Info, Check,
  Square, Layout as LayoutIcon, Calendar, Monitor,
  Home, Coffee, Utensils, Lock, ChefHat, ShoppingBag, Ban, AlertCircle, X,
  ChevronRight, Maximize2, MessageSquare, Pencil, Trash2, Plus, Bath, Camera
} from "lucide-react";
import { VENUE_IMAGE_CATEGORIES, toDisplayImagesByCategory } from "../lib/venueImageCategories";
import { motion, AnimatePresence } from "framer-motion";
import { loginWithGoogle } from "../lib/auth";
import AvailabilityCalendar from '../pages/AvailabilityCalendar';

export function VenueDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [realBookings, setRealBookings] = useState<any[]>([]);

  // 이미지 확대를 위한 상태 값
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 이미지 슬라이더 제어를 위한 ref 및 상태
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  // 컴포넌트 내부 상단에 ref 선언
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // 상단 탭("장소 상세 정보" / "사진" / "장소 리뷰 보기") 제어용 상태 및 스크롤 대상.
  // "사진" 탭은 스크롤 이동 없이 히어로 갤러리 영역 자체를 카테고리별 사진 보기로
  // 즉시 바꿔치기하는 용도라 별도 스크롤 대상 섹션이 없다 - "정보"/"리뷰"만 실제로 스크롤한다.
  const [activeInfoTab, setActiveInfoTab] = useState<"info" | "photos" | "reviews">("info");
  const reviewSectionRef = useRef<HTMLDivElement>(null);
  const [venueReviews, setVenueReviews] = useState<any[]>([]);

  const goToTab = (tab: "info" | "photos" | "reviews") => {
    setActiveInfoTab(tab);
    if (tab === "reviews") {
      reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 사용자가 버튼 클릭 없이 직접 스크롤해서 위/아래로 이동해도, 현재 보고 있는
  // 위치에 맞춰 탭 활성 상태가 자동으로 따라가도록 스크롤 위치를 감시.
  // "사진" 탭은 스크롤과 무관한 상태라, 리뷰 섹션에 도달하기 전까지는 건드리지 않는다
  // (그렇지 않으면 스크롤 1px만 움직여도 카테고리 보기가 원래 갤러리로 되돌아가버린다).
  useEffect(() => {
    const handleScroll = () => {
      if (reviewSectionRef.current && reviewSectionRef.current.getBoundingClientRect().top <= 140) {
        setActiveInfoTab("reviews");
      } else {
        setActiveInfoTab((prev) => (prev === "photos" ? "photos" : "info"));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 좌/우 스크롤 함수 (버튼 클릭 시 실행)
  const handleScrollThumbnails = (direction: 'left' | 'right') => {
    if (!thumbnailContainerRef.current) return;

    // 한 번 클릭할 때 이동할 거리 (썸네일 너비 + gap 감안 약 200px)
    const scrollAmount = 200;
    const targetScroll =
      thumbnailContainerRef.current.scrollLeft +
      (direction === 'left' ? -scrollAmount : scrollAmount);

    thumbnailContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth',
    });
  };

  // 1. 실시간 예약 확정 데이터 가져오기 (기존 로직 유지)
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "bookings"),
      where("venueId", "==", id),
      where("status", "in", ["approved", "deposit_paid"])
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRealBookings(bookingData);
    });
    return () => unsubscribe();
  }, [id]);

  // 2. 장소 정보 가져오기 (기존 로직 유지)
  useEffect(() => {
    const fetchVenue = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "venues", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVenue(docSnap.data());
        } else {
          alert("장소를 찾을 수 없습니다.");
          navigate("/venues");
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVenue();
    window.scrollTo(0, 0);
  }, [id, navigate]);

  // 장소 정보를 불러온 뒤 탭 제목을 이 장소 이름으로 구체화한다.
  // (Layout.tsx가 라우트 진입 시 넣어둔 일반 제목을 덮어쓴다. 카카오톡 미리보기용
  // functions/src/venuePreview.ts와 문구를 통일했다.)
  useEffect(() => {
    if (venue?.venueName) {
      document.title = `${venue.venueName} 수련회 장소 소개 | 스테이온(STAYON PLACE)`;
    }
  }, [venue?.venueName]);

  // 3. 이 장소의 리뷰 가져오기 (venueId 기준으로 정확히 연결된 리뷰만)
  const fetchVenueReviews = async () => {
    if (!id) return;
    try {
      const q = query(collection(db, "reviews"), where("venueId", "==", id));
      const snapshot = await getDocs(q);
      const reviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      reviews.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setVenueReviews(reviews);
    } catch (error) {
      console.error("리뷰 조회 실패:", error);
    }
  };

  useEffect(() => {
    fetchVenueReviews();
  }, [id]);

  // 리뷰 작성 후 돌아왔을 때 자동으로 리뷰 섹션까지 스크롤 이동
  useEffect(() => {
    if ((location.state as any)?.scrollToReviews) {
      setActiveInfoTab("reviews");
      setTimeout(() => {
        reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueReviews.length]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm("이 리뷰를 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "reviews", reviewId));
      setVenueReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (error) {
      console.error("리뷰 삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 메인 슬라이더 스크롤 이동 로직
  const scrollToImage = (index: number) => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({
        left: width * index,
        behavior: 'smooth'
      });
      setCurrentImgIdx(index);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: venue.venueName,
          text: `${venue.venueName} - 스테이온에서 확인해보세요.`,
          url: window.location.href,
        });
      } catch (err) { console.log("공유 취소됨"); }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("링크가 복사되었습니다.");
    }
  };

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (venue?.images) {
      const nextIdx = (currentImgIdx + 1) % venue.images.length;
      if (isModalOpen) {
        setCurrentImgIdx(nextIdx);
      } else {
        scrollToImage(nextIdx); // 메인 화면에선 스크롤 이동
      }
    }
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (venue?.images) {
      const prevIdx = (currentImgIdx - 1 + venue.images.length) % venue.images.length;
      if (isModalOpen) {
        setCurrentImgIdx(prevIdx);
      } else {
        scrollToImage(prevIdx); // 메인 화면에선 스크롤 이동
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full" />
    </div>
  );

  if (!venue) return null;

  return (
    <div className="min-h-screen bg-[#f2f4f6] text-[#191f28] font-sans selection:bg-blue-100 pb-40">
      <main className="max-w-[1120px] mx-auto px-4 md:px-6">
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center"
            >
              {/* [UI 수정] 상단 헤더 영역 - 토스 스타일 간격 조정 */}
              <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center text-white z-[210]">
                <span className="font-bold text-[16px] opacity-70 tracking-tight">{currentImgIdx + 1} / {venue.images.length}</span>
                <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-95">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* [UI 수정] 좌측 이동 버튼 - 모바일에서도 클릭하기 편하게 최적화 */}
              {venue.images?.length > 1 && (
                <button onClick={prevImg} className="absolute left-4 p-4 text-white/30 hover:text-white transition-all bg-white/5 rounded-full z-[210] hidden md:block">
                  <ChevronLeft className="w-8 h-8" />
                </button>
              )}

              {/* [UI 수정] 이미지 크기 최적화 - 너무 크지 않도록 max-w 및 padding 조정 */}
              {/* <motion.div
                key={currentImgIdx}
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="relative w-full h-full flex items-center justify-center p-10 md:p-24"
              >
                <img
                  src={venue.images[currentImgIdx]}
                  className="max-w-full max-h-[75vh] rounded-3xl object-contain shadow-2xl"
                  alt="확대 보기"
                />
              </motion.div> */}
              <motion.div
                key={currentImgIdx}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, { offset, velocity }) => {
                  if (offset.x > 100) prevImg(e as any);
                  else if (offset.x < -100) nextImg(e as any);
                }}
                className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
              >
                <img
                  src={venue.images[currentImgIdx]}
                  className="w-full h-full object-contain"
                  alt="확대 보기"
                />
              </motion.div>

              {/* [UI 수정] 우측 이동 버튼 */}
              {venue.images?.length > 1 && (
                <button onClick={nextImg} className="absolute right-4 p-4 text-white/30 hover:text-white transition-all bg-white/5 rounded-full z-[210] hidden md:block">
                  <ChevronRight className="w-8 h-8" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 상단 네비게이션 */}
        <section className="flex items-center justify-between pt-6 pb-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#4e5968] hover:text-[#191f28] transition-all font-bold group">
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[16px]">뒤로가기</span>
          </button>
          <button onClick={handleShare} className="flex items-center gap-2 text-[#4e5968] font-bold px-1 hover:bg-gray-100 p-2 rounded-xl transition-all">
            <Share2 className="w-5 h-5" />
          </button>
        </section>

        {/* 장소 상세 정보 / 장소 리뷰 보기 탭 - 리뷰 탭 클릭 시 하단 리뷰 섹션으로 스크롤 이동 */}
        <div className="flex bg-[#f2f4f6] p-1.5 rounded-2xl w-fit mb-5">
          <button
            onClick={() => goToTab("info")}
            className={`px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all ${activeInfoTab === "info" ? "bg-white text-[#3182f6] shadow-sm" : "text-[#6b7684]"
              }`}
          >
            장소 상세 정보
          </button>
          <button
            onClick={() => goToTab("photos")}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all ${activeInfoTab === "photos" ? "bg-white text-[#3182f6] shadow-sm" : "text-[#6b7684]"
              }`}
          >
            <Camera className="w-4 h-4" />
            사진
          </button>
          <button
            onClick={() => goToTab("reviews")}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all ${activeInfoTab === "reviews" ? "bg-white text-[#3182f6] shadow-sm" : "text-[#6b7684]"
              }`}
          >
            <MessageSquare className="w-4 h-4" />
            장소 리뷰 보기{venueReviews.length > 0 ? ` (${venueReviews.length})` : ""}
          </button>
        </div>

        {/* [배치 개편] 데스크탑: 이미지-정보 2단 히어로, 예약현황/CTA/상세정보는 전체 폭으로 펼침. 모바일: 순서대로 세로 스택 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-start">
          {/* 이미지 갤러리 + 썸네일 (좌측 상단) - "사진" 탭을 누르면 스크롤 이동 없이
              이 영역만 카테고리별 사진 보기로 즉시 바뀐다. 예약 캘린더/CTA/상세정보/리뷰는
              그대로 유지되고, "정보" 탭을 다시 누르면 원래 갤러리로 돌아온다. */}
          <div className="lg:col-start-1 lg:row-start-1">
            {/* 순수 디졸브(투명도만 크로스페이드, 슬라이드나 높이 애니메이션 없음)로만
                전환한다 - 높이까지 같이 애니메이션하려던 이전 시도들이 오히려 더
                버벅이는 원인이었다. 높이는 그냥 즉시 바뀌고, 그 위의 내용만 부드럽게
                겹쳐서 사라지고/나타난다. */}
            <AnimatePresence mode="popLayout" initial={false}>
            {activeInfoTab === "photos" ? (() => {
              const displayByCategory = toDisplayImagesByCategory(venue);
              const categoriesWithPhotos = VENUE_IMAGE_CATEGORIES.filter(
                (c) => (displayByCategory[c.key]?.length || 0) > 0
              );
              let runningOffset = 0;
              return (
                <motion.div
                  key="photos"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="bg-white rounded-[32px] border border-[#f2f4f6] shadow-inner p-5 max-h-[520px] overflow-y-auto">
                  {categoriesWithPhotos.length === 0 ? (
                    <p className="text-[13px] text-[#8b95a1] font-bold text-center py-16">등록된 사진이 없어요</p>
                  ) : (
                    <div className="space-y-5">
                      {categoriesWithPhotos.map((category) => {
                        const photos = displayByCategory[category.key] || [];
                        const offset = runningOffset;
                        runningOffset += photos.length;
                        return (
                          <div key={category.key}>
                            <p className="text-[13px] font-bold text-[#6b7684] mb-2.5">
                              {category.label} <span className="text-[#adb5bd] font-bold">{photos.length}</span>
                            </p>
                            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                              {photos.map((img, idx) => (
                                <button
                                  key={img}
                                  type="button"
                                  onClick={() => {
                                    setCurrentImgIdx(offset + idx);
                                    setIsModalOpen(true);
                                  }}
                                  className="shrink-0 w-[104px] h-[80px] rounded-xl overflow-hidden border-2 border-transparent hover:border-[#3182f6] transition-all"
                                >
                                  <img src={img} className="w-full h-full object-cover" alt={category.label} />
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })() : (
              <motion.div
                key="gallery"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
            {/* [UI 수정] 메인 슬라이더 부분: 직관적인 Pagination 추가 및 여백 조정 */}
            <section className="relative mb-3">
              <div
                ref={scrollRef}
                onScroll={(e) => {
                  // 스크롤 시 인덱스 감지 로직 유지
                  const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
                  if (currentImgIdx !== idx) setCurrentImgIdx(idx);
                }}
                className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[32px] bg-[#e5e8eb] shadow-inner"
              >
                {venue.images?.map((img: string, idx: number) => (
                  <div key={idx} className="min-w-full aspect-[4/3] snap-center relative">
                    <img src={img} className="w-full h-full object-cover" alt="장소 이미지" />
                    <button
                      onClick={() => { setCurrentImgIdx(idx); setIsModalOpen(true); }}
                      className="absolute top-5 right-5 p-2.5 bg-black/20 backdrop-blur-md text-white rounded-xl hover:bg-black/40 transition-all"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* [UI 수정] 화살표 버튼을 이미지 박스 외부로 살짝 빼거나 가독성 높임 */}
              {venue.images?.length > 1 && (
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none">
                  <button
                    onClick={prevImg}
                    className="pointer-events-auto bg-white/90 backdrop-blur-md p-2.5 rounded-full text-[#4e5968] shadow-md hover:bg-white transition-all active:scale-90"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImg}
                    className="pointer-events-auto bg-white/90 backdrop-blur-md p-2.5 rounded-full text-[#4e5968] shadow-md hover:bg-white transition-all active:scale-90"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              )}

              {/* [UI 수정] 하단 인디케이터 - 토스 느낌의 얇은 바 형태 */}
              <div className="flex justify-center gap-1.5 mt-4">
                {venue.images?.map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => scrollToImage(i)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentImgIdx ? 'w-6 bg-[#3182f6]' : 'w-1.5 bg-[#d1d6db]'}`}
                  />
                ))}
              </div>
            </section>

            {/* [배치 개편] 썸네일 스트립 - 데스크탑/태블릿에서 원하는 사진으로 바로 이동 */}
            {/* {venue.images?.length > 1 && (
          // <div className="hidden md:flex gap-2.5 overflow-x-auto no-scrollbar">
          <div className="hidden md:grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto no-scrollbar py-1">
            {venue.images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => scrollToImage(idx)}
                className={`shrink-0 w-[92px] h-[72px] rounded-2xl overflow-hidden border-2 transition-all ${idx === currentImgIdx ? 'border-[#3182f6]' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <img src={img} className="w-full h-full object-cover" alt={`썸네일 ${idx + 1}`} />
              </button>
            ))}
          </div>
        )} */}

            {venue.images?.length > 1 && (
              <div className="hidden md:flex flex-col gap-2">

                <div
                  ref={thumbnailContainerRef}
                  className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth"
                >
                  {venue.images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => scrollToImage(idx)}
                      className={`shrink-0 w-[92px] h-[72px] rounded-2xl overflow-hidden border-2 transition-all ${idx === currentImgIdx
                        ? 'border-[#3182f6]'
                        : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`썸네일 ${idx + 1}`} />
                    </button>
                  ))}
                </div>


                <div className="flex items-center justify-center gap-3 text-xs text-gray-500 font-medium select-none mt-1">

                  <button
                    type="button"
                    onClick={() => handleScrollThumbnails('left')}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors active:scale-95"
                    aria-label="썸네일 왼쪽으로 이동"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>


                  <span className="tracking-widest">
                    <strong className="text-gray-900">{currentImgIdx + 1}</strong> / {venue.images.length}
                  </span>


                  <button
                    type="button"
                    onClick={() => handleScrollThumbnails('right')}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors active:scale-95"
                    aria-label="썸네일 오른쪽으로 이동"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* 타이틀/뱃지/정보 카드 - 우측 컬럼 1번째 (중첩 카드 없이 한 겹) */}
          <section className="lg:col-start-2 lg:row-start-1 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6] h-full flex flex-col justify-between">
            <div className="flex justify-between items-center mb-3">
              <span className="px-3.5 py-1.5 bg-[#f2f8ff] text-[#3182f6] text-[12px] font-black rounded-xl">
                {venue.denomination || '교단 정보 없음'}
              </span>
              <div className="flex items-center gap-1.5 text-[#3182f6] font-black text-[12px]">
                <div className="bg-[#3182f6] rounded-full p-0.5"><Check className="w-3 h-3 text-white" strokeWidth={4} /></div>
                스테이온 인증 장소
              </div>
            </div>
            <h1 className="text-[24px] font-black text-[#191f28] mb-2 tracking-tighter leading-tight">
              {venue.venueName}
            </h1>
            <p className="flex items-start gap-1.5 text-[#4e5968] text-[14px] font-semibold mb-3 opacity-80">
              <MapPin className="w-4 h-4 text-[#3182f6] shrink-0 mt-0.5" />
              {venue.location} {venue.addressDetail}
            </p>
            {venue.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {venue.tags.map((tag: string) => (
                  <span key={tag} className="text-[12px] font-bold text-[#3182f6] bg-[#f2f8ff] px-2.5 py-1 rounded-lg">#{tag}</span>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[#8b95a1] font-bold text-[12px] block mb-1">수용 인원</span>
                <span className="text-[19px] font-black text-[#333d4b]">{venue.capacity || 0}<small className="text-[13px] ml-1">명</small></span>
              </div>
              <div>
                <span className="text-[#8b95a1] font-bold text-[12px] block mb-1">1박 사용료</span>
                <span className="text-[19px] font-black text-[#3182f6]">{Number(venue.price || 0).toLocaleString()}<small className="text-[13px] ml-1 font-bold">원</small></span>
              </div>
            </div>
            <div className="border-t border-[#f2f4f6] my-4" />

            <div>
              <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 답사 체크포인트
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <CheckItem icon={<Monitor className="w-5 h-5" />} label="프로젝터" value={venue.projector || '확인 필요'} />
                <CheckItem icon={<Wind className="w-5 h-5" />} label="에어컨 시설" value={venue.airConditioner ? '설치됨' : '없음'} />
                <CheckItem icon={<Car className="w-5 h-5" />} label="주차 정보" value={venue.parkingCapacity || '문의'} />
                <CheckItem icon={<Volume2 className="w-5 h-5" />} label="야간 소음 제한" value={venue.nightEventLimit || '없음'} />
              </div>
            </div>
          </section>

          {/* 🗓 실시간 예약 달력 - 좌측 컬럼 2번째. 예전엔 옆 "상세 시설 정보" 카드와
              lg:self-stretch로 높이를 맞췄는데, 그 카드 내용이 (다중 줄 입력 필드들이
              추가되며) 훨씬 길어져서 이 캘린더 카드까지 억지로 늘어나 가운데 빈 공간이
              커 보이는 문제가 생겼다. self-start로 바꿔서 이 카드는 자기 내용만큼의
              자연스러운 높이로만 표시되게 했다. */}
          <section className="lg:col-start-1 lg:row-start-2 lg:self-start bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[16px] font-black text-[#191f28] tracking-tight">
                  예약 현황
                </h3>
                <p className="text-[11px] text-[#8b95a1] font-bold italic">Real-time Availability</p>
              </div>
              <div className="flex items-center gap-1.5 bg-[#f2f4f6] px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-[#3182f6] rounded-full animate-pulse" />
                <span className="text-[11px] font-black text-[#4e5968]">실시간 업데이트 중</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <AvailabilityCalendar
                venueId={id as string}
                bookings={realBookings}
                blockedDates={venue?.blockedDates || []}
              />

              <div className="flex items-center gap-2 text-[12px] text-[#4e5968] font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-[#f04452] shrink-0" />
                <span><span className="text-[#f04452]">X 표시</span>된 날짜는 이미 대관이 확정되어 예약이 불가능합니다.</span>
              </div>
            </div>
          </section>

          {/* 상세 시설 정보 - 우측 컬럼 3번째 */}
          <div className="lg:col-start-2 lg:row-start-2 lg:self-stretch bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6] space-y-6">
            {/* 1. 상세 시설 정보 */}
            <div>
              <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 상세 시설 정보
              </h3>
              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] overflow-hidden">
                <InfoRow icon={<Square className="w-4 h-4" />} label="강당 크기" value={venue.hallSize ? `${venue.hallSize}평` : '-'} />
                <InfoRow icon={<LayoutIcon className="w-4 h-4" />} label="음향/조명" value={venue.soundSystem || '-'} />
                <InfoRow icon={<Info className="w-4 h-4" />} label="보유 악기" value={venue.instruments || '-'} />
                <InfoRow icon={<Bath className="w-4 h-4" />} label="샤워실/화장실" value={venue.showerBathroom || '-'} />
                <InfoRow icon={<Home className="w-4 h-4" />} label="남녀 숙소" value={`남 ${venue.maleRooms || 0} / 여 ${venue.femaleRooms || 0}`} />
                <InfoRow icon={<Coffee className="w-4 h-4" />} label="식당 인원" value={venue.cafeteriaCapacity ? `${venue.cafeteriaCapacity}명` : '-'} last />
              </div>
            </div>

            {/* 구분선 (선택 사항, 필요 없으시면 생략 가능) */}
            <div className="border-t border-[#f2f4f6]" />

            {/* 2. 식사 정보 */}
            <div>
              <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
                <Utensils className="w-4 h-4 text-[#3182f6]" /> 식사 정보
              </h3>
              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] p-4 space-y-3.5">
                <div className="flex flex-wrap gap-2">
                  {venue.mealOption?.includes('provided') && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8f3ff] text-[#1b64da] rounded-xl text-[12px] font-black">
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>자체 식사 제공</span>
                    </div>
                  )}
                  {venue.mealOption?.includes('self') && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e5e8eb] text-[#4e5968] rounded-xl text-[12px] font-black">
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>직접 취사 및 외부 반입</span>
                    </div>
                  )}
                  {(venue.mealOption?.includes('none') || !venue.mealOption || venue.mealOption.length === 0) && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fff0f0] text-[#f04452] rounded-xl text-[12px] font-black">
                      <Ban className="w-3.5 h-3.5" />
                      <span>식사 미제공</span>
                    </div>
                  )}
                </div>

                {venue.mealPrice > 0 ? (
                  <div className="flex justify-between items-center pt-2.5 border-t border-[#e5e8eb]">
                    <span className="text-[13px] font-bold text-[#6b7684]">1인당 식비</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[17px] font-black text-[#191f28]">{venue.mealPrice.toLocaleString()}</span>
                      <span className="text-[13px] font-black text-[#191f28]">원</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[#8b95a1] pt-2.5 border-t border-[#e5e8eb]">
                    <Info className="w-3.5 h-3.5" />
                    <span className="text-[13px] font-bold">식비 정보는 상담 시 확인 가능합니다.</span>
                  </div>
                )}

                {venue.mealNote && (
                  <div className="pt-2.5 border-t border-[#e5e8eb]">
                    <p className="text-[13px] leading-relaxed text-[#4e5968] font-semibold break-keep whitespace-pre-wrap">
                      {venue.mealNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 장소 소개 - 헤딩은 배경 위, 내용은 카드 한 겹만 */}
          <div className="lg:col-span-2">
            
            <div className="bg-white rounded-2xl border border-[#f2f4f6] p-5">
              <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
              <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 장소 소개
            </h3>

              <p className="text-[#4e5968] leading-[1.7] whitespace-pre-wrap text-[14px] font-bold opacity-90">
                {venue.description || "상세 설명이 없습니다."}
              </p>
            </div>
          </div>

          {/* 장소 리뷰 - 상단 "장소 리뷰 보기" 탭 클릭 시 이 지점으로 스크롤 이동 */}
          <div ref={reviewSectionRef} className="lg:col-span-2 scroll-mt-24">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[16px] font-black text-[#191f28] flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 장소 리뷰
                {venueReviews.length > 0 && (
                  <span className="text-[13px] font-bold text-[#8b95a1]">{venueReviews.length}개</span>
                )}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/venue/${id}/review/write`}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#f2f4f6] text-[#3182f6] rounded-xl font-bold text-[13px] hover:bg-[#e8f3ff] transition-all"
                >
                  <Plus className="w-4 h-4" /> 리뷰 작성하기
                </Link>
                <Link
                  to="/reviews"
                  className="flex items-center gap-0.5 px-3 py-2 text-[#8b95a1] rounded-xl font-bold text-[13px] hover:text-[#3182f6] transition-all"
                >
                  리뷰 더보기 <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {venueReviews.length > 0 ? (
              <div className="space-y-3">
                {venueReviews.slice(0, 3).map((review) => {
                  const canManage = !!user && (user.uid === review.authorId || isAdminEmail(user.email));
                  return (
                    <div key={review.id} className="bg-white rounded-2xl border border-[#f2f4f6] p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-[15px] font-black text-[#191f28]">{review.title}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[12px] font-bold text-[#8b95a1]">
                            {review.createdAt?.seconds
                              ? new Date(review.createdAt.seconds * 1000).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" })
                              : ""}
                          </span>
                          {canManage && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => navigate(`/venue/${id}/review/write?edit=${review.id}`)}
                                title="수정"
                                className="p-1.5 text-[#8b95a1] hover:text-[#3182f6] hover:bg-[#f2f4f6] rounded-lg transition-all"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                title="삭제"
                                className="p-1.5 text-[#8b95a1] hover:text-[#f04452] hover:bg-[#fff0f0] rounded-lg transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-[14px] text-[#4e5968] font-semibold leading-relaxed whitespace-pre-wrap">
                        {review.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#f2f4f6] p-8 text-center">
                <p className="text-[14px] font-bold text-[#8b95a1] mb-4">아직 이 장소에 대한 후기가 없어요.</p>
                <Link
                  to={`/venue/${id}/review/write`}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#3182f6] text-white rounded-xl font-bold text-[14px] hover:bg-[#1b64da] transition-all"
                >
                  가장 먼저 후기 남기기
                </Link>
              </div>
            )}
          </div>

          {/* 예약 상담 CTA - 맨 아래, 전체 폭 */}
          <section className="lg:col-span-2 bg-[#3182f6] rounded-[24px] p-5 shadow-xl text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-[18px] font-black mb-1 tracking-tight">예약 상담을 시작하시겠어요?</h3>
              <p className="text-[13px] font-medium opacity-90 leading-relaxed">
                원하시는 날짜를 선택하고 간편하게 상담 신청을 완료하세요.
              </p>
            </div>

            {user ? (
              <button
                onClick={() => navigate(`/booking/${id}`)}
                className="shrink-0 w-full md:w-auto md:px-10 bg-white text-[#3182f6] h-[52px] rounded-2xl font-black text-[16px] active:scale-[0.98] transition-all shadow-lg hover:bg-gray-50"
              >
                예약 상담 신청하기
              </button>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="shrink-0 w-full md:w-auto md:px-10 bg-white/20 backdrop-blur-md text-white border border-white/30 h-[52px] rounded-2xl font-black text-[16px] flex items-center justify-center gap-2 hover:bg-white/30 transition-all"
              >
                <Lock className="w-4 h-4" /> 로그인 후 예약하기
              </button>
            )}
          </section>
        </div>
        {/* 배치 그리드 끝 */}
      </main>

      {/* 하단 액션 바 */}
      {/* <footer className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-2xl border-t border-gray-100 px-6 py-5 pb-12 z-[100] shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <div className="max-w-2xl mx-auto">
          {user ? (
            <button
              onClick={() => navigate(`/booking/${id}`)}
              className="w-full bg-[#3182f6] text-white h-[64px] rounded-[24px] font-black text-[18px] active:scale-[0.96] transition-all shadow-[0_12px_24px_rgba(49,130,246,0.3)] hover:bg-[#1b64da]"
            >
              예약 상담 신청하기
            </button>
          ) : (
            // <button
            //   onClick={loginWithGoogle}
            //   className="w-full bg-[#F2F4F6] text-[#8B95A1] h-[64px] rounded-[24px] font-black text-[18px] flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            // >
            //   <Lock className="w-5 h-5 opacity-50" /> 로그인 후 예약하기
            // </button>

            <button
              onClick={loginWithGoogle}
              className="w-full h-[64px] rounded-[24px] font-black text-[18px] flex items-center justify-center gap-3 transition-all duration-200
                        bg-gradient-to-r from-[#3182F6] to-[#2272EB] text-white 
                        shadow-[0_8px_20px_rgba(49,130,246,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]
                        hover:opacity-95 active:scale-[0.97]"
            >
              <Lock className="w-5 h-5 text-white" /> 로그인 후 예약하기
            </button>
          )}
        </div>
      </footer> */}
      {/* <div className="bg-white rounded-[40px] p-8 shadow-sm"> */}

      {/* <style>{`
        body { background-color: #f2f4f6; }
      `}</style> */}

      <style>{`
        body { background-color: #f2f4f6; overflow-x: hidden; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// function CheckItem({ icon, label, value }: any) {
//   return (
//     <div className="flex items-center justify-between group">
//       <div className="flex items-center gap-4">
//         <div className="text-[#8b95a1] bg-[#f2f4f6] p-3 rounded-[18px] transition-all group-hover:bg-[#e8f3ff] group-hover:text-[#3182f6] group-hover:scale-110">
//           {icon}
//         </div>
//         <span className="text-[#4e5968] font-black text-[16px] tracking-tight">{label}</span>
//       </div>
//       <span className="font-black text-[16px] text-[#191f28] bg-[#f9fafb] px-4 py-2 rounded-2xl border border-[#f2f4f6]">{value}</span>
//     </div>
//   );
// }
function CheckItem({ icon, label, value }: any) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white rounded-2xl border border-[#f2f4f6]">
      <div className="flex items-center gap-2.5">
        <div className="text-[#3182f6] bg-[#f2f8ff] p-2 rounded-xl">
          {icon}
        </div>
        <span className="text-[#8b95a1] font-bold text-[13px]">{label}</span>
      </div>
      <div className="text-[#191f28] font-black text-[15px] leading-relaxed whitespace-pre-wrap break-keep">
        {value}
      </div>
    </div>
  );
}

// function InfoRow({ icon, label, value, last }: any) {
//   return (
//     <div className={`flex items-center justify-between px-7 py-5 ${!last ? 'border-b border-[#f2f4f6]' : ''} hover:bg-white transition-colors`}>
//       <div className="text-[#8b95a1] font-black text-[14px] flex items-center gap-3">
//         <div className="opacity-70">{icon}</div>
//         <span className="text-[#4e5968]">{label}</span>
//       </div>
//       <span className="text-[#191f28] font-black text-[15px]">{value}</span>
//     </div>
//   );
// }

function InfoRow({ icon, label, value, last }: any) {
  // 값에 줄바꿈이 들어있으면(악기/음향/영상/주차/샤워실처럼 여러 줄로 입력한 항목)
  // 라벨-값을 한 줄에 나란히 우측 정렬하던 기존 레이아웃 대신, 라벨을 위로 올리고
  // 값은 아래에 왼쪽 정렬 + 줄바꿈 그대로 보여주는 세로 배치로 전환한다.
  const isMultiline = typeof value === "string" && value.includes("\n");

  if (isMultiline) {
    return (
      <div className={`px-5 py-3.5 ${!last ? 'border-b border-[#f2f4f6]' : ''}`}>
        <div className="text-[#8b95a1] font-bold text-[14px] flex items-center gap-2.5 mb-1.5">
          <div className="opacity-70 shrink-0">{icon}</div>
          <span className="whitespace-nowrap">{label}</span>
        </div>
        <p className="text-[#191f28] font-black text-[14px] leading-relaxed whitespace-pre-wrap break-keep">{value}</p>
      </div>
    );
  }

  return (
    <div className={`flex items-start justify-between gap-3 px-5 py-3.5 ${!last ? 'border-b border-[#f2f4f6]' : ''}`}>
      <div className="text-[#8b95a1] font-bold text-[14px] flex items-center gap-2.5 shrink-0 pt-0.5">
        <div className="opacity-70 shrink-0">{icon}</div>
        <span className="whitespace-nowrap">{label}</span>
      </div>
      <span className="text-[#191f28] font-black text-[14px] text-right break-keep">{value}</span>
    </div>
  );
}
