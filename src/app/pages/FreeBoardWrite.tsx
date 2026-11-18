import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { showAlert } from "../lib/dialog";

export default function FreeBoardWrite() {
    const [searchParams] = useSearchParams();
    const editingId = searchParams.get("id");
    const isEditMode = !!editingId;

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(isEditMode);
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    // 로그인 안 한 상태로 URL을 직접 쳐서 들어온 경우까지 막는다(목록의 "글쓰기" 버튼은
    // 이미 클릭 시점에 막고 있지만, 이 페이지 자체도 게이트를 걸어둬야 안전하다).
    useEffect(() => {
        if (!auth.currentUser) {
            window.dispatchEvent(new Event("open-login-modal"));
            navigate("/freeboard");
        }
    }, [navigate]);

    // 수정 모드면 기존 글을 불러와서 폼에 채운다. 본인 글이 아니면 목록으로 돌려보낸다.
    useEffect(() => {
        if (!isEditMode || !editingId) return;
        const fetchPost = async () => {
            try {
                const snap = await getDoc(doc(db, "freeboard", editingId));
                if (!snap.exists()) {
                    await showAlert("글을 찾을 수 없습니다.");
                    navigate("/freeboard");
                    return;
                }
                const data = snap.data();
                if (!auth.currentUser || data.authorId !== auth.currentUser.uid) {
                    await showAlert("본인이 작성한 글만 수정할 수 있습니다.");
                    navigate("/freeboard");
                    return;
                }
                setTitle(data.title || "");
                setContent(data.content || "");
            } catch (error) {
                console.error("글 불러오기 실패:", error);
                navigate("/freeboard");
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [isEditMode, editingId, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) {
            window.dispatchEvent(new Event("open-login-modal"));
            return;
        }
        setSubmitting(true);
        try {
            if (isEditMode && editingId) {
                await updateDoc(doc(db, "freeboard", editingId), { title, content });
            } else {
                await addDoc(collection(db, "freeboard"), {
                    title,
                    content,
                    author: auth.currentUser.displayName || "익명",
                    authorId: auth.currentUser.uid,
                    createdAt: serverTimestamp(),
                });
            }
            navigate("/freeboard");
        } catch (error) {
            console.error("등록 실패:", error);
            await showAlert("저장 중 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-[#8B95A1] font-bold text-[14px]">불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-12">
            <Link
                to="/freeboard"
                className="flex items-center gap-1.5 md:gap-2 text-[#4E5968] hover:text-[#191F28] font-bold text-[13px] md:text-sm bg-white px-3.5 py-2 md:px-5 md:py-2.5 rounded-full shadow-sm transition w-fit mb-4 md:mb-8"
            >
                <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> 목록으로
            </Link>

            <h2 className="text-[19px] md:text-2xl font-black text-[#191F28] mb-5 md:mb-8">
                {isEditMode ? "글 수정하기" : "새 글 작성하기"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3.5 md:space-y-6">
                <input
                    type="text"
                    placeholder="제목을 입력하세요"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-11 md:h-14 bg-[#F9FAFB] rounded-[14px] md:rounded-[20px] px-4 md:px-5 font-bold text-[14px] md:text-base outline-none border-2 border-transparent focus:border-[#3182F6] transition-all"
                    required
                />
                <textarea
                    placeholder="자유롭게 이야기를 남겨주세요"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-48 md:h-64 bg-[#F9FAFB] rounded-[14px] md:rounded-[20px] p-4 md:p-5 font-bold text-[14px] md:text-base outline-none border-2 border-transparent focus:border-[#3182F6] transition-all resize-none"
                    required
                />

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 md:h-14 bg-[#191F28] text-white rounded-[14px] md:rounded-[20px] font-black text-[14px] md:text-base hover:bg-[#3182F6] transition-all disabled:opacity-50"
                >
                    {submitting ? "저장 중..." : isEditMode ? "수정 완료" : "등록 완료"}
                </button>
            </form>
        </div>
    );
}
