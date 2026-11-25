import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { MapPin, Users, ChevronRight, ChevronLeft, ShieldCheck } from "lucide-react";
import { db } from "../lib/firebase";

// 메인 "스테이온이 수련회 장소로 추천해요" 섹션.
// 카드가 onClick 이동이 아니라 진짜 <a href="/venue/:id"> 링크(react-router Link)라서
// 구글이 메인 → 장소 상세 페이지로 가는 길을 링크로 인식할 수 있다(색인 도움).
// 승인된 장소 "전부"를 페이지 단위 슬라이드로 보여준다. 안 보이는 페이지도 옆으로 밀려
// 있을 뿐 화면 코드(DOM)에는 모두 들어 있어서, 모든 장소 링크가 구글에 노출된다.
// 순서: 추천(부스트) 중인 장소 → 사진 있는 장소 → /venues와 같은 "하루 한 번 섞기" 순서.

const PC_PER_PAGE = 4;       // PC: 한 화면에 4곳, 6초마다 자동으로 다음 페이지
const MOBILE_PER_PAGE = 4;   // 모바일: 2x2 4곳씩, 6초마다 자동 + 좌우로 밀어서 넘김
const AUTO_SLIDE_MS = 6000;

// "강원특별자치도 양양군 ..." → "강원 양양군"처럼 짧게(도/특별자치도/광역시 등 접미사 제거)
export const shortAddress = (venue: any) => {
  const parts = String(venue.address || venue.location || "").split(" ").filter(Boolean).slice(0, 2);
  if (parts[0]) {
    parts[0] = parts[0]
      .replace(/^(충청|경상|전라)(남|북)도$/, (_m, a: string, b: string) => a[0] + b) // 경상남도 → 경남
      .replace(/(특별자치도|특별자치시|특별시|광역시|도)$/, "");                      // 강원특별자치도 → 강원, 경기도 → 경기
  }
  return parts.join(" ");
};

