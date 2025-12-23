"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, Variants, useMotionValue, animate } from "framer-motion";
import { 
  FaFacebook, FaEnvelope, FaCamera, FaPen, FaVideo, FaPaintBrush, FaArrowRight,
  FaChevronLeft, FaChevronRight, FaStar 
} from "react-icons/fa"; 

// 1. IMPORT ANIMATED COMPONENTS
import FloatingCubes from "../components/FloatingCubes";
import CircuitCursor from "../components/CircuitCursor"; 

// --- 1. MAIN OFFICERS DATA ---
const officers = [
  {
    id: 1,
    name: "Justine Lloyd Garma",
    role: "President",
    bio: "Leading the vision for JPCS with a passion for innovation and community building. Focused on creating impactful workshops this year.",
    image: "/officers/PR.JPG", 
    socials: { facebook: "https://www.facebook.com/justine.lloyd.garma#", email: "#" }
  },
  {
    id: 2,
    name: "Ice Matthew Ramirez",
    role: "Vice President - Operations",
    bio: "Ensuring smooth operations within the organization and managing member engagement. A backend development enthusiast.",
    image: "/officers/VPO.JPG",
    socials: { facebook: "https://www.facebook.com/icyy.teo/", email: "#" }
  },
  {
    id: 3,
    name: "Louievince Kyle Laguidao" ,
    role: "Vice President - External",
    bio: "Building bridges with other organizations and industry partners. Expert in networking and corporate relations.",
    image: "/officers/VPE.JPG",
    socials: { facebook: "https://www.facebook.com/luwi.111093", email: "#" }
  },
  {
    id: 4,
    name: "Ma. Antonette Melon",
    role: "Vice President - Internal",
    bio: "Ensuring Internal Operations are fluid and are optimized for efficiency.",
    image: "/officers/VPI.JPG",
    socials: { facebook: "https://www.facebook.com/antonette.melon", email: "#" }
  },
  {
    id: 5,
    name: "Reynalyn Ruth Morbo",
    role: "Secretary",
    bio: "Keeping the organization organized and on track with meticulous record-keeping and scheduling.",
    image: "/officers/SEC.JPG",
    socials: { facebook: "https://www.facebook.com/reynalyn.morbo", email: "#" }
  },
  {
    id: 7,
    name: "Iris Caryl Chua",
    role: "Treasurer",
    bio: "Managing the organization's finances with transparency and accountability, ensuring funds are allocated effectively.",
    image: "/officers/TRE.JPG",
    socials: { facebook: "https://www.facebook.com/xua.iris", email: "iris.chua@dlsau.edu.ph" }
  },
  {
    id: 8,
    name: "Cyril Rodriguez",
    role: "Auditor",
    bio: "Keeping the organization organized and on track with meticulous record-keeping and scheduling.",
    image: "/officers/AUD.JPG",
    socials: { facebook: "https://www.facebook.com/rodricyr", email: "#" }
  },
];

// --- 2. EXECUTIVE ASSOCIATES DATA ---
const executives = [
  { 
    name: "Joshua Enriquez", 
    role: "Assistant Secretary", 
    icon: <FaStar />,
    image: "/officers/ASEC.JPG" 
  },
];

// --- 3. YEAR REPRESENTATIVES DATA ---
const yearReps = [
  { 
    id: 1,
    year: "1st Year",
    number: "01",
    name: "Bernadette Basco", 
    image: "/officers/YR1.png", 
    quote: "The voice of the fresh minds."
  },
  { 
    id: 2,
    year: "2nd Year",
    number: "02",
    name: "Carlos Alcantara", 
    image: "/officers/YR2.png", 
    quote: "Bridging the gap for sophomores."
  },
  { 
    id: 3,
    year: "3rd Year",
    number: "03",
    name: "Synellign Bautista", 
    image: "/officers/REP3.JPG", 
    quote: "Guiding the juniors to excellence."
  },
];

