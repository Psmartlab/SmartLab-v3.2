import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB2QeQq1LPsw6026u4DWWZoiLMnFUz8to0",
  authDomain: "smartlab-39b9d.firebaseapp.com",
  projectId: "smartlab-39b9d",
  storageBucket: "smartlab-39b9d.firebasestorage.app",
  messagingSenderId: "198256158051",
  appId: "1:198256158051:web:db3f6fa47dfba7dc071f56",
  measurementId: "G-SG0C7E91Z5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
