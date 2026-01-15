"use client";

import Image from "next/image"; 
import { motion, Variants } from "framer-motion";
import { FaChalkboardTeacher, FaEnvelope, FaLinkedin, FaTerminal } from "react-icons/fa"; 

// --- IMPORT COMPONENTS ---
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor";

// --- FACULTY DATA ---
// NOTE: For the 'pop-out' effect to look best, use transparent PNGs where the background is removed.
const FACULTY_MEMBERS = [
  {
    name: "Dr. Marilyn Rubrica",
    title: "Dean / Faculty",
    image: "/faculty/rubrica_cutout.png", 
    email: "marilyn.rubrica@dlsau.edu.ph",
    specialization: "Educational Leadership & Curriculum Dev"
  },
  {
    name: "Dr. Alex Pasion",
    title: "Organization Adviser / Faculty",
    image: "/faculty/pasion_cutout.png",
    email: "alex.pasion@dlsau.edu.ph",
    specialization: "Software Engineering & Research"
  },
  {
    name: "Engr. Julius Bancud",
    title: "Program Chair / Faculty",
    image: "/fac/FAC.png",
    email: "julius.bancud@dlsau.edu.ph",
    specialization: "Data Science & Machine Learning"
  },
  {
    name: "Engr. Aldrin Victor Bernardo",
    title: "Faculty Member",
    image: "/faculty/bernardo_cutout.png",
    email: "aldrin.bernardo@dlsau.edu.ph",
    specialization: "Computer Architecture & Hardware"
  },
  {
    name: "Engr. Melanie Asuncion",
    title: "Faculty Member",
    image: "/faculty/asuncion_cutout.png",
    email: "melanie.asuncion@dlsau.edu.ph",
    specialization: "Cybersecurity & Networking"
  },
  {
    name: "Engr. Norman Andres",
    title: "Faculty Member",
    image: "/faculty/andres_cutout.png",
    email: "norman.andres@dlsau.edu.ph",
    specialization: "Web Development & Databases"
  },
];

