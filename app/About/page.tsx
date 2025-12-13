"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

// --- YOUR DATA ---
const carouselImages = [
  "/about/CS2.JPG", 
  "/about/CS1.JPG", 
  "/about/CS3.JPG", 
  "/about/CS4.JPG",
];

export default function AboutPage() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (carouselRef.current) {
      setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
    }
  }, []);

  return (
    <section className="min-h-screen bg-transparent text-white relative overflow-hidden pb-20">
      
      {/* Top Gradient Fade */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-linear-to-b from-green-900/20 to-transparent pointer-events-none" />

      <div className="container mx-auto px-6 pt-32 relative z-10">

        {/* --- 1. HERO SECTION --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-32"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            About <span className="text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">JPCS</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Innovating the Future, One Line of Code at a Time.
          </p>
        </motion.div>

        {/* --- 2. WHO WE ARE --- */}
        <div className="relative mb-40">
            {/* GIANT BACKGROUND TEXT */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none z-0">
                <span className="text-[6rem] md:text-[12rem] font-black text-white/5 tracking-tighter leading-none whitespace-nowrap">
                    IDENTITY
                </span>
            </div>

            <div className="relative z-10 grid md:grid-cols-12 items-center gap-8">
                {/* IMAGE SECTION */}
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="md:col-span-7 relative h-[400px] md:h-[550px] rounded-lg overflow-hidden border-2 border-green-500/50"
                >
                    <div className="absolute inset-0 bg-green-500/20 mix-blend-overlay z-10" />
                    <Image
                        src="/about/WWD.JPG" 
                        alt="JPCS Team"
                        fill
                        className="object-cover grayscale contrast-125" 
                    />
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-green-500 z-20" />
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-green-500 z-20" />
                </motion.div>

                {/* TEXT CARD SECTION */}
                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="md:col-span-5 md:-ml-20 relative bg-black/80 backdrop-blur-xl border border-green-500/30 p-8 md:p-12 rounded-xl shadow-[0_0_50px_rgba(34,197,94,0.15)]"
                >
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight">
                        We Are <br/>
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-green-400 to-green-600 drop-shadow-sm">
                            The Future
                        </span>
                    </h2>
                    
                    <div className="space-y-6 text-lg text-gray-300">
                        <p>
                            The <span className="text-green-400 font-bold">Junior Philippine Computer Society (JPCS)</span> at De La Salle Araneta University is a premier student organization dedicated to fostering technological excellence.
                        </p>
                        <p>
                            We are a community of aspiring developers, designers, and tech enthusiasts. Our goal is to bridge the gap between academic theory and real-world application through workshops, hackathons, and collaborative projects.
                        </p>
                    </div>

                    <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-2 border-r-2 border-green-500/50 rounded-br-2xl -z-10" />
                </motion.div>
            </div>
        </div>

        {/* --- 3. VISION & MISSION (Word for Word, but Styled) --- */}
        <div className="grid lg:grid-cols-2 gap-8 mb-32">
          
          {/* VISION CARD */}
          <motion.div 
            whileHover={{ scale: 1.01, borderColor: "rgba(34,197,94,0.6)" }}
            className="group relative p-8 md:p-10 rounded-2xl bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-md flex flex-col overflow-hidden"
          >
            {/* Tech Decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-green-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            
            <h3 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
               {/* Blinking Status Light */}
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
               </span>
               VISION
            </h3>
            
            <div className="text-gray-300 leading-relaxed text-base space-y-6 font-light">
              <p className="border-l-2 border-green-500/30 pl-4">
                To provide Computer Science students the extra-curricular learning environment that will help them gain more knowledge, more skills and the right attitude that can ensure their preparedness in becoming computing and technology professionals.
              </p>
              <p>
                The organization aims to provide Computer Science students the extracurricular learning environment that will help them gain more knowledge, more skills and right attitude that can ensure them of their preparedness in becoming computing and technology professionals. 
              </p>
              <p>
                It provides students an opportunity to experience unity with other Computer Science students through common project. 
              </p>
              <p>
                It also aims to provide the knowledge and skills the students needed by creating and maintaining an exciting extracurricular environment, wherein the youth is united under the banner of <span className="text-green-400 font-semibold">leadership, technical excellence and ethical conduct</span> while fostering among them lasting friendship.
              </p>
            </div>
          </motion.div>

          {/* MISSION CARD */}
          <motion.div 
            whileHover={{ scale: 1.01, borderColor: "rgba(34,197,94,0.6)" }}
            className="group relative p-8 md:p-10 rounded-2xl bg-zinc-900/60 border border-zinc-700/50 backdrop-blur-md flex flex-col overflow-hidden"
          >
             {/* Tech Decoration */}
             <div className="absolute top-0 left-0 w-full h-1  bg-linear-to-r from-transparent via-green-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

            <h3 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
               {/* Blinking Status Light */}
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
               </span>
               MISSION
            </h3>
            
            <div className="text-gray-300 leading-relaxed text-base h-full flex flex-col justify-between">
              <p className="border-l-2 border-green-500/30 pl-4 mb-6">
                As an organization that is actively involved in Information and Communication Technology-related concerns of education, industry, business, and government, Junior Philippine Computer Society is pleased to collaborate with its officers and members in helping the university in developing world-class Computer Science students that have <span className="text-white font-bold bg-green-500/20 px-1 rounded-sm">leadership, integrity, faith and excellence</span>.
              </p>
              
              {/* Decorative graphic at the bottom of mission */}
              <div className="w-full h-32 relative opacity-20 mt-auto">
                 <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#22c55e_10px,#22c55e_11px)]" />
              </div>
            </div>
          </motion.div>

        </div>

        {/* --- 4. CAROUSEL --- */}
        <div className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">What We Do</h2>
            <p className="text-gray-400">Swipe to explore our events and workshops</p>
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
              {carouselImages.map((src, index) => (
                <motion.div 
                  key={index} 
                  className="min-w-[300px] h-[400px] md:min-w-[400px] relative rounded-xl overflow-hidden border border-zinc-800"
                >
                  <Image 
                    src={src} 
                    alt="Activity" 
                    fill 
                    className="object-cover pointer-events-none" 
                  />
                  <div className="absolute bottom-0 w-full h-1/2 bg-linear-to-t from-black to-transparent opacity-80" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}