"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from 'next/dynamic'; 
import Image from "next/image";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {  FaCalculator, FaLayerGroup, FaTasks, FaSignOutAlt, FaPlus, FaCheckCircle, 
  FaTachometerAlt, FaGlobe, FaClock, FaUserFriends, FaChevronRight, 
  FaCog, FaSun, FaMoon, FaDesktop, FaPalette, FaIdBadge, FaSave, FaCamera, 
  FaFolderOpen, FaCalendarDay, FaQuoteLeft, FaBook, FaFire, FaChartBar, FaListUl, FaFacebook, FaInstagram, FaExternalLinkAlt, FaHeart, FaExclamationCircle, FaSpinner, FaLightbulb, FaTrashAlt
} from "react-icons/fa";
import { FaBrain } from "react-icons/fa6";
import { ModalProvider, useModal } from "../context/ModalContext";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, documentId, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { auth, db, storage } from "@/lib/db"; 


import FloatingCubes from "../components/FloatingCubes"; 
import CommandCenter from "../components/Layout/CommandCenter";
import ErrorBoundary from "../components/ErrorBoundary";

// --- SAFE DYNAMIC IMPORTS ---
const DashboardScheduleMaker = dynamic(() => import('../components/Tools/DashboardScheduleMaker'), { ssr: false });
const GradeCalculator = dynamic(() => import('../components/Tools/GradeCalculator'));
const GWACalculator = dynamic(() => import('../components/Tools/GWACalculator'));
const FlashcardMaker = dynamic(() => import('../components/Tools/FlashcardMaker'), { ssr: false });
const FlashcardExchange = dynamic(() => import('../components/Community/FlashcardExchange'), { ssr: false });
const StudyLounge = dynamic(() => import('../components/Community/StudyLounge'), { ssr: false });
const UniversityTracker: any = dynamic(() => import('../components/Tools/UniversityTracker'), { ssr: false });
const AcademicCalendar = dynamic(() => import('../components/Community/AcademicCalendar').then(mod => mod.default), { ssr: false });
const CampusBulletin = dynamic(() => import('../components/Community/CampusBulletin'), { ssr: false });
const Feedback = dynamic(() => import('../components/Community/Feedback'), { ssr: false });
import OnboardingFlow from "../components/Onboarding/OnboardingFlow";

const COLLEGE_LOGOS: Record<string, string> = {
  CAST:  "/College/cast1.png",  // matches your actual filename
  CBMA:  "/College/cbma.png",
  CVMAS: "/College/cvmas.png",  // matches your actual filename
  COED:  "/College/coed.png",
};

// (removed unused COLLEGE_BADGE_CLASSES)

const NAV_ITEMS = [
  { id: 'dashboard', icon: <FaTachometerAlt size={20} />, label: "Home" },
  { id: 'tracker', icon: <FaFolderOpen size={20} />, label: "Tracker" },
  { id: 'academics', icon: <FaBook size={20} />, label: "Academics" },
  { id: 'studyhub', icon: <FaBrain size={20} />, label: "Study Hub" },
  { id: 'calendar', icon: <FaCalendarDay size={20} />, label: "Calendar" },
  { id: 'settings', icon: <FaCog size={20} />, label: "Settings" },
];
function isUserOnline(user: any): boolean {
  if (user?.isOnline === true) {
    if (user?.lastSeen) {
      const lastSeenMs = user.lastSeen?.toMillis?.() ?? new Date(user.lastSeen).getTime();
      return Date.now() - lastSeenMs < 5 * 60 * 1000;
    }
    return true;
  }
  return false;
}

function getLastSeen(user: any): string {
  if (!user?.lastSeen) return "Offline";
  const lastSeenMs = user.lastSeen?.toMillis?.() ?? new Date(user.lastSeen).getTime();
  const diff = Date.now() - lastSeenMs;
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 2)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24)  return `${hrs}h ago`;
  if (days < 7)  return `${days}d ago`;
  return "A while ago";
}

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

// ─── Admin Feedback Inbox ─────────────────────────────────────────────────────

const FEEDBACK_CATEGORY_META: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Feature Request": { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",   border: "border-amber-500/20",   dot: "bg-amber-500"   },
  "Bug Report":      { bg: "bg-red-500/10",      text: "text-red-600 dark:text-red-400",       border: "border-red-500/20",     dot: "bg-red-500"     },
  "General Feedback":{ bg: "bg-blue-500/10",     text: "text-blue-600 dark:text-blue-400",     border: "border-blue-500/20",    dot: "bg-blue-500"    },
  "Content":         { bg: "bg-violet-500/10",   text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20",  dot: "bg-violet-500"  },
  "Performance":     { bg: "bg-[#06402B]/10",    text: "text-[#06402B] dark:text-emerald-400", border: "border-[#06402B]/20",   dot: "bg-[#06402B]"   },
};

const SATISFACTION_META: Record<string, { emoji: string; label: string; color: string }> = {
  love:    { emoji: "😊", label: "Love it",    color: "text-emerald-600 dark:text-emerald-400" },
  okay:    { emoji: "😐", label: "It's okay",  color: "text-amber-600 dark:text-amber-400"     },
  improve: { emoji: "😟", label: "Needs work", color: "text-red-600 dark:text-red-400"         },
};

