import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
    Plus,
    Clock,
    Users,
    Gift,
    Briefcase,
    Link2,
    ChevronRight,
    AlertTriangle,
    Search,
    ThumbsUp,
    LayoutGrid,
    List as ListIcon,
    Trash2,
    Edit3,
    HelpCircle,
    Sparkles,
    Layers,
    ArrowLeft,
    Eye,
    MessageSquare,
    Inbox
} from 'lucide-react';

import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';

interface ProgramPost {
    id: string;
    title: string;
    description: string;
    targetAttendees: string;
    duration: string;
    materials: string;
    gifts: string;
    guideSteps: string[];
    referenceUrl: string;
    author: string;
    createdAt: string;
    likes: number;
    isOfficial?: boolean;
    userId?: string;
    views?: number;
    commentsCount?: number;
    likedUsers?: string[];
}

// 모바일 전용 게시판 전환 탭은 이제 Layout.tsx에서 공용으로 렌더링한다(BoardSwitcher.tsx 참고) —
// 페이지 3개에 복제해서 넣으면 페이지마다 배경색 맥락이 달라 스타일이 미묘하게 달라 보이고,
// 라우트 이동 시 컴포넌트가 매번 언마운트돼서 활성 탭이 부드럽게 슬라이드하는 애니메이션도
// 못 만들었다.

