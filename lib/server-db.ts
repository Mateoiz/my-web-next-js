import { db } from "./firebase";
// 1. We added 'where', 'limit', and kept the others
import { collection, getDocs, query, orderBy, where, limit, doc, getDoc } from "firebase/firestore";

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  date: string;
  author: string;
  category: string;
  slug: string;
}

// 1. Fetch ALL Posts (For the main blog page)
export async function getServerSidePosts(): Promise<BlogPost[]> {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    let dateStr = "Recent";
    if (data.createdAt?.seconds) {
      dateStr = new Date(data.createdAt.seconds * 1000).toLocaleDateString();
    }

    return {
      id: doc.id,
      title: data.title || "Untitled",
      excerpt: data.excerpt || "",
      content: data.content || "",
      coverImage: data.coverImage || "",
      date: dateStr,
      author: data.author || "Anonymous",
      category: data.category || "General",
      slug: data.slug || doc.id,
    };
  });
}

// 2. Fetch SINGLE Post (UPDATED to find by Slug Field)
export async function getServerSidePostBySlug(slug: string): Promise<BlogPost | null> {
  // TRY 1: Check if the 'slug' is actually the Document ID
  const docRef = doc(db, "posts", slug);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return formatPost(docSnap);
  }

  // TRY 2: If not found by ID, search for it as a 'field'
  // (This fixes the issue if your IDs are random strings)
  const q = query(
    collection(db, "posts"), 
    where("slug", "==", slug),
    limit(1)
  );
  
  const querySnap = await getDocs(q);
  
  if (!querySnap.empty) {
    return formatPost(querySnap.docs[0]);
  }

  return null;
}

// Helper to format the data consistently
function formatPost(doc: any): BlogPost {
  const data = doc.data();
  let dateStr = "Recent";
  if (data.createdAt?.seconds) {
    dateStr = new Date(data.createdAt.seconds * 1000).toLocaleDateString();
  }

  return {
    id: doc.id,
    title: data.title || "Untitled",
    excerpt: data.excerpt || "",
    content: data.content || "", 
    coverImage: data.coverImage || "",
    date: dateStr,
    author: data.author || "Anonymous",
    category: data.category || "General",
    slug: data.slug || doc.id,
  };
}