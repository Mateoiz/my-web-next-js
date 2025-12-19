"use client";

import { useState, useRef, MouseEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaArrowRight, FaInfoCircle } from "react-icons/fa";

// --- COMPONENT IMPORTS ---
import UpcomingEventToast from "./components/UpcomingEventToast";
import SecretGame from "./components/SecretGame"; 
// Note: We REMOVED SplashScreen import because ClientLayout handles it now
import FloatingCubes from "./components/FloatingCubes"; 
import CircuitCursor from "./components/CircuitCursor"; 

export default function Home() {
  // --- SPOTLIGHT STATE ---
  const [maskPosition, setMaskPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!textRef.current) return;
    const rect = textRef.current.getBoundingClientRect();
    setMaskPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    // The background color is now handled here correctly
    <main className="min-h-screen relative selection:bg-green-500/30 transition-colors duration-300 bg-white dark:bg-black">
      
      {/* WE REMOVED THE SPLASH SCREEN LOGIC HERE.
         The ClientLayout.tsx wraps this entire page and will show
         the Splash Screen automatically if needed.
      */}

      <div className="animate-in fade-in zoom-in-95 duration-1000 ease-out fill-mode-forwards relative">
        <div className="absolute inset-0 z-0">
            <FloatingCubes />
        </div>
        <CircuitCursor />
        <SecretGame />

        <section className="min-h-screen flex flex-col justify-center items-center text-center px-4 relative z-10 overflow-hidden">
          <UpcomingEventToast />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-6 max-w-4xl flex flex-col items-center"
          >
            <div 
              ref={textRef}
              className="relative cursor-default select-none -my-10"
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {/* Light/Dark Mode Gradients */}
              <h1 className="text-7xl md:text-9xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-zinc-800 to-zinc-600 dark:from-zinc-300 dark:to-zinc-500 opacity-80 py-12 px-5 leading-tight transition-all duration-300">
                JPCS
              </h1>
              
              {/* Spotlight Text Layer */}
              <h1 
                className="absolute top-0 left-0 text-7xl md:text-9xl font-extrabold tracking-tighter text-green-600 dark:text-green-500 pointer-events-none transition-opacity duration-500 py-12 px-5 leading-tight"
                style={{
                  opacity: isHovered ? 1 : 0,
                  maskImage: `radial-gradient(circle 120px at ${maskPosition.x}px ${maskPosition.y}px, black, transparent)`,
                  WebkitMaskImage: `radial-gradient(circle 120px at ${maskPosition.x}px ${maskPosition.y}px, black, transparent)`
                }}
              >
                JPCS
              </h1>
            </div>

            <motion.h2 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-2xl md:text-4xl font-light text-green-700 dark:text-green-400 tracking-widest uppercase transition-colors duration-300"
            >
              De La Salle Araneta University
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-black dark:text-white text-lg md:text-xl max-w-2xl mx-auto pt-4 transition-colors duration-300" 
            >
              Empowering the next generation of tech innovators and leaders.
            </motion.p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="mt-12 flex flex-col sm:flex-row gap-6"
          >
            <Link 
              href="/About"
              className="group relative px-8 py-4 bg-transparent border border-green-600 dark:border-green-500 text-green-700 dark:text-green-500 font-bold rounded-full overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
            >
              <div className="absolute inset-0 w-0 bg-green-600 dark:bg-green-500 transition-all duration-250ms ease-out group-hover:w-full opacity-10" />
              <span className="relative flex items-center gap-2">
                <FaInfoCircle /> About Us
              </span>
            </Link>

            <Link 
              href="/Contact"
              className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full shadow-lg hover:shadow-[0_0_35px_rgba(34,197,94,0.6)] transition-all flex items-center gap-2 transform hover:scale-105"
            >
              Contact Us <FaArrowRight />
            </Link>
          </motion.div>
        </section>
      </div>
    </main>
  );
}