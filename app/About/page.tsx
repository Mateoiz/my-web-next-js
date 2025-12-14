"use client";

import { useRef, useEffect, useState, ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

// --- STATIC DATA ---
const CAROUSEL_IMAGES = [
  "/about/CS2.JPG", 
  "/about/CS1.JPG", 
  "/about/CS3.JPG", 
  "/about/CS4.JPG",
];

const VISION_TEXT = [
  "To provide Computer Science students the extra-curricular learning environment that will help them gain more knowledge, more skills and the right attitude that can ensure their preparedness in becoming computing and technology professionals.",
  "The organization aims to provide Computer Science students the extracurricular learning environment that will help them gain more knowledge, more skills and right attitude that can ensure them of their preparedness in becoming computing and technology professionals.",
  "It provides students an opportunity to experience unity with other Computer Science students through common project.",
  "It also aims to provide the knowledge and skills the students needed by creating and maintaining an exciting extracurricular environment, wherein the youth is united under the banner of leadership, technical excellence and ethical conduct while fostering among them lasting friendship."
];

const MISSION_TEXT = "As an organization that is actively involved in Information and Communication Technology-related concerns of education, industry, business, and government, Junior Philippine Computer Society is pleased to collaborate with its officers and members in helping the university in developing world-class Computer Science students that have leadership, integrity, faith and excellence.";

// --- REUSABLE SUB-COMPONENT ---
interface InfoCardProps {
  title: string;
  children: ReactNode;
  delay?: number;
  hasDecoration?: boolean;
}

const InfoCard = ({ title, children, delay = 0, hasDecoration = false }: InfoCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ scale: 1.01 }}
    // ADAPTED: bg-white/60 (Light) vs bg-zinc-900/60 (Dark)
    // ADAPTED: border-zinc-200 (Light) vs border-zinc-700/50 (Dark)
    className="group relative p-8 md:p-10 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/50 backdrop-blur-md flex flex-col overflow-hidden h-full shadow-lg dark:shadow-none transition-colors duration-300"
  >
    {/* Tech Decoration Line */}
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
    
    <h3 className="text-3xl font-bold text-zinc-800 dark:text-white mb-8 flex items-center gap-3">
       <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
       </span>
       {title}
    </h3>
    
    {/* ADAPTED: text-zinc-600 (Light) vs text-gray-300 (Dark) */}
    <div className="text-zinc-600 dark:text-gray-300 leading-relaxed text-base space-y-6 font-light grow transition-colors duration-300">
      {children}
    </div>

    {hasDecoration && (
      <div className="w-full h-32 relative opacity-10 dark:opacity-20 mt-6">
         <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#22c55e_10px,#22c55e_11px)]" />
      </div>
    )}
  </motion.div>
);

