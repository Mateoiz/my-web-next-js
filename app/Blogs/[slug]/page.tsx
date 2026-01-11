"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase"; 
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";
import { useParams } from "next/navigation"; 
import Link from "next/link";
import { FaArrowLeft, FaCalendarAlt, FaUser } from "react-icons/fa";
import FloatingCubes from "../../components/FloatingCubes"; 
import CircuitCursor from "../../components/CircuitCursor"; 

export default function SingleBlogPage() {
  const { slug } = useParams(); 
  const postId = slug as string; 

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      try {
        const docRef = doc(db, "posts", postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost(docSnap.data());
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-zinc-500 animate-pulse">Loading Article...</div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-zinc-500">Article not found.</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black pt-24 pb-12 px-4 selection:bg-green-500/30 relative overflow-hidden">
      
      {/* --- SHARED BACKGROUND UI --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-50 sm:opacity-100">
             <FloatingCubes />
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <CircuitCursor />

      {/* --- CONTENT CONTAINER --- */}
      <div className="relative z-10 max-w-3xl mx-auto">
        
        {/* BACK BUTTON */}
        <Link href="/Blogs" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-400 mb-8 transition-colors">
          <FaArrowLeft /> Back to Updates
        </Link>

        {/* GLASS ARTICLE CARD */}
        <article className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-10 shadow-xl">
            
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4">
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                        {post.category || "News"}
                    </span>
                    <span className="flex items-center gap-1"><FaCalendarAlt /> {post.date}</span>
                    <span className="flex items-center gap-1"><FaUser /> {post.author}</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-extrabold text-zinc-900 dark:text-white leading-tight mb-6">
                    {post.title}
                </h1>
            </div>

            {/* Image */}
            {post.image && (
            <div className="relative w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden mb-10 shadow-lg border border-zinc-100 dark:border-zinc-800">
                <Image src={post.image} alt={post.title} fill className="object-cover" />
            </div>
            )}

            {/* Content Body */}
            <div className="prose prose-lg dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 prose-a:text-green-600 prose-img:rounded-xl">
               {/* Note: If post.content is HTML, use dangerouslySetInnerHTML. If plain text, this is fine. */}
               {post.content}
            </div>

        </article>

      </div>
    </main>
  );
}