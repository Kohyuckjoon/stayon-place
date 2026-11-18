import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  ChevronLeft, Phone, User, MapPin, Music, Users, Speaker, CreditCard,
  Clock, Calendar, Check, X, Copy, Tag, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatAvailableSchedule, formatHourlyRate } from "../lib/bandRoomDisplay";
import { showAlert } from "../lib/dialog";

// 개인정보 보호를 위해 상세 화면에서는 가운데 자리를 가려서 보여준다 (TeamDetail.tsx와 동일 패턴).
function maskPhone(phone: string): string {
  const parts = phone.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-${"*".repeat(parts[1].length)}-${parts[2]}`;
  }
  return phone;
}

const getRoomTypeStyle = (roomType: string) => {
  switch (roomType) {
    case "연습실": return { bg: "bg-[#F0F9FF]", text: "text-[#0EA5E9]" };
    case "합주실": return { bg: "bg-[#F5F3FF]", text: "text-[#8B5CF6]" };
    case "겸용": return { bg: "bg-[#ECFDF5]", text: "text-[#10B981]" };
    default: return { bg: "bg-[#F2F4F6]", text: "text-[#8B95A1]" };
  }
};

export function BandRoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "bandRooms", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().status === "approved") {
          setRoom(docSnap.data());
        } else {
          await showAlert("공간 정보를 찾을 수 없습니다.");
          navigate("/teams?category=bandroom");
        }
      } catch (error) {
        console.error("공간 정보 조회 실패:", error);
        navigate("/teams?category=bandroom");
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id, navigate]);

  // 공간 정보를 불러온 뒤 탭 제목을 이 공간 이름으로 구체화한다.
  // (Layout.tsx가 라우트 진입 시 넣어둔 일반 제목을 덮어쓴다.)
  useEffect(() => {
    if (room?.roomName) {
      document.title = `${room.roomName} 합주실·연습실 소개 | 스테이온`;
    }
  }, [room?.roomName]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#0ea5e9] rounded-full" />
    </div>
  );

  if (!room) return null;

  const style = getRoomTypeStyle(room.roomType);
  const photos: string[] = room.photos?.length > 0 ? room.photos : [];

  return (
    <div className="min-h-screen bg-[#f2f4f6] text-[#191f28] font-sans selection:bg-blue-100 pb-40">
      <main className="max-w-[1120px] mx-auto px-4 md:px-6">
        <section className="flex items-center justify-between pt-6 pb-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#4e5968] hover:text-[#191f28] transition-all font-bold group">
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[16px]">뒤로가기</span>
          </button>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 pb-6">
          {/* 사진 */}
          <section className="lg:col-start-1 lg:row-start-1 flex flex-col gap-2">
            <div className="rounded-[24px] overflow-hidden border border-[#f2f4f6] aspect-video bg-white">
              {photos.length > 0 ? (
                <img src={photos[activeImageIndex]} className="w-full h-full object-cover" alt={room.roomName} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#f9fafb]">
                  <Music className="w-10 h-10 text-[#d1d6db]" />
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {photos.map((url, idx) => (
                  <button
                    key={url}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${idx === activeImageIndex ? "border-[#0ea5e9]" : "border-transparent opacity-70"}`}
                  >
                    <img src={url} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 타이틀/신청자/연락처 카드 */}
          <section className="lg:col-start-2 lg:row-start-1 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6] h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                <span className={`px-3.5 py-1.5 text-[12px] font-black rounded-xl inline-block ${style.bg} ${style.text}`}>
                  {room.roomType}
                </span>
                {room.track === "booking" && (
                  <span className="inline-flex items-center gap-1 px-3.5 py-1.5 text-[12px] font-black rounded-xl bg-[#0ea5e9] text-white">
                    <Zap className="w-3.5 h-3.5" /> 바로예약 가능
                  </span>
                )}
              </div>
              <h1 className="text-[24px] font-black text-[#191f28] mb-3 tracking-tighter leading-tight break-keep">
                {room.roomName}
              </h1>

              <div className="bg-[#f9fafb] rounded-2xl border border-[#f2f4f6] p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                  <User className="w-4 h-4 text-[#0ea5e9] shrink-0" />
                  {room.applicantName}
                </div>
                {room.applicantContact && (
                  <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                    <Phone className="w-4 h-4 text-[#0ea5e9] shrink-0" />
                    {maskPhone(room.applicantContact)}
                  </div>
                )}
                {room.address && (
                  <div className="flex items-center gap-2.5 text-[14px] font-bold text-[#4e5968]">
                    <MapPin className="w-4 h-4 text-[#0ea5e9] shrink-0" />
                    {room.address}{room.addressDetail ? ` ${room.addressDetail}` : ""}
                  </div>
                )}
              </div>
            </div>

            {room.track === "booking" ? (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => navigate(`/band-room/${id}/book`)}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-[#0ea5e9] text-white rounded-2xl font-black text-[15px] hover:bg-[#0284c7] transition-all active:scale-[0.98]"
                >
                  <Zap className="w-4 h-4" /> 예약하기
                </button>
                {room.applicantContact && (
                  <button
                    type="button"
                    onClick={() => setShowContactModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#f9fafb] text-[#4e5968] rounded-2xl font-bold text-[13px] hover:bg-[#f2f4f6] transition-all active:scale-[0.98]"
                  >
                    <Phone className="w-3.5 h-3.5" /> 전화로 먼저 문의하기
                  </button>
                )}
              </div>
            ) : (
              room.applicantContact && (
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-4 bg-[#191f28] text-white rounded-2xl font-black text-[15px] hover:bg-black transition-all active:scale-[0.98]"
                >
                  <Phone className="w-4 h-4" /> 전화로 문의하기
                </button>
              )
            )}
          </section>

          {/* 공간 상세 정보 */}
          <section className="lg:col-span-2 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
            <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
              <div className="w-1.5 h-5 bg-[#0ea5e9] rounded-full" /> 공간 상세 정보
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <CheckItem icon={<Users className="w-5 h-5" />} label="수용인원" value={room.capacity || "-"} />
              <CheckItem icon={<Music className="w-5 h-5" />} label="평수" value={room.pyeong || "-"} />
              {room.equipmentChecklist?.length > 0 && (
                <CheckItem icon={<Speaker className="w-5 h-5" />} label="보유 장비" value={room.equipmentChecklist.join(", ")} />
              )}
              {room.micCount && (
                <CheckItem icon={<Speaker className="w-5 h-5" />} label="싱어 마이크 개수" value={room.micCount} />
              )}
              {room.micType && (
                <CheckItem icon={<Speaker className="w-5 h-5" />} label="싱어 마이크 유선/무선" value={room.micType} />
              )}
              <CheckItem icon={<Check className="w-5 h-5" />} label="방음시설" value={room.hasSoundproof ? "있음" : "없음"} />
              <CheckItem icon={<MapPin className="w-5 h-5" />} label="주차" value={room.hasParking ? (room.parkingInfo || "가능") : "불가능"} />
              {room.hourlyRate && (
                <CheckItem icon={<CreditCard className="w-5 h-5" />} label="시간당 요금" value={formatHourlyRate(room.hourlyRate)} />
              )}
              {room.minRentalHours && (
                <CheckItem icon={<Clock className="w-5 h-5" />} label="최소 대여시간" value={room.minRentalHours} />
              )}
              {(room.availableDays?.length > 0 || room.availableStartTime) && (
                <CheckItem icon={<Calendar className="w-5 h-5" />} label="예약가능 요일·시간대" value={formatAvailableSchedule(room.availableDays || [], room.availableStartTime, room.availableEndTime)} />
              )}
            </div>
          </section>

          {/* 공간 소개 */}
          {room.description && (
            <section className="lg:col-span-2 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
              <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-[#0ea5e9] rounded-full" /> 공간 소개
              </h3>
              <p className="text-[14px] font-semibold text-[#4e5968] leading-relaxed whitespace-pre-wrap break-words">
                {room.description}
              </p>
            </section>
          )}

          {/* 태그 */}
          {room.tags?.length > 0 && (
            <section className="lg:col-span-2 bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#f2f4f6]">
              <h3 className="text-[16px] font-black text-[#191f28] mb-3 flex items-center gap-2.5">
                <div className="w-1.5 h-5 bg-[#0ea5e9] rounded-full" /> 태그
              </h3>
              <div className="flex flex-wrap gap-2">
                {room.tags.map((tag: string) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#f0f9ff] text-[#0ea5e9] rounded-full text-[13px] font-bold">
                    <Tag className="w-3 h-3" /> {tag}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {showContactModal && room.applicantContact && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#191f28]/80 backdrop-blur-md"
          onClick={() => setShowContactModal(false)}
        >
          <div className="bg-white w-full max-w-sm rounded-[28px] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-black text-[#191f28]">전화 문의</h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="p-1.5 rounded-full hover:bg-[#f2f4f6] transition-all"
              >
                <X className="w-5 h-5 text-[#8b95a1]" />
              </button>
            </div>

            <p className="text-[13px] font-bold text-[#8b95a1] mb-2">{room.roomName} 연락처</p>
            <div className="flex items-center justify-between gap-3 bg-[#f9fafb] rounded-2xl p-4 mb-4">
              <span className="text-[18px] font-black text-[#191f28] tracking-tight">
                {maskPhone(room.applicantContact)}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(room.applicantContact);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    /* 클립보드 접근 실패 시 조용히 무시 */
                  }
                }}
                className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-[12px] font-black border transition-all ${copied
                  ? "border-[#0ea5e9] bg-[#f0f9ff] text-[#0ea5e9]"
                  : "border-[#e5e8eb] bg-white text-[#4e5968] hover:border-[#0ea5e9] hover:text-[#0ea5e9]"
                  }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "복사됨" : "복사하기"}
              </button>
            </div>

            <a
              href={`tel:${room.applicantContact}`}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#191f28] text-white rounded-2xl font-black text-[15px] hover:bg-black transition-all active:scale-[0.98]"
            >
              <Phone className="w-4 h-4" /> 전화로 문의하기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckItem({ icon, label, value }: any) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white rounded-2xl border border-[#f2f4f6]">
      <div className="flex items-center gap-2.5">
        <div className="text-[#0ea5e9] bg-[#f0f9ff] p-2 rounded-xl">
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
