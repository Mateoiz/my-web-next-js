// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // <--- Add this import

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCryw1dmr64bL_YVtxgjuFwRzzNRjxi9C8",
  authDomain: "jpcs-game.firebaseapp.com",
  projectId: "jpcs-game",
  storageBucket: "jpcs-game.firebasestorage.app",
  messagingSenderId: "1059037110516",
  appId: "1:1059037110516:web:d76f18f07a7e4719e73ea1",
  measurementId: "G-GECB5NRBSK"
};

// Initialize Firebase (Singleton Pattern)
// This checks if an app already exists to prevent errors during hot-reloads in Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services and export them
export const db = getFirestore(app);
export const auth = getAuth(app); // <--- Export Auth so you can use it in Login/Signup