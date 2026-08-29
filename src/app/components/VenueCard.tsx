import { MapPin, Users, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface VenueCardProps {
  id: string;
  venueName: string;
  address: string;
  price: number;
  capacity: number;
  images: string[];
  verified: boolean;
  denomination: string;
}

export function VenueCard({
  venueName,
  address = "", // 기본값 설정
  price,
  capacity,
  images,
  verified,
  denomination,
}: VenueCardProps) {

  // 에러 방지: address가 없거나 짧을 경우를 위해 안전한 slice 처리
  const locationTag = address?.slice(0, 2) || "장소";

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 transition-all hover:shadow-xl group"
    >
      {/* 이미지 섹션 */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={images?.[0] || "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=1000&auto=format&fit=crop"}
          alt={venueName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="px-3 py-1.5 bg-white/90 backdrop-blur text-[#3182F6] text-[13px] font-black rounded-full shadow-sm">
            {locationTag}
          </span>
          <span className="px-3 py-1.5 bg-[#191F28]/80 backdrop-blur text-white text-[13px] font-bold rounded-full">
            {denomination?.split("(")[0] || "교단"}
          </span>
        </div>
      </div>

      {/* 콘텐츠 섹션 */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-black text-[#191F28] line-clamp-1 leading-tight">
            {venueName}
          </h3>
          {verified && (
            <CheckCircle2 className="w-5 h-5 text-[#3182F6] fill-blue-50 shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-2 text-[#8B95A1] mb-5 text-[14px] font-bold">
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">{address || "주소 정보가 없습니다"}</span>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-gray-50">
          <div className="flex items-center gap-2 text-[#4E5968]">
            <Users className="w-4 h-4" />
            <span className="text-[14px] font-black">{capacity.toLocaleString()}명</span>
          </div>
          <div className="text-right">
            <span className="text-[18px] font-black text-[#3182F6]">
              {Number(price) === 0 ? "가격 문의" : `${Number(price).toLocaleString()}원~`}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}