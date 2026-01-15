"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { FaArrowLeft, FaTag, FaShareAlt, FaTerminal, FaClock } from "react-icons/fa";
// 1. Import the type definition from your server file
import { type BlogPost } from "@/lib/server-db"; 

// --- UNIFIED STYLES ---
const proseStyles = `
  prose prose-lg prose-zinc dark:prose-invert max-w-none
  prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight
  prose-p:text-zinc-800 dark:prose-p:text-zinc-300 prose-p:leading-8 prose-p:mb-6
  prose-a:text-green-600 hover:prose-a:text-green-500 prose-a:font-bold prose-a:no-underline
  prose-blockquote:border-l-4 prose-blockquote:border-green-500 prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-900/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic
  prose-ul:list-disc prose-ul:pl-6
  prose-img:rounded-xl prose-img:border-2 prose-img:border-black dark:prose-img:border-zinc-700
  prose-table:block prose-table:overflow-x-auto
`;

// 2. Updated props to accept the full post object
export default function BlogPostClient({ post }: { post: BlogPost | null }) {
  const router = useRouter();
  
  // NOTE: Loading state is no longer needed here because the server handles it before rendering.

  // Animations (Kept exactly as you had them)
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.98]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

  // 3. Handle Missing Post (404 Logic)
  if (!post) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border-2 border-red-500 max-w-md w-full">
                <h1 className="text-xl md:text-2xl font-black text-red-600 dark:text-red-500 mb-2">404 - LOST SIGNAL</h1>
                <p className="text-zinc-600 dark:text-zinc-300 mb-6 font-mono text-xs md:text-sm">
                    The requested data packet could not be retrieved.
                </p>
                <button 
                    onClick={() => router.push("/Blogs")}
                    className="w-full md:w-auto px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-bold uppercase tracking-widest text-xs rounded hover:opacity-80 transition-opacity"
                >
                    Return to Archives
                </button>
            </div>
        </div>
    );
  }

  // 4. Main Render (Identical to your original design)
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 text-black dark:text-zinc-100 font-sans pt-24 md:pt-32 pb-20 selection:bg-green-500/30">
      
      {/* FLOATING DECORATIONS */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-20%] w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-green-500/10 rounded-full blur-[80px] md:blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-20%] w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-zinc-500/10 rounded-full blur-[80px] md:blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">

        {/* BACK BUTTON */}
        <button 
            onClick={() => router.back()}
            className="group mb-6 md:mb-8 inline-flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-wide text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
            <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 group-hover:border-black dark:group-hover:border-white transition-colors">
                <FaArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
            </div>
            Back to Archives
        </button>

        {/* MAIN ARTICLE CONTAINER */}
        <motion.article 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-none overflow-hidden"
        >
          
          {/* HEADER SECTION */}
          <div className="p-6 md:p-12 border-b-2 border-black dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/20">
            
            <div className="flex flex-wrap items-center gap-3 mb-4 md:mb-6">
                <span className="px-3 py-1 bg-black text-white dark:bg-green-600 dark:text-black text-[10px] font-bold uppercase tracking-widest border border-black dark:border-green-600">
                    {post.category}
                </span>
                <span className="text-zinc-400 font-mono text-[10px] md:text-xs">ID: {post.slug?.slice(0, 8) || "UNKNOWN"}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-black dark:text-white leading-tight mb-6">
              {post.title}
            </h1>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 font-mono text-xs md:text-sm border-t-2 border-zinc-200 dark:border-zinc-800 pt-6">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                      <FaTerminal className="text-zinc-500" size={12}/>
                  </div>
                  <div>
                      <span className="block text-[10px] text-zinc-500 uppercase font-bold">Author</span>
                      <span className="font-bold text-sm">{post.author}</span>
                  </div>
               </div>
               
               <div className="flex flex-wrap items-center gap-4 md:gap-6 text-zinc-600 dark:text-zinc-400">
                   <div>
                       <span className="block text-[10px] text-zinc-500 uppercase font-bold">Date</span>
                       <span className="font-bold">{post.date}</span>
                   </div>
                   <div className="flex items-center gap-2 border-l border-zinc-300 dark:border-zinc-700 pl-4">
                       <FaClock className="text-zinc-400" />
                       <span className="font-bold">5 min</span>
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
          <div className="p-6 md:p-12 md:py-16 max-w-4xl mx-auto">
            <div 
              className={proseStyles}
              dangerouslySetInnerHTML={{ __html: post.content }} 
            />

            {/* FOOTER ACTIONS */}
            <div className="mt-12 md:mt-16 pt-8 border-t-2 border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-wide text-zinc-500">
                <FaTag className="text-black dark:text-white shrink-0" /> 
                <span className="shrink-0">Tags:</span>
                <span className="text-black dark:text-white hover:underline cursor-pointer">JPCS</span>
                <span className="text-black dark:text-white">/</span>
                <span className="text-black dark:text-white hover:underline cursor-pointer">{post.category}</span>
              </div>

              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black hover:bg-green-600 dark:hover:bg-green-400 transition-all font-bold uppercase tracking-widest text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none rounded-lg md:rounded-none">
                <FaShareAlt /> Share
              </button>
            </div>
          </div>

        </motion.article>

      </div>
    </main>
  );
}