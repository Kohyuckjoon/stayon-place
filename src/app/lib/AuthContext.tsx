import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';

// 1. 상태 타입 정의
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// 로그인 과정 중 오류 등으로 Firestore users/{uid} 문서가 아예 없거나 createdAt이
// 누락된 계정을, 다음 로그인 시점에 자동으로 채워 넣는다. 기존 문서가 있으면
// 절대 덮어쓰지 않고 부족한 필드만 merge로 보완한다 (기존 회원 데이터에는 영향 없음).
async function ensureUserProfileDoc(currentUser: User) {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.displayName,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        createdAt: serverTimestamp(),
      });

      // 신규 가입 판단(=문서를 지금 처음 만드는 순간)을 여기서 단일하게 처리한다.
      // Header.tsx 등 개별 로그인 코드에서 "문서 없으면 신규"로 각자 판단하게 두면,
      // 이 자가 복구 로직과 실행 순서가 겹쳐 항상 "이미 있음"으로 오판되어
      // 가입 알림 메일이 누락되는 문제가 있었다 (2026-08-24 발견).
      try {
        const notify = httpsCallable(functions, "triggerAdminNotification");
        await notify({
          type: "JOIN",
          payload: {
            name: currentUser.displayName || "이름 없음",
            email: currentUser.email || "이메일 없음",
            date: new Date().toLocaleString("ko-KR"),
          },
        });
      } catch (notifyError) {
        console.error("가입 알림 메일 발송 실패:", notifyError);
      }
    } else if (!snap.data()?.createdAt) {
      await setDoc(userRef, { createdAt: serverTimestamp() }, { merge: true });
    }
  } catch (error) {
    console.error("사용자 프로필 문서 자가 복구 실패:", error);
  }
}

// 2. Provider 컴포넌트
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 파이어베이스가 로그인 상태가 변하는 걸 감시
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        ensureUserProfileDoc(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 3. 커스텀 훅 (다른 컴포넌트에서 편하게 쓰려고)
export const useAuth = () => useContext(AuthContext);