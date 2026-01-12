"use client";

import { use, useEffect, useState } from "react"; 
import { notFound, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db, type BlogPost } from "@/lib/db"; 
import { FaArrowLeft, FaTerminal, FaClock, FaTag, FaEye } from "react-icons/fa";

// --- UNIFIED STYLES (Identical to BlogPostPage) ---
const proseStyles = [
  "prose prose-lg prose-zinc dark:prose-invert max-w-none break-words",
  "prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight",
  "prose-p:text-zinc-800 dark:prose-p:text-zinc-300 prose-p:leading-8 prose-p:mb-6",
  "prose-a:text-green-600 hover:prose-a:text-green-500 prose-a:font-bold prose-a:no-underline",
  "prose-blockquote:border-l-4 prose-blockquote:border-green-500 prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-900/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic",
  "prose-ul:list-disc prose-ul:pl-6 prose-ul:list-outside",
  "prose-ol:pl-6 prose-ol:list-outside",
  "prose-img:rounded-xl prose-img:border-2 prose-img:border-black dark:prose-img:border-zinc-700",
  "prose-table:block prose-table:overflow-x-auto"
].join(" ");

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); 
  const router = useRouter();
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- FETCH DATA BY ID ---
  useEffect(() => {
    const fetchPostById = async () => {
        if (!id) return;
        
        try {
            // Direct Firestore fetch by Document ID
            const docRef = doc(db, "posts", id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setPost({ id: docSnap.id, ...docSnap.data() } as BlogPost);
            } else {
                setError("Document does not exist.");
            }
        } catch (err) {
            console.error("Preview Error:", err);
            setError("Failed to load preview.");
        } finally {
            setLoading(false);
        }
    };
    
    fetchPostById();
  }, [id]);

  if (loading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-4">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
            <p className="font-mono text-xs animate-pulse">ESTABLISHING_SECURE_CONNECTION...</p>
        </div>
    );
  }

  if (error || !post) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
            <div className="bg-red-900/20 p-8 rounded-xl border-2 border-red-500 max-w-md">
                <h1 className="text-2xl font-black text-red-500 mb-2">PREVIEW FAILED</h1>
                <p className="text-zinc-400 mb-6 font-mono text-xs">{error || "The requested ID was not found."}</p>
                <button 
                    onClick={() => router.back()}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest text-xs rounded transition-all"
                >
                    Close Preview
                </button>
            </div>
        </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-black dark:text-zinc-100 font-sans pt-12 pb-20 selection:bg-green-500/30">
      
      {/* --- PREVIEW BANNER --- */}
      <div className="fixed top-0 left-0 w-full bg-yellow-400 text-black text-xs font-bold uppercase tracking-widest text-center py-2 z-50 flex items-center justify-center gap-2 shadow-md">
        <FaEye /> Preview Mode • ID: {id}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-12 relative z-10">

        {/* BACK BUTTON */}
        <button 
            onClick={() => router.back()}
            className="group mb-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
            <div className="p-2 bg-zinc-200 dark:bg-zinc-900 rounded-full border border-zinc-300 dark:border-zinc-800 group-hover:border-black dark:group-hover:border-white transition-colors">
                <FaArrowLeft />
            </div>
            Back to Dashboard
        </button>

        {/* MAIN ARTICLE CONTAINER */}
        <motion.article 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-none overflow-hidden"
        >
          
          {/* HEADER SECTION */}
          <div className="p-8 md:p-12 border-b-2 border-black dark:border-zinc-800 bg-zinc-50 dark:bg-black/20">
            <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 bg-black text-white dark:bg-green-600 dark:text-black text-[10px] font-bold uppercase tracking-widest">
                    {post.category || "Uncategorized"}
                </span>
                <span className={`px-2 py-1 text-[10px] font-bold uppercase border border-black dark:border-zinc-700 ${post.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>
                    Status: {post.status}
                </span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-black dark:text-white leading-[1.1] mb-6">
              {post.title}
            </h1>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 font-mono text-sm border-t-2 border-zinc-200 dark:border-zinc-800 pt-6">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                        <FaTerminal className="text-zinc-500" size={12}/>
                     </div>
                     <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-bold">Author</span>
                        <span className="font-bold">{post.author}</span>
                     </div>
                  </div>
               </div>
               <div className="flex items-center gap-6 text-zinc-600 dark:text-zinc-400">
                   <div>
                        <span className="block text-[10px] text-zinc-500 uppercase font-bold">Date Created</span>
                        <span className="font-bold">
                            {post.createdAt?.seconds 
                                ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() 
                                : "Just Now"}
                        </span>
                   </div>
               </div>
            </div>
          </div>

          {/* IMAGE SECTION */}
          {post.coverImage && (
            <div className="relative w-full aspect-video md:aspect-[21/9] bg-zinc-100 dark:bg-zinc-800 border-b-2 border-black dark:border-zinc-800 overflow-hidden">
                <Image 
                src={post.coverImage} 
                alt={post.title} 
                fill 
                className="object-cover"
                />
            </div>
          )}

          {/* BODY CONTENT */}
          <div className="p-8 md:p-12 md:py-16 max-w-4xl mx-auto">
            <div 
              className={proseStyles} 
              dangerouslySetInnerHTML={{ __html: post.content }} 
            />
          </div>

        </motion.article>
      </div>
    </main>
  );
}