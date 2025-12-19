"use client";

import { useState, useEffect } from "react";
import { FaTrophy, FaRedo, FaCrown, FaTrash, FaSpinner, FaForward, FaExclamationTriangle, FaCheckCircle, FaSave } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../lib/firebase"; 
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  getDocs, 
  writeBatch 
} from "firebase/firestore";

type ScoreEntry = {
  id: string;
  name: string;
  score: number;
};

interface LeaderboardProps {
  score: number;
  gameMode: "override" | "flappy";
  onReplay: () => void;
  onMenu: () => void;
}

export default function SecretLeaderboard({ score, gameMode, onReplay, onMenu }: LeaderboardProps) {
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState<"idle" | "clearing" | "success">("idle");
  const [hasPriorSubmission, setHasPriorSubmission] = useState(false);

  // 1. CHECK LOCAL STORAGE
  useEffect(() => {
    const alreadySubmitted = localStorage.getItem(`jpcs_submitted_${gameMode}`);
    if (alreadySubmitted) {
      setHasPriorSubmission(true);
      setSubmitted(true);
    }
  }, [gameMode]);

  // 2. FETCH GLOBAL SCORES
  useEffect(() => {
    const q = query(
      collection(db, `leaderboard_${gameMode}`),
      orderBy("score", "desc"),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScoreEntry[];
      setHighScores(scores);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameMode]);

  // 3. KEYBOARD LISTENERS
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // ADMIN CLEAR (Ctrl + Shift + Delete)
      if (e.ctrlKey && e.shiftKey && e.key === "Delete") {
        const password = prompt("ADMIN DETECTED. ENTER CLEAR CODE:");
        if (password === "JPCS2025") { 
          setAdminStatus("clearing");
          const q = query(collection(db, `leaderboard_${gameMode}`));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          snapshot.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          setAdminStatus("success");
          
          localStorage.removeItem(`jpcs_submitted_${gameMode}`);
          setHasPriorSubmission(false);
          setSubmitted(false);

          setTimeout(() => setAdminStatus("idle"), 3000);
        } else {
            alert("ACCESS DENIED.");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameMode]);

  // 4. SUBMIT SCORE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (localStorage.getItem(`jpcs_submitted_${gameMode}`)) {
        alert("Error: You have already submitted a score on this device.");
        return;
    }

    setSubmitted(true);
    setHasPriorSubmission(true);
    localStorage.setItem(`jpcs_submitted_${gameMode}`, "true");

    try {
      await addDoc(collection(db, `leaderboard_${gameMode}`), {
        name: name.trim().toUpperCase(),
        score: score,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding score: ", error);
      setSubmitted(false);
      setHasPriorSubmission(false);
      localStorage.removeItem(`jpcs_submitted_${gameMode}`);
      alert("Network Error. Please try again.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-sm font-mono"
    >
      <AnimatePresence>
        {adminStatus === "success" && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg font-bold flex items-center gap-2 z-[60]"
          >
            <FaTrash /> RECORDS PURGED
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[320px] flex flex-col gap-4">
        
        {/* --- HEADER SECTION --- */}
        <div className="text-center">
          <FaTrophy className="mx-auto text-4xl mb-2 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
          <h2 className="text-xl font-bold tracking-widest uppercase text-green-500">
            {gameMode === "override" ? "SYSTEM OVERRIDE" : "FLAPPY GLITCH"}
          </h2>
          <div className="text-white mt-1 text-sm">
            FINAL SCORE: <span className="text-4xl font-black text-green-400 align-middle ml-2">{score}</span>
          </div>
        </div>

        {/* --- INPUT FORM SECTION --- */}
        {!submitted && !hasPriorSubmission ? (
          <div className="bg-zinc-900/80 border border-green-500/30 p-4 rounded-xl shadow-lg">
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 text-[10px] p-2 mb-3 rounded flex items-start gap-2 leading-tight">
               <FaExclamationTriangle className="text-xs shrink-0 mt-0.5" />
               <span>WARNING: Score submission is one-time only.</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                maxLength={8}
                placeholder="ENTER INITIALS"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black border border-green-700 text-green-400 p-3 text-center text-lg uppercase tracking-[0.2em] font-bold focus:outline-none focus:border-green-400 placeholder:text-green-900/50 rounded"
              />
              <button 
                type="submit" 
                disabled={!name}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-black py-3 font-bold rounded flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <FaSave /> SUBMIT SCORE
              </button>
            </form>

            <button 
              onClick={onReplay}
              className="w-full mt-3 py-2 text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider border-t border-zinc-800"
            >
              Skip Saving & Restart
            </button>
          </div>
        ) : (
          /* --- POST-SUBMISSION MENU --- */
          <div className="bg-zinc-900/80 border border-green-500/30 p-4 rounded-xl shadow-lg">
             {hasPriorSubmission && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs p-2 mb-3 rounded text-center font-bold">
                    <FaCheckCircle className="inline mr-2" /> SCORE RECORDED
                </div>
             )}
             <div className="flex flex-col gap-2">
               <button onClick={onReplay} className="w-full py-3 bg-green-600 hover:bg-green-500 text-black font-bold rounded flex items-center justify-center gap-2">
                 <FaRedo /> PLAY AGAIN
               </button>
               <button onClick={onMenu} className="w-full py-2 border border-green-600/50 text-green-500 hover:bg-green-900/20 rounded text-sm">
                 RETURN TO MENU
               </button>
             </div>
          </div>
        )}

        {/* --- LEADERBOARD LIST --- */}
        <div className="bg-black/50 border border-green-900/50 rounded-lg p-3 max-h-[200px] overflow-hidden flex flex-col">
          <h3 className="text-[10px] uppercase text-gray-500 mb-2 flex justify-between px-2 border-b border-gray-800 pb-1">
            <span>Rank</span>
            <span>Agent</span>
            <span>Score</span>
          </h3>
          
          <div className="overflow-y-auto flex-1 custom-scrollbar space-y-1">
            {loading ? (
              <div className="flex justify-center py-4 text-green-800">
                <FaSpinner className="animate-spin text-xl" />
              </div>
            ) : highScores.length === 0 ? (
                <p className="text-center text-gray-700 text-xs py-4">NO DATA</p>
            ) : (
              highScores.map((entry, i) => (
                <div key={entry.id} className={`flex justify-between items-center text-xs px-2 py-1.5 rounded ${entry.name === name && entry.score === score && submitted ? "bg-green-900/40 text-white ring-1 ring-green-500/50" : "text-green-400/80 hover:bg-white/5"}`}>
                  <span className="w-8 font-bold flex items-center gap-1">
                    {i === 0 && <FaCrown className="text-yellow-500 text-[10px]" />}
                    <span className={i === 0 ? "text-yellow-500" : ""}>#{i + 1}</span>
                  </span>
                  <span className="flex-1 text-center font-mono tracking-wider">{entry.name}</span>
                  <span className="w-8 text-right font-bold text-green-300">{entry.score}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}