"use client";

import { useState } from "react";
import dynamic from 'next/dynamic'; 
import { motion, AnimatePresence } from "framer-motion";
import { FaCalendarAlt, FaCalculator, FaLayerGroup } from "react-icons/fa";

// Component Imports
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor"; 

// --- LAZY LOADING ---
const ScheduleMaker = dynamic(() => import('../components/Tools/ScheduleMaker'), {
  loading: () => <ToolSkeleton />,
  ssr: false 
});
const GradeCalculator = dynamic(() => import('../components/Tools/GradeCalculator'));
const GWACalculator = dynamic(() => import('../components/Tools/GWACalculator'));
const FlashcardMaker = dynamic(() => import('../components/Tools/FlashcardMaker'), {
  ssr: false
});

const ToolSkeleton = () => (
  <div className="w-full h-96 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse flex items-center justify-center">
    <div className="text-zinc-400 text-sm font-bold">Loading Tool...</div>
  </div>
);

export default function ToolsPage() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'calc' | 'flashcards'>('schedule');

  const tabs = [
    { id: 'schedule', label: 'Schedule', icon: <FaCalendarAlt /> }, // Shortened label for mobile
    { id: 'calc', label: 'Grades', icon: <FaCalculator /> },
    { id: 'flashcards', label: 'Reviewer', icon: <FaLayerGroup /> },
  ];

  return (
    <section className="min-h-screen py-24 px-4 md:px-8 relative overflow-hidden bg-zinc-50 dark:bg-black font-sans selection:bg-green-500/30">
      <CircuitCursor />
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute inset-0 opacity-80"><FloatingCubes /></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* HERO */}
        <div className="text-center mb-8 md:mb-12 space-y-4">
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Student <span className="text-green-600 dark:text-green-500">Toolkit</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto text-lg">
            Essential educational tools for the modern Lasallian.
          </motion.p>
        </div>

        {/* --- OPTIMIZED NAVIGATION TABS --- */}
        <div className="flex justify-center mb-8 md:mb-12">
          <div className="w-full md:w-auto bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-1.5 rounded-2xl flex shadow-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  relative flex-1 md:flex-none px-2 md:px-6 py-3 rounded-xl transition-all 
                  flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2
                  ${activeTab === tab.id 
                    ? 'text-white shadow-md' 
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }
                `}
              >
                {/* Active Background */}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-zinc-900 dark:bg-green-600 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                
                {/* Content */}
                <span className="relative z-10 text-lg md:text-sm">
                  {tab.icon}
                </span>
                <span className="relative z-10 text-[10px] md:text-sm font-bold uppercase tracking-wider md:normal-case md:tracking-normal">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* TOOL CONTENT */}
        <div className="min-h-[600px]">
          <AnimatePresence mode="wait">
            {activeTab === 'schedule' && (
              <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="w-full">
                <ScheduleMaker />
              </motion.div>
            )}
            {activeTab === 'calc' && (
              <motion.div key="calc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <GradeCalculator />
                <GWACalculator />
              </motion.div>
            )}
            {activeTab === 'flashcards' && (
              <motion.div key="flashcards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="w-full max-w-4xl mx-auto">
                 <FlashcardMaker />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}