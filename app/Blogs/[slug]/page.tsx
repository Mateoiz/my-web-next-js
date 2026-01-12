"use client";

import { use, useEffect, useState } from "react"; 
import { notFound, useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { FaArrowLeft, FaTag, FaShareAlt, FaTerminal, FaClock } from "react-icons/fa";
import { getPostBySlug, type BlogPost } from "@/lib/db"; 

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
        console.log("🔍 Searching DB for slug:", slug); // DEBUG LOG
        
        try {
            const data = await getPostBySlug(slug);
            if (!data) {
                console.error("❌ No post found with this slug in Firebase.");
                setError("Post not found in database.");
                // setTimeout(() => notFound(), 2000); // Uncomment to trigger 404 page
            } else {
                console.log("✅ Post found:", data);
                setPost(data);
            }
        } catch (err) {
            console.error("🔥 Error querying database:", err);
            setError("Database query failed.");
        } finally {
            setLoading(false);
        }
    };
    
    if (slug) fetchPost();
  }, [slug]);

  // Animations
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.98]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

  if (loading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 gap-4">
            <div className="animate-spin w-8 h-8 border-4 border-black border-t-transparent rounded-full dark:border-white dark:border-t-transparent" />
            <p className="font-mono text-xs">QUERYING_MAINFRAME...</p>
            <p className="font-mono text-[10px] text-zinc-400">Target: {slug}</p>
        </div>
    );
  }

  if (error || !post) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border-2 border-red-500 max-w-md">
                <h1 className="text-2xl font-black text-red-600 dark:text-red-500 mb-2">404 - TRANSMISSION LOST</h1>
                <p className="text-zinc-600 dark:text-zinc-300 mb-4 font-mono text-sm">
                    The requested data packet could not be retrieved.
                </p>
                <div className="bg-black/5 dark:bg-black/50 p-3 rounded text-left font-mono text-xs text-zinc-500 mb-6 overflow-auto">
                   <p>SLUG: {slug}</p>
                   <p>STATUS: {error || "NULL_RESPONSE"}</p>
                </div>
                <button 
                    onClick={() => router.push("/blog")}
                    className="px-6 py-2 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-widest text-xs rounded hover:opacity-80"
                >
                    Return to Archives
                </button>
            </div>
        </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 text-black dark:text-zinc-100 font-sans pt-32 pb-20 selection:bg-green-500/30">
      
      {/* FLOATING DECORATIONS */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-[-5%] w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-[-5%] w-[400px] h-[400px] bg-zinc-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">

        {/* BACK BUTTON */}
        <button 
            onClick={() => router.back()}
            className="group mb-8 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
            <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 group-hover:border-black dark:group-hover:border-white transition-colors">
                <FaArrowLeft />
            </div>
            Back to Archives
        </button>

        {/* MAIN ARTICLE CONTAINER */}
        <motion.article 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-none overflow-hidden"
        >
          
          {/* HEADER SECTION */}
          <div className="p-8 md:p-12 border-b-2 border-black dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20">
            <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 bg-black text-white dark:bg-green-600 dark:text-black text-[10px] font-bold uppercase tracking-widest border border-black dark:border-green-600">
                    {post.category}
                </span>
                <span className="text-zinc-400 font-mono text-xs">ID: {post.slug?.slice(0, 8) || "UNKNOWN"}</span>
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
                        <span className="block text-[10px] text-zinc-500 uppercase font-bold">Date</span>
                        <span className="font-bold">
                            {post.createdAt?.seconds 
                                ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() 
                                : "Recent"}
                        </span>
                   </div>
                   <div className="flex items-center gap-2">
                        <FaClock className="text-zinc-400" />
                        <span className="font-bold">5 min read</span>
                   </div>
               </div>
            </div>
          </div>

          {/* IMAGE SECTION */}
          {post.coverImage && (
            <motion.div 
                style={{ scale, opacity }}
                className="relative w-full aspect-video md:aspect-[21/9] bg-zinc-100 dark:bg-zinc-800 border-b-2 border-black dark:border-zinc-800 overflow-hidden"
            >
                <Image 
                src={post.coverImage} 
                alt={post.title} 
                fill 
                priority
                className="object-cover"
                />
            </motion.div>
          )}

          {/* BODY CONTENT */}
          <div className="p-8 md:p-12 md:py-16 max-w-4xl mx-auto">
            <div 
              className="
                prose prose-lg prose-zinc dark:prose-invert max-w-none 
                prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight
                prose-p:text-zinc-800 dark:prose-p:text-zinc-300 prose-p:leading-8 prose-p:font-medium
                prose-a:text-green-600 hover:prose-a:text-green-500 prose-a:font-bold prose-a:no-underline
                prose-blockquote:border-l-4 prose-blockquote:border-green-500 prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-800/50 prose-blockquote:p-4 prose-blockquote:italic
                prose-img:rounded-none prose-img:border-2 prose-img:border-black dark:prose-img:border-zinc-700
              "
              dangerouslySetInnerHTML={{ __html: post.content }} 
            />

            {/* FOOTER ACTIONS */}
            <div className="mt-16 pt-8 border-t-2 border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-zinc-500">
                <FaTag className="text-black dark:text-white" /> 
                <span>Tags:</span>
                <span className="text-black dark:text-white hover:underline cursor-pointer">JPCS</span>
                <span className="text-black dark:text-white hover:underline cursor-pointer">/</span>
                <span className="text-black dark:text-white hover:underline cursor-pointer">{post.category}</span>
              </div>

              <button className="flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black hover:bg-green-600 dark:hover:bg-green-400 transition-all font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none">
                <FaShareAlt /> Share Transmission
              </button>
            </div>
          </div>

        </motion.article>

      </div>
    </main>
  );
}