function AdminFeedbackInbox() {
  const [feedbacks, setFeedbacks]           = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [filterCat, setFilterCat]           = useState<string>("All");
  const [filterSat, setFilterSat]           = useState<string>("All");
  const [isOpen, setIsOpen]                 = useState(true);

  useEffect(() => {
    const { collection: col, query: q, orderBy: ob, onSnapshot: ons } =
      { collection, query, orderBy, onSnapshot };

    const unsub = ons(
      q(col(db, "feedback"), ob("createdAt", "desc")),
      snap => {
        setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      err => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    const { deleteDoc: dd, doc: dc } = { deleteDoc, doc };
    await dd(dc(db, "feedback", id));
    if (expandedId === id) setExpandedId(null);
  };

  const cats    = ["All", ...Array.from(new Set(feedbacks.map(f => f.category).filter(Boolean)))];
  const filtered = feedbacks
    .filter(f => filterCat === "All" || f.category === filterCat)
    .filter(f => filterSat === "All" || f.satisfaction === filterSat);

  const unread = feedbacks.length;

  const timeAgo = (ts: any) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 shadow-xl transition-colors duration-300 w-full overflow-hidden">

      {/* Header — toggleable */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between p-6 md:p-8 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FaLightbulb size={15} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center gap-2 leading-none">
              Feedback Inbox
              {unread > 0 && (
                <span className="px-2 py-0.5 bg-[#06402B] dark:bg-emerald-600 text-white text-[9px] font-black rounded-full">
                  {unread}
                </span>
              )}
            </h3>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Admin only · All submitted feedback</p>
          </div>
        </div>
        <FaChevronRight
          size={13}
          className={`text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-6 md:px-8 pb-6 md:pb-8 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-5">

              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Category filter */}
                <div className="flex gap-1.5 flex-wrap">
                  {cats.map(cat => {
                    const m = cat !== "All" ? FEEDBACK_CATEGORY_META[cat] : null;
                    const isActive = filterCat === cat;
                    return (
                      <button key={cat} onClick={() => setFilterCat(cat)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all touch-manipulation ${
                          isActive && m ? `${m.bg} ${m.text} ${m.border}`
                          : isActive ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                        }`}>
                        {cat}
                      </button>
                    );
                  })}
                </div>

                <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

                {/* Satisfaction filter */}
                <div className="flex gap-1.5">
                  {["All", "love", "okay", "improve"].map(sat => {
                    const m = sat !== "All" ? SATISFACTION_META[sat] : null;
                    return (
                      <button key={sat} onClick={() => setFilterSat(sat)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all touch-manipulation ${
                          filterSat === sat
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                        }`}>
                        {m ? `${m.emoji} ${m.label}` : "All Moods"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Count */}
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {filtered.length} response{filtered.length !== 1 ? "s" : ""}
                {(filterCat !== "All" || filterSat !== "All") && " (filtered)"}
              </p>

              {/* List */}
              {loading ? (
                <div className="py-12 flex items-center justify-center">
                  <span className="w-8 h-8 rounded-full border-4 border-[#06402B]/30 border-t-[#06402B] animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center gap-3 text-zinc-400">
                  <FaLightbulb size={28} className="opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">No feedback yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {filtered.map(fb => {
                      const catMeta = FEEDBACK_CATEGORY_META[fb.category] ?? FEEDBACK_CATEGORY_META["General Feedback"];
                      const satMeta = fb.satisfaction ? SATISFACTION_META[fb.satisfaction] : null;
                      const isExpanded = expandedId === fb.id;

                      return (
                        <motion.div
                          key={fb.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          className={`rounded-2xl border overflow-hidden transition-all ${
                            isExpanded
                              ? "border-[#06402B]/30 dark:border-emerald-500/30 bg-[#06402B]/5 dark:bg-emerald-500/5"
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          {/* Row */}
                          <button
                            onClick={() => setExpandedId(prev => prev === fb.id ? null : fb.id)}
                            className="w-full flex items-start gap-3 p-4 text-left"
                          >
                            {/* Left accent dot */}
                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${catMeta.dot}`} />

                            <div className="flex-1 min-w-0">
                              {/* Top row */}
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${catMeta.bg} ${catMeta.text} ${catMeta.border}`}>
                                  {fb.category}
                                </span>
                                {satMeta && (
                                  <span className={`text-[9px] font-bold ${satMeta.color}`}>
                                    {satMeta.emoji} {satMeta.label}
                                  </span>
                                )}
                                <span className="text-[9px] font-mono text-zinc-400 ml-auto shrink-0">
                                  {timeAgo(fb.createdAt)}
                                </span>
                              </div>

                              {/* Title */}
                              <p className="text-sm font-black text-zinc-900 dark:text-white leading-snug truncate">
                                {fb.title || "Untitled"}
                              </p>

                              {/* Submitter */}
                              <p className="text-[10px] font-medium text-zinc-400 mt-0.5 truncate">
                                {fb.anonymous ? "Anonymous" : (fb.displayName || fb.email || "Unknown user")}
                              </p>
                            </div>

                            <FaChevronRight
                              size={10}
                              className={`shrink-0 text-zinc-400 mt-1 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </button>

                          {/* Expanded body */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-1 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                                  {/* Message */}
                                  <p className="text-sm text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap">
                                    {fb.message || <span className="italic text-zinc-400">No message provided.</span>}
                                  </p>

                                  {/* Meta row */}
                                  <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                    {fb.email && !fb.anonymous && (
                                      <a href={`mailto:${fb.email}`}
                                        className="text-[10px] font-bold text-[#06402B] dark:text-emerald-400 hover:underline"
                                        onClick={e => e.stopPropagation()}>
                                        ✉ {fb.email}
                                      </a>
                                    )}
                                    {fb.userId && !fb.anonymous && (
                                      <span className="text-[10px] font-mono text-zinc-400">
                                        uid: {fb.userId.slice(0, 8)}…
                                      </span>
                                    )}
                                    <button
                                      onClick={e => { e.stopPropagation(); handleDelete(fb.id); }}
                                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors touch-manipulation"
                                    >
                                      <FaTrashAlt size={9} /> Delete
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


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
  const [, setPresenceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPresenceTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

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
const [defaultCourseId, setDefaultCourseId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [scheduleClasses, setScheduleClasses] = useState<any[]>([]);
  const [networkBlocked, setNetworkBlocked] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jpcs_schedule_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        setScheduleClasses(parsed.classes || []);
      }
    } catch { /* ignore */ }
  }, []);
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
  let heartbeatInterval: NodeJS.Timeout;
  let offlineTimer: NodeJS.Timeout;
  let isCurrentlyOnline = false;

  const setOnline = async () => {
    if (isCurrentlyOnline) return; // debounce — don't spam if already marked online
    isCurrentlyOnline = true;
    clearTimeout(offlineTimer);
    try {
      await updateDoc(userRef, {
        isOnline: true,
        lastSeen: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Presence setOnline failed:", err);
    }
  };
  

  const setOffline = async () => {
    isCurrentlyOnline = false;
    clearInterval(heartbeatInterval);
    try {
      await updateDoc(userRef, {
        isOnline: false,
        lastSeen: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Presence setOffline failed:", err);
    }
  };

  const startHeartbeat = () => {
    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        await updateDoc(userRef, { lastSeen: new Date().toISOString() });
      } catch (err) {
        console.warn("Heartbeat failed:", err);
      }
    }, 60_000); // ping every 60 seconds
  };

  const handleVisible = () => {
    clearTimeout(offlineTimer);
    setOnline();
    startHeartbeat();
  };

  const handleHidden = () => {
    // Give a 90s grace period — phone screen off, quick tab switch, etc.
    offlineTimer = setTimeout(() => setOffline(), 90_000);
  };

  const handlePageHide = () => {
    clearInterval(heartbeatInterval);
    clearTimeout(offlineTimer);
    setOffline();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      handleVisible();
    } else {
      handleHidden();
    }
  };

  // Boot
  setOnline();
  startHeartbeat();

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", handlePageHide);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", handlePageHide);
    clearInterval(heartbeatInterval);
    clearTimeout(offlineTimer);
    // DO NOT call setOffline() here — React 18 strict mode fires cleanup constantly
  };
}, [authUser]);
useEffect(() => {
    let unsubFriends = () => {};
    let unsubTasks = () => {};
    let unsubCourseTasks = () => {};
    let unsubCourses = () => {};

    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
      setAuthReady(true);
      // Show network warning if still not logged in after 8s
      if (!authUser) {
        setNetworkBlocked(true);
      }
    }, 8000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) { clearTimeout(safetyTimer); }
      if (!user) {
        setAuthReady(true); // ← unblock the loading screen even when redirecting
        return router.push("/Workspace");
      }
      setAuthUser(user);
      
      let unsubFriends = () => {}; 

      try {
const userDoc = await getDoc(doc(db, "users", user.uid));
if (userDoc.exists()) {
  const data = userDoc.data();

  // ✅ Wipe broken blob URLs that were accidentally saved to Firestore
  if (data.avatarUrl?.startsWith("blob:")) {
    await updateDoc(doc(db, "users", user.uid), { avatarUrl: "" });
    data.avatarUrl = "";
  }

  setUserProfile(data);
  setEditBio(data.bio || "");
  setEditYearLevel(data.yearLevel || "1st Year");
  setEditAvatarUrl(data.avatarUrl || "");
  setEditCollege(data.college || "");
          if (!data.hasSeenOnboarding) {
            setShowOnboarding(true);
          }

          if (data.friends && data.friends.length > 0) {
            const friendsQuery = query(collection(db, "users"), where(documentId(), "in", data.friends.slice(0, 10)));
            unsubFriends = onSnapshot(friendsQuery, (snap) => setFriendsList(snap.docs.map(d => ({ uid: d.id, ...d.data() }))));
          }
        }
        } catch (err) {
        console.error("Failed to load user profile:", err);
        setUserProfile({ fullName: user.displayName || "Scholar" });
} finally {
        clearTimeout(safetyTimer);
        setIsLoading(false);
        setAuthReady(true);
      }
      const tryRealtime = (
        q: any,
        setter: (data: any[]) => void,
        onFirstResult?: () => void
      ): Promise<() => void> => {
        return new Promise((resolve) => {
          let settled = false;

          const fallbackTimer = setTimeout(async () => {
            if (settled) return;
            settled = true;
            try {
              const snap = await getDocs(q);
              setter(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
            } catch (err) {
              console.error("Fallback getDocs failed:", err);
            }
            onFirstResult?.();
            resolve(() => {});
          }, 4000);

          const unsub = onSnapshot(
            q,
            (snap: any) => {
              if (!settled) {
                settled = true;
                clearTimeout(fallbackTimer);
              }
              setter(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
              onFirstResult?.();
              if (!settled) resolve(unsub);
              else resolve(unsub);
            },
            (err: any) => {
              if (!settled) {
                settled = true;
                clearTimeout(fallbackTimer);
              }
              console.error("onSnapshot error, falling back:", err);
              getDocs(q)
                .then(snap => setter(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))))
                .catch(() => {})
                .finally(() => { onFirstResult?.(); });
              resolve(() => {});
            }
          );
        });
      };

      // onFirstResult on course_tasks is what unblocks the loading screen
      Promise.all([
        tryRealtime(
          query(collection(db, "tasks"), where("userId", "==", user.uid), orderBy("createdAt", "desc")),
          setGeneralTasks
        ),
        tryRealtime(
          query(collection(db, "course_tasks"), where("userId", "==", user.uid)),
          setCourseTasks,
          () => {
            clearTimeout(safetyTimer);
            setIsLoading(false);
            setAuthReady(true);
          }
        ),
        tryRealtime(
          query(collection(db, "courses"), where("userId", "==", user.uid), orderBy("createdAt", "asc")),
          setCourses
        ),
      ]).then(([u1, u2, u3]) => {
        unsubTasks = u1;
        unsubCourseTasks = u2;
        unsubCourses = u3;
      });
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribeAuth();
      unsubFriends();
      unsubTasks();
      unsubCourseTasks();
      unsubCourses();
    };
  }, [router]);

  useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || isStudying) return;

    // Alt + number to switch views
    if (e.altKey) {
      const map: Record<string, string> = {
        '1': 'dashboard',
        '2': 'tracker',
        '3': 'academics',
        '4': 'studyhub',
        '5': 'calendar',
        '6': 'settings',
      };
      if (map[e.key]) {
        e.preventDefault();
        setActiveView(map[e.key]);
      }
    }

    // G shortcuts (like Gmail) — only when no modifier
    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
      if (e.key === 'g') {
        // Wait for next key
        const next = (e2: KeyboardEvent) => {
          window.removeEventListener('keydown', next);
          if (e2.key === 'h') setActiveView('dashboard');
          if (e2.key === 't') setActiveView('tracker');
          if (e2.key === 'a') setActiveView('academics');
          if (e2.key === 's') setActiveView('studyhub');
          if (e2.key === 'c') setActiveView('calendar');
        };
        window.addEventListener('keydown', next, { once: true });
      }
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [isStudying]);

useEffect(() => {
  if (isStudying) return;

  const views = ['dashboard', 'tracker', 'academics', 'studyhub', 'calendar', 'settings'];
  let touchStartX = 0;
  let touchStartY = 0;

  const onTouchStart = (e: TouchEvent) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const onTouchEnd = (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    // Only trigger if horizontal swipe is dominant and large enough
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.8) return;

    // Only trigger from the edges (first/last 20% of screen width)
    const screenW = window.innerWidth;
    const isEdgeSwipe = touchStartX < screenW * 0.2 || touchStartX > screenW * 0.8;
    if (!isEdgeSwipe) return;

    const currentIdx = views.indexOf(activeView);
    if (dx < 0 && currentIdx < views.length - 1) {
      setActiveView(views[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      setActiveView(views[currentIdx - 1]);
    }
  };

  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  return () => {
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
  };
}, [activeView, isStudying]);

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
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      return showAlert("File Too Large", "Please select an image file under 5MB.");
    }
    setAvatarFile(file); // ✅ actual file stored for upload
    setEditAvatarUrl(URL.createObjectURL(file)); // ✅ blob only used for preview in the UI
  }
};

const handleSaveProfile = async () => {
  if (!authUser) return;
  setIsSavingProfile(true);
  try {
    let finalAvatarUrl = userProfile?.avatarUrl || ""; // ✅ start from the saved URL, not editAvatarUrl

    if (avatarFile) {
      const fileRef = ref(storage, `avatars/${authUser.uid}`);
      await uploadBytes(fileRef, avatarFile);
      finalAvatarUrl = await getDownloadURL(fileRef);

      // ✅ Revoke the blob URL to free memory
      if (editAvatarUrl.startsWith("blob:")) {
        URL.revokeObjectURL(editAvatarUrl);
      }
    }

    await updateDoc(doc(db, "users", authUser.uid), {
      bio: editBio,
      yearLevel: editYearLevel,
      avatarUrl: finalAvatarUrl,
      college: editCollege,
    });

    // ✅ Update local state with the real Firebase URL
    setEditAvatarUrl(finalAvatarUrl);
    setUserProfile((prev: any) => ({
      ...prev,
      avatarUrl: finalAvatarUrl,
      bio: editBio,
      yearLevel: editYearLevel,
      college: editCollege,
    }));
    setAvatarFile(null);
    showAlert("Profile Updated", "Your profile has been saved.");
  } catch (error) {
    console.error(error);
    showAlert("Save Failed", "Something went wrong. Please try again.");
  } finally {
    setIsSavingProfile(false);
  }
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

  if (isLoading) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#09090b] gap-4 px-6">
      {!networkBlocked ? (
        <>
          <span className="w-12 h-12 rounded-full border-4 border-[#06402B]/30 border-t-[#06402B] animate-spin"/>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Loading workspace…</p>
        </>
      ) : (
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight">Network Restricted</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
              Your current network is blocking Google services. Try one of these:
            </p>
          </div>
          <div className="w-full space-y-2 text-left">
            {[
              { icon: "📱", label: "Switch to mobile data", sub: "Most reliable fix" },
              { icon: "🔄", label: "Use Cloudflare WARP", sub: "Free app — 1.1.1.1" },
              { icon: "🌐", label: "Try a VPN browser extension", sub: "Windscribe or ProtonVPN" },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                <span className="text-lg shrink-0">{item.icon}</span>
                <div>
                  <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">{item.label}</p>
                  <p className="text-[10px] text-zinc-400 font-medium">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setNetworkBlocked(false); setIsLoading(true); window.location.reload(); }}
            className="w-full py-3 bg-[#06402B] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#042d1f] transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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
                {isActive && (activeView === 'studyhub' || activeView === 'academics') && (
                  <div className="absolute -top-1 right-1 w-2 h-2 rounded-full bg-amber-400 border-2 border-white dark:border-[#09090b] z-20" title="Has sub-sections" />
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

<span className="relative z-10 text-[9px] font-mono tracking-widest uppercase leading-none">
  {item.label}
</span>
{isActive && activeView === 'academics' && (
  <span className="relative z-10 text-[8px] font-bold text-emerald-300 dark:text-emerald-500 uppercase tracking-wider leading-none -mt-0.5 truncate max-w-[60px]">
    {academicTab === 'schedule' ? 'Schedule' : 'Grades'}
  </span>
)}
{isActive && activeView === 'studyhub' && (
  <span className="relative z-10 text-[8px] font-bold text-emerald-300 dark:text-emerald-500 uppercase tracking-wider leading-none -mt-0.5 truncate max-w-[60px]">
    {studyTab === 'cards' ? 'Vault' : studyTab === 'exchange' ? 'Exchange' : 'Lounge'}
  </span>
)}
<div className="absolute left-full ml-4 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-x-1 group-hover:translate-x-0 shadow-xl z-50 flex items-center gap-2">
  {item.label}
  <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[9px] font-normal">
    Alt+{NAV_ITEMS.findIndex(n => n.id === item.id) + 1}
  </span>
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

  {/* College badge — between name and avatar */}

  {/* Avatar */}
  <div
    className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-200 dark:bg-[#18181b] flex items-center justify-center text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 relative cursor-pointer shrink-0 overflow-hidden shadow-sm"
    onClick={() => setActiveView('settings')}
  >
    {userProfile?.avatarUrl
      ? <Image src={userProfile.avatarUrl} alt="Avatar" fill sizes="40px" className="object-cover" />
      : <span className="font-bold text-sm">{userProfile?.fullName?.charAt(0) || "U"}</span>}
        <div className={`absolute top-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full border-2 border-white dark:border-[#09090b] z-10 ${isUserOnline(userProfile) ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`} />
  </div>
{userProfile?.college && COLLEGE_LOGOS[userProfile.college] && (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className="hidden sm:flex w-7 h-7 md:w-9 md:h-9 shrink-0 relative"
    title={userProfile.college}
  >
    <Image
      src={COLLEGE_LOGOS[userProfile.college]}
      alt={userProfile.college}
      fill
      sizes="36px"
      className="object-contain dark:brightness-0 dark:invert"      
    />
  </motion.div>
)}
  <div className="w-px h-6 md:h-8 bg-zinc-200 dark:bg-zinc-800 mx-1 md:mx-2 shrink-0" />

<button
  onClick={() => setIsQueueOpen(!isQueueOpen)}
  className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 shrink-0 ${
    isQueueOpen
      ? 'bg-[#06402B] dark:bg-emerald-600 text-white shadow-[0_0_15px_rgba(6,64,43,0.3)]'
      : 'bg-zinc-100 dark:bg-[#18181b] text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400'
  }`}
>
  {isQueueOpen ? <FaChevronRight size={12} /> : <FaTasks size={14} />}
  <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">
    {isQueueOpen ? 'Close' : 'Tasks'}
  </span>
  {!isQueueOpen && mergedActiveTasks.length > 0 && (
    <span className="hidden lg:flex w-4 h-4 rounded-full bg-orange-500 text-white text-[8px] font-black items-center justify-center">
      {mergedActiveTasks.length > 9 ? '9+' : mergedActiveTasks.length}
    </span>
  )}
</button>
</div>


        </header>

<div className="flex-1 overflow-x-clip overflow-y-auto pb-28 md:pb-8 custom-scrollbar relative z-10 w-full flex flex-col">

  {/* ── Breadcrumb ── */}
  {activeView !== 'dashboard' && (
    <div className="shrink-0 px-4 sm:px-6 md:px-8 pt-4 pb-0">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
        <button
          onClick={() => setActiveView('dashboard')}
          className="hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors touch-manipulation"
        >
          Home
        </button>
        <FaChevronRight size={7} className="opacity-40" />
        <span className="text-zinc-700 dark:text-zinc-300">
          {activeView === 'tracker'   && 'University Tracker'}
          {activeView === 'academics' && 'Academics'}
          {activeView === 'studyhub'  && 'Study Hub'}
          {activeView === 'calendar'  && 'Calendar'}
          {activeView === 'settings'  && 'Settings'}
        </span>
        {activeView === 'academics' && (
          <>
            <FaChevronRight size={7} className="opacity-40" />
            <span className="text-[#06402B] dark:text-emerald-400">
              {academicTab === 'schedule' ? 'Schedule Canvas' : 'Grade Analytics'}
            </span>
          </>
        )}
        {activeView === 'studyhub' && (
          <>
            <FaChevronRight size={7} className="opacity-40" />
            <span className="text-[#06402B] dark:text-emerald-400">
              {studyTab === 'cards' ? 'Flashcard Vault' : studyTab === 'exchange' ? 'Global Exchange' : 'Study Lounge'}
            </span>
          </>
        )}
      </div>
    </div>
  )}

  {/* ── All views ── */}
  {/* ── All views ── */}
  <div className="flex-1 p-4 sm:p-6 md:p-8 pt-3">
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
    {/* ── ROW 1: Greeting + Quote ── */}
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

    {/* ── ROW 2: Clickable stat pills ── */}
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {[
        {
          label: "Done", value: totalCompleted,
          color: "text-[#06402B] dark:text-emerald-400",
          bg: "bg-[#06402B]/5 dark:bg-emerald-500/10",
          border: "border-[#06402B]/10 dark:border-emerald-500/20",
          icon: <FaCheckCircle size={12} />,
          onClick: () => setActiveView("tracker"),
          hint: "Open Tracker",
        },
        {
          label: "Active", value: currentWorkload,
          color: "text-orange-600 dark:text-orange-400",
          bg: "bg-orange-500/5 dark:bg-orange-500/10",
          border: "border-orange-500/10 dark:border-orange-500/20",
          icon: <FaTasks size={12} />,
          onClick: () => setActiveView("tracker"),
          hint: "Open Tracker",
        },
        {
          label: "Network", value: friendsList.length,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-500/5 dark:bg-blue-500/10",
          border: "border-blue-500/10 dark:border-blue-500/20",
          icon: <FaUserFriends size={12} />,
          onClick: () => { setActiveView("studyhub"); setStudyTab("lounge"); },
          hint: "Study Lounge",
        },
      ].map((s) => (
        <button
          key={s.label}
          onClick={s.onClick}
          title={s.hint}
          className={`group flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl border ${s.bg} ${s.border} hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer text-left w-full`}
        >
          <span className={`${s.color} shrink-0 group-hover:scale-110 transition-transform`}>{s.icon}</span>
          <div className="min-w-0">
            <p className={`text-xl sm:text-2xl font-black leading-none ${s.color}`}>{s.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mt-0.5">{s.label}</p>
          </div>
          <FaChevronRight size={8} className={`ml-auto shrink-0 ${s.color} opacity-0 group-hover:opacity-60 transition-opacity`} />
        </button>
      ))}
    </div>
    {/* ── Exam Countdown ── */}
{(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = courseTasks
    .filter(t =>
      (t.type === "Midterm Exam" || t.type === "Final Exam") &&
      t.status === "OPEN" &&
      t.deadline
    )
    .map(t => {
      const course = courses.find(c => c.id === t.courseId);
      const dueDate = new Date(t.deadline + "T00:00:00");
      const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
      return { ...t, courseTitle: course?.title, courseColor: course?.color, daysLeft };
    })
    .filter(t => t.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  if (!upcoming) return null;

  const urgency = upcoming.daysLeft <= 3
    ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
    : upcoming.daysLeft <= 7
    ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
    : "bg-[#06402B]/5 border-[#06402B]/20 text-[#06402B] dark:text-emerald-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setActiveView("tracker")}
      className={`flex items-center gap-4 px-4 py-3 rounded-2xl border cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all ${urgency}`}
    >
      <div className="text-center shrink-0 w-12">
        <p className="text-2xl font-black leading-none">{upcoming.daysLeft}</p>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-70">
          {upcoming.daysLeft === 1 ? "day" : "days"}
        </p>
      </div>
      <div className="w-px h-8 bg-current opacity-20 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black uppercase tracking-tight truncate">
          {upcoming.type}
        </p>
        <p className="text-[11px] font-bold opacity-70 truncate">
          {upcoming.courseTitle} · Due {new Date(upcoming.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
      </div>
      <FaChevronRight size={10} className="shrink-0 opacity-40" />
    </motion.div>
  );
})()}

    {/* ── ROW 3: Main panels ── */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

      {/* ── Col 1: UP NEXT ── */}
      <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800/80 p-4 sm:p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FaFire className="text-orange-500" /> Up Next
          </h3>
          <div className="flex items-center gap-2">
            {/* Overdue count badge */}
            {mergedActiveTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed' && t.status !== 'Graded').length > 0 && (
              <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                {mergedActiveTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed' && t.status !== 'Graded').length} overdue
              </span>
            )}
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">48 hrs</span>
          </div>
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

        {/* Quick task shortcuts */}
        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Quick Nav</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Tracker", icon: <FaFolderOpen size={10} />, view: "tracker" },
              { label: "Calendar", icon: <FaCalendarDay size={10} />, view: "calendar" },
              { label: "Academics", icon: <FaBook size={10} />, view: "academics" },
              { label: "Study Hub", icon: <FaBrain size={10} />, view: "studyhub" },
            ].map(nav => (
              <button
                key={nav.label}
                onClick={() => setActiveView(nav.view)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:border-[#06402B]/30 transition-all active:scale-95"
              >
                <span className="text-[#06402B] dark:text-emerald-400">{nav.icon}</span>
                {nav.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Col 2: GRADES ── */}
      <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800/80 p-4 sm:p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FaChartBar className="text-[#06402B] dark:text-emerald-400" /> Grades
          </h3>
          <button
            onClick={() => { setActiveView("academics"); setAcademicTab("grades"); }}
            className="text-[9px] font-bold uppercase tracking-widest text-[#06402B] dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            Full <FaChevronRight size={7} />
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
                <button
                  key={cg.courseId}
                  onClick={() => setActiveView("tracker")}
                  className="space-y-1 text-left group hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate flex-1 group-hover:text-[#06402B] dark:group-hover:text-emerald-400 transition-colors">{cg.title}</p>
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
                </button>
              );
            })
          )}
        </div>

        {/* Activity heatmap */}
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

      {/* ── Col 3: FRIENDS ONLINE + BULLETIN ── */}
      <div className="flex flex-col gap-4">

        {/* Friends online strip — only if there are online friends */}
                {friendsList.filter(f => isUserOnline(f)).length > 0 && (

          <div
            onClick={() => { setActiveView("studyhub"); setStudyTab("lounge"); }}
            className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800/80 p-4 shadow-sm cursor-pointer hover:border-emerald-500/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Online Now
              </h3>
              <span className="text-[9px] font-bold text-emerald-500 group-hover:underline">
                {friendsList.filter(f => isUserOnline(f)).length} online →
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {friendsList.filter(f => isUserOnline(f)).slice(0, 5).map(friend => (
                <div key={friend.uid} className="relative" title={friend.fullName}>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-500 shadow-sm">
                    {friend.avatarUrl
                      ? <img src={friend.avatarUrl} alt={friend.fullName} className="w-full h-full object-cover" />
                      : friend.fullName?.charAt(0) || "?"
                    }
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
                </div>
              ))}
              {friendsList.filter(f => isUserOnline(f)).length > 5 && (
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-500">
                  +{friendsList.filter(f => isUserOnline(f)).length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campus bulletin */}
        <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800/80 p-4 sm:p-5 shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto lg:max-h-[380px] custom-scrollbar">
            <CampusBulletin />
          </div>
        </div>
      </div>

    </div>
  </motion.div>
)}

            {/* === 2. TRACKER === */}
{activeView === 'tracker' && (
  <motion.div key="tracker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-7xl mx-auto space-y-6">
    <ErrorBoundary fallbackTitle="Tracker Error">
      <UniversityTracker
        defaultCourseId={defaultCourseId}
        onCourseSelected={() => setDefaultCourseId(null)}
      />
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
                  <AcademicCalendar
  userTasks={allCalendarTasks}
  scheduleClasses={scheduleClasses}
  courses={courses}
  courseTasks={courseTasks}
/>
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
        {editAvatarUrl
          ? <Image src={editAvatarUrl} alt="Avatar" fill sizes="128px" className="object-cover" />
          : <span>{userProfile?.fullName?.charAt(0) || "U"}</span>
        }
        <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 backdrop-blur-sm">
          <FaCamera size={24} /><span className="text-[10px] font-bold uppercase tracking-widest mt-2">Change</span>
        </label>
        <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
          {userProfile?.username ? `@${userProfile.username}` : ""}
        </p>
      </div>

      {/* ✅ No avatar warning */}
      {!editAvatarUrl ? (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <FaExclamationCircle size={11} className="text-amber-500 shrink-0" />
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
            No avatar saved — upload one
          </p>
        </div>
      ) : (
        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Tap to Upload</p>
      )}
    </div>

    <div className="flex-1 space-y-5 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Full Name</label>
          <input type="text" value={userProfile?.fullName || ""} disabled className="w-full bg-zinc-100 dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800/80 rounded-xl px-4 py-3 text-sm font-bold text-zinc-500 dark:text-zinc-400 cursor-not-allowed" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1 block">Year Level</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {["1st Year","2nd Year","3rd Year","4th Year","5th Year","6th Year","Irregular"].map(yr => (
              <button
                key={yr}
                type="button"
                onClick={() => setEditYearLevel(yr)}
                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 touch-manipulation ${
                  editYearLevel === yr
                    ? "bg-[#06402B] dark:bg-emerald-600 text-white border-[#06402B] dark:border-emerald-600 shadow-sm"
                    : "bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                } ${yr === "Irregular" ? "col-span-3 sm:col-span-2" : ""}`}
              >
                {yr === "Irregular" ? "Irregular" : yr.replace(" Year", "")}
              </button>
            ))}
          </div>
        </div>
      </div>

                        {/* ── College ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { value: "CAST",  label: "CAST",  sub: "Arts, Sciences & Technology" },
                              { value: "CBMA",  label: "CBMA",  sub: "Business Management & Accountancy" },
                              { value: "COED",  label: "COED",  sub: "Education" },
                              { value: "CVMAS", label: "CVMAS", sub: "Veterinary Medicine & Agricultural Science" },
                            ].map(col => (
                              <button
                                key={col.value}
                                type="button"
                                onClick={() => setEditCollege(col.value)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all active:scale-95 touch-manipulation ${
                                  editCollege === col.value
                                    ? "bg-[#06402B]/10 dark:bg-emerald-500/10 border-[#06402B]/40 dark:border-emerald-500/40 shadow-sm"
                                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                }`}
                              >
                                {/* Color dot */}
                                <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                                  editCollege === col.value
                                    ? "bg-[#06402B] dark:bg-emerald-400"
                                    : "bg-zinc-300 dark:bg-zinc-700"
                                }`}/>
                                <div className="min-w-0">
                                  <p className={`text-xs font-black uppercase tracking-widest leading-none ${
                                    editCollege === col.value
                                      ? "text-[#06402B] dark:text-emerald-400"
                                      : "text-zinc-800 dark:text-zinc-200"
                                  }`}>
                                    {col.label}
                                  </p>
                                  <p className="text-[9px] font-medium text-zinc-400 leading-tight mt-0.5 truncate">{col.sub}</p>
                                </div>
                                {editCollege === col.value && (
                                  <FaCheckCircle size={12} className="text-[#06402B] dark:text-emerald-400 ml-auto shrink-0"/>
                                )}
                              </button>
                            ))}
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

                {/* ── Feedback ── */}
                  <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 p-6 md:p-8 shadow-xl transition-colors duration-300 w-full">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                      <FaLightbulb className="text-[#06402B] dark:text-emerald-400" /> Share Feedback
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-6">Help us make the Lasallian Terminal better for everyone.</p>
                    <Feedback />
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
                          { label: "Ice Matthew Ramirez ", role: "Developer" },
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

{/* ── Admin Feedback Inbox ── */}
                  {userProfile?.role === "admin" && (
                    <AdminFeedbackInbox />
                  )}

                </ErrorBoundary>
              </motion.div>
            )}

      </AnimatePresence>
    </div> {/* closes inner padding */}

  </div> {/* closes outer scrollable */}

</main>

      {/* MOBILE BOTTOM NAV */}
{/* MOBILE BOTTOM NAV */}
{!isStudying && (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
    <div className="mx-3 mb-3 bg-white/90 dark:bg-[#121214]/90 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] shadow-2xl transition-colors duration-300">

      {/* Context sub-tabs — shown when inside a section with sub-navigation */}
      <AnimatePresence>
        {(activeView === 'studyhub' || activeView === 'academics' || activeView === 'calendar') && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-zinc-100 dark:border-zinc-800 px-3 pt-2.5 pb-2"
          >
            <div className="flex items-center gap-1">
              {activeView === 'studyhub' && [
                { id: 'cards',    label: 'Vault',    icon: <FaLayerGroup size={11}/> },
                { id: 'exchange', label: 'Exchange', icon: <FaGlobe size={11}/> },
                { id: 'lounge',   label: 'Lounge',   icon: <FaUserFriends size={11}/> },
              ].map(tab => (
                <button key={tab.id}
                  onClick={() => setStudyTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    studyTab === tab.id
                      ? 'bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
              {activeView === 'academics' && [
                { id: 'schedule', label: 'Schedule', icon: <FaClock size={11}/> },
                { id: 'grades',   label: 'Grades',   icon: <FaCalculator size={11}/> },
              ].map(tab => (
                <button key={tab.id}
                  onClick={() => setAcademicTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    academicTab === tab.id
                      ? 'bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
              {activeView === 'calendar' && [
  { id: 'month',    label: 'Month',    icon: <FaCalendarDay size={11}/> },
  { id: 'list',     label: 'List',     icon: <FaListUl size={11}/> },
  { id: 'timeline', label: 'Timeline', icon: <FaChartBar size={11}/> },
].map(tab => (
  <button key={tab.id}
    onClick={() => {
      // You'd need to lift calendar view state up to DashboardClient
      // For now, navigate and let calendar handle it via prop
    }}
    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
  >
    {tab.icon}{tab.label}
  </button>
))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main nav */}
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
)}

      {/* COMMAND CENTER */}
<CommandCenter
  isOpen={isQueueOpen}
  onClose={() => setIsQueueOpen(false)}
  activeTasks={mergedActiveTasks}
  courses={courses}
  friends={friendsList.map(f => ({ ...f, isOnline: isUserOnline(f) }))}
  onAddTask={handleAddGeneralTask}
  onToggleTask={toggleTaskStatus}
  onDeleteTask={deleteTask}
  onNavigate={(view) => setActiveView(view)}
  courseTasks={courseTasks}
  onNavigateToCourse={(courseId) => {
    setDefaultCourseId(courseId);
    setActiveView('tracker');
  }}
  userProfile={userProfile}
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