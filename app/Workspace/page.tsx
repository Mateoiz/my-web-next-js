"use client";

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic'; 
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCalendarAlt, FaCalculator, FaLayerGroup, 
  FaArrowLeft, FaTasks, FaStickyNote, FaLock, FaUserCircle, FaGoogle, FaUserTag, FaTools 
} from "react-icons/fa";

// --- FIREBASE IMPORTS ---
import { signInWithPopup, User, EmailAuthProvider, linkWithCredential, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/db"; 

// --- BACKGROUND IMPORTS ---
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor"; 

// --- LAZY LOADING TOOLS ---
const ScheduleMaker = dynamic(() => import('../components/Tools/ScheduleMaker'), { loading: () => <ToolSkeleton />, ssr: false });
const GradeCalculator = dynamic(() => import('../components/Tools/GradeCalculator'));
const GWACalculator = dynamic(() => import('../components/Tools/GWACalculator'));
const FlashcardMaker = dynamic(() => import('../components/Tools/FlashcardMaker'), { ssr: false });

const ToolSkeleton = () => (
  <div className="w-full h-[600px] bg-white/50 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl animate-pulse flex flex-col items-center justify-center shadow-xl">
    <span className="w-8 h-8 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin mb-4" />
    <div className="text-zinc-400 font-mono text-xs font-bold tracking-widest uppercase">Initializing Module...</div>
  </div>
);

export default function WorkspaceHub() {
  
  const [activeTool, setActiveTool] = useState<'schedule' | 'calc' | 'flashcards' | null>(null);
  
  // --- AUTH & ONBOARDING STATES ---
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  
  // Setup Inputs
  const [nameInput, setNameInput] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [setupError, setSetupError] = useState("");
  
  const router = useRouter();

  // 0. AUTO-LOGIN CHECK
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().username) {
          router.push("/dashboard");
          return; 
        }
      }
      setIsCheckingSession(false);
    });
    return () => unsubscribe();
  }, [router]);

  // 1. Google Registration Trigger
  const handleGoogleRegister = async () => {
    setIsAuthenticating(true);
    setSetupError("");
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().username) {
        await auth.signOut(); 
        alert("You already have an account! Please log in with your Username and Password.");
        router.push("/login");
      } else {
        setAuthUser(user);
        setNameInput(user.displayName || ""); 
        setNeedsSetup(true);
        setIsAuthenticating(false);
      }
      
    } catch (error) {
      console.error("Error registering with Google", error);
      setIsAuthenticating(false);
    }
  };

  // 2. Finalize Registration
  const handleFinalizeSetup = async () => {
    setSetupError("");
    const cleanedName = nameInput.trim();
    const cleanedUsername = usernameInput.trim().toLowerCase();

    if (!cleanedName) return setSetupError("Please enter your display name.");
    if (cleanedUsername.length < 3) return setSetupError("Username must be at least 3 characters.");
    if (passwordInput.length < 6) return setSetupError("Password must be at least 6 characters.");
    if (/[^a-z0-9_]/.test(cleanedUsername)) return setSetupError("Only lowercase letters, numbers, and underscores.");

    setIsAuthenticating(true);
    try {
      if (!authUser || !authUser.email) throw new Error("Authentication sync lost. Please refresh.");

      const q = query(collection(db, "users"), where("username", "==", cleanedUsername));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setIsAuthenticating(false);
        return setSetupError("Username is already taken. Please choose another.");
      }

      const credential = EmailAuthProvider.credential(authUser.email, passwordInput);
      await linkWithCredential(authUser, credential);

      await setDoc(doc(db, "users", authUser.uid), {
        email: authUser.email,
        fullName: cleanedName, 
        username: cleanedUsername,
        role: "student",
        createdAt: serverTimestamp()
      });

      router.push("/dashboard");

    } catch (error: any) {
      console.error("Error finalizing setup:", error);
      setSetupError(error.message || "Failed to setup account. Try again.");
      setIsAuthenticating(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen pt-32 pb-32 flex flex-col items-center justify-center bg-zinc-50 dark:bg-black selection:bg-green-500/30">
        <span className="w-12 h-12 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin mb-6" />
        <div className="text-zinc-400 font-mono text-sm font-bold tracking-widest uppercase animate-pulse">Authenticating Session...</div>
      </div>
    );
  }

  return (
    <section className="min-h-screen pt-28 md:pt-32 pb-24 md:pb-32 px-4 md:px-8 relative overflow-hidden bg-zinc-50 dark:bg-black font-sans selection:bg-green-500/30 transition-colors duration-300">
      
      <div className="hidden md:block"><CircuitCursor /></div>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30 sm:opacity-60"><FloatingCubes /></div>
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-green-500/10 rounded-full blur-[100px] md:blur-[150px] pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <AnimatePresence mode="wait">
          
          {!activeTool && (
            <motion.div key="hub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 md:space-y-6">
              
              {/* --- 1. PREMIUM REGISTRATION BANNER (WITH COMING SOON OVERLAY) --- */}
              <div className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl group transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black dark:from-green-950 dark:to-zinc-950 z-0 transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 z-0 mix-blend-overlay" />
                
                <div className="relative z-10 p-6 md:p-12 border border-zinc-800 dark:border-green-500/30 rounded-[2rem] min-h-[200px] flex items-center">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full opacity-40 blur-[2px] select-none pointer-events-none">
                    <div className="text-left w-full md:w-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/10 border border-white/20 text-[10px] font-mono font-bold tracking-widest text-zinc-300 uppercase backdrop-blur-md shadow-sm">
                          <FaUserCircle /> Guest Mode
                      </div>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 md:mb-3 tracking-tight">Unlock Your Dashboard</h2>
                      <p className="text-zinc-400 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed">
                        Register an account to access the Task Tracker, Cloud Notes, and sync your schedule across devices.
                      </p>
                    </div>
                    <button disabled className="w-full md:w-auto shrink-0 relative px-6 md:px-8 py-4 bg-white text-black font-bold rounded-xl md:rounded-2xl flex items-center justify-center gap-3">
                        <FaGoogle /> Register with Google
                    </button>
                  </div>
                </div>

                {/* THE COMING SOON OVERLAY */}
                <div className="absolute inset-0 z-50 bg-zinc-900/20 dark:bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                   <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-2xl shadow-2xl transform -rotate-2 border border-white/10 dark:border-black/10">
                      <FaTools className="text-yellow-400 dark:text-yellow-500" /> Dashboard Coming Soon
                   </div>
                </div>
              </div>

              {/* --- 2. THE BENTO GRID --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                
                {/* Free Tool: Schedule Maker */}
                <motion.button 
                  onClick={() => setActiveTool('schedule')} 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }}
                  className="md:col-span-2 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 text-left group overflow-hidden relative shadow-lg hover:shadow-2xl hover:border-green-500/50 transition-all duration-300"
                >
                  <div className="absolute -right-5 -bottom-5 md:-right-10 md:-bottom-10 text-[8rem] md:text-[15rem] text-zinc-100 dark:text-zinc-800/30 group-hover:text-green-500/10 transition-colors z-0 pointer-events-none"><FaCalendarAlt /></div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-inner"><FaCalendarAlt className="text-xl md:text-2xl" /></div>
                    <h3 className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-white mb-2">Schedule Maker</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm md:text-lg max-w-[80%]">Design and export your aesthetic class schedule.</p>
                  </div>
                </motion.button>

                {/* Free Tool: Grade Calculator */}
                <motion.button 
                  onClick={() => setActiveTool('calc')} 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }}
                  className="bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 text-left group overflow-hidden relative shadow-lg hover:shadow-2xl hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between min-h-[200px] md:min-h-[250px]"
                >
                  <div className="relative z-10">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/10 text-blue-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-inner"><FaCalculator className="text-xl md:text-2xl" /></div>
                    <h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white mb-2 leading-tight">Grade<br/>Projections</h3>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium text-xs md:text-sm relative z-10">Calculate subject grades and GWA instantly.</p>
                </motion.button>

                {/* Free Tool: Flashcards */}
                <motion.button 
                  onClick={() => setActiveTool('flashcards')} 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }}
                  className="md:col-span-2 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 text-left group overflow-hidden relative shadow-lg hover:shadow-2xl hover:border-amber-500/50 transition-all duration-300"
                >
                  <div className="absolute -right-5 -bottom-5 md:-right-10 md:-bottom-10 text-[8rem] md:text-[15rem] text-zinc-100 dark:text-zinc-800/30 group-hover:text-amber-500/10 transition-colors z-0 pointer-events-none"><FaLayerGroup /></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                    <div>
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500/10 text-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-inner"><FaLayerGroup className="text-xl md:text-2xl" /></div>
                      <h3 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mb-2">Active Recall Reviewer</h3>
                      <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm md:text-base max-w-[85%]">Create flashcard decks, study, and test yourself.</p>
                    </div>
                  </div>
                </motion.button>

                {/* Locked Premium Tools Teaser (WITH COMING SOON OVERLAY) */}
                <div className="md:col-span-1 grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-6 relative">
                  
                  {/* Blurred Background Buttons */}
                  <div className="w-full flex flex-col bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl p-5 md:p-6 text-left shadow-md opacity-40 blur-[2px] select-none pointer-events-none">
                    <div className="absolute top-3 right-3 md:top-4 md:right-4 text-zinc-300 dark:text-zinc-700"><FaLock size={14} /></div>
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl flex items-center justify-center mb-3 md:mb-4"><FaTasks size={16} /></div>
                    <h3 className="text-sm md:text-lg font-bold text-zinc-800 dark:text-zinc-300 mb-1 leading-tight">Task Tracker</h3>
                  </div>

                  <div className="w-full flex flex-col bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl p-5 md:p-6 text-left shadow-md opacity-40 blur-[2px] select-none pointer-events-none">
                    <div className="absolute top-3 right-3 md:top-4 md:right-4 text-zinc-300 dark:text-zinc-700"><FaLock size={14} /></div>
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl flex items-center justify-center mb-3 md:mb-4"><FaStickyNote size={16} /></div>
                    <h3 className="text-sm md:text-lg font-bold text-zinc-800 dark:text-zinc-300 mb-1 leading-tight">Cloud Notes</h3>
                  </div>

                  {/* THE COMING SOON OVERLAY */}
                  <div className="absolute inset-0 z-50 bg-zinc-100/40 dark:bg-zinc-900/60 backdrop-blur-[1px] rounded-2xl md:rounded-[2rem] flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-700/50 shadow-inner">
                     <div className="w-12 h-12 bg-white dark:bg-zinc-800 text-yellow-500 rounded-full flex items-center justify-center mb-3 shadow-md">
                        <FaTools size={20} className="animate-pulse" />
                     </div>
                     <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">In Development</span>
                  </div>

                </div>

              </div>
            </motion.div>
          )}

          {/* ================= ACTIVE TOOL VIEW ================= */}
          {activeTool && (
            <motion.div 
              key="tool" 
              initial={{ opacity: 0, y: 30 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8 pb-4 md:pb-6 border-b border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={() => setActiveTool(null)} 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-full text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                  <FaArrowLeft /> Back to Hub
                </button>
                <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-[10px] md:text-xs font-mono text-zinc-500 uppercase tracking-widest shadow-inner">
                  Status: Local Mode
                </div>
              </div>

              <div className="min-h-[600px]">
                {activeTool === 'schedule' && <ScheduleMaker />}
                {activeTool === 'calc' && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start w-full">
                    <GradeCalculator />
                    <GWACalculator />
                  </div>
                )}
                {activeTool === 'flashcards' && (
                  <div className="w-full max-w-4xl mx-auto"><FlashcardMaker /></div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}