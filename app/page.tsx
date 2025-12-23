"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FaArrowRight, FaTerminal } from "react-icons/fa";

// --- COMPONENT IMPORTS ---
import UpcomingEventToast from "./components/UpcomingEventToast";
import SecretGame from "./components/SecretGame"; 
import FloatingCubes from "./components/FloatingCubes"; 
import CircuitCursor from "./components/CircuitCursor"; 

export default function Home() {
  return (
    <main className="min-h-screen relative selection:bg-green-500/30 bg-white dark:bg-black overflow-hidden font-sans">
      
      {/* --- BACKGROUND LAYERS --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         {/* Grid */}
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
         
         {/* Static Blobs */}
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl opacity-40" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl opacity-40" />
         
         {/* Floating Cubes */}
         <div className="absolute inset-0 opacity-40 sm:opacity-60">
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
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 md:mb-8"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/5 text-[10px] md:text-xs font-mono text-green-700 dark:text-green-400">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            System Online
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }} 
          className="space-y-4 max-w-7xl flex flex-col items-center w-full" 
        >
          {/* --- CYBERPUNK HEADER --- */}
          <div className="relative w-full flex justify-center py-4 select-none overflow-visible px-4">
            {/* THE GLITCH TEXT */}
            <h1 
                className="glitch-text text-[22vw] md:text-[10rem] font-extrabold tracking-tighter leading-none relative z-10"
                data-text="JPCS"
            >
                JPCS
            </h1>
          </div>

          {/* --- SUBTITLE --- */}
          <div className="w-full px-2">
            <h3 className="text-xs sm:text-sm md:text-lg font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-[0.2em] md:tracking-[0.5em] text-center border-b border-zinc-200 dark:border-zinc-800/50 pb-6 mb-6 leading-relaxed">
              Junior Philippine Computer Society
            </h3>
          </div>

          {/* --- UNIVERSITY NAME & TAGLINE --- */}
          <div className="space-y-3 px-4 w-full">
            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-lg sm:text-2xl md:text-3xl font-light text-green-700 dark:text-green-500 tracking-widest uppercase break-words"
            >
              De La Salle Araneta University
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-zinc-600 dark:text-zinc-400 text-sm md:text-lg max-w-2xl mx-auto px-4" 
            >
              Empowering the next generation of tech innovators.
            </motion.p>
          </div>
        </motion.div>

        {/* --- BUTTONS --- */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-12 md:mt-16 flex flex-col sm:flex-row gap-4 w-full max-w-md sm:max-w-none justify-center px-4"
        >
          <Link 
            href="/About"
            className="group relative w-full sm:w-auto px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-full overflow-hidden transition-transform active:scale-95 flex justify-center items-center"
          >
              <div className="absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2 group-hover:text-white transition-colors">
                Learn more <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </span>
          </Link>

          <Link 
            href="/Contact"
            className="w-full sm:w-auto px-8 py-4 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            <FaTerminal className="text-xs opacity-70" /> Contact us
          </Link>
        </motion.div>
      </section>
      
      <style jsx global>{`
        /* --- INTENSE CONSTANT GLITCH EFFECT --- */
        
        .glitch-text {
          position: relative;
          color: #27272a; /* Zinc 800 */
          /* Adds the main shake and color spill animation to the base text */
          animation: main-glitch-shake 2s infinite linear alternate-reverse;
        }
        
        /* Dark Mode Color */
        :global(.dark) .glitch-text {
          color: #f4f4f5; /* Zinc 100 */
        }

        /* The "Ghost" layers for slicing */
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: inherit; 
          opacity: 0.7;
        }

        /* Layer 1: Red/Magenta Slice */
        .glitch-text::before {
          color: #ff00ff; 
          z-index: -1;
          /* Increased speed and intensity */
          animation: glitch-slice-1 3s infinite steps(20) alternate-reverse;
        }

        /* Layer 2: Cyan/Green Slice */
        .glitch-text::after {
          color: #00ffff; 
          z-index: -2;
          /* Different speed for chaotic feel */
          animation: glitch-slice-2 2.5s infinite steps(20) alternate-reverse;
        }

        /* --- Keyframes --- */

        /* NEW: Main text shake and color spill */
        @keyframes main-glitch-shake {
          0% { text-shadow: none; transform: translate(0); }
          /* Violent color separation spikes */
          2% { text-shadow: 4px -3px 0px #ff0000, -4px 3px 0px #00ff00; transform: translate(-3px, 1px); }
          4% { text-shadow: none; transform: translate(0); }
          
          /* Subtle jitters */
          20% { transform: translate(1px, -1px); }
          22% { transform: translate(-2px, 0px); }
          
          /* Another violent spike */
          55% { text-shadow: -5px 4px 0px #0000ff, 5px -4px 0px #ffff00; transform: translate(4px, 2px); }
          57% { text-shadow: none; transform: translate(0); }
          
          /* More jitter */
          80% { transform: translate(2px, -2px); }
        }

        /* Updated: More aggressive slicing and movement layers */
        @keyframes glitch-slice-1 {
          0% { clip-path: inset(20% 0 80% 0); transform: translate(-5px, 2px); }
          20% { clip-path: inset(60% 0 10% 0); transform: translate(5px, -2px); }
          40% { clip-path: inset(40% 0 50% 0); transform: translate(-5px, 5px); }
          60% { clip-path: inset(80% 0 5% 0); transform: translate(5px, -5px); }
          80% { clip-path: inset(10% 0 70% 0); transform: translate(-3px, 3px); }
          100% { clip-path: inset(30% 0 50% 0); transform: translate(3px, -3px); }
        }

        @keyframes glitch-slice-2 {
          0% { clip-path: inset(10% 0 60% 0); transform: translate(5px, -2px); }
          20% { clip-path: inset(80% 0 5% 0); transform: translate(-5px, 2px); }
          40% { clip-path: inset(30% 0 20% 0); transform: translate(3px, -5px); }
          60% { clip-path: inset(15% 0 80% 0); transform: translate(-3px, 5px); }
          80% { clip-path: inset(55% 0 10% 0); transform: translate(5px, 3px); }
          100% { clip-path: inset(40% 0 30% 0); transform: translate(-5px, -3px); }
        }
      `}</style>
    </main>
  );
}