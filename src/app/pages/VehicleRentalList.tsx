import { useState, useEffect, useMemo } from "react";
import { ScrollRestoration, useNavigate } from "react-router-dom";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, MapPin, Search, LayoutGrid, List, ShieldCheck } from "lucide-react";

function fleetSummary(vehicleFleet: any[]): string {
  const list = Array.isArray(vehicleFleet) ? vehicleFleet.filter((row) => row?.type) : [];
  if (list.length === 0) return "보유차량 정보 없음";
  const first = `${list[0].type} ${list[0].count}대`;
  return list.length > 1 ? `${first} 외` : first;
}

// 사진이 없는 카드가 전부 같은 밋밋한 색으로 보이지 않도록, 보유 차량 규모별로
// 배지·플레이스홀더 색을 다르게 준다 (승합차 < 미니/중형버스 < 대형버스).
function fleetTier(vehicleFleet: any[]) {
  const types = (Array.isArray(vehicleFleet) ? vehicleFleet : []).map((row) => row?.type || "").join(" ");
  if (/45인승|대형/.test(types)) {
    return { badgeBg: "bg-[#F5F3FF]", badgeText: "text-[#7C3AED]", grad: "from-[#EDE9FE] to-[#DDD6FE]", iconText: "text-[#A78BFA]" };
  }
  if (/버스|카운티|중형/.test(types)) {
    return { badgeBg: "bg-[#ECFEFF]", badgeText: "text-[#0891B2]", grad: "from-[#CFFAFE] to-[#A5F3FC]", iconText: "text-[#67E8F9]" };
  }
  return { badgeBg: "bg-[#F2F8FF]", badgeText: "text-[#3182F6]", grad: "from-[#DBEAFE] to-[#BFDBFE]", iconText: "text-[#93C5FD]" };
}

export function VehicleRentalList() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  useEffect(() => {
    const q = query(collection(db, "vehicleRentals"), where("status", "==", "approved"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVehicles(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      (v.businessName || "").includes(q) ||
      (Array.isArray(v.serviceRegions) ? v.serviceRegions : []).some((r: string) => r.includes(q)) ||
      (Array.isArray(v.vehicleFleet) ? v.vehicleFleet : []).some((row: any) => (row?.type || "").includes(q))
    );
  }, [vehicles, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans antialiased text-[#191F28] pb-24">
      <ScrollRestoration />

      <div className="bg-white border-b border-[#F2F4F6]">
        <div className="max-w-[1100px] mx-auto px-5 pt-10 pb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-black bg-[#F2F8FF] text-[#3182F6]">
            <Bus className="w-4 h-4" /> 차량·버스 대여
          </div>
          <h1 className="text-[26px] font-black text-[#191F28] mb-2 tracking-tight break-keep">
            수련회 이동 수단을 찾아보세요
          </h1>
          <p className="text-[14px] text-[#8B95A1] font-bold break-keep">
            차종·운행 지역별로 등록된 차량·버스 대여 업체를 확인할 수 있어요.
          </p>
        </div>
      </div>

      <main className="max-w-[1100px] mx-auto px-5 py-6">
        <div className="flex items-start gap-2.5 p-4 bg-[#F2F8FF] border border-[#D6E8FF] rounded-2xl mb-6">
          <ShieldCheck className="w-4 h-4 text-[#3182F6] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#1B64DA] font-bold leading-relaxed break-keep">
            스테이온에 등록된 업체는 모두 관리자 검토를 거친 업체예요.
          </p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ADB5BD]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="업체명, 차종 또는 지역으로 검색"
            className="w-full h-12 bg-white rounded-2xl pl-11 pr-4 text-[14px] font-bold outline-none border border-[#E5E8EB] focus:border-[#3182F6] transition-all"
          />
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-[3px] border-[#E5E8EB] border-t-[#3182F6] rounded-full animate-spin" />
            <p className="text-[14px] font-bold text-[#8B95A1]">목록을 불러오고 있어요</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-32 text-center bg-white rounded-[28px] border border-[#F2F4F6]">
            <h3 className="text-[18px] font-black text-[#4E5968]">등록된 업체가 없어요</h3>
            <p className="text-[13px] font-bold text-[#B0B8C1] mt-2">곧 새로운 업체가 소개될 예정이에요.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold text-[#8B95A1]">총 {filteredVehicles.length}곳</p>
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
                {filteredVehicles.map((vehicle) => {
                  const summary = fleetSummary(vehicle.vehicleFleet);
                  const hasInsurance = !!vehicle.insuranceDocument;
                  const tier = fleetTier(vehicle.vehicleFleet);
                  const thumbnail = vehicle.coverPhoto || vehicle.photos?.[0];

                  if (viewMode === "list") {
                    return (
                      <motion.div
                        key={vehicle.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                        className="flex items-center gap-4 bg-white rounded-2xl p-3 border border-[#F2F4F6] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-[#E5E8EB] transition-all cursor-pointer"
                      >
                        <div className={`relative w-24 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${thumbnail ? "bg-[#F2F4F6]" : `bg-gradient-to-br ${tier.grad}`}`}>
                          {thumbnail ? (
                            <img src={thumbnail} className="w-full h-full object-cover" alt={vehicle.businessName} />
                          ) : (
                            <Bus className={`w-7 h-7 ${tier.iconText}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap ${tier.badgeBg} ${tier.badgeText}`}>
                              {summary}
                            </span>
                            {hasInsurance && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap bg-[#ECFDF5] text-[#10B981]">
                                <ShieldCheck className="w-2.5 h-2.5" /> 보험가입
                              </span>
                            )}
                          </div>
                          <h3 className="text-[15px] sm:text-[16px] font-black text-[#191F28] truncate mt-1">{vehicle.businessName}</h3>
                          <div className="flex items-center gap-3 text-[#8B95A1] font-bold text-[12px] mt-0.5">
                            {Array.isArray(vehicle.serviceRegions) && vehicle.serviceRegions.length > 0 && (
                              <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{vehicle.serviceRegions.join(", ")}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={vehicle.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                      className="flex flex-col bg-white rounded-[20px] overflow-hidden border border-[#F2F4F6] shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:border-[#E5E8EB] transition-all duration-500 cursor-pointer"
                    >
                      <div className={`relative aspect-video overflow-hidden flex items-center justify-center ${thumbnail ? "bg-[#F2F4F6]" : `bg-gradient-to-br ${tier.grad}`}`}>
                        {thumbnail ? (
                          <img src={thumbnail} className="w-full h-full object-cover" alt={vehicle.businessName} />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-white/50 flex items-center justify-center">
                            <Bus className={`w-7 h-7 ${tier.iconText}`} />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm ${tier.badgeBg} ${tier.badgeText}`}>
                            {summary}
                          </span>
                          {hasInsurance && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm bg-[#ECFDF5] text-[#10B981]">
                              <ShieldCheck className="w-3 h-3" /> 보험가입
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-5 flex flex-col gap-3">
                        <div>
                          <h3 className="text-[17px] font-black text-[#191F28] line-clamp-1">{vehicle.businessName}</h3>
                          <div className="flex items-center gap-3 text-[#8B95A1] font-bold text-[12px] mt-1">
                            {Array.isArray(vehicle.serviceRegions) && vehicle.serviceRegions.length > 0 && (
                              <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{vehicle.serviceRegions.join(", ")}</span>
                            )}
                          </div>
                        </div>
                        {vehicle.introduction && (
                          <p className="text-[13px] font-bold text-[#4E5968] line-clamp-2 break-keep">{vehicle.introduction}</p>
                        )}
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
