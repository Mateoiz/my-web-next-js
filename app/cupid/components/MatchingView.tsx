"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaHeart, FaRandom, FaCheckCircle, FaMapMarkerAlt, FaGraduationCap, FaRuler, FaUser } from "react-icons/fa";
import { UserProfile } from "../types";

interface MatchingViewProps {
  state: 'SCANNING' | 'MATCH_FOUND' | 'CONNECTING' | 'ITS_A_MATCH';
  match: UserProfile | null;
  currentUser: UserProfile | null;
  compatibility: number;
  hasRerolled: boolean;
  onReroll: () => void;
  onConnect: () => void;
  // Note: isRevealed props removed as they are no longer needed
}

export const MatchingView = ({ state, match, currentUser, compatibility, hasRerolled, onReroll, onConnect }: MatchingViewProps) => {
  const [imgIndex, setImgIndex] = useState(0);
  
  // Ensure we always have an array, even if empty
  const images = (match?.imgs && match.imgs.length > 0) ? match.imgs : [""];

  // Handle Image Navigation (Tap left/right)
  const nextImg = (e: React.MouseEvent) => { e.stopPropagation(); setImgIndex((prev) => (prev + 1) % images.length); };
  const prevImg = (e: React.MouseEvent) => { e.stopPropagation(); setImgIndex((prev) => (prev - 1 + images.length) % images.length); };

  // --- 1. SCANNING STATE ---
  if (state === 'SCANNING') return (
    <div className="flex flex-col items-center justify-center h-64 relative z-10">
      <div className="relative w-32 h-32 mb-8">
          <span className="absolute inset-0 border-4 border-rose-500/30 rounded-full animate-ping duration-1000"></span>
          <span className="absolute inset-0 border-4 border-rose-500 rounded-full animate-spin border-t-transparent"></span>
          <FaSearch className="absolute inset-0 m-auto text-rose-500 text-3xl animate-pulse" />
      </div>
      <h2 className="text-xl font-mono text-rose-400 animate-pulse tracking-widest">SCANNING DATABASE...</h2>
    </div>
  );

  // --- 2. CONNECTING STATE ---
  if (state === 'CONNECTING') return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-64 relative z-10 text-center">
        <div className="relative w-32 h-32 mb-8">
            <span className="absolute inset-0 border-4 border-rose-500/30 rounded-full animate-ping duration-1000"></span>
            <div className="absolute inset-0 flex items-center justify-center"><FaHeart className="text-rose-500 text-5xl animate-pulse" /></div>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">WAITING FOR {match?.name.split(" ")[0].toUpperCase()}...</h2>
        <p className="text-zinc-400 text-sm">Asking them to connect with you.</p>
    </motion.div>
  );

  // --- 3. MATCH SUCCESS STATE ---
  if (state === 'ITS_A_MATCH') return (
    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center h-full relative z-50">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-500 to-pink-600 drop-shadow-[0_0_50px_rgba(225,29,72,0.8)] italic transform -rotate-6 text-center">
            IT'S A<br/>MATCH!
        </h1>
        <div className="flex items-center gap-4 md:gap-8 mt-12 relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.5)] z-10">
                <img src={currentUser?.imgs[0]} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="bg-rose-500 rounded-full p-3 shadow-xl border-4 border-black">
                    <FaHeart className="text-2xl text-white animate-bounce" />
                </div>
            </div>
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.5)] z-10">
                <img src={match?.imgs[0]} className="w-full h-full object-cover" />
            </div>
        </div>
    </motion.div>
  );

  // --- 4. PROFILE CARD STATE (Default) ---
  return (
    <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="max-w-md mx-auto w-full relative z-10"
    >
        {/* Main Card Container */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col h-[75vh] md:h-auto md:min-h-[600px]">
          
          {/* --- IMAGE SECTION (Takes up top 65%) --- */}
          <div className="relative h-[65%] w-full bg-black group cursor-pointer">
              
              {/* Image */}
              <img src={images[imgIndex]} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-90" />

              {/* Story Progress Bars */}
              <div className="absolute top-3 left-0 right-0 px-3 flex gap-1 z-20">
                  {images.map((_, idx) => (
                      <div key={idx} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                          <div className={`h-full bg-white transition-all duration-300 ${idx === imgIndex ? 'w-full' : idx < imgIndex ? 'w-full' : 'w-0'}`} />
                      </div>
                  ))}
              </div>

              {/* Navigation Zones (Invisible) */}
              <div className="absolute inset-y-0 left-0 w-1/2 z-10" onClick={prevImg} />
              <div className="absolute inset-y-0 right-0 w-1/2 z-10" onClick={nextImg} />

              {/* Compatibility Badge */}
              <div className="absolute top-6 right-4 z-20 bg-green-500 text-black font-black text-xs px-3 py-1.5 rounded-full shadow-lg border-2 border-green-400">
                  {compatibility}% MATCH
              </div>

              {/* Overlay Info (Name & Basics) */}
              <div className="absolute bottom-0 left-0 w-full p-6 z-20">
                  <h2 className="text-4xl font-black text-white drop-shadow-md flex items-end gap-3 leading-none">
                      {match?.name.split(" ")[0]} 
                      <span className="text-2xl font-medium text-zinc-300">{match?.age}</span>
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-3 text-xs font-bold text-white/90">
                      <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
                          <FaGraduationCap /> {match?.course}
                      </span>
                      {match?.height && (
                          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 border border-white/10">
                              <FaRuler /> {match.height}
                          </span>
                      )}
                  </div>
              </div>
          </div>

          {/* --- DETAILS SECTION (Bottom 35%) --- */}
          <div className="h-[35%] bg-zinc-900 p-6 flex flex-col relative">
            
            {/* Scrollable Bio & Tags */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 pr-2">
                
                {/* Bio Quote */}
                <div className="mb-4 relative pl-4 border-l-2 border-rose-500">
                    <p className="text-zinc-300 text-sm leading-relaxed italic">
                        "{match?.bio || "Just figuring this out..."}"
                    </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {match?.tags.map((t, i) => (
                        <span key={i} className={`text-[10px] px-2 py-1 rounded-md border font-bold ${currentUser?.tags.includes(t) ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                            #{t}
                        </span>
                    ))}
                </div>
            </div>

            {/* Action Buttons (Fixed at Bottom) */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-800">
                <button 
                    onClick={onReroll} 
                    disabled={hasRerolled} 
                    className="py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FaRandom /> {hasRerolled ? "No Rerolls" : "Pass"}
                </button>
                
                <button 
                    onClick={onConnect} 
                    className="py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-900/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <FaHeart className="animate-pulse" /> CONNECT
                </button>
            </div>

          </div>
        </div>
    </motion.div>
  );
};