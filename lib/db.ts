import { db } from "./firebase";
import { 
  collection, addDoc, updateDoc, doc, query, where, getDocs, orderBy, serverTimestamp 
} from "firebase/firestore";

// --- TYPES ---
export type PostStatus = "draft" | "pending" | "published" | "rejected";

export interface BlogPost {
  id?: string;
  title: string;
  content: string; // HTML string from Tiptap
  author: string;
  authorId: string;
  status: PostStatus;
  createdAt: any;
  slug: string; // URL friendly ID
}

// --- FUNCTIONS ---

// 1. CREATE: Writers save a new post
export const createPost = async (postData: Omit<BlogPost, "id" | "createdAt" | "status">) => {
  try {
    const docRef = await addDoc(collection(db, "posts"), {
      ...postData,
      status: "pending", // Default to pending approval
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

// 2. READ (ADMIN): Fetch all pending posts for review
export const getPendingPosts = async () => {
  const q = query(
    collection(db, "posts"), 
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
};

// 3. READ (PUBLIC): Fetch only PUBLISHED posts
export const getPublishedPosts = async () => {
  const q = query(
    collection(db, "posts"), 
    where("status", "==", "published"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
};

// 4. UPDATE (ADMIN): Approve or Reject a post
export const updatePostStatus = async (postId: string, status: PostStatus) => {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { status });
};