export const dailyRank = (id: string) => {
  const dateKey = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let h = 2166136261;
  for (const ch of `${dateKey}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const isBoosted = (venue: any) => {
  const until = venue.boostedUntil?.toDate?.();
  return !!(until && until.getTime() > Date.now());
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export const isVerified = (venue: any) => venue.verified || venue.badges?.includes("stayon");

// 페이지 넘김 버튼 + 점 표시 (PC/모바일 공용)
function Pager({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-5 md:mt-7">
      <button
        type="button"
        aria-label="이전 장소"
        onClick={() => onChange((page - 1 + total) % total)}
        className="w-9 h-9 rounded-full bg-white border border-[#E5E8EB] flex items-center justify-center text-[#4E5968] hover:border-[#3182F6] hover:text-[#3182F6] transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}번째 페이지`}
            onClick={() => onChange(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === page ? "w-6 bg-[#3182F6]" : "w-2 bg-[#D1D6DB] hover:bg-[#ADB5BD]"}`}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label="다음 장소"
        onClick={() => onChange((page + 1) % total)}
        className="w-9 h-9 rounded-full bg-white border border-[#E5E8EB] flex items-center justify-center text-[#4E5968] hover:border-[#3182F6] hover:text-[#3182F6] transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export function RecommendedVenues() {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pcPage, setPcPage] = useState(0);
  const [mPage, setMPage] = useState(0);
  const [isPcHovered, setIsPcHovered] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "venues"), where("status", "==", "approved")));
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
        const sorted = all.sort((a, b) => {
          const boost = Number(isBoosted(b)) - Number(isBoosted(a));
          if (boost !== 0) return boost;
          const photo = Number(!!b.images?.[0]) - Number(!!a.images?.[0]);
          if (photo !== 0) return photo;
          return dailyRank(a.id) - dailyRank(b.id);
        });
        if (!cancelled) setVenues(sorted);
      } catch (e) {
        console.error("추천 장소 불러오기 실패:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pcPages = chunk(venues, PC_PER_PAGE);
  const mPages = chunk(venues, MOBILE_PER_PAGE);

  // PC 자동 슬라이드 (마우스를 올리면 멈춤)
  useEffect(() => {
    if (isPcHovered || pcPages.length <= 1) return;
    const t = setInterval(() => setPcPage((p) => (p + 1) % pcPages.length), AUTO_SLIDE_MS);
    return () => clearInterval(t);
  }, [isPcHovered, pcPages.length, pcPage]);

  // 모바일 자동 슬라이드 (손가락을 대고 있는 동안 멈춤). 페이지를 직접 넘기면 타이머가 다시 시작된다.
  useEffect(() => {
    if (isTouching || mPages.length <= 1) return;
    const t = setInterval(() => setMPage((p) => (p + 1) % mPages.length), AUTO_SLIDE_MS);
    return () => clearInterval(t);
  }, [isTouching, mPages.length, mPage]);

  // 불러오기 실패 등으로 보여줄 장소가 없으면 섹션 자체를 숨긴다.
  if (!loading && venues.length === 0) return null;

  // 모바일 좌우 스와이프로 페이지 넘김
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; setIsTouching(true); };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    setIsTouching(false);
    if (Math.abs(dx) < 50 || mPages.length <= 1) return;
    setMPage((p) => (dx < 0 ? (p + 1) % mPages.length : (p - 1 + mPages.length) % mPages.length));
  };

  return (
    <section className="py-10 md:py-16 px-4 md:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-5 md:mb-8">
          <div>
            <p className="text-[12px] md:text-[14px] font-black text-[#3182F6] mb-1.5 md:mb-2">STAYON PICK</p>
            <h2 className="text-[20px] md:text-[34px] font-black text-[#191F28] tracking-tight break-keep leading-tight">
              스테이온이 수련회 장소로 추천해요
            </h2>
            <p className="text-[13px] md:text-[16px] text-[#8B95A1] font-bold mt-1 md:mt-2 break-keep">
              직접 검증한 장소를 지금 바로 확인해 보세요
            </p>
          </div>
          <Link
            to="/venues"
            className="hidden md:flex items-center gap-1 shrink-0 text-[15px] font-black text-[#4E5968] hover:text-[#3182F6] transition-colors"
          >
            전체 장소 보기 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          // 불러오는 동안 자리 표시
          <>
            <div className="md:hidden flex flex-col divide-y divide-[#F2F4F6]">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 py-3.5">
                  <div className="w-[104px] h-[84px] rounded-2xl bg-[#F2F4F6] animate-pulse shrink-0" />
                  <div className="flex-1 pt-1.5">
                    <div className="h-4 w-2/3 bg-[#F2F4F6] rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-[#F2F4F6] rounded mt-2.5 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:grid grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="aspect-[4/3] rounded-[20px] bg-[#F2F4F6] animate-pulse" />
                  <div className="h-4 w-2/3 bg-[#F2F4F6] rounded mt-3 animate-pulse" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* 모바일: 2x2(4곳)씩, 6초마다 자동 슬라이드 + 좌우 스와이프/버튼 (손대고 있는 동안 멈춤) */}
            <div className="md:hidden overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              <div
                className="flex gap-3 transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                style={{ transform: `translateX(calc(-${mPage} * (100% + 0.75rem)))` }}
              >
                {mPages.map((pageItems, pi) => (
                  <div key={pi} className="w-full shrink-0 grid grid-cols-2 gap-x-3 gap-y-5 content-start" aria-hidden={pi !== mPage}>
                    {pageItems.map((venue) => (
                      <Link key={venue.id} to={`/venue/${venue.id}`} tabIndex={pi === mPage ? 0 : -1} className="min-w-0 active:opacity-80 transition-opacity">
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#F2F4F6]">
                          {venue.images?.[0] && (
                            <img src={venue.images[0]} alt={`${venue.venueName} 수련회 장소`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          )}
                          {isBoosted(venue) ? (
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#FFF7ED] text-[10px] font-black text-[#EA580C] shadow-sm">🔥 추천</span>
                          ) : isVerified(venue) && (
                            <span className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/95 text-[10px] font-black text-[#3182F6] shadow-sm">
                              <ShieldCheck className="w-2.5 h-2.5" strokeWidth={2.5} /> 검증
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-[15px] font-black text-[#191F28] leading-snug truncate">{venue.venueName}</h3>
                        <p className="flex items-center gap-1 mt-0.5 text-[12px] font-bold text-[#6B7684] min-w-0">
                          <MapPin className="w-3 h-3 shrink-0 text-[#ADB5BD]" />
                          <span className="truncate">{shortAddress(venue)}</span>
                        </p>
                        {venue.capacity && (
                          <p className="flex items-center gap-1 text-[12px] font-bold text-[#6B7684] min-w-0">
                            <Users className="w-3 h-3 shrink-0 text-[#ADB5BD]" />
                            <span className="truncate">최대 {venue.capacity}명</span>
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="md:hidden">
              <Pager page={mPage} total={mPages.length} onChange={setMPage} />
            </div>

            {/* PC: 4곳씩 한 줄, 6초마다 자동 슬라이드(마우스 올리면 멈춤) */}
            <div
              className="hidden md:block"
              onMouseEnter={() => setIsPcHovered(true)}
              onMouseLeave={() => setIsPcHovered(false)}
            >
              <div className="overflow-hidden">
                {/* 페이지 사이에도 카드 간격(gap-5=20px)과 같은 틈을 둬서, 넘어가는 중에
                    앞 페이지 마지막 카드와 다음 페이지 첫 카드가 붙어 보이지 않게 한다. */}
                <div
                  className="flex gap-5 transition-transform duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                  style={{ transform: `translateX(calc(-${pcPage} * (100% + 1.25rem)))` }}
                >
                  {pcPages.map((pageItems, pi) => (
                    <div key={pi} className="w-full shrink-0 grid grid-cols-4 gap-5" aria-hidden={pi !== pcPage}>
                      {pageItems.map((venue) => (
                        <Link key={venue.id} to={`/venue/${venue.id}`} tabIndex={pi === pcPage ? 0 : -1} className="group">
                          <div className="relative aspect-[4/3] rounded-[20px] overflow-hidden bg-[#F2F4F6]">
                            {venue.images?.[0] && (
                              <img
                                src={venue.images[0]}
                                alt={`${venue.venueName} 수련회 장소`}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            )}
                            {isVerified(venue) && (
                              <span className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/95 backdrop-blur-md text-[11px] font-black text-[#3182F6] shadow-sm">
                                <ShieldCheck className="w-3 h-3" strokeWidth={2.5} /> 검증
                              </span>
                            )}
                            {isBoosted(venue) && (
                              <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-lg bg-[#FFF7ED] text-[11px] font-black text-[#EA580C] shadow-sm">🔥 추천</span>
                            )}
                          </div>
                          <h3 className="mt-3 text-[17px] font-black text-[#191F28] truncate group-hover:text-[#3182F6] transition-colors">{venue.venueName}</h3>
                          <p className="flex items-center gap-1 mt-1 text-[13px] font-bold text-[#6B7684]">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#ADB5BD]" />
                            <span className="truncate">{shortAddress(venue)}</span>
                          </p>
                          {venue.capacity && (
                            <p className="flex items-center gap-1 mt-0.5 text-[13px] font-bold text-[#6B7684]">
                              <Users className="w-3.5 h-3.5 shrink-0 text-[#ADB5BD]" /> 최대 {venue.capacity}명
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <Pager page={pcPage} total={pcPages.length} onChange={setPcPage} />
            </div>
          </>
        )}

        <Link
          to="/venues"
          className="md:hidden mt-4 flex items-center justify-center gap-1 h-12 rounded-2xl bg-[#F2F4F6] text-[14px] font-black text-[#4E5968] active:scale-[0.98] transition-transform"
        >
          전체 장소 보기 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
