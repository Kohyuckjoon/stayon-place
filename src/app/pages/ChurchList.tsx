import { useState, useEffect, useMemo } from "react";
import { ScrollRestoration, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Church, MapPin, Phone, Search, LayoutGrid, List, ShieldCheck } from "lucide-react";
import { useFeatureFlag } from "../lib/featureFlags";
import { FeatureDisabledScreen } from "../components/FeatureDisabledScreen";

export function ChurchList() {
  const navigate = useNavigate();
  const churchDirectoryEnabled = useFeatureFlag("churchDirectoryEnabled");
  const [churches, setChurches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  useEffect(() => {
    const q = query(collection(db, "churches"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChurches(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredChurches = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return churches;
    return churches.filter((c) => (c.churchName || "").includes(q) || (c.churchAddress || "").includes(q));
  }, [churches, searchQuery]);

  if (!churchDirectoryEnabled) return <FeatureDisabledScreen />;

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans antialiased text-[#191F28] pb-24">
      <ScrollRestoration />

      <div className="bg-white border-b border-[#F2F4F6]">
        <div className="max-w-[1100px] mx-auto px-5 pt-10 pb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-black bg-[#ECFDF5] text-[#10B981]">
            <Church className="w-4 h-4" /> 전국 교회
          </div>
          <h1 className="text-[26px] font-black text-[#191F28] mb-2 tracking-tight break-keep">
            전국 교회를 찾아보세요
          </h1>
          <p className="text-[14px] text-[#8B95A1] font-bold break-keep">
            수련회 장소와 상관없이, 지역별로 교회를 소개하고 알아볼 수 있어요.
          </p>
        </div>
      </div>

      <main className="max-w-[1100px] mx-auto px-5 py-6">
        <div className="flex items-start gap-2.5 p-4 bg-[#ECFDF5] border border-[#D1FAE5] rounded-2xl mb-6">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#047857] font-bold leading-relaxed break-keep">
            스테이온에 등록된 교회는 모두 관리자 검토를 거친 정식 교단 소속 교회예요.
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="교회명 또는 지역으로 검색"
            className="w-full h-12 bg-white rounded-2xl pl-11 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#10B981] transition-all"
          />
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#10B981] rounded-full animate-spin" />
            <p className="text-[14px] font-bold text-[#8B95A1]">교회 목록을 불러오고 있어요</p>
          </div>
        ) : filteredChurches.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
            <h3 className="text-[18px] font-black text-[#4E5968]">등록된 교회가 없어요</h3>
            <p className="text-[13px] font-bold text-[#B0B8C1] mt-2">곧 새로운 교회가 소개될 예정이에요.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold text-[#8B95A1]">총 {filteredChurches.length}곳</p>
              <div className="flex items-center gap-1 bg-[#F2F4F6] p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "card" ? "bg-white text-[#10B981] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                  aria-label="카드뷰"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-[#10B981] shadow-sm" : "text-[#8B95A1] hover:text-[#4E5968]"}`}
                  aria-label="리스트뷰"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className={viewMode === "card" ? "grid md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-6" : "flex flex-col gap-3"}>
              <AnimatePresence mode="popLayout">
                {filteredChurches.map((church) => {
                  const photo = church.photos?.[0];

                  if (viewMode === "list") {
                    return (
                      <motion.div
                        key={church.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(`/churches/${church.id}`)}
                        className="flex items-center gap-4 bg-white rounded-2xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
                      >
                        <div className="relative w-24 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden shrink-0 bg-[#F2F4F6]">
                          {photo ? (
                            <img src={photo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Church className="w-6 h-6 text-[#D1D6DB]" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap bg-[#ECFDF5] text-[#10B981]">
                            {church.denomination}
                          </span>
                          <h3 className="text-[15px] sm:text-[16px] font-black text-[#191F28] truncate mt-1">{church.churchName}</h3>
                          {church.churchAddress && (
                            <div className="flex items-center gap-1.5 text-[#8B95A1] font-bold text-[12px] mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{church.churchAddress}</span>
                            </div>
                          )}
                          {church.introduction && (
                            <p className="text-[12px] font-bold text-[#4E5968] mt-1.5 truncate">{church.introduction}</p>
                          )}
                        </div>
                        {church.churchContact && (
                          <a
                            href={`tel:${church.churchContact}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#191F28] text-white rounded-xl text-[12px] font-black hover:bg-black transition-all active:scale-95 whitespace-nowrap shrink-0"
                          >
                            <Phone className="w-3 h-3" /> 문의하기
                          </a>
                        )}
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={church.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      onClick={() => navigate(`/churches/${church.id}`)}
                      className="flex flex-col bg-white rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer"
                    >
                      <div className="relative aspect-video overflow-hidden bg-[#F2F4F6]">
                        {photo ? (
                          <img src={photo} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Church className="w-8 h-8 text-[#D1D6DB]" /></div>
                        )}
                        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm bg-[#ECFDF5] text-[#10B981]">
                          {church.denomination}
                        </span>
                      </div>
                      <div className="p-5 flex flex-col gap-3">
                        <div>
                          <h3 className="text-[17px] font-black text-[#191F28] line-clamp-1">{church.churchName}</h3>
                          {church.churchAddress && (
                            <div className="flex items-center gap-1.5 text-[#8B95A1] font-bold text-[12px] mt-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{church.churchAddress}</span>
                            </div>
                          )}
                        </div>
                        {church.introduction && (
                          <p className="text-[13px] font-bold text-[#4E5968] line-clamp-2 break-keep">{church.introduction}</p>
                        )}
                        <div className="w-full h-[1px] bg-[#F2F4F6]" />
                        <div className="flex items-center justify-between">
                          <div className="text-[12px] font-bold text-[#8B95A1] truncate">{church.churchName}</div>
                          {church.churchContact && (
                            <a
                              href={`tel:${church.churchContact}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#191F28] text-white rounded-xl text-[12px] font-black hover:bg-black transition-all active:scale-95 shrink-0"
                            >
                              <Phone className="w-3 h-3" /> 문의하기
                            </a>
                          )}
                        </div>
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
