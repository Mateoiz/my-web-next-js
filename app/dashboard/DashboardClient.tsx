"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic'; 
import Image from "next/image";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCalendarAlt, FaCalculator, FaLayerGroup, 
  FaTasks, FaUserCircle, FaSignOutAlt,
  FaPlus, FaCheckCircle, FaRegCircle, FaTrashAlt, 
  FaTachometerAlt, FaGlobe, FaClock, FaUserFriends, 
  FaChevronRight, FaTimes, FaCog, FaSun, FaMoon, FaDesktop, FaPalette, FaIdBadge, FaSave, FaCamera
} from "react-icons/fa";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { auth, db, storage } from "@/lib/db"; 

import FloatingCubes from "../components/FloatingCubes"; 

const DashboardScheduleMaker = dynamic(() => import('../components/Tools/DashboardScheduleMaker'), { ssr: false });
const GradeCalculator = dynamic(() => import('../components/Tools/GradeCalculator'));
const GWACalculator = dynamic(() => import('../components/Tools/GWACalculator'));
const FlashcardMaker = dynamic(() => import('../components/Tools/FlashcardMaker'), { ssr: false });
const FlashcardExchange = dynamic(() => import('../components/Community/FlashcardExchange'), { ssr: false });
const StudyLounge = dynamic(() => import('../components/Community/StudyLounge'), { ssr: false });

const NAV_ITEMS = [
  { id: 'dashboard', icon: <FaTachometerAlt size={20} />, label: "Home" },
  { id: 'lounge', icon: <FaUserFriends size={20} />, label: "Lounge" },
  { id: 'exchange', icon: <FaGlobe size={20} />, label: "Hub" },
  { id: 'tools', icon: <FaCalculator size={20} />, label: "Grades" },
  { id: 'schedule', icon: <FaCalendarAlt size={20} />, label: "Sched" },
  { id: 'flashcards', icon: <FaLayerGroup size={20} />, label: "Cards" },
  { id: 'settings', icon: <FaCog size={20} />, label: "Settings" }, 
];

type ThemeMode = 'light' | 'dark' | 'system';

