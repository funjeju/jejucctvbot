// src/firebase.ts (or services/firebase.ts)
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Firebase 프로젝트 설정 (Firebase 콘솔에서 가져오기)
const firebaseConfig = {
  apiKey: "AIzaSyD33sh80picSyFd1-r1bVyQH1UdFdAXyes",
  authDomain: "jejudb.firebaseapp.com",
  projectId: "jejudb",
  // 수정: storageBucket 주소를 스크린샷에 나온 실제 주소로 변경합니다.
  storageBucket: "jejudb.firebasestorage.app",
  messagingSenderId: "39776551937",
  appId: "1:39776551937:web:f5c4a1b2c3d4e5f6a7b8c9"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 인스턴스 생성 (databuilder 데이터베이스 사용)
const db = getFirestore(app, "databuilder");

// Firebase Storage 인스턴스 생성
const storage = getStorage(app);

// Firebase Auth 인스턴스 생성
const auth = getAuth(app);

// 개발 모드에서 에뮬레이터 사용 (선택사항)
// if (location.hostname === 'localhost') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

export { db, storage, auth };