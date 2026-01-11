"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  FaArrowRight, FaTerminal, FaCalendarAlt, FaUserTie, FaNewspaper, 
  FaMicrochip, FaChalkboardTeacher, FaUserGraduate, FaQuoteLeft, 
  FaGraduationCap, FaSearch, FaFacebook, FaEnvelope, FaIdBadge
} from "react-icons/fa";

// --- COMPONENT IMPORTS ---
import UpcomingEventToast from "./components/UpcomingEventToast";
import SecretGame from "./components/SecretGame"; 
import FloatingCubes from "./components/FloatingCubes"; 
import CircuitCursor from "./components/CircuitCursor"; 
import DailyDecrypt from "./components/DailyDecrypt";
import CSExploration from "./components/CSExploration";

// --- DATA IMPORTS (SYNCED) ---
import { BLOG_POSTS } from "./constants/blog";
import { EVENTS } from "./constants/events"; 
import { OFFICERS } from "./constants/officers"; 

// --- FACULTY DATA (Hidden for now) ---
const FACULTY = [
  {
    name: "Dr. Alex Pasion",
    role: "Organization Adviser",
    image: "/faculty/adviser.jpg",
    credentials: ["M.S. Computer Science", "Certified Scrum Master"],
    statement: "Guiding the next generation of IT professionals towards excellence and integrity.",
    research: ["Software Engineering", "Project Management"]
  },
  {
    name: "Engr. Julius Bancud",
    role: "Program Chair",
    image: "/faculty/chair.jpg",
    credentials: ["PhD. IT (Candidate)", "M.S. Info Tech"],
    statement: "Technology is a tool; how you use it defines the future.",
    research: ["Data Science", "Machine Learning"]
  },
  {
    name: "Engr. Melanie Asuncion",
    role: "Faculty Member",
    image: "/faculty/lecturer.jpg",
    credentials: ["M.S. Computer Science", "Cisco Certified"],
    statement: "Building strong foundations in networking and infrastructure.",
    research: ["Cybersecurity", "Networking"]
  },
];

