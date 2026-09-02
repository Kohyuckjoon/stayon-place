import React, { useState, useEffect } from "react";
// useNavigate를 react-router-dom에서 가져오도록 수정
import { useNavigate, ScrollRestoration } from "react-router-dom";
import {
    ChevronLeft, Camera, Check, User, Mail, ShieldCheck, ExternalLink, AlertCircle, AlertTriangle
} from "lucide-react";
import { Header } from "../components/Header";
import { useAuth } from "../lib/AuthContext";
import { db } from "../lib/firebase";
import { deleteUserAccount } from "../lib/auth";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfileSettings() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    // 변수명/함수명 유지 및 상태 관리
    const [displayName, setDisplayName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // 회원 탈퇴 — 원래 Header.tsx의 계정 드롭다운/모바일 메뉴에 있었는데, 실수로 누르기
    // 쉬운 자리라 이탈률만 높인다는 판단으로 여기(정보 수정 페이지 맨 아래)로 옮겼다.
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || "");
        }
    }, [user]);

    // 정보 수정 로직 (기존 Firebase 구조 활용) - 기능 유지
    const handleSave = async () => {
        if (!user || isSaving) return;
        setIsSaving(true);

        try {
            // 1. Firebase Auth 프로필 업데이트
            await updateProfile(user, { displayName });

            // 2. Firestore 사용자 문서 동기화 (주석 해제하여 사용 권장)
            // await updateDoc(doc(db, "users", user.uid), { displayName });

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                navigate("/mypage"); // 수정 후 마이페이지로 복귀
            }, 1500);
        } catch (error) {
            console.error("Profile Update Error:", error);
            // 스타일 에러 알림이 있다면 대체 가능
            alert("정보 수정 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    // Header.tsx에 있던 handleDeleteAccount와 동일한 로직(플래너 데이터 삭제 → users 문서
    // 삭제 → Auth 계정 삭제) — 여기서는 토스트/로그인모달 리셋 같은 Header 전용 상태가
    // 필요 없어서 그 부분만 빼고 그대로 옮겼다.
    const handleDeleteAccount = async () => {
        if (!user || isDeleting) return;
        setIsDeleting(true);
        try {
            const plannerRef = collection(db, "planner");
            const q = query(plannerRef, where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            await Promise.all(
                querySnapshot.docs.map((document) => deleteDoc(doc(db, "planner", document.id)))
            );
            await deleteDoc(doc(db, "users", user.uid));
            await deleteUserAccount();
            navigate("/");
        } catch (error) {
            console.error("Delete account failed:", error);
            setIsDeleteModalOpen(false);
            alert("보안을 위해 다시 로그인한 직후에만 탈퇴가 가능합니다.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-[3px] border-[#3182F6] border-t-transparent rounded-full" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F2F4F6] font-sans antialiased text-[#333D4B] pb-20">
            <ScrollRestoration />
            {/* Header 컴포넌트 배치 */}

            <main className="max-w-[1000px] mx-auto px-4 pt-6 md:px-5 md:pt-12">

                {/* 상단 헤더 & 뒤로가기 */}
                <div className="flex items-center gap-3 mb-5 md:gap-4 md:mb-10">
                    <button onClick={() => navigate(-1)} className="p-2.5 md:p-3 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-all border border-gray-100 shrink-0">
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-[#4E5968]" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-[19px] md:text-[28px] font-black text-[#191F28] tracking-tight">내 정보 관리</h1>
                        <p className="text-[#6B7684] font-medium mt-0.5 md:mt-1 text-[12px] md:text-base break-keep">서비스 이용에 필요한 기본 정보를 관리합니다.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-4 md:gap-8 items-start">

                    {/* [좌측] 프로필 이미지 카드 */}
                    <section className="bg-white p-5 md:p-10 rounded-[22px] md:rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center">
                        <div className="relative mb-4 md:mb-6">
                            <img
                                src={user?.photoURL || ""}
                                alt="profile"
                                className="w-20 h-20 md:w-32 md:h-32 rounded-full shadow-inner object-cover border-4 border-gray-50 bg-[#F2F4F6]"
                            />
                            <button className="absolute bottom-0.5 right-0.5 md:bottom-1 md:right-1 w-9 h-9 md:w-11 md:h-11 bg-white shadow-lg rounded-xl md:rounded-2xl flex items-center justify-center border border-gray-100 hover:scale-110 transition-transform active:scale-95">
                                <Camera className="w-4 h-4 md:w-5 md:h-5 text-[#3182F6]" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 md:gap-2.5 bg-[#F2F4F6] px-3 py-1.5 md:px-4 md:py-2 rounded-xl mb-2.5 md:mb-3 border border-gray-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 19.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                <path fill="none" d="M0 0h48v48H0z" />
                            </svg>
                            <p className="text-[12px] md:text-[14px] font-bold text-[#4E5968] tracking-tight">Google 계정 연동됨</p>
                        </div>
                        <p className="text-[11px] md:text-xs text-[#8B95A1] font-medium text-center leading-relaxed break-keep">프로필 사진 수정은 Google 계정 설정에서 가능합니다.</p>
                    </section>

                    {/* [우측] 정보 입력 폼 카드 */}
                    <section className="bg-white p-5 md:p-10 rounded-[22px] md:rounded-[32px] shadow-sm border border-gray-100 space-y-6 md:space-y-10">

                        {/* 이름 입력 섹션 */}
                        <div>
                            <div className="flex items-center justify-between mb-2 md:mb-3 pl-1">
                                <label className="text-[14px] md:text-[17px] font-black text-[#191F28]">이름 (실명)</label>
                                <span className="text-[11px] md:text-sm font-bold text-[#3182F6]">필수 입력</span>
                            </div>
                            <div className="relative flex items-center group">
                                <User className="absolute left-4 md:left-5 w-4 h-4 md:w-5 md:h-5 text-[#ADB5BD] group-focus-within:text-[#3182F6] transition-colors" />
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="홍길동"
                                    className="w-full pl-11 pr-4 py-3.5 md:pl-14 md:pr-6 md:py-5 bg-[#F9FAFB] border-none rounded-xl md:rounded-2xl text-[15px] md:text-[17px] font-black focus:ring-2 focus:ring-[#3182F6] transition-all outline-none placeholder:text-[#D1D6DB]"
                                />
                            </div>
                            <p className="text-[12px] md:text-sm text-[#6B7684] font-medium mt-2 md:mt-3 pl-1 flex items-start gap-1.5 break-keep"><AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#ADB5BD] shrink-0 mt-0.5" /> 예약 및 장소 등록 시 담당자 식별을 위해 실명을 사용해 주세요.</p>
                        </div>

                        {/* 이메일 섹션 (읽기 전용) */}
                        <div>
                            <label className="block text-[14px] md:text-[17px] font-black text-[#191F28] mb-2 md:mb-3 pl-1">이메일 주소</label>
                            <div className="flex items-center gap-2.5 md:gap-4 px-4 py-3.5 md:px-6 md:py-5 bg-[#F2F4F6] rounded-xl md:rounded-2xl border border-gray-100 cursor-not-allowed">
                                <Mail className="w-4 h-4 md:w-5 md:h-5 text-[#ADB5BD] shrink-0" />
                                <span className="text-[13px] md:text-[17px] font-bold text-[#6B7684] flex-1 truncate">{user?.email}</span>
                                <span className="text-[10px] md:text-xs font-bold text-[#8B95A1] bg-white px-1.5 md:px-2 py-1 rounded shrink-0">수정 불가</span>
                            </div>
                        </div>

                        {/* 인증 상태 섹션 */}
                        <div className="pt-6 md:pt-10 border-t border-gray-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-5 bg-[#F9FAFB] p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-[#3182F6]/10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                                        <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-[#3182F6]" />
                                    </div>
                                    <div>
                                        <p className="text-[14px] md:text-[17px] font-black text-[#191F28]">소유자 인증됨</p>
                                        <p className="text-[12px] md:text-[14px] text-[#6B7684] font-medium">정상적으로 인증이 완료된 상태입니다.</p>
                                    </div>
                                </div>
                                <button className="text-[12px] md:text-[14px] font-bold text-[#8B95A1] flex items-center gap-1 hover:text-[#4E5968] shrink-0 self-end sm:self-auto">상세보기 <ExternalLink className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>

                        {/* 하단 저장 버튼 */}
                        <div className="pt-6 md:pt-10 border-t border-gray-100 flex justify-center md:justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !displayName || displayName === user?.displayName}
                                className={`w-full md:w-auto px-6 py-3.5 md:px-10 md:py-5 rounded-xl font-black text-[14px] md:text-[17px] transition-all active:scale-95 flex items-center justify-center gap-2 ${isSaving || !displayName || displayName === user?.displayName
                                    ? "bg-[#E5E8EB] text-[#B0B8C1] cursor-not-allowed"
                                    : "bg-[#3182F6] text-white shadow-lg shadow-[#3182F6]/20 hover:bg-[#2272EB]"
                                    }`}
                            >
                                {isSaving ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                ) : (
                                    "변경사항 저장하기"
                                )}
                            </button>
                        </div>

                    </section>
                </div>

                {/* 위험 구역: 회원 탈퇴 — 눈에 띄지 않게 페이지 맨 아래, 작은 회색 글씨로만 */}
                <div className="mt-6 md:mt-8 pb-4 text-center">
                    <button
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="text-[12px] md:text-[13px] font-bold text-[#ADB5BD] hover:text-[#F04452] transition-colors"
                    >
                        회원 탈퇴
                    </button>
                </div>

            </main>

            {/* 회원 탈퇴 확인 모달 — 원래 Header.tsx에 있던 것과 동일한 디자인 */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isDeleting && setIsDeleteModalOpen(false)} className="absolute inset-0 bg-[#191F28]/70 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-[360px] bg-white rounded-[28px] md:rounded-[38px] p-6 md:p-10 shadow-[0_32px_64px_rgba(0,0,0,0.2)] text-center"
                        >
                            <div className="w-14 h-14 md:w-20 md:h-20 bg-[#FFF0F0] rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6"><AlertTriangle className="w-7 h-7 md:w-10 md:h-10 text-[#F04452]" /></div>
                            <h3 className="text-[17px] md:text-[22px] font-black text-[#191F28] mb-2 md:mb-3 tracking-tight">정말 탈퇴하시겠어요?</h3>
                            <p className="text-[13px] md:text-[16px] font-bold text-[#8B95A1] mb-6 md:mb-10 leading-relaxed break-keep">
                                탈퇴 시 스마트 플래너의 모든 장소가 <span className="text-[#F04452]">즉시 초기화</span>되며 복구할 수 없어요.
                            </p>
                            <div className="flex flex-col gap-2.5 md:gap-3">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="w-full py-3.5 md:py-5 bg-[#F04452] text-white rounded-[16px] md:rounded-[20px] font-black text-[14px] md:text-[17px] active:scale-[0.98] transition-all shadow-[0_8px_16px_rgba(240,68,82,0.2)] disabled:opacity-60"
                                >
                                    {isDeleting ? "탈퇴 처리 중..." : "탈퇴하기"}
                                </button>
                                <button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="w-full py-3 md:py-4 text-[#8B95A1] font-bold text-[13px] md:text-[16px] disabled:opacity-60">취소</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 저장 완료 알림 - 스타일 */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 50, x: "-50%" }}
                        className="fixed bottom-6 md:bottom-10 left-1/2 z-[100] px-4 w-full max-w-[360px]"
                    >
                        <div className="bg-[#191F28] text-white px-5 py-3.5 md:px-8 md:py-5 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-2.5 md:gap-3.5 border border-gray-700">
                            <div className="w-6 h-6 md:w-7 md:h-7 bg-[#00D082] rounded-full flex items-center justify-center shrink-0">
                                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                            </div>
                            <span className="font-black text-[13px] md:text-[16px] tracking-tight">성공적으로 수정되었습니다</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
        body { background-color: #F2F4F6; font-family: 'Pretendard', sans-serif; }
        .font-black { font-weight: 900; letter-spacing: -0.02em; }
        /* 입력 필드 포커스 시 배경색 변경 방지 */
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active  {
            -webkit-box-shadow: 0 0 0 30px #F9FAFB inset !important;
        }
      `}</style>
        </div>
    );
}