"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaComments, FaHeart, FaUserEdit, FaSignOutAlt, FaUserCircle, FaGlobeAsia, FaVenusMars, FaFire } from "react-icons/fa";
import { collection, query, where, getCountFromServer, updateDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/db"; 
import { UserProfile } from "../types";

// --- STYLES ---
const CARD_BASE = "bg-zinc-900/60 border border-zinc-800/50 backdrop-blur-xl rounded-3xl overflow-hidden relative";
const STAT_BOX = "flex flex-col items-center justify-center p-4 bg-zinc-800/40 rounded-2xl border border-zinc-700/30";
const ACTION_BTN_LARGE = "w-full py-5 font-black rounded-2xl transition-all flex items-center justify-center gap-3 text-sm md:text-base shadow-xl hover:scale-[1.02] active:scale-[0.98]";

interface HomeViewProps {
  currentUser: UserProfile | null;
  onStartMatching: () => void;
  onContinueChat: (matchId: string, userId: string) => void;
  onEditProfile: () => void;
  onLogout: () => void;
}

export const HomeView = ({ currentUser, onStartMatching, onContinueChat, onEditProfile, onLogout }: HomeViewProps) => {
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    // 1. HEARTBEAT: Update my 'lastSeen' status
    const updatePresence = async () => {
        try {
            await updateDoc(doc(db, "cupid_users", currentUser.id!), {
                lastSeen: serverTimestamp()
            });
        } catch (e) {
            console.error("Presence update failed", e);
        }
    };
    updatePresence();

    // 2. FETCH STATS: Get real counts
    const fetchStats = async () => {
      try {
        // A. Count Potential Matches
        const matchQuery = currentUser.preferredGender === "Any"
          ? query(collection(db, "cupid_users"))
          : query(collection(db, "cupid_users"), where("gender", "==", currentUser.preferredGender));
        
        const matchSnap = await getCountFromServer(matchQuery);
        setMatchCount(Math.max(0, matchSnap.data().count - 1)); 

        // B. Count "Online" Users (Active in last 15 mins)
        // We create a Date object for 15 minutes ago
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        
        const onlineQuery = query(
            collection(db, "cupid_users"), 
            where("lastSeen", ">", fifteenMinsAgo)
        );

        const onlineSnap = await getCountFromServer(onlineQuery);
        setOnlineCount(onlineSnap.data().count);

      } catch (e) {
        console.error("Stats error", e);
        // Fallback to 1 (Just me) if query fails
        setOnlineCount(1);
        setMatchCount(0);
      }
    };

    fetchStats();
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }} 
      animate={{ scale: 1, opacity: 1 }} 
      className="max-w-4xl mx-auto w-full relative z-50 px-4 grid md:grid-cols-12 gap-6 min-h-[60vh] items-start pt-8"
    >
        {/* --- LEFT COLUMN: PROFILE CARD (Span 5) --- */}
        <div className={`md:col-span-5 ${CARD_BASE} p-6 flex flex-col items-center text-center h-full`}>
            {/* Background Glow */}
            <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-rose-500/20 blur-[80px] rounded-full pointer-events-none" />

            {/* Avatar */}
            <div className="relative mb-6 group" onClick={onEditProfile}>
                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-500 shadow-2xl cursor-pointer hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-black bg-zinc-800 relative">
                        {currentUser.imgs && currentUser.imgs[0] ? (
                            <img src={currentUser.imgs[0]} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                            <FaUserCircle className="w-full h-full text-zinc-600 p-4" />
                        )}
                    </div>
                </div>
                <div className="absolute bottom-0 right-0 bg-zinc-900 border border-zinc-700 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-rose-600 transition-colors">
                    <FaUserEdit size={12} />
                </div>
            </div>

            <h2 className="text-3xl font-black text-white mb-1 tracking-tight">{currentUser.name}</h2>
            <div className="flex items-center gap-2 mb-6">
                 <span className="px-3 py-1 bg-zinc-800 rounded-lg text-[10px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-700/50">
                    {currentUser.course}
                 </span>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-8 w-full">
                {currentUser.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-1 rounded-md bg-zinc-800/50 text-zinc-500 border border-zinc-700/50">#{tag}</span>
                ))}
            </div>

            <button onClick={onLogout} className="mt-auto text-xs font-bold text-zinc-500 hover:text-rose-500 flex items-center gap-2 transition-colors py-2">
                <FaSignOutAlt /> SIGN OUT
            </button>
        </div>

        {/* --- RIGHT COLUMN: ACTIONS & STATS (Span 7) --- */}
        <div className="md:col-span-7 flex flex-col gap-6">
            
            <div className="grid grid-cols-2 gap-4">
                <div className={STAT_BOX}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Active Now</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <FaGlobeAsia className="text-zinc-600 text-lg" />
                        <span className="text-3xl font-black text-white">
                             {onlineCount === null ? <FaSpinner className="animate-spin text-sm"/> : onlineCount}
                        </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1">Last 15 Mins</span>
                </div>

                <div className={STAT_BOX}>
                    <div className="flex items-center gap-2 mb-2">
                        <FaVenusMars className="text-rose-500 text-xs" />
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Pool</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <FaFire className="text-zinc-600 text-lg" />
                        <span className="text-3xl font-black text-white">
                           {matchCount === null ? "..." : matchCount}
                        </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1">Potential Matches</span>
                </div>
            </div>

            <div className={`${CARD_BASE} p-8 flex flex-col justify-center flex-1`}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500" />
                
                <h3 className="text-2xl font-black text-white mb-2">
                    {currentUser.currentMatchId ? "Match In Progress" : "Ready to Mingle?"}
                </h3>
                <p className="text-zinc-400 text-sm mb-8 leading-relaxed max-w-sm">
                    {currentUser.currentMatchId 
                        ? "You have an active connection! Jump back in and continue getting to know them." 
                        : "The algorithm is ready. We'll search for students who match your preferences and interests."}
                </p>

                {currentUser.currentMatchId ? (
                    <button 
                        onClick={() => onContinueChat(currentUser.currentMatchId!, currentUser.id!)} 
                        className={`${ACTION_BTN_LARGE} bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-green-500/20`}
                    >
                        <FaComments size={20} />
                        <div>
                            <span className="block leading-none">OPEN CHAT</span>
                            <span className="text-[10px] opacity-80 font-normal">Continue conversation</span>
                        </div>
                    </button>
                ) : (
                    <button 
                        onClick={onStartMatching} 
                        className={`${ACTION_BTN_LARGE} bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:shadow-rose-500/30`}
                    >
                        <FaHeart size={20} className="animate-pulse" />
                        <div>
                            <span className="block leading-none">FIND A MATCH</span>
                            <span className="text-[10px] opacity-80 font-normal">Uses 1 Reroll Ticket</span>
                        </div>
                    </button>
                )}
            </div>
        </div>
    </motion.div>
  );
};

// Helper for spinner
const FaSpinner = ({className}: {className?: string}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);