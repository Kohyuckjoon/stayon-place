import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Link } from "react-router-dom";
import { Plus, Search, ChevronDown, ChevronUp, MessageCircle, Edit3 } from "lucide-react";

// 모바일 전용 게시판 전환 탭은 이제 Layout.tsx에서 공용으로 렌더링한다(BoardSwitcher.tsx 참고).

export default function FreeBoardList() {
    const [posts, setPosts] = useState<any[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [user, setUser] = useState<any>(null);

    const auth = getAuth();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, [auth]);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const q = query(collection(db, "freeboard"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                setPosts(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("게시글 불러오기 실패:", error);
            }
        };
        fetchPosts();
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const isOwner = (post: any) => !!user && post.authorId === user.uid;

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("정말 삭제하시겠습니까?")) {
            try {
                await deleteDoc(doc(db, "freeboard", id));
                setPosts(posts.filter((p) => p.id !== id));
            } catch (error) {
                console.error("삭제 실패:", error);
            }
        }
    };

    const filteredPosts = posts.filter(
        (p) => p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || p.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-12">
            <div className="mb-6 md:mb-12">
                <span className="text-[10.5px] md:text-[12px] font-black text-[#3182F6] uppercase tracking-widest">자유게시판</span>
                <h2 className="text-[21px] md:text-[32px] font-black text-[#191F28] mt-1.5 md:mt-2 break-keep">수련회 준비하며 자유롭게 이야기해요</h2>
                <p className="text-[12.5px] md:text-[15px] font-bold text-[#8B95A1] mt-1.5 md:mt-2 break-keep">
                    장소 후기나 레크리에이션 아이디어가 아니어도, 수련회 준비하며 궁금한 것·나누고 싶은 이야기를 자유롭게 남겨보세요.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 md:gap-4 mb-4 md:mb-8">
                <div className="relative flex-1 sm:max-w-md group">
                    <Search className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-[#ADB5BD]" />
                    <input
                        type="text"
                        placeholder="어떤 이야기를 찾으시나요?"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 md:h-14 bg-[#F9FAFB] rounded-[14px] md:rounded-[20px] pl-10 md:pl-12 pr-4 font-bold text-[13px] md:text-[15px] outline-none border-2 border-transparent focus:border-[#3182F6] transition-all"
                    />
                </div>
                <Link
                    to="/freeboard/write"
                    onClick={(e) => {
                        if (!user) {
                            e.preventDefault();
                            window.dispatchEvent(new Event("open-login-modal"));
                        }
                    }}
                    className="h-11 md:h-14 px-5 md:px-6 bg-[#191F28] text-white rounded-[14px] md:rounded-[20px] font-black text-[13px] md:text-base flex items-center justify-center gap-2 hover:bg-[#3182F6] transition-all shrink-0"
                >
                    <Plus className="w-4 h-4 md:w-5 md:h-5" /> 글쓰기
                </Link>
            </div>

            <div className="bg-white rounded-[18px] md:rounded-[24px] border border-[#F2F4F6] shadow-sm overflow-hidden">
                {filteredPosts.length === 0 ? (
                    <div className="py-16 md:py-24 text-center">
                        <MessageCircle className="w-10 h-10 md:w-12 md:h-12 text-[#D1D6DB] mx-auto mb-3" />
                        <p className="text-[13px] md:text-[15px] font-bold text-[#ADB5BD]">아직 등록된 글이 없어요.</p>
                    </div>
                ) : (
                    filteredPosts.map((post, index) => (
                        <div key={post.id} className="border-b border-[#F2F4F6] last:border-0">
                            {/* 데스크톱 행 */}
                            <div
                                onClick={() => toggleExpand(post.id)}
                                className="hidden md:grid grid-cols-[80px_1fr_120px_100px_50px] items-center px-8 py-6 cursor-pointer hover:bg-[#F9FAFB] transition-all"
                            >
                                <span className="text-[15px] font-black text-[#191F28]">{filteredPosts.length - index}</span>
                                <span className="text-[17px] font-bold text-[#191F28] truncate">{post.title}</span>
                                <span className="text-[14px] font-bold text-[#8B95A1] truncate">{post.author || "익명"}</span>
                                <span className="text-[13px] font-bold text-[#8B95A1]">
                                    {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "-"}
                                </span>
                                <div className="flex justify-center">
                                    {expandedId === post.id ? <ChevronUp className="w-5 h-5 text-[#8B95A1]" /> : <ChevronDown className="w-5 h-5 text-[#8B95A1]" />}
                                </div>
                            </div>

                            {/* 모바일 행 */}
                            <div
                                onClick={() => toggleExpand(post.id)}
                                className="md:hidden flex items-start gap-2.5 px-4 py-3.5 cursor-pointer active:bg-[#F9FAFB] transition-all"
                            >
                                <span className="text-[12px] font-black text-[#ADB5BD] shrink-0 w-4 text-center mt-0.5">{filteredPosts.length - index}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-bold text-[#191F28] truncate">{post.title}</p>
                                    <div className="flex items-center gap-1 mt-0.5 text-[11px] font-bold text-[#8B95A1]">
                                        <span className="truncate">{post.author || "익명"}</span>
                                        <span className="shrink-0">·</span>
                                        <span className="shrink-0">
                                            {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "-"}
                                        </span>
                                    </div>
                                </div>
                                <div className="shrink-0 mt-0.5">
                                    {expandedId === post.id ? <ChevronUp className="w-4 h-4 text-[#8B95A1]" /> : <ChevronDown className="w-4 h-4 text-[#8B95A1]" />}
                                </div>
                            </div>

                            {expandedId === post.id && (
                                <div className="px-4 pb-4 pt-1.5 md:px-8 md:pb-8 md:pt-2 bg-[#F9FAFB] text-[13.5px] md:text-[15px] text-[#4E5968] leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex justify-between items-center mb-2 gap-2">
                                        <p className="font-bold text-[#191F28] text-[13px] md:text-base">내용</p>
                                        {isOwner(post) && (
                                            <div className="flex items-center gap-3 shrink-0">
                                                <Link
                                                    to={`/freeboard/write?id=${post.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex items-center gap-1 text-[12px] md:text-[13px] font-bold text-[#4E5968] hover:text-[#3182F6] transition-colors"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" /> 수정
                                                </Link>
                                                <button
                                                    onClick={(e) => handleDelete(e, post.id)}
                                                    className="text-[12px] md:text-[13px] font-bold text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    삭제하기
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3.5 md:p-4 bg-white rounded-[14px] md:rounded-[16px] border border-[#E5E8EB] break-keep whitespace-pre-wrap">
                                        {post.content || "등록된 내용이 없습니다."}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
