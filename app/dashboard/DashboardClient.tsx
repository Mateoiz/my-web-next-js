"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from 'next/dynamic'; 
import Image from "next/image";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {  FaCalculator, FaLayerGroup, FaTasks, FaSignOutAlt, FaPlus, FaCheckCircle, 
  FaTrashAlt, FaTachometerAlt, FaGlobe, FaClock, FaUserFriends, FaChevronRight, 
  FaCog, FaSun, FaMoon, FaDesktop, FaPalette, FaIdBadge, FaSave, FaCamera, 
  FaFolderOpen, FaCalendarDay, FaQuoteLeft, FaBook, FaFire, FaChartBar, FaFacebook, FaInstagram, FaExternalLinkAlt, FaHeart, FaExclamationCircle, FaSpinner
} from "react-icons/fa";
import { FaBrain } from "react-icons/fa6";
import { ModalProvider, useModal } from "../context/ModalContext";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, documentId } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { auth, db, storage } from "@/lib/db"; 

import FloatingCubes from "../components/FloatingCubes"; 
import CommandCenter from "../components/Layout/CommandCenter";
import ErrorBoundary from "../components/ErrorBoundary";
import PatchNotes from "../components/PatchNotes";

// --- SAFE DYNAMIC IMPORTS ---
const DashboardScheduleMaker = dynamic(() => import('../components/Tools/DashboardScheduleMaker'), { ssr: false });
const GradeCalculator = dynamic(() => import('../components/Tools/GradeCalculator'));
const GWACalculator = dynamic(() => import('../components/Tools/GWACalculator'));
const FlashcardMaker = dynamic(() => import('../components/Tools/FlashcardMaker'), { ssr: false });
const FlashcardExchange = dynamic(() => import('../components/Community/FlashcardExchange'), { ssr: false });
const StudyLounge = dynamic(() => import('../components/Community/StudyLounge'), { ssr: false });
const UniversityTracker = dynamic(() => import('../components/Tools/UniversityTracker'), { ssr: false });
const AcademicCalendar = dynamic(() => import('../components/Community/AcademicCalendar').then(mod => mod.default), { ssr: false });
const CampusBulletin = dynamic(() => import('../components/Community/CampusBulletin'), { ssr: false });
import OnboardingFlow from "../components/Onboarding/OnboardingFlow";

const NAV_ITEMS = [
  { id: 'dashboard', icon: <FaTachometerAlt size={20} />, label: "Home" },
  { id: 'tracker', icon: <FaFolderOpen size={20} />, label: "Tracker" },
  { id: 'academics', icon: <FaBook size={20} />, label: "Academics" },
  { id: 'studyhub', icon: <FaBrain size={20} />, label: "Study Hub" },
  { id: 'calendar', icon: <FaCalendarDay size={20} />, label: "Calendar" },
  { id: 'settings', icon: <FaCog size={20} />, label: "Settings" }, 
];

// ==========================================
// THE ACADEMIC ENGINE HOOK
// ==========================================
const useCourseAverages = (courses: any[], tasks: any[]) => {
  return useMemo(() => {
    return courses.map(course => {
      const courseTasks = tasks.filter(t => t.courseId === course.id && t.status === "Graded");

      const parseGrade = (gradeStr: string | undefined, isClassStanding = false) => {
        if (!gradeStr) return 0;
        const str = gradeStr.toString().split('/')[0].trim();
        const raw = parseFloat(str);
        if (isNaN(raw)) return 0;
        if (isClassStanding) return (raw / 20) * 100; 
        return raw;
      };

      const mid = courseTasks.find(t => t.type === "Midterm Exam");
      const fin = courseTasks.find(t => t.type === "Final Exam");
      const prod = courseTasks.find(t => t.type === "Final Product");
      const stand = courseTasks.find(t => t.type === "Class Standing");

      let earnedWeight = 0;
      let earnedScore = 0;

      if (mid) { earnedScore += parseGrade(mid.grade) * 0.30; earnedWeight += 30; }
      if (fin) { earnedScore += parseGrade(fin.grade) * 0.30; earnedWeight += 30; }
      if (prod) { earnedScore += parseGrade(prod.grade) * 0.20; earnedWeight += 20; }
      if (stand) { earnedScore += parseGrade(stand.grade, true) * 0.20; earnedWeight += 20; }

      let finalAverage = null;

      if (earnedWeight > 0) {
        finalAverage = (earnedScore / (earnedWeight / 100));
      } else if (courseTasks.length > 0) {
        let total = 0;
        courseTasks.forEach(t => { total += parseGrade(t.grade); });
        finalAverage = total / courseTasks.length;
      }

      return {
        courseId: course.id,
        title: course.title,
        average: finalAverage !== null ? finalAverage.toFixed(2) : null
      };
    });
  }, [courses, tasks]);
};


