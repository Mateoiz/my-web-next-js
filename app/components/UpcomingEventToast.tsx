"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import Link from "next/link";
import { FaCalendarAlt, FaTimes, FaArrowRight } from "react-icons/fa";

const NEXT_EVENT = {
  id: 1,
  title: "General Assembly 2026",
  date: "Jan 30, 2026",
  location: "DLSAU Osmeña Hall",
  link: "/Events"
};

export default function UpcomingEventToast() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          // 1. Mobile-friendly animation: Slide Up instead of Slide Right
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          
          // 2. Add Swipe-to-Dismiss functionality
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(event, info) => {
            // If dragged more than 100px, close it
            if (Math.abs(info.offset.x) > 100) {
              setIsVisible(false);
            }
          }}
          
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          
          // 3. Responsive Layout Classes
          // Mobile: Fixed bottom, left/right margins (centered), z-50
          // Desktop: Fixed bottom-left, specific width
          className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-6 md:right-auto md:w-full md:max-w-sm cursor-grab active:cursor-grabbing"
        >
          {/* Container Style: 
            - Added 'backdrop-blur-xl' for better text readability on messy mobile backgrounds
            - Added 'shadow-lg' for depth
          */}
          <div className="relative bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-l-[6px] border-green-500 shadow-2xl rounded-lg p-5 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
            
            {/* Close Button - Larger Touch Target */}
            <button 
              onClick={() => setIsVisible(false)}
              className="absolute top-0 right-0 p-4 text-zinc-400 hover:text-red-500 transition-colors"
              aria-label="Close reminder"
            >
              <FaTimes size={16} />
            </button>

            <div className="flex flex-col gap-1 pr-6">
                {/* Label */}
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-[10px] font-extrabold uppercase tracking-widest">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Upcoming Event
                </div>

                {/* Event Title */}
                <h3 className="text-zinc-900 dark:text-white font-bold text-lg leading-tight mt-1">
                  {NEXT_EVENT.title}
                </h3>

                {/* Event Details */}
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-gray-400 mt-2">
                  <span className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-1 rounded-md text-xs font-medium">
                    <FaCalendarAlt className="text-green-500" />
                    {NEXT_EVENT.date}
                  </span>
                </div>

                {/* Action Link - Full width tap area on mobile feels better, 
                    but here we keep it inline with a large hit area */}
                <div className="mt-3">
                    <Link 
                    href={NEXT_EVENT.link}
                    className="inline-flex items-center gap-2 text-sm font-bold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors py-1"
                    >
                    View Details <FaArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>

            {/* Decorative Background Glow - Subtler for mobile performance */}
            <div className="absolute -right-6 -bottom-10 w-32 h-32 bg-green-500/10 blur-[50px] rounded-full pointer-events-none" />
          </div>
          
          {/* Mobile Hint (Optional): Visual cue that you can swipe */}
          <div className="md:hidden flex justify-center mt-2">
             <div className="w-10 h-1 bg-zinc-300/50 rounded-full" /> 
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}