export default function FacultyPage() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
    <section className="min-h-screen relative overflow-hidden pb-40 bg-zinc-950 transition-colors duration-300">
      
      {/* --- VISUAL EFFECTS --- */}
      <CircuitCursor />
      <div className="absolute inset-0 z-0 opacity-30">
         <FloatingCubes />
      </div>
      {/* Scanline overlay for texture */}
      <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-[0.03] pointer-events-none z-10" />
      
      {/* Dramatic top lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-green-500/20 blur-[150px] rounded-full -z-0 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-green-500/10 blur-[150px] rounded-full -z-0 pointer-events-none" />


      <div className="container mx-auto px-6 pt-32 relative z-20">

        {/* --- HERO HEADER --- */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-center mb-40 relative"
        >
           {/* Background Glitch Text Effect */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none opacity-10">
                <span className="text-[5rem] md:text-[9rem] font-black text-green-500 tracking-tighter leading-none whitespace-nowrap blur-sm">
                    THE MENTORS
                </span>
            </div>

          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-green-950/50 border border-green-500/30 backdrop-blur-md relative z-10">
             <FaChalkboardTeacher className="text-green-400" />
             <span className="text-xs font-bold text-green-300 tracking-widest uppercase">Department of Technology</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-6 text-white tracking-tight relative z-10">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600 drop-shadow-[0_0_25px_rgba(34,197,94,0.5)]">Faculty</span>
          </h1>
          
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-mono relative z-10">
            <FaTerminal className="inline-block mr-2 text-green-500" />
            Initializing academic leaders and industry architects...
          </p>
        </motion.div>

        {/* --- FACULTY GRID --- */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-48 pt-10"
        >
          {FACULTY_MEMBERS.map((faculty, index) => (
            <motion.div 
              key={index} 
              variants={cardVariants}
              className="group relative flex flex-col items-center"
            >
              {/* --- LAYER 1: THE IMAGE (Back) --- 
                  Z-Index 0 keeps it behind the card.
                  Negative margin pulls it up to create the "pop-out" head effect. 
              */}
              <div className="relative h-[450px] w-full -mb-48 z-0 pointer-events-none">
                 <motion.div
                    // Subtle hover float
                    whileHover={{ y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="h-full w-full relative"
                 >
                    <Image
                      src={faculty.image}
                      alt={faculty.name}
                      fill
                      // 'object-bottom' anchors the body to the bottom so the head rises up
                      className="object-contain object-bottom drop-shadow-[0_0_15px_rgba(34,197,94,0.2)] group-hover:drop-shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    
                    {/* Back Glow Effect */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-3/4 bg-green-500/20 blur-3xl rounded-full -z-10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                 </motion.div>
              </div>

              {/* --- LAYER 2: THE CARD WINDOW (Front) --- 
                  Z-Index 10 keeps it in front of the body.
                  Glassmorphism allows seeing the body faintly behind the text.
              */}
              <div className="relative z-10 w-full bg-zinc-950/90 backdrop-blur-md border border-zinc-800 group-hover:border-green-500/50 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 group-hover:shadow-[0_0_50px_rgba(34,197,94,0.15)] flex flex-col items-center text-center p-8 pt-12">
                 
                 {/* Cyber Grid Background Pattern */}
                 <div className="absolute inset-0 bg-[linear-gradient(to_right,#22c55e1a_1px,transparent_1px),linear-gradient(to_bottom,#22c55e1a_1px,transparent_1px)] bg-[size:24px_24px] opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none" />
                 
                 {/* Top Green Edge Highlight */}
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />

                 {/* NAME */}
                 <h3 className="font-black text-2xl md:text-3xl text-white uppercase tracking-tight mb-2 relative z-20">
                    <span className="text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">
                        {faculty.name.split(" ")[0]} 
                    </span>
                    <br />
                    {faculty.name.split(" ").slice(1).join(" ")}
                 </h3>
                 
                 {/* TITLE PILL */}
                 <div className="inline-block px-3 py-1 rounded bg-green-900/30 border border-green-500/30 text-green-400 text-xs font-mono font-bold uppercase tracking-widest mb-8 relative z-20">
                    {faculty.title}
                 </div>

                 {/* FOCUS BOX */}
                 <div className="w-full bg-black/40 rounded-xl p-4 border border-zinc-800 group-hover:border-green-500/30 transition-colors mb-8 relative overflow-hidden z-20">
                    <p className="text-[10px] text-zinc-500 uppercase font-mono mb-2 tracking-widest text-center">Foundational Focus_</p>
                    <p className="text-zinc-200 font-medium leading-tight">{faculty.specialization}</p>
                 </div>

                 {/* SOCIAL ACTIONS */}
                 <div className="flex items-center gap-4 relative z-20">
                    <a 
                      href={`mailto:${faculty.email}`} 
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-green-600 border border-zinc-800 hover:border-green-500 transition-all shadow-lg hover:shadow-green-500/50 hover:-translate-y-1"
                      title="Send Email"
                    >
                        <FaEnvelope size={14} />
                    </a>
                    <button 
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-[#0077b5] border border-zinc-800 hover:border-[#0077b5] transition-all shadow-lg hover:shadow-[#0077b5]/50 hover:-translate-y-1"
                      title="View LinkedIn"
                    >
                        <FaLinkedin size={14} />
                    </button>
                 </div>
              </div>

            </motion.div>
          ))}
        </motion.div>

        {/* --- FOOTER DECORATION --- */}
        <div className="mt-40 text-center opacity-50">
            <div className="h-px w-full max-w-md mx-auto bg-gradient-to-r from-transparent via-green-900 to-transparent mb-4" />
            <p className="text-green-800 font-mono text-[10px] tracking-[0.3em] uppercase">
                // DLSAU • College of Arts, Sciences, and Technology • System End
            </p>
        </div>

      </div>
    </section>
  );
}