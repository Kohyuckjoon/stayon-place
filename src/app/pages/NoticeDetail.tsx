import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const mockNotices = [
  {
    "id": 1,
    "title": "신용카드 결제 서비스 정식 오픈 안내 🎉",
    "content": "안녕하세요. 스테이온(STAYON) 팀입니다.\n\n주요 카드사 심사 및 결제 모듈 연동이 최종 완료되어, 6월 12일을 기준으로 모든 장소를 신용카드로 결제하실 수 있습니다.\n\n자세한 오픈 내용과 혜택은 이미지를 확인해 주세요.\n\n그동안 기다려 주신 모든 분께 진심으로 감사드리며, 더욱 신뢰할 수 있는 정산 및 결제 환경을 만들기 위해 언제나 최선을 다하겠습니다.\n\n감사합니다.\n\n\n\n스테이온 드림",
    "tag": "오픈",
    "date": "2026.06.12",
    "imageUrl": "https://images.unsplash.com/photo-1563013544-824ae1d704d3?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: 2,
    title: "수련회 장소 등록 감사 이벤트",
    content:
      "안녕하세요, 스테이온(STAYON) 팀입니다.\n\n누군가에게는 꼭 필요한 공간이, 각 교회와 장소에게는 수익을 창출하는 특별한 가치가 됩니다.\n\n더욱 많은 분이 스테이온을 통해 편리하고 효율적으로 공간을 공유하실 수 있도록, 지금 새로운 장소 파트너를 모집하고 있습니다!\n\n이미 입점해 있는 기존 장소제공자분들은 물론, 새로운 공간을 고민 중인 분들께서는 아래의 방법을 통해 간편하게 입점을 신청해 주세요.\n\n\n\n 감사합니다. \n\n스테이온 드림",
    tag: "EVENT",
    date: "2026.05.28",
    imageUrl:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=400&q=80",
  }
];

export default function NoticeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const notice = mockNotices.find(
    (item) => item.id === Number(id)
  );

  if (!notice) {
    return <div className="p-10">존재하지 않는 공지입니다.</div>;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">

      <div className="max-w-3xl mx-auto px-5 py-12">
        <button
          onClick={() => navigate("/notices")}
          className="flex items-center gap-2 mb-8 text-sm font-semibold text-[#6B7684] hover:text-[#3182F6] transition-colors"
        >
          <ArrowLeft size={18} />
          목록으로 돌아가기
        </button>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[#F2F4F6]">
          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold">
            {notice.tag}
          </span>

          <h1 className="text-3xl md:text-4xl font-black mt-4 mb-2 tracking-tight">
            {notice.title}
          </h1>

          <p className="text-gray-400 mb-10 text-[15px] font-medium">
            {notice.date}
          </p>
          
          {notice.id === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-10 rounded-3xl overflow-hidden shadow-2xl shadow-gray-100"
            >
              <img 
                src="/notice_open1.png"
                alt="신용카드 결제 서비스 정식 오픈 상세 안내" 
                className="w-full h-auto"
              />
            </motion.div>
          )}

          {notice.id === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-10 rounded-3xl overflow-hidden shadow-2xl shadow-gray-100"
            >
              <img 
                src="/notice_open2.png"
                alt="신용카드 결제 서비스 정식 오픈 상세 안내" 
                className="w-full h-auto"
              />
            </motion.div>
          )}

          <div className="leading-8 text-gray-700 whitespace-pre-line font-medium text-[16px]">
            {notice.content}
          </div>
        </div>
      </div>
    </div>
  );
}
