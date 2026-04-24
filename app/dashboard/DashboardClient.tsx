"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic'; 
import Image from "next/image";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCalendarAlt, FaCalculator, FaLayerGroup, 
  FaTasks, FaSignOutAlt,
  FaPlus, FaCheckCircle, FaRegCircle, FaTrashAlt, 
  FaTachometerAlt, FaGlobe, FaClock, FaUserFriends, 
  FaChevronRight, FaTimes, FaCog, FaSun, FaMoon, FaDesktop, FaPalette, FaIdBadge, FaSave, FaCamera,
  FaBolt, FaFolderOpen, FaBook, FaExpandArrowsAlt, FaChevronDown, FaCalendarDay, FaExclamationCircle, FaTrash
} from "react-icons/fa";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { auth, db, storage } from "@/lib/db"; 

import FloatingCubes from "../components/FloatingCubes"; 

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
  { id: 'tools', icon: <FaCalculator size={20} />, label: "Grades" },
  { id: 'flashcards', icon: <FaLayerGroup size={20} />, label: "Cards" },
  { id: 'lounge', icon: <FaUserFriends size={20} />, label: "Lounge" },
  { id: 'exchange', icon: <FaGlobe size={20} />, label: "Hub" },
  { id: 'calendar', icon: <FaCalendarAlt size={20} />, label: "Calendar" },
  { id: 'settings', icon: <FaCog size={20} />, label: "Settings" }, 
];