function DashboardInner() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { showAlert, showConfirm } = useModal();
  const [isOnline, setIsOnline] = useState(true);
  const [isStudying, setIsStudying] = useState(false);

  const [activeView, setActiveView] = useState('dashboard');
  const [academicTab, setAcademicTab] = useState<'schedule' | 'grades'>('schedule');
  const [studyTab, setStudyTab] = useState<'cards' | 'exchange' | 'lounge'>('cards');

  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [generalTasks, setGeneralTasks] = useState<any[]>([]);
  const [courseTasks, setCourseTasks] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  
  const [todaysQuote, setTodaysQuote] = useState({ q: "Loading...", a: "" });

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [editBio, setEditBio] = useState("");
  const [editYearLevel, setEditYearLevel] = useState("1st Year");
  const [editCollege, setEditCollege] = useState(""); // ✅ FIX 1: initialize empty, set from data in useEffect
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null); 
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const router = useRouter();
  const confirmSignOut = () => showConfirm("Log Out", "Are you sure you want to log out?", () => signOut(auth), "Log Out", false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();  
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    const fetchQuote = () => {
      const quotes = [
        { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
        { q: "Success is not final, failure is not fatal: it is the courage to continue that counts.", a: "Winston Churchill" },
        { q: "Act as if what you do makes a difference. It does.", a: "William James" },
        { q: "You are never too old to set another goal or to dream a new dream.", a: "C.S. Lewis" },
        { q: "The only limit to our realization of tomorrow will be our doubts of today.", a: "Franklin D. Roosevelt" },
        { q: "People say nothing is impossible, but I do nothing every day.", a: "A.A. Milne" },
        { q: "The elevator to success is out of order. You'll have to use the stairs, one step at a time.", a: "Joe Girard" },
        { q: "I always wanted to be somebody, but now I realize I should have been more specific.", a: "Lily Tomlin" },
        { q: "Even if you are on the right track, you will get run over if you just sit there.", a: "Will Rogers" },
        { q: "I am so clever that sometimes I don't understand a single word of what I am saying.", a: "Oscar Wilde" },
        { q: "Opportunity does not knock, it presents itself when you beat down the door.", a: "Kyle Chandler" },
        { q: "If you think you are too small to make a difference, try sleeping with a mosquito.", a: "Dalai Lama" }
      ];
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setTodaysQuote(randomQuote);
    };
    fetchQuote();
  }, []);

  useEffect(() => { setMounted(true); if (window.innerWidth >= 768) setIsQueueOpen(true); }, []);

  // --- PRESENCE SYSTEM ---
