import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  getAuth,
  deleteUser,
  setPersistence,
  browserSessionPersistence // 세션 종료 시 로그아웃
} from "firebase/auth";
import { auth } from "./firebase";

const provider = new GoogleAuthProvider();

// [1] 구글 로그인 함수
export const loginWithGoogle = async () => {
  try {
    // await setPersistence(auth, browserSessionPersistence);
    // const result = await signInWithPopup(auth, provider);
    // return result.user; // 로그인된 유저 정보 반환
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("로그인 실패:", error);
    throw error; // 에러를 위로 던져서 처리할 수 있게 함
  }
};

// [2] 로그아웃 함수
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("로그아웃 실패:", error);
    throw error;
  }
};

// // [3] 회원 탈퇴 함수
// export const deleteUserAccount = async () => {
//   const auth = getAuth();
//   const user = auth.currentUser;

//   if (user) {
//     await deleteUser(user);
//   } else {
//     throw new Error("로그인된 사용자가 없습니다.");
//   }
// };

// [3] 회원 탈퇴 함수
export const deleteUserAccount = async () => {
  const user = auth.currentUser; // 이미 위에서 import한 auth를 사용하는 것이 좋습니다.

  if (user) {
    await deleteUser(user);
  } else {
    throw new Error("로그인된 사용자가 없습니다.");
  }
};