export default function DashboardClient() {
  const [activeView, setActiveView] = useState<'dashboard' | 'tracker' | 'calendar' | 'lounge' | 'tools' | 'schedule' | 'flashcards' | 'exchange' | 'settings'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [generalTasks, setGeneralTasks] = useState<any[]>([]);
  const [courseTasks, setCourseTasks] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // --- CUSTOM MODAL STATE ---
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
    confirmText?: string;
    isDestructive?: boolean;
  }>({ isOpen: false, title: "", message: "", type: 'alert' });

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [editBio, setEditBio] = useState("");
  const [editYearLevel, setEditYearLevel] = useState("1st Year");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null); 
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const router = useRouter();

  const showAlert = (title: string, message: string) => setModal({ isOpen: true, title, message, type: 'alert' });
  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Confirm", isDestructive = true) => 
    setModal({ isOpen: true, title, message, type: 'confirm', onConfirm, confirmText, isDestructive });
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const confirmSignOut = () => {
    showConfirm("Log Out", "Are you sure you want to log out of your session?", () => signOut(auth), "Log Out", false);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => { setMounted(true); }, []);

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

  useEffect(() => {
    if (activeView === 'tracker' && !selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [activeView, courses, selectedCourseId]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].size > 5 * 1024 * 1024) {
        return showAlert("File Too Large", "Please select an image file under 5MB.");
      }
      setAvatarFile(e.target.files[0]);
      setEditAvatarUrl(URL.createObjectURL(e.target.files[0])); 
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
      setAvatarFile(null); 
      showAlert("Profile Updated", "Your profile changes have been saved successfully.");
    } catch (error) {
      showAlert("Update Failed", "Failed to update profile. Ensure Firebase Storage is initialized.");
    } finally { 
      setIsSavingProfile(false); 
    }
  };

  const handleAddGeneralTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !authUser) return;
    await addDoc(collection(db, "tasks"), { 
      userId: authUser.uid, 
      title: newTaskTitle, 
      status: "pending", 
      deadline: newTaskDeadline,
      createdAt: serverTimestamp() 
    });
    setNewTaskTitle(""); 
    setNewTaskDeadline("");
    setIsAddingTask(false);
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim() || !authUser) return;
    await addDoc(collection(db, "courses"), { userId: authUser.uid, title: newCourseTitle, createdAt: serverTimestamp() });
    setNewCourseTitle(""); setIsAddingCourse(false);
  };

  const deleteCourse = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm(
      "Delete Course", 
      "Are you sure you want to delete this course and all its tasks? This action cannot be undone.", 
      async () => {
        if (selectedCourseId === courseId) { setSelectedCourseId(null); setActiveView('dashboard'); }
        await deleteDoc(doc(db, "courses", courseId));
        courseTasks.filter(t => t.courseId === courseId).forEach(t => deleteDoc(doc(db, "course_tasks", t.id)));
      },
      "Delete Course",
      true
    );
  };

  const toggleTaskStatus = async (task: any) => {
    if (task.isCourseTask) await updateDoc(doc(db, "course_tasks", task.id), { status: task.status === "OPEN" ? "Submitted" : "OPEN" });
    else await updateDoc(doc(db, "tasks", task.id), { status: task.status === "pending" ? "completed" : "pending" });
  };

  const deleteTask = async (task: any) => {
    if (task.isCourseTask) await deleteDoc(doc(db, "course_tasks", task.id));
    else await deleteDoc(doc(db, "tasks", task.id));
  };

  const openCourseTracker = (courseId: string) => {
    setSelectedCourseId(courseId);
    setActiveView('tracker');
  };

  const mergedPendingTasks = [
    ...generalTasks.filter(t => t.status === 'pending').map(t => ({ ...t, isCourseTask: false })),
    ...courseTasks.filter(t => t.status === 'OPEN').map(t => ({ id: t.id, title: `${t.name || 'Untitled'} (${t.type})`, status: t.status, deadline: t.deadline, isCourseTask: true }))
  ];

  const allCalendarTasks = [
    ...generalTasks.filter(t => t.deadline).map(t => ({ id: t.id, title: t.title, deadline: t.deadline })),
    ...courseTasks.filter(t => t.deadline).map(t => ({ id: t.id, title: `${t.name || 'Untitled'} (${t.type})`, deadline: t.deadline }))
  ];

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090b]"><span className="w-12 h-12 rounded-full border-4 border-[#06402B]/30 border-t-[#06402B] animate-spin" /></div>;

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const formattedDate = currentTime.toLocaleDateString('en-US', dateOptions);

  const renderMiniCalendar = () => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-6 h-6" />);

    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = i === today.getDate();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hasTask = mergedPendingTasks.some(t => t.deadline === dateStr);

      days.push(
        <div key={i} className="relative w-6 h-6 flex items-center justify-center">
          <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold rounded-full ${isToday ? 'bg-[#06402B] text-white shadow-md' : 'text-zinc-600 dark:text-zinc-300'}`}>
            {i}
          </div>
          {hasTask && <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-orange-500 border border-white dark:border-[#121214] rounded-full shadow-sm" />}
        </div>
      );
    }
    return (
      <div onClick={() => setActiveView('calendar')} className="bg-white/50 dark:bg-[#121214]/80 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm cursor-pointer hover:border-[#06402B]/50 transition-colors group">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 group-hover:text-[#06402B] dark:group-hover:text-emerald-400 transition-colors">
            {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <FaExpandArrowsAlt className="text-zinc-400 dark:text-zinc-500 text-[10px] group-hover:text-[#06402B] dark:group-hover:text-emerald-400 transition-colors" />
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 justify-items-center">
          {days}
        </div>
      </div>
    );
  };

  return (
    // --- UPDATED BASE BACKGROUND: Softer dark mode background ---
    <div className="flex h-screen bg-zinc-50 dark:bg-[#09090b] font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden relative selection:bg-[#06402B]/30 transition-colors duration-300">
      
      {/* --- CUSTOM GLOBAL MODAL --- */}
      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] p-6 md:p-8 shadow-2xl z-10 text-center flex flex-col items-center">
              
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${modal.type === 'confirm' && modal.isDestructive ? 'bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400' : 'bg-[#06402B]/10 text-[#06402B] dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                {modal.type === 'confirm' && modal.isDestructive ? <FaTrashAlt size={24} /> : modal.type === 'confirm' ? <FaSignOutAlt size={24} /> : <FaCheckCircle size={24} />}
              </div>
              
              <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">{modal.title}</h3>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-8">{modal.message}</p>
              
              <div className="flex gap-3 w-full">
                {modal.type === 'confirm' && (
                  <button onClick={closeModal} className="flex-1 py-3.5 bg-zinc-100 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-80 transition-opacity">
                    Cancel
                  </button>
                )}
                <button 
                  onClick={() => { if (modal.onConfirm) modal.onConfirm(); closeModal(); }} 
                  className={`flex-1 py-3.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all ${modal.type === 'confirm' && modal.isDestructive ? 'bg-red-600 hover:bg-red-500' : 'bg-[#06402B] hover:bg-[#042d1f] dark:bg-emerald-600 dark:hover:bg-emerald-500'}`}
                >
                  {modal.type === 'confirm' ? modal.confirmText : 'Okay'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30 sm:opacity-60"><FloatingCubes /></div>
        {/* --- UPDATED AMBIENT GLOW: Emerald tint in dark mode instead of muddy green --- */}
        <div className="absolute top-[10%] left-[20%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#06402B]/10 dark:bg-emerald-500/5 rounded-full blur-[100px] md:blur-[150px]" />
      </div>

      <aside className="hidden md:flex w-[84px] bg-white/50 dark:bg-[#09090b]/80 backdrop-blur-2xl border-r border-zinc-200 dark:border-zinc-800/80 shrink-0 flex-col items-center py-6 z-20 relative transition-colors duration-300">
        
        {/* --- MAIN SIDEBAR LOGO: JPCS Anchor --- */}
        <div className="relative w-12 h-12 mb-8 group cursor-pointer flex items-center justify-center" onClick={() => setActiveView('dashboard')}>
          <div className="absolute inset-0 bg-[#06402B]/20 dark:bg-emerald-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative w-full h-full bg-white dark:bg-[#121214] rounded-xl border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center overflow-hidden p-1 shadow-lg transition-transform group-active:scale-90">
            <Image src="/affiliates/dlsau.png" alt="JPCS Logo" fill sizes="48px" className="object-contain p-1.5" priority />
          </div>
        </div>

        <nav className="flex-1 w-full flex flex-col gap-4">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={`w-full flex flex-col items-center gap-1.5 py-3 transition-all relative group ${isActive ? 'text-[#06402B] dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              >
                {isActive && <motion.div layoutId="navIndicatorDesktop" className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#06402B] dark:bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(6,64,43,0.8)] dark:shadow-[0_0_10px_rgba(16,185,129,0.5)]" />}
                <span className="relative group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="text-[9px] font-mono tracking-widest uppercase">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button onClick={confirmSignOut} className="w-full flex flex-col items-center gap-1.5 py-3 text-zinc-500 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-colors group">
          <FaSignOutAlt size={22} className="group-hover:scale-110 transition-transform" />
        </button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10 w-full">
        
        <header className="h-16 md:h-20 bg-white/30 dark:bg-[#09090b]/60 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-20 transition-colors duration-300 w-full">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            
            {/* --- HEADER LOGOS: Dual Identity --- */}
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <div className="relative w-6 h-6 md:w-8 md:h-8 shrink-0 drop-shadow-sm">
                <Image src="/affiliates/dlsau.png" alt="DLSAU" fill sizes="32px" className="object-contain" />
              </div>
              <div className="relative w-6 h-6 md:w-8 md:h-8 shrink-0 drop-shadow-sm hidden sm:block">
                <Image src="/affiliates/icon.png" alt="JPCS" fill sizes="32px" className="object-contain" />
              </div>
              <div className="flex flex-col min-w-0 ml-1">
                <span className="hidden md:block text-[10px] font-mono font-bold text-[#06402B] dark:text-emerald-500 tracking-[0.3em] uppercase opacity-80 leading-none mb-1">The Academic</span>
                <h1 className="text-base md:text-2xl font-light tracking-[0.1em] text-zinc-800 dark:text-zinc-100 uppercase leading-none truncate">
                  <span className="hidden sm:inline">Lasallian</span> <span className="font-black text-[#06402B] dark:text-emerald-400">Hub</span>
                </h1>
              </div>
            </div>
            
            <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 hidden md:block shrink-0" />
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#06402B]/5 dark:bg-emerald-500/10 border border-[#06402B]/10 dark:border-emerald-500/20 rounded-full text-[9px] font-mono font-bold text-[#06402B] dark:text-emerald-400 tracking-widest uppercase shrink-0">
              System Online
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-none mb-1 truncate max-w-[150px]">{userProfile?.fullName || "Scholar"}</p>
               <p className="text-[9px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter">Verified Student Account</p>
             </div>
             
             <div 
               className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-200 dark:bg-[#18181b] flex items-center justify-center text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 relative cursor-pointer shrink-0 overflow-hidden shadow-sm" 
               onClick={() => setActiveView('settings')}
               title="Open Profile Settings"
             >
               {userProfile?.avatarUrl ? (
                 <Image src={userProfile.avatarUrl} alt="Avatar" fill sizes="40px" className="object-cover" />
               ) : (
                 <span className="font-bold text-sm">{userProfile?.fullName?.charAt(0) || "U"}</span>
               )}
               <div className="absolute top-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#09090b] z-10" />
             </div>

             <div className="w-px h-6 md:h-8 bg-zinc-200 dark:bg-zinc-800 mx-1 md:mx-2 shrink-0" />
             
             <button 
                onClick={() => setIsQueueOpen(!isQueueOpen)}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${isQueueOpen ? 'bg-[#06402B] dark:bg-emerald-600 text-white shadow-[0_0_15px_rgba(6,64,43,0.3)] dark:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105' : 'bg-zinc-100 dark:bg-[#18181b] text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400 dark:border dark:border-zinc-800/80'}`}
              >
                {isQueueOpen ? <FaChevronRight size={12} className="md:w-3.5 md:h-3.5" /> : <FaTasks size={14} className="md:w-4 md:h-4" />}
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 md:p-8 pb-28 md:pb-8 custom-scrollbar relative z-10 w-full">
          <AnimatePresence mode="wait">
            
            {/* === 1. HOME DASHBOARD === */}
            {activeView === 'dashboard' && (
              <motion.div key="dash" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6 md:space-y-8 max-w-5xl mx-auto w-full">
                
                <div className="p-6 sm:p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] bg-white/40 dark:bg-[#121214]/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/80 relative overflow-hidden shadow-xl text-center md:text-left transition-colors duration-300">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-[#06402B]/5 dark:bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
                  <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 md:mb-4 rounded-full bg-zinc-200/50 dark:bg-[#18181b]/80 text-[9px] md:text-[10px] font-mono font-bold tracking-widest text-zinc-500 dark:text-zinc-400 uppercase">
                        <FaClock /> {formattedDate}
                      </div>
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-900 dark:text-zinc-100 mb-2 tracking-tighter">
                        {getGreeting()}, <span className="text-[#06402B] dark:text-emerald-400 font-light italic">{userProfile?.fullName?.split(' ')[0] || "Scholar"}</span>.
                      </h2>
                    </div>
                    <button onClick={() => setIsAddingCourse(!isAddingCourse)} className="px-6 py-4 bg-[#06402B] dark:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md shrink-0">
                      <FaPlus size={14} /> Add Course
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isAddingCourse && (
                    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddCourse} className="overflow-hidden">
                      <div className="flex gap-2 bg-white dark:bg-[#121214] p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm mb-4">
                        <input autoFocus type="text" placeholder="e.g., CS101: Intro to Computing" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} className="flex-1 bg-transparent px-4 py-2 outline-none font-bold text-sm text-zinc-900 dark:text-zinc-100" />
                        <button type="submit" disabled={!newCourseTitle.trim()} className="px-6 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50">Save</button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {courses.length === 0 && !isAddingCourse && (
                    <div className="col-span-full py-16 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-center text-zinc-500 dark:text-zinc-600 flex flex-col items-center justify-center gap-4">
                      <FaFolderOpen size={32} className="opacity-20" />
                      <span className="font-bold uppercase tracking-widest text-xs">No courses added yet.</span>
                    </div>
                  )}

                  {courses.map(course => {
                    const cTasks = courseTasks.filter(t => t.courseId === course.id);
                    const completedTasks = cTasks.filter(t => t.status === "Submitted" || t.status === "Graded");
                    const progress = cTasks.length > 0 ? (completedTasks.length / cTasks.length) * 100 : 0;

                    return (
                      <motion.div key={course.id} whileHover={{ y: -4 }} onClick={() => openCourseTracker(course.id)} className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] p-6 cursor-pointer shadow-sm hover:shadow-md group transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"><FaBook size={18} /></div>
                          <button onClick={(e) => deleteCourse(course.id, e)} className="p-2 text-zinc-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><FaTrash size={14} /></button>
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
                </div>
              </motion.div>
            )}

            {/* === 2. TRACKER TABLE VIEW === */}
            {activeView === 'tracker' && (
              <motion.div key="tracker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-7xl mx-auto">
                <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/40 dark:bg-[#121214]/60 p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-md shadow-sm transition-colors">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                       <FaFolderOpen size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Active Course</p>
                      <div className="relative">
                        <select 
                          value={selectedCourseId || ""} 
                          onChange={(e) => setSelectedCourseId(e.target.value)}
                          className="w-full md:w-64 appearance-none bg-transparent font-black text-xl md:text-2xl text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer pr-8 truncate"
                        >
                          {courses.length === 0 && <option value="">No Courses Yet</option>}
                          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        <FaChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setActiveView('dashboard')} className="w-full md:w-auto px-6 py-3 bg-zinc-200 dark:bg-[#18181b] text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-widest text-[10px] md:text-xs rounded-xl hover:opacity-80 transition-opacity shrink-0">
                     Back to Grid
                  </button>
                </div>
                
                {!selectedCourseId ? (
                  <div className="py-20 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-center text-zinc-500 dark:text-zinc-600 flex flex-col items-center justify-center gap-4">
                    <FaBook size={32} className="opacity-20" />
                    <span className="font-bold uppercase tracking-widest text-xs">Please add a course first.</span>
                  </div>
                ) : (
                  <UniversityTracker courseId={selectedCourseId} />
                )}
              </motion.div>
            )}

            {/* === 3. MASTER CALENDAR VIEW === */}
            {activeView === 'calendar' && (
              <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-7xl mx-auto">
                 <AcademicCalendar userTasks={allCalendarTasks} />
              </motion.div>
            )}

            {/* Other Views Wrappers */}
            {activeView === 'lounge' && <motion.div key="lounge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto w-full"><StudyLounge /></motion.div>}
            {activeView === 'exchange' && <motion.div key="exchange" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full"><FlashcardExchange /></motion.div>}
            {activeView === 'tools' && <motion.div key="tools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto w-full"><GradeCalculator /><GWACalculator /></motion.div>}
            {activeView === 'schedule' && <motion.div key="sched" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl w-full"><DashboardScheduleMaker /></motion.div>}
            {activeView === 'flashcards' && <motion.div key="cards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto w-full"><FlashcardMaker /></motion.div>}
            
            {/* Settings */}
            {activeView === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto space-y-6 md:space-y-8 w-full">
                <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-end mb-2">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight uppercase text-zinc-900 dark:text-zinc-100">Settings</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Manage your profile and workspace preferences.</p>
                  </div>
                </div>

                <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 p-6 md:p-8 shadow-xl transition-colors duration-300 w-full">
                  <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                    <FaIdBadge className="text-[#06402B] dark:text-emerald-400" /> Public Profile
                  </h3>

                  <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="flex flex-col items-center gap-4 shrink-0 w-full md:w-auto">
                      <div className="relative w-32 h-32 rounded-full bg-zinc-200 dark:bg-[#18181b] flex items-center justify-center text-4xl font-bold text-zinc-500 border-4 border-white dark:border-zinc-950 shadow-lg overflow-hidden group">
                        {editAvatarUrl ? (
                          <Image src={editAvatarUrl} alt="Avatar Preview" fill sizes="128px" className="object-cover" />
                        ) : (
                          <span>{userProfile?.fullName?.charAt(0) || "U"}</span>
                        )}
                        <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 backdrop-blur-sm">
                          <FaCamera size={24} />
                          <span className="text-[10px] font-bold uppercase tracking-widest mt-2">Change</span>
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
                <div className="md:hidden mt-8">
                   <button onClick={confirmSignOut} className="w-full py-4 border-2 border-red-500/20 text-red-500 dark:text-red-400 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"><FaSignOutAlt /> Log Out</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* --- MOBILE DOCK --- */}
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

      {/* --- SIDEBAR OVERLAY & COMMAND CENTER --- */}
      <AnimatePresence>
        {isQueueOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsQueueOpen(false)} className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />}
      </AnimatePresence>

      <aside className={`fixed md:relative top-0 right-0 h-full z-50 md:z-20 bg-white/95 dark:bg-[#09090b]/95 md:bg-white/50 md:dark:bg-[#09090b]/80 backdrop-blur-2xl border-l border-zinc-200 dark:border-zinc-800/80 shrink-0 flex flex-col transition-all duration-300 ease-in-out ${isQueueOpen ? 'translate-x-0 w-[85%] sm:w-80 shadow-2xl md:shadow-none' : 'translate-x-full md:translate-x-0 md:w-0 opacity-0 overflow-hidden border-none'}`}>
        
        <div className="flex md:hidden items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800/80">
          <h2 className="text-xs font-mono font-bold text-[#06402B] dark:text-emerald-500 uppercase tracking-widest">Command Center</h2>
          <button onClick={() => setIsQueueOpen(false)} className="p-2 bg-zinc-200 dark:bg-[#18181b] rounded-lg text-zinc-500 hover:text-red-500"><FaTimes size={12}/></button>
        </div>

        <div className="p-5 md:p-6 flex-1 flex flex-col h-full min-w-[300px] overflow-y-auto custom-scrollbar gap-8">
          
          {/* LAYER 1: DELIVERABLES QUEUE */}
          <div className="flex-1 flex flex-col min-h-[250px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2"><FaTasks className="text-[#06402B] dark:text-emerald-400" /> Deliverables</h2>
              <button onClick={() => setIsAddingTask(!isAddingTask)} className="text-zinc-400 dark:text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors"><FaPlus size={12} /></button>
            </div>
            <AnimatePresence>
              {isAddingTask && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddGeneralTask} className="mb-4 overflow-hidden w-full">
                  <div className="bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 flex flex-col gap-3 shadow-sm">
                    <input type="text" autoFocus placeholder="What needs to be done?" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full text-xs font-bold bg-transparent outline-none text-zinc-900 dark:text-zinc-100 px-1" />
                    
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                      <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors relative">
                        <FaCalendarDay size={12} className="pointer-events-none absolute left-1" />
                        <input 
                          type="date" 
                          value={newTaskDeadline} 
                          onChange={(e) => setNewTaskDeadline(e.target.value)} 
                          className="bg-transparent text-[10px] font-mono text-zinc-500 dark:text-zinc-400 outline-none cursor-pointer pl-5" 
                        />
                      </div>
                      
                      <button type="submit" disabled={!newTaskTitle.trim()} className="bg-[#06402B] dark:bg-emerald-600 text-white rounded-lg px-4 py-1.5 text-[10px] font-bold disabled:opacity-50 hover:opacity-80 transition-colors shadow-sm">
                        Save
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
              {mergedPendingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-400 dark:text-zinc-600 border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl w-full">
                  <FaCheckCircle size={20} className="mb-2 opacity-50" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">All caught up!</p>
                </div>
              ) : (
                mergedPendingTasks.map(task => (
                  <div key={task.id} className={`group flex items-start gap-3 p-3 bg-white dark:bg-[#121214]/80 border ${task.isCourseTask ? 'border-[#06402B]/30 dark:border-emerald-500/30 shadow-sm' : 'border-zinc-200 dark:border-zinc-800/80'} rounded-xl hover:border-[#06402B]/50 dark:hover:border-emerald-500/50 transition-all w-full`}>
                    <button onClick={() => toggleTaskStatus(task)} className="mt-0.5 text-zinc-400 dark:text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors shrink-0"><FaRegCircle size={14} /></button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 font-bold truncate leading-tight">{task.title}</p>
                      {task.deadline && <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mt-1 inline-block ${task.isCourseTask ? 'text-[#06402B] bg-[#06402B]/10 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-orange-600 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20'}`}>Due: {task.deadline}</span>}
                    </div>
                    <button onClick={() => deleteTask(task)} className="text-zinc-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all active:scale-90 shrink-0"><FaTrashAlt size={10} /></button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LAYER 2: FOCUS ZONE */}
          <div className="bg-[#06402B]/10 dark:bg-emerald-500/10 border border-[#06402B]/20 dark:border-emerald-500/20 p-4 rounded-2xl text-center shrink-0">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-[#06402B] dark:text-emerald-400 mb-1 flex items-center justify-center gap-1"><FaBolt /> Deep Focus</h3>
             <p className="text-[9px] text-zinc-600 dark:text-zinc-400 font-medium mb-3">Block distractions and start a Pomodoro session.</p>
             <button className="w-full py-2 bg-[#06402B] dark:bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all">Launch Timer</button>
          </div>

          {/* LAYER 3: MINI CALENDAR WITH DOTS */}
          <div className="shrink-0">
            {renderMiniCalendar()}
          </div>

          {/* LAYER 4: NETWORK */}
          <div className="shrink-0">
             <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2"><FaUserFriends /> Network</h2>
             {friendsList.length === 0 ? (
               <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600">No friends added yet.</p>
             ) : (
               <div className="flex flex-col gap-3 bg-white/50 dark:bg-[#121214]/50 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800/80">
                 {friendsList.map(friend => (
                   <div key={friend.uid} className="flex items-center gap-3">
                     <div className="relative">
                       <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-[#18181b] flex items-center justify-center text-xs font-bold text-zinc-500">
                         {friend.avatarUrl ? <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : friend.fullName?.charAt(0)}
                       </div>
                       <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#121214]" />
                     </div>
                     <div className="min-w-0 flex-1">
                       <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{friend.fullName}</p>
                       <p className="text-[8px] font-mono text-zinc-500 truncate">Online</p>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

        </div>
      </aside>

    </div>
  );
}