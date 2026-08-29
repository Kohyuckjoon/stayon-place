import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";


// [중요] Firebase 콘솔의 '프로젝트 설정'에서 제공하는 정확한 값을 반영했습니다.
const firebaseConfig = {
  apiKey: "AIzaSyD3IyuZfSHOSa9Q-NJRj-7UC02JnPNnwLU",
  authDomain: "stayonplacemanager.firebaseapp.com",
  projectId: "stayonplacemanager",
  storageBucket: "stayonplacemanager.firebasestorage.app",
  messagingSenderId: "1097666375450",
  appId: "1:1097666375450:web:0b6ba8d60baeb8c898c6a3",
  measurementId: "G-CQ5TP5W2GV"
};

// 앱 초기화 (중복 방지)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const functions = getFunctions(getApp(), "asia-northeast3");

// if (window.location.hostname === "localhost") {
//   connectFunctionsEmulator(functions, "127.0.0.1", 5001);
// }

// 서비스 인스턴스 생성
const auth = getAuth(app);

setPersistence(auth, browserSessionPersistence);

const db = getFirestore(app);
const storage = getStorage(app);

// Analytics 지원 여부 확인 후 초기화
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

// 모든 서비스를 export 합니다.
export { app, auth, db, storage, analytics };
