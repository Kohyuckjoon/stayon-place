import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";
import { loginWithGoogle } from "../lib/auth";
import { isAdminEmail } from "../lib/adminEmails";
import { ChevronLeft, Lock, MapPin } from "lucide-react";

// 특정 장소에 대해서만 작성 가능한 리뷰 작성/수정 폼.
// 장소명은 이 페이지로 들어온 venueId 기준으로 고정되며 수정할 수 없다.
export default function VenueReviewWrite() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [venue, setVenue] = useState<any>(null);
  const [loadingVenue, setLoadingVenue] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [checkingReview, setCheckingReview] = useState(!!editId);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const fetchVenue = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "venues", id));
        if (snap.exists()) {
          setVenue(snap.data());
        } else {
          alert("장소를 찾을 수 없습니다.");
          navigate("/venues");
        }
      } catch (error) {
        console.error("장소 조회 실패:", error);
      } finally {
        setLoadingVenue(false);
      }
    };
    fetchVenue();
  }, [id, navigate]);

  useEffect(() => {
    if (!editId) {
      setCheckingReview(false);
      return;
    }
    if (!user) return; // 로그인 확인 끝날 때까지 대기

    const fetchExistingReview = async () => {
      try {
        const snap = await getDoc(doc(db, "reviews", editId));
        if (!snap.exists()) {
          alert("리뷰를 찾을 수 없습니다.");
          navigate(`/venue/${id}`);
          return;
        }
        const data = snap.data();
        const isOwner = data.authorId === user.uid;
        if (!isOwner && !isAdminEmail(user.email)) {
          setForbidden(true);
          return;
        }
        setTitle(data.title || "");
        setContent(data.content || "");
      } catch (error) {
        console.error("리뷰 조회 실패:", error);
      } finally {
        setCheckingReview(false);
      }
    };
    fetchExistingReview();
  }, [editId, user, id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !venue || !id) return;
    setSubmitting(true);
    try {
      if (editId) {
        await updateDoc(doc(db, "reviews", editId), {
          title,
          content,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "reviews"), {
          venueId: id,
          venueName: venue.venueName,
          title,
          content,
          authorId: user.uid,
          authorEmail: user.email,
          createdAt: serverTimestamp(),
        });
      }
      navigate(`/venue/${id}`, { state: { scrollToReviews: true } });
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingVenue || checkingReview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-[3px] border-[#f2f4f6] border-t-[#3182f6] rounded-full animate-spin" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-[18px] font-black text-[#191f28] mb-3">수정 권한이 없습니다.</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">본인이 작성한 리뷰만 수정할 수 있어요.</p>
        <Link to={`/venue/${id}`} className="inline-flex px-6 py-3 bg-[#3182f6] text-white rounded-xl font-bold text-[14px]">
          장소로 돌아가기
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-[18px] font-black text-[#191f28] mb-3">로그인이 필요해요</p>
        <p className="text-[14px] font-bold text-[#8b95a1] mb-8">{venue?.venueName} 후기를 남기려면 먼저 로그인해주세요.</p>
        <button
          onClick={() => loginWithGoogle().catch(() => { })}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#3182f6] text-white rounded-xl font-bold text-[14px] hover:bg-[#1b64da] transition-all"
        >
          <Lock className="w-4 h-4" /> 로그인하고 계속하기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <button
        onClick={() => navigate(`/venue/${id}`)}
        className="flex items-center gap-1 text-[#4e5968] hover:text-[#191f28] transition-all font-bold mb-6"
      >
        <ChevronLeft className="w-5 h-5" /> 장소로 돌아가기
      </button>

      <h2 className="text-[24px] font-black text-[#191f28] mb-2">{editId ? "후기 수정하기" : "이 장소 후기 남기기"}</h2>
      <p className="text-[14px] font-bold text-[#8b95a1] mb-8">다녀오신 수련회는 어떠셨나요? 솔직한 후기를 남겨주세요.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-[12px] font-black text-[#8b95a1] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#3182f6]" /> 장소명
          </label>
          <div className="w-full h-14 bg-[#f2f4f6] rounded-[16px] px-5 flex items-center font-black text-[15px] text-[#191f28]">
            {venue?.venueName}
          </div>
        </div>

        <div>
          <label className="text-[12px] font-black text-[#8b95a1] uppercase tracking-wider mb-2 block">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            required
            className="w-full h-14 bg-[#f9fafb] rounded-[16px] px-5 font-bold text-[15px] outline-none border-2 border-transparent focus:border-[#3182f6] transition-all"
          />
        </div>

        <div>
          <label className="text-[12px] font-black text-[#8b95a1] uppercase tracking-wider mb-2 block">후기 내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="리뷰를 자유롭게 남겨주세요."
            required
            className="w-full h-56 bg-[#f9fafb] rounded-[16px] p-5 font-bold text-[15px] outline-none border-2 border-transparent focus:border-[#3182f6] transition-all resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-14 bg-[#3182f6] text-white rounded-[16px] font-black text-[16px] hover:bg-[#1b64da] active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting ? "저장 중..." : editId ? "수정 완료" : "후기 등록하기"}
        </button>
      </form>
    </div>
  );
}