// --- PRESENCE SYSTEM ---
  useEffect(() => {
    if (!authUser) return;

    const userRef = doc(db, "users", authUser.uid);
    let offlineTimeout: NodeJS.Timeout;
    let onlineDebounce: NodeJS.Timeout;

    const goOnline = () => {
      clearTimeout(offlineTimeout);
      clearTimeout(onlineDebounce);
      
      onlineDebounce = setTimeout(async () => {
        try {
          await updateDoc(userRef, { isOnline: true, lastSeen: new Date().toISOString() });
        } catch (err) {
          console.warn("Presence online failed:", err);
        }
      }, 2000); // 2-second buffer safely avoids hot-reload crossfire
    };

    const goOffline = () => {
      clearTimeout(onlineDebounce);
      updateDoc(userRef, { isOnline: false, lastSeen: new Date().toISOString() })
        .catch(err => console.warn("Presence offline failed:", err));
    };

    const handleVisibility = () => {
      clearTimeout(offlineTimeout);
      if (document.visibilityState === 'visible') {
        goOnline();
      } else {
        offlineTimeout = setTimeout(() => goOffline(), 60000);
      }
    };

    const handlePageHide = () => {
      clearTimeout(onlineDebounce);
      clearTimeout(offlineTimeout);
      goOffline();
    };

    const handleFocus = () => goOnline();
    const handleBlur = () => {
      clearTimeout(offlineTimeout);
      offlineTimeout = setTimeout(() => goOffline(), 60000);
    };

    goOnline();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearTimeout(offlineTimeout);
      clearTimeout(onlineDebounce);
      
      // CRITICAL FIX: DO NOT call goOffline() here!
      // React 18 Strict Mode and Next.js Hot Reloads run this cleanup constantly.
      // Forcing a Firebase write here collides with active WebSocket teardowns and corrupts the SDK.
      // We rely entirely on the 'pagehide' and 'visibilitychange' window events to catch real exits.
    };
  }, [authUser]);
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.push("/Workspace");
      setAuthUser(user);
      
      let unsubFriends = () => {}; 

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile(data);
          setEditBio(data.bio || "");
          setEditYearLevel(data.yearLevel || "1st Year");
          setEditAvatarUrl(data.avatarUrl || "");
          setEditCollege(data.college || ""); // ✅ FIX 1: properly set from loaded data

          if (!data.hasSeenOnboarding) {
            setShowOnboarding(true);
          }

          if (data.friends && data.friends.length > 0) {
            const friendsQuery = query(collection(db, "users"), where(documentId(), "in", data.friends.slice(0, 10)));
            unsubFriends = onSnapshot(friendsQuery, (snap) => setFriendsList(snap.docs.map(d => ({ uid: d.id, ...d.data() }))));
          }
        }
      } catch (err) {}

      const unsubTasks = onSnapshot(query(collection(db, "tasks"), where("userId", "==", user.uid), orderBy("createdAt", "desc")), snap => setGeneralTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCourseTasks = onSnapshot(query(collection(db, "course_tasks"), where("userId", "==", user.uid)), snap => {
        setCourseTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setIsLoading(false);
      });
      const unsubCourses = onSnapshot(query(collection(db, "courses"), where("userId", "==", user.uid), orderBy("createdAt", "asc")), snap => setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

      return () => { unsubTasks(); unsubCourseTasks(); unsubCourses(); unsubFriends(); };
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
      await updateDoc(doc(db, "users", authUser.uid), {
        bio: editBio,
        yearLevel: editYearLevel,
        avatarUrl: finalAvatarUrl,
        college: editCollege, // ✅ persists college to Firestore
      });
      setUserProfile((prev: any) => ({ ...prev, avatarUrl: finalAvatarUrl, bio: editBio, yearLevel: editYearLevel, college: editCollege }));
      setAvatarFile(null);
      showAlert("Profile Updated", "Your profile has been saved.");
    } catch (error) {} finally { setIsSavingProfile(false); }
  };

  // --- SMART DASHBOARD ALGORITHMS ---
  const mergedActiveTasks = [
    ...generalTasks.filter(t => t.status === 'pending').map(t => ({ ...t, isCourseTask: false })),
    ...courseTasks.filter(t => t.status === 'OPEN' || t.status === 'Submitted').map(t => ({ id: t.id, title: t.name || 'Untitled', type: t.type, status: t.status, deadline: t.deadline, isCourseTask: true }))
  ];

  const allCalendarTasks = [
    ...generalTasks.filter(t => t.deadline).map(t => ({ id: t.id, title: t.title, deadline: t.deadline })),
    ...courseTasks.filter(t => t.deadline).map(t => ({ id: t.id, title: `${t.name || 'Untitled'} (${t.type})`, deadline: t.deadline }))
  ];

  const getUrgentTasks = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const fortyEightHours = new Date(today.getTime() + (48 * 60 * 60 * 1000));
    return mergedActiveTasks
      .filter(t => t.status !== 'Submitted' && t.status !== 'completed' && t.deadline)
      .filter(t => {
        const taskDate = new Date(t.deadline);
        return taskDate >= today && taskDate <= fortyEightHours;
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 3);
  };
  const urgentTasks = getUrgentTasks();

  const generateHeatmapData = () => {
    const activityCounts = new Array(150).fill(0);
    const now = new Date().getTime();
    const msPerDay = 24 * 60 * 60 * 1000;
    [...generalTasks, ...courseTasks].forEach(task => {
      if (task.status === 'completed' || task.status === 'Submitted' || task.status === 'Graded') {
        const taskTime = task.deadline ? new Date(task.deadline).getTime() : (task.createdAt?.toMillis() || now);
        const daysAgo = Math.floor((now - taskTime) / msPerDay);
        if (daysAgo >= 0 && daysAgo < 150) activityCounts[149 - daysAgo] += 1;
      }
    });
    return activityCounts.map(count => {
      if (count === 0) return 0;
      if (count === 1) return 0.4;
      if (count <= 3) return 0.7;
      return 1.0;
    });
  };
  const heatmapData = generateHeatmapData();

  const totalCompleted = [...generalTasks, ...courseTasks].filter(t => t.status === 'completed' || t.status === 'Submitted' || t.status === 'Graded').length;
  const currentWorkload = mergedActiveTasks.length;

  const computedCourseGrades = useCourseAverages(courses, courseTasks);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090b]"><span className="w-12 h-12 rounded-full border-4 border-[#06402B]/30 border-t-[#06402B] animate-spin" /></div>;
  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-[#09090b] font-sans text-zinc-900 dark:text-zinc-100 overflow-hidden relative transition-colors duration-300">
      <AnimatePresence>
        {showOnboarding && authUser && (
          <OnboardingFlow
            userId={authUser.uid}
            userName={userProfile?.fullName || "Scholar"}
            onComplete={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>

    <PatchNotes />
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30 sm:opacity-60"><FloatingCubes /></div>
        <div className="absolute top-[10%] left-[20%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#06402B]/10 dark:bg-emerald-500/5 rounded-full blur-[100px] md:blur-[150px]" />
      </div>

      <aside className="hidden md:flex w-[84px] bg-white/50 dark:bg-[#09090b]/80 backdrop-blur-2xl border-r border-zinc-200 dark:border-zinc-800/80 shrink-0 flex-col items-center py-6 z-20 relative">
        <div
          className="relative w-12 h-12 mb-8 cursor-pointer flex items-center justify-center group"
          onClick={() => setActiveView('dashboard')}
        >
          <div className="absolute inset-0 bg-[#06402B]/20 dark:bg-emerald-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative w-full h-full bg-white dark:bg-[#121214] rounded-xl border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center p-1 shadow-lg transition-all duration-200 group-hover:scale-105 active:scale-90">
            <Image src="/affiliates/dlsau.png" alt="DLSAU" fill sizes="48px" className="object-contain p-1.5" priority />
          </div>
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-x-1 group-hover:translate-x-0 shadow-xl">
            Home
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900 dark:border-r-zinc-100" />
          </div>
        </div>

        <nav className="flex-1 w-full flex flex-col items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex flex-col items-center gap-1.5 py-3 px-2 transition-all relative group rounded-xl mx-2
                  ${isActive
                    ? 'text-[#06402B] dark:text-emerald-400'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                  }`}
                style={{ width: 'calc(100% - 16px)' }}
              >
                {isActive && (
                  <motion.div
                    layoutId="navInd"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#06402B] dark:bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(6,64,43,0.8)] dark:shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="navBg"
                    className="absolute inset-0 bg-[#06402B]/8 dark:bg-emerald-500/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <span className={`relative z-10 transition-all duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className="relative z-10 text-[9px] font-mono tracking-widest uppercase">
                  {item.label}
                </span>
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-x-1 group-hover:translate-x-0 shadow-xl z-50">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900 dark:border-r-zinc-100" />
                </div>
              </button>
            );
          })}
        </nav>

        <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 mb-3" />

        <div className="relative group w-full flex justify-center">
          <button
            onClick={confirmSignOut}
            className="flex flex-col items-center gap-1.5 py-3 px-2 text-zinc-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 transition-all rounded-xl hover:bg-red-500/5 w-[calc(100%-16px)] group"
          >
            <FaSignOutAlt size={20} className="transition-transform duration-200 group-hover:scale-110" />
            <span className="text-[9px] font-mono tracking-widest uppercase">Exit</span>
          </button>
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-x-1 group-hover:translate-x-0 shadow-xl z-50">
            Sign Out
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-red-600" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10 w-full">
        <header className="h-16 md:h-20 bg-white/30 dark:bg-[#09090b]/60 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-20">
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <div className="relative w-6 h-6 md:w-8 md:h-8 shrink-0 drop-shadow-sm"><Image src="/affiliates/dlsau.png" alt="DLSAU" fill sizes="32px" className="object-contain" /></div>
              <div className="relative w-6 h-6 md:w-8 md:h-8 shrink-0 drop-shadow-sm hidden sm:block"><Image src="/affiliates/icon.png" alt="JPCS" fill sizes="32px" className="object-contain" /></div>
              <div className="flex flex-col min-w-0 ml-1">
                <span className="hidden md:block text-[10px] font-mono font-bold text-[#06402B] dark:text-emerald-500 tracking-[0.3em] uppercase opacity-80 leading-none mb-1">The Academic</span>
                <h1 className="text-base md:text-2xl font-light tracking-[0.1em] text-zinc-800 dark:text-zinc-100 uppercase leading-none truncate"><span className="hidden sm:inline">Lasallian</span> <span className="font-black text-[#06402B] dark:text-emerald-400">Terminal</span></h1>
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

        <div className="flex-1 overflow-x-clip overflow-y-auto p-4 sm:p-6 md:p-8 pb-28 md:pb-8 custom-scrollbar relative z-10 w-full">
          {/* ✅ FIX 2: All views are inside ONE AnimatePresence */}
          <AnimatePresence mode="wait">

            {/* === 1. SMART DASHBOARD === */}
            {activeView === 'dashboard' && (
              <motion.div
                key="dash"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4 max-w-6xl mx-auto w-full"
              >
                {/* ── ROW 1: Compact greeting ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                  <div>
                    <p className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-0.5">
                      {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-none">
                      {getGreeting()},{" "}
                      <span className="text-[#06402B] dark:text-emerald-400 font-light italic">
                        {userProfile?.fullName?.split(" ")[0] || "Scholar"}
                      </span>
                    </h2>
                  </div>
                  <div className="hidden lg:flex items-start gap-2 max-w-xs px-4 py-3 rounded-2xl bg-white/60 dark:bg-[#121214]/80 border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-xl shrink-0">
                    <FaQuoteLeft className="text-[#06402B]/25 dark:text-emerald-400/25 mt-0.5 shrink-0" size={11} />
                    <p className="text-[11px] font-medium italic text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">
                      {todaysQuote.q}
                      <span className="not-italic font-bold text-[#06402B] dark:text-emerald-500"> — {todaysQuote.a}</span>
                    </p>
                  </div>
                </div>

                {/* ── ROW 2: Stat pills ── */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: "Done", value: totalCompleted, color: "text-[#06402B] dark:text-emerald-400", bg: "bg-[#06402B]/5 dark:bg-emerald-500/10", border: "border-[#06402B]/10 dark:border-emerald-500/20", icon: <FaCheckCircle size={12} /> },
                    { label: "Active", value: currentWorkload, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/5 dark:bg-orange-500/10", border: "border-orange-500/10 dark:border-orange-500/20", icon: <FaTasks size={12} /> },
                    { label: "Network", value: friendsList.length, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/5 dark:bg-blue-500/10", border: "border-blue-500/10 dark:border-blue-500/20", icon: <FaUserFriends size={12} /> },
                  ].map((s) => (
                    <div key={s.label} className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl border ${s.bg} ${s.border}`}>
                      <span className={`${s.color} shrink-0`}>{s.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-xl sm:text-2xl font-black leading-none ${s.color}`}>{s.value}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mt-0.5">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── ROW 3: Main panels ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

                  {/* ── Col 1: UP NEXT ── */}
                  <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800/80 p-4 sm:p-5 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <FaFire className="text-orange-500" /> Up Next
                      </h3>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">48 hrs</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {urgentTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-zinc-400 opacity-50 gap-2">
                          <FaCheckCircle size={24} />
                          <p className="text-[10px] font-bold uppercase tracking-widest">All clear!</p>
                        </div>
                      ) : (
                        urgentTasks.map((task) => {
                          const ms = new Date(task.deadline).getTime() - Date.now();
                          const daysLeft = Math.ceil(ms / (1000 * 60 * 60 * 24));
                          return (
                            <div
                              key={task.id}
                              onClick={() => setActiveView("tracker")}
                              className="group p-3 rounded-xl border border-red-500/20 bg-red-500/5 dark:bg-red-500/10 flex items-start justify-between gap-2 cursor-pointer hover:border-red-500/40 active:scale-[0.98] transition-all"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white leading-snug line-clamp-2">{task.title}</p>
                                <p className="text-[10px] font-mono text-red-500 dark:text-red-400 font-bold mt-0.5">{task.deadline}</p>
                              </div>
                              <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${daysLeft <= 1 ? "bg-red-500 text-white" : "bg-orange-500/20 text-orange-600 dark:text-orange-400"}`}>
                                {daysLeft <= 0 ? "Today" : daysLeft === 1 ? "Tmrw" : `${daysLeft}d`}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <button
                      onClick={() => setActiveView("tracker")}
                      className="mt-auto w-full py-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:border-[#06402B]/40 dark:hover:border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <FaPlus size={9} /> Open Tracker
                    </button>
                  </div>

                  {/* ── Col 2: GRADES ── */}
                  <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800/80 p-4 sm:p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <FaChartBar className="text-[#06402B] dark:text-emerald-400" /> Grades
                      </h3>
                      <button
                        onClick={() => { setActiveView("academics"); setAcademicTab("grades"); }}
                        className="text-[9px] font-bold uppercase tracking-widest text-[#06402B] dark:text-emerald-400 hover:underline"
                      >
                        Full →
                      </button>
                    </div>
                    <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-48 lg:max-h-56 pr-0.5 custom-scrollbar">
                      {computedCourseGrades.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-zinc-400 opacity-50 gap-2">
                          <FaBook size={20} />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-center">Add courses in Tracker</p>
                        </div>
                      ) : (
                        computedCourseGrades.map((cg) => {
                          const avg = cg.average ? parseFloat(cg.average) : null;
                          const pct = avg ? Math.min(avg, 100) : 0;
                          const barColor =
                            avg === null ? "bg-zinc-300 dark:bg-zinc-700"
                            : avg >= 90 ? "bg-emerald-500"
                            : avg >= 75 ? "bg-blue-500"
                            : avg >= 60 ? "bg-orange-500"
                            : "bg-red-500";
                          return (
                            <div key={cg.courseId} className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate flex-1">{cg.title}</p>
                                <span className={`text-[11px] font-black shrink-0 ${avg === null ? "text-zinc-400" : avg >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                                  {avg !== null ? `${avg}%` : "—"}
                                </span>
                              </div>
                              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.7, ease: "easeOut" }}
                                  className={`h-full rounded-full ${barColor}`}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Activity — last 5 weeks</p>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-zinc-400 font-bold">Less</span>
                          {[0, 0.3, 0.6, 1.0].map((v, i) => (
                            <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: v === 0 ? 'rgba(0,0,0,0.07)' : `rgba(6,64,43,${v})` }} />
                          ))}
                          <span className="text-[8px] text-zinc-400 font-bold">More</span>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <div className="flex flex-col gap-0.5 mr-1">
                          {['M','W','F'].map((d, i) => (
                            <div key={d} className="text-[7px] font-bold text-zinc-400 uppercase h-3 flex items-center" style={{ marginTop: i === 0 ? 0 : '4px' }}>{d}</div>
                          ))}
                        </div>
                        {(() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const weeks: number[][] = [];
                          for (let w = 4; w >= 0; w--) {
                            const week: number[] = [];
                            for (let d = 6; d >= 0; d--) {
                              const dayIndex = w * 7 + d;
                              week.unshift(heatmapData[heatmapData.length - 1 - dayIndex] ?? 0);
                            }
                            weeks.push(week);
                          }
                          return weeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-0.5">
                              {week.map((intensity, di) => {
                                const daysAgo = (4 - wi) * 7 + (6 - di);
                                const date = new Date(today);
                                date.setDate(today.getDate() - daysAgo);
                                const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                const isFuture = daysAgo < 0;
                                return (
                                  <div
                                    key={di}
                                    title={isFuture ? '' : `${label}: ${intensity > 0 ? 'active' : 'no activity'}`}
                                    className="w-3.5 h-3.5 rounded-sm transition-all hover:ring-1 hover:ring-emerald-400/50 cursor-default"
                                    style={{ backgroundColor: isFuture ? 'transparent' : intensity === 0 ? 'rgba(0,0,0,0.07)' : `rgba(6,64,43,${intensity})` }}
                                  />
                                );
                              })}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ── Col 3: CAMPUS BULLETIN ── */}
                  <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800/80 p-4 sm:p-5 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto lg:max-h-[480px] custom-scrollbar">
                      <CampusBulletin />
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* === 2. TRACKER === */}
            {activeView === 'tracker' && (
              <motion.div key="tracker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-7xl mx-auto">
                <ErrorBoundary fallbackTitle="Tracker Error">
                  <UniversityTracker />
                </ErrorBoundary>
              </motion.div>
            )}

            {/* === 3. ACADEMICS HUB === */}
            {activeView === 'academics' && (
              <motion.div key="academics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-7xl mx-auto flex flex-col min-h-full space-y-6">
                <ErrorBoundary fallbackTitle="Academics Error">
                  <div className="w-full border-b border-zinc-200 dark:border-zinc-800/80 mb-2 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <div className="flex gap-6 md:gap-8 min-w-max px-1">
                      {[
                        { id: 'schedule', icon: FaClock, label: 'Schedule Canvas' },
                        { id: 'grades', icon: FaCalculator, label: 'Grade Analytics' }
                      ].map(tab => (
                        <button
                          key={tab.id} onClick={() => setAcademicTab(tab.id as any)}
                          className={`pb-4 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-2 ${academicTab === tab.id ? 'text-[#06402B] dark:text-emerald-400' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                        >
                          <tab.icon size={14} /> {tab.label}
                          {academicTab === tab.id && <motion.div layoutId="acadTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06402B] dark:bg-emerald-400 rounded-t-full" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </ErrorBoundary>
                <AnimatePresence mode="wait">
                  {academicTab === 'schedule' && <motion.div key="s" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}><DashboardScheduleMaker /></motion.div>}
                  {academicTab === 'grades' && (
                    <motion.div key="g" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                      <GradeCalculator courses={courses} tasks={courseTasks} />
                      <GWACalculator autoGrades={computedCourseGrades} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* === 4. STUDY HUB === */}
            {activeView === 'studyhub' && (
              <motion.div key="studyhub" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-7xl mx-auto flex flex-col min-h-full space-y-6">
                <ErrorBoundary fallbackTitle="Study Hub Error">
                  <div className="w-full border-b border-zinc-200 dark:border-zinc-800/80 mb-2 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <div className="flex gap-6 md:gap-8 min-w-max px-1">
                      {[
                        { id: 'cards', icon: FaLayerGroup, label: 'Flashcard Vault' },
                        { id: 'exchange', icon: FaGlobe, label: 'Global Exchange' },
                        { id: 'lounge', icon: FaUserFriends, label: 'Study Lounge' }
                      ].map(tab => (
                        <button
                          key={tab.id} onClick={() => setStudyTab(tab.id as any)}
                          className={`pb-4 text-xs font-bold uppercase tracking-widest transition-colors relative flex items-center gap-2 ${studyTab === tab.id ? 'text-[#06402B] dark:text-emerald-400' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                        >
                          <tab.icon size={14} /> {tab.label}
                          {studyTab === tab.id && <motion.div layoutId="studyTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06402B] dark:bg-emerald-400 rounded-t-full" />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    {studyTab === 'cards' && <motion.div key="c" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}><FlashcardMaker onStudyModeChange={setIsStudying} /></motion.div>}
                    {studyTab === 'exchange' && <motion.div key="e" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}><FlashcardExchange /></motion.div>}
                    {studyTab === 'lounge' && <motion.div key="l" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}><StudyLounge /></motion.div>}
                  </AnimatePresence>
                </ErrorBoundary>
              </motion.div>
            )}

            {/* === 5. MASTER CALENDAR === */}
            {activeView === 'calendar' && (
              <motion.div key="cal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-7xl mx-auto">
                <ErrorBoundary fallbackTitle="Calendar Error">
                  <AcademicCalendar userTasks={allCalendarTasks} />
                </ErrorBoundary>
              </motion.div>
            )}

            {/* === 6. SETTINGS === ✅ FIX 2: now inside AnimatePresence */}
            {activeView === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto space-y-6 md:space-y-8 w-full">
                <ErrorBoundary fallbackTitle="Settings Error">
                  <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-end mb-2">
                    <div>
                      <h2 className="text-3xl font-black tracking-tight uppercase text-zinc-900 dark:text-zinc-100">Settings</h2>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Manage your profile and workspace preferences.</p>
                    </div>
                  </div>

                  {/* ── Public Profile ── */}
                  <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 p-6 md:p-8 shadow-xl transition-colors duration-300 w-full">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                      <FaIdBadge className="text-[#06402B] dark:text-emerald-400" /> Public Profile
                    </h3>
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
                              <option value="1st Year">1st Year</option>
                              <option value="2nd Year">2nd Year</option>
                              <option value="3rd Year">3rd Year</option>
                              <option value="4th Year">4th Year</option>
                              <option value="Irregular">Irregular</option>
                              <option value="Alumni">Alumni</option>
                            </select>
                          </div>
                        </div>

                        {/* ── College ── */}
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">College</label>
                          <select value={editCollege} onChange={e => setEditCollege(e.target.value)} className="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 shadow-sm">
                            <option value="">— Select your college —</option>
                            <option value="CAST">CAST — College of Arts, Sciences & Technology</option>
                            <option value="CBMA">CBMA — College of Business Management & Accountancy</option>
                            <option value="COED">COED — College of Education</option>
                            <option value="CVMAS">CVMAS — College of Veterinary Medicine & Animal Science</option>
                          </select>
                        </div>

                        {/* ── Bio ── */}
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Short Bio</label>
                          <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell your classmates about yourself..." maxLength={150} className="w-full bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 shadow-sm resize-none h-24" />
                          <div className="text-right text-[10px] text-zinc-400 mt-1">{editBio.length}/150</div>
                        </div>

                        {/* ── Unsaved changes banner ── */}
                        {(editBio !== (userProfile?.bio || "") || editYearLevel !== (userProfile?.yearLevel || "") || editCollege !== (userProfile?.college || "")) && (
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-amber-700 dark:text-amber-400 text-xs font-bold">
                            <FaExclamationCircle size={13} />
                            You have unsaved changes.
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full md:w-auto px-8 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md">
                            {isSavingProfile ? <><FaSpinner className="animate-spin" /> Saving...</> : <><FaSave /> Save Profile</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Appearance ── */}
                  <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 p-6 md:p-8 shadow-xl transition-colors duration-300 w-full">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                      <FaPalette className="text-[#06402B] dark:text-emerald-400" /> Appearance
                    </h3>
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

                  {/* ── About & Socials ── */}
                  <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 p-6 md:p-8 shadow-xl transition-colors duration-300 w-full">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                      <FaHeart className="text-[#06402B] dark:text-emerald-400" /> About & Socials
                    </h3>

                    {/* Logo / org name */}
                    <div className="flex flex-col items-center text-center gap-2 mb-8">
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg mb-1 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800">
                        <Image src="/affiliates/icon.png" alt="JPCS DLSAU" fill sizes="64px" className="object-contain p-1" />
                      </div>
                      <p className="text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight">JPCS DLSAU</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium max-w-xs">
                        Junior Philippine Computer Society — De La Salle Araneta University
                      </p>
                    </div>

                    {/* Social links */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      <a href="https://www.facebook.com/JPCSDLSAU" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 hover:border-[#1877F2]/50 hover:bg-[#1877F2]/5 dark:hover:bg-[#1877F2]/10 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                          <FaFacebook size={20} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Facebook</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">@JPCSDLSAU</p>
                        </div>
                        <FaExternalLinkAlt size={11} className="ml-auto text-zinc-400 group-hover:text-[#1877F2] transition-colors shrink-0" />
                      </a>

                      <a href="https://www.instagram.com/jpcs.dlsau/" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 hover:border-[#E1306C]/50 hover:bg-[#E1306C]/5 dark:hover:bg-[#E1306C]/10 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F58529] via-[#E1306C] to-[#833AB4] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                          <FaInstagram size={20} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Instagram</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">@jpcs.dlsau</p>
                        </div>
                        <FaExternalLinkAlt size={11} className="ml-auto text-zinc-400 group-hover:text-[#E1306C] transition-colors shrink-0" />
                      </a>
                    </div>

                    {/* Credits */}
                    <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-4 text-center">Built by Lasallians, for Lasallians.</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[
                          { label: "JPCS DLSAU", role: "Organization" },
                          { label: "Dev ", role: "Engineering" },
                        ].map(({ label, role }) => (
                          <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60">
                            <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">{label}</span>
                            <span className="text-[10px] text-zinc-400 font-medium">{role}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-600 mt-4 font-medium">
                        © {new Date().getFullYear()} JPCS DLSAU. All rights reserved.
                      </p>
                    </div>
                  </div>

                </ErrorBoundary>
              </motion.div>
            )}

          </AnimatePresence>{/* ✅ FIX 2: AnimatePresence wraps ALL 6 views */}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-3 mb-3 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] shadow-2xl transition-colors duration-300">
          <div className="flex items-center justify-between px-2 py-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
                  className={`relative flex flex-col items-center justify-center transition-all duration-300 ease-out rounded-2xl
                    ${isActive
                      ? 'bg-[#06402B] dark:bg-emerald-600 text-white px-4 py-3 shadow-md'
                      : 'text-zinc-400 dark:text-zinc-500 p-3 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobileNavGlow"
                      className="absolute inset-0 bg-[#06402B] dark:bg-emerald-600 rounded-2xl shadow-[0_0_20px_rgba(6,64,43,0.4)] dark:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    />
                  )}
                  <span className={`relative z-10 transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                    {item.icon}
                  </span>
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10 text-[9px] font-black uppercase tracking-widest whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* COMMAND CENTER */}
      <CommandCenter
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        activeTasks={mergedActiveTasks}
        friends={friendsList}
        onAddTask={handleAddGeneralTask}
        onToggleTask={toggleTaskStatus}
        onDeleteTask={deleteTask}
        onNavigate={(view) => setActiveView(view)}
      />

    </div>
  );
}

export default function DashboardClient() {
  return (
    <ModalProvider>
      <DashboardInner />
    </ModalProvider>
  );
}