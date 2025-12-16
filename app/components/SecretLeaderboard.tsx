"use client";

import { useState, useEffect } from "react";
import { FaTrophy, FaRedo, FaCrown, FaTrash, FaSpinner } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../../lib/firebase"; // Make sure this path is correct
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

  // 1. FETCH GLOBAL SCORES (Real-time listener)
  useEffect(() => {
    // Reference the specific collection for the current game mode
    const q = query(
      collection(db, `leaderboard_${gameMode}`),
      orderBy("score", "desc"),
      limit(10)
    );

    // onSnapshot listens for changes in real-time
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

  // 2. ADMIN KILL SWITCH (Ctrl + Shift + Delete)
  useEffect(() => {
    const handleAdminClear = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "Delete") {
        const password = prompt("ADMIN DETECTED. ENTER CLEAR CODE:");
        if (password === "JPCS2025") { // <--- CHANGE THIS PASSWORD
          setAdminStatus("clearing");
          
          // Delete all documents in the collection using a Batch
          const q = query(collection(db, `leaderboard_${gameMode}`));
          const snapshot = await getDocs(q);
          const batch = writeBatch(db);
          
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          setAdminStatus("success");
          setTimeout(() => setAdminStatus("idle"), 3000);
        } else {
            alert("ACCESS DENIED.");
        }
      }
    };
    window.addEventListener("keydown", handleAdminClear);
    return () => window.removeEventListener("keydown", handleAdminClear);
  }, [gameMode]);

  // 3. SUBMIT SCORE TO CLOUD
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitted(true); // Optimistic UI update

    try {
      await addDoc(collection(db, `leaderboard_${gameMode}`), {
        name: name.trim().toUpperCase(),
        score: score,
        createdAt: serverTimestamp(), // Uses server time for consistency
      });
    } catch (error) {
      console.error("Error adding score: ", error);
      alert("Network Error: Could not save score.");
      setSubmitted(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-6 text-green-500 font-mono"
    >
      {/* Admin Toast */}
      <AnimatePresence>
        {adminStatus === "success" && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="absolute top-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg font-bold flex items-center gap-2"
          >
            <FaTrash /> GLOBAL RECORDS PURGED
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm border border-green-500/50 p-6 rounded-xl bg-black shadow-[0_0_30px_rgba(34,197,94,0.1)]">
        
        <div className="text-center mb-6">
          <FaTrophy className="mx-auto text-4xl mb-2 text-yellow-500" />
          <h2 className="text-2xl font-bold tracking-widest uppercase">
            {gameMode === "override" ? "SYSTEM OVERRIDE" : "FLAPPY GLITCH"}
          </h2>
          <div className="text-white mt-2">
            FINAL SCORE: <span className="text-3xl font-bold text-green-400">{score}</span>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="mb-6">
            <p className="text-xs text-center text-gray-500 mb-2">JOIN THE GLOBAL NETWORK</p>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                maxLength={10}
                placeholder="ENTER INITIALS"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-zinc-900 border border-green-700 text-green-400 p-3 text-center uppercase tracking-widest focus:outline-none focus:border-green-400 placeholder:text-green-900"
              />
              <button 
                type="submit" 
                disabled={!name}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-black px-4 font-bold"
              >
                UPLOAD
              </button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2 mb-6">
            <button onClick={onReplay} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-black font-bold flex items-center justify-center gap-2">
              <FaRedo /> RETRY
            </button>
            <button onClick={onMenu} className="px-4 border border-green-600 hover:bg-green-900/30 text-green-500">
              MENU
            </button>
          </div>
        )}

        {/* Global Scores List */}
        <div className="border-t border-green-800 pt-4">
          <h3 className="text-xs uppercase text-gray-500 mb-3 flex justify-between">
            <span>Rank</span>
            <span>Agent</span>
            <span>Score</span>
          </h3>
          
          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2 min-h-[100px]">
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