import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { MapPin, Users, ChevronRight } from "lucide-react";
import { db } from "../lib/firebase";
import { shortAddress, isBoosted, isVerified } from "./RecommendedVenues";

// 장소 상세 페이지 맨 아래 "다른 수련회 장소도 둘러보세요".
// 장소 상세 페이지끼리 진짜 링크로 서로 연결해서, 구글이 장소 페이지들을 촘촘히 이어진
// 묶음으로 보게 한다(색인 도움). 현재 장소는 빼고, 페이지마다 다른 조합이 나오도록
// 현재 장소 id를 섞어 순서를 정한다(같은 페이지는 항상 같은 순서).

const COUNT = 4;

const rankFor = (seed: string, id: string) => {
  let h = 2166136261;
  for (const ch of `${seed}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export function OtherVenues({ currentId }: { currentId: string }) {
  const [venues, setVenues] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "venues"), where("status", "==", "approved")));
        const others = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter((v) => v.id !== currentId)
          .sort((a, b) => {
            const boost = Number(isBoosted(b)) - Number(isBoosted(a));
            if (boost !== 0) return boost;
            const photo = Number(!!b.images?.[0]) - Number(!!a.images?.[0]);
            if (photo !== 0) return photo;
            return rankFor(currentId, a.id) - rankFor(currentId, b.id);
          });
        if (!cancelled) setVenues(others.slice(0, COUNT));
      } catch (e) {
        console.error("다른 장소 불러오기 실패:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentId]);

  if (venues.length === 0) return null;

  return (
    <section className="bg-white rounded-[24px] p-5 md:p-7 border border-[#F2F4F6]">
      <div className="flex items-center justify-between gap-3 mb-4 md:mb-5">
        <h3 className="flex items-center gap-2 text-[17px] md:text-[19px] font-black text-[#191F28] tracking-tight">
          <span className="w-1.5 h-5 bg-[#3182f6] rounded-full" /> 다른 수련회 장소도 둘러보세요
        </h3>
        <Link to="/venues" className="flex items-center gap-0.5 shrink-0 text-[13px] font-black text-[#8B95A1] hover:text-[#3182F6] transition-colors">
          전체 보기 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-5 md:gap-4">
        {venues.map((venue) => (
          <Link key={venue.id} to={`/venue/${venue.id}`} className="group min-w-0">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#F2F4F6]">
              {venue.images?.[0] && (
                <img
                  src={venue.images[0]}
                  alt={`${venue.venueName} 수련회 장소`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              {isBoosted(venue) ? (
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#FFF7ED] text-[10px] font-black text-[#EA580C] shadow-sm">🔥 추천</span>
              ) : isVerified(venue) && (
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-white/95 text-[10px] font-black text-[#3182F6] shadow-sm">검증</span>
              )}
            </div>
            <h4 className="mt-2 text-[15px] font-black text-[#191F28] truncate group-hover:text-[#3182F6] transition-colors">{venue.venueName}</h4>
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
    </section>
  );
}
