"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase"; 
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaUser, FaCalendarAlt, FaArrowRight, FaFilter, FaLock } from "react-icons/fa"; // ✅ Added FaLock

import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor"; 

// --- CATEGORIES ---
const CATEGORIES = ["All", "News", "Events", "Tech", "Community", "Tinig"];

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  // 1. Fetch Posts from Firebase
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(data);
        setFilteredPosts(data);
      } catch (error) {
        console.error("Error fetching posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // 2. Handle Filtering
  useEffect(() => {
    if (activeFilter === "All") {
      setFilteredPosts(posts);
    } else {
      setFilteredPosts(posts.filter(post => post.category === activeFilter));
    }
  }, [activeFilter, posts]);

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
        
        {/* --- ✅ NEW: OFFICER LOGIN BUTTON --- */}
        <div className="flex justify-end mb-8">
          <Link
            href="/login"
            className="group flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-bold text-zinc-500 hover:text-green-600 dark:hover:text-green-400 transition-all hover:shadow-lg uppercase tracking-wider"
          >
            <FaLock className="text-zinc-400 group-hover:text-green-500 transition-colors" />
            Writer Portal
          </Link>
        </div>

        {/* HEADER */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Latest <span className="text-green-600 dark:text-green-500">Updates</span>
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto text-lg">
            Stay in the loop with the latest events and stories from JPCS.
          </p>
        </div>

        {/* --- FILTER GRID --- */}
        <div className="flex justify-center mb-16">
          <div className="flex flex-wrap justify-center gap-2 p-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                  activeFilter === cat 
                    ? "bg-green-600 text-white shadow-lg shadow-green-500/30 scale-105" 
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* GRID */}
        {loading ? (
           <div className="text-center text-zinc-500 animate-pulse mt-20">Loading updates...</div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <AnimatePresence>
              {filteredPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-20">
            <div className="text-zinc-300 dark:text-zinc-700 text-6xl mb-4"><FaFilter className="mx-auto" /></div>
            <p className="text-zinc-500">No posts found in this category.</p>
          </div>
        )}

      </div>
    </main>
  );
}

// --- CARD COMPONENT ---
function BlogCard({ post }: { post: any }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="group flex flex-col h-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-xl dark:hover:shadow-[0_10px_40px_-10px_rgba(34,197,94,0.15)] transition-all duration-300 hover:-translate-y-2"
    >
      <div className="relative h-56 w-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        {/* Placeholder if no image */}
        {post.image ? (
          <Image 
            src={post.image} 
            alt={post.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-700 font-bold">JPCS</div>
        )}
        
        <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-green-700 dark:text-green-400 border border-zinc-200 dark:border-zinc-700 shadow-sm">
           {post.category}
        </div>
      </div>

      <div className="flex flex-col flex-grow p-6">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-3 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors line-clamp-2">
          {post.title}
        </h3>

        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <span className="flex items-center gap-1.5"><FaCalendarAlt className="text-green-500/70" /> {post.date || "Recent"}</span>
          <span className="flex items-center gap-1.5"><FaUser className="text-green-500/70" /> {post.author || "Admin"}</span>
        </div>

        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-3">
          {post.excerpt || "Click to read more regarding this update..."}
        </p>

        <div className="mt-auto flex justify-end">
          <Link 
            href={`/Blogs/${post.slug || '#'}`} 
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-all duration-300"
          >
            Read Full Story <FaArrowRight />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}