export default function Home() {
  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <main className="min-h-screen relative selection:bg-green-500/30 bg-white dark:bg-black overflow-hidden font-sans">
      
      {/* --- BACKGROUND LAYERS --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
         <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl opacity-40" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl opacity-40" />
         <div className="absolute inset-0 opacity-40 sm:opacity-60">
            <FloatingCubes />
         </div>
      </div>

      <div className="hidden md:block">
        <CircuitCursor />
      </div>

      {/* --- GLOBAL WIDGETS --- */}
      <SecretGame />
      <DailyDecrypt /> 

      {/* ================= HERO SECTION ================= */}
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
          <div className="relative w-full flex justify-center py-4 select-none overflow-visible px-4">
            <h1 
                className="glitch-text text-[22vw] md:text-[10rem] font-extrabold tracking-tighter leading-none relative z-10"
                data-text="JPCS"
            >
                JPCS
            </h1>
          </div>

          <div className="w-full px-2">
            <h3 className="text-xs sm:text-sm md:text-lg font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-[0.2em] md:tracking-[0.5em] text-center border-b border-zinc-200 dark:border-zinc-800/50 pb-6 mb-6 leading-relaxed">
              Junior Philippine Computer Society
            </h3>
          </div>

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
<CSExploration />

      {/* ================= 1. ABOUT US TEASER ================= */}
      <motion.section 
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 relative z-10 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-500 font-mono text-sm font-bold tracking-widest uppercase">
              <FaMicrochip /> Who We Are
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white">
              Innovating the Future, <br /> One Line of Code at a Time.
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed">
              The Junior Philippine Computer Society (JPCS) at DLSAU is more than just a student organization. We are a community of developers, designers, and visionaries dedicated to bridging the gap between academic theory and industry reality.
            </p>
            <Link href="/About" className="inline-flex items-center text-green-600 dark:text-green-400 font-bold hover:underline underline-offset-4">
              Read our full mission <FaArrowRight className="ml-2 text-xs" />
            </Link>
          </div>
          <div className="relative h-[300px] w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-black/50 flex items-center justify-center group">
             <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none" />
             <FaTerminal className="text-9xl text-zinc-300 dark:text-zinc-800 group-hover:text-green-500/20 transition-colors duration-500" />
             <div className="absolute bottom-4 right-4 font-mono text-xs text-zinc-400">
               /bin/mission_statement
             </div>
          </div>
        </div>
      </motion.section>

      {/* ================= 2. LATEST NEWS ================= */}
      <motion.section 
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 relative z-10 border-t border-zinc-200 dark:border-zinc-800"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-green-600 dark:text-green-500">
              <FaNewspaper />
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Latest News</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BLOG_POSTS.slice(0, 3).map((blog, idx) => (
              <Link href={`/Blogs/${blog.slug || '#'}`} key={idx} className="group block">
                <div className="aspect-video w-full bg-zinc-200 dark:bg-zinc-900 rounded-lg mb-4 overflow-hidden border border-zinc-300 dark:border-zinc-800 group-hover:border-green-500/50 transition-colors relative">
                   <Image 
                      src={blog.image} 
                      alt={blog.title} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                   />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">
                  {blog.title}
                </h3>
                <p className="text-sm text-zinc-500 line-clamp-2">
                  {blog.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ================= 3. UPCOMING EVENTS ================= */}
      <motion.section 
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 relative z-10 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-end mb-10">
            <div>
              <span className="text-green-600 dark:text-green-500 font-mono text-sm font-bold tracking-widest uppercase">
                System Logs
              </span>
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mt-2">Upcoming Events</h2>
            </div>
            <Link href="/Events" className="hidden md:flex items-center gap-2 text-xs font-mono border border-zinc-300 dark:border-zinc-700 px-4 py-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              VIEW CALENDAR <FaArrowRight />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {EVENTS.slice(0, 3).map((event, idx) => (
              <div key={idx} className="group p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-green-500/50 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-green-500 transition-colors">
                    {event.date}
                  </span>
                  <FaCalendarAlt className="text-zinc-300 group-hover:text-green-500 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{event.title}</h3>
                <p className="text-sm text-zinc-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {event.location}
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-8 text-center md:hidden">
            <Link href="/Events" className="text-sm font-bold text-green-600 dark:text-green-500 hover:underline">View All Events →</Link>
          </div>
        </div>
      </motion.section>

      {/* ================= 4. FACULTY MEMBERS (HIDDEN FOR NOW) ================= */}
      {/* <motion.section 
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 relative z-10 border-t border-zinc-200 dark:border-zinc-800"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-6 mb-12">
             <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-3xl text-zinc-400">
                <FaChalkboardTeacher />
             </div>
             <div>
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Faculty & Advisers</h2>
                <p className="text-zinc-500 text-sm mt-1 max-w-lg">The academic mentors guiding our path. Scroll to explore.</p>
             </div>
          </div>

          <div className="w-full overflow-x-auto pb-8 custom-scrollbar">
             <div className="flex gap-6 w-max px-2">
                {FACULTY.map((prof, index) => (
                   <div 
                     key={index} 
                     className="w-[350px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden group hover:border-green-500/50 transition-all duration-300"
                   >
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 overflow-hidden relative">
                            <div className="absolute inset-0 bg-green-500/10"></div>
                            IMG
                         </div>
                         <div>
                            <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                               {prof.name}
                            </h3>
                            <p className="text-xs text-zinc-500 uppercase tracking-wider font-mono">
                               {prof.role}
                            </p>
                         </div>
                      </div>

                      <div className="mb-4">
                         <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 mb-2">
                            <FaGraduationCap /> CREDENTIALS
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {prof.credentials.map((cred, i) => (
                               <span key={i} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-[10px] rounded text-zinc-600 dark:text-zinc-300 font-mono">
                                  {cred}
                               </span>
                            ))}
                         </div>
                      </div>

                      <div className="mb-6 relative pl-4 border-l-2 border-green-500/30">
                         <FaQuoteLeft className="absolute -top-1 -left-2 text-green-500/20 text-xl" />
                         <p className="text-sm italic text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            "{prof.statement}"
                         </p>
                      </div>

                      <div>
                         <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 mb-2">
                            <FaSearch /> RESEARCH & FOCUS
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {prof.research.map((item, i) => (
                               <span key={i} className="px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded-full text-[10px] text-zinc-500 dark:text-zinc-400 group-hover:border-green-500/30 group-hover:text-green-500 transition-colors">
                                  #{item}
                               </span>
                            ))}
                         </div>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
                   </div>
                ))}
             </div>
          </div>
        </div>
      </motion.section>
      */}

      {/* ================= 5. EXECUTIVE OFFICERS (UPDATED TO SCROLLABLE CAROUSEL) ================= */}
      <motion.section 
        variants={sectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="py-20 relative z-10 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-6 mb-12 justify-end text-right">
             <div>
                <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Executive Officers</h2>
                <p className="text-zinc-500 text-sm mt-1 max-w-lg">The student leaders executing the vision. Swipe to meet them.</p>
             </div>
             <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-3xl text-zinc-400">
                <FaUserGraduate />
             </div>
          </div>

          {/* --- OFFICERS CAROUSEL (Synced with Officers Page Style) --- */}
          <div className="w-full overflow-x-auto pb-8 custom-scrollbar" dir="rtl">
             <div className="flex gap-6 w-max px-2" dir="ltr">
                {OFFICERS.map((officer, index) => (
                   <div 
                     key={officer.id} 
                     className="w-[350px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden group hover:border-green-500/50 transition-all duration-300 text-left"
                   >
                      {/* Top: Image & Header */}
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-16 h-16 rounded-full border-2 border-green-500/20 p-1 flex-shrink-0">
                            <div className="w-full h-full rounded-full overflow-hidden relative">
                                <Image
                                  src={officer.image}
                                  alt={officer.name}
                                  fill
                                  className="object-cover"
                                />
                            </div>
                         </div>
                         <div>
                            <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                               {officer.name}
                            </h3>
                            <span className="inline-block px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
                               {officer.role}
                            </span>
                         </div>
                      </div>

                      {/* Middle: Bio (Statement Style) */}
                      <div className="mb-6 relative pl-4 border-l-2 border-green-500/30 min-h-[80px]">
                         <FaQuoteLeft className="absolute -top-1 -left-2 text-green-500/20 text-xl" />
                         <p className="text-sm italic text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-4">
                            "{officer.bio}"
                         </p>
                      </div>

                      {/* Bottom: Contact Uplink */}
                      <div className="mt-auto border-t border-zinc-100 dark:border-zinc-800 pt-4">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                               <FaIdBadge /> CONNECT
                            </div>
                            
                            <div className="flex gap-2">
                                {/* Facebook */}
                                {officer.socials.facebook && (
                                  <a 
                                    href={officer.socials.facebook} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-white hover:bg-blue-600 transition-colors"
                                  >
                                    <FaFacebook />
                                  </a>
                                )}
                                
                                {/* Email Link */}
                                {officer.socials.email && (
                                  <a 
                                    href={`mailto:${officer.socials.email}`} 
                                    className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-white hover:bg-green-600 transition-colors"
                                  >
                                    <FaEnvelope />
                                  </a>
                                )}
                            </div>
                         </div>
                      </div>

                      {/* Hover Effect Background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
                   </div>
                ))}
             </div>
          </div>
          
          <div className="mt-8 text-center">
             <Link href="/Officers" className="inline-flex items-center gap-2 text-sm font-bold text-green-600 dark:text-green-500 hover:underline">
               View Full Roster <FaArrowRight />
             </Link>
          </div>
        </div>
      </motion.section>

      
      {/* --- CSS FOR GLITCH TEXT --- */}
      <style jsx global>{`
        /* --- CUSTOM SCROLLBAR FOR FACULTY CAROUSEL --- */
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #27272a; /* zinc-800 */
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: #22c55e; /* green-500 */
        }

        /* --- INTENSE CONSTANT GLITCH EFFECT --- */
        .glitch-text {
          position: relative;
          color: #27272a; 
          animation: main-glitch-shake 2s infinite linear alternate-reverse;
        }
        :global(.dark) .glitch-text {
          color: #f4f4f5; 
        }
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
        .glitch-text::before {
          color: #ff00ff; 
          z-index: -1;
          animation: glitch-slice-1 3s infinite steps(20) alternate-reverse;
        }
        .glitch-text::after {
          color: #00ffff; 
          z-index: -2;
          animation: glitch-slice-2 2.5s infinite steps(20) alternate-reverse;
        }
        @keyframes main-glitch-shake {
          0% { text-shadow: none; transform: translate(0); }
          2% { text-shadow: 4px -3px 0px #ff0000, -4px 3px 0px #00ff00; transform: translate(-3px, 1px); }
          4% { text-shadow: none; transform: translate(0); }
          20% { transform: translate(1px, -1px); }
          22% { transform: translate(-2px, 0px); }
          55% { text-shadow: -5px 4px 0px #0000ff, 5px -4px 0px #ffff00; transform: translate(4px, 2px); }
          57% { text-shadow: none; transform: translate(0); }
          80% { transform: translate(2px, -2px); }
        }
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