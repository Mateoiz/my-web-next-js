"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaComments, FaHeart, FaUserEdit, FaSignOutAlt, FaUserCircle, FaGlobeAsia, FaVenusMars, FaFire, FaLock, FaInbox, FaTimes, FaCheck } from "react-icons/fa";
import { collection, query, where, getCountFromServer, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/db"; 
import { UserProfile, MatchRequest } from "../types";

// --- INVERTED THEME STYLES ---
const CARD_BASE = "bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl rounded-3xl overflow-hidden relative shadow-2xl dark:bg-zinc-100/80 dark:border-zinc-300 dark:shadow-[0_0_40px_rgba(0,0,0,0.05)]";
const STAT_BOX = "flex flex-col items-center justify-center p-4 rounded-2xl transition-colors bg-zinc-800/40 border border-zinc-700/50 dark:bg-white dark:border-zinc-200";
const TEXT_MAIN = "text-white dark:text-black";
const TEXT_SUB = "text-zinc-400 dark:text-zinc-500";

const BTN_PRIMARY = "w-full py-5 font-black rounded-2xl transition-all flex items-center justify-center gap-3 text-sm md:text-base shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer relative z-50 bg-white text-black hover:bg-zinc-200 dark:bg-black dark:text-white dark:hover:bg-zinc-800";
const BTN_ACTIVE = "w-full py-5 font-black rounded-2xl transition-all flex items-center justify-center gap-3 text-sm md:text-base shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer relative z-50 bg-green-500 text-black hover:bg-green-400 dark:bg-green-600 dark:text-white";

const OPEN_DATE = new Date("2026-02-12T00:00:00"); 

interface HomeViewProps {
  currentUser: UserProfile | null;
  onStartMatching: () => void;
  onContinueChat: (matchId: string, userId: string) => void;
  onEditProfile: () => void;
  onLogout: () => void;
  // --- NEW PROPS ---
  onAcceptRequest: (req: MatchRequest) => void;
  onRejectRequest: (req: MatchRequest) => void;
}

export const HomeView = ({ currentUser, onStartMatching, onContinueChat, onEditProfile, onLogout, onAcceptRequest, onRejectRequest }: HomeViewProps) => {
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
  const [isLocked, setIsLocked] = useState(true);

  // --- 1. COUNTDOWN TIMER ---
  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        const difference = OPEN_DATE.getTime() - now.getTime();
        if (difference <= 0) { setIsLocked(false); setTimeLeft(null); clearInterval(timer); } 
        else {
            setIsLocked(true);
            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            });
        }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- 2. STATS ---
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;
    updateDoc(doc(db, "cupid_users", currentUser.id!), { lastSeen: serverTimestamp() }).catch(console.error);

    const fetchStats = async () => {
      try {
        const matchQuery = currentUser.preferredGender === "Any" ? query(collection(db, "cupid_users")) : query(collection(db, "cupid_users"), where("gender", "==", currentUser.preferredGender));
        const matchSnap = await getCountFromServer(matchQuery);
        setMatchCount(Math.max(0, matchSnap.data().count - 1)); 

        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const onlineSnap = await getCountFromServer(query(collection(db, "cupid_users"), where("lastSeen", ">", fifteenMinsAgo)));
        setOnlineCount(onlineSnap.data().count);
      } catch (e) { setMatchCount(0); setOnlineCount(1); }
    };
    fetchStats();
  }, [currentUser]);

  if (!currentUser) return null;

  // Requests List
  const requests = currentUser.incomingRequests || [];

  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-4xl mx-auto w-full relative z-50 px-4 grid md:grid-cols-12 gap-6 min-h-[60vh] items-start pt-8">
        
        {/* --- LEFT COLUMN: PROFILE --- */}
        <div className={`md:col-span-5 ${CARD_BASE} p-6 flex flex-col items-center text-center h-full`}>
            <div className="relative mb-6 group cursor-pointer z-50" onClick={onEditProfile}>
                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-zinc-700 via-zinc-500 to-zinc-300 dark:from-zinc-300 dark:via-zinc-500 dark:to-zinc-700 shadow-2xl hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-black dark:border-white bg-zinc-800 relative">
                        {currentUser.imgs && currentUser.imgs[0] ? <img src={currentUser.imgs[0]} className="w-full h-full object-cover" alt="Profile" /> : <FaUserCircle className="w-full h-full text-zinc-600 p-4" />}
                    </div>
                </div>
                <div className="absolute bottom-0 right-0 bg-white text-black dark:bg-black dark:text-white border border-zinc-200 dark:border-zinc-700 p-2 rounded-full shadow-lg hover:bg-rose-500 hover:text-white transition-colors"><FaUserEdit size={12} /></div>
            </div>
            <h2 className={`text-3xl font-black mb-1 tracking-tight ${TEXT_MAIN}`}>{currentUser.name.split(" ")[0]}</h2>
            <div className="flex items-center gap-2 mb-6"><span className="px-3 py-1 bg-zinc-800 dark:bg-zinc-200 rounded-lg text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">{currentUser.course}</span></div>
            <div className="flex flex-wrap justify-center gap-2 mb-8 w-full">{currentUser.tags.slice(0, 3).map(tag => (<span key={tag} className="text-[10px] px-2 py-1 rounded-md bg-zinc-800/50 dark:bg-zinc-200/50 text-zinc-500 dark:text-zinc-600 font-bold border border-zinc-700/50 dark:border-zinc-300">#{tag}</span>))}</div>
            <button onClick={onLogout} className="mt-auto text-xs font-bold text-zinc-500 hover:text-white dark:hover:text-black flex items-center gap-2 transition-colors py-2 cursor-pointer z-50"><FaSignOutAlt /> SIGN OUT</button>
        </div>

        {/* --- RIGHT COLUMN: STATS & ACTIONS --- */}
        <div className="md:col-span-7 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
                <div className={STAT_BOX}>
                    <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Online</span></div>
                    <div className="flex items-baseline gap-1"><FaGlobeAsia className={`text-lg ${TEXT_SUB}`} /><span className={`text-3xl font-black ${TEXT_MAIN}`}>{onlineCount === null ? <FaSpinner className="animate-spin text-sm"/> : onlineCount}</span></div>
                </div>
                <div className={STAT_BOX}>
                    <div className="flex items-center gap-2 mb-2"><FaVenusMars className="text-rose-500 text-xs" /><span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Pool</span></div>
                    <div className="flex items-baseline gap-1"><FaFire className={`text-lg ${TEXT_SUB}`} /><span className={`text-3xl font-black ${TEXT_MAIN}`}>{matchCount === null ? "..." : matchCount}</span></div>
                </div>
            </div>

            <div className={`${CARD_BASE} p-8 flex flex-col justify-center`}>
                <h3 className={`text-2xl font-black mb-2 ${TEXT_MAIN}`}>{currentUser.currentMatchId ? "Match In Progress" : (isLocked ? "Matching Locked" : "Ready to Mingle?")}</h3>
                <p className={`text-sm mb-8 leading-relaxed max-w-sm ${TEXT_SUB}`}>
                    {currentUser.currentMatchId ? "You have an active connection! Jump back in." : (isLocked ? "Sign-ups are open! Matching opens Feb 12." : "The algorithm is ready.")}
                </p>

                {currentUser.currentMatchId ? (
                    <button onClick={() => onContinueChat(currentUser.currentMatchId!, currentUser.id!)} className={BTN_ACTIVE}><FaComments size={20} /><div><span className="block leading-none">OPEN CHAT</span><span className="text-[10px] opacity-80 font-normal">Continue conversation</span></div></button>
                ) : isLocked ? (
                    <div className="w-full py-4 bg-zinc-800/50 dark:bg-zinc-200/50 border border-zinc-700/50 dark:border-zinc-300 rounded-2xl flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center gap-2 text-rose-500 mb-1"><FaLock /> <span className="font-bold text-sm">OPENS FEB 12</span></div>
                        {timeLeft && <div className="flex gap-3 text-center">{Object.entries(timeLeft).map(([label, value]) => (<div key={label} className="flex flex-col"><span className={`text-2xl font-black font-mono leading-none ${TEXT_MAIN}`}>{String(value).padStart(2, '0')}</span><span className="text-[8px] text-zinc-500 uppercase tracking-widest">{label}</span></div>))}</div>}
                    </div>
                ) : (
                    <button onClick={onStartMatching} className={BTN_PRIMARY}><FaHeart size={20} className="text-rose-500" /><div><span className="block leading-none">FIND A MATCH</span><span className="text-[10px] opacity-60 font-normal">Sends Request</span></div></button>
                )}
            </div>

            {/* --- ADMIRERS / REQUESTS SECTION --- */}
            {requests.length > 0 && (
                 <div className={`${CARD_BASE} p-6`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FaInbox className="text-rose-500" />
                            <h3 className={`font-black text-sm uppercase tracking-wide ${TEXT_MAIN}`}>Admirers ({requests.length}/3)</h3>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <AnimatePresence>
                            {requests.map((req) => (
                                <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 dark:bg-zinc-200/50 border border-zinc-700/30 dark:border-zinc-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border border-zinc-600">
                                            <img src={req.img} alt={req.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm font-bold leading-none ${TEXT_MAIN}`}>{req.name.split(' ')[0]}</h4>
                                            <span className="text-[10px] text-zinc-500 dark:text-zinc-500 uppercase font-bold">{req.course}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => onRejectRequest(req)} className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 dark:bg-white text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"><FaTimes size={12} /></button>
                                        <button onClick={() => onAcceptRequest(req)} className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white hover:scale-110 transition-transform shadow-lg shadow-green-500/20"><FaCheck size={12} /></button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                 </div>
            )}
        </div>
    </motion.div>
  );
};

const FaSpinner = ({className}: {className?: string}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);