export default function ProgramHub() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [posts, setPosts] = useState<ProgramPost[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewType, setViewType] = useState<'card' | 'list'>('card');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        guideSteps: '',
        targetAttendees: '',
        duration: '',
        materials: '',
        gifts: '',
        referenceUrl: ''
    });

    const handleRegisterClick = () => {
        if (!isLoggedIn) {
            window.dispatchEvent(new Event("open-login-modal"));
            return;
        }
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const [selectedPost, setSelectedPost] = useState<ProgramPost | null>(null);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            const loggedIn = !!user;
            setIsLoggedIn(loggedIn);
            setCurrentUserId(user ? user.uid : null);

            window.dispatchEvent(new CustomEvent("auth-state-changed", { detail: { isLoggedIn: loggedIn } }));
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsLoggedIn(!!user); // 사용자가 있으면 true, 없으면 false
        });
        return () => unsubscribe();
    }, []);

    // 🔐 [기능 절대 보존] 조회 (Read): Firestore 실시간 동기화
    useEffect(() => {
        const q = query(collection(db, 'programs'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const programList: ProgramPost[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                programList.push({
                    id: doc.id,
                    title: data.title || '',
                    description: data.description || '',
                    targetAttendees: data.targetAttendees || '',
                    duration: data.duration || '',
                    materials: data.materials || '',
                    gifts: data.gifts || '',
                    guideSteps: data.guideSteps || [],
                    referenceUrl: data.referenceUrl || '',
                    author: data.author || '익명 회원',
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : '2026.06.19',
                    likes: data.likes || 0,
                    isOfficial: data.isOfficial || false,
                    userId: data.userId || '',
                    views: data.views || 0,
                    commentsCount: data.commentsCount || 0,
                    likedUsers: data.likedUsers || []
                });
            });
            setPosts(programList);

            // 실시간 데이터 갱신 시 상세보기 화면 동기화
            if (selectedPost) {
                const updated = programList.find(p => p.id === selectedPost.id);
                if (updated) setSelectedPost(updated);
            }
        }, (error) => {
            console.error("Firebase 로드 에러:", error);
        });

        return () => unsubscribe();
    }, [selectedPost]);

    // [기능 추가] 상세보기 진입 시 조회수(views) 증가 트랜잭션 함수
    const handleSelectPost = async (post: ProgramPost) => {
        // 목록에서 상세화면으로 전환될 때 라우트 변경이 없는 단일 컴포넌트 구조라
        // <ScrollRestoration />이 동작하지 않는다 - 수동으로 맨 위로 스크롤한다.
        window.scrollTo(0, 0);
        setSelectedPost(post);
        try {
            const postRef = doc(db, 'programs', post.id);
            await updateDoc(postRef, {
                views: (post.views || 0) + 1
            });
        } catch (e) {
            console.error("조회수 업데이트 실패:", e);
        }
    };

    // 🔐 [기능 절대 보존] 등록 및 수정 핸들러 로직 유지
    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();

        const stepsArray = formData.guideSteps
            .split('\n')
            .map(step => step.trim())
            .filter(step => step.length > 0);

        try {
            if (isEditMode && editingPostId) {
                const postRef = doc(db, 'programs', editingPostId);
                await updateDoc(postRef, {
                    title: formData.title,
                    description: formData.description,
                    targetAttendees: formData.targetAttendees,
                    duration: formData.duration,
                    materials: formData.materials,
                    gifts: formData.gifts,
                    guideSteps: stepsArray,
                    referenceUrl: formData.referenceUrl,
                });
                console.log("Firebase Update Success:", editingPostId);
            } else {
                await addDoc(collection(db, 'programs'), {
                    title: formData.title,
                    description: formData.description,
                    targetAttendees: formData.targetAttendees,
                    duration: formData.duration,
                    materials: formData.materials,
                    gifts: formData.gifts,
                    guideSteps: stepsArray,
                    referenceUrl: formData.referenceUrl,
                    author: 'STAYON 회원',
                    userId: currentUserId || 'anonymous',
                    // userId: 'current_user_id',
                    likes: 0,
                    views: 0,
                    commentsCount: 0,
                    isOfficial: false,
                    createdAt: serverTimestamp(),
                    likedUsers: []
                });
                console.log("Firebase Save Success");
            }
            closeAndResetModal();
        } catch (error) {
            console.error("Firebase 처리 중 오류 발생:", error);
            alert("저장에 실패했습니다. 다시 시도해주세요.");
        }
    };

    const handleDeletePost = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("정말 이 프로그램을 삭제하시겠습니까?")) {
            try {
                // [수정] 삭제 작업 수행
                await deleteDoc(doc(db, 'programs', id));
                // [수정] 삭제 후 UI 즉시 반영 (선택된 포스트 해제)
                setSelectedPost(null);
                console.log("Firebase Delete Success:", id);
            } catch (error) {
                console.error("Firebase 삭제 오류:", error);
                alert("삭제 권한이 없거나 오류가 발생했습니다."); // [수정] 사용자 피드백 추가
            }
        }
    };

    // 본인이 작성한 글인지 — 수정 버튼 노출/클릭 둘 다 이 기준으로 막는다(로그인 안 했으면 항상 false).
    const isOwner = (post: ProgramPost) => !!isLoggedIn && !!currentUserId && post.userId === currentUserId;

    const openEditModal = (post: ProgramPost, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOwner(post)) return; // 버튼이 안 보이는 게 정상이지만, 혹시 몰라 한 번 더 막아둔다.
        setIsEditMode(true);
        setEditingPostId(post.id);
        setFormData({
            title: post.title,
            description: post.description,
            guideSteps: post.guideSteps.join('\n'),
            targetAttendees: post.targetAttendees,
            duration: post.duration,
            materials: post.materials,
            gifts: post.gifts,
            referenceUrl: post.referenceUrl
        });
        setIsModalOpen(true);
    };

    const closeAndResetModal = () => {
        setIsModalOpen(false);
        setIsEditMode(false);
        setEditingPostId(null);
        setFormData({
            title: '',
            description: '',
            guideSteps: '',
            targetAttendees: '',
            duration: '',
            materials: '',
            gifts: '',
            referenceUrl: ''
        });
    };

    // const handleLikePost = async (id: string, currentLikes: number, e: React.MouseEvent) => {
    //     e.stopPropagation();
    //     const postRef = doc(db, 'programs', id);
    //     await updateDoc(postRef, {
    //         likes: currentLikes + 1
    //     });
    // };
    const handleLikePost = async (post: ProgramPost, e: React.MouseEvent) => {
        e.stopPropagation();

        // 1. 로그인 상태 필터링
        if (!isLoggedIn || !currentUserId) {
            alert("좋아요는 로그인한 상태에서 눌러주세요.");
            window.dispatchEvent(new Event("open-login-modal"));
            return;
        }

        const postRef = doc(db, 'programs', post.id);
        const likedUsersList = post.likedUsers || [];

        // 2. 이미 좋아요를 눌렀는지 유저 ID 분기 체크
        const hasLiked = likedUsersList.includes(currentUserId);

        try {
            if (hasLiked) {
                // 이미 눌렀다면: 배열에서 내 UID 제거 및 좋아요 카운트 -1 감소
                await updateDoc(postRef, {
                    likedUsers: arrayRemove(currentUserId),
                    likes: Math.max(0, (post.likes || 0) - 1)
                });
            } else {
                // 처음 누른다면: 배열에 내 UID 적재 및 좋아요 카운트 +1 증가
                await updateDoc(postRef, {
                    likedUsers: arrayUnion(currentUserId),
                    likes: (post.likes || 0) + 1
                });
            }
        } catch (error) {
            console.error("좋아요 업데이트 실패:", error);
        }
    };

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-[#F2F4F6] text-[#191F28] font-sans antialiased pb-32">
            <AnimatePresence mode="wait">
                {/* ==========================================
                    0. 글쓰기/수정 화면 — 예전엔 팝업이었는데, 조회 화면처럼
                       화면을 통째로 차지하는 페이지 형태로 바꿨다(요청 1번).
                   ========================================== */}
                {isModalOpen ? (
                    <motion.div key="form" className="max-w-2xl mx-auto px-4 pt-5 md:px-6 md:pt-12">
                        <div className="flex items-center justify-between mb-4 md:mb-8 gap-2">
                            <button onClick={closeAndResetModal}
                                className="flex items-center gap-1.5 md:gap-2 text-[#4E5968] hover:text-[#191F28] font-bold text-[13px] md:text-sm bg-white px-3.5 py-2 md:px-5 md:py-2.5 rounded-full shadow-sm transition shrink-0">
                                <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> 목록으로
                            </button>
                            <h1 className="text-[15px] md:text-xl font-black text-[#191F28] tracking-tight truncate">
                                {isEditMode ? "프로그램 기획서 수정" : "프로그램 정보 공유"}
                            </h1>
                        </div>

                        <div className="bg-white rounded-[18px] md:rounded-[24px] p-4 md:p-10 shadow-sm border border-[#E5E8EB]">
                            <p className="text-[#8B95A1] font-bold text-[11px] md:text-xs mb-4 md:mb-6 break-keep">우리 교회의 소중한 레크리에이션 노하우를 공유합니다.</p>

                            <form className="space-y-4 md:space-y-5" onSubmit={handleCreatePost}>
                                <div className="space-y-3.5 md:space-y-4">
                                    <div>
                                        <label className="block text-[12px] md:text-[13px] font-black text-[#4E5968] mb-1.5 ml-1">프로그램 이름</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="예: 신서유기 고요속의 외침 변형"
                                            className="w-full bg-[#F2F4F6] border-none rounded-xl p-3 md:p-3.5 text-[#191F28] font-bold placeholder-[#B0B8C1] focus:ring-2 focus:ring-blue-600 outline-none text-[13px] md:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[12px] md:text-[13px] font-black text-[#4E5968] mb-1.5 ml-1">한줄 요약 및 목적</label>
                                        <textarea
                                            rows={2}
                                            required
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="이 프로그램의 목적과 핵심 재미요소를 짧게 설명해주세요."
                                            className="w-full bg-[#F2F4F6] border-none rounded-xl p-3 md:p-3.5 text-[#191F28] font-bold placeholder-[#B0B8C1] focus:ring-2 focus:ring-blue-600 outline-none resize-none text-[13px] md:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[12px] md:text-[13px] font-black text-[#4E5968] mb-1.5 ml-1 break-keep">진행 절차 및 상세 순서 (엔터로 단계를 구분해 주세요)</label>
                                        <textarea
                                            rows={5}
                                            required
                                            value={formData.guideSteps}
                                            onChange={(e) => setFormData({ ...formData, guideSteps: e.target.value })}
                                            placeholder="1. 원형으로 둘러 앉기&#10;2. 술래 선정 및 질문 던지기&#10;3. 오답자 패널티 진행 순서로 세분화해 적어주세요."
                                            className="w-full bg-[#F2F4F6] border-none rounded-xl p-3 md:p-3.5 text-[#191F28] font-bold placeholder-[#B0B8C1] focus:ring-2 focus:ring-blue-600 outline-none resize-none text-[13px] md:text-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5 md:gap-4">
                                        <div>
                                            <label className="block text-[12px] md:text-[13px] font-black text-[#4E5968] mb-1.5 ml-1">권장 인원</label>
                                            <input
                                                type="text"
                                                value={formData.targetAttendees}
                                                onChange={(e) => setFormData({ ...formData, targetAttendees: e.target.value })}
                                                placeholder="예: 20~30명"
                                                className="w-full bg-[#F2F4F6] border-none rounded-xl p-3 md:p-3.5 text-[#191F28] font-bold focus:ring-2 focus:ring-blue-600 outline-none text-[13px] md:text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[12px] md:text-[13px] font-black text-[#4E5968] mb-1.5 ml-1">소요 시간</label>
                                            <input
                                                type="text"
                                                value={formData.duration}
                                                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                                placeholder="예: 40분"
                                                className="w-full bg-[#F2F4F6] border-none rounded-xl p-3 md:p-3.5 text-[#191F28] font-bold focus:ring-2 focus:ring-blue-600 outline-none text-[13px] md:text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5 md:gap-4">
                                        <div>
                                            <label className="block text-[12px] md:text-[13px] font-black text-[#4E5968] mb-1.5 ml-1">필요 준비물</label>
                                            <input
                                                type="text"
                                                value={formData.materials}
                                                onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                                                placeholder="예: 스케치북, 매직, 안대"
                                                className="w-full bg-[#F2F4F6] border-none rounded-xl p-3 md:p-3.5 text-[#191F28] font-bold focus:ring-2 focus:ring-blue-600 outline-none text-[13px] md:text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[12px] md:text-[13px] font-black text-[#4E5968] mb-1.5 ml-1">추천 상품 / 선물</label>
                                            <input
                                                type="text"
                                                value={formData.gifts}
                                                onChange={(e) => setFormData({ ...formData, gifts: e.target.value })}
                                                placeholder="예: 다이소 상품권, 배민 금액권"
                                                className="w-full bg-[#F2F4F6] border-none rounded-xl p-3 md:p-3.5 text-[#191F28] font-bold focus:ring-2 focus:ring-blue-600 outline-none text-[13px] md:text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[12px] md:text-[13px] font-black text-[#4E5968] mb-1.5 ml-1 flex items-center gap-2">
                                            <Link2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> 참고 영상 / URL 링크
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.referenceUrl}
                                            onChange={(e) => setFormData({ ...formData, referenceUrl: e.target.value })}
                                            placeholder="https://youtube.com/..."
                                            className="w-full bg-[#F2F4F6] border-none rounded-xl p-3 md:p-3.5 text-[#191F28] font-bold focus:ring-2 focus:ring-blue-600 outline-none text-[13px] md:text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="pt-3 md:pt-4 flex gap-2.5 md:gap-3">
                                    <button type="button" onClick={closeAndResetModal} className="flex-1 bg-[#F2F4F6] text-[#4E5968] font-black py-3.5 md:py-4 rounded-xl md:rounded-2xl hover:bg-[#E5E8EB] transition-colors text-[13px] md:text-sm">취소</button>
                                    <button type="submit" className="flex-1 bg-[#3182F6] text-white font-black py-3.5 md:py-4 rounded-xl md:rounded-2xl shadow-lg shadow-blue-100 hover:bg-[#1B64DA] transition-all text-[13px] md:text-sm">
                                        {isEditMode ? "수정완료" : "등록하기"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                ) : selectedPost ? (
                    <motion.div key="details" className="max-w-4xl mx-auto px-4 pt-5 md:px-6 md:pt-12">
                        {/* 상단바: 더 깔끔하고 직관적으로 개선 */}
                        <div className="flex items-center justify-between mb-4 md:mb-8">
                            <button onClick={() => setSelectedPost(null)}
                                className="flex items-center gap-1.5 md:gap-2 text-[#4E5968] hover:text-[#191F28] font-bold text-[13px] md:text-sm bg-white px-3.5 py-2 md:px-5 md:py-2.5 rounded-full shadow-sm transition">
                                <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> 목록으로
                            </button>
                            <div className="flex items-center gap-2">
                                {/* 본인이 작성한 글일 때만 수정 버튼 노출 */}
                                {isOwner(selectedPost) && (
                                    <button onClick={(e) => openEditModal(selectedPost, e)} className="text-[#6B7684] hover:text-[#191F28] p-2 text-[13px] md:text-base">수정</button>
                                )}
                                {/* [수정] 삭제 버튼에 경고 색상(빨간색) 명시 */}
                                {/* <button onClick={(e) => handleDeletePost(selectedPost.id, e)} className="text-[#F04452] font-bold hover:text-red-700 p-2">삭제</button> */}
                            </div>
                        </div>

                        {/* 메인 상세 정보 영역: 가독성 극대화 */}
                        <div className="bg-white rounded-[18px] md:rounded-[24px] p-5 md:p-10 shadow-sm border border-[#E5E8EB]">
                            <h1 className="text-[20px] md:text-3xl font-black text-[#191F28] mb-3 md:mb-6 tracking-tight break-keep">{selectedPost.title}</h1>
                            <p className="text-[#4E5968] text-[14px] md:text-lg leading-relaxed break-keep">{selectedPost.description}</p>

                            {/* [수정] 메트릭 영역: 아이콘과 텍스트의 조화 */}
                            <div className="flex flex-wrap gap-2.5 md:gap-4 mt-5 md:mt-8 pt-5 md:pt-8 border-t border-[#F2F4F6]">
                                <MetricItem icon={<Users className="w-4 h-4 text-blue-600" />} label="권장대상" value={selectedPost.targetAttendees} />
                                <MetricItem icon={<Clock className="w-4 h-4 text-blue-600" />} label="소요시간" value={selectedPost.duration} />
                            </div>
                        </div>

                        {/* [수정] 가이드 섹션: 훨씬 더 직관적인 타임라인형 디자인 */}
                        <div className="mt-4 md:mt-6 bg-white rounded-[18px] md:rounded-[24px] p-5 md:p-8 shadow-sm border border-[#E5E8EB]">
                            <h3 className="text-[15px] md:text-lg font-black text-[#191F28] mb-4 md:mb-6">진행 절차</h3>
                            <div className="space-y-4 md:space-y-6">
                                {selectedPost.guideSteps.map((step, idx) => (
                                    <div key={idx} className="flex gap-3 md:gap-4">
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#191F28] text-white flex items-center justify-center font-bold text-[13px] md:text-base shrink-0">{idx + 1}</div>
                                        <p className="text-[#333D4B] font-medium leading-relaxed text-[13.5px] md:text-base break-keep">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    /* ==========================================
                        2. 게시판 홈 화면 (기존 리스트 및 메인 그리드)
                       ========================================== */
                    <motion.div
                        key="list-view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* 토스 스타일 히어로 배너 */}
                        <div className="bg-white py-8 px-4 md:py-16 md:px-6 border-b border-[#E5E8EB]">
                            <div className="max-w-7xl mx-auto">
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-blue-600 font-black text-[11px] md:text-xs tracking-wider mb-2 md:mb-3 block"
                                >
                                    레크리에이션 프로그램 게시판
                                </motion.span>
                                <h1 className="text-[22px] md:text-4xl font-black text-[#191F28] tracking-tight leading-tight break-keep">
                                    이번 수련회 레크리에이션,<br className="md:hidden" /> <span className="text-blue-600">다른 교회는 뭐 할까?</span>
                                </h1>
                                <p className="text-[#4E5968] mt-2.5 md:mt-4 text-[13px] md:text-lg font-medium leading-relaxed max-w-2xl break-keep">
                                    준비물부터 진행 순서까지 실제 교회 사역자들이 검증한 레크리에이션 아이디어를 공유해보세요.
                                </p>

                                {/* 온보딩 플로우 가이드 바 */}
                                <div className="mt-6 md:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 md:gap-4 border-t border-[#F2F4F6] pt-5 md:pt-8">
                                    <div className="bg-[#F9FAFB] p-3.5 md:p-5 rounded-xl md:rounded-2xl flex items-start gap-3 md:gap-4">
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600 font-black text-[13px] md:text-sm">1</div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-[13px] md:text-[15px] text-[#191F28]">실전 기획서 탐색</h4>
                                            <p className="text-[11px] md:text-xs text-[#6B7684] mt-0.5 md:mt-1 break-keep">인원과 소요시간 필터를 통해 우리 조에 맞는 게임을 찾아요.</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#F9FAFB] p-3.5 md:p-5 rounded-xl md:rounded-2xl flex items-start gap-3 md:gap-4">
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-600 font-black text-[13px] md:text-sm">2</div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-[13px] md:text-[15px] text-[#191F28]">준비물 및 선물 체크</h4>
                                            <p className="text-[11px] md:text-xs text-[#6B7684] mt-0.5 md:mt-1 break-keep">기획서에 적힌 상세 준비물 리스트로 예산을 미리 산출해요.</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#F9FAFB] p-3.5 md:p-5 rounded-xl md:rounded-2xl flex items-start gap-3 md:gap-4">
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-purple-50 flex items-center justify-center shrink-0 text-purple-600 font-black text-[13px] md:text-sm">3</div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-[13px] md:text-[15px] text-[#191F28]">사역 노하우 공유</h4>
                                            <p className="text-[11px] md:text-xs text-[#6B7684] mt-0.5 md:mt-1 break-keep">우리 교회만 알고 있는 꿀잼 프로그램을 등록해 사역을 도와요.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 md:mt-6 flex items-start md:items-center gap-2.5 md:gap-3 bg-[#FFF0F2] text-[#F04452] p-3.5 md:p-4 rounded-xl md:rounded-2xl text-[11px] md:text-sm font-bold shadow-sm break-keep">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 md:mt-0" />
                                    <span>건전한 나눔을 위해 수련회 목적과 맞지 않는 부적절한 기획안은 예고 없이 숨김 처리될 수 있습니다.</span>
                                </div>
                            </div>
                        </div>

                        <div className="max-w-7xl mx-auto px-4 md:px-6 mt-5 md:mt-10">
                            {/* 컨트롤러 바 */}
                            <div className="flex flex-col lg:flex-row gap-3 md:gap-6 justify-between items-stretch lg:items-center mb-5 md:mb-10">
                                <div className="relative w-full lg:w-96 group">
                                    <Search className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-[#8B95A1] group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="어떤 프로그램을 찾으시나요?"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white pl-10 md:pl-12 pr-4 py-3 md:py-4 rounded-2xl md:rounded-3xl border-2 border-transparent font-bold text-[14px] md:text-[16px] text-[#191F28] shadow-sm focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-[#B0B8C1]"
                                    />
                                </div>

                                <div className="flex items-center gap-2 md:gap-4 w-full lg:w-auto">
                                    <div className="bg-[#E5E8EB] p-1 rounded-xl md:rounded-2xl flex items-center shrink-0">
                                        <button
                                            onClick={() => setViewType('card')}
                                            className={`flex items-center gap-1.5 px-3 py-2 md:px-4 rounded-lg md:rounded-xl text-[12px] md:text-sm font-black whitespace-nowrap transition-all ${viewType === 'card' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#6B7684]'}`}
                                        >
                                            <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" /> 카드
                                        </button>
                                        <button
                                            onClick={() => setViewType('list')}
                                            className={`flex items-center gap-1.5 px-3 py-2 md:px-4 rounded-lg md:rounded-xl text-[12px] md:text-sm font-black whitespace-nowrap transition-all ${viewType === 'list' ? 'bg-white text-[#191F28] shadow-sm' : 'text-[#6B7684]'}`}
                                        >
                                            <ListIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> 표
                                        </button>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleRegisterClick}
                                        className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-4 py-2.5 md:px-8 md:py-4 rounded-2xl md:rounded-3xl font-black text-[12px] md:text-base shadow-lg whitespace-nowrap transition-all ${isLoggedIn ? "bg-[#3182F6] hover:bg-[#1b64da] text-white" : "bg-[#191F28] hover:bg-[#333D4B] text-white"
                                            }`}
                                    >
                                        <Plus className="w-4 h-4 md:w-5 md:h-5" /> {isLoggedIn ? "프로그램 등록" : "로그인하고 등록"}
                                    </motion.button>
                                </div>
                            </div>

                            {/* 내장 뷰 배치 */}
                            {viewType === 'card' ? (
                                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-6">
                                    {filteredPosts.length === 0 && (
                                        <div className="col-span-full py-14 md:py-20 text-center bg-white rounded-[22px] md:rounded-[32px] border border-[#E5E8EB]">
                                            <HelpCircle className="w-10 h-10 md:w-12 md:h-12 text-[#B0B8C1] mx-auto mb-3 md:mb-4" />
                                            <h3 className="text-[15px] md:text-xl font-black text-[#191F28]">등록된 프로그램이 없어요.</h3>
                                            <p className="text-[#8B95A1] font-medium mt-2 text-[12px] md:text-base break-keep px-4">첫 번째 레크리에이션 아이디어를 공유해 보세요!</p>
                                        </div>
                                    )}

                                    {filteredPosts.map((post) => (
                                        /* 카드 전체 영역 클릭 시 상세보기 라우팅 핸들러 적용.
                                           모바일에선 2장씩 나란히 보여달라고 하셔서(grid-cols-2) 카드 폭이
                                           많이 좁아지는 만큼, 준비물/선물처럼 덜 중요한 정보는 모바일에서 숨기고
                                           핵심(제목/설명/태그/좋아요)만 작게 보여준다. */
                                        <div
                                            key={post.id}
                                            onClick={() => handleSelectPost(post)}
                                            className="bg-white p-3 md:p-6 rounded-[18px] md:rounded-[32px] shadow-sm border border-[#E5E8EB]/60 flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-1.5 duration-200 cursor-pointer group"
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-2 md:mb-4 gap-1">
                                                    {post.isOfficial ? (
                                                        <span className="bg-[#E8F3FF] text-blue-600 text-[8px] md:text-[10px] font-black px-2 py-0.5 md:px-2.5 md:py-1 rounded-full uppercase tracking-tight">Official</span>
                                                    ) : (
                                                        <span className="bg-[#F2F4F6] text-[#4E5968] text-[8px] md:text-[10px] font-black px-2 py-0.5 md:px-2.5 md:py-1 rounded-full">Community</span>
                                                    )}

                                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                        {isOwner(post) && (
                                                            <button onClick={(e) => openEditModal(post, e)} className="text-[#8B95A1] hover:text-blue-600 p-1 transition-colors">
                                                                <Edit3 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                            </button>
                                                        )}
                                                        {/* <button onClick={(e) => handleDeletePost(post.id, e)} className="text-[#8B95A1] hover:text-red-500 p-1 transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button> */}
                                                    </div>
                                                </div>

                                                <h3 className="text-[13.5px] md:text-xl font-black text-[#191F28] leading-tight mb-1.5 md:mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors break-keep">
                                                    {post.title}
                                                </h3>
                                                <p className="text-[#4E5968] text-[11.5px] md:text-[14px] font-medium leading-relaxed line-clamp-2 mb-2.5 md:mb-4 break-keep">
                                                    {post.description}
                                                </p>

                                                <div className="flex flex-wrap gap-1 md:gap-2 mb-2.5 md:mb-4">
                                                    <span className="flex items-center gap-1 bg-[#F2F4F6] text-[#4E5968] text-[9.5px] md:text-xs font-bold px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-lg md:rounded-xl">
                                                        <Users className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500 shrink-0" /> {post.targetAttendees || '전인원'}
                                                    </span>
                                                    <span className="flex items-center gap-1 bg-[#F2F4F6] text-[#4E5968] text-[9.5px] md:text-xs font-bold px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-lg md:rounded-xl">
                                                        <Clock className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-500 shrink-0" /> {post.duration || '자율'}
                                                    </span>
                                                </div>

                                                {/* 준비물/추천선물 상세 박스: 2열 모바일에서는 카드 폭이 너무 좁아져서 숨김.
                                                    추천선물 줄을 있을 때만 넣으면 게시글마다 카드 높이가 들쭉날쭉해져서
                                                    (요청 5번), 항상 두 줄 다 렌더링하고 값이 없으면 "없음"으로 채운다. */}
                                                <div className="hidden md:block bg-[#FAFBFC] p-3.5 rounded-2xl text-xs space-y-2 border border-[#F2F4F6]">
                                                    <div className="flex items-start gap-2">
                                                        <span className="font-bold text-[#8B95A1] shrink-0 w-14">준비물</span>
                                                        <span className="text-[#333D4B] font-medium line-clamp-1">{post.materials || '없음'}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2 border-t border-[#F2F4F6] pt-2">
                                                        <span className="font-bold text-[#8B95A1] shrink-0 w-14">추천선물</span>
                                                        <span className={`font-medium line-clamp-1 ${post.gifts ? "text-blue-600" : "text-[#333D4B]"}`}>{post.gifts || '없음'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 메인 카드 하단 메트릭 보드 컴포넌트 마운트 */}
                                            <div className="flex items-center justify-between mt-2.5 md:mt-5 pt-2.5 md:pt-4 border-t border-[#F2F4F6] gap-1">
                                                <div className="flex items-center gap-1 md:gap-2 text-[9.5px] md:text-[11px] font-bold text-[#8B95A1]" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        // 🚨 [수정 - 호출 인자 변경] 고정 인자 대신 post 오브젝트 전체를 넘겨 고유 다중 처리가 가능하도록 변경
                                                        onClick={(e) => handleLikePost(post, e)}
                                                        // 🚨 [수정 - 토스 스타일 UI 피드백 반영] 현재 유저가 누른 상태라면 채워진 파란색 느낌을 주도록 동적 스타일 추가
                                                        className={`flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md md:rounded-lg transition-colors ${post.likedUsers?.includes(currentUserId || '')
                                                            ? "bg-blue-50 text-blue-600 font-black"
                                                            : "bg-[#F2F4F6] text-[#6B7684] hover:text-blue-600 hover:bg-blue-50"
                                                            }`}
                                                    >
                                                        {/* 💡 사라졌던 아이콘과 텍스트를 다시 추가합니다. */}
                                                        <ThumbsUp
                                                            className={`w-2.5 h-2.5 md:w-3 md:h-3 ${post.likedUsers?.includes(currentUserId || '') ? "text-blue-600" : "text-[#6B7684]"
                                                                }`}
                                                        />
                                                        <span>{post.likedUsers?.length || 0}</span> {/* 혹은 {post.likes} */}
                                                    </button>
                                                    <span className="hidden sm:flex items-center gap-0.5"><Eye className="w-2.5 h-2.5 md:w-3 md:h-3" /> {post.views || 0}</span>
                                                    <span className="hidden sm:flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5 md:w-3 md:h-3" /> {post.commentsCount || 0}</span>
                                                </div>
                                                <span className="text-[9px] md:text-[11px] font-medium text-[#B0B8C1] shrink-0">{post.createdAt}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* 표 형태 리스트 뷰 */
                                <div className="bg-white rounded-[20px] md:rounded-[32px] shadow-sm border border-[#F2F4F6] overflow-hidden">
                                    <table className="w-full text-left border-collapse table-fixed"> {/* table-fixed를 주어야 아래 퍼센트 비율이 정확히 먹힙니다 */}

                                        {/* 전체 비중 10 기준 -> 7 : 1 : 1 : 1 황금 비율 강제 지정 */}
                                        <colgroup>
                                            <col className="w-[66%] sm:w-[66%]" /> {/* 프로그램명 */}
                                            <col className="hidden md:table-cell w-[14%]" /> {/* 통계 메트릭 — 한 줄로 나란히 배치해서 조금 더 넓게 */}
                                            <col className="hidden md:table-cell w-[10%]" /> {/* 등록일 */}
                                            <col className="w-[10%]" /> {/* 관리 액션 */}
                                        </colgroup>

                                        <thead>
                                            <tr className="border-b border-[#F2F4F6] bg-[#FAFBFC]">
                                                {/* 넘버링 공간을 고려하여 좌측 여백 정렬 — PC에서 리스트를 훑어보기엔
                                                    px-8/py-5(32px/20px)가 과했어서 px-6/py-3.5(24px/14px)로 줄임 */}
                                                <th className="px-3.5 py-3 md:px-6 md:py-3.5 text-[11px] md:text-[13px] font-black text-[#8B95A1] uppercase tracking-wider">프로그램 및 개요</th>
                                                <th className="px-2 py-3.5 text-[13px] font-black text-[#8B95A1] uppercase tracking-wider hidden md:table-cell text-center">통계</th>
                                                <th className="px-2 py-3.5 text-[13px] font-black text-[#8B95A1] uppercase tracking-wider hidden md:table-cell text-center">등록일</th>
                                                {/* <th className="px-8 py-5 text-[13px] font-black text-[#8B95A1] uppercase tracking-wider text-right"></th> */}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F2F4F6]">
                                            {filteredPosts.map((post, index) => {
                                                /* 가장 첫 데이터가 맨 아래로 가도록 내림차순 역순 넘버링 계산 (4, 3, 2, 1...) */
                                                const displayIndex = filteredPosts.length - index;

                                                return (
                                                    /* 행 클릭 시 상세 페이지 바인딩 */
                                                    <tr
                                                        key={post.id}
                                                        onClick={() => handleSelectPost(post)}
                                                        className="hover:bg-[#F9FAFB] transition-colors cursor-pointer group"
                                                    >
                                                        {/* 비중 7: 프로그램명 및 설명 (역순 넘버링 포함) */}
                                                        <td className="px-3.5 py-3 md:px-6 md:py-3.5">
                                                            <div className="flex items-start gap-2.5 md:gap-3 min-w-0">
                                                                {/* 처음 보는 사람도 순서를 알기 쉽게 토스 스타일 인덱스 넘버링 추가 */}
                                                                <span className="text-[12px] md:text-[14px] font-black text-[#B0B8C1] group-hover:text-blue-600 transition-colors pt-0.5 min-w-[16px] md:min-w-[20px]">
                                                                    {displayIndex}
                                                                </span>

                                                                <div className="flex flex-col min-w-0">
                                                                    <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                                                                        {post.isOfficial && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>}
                                                                        <span className="text-[13.5px] md:text-[16px] font-black text-[#191F28] group-hover:text-blue-600 transition-colors truncate">
                                                                            {post.title}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[11.5px] md:text-sm font-medium text-[#8B95A1] line-clamp-1">
                                                                        {post.description}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* 비중 1: 메트릭 데이터 — 3줄로 세로로 쌓으면 행마다 높이가 들쭉날쭉해 보이고
                                                            눈으로 훑기도 불편해서, 표에 맞게 한 줄로 나란히 배치했다. */}
                                                        <td className="px-2 py-3.5 hidden md:table-cell text-center vertical-middle">
                                                            <div className="inline-flex items-center gap-2.5 text-[12px] text-[#6B7684] font-bold whitespace-nowrap">
                                                                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-[#B0B8C1]" /> {post.views || 0}</span>
                                                                <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-[#B0B8C1]" /> {post.commentsCount || 0}</span>
                                                                <span className="flex items-center gap-1 text-blue-500"><ThumbsUp className="w-3.5 h-3.5 text-blue-400" /> {post.likes}</span>
                                                            </div>
                                                        </td>

                                                        {/* 등록일 글자 깨짐 방지 및 중앙 정렬 */}
                                                        <td className="px-2 py-3.5 hidden md:table-cell text-center vertical-middle">
                                                            <span className="text-[13px] font-bold text-[#8B95A1] tracking-tight whitespace-nowrap">
                                                                {post.createdAt}
                                                            </span>
                                                        </td>

                                                        {/* 우측 끝 관리 도구 정렬 */}
                                                        <td className="px-3 py-3 md:px-6 md:py-3.5 text-right vertical-middle">
                                                            <div className="flex items-center justify-end gap-1 md:gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                {isOwner(post) && (
                                                                    <button
                                                                        onClick={(e) => openEditModal(post, e)}
                                                                        className="text-[#B0B8C1] hover:text-blue-600 p-1 md:p-1.5 hover:bg-[#F2F4F6] rounded-lg md:rounded-xl transition-all"
                                                                    >
                                                                        <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                                    </button>
                                                                )}
                                                                {/* <button
                                                                    onClick={(e) => handleDeletePost(post.id, e)}
                                                                    className="text-[#B0B8C1] hover:text-red-500 p-1.5 hover:bg-[#F2F4F6] rounded-xl transition-all"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button> */}
                                                                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-[#ADB5BD] ml-0.5 md:ml-1 transition-transform group-hover:translate-x-0.5" />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}

const MetricItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex items-center gap-1.5 md:gap-2 bg-[#F2F4F6] px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl">
        {icon}
        <span className="text-[12px] md:text-sm font-bold text-[#4E5968]">{label}:</span>
        <span className="text-[12px] md:text-sm font-medium text-[#191F28] break-keep">{value}</span>
    </div>
);
