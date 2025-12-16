// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// (I copied these directly from your screenshot)
const firebaseConfig = {
  apiKey: "AIzaSyCryw1dmr64bL_YVtxgjuFwRzzNRjxi9C8",
  authDomain: "jpcs-game.firebaseapp.com",
  projectId: "jpcs-game",
  storageBucket: "jpcs-game.firebasestorage.app",
  messagingSenderId: "1059037110516",
  appId: "1:1059037110516:web:d76f18f07a7e4719e73ea1",
  measurementId: "G-GECB5NRBSK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and export it
export const db = getFirestore(app);