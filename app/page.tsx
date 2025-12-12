"use client";

import { useState, useRef, MouseEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FaArrowRight, FaInfoCircle } from "react-icons/fa";

export default function Home() {
  // State to track the mouse position relative to the text
  const [maskPosition, setMaskPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Updates the mask coordinates when mouse moves over the text
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!textRef.current) return;
    const rect = textRef.current.getBoundingClientRect();
    setMaskPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <section className="min-h-screen flex flex-col justify-center items-center text-center px-4 relative z-10 overflow-hidden">
      
      {/* Decorative Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* --- MAIN HEADLINES --- */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="space-y-6 max-w-4xl flex flex-col items-center"
      >
        
        {/* INTERACTIVE SPOTLIGHT TEXT */}
        {/* We wrap the text in a relative container to stack the layers */}
        <div 
          ref={textRef}
          className="relative cursor-default select-none"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* LAYER 1: Base Text (Gray/White Gradient) */}
          <h1 className="text-7xl md:text-9xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-zinc-400 to-zinc-700 opacity-80">
            JPCS
          </h1>

          {/* LAYER 2: Spotlight Text (Bright Green) */}
          {/* This layer sits exactly on top but is masked by the cursor position */}
          <h1 
            className="absolute top-0 left-0 text-7xl md:text-9xl font-extrabold tracking-tighter text-green-500 pointer-events-none transition-opacity duration-500"
            style={{
              // If hovered, we show the mask. If not, we hide the green layer completely (opacity 0)
              opacity: isHovered ? 1 : 0,
              // The Magic: A radial gradient mask that follows x/y coordinates
              maskImage: `radial-gradient(circle 120px at ${maskPosition.x}px ${maskPosition.y}px, black, transparent)`,
              WebkitMaskImage: `radial-gradient(circle 120px at ${maskPosition.x}px ${maskPosition.y}px, black, transparent)`
            }}
          >
            JPCS
          </h1>
        </div>

        {/* University Name */}
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-2xl md:text-4xl font-light text-green-400 tracking-widest uppercase"
        >
          De La Salle Araneta University
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto pt-4"
        >
          Empowering the next generation of tech innovators and leaders.
        </motion.p>
      </motion.div>

      {/* --- BUTTON GROUP --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-12 flex flex-col sm:flex-row gap-6"
      >
        {/* 'About Us' Button */}
        <Link 
          href="/About"
          className="group relative px-8 py-4 bg-transparent border border-green-500 text-green-500 font-bold rounded-full overflow-hidden transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
        >
          <div className="absolute inset-0 w-0 bg-green-500 transition-all duration-250ms ease-out group-hover:w-full opacity-10" />
          <span className="relative flex items-center gap-2">
            <FaInfoCircle /> About Us
          </span>
        </Link>

        {/* 'Contact Us' Button */}
        <Link 
          href="/Contact"
          className="px-8 py-4 bg-green-600 hover:bg-green-500 text-black font-bold rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_35px_rgba(34,197,94,0.6)] transition-all flex items-center gap-2 transform hover:scale-105"
        >
          Contact Us <FaArrowRight />
        </Link>
      </motion.div>

    </section>
  );
}