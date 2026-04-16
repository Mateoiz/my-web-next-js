"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic'; 
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCalendarAlt, FaCalculator, FaLayerGroup, 
  FaTasks, FaStickyNote, FaUserCircle, FaSignOutAlt, FaHome, FaBolt
} from "react-icons/fa";

// --- FIREBASE IMPORTS ---
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/db"; 

// --- BACKGROUND IMPORTS ---
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor"; 

// --- LAZY LOADING TOOLS ---
const ScheduleMaker = dynamic(() => import('../components/Tools/ScheduleMaker'), { ssr: false });
const GradeCalculator = dynamic(() => import('../components/Tools/GradeCalculator'));
const GWACalculator = dynamic(() => import('../components/Tools/GWACalculator'));
const FlashcardMaker = dynamic(() => import('../components/Tools/FlashcardMaker'), { ssr: false });

export default function Dashboard() {
  const [activeView, setActiveView] = useState<'home' | 'schedule' | 'calc' | 'flashcards' | 'tasks' | 'notes'>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const router = useRouter();

  // --- ROUTE PROTECTION & DATA FETCHING ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // If not logged in, kick them back to the public workspace
        router.push("/workspace");
        return;
      }

      setAuthUser(user);
      
      // Fetch their custom username and details from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      } else {
        // Edge case: They logged in but skipped username setup
        router.push("/workspace"); 
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/Workspace");
  };

  // --- NAVIGATION CONFIG ---
  const NAV_ITEMS = [
    { id: 'home', label: 'Overview', icon: <FaHome /> },
    { id: 'schedule', label: 'Schedule', icon: <FaCalendarAlt /> },
    { id: 'calc', label: 'Grades', icon: <FaCalculator /> },
    { id: 'flashcards', label: 'Reviewer', icon: <FaLayerGroup /> },
    { id: 'tasks', label: 'Tasks', icon: <FaTasks />, isPremium: true },
    { id: 'notes', label: 'Notes', icon: <FaStickyNote />, isPremium: true },
  ];

  // --- LOADING SCREEN (Matches UI System) ---
  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-32 flex flex-col items-center justify-center bg-zinc-50 dark:bg-black selection:bg-green-500/30">
        <span className="w-12 h-12 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin mb-6" />
        <div className="text-zinc-400 font-mono text-sm font-bold tracking-widest uppercase animate-pulse">Decrypting Secure Session...</div>
      </div>
    );
  }

  return (
    <section className="min-h-screen pt-28 md:pt-32 pb-24 md:pb-32 px-4 md:px-8 relative overflow-hidden bg-zinc-50 dark:bg-black font-sans selection:bg-green-500/30 transition-colors duration-300">
      
      {/* --- BACKGROUND LAYERS --- */}
      <div className="hidden md:block"><CircuitCursor /></div>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30 sm:opacity-60"><FloatingCubes /></div>
        <div className="absolute top-[10%] right-[10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-green-500/10 rounded-full blur-[100px] md:blur-[150px] pointer-events-none" />
      </div>

      <div className="max-w-[90rem] mx-auto relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* ================= LEFT SIDEBAR (COMMAND CENTER) ================= */}
          <motion.aside 
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
            className="xl:col-span-3 space-y-6 xl:sticky xl:top-32"
          >
            {/* USER PROFILE CARD */}
            <div className="bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-xl transition-colors duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-2xl rounded-full pointer-events-none group-hover:bg-green-500/20 transition-colors" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] shrink-0">
                  <FaUserCircle size={32} />
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white truncate">{userProfile?.fullName || authUser?.displayName}</h3>
                  <p className="text-sm font-mono text-green-600 dark:text-green-400 font-bold truncate">@{userProfile?.username || "student"}</p>
                </div>
              </div>
              
              <button 
                onClick={handleSignOut}
                className="w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 hover:border-red-200 dark:hover:border-red-500/30 font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
              >
                <FaSignOutAlt /> Terminate Session
              </button>
            </div>

            {/* NAVIGATION MENU */}
            <div className="bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-4 shadow-xl transition-colors duration-300">
              <p className="px-4 pt-2 pb-4 text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase">Modules</p>
              <nav className="flex xl:flex-col gap-2 overflow-x-auto xl:overflow-visible pb-2 xl:pb-0 custom-scrollbar">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id as any)}
                      className={`
                        relative shrink-0 xl:shrink flex items-center gap-3 px-5 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 active:scale-[0.98]
                        ${isActive 
                          ? 'text-white shadow-md' 
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                        }
                      `}
                    >
                      {isActive && (
                        <motion.div layoutId="activeNav" className="absolute inset-0 bg-zinc-900 dark:bg-green-600 rounded-xl -z-10" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                      )}
                      <span className={`relative z-10 ${isActive ? 'text-green-400 dark:text-white' : ''}`}>
                        {item.icon}
                      </span>
                      <span className="relative z-10 tracking-wide">{item.label}</span>
                      
                      {/* Premium Indicator Dot */}
                      {item.isPremium && !isActive && (
                        <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </motion.aside>

          {/* ================= RIGHT SIDE (DYNAMIC CANVAS) ================= */}
          <motion.main 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="xl:col-span-9 min-h-[700px]"
          >
            <AnimatePresence mode="wait">
              
              {/* --- VIEW: HOME / OVERVIEW --- */}
              {activeView === 'home' && (
                <motion.div key="home" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="space-y-6">
                  
                  {/* Welcome Banner */}
                  <div className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl group border border-zinc-800 dark:border-green-500/30">
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 to-black dark:from-green-900 dark:to-zinc-950 z-0" />
                    <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 z-0 mix-blend-overlay" />
                    <div className="relative z-10 p-8 md:p-12 flex flex-col justify-center min-h-[250px]">
                      <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/10 border border-white/20 text-[10px] font-mono font-bold tracking-widest text-zinc-300 uppercase backdrop-blur-md w-max">
                         <FaBolt className="text-yellow-400" /> Secure Connection
                      </div>
                      <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight">
                        Welcome back, <br/> <span className="text-green-400">{userProfile?.fullName?.split(' ')[0] || 'Scholar'}</span>.
                      </h1>
                      <p className="text-zinc-400 text-sm md:text-base max-w-xl">
                        Your workspace is synced and ready. You have no pending tasks today. Let's make it a productive session.
                      </p>
                    </div>
                  </div>

                  {/* Placeholder Live Widgets */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 shadow-lg h-[250px] flex flex-col justify-center items-center text-center">
                      <FaTasks className="text-4xl text-zinc-300 dark:text-zinc-700 mb-4" />
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Task Tracker</h3>
                      <p className="text-zinc-500 text-sm mt-2">Module initializing in future update...</p>
                      <button onClick={() => setActiveView('tasks')} className="mt-4 px-6 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-bold text-zinc-600 dark:text-zinc-300">Open Module</button>
                    </div>
                    <div className="bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 shadow-lg h-[250px] flex flex-col justify-center items-center text-center">
                      <FaStickyNote className="text-4xl text-zinc-300 dark:text-zinc-700 mb-4" />
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Cloud Notes</h3>
                      <p className="text-zinc-500 text-sm mt-2">Module initializing in future update...</p>
                      <button onClick={() => setActiveView('notes')} className="mt-4 px-6 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-bold text-zinc-600 dark:text-zinc-300">Open Module</button>
                    </div>
                  </div>

                </motion.div>
              )}

              {/* --- VIEW: TOOLS --- */}
              {activeView === 'schedule' && (
                <motion.div key="schedule" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}><ScheduleMaker /></motion.div>
              )}
              {activeView === 'calc' && (
                <motion.div key="calc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 2xl:grid-cols-2 gap-8 items-start">
                  <GradeCalculator />
                  <GWACalculator />
                </motion.div>
              )}
              {activeView === 'flashcards' && (
                <motion.div key="flashcards" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}><FlashcardMaker /></motion.div>
              )}
              
              {/* --- VIEW: PREMIUM TOOLS (PLACEHOLDERS FOR NOW) --- */}
              {(activeView === 'tasks' || activeView === 'notes') && (
                <motion.div key="premium" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="w-full h-[600px] bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-xl flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6">
                    {activeView === 'tasks' ? <FaTasks size={32} /> : <FaStickyNote size={32} />}
                  </div>
                  <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-4 uppercase tracking-tight">System Updating</h2>
                  <p className="text-zinc-500 max-w-md mx-auto">
                    The {activeView === 'tasks' ? 'Task Tracker' : 'Cloud Notes'} module is currently being compiled by the engineering team. Check back soon.
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.main>

        </div>
      </div>
    </section>
  );
}