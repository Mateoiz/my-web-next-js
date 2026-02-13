"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaUserEdit, FaSignOutAlt, FaUserCircle, FaGlobeAsia, FaBolt, FaSpinner } from "react-icons/fa";
import { collection, query, where, getCountFromServer, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/db"; 
import { UserProfile } from "../types";

const CARD_BASE = "bg-white/60 border border-zinc-200 backdrop-blur-xl rounded-3xl overflow-hidden relative shadow-xl dark:bg-black/60 dark:border-zinc-800 dark:shadow-[0_0_40px_rgba(0,0,0,0.2)]";
const STAT_BOX = "flex flex-col items-center justify-center p-4 rounded-2xl transition-colors bg-white/50 border border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800";
const TEXT_MAIN = "text-zinc-900 dark:text-white";
const TEXT_SUB = "text-zinc-500 dark:text-zinc-400";

// Big "Omegle" Start Button
const BTN_START = "w-full py-6 font-black rounded-2xl transition-all flex flex-col items-center justify-center gap-2 text-xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] bg-rose-600 text-white hover:bg-rose-500 shadow-rose-500/20";

interface HomeViewProps {
  currentUser: UserProfile | null;
  onStartChat: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
}

export const HomeView = ({ currentUser, onStartChat, onEditProfile, onLogout }: HomeViewProps) => {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    updateDoc(doc(db, "cupid_users", currentUser.id!), { lastSeen: serverTimestamp() });

    const fetchStats = async () => {
      try {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const onlineSnap = await getCountFromServer(query(collection(db, "cupid_users"), where("lastSeen", ">", fifteenMinsAgo)));
        setOnlineCount(onlineSnap.data().count);
      } catch (e) { setOnlineCount(1); }
    };
    fetchStats();
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-4xl mx-auto w-full relative z-50 px-4 grid md:grid-cols-12 gap-6 min-h-[60vh] items-center pt-8">
        
        {/* PROFILE SIDE */}
        <div className={`md:col-span-5 ${CARD_BASE} p-6 flex flex-col items-center text-center h-full min-h-[400px]`}>
            <div className="relative mb-6 group cursor-pointer z-50" onClick={onEditProfile}>
                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-500 shadow-2xl hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800 relative">
                        {currentUser.imgs && currentUser.imgs[0] ? <img src={currentUser.imgs[0]} className="w-full h-full object-cover" alt="Profile" /> : <FaUserCircle className="w-full h-full text-zinc-400 p-4" />}
                    </div>
                </div>
                <div className="absolute bottom-0 right-0 bg-white text-zinc-900 border border-zinc-200 dark:bg-black dark:text-white dark:border-zinc-700 p-2 rounded-full shadow-lg hover:bg-rose-500 hover:text-white transition-colors"><FaUserEdit size={12} /></div>
            </div>
            <h2 className={`text-3xl font-black mb-1 tracking-tight ${TEXT_MAIN}`}>{currentUser.name.split(" ")[0]}</h2>
            <div className="flex items-center gap-2 mb-6"><span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border border-zinc-200 dark:border-zinc-800">{currentUser.course}</span></div>
            <div className="flex flex-wrap justify-center gap-2 mb-8 w-full">{currentUser.tags.slice(0, 3).map(tag => (<span key={tag} className="text-[10px] px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-bold border border-zinc-200 dark:border-zinc-800">#{tag}</span>))}</div>
            <button onClick={onLogout} className="mt-auto text-xs font-bold text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 flex items-center gap-2 transition-colors py-2 cursor-pointer z-50"><FaSignOutAlt /> SIGN OUT</button>
        </div>

        {/* ACTION SIDE */}
        <div className="md:col-span-7 flex flex-col gap-6">
            <div className={STAT_BOX}>
                <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Online Now</span></div>
                <div className="flex items-baseline gap-1"><FaGlobeAsia className={`text-lg ${TEXT_SUB}`} /><span className={`text-3xl font-black ${TEXT_MAIN}`}>{onlineCount === null ? <FaSpinner className="animate-spin text-sm"/> : onlineCount}</span></div>
            </div>

            <div className={`${CARD_BASE} p-10 flex flex-col justify-center items-center text-center flex-1`}>
                <h3 className={`text-4xl font-black mb-4 ${TEXT_MAIN}`}>RANDOM CHAT</h3>
                <p className={`text-sm mb-8 leading-relaxed max-w-xs ${TEXT_SUB}`}>
                    Connect instantly with a random student from DLSAU. 
                    <br/><span className="text-rose-500 font-bold">No Swiping. Just Talking.</span>
                </p>

                <button onClick={onStartChat} className={BTN_START}>
                    <FaBolt className="animate-pulse" />
                    <span>START MATCHING</span>
                </button>
                <p className="text-[10px] text-zinc-400 mt-4">By clicking start, you agree to be respectful.</p>
            </div>
        </div>
    </motion.div>
  );
};