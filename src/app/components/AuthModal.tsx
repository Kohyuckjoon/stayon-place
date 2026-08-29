import React, { useState } from "react";
import { 
  X, Mail, Lock, ChevronRight, ChevronDown, 
  UserPlus, Loader2, ShieldCheck, Info 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from "firebase/auth";
import { db } from "../lib/firebase"; // 프로젝트 경로에 맞게 수정 필요
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const auth = getAuth();
  const [loginStep, setLoginStep] = useState('select'); // select, login, signup, findEmail, resetPassword, verify
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [foundEmail, setFoundEmail] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const closeLoginModal = () => {
    if (isLoading) return;
    setLoginStep('select');
    onClose();
  };

  // 1. 구글 로그인
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Firestore에 사용자 정보 저장
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date()
      }, { merge: true });

      closeLoginModal();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 이메일 로그인
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      closeLoginModal();
    } catch (error: any) {
      alert("이메일 또는 비밀번호가 일치하지 않습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 회원가입
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return alert("비밀번호는 8자 이상이어야 합니다.");
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        displayName: name,
        createdAt: new Date()
      });

      await sendEmailVerification(userCredential.user);
      setLoginStep('verify');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 이메일 찾기 (이름으로 조회)
  const handleFindEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const q = query(collection(db, "users"), where("displayName", "==", name));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        alert("해당 이름으로 가입된 정보를 찾을 수 없습니다.");
      } else {
        const userData = querySnapshot.docs[0].data();
        setFoundEmail(userData.email);
      }
    } catch (error: any) {
      alert("조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 5. 비밀번호 재설정 메일
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
    } catch (error: any) {
      alert("가입되지 않은 이메일이거나 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLoginModal}
            className="absolute inset-0 bg-[#191F28]/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[420px] bg-white rounded-[40px] p-8 md:p-10 shadow-[0_32px_64px_rgba(0,0,0,0.2)] overflow-hidden"
          >
            <button
              disabled={isLoading}
              onClick={closeLoginModal}
              className="absolute top-8 right-8 p-2 hover:bg-[#F2F4F6] rounded-full transition-colors disabled:opacity-30 z-10"
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
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <button type="button" onClick={() => setLoginStep('findEmail')} className="text-[13px] font-bold text-[#ADB5BD] hover:text-[#4E5968] transition-colors">이메일 찾기</button>
                    <div className="w-[1px] h-3 bg-[#E5E8EB]" />
                    <button type="button" onClick={() => setLoginStep('resetPassword')} className="text-[13px] font-bold text-[#ADB5BD] hover:text-[#4E5968] transition-colors">비밀번호 재설정</button>
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
                <button type="submit" disabled={isLoading} className="w-full py-5 bg-[#191F28] text-white rounded-[22px] font-black text-[17px] shadow-lg flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "동의하고 시작하기"}
                </button>
              </form>
            )}

            {/* 이메일 찾기 */}
            {loginStep === 'findEmail' && (
              <div className="space-y-8 pt-4 text-left">
                <button type="button" onClick={() => setLoginStep('login')} className="text-[14px] font-black text-[#3182F6] mb-4 flex items-center gap-1 hover:bg-[#F2F8FF] py-1 px-3 rounded-lg transition-colors -ml-3">
                  <ChevronDown className="w-4 h-4 rotate-90" /> 로그인으로
                </button>
                <h3 className="text-[26px] font-black text-[#191F28] mb-2 leading-tight">이메일 주소를 <br />잊으셨나요?</h3>
                {!foundEmail ? (
                  <form onSubmit={handleFindEmail} className="space-y-6">
                    <input type="text" placeholder="가입 시 입력한 이름" value={name} onChange={(e) => setName(e.target.value)} required
                      className="w-full h-16 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] rounded-[20px] px-6 font-bold" />
                    <button type="submit" className="w-full py-5 bg-[#191F28] text-white rounded-[22px] font-black">이메일 찾기</button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="p-8 bg-[#F2F8FF] rounded-[28px] text-center font-black text-[20px]">{foundEmail}</div>
                    <button onClick={() => { setEmail(foundEmail); setLoginStep('login'); }} className="w-full py-5 bg-[#3182F6] text-white rounded-[22px] font-black">로그인하러 가기</button>
                  </div>
                )}
              </div>
            )}

            {/* 비밀번호 재설정 */}
            {loginStep === 'resetPassword' && (
              <div className="space-y-8 pt-4 text-left">
                <button type="button" onClick={() => setLoginStep('login')} className="text-[14px] font-black text-[#3182F6] mb-4 flex items-center gap-1 hover:bg-[#F2F8FF] py-1 px-3 rounded-lg transition-colors -ml-3">
                  <ChevronDown className="w-4 h-4 rotate-90" /> 로그인으로
                </button>
                <h3 className="text-[26px] font-black text-[#191F28] mb-2 leading-tight">비밀번호를 <br />재설정할까요?</h3>
                {!resetEmailSent ? (
                  <form onSubmit={handleResetPassword} className="space-y-6">
                    <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required
                      className="w-full h-16 bg-[#F9FAFB] border-2 border-transparent focus:border-[#3182F6] rounded-[20px] px-6 font-bold" />
                    <button type="submit" className="w-full py-5 bg-[#3182F6] text-white rounded-[22px] font-black">재설정 메일 보내기</button>
                  </form>
                ) : (
                  <div className="text-center py-6">
                    <ShieldCheck className="w-16 h-16 text-[#2DCA72] mx-auto mb-4" />
                    <p className="font-bold text-[#4E5968]">메일을 확인해주세요!</p>
                  </div>
                )}
              </div>
            )}

            {/* 인증 안내 */}
            {loginStep === 'verify' && (
              <div className="space-y-8 pt-4 text-center">
                <Mail className="w-16 h-16 text-[#3182F6] mx-auto" />
                <h3 className="text-[24px] font-black text-[#191F28]">메일함을 확인해주세요!</h3>
                <p className="text-[#8B95A1] font-bold">{email}으로 인증 링크를 보냈어요.</p>
                <button onClick={closeLoginModal} className="w-full py-5 bg-[#3182F6] text-white rounded-[22px] font-black">확인</button>
              </div>
            )}

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}