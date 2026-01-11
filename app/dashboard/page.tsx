"use client";

import { useAuth } from '../context/AuthContext';
// Add FaImage to your existing import
import { FaLock, FaPaperPlane, FaEdit, FaPlus, FaArrowLeft, FaSignOutAlt, FaImage } from "react-icons/fa";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from "framer-motion";
import { FaPenNib, FaFolderOpen, FaCog,} from "react-icons/fa";

// --- COMPONENTS ---
// Adjust these paths if your components folder is different (e.g., "../../components")
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor"; 

export default function Dashboard() {
  const { user, logOut, loading } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Loading State
  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-xl font-bold text-zinc-400 animate-pulse">
          Loading Dashboard...
        </div>
      </div>
    );
  }

  // Animation Variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <section className="min-h-screen py-24 px-4 md:px-8 relative overflow-hidden bg-zinc-50 dark:bg-black font-sans selection:bg-green-500/30">
      
      {/* --- BACKGROUND EFFECTS --- */}
      <CircuitCursor />
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute inset-0 opacity-80"><FloatingCubes /></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* --- HEADER --- */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-8"
        >
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Writer <span className="text-green-600 dark:text-green-500">Dashboard</span>
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">
              Welcome back, <span className="font-semibold text-zinc-900 dark:text-zinc-200">{user.email}</span>
            </p>
          </div>
          
          <button 
            onClick={logOut} 
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium rounded-xl transition-all border border-red-500/20 hover:border-red-500/50 shadow-sm hover:shadow-md"
          >
            <FaSignOutAlt />
            <span>Log Out</span>
          </button>
        </motion.div>

        {/* --- ACTION GRID --- */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          
          {/* Card 1: Write New Post */}
          <Link href="/dashboard/write" className="block h-full">
            <motion.div variants={item} className="group h-full p-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-xl hover:border-green-500/50 dark:hover:border-green-500/50 transition-all duration-300 relative overflow-hidden">
              
              {/* Background Icon Decoration */}
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity pointer-events-none">
                <FaPenNib className="text-9xl text-green-500 transform rotate-12 group-hover:scale-110 transition-transform" />
              </div>
              
              {/* Icon */}
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-green-600 dark:text-green-400 text-2xl shadow-inner">
                <FaPenNib />
              </div>
              
              <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                Write New Post
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Draft a new article, news update, or event announcement for the JPCS website using the rich text editor.
              </p>
            </motion.div>
          </Link>

          {/* Card 2: My Posts */}
          <Link href="/dashboard/posts" className="block h-full">
            <motion.div variants={item} className="group h-full p-8 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden">
              
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity pointer-events-none">
                <FaFolderOpen className="text-9xl text-blue-500 transform -rotate-12 group-hover:scale-110 transition-transform" />
              </div>

              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-blue-600 dark:text-blue-400 text-2xl shadow-inner">
                <FaFolderOpen />
              </div>

              <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                My Posts
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                View your published work, edit existing drafts, or manage content you have previously uploaded.
              </p>
            </motion.div>
          </Link>

          {/* Card 3: Settings (Disabled style) */}
          <motion.div variants={item} className="group h-full p-8 bg-zinc-50 dark:bg-zinc-900/30 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl flex flex-col justify-center items-center text-center opacity-75 hover:opacity-100 transition-opacity cursor-not-allowed">
            <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 text-zinc-400 dark:text-zinc-500 text-2xl">
              <FaCog />
            </div>
            <h2 className="text-xl font-bold mb-1 text-zinc-500 dark:text-zinc-400">
              Settings
            </h2>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              Profile management coming soon
            </p>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}