import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Calendar, Megaphone, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface NoticeItem {
  id: number;
  title: string;
  desc: string;
  content?: string;
  tag: string;
  date: string;
  imageUrl?: string;
}

const mockNotices: NoticeItem[] = [
  {
    "id": 1,
    "title": "신용카드 결제 서비스 정식 오픈 안내 🎉",
    "desc": "이제 모든 장소를 신용카드로 안전하고 편리하게 결제할 수 있습니다.",
    "content": "안녕하세요. 스테이온 플레이스 팀입니다. 드디어 주요 카드사 심사 및 결제 모듈 연동이 최종 완료되어 신용카드 정식 결제 서비스가 오픈되었습니다. 그동안 기다려 주신 모든 분께 감사드리며, 이제 에스크로 안전보호 시스템 아래에서 모든 수련회 장소를 신용/체크카드로 안심하고 편리하게 예약해 보세요. 더욱 편리한 정산 환경을 위해 최선을 다하겠습니다.",
    "tag": "오픈",
    "date": "2026.06.12",
    
  },
  {
    id: 2,
    title: "수련회 장소 등록 감사 이벤트",
    desc: "STAYON 플레이스에 소중한 사역 공간을 등록해 주신 모든 장소 제공 담당자 분들께 감사드립니다.",
    content:
      "전국의 수양관, 교육관 담당자분들을 위한 특별 론칭 이벤트가 시작되었습니다.",
    tag: "EVENT",
    date: "2026.05.28",

  }
];

export function Notice() {
  const navigate = useNavigate();
  const [isAdmin] = useState(true);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">

      <div className="max-w-3xl mx-auto px-5 py-12 md:py-20">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black mb-2">
              공지사항
            </h1>
            <p className="text-[#4E5968]">
              STAYON의 새로운 소식과 유용한 안내를 전해드립니다.
            </p>
          </div>

          {/* {isAdmin && (
            <button
              className="flex items-center gap-2 px-4 py-2 bg-[#3182f6] text-white rounded-xl"
            >
              <Plus size={16} />
              글쓰기
            </button>
          )} */}
        </div>

        <div className="space-y-4">
          {mockNotices.map((notice) => (
            <motion.div
              key={notice.id}
              whileHover={{ y: -3 }}
              onClick={() => navigate(`/notice/${notice.id}`)}
              className="cursor-pointer bg-white rounded-3xl p-6 flex justify-between gap-6 border border-gray-100"
            >
              <div className="flex-1">
                <div className="flex gap-2 items-center mb-3">
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-xs font-bold">
                    {notice.tag}
                  </span>

                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar size={12} />
                    {notice.date}
                  </span>
                </div>

                <h2 className="font-black text-xl mb-2">
                  {notice.title}
                </h2>

                <p className="text-gray-500 line-clamp-2">
                  {notice.desc}
                </p>
              </div>

              {notice.imageUrl ? (
                <img
                  src={notice.imageUrl}
                  alt={notice.title}
                  className="w-24 h-24 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gray-50 flex items-center justify-center">
                  <Megaphone className="text-gray-300" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
