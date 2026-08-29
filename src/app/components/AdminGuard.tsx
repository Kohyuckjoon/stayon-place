import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react"; // UI 구성을 위한 아이콘 추가

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/"); // 홈으로 이동
        alert("로그인이 필요한 페이지입니다.");
      } else {
        const adminEmails = ["akhj123akhjk@gmail.com", "stayon.platform@gmail.com"];
        const userEmail = user.email ? user.email.toLowerCase().trim() : "";
        if (userEmail && adminEmails.map(e => e.toLowerCase().trim()).includes(userEmail)) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      }
    });
  }, [navigate]);

  if (isAuthorized === null) return <div className="flex h-screen items-center justify-center font-bold text-gray-500">권한 확인 중...</div>;
  
  // 권한 없을 때 보여줄 스타일 UI
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md p-8 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-[24px] font-black text-[#191F28] mb-3">접근 권한이 없습니다</h1>
          <p className="text-[#6B7684] text-[16px] font-medium leading-relaxed mb-8">
            현재 계정은 관리자 전용 페이지에 접근할 수 없습니다.<br />
            도움이 필요하시면 스테이온 운영팀에 문의해주세요.
          </p>
          <button 
            onClick={() => navigate("/")}
            className="w-full h-[52px] bg-[#3182F6] hover:bg-[#1b64d1] text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} /> 메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
