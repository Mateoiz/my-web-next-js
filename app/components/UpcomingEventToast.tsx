"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { FaCalendarAlt, FaTimes, FaArrowRight } from "react-icons/fa";

// Ideally, this data should come from a shared file/database
// For now, we use the first event from your Events page
const NEXT_EVENT = {
  id: 1,
  title: "General Assembly 2026",
  date: "Jan 30, 2026",
  location: "DLSAU Osmeña Hall",
  link: "/Events" // Directs them to your events page
};

export default function UpcomingEventToast() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Wait 2.5 seconds before showing the popup so it doesn't overwhelm the user immediately
    const timer = setTimeout(() => setIsVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="fixed bottom-6 left-6 z-50 w-full max-w-sm"
        >
          {/* Container Style: 
            - Glassmorphism effect 
            - Green accent border
            - Adaptive Light/Dark colors
          */}
          <div className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-l-4 border-green-500 shadow-2xl rounded-r-lg p-5 pr-10 overflow-hidden group">
            
            {/* Close Button */}
            <button 
              onClick={() => setIsVisible(false)}
              className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 transition-colors p-1"
              aria-label="Close reminder"
            >
              <FaTimes size={14} />
            </button>

            {/* Label */}
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-widest mb-1">
              <span className="animate-pulse">●</span> Upcoming Event
            </div>

            {/* Event Title */}
            <h3 className="text-zinc-900 dark:text-white font-bold text-lg leading-tight mb-2">
              {NEXT_EVENT.title}
            </h3>

            {/* Event Details */}
            <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-gray-400 mb-3">
              <span className="flex items-center gap-1.5 bg-zinc-100 dark:bg-black/40 px-2 py-1 rounded">
                <FaCalendarAlt className="text-green-500" />
                {NEXT_EVENT.date}
              </span>
            </div>

            {/* Action Link */}
            <Link 
              href={NEXT_EVENT.link}
              className="inline-flex items-center gap-2 text-sm font-bold text-green-600 dark:text-green-400 hover:underline group-hover:gap-3 transition-all"
            >
              View Details <FaArrowRight size={12} />
            </Link>

            {/* Decorative Background Glow */}
            <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-green-500/20 blur-[40px] rounded-full pointer-events-none" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}