"use client";

import { useState, useRef, useEffect } from "react";
import { FaMusic, FaSlash } from "react-icons/fa";

export default function MusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  // 1. ADD THIS STATE
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 2. SET MOUNTED TO TRUE ON LOAD
    setMounted(true);

    audioRef.current = new Audio("/bg-music.mp3");
    
    if (audioRef.current) {
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3; 
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.error("Playback failed:", err);
      });
      setIsPlaying(true);
    }
  };

  // 3. PREVENT RENDERING UNTIL MOUNTED
  // This ensures Math.random() only runs on the browser, preventing the mismatch
  if (!mounted) return null;

  return (
    <>
      {/* --- 1. THE VISUALIZER OVERLAY --- */}
      <div 
        className={`fixed bottom-0 left-0 w-full h-32 z-30 pointer-events-none flex items-end justify-center gap-1 md:gap-2 px-4 transition-opacity duration-1000 ${
          isPlaying ? "opacity-100" : "opacity-0"
        }`}
      >
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="w-2 md:w-3 bg-zinc-800 dark:bg-green-500/50 rounded-t-sm transition-all duration-300"
            style={{
              // Math.random() is now safe because we are strictly on the client
              animation: isPlaying ? `musicWave 1s ease-in-out infinite` : "none",
              animationDelay: `${Math.random() * 0.5}s`,
              height: isPlaying ? `${Math.random() * 40 + 10}%` : "10px", 
            }}
          />
        ))}
      </div>

      {/* --- 2. THE TOGGLE BUTTON --- */}
      <button
        onClick={toggleMusic}
        className={`
          fixed bottom-24 right-6 z-[9999]
          w-10 h-10 flex items-center justify-center
          rounded-full shadow-lg border-2
          transition-all duration-300 ease-in-out
          hover:scale-110 active:scale-90
          ${
            isPlaying 
              ? "bg-green-500 border-green-400 text-white animate-pulse" 
              : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400"
          }
        `}
        aria-label="Toggle Background Music"
        title={isPlaying ? "Pause Music" : "Play Music"}
      >
        <div className="relative">
          <FaMusic size={14} />
          {!isPlaying && (
             <span className="absolute -top-1 -right-1 text-red-500 text-xs font-bold">
               <FaSlash className="rotate-90 opacity-80" size={14}/>
             </span>
          )}
        </div>
      </button>

      {/* --- 3. CUSTOM CSS FOR THE ANIMATION --- */}
      <style jsx global>{`
        @keyframes musicWave {
          0%, 100% {
            height: 10px;
            opacity: 0.5;
          }
          50% {
            height: 80px;
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}