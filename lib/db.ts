import { db, app } from "./firebase"; // ⚠️ Make sure 'app' is exported from firebase.ts
import { getStorage } from "firebase/storage";
import { 
  collection, addDoc, updateDoc, doc, query, where, getDocs, orderBy, serverTimestamp 
} from "firebase/firestore";

// --- 1. INITIALIZE STORAGE ---
// This allows components to import { storage } from "@/lib/db"
export const storage = getStorage(app);

// --- 2. TYPES ---
export type PostStatus = "draft" | "pending" | "published" | "rejected";

export interface BlogPost {
  id?: string;
  title: string;
  content: string; 
  excerpt?: string;        // 👈 Added this (optional)
  category?: string;       // 👈 Added this (optional)
  coverImage?: string | null; // 👈 Added this (can be null)
  author: string;
  authorId: string;
  status: PostStatus;
  createdAt: any;
  slug: string; 
}

// --- 3. FUNCTIONS ---

// CREATE: Writers save a new post
// We Omit 'id', 'createdAt', and 'status' so the function can control them securely
export const createPost = async (postData: Omit<BlogPost, "id" | "createdAt" | "status">) => {
  try {
    const docRef = await addDoc(collection(db, "posts"), {
      ...postData,
      status: "pending", // Force status to pending for writers
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

// READ (ADMIN): Fetch all pending posts for review
export const getPendingPosts = async () => {
  const q = query(
    collection(db, "posts"), 
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
};

// READ (PUBLIC): Fetch only PUBLISHED posts
export const getPublishedPosts = async () => {
  const q = query(
    collection(db, "posts"), 
    where("status", "==", "published"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
};

// UPDATE (ADMIN): Approve or Reject a post
export const updatePostStatus = async (postId: string, status: PostStatus) => {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { status });
};