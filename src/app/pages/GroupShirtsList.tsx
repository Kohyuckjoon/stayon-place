import { useState, useEffect, useMemo, useRef } from "react";
import { ScrollRestoration, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Shirt, Search, LayoutGrid, List, BadgeCheck, Tag, Eye, ChevronLeft, ChevronRight } from "lucide-react";

const VISIBLE_TAG_FILTER_COUNT = 12;

export function GroupShirtsList() {
  const navigate = useNavigate();
  const [shirts, setShirts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  // 태그 필터 칩이 한 줄에 다 안 들어가면 가로 스크롤되는데, PC에서는 Shift+휠을
  // 눌러야 옆으로 넘어간다는 걸 아는 사람이 거의 없다 - 클릭으로 넘기는 화살표 버튼을
  // 양쪽에 추가해서 마우스만으로도 넘길 수 있게 한다 (모바일은 이미 좌우 스와이프로 가능).
  const tagScrollRef = useRef<HTMLDivElement>(null);
  const scrollTags = (direction: "left" | "right") => {
    tagScrollRef.current?.scrollBy({ left: direction === "left" ? -220 : 220, behavior: "smooth" });
  };

  useEffect(() => {
    const q = query(collection(db, "groupShirts"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setShirts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    shirts.forEach((s) => (s.itemTags || []).forEach((t: string) => set.add(t)));
    return Array.from(set).slice(0, VISIBLE_TAG_FILTER_COUNT);
  }, [shirts]);

  const filteredShirts = useMemo(() => {
    const q = searchQuery.trim();
    return shirts
      .filter((s) => !q || (s.businessName || "").includes(q) || (s.introduction || "").includes(q) || (s.itemTags || []).some((t: string) => t.includes(q)))
      .filter((s) => !activeTagFilter || (s.itemTags || []).includes(activeTagFilter));
  }, [shirts, searchQuery, activeTagFilter]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans antialiased text-[#191F28] pb-24">
      <ScrollRestoration />

      <div className="bg-white border-b border-[#F2F4F6]">
        <div className="max-w-[1100px] mx-auto px-5 pt-10 pb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-black bg-[#F2F8FF] text-[#3182F6]">
            <Shirt className="w-4 h-4" /> 단체티·기념품
          </div>
          <h1 className="text-[26px] font-black text-[#191F28] mb-2 tracking-tight break-keep">
            수련회 단체티·기념품 업체를 찾아보세요
          </h1>
          <p className="text-[14px] text-[#8B95A1] font-bold break-keep mb-4">
            관리자 검토를 거쳐 등록된 업체만 소개돼요.
          </p>

          {/* 굿즈몰/티셔츠몰 전환 토글. /venues의 "수련회/국내선교" 토글과 생김새는 같지만,
              굿즈·단체티는 완전히 분리된 별도 페이지(별도 컬렉션·함수)라 한 화면 안에서
              데이터만 바꿔치기하지 않고 /goods로 실제 이동한다. */}
          <div className="inline-flex items-center gap-1 bg-[#F2F4F6] p-1 rounded-full">
            <button type="button" onClick={() => navigate("/goods")} className="relative px-5 py-2.5 rounded-full text-[14px] font-black whitespace-nowrap">
              <span className="relative z-10 text-[#8B95A1]">굿즈몰</span>
            </button>
            <button type="button" className="relative px-5 py-2.5 rounded-full text-[14px] font-black whitespace-nowrap">
              <div className="absolute inset-0 bg-white rounded-full shadow-sm" />
              <span className="relative z-10 text-[#3182F6]">티셔츠몰</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1100px] mx-auto px-5 py-6">
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="업체명, 소개, 품목으로 검색"
            className="w-full h-12 bg-white rounded-2xl pl-11 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#3182F6] transition-all"
          />
        </div>

        {allTags.length > 0 && (
          <div className="relative mb-6">
            <div ref={tagScrollRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setActiveTagFilter(null)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-bold border transition-all whitespace-nowrap ${!activeTagFilter ? "bg-[#191F28] border-[#191F28] text-white" : "bg-white border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6]/50"
                  }`}
              >
                전체
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-[13px] font-bold border transition-all whitespace-nowrap ${activeTagFilter === tag ? "bg-[#3182F6] border-[#3182F6] text-white" : "bg-white border-[#E5E8EB] text-[#4E5968] hover:border-[#3182F6]/50"
                    }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
            {/* PC 전용 좌우 스크롤 화살표 - 모바일은 터치 스와이프로 이미 넘길 수 있어서 숨김 */}
            <button
              type="button"
              onClick={() => scrollTags("left")}
              className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-7 h-7 items-center justify-center bg-white border border-[#E5E8EB] rounded-full shadow-md text-[#4E5968] hover:bg-[#F9FAFB] transition-all"
              aria-label="태그 왼쪽으로 이동"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollTags("right")}
              className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-7 h-7 items-center justify-center bg-white border border-[#E5E8EB] rounded-full shadow-md text-[#4E5968] hover:bg-[#F9FAFB] transition-all"
              aria-label="태그 오른쪽으로 이동"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-32 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#3182F6] rounded-full animate-spin" />
            <p className="text-[14px] font-bold text-[#8B95A1]">업체 목록을 불러오고 있어요</p>
          </div>
        ) : filteredShirts.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
            <h3 className="text-[18px] font-black text-[#4E5968]">등록된 업체가 없어요</h3>
            <p className="text-[13px] font-bold text-[#B0B8C1] mt-2">곧 새로운 업체가 소개될 예정이에요.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold text-[#8B95A1]">총 {filteredShirts.length}곳</p>
              <div className="flex items-center gap-1 bg-[#F2F4F6] p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setViewMode("card")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-all ${viewMode === "card" ? "bg-white text-[#3182F6] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                  aria-label="카드뷰"
                >
                  <LayoutGrid className="w-4 h-4" /> 카드뷰
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-all ${viewMode === "list" ? "bg-white text-[#3182F6] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                  aria-label="리스트뷰"
                >
                  <List className="w-4 h-4" /> 리스트뷰
                </button>
              </div>
            </div>

            <div className={viewMode === "card" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-6" : "flex flex-col gap-3"}>
              <AnimatePresence mode="popLayout">
                {filteredShirts.map((shirt) => {
                  const photo = shirt.photos?.[0];
                  const priceLabel = shirt.minPrice ? `${Number(shirt.minPrice).toLocaleString()}원부터` : "가격 문의";

                  if (viewMode === "list") {
                    return (
                      <motion.div
                        key={shirt.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(`/shirts/${shirt.id}`)}
                        className="flex items-center gap-4 bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
                      >
                        <div className="relative w-24 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-[#F2F4F6]">
                          {photo ? (
                            <img src={photo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Shirt className="w-6 h-6 text-[#D1D6DB]" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap bg-[#F2F8FF] text-[#3182F6]">
                              {priceLabel}
                            </span>
                            {shirt.businessRegistrationNumber && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap bg-[#ECFDF5] text-[#10B981]">
                                <BadgeCheck className="w-2.5 h-2.5" /> 사업자인증
                              </span>
                            )}
                          </div>
                          <h3 className="text-[15px] sm:text-[16px] font-black text-[#191F28] truncate mt-1">{shirt.businessName}</h3>
                          {shirt.introduction && (
                            <p className="text-[12px] font-bold text-[#4E5968] mt-1.5 truncate">{shirt.introduction}</p>
                          )}
                          <p className="flex items-center gap-1 text-[11px] font-bold text-[#B0B8C1] mt-1.5">
                            <Eye className="w-3 h-3" /> 조회 {Number(shirt.viewCount || 0).toLocaleString()}
                          </p>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={shirt.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      onClick={() => navigate(`/shirts/${shirt.id}`)}
                      className="flex flex-col bg-white rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer"
                    >
                      <div className="relative aspect-video overflow-hidden bg-[#F2F4F6]">
                        {photo ? (
                          <img src={photo} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Shirt className="w-8 h-8 text-[#D1D6DB]" /></div>
                        )}
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm bg-[#F2F8FF] text-[#3182F6]">
                          {priceLabel}
                        </span>
                        {shirt.businessRegistrationNumber && (
                          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm bg-[#ECFDF5] text-[#10B981]">
                            <BadgeCheck className="w-3 h-3" /> 사업자인증
                          </span>
                        )}
                      </div>
                      <div className="p-5 flex flex-col gap-3">
                        <div>
                          <h3 className="text-[17px] font-black text-[#191F28] line-clamp-1">{shirt.businessName}</h3>
                          {shirt.introduction && (
                            <p className="text-[13px] font-bold text-[#4E5968] line-clamp-2 break-keep mt-1">{shirt.introduction}</p>
                          )}
                        </div>
                        {(shirt.itemTags || []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {shirt.itemTags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#F2F4F6] text-[#6B7684]">
                                <Tag className="w-2.5 h-2.5" />{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="flex items-center gap-1 text-[11px] font-bold text-[#B0B8C1] -mt-1">
                          <Eye className="w-3 h-3" /> 조회 {Number(shirt.viewCount || 0).toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
