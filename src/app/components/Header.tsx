import { useAuth } from "../lib/AuthContext";
import { useFeatureFlag } from "../lib/featureFlags";
import { loginWithGoogle, logOut } from "../lib/auth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Church, Menu, User, X, ChevronDown, BookOpen,
  ShieldCheck, CreditCard, LogOut, Settings, CheckCircle2,
  PlusSquare, LayoutDashboard, RefreshCcw, AlertTriangle,
  Info, Mail, Lock, ChevronRight, UserPlus, Loader2, MessageSquare, MessagesSquare, Store, MapPin, ExternalLink, Mic2, Music
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
// import { db, auth } from "../lib/firebase"; // auth 추가
import { db, auth, functions } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth"; // Firebase Auth 메서드 추가
// import { sendMailNotification } from "../../utils/slackNotify";
import { getFunctions, httpsCallable } from "firebase/functions";

export function Header() {
  const churchDirectoryEnabled = useFeatureFlag("churchDirectoryEnabled");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isVenueMenuOpen, setIsVenueMenuOpen] = useState(false);
  const [isPlannerMenuOpen, setIsPlannerMenuOpen] = useState(false);
  const [isScheduleMenuOpen, setIsScheduleMenuOpen] = useState(false);
  const [isRegisterMenuOpen, setIsRegisterMenuOpen] = useState(false);

  // [상태 관리] 로그인 및 회원가입 단계 제어
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  // const [loginStep, setLoginStep] = useState<'select' | 'login' | 'signup' | 'verify'>('select'); // verify 단계 추가
  const [loginStep, setLoginStep] = useState<'select' | 'login' | 'signup' | 'verify' | 'findEmail' | 'resetPassword'>('select');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [isScrolled, setIsScrolled] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [foundEmail, setFoundEmail] = useState<string | null>(null);

  //입력 폼 상태를 초기화하는 공통 함수
  const resetAuthForm = () => {
    setEmail("");
    setPassword("");
    setName("");
  };

  //모달 닫기 로직: 닫을 때 입력 필드 초기화
  const closeLoginModal = () => {
    if (isLoading) return; // 로딩 중에는 닫기 방지
    setIsLoginModalOpen(false);
    setLoginStep('select');
    resetAuthForm(); // 입력했던 이름, 이메일, 비번 초기화
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (error: any) {
      console.error(error);
      alert("가입되지 않은 이메일이거나 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  //이름으로 이메일 찾기 (Firestore 연동)
  const handleFindEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("name", "==", name));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // 보안을 위해 첫 번째로 매칭된 이메일의 일부를 마스킹하여 표시하거나 전체 표시
        const userData = querySnapshot.docs[0].data();
        setFoundEmail(userData.email);
      } else {
        alert("등록된 이름(단체명)을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error(error);
      alert("조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 구글 로그인. 회원 프로필 문서 생성/가입 알림 메일 발송은 AuthContext.tsx의
  // 자가 복구 로직이 로그인 상태 변화를 감지해서 단일하게 처리한다 (여기서 따로
  // 처리하면 두 로직이 경합하면서 알림이 누락되는 문제가 있었다. 2026-08-24 발견/수정).
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await loginWithGoogle();
      if (!result) return;
      setIsLoginModalOpen(false);
      setLoginStep('select');
    } catch (error) {
      console.error("Login process error:", error);
      alert("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // [수정] 일반 이메일 로그인 처리 (실제 연동)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // 이메일 인증 여부 확인 (선택 사항: 인증된 유저만 들여보낼 경우)
      if (!userCredential.user.emailVerified) {
        setToastMessage("이메일 인증이 필요합니다.");
        setIsToastOpen(true);
        setTimeout(() => setIsToastOpen(false), 3000);
      }

      setIsLoginModalOpen(false);
      setLoginStep('select');
      setEmail("");
      setPassword("");
    } catch (error: any) {
      console.error(error);
      alert("이메일 또는 비밀번호를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // [수정] 회원가입 처리 (실제 메일 발송 연동)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      alert("비밀번호를 8자 이상 입력해주세요.");
      return;
    }

    setIsLoading(true);
    let userCredential = null; // 상위 스코프에서 관리

    try {
      // 1. 유저 생성 (Firebase Auth)
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. 부가 작업 (DB 저장 및 알림) - 여기서 하나라도 실패하면 catch로 이동
      await updateProfile(userCredential.user, { displayName: name });
      await sendEmailVerification(userCredential.user);

      // AuthContext.tsx의 자가 복구 로직이 로그인 상태 변화를 감지해서 같은 시점에
      // 문서를 먼저 만들어버릴 수 있어(경합), 존재 여부를 확인해서 중복 알림을 막는다.
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const existing = await getDoc(userDocRef);
      if (!existing.exists()) {
        await setDoc(userDocRef, {
          uid: userCredential.user.uid,
          name: name,
          email: email,
          createdAt: new Date().toISOString(),
          isVerified: false
        });

        const triggerAdminNotification = httpsCallable(functions, "triggerAdminNotification");
        await triggerAdminNotification({
          type: 'JOIN',
          payload: {
            name: name,
            email: email,
            date: new Date().toLocaleString('ko-KR')
          }
        });
      } else {
        // 이미 만들어진 경우(자가 복구가 먼저 실행됨)에도 폼에 입력한 실제 이름은 보정해둔다.
        await setDoc(userDocRef, { name, displayName: name, isVerified: false }, { merge: true });
      }

      // 모든 과정 성공 시에만 다음 단계로
      setLoginStep('verify');
      setPassword("");

    } catch (error: any) {
      console.error("SignUp Error:", error);

      // 핵심 해결 로직: 가입은 되었으나 후속 작업에 실패했을 경우 강제 로그아웃
      if (userCredential && userCredential.user) {
        // Auth 계정을 삭제하면서, 그 사이 이미 만들어졌을 수 있는 Firestore 프로필 문서도
        // 함께 지워야 한다. 이걸 빼먹으면 로그인 계정 없이 Firestore 문서만 남는
        // "유령 문서"가 생긴다 (계정 자신의 uid 문서만 지우므로 다른 회원 데이터에는 영향 없음).
        try {
          await deleteDoc(doc(db, "users", userCredential.user.uid));
        } catch (cleanupError) {
          console.error("가입 롤백 중 Firestore 문서 정리 실패:", cleanupError);
        }
        // await auth.signOut();
        await userCredential.user.delete();
      }

      // 에러 메시지 처리
      if (error.code === 'auth/email-already-in-use') {
        alert("이미 사용 중인 이메일입니다.");
      } else {
        alert("회원가입 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openLogoutModal = () => {
    setIsUserMenuOpen(false);
    setIsLogoutModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logOut();
      setIsLogoutModalOpen(false);
      setMobileMenuOpen(false);
      setToastMessage("안전하게 로그아웃 되었어요");
      setIsToastOpen(true);
      setTimeout(() => {
        setIsToastOpen(false);
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLogoutModalOpen(false);
    }
  };

  // 회원 탈퇴 로직은 여기서 뺐다 — 헤더 드롭다운/모바일 메뉴에 두면 실수로 누르기 쉬워서
  // 이탈률을 낮추려고 /settings/profile(정보 수정 페이지) 맨 아래로 옮겼다 (ProfileSettings.tsx 참고).

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // 컴포넌트 언마운트 시 초기화
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
  const handleOpenModalEvent = () => {
    setIsLoginModalOpen(true);
    setLoginStep('select'); // 초기 선택 화면으로 리셋
  };

  // 전역 커스텀 이벤트 리스너 등록
  window.addEventListener("open-login-modal", handleOpenModalEvent);
  return () => window.removeEventListener("open-login-modal", handleOpenModalEvent);
}, []);

  const isActive = (path: string) => location.pathname === path;

  // const menuItems = [
  //   // { name: "장소 찾기", path: "/venues", icon: null },
  //   // { name: "최저가 비교", path: "/planner", icon: <LayoutDashboard className="w-3 h-3" /> },
  //   { name: "일정 짜기", path: "/smart-planner", icon: <BookOpen className="w-3 h-3" /> }, // 혹은 Lucide 아이콘 중 원하는 것 배치
  //   // { name: "프로그램", path: "/programs", icon: <BookOpen className="w-3 h-3" /> },
  //   // { name: "장소 후기", path: "/reviews", icon: <BookOpen className="w-3 h-3" /> },
  //   // { name: "수리·렌탈·셋팅", path: "/stayon-rescue", icon: <BookOpen className="w-3 h-3" /> },
  //   // { name: "예산 플래너", path: "/budget", icon: <CreditCard className="w-3 h-3" /> },
  // ];

  const boardItems = [
    { name: "장소 후기", desc: "실제 이용 후기 보기", path: "/reviews", icon: <MessageSquare className="w-5 h-5 text-[#3182F6]" /> },
    { name: "교회 프로그램", desc: "레크리에이션 아이디어 얻기", path: "/programs", icon: <BookOpen className="w-5 h-5 text-[#3182F6]" /> },
    { name: "자유게시판", desc: "자유롭게 이야기 나누기", path: "/freeboard", icon: <MessagesSquare className="w-5 h-5 text-[#3182F6]" /> },
  ];

  return (
    <>
      <header className={`sticky top-0 z-[100] transition-all duration-500 ${isScrolled
        ? "bg-white/80 backdrop-blur-2xl border-b border-[#F2F4F6] shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
        : "bg-white border-b border-transparent"
        }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 md:py-5">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-10 h-10 bg-[#191F28] rounded-[14px] flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:rotate-[-5deg] shadow-lg shadow-gray-200">
                <Church className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="font-black text-[20px] tracking-tight text-[#191F28] leading-tight">STAYON</h1>
                <span className="text-[10px] font-black text-[#3182F6] tracking-widest uppercase">PLACE</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 min-w-0">
              {/* 화면이 좁아지면(노트북 창 절반 크기 등) 메뉴 글자가 중간에서 끊겨 보이던 문제 —
                  항상 한 줄(whitespace-nowrap)로 유지하고 줄어들지 않게(shrink-0) 했다.
                  (overflow-x-auto로 이 구간만 가로 스크롤시키는 방식도 시도했었지만, 그러면
                  overflow-x가 overflow-y까지 auto로 바꿔버려서 마우스 오버 시 아래로 펼쳐지는
                  하위 메뉴가 스크롤 영역에 잘려 안 보이는 부작용이 있어 뺐다.) */}
              <div className="relative shrink-0" onMouseEnter={() => setIsAboutOpen(true)} onMouseLeave={() => setIsAboutOpen(false)}>
                {/* <button className={`flex items-center gap-1.5 px-5 py-2.5 text-[15px] font-bold rounded-2xl transition-all ${isActive("/story") || isActive("/about") || isActive("/safety") ? "text-[#3182F6] bg-[#F2F8FF]" : "text-[#4E5968] hover:bg-[#F9FAFB]"}`}> */}
                <button className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-bold rounded-2xl whitespace-nowrap transition-all ${isActive("/story") || isActive("/about") || isActive("/safety") ? "text-[#3182F6] bg-[#F2F8FF]" : "text-[#4E5968] hover:bg-[#F9FAFB]"}`}>
                  STAYON 정책
                  <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-300 ${isAboutOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isAboutOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 w-[290px] bg-white rounded-[28px] shadow-[0_24px_54px_rgba(0,0,0,0.08)] border border-[#F2F4F6] p-2"
                    >
                      <Link to="/story" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F2F8FF] rounded-xl flex items-center justify-center group-hover:bg-[#E8F3FF] transition-colors"><BookOpen className="w-5 h-5 text-[#3182F6]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">STAYON 스토리</div><div className="text-[12px] text-[#8B95A1] font-bold">우리의 가치와 철학</div></div>
                      </Link>
                      <Link to="/about" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F2FDF5] rounded-xl flex items-center justify-center group-hover:bg-[#E7F9ED] transition-colors"><ShieldCheck className="w-5 h-5 text-[#2DCA72]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">검증 시스템</div><div className="text-[12px] text-[#8B95A1] font-bold">안전한 장소 예약</div></div>
                      </Link>
                      <Link to="/partner" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F3F4F6] rounded-xl flex items-center justify-center group-hover:bg-[#E5E7EB] transition-colors"><Store className="w-5 h-5 text-[#4E5968]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">플랫폼 수수료</div><div className="text-[12px] text-[#8B95A1] font-bold">장소 등록자 안내</div></div>
                      </Link>
                      <Link to="/safety" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#FFF8F2] rounded-xl flex items-center justify-center group-hover:bg-[#FFEFDE] transition-colors"><CreditCard className="w-5 h-5 text-[#FF8E21]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">환불 정책</div><div className="text-[12px] text-[#8B95A1] font-bold">투명한 취소 안내</div></div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative shrink-0" onMouseEnter={() => setIsVenueMenuOpen(true)} onMouseLeave={() => setIsVenueMenuOpen(false)}>
                {/* <button className={`flex items-center gap-1.5 px-5 py-2.5 text-[15px] font-bold rounded-2xl transition-all ${isActive("/venues") || isActive("/booking-guide") ? "text-[#3182F6] bg-[#F2F8FF]" : "text-[#4E5968] hover:bg-[#F9FAFB]"}`}> */}
                <button className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-bold rounded-2xl whitespace-nowrap transition-all ${isActive("/venues") || isActive("/teams") || isActive("/booking-guide") ? "text-[#3182F6] bg-[#F2F8FF]" : "text-[#4E5968] hover:bg-[#F9FAFB]"}`}>
                  장소 찾기
                  <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-300 ${isVenueMenuOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isVenueMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 w-[260px] bg-white rounded-[28px] shadow-[0_24px_54px_rgba(0,0,0,0.08)] border border-[#F2F4F6] p-2"
                    >
                      <Link to="/venues" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F2F8FF] rounded-xl flex items-center justify-center group-hover:bg-[#E8F3FF]"><MapPin className="w-5 h-5 text-[#3182F6]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">장소 검색</div><div className="text-[12px] text-[#8B95A1] font-bold">인원과 목적에 맞는 곳</div></div>
                      </Link>
                      <Link to="/teams?category=bandroom" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F0F9FF] rounded-xl flex items-center justify-center group-hover:bg-[#E0F2FE]"><Music className="w-5 h-5 text-[#0EA5E9]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">합주실·연습실 찾기</div><div className="text-[12px] text-[#8B95A1] font-bold">연습·합주 공간 대여</div></div>
                      </Link>
                      <Link to="/teams" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F5F3FF] rounded-xl flex items-center justify-center group-hover:bg-[#EDE9FE]"><Mic2 className="w-5 h-5 text-[#8B5CF6]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">외부 사역팀 찾기</div><div className="text-[12px] text-[#8B95A1] font-bold">찬양팀/찬양사역자 섭외</div></div>
                      </Link>
                      {churchDirectoryEnabled && (
                        <Link to="/churches" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                          <div className="w-[34px] h-[34px] bg-[#ECFDF5] rounded-xl flex items-center justify-center group-hover:bg-[#D1FAE5]"><Church className="w-5 h-5 text-[#10B981]" /></div>
                          <div><div className="text-[15px] font-black text-[#191F28]">전국 교회 찾기</div><div className="text-[12px] text-[#8B95A1] font-bold">지역별로 우리 교회 알아보기</div></div>
                        </Link>
                      )}
                      <Link to="/booking-guide" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F2FDF5] rounded-xl flex items-center justify-center group-hover:bg-[#E7F9ED]"><CheckCircle2 className="w-5 h-5 text-[#2DCA72]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">예약 절차 가이드</div><div className="text-[12px] text-[#8B95A1] font-bold">안전하고 쉬운 예약법</div></div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative shrink-0" onMouseEnter={() => setIsPlannerMenuOpen(true)} onMouseLeave={() => setIsPlannerMenuOpen(false)}>
                {/* <button className={`flex items-center gap-1.5 px-5 py-2.5 text-[15px] font-bold rounded-2xl transition-all ${isActive("/planner") ? "text-[#3182F6] bg-[#F2F8FF]" : "text-[#4E5968] hover:bg-[#F9FAFB]"}`}> */}
                <button className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-bold rounded-2xl whitespace-nowrap transition-all ${isActive("/planner") ? "text-[#3182F6] bg-[#F2F8FF]" : "text-[#4E5968] hover:bg-[#F9FAFB]"}`}>
                  최저가 비교
                  <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-300 ${isPlannerMenuOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isPlannerMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 w-[220px] bg-white rounded-[28px] shadow-[0_24px_54px_rgba(0,0,0,0.08)] border border-[#F2F4F6] p-2"
                    >
                      <Link to="/planner" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F2F8FF] rounded-xl flex items-center justify-center group-hover:bg-[#E8F3FF]"><LayoutDashboard className="w-5 h-5 text-[#3182F6]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">스마트 플래너</div></div>
                      </Link>
                      <Link to="/smart-planner-guide" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F2FDF5] rounded-xl flex items-center justify-center group-hover:bg-[#E7F9ED]"><Info className="w-5 h-5 text-[#2DCA72]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">사용법 안내</div></div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative shrink-0" onMouseEnter={() => setIsScheduleMenuOpen(true)} onMouseLeave={() => setIsScheduleMenuOpen(false)}>
                {/* <button className={`flex items-center gap-1.5 px-5 py-2.5 text-[15px] font-bold rounded-2xl transition-all ${isActive("/smart-planner") || isActive("/schedule-guide") ? "text-[#3182F6] bg-[#F2F8FF]" : "text-[#4E5968] hover:bg-[#F9FAFB]"}`}> */}
                <button className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-bold rounded-2xl whitespace-nowrap transition-all ${isActive("/smart-planner") || isActive("/schedule-guide") ? "text-[#3182F6] bg-[#F2F8FF]" : "text-[#4E5968] hover:bg-[#F9FAFB]"}`}>
                  일정표
                  <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-300 ${isScheduleMenuOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isScheduleMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-2 w-[220px] bg-white rounded-[28px] shadow-[0_24px_54px_rgba(0,0,0,0.08)] border border-[#F2F4F6] p-2"
                    >
                      <Link to="/smart-planner" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F2F8FF] rounded-xl flex items-center justify-center group-hover:bg-[#E8F3FF]"><BookOpen className="w-5 h-5 text-[#3182F6]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">일정표 만들기</div></div>
                      </Link>
                      <Link to="/schedule-guide" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[16px] transition-colors group">
                        <div className="w-[34px] h-[34px] bg-[#F2FDF5] rounded-xl flex items-center justify-center group-hover:bg-[#E7F9ED]"><Info className="w-5 h-5 text-[#2DCA72]" /></div>
                        <div><div className="text-[15px] font-black text-[#191F28]">일정표 가이드</div></div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative shrink-0" onMouseEnter={() => setIsBoardOpen(true)} onMouseLeave={() => setIsBoardOpen(false)}>
                {/* <button className={`flex items-center gap-1.5 px-5 py-2.5 text-[15px] font-bold rounded-2xl transition-all ${isActive("/reviews") || isActive("/programs") ? "text-[#3182F6] bg-[#F2F8FF]" : "text-[#4E5968] hover:bg-[#F9FAFB]"}`}> */}
                <button className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-bold rounded-2xl whitespace-nowrap transition-all ${isActive("/reviews") || isActive("/programs") ? "text-[#3182F6] bg-[#F2F8FF]" : "text-[#4E5968] hover:bg-[#F9FAFB]"}`}>
                  게시판
                  <ChevronDown className={`w-4 h-4 opacity-50 transition-transform duration-300 ${isBoardOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isBoardOpen && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-[220px] bg-white rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-[#F2F4F6] p-2"
                    >
                      {boardItems.map((item) => (
                        <Link key={item.path} to={item.path} className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[14px] transition-colors">
                          <div className="w-[34px] h-[34px] bg-[#F2F8FF] rounded-xl flex items-center justify-center">{item.icon}</div>
                          <div className="text-[15px] font-black text-[#191F28]">{item.name}</div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <a
                href="https://bulletin.stayon-platform.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-bold rounded-2xl whitespace-nowrap text-[#4E5968] hover:bg-[#F9FAFB] hover:text-[#3182F6] transition-all group shrink-0"
              >
                <span>온라인 주보</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </a>

              <div className="w-[1px] h-4 bg-[#E5E8EB] mx-2 shrink-0" />

              <div className="flex items-center gap-3 shrink-0">
                <div
                  className="relative hidden lg:block shrink-0"
                  onMouseEnter={() => setIsRegisterMenuOpen(true)}
                  onMouseLeave={() => setIsRegisterMenuOpen(false)}
                >
                  <button className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#F2F8FF] text-[#3182F6] hover:bg-[#E8F3FF] transition-all active:scale-95 group whitespace-nowrap">
                    <PlusSquare className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    <span className="font-black text-[12.5px]">장소 등록 문의</span>
                    <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-300 ${isRegisterMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {isRegisterMenuOpen && (
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-[240px] bg-white rounded-[24px] shadow-[0_24px_54px_rgba(0,0,0,0.08)] border border-[#F2F4F6] p-2"
                      >
                        <Link to="/register" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[14px] transition-colors group">
                          <div className="w-[34px] h-[34px] bg-[#F2F8FF] rounded-xl flex items-center justify-center group-hover:bg-[#E8F3FF]"><PlusSquare className="w-5 h-5 text-[#3182F6]" /></div>
                          <div><div className="text-[15px] font-black text-[#191F28]">장소 등록 문의</div><div className="text-[12px] text-[#8B95A1] font-bold">수양관/예배당 등록</div></div>
                        </Link>
                        <Link to="/team-register" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[14px] transition-colors group">
                          <div className="w-[34px] h-[34px] bg-[#F5F3FF] rounded-xl flex items-center justify-center group-hover:bg-[#EDE9FE]"><Mic2 className="w-5 h-5 text-[#8B5CF6]" /></div>
                          <div><div className="text-[15px] font-black text-[#191F28]">외부 사역팀 등록 문의</div><div className="text-[12px] text-[#8B95A1] font-bold">찬양팀/찬양사역자 섭외 등록</div></div>
                        </Link>
                        <Link to="/band-room-register" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[14px] transition-colors group">
                          <div className="w-[34px] h-[34px] bg-[#F0F9FF] rounded-xl flex items-center justify-center group-hover:bg-[#E0F2FE]"><Music className="w-5 h-5 text-[#0EA5E9]" /></div>
                          <div><div className="text-[15px] font-black text-[#191F28]">합주실·연습실 등록 문의</div><div className="text-[12px] text-[#8B95A1] font-bold">외부사역 합주실/연습·녹음실</div></div>
                        </Link>
                        {churchDirectoryEnabled && (
                          <Link to="/church-register" className="flex items-center gap-3 p-3 hover:bg-[#F9FAFB] rounded-[14px] transition-colors group">
                            <div className="w-[34px] h-[34px] bg-[#ECFDF5] rounded-xl flex items-center justify-center group-hover:bg-[#D1FAE5]"><Church className="w-5 h-5 text-[#10B981]" /></div>
                            <div><div className="text-[15px] font-black text-[#191F28]">전국 교회 등록하기</div><div className="text-[12px] text-[#8B95A1] font-bold">우리 교회 알리기</div></div>
                          </Link>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative shrink-0" ref={userMenuRef}>
                  {/* <button onClick={isLoggedIn ? () => setIsUserMenuOpen(!isUserMenuOpen) : () => setIsLoginModalOpen(true)} */}
                  <button onClick={isLoggedIn ? () => setIsUserMenuOpen(!isUserMenuOpen) : () => setIsLoginModalOpen(true)}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-full whitespace-nowrap transition-all duration-300 active:scale-95 ${isLoggedIn ? "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]" : "bg-[#191F28] text-white shadow-[0_8px_16px_rgba(25,31,40,0.2)]"}`}>
                    <User className={`w-4 h-4 ${isLoggedIn ? "text-[#8B95A1]" : "text-white"}`} />
                    <span className="font-black text-[15px] whitespace-nowrap">{isLoggedIn ? `${user?.displayName?.slice(0, 3)}님` : "시작하기"}</span>
                    {isLoggedIn && <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />}
                  </button>

                  <AnimatePresence>
                    {isLoggedIn && isUserMenuOpen && (
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-3 w-48 bg-white rounded-[20px] shadow-[0_20px_48px_rgba(0,0,0,0.1)] border border-[#F2F4F6] p-2"
                      >
                        {/* 회원 탈퇴는 여기서 뺐다 — 실수로 누르기 쉬운 자리에 있으면 이탈률만 높인다는
                            판단으로, /settings/profile(정보 수정 페이지) 맨 아래로 옮겼다. */}
                        <Link to="/mypage" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2.5 p-3 hover:bg-[#F9FAFB] rounded-[14px] transition-colors group">
                          <Settings className="w-4 h-4 text-[#ADB5BD] group-hover:text-[#3182F6]" /><span className="text-[14px] font-bold text-[#4E5968]">마이페이지</span>
                        </Link>
                        <button onClick={openLogoutModal} className="w-full flex items-center gap-2.5 p-3 hover:bg-[#F9FAFB] rounded-[14px] transition-colors group text-left">
                          <LogOut className="w-4 h-4 text-[#ADB5BD] group-hover:text-[#191F28]" /><span className="text-[14px] font-bold text-[#4E5968]">로그아웃</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </nav>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-3.5 rounded-2xl bg-[#F2F4F6] text-[#191F28] active:scale-90 transition-transform">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-white border-t border-[#F2F4F6] overflow-hidden">
              <div className="px-4 py-4 flex flex-col gap-2.5">
                {/* 둘러보기: 장소/외부 사역팀/합주실/교회 찾기 - 등록 문의보다 방문자가 먼저 찾는 동작이라 최상단에 배치.
                    교회 찾기가 꺼져있으면(churchDirectoryEnabled=false) 항목이 3개라 2열로는 마지막 줄에
                    빈 칸이 하나 남아 어색해 보여서, 그때는 3열로 한 줄에 꽉 채운다. */}
                <div className={`grid gap-2 ${churchDirectoryEnabled ? "grid-cols-2" : "grid-cols-3"}`}>
                  <Link to="/venues" onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center gap-1 py-3 bg-[#F2F8FF] rounded-xl text-center active:scale-95 transition-all">
                    <MapPin className="w-5 h-5 text-[#3182F6]" />
                    <span className="text-[11px] font-black text-[#191F28] leading-tight">장소 찾기</span>
                  </Link>
                  <Link to="/teams" onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center gap-1 py-3 bg-[#F5F3FF] rounded-xl text-center active:scale-95 transition-all">
                    <Mic2 className="w-5 h-5 text-[#8B5CF6]" />
                    <span className="text-[11px] font-black text-[#191F28] leading-tight break-keep">외부 사역팀</span>
                  </Link>
                  <Link to="/teams?category=bandroom" onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center gap-1 py-3 bg-[#F0F9FF] rounded-xl text-center active:scale-95 transition-all">
                    <Music className="w-5 h-5 text-[#0EA5E9]" />
                    <span className="text-[11px] font-black text-[#191F28] leading-tight break-keep">합주실·연습실</span>
                  </Link>
                  {churchDirectoryEnabled && (
                    <Link to="/churches" onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center gap-1 py-3 bg-[#ECFDF5] rounded-xl text-center active:scale-95 transition-all">
                      <Church className="w-5 h-5 text-[#10B981]" />
                      <span className="text-[11px] font-black text-[#191F28] leading-tight break-keep">전국 교회</span>
                    </Link>
                  )}
                </div>

                <div className="p-3.5 bg-[#F2F8FF] rounded-2xl border border-[#E8F3FF]">
                  <div className="text-[11px] font-black text-[#3182F6] mb-1 uppercase tracking-wider">For Partners</div>
                  <div className="flex gap-2">
                    <Link to="/venue-guide" className="flex-1 py-2.5 bg-white rounded-xl text-[13px] font-black text-[#191F28] text-center shadow-sm" onClick={() => setMobileMenuOpen(false)}>장소 등록 안내</Link>
                    <Link to="/register" className="flex-1 py-2.5 bg-[#3182F6] rounded-xl text-[13px] font-black text-white text-center shadow-sm shadow-blue-100" onClick={() => setMobileMenuOpen(false)}>장소 등록 문의</Link>
                  </div>
                  <Link to="/team-register" className="mt-2 flex items-center justify-center gap-1.5 py-2.5 bg-white rounded-xl text-[13px] font-black text-[#8B5CF6] text-center shadow-sm" onClick={() => setMobileMenuOpen(false)}>
                    <Mic2 className="w-3.5 h-3.5" /> 외부 사역팀 등록 문의
                  </Link>
                  <Link to="/band-room-register" className="mt-2 flex items-center justify-center gap-1.5 py-2.5 bg-white rounded-xl text-[13px] font-black text-[#0EA5E9] text-center shadow-sm" onClick={() => setMobileMenuOpen(false)}>
                    <Music className="w-3.5 h-3.5" /> 합주실·연습실·녹음실 등록 문의
                  </Link>
                  {churchDirectoryEnabled && (
                    <Link to="/church-register" className="mt-2 flex items-center justify-center gap-1.5 py-2.5 bg-white rounded-xl text-[13px] font-black text-[#10B981] text-center shadow-sm" onClick={() => setMobileMenuOpen(false)}>
                      <Church className="w-3.5 h-3.5" /> 전국 교회 등록하기
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {boardItems.map((item) => (
                    <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 bg-[#F9FAFB] rounded-xl">
                      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">{item.icon}</div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-[#191F28] leading-tight truncate">{item.name}</p>
                        <p className="text-[10px] font-bold text-[#8B95A1] leading-tight break-keep">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                {isLoggedIn && (
                  <div className="flex flex-col gap-2.5 p-3.5 bg-[#F9FAFB] rounded-2xl border border-[#F2F4F6]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm text-[#3182F6] font-black text-[15px]">{user?.displayName?.slice(0, 1)}</div>
                      <div className="text-[15px] font-black text-[#191F28]">{user?.displayName}님 반가워요!</div>
                    </div>
                    {/* 회원 탈퇴는 여기서 뺐다 — /settings/profile(정보 수정 페이지) 맨 아래로 옮겼다. */}
                    <button onClick={openLogoutModal} className="w-full py-2.5 bg-white rounded-xl text-[13px] font-black text-[#4E5968] border border-[#E5E8EB] active:scale-95 transition-all">로그아웃</button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Link to="/story" className="p-3.5 rounded-xl bg-[#F9FAFB] font-black text-[14px] text-[#191F28]" onClick={() => setMobileMenuOpen(false)}>STAYON 스토리</Link>
                  <Link to="/safety" className="p-3.5 rounded-xl bg-[#FFF8F2] font-black text-[14px] text-[#FF8E21]" onClick={() => setMobileMenuOpen(false)}>환불 규정</Link>
                </div>

                <button onClick={() => { if (isLoggedIn) { navigate("/mypage"); } else { setIsLoginModalOpen(true); } setMobileMenuOpen(false); }} className="w-full bg-[#191F28] text-white py-3.5 rounded-2xl font-black text-[16px] shadow-[0_8px_16px_rgba(0,0,0,0.12)]">{isLoggedIn ? "내 정보 확인하기" : "3초만에 시작하기"}</button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* [통합] Auth Modal (Login + Signup) */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeLoginModal}
              className="absolute inset-0 bg-[#191F28]/70 backdrop-blur-sm"
            />

            <motion.div
              className="relative w-full max-w-[420px] bg-white rounded-[40px] p-8 md:p-10 shadow-[0_32px_64px_rgba(0,0,0,0.2)]"
            >
              <button
                disabled={isLoading}
                onClick={closeLoginModal}
                className="absolute top-8 right-8 p-2 hover:bg-[#F2F4F6] rounded-full transition-colors disabled:opacity-30"
              >
                <X className="w-6 h-6 text-[#8B95A1]" />
              </button>

              {/* 1단계: 방법 선택 */}
              {loginStep === 'select' && (
                <div className="space-y-8 pt-4">
                  <div className="text-left">
                    <h3 className="text-[26px] font-black text-[#191F28] mb-2 leading-snug">반가워요! <br />어떻게 시작할까요?</h3>
                    <p className="text-[15px] font-bold text-[#8B95A1]">가장 편한 방법으로 스테이온을 시작하세요.</p>
                  </div>
                  <div className="space-y-3">
                    <button disabled={isLoading} onClick={handleGoogleLogin} className="w-full min-h-[64px] bg-[#F2F4F6] hover:bg-[#E5E8EB] rounded-[22px] flex items-center px-4 sm:px-6 gap-3 sm:gap-4 transition-all group disabled:opacity-50">
                      <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="google" />
                      </div>
                      <span className="text-[14px] sm:text-[16px] font-black text-[#4E5968] group-hover:text-[#191F28] whitespace-nowrap">구글로 3초만에 시작하기</span>
                      {isLoading ? <Loader2 className="w-5 h-5 ml-auto shrink-0 animate-spin text-[#ADB5BD]" /> : <ChevronRight className="w-5 h-5 ml-auto shrink-0 text-[#ADB5BD]" />}
                    </button>
                    <button disabled={isLoading} onClick={() => setLoginStep('login')} className="w-full min-h-[64px] border-2 border-[#F2F4F6] hover:border-[#3182F6] hover:bg-[#F2F8FF] rounded-[22px] flex items-center px-4 sm:px-6 gap-3 sm:gap-4 transition-all group disabled:opacity-50">
                      <div className="w-9 h-9 bg-[#F2F4F6] rounded-full flex items-center justify-center group-hover:bg-[#3182F6] transition-colors shrink-0">
                        <Mail className="w-4 h-4 text-[#8B95A1] group-hover:text-white" />
                      </div>
                      <span className="text-[14px] sm:text-[16px] font-black text-[#4E5968] group-hover:text-[#3182F6] whitespace-nowrap">이메일로 시작하기</span>
                      <ChevronRight className="w-5 h-5 ml-auto shrink-0 text-[#ADB5BD]" />
                    </button>
                  </div>
                </div>
              )}

              {/* 2단계: 이메일 로그인 */}
              {loginStep === 'login' && (
                <form onSubmit={handleEmailLogin} className="space-y-8 pt-4">
                  <div className="text-left">
                    <button type="button" onClick={() => setLoginStep('select')} className="text-[14px] font-black text-[#3182F6] mb-4 flex items-center gap-1 hover:bg-[#F2F8FF] py-1 px-3 rounded-lg transition-colors -ml-3">
                      <ChevronDown className="w-4 h-4 rotate-90" /> 뒤로가기
                    </button>
                    <h3 className="text-[26px] font-black text-[#191F28]">이메일 로그인</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#3182F6] transition-colors" />
                      <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required
                        className="w-full h-16 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] pl-14 pr-6 font-bold text-[16px] outline-none transition-all" />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#3182F6] transition-colors" />
                      <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required
                        className="w-full h-16 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] pl-14 pr-6 font-bold text-[16px] outline-none transition-all" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <button type="submit" disabled={isLoading} className="w-full py-5 bg-[#3182F6] text-white rounded-[22px] font-black text-[17px] active:scale-[0.98] transition-all shadow-[0_12px_24px_rgba(49,130,246,0.25)] flex items-center justify-center gap-2">
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "로그인"}
                    </button>

                    {/*이메일/비밀번호 찾기 버튼 링크 */}
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <button
                        type="button"
                        onClick={() => setLoginStep('findEmail')}
                        className="text-[13px] font-bold text-[#ADB5BD] hover:text-[#4E5968] transition-colors"
                      >
                        이메일 찾기
                      </button>
                      <div className="w-[1px] h-3 bg-[#E5E8EB]" />
                      <button
                        type="button"
                        onClick={() => setLoginStep('resetPassword')}
                        className="text-[13px] font-bold text-[#ADB5BD] hover:text-[#4E5968] transition-colors"
                      >
                        비밀번호 재설정
                      </button>
                    </div>

                    <div className="text-center">
                      <span className="text-[14px] font-bold text-[#8B95A1]">아직 회원이 아니신가요? </span>
                      <button type="button" onClick={() => setLoginStep('signup')} className="text-[14px] font-black text-[#3182F6] hover:underline">회원가입</button>
                    </div>
                  </div>
                </form>
              )}

              {/* 3단계: 회원가입 */}
              {loginStep === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-6 pt-4">
                  <div className="text-left">
                    <button type="button" onClick={() => setLoginStep('login')} className="text-[14px] font-black text-[#3182F6] mb-4 flex items-center gap-1 hover:bg-[#F2F8FF] py-1 px-3 rounded-lg transition-colors -ml-3">
                      <ChevronDown className="w-4 h-4 rotate-90" /> 로그인으로
                    </button>
                    <h3 className="text-[26px] font-black text-[#191F28] mb-2 leading-tight">스테이온에 <br />오신 것을 환영해요!</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="relative group">
                      <UserPlus className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#3182F6] transition-colors" />
                      <input type="text" placeholder="이름 (또는 단체명)" value={name} onChange={(e) => setName(e.target.value)} required
                        className="w-full h-15 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[18px] pl-14 pr-6 font-bold text-[15px] outline-none transition-all" />
                    </div>
                    <div className="relative group">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#3182F6] transition-colors" />
                      <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required
                        className="w-full h-15 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[18px] pl-14 pr-6 font-bold text-[15px] outline-none transition-all" />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#3182F6] transition-colors" />
                      <input type="password" placeholder="비밀번호 (8자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} required
                        className="w-full h-15 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[18px] pl-14 pr-6 font-bold text-[15px] outline-none transition-all" />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full py-5 bg-[#191F28] text-white rounded-[22px] font-black text-[17px] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "동의하고 시작하기"}
                  </button>
                  <p className="text-center text-[12px] text-[#ADB5BD] font-medium leading-relaxed">
                    가입 시 스테이온의 <span className="underline">이용약관</span> 및 <span className="underline">개인정보 처리방침</span>에 <br />동의하는 것으로 간주됩니다.
                  </p>
                </form>
              )}

              {/*5단계: 아이디(이메일) 찾기 화면 - signup과 별개로 독립 배치 */}
              {loginStep === 'findEmail' && (
                <div className="space-y-8 pt-4">
                  <div className="text-left">
                    <button type="button" onClick={() => { setLoginStep('login'); setFoundEmail(null); }} className="text-[14px] font-black text-[#3182F6] mb-4 flex items-center gap-1 hover:bg-[#F2F8FF] py-1 px-3 rounded-lg transition-colors -ml-3">
                      <ChevronDown className="w-4 h-4 rotate-90" /> 로그인으로
                    </button>
                    <h3 className="text-[26px] font-black text-[#191F28] mb-2 leading-tight">이메일 주소를 <br />잊으셨나요?</h3>
                    <p className="text-[15px] font-bold text-[#8B95A1]">가입 시 입력한 이름(단체명)을 입력해주세요.</p>
                  </div>

                  {!foundEmail ? (
                    <form onSubmit={handleFindEmail} className="space-y-6">
                      <div className="relative group">
                        <UserPlus className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#3182F6] transition-colors" />
                        <input type="text" placeholder="이름 또는 단체명" value={name} onChange={(e) => setName(e.target.value)} required
                          className="w-full h-16 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] pl-14 pr-6 font-bold text-[16px] outline-none transition-all" />
                      </div>
                      <button type="submit" disabled={isLoading} className="w-full py-5 bg-[#191F28] text-white rounded-[22px] font-black text-[17px] shadow-lg flex items-center justify-center gap-2">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "이메일 찾기"}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="p-8 bg-[#F2F8FF] rounded-[28px] text-center">
                        <p className="text-[14px] font-bold text-[#3182F6] mb-2">찾으시는 이메일 정보입니다</p>
                        <p className="text-[20px] font-black text-[#191F28]">{foundEmail}</p>
                      </div>
                      <button onClick={() => { setEmail(foundEmail); setLoginStep('login'); setFoundEmail(null); }} className="w-full py-5 bg-[#3182F6] text-white rounded-[22px] font-black text-[17px] shadow-lg">
                        이 이메일로 로그인하기
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/*6단계: 비밀번호 찾기(재설정) 화면 - 독립 배치 */}
              {loginStep === 'resetPassword' && (
                <div className="space-y-8 pt-4">
                  <div className="text-left">
                    <button type="button" onClick={() => { setLoginStep('login'); setResetEmailSent(false); }} className="text-[14px] font-black text-[#3182F6] mb-4 flex items-center gap-1 hover:bg-[#F2F8FF] py-1 px-3 rounded-lg transition-colors -ml-3">
                      <ChevronDown className="w-4 h-4 rotate-90" /> 로그인으로
                    </button>
                    <h3 className="text-[26px] font-black text-[#191F28] mb-2 leading-tight">비밀번호를 <br />재설정할까요?</h3>
                  </div>

                  {!resetEmailSent ? (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                      <p className="text-[15px] font-bold text-[#8B95A1]">가입하신 이메일을 입력하시면 <br />비밀번호 변경 링크를 보내드려요.</p>
                      <div className="relative group">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ADB5BD] group-focus-within:text-[#3182F6] transition-colors" />
                        <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required
                          className="w-full h-16 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] focus:bg-white rounded-[20px] pl-14 pr-6 font-bold text-[16px] outline-none transition-all" />
                      </div>
                      <button type="submit" disabled={isLoading} className="w-full py-5 bg-[#3182F6] text-white rounded-[22px] font-black text-[17px] shadow-lg flex items-center justify-center gap-2">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "재설정 메일 보내기"}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-8 text-center">
                      <div className="w-20 h-20 bg-[#F2FDF5] rounded-full flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-10 h-10 text-[#2DCA72]" />
                      </div>
                      <p className="text-[16px] font-bold text-[#4E5968] leading-relaxed">
                        재설정 메일이 발송되었습니다! <br />메일함의 링크를 확인해주세요.
                      </p>
                      <button onClick={() => { setLoginStep('login'); setResetEmailSent(false); }} className="w-full py-5 bg-[#191F28] text-white rounded-[22px] font-black text-[17px]">
                        확인
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 4단계: 이메일 인증 안내 (추가됨) */}
              {loginStep === 'verify' && (
                <div className="space-y-8 pt-4 text-center">
                  <div className="w-20 h-20 bg-[#F2F8FF] rounded-full flex items-center justify-center mx-auto">
                    <Mail className="w-10 h-10 text-[#3182F6]" />
                  </div>
                  <div>
                    <h3 className="text-[24px] font-black text-[#191F28] mb-3">메일함을 확인해주세요!</h3>
                    <p className="text-[15px] font-bold text-[#8B95A1] leading-relaxed">
                      <span className="text-[#3182F6]">{email}</span>으로 <br />인증 링크를 보냈어요. <br />메일 확인 후 바로 시작할 수 있습니다.
                    </p>
                  </div>
                  <div className="p-4 bg-[#F9FAFB] rounded-[20px] text-[13px] font-bold text-[#ADB5BD] text-left">
                    <p className="flex gap-2"><Info className="w-4 h-4 shrink-0" /> <span>메일이 오지 않았다면 스팸 메일함을 확인해주세요.</span></p>
                    <p className="flex gap-2 text-[#F04452]">
                      <AlertTriangle className="w-4 h-4 shrink-0" /> 
                      <span>이메일 인증을 완료하지 않으면 지속적인 알림이 발생할 수 있어요.</span>
                    </p>
                  </div>
                  
                  <button onClick={() => { setIsLoginModalOpen(false); setLoginStep('select'); }} className="w-full py-5 bg-[#3182F6] text-white rounded-[22px] font-black text-[17px] shadow-lg">확인</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Modal - 기존 디자인 유지 */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLogoutModalOpen(false)} className="absolute inset-0 bg-[#191F28]/70 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[340px] bg-white rounded-[38px] p-10 shadow-[0_32px_64px_rgba(0,0,0,0.2)] text-center"
            >
              <div className="w-20 h-20 bg-[#F9FAFB] rounded-full flex items-center justify-center mx-auto mb-6"><LogOut className="w-10 h-10 text-[#4E5968]" /></div>
              <h3 className="text-[22px] font-black text-[#191F28] mb-3 tracking-tight">로그아웃 하시겠어요?</h3>
              <p className="text-[16px] font-bold text-[#8B95A1] mb-10 leading-relaxed break-keep">준비 중인 플랜은 안전하게 저장되니<br />언제든 다시 돌아오세요.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleLogout} className="w-full py-5 bg-[#191F28] text-white rounded-[20px] font-black text-[17px] active:scale-[0.98] transition-all">로그아웃</button>
                <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-4 text-[#8B95A1] font-bold text-[16px]">취소</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {isToastOpen && (
          <motion.div initial={{ opacity: 0, y: 50, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-12 left-1/2 z-[300] bg-[#191F28] text-white px-8 py-5 rounded-[24px] shadow-[0_16px_32px_rgba(0,0,0,0.2)] flex items-center gap-3 border border-white/10"
          >
            <CheckCircle2 className="w-5 h-5 text-[#3182F6]" />
            <span className="font-black text-[16px]">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
