"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaMicrochip } from "react-icons/fa"; 
import { useLoading } from "../context/LoadingContext"; 

export default function SplashScreen() {
  const { setIsLoading } = useLoading(); 
  const [progress, setProgress] = useState(0);
  
  // We use null initially so we don't accidentally flash the UI while checking storage
  const [isFirstVisit, setIsFirstVisit] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Check if the user has already seen the splash screen in this tab
    const hasSeenSplash = sessionStorage.getItem("jpcs_has_seen_splash");
    
    if (hasSeenSplash) {
      // If yes, instantly tell the app we are done loading and skip the animation
      setIsFirstVisit(false);
      setIsLoading(false); 
    } else {
      // If no, start the sequence
      setIsFirstVisit(true);
    }
  }, [setIsLoading]);

  useEffect(() => {
    // Only run the progress interval if we confirmed it's their first visit
    if (isFirstVisit !== true) return; 

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 10) + 1;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isFirstVisit]);

  useEffect(() => {
    if (progress >= 100) {
      // 2. Save a token to session storage so it doesn't run again on the next click
      sessionStorage.setItem("jpcs_has_seen_splash", "true");
      
      const timeout = setTimeout(() => {
        setIsLoading(false); 
      }, 800); 
      
      return () => clearTimeout(timeout);
    }
  }, [progress, setIsLoading]);

  // Prevent any weird UI flashes while checking session storage
  if (isFirstVisit === false || isFirstVisit === null) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }} 
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