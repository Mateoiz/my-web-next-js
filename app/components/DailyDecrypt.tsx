"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaTerminal, FaTrophy, FaKey, FaTimes, FaBackspace, 
  FaCheckCircle, FaLaptopCode, FaSun, FaMoon, FaLevelDownAlt 
} from "react-icons/fa";

// --- FIREBASE IMPORTS ---
import { db } from "@/lib/firebase";
import { 
  collection, query, orderBy, limit, getDocs, doc, setDoc
} from "firebase/firestore";

// --- CONFIGURATION ---
const TECH_WORDS = [
  "CACHE", "PIXEL", "LOGIC", "STACK", "QUERY", 
  "INPUT", "LINUX", "MODEL", "PROXY", "TOKEN",
  "REACT", "NODES", "FETCH", "ARRAY", "INDEX",
  "DEBUG", "LOGIN", "SHELL", "BYTES", "ADMIN",
  "FRAME", "MOUSE", "MEDIA", "GRAPH", "CLOUD",
  "VIRUS", "PATCH", "MACRO", "SCOPE", "CONST",
  "ASYNC", "AWAIT", "CLASS", "BLOCK", "ROUTE"
];

const KEYS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"]
];

interface LeaderboardEntry {
  id: string;
  username: string;
  streak: number;
}

