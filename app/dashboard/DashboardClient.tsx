"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic'; 
import Image from "next/image";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCalendarAlt, FaCalculator, FaLayerGroup, FaTasks, FaSignOutAlt, FaPlus, FaCheckCircle, 
  FaTrashAlt, FaTachometerAlt, FaGlobe, FaClock, FaUserFriends, FaChevronRight, 
  FaCog, FaSun, FaMoon, FaDesktop, FaPalette, FaIdBadge, FaSave, FaCamera, 
  FaFolderOpen, FaCalendarDay, FaQuoteLeft, FaBook, FaTrash
} from "react-icons/fa";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { auth, db, storage } from "@/lib/db"; 

import FloatingCubes from "../components/FloatingCubes"; 
import CommandCenter from "../components/Layout/CommandCenter";

// --- SAFE DYNAMIC IMPORTS ---
const DashboardScheduleMaker = dynamic(() => import('../components/Tools/DashboardScheduleMaker'), { ssr: false });
const GradeCalculator = dynamic(() => import('../components/Tools/GradeCalculator'));
const GWACalculator = dynamic(() => import('../components/Tools/GWACalculator'));
const FlashcardMaker = dynamic(() => import('../components/Tools/FlashcardMaker'), { ssr: false });
const FlashcardExchange = dynamic(() => import('../components/Community/FlashcardExchange'), { ssr: false });
const StudyLounge = dynamic(() => import('../components/Community/StudyLounge'), { ssr: false });
const UniversityTracker = dynamic(() => import('../components/Tools/UniversityTracker'), { ssr: false });
const AcademicCalendar = dynamic(() => import('../components/Community/AcademicCalendar').then(mod => mod.default), { ssr: false });


const NAV_ITEMS = [
  { id: 'dashboard', icon: <FaTachometerAlt size={20} />, label: "Home" },
  { id: 'tracker', icon: <FaFolderOpen size={20} />, label: "Tracker" },
  { id: 'schedule', icon: <FaClock size={20} />, label: "Sched" },
  { id: 'calendar', icon: <FaCalendarDay size={20} />, label: "Calendar" },
  { id: 'tools', icon: <FaCalculator size={20} />, label: "Grades" },
  { id: 'flashcards', icon: <FaLayerGroup size={20} />, label: "Cards" },
  { id: 'lounge', icon: <FaUserFriends size={20} />, label: "Lounge" },
  { id: 'exchange', icon: <FaGlobe size={20} />, label: "Hub" },
  { id: 'settings', icon: <FaCog size={20} />, label: "Settings" }, 
];

