import { useState } from "react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function ReviewWrite() {
  const [title, setTitle] = useState("");
  const [venueName, setVenueName] = useState("");
  const [content, setContent] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auth.currentUser) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
      return;
    }

    try {
      await addDoc(collection(db, "reviews"), {
        title,
        venueName,
        content,
        authorId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      navigate("/reviews");
    } catch (error) {
      console.error("등록 실패:", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-black text-[#191F28] mb-8">새 후기 작성하기</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <input 
          type="text" placeholder="다녀오신 수련회 장소명을 입력하세요" value={venueName} onChange={(e) => setVenueName(e.target.value)}
          className="w-full h-14 bg-[#F9FAFB] rounded-[20px] px-5 font-bold outline-none border-2 focus:border-[#3182F6]" required />
        <input 
          type="text" placeholder="제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full h-14 bg-[#F9FAFB] rounded-[20px] px-5 font-bold outline-none border-2 focus:border-[#3182F6]" required />
        <textarea 
          placeholder="수련회 이야기를 자유롭게 남겨주세요" value={content} onChange={(e) => setContent(e.target.value)}
          className="w-full h-64 bg-[#F9FAFB] rounded-[20px] p-5 font-bold outline-none border-2 focus:border-[#3182F6] resize-none" required />
        
        <button type="submit" className="w-full h-14 bg-[#191F28] text-white rounded-[20px] font-black hover:bg-[#3182F6] transition-all">
          등록 완료
        </button>
      </form>
    </div>
  );
}
