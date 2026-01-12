"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getPendingPosts, updatePostStatus, getMyPosts, type BlogPost } from "@/lib/db";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  PenTool, Clock, CheckCircle, XCircle, FileText, Layout, 
  Loader2, ExternalLink, ShieldAlert 
} from "lucide-react";

export default function Dashboard() {
  const { user, userData } = useAuth();
  const router = useRouter();
  
  // State
  const [adminQueue, setAdminQueue] = useState<BlogPost[]>([]);
  const [myPosts, setMyPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  // Data Fetching
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        // 1. If Admin, fetch the queue
        if (userData?.role === "admin") {
          const queue = await getPendingPosts();
          setAdminQueue(queue);
        }

        // 2. Fetch "My Posts" for everyone
        const mine = await getMyPosts(user.uid);
        setMyPosts(mine);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, userData]);

  const handleApproval = async (id: string, status: "published" | "rejected") => {
    await updatePostStatus(id, status);
    setAdminQueue(prev => prev.filter(p => p.id !== id));
  };

  // Helper for Status Badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <span className="flex items-center gap-1 text-green-600 dark:text-green-400 border border-green-500/30 bg-green-500/10 px-2 py-1 rounded text-[10px] md:text-xs font-mono uppercase tracking-wider"><CheckCircle className="w-3 h-3"/> Published</span>;
      case "rejected":
        return <span className="flex items-center gap-1 text-red-600 dark:text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-1 rounded text-[10px] md:text-xs font-mono uppercase tracking-wider"><XCircle className="w-3 h-3"/> Rejected</span>;
      default:
        return <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 rounded text-[10px] md:text-xs font-mono uppercase tracking-wider"><Clock className="w-3 h-3"/> Pending</span>;
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-green-600 dark:text-green-500 transition-colors">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Get the display name
  const displayName = userData?.name ? userData.name.split(' ')[0] : "Ice";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-green-500/30 pb-20 transition-colors duration-300">
      
      {/* --- HEADER --- */}
      <header className="pt-24 md:pt-32 pb-8 md:pb-12 px-4 md:px-6 border-b border-zinc-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="text-zinc-500 dark:text-zinc-500 font-mono text-[10px] md:text-xs uppercase tracking-widest mb-2">
              // Terminal_Access_Granted
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">
              Welcome back, <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-800 dark:from-green-400 dark:to-green-700">
                Writer {displayName}
              </span>
            </h1>
          </motion.div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/dashboard/create")}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-green-600 dark:hover:bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-zinc-200 dark:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all"
          >
            <PenTool className="w-4 h-4" />
            <span>New Transmission</span>
          </motion.button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-8 md:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        
        {/* --- LEFT COL: MAIN CONTENT --- */}
        <div className="lg:col-span-2 space-y-8 md:space-y-12">
          
          {/* 1. ADMIN SECTION (Conditional) */}
          {userData?.role === "admin" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm transition-colors"
            >
              <div className="p-4 md:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                  <ShieldAlert className="text-yellow-500 w-5 h-5"/> 
                  Admin Queue
                </h2>
                <span className="text-[10px] md:text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  {adminQueue.length}
                </span>
              </div>
              
              {adminQueue.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 italic text-sm">All caught up. No posts.</div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {adminQueue.map(post => (
                    <div key={post.id} className="p-4 md:p-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="w-full sm:w-auto">
                        <h3 className="font-bold text-base md:text-lg text-zinc-800 dark:text-zinc-200 line-clamp-1">{post.title}</h3>
                        <p className="text-xs text-zinc-500 font-mono mt-1">
                          {post.author} • {new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                          <button 
                           onClick={() => window.open(`/preview/${post.id}`, '_blank')}
                           className="flex-1 sm:flex-none p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex justify-center border border-zinc-200 dark:border-zinc-700"
                           title="Preview"
                          >
                            <ExternalLink className="w-4 h-4"/>
                          </button>
                          <button 
                           onClick={() => post.id && handleApproval(post.id, "rejected")}
                           className="flex-1 sm:flex-none p-2 rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-500 hover:text-red-700 dark:hover:text-white transition-colors flex justify-center border border-red-200 dark:border-red-900/30"
                           title="Reject"
                          >
                            <XCircle className="w-4 h-4"/>
                          </button>
                          <button 
                           onClick={() => post.id && handleApproval(post.id, "published")}
                           className="flex-1 sm:flex-none p-2 rounded bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-500 hover:bg-green-100 dark:hover:bg-green-500 hover:text-green-700 dark:hover:text-white transition-colors flex justify-center border border-green-200 dark:border-green-900/30"
                           title="Approve"
                          >
                            <CheckCircle className="w-4 h-4"/>
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* 2. MY SUBMISSIONS (Writer View) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Layout className="w-5 h-5 text-green-600 dark:text-green-500"/>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">My Archives</h2>
            </div>

            {myPosts.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 md:p-12 text-center shadow-sm">
                 <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PenTool className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
                 </div>
                 <h3 className="text-zinc-700 dark:text-zinc-300 font-bold mb-2">No transmissions found.</h3>
                 <p className="text-zinc-500 mb-6 text-sm">Start writing your first article to see it here.</p>
                 <button onClick={() => router.push("/dashboard/create")} className="text-green-600 hover:underline text-sm font-mono uppercase font-bold">
                   Initialize New Post
                 </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {myPosts.map((post) => (
                  <div key={post.id} className="group bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 hover:border-green-500/50 dark:hover:border-green-500/50 rounded-xl p-5 md:p-6 transition-all duration-300 flex flex-col md:flex-row justify-between gap-4 shadow-sm hover:shadow-md">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusBadge(post.status)}
                          <span className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-500 font-mono">
                             {new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-1">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-2 line-clamp-2 max-w-xl">
                            {post.excerpt}
                          </p>
                        )}
                    </div>
                    
                    {/* View Button: Always visible on mobile, hover-only on desktop */}
                    <div className="flex items-center gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity self-start md:self-center border-t md:border-none border-zinc-100 dark:border-zinc-800 pt-3 md:pt-0 w-full md:w-auto">
                        <button 
                          onClick={() => window.open(`/preview/${post.id}`, '_blank')}
                          className="text-xs font-mono uppercase text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 font-semibold"
                        >
                          View_Data <ExternalLink className="w-3 h-3"/>
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* --- RIGHT COL: STATS --- */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm transition-colors"
          >
            <h3 className="text-xs font-mono uppercase text-zinc-500 mb-6 tracking-widest">Performance_Metrics</h3>
            
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2 text-sm"><FileText className="w-4 h-4"/> Total Posts</span>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white">{myPosts.length}</span>
               </div>
               
               <div className="w-full h-px bg-zinc-100 dark:bg-zinc-800" />

               <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-green-500"/> Published</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-500">
                    {myPosts.filter(p => p.status === 'published').length}
                  </span>
               </div>

               <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-yellow-500"/> Pending</span>
                  <span className="text-xl font-bold text-yellow-600 dark:text-yellow-500">
                    {myPosts.filter(p => p.status === 'pending').length}
                  </span>
               </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
               <div className="text-[10px] md:text-xs text-zinc-500 font-mono leading-relaxed">
                  SYSTEM NOTE:<br/>
                  All submissions are subject to admin review before going live.
               </div>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}