// --- 4. CREATIVE TEAM DATA ---
const creativeTeam = [
  { 
    name: "Jhenelle Fern Refuerzo", 
    role: "Graphic Designer", 
    icon: <FaPaintBrush />,
    image: "/creatives/GA1.JPG"
  },
  { 
    name: "Chelsy Mei Tuazon", 
    role: "Graphic Designer", 
    icon: <FaPaintBrush />,
    image: "/creatives/GA2.JPG"
  },
  { 
    name: "Marcelino III Zapanta", 
    role: "Graphic Designer", 
    icon: <FaPaintBrush />,
    image: "/creatives/GA3.jpg"
  },
  { 
    name: "Joshua Enriquez", 
    role: "Photographer", 
    icon: <FaCamera />,
    image: "/creatives/PH1.png"
  },
  { 
    name: "Jose Luis Gabo", 
    role: "Photographer", 
    icon: <FaCamera />,
    image: "/creatives/PH3.png"
  },
  { 
    name: "Carlos Alcantara", 
    role: "Video Editor", 
    icon: <FaVideo />,
    image: "/creatives/VE.JPG"
  },
  { 
    name: "Manuel Zian Kyle Piangco", 
    role: "Captions / Content", 
    icon: <FaPen />,
    image: "/creatives/CAP.JPG"
  },
];

// --- 5. ANIMATION VARIANTS ---
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 100, scale: 0.9 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", bounce: 0.3, duration: 0.8 }
  }
};

