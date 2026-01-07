"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // For the popup modal
import { motion, AnimatePresence } from "framer-motion";
import { FaTerminal, FaCheck, FaTimes, FaLightbulb, FaTrophy, FaKey, FaTimes as FaCloseIcon } from "react-icons/fa";

// --- FIREBASE IMPORTS ---
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  setDoc
} from "firebase/firestore";

// --- PUZZLE DATABASE ---
const PUZZLES = [
  {
    id: 1,
    type: "LOGIC",
    question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
    answer: ["echo", "an echo"],
    hint: "Think about sound or a specific terminal command."
  },
  {
    id: 2,
    type: "SYNTAX",
    question: "const a = '10'; const b = 20; console.log(a + b); // What is the output?",
    answer: ["1020", "'1020'", "\"1020\""],
    hint: "String concatenation vs Addition."
  },
  {
    id: 3,
    type: "BINARY",
    question: "Convert the binary number 1010 to decimal.",
    answer: ["10"],
    hint: "8 + 2"
  },
  {
    id: 4,
    type: "SHORTCUT",
    question: "What keyboard shortcut opens the Developer Tools in most browsers?",
    answer: ["f12", "ctrl+shift+i", "cmd+opt+i"],
    hint: "It's a function key or a 3-key combo."
  },
  {
    id: 5,
    type: "WEB",
    question: "In CSS, what property changes the text color?",
    answer: ["color"],
    hint: "It's not 'text-color' or 'font-color'."
  }
];

interface LeaderboardEntry {
  id: string;
  username: string;
  streak: number;
}

