"use client";

import { useState, useEffect } from "react";
import { FaTrophy, FaRedo, FaCrown, FaTrash, FaSpinner, FaForward, FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
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
  
  // New State: Check if they did it before
  const [hasPriorSubmission, setHasPriorSubmission] = useState(false);

  // 1. CHECK LOCAL STORAGE FOR PREVIOUS SUBMISSION
  useEffect(() => {
    const alreadySubmitted = localStorage.getItem(`jpcs_submitted_${gameMode}`);
    if (alreadySubmitted) {
      setHasPriorSubmission(true);
      setSubmitted(true); // Treat as submitted so they see the buttons immediately
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
      // ADMIN CLEAR
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
          
          // ALSO RESET LOCAL STORAGE SO ADMIN CAN TEST AGAIN
          localStorage.removeItem(`jpcs_submitted_${gameMode}`);
          setHasPriorSubmission(false);
          setSubmitted(false);

          setTimeout(() => setAdminStatus("idle"), 3000);
        } else {
            alert("ACCESS DENIED.");
        }
      }

      // QUICK RESTART 'R'
      if (e.key.toLowerCase() === "r" && document.activeElement?.tagName !== "INPUT") {
        onReplay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameMode, onReplay]);

  // 4. SUBMIT SCORE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Double check just in case
    if (localStorage.getItem(`jpcs_submitted_${gameMode}`)) {
        alert("Error: You have already submitted a score on this device.");
        return;
    }

    setSubmitted(true);
    setHasPriorSubmission(true); // Lock it immediately visually
    
    // LOCK THE DEVICE
    localStorage.setItem(`jpcs_submitted_${gameMode}`, "true");

    try {
      await addDoc(collection(db, `leaderboard_${gameMode}`), {
        name: name.trim().toUpperCase(),
        score: score,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding score: ", error);
      // If error, unlock so they can try again
      setSubmitted(false);
      setHasPriorSubmission(false);
      localStorage.removeItem(`jpcs_submitted_${gameMode}`);
      alert("Network Error. Please try again.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 text-green-500 font-mono"
    >
      <AnimatePresence>
        {adminStatus === "success" && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg font-bold flex items-center gap-2"
          >
            <FaTrash /> RECORDS PURGED
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm border border-green-500/50 p-6 rounded-xl bg-black shadow-[0_0_30px_rgba(34,197,94,0.1)]">
        
        <div className="text-center mb-4">
          <FaTrophy className="mx-auto text-4xl mb-2 text-yellow-500" />
          <h2 className="text-2xl font-bold tracking-widest uppercase">
            {gameMode === "override" ? "SYSTEM OVERRIDE" : "FLAPPY GLITCH"}
          </h2>
          <div className="text-white mt-2">
            FINAL SCORE: <span className="text-3xl font-bold text-green-400">{score}</span>
          </div>
        </div>

        {/* LOGIC: IF NOT SUBMITTED AND NO PRIOR SUBMISSION -> SHOW FORM */}
        {!submitted && !hasPriorSubmission ? (
          <div className="mb-6">
            <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 text-xs p-2 mb-3 rounded flex items-start gap-2">
               <FaExclamationTriangle className="mt-0.5 shrink-0" />
               <span>WARNING: You can only submit your score ONCE. Make it count.</span>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
              <input
                autoFocus
                type="text"
                maxLength={10}
                placeholder="INITIALS"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-zinc-900 border border-green-700 text-green-400 p-3 text-center uppercase tracking-widest focus:outline-none focus:border-green-400 placeholder:text-green-900"
              />
              <button 
                type="submit" 
                disabled={!name}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-black px-4 font-bold"
              >
                SAVE
              </button>
            </form>

            <button 
              onClick={onReplay}
              className="w-full py-2 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-green-400 hover:bg-green-900/20 rounded transition-colors border border-dashed border-zinc-800 hover:border-green-500/50"
            >
              <FaForward /> SKIP SAVING & RESTART
            </button>
          </div>
        ) : (
          // LOGIC: IF SUBMITTED OR HAS PRIOR SUBMISSION
          <div className="mb-6">
            {hasPriorSubmission && (
                <div className="bg-green-900/30 border border-green-500/30 text-green-400 text-xs p-2 mb-4 rounded flex items-center justify-center gap-2">
                    <FaCheckCircle /> 
                    <span>SCORE RECORDED. ONE ENTRY PER AGENT.</span>
                </div>
            )}
            
            <div className="flex gap-2">
              <button onClick={onReplay} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-black font-bold flex items-center justify-center gap-2">
                <FaRedo /> PLAY AGAIN
              </button>
              <button onClick={onMenu} className="px-4 border border-green-600 hover:bg-green-900/30 text-green-500">
                MENU
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-green-800 pt-4">
          <h3 className="text-xs uppercase text-gray-500 mb-3 flex justify-between">
            <span>Rank</span>
            <span>Agent</span>
            <span>Score</span>
          </h3>
          
          <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-2 min-h-[100px]">
            {loading ? (
              <div className="flex justify-center items-center h-20 text-green-800">
                <FaSpinner className="animate-spin text-2xl" />
              </div>
            ) : (
              highScores.map((entry, i) => (
                <div key={entry.id} className={`flex justify-between items-center text-sm ${entry.name === name && entry.score === score && submitted ? "text-white bg-green-900/50 p-1 rounded" : "text-green-400/80"}`}>
                  <span className="w-8 font-bold flex items-center gap-1">
                    {i === 0 && <FaCrown className="text-yellow-500 text-xs" />}
                    #{i + 1}
                  </span>
                  <span className="flex-1 text-center font-mono">{entry.name}</span>
                  <span className="w-12 text-right font-bold">{entry.score}</span>
                </div>
              ))
            )}
            {!loading && highScores.length === 0 && <p className="text-center text-gray-700 text-xs py-4">NO GLOBAL RECORDS</p>}
          </div>
        </div>

      </div>
    </motion.div>
  );
}