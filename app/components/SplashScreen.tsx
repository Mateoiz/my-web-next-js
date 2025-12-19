"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaMicrochip } from "react-icons/fa"; 
import { useLoading } from "../context/LoadingContext"; // <--- Import the Context

export default function SplashScreen() {
  // 1. Get the setter from context instead of using props
  const { setIsLoading } = useLoading(); 
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // animate progress bar from 0 to 100
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Randomize the increment for a "hacking" feel
        return prev + Math.floor(Math.random() * 10) + 1;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      // Small delay at 100% before telling the app we are done
      const timeout = setTimeout(() => {
        setIsLoading(false); // <--- This triggers the Main Content to reveal
      }, 800); // Increased slightly to let the "ACCESS GRANTED" text shine
      
      return () => clearTimeout(timeout);
    }
  }, [progress, setIsLoading]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }} // Note: This only runs if wrapped in <AnimatePresence> in the parent
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-green-500 font-mono"
    >
      {/* LOGO AREA */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex flex-col items-center"
      >
        <div className="relative">
            <div className="absolute inset-0 bg-green-500 blur-xl opacity-20 animate-pulse"></div>
            <FaMicrochip className="text-8xl mb-4 relative z-10" />
        </div>
        
        <h1 className="text-3xl font-black tracking-[0.2em] uppercase">
          JPCS <span className="text-white">TERMINAL</span>
        </h1>
      </motion.div>

      {/* PROGRESS BAR */}
      <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden relative">
        <motion.div 
          className="h-full bg-green-500 shadow-[0_0_10px_#22c55e]"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
        />
      </div>

      {/* TEXT STATUS */}
      <div className="mt-4 text-xs text-green-500/60 font-mono min-h-[20px]">
        {progress < 100 ? (
           <span>INITIALIZING SYSTEM... {Math.min(progress, 99)}%</span>
        ) : (
           <span className="text-white font-bold blink">ACCESS GRANTED</span>
        )}
      </div>
      
      <style jsx>{`
        .blink { animation: blinker 1s linear infinite; }
        @keyframes blinker { 50% { opacity: 0; } }
      `}</style>
    </motion.div>
  );
}