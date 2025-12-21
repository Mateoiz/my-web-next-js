"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaExternalLinkAlt, 
  FaMicrochip, 
  FaSatelliteDish, 
  FaLock 
} from "react-icons/fa";

import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor";

// --- EVENT DATA ---
const events = [
  {
    id: 1,
    title: "General Assembly 2026",
    date: "February",
    location: "TBA",
    description: "Join us for the annual General Assembly where we discuss plans, goals, and set the direction for JPCS in the coming year.",
    link: "https://facebook.com/your-event-link", 
  },
  {
    id: 2,
    title: "Video Editing Competition",
    date: "February",
    location: "TBA",
    description: "Show off your video editing skills! Create a video on a tech-related topic and win exciting prizes.",
    link: "#",
  },
  {
    id: 3,
    title: "E-Sports Tournament",
    date: "CAST Week",
    location: "TBA",
    description: "Compete in popular games like Valorant and Mobile Legends. Form your teams and claim the crown!",
    link: "#",
  },
  {
    id: 4,
    title: "AFK: Sportsfest",
    date: "March 2026",
    location: "TBA",
    description: "Get active with JPCS! Join us for a day of fun sports activities and friendly competition.",
    link: "#",
  },
  {
    id: 5,
    title: "AFK: Outreach Program",
    date: "April 2026",
    location: "TBA",
    description: "Tech Literacy 101: Teaching basic computer skills to the local youth. Volunteers needed.",
    link: "#",
  },
];

// --- COMPONENT: THEMED PLACEHOLDER ---
const ComingSoonPlaceholder = ({ title }: { title: string }) => (
  <div className="relative w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 overflow-hidden group">
    
    <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.2]" 
         style={{ backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
    </div>

    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/10 to-transparent h-[10%] w-full animate-[scan_3s_linear_infinite] pointer-events-none" />

    <div className="relative z-10 mb-4 p-4 rounded-full border-2 border-zinc-300 dark:border-green-500/30 bg-zinc-200 dark:bg-black/50 text-zinc-400 dark:text-green-500">
      <FaSatelliteDish className="text-3xl md:text-5xl animate-pulse" />
    </div>

    <h3 className="relative z-10 text-xl font-black uppercase text-zinc-400 dark:text-white tracking-widest mb-1">
      Visuals Pending
    </h3>
    <div className="relative z-10 flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-green-500/70 bg-zinc-200 dark:bg-green-900/20 px-2 py-1 rounded">
      <FaLock size={10} />
      <span>{title.substring(0, 15).toUpperCase()}_ASSET_LOCKED</span>
    </div>

    <div className="absolute top-4 left-4 w-2 h-2 border-t-2 border-l-2 border-zinc-400 dark:border-green-500" />
    <div className="absolute bottom-4 right-4 w-2 h-2 border-b-2 border-r-2 border-zinc-400 dark:border-green-500" />
  </div>
);

export default function EventsPage() {
  const [activeEvent, setActiveEvent] = useState(0);

  return (
    // FIX 1: Removed 'overflow-hidden' from the main section so sticky positioning works
    <section className="min-h-screen relative transition-colors duration-300">
      
      {/* FIX 2: Added 'overflow-hidden' to the background wrapper instead */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
         <FloatingCubes />
      </div>
      
      <CircuitCursor />

      <div className="relative z-10 container mx-auto px-4 md:px-8 pt-32 pb-20">
        
        {/* HEADER */}
        <div className="mb-20 text-center md:text-left">
          <h1 className="text-6xl md:text-8xl font-black mb-4 uppercase tracking-tighter text-zinc-900 dark:text-white transition-colors duration-300">
            System <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-400 dark:from-green-400 dark:to-green-600">Events</span>
          </h1>
          <div className="h-1 w-32 bg-green-500 rounded-full md:mx-0 mx-auto" />
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative">
          
          {/* --- LEFT COLUMN: EVENTS LIST --- */}
          <div className="lg:col-span-6 space-y-6">
            {events.map((event, index) => {
              const isActive = activeEvent === index;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  // Adjusted viewport margin to trigger the active state slightly earlier/better
                  viewport={{ margin: "-20% 0px -40% 0px" }} 
                  onViewportEnter={() => setActiveEvent(index)}
                  onClick={() => setActiveEvent(index)}
                  className={`group relative p-8 rounded-xl border-l-4 transition-all duration-300 cursor-pointer backdrop-blur-md ${
                    isActive
                      ? "bg-white/90 border-green-500 shadow-xl dark:bg-zinc-900/90 dark:shadow-[0_0_30px_rgba(34,197,94,0.1)]"
                      : "bg-white/40 border-zinc-300 hover:bg-white/80 dark:bg-zinc-900/40 dark:border-zinc-700 dark:hover:bg-zinc-800/60"
                  }`}
                >
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

                  <h3 className={`text-3xl font-bold mb-4 transition-colors ${
                      isActive 
                      ? 'text-zinc-900 dark:text-white' 
                      : 'text-zinc-400 dark:text-gray-500 group-hover:text-zinc-700 dark:group-hover:text-white'
                  }`}>
                    {event.title}
                  </h3>

                  <div className={`overflow-hidden transition-all duration-500 ${isActive ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 lg:max-h-20 lg:opacity-50'}`}>
                    <p className="text-zinc-600 dark:text-gray-300 leading-relaxed">
                      {event.description}
                    </p>
                    
                    <Link 
                      href={event.link} 
                      target="_blank"
                      className="mt-6 inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-bold uppercase tracking-wider text-xs hover:underline pointer-events-auto transition-colors"
                      onClick={(e) => e.stopPropagation()} 
                    >
                      Initialize <FaExternalLinkAlt />
                    </Link>
                  </div>

                  {/* Mobile-Only Placeholder */}
                  <div className="lg:hidden mt-6 relative h-48 w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <ComingSoonPlaceholder title={event.title} />
                  </div>
                </motion.div>
              );
            })}
            
            {/* Spacer to allow scrolling past the last item while keeping display visible */}
            <div className="h-[20vh]" />
          </div>

          {/* --- RIGHT COLUMN: STICKY DISPLAY --- */}
          {/* FIX 3: Added h-full to ensure the column is tall enough for the sticky element to track */}
          <div className="hidden lg:block lg:col-span-6 relative h-full">
            {/* FIX 4: Sticky top-32 now works because the parent section isn't overflow-hidden */}
            <div className="sticky top-32 w-full flex items-center justify-center">
              
              <div className="relative w-full h-[600px] max-w-[400px] bg-white dark:bg-black/60 backdrop-blur-md rounded-2xl border-2 border-zinc-200 dark:border-green-500/30 p-2 shadow-2xl dark:shadow-[0_0_50px_rgba(34,197,94,0.1)] transition-colors duration-300">
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeEvent}
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                    transition={{ duration: 0.4 }}
                    className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                  >
                    <ComingSoonPlaceholder title={events[activeEvent].title} />

                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size:100%_4px opacity-0 dark:opacity-20 pointer-events-none transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 dark:opacity-80" />

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

                <div className="hidden dark:block absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-green-500" />
                <div className="hidden dark:block absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-green-500" />
                
              </div>

            </div>
          </div>

        </div>
      </div>
      
      <style jsx global>{`
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
      `}</style>
    </section>
  );
}