export default function AboutPage() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (carouselRef.current) {
        setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    // ADAPTED: No hardcoded background color here (it takes from layout), but kept text color logic
    <section className="min-h-screen relative overflow-hidden pb-20 transition-colors duration-300">
      
      {/* Top Gradient Fade - Adapted for light mode visibility */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-green-100/40 dark:from-green-900/20 to-transparent pointer-events-none" />

      <div className="container mx-auto px-6 pt-32 relative z-10">

        {/* --- 1. HERO SECTION --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-32"
        >
          {/* ADAPTED: Text colors */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-zinc-900 dark:text-white transition-colors duration-300">
            About <span className="text-green-600 dark:text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">JPCS</span>
          </h1>
          <p className="text-zinc-600 dark:text-gray-400 text-lg md:text-xl max-w-2xl mx-auto transition-colors duration-300">
            Innovating the Future, One Line of Code at a Time.
          </p>
        </motion.div>

        {/* --- 2. WHO WE ARE --- */}
        <div className="relative mb-40">
            {/* GIANT BACKGROUND TEXT */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none z-0">
                {/* ADAPTED: text-zinc-900/5 (Light) vs text-white/5 (Dark) */}
                <span className="text-[6rem] md:text-[12rem] font-black text-zinc-900/5 dark:text-white/5 tracking-tighter leading-none whitespace-nowrap transition-colors duration-300">
                    IDENTITY
                </span>
            </div>

            <div className="relative z-10 grid md:grid-cols-12 items-center gap-8">
                {/* IMAGE SECTION */}
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="md:col-span-7 relative h-[400px] md:h-[550px] rounded-lg overflow-hidden border-2 border-green-500/50 shadow-xl"
                >
                    <div className="absolute inset-0 bg-green-500/10 mix-blend-overlay z-10" />
                    <Image
                        src="/about/WWD.JPG" 
                        alt="JPCS Team"
                        fill
                        priority 
                        sizes="(max-width: 768px) 100vw, 60vw"
                        // ADAPTED: Removed grayscale in light mode for better vibrancy, kept contrast
                        className="object-cover md:grayscale md:hover:grayscale-0 transition-all duration-500 contrast-110" 
                    />
                    {/* Tech Corners */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-green-500 z-20" />
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-green-500 z-20" />
                </motion.div>

                {/* TEXT CARD SECTION */}
                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    // ADAPTED: bg-white/90 (Light) vs bg-black/80 (Dark)
                    className="md:col-span-5 md:-ml-20 relative bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-green-500/30 p-8 md:p-12 rounded-xl shadow-[0_0_50px_rgba(34,197,94,0.15)] transition-colors duration-300"
                >
                    <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight transition-colors duration-300">
                        We Are <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-400 dark:from-green-400 dark:to-green-600 drop-shadow-sm">
                            The Future
                        </span>
                    </h2>
                    
                    <div className="space-y-6 text-lg text-zinc-700 dark:text-gray-300 transition-colors duration-300">
                        <p>
                            The <span className="text-green-600 dark:text-green-400 font-bold">Junior Philippine Computer Society (JPCS)</span> at De La Salle Araneta University is a premier student organization dedicated to fostering technological excellence.
                        </p>
                        <p>
                            We are a community of aspiring developers, designers, and tech enthusiasts. Our goal is to bridge the gap between academic theory and real-world application through workshops, hackathons, and collaborative projects.
                        </p>
                    </div>

                    <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-2 border-r-2 border-green-500/50 rounded-br-2xl -z-10" />
                </motion.div>
            </div>
        </div>

        {/* --- 3. VISION & MISSION --- */}
        <div className="grid lg:grid-cols-2 gap-8 mb-32 items-stretch">
          
          <InfoCard title="VISION">
            <p className="border-l-2 border-green-500/30 pl-4">{VISION_TEXT[0]}</p>
            <p>{VISION_TEXT[1]}</p>
            <p>{VISION_TEXT[2]}</p>
            <p>
              It also aims to provide the knowledge and skills the students needed by creating and maintaining an exciting extracurricular environment, wherein the youth is united under the banner of <span className="text-green-600 dark:text-green-400 font-semibold">leadership, technical excellence and ethical conduct</span> while fostering among them lasting friendship.
            </p>
          </InfoCard>

          <InfoCard title="MISSION" delay={0.2} hasDecoration={true}>
             <p className="border-l-2 border-green-500/30 pl-4 mb-6">
                As an organization that is actively involved in Information and Communication Technology-related concerns of education, industry, business, and government, Junior Philippine Computer Society is pleased to collaborate with its officers and members in helping the university in developing world-class Computer Science students that have <span className="text-green-700 dark:text-white font-bold bg-green-500/20 px-1 rounded-sm">leadership, integrity, faith and excellence</span>.
             </p>
          </InfoCard>

        </div>

        {/* --- 4. CAROUSEL --- */}
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-zinc-900 dark:text-white transition-colors duration-300">What We Do</h2>
            <p className="text-zinc-600 dark:text-gray-400 transition-colors duration-300">Swipe to explore our events and workshops</p>
          </div>

          <motion.div 
            ref={carouselRef} 
            className="cursor-grab overflow-hidden" 
            whileTap={{ cursor: "grabbing" }}
          >
            <motion.div 
              drag="x" 
              dragConstraints={{ right: 0, left: -width }} 
              className="flex gap-6"
            >
              {CAROUSEL_IMAGES.map((src, index) => (
                <motion.div 
                  key={index} 
                  // ADAPTED: Border color
                  className="min-w-[300px] h-[400px] md:min-w-[400px] relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shadow-lg"
                >
                  <Image 
                    src={src} 
                    alt={`Activity ${index + 1}`} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover pointer-events-none" 
                  />
                  <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent opacity-60 dark:opacity-80" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}