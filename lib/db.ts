import { db, app } from "./firebase"; // ⚠️ Ensure 'app' is exported from your firebase.ts
import { getStorage } from "firebase/storage";
import { 
  collection, addDoc, updateDoc, doc, query, where, getDocs, orderBy, serverTimestamp 
} from "firebase/firestore";

// --- 1. INITIALIZE & EXPORT STORAGE ---
// This allows you to import { storage } from "@/lib/db" in your components
export const storage = getStorage(app);

// --- 2. TYPES ---
export type PostStatus = "draft" | "pending" | "published" | "rejected";

export interface BlogPost {
  id?: string; // Optional because it's not present before creation
  title: string;
  content: string;
  excerpt?: string;      // New field
  category?: string;     // New field
  coverImage?: string | null;   // New field (can be null)
  author: string;
  authorId: string;
  slug: string;
  createdAt?: any;       // Optional because we set it on server
  status: PostStatus;
}

// --- 3. FUNCTIONS ---

// CREATE: Writers save a new post
// We Omit 'id', 'createdAt', and 'status' because the DB sets those automatically
export const createPost = async (postData: Omit<BlogPost, "id" | "createdAt">) => {
  try {
    const docRef = await addDoc(collection(db, "posts"), {
      ...postData,
      // ❌ REMOVED: status: "pending", 
      // We removed the hardcoded status above because ...postData now includes it!
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