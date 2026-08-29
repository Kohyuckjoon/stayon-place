import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // 정보를 불러오는 중일 때는 잠깐 대기
  if (loading) {
    return <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center font-bold text-gray-400">보안 확인 중...</div>;
  }

  // 로그인이 안 되어 있다면 마이페이지(로그인 유도 화면)로 보냄
  if (!user) {
    // replace와 함께 현재 시도했던 경로(from)를 전달하면 
    // 나중에 로그인 후 원래 보려던 페이지로 다시 보내줄 수 있어 훨씬 편리합니다.
    return <Navigate to="/mypage" state={{ from: location, requireAuth: true }} replace />;
  }

  // 로그인 되어 있다면 원래 가려던 페이지를 보여줌
  return <>{children}</>;
};