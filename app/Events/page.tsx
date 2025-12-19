"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaCalendarAlt, FaMapMarkerAlt, FaExternalLinkAlt, FaMicrochip } from "react-icons/fa";

// 1. IMPORTS
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor";

// --- EVENT DATA ---
const events = [
  {
    id: 1,
    title: "General Assembly 2026",
    date: "January 30, 2026",
    location: "DLSAU Osmeña Hall",
    description: "Kickstart the year with our annual general assembly. Expect guest speakers, roadmap reveals, and free swag.",
    poster: "/events/E1.JPG", 
    link: "https://facebook.com/your-event-link", 
  },
  {
    id: 2,
    title: "Video Editing Competition",
    date: "February 15, 2026",
    location: "Computer Lab 3",
    description: "Showcase your creativity. Theme: 'Future of Tech'. Prizes include Adobe CC subscriptions and cash.",
    poster: "/events/E2.JPG",
    link: "#",
  },
  {
    id: 3,
    title: "E-Sports Tournament",
    date: "CAST Week",
    location: "University Gym",
    description: "Valorant, League, and Tekken 8. Open to all colleges. Registration starts next week.",
    poster: "/events/E3.JPG",
    link: "#",
  },
  {
    id: 4,
    title: "AFK: Sportsfest",
    date: "March 2026",
    location: "DLSAU Grounds",
    description: "Touch grass with us. Basketball, Volleyball, and Patintero. A day to unwind from the code mines.",
    poster: "/events/E4.JPG",
    link: "#",
  },
  {
    id: 5,
    title: "AFK: Outreach Program",
    date: "April 2026",
    location: "Barangay Potrero",
    description: "Tech Literacy 101: Teaching basic computer skills to the local youth. Volunteers needed.",
    poster: "/events/E5.JPG",
    link: "#",
  },
];

export default function EventsPage() {
  const [activeEvent, setActiveEvent] = useState(0);

  return (
    <section className="min-h-screen relative transition-colors duration-300 overflow-hidden">
      
      {/* 2. BACKGROUND LAYERS */}
      <div className="absolute inset-0 z-0">
         <FloatingCubes />
      </div>
      
      {/* 3. CURSOR */}
      <CircuitCursor />

      {/* Container - Added 'relative z-10' to ensure content is above the background */}
      <div className="relative z-10 container mx-auto px-4 md:px-8 pt-32 pb-20">
        
        {/* HEADER */}
        <div className="mb-20 text-center md:text-left">
          <h1 className="text-6xl md:text-8xl font-black mb-4 uppercase tracking-tighter text-zinc-900 dark:text-white transition-colors duration-300">
            System <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-400 dark:from-green-400 dark:to-green-600">Events</span>
          </h1>
          <div className="h-1 w-32 bg-green-500 rounded-full md:mx-0 mx-auto" />
        </div>

        {/* MAIN LAYOUT: Grid of 12 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* --- LEFT COLUMN: EVENTS LIST (Span 6) --- */}
          <div className="lg:col-span-6 space-y-6">
            {events.map((event, index) => {
              const isActive = activeEvent === index;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ margin: "-20% 0px -20% 0px" }} // Triggers when item is center screen
                  onViewportEnter={() => setActiveEvent(index)}
                  onClick={() => setActiveEvent(index)}
                  className={`group relative p-8 rounded-xl border-l-4 transition-all duration-300 cursor-pointer backdrop-blur-md ${
                    isActive
                      ? "bg-white/90 border-green-500 shadow-xl dark:bg-zinc-900/90 dark:shadow-[0_0_30px_rgba(34,197,94,0.1)]"
                      : "bg-white/40 border-zinc-300 hover:bg-white/80 dark:bg-zinc-900/40 dark:border-zinc-700 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  {/* Header: Date & Location */}
                  <div className="flex flex-wrap items-center gap-4 text-sm font-mono mb-4 text-zinc-500 dark:text-gray-400">
                    <span className={`flex items-center gap-2 px-3 py-1 rounded-full transition-colors ${
                        isActive 
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' 
                        : 'bg-zinc-200 dark:bg-zinc-800/80'
                    }`}>
                      <FaCalendarAlt /> {event.date}
                    </span>
                    <span className="flex items-center gap-2">
                      <FaMapMarkerAlt /> {event.location}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className={`text-3xl font-bold mb-4 transition-colors ${
                      isActive 
                      ? 'text-zinc-900 dark:text-white' 
                      : 'text-zinc-400 dark:text-gray-500 group-hover:text-zinc-700 dark:group-hover:text-white'
                  }`}>
                    {event.title}
                  </h3>

                  {/* Description - Collapsible based on active state */}
                  <div className={`overflow-hidden transition-all duration-500 ${isActive ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 lg:max-h-20 lg:opacity-50'}`}>
                    <p className="text-zinc-600 dark:text-gray-300 leading-relaxed">
                      {event.description}
                    </p>
                    
                    {/* Link Button */}
                    <Link 
                      href={event.link} 
                      target="_blank"
                      className="mt-6 inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-bold uppercase tracking-wider text-xs hover:underline pointer-events-auto transition-colors"
                      onClick={(e) => e.stopPropagation()} 
                    >
                      Initialize <FaExternalLinkAlt />
                    </Link>
                  </div>

                  {/* Mobile-Only Image */}
                  <div className="lg:hidden mt-6 relative h-48 w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <Image src={event.poster} alt={event.title} fill className="object-cover" />
                  </div>
                </motion.div>
              );
            })}
            
            {/* Spacer */}
            <div className="h-[20vh]" />
          </div>

          {/* --- RIGHT COLUMN: STICKY DISPLAY (Span 6) --- */}
          <div className="hidden lg:block lg:col-span-6 relative">
            <div className="sticky top-32 h-[600px] w-full flex items-center justify-center">
              
              {/* THE HOLOGRAPHIC CONTAINER */}
              <div className="relative w-full h-full max-w-[400px] max-h-[550px] bg-white dark:bg-black/60 backdrop-blur-md rounded-2xl border-2 border-zinc-200 dark:border-green-500/30 p-2 shadow-2xl dark:shadow-[0_0_50px_rgba(34,197,94,0.1)] transition-colors duration-300">
                
                {/* Animated Content Switcher */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeEvent}
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                    transition={{ duration: 0.4 }}
                    className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                  >
                    <Image
                      src={events[activeEvent].poster}
                      alt={events[activeEvent].title}
                      fill
                      className="object-cover opacity-100 dark:opacity-80 transition-opacity duration-300"
                    />

                    {/* Holographic Overlays - Only visible in Dark Mode */}
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size:100%_4px opacity-0 dark:opacity-20 pointer-events-none transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 dark:opacity-80" />

                    {/* Tech Data Overlay */}
                    <div className="absolute bottom-8 left-8 right-8">
                        <div className="flex items-center gap-2 text-green-400 dark:text-green-500 mb-2">
                          <FaMicrochip className="animate-pulse" />
                          <span className="font-mono text-xs uppercase tracking-widest drop-shadow-md">Live Feed</span>
                        </div>
                        <h2 className="text-3xl font-black text-white leading-none uppercase drop-shadow-lg">
                          {events[activeEvent].title}
                        </h2>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Decorative Corners - Only visible in Dark Mode for that "Tech" feel */}
                <div className="hidden dark:block absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-green-500" />
                <div className="hidden dark:block absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-green-500" />
                
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}