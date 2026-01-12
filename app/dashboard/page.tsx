"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext"; 
import { getPendingPosts, updatePostStatus, type BlogPost } from "@/lib/db";
import { useRouter } from "next/navigation";
import { FaCheck, FaTimes, FaPen, FaEye, FaLayerGroup } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// --- COMPONENT IMPORTS (From your reference) ---
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor";

export default function Dashboard() {
  const { user, userData } = useAuth(); 
  const [pendingPosts, setPendingPosts] = useState<BlogPost[]>([]);
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  // Fetch pending posts ONLY if user is admin
  useEffect(() => {
    if (userData?.role === "admin") {
      const fetchPosts = async () => {
        const posts = await getPendingPosts();
        setPendingPosts(posts);
      };
      fetchPosts();
    }
  }, [userData]);

  const handleApproval = async (id: string, status: "published" | "rejected") => {
    await updatePostStatus(id, status);
    // Refresh list locally with animation
    setPendingPosts(prev => prev.filter(p => p.id !== id));
  };

  if (!user) return null;

  return (
    <section className="min-h-screen relative overflow-hidden bg-zinc-50 dark:bg-black transition-colors duration-300">
      
      {/* --- BACKGROUND ELEMENTS --- */}
      <CircuitCursor />
      
      <div className="absolute inset-0 z-0 pointer-events-none">
         <FloatingCubes />
      </div>

      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-green-100/40 dark:from-green-900/20 to-transparent pointer-events-none z-0" />

      {/* --- CONTENT CONTAINER --- */}
      <div className="container mx-auto px-6 pt-32 pb-20 relative z-10">
        
        {/* HEADER SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-zinc-500 dark:text-green-400/70 tracking-widest uppercase">
                  System_Online :: {userData?.role || "USER"}
                </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-zinc-900 dark:text-white">
              Welcome, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-400 dark:from-green-400 dark:to-green-600 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                {userData?.name || "Officer"}
              </span>
            </h1>
          </div>

          {/* CREATE BUTTON */}
          <motion.button 
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/dashboard/create")}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-zinc-900 dark:bg-green-600 text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-green-500/40"
          >
            <span>Write Article</span>
            <div className="bg-white/20 rounded-full p-2 group-hover:rotate-12 transition-transform">
               <FaPen size={14} />
            </div>
          </motion.button>
        </motion.div>

        {/* --- ADMIN VIEW: APPROVAL QUEUE --- */}
        {userData?.role === "admin" && (
          <div className="relative">
            {/* SECTION LABEL */}
            <div className="mb-10 flex items-center gap-4">
                <h2 className="text-3xl font-black uppercase text-zinc-900 dark:text-white">
                   Approval Queue
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-green-500/50 to-transparent" />
                <span className="font-mono text-green-500 text-xl font-bold">
                    {pendingPosts.length.toString().padStart(2, '0')}
                </span>
            </div>

            {pendingPosts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="p-12 rounded-3xl bg-white/40 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 backdrop-blur-sm text-center"
              >
                <p className="text-zinc-500 italic text-lg">No signals detected. Queue is empty.</p>
              </motion.div>
            ) : (
              <div className="grid gap-6">
                <AnimatePresence>
                  {pendingPosts.map((post, index) => (
                    <motion.div 
                      key={post.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700/50 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300"
                    >
                      {/* Decorative Corners (From About Page) */}
                      <div className="absolute top-0 left-0 w-2 h-full bg-green-500/0 group-hover:bg-green-500 transition-colors duration-300 rounded-l-2xl" />
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                             <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                                Pending Review
                             </span>
                             <span className="text-zinc-400 text-xs font-mono uppercase">
                                ID: {post.id?.slice(0, 8)}...
                             </span>
                          </div>
                          
                          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {post.title}
                          </h3>
                          
                          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                             <span className="font-bold text-zinc-700 dark:text-zinc-300">{post.author}</span>
                             <span>•</span>
                             <span>{post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          
                          {/* PREVIEW */}
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.open(`/Blogs/${post.slug}`, '_blank')}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <FaEye /> <span className="md:hidden lg:inline">Preview</span>
                          </motion.button>

                          {/* REJECT */}
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => post.id && handleApproval(post.id, "rejected")}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                            title="Reject"
                          >
                            <FaTimes /> <span className="md:hidden">Reject</span>
                          </motion.button>

                          {/* APPROVE */}
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => post.id && handleApproval(post.id, "published")}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-green-500 text-white font-bold shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:bg-green-600 transition-all"
                            title="Approve & Publish"
                          >
                            <FaCheck /> <span className="md:hidden lg:inline">Approve</span>
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* --- WRITER VIEW: MY POSTS --- */}
        {userData?.role !== "admin" && (
           <div className="mt-8">
              <div className="mb-10 flex items-center gap-4">
                  <h2 className="text-3xl font-black uppercase text-zinc-900 dark:text-white">
                     My Submissions
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-zinc-300 dark:from-zinc-700 to-transparent" />
              </div>
              
              <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center border-dashed">
                  <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 mb-4">
                    <FaLayerGroup size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-700 dark:text-zinc-300 mb-2">No Recent Activity</h3>
                  <p className="text-zinc-500 max-w-md">
                    You haven't submitted any articles yet. Click the "Write Article" button above to start your first draft.
                  </p>
              </div>
           </div>
        )}

      </div>

      {/* CSS for Scanline (Global) */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
      `}</style>
    </section>
  );
}