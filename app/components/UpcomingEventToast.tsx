"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FaCalendarAlt, FaMapMarkerAlt, FaChevronRight, FaMicrochip, FaTimes } from "react-icons/fa";

const NEXT_EVENT = {
  id: 1,
  title: "General Assembly 2026",
  date: "FEB",
  location: "TBA",
  link: "/Events"
};

export default function HolographicEventTab() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside (Desktop strategy)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      {/* --- MOBILE BACKDROP (Dims screen when open) --- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* --- MAIN WIDGET CONTAINER --- */}
      {/* Adjusted z-index to ensure it sits above most things but below critical modals if any */}
      <div className="fixed top-1/2 -translate-y-1/2 left-0 z-[60] h-auto pointer-events-none">
        
        {/* Wrapper for Pointer Events & Ref */}
        <motion.div 
          ref={containerRef}
          initial={{ x: "-100%" }} 
          animate={{ x: isOpen ? "0%" : "-100%" }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="pointer-events-auto relative flex items-start"
        >
          
          {/* --- 1. THE DATA PANEL (The Drawer) --- */}
          {/* OPTIMIZATION: Reduced width on mobile (w-[75vw] max-w-[260px]) */}
          <div className="relative w-[75vw] max-w-[260px] md:w-80 bg-zinc-900/95 border-r-2 border-green-500/50 backdrop-blur-xl shadow-[0_0_40px_rgba(34,197,94,0.15)] overflow-hidden rounded-r-sm">
            
            {/* Cyberpunk Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
            
            {/* Animated Scanline */}
            <div className="absolute top-0 left-0 w-full h-1 bg-green-500/30 animate-[scan_4s_linear_infinite]" />

            {/* OPTIMIZATION: Reduced padding (p-4 mobile, p-6 desktop) and gap */}
            <div className="relative z-10 p-4 md:p-6 flex flex-col gap-3 md:gap-4">
              
              {/* Header Data */}
              <div className="flex justify-between items-end border-b border-green-500/30 pb-2">
                <div className="flex flex-col">
                  <span className="text-[9px] md:text-[10px] font-mono text-green-500/80 tracking-widest uppercase mb-0.5 md:mb-1">
                    <FaMicrochip className="inline mr-1" /> System_Alert
                  </span>
                  <span className="text-white font-bold text-base md:text-lg leading-none">UPCOMING</span>
                </div>
                {/* Mobile Close Button */}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="md:hidden text-zinc-500 hover:text-white transition-colors p-1"
                >
                  <FaTimes size={14} />
                </button>
                {/* Desktop Status */}
                <div className="hidden md:block text-right">
                  <span className="block text-[10px] font-mono text-zinc-500 uppercase">Status</span>
                  <span className="text-green-400 font-bold text-xs animate-pulse">● LIVE</span>
                </div>
              </div>

              {/* Event Details */}
              <div>
                {/* OPTIMIZATION: Smaller text sizes for mobile */}
                <h3 className="text-lg md:text-2xl font-black text-white uppercase leading-tight mb-2 md:mb-2 line-clamp-2">
                  {NEXT_EVENT.title}
                </h3>
                
                <div className="space-y-2 md:space-y-3 mt-2 md:mt-4">
                  <div className="flex items-center gap-2 md:gap-3 text-zinc-400">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-zinc-800 flex items-center justify-center text-green-500 border border-green-500/20 shrink-0">
                      <FaCalendarAlt className="text-xs md:text-sm" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] md:text-[10px] uppercase tracking-wide text-zinc-500">Date Log</span>
                      <span className="text-xs md:text-sm font-mono text-white font-bold">{NEXT_EVENT.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 text-zinc-400">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-zinc-800 flex items-center justify-center text-green-500 border border-green-500/20 shrink-0">
                      <FaMapMarkerAlt className="text-xs md:text-sm" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] md:text-[10px] uppercase tracking-wide text-zinc-500">Location</span>
                      <span className="text-xs md:text-sm font-mono text-white font-bold line-clamp-1">{NEXT_EVENT.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link 
                href={NEXT_EVENT.link}
                className="group mt-1 md:mt-2 relative w-full bg-green-600 hover:bg-green-500 text-black font-bold py-2 md:py-3 px-4 text-center uppercase tracking-wider text-[10px] md:text-xs transition-colors overflow-hidden rounded-sm"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Details <FaChevronRight size={10} />
                </span>
                {/* Button Glitch Effect */}
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              </Link>

            </div>
          </div>

          {/* --- 2. THE VERTICAL TAB (Trigger) --- */}
          {/* OPTIMIZATION: Reduced tab width and vertical padding on mobile */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-[-36px] md:right-[-48px] top-0 flex flex-col items-center bg-zinc-900 border-y-2 border-r-2 border-green-500/50 text-green-500 py-3 md:py-4 w-9 md:w-12 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-green-900/20 transition-colors active:scale-95"
            style={{ 
              clipPath: "polygon(0 0, 100% 0, 100% 85%, 0% 100%)", 
              borderTopRightRadius: "4px"
            }}
          >
            {/* Arrow Indicator */}
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              className="mb-2 md:mb-4"
            >
              <FaChevronRight className="text-xs md:text-sm" />
            </motion.div>

            {/* Vertical Text */}
            <div className="flex flex-col gap-0.5 md:gap-1 font-mono font-bold text-[10px] md:text-xs tracking-widest select-none">
              <span>E</span>
              <span>V</span>
              <span>E</span>
              <span>N</span>
              <span>T</span>
              <span>S</span>
            </div>

            {/* Decorative Dot */}
            <div className="mt-2 md:mt-4 w-1 h-1 md:w-1.5 md:h-1.5 bg-green-500 rounded-full animate-ping" />
          </button>

        </motion.div>

        {/* Global CSS for the scanline animation */}
        <style jsx global>{`
          @keyframes scan {
            0% { transform: translateY(0); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(400px); opacity: 0; }
          }
        `}</style>
      </div>
    </>
  );
}