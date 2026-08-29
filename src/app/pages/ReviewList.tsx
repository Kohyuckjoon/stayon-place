import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, orderBy, getDocs, doc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 인증 정보 확인용
import { Link } from "react-router-dom";
import { Plus, Search, ChevronDown, ChevronUp, MapPin, Coffee } from "lucide-react";

export default function ReviewList() {
    const [reviews, setReviews] = useState<any[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null); // 인증된 유저 상태 추가

    const auth = getAuth();
    const currentUser = auth.currentUser;

    // 다른 페이지에서 넘어왔을 때 스크롤 위치가 그대로 유지되는 문제 방지
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // 부모(아코디언)가 클릭되지 않게 방지
        if (window.confirm("정말 삭제하시겠습니까?")) {
            try {
                await deleteDoc(doc(db, "reviews", id));
                // 삭제 후 화면 업데이트 (필터링)
                setReviews(reviews.filter((r) => r.id !== id));
            } catch (error) {
                console.error("삭제 실패:", error);
            }
        }
    };

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const q = query(collection(db, "reviews"));
                const querySnapshot = await getDocs(q);
                const fetchedReviews = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        // 데이터베이스의 authorId 필드를 정확히 가져오도록 지정
                        authorId: data.authorId 
                    };
                });
                setReviews(fetchedReviews);
            } catch (error) {
                console.error("리뷰 불러오기 실패:", error);
            }
        };

        fetchReviews();
    }, []); // 컴포넌트 마운트 시 1회 실행

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, [auth]);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="mb-12">
                <span className="text-[12px] font-black text-[#3182F6] uppercase tracking-widest">수련회 후기 게시판</span>
                <h2 className="text-[32px] font-black text-[#191F28] mt-2">우리가 다녀온 수련회는 어땠나요?</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                    <div className="flex items-start gap-3 p-5 bg-[#F9FAFB] border border-[#F2F4F6] rounded-[20px]">
                        <div className="w-10 h-10 rounded-xl bg-[#E8F3FF] flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 text-[#3182F6]" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-[#191F28] mb-1">스테이온에 없는 장소도 괜찮아요</p>
                            <p className="text-[13px] font-bold text-[#6B7684] leading-relaxed">
                                꼭 스테이온에서 예약한 곳이 아니어도 좋아요. 추천하고 싶은 수련회 장소가 있다면 자유롭게 후기를 남겨주세요.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-5 bg-[#3182F6] rounded-[20px]">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Coffee className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-[15px] font-black text-white">커피 쿠폰 100% 증정</p>
                                <span className="px-2 py-0.5 bg-white text-[#3182F6] rounded-full text-[10px] font-black shrink-0">혜택</span>
                            </div>
                            <p className="text-[13px] font-bold text-white/90 leading-relaxed">
                                스테이온에서 제공한 장소로 수련회를 다녀오셨다면, 후기 작성만으로 커피 쿠폰을 100% 드려요!
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 mb-8">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD]" />
                    <input
                        type="text"
                        placeholder="어떤 후기를 찾으시나요?"
                        className="w-full h-14 bg-[#F9FAFB] rounded-[20px] pl-12 pr-4 font-bold text-[15px] outline-none border-2 border-transparent focus:border-[#3182F6] transition-all"
                    />
                </div>
                <Link to="/review/write" className="h-14 px-6 bg-[#191F28] text-white rounded-[20px] font-black flex items-center gap-2 hover:bg-[#3182F6] transition-all">
                    <Plus className="w-5 h-5" /> 후기 등록하기
                </Link>
            </div>

            {/*  "image_7ae686.jpg" 반영 - 번호가 가장 앞] */}
            <div className="bg-white rounded-[24px] border border-[#F2F4F6] shadow-sm overflow-hidden">
                {reviews.map((review, index) => (
                    <div key={review.id} className="border-b border-[#F2F4F6] last:border-0">
                        {/* 리스트 헤더 (클릭 시 아코디언 작동) */}
                        <div 
                            onClick={() => toggleExpand(review.id)}
                            className="grid grid-cols-[80px_1fr_120px_100px_50px] items-center px-8 py-6 cursor-pointer hover:bg-[#F9FAFB] transition-all"
                        >
                            <span className="text-[15px] font-black text-[#191F28]">{reviews.length - index}</span>
                            <span className="text-[17px] font-bold text-[#191F28] truncate">{review.title}</span>
                            <span className="text-[14px] font-bold text-[#8B95A1] truncate">{review.venueName}</span>
                            <span className="text-[13px] font-bold text-[#8B95A1]">
                                {review.createdAt?.seconds ? new Date(review.createdAt.seconds * 1000).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "-"}
                            </span>
                            <div className="flex justify-center">
                                {expandedId === review.id ? <ChevronUp className="w-5 h-5 text-[#8B95A1]" /> : <ChevronDown className="w-5 h-5 text-[#8B95A1]" />}
                            </div>
                        </div>

                        {/* 상세 내용 펼침 영역 (애니메이션 적용) */}
                        {expandedId === review.id && (
                            <div className="px-8 pb-8 pt-2 bg-[#F9FAFB] text-[15px] text-[#4E5968] leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">                                
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-bold text-[#191F28]">후기 내용</p>
                                    
                                    {user && user.uid === review.authorId && (
                                        <button 
                                            onClick={(e) => handleDelete(e, review.id)}
                                            className="text-[13px] font-bold text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            삭제하기
                                        </button>
                                    )}
                                </div>
                                
                                <div className="p-4 bg-white rounded-[16px] border border-[#E5E8EB]">
                                    {review.content || "등록된 내용이 없습니다."}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
