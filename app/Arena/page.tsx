"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";

// --- IMPORT COMPONENTS ---
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor";
import BattleshipGame from "../components/Battleship"; // Importing the separated component

export default function BattleshipPage() {
  return (
    <section className="min-h-screen relative overflow-hidden transition-colors duration-500 bg-zinc-50 dark:bg-black font-sans">
      
      {/* --- BACKGROUND SYSTEM --- */}
      <div className="hidden md:block">
        <CircuitCursor />
      </div>
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30 dark:opacity-100">
         <FloatingCubes />
      </div>
      
      {/* Gradient Overlay (Updated to Green for both modes) */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-green-100/40 dark:from-green-900/10 to-transparent pointer-events-none z-0" />

      {/* --- BACK BUTTON (Floating Top Left) --- */}
      <div className="absolute top-24 left-4 md:left-8 z-40">
        <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-green-400 font-bold hover:scale-105 transition-transform shadow-sm group">
            <FaArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-xs uppercase tracking-widest">Abort</span>
        </Link>
      </div>

      {/* --- GAME CONTAINER (Added pt-32 for Navbar Clearance) --- */}
      <div className="relative z-10 container mx-auto px-4 pt-32 pb-12 flex flex-col items-center justify-center min-h-screen">
         <BattleshipGame />
      </div>

    </section>
  );
}