export default function DailyDecrypt() {
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Game State
  const [puzzle, setPuzzle] = useState<typeof PUZZLES[0] | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SUCCESS" | "ERROR">("IDLE");
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  
  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [username, setUsername] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [loadingLB, setLoadingLB] = useState(true);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    setMounted(true);
    
    // A. Select Puzzle based on Date
    const today = new Date().toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = today.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PUZZLES.length;
    setPuzzle(PUZZLES[index]);

    // B. Load Local Data (Streak & Name)
    const savedStreak = localStorage.getItem("decrypt_streak");
    if (savedStreak) setStreak(parseInt(savedStreak));
    
    const savedName = localStorage.getItem("decrypt_username");
    if (savedName) setUsername(savedName);

    // C. Check if already solved today
    const lastSolved = localStorage.getItem("decrypt_last_solved");
    if (lastSolved === today) {
      setStatus("SUCCESS");
      setInput("ACCESS GRANTED");
    }

    // D. Fetch Leaderboard
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const q = query(collection(db, "daily_leaderboard"), orderBy("streak", "desc"), limit(5));
      const querySnapshot = await getDocs(q);
      const scores: LeaderboardEntry[] = [];
      querySnapshot.forEach((doc) => {
        scores.push({ id: doc.id, ...doc.data() } as LeaderboardEntry);
      });
      setLeaderboard(scores);
      setLoadingLB(false);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setLoadingLB(false);
    }
  };

  // --- 2. HANDLE PUZZLE SUBMISSION ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!puzzle || status === "SUCCESS") return;

    const normalizedInput = input.toLowerCase().trim();
    
    if (puzzle.answer.includes(normalizedInput)) {
      // CORRECT!
      setStatus("SUCCESS");
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem("decrypt_last_solved", today);
      
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem("decrypt_streak", newStreak.toString());

      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      if (!username) {
        setShowNameInput(true);
      } else {
        await updateLeaderboard(username, newStreak);
      }
    } else {
      // WRONG!
      setStatus("ERROR");
      if (navigator.vibrate) navigator.vibrate(200);
      setTimeout(() => setStatus("IDLE"), 800);
    }
  };

  // --- 3. HANDLE NAME SUBMISSION ---
  const handleNameSubmit = async () => {
    if (!username.trim()) return;
    localStorage.setItem("decrypt_username", username);
    setShowNameInput(false);
    await updateLeaderboard(username, streak);
  };

  const updateLeaderboard = async (name: string, currentStreak: number) => {
    try {
      let userId = localStorage.getItem("decrypt_user_id");
      if (!userId) {
        userId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("decrypt_user_id", userId);
      }

      await setDoc(doc(db, "daily_leaderboard", userId), {
        username: name,
        streak: currentStreak,
        lastSolved: new Date().toISOString()
      }, { merge: true });

      fetchLeaderboard(); 
    } catch (error) {
      console.error("Error updating score:", error);
    }
  };

  if (!mounted || !puzzle) return null;

  return (
    <>
{/* --- TRIGGER BUTTON --- */}
      <button 
        onClick={() => setIsOpen(true)}
        className="
          fixed bottom-6 left-6 z-[999]  // <--- CHANGED THIS from 50 to 999
          flex items-center gap-2 px-4 py-3 
          bg-zinc-900 border border-green-500/50 rounded-full 
          shadow-[0_0_20px_rgba(34,197,94,0.3)] 
          hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] 
          hover:bg-black transition-all active:scale-95 group
        "
      >
        <FaKey className="text-green-500 animate-pulse group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-bold text-white uppercase tracking-wider hidden md:block">
          Daily Quest
        </span>
      </button>

      {/* --- MODAL POPUP --- */}
      {isOpen && createPortal(
        <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setIsOpen(false)} // Close on background click
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()} // Prevent close on modal click
                className="w-full max-w-3xl bg-zinc-900 rounded-xl border border-green-500/30 overflow-hidden shadow-2xl"
              >
                  {/* --- MODAL CONTENT (Grid Layout) --- */}
                  <div className="flex flex-col md:flex-row h-auto md:h-[500px]">
                      
                      {/* LEFT: THE TERMINAL */}
                      <div className="flex-1 bg-black p-1 flex flex-col relative">
                          {/* Close Button Mobile */}
                          <button onClick={() => setIsOpen(false)} className="absolute top-2 right-2 md:hidden text-zinc-500 p-2 z-10"><FaCloseIcon /></button>

                          {/* Terminal Header */}
                          <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-zinc-800">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                            </div>
                            <div className="text-zinc-500 text-xs font-bold tracking-widest uppercase">
                                Daily Decrypt v2.0
                            </div>
                          </div>

                          {/* Terminal Body */}
                          <div className="flex-1 p-6 relative flex flex-col justify-center">
                              <div className="flex justify-between text-xs mb-8 text-zinc-500">
                                <span>PROTOCOL: <span className="text-green-500">{puzzle.type}</span></span>
                                <span>STREAK: <span className="text-yellow-500">{streak}</span></span>
                              </div>

                              <div className="mb-8 text-green-400 leading-relaxed font-mono text-sm md:text-base">
                                <span className="mr-2 text-green-600 select-none">root@dlsu:~#</span>
                                <span className="typing-effect">{puzzle.question}</span>
                              </div>

                              {/* Input Section */}
                              {showNameInput ? (
                                <div className="animate-in fade-in slide-in-from-bottom-2 bg-zinc-900 p-4 border border-green-500/30 rounded">
                                    <p className="text-green-500 mb-2 font-bold text-xs">SYSTEM BREACH SUCCESSFUL.</p>
                                    <p className="text-zinc-400 text-xs mb-3">Identify yourself for the records:</p>
                                    <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Codename"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toUpperCase())}
                                        className="bg-zinc-800 border border-green-500/30 text-white px-3 py-2 text-xs outline-none focus:border-green-500 w-full rounded"
                                        maxLength={10}
                                    />
                                    <button onClick={handleNameSubmit} className="bg-green-600 text-black font-bold text-xs px-4 rounded hover:bg-green-500">SAVE</button>
                                    </div>
                                </div>
                              ) : (
                                <form onSubmit={handleSubmit} className="relative mt-auto">
                                    <div className="flex items-center gap-2 border-b-2 border-zinc-700 focus-within:border-green-500 transition-colors pb-2">
                                        <FaTerminal className="text-zinc-500" size={12} />
                                        <input 
                                        type="text" 
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        disabled={status === "SUCCESS"}
                                        placeholder={status === "SUCCESS" ? "SYSTEM SECURE" : "Enter decryption key..."}
                                        className="w-full bg-transparent text-white outline-none placeholder:text-zinc-700 font-mono text-sm"
                                        autoComplete="off"
                                        />
                                        <AnimatePresence>
                                            {status === "SUCCESS" && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><FaCheck className="text-green-500" /></motion.div>}
                                            {status === "ERROR" && <motion.div initial={{ x: 0 }} animate={{ x: [-5, 5, -5, 5, 0] }} transition={{ duration: 0.4 }}><FaTimes className="text-red-500" /></motion.div>}
                                        </AnimatePresence>
                                    </div>
                                    <div className="mt-4 flex justify-between items-center">
                                        {status === "SUCCESS" ? (
                                            <span className="text-green-500 text-xs font-bold animate-pulse">ACCESS GRANTED.</span>
                                        ) : (
                                            <button type="button" onClick={() => setShowHint(!showHint)} className="text-xs text-zinc-600 hover:text-yellow-500 transition-colors flex items-center gap-2">
                                                <FaLightbulb /> {showHint ? puzzle.hint : "Hint"}
                                            </button>
                                        )}
                                        <button type="submit" disabled={status === "SUCCESS"} className={`text-xs px-4 py-2 rounded font-bold transition-all ${status === "SUCCESS" ? "bg-green-900/30 text-green-500" : "bg-zinc-800 text-zinc-400 hover:bg-green-600 hover:text-white"}`}>
                                            {status === "SUCCESS" ? "LOCKED" : "EXECUTE"}
                                        </button>
                                    </div>
                                </form>
                              )}

                              {/* CRT Scanline Effect */}
                              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[5] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
                          </div>
                      </div>

                      {/* RIGHT: LEADERBOARD */}
                      <div className="w-full md:w-72 bg-zinc-900 border-l border-zinc-800 flex flex-col">
                          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black/20">
                             <h3 className="text-sm font-bold text-white flex items-center gap-2">
                               <FaTrophy className="text-yellow-500" /> Leaderboard
                             </h3>
                             <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors hidden md:block">
                                <FaCloseIcon />
                             </button>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-0">
                             {loadingLB ? (
                                <div className="p-8 text-center text-xs text-zinc-600 font-mono animate-pulse">
                                   &gt; CONNECTING...
                                </div>
                             ) : (
                                <div className="flex flex-col">
                                   {leaderboard.map((entry, index) => (
                                     <div key={entry.id} className={`flex justify-between items-center p-4 text-xs border-b border-zinc-800/50 ${index === 0 ? "bg-green-500/5" : ""}`}>
                                        <div className="flex items-center gap-3">
                                           <span className={`font-mono font-bold w-4 text-center ${index === 0 ? "text-yellow-500" : "text-zinc-600"}`}>
                                              {index + 1}
                                           </span>
                                           <span className={`font-bold ${index === 0 ? "text-green-400" : "text-zinc-300"}`}>
                                              {entry.username || "Anonymous"}
                                           </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="font-mono text-green-500 font-bold text-sm">{entry.streak}</span>
                                            <span className="text-[8px] text-zinc-600 uppercase">Streak</span>
                                        </div>
                                     </div>
                                   ))}
                                   {leaderboard.length === 0 && (
                                       <div className="p-8 text-center text-xs text-zinc-600">No data found.</div>
                                   )}
                                </div>
                             )}
                          </div>
                          
                          {/* Footer Info */}
                          <div className="p-3 bg-black/40 text-[10px] text-center text-zinc-600 border-t border-zinc-800">
                             Resets daily at 00:00 UTC
                          </div>
                      </div>
                  </div>
              </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}