export default function DashboardClient() {
  const [activeView, setActiveView] = useState<'dashboard' | 'lounge' | 'tools' | 'schedule' | 'flashcards' | 'exchange' | 'settings'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- THEME STATE (from next-themes) ---
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // --- PROFILE EDIT STATE ---
  const [editBio, setEditBio] = useState("");
  const [editYearLevel, setEditYearLevel] = useState("1st Year");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null); 
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const router = useRouter();

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (window.innerWidth >= 768) setIsQueueOpen(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push("/Workspace");
      setAuthUser(user);
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile(data);
          setEditBio(data.bio || "");
          setEditYearLevel(data.yearLevel || "1st Year");
          setEditAvatarUrl(data.avatarUrl || "");
        }
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

  // --- HANDLE IMAGE SELECTION ---
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("Image is too large. Please select a file under 5MB.");
        return;
      }
      setAvatarFile(file);
      setEditAvatarUrl(URL.createObjectURL(file)); 
    }
  };

  // --- SAVE PROFILE FUNCTION WITH UPLOAD LOGIC ---
  const handleSaveProfile = async () => {
    if (!authUser) return;
    setIsSavingProfile(true);
    try {
      let finalAvatarUrl = editAvatarUrl;

      if (avatarFile) {
        const fileRef = ref(storage, `avatars/${authUser.uid}`);
        await uploadBytes(fileRef, avatarFile);
        finalAvatarUrl = await getDownloadURL(fileRef); 
      }

      await updateDoc(doc(db, "users", authUser.uid), {
        bio: editBio,
        yearLevel: editYearLevel,
        avatarUrl: finalAvatarUrl
      });
      
      setUserProfile((prev: any) => ({
        ...prev,
        bio: editBio,
        yearLevel: editYearLevel,
        avatarUrl: finalAvatarUrl
      }));
      setAvatarFile(null); 
      alert("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to update profile. Make sure Firebase Storage is initialized.");
    } finally {
      setIsSavingProfile(false);
    }
  };

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
    <div className="flex h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden relative selection:bg-[#06402B]/30 transition-colors duration-300">
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30 sm:opacity-60"><FloatingCubes /></div>
        <div className="absolute top-[10%] left-[20%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#06402B]/10 rounded-full blur-[100px] md:blur-[150px]" />
      </div>

      <aside className="hidden md:flex w-[84px] bg-white/50 dark:bg-zinc-950/50 backdrop-blur-2xl border-r border-zinc-200 dark:border-zinc-800 shrink-0 flex-col items-center py-6 z-20 relative transition-colors duration-300">
        <div className="relative w-12 h-12 mb-8 group cursor-pointer" onClick={() => setActiveView('dashboard')}>
          <div className="absolute inset-0 bg-[#06402B]/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative w-full h-full bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden p-1 shadow-lg transition-transform group-active:scale-90">
            <Image src="/affiliates/dlsau.png" alt="DLSAU Logo" fill className="object-contain p-1.5" priority />
          </div>
        </div>

        <nav className="flex-1 w-full flex flex-col gap-4">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex flex-col items-center gap-1.5 py-3 transition-all relative group ${isActive ? 'text-[#06402B]' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {isActive && <motion.div layoutId="navIndicatorDesktop" className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#06402B] rounded-r-full shadow-[0_0_10px_rgba(6,64,43,0.8)]" />}
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

      <main className="flex-1 flex flex-col overflow-hidden relative z-10 w-full">
        
        <header className="h-16 md:h-20 bg-white/30 dark:bg-black/30 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-20 transition-colors duration-300 w-full">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <div className="flex items-center gap-3 min-w-0 shrink-0">
              <div className="relative w-6 h-6 md:w-8 md:h-8 shrink-0">
                <Image src="/affiliates/dlsau.png" alt="DLSAU" fill className="object-contain" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="hidden md:block text-[10px] font-mono font-bold text-[#06402B] tracking-[0.3em] uppercase opacity-70 leading-none mb-1">The Academic</span>
                <h1 className="text-base md:text-2xl font-light tracking-[0.1em] text-zinc-800 dark:text-zinc-100 uppercase leading-none truncate">
                  <span className="hidden sm:inline">Lasallian</span> <span className="font-black text-[#06402B]">Hub</span>
                </h1>
              </div>
            </div>
            
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 hidden md:block shrink-0" />
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#06402B]/5 border border-[#06402B]/10 rounded-full text-[9px] font-mono font-bold text-[#06402B] tracking-widest uppercase shrink-0">
              System Online
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-zinc-800 dark:text-white leading-none mb-1 truncate max-w-[150px]">{userProfile?.fullName || "Scholar"}</p>
               <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-tighter">Verified Student Account</p>
             </div>
             
             <div 
               className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 border border-zinc-300 dark:border-zinc-700 relative cursor-pointer shrink-0 overflow-hidden shadow-sm" 
               onClick={() => setActiveView('settings')}
               title="Open Profile Settings"
             >
               {userProfile?.avatarUrl ? (
                 <Image src={userProfile.avatarUrl} alt="Avatar" fill className="object-cover" />
               ) : (
                 <span className="font-bold text-sm">{userProfile?.fullName?.charAt(0) || "U"}</span>
               )}
               <div className="absolute top-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-950 z-10" />
             </div>

             <div className="w-px h-6 md:h-8 bg-zinc-200 dark:bg-zinc-800 mx-1 md:mx-2 shrink-0" />
             
             <button 
                onClick={() => setIsQueueOpen(!isQueueOpen)}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${isQueueOpen ? 'bg-[#06402B] text-white shadow-[0_0_15px_rgba(6,64,43,0.3)] hover:scale-105' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-[#06402B] hover:bg-[#06402B]/5'}`}
              >
                {isQueueOpen ? <FaChevronRight size={12} className="md:w-3.5 md:h-3.5" /> : <FaTasks size={14} className="md:w-4 md:h-4" />}
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 md:p-8 pb-28 md:pb-8 custom-scrollbar relative z-10 w-full">
          <AnimatePresence mode="wait">
            
            {activeView === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 md:space-y-8 max-w-5xl mx-auto w-full">
                <div className="p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl text-center md:text-left transition-colors duration-300">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-[#06402B]/5 blur-[100px] rounded-full pointer-events-none" />
                  <div className="relative z-10 flex-1 w-full">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 md:mb-4 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 text-[9px] md:text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
                      <FaClock /> {formattedDate}
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-900 dark:text-white mb-2 tracking-tighter transition-colors">
                      {getGreeting()}, <span className="text-[#06402B] font-light italic">{userProfile?.fullName?.split(' ')[0] || "Scholar"}</span>.
                    </h2>
                    <p className="text-zinc-500 font-medium text-sm md:text-lg">
                      {pendingTasks.length > 0 
                        ? `You have ${pendingTasks.length} pending tasks to clear today.` 
                        : "Your queue is clear. Take a breather or review your notes."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full">
                   <motion.button whileHover={{ y: -5 }} onClick={() => setActiveView('exchange')} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 text-left group hover:border-[#06402B]/50 transition-all shadow-md"><div className="w-12 h-12 bg-[#06402B]/10 text-[#06402B] rounded-xl flex items-center justify-center mb-4 shadow-inner"><FaGlobe size={20} /></div><h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white mb-1 group-hover:text-[#06402B] transition-colors uppercase tracking-tight">Community</h3><p className="text-zinc-500 dark:text-zinc-400 font-medium text-xs md:text-sm">Discover and sync verified reviewers from the community.</p></motion.button>
                   <motion.button whileHover={{ y: -5 }} onClick={() => setActiveView('tools')} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 text-left group hover:border-[#06402B]/50 transition-all shadow-md"><div className="w-12 h-12 bg-[#06402B]/10 text-[#06402B] rounded-xl flex items-center justify-center mb-4 shadow-inner"><FaCalculator size={20} /></div><h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white mb-1 group-hover:text-[#06402B] transition-colors uppercase tracking-tight">Grades</h3><p className="text-zinc-500 dark:text-zinc-400 font-medium text-xs md:text-sm">Calculate projections and find out exactly what you need on finals.</p></motion.button>
                   <motion.button whileHover={{ y: -5 }} onClick={() => setActiveView('schedule')} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 text-left group hover:border-[#06402B]/50 transition-all shadow-md"><div className="w-12 h-12 bg-[#06402B]/10 text-[#06402B] rounded-xl flex items-center justify-center mb-4 shadow-inner"><FaCalendarAlt size={20} /></div><h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white mb-1 group-hover:text-[#06402B] transition-colors uppercase tracking-tight">Schedule</h3><p className="text-zinc-500 dark:text-zinc-400 font-medium text-xs md:text-sm">Design, color-code, and export your aesthetic class timetable.</p></motion.button>
                   <motion.button whileHover={{ y: -5 }} onClick={() => setActiveView('flashcards')} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 text-left group hover:border-[#06402B]/50 transition-all shadow-md"><div className="w-12 h-12 bg-[#06402B]/10 text-[#06402B] rounded-xl flex items-center justify-center mb-4 shadow-inner"><FaLayerGroup size={20} /></div><h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white mb-1 group-hover:text-[#06402B] transition-colors uppercase tracking-tight">Flashcards</h3><p className="text-zinc-500 dark:text-zinc-400 font-medium text-xs md:text-sm">Build custom flashcard decks and test your memory.</p></motion.button>
                </div>
              </motion.div>
            )}

            {/* --- SETTINGS & PROFILE VIEW --- */}
            {activeView === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto space-y-6 md:space-y-8 w-full">
                <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-end mb-2">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight uppercase text-zinc-900 dark:text-white">Settings</h2>
                    <p className="text-zinc-500 text-sm font-medium">Manage your profile and workspace preferences.</p>
                  </div>
                </div>

                {/* --- PUBLIC PROFILE CARD --- */}
                <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-xl transition-colors duration-300 w-full">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                    <FaIdBadge className="text-[#06402B]" /> Public Profile
                  </h3>

                  <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    
                    {/* Native File Upload Avatar */}
                    <div className="flex flex-col items-center gap-4 shrink-0 w-full md:w-auto">
                      <div className="relative w-32 h-32 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-4xl font-bold text-zinc-500 border-4 border-white dark:border-zinc-950 shadow-lg overflow-hidden group">
                        {editAvatarUrl ? (
                          <Image src={editAvatarUrl} alt="Avatar Preview" fill className="object-cover" />
                        ) : (
                          <span>{userProfile?.fullName?.charAt(0) || "U"}</span>
                        )}
                        
                        <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 backdrop-blur-sm">
                          <FaCamera size={24} />
                          <span className="text-[10px] font-bold uppercase tracking-widest mt-2">Change</span>
                        </label>
                        <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                      </div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tap to Upload</p>
                    </div>

                    {/* Profile Form */}
                    <div className="flex-1 space-y-5 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Full Name</label>
                          <input type="text" value={userProfile?.fullName || ""} disabled className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-bold text-zinc-500 cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Year Level</label>
                          <select 
                            value={editYearLevel} onChange={e => setEditYearLevel(e.target.value)} 
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] shadow-sm"
                          >
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="Irregular">Irregular</option>
                            <option value="Alumni">Alumni</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Short Bio</label>
                        <textarea 
                          value={editBio} onChange={(e) => setEditBio(e.target.value)}
                          placeholder="Tell your classmates about yourself..."
                          maxLength={150}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] shadow-sm resize-none h-24"
                        />
                        <div className="text-right text-[10px] text-zinc-400 mt-1">{editBio.length}/150</div>
                      </div>

                      <div className="flex justify-end">
                        <button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full md:w-auto px-8 py-3 bg-[#06402B] text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md">
                          {isSavingProfile ? "Uploading..." : <><FaSave /> Save Profile</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- APPEARANCE CARD --- */}
                <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-xl transition-colors duration-300 w-full">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                    <FaPalette className="text-[#06402B]" /> Appearance
                  </h3>

                  <div className="flex flex-col gap-4 sm:grid sm:grid-cols-3">
                    {mounted && ['light', 'dark', 'system'].map((t) => {
                      const isSelected = theme === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 w-full ${
                            isSelected 
                              ? 'border-[#06402B] bg-[#06402B]/5 text-[#06402B] shadow-md dark:text-white' 
                              : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-[#06402B]/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                          }`}
                        >
                          {t === 'light' && <FaSun size={28} className={isSelected ? "text-orange-500" : ""} />}
                          {t === 'dark' && <FaMoon size={28} className={isSelected ? "text-indigo-400" : ""} />}
                          {t === 'system' && <FaDesktop size={28} className={isSelected ? "text-zinc-800 dark:text-zinc-200" : ""} />}
                          <span className="font-bold uppercase tracking-widest text-[10px]">{t} Theme</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs font-medium mt-6 text-center sm:text-left">
                    This setting controls the color scheme of your dashboard. "System" will automatically match your device's preference.
                  </p>
                </div>
                
                <div className="md:hidden mt-8">
                   <button onClick={() => signOut(auth)} className="w-full py-4 border-2 border-red-500/20 text-red-500 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors">
                     <FaSignOutAlt /> Log Out
                   </button>
                </div>
              </motion.div>
            )}

            {/* Other Views Wrappers */}
            {activeView === 'lounge' && <motion.div key="lounge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto w-full"><StudyLounge /></motion.div>}
            {activeView === 'exchange' && <motion.div key="exchange" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full"><FlashcardExchange /></motion.div>}
            
            {activeView === 'tools' && (
              <motion.div key="tools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto w-full">
                <GradeCalculator />
                <GWACalculator />
              </motion.div>
            )}
            
            {activeView === 'schedule' && <motion.div key="sched" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl w-full"><DashboardScheduleMaker /></motion.div>}
            {activeView === 'flashcards' && <motion.div key="cards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto w-full"><FlashcardMaker /></motion.div>}

          </AnimatePresence>
        </div>
      </main>

      {/* --- MOBILE FLOATING ACTION DOCK --- */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 pb-safe">
        <div 
          className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl p-2 flex items-center gap-2 overflow-x-auto snap-x snap-mandatory transition-colors duration-300"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} 
        >
          <style dangerouslySetInnerHTML={{ __html: `nav div::-webkit-scrollbar { display: none; }` }} />

          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as any);
                  const element = document.getElementById(`nav-item-${item.id}`);
                  if (element) element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }}
                id={`nav-item-${item.id}`}
                className={`snap-center shrink-0 flex items-center justify-center h-14 transition-all duration-300 ease-out rounded-2xl ${
                  isActive 
                    ? 'bg-[#06402B] text-white px-6 shadow-md w-auto' 
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 w-14'
                }`}
              >
                <span className={`transition-transform duration-300 ${isActive ? 'scale-100' : 'scale-110'}`}>
                  {item.icon}
                </span>
                
                <AnimatePresence>
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0, width: 0, scale: 0.8 }} 
                      animate={{ opacity: 1, width: 'auto', scale: 1 }} 
                      exit={{ opacity: 0, width: 0, scale: 0.8 }}
                      className="text-[11px] font-black uppercase tracking-widest ml-3 whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </nav>

      {/* --- MOBILE OVERLAY FOR TASK QUEUE --- */}
      <AnimatePresence>
        {isQueueOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsQueueOpen(false)}
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* --- RESPONSIVE SLIDE-OVER RIGHT SIDEBAR (TASKS) --- */}
      <aside className={`fixed md:relative top-0 right-0 h-full z-50 md:z-20 bg-white/95 dark:bg-zinc-950/95 md:bg-white/50 md:dark:bg-zinc-950/50 backdrop-blur-2xl border-l border-zinc-200 dark:border-zinc-800 shrink-0 flex flex-col transition-all duration-300 ease-in-out ${isQueueOpen ? 'translate-x-0 w-[85%] sm:w-80 shadow-2xl md:shadow-none' : 'translate-x-full md:translate-x-0 md:w-0 opacity-0 overflow-hidden border-none'}`}>
        <div className="p-5 md:p-6 flex-1 flex flex-col h-full min-w-[300px]">
          
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <FaTasks className="text-[#06402B]" /> Triage Queue
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsAddingTask(!isAddingTask)} className="text-zinc-400 hover:text-[#06402B] bg-zinc-200 dark:bg-zinc-800/50 p-2 rounded-lg transition-colors"><FaPlus size={12} /></button>
              <button onClick={() => setIsQueueOpen(false)} className="md:hidden text-zinc-400 hover:text-red-500 bg-zinc-200 dark:bg-zinc-800/50 p-2 rounded-lg transition-colors"><FaTimes size={12} /></button>
            </div>
          </div>

          <AnimatePresence>
            {isAddingTask && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddTask} className="mb-6 overflow-hidden w-full">
                <div className="relative group w-full">
                  <input type="text" autoFocus placeholder="Add a task..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full text-sm font-bold bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-xl p-3 outline-none focus:border-[#06402B] transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-white pr-16" />
                  <button type="submit" disabled={!newTaskTitle.trim()} className="absolute right-2 top-2 bottom-2 bg-[#06402B] text-white rounded-lg px-3 text-xs font-bold disabled:opacity-50 hover:opacity-80 transition-colors">Add</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {pendingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-zinc-400 dark:text-zinc-600 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl w-full">
                <FaCheckCircle size={24} className="mb-2 opacity-50" />
                <p className="text-xs font-bold uppercase tracking-wider">All caught up!</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <div key={task.id} className="group flex items-start gap-3 p-3 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-[#06402B]/30 transition-all shadow-sm w-full">
                  <button onClick={() => toggleTaskStatus(task.id, task.status)} className="mt-0.5 text-zinc-400 hover:text-[#06402B] transition-colors shrink-0"><FaRegCircle size={16} /></button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 font-bold truncate leading-tight">{task.title}</p>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="text-zinc-300 dark:text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90 shrink-0"><FaTrashAlt size={12} /></button>
                </div>
              ))
            )}

            {completedTasks.length > 0 && (
              <div className="pt-6 w-full">
                <h2 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-3 px-1">Completed</h2>
                <div className="space-y-2 w-full">
                  {completedTasks.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg opacity-60 hover:opacity-100 transition-opacity w-full">
                      <button onClick={() => toggleTaskStatus(task.id, task.status)} className="mt-0.5 text-[#06402B] shrink-0"><FaCheckCircle size={16} /></button>
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