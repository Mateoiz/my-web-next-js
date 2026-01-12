// lib/db.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, indexedDBLocalPersistence } from "firebase/auth";

// --- FIREBASE CONFIGURATION ---
// I have included your hardcoded keys here as requested to fix the "invalid-api-key" error immediately.
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
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Export the services so your app can use them
export { db, storage, auth, app };

// --- TYPES ---
export interface BlogPost {
  id?: string;
  title: string;
  content: string;
  excerpt?: string;
  author: string;
  authorId: string;
  category: string;
  status: "draft" | "pending" | "published" | "rejected";
  createdAt?: any; 
  slug?: string;
  coverImage?: string | null;
}

// --- DATABASE FUNCTIONS ---

// 1. Create a New Post
export const createPost = async (postData: Partial<BlogPost>) => {
  try {
    const docRef = await addDoc(collection(db, "posts"), {
      ...postData,
      status: "pending", 
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

// 2. Get All Pending Posts (Admin)
export const getPendingPosts = async (): Promise<BlogPost[]> => {
  const q = query(collection(db, "posts"), where("status", "==", "pending"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as BlogPost[];
};

// 3. Update Post Status
export const updatePostStatus = async (id: string, status: "published" | "rejected") => {
  const postRef = doc(db, "posts", id);
  await updateDoc(postRef, { status });
};

// 4. Get User's Own Posts
export const getMyPosts = async (userId: string): Promise<BlogPost[]> => {
  const q = query(collection(db, "posts"), where("authorId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as BlogPost[];
};

// 5. Get All Published Posts (Public Blog)
export async function getPublishedPosts(): Promise<BlogPost[]> {
  try {
    const q = query(
      collection(db, "posts"),
      where("status", "==", "published"),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BlogPost[];
  } catch (error) {
    console.error("Error fetching published posts:", error);
    return [];
  }
}

// 6. Get Single Post by Slug
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const q = query(
      collection(db, "posts"),
      where("slug", "==", slug),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as BlogPost;
  } catch (error) {
    console.error("Error fetching post by slug:", error);
    return null;
  }
  
}