/**
 * Firebase 인증 서비스
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../config/firebase";

/**
 * 이메일로 회원가입 (인증 이메일 자동 전송)
 */
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("✅ Firebase 회원가입 성공:", userCredential.user.email);
    
    // 회원가입 후 자동으로 인증 이메일 전송
    console.log("📧 인증 이메일 전송 시도 중...");
    await sendEmailVerification(userCredential.user, {
      url: window.location.origin + '/email-verification-complete',
      handleCodeInApp: false,
    });
    console.log("✅ 인증 이메일 전송 성공!");
    
    return userCredential.user;
  } catch (error) {
    console.error("❌ 회원가입 또는 이메일 전송 실패:", error);
    throw error;
  }
};

/**
 * 이메일로 로그인
 */
export const signInWithEmail = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

/**
 * Google 로그인
 */
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return userCredential.user;
};

/**
 * 로그아웃
 */
export const logoutFromFirebase = async (): Promise<void> => {
  await signOut(auth);
};

/**
 * 현재 Firebase 사용자의 ID Token 가져오기
 */
export const getFirebaseIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  
  return await user.getIdToken();
};

/**
 * 현재 Firebase 사용자
 */
export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * 이메일 인증 메일 재전송
 */
export const resendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("로그인된 사용자가 없습니다.");
  }
  
  console.log("📧 인증 이메일 재전송 시도 중...");
  await sendEmailVerification(user, {
    url: window.location.origin + '/email-verification-complete',
    handleCodeInApp: false,
  });
  console.log("✅ 인증 이메일 재전송 성공!");
};
