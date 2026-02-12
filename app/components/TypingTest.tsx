"use client";
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTyping } from "../hooks/useTyping"; 
import { db } from "@/lib/firebase"; 
import { collection, addDoc, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { FaHeart, FaKeyboard, FaTrophy, FaUser, FaCheck, FaTimes, FaPaperPlane, FaTrash } from "react-icons/fa";

import FloatingHearts from "./FloatingHearts"; 
import CircuitCursor from "./CircuitCursor"; 

interface LeaderboardEntry {
  name: string;
  wpm: number;
  accuracy: number;
}

export default function ValentineTyper() {
  const { text, input, timeLeft, status, wpm, accuracy, reset, handleInput } = useTyping(60);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [playerName, setPlayerName] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // NEW: Control the modal visibility
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Focus Logic
  const focusInput = () => {
    if(playerName.trim().length > 0 && !showSubmitModal) {
        inputRef.current?.focus();
    } else if (!showSubmitModal) {
        document.getElementById('name-input')?.focus();
    }
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
        const progress = input.length / text.length;
        if(progress > 0.2) { 
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight * progress * 0.6;
        } else {
            scrollRef.current.scrollTop = 0;
        }
    }
  }, [input, text.length]);

  // --- CHANGED: TRIGGER MODAL INSTEAD OF AUTO-SAVE ---
  useEffect(() => {
    if (status === 'finished' && wpm > 0) {
      setShowSubmitModal(true);
    }
  }, [status, wpm]);

  // Real-time Leaderboard
  useEffect(() => {
    const q = query(collection(db, "typing_scores"), orderBy("wpm", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const scores = querySnapshot.docs.map(doc => doc.data() as LeaderboardEntry);
      setLeaderboard(scores);
    });
    return () => unsubscribe();
  }, []);

  // --- NEW: HANDLER FUNCTIONS ---
  const handleConfirmSubmit = async () => {
    try {
      await addDoc(collection(db, "typing_scores"), {
        name: playerName || "Anonymous User", 
        wpm: wpm,
        accuracy: accuracy,
        timestamp: new Date()
      });
      setShowSubmitModal(false);
      reset(); // Reset game after saving
    } catch (e) {
      console.error("Error adding score: ", e);
    }
  };

  const handleDiscard = () => {
    setShowSubmitModal(false);
    reset(); // Reset game without saving
  };

  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-start pt-36 pb-12 px-4 md:px-8 overflow-hidden">
      
      <CircuitCursor />
      <div className="absolute inset-0 z-0 opacity-80 pointer-events-none overflow-hidden">
         <FloatingHearts />
      </div>

      {/* --- NEW: SUBMIT/DISCARD MODAL --- */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             {/* Backdrop Blur */}
             <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={handleDiscard} // Click outside to discard/close
             />
             
             {/* Modal Content */}
             <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                className="relative bg-white dark:bg-zinc-900 border border-rose-500/50 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center overflow-hidden"
             >
                {/* Decorative Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-rose-500/20 blur-3xl rounded-full pointer-events-none" />

                <FaHeart className="text-rose-500 text-6xl mx-auto mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                
                <h3 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 uppercase italic">Protocol Complete</h3>
                <p className="text-zinc-500 dark:text-rose-300 mb-8 font-mono text-sm uppercase tracking-widest">
                  Performance Report Ready
                </p>

                {/* Stats Summary */}
                <div className="flex justify-center gap-8 mb-8">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 uppercase font-bold">WPM</span>
                        <span className="text-4xl font-black text-rose-600 dark:text-rose-500">{wpm}</span>
                    </div>
                    <div className="w-px bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-400 uppercase font-bold">Accuracy</span>
                        <span className={`text-4xl font-black ${accuracy >= 95 ? 'text-green-500' : 'text-zinc-700 dark:text-white'}`}>
                            {accuracy}%
                        </span>
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button 
                    onClick={handleConfirmSubmit}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-rose-500/30 group"
                  >
                    <FaPaperPlane className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" /> 
                    Submit to Hall of Fame
                  </button>
                  
                  <button 
                    onClick={handleDiscard}
                    className="w-full py-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold rounded-xl transition-all flex items-center justify-center gap-3"
                  >
                    <FaTrash className="text-sm" /> 
                    Discard & Retry
                  </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MAIN UI --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-8 md:mb-12"
      >
        <h2 className="text-4xl md:text-7xl font-black uppercase text-zinc-900 dark:text-white mb-2">
          Project: <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600 drop-shadow-[0_0_25px_rgba(225,29,72,0.6)]">CUPID</span>
        </h2>
        <p className="text-zinc-600 dark:text-rose-300 font-mono tracking-[0.3em] uppercase text-xs md:text-sm">
          // System_Status: Awaiting Confession...
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-12 gap-8 relative z-10 w-full max-w-[1400px]">
        
        {/* LEFT: TYPING AREA */}
        <motion.div 
           initial={{ opacity: 0, x: -50 }}
           whileInView={{ opacity: 1, x: 0 }}
           className="lg:col-span-8 flex flex-col"
        >
          {/* Stats Bar */}
          <div className="flex justify-between items-end mb-6 px-2">
              <div className="flex gap-8">
                  <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Time</span>
                      <span className="text-5xl font-black text-zinc-800 dark:text-white">{timeLeft}s</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">WPM</span>
                      <span className="text-5xl font-black text-rose-600 dark:text-rose-400 drop-shadow-lg">{wpm}</span>
                  </div>
              </div>
              
              <div className="flex flex-col items-end">
                   <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Accuracy</span>
                   <span className={`text-4xl font-bold ${accuracy > 95 ? 'text-rose-500' : 'text-orange-500'}`}>
                       {accuracy}%
                   </span>
              </div>
          </div>

          {/* Name Input */}
          <div className="relative mb-6 group">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaUser className="text-zinc-400 group-focus-within:text-rose-500 transition-colors text-lg" />
             </div>
             <input 
                id="name-input"
                type="text"
                placeholder="Enter Alias to Begin Protocol..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={status === 'running'}
                className="w-full bg-white/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-mono text-lg backdrop-blur-sm"
             />
          </div>

          {/* Typing Terminal */}
          <div 
             ref={scrollRef}
             onClick={focusInput}
             className="relative h-[50vh] min-h-[400px] overflow-y-auto bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-zinc-200 dark:border-rose-500/30 rounded-3xl p-10 shadow-2xl cursor-text scroll-smooth"
          >
             {!playerName && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-3xl transition-opacity">
                    <FaKeyboard className="text-7xl text-zinc-600 mb-6 animate-pulse" />
                    <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">Identify yourself to access terminal</p>
                </div>
             )}

             <div className="font-mono text-2xl md:text-3xl leading-relaxed break-words select-none">
                {text.split('').map((char, index) => {
                    const inputChar = input[index];
                    let className = "text-zinc-300 dark:text-zinc-700"; 
                    if (index < input.length) {
                        className = inputChar === char ? "text-zinc-800 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "text-red-500 bg-red-500/10 underline decoration-4 decoration-red-500"; 
                    }
                    const isActive = index === input.length;
                    return (
                        <span key={index} className={`relative ${className} transition-colors duration-75`}>
                            {isActive && playerName && (
                                <span className="absolute -left-[1px] top-0 bottom-0 w-[3px] bg-rose-500 animate-[blink_1s_infinite] shadow-[0_0_10px_#f43f5e]"></span>
                            )}
                            {char}
                        </span>
                    );
                })}
             </div>

             <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInput}
                className="absolute inset-0 opacity-0 cursor-default h-full w-full"
                autoFocus={!!playerName}
                disabled={!playerName}
             />
          </div>

          {/* Manual Reset Button */}
          <button 
             onClick={() => { reset(); setTimeout(() => document.getElementById('name-input')?.focus(), 100); }}
             className="mt-8 w-full py-5 rounded-2xl bg-zinc-900 dark:bg-rose-600 text-white font-bold uppercase tracking-widest text-lg hover:bg-zinc-800 dark:hover:bg-rose-500 shadow-xl hover:shadow-rose-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-3"
          >
             {status === 'finished' ? "View Results" : "Restart System"}
          </button>
        </motion.div>

        {/* RIGHT: LEADERBOARD */}
        <motion.div 
           initial={{ opacity: 0, x: 50 }}
           whileInView={{ opacity: 1, x: 0 }}
           className="lg:col-span-4 h-full"
        >
           <div className="bg-white/50 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 h-full shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center gap-3 mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                 <FaTrophy className="text-yellow-500 text-2xl" />
                 <h3 className="text-xl font-black uppercase text-zinc-800 dark:text-white">Top Agents</h3>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                 {leaderboard.length === 0 ? (
                    <div className="text-center text-zinc-500 py-20 font-mono text-sm">Fetching Data...</div>
                 ) : (
                    leaderboard.map((entry, i) => (
                       <div key={i} className="group relative flex items-center justify-between p-4 rounded-xl bg-zinc-100 dark:bg-black/40 border border-transparent hover:border-rose-500/50 hover:bg-rose-500/5 transition-all animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className="flex items-center gap-4">
                             <span className={`font-mono text-lg font-bold w-8 ${
                                i === 0 ? 'text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 
                                i === 1 ? 'text-zinc-400' : 
                                i === 2 ? 'text-amber-700' : 'text-zinc-600 dark:text-zinc-500'
                             }`}>
                                #{i + 1}
                             </span>
                             <div>
                                <div className="text-base font-bold text-zinc-800 dark:text-zinc-200">{entry.name}</div>
                                <div className="text-[11px] text-zinc-500 uppercase tracking-wider">
                                   Acc: {entry.accuracy}%
                                </div>
                             </div>
                          </div>
                          
                          <div className="text-right">
                             <div className="text-rose-600 dark:text-rose-400 font-black text-xl">{entry.wpm}</div>
                             <div className="text-[10px] text-zinc-400 uppercase">WPM</div>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </motion.div>
      </div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-rose-500/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
    </section>
  );
}