export default function DashboardClient() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [generalTasks, setGeneralTasks] = useState<any[]>([]);
  const [courseTasks, setCourseTasks] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const [todaysQuote, setTodaysQuote] = useState({ q: "Loading...", a: "" });
  const [modal, setModal] = useState<any>({ isOpen: false });

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [editBio, setEditBio] = useState("");
  const [editYearLevel, setEditYearLevel] = useState("1st Year");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null); 
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const router = useRouter();

  // --- MODALS ---
  const showAlert = (title: string, message: string) => setModal({ isOpen: true, title, message, type: 'alert' });
  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Confirm", isDestructive = true) => 
    setModal({ isOpen: true, title, message, type: 'confirm', onConfirm, confirmText, isDestructive });
  const closeModal = () => setModal({ isOpen: false });
  const confirmSignOut = () => showConfirm("Log Out", "Are you sure you want to log out?", () => signOut(auth), "Log Out", false);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // --- ROCK SOLID QUOTE API (DummyJSON) ---
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch('https://dummyjson.com/quotes/random');
        const data = await res.json();
        if (data.quote) {
          setTodaysQuote({ q: data.quote, a: data.author });
        }
      } catch (e) {
        setTodaysQuote({ q: "Strive for progress, not perfection.", a: "Unknown" });
      }
    };
    fetchQuote();
  }, []);

  useEffect(() => { setMounted(true); if (window.innerWidth >= 768) setIsQueueOpen(true); }, []);

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

          if (data.friends && data.friends.length > 0) {
            const friendPromises = data.friends.slice(0, 5).map((id: string) => getDoc(doc(db, "users", id)));
            const friendSnaps = await Promise.all(friendPromises);
            setFriendsList(friendSnaps.filter(snap => snap.exists()).map(snap => ({ uid: snap.id, ...snap.data() })));
          }
        }
      } catch (err) {}

      const unsubTasks = onSnapshot(query(collection(db, "tasks"), where("userId", "==", user.uid), orderBy("createdAt", "desc")), snap => setGeneralTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCourseTasks = onSnapshot(query(collection(db, "course_tasks"), where("userId", "==", user.uid)), snap => setCourseTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCourses = onSnapshot(query(collection(db, "courses"), where("userId", "==", user.uid), orderBy("createdAt", "asc")), snap => {
        setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setIsLoading(false);
      });

      return () => { unsubTasks(); unsubCourseTasks(); unsubCourses(); };
    });
    return () => unsubscribeAuth();
  }, [router]);

  const handleAddGeneralTask = async (title: string, deadline: string) => {
    if (!authUser) return;
    await addDoc(collection(db, "tasks"), { userId: authUser.uid, title, status: "pending", deadline, createdAt: serverTimestamp() });
  };

  const toggleTaskStatus = async (task: any) => {
    if (task.isCourseTask) await updateDoc(doc(db, "course_tasks", task.id), { status: task.status === "OPEN" ? "Submitted" : "OPEN" });
    else await updateDoc(doc(db, "tasks", task.id), { status: task.status === "pending" ? "completed" : "pending" });
  };

  const deleteTask = async (task: any) => {
    if (task.isCourseTask) await deleteDoc(doc(db, "course_tasks", task.id));
    else await deleteDoc(doc(db, "tasks", task.id));
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim() || !authUser) return;
    await addDoc(collection(db, "courses"), { userId: authUser.uid, title: newCourseTitle, createdAt: serverTimestamp() });
    setNewCourseTitle(""); setIsAddingCourse(false);
  };

  const deleteCourse = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm("Delete Course", "Are you sure you want to delete this course and all its tasks?", async () => {
        if (selectedCourseId === courseId) setSelectedCourseId(null);
        await deleteDoc(doc(db, "courses", courseId));
        courseTasks.filter(t => t.courseId === courseId).forEach(t => deleteDoc(doc(db, "course_tasks", t.id)));
    });
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].size > 5 * 1024 * 1024) return showAlert("File Too Large", "Please select an image file under 5MB.");
      setAvatarFile(e.target.files[0]); setEditAvatarUrl(URL.createObjectURL(e.target.files[0])); 
    }
  };

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
      await updateDoc(doc(db, "users", authUser.uid), { bio: editBio, yearLevel: editYearLevel, avatarUrl: finalAvatarUrl });
      setUserProfile((prev: any) => ({ ...prev, avatarUrl: finalAvatarUrl }));
      setAvatarFile(null); showAlert("Profile Updated", "Your profile has been saved.");
    } catch (error) {} finally { setIsSavingProfile(false); }
  };

