"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { FaCalendarAlt, FaMapMarkerAlt, FaExternalLinkAlt, FaMicrochip } from "react-icons/fa";

// --- EVENT DATA ---
const events = [
  {
    id: 1,
    title: "General Assembly 2026",
    date: "January 30, 2026",
    location: "DLSAU Osmeña Hall",
    description: "Kickstart the year with our annual general assembly. Expect guest speakers, roadmap reveals, and free swag.",
    poster: "/events/E1.JPG", 
  },
  {
    id: 2,
    title: "Video Editing Competition",
    date: "January 30, 2026",
    location: "DLSAU Osmeña Hall",
    description: "Showcase your creativity. Theme: 'Future of Tech'. Prizes include Adobe CC subscriptions and cash.",
    poster: "/events/E2.JPG",
  },
  {
    id: 3,
    title: "E-Sports Tournament",
    date: "CAST Week",
    location: "University Gym",
    description: "Valorant, League, and Tekken 8. Open to all colleges. Registration starts next week.",
    poster: "/events/E3.JPG",
  },
  {
    id: 4,
    title: "AFK: Sportsfest",
    date: "March 2026",
    location: "DLSAU Grounds",
    description: "Touch grass with us. Basketball, and Volleyball. A day to unwind from the code mines.",
    poster: "/events/E4.JPG",
  },
  {
    id: 5,
    title: "Outreach Program",
    date: "April 2026",
    location: "Barangay Potrero",
    description: "Tech Literacy 101: Teaching basic computer skills to the local youth. Volunteers needed.",
    poster: "/events/E5.JPG",
  },
];

export default function EventsPage() {
  const [activeEvent, setActiveEvent] = useState(0);

  return (
    <section className="min-h-screen bg-transparent text-white relative">
      
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size:24px_24px] pointer-events-none -z-10" />
      <div className="fixed inset-0 bg-black/90 -z-20" />

      <div className="container mx-auto px-4 md:px-8 pt-32 pb-20">
        
        {/* HEADER */}
        <div className="mb-20 text-center md:text-left">
          <h1 className="text-6xl md:text-8xl font-black mb-4 uppercase tracking-tighter">
            System <span className="text-transparent bg-clip-text bg-linear-to-r from-green-400 to-green-600">Events</span>
          </h1>
          <div className="h-1 w-32 bg-green-500 rounded-full md:mx-0 mx-auto" />
        </div>

        {/* MAIN LAYOUT: Grid of 12 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* --- LEFT COLUMN: EVENTS LIST (Span 6) --- */}
          <div className="lg:col-span-6 space-y-6">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ margin: "-20% 0px -20% 0px" }} // Triggers when item is center screen
                onViewportEnter={() => setActiveEvent(index)}
                // ADDED: onClick handler to manually set active event
                onClick={() => setActiveEvent(index)}
                className={`group relative p-8 rounded-xl border-l-4 transition-all duration-300 cursor-pointer ${
                  activeEvent === index
                    ? "bg-zinc-900 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.1)]"
                    : "bg-zinc-900/40 border-zinc-700 hover:bg-zinc-800"
                }`}
              >
                {/* Header: Date & Location */}
                <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-gray-400 mb-4">
                  <span className={`flex items-center gap-2 px-3 py-1 rounded-full ${activeEvent === index ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800'}`}>
                    <FaCalendarAlt /> {event.date}
                  </span>
                  <span className="flex items-center gap-2">
                    <FaMapMarkerAlt /> {event.location}
                  </span>
                </div>

                {/* Title */}
                <h3 className={`text-3xl font-bold mb-4 transition-colors ${activeEvent === index ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                  {event.title}
                </h3>

                {/* Description - Collapsible based on active state */}
                <div className={`overflow-hidden transition-all duration-500 ${activeEvent === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 lg:max-h-20 lg:opacity-50'}`}>
                  <p className="text-gray-300 leading-relaxed">
                    {event.description}
                  </p>
                  
                  <button className="mt-6 flex items-center gap-2 text-green-400 font-bold uppercase tracking-wider text-xs hover:underline">
                    Initialize <FaExternalLinkAlt />
                  </button>
                </div>

                {/* Mobile-Only Image */}
                <div className="lg:hidden mt-6 relative h-48 w-full rounded-lg overflow-hidden border border-zinc-700">
                  <Image src={event.poster} alt={event.title} fill className="object-cover" />
                </div>
              </motion.div>
            ))}
            
            {/* Spacer */}
            <div className="h-[20vh]" />
          </div>

          {/* --- RIGHT COLUMN: STICKY DISPLAY (Span 6) --- */}
          <div className="hidden lg:block lg:col-span-6 relative">
            <div className="sticky top-32 h-[600px] w-full flex items-center justify-center">
              
              {/* THE HOLOGRAPHIC CONTAINER */}
              <div className="relative w-full h-full max-w-[400px] max-h-[550px] bg-black rounded-2xl border-2 border-green-500/30 p-2 shadow-[0_0_50px_rgba(34,197,94,0.1)]">
                
                {/* Animated Content Switcher */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeEvent}
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
                    transition={{ duration: 0.4 }}
                    className="relative w-full h-full rounded-xl overflow-hidden bg-zinc-900"
                  >
                    <Image
                      src={events[activeEvent].poster}
                      alt={events[activeEvent].title}
                      fill
                      className="object-cover opacity-80"
                    />

                    {/* Holographic Overlays */}
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size:100%_4px] opacity-20 pointer-events-none" />
                    <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent opacity-80" />

                    {/* Tech Data Overlay */}
                    <div className="absolute bottom-8 left-8 right-8">
                       <div className="flex items-center gap-2 text-green-500 mb-2">
                          <FaMicrochip className="animate-pulse" />
                          <span className="font-mono text-xs uppercase tracking-widest">Live Feed</span>
                       </div>
                       <h2 className="text-3xl font-black text-white leading-none uppercase">
                         {events[activeEvent].title}
                       </h2>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Decorative Corners */}
                <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-green-500" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-green-500" />
                
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}