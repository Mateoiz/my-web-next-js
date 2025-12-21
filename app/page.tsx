"use client";

import { useState, useRef, MouseEvent, TouchEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaArrowRight, FaTerminal } from "react-icons/fa";

// --- COMPONENT IMPORTS ---
import UpcomingEventToast from "./components/UpcomingEventToast";
import SecretGame from "./components/SecretGame"; 
import FloatingCubes from "./components/FloatingCubes"; 
import CircuitCursor from "./components/CircuitCursor"; 

const letterContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.3,
    },
  },
};

export default function Home() {
  const [maskPosition, setMaskPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const updateMask = (clientX: number, clientY: number) => {
    if (!textRef.current) return;
    const rect = textRef.current.getBoundingClientRect();
    setMaskPosition({
      x: clientX - rect.left,
      y: clientY - rect.top,
    });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    updateMask(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    updateMask(touch.clientX, touch.clientY);
  };

  return (
    <main className="min-h-screen relative selection:bg-green-500/30 bg-white dark:bg-black overflow-hidden font-sans">
      
      {/* --- BACKGROUND LAYERS --- */}
      <div className="absolute inset-0 z-0">
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-500/20 rounded-full blur-[120px] mix-blend-screen dark:mix-blend-lighten animate-pulse duration-[10s]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen dark:mix-blend-lighten animate-pulse duration-[12s] delay-1000" />
         <div className="hidden sm:block">
            <FloatingCubes />
         </div>
      </div>

      <div className="hidden md:block">
        <CircuitCursor />
      </div>
      <SecretGame />

      {/* --- MAIN CONTENT --- */}
      <section className="min-h-screen flex flex-col justify-center items-center text-center px-4 relative z-10 py-12 md:py-0">
        <UpcomingEventToast />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 md:mb-8"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/5 backdrop-blur-md text-[10px] md:text-xs font-mono text-green-700 dark:text-green-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            System Online
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-4 max-w-7xl flex flex-col items-center w-full" 
        >
          {/* --- JPCS SPOTLIGHT HEADER --- */}
          <div 
            ref={textRef}
            className="relative cursor-default select-none group w-full flex justify-center py-4 touch-none"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
          >
            {/* BASE TEXT (Gray Gradient) */}
            <div className="flex justify-center items-center relative">
                {/* SNOW CAP OVERLAY (CSS Effect) - Kept this */}
                <div className="absolute inset-0 w-full h-full pointer-events-none z-20 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/snow.png')] opacity-30 animate-[snow_10s_linear_infinite]" />

                {["J", "P", "C", "S"].map((char, index) => (
                    <div key={index} className="relative">
                        {/* SANTA HAT REMOVED FROM HERE */}
                        
                        <span className="text-[22vw] md:text-[10rem] font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-zinc-300 to-zinc-500 dark:from-zinc-600 dark:to-zinc-900 leading-none transition-all duration-300 group-hover:blur-[2px] group-hover:opacity-50">
                            {char}
                        </span>
                    </div>
                ))}
            </div>
            
            {/* SPOTLIGHT TEXT (Green Overlay) */}
            <div 
              className="absolute top-4 md:top-4 left-0 w-full flex justify-center pointer-events-none transition-opacity duration-200 leading-none"
              style={{
                opacity: isHovered ? 1 : 0,
                maskImage: `radial-gradient(circle 180px at ${maskPosition.x}px ${maskPosition.y}px, black, transparent)`,
                WebkitMaskImage: `radial-gradient(circle 180px at ${maskPosition.x}px ${maskPosition.y}px, black, transparent)`,
                textShadow: "0 0 30px rgba(34,197,94,0.5)"
              }}
            >
               {["J", "P", "C", "S"].map((char, index) => (
                    <span key={index} className="text-[22vw] md:text-[10rem] font-extrabold tracking-tighter text-green-500 dark:text-green-400">
                        {char}
                    </span>
                ))}
            </div>
          </div>

          {/* --- SUBTITLE --- */}
          <motion.div
             variants={letterContainerVariants}
             initial="hidden"
             animate="visible"
             className="w-full px-2"
          >
            <h3 className="text-xs sm:text-sm md:text-lg font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-[0.2em] md:tracking-[0.5em] text-center border-b border-zinc-200 dark:border-zinc-800/50 pb-6 mb-6 leading-relaxed">
              Junior Philippine Computer Society
            </h3>
          </motion.div>

          {/* --- UNIVERSITY NAME & TAGLINE --- */}
          <div className="space-y-3 px-4 w-full">
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="text-lg sm:text-2xl md:text-3xl font-light text-green-700 dark:text-green-500 tracking-widest uppercase break-words"
            >
              De La Salle Araneta University
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-zinc-600 dark:text-zinc-400 text-sm md:text-lg max-w-2xl mx-auto px-4" 
            >
              Empowering the next generation of tech innovators.
            </motion.p>
          </div>
        </motion.div>

        {/* --- BUTTONS --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="mt-12 md:mt-16 flex flex-col sm:flex-row gap-4 w-full max-w-md sm:max-w-none justify-center px-4"
        >
          <Link 
            href="/About"
            className="group relative w-full sm:w-auto px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-full overflow-hidden transition-all active:scale-95 hover:scale-105 hover:shadow-[0_0_40px_rgba(34,197,94,0.3)] flex justify-center items-center"
          >
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2 group-hover:text-white transition-colors">
                Learn more <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </span>
          </Link>

          <Link 
            href="/Contact"
            className="w-full sm:w-auto px-8 py-4 backdrop-blur-sm bg-white/5 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <FaTerminal className="text-xs opacity-70" /> Contact us
          </Link>
        </motion.div>
      </section>
      
      {/* CSS Animation for Snow Texture */}
      <style jsx global>{`
        @keyframes snow {
            0% { background-position: 0 0; }
            100% { background-position: 100px 100px; }
        }
      `}</style>
    </main>
  );
}