const mergedActiveTasks = [
    ...generalTasks.filter(t => t.status === 'pending').map(t => ({ ...t, isCourseTask: false })),
    ...courseTasks
      .filter(t => t.status === 'OPEN' || t.status === 'Submitted')
      .map(t => ({ 
        id: t.id, 
        title: t.name || 'Untitled', 
        type: t.type, 
        status: t.status, 
        deadline: t.deadline, 
        isCourseTask: true 
      }))
  ];

  const allCalendarTasks = [
    ...generalTasks.filter(t => t.deadline).map(t => ({ id: t.id, title: t.title, deadline: t.deadline })),
    ...courseTasks.filter(t => t.deadline).map(t => ({ id: t.id, title: `${t.name || 'Untitled'} (${t.type})`, deadline: t.deadline }))
  ];

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090b]"><span className="w-12 h-12 rounded-full border-4 border-[#06402B]/30 border-t-[#06402B] animate-spin" /></div>;
  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-[#09090b] font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden relative transition-colors duration-300">
      
      {/* MODAL */}
      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] p-6 md:p-8 shadow-2xl z-10 text-center flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${modal.isDestructive ? 'bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400' : 'bg-[#06402B]/10 text-[#06402B] dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                {modal.isDestructive ? <FaTrashAlt size={24} /> : modal.type === 'confirm' ? <FaSignOutAlt size={24} /> : <FaCheckCircle size={24} />}
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">{modal.title}</h3>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-8">{modal.message}</p>
              <div className="flex gap-3 w-full">
                {modal.type === 'confirm' && <button onClick={closeModal} className="flex-1 py-3.5 bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest">Cancel</button>}
                <button onClick={() => { if (modal.onConfirm) modal.onConfirm(); closeModal(); }} className={`flex-1 py-3.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md ${modal.isDestructive ? 'bg-red-600 hover:bg-red-500' : 'bg-[#06402B] hover:bg-[#042d1f] dark:bg-emerald-600 dark:hover:bg-emerald-500'}`}>{modal.confirmText || 'Okay'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30 sm:opacity-60"><FloatingCubes /></div>
        <div className="absolute top-[10%] left-[20%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#06402B]/10 dark:bg-emerald-500/5 rounded-full blur-[100px] md:blur-[150px]" />
      </div>

      <aside className="hidden md:flex w-[84px] bg-white/50 dark:bg-[#09090b]/80 backdrop-blur-2xl border-r border-zinc-200 dark:border-zinc-800/80 shrink-0 flex-col items-center py-6 z-20 relative">
        <div className="relative w-12 h-12 mb-8 cursor-pointer flex items-center justify-center" onClick={() => setActiveView('dashboard')}>
          <div className="absolute inset-0 bg-[#06402B]/20 dark:bg-emerald-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative w-full h-full bg-white dark:bg-[#121214] rounded-xl border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center p-1 shadow-lg transition-transform active:scale-90">
            <Image src="/affiliates/dlsau.png" alt="DLSAU" fill sizes="48px" className="object-contain p-1.5" priority />
          </div>
        </div>
        <nav className="flex-1 w-full flex flex-col gap-4">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setActiveView(item.id)} className={`w-full flex flex-col items-center gap-1.5 py-3 transition-all relative group ${activeView === item.id ? 'text-[#06402B] dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
              {activeView === item.id && <motion.div layoutId="navInd" className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#06402B] dark:bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(6,64,43,0.8)] dark:shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
              <span className="relative group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-[9px] font-mono tracking-widest uppercase">{item.label}</span>
            </button>
          ))}
        </nav>
        <button onClick={confirmSignOut} className="w-full flex flex-col items-center gap-1.5 py-3 text-zinc-500 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors group"><FaSignOutAlt size={22} className="group-hover:scale-110 transition-transform" /></button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10 w-full">
        <header className="h-16 md:h-20 bg-white/30 dark:bg-[#09090b]/60 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-20">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <div className="relative w-6 h-6 md:w-8 md:h-8 shrink-0 drop-shadow-sm"><Image src="/affiliates/dlsau.png" alt="DLSAU" fill sizes="32px" className="object-contain" /></div>
              <div className="relative w-6 h-6 md:w-8 md:h-8 shrink-0 drop-shadow-sm hidden sm:block"><Image src="/affiliates/icon.png" alt="JPCS" fill sizes="32px" className="object-contain" /></div>
              <div className="flex flex-col min-w-0 ml-1">
                <span className="hidden md:block text-[10px] font-mono font-bold text-[#06402B] dark:text-emerald-500 tracking-[0.3em] uppercase opacity-80 leading-none mb-1">The Academic</span>
                <h1 className="text-base md:text-2xl font-light tracking-[0.1em] text-zinc-800 dark:text-zinc-100 uppercase leading-none truncate"><span className="hidden sm:inline">Lasallian</span> <span className="font-black text-[#06402B] dark:text-emerald-400">Hub</span></h1>
              </div>
            </div>
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 hidden md:block shrink-0" />
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#06402B]/5 dark:bg-emerald-500/10 border border-[#06402B]/10 dark:border-emerald-500/20 rounded-full text-[9px] font-mono font-bold text-[#06402B] dark:text-emerald-400 tracking-widest uppercase shrink-0">System Online</div>
          </div>
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-none mb-1 truncate max-w-[150px]">{userProfile?.fullName || "Scholar"}</p>
               <p className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter">Verified Student Account</p>
             </div>
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-200 dark:bg-[#18181b] flex items-center justify-center text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 relative cursor-pointer shrink-0 overflow-hidden shadow-sm" onClick={() => setActiveView('settings')}>
               {userProfile?.avatarUrl ? <Image src={userProfile.avatarUrl} alt="Avatar" fill sizes="40px" className="object-cover" /> : <span className="font-bold text-sm">{userProfile?.fullName?.charAt(0) || "U"}</span>}
               <div className="absolute top-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#09090b] z-10" />
             </div>
             <div className="w-px h-6 md:h-8 bg-zinc-200 dark:bg-zinc-800 mx-1 md:mx-2 shrink-0" />
             <button onClick={() => setIsQueueOpen(!isQueueOpen)} className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${isQueueOpen ? 'bg-[#06402B] dark:bg-emerald-600 text-white shadow-[0_0_15px_rgba(6,64,43,0.3)]' : 'bg-zinc-100 dark:bg-[#18181b] text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400'}`}>
                {isQueueOpen ? <FaChevronRight size={12} /> : <FaTasks size={14} />}
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 md:p-8 pb-28 md:pb-8 custom-scrollbar relative z-10 w-full">
          <AnimatePresence mode="wait">
            
            {/* 1. DASHBOARD */}
            {activeView === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 md:space-y-8 max-w-5xl mx-auto w-full">
                <div className="p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/40 dark:bg-[#121214]/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/80 relative overflow-hidden shadow-xl md:text-left flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-[#06402B]/5 dark:bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                  <div className="relative z-10 w-full flex flex-col gap-2">
                    <div className="inline-flex self-center md:self-start items-center gap-2 px-3 py-1 mb-2 rounded-full bg-zinc-200/50 dark:bg-[#18181b]/80 text-[9px] md:text-[10px] font-mono font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase">
                      <FaClock /> {formattedDate}
                    </div>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-center md:text-left text-zinc-900 dark:text-zinc-100 mb-2 tracking-tighter">
                      {getGreeting()}, <span className="text-[#06402B] dark:text-emerald-400 font-light italic">{userProfile?.fullName?.split(' ')[0] || "Scholar"}</span>.
                    </h2>
                    <div className="flex items-start gap-3 mt-6 justify-center md:justify-start">
                      <FaQuoteLeft className="text-[#06402B]/20 dark:text-emerald-400/20 mt-1 shrink-0" size={18} />
                      <div className="space-y-1">
                        <p className="font-light italic text-base md:text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed text-center md:text-left">{todaysQuote.q}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#06402B] dark:text-emerald-500 text-center md:text-left">— {todaysQuote.a}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isAddingCourse && (
                    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddCourse} className="overflow-hidden">
                      <div className="flex gap-2 bg-white dark:bg-[#121214] p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm mb-4">
                        <input autoFocus type="text" placeholder="e.g., Computer Science 101" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} className="flex-1 bg-transparent px-4 py-2 outline-none font-bold text-sm text-zinc-900 dark:text-zinc-100" />
                        <button type="submit" disabled={!newCourseTitle.trim()} className="px-6 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50">Create</button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {courses.map(course => {
                    const cTasks = courseTasks.filter(t => t.courseId === course.id);
                    const completedTasks = cTasks.filter(t => t.status === "Submitted" || t.status === "Graded");
                    const progress = cTasks.length > 0 ? (completedTasks.length / cTasks.length) * 100 : 0;
                    return (
                      <motion.div key={course.id} whileHover={{ y: -4 }} onClick={() => { setSelectedCourseId(course.id); setActiveView('tracker'); }} className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] p-6 cursor-pointer shadow-sm hover:shadow-md group transition-all relative">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><FaBook size={18} /></div>
                          <button onClick={(e) => deleteCourse(course.id, e)} className="p-2 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-20"><FaTrash size={14} /></button>
                        </div>
                        <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 leading-tight mb-1 truncate">{course.title}</h3>
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-6">{cTasks.length} Deliverables</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest"><span>Progress</span><span className="text-[#06402B] dark:text-emerald-400">{Math.round(progress)}%</span></div>
                          <div className="h-2 w-full bg-zinc-200 dark:bg-[#18181b] rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-[#06402B] dark:bg-emerald-500 rounded-full transition-all duration-500" /></div>
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  <motion.div whileHover={{ y: -4, scale: 1.01 }} onClick={() => setIsAddingCourse(!isAddingCourse)} className="group border-4 border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] p-6 cursor-pointer transition-all flex flex-col items-center justify-center gap-4 py-12 md:py-16 text-center hover:shadow-md">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-[#18181b] rounded-full flex items-center justify-center border-2 border-zinc-200 dark:border-zinc-800 group-hover:scale-110 transition-transform shadow-inner group-hover:bg-[#06402B]/10 dark:group-hover:bg-emerald-500/10">
                      <FaPlus className="text-zinc-400 dark:text-zinc-600 group-hover:text-[#06402B] dark:group-hover:text-emerald-400" size={24} />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest group-hover:text-zinc-900 dark:group-hover:text-zinc-100">Add New Course</h3>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* 2. TRACKER TABLE */}
{activeView === 'tracker' && (
  <motion.div key="tracker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-7xl mx-auto">
    <UniversityTracker />
  </motion.div>
)}

            {/* OTHER VIEWS */}
            {activeView === 'calendar' && <motion.div key="cal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-7xl mx-auto"><AcademicCalendar userTasks={allCalendarTasks} /></motion.div>}
            {activeView === 'lounge' && <motion.div key="lounge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto w-full"><StudyLounge /></motion.div>}
            {activeView === 'exchange' && <motion.div key="exch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full"><FlashcardExchange /></motion.div>}
            {activeView === 'tools' && <motion.div key="tools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto w-full"><GradeCalculator /><GWACalculator /></motion.div>}
            {activeView === 'schedule' && <motion.div key="sched" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl w-full"><DashboardScheduleMaker /></motion.div>}
            {activeView === 'flashcards' && <motion.div key="cards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto w-full"><FlashcardMaker /></motion.div>}
            
            {/* SETTINGS */}
            {activeView === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto space-y-6 md:space-y-8 w-full">
                <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-end mb-2">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight uppercase text-zinc-900 dark:text-zinc-100">Settings</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Manage your profile and workspace preferences.</p>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 p-6 md:p-8 shadow-xl transition-colors duration-300 w-full">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2"><FaIdBadge className="text-[#06402B] dark:text-emerald-400" /> Public Profile</h3>
                  <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="flex flex-col items-center gap-4 shrink-0 w-full md:w-auto">
                      <div className="relative w-32 h-32 rounded-full bg-zinc-200 dark:bg-[#18181b] flex items-center justify-center text-4xl font-bold text-zinc-500 border-4 border-white dark:border-zinc-950 shadow-lg overflow-hidden group">
                        {editAvatarUrl ? <Image src={editAvatarUrl} alt="Avatar" fill sizes="128px" className="object-cover" /> : <span>{userProfile?.fullName?.charAt(0) || "U"}</span>}
                        <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 backdrop-blur-sm">
                          <FaCamera size={24} /><span className="text-[10px] font-bold uppercase tracking-widest mt-2">Change</span>
                        </label>
                        <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
                      </div>
                      <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Tap to Upload</p>
                    </div>

                    <div className="flex-1 space-y-5 w-full">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Full Name</label>
                          <input type="text" value={userProfile?.fullName || ""} disabled className="w-full bg-zinc-100 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-3 text-sm font-bold text-zinc-500 dark:text-zinc-400 cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Year Level</label>
                          <select value={editYearLevel} onChange={e => setEditYearLevel(e.target.value)} className="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 shadow-sm">
                            <option value="1st Year">1st Year</option><option value="2nd Year">2nd Year</option><option value="3rd Year">3rd Year</option><option value="4th Year">4th Year</option><option value="Irregular">Irregular</option><option value="Alumni">Alumni</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Short Bio</label>
                        <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell your classmates about yourself..." maxLength={150} className="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 shadow-sm resize-none h-24" />
                        <div className="text-right text-[10px] text-zinc-400 mt-1">{editBio.length}/150</div>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full md:w-auto px-8 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md">
                          {isSavingProfile ? "Uploading..." : <><FaSave /> Save Profile</>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 p-6 md:p-8 shadow-xl transition-colors duration-300 w-full">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2"><FaPalette className="text-[#06402B] dark:text-emerald-400" /> Appearance</h3>
                  <div className="flex flex-col gap-4 sm:grid sm:grid-cols-3">
                    {mounted && ['light', 'dark', 'system'].map((t) => {
                      const isSelected = theme === t;
                      return (
                        <button key={t} onClick={() => setTheme(t)} className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 w-full ${isSelected ? 'border-[#06402B] dark:border-emerald-500 bg-[#06402B]/5 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 shadow-md' : 'border-zinc-200 dark:border-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:border-[#06402B]/50 dark:hover:border-emerald-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'}`}>
                          {t === 'light' && <FaSun size={28} className={isSelected ? "text-orange-500" : ""} />}
                          {t === 'dark' && <FaMoon size={28} className={isSelected ? "text-indigo-400" : ""} />}
                          {t === 'system' && <FaDesktop size={28} className={isSelected ? "text-zinc-800 dark:text-zinc-200" : ""} />}
                          <span className="font-bold uppercase tracking-widest text-[10px]">{t} Theme</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 pb-safe">
        <div className="bg-white/90 dark:bg-[#121214]/90 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] shadow-2xl p-2 flex items-center gap-2 overflow-x-auto snap-x snap-mandatory transition-colors duration-300" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button key={item.id} onClick={() => { setActiveView(item.id as any); document.getElementById(`nav-item-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }} id={`nav-item-${item.id}`} className={`snap-center shrink-0 flex items-center justify-center h-14 transition-all duration-300 ease-out rounded-2xl ${isActive ? 'bg-[#06402B] dark:bg-emerald-600 text-white px-6 shadow-md w-auto' : 'bg-zinc-100 dark:bg-[#18181b] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 w-14'}`}>
                <span className={`transition-transform duration-300 ${isActive ? 'scale-100' : 'scale-110'}`}>{item.icon}</span>
                <AnimatePresence>
                  {isActive && <motion.span initial={{ opacity: 0, width: 0, scale: 0.8 }} animate={{ opacity: 1, width: 'auto', scale: 1 }} exit={{ opacity: 0, width: 0, scale: 0.8 }} className="text-[11px] font-black uppercase tracking-widest ml-3 whitespace-nowrap overflow-hidden">{item.label}</motion.span>}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </nav>

      {/* NEW SEPARATED COMMAND CENTER */}
<CommandCenter 
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        activeTasks={mergedActiveTasks} // <-- Pass the new array here
        friends={friendsList}
        onAddTask={handleAddGeneralTask}
        onToggleTask={toggleTaskStatus}
        onDeleteTask={deleteTask}
        onNavigate={(view) => setActiveView(view)}
      />

    </div>
  );
}