export default function OfficersPage() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0); 

  useEffect(() => {
    const updateWidth = () => {
      if (carouselRef.current) {
        const newWidth = carouselRef.current.scrollWidth - carouselRef.current.offsetWidth;
        setWidth(newWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const SCROLL_STEP = 304; 

  const scrollLeft = () => {
    const currentX = x.get();
    const newX = Math.min(currentX + SCROLL_STEP, 0); 
    animate(x, newX, { type: "spring", stiffness: 300, damping: 30 });
  };

  const scrollRight = () => {
    const currentX = x.get();
    const newX = Math.max(currentX - SCROLL_STEP, -width); 
    animate(x, newX, { type: "spring", stiffness: 300, damping: 30 });
  };

  return (
    <section className="min-h-screen py-24 px-4 md:px-8 relative overflow-hidden transition-colors duration-300">
      
      <CircuitCursor />

      <div className="absolute inset-0 z-0">
         <FloatingCubes />
      </div>

      {/* --- HEADER --- */}
      <div className="max-w-4xl mx-auto text-center mb-24 relative z-20">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold mb-6 text-zinc-900 dark:text-white transition-colors duration-300"
        >
          Meet the <span className="text-green-600 dark:text-green-500">Leaders</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-600 dark:text-gray-300 text-lg md:text-xl max-w-2xl mx-auto transition-colors duration-300"
        >
          The dedicated minds behind De La Salle Araneta JPCS, committed to fostering technological excellence and community.
        </motion.p>
      </div>

      {/* --- SECTION 1: MAIN OFFICERS LIST --- */}
      <div className="max-w-6xl mx-auto flex flex-col gap-24 relative z-20 mb-32">
        {officers.map((officer, index) => {
          const isEven = index % 2 === 0;
          return (
            <motion.div
              key={officer.id}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 md:gap-16`}
            >
              <div className="w-full md:w-1/2 flex justify-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-green-500 blur-[20px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-xl"></div>
                  <div className="relative h-[350px] w-[300px] md:h-[400px] md:w-[350px] rounded-xl overflow-hidden border-2 border-green-500/30 bg-white dark:bg-zinc-900 shadow-xl z-10 transition-colors duration-300">
                    <Image
                      src={officer.image}
                      alt={officer.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-5 dark:opacity-10 pointer-events-none"></div>
                  </div>
                </div>
              </div>
              <div className={`w-full md:w-1/2 flex flex-col ${isEven ? 'md:items-start text-left' : 'md:items-end text-right'}`}>
                <span className="inline-block py-1 px-3 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-mono mb-4 border border-green-500/30 transition-colors duration-300">
                  {officer.role}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4 transition-colors duration-300">
                  {officer.name}
                </h2>
                <p className="text-zinc-600 dark:text-gray-300 text-lg leading-relaxed mb-8 max-w-xl transition-colors duration-300">
                  {officer.bio}
                </p>
                <div className="flex gap-4 text-2xl text-zinc-400 dark:text-gray-400">
                  {officer.socials.facebook && (
                    <a href={officer.socials.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 dark:hover:text-green-500 transition-colors">
                      <FaFacebook />
                    </a>
                  )}
                  {officer.socials.email && (
                    <a href={officer.socials.email} className="hover:text-green-600 dark:hover:text-green-500 transition-colors">
                      <FaEnvelope />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* --- SECTION 2: YEAR REPRESENTATIVES --- */}
      <div className="max-w-7xl mx-auto relative z-20 mt-32 mb-32 px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-2 text-zinc-900 dark:text-white transition-colors duration-300">
            Year <span className="text-green-600 dark:text-green-500">Representatives</span>
          </h2>
          <p className="text-zinc-600 dark:text-gray-400 transition-colors duration-300">
            The Voice of the Student Body
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {yearReps.map((rep, index) => (
            <motion.div
              key={rep.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative h-[450px] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-green-500/20 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              {/* Background Big Number */}
              <div className="absolute -top-10 -right-6 text-[12rem] font-black text-zinc-100 dark:text-zinc-800/50 select-none transition-colors duration-300 group-hover:text-green-500/10">
                {rep.number}
              </div>

              {/* Image Container */}
              <div className="relative h-3/5 w-full overflow-hidden">
                <Image
                  src={rep.image}
                  alt={rep.name}
                  fill
                  // REMOVED grayscale, added subtle green tint overlay below instead
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* NEW: Subtle Green/Dark Tint Overlay that fades on hover */}
                <div className="absolute inset-0 bg-zinc-900/20 dark:bg-green-900/30 transition-opacity duration-700 group-hover:opacity-0 pointer-events-none" />

                {/* Gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-zinc-900 dark:via-transparent dark:to-transparent opacity-100 pointer-events-none" />
              </div>

              {/* Info Content */}
              <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col justify-end h-full pointer-events-none">
                <div className="relative z-10">
                  <span className="inline-block px-3 py-1 mb-3 text-xs font-bold tracking-widest text-white bg-green-600 rounded-full">
                    {rep.year} REP
                  </span>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {rep.name}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 italic border-l-2 border-green-500 pl-3">
                    "{rep.quote}"
                  </p>
                </div>
              </div>

              {/* Hover Decorative Line */}
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-green-500 transition-all duration-500 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* --- SECTION 3: THE ASSOCIATES (Executive) --- */}
      <div className="max-w-7xl mx-auto relative z-20 mt-32 mb-32">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-2 text-zinc-900 dark:text-white transition-colors duration-300">
            The <span className="text-green-600 dark:text-green-500">Associates</span>
          </h2>
          <p className="text-zinc-600 dark:text-gray-400 transition-colors duration-300">
            Executive Leadership Support
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 px-4">
          {executives.map((member, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="min-w-[280px] h-[350px] relative rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border-2 border-green-500/20 group hover:border-green-500/60 shadow-lg dark:shadow-none transition-all duration-300"
            >
              <div className="relative h-2/3 w-full bg-zinc-100 dark:bg-zinc-800">
                  <Image
                    src={member.image} 
                    alt={member.name}
                    fill
                    className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute top-4 right-4 p-2 bg-yellow-500/10 backdrop-blur-md rounded-full text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 shadow-sm animate-pulse">
                    {member.icon}
                  </div>
              </div>
              <div className="h-1/3 p-6 flex flex-col justify-center bg-white dark:bg-gradient-to-t dark:from-black dark:to-zinc-900 transition-colors duration-300">
                <h3 className="text-xl font-bold text-zinc-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  {member.name}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-gray-400 uppercase tracking-wider font-semibold mt-1">
                  {member.role}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* --- SECTION 4: THE CREATIVES --- */}
      <div className="max-w-7xl mx-auto relative z-20 mt-32 pb-12">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 px-4">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-3xl md:text-5xl font-bold mb-2 text-zinc-900 dark:text-white transition-colors duration-300">
              The <span className="text-green-600 dark:text-green-500">Creatives</span>
            </h2>
            <p className="text-zinc-600 dark:text-gray-400 transition-colors duration-300">
              Multimedia Arts & Design Team
            </p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <button 
              onClick={scrollLeft}
              className="p-3 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-green-400 hover:bg-green-500 hover:text-white dark:hover:bg-green-500 dark:hover:text-black transition-all shadow-md active:scale-95"
              aria-label="Scroll Left"
            >
              <FaChevronLeft />
            </button>
            <button 
              onClick={scrollRight}
              className="p-3 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-green-400 hover:bg-green-500 hover:text-white dark:hover:bg-green-500 dark:hover:text-black transition-all shadow-md active:scale-95"
              aria-label="Scroll Right"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>

        <motion.div 
          ref={carouselRef} 
          className="cursor-grab overflow-hidden px-4 py-4" 
          whileTap={{ cursor: "grabbing" }}
        >
          <motion.div 
            drag="x" 
            dragConstraints={{ right: 0, left: -width }}
            style={{ x }}
            dragElastic={0.1}
            dragTransition={{ power: 0.3, timeConstant: 200 }} 
            className="flex gap-6"
          >
            {creativeTeam.map((member, index) => (
              <motion.div 
                key={index} 
                className="min-w-[280px] h-[350px] relative rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-green-500/20 group hover:border-green-500/50 shadow-lg dark:shadow-none transition-all duration-300"
              >
                {/* Image Section */}
                <div className="relative h-2/3 w-full bg-zinc-100 dark:bg-zinc-800">
                   <Image
                      src={member.image} 
                      alt={member.name}
                      fill
                      className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                   <div className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-green-600 dark:text-green-400 border border-green-500/30 shadow-sm">
                     {member.icon}
                   </div>
                </div>

                {/* Info Text */}
                <div className="h-1/3 p-6 flex flex-col justify-center bg-white dark:bg-gradient-to-t dark:from-black dark:to-zinc-900 transition-colors duration-300">
                  <h3 className="text-xl font-bold text-zinc-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-gray-400 uppercase tracking-wider font-semibold mt-1">
                    {member.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* --- JOIN TEAM CTA SECTION --- */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="relative z-20 max-w-3xl mx-auto text-center mt-12 mb-32 px-4"
      >
        <div className="p-8 md:p-12 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl dark:shadow-[0_0_30px_rgba(34,197,94,0.1)]">
           <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-4">
             Want to be part of the Legacy?
           </h3>
           <p className="text-zinc-600 dark:text-gray-300 mb-8 max-w-xl mx-auto">
             We are constantly looking for talented individuals to join our ranks. If you have the passion for tech and leadership, we want you.
           </p>
           
           <Link 
             href="https://docs.google.com/forms/d/e/1FAIpQLScqZdimJAZDOsH3ksLFjyvUBV4ru5iXy2WFWImtabTu7-ku3Q/viewform" 
             target="_blank"
             rel="noopener noreferrer"
             className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold text-lg rounded-full shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_35px_rgba(34,197,94,0.6)] transition-all transform hover:scale-105"
           >
             Be a part of our team <FaArrowRight />
           </Link>
        </div>
      </motion.div>

      {/* Additional Glows */}
      <div className="absolute top-[20%] right-0 w-1/3 h-1/3 bg-green-500/10 blur-[100px] rounded-full z-0 pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-0 w-1/3 h-1/3 bg-green-500/5 blur-[120px] rounded-full z-0 pointer-events-none"></div>
    </section>
  );
}