export default function DailyDecrypt() {
  // --- STATE ---
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true); // Default to Dark/Hacker mode
  
  // Time State
  const [timeString, setTimeString] = useState("00:00");
  const [dayProgress, setDayProgress] = useState(0);

  // Game Data
  const [solution, setSolution] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameStatus, setGameStatus] = useState<"PLAYING" | "WON" | "LOST">("PLAYING");
  const [streak, setStreak] = useState(0);
  
  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [username, setUsername] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [loadingLB, setLoadingLB] = useState(true);

  // --- HELPER: PH TIME ---
  const getPhilippineDateString = () => {
    const now = new Date();
    // Offset for Philippines is UTC+8
    const phTime = new Date(now.getTime() + (28800000)); 
    return phTime.getUTCFullYear() + "-" + 
           String(phTime.getUTCMonth() + 1).padStart(2, '0') + "-" + 
           String(phTime.getUTCDate()).padStart(2, '0');
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    setMounted(true);
    
    if (isOpen) {
      document.body.style.overflow = "hidden"; 
      fetchLeaderboard();
      
      const updateTimer = () => {
        const now = new Date();
        
        // 1. Format Time String (HH:MM)
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Manila',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        setTimeString(formatter.format(now));

        // 2. Calculate Day Progress %
        const parts = formatter.formatToParts(now);
        const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        const s = now.getSeconds();
        
        const totalSeconds = h * 3600 + m * 60 + s;
        setDayProgress((totalSeconds / 86400) * 100);
      };

      updateTimer(); 
      const timer = setInterval(updateTimer, 1000); 
      
      return () => {
        clearInterval(timer);
        document.body.style.overflow = "auto";
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!mounted) return;
    const today = getPhilippineDateString();
    
    // Select Word of the Day
    let hash = 0;
    for (let i = 0; i < today.length; i++) hash = today.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % TECH_WORDS.length;
    setSolution(TECH_WORDS[index]);

    // Restore Local Data
    const savedStreak = localStorage.getItem("decrypt_streak");
    if (savedStreak) setStreak(parseInt(savedStreak));
    const savedName = localStorage.getItem("decrypt_username");
    if (savedName) setUsername(savedName);

    // Check Win State
    const lastSolved = localStorage.getItem("decrypt_last_solved");
    if (lastSolved === today) {
      setGameStatus("WON");
      setGuesses([TECH_WORDS[index], "", "", "", "", ""]); 
    }
  }, [mounted]);

  // --- KEYBOARD LISTENER ---
  useEffect(() => {
    const handleKeyup = (e: KeyboardEvent) => {
      if (!isOpen || gameStatus !== "PLAYING" || showNameInput) return;
      const key = e.key.toUpperCase();
      if (key === "ENTER") submitGuess();
      else if (key === "BACKSPACE") setCurrentGuess(p => p.slice(0, -1));
      else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) setCurrentGuess(p => p + key);
    };
    window.addEventListener("keyup", handleKeyup);
    return () => window.removeEventListener("keyup", handleKeyup);
  }, [isOpen, gameStatus, currentGuess, showNameInput]);

  // --- ACTIONS ---
  const fetchLeaderboard = async () => {
    try {
      const q = query(collection(db, "daily_leaderboard"), orderBy("streak", "desc"), limit(10));
      const snap = await getDocs(q);
      const scores: LeaderboardEntry[] = [];
      snap.forEach(doc => scores.push({ id: doc.id, ...doc.data() } as LeaderboardEntry));
      setLeaderboard(scores);
      setLoadingLB(false);
    } catch (e) { setLoadingLB(false); }
  };

  const onVirtualKey = (key: string) => {
    if (gameStatus !== "PLAYING") return;
    if (key === "ENTER") submitGuess();
    else if (key === "DEL") setCurrentGuess(p => p.slice(0, -1));
    else if (currentGuess.length < 5) setCurrentGuess(p => p + key);
  };

  const submitGuess = () => {
    if (currentGuess.length !== 5) return;
    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);
    setCurrentGuess("");

    if (currentGuess === solution) {
      setGameStatus("WON");
      handleWin();
    } else if (newGuesses.length >= 6) {
      setGameStatus("LOST");
    }
  };

  const handleWin = async () => {
    const today = getPhilippineDateString();
    localStorage.setItem("decrypt_last_solved", today);
    const newStreak = streak + 1;
    setStreak(newStreak);
    localStorage.setItem("decrypt_streak", newStreak.toString());
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    if (!username) setShowNameInput(true);
    else await updateLeaderboard(username, newStreak);
  };

  const handleNameSubmit = async () => {
    if (!username.trim()) return;
    localStorage.setItem("decrypt_username", username);
    setShowNameInput(false);
    await updateLeaderboard(username, streak);
  };

  const updateLeaderboard = async (name: string, streak: number) => {
    let userId = localStorage.getItem("decrypt_user_id");
    if (!userId) {
      userId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("decrypt_user_id", userId);
    }
    await setDoc(doc(db, "daily_leaderboard", userId), { username: name, streak, lastSolved: new Date().toISOString() }, { merge: true });
    fetchLeaderboard();
  };

  // --- STYLING HELPERS ---
  const getCharStatus = (word: string, idx: number) => {
    const letter = word[idx];
    
    // Theme Colors
    const correct = isDark ? "bg-green-600 border-green-500 text-black shadow-green-500/40" : "bg-green-500 border-green-600 text-white";
    const wrongSpot = isDark ? "bg-yellow-500 border-yellow-400 text-black" : "bg-yellow-400 border-yellow-500 text-white";
    const wrong = isDark ? "bg-zinc-800 border-zinc-700 text-zinc-500" : "bg-zinc-200 border-zinc-300 text-zinc-400";
    const empty = isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-300";

    if (!letter) return empty;
    if (solution[idx] === letter) return `${correct} font-bold shadow-lg`;
    if (solution.includes(letter)) return `${wrongSpot} font-bold`;
    return wrong;
  };

  const getKeyStatus = (key: string) => {
    let status = isDark 
        ? "bg-zinc-800 text-zinc-300 border-b-4 border-zinc-950 active:border-b-0 active:translate-y-1" 
        : "bg-white text-zinc-600 border border-zinc-300 border-b-4 border-b-zinc-200 active:border-b active:translate-y-1";
        
    for (const guess of guesses) {
      for (let i = 0; i < guess.length; i++) {
        if (guess[i] === key) {
          if (solution[i] === key) return isDark ? "bg-green-600 text-black border-green-800 border-b-4 font-bold" : "bg-green-500 text-white border-green-700 border-b-4 font-bold";
          if (solution.includes(key)) status = isDark ? "bg-yellow-500 text-black border-yellow-700 border-b-4 font-bold" : "bg-yellow-400 text-white border-yellow-600 border-b-4 font-bold";
          else if (!status.includes("green") && !status.includes("yellow")) status = isDark ? "bg-zinc-900 text-zinc-600 border-zinc-950 border-b-4 opacity-50" : "bg-zinc-100 text-zinc-300 border-zinc-200 border-b-4";
        }
      }
    }
    return status;
  };

  if (!mounted) return null;

  // Theme Constants
  const bgClass = isDark ? "bg-zinc-950" : "bg-zinc-50";
  const textClass = isDark ? "text-white" : "text-zinc-900";
  const borderClass = isDark ? "border-zinc-800" : "border-zinc-200";
  const accentClass = isDark ? "text-green-500" : "text-green-600";
  const mutedClass = isDark ? "text-zinc-500" : "text-zinc-400";

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-[50] flex items-center gap-3 px-5 py-3 bg-black/90 backdrop-blur-md border border-green-500/30 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:border-green-500/60 transition-all active:scale-95 group"
      >
        <FaKey className="text-green-500 animate-pulse group-hover:rotate-12 transition-transform text-lg" />
        <span className="text-sm font-bold text-white uppercase tracking-widest hidden md:block">Daily Hack</span>
      </button>

      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[99999] ${isDark ? 'bg-black/95' : 'bg-zinc-100/95'} backdrop-blur-md md:p-8 font-mono flex items-center justify-center`}
          >
            {/* --- MAIN CONTAINER --- */}
            <div className={`relative w-full h-[100dvh] md:h-[800px] md:max-w-7xl ${bgClass} md:border-2 ${isDark ? 'border-green-500/20' : 'border-zinc-300'} md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden`}>
              
              {/* --- BACKGROUND FX --- */}
              {isDark && (
                <>
                    <div className="absolute inset-0 pointer-events-none z-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/40 via-black to-black" />
                    <div className="absolute inset-0 pointer-events-none z-0 bg-[url('/scanlines.png')] opacity-5" />
                </>
              )}

              {/* --- GAME COLUMN --- */}
              <div className="flex-1 flex flex-col relative z-10 h-full">
                
                {/* HEADER */}
                <div className={`flex justify-between items-center p-4 border-b ${borderClass} ${isDark ? 'bg-zinc-900/50' : 'bg-white/50'} backdrop-blur-md shrink-0`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-100 border-green-200'}`}>
                      <FaLaptopCode className={`text-xl ${accentClass}`} />
                    </div>
                    <div>
                      <h2 className={`${textClass} font-black tracking-tight leading-none text-lg`}>SYSTEM BREACH</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-green-500' : 'bg-green-600'}`} />
                        <p className={`text-[10px] uppercase tracking-widest font-bold ${isDark ? 'text-green-500/80' : 'text-green-700/80'}`}>Target: 5-Letter Tech</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* CONTROLS (Both Mobile & Desktop) */}
                  <div className="flex items-center gap-2">
                    <div className="hidden md:block text-right mr-4">
                        <div className={`text-[10px] uppercase ${mutedClass}`}>Manila Time</div>
                        <div className={`${isDark ? 'text-zinc-300' : 'text-zinc-700'} font-bold`}>{timeString}</div>
                    </div>
                    {/* Theme Toggle */}
                    <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-full border ${borderClass} ${mutedClass} hover:${textClass} transition-colors`}>
                        {isDark ? <FaSun size={16} /> : <FaMoon size={16} />}
                    </button>
                    <button onClick={() => setIsOpen(false)} className={`p-2 rounded-full border ${borderClass} ${mutedClass} hover:text-red-500 hover:border-red-500/50 transition-colors`}>
                      <FaTimes size={16} />
                    </button>
                  </div>
                </div>

                {/* GAME GRID (Flexible Height) */}
                <div className="flex-1 flex flex-col items-center justify-center p-2 min-h-0 overflow-y-auto">
                  <div className="w-full max-w-[340px] md:max-w-[420px] flex flex-col gap-1.5 md:gap-3">
                    
                    {/* Status Message Area */}
                    <div className="min-h-[40px] flex justify-center items-end mb-2">
                       {gameStatus === "WON" && (
                         <motion.div initial={{scale:0}} animate={{scale:1}} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold tracking-widest shadow-lg ${isDark ? 'text-green-400 bg-green-900/40 border-green-500/50' : 'text-green-800 bg-green-100 border-green-300'}`}>
                           <FaCheckCircle /> ACCESS GRANTED
                         </motion.div>
                       )}
                       {gameStatus === "LOST" && (
                         <div className="flex items-center gap-2 text-red-500 bg-red-100/80 px-4 py-2 rounded-full border border-red-200 text-xs font-bold tracking-widest">
                           <FaTimes /> CODE: {solution}
                         </div>
                       )}
                    </div>

                    {/* Guesses */}
                    {guesses.map((guess, i) => (
                      <div key={i} className="grid grid-cols-5 gap-1.5 md:gap-3">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <div key={j} className={`aspect-square border-2 rounded-md flex items-center justify-center text-2xl md:text-4xl font-bold uppercase transition-all duration-300 ${getCharStatus(guess, j)}`}>
                            {guess[j]}
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Active Input */}
                    {gameStatus === "PLAYING" && guesses.length < 6 && (
                      <div className="grid grid-cols-5 gap-1.5 md:gap-3">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <div key={j} className={`aspect-square border-2 rounded-md flex items-center justify-center text-2xl md:text-4xl font-bold uppercase ${currentGuess[j] ? (isDark ? 'border-zinc-500 bg-zinc-900 text-white animate-pulse' : 'border-zinc-400 bg-white text-black animate-pulse') : (isDark ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50')}`}>
                            {currentGuess[j]}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty Slots */}
                    {Array.from({ length: Math.max(0, 5 - guesses.length) }).map((_, i) => (
                      <div key={i} className="grid grid-cols-5 gap-1.5 md:gap-3 opacity-20">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <div key={j} className={`aspect-square border-2 ${borderClass} rounded-md`} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* KEYBOARD AREA (Lifted & Optimized) */}
                {/* pb-20 lifts the keyboard up significantly for mobile users */}
                <div className={`${isDark ? 'bg-zinc-950' : 'bg-zinc-100'} border-t ${borderClass} p-2 pb-20 md:pb-6 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]`}>
                  {showNameInput ? (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center gap-4 py-4">
                        <div className="text-center">
                            <h3 className={`${accentClass} font-bold text-lg mb-1`}>NEW HIGH SCORE DETECTED</h3>
                            <p className={`${mutedClass} text-xs`}>Enter your codename to join the database.</p>
                        </div>
                        <div className="flex w-full max-w-sm gap-2">
                            <input 
                                type="text" 
                                placeholder="CODENAME"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                                maxLength={10}
                                className={`flex-1 border ${borderClass} ${bgClass} ${textClass} px-4 py-3 rounded-xl outline-none font-bold text-center tracking-widest placeholder:${mutedClass} focus:ring-2 focus:ring-green-500/50 transition-all uppercase`}
                                autoFocus
                            />
                            <button onClick={handleNameSubmit} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-500 transition-colors shadow-lg">
                                SAVE
                            </button>
                        </div>
                    </motion.div>
                  ) : (
                    <div className="w-full max-w-[600px] mx-auto flex flex-col gap-2 select-none">
                        {KEYS.map((row, i) => (
                            <div key={i} className="flex justify-center gap-1 w-full">
                                {row.map((key) => {
                                    const isEnter = key === "ENTER";
                                    const isDel = key === "DEL";
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => onVirtualKey(key)}
                                            className={`
                                                relative h-12 md:h-14 rounded-md flex items-center justify-center font-bold transition-all
                                                flex-1
                                                ${(isEnter || isDel) ? `text-xs ${isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-200 text-zinc-600 border-zinc-300'}` : `text-lg ${getKeyStatus(key)}`}
                                                active:scale-95 touch-manipulation select-none
                                            `}
                                        >
                                            {isDel ? <FaBackspace className="text-xl" /> : isEnter ? <FaLevelDownAlt className="text-lg rotate-90" /> : key}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                  )}
                  
                  {/* Credits (Mobile Only - Positioned in the padding area) */}
                  <div className="md:hidden absolute bottom-6 left-0 right-0 text-center pointer-events-none">
                     <p className={`text-[9px] font-bold tracking-widest uppercase ${mutedClass} opacity-50`}>Designed by: Ice Matthew Ramirez</p>
                  </div>
                </div>
              </div>

              {/* --- LEADERBOARD COLUMN (Desktop Only) --- */}
              <div className={`hidden md:flex w-80 ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-50'} border-l ${borderClass} flex-col backdrop-blur-sm z-10`}>
                 <div className={`p-6 border-b ${borderClass} ${isDark ? 'bg-black/20' : 'bg-white/50'}`}>
                    <h3 className={`text-sm font-bold ${textClass} flex items-center gap-2`}>
                       <FaTrophy className="text-yellow-500" /> TOP HACKERS
                    </h3>
                 </div>
                 <div className="flex-1 overflow-y-auto p-0 scrollbar-thin">
                    {loadingLB ? (
                        <div className={`p-10 text-center text-xs ${mutedClass} animate-pulse`}>&gt; DOWNLOADING...</div>
                    ) : (
                        <div>
                            {leaderboard.map((entry, index) => (
                                <div key={entry.id} className={`flex justify-between items-center p-4 text-xs border-b ${borderClass} ${isDark ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-100'} transition-colors ${index === 0 ? (isDark ? "bg-green-500/10" : "bg-green-100/50") : ""}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold w-6 text-center text-lg ${index === 0 ? "text-yellow-500" : index === 1 ? "text-zinc-400" : index === 2 ? "text-amber-700" : mutedClass}`}>{index + 1}</span>
                                        <div>
                                            <div className={`font-bold ${index === 0 ? (isDark ? "text-green-400" : "text-green-700") : (isDark ? "text-zinc-300" : "text-zinc-800")}`}>{entry.username || "ANONYMOUS"}</div>
                                            <div className={`text-[9px] ${mutedClass}`}>{entry.id.substring(0,6)}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-black text-lg ${accentClass}`}>{entry.streak}</div>
                                        <div className={`text-[8px] ${mutedClass} uppercase`}>Streak</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
                 <div className={`p-4 border-t ${borderClass} ${bgClass}`}>
                    <div className={`text-[10px] ${mutedClass} uppercase flex justify-between mb-2`}>
                        <span>System Refresh</span>
                        <span>{timeString} PH</span>
                    </div>
                    <div className={`w-full h-1 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                        <div className="h-full bg-green-600" style={{width: `${dayProgress}%`}} />
                    </div>
                    <div className={`mt-4 text-center text-[10px] ${mutedClass} font-bold uppercase tracking-widest hover:${accentClass} transition-colors`}>
                        Good luck, Lasallians!
                    </div>
                 </div>
              </div>

            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}