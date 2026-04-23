"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic'; 
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCalendarAlt, FaCalculator, FaLayerGroup, 
  FaTasks, FaUserCircle, FaSignOutAlt,
  FaPlus, FaCheckCircle, FaRegCircle, FaTrashAlt, 
  FaTachometerAlt, FaGlobe, FaArrowRight, FaClock, FaUserFriends
} from "react-icons/fa";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/db"; 

import FloatingCubes from "../components/FloatingCubes"; 

const DashboardScheduleMaker = dynamic(() => import('../components/Tools/DashboardScheduleMaker'), { ssr: false });
const GradeCalculator = dynamic(() => import('../components/Tools/GradeCalculator'));
const GWACalculator = dynamic(() => import('../components/Tools/GWACalculator'));
const FlashcardMaker = dynamic(() => import('../components/Tools/FlashcardMaker'), { ssr: false });
const GradeArchitect = dynamic(() => import('../components/Tools/GradeArchitect'), { ssr: false });
const FlashcardExchange = dynamic(() => import('../components/Community/FlashcardExchange'), { ssr: false });
const StudyLounge = dynamic(() => import('../components/Community/StudyLounge'), { ssr: false });

export default function DashboardClient() {
  const [activeView, setActiveView] = useState<'dashboard' | 'lounge' | 'tools' | 'schedule' | 'flashcards' | 'exchange'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [isQueueOpen, setIsQueueOpen] = useState(true);
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(new Date());

  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push("/Workspace");
      setAuthUser(user);
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) setUserProfile(userDoc.data());
      } catch (err) {}

      const q = query(collection(db, "tasks"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
      const unsubscribeTasks = onSnapshot(q, 
        (snapshot) => {
          setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setIsLoading(false);
        },
        () => setIsLoading(false)
      );
      return () => unsubscribeTasks();
    });
    return () => unsubscribeAuth();
  }, [router]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !authUser) return;
    try {
      await addDoc(collection(db, "tasks"), {
        userId: authUser.uid,
        title: newTaskTitle,
        subject: "General", 
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setNewTaskTitle("");
      setIsAddingTask(false);
    } catch (error) {}
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    await updateDoc(doc(db, "tasks", taskId), { status: currentStatus === "pending" ? "completed" : "pending" });
  };

  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, "tasks", taskId));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
        <span className="w-12 h-12 rounded-full border-4 border-[#06402B]/30 border-t-[#06402B] animate-spin mb-6" />
        <div className="text-zinc-400 font-mono text-sm font-bold tracking-widest uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const formattedDate = currentTime.toLocaleDateString('en-US', dateOptions);

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden relative selection:bg-[#06402B]/30">
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30 sm:opacity-60"><FloatingCubes /></div>
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-[#06402B]/10 rounded-full blur-[150px]" />
      </div>

      <aside className="w-[84px] bg-white/50 dark:bg-zinc-950/50 backdrop-blur-2xl border-r border-zinc-200 dark:border-zinc-800 shrink-0 flex flex-col items-center py-6 z-20 relative">
        <div className="relative w-12 h-12 mb-8 group cursor-pointer" onClick={() => setActiveView('dashboard')}>
          <div className="absolute inset-0 bg-[#06402B]/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative w-full h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden p-1 shadow-lg transition-transform group-active:scale-90">
            <Image src="/affiliates/dlsau.png" alt="DLSAU Logo" fill className="object-contain p-1.5" priority />
          </div>
        </div>

        <nav className="flex-1 w-full flex flex-col gap-4">
          {[
            { id: 'dashboard', icon: <FaTachometerAlt size={22} />, label: "Home" },
            { id: 'lounge', icon: <FaUserFriends size={22} />, label: "Lounge" },
            { id: 'exchange', icon: <FaGlobe size={22} />, label: "Community" },
            { id: 'tools', icon: <FaCalculator size={22} />, label: "Grades" },
            { id: 'schedule', icon: <FaCalendarAlt size={22} />, label: "Schedule" },
            { id: 'flashcards', icon: <FaLayerGroup size={22} />, label: "Flashcards" },
          ].map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex flex-col items-center gap-1.5 py-3 transition-all relative group ${isActive ? 'text-[#06402B]' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {isActive && <motion.div layoutId="navIndicator" className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#06402B] rounded-r-full shadow-[0_0_10px_rgba(6,64,43,0.8)]" />}
                <span className="relative group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="text-[9px] font-mono tracking-widest uppercase">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button onClick={() => signOut(auth)} className="w-full flex flex-col items-center gap-1.5 py-3 text-zinc-500 hover:text-red-500 transition-colors group">
          <FaSignOutAlt size={22} className="group-hover:scale-110 transition-transform" />
        </button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        
        <header className="h-20 bg-white/30 dark:bg-black/30 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <Image src="/affiliates/dlsau.png" alt="DLSAU" fill className="object-contain" />
              </div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-zinc-800 dark:text-white">
                Lasallian Hub
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#06402B]/10 border border-[#06402B]/20 rounded-full text-[10px] font-mono font-bold text-[#06402B] tracking-widest uppercase">
              Online
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setIsQueueOpen(!isQueueOpen)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isQueueOpen ? 'bg-[#06402B] text-white shadow-[0_0_15px_rgba(6,64,43,0.4)]' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700'}`}
                title="Toggle Tasks"
              >
                <FaTasks size={18} />
             </button>

             <div className="w-px h-8 bg-zinc-300 dark:bg-zinc-700 mx-2 hidden sm:block"></div>

             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-zinc-800 dark:text-white">{userProfile?.fullName || "Ice Matthew Ramirez"}</p>
               <p className="text-[10px] font-mono text-zinc-500">@{userProfile?.username}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-300 dark:border-zinc-700">
               <FaUserCircle size={24} />
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            
            {activeView === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 max-w-5xl mx-auto">
                
                <div className="p-10 rounded-[3rem] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-[#06402B]/5 blur-[100px] rounded-full pointer-events-none" />
                  
                  <div className="relative z-10 flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
                      <FaClock /> {formattedDate}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter">
                      Good afternoon, <span className="text-[#06402B]">{userProfile?.fullName?.split(' ')[0] || "Ice"}</span>.
                    </h2>
                    <p className="text-zinc-500 font-medium text-lg">
                      {pendingTasks.length > 0 
                        ? `You have ${pendingTasks.length} pending tasks to clear today.` 
                        : "Your queue is clear. Take a breather or review your notes."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <motion.button 
                    whileHover={{ y: -5 }} onClick={() => setActiveView('exchange')}
                    className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 text-left group hover:border-[#06402B]/50 transition-all shadow-lg"
                  >
                    <div className="w-14 h-14 bg-[#06402B]/10 text-[#06402B] rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                      <FaGlobe size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 group-hover:text-[#06402B] transition-colors">Peer Exchange</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Discover and sync verified reviewers from the community.</p>
                  </motion.button>

                  <motion.button 
                    whileHover={{ y: -5 }} onClick={() => setActiveView('tools')}
                    className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 text-left group hover:border-[#06402B]/50 transition-all shadow-lg"
                  >
                    <div className="w-14 h-14 bg-[#06402B]/10 text-[#06402B] rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                      <FaCalculator size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 group-hover:text-[#06402B] transition-colors">Grade Architect</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Calculate projections and find out exactly what you need on finals.</p>
                  </motion.button>

                  <motion.button 
                    whileHover={{ y: -5 }} onClick={() => setActiveView('schedule')}
                    className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 text-left group hover:border-[#06402B]/50 transition-all shadow-lg"
                  >
                    <div className="w-14 h-14 bg-[#06402B]/10 text-[#06402B] rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                      <FaCalendarAlt size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 group-hover:text-[#06402B] transition-colors">Schedule Maker</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Design, color-code, and export your aesthetic class timetable.</p>
                  </motion.button>

                  <motion.button 
                    whileHover={{ y: -5 }} onClick={() => setActiveView('flashcards')}
                    className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 text-left group hover:border-[#06402B]/50 transition-all shadow-lg"
                  >
                    <div className="w-14 h-14 bg-[#06402B]/10 text-[#06402B] rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                      <FaLayerGroup size={24} />
                    </div>
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2 group-hover:text-[#06402B] transition-colors">Active Recall Vault</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">Build custom flashcard decks and test your memory.</p>
                  </motion.button>

                </div>
              </motion.div>
            )}

            {activeView === 'lounge' && (
              <motion.div key="lounge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
                <StudyLounge />
              </motion.div>
            )}

            {activeView === 'exchange' && (
              <motion.div key="exchange" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <FlashcardExchange />
              </motion.div>
            )}

            {activeView === 'tools' && (
              <motion.div key="tools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
                <GradeArchitect />
                <div className="space-y-8">
                  <GradeCalculator />
                  <GWACalculator />
                </div>
              </motion.div>
            )}
            
            {activeView === 'schedule' && <motion.div key="sched" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl"><DashboardScheduleMaker /></motion.div>}
            {activeView === 'flashcards' && <motion.div key="cards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto"><FlashcardMaker /></motion.div>}

          </AnimatePresence>
        </div>
      </main>

      <aside className={`bg-white/50 dark:bg-zinc-950/50 backdrop-blur-2xl border-l border-zinc-200 dark:border-zinc-800 shrink-0 z-20 flex flex-col transition-all duration-500 ease-in-out ${isQueueOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
        <div className="p-6 flex-1 flex flex-col h-full min-w-[320px]">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <FaTasks className="text-[#06402B]" /> To-Do List
            </h2>
            <button onClick={() => setIsAddingTask(!isAddingTask)} className="text-zinc-400 hover:text-[#06402B] bg-zinc-200 dark:bg-zinc-800/50 p-2 rounded-lg transition-colors"><FaPlus size={12} /></button>
          </div>

          <AnimatePresence>
            {isAddingTask && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddTask} className="mb-6 overflow-hidden">
                <div className="relative group">
                  <input 
                    type="text" autoFocus
                    placeholder="Add a task..." 
                    value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full text-sm font-bold bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl p-3 outline-none focus:border-[#06402B] transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-white"
                  />
                  <button type="submit" disabled={!newTaskTitle.trim()} className="absolute right-2 top-2 bottom-2 bg-[#06402B] text-white rounded-lg px-3 text-xs font-bold disabled:opacity-50 hover:opacity-80 transition-colors">
                    Add
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {pendingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-400 dark:text-zinc-600 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <FaCheckCircle size={24} className="mb-2 opacity-50" />
                <p className="text-xs font-bold uppercase tracking-wider">All caught up!</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <div key={task.id} className="group flex items-start gap-3 p-3 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-[#06402B]/30 transition-all shadow-sm">
                  <button onClick={() => toggleTaskStatus(task.id, task.status)} className="mt-0.5 text-zinc-400 hover:text-[#06402B] transition-colors"><FaRegCircle size={16} /></button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 font-bold truncate leading-tight">{task.title}</p>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="text-zinc-300 dark:text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"><FaTrashAlt size={12} /></button>
                </div>
              ))
            )}

            {completedTasks.length > 0 && (
              <div className="pt-6">
                <h2 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3 px-1">Completed</h2>
                <div className="space-y-2">
                  {completedTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg opacity-60 hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleTaskStatus(task.id, task.status)} className="mt-0.5 text-[#06402B]"><FaCheckCircle size={16} /></button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-500 font-medium line-through truncate">{task.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}