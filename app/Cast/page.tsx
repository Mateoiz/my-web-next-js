"use client";

import React from 'react';
import Image from "next/image";
import { motion } from "framer-motion";
import { FaLock, FaBolt, FaCode, FaCheckCircle } from "react-icons/fa";

// --- VISUAL COMPONENTS ---
// Assuming these are in the same relative path as your previous file
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor";

export default function PreOrderTeaser() {
  return (
    <section className="min-h-screen relative overflow-hidden bg-zinc-50 dark:bg-black transition-colors duration-300 flex flex-col items-center justify-center py-20">
      
      {/* --- VISUAL EFFECTS --- */}
      <CircuitCursor />
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50"><FloatingCubes /></div>
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-green-100/40 dark:from-green-900/20 to-transparent pointer-events-none z-0" />

      <div className="container mx-auto px-4 relative z-10 text-center">
        
        {/* --- 1. WINNER ANNOUNCEMENT --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-mono text-xs font-bold uppercase tracking-widest mb-6 border border-green-200 dark:border-green-800 shadow-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Official Result
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black mb-6 text-zinc-900 dark:text-white tracking-tighter leading-tight">
            DESIGN <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500 drop-shadow-sm">01</span>
          </h1>
          
          <p className="text-zinc-600 dark:text-zinc-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            The votes are in. The community has spoken.<br className="hidden md:block"/>
            <span className="text-zinc-900 dark:text-white font-bold">CAST Magic (Maroon)</span> is the official shirt of the season.
          </p>
        </motion.div>

        {/* --- 2. HERO IMAGE (DESIGN 1) --- */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative w-full max-w-sm md:max-w-md mx-auto aspect-[4/5] mb-12 group perspective-1000"
        >
          {/* Glowing Backdrop */}
          <div className="absolute inset-0 bg-green-500/30 blur-[60px] rounded-full opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
          
          {/* Card Container */}
          <div className="relative h-full w-full rounded-3xl overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl rotate-0 group-hover:rotate-1 transition-transform duration-500">
            <Image 
              src="/CAST/1.jpg" 
              alt="Winning Design: CAST Magic" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              priority
            />
            
            {/* Winner Badge Overlay */}
            <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-lg border border-zinc-200 dark:border-zinc-700">
                <FaCheckCircle className="text-green-500" />
                <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Winner</span>
            </div>

            {/* Bottom Gradient Overlay */}
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent p-8 pt-24 text-left">
               <h3 className="text-white font-black text-3xl mb-1">CAST Magic</h3>
               <p className="text-green-400 font-mono text-sm tracking-widest uppercase">Maroon Edition</p>
            </div>
          </div>
        </motion.div>

        {/* --- 3. LOCKED ACTION AREA --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          {/* The Locked Button */}
          <button 
            disabled
            className="
              group relative px-12 py-5 rounded-2xl
              bg-zinc-100 dark:bg-zinc-900 
              border-2 border-zinc-200 dark:border-zinc-800
              text-zinc-400 dark:text-zinc-500 
              font-black text-xl tracking-wide uppercase
              cursor-not-allowed overflow-hidden
              shadow-inner
            "
          >
            {/* Button Texture */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.03)_10px,rgba(0,0,0,0.03)_20px)]" />
            
            <span className="relative flex items-center gap-3 z-10">
              <FaLock className="text-lg mb-1" /> Pre-order Locked
            </span>
          </button>
          
          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2 animate-pulse">
            <FaBolt className="text-yellow-500" />
            Awaiting Admin Signal
          </p>
        </motion.div>

        {/* --- 4. FOOTER CREDIT --- */}
        <div className="mt-24 opacity-60 hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                <FaCode className="text-green-500" />
                <span>Designed by: Ice Matthew Ramirez</span>
            </div>
        </div>

      </div>
    </section>
  );
}