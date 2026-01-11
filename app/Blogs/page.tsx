"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaUser, FaCalendarAlt, FaArrowRight, FaPenNib, FaFilter } from "react-icons/fa";
import { db } from "@/lib/firebase"; 
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor"; 

// ✅ ADDED "Tinig" HERE
const CATEGORIES = ["All", "News", "Events", "Announcements", "Tech", "Tinig"];

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]); 
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const postsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPosts(postsData);
        setFilteredPosts(postsData);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  useEffect(() => {
    if (selectedCategory === "All") {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(post => post.category === selectedCategory));
    }
  }, [selectedCategory, posts]);

  return (
    <main className="min-h-screen pt-24 pb-12 px-4 bg-zinc-50 dark:bg-black selection:bg-green-500/30 relative overflow-hidden">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-50 sm:opacity-100">
             <FloatingCubes />
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <CircuitCursor />

      <div className="relative z-10 max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="text-center mb-10 space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Latest <span className="text-green-600 dark:text-green-500">Updates</span>
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto text-sm md:text-base">
            Stay in the loop with the latest stories from JPCS.
          </p>
        </div>

        {/* CONTROLS */}
        <div className="sticky top-20 z-30 mb-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide px-2">
             <FaFilter className="text-zinc-400 text-xs mr-2 shrink-0" />
             {CATEGORIES.map((cat) => (
               <button
                 key={cat}
                 onClick={() => setSelectedCategory(cat)}
                 className={`
                   px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap
                   ${selectedCategory === cat 
                     ? "bg-green-600 text-white shadow-md shadow-green-500/20 scale-105" 
                     : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"}
                 `}
               >
                 {cat}
               </button>
             ))}
          </div>

          <div className="w-full md:w-auto px-2">
            <Link 
              href="/signup" 
              className="flex items-center justify-center gap-2 w-full md:w-auto px-5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-500 transition-all text-xs font-medium group"
            >
              <FaPenNib className="group-hover:-translate-y-0.5 transition-transform" />
              <span>Publisher Access</span>
            </Link>
          </div>
        </div>

        {/* GRID WITH FIXED ANIMATION */}
        {loading ? (
          <div className="text-center text-zinc-500 py-20">Loading updates...</div>
        ) : (
          <motion.div 
            layout 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* ✅ FIX: mode="popLayout" makes the grid rearrange instantly when items disappear */}
            <AnimatePresence mode="popLayout">
              {filteredPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {!loading && filteredPosts.length === 0 && (
           <div className="text-center py-20">
             <p className="text-zinc-500">No posts found in this category.</p>
           </div>
        )}
      </div>
    </main>
  );
}

function BlogCard({ post }: { post: any }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", damping: 20, stiffness: 120 }} // Smooth spring animation
      className="group flex flex-col h-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300"
    >
      <div className="relative h-48 w-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <Image 
          src={post.image || '/fallback-image.jpg'} 
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold text-white border border-white/10">
           {post.category || 'News'}
        </div>
      </div>

      <div className="flex flex-col flex-grow p-5">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-2 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">
          {post.title}
        </h3>

        <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-3">
          <span className="flex items-center gap-1"><FaCalendarAlt /> {post.date}</span>
          <span className="flex items-center gap-1"><FaUser /> {post.author}</span>
        </div>

        <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mb-4 line-clamp-3">
          {post.excerpt}
        </p>

        <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center">
          <span className="text-[10px] text-zinc-400 italic">Read in 3 min</span>
          <Link 
            href={`/blog/${post.id}`} 
            className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 transition-colors"
          >
            Read <FaArrowRight size={10} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}