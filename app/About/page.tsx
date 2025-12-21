"use client";

import { useRef, useEffect, useState, ReactNode } from "react";
// Image import removed as it is replaced by the placeholder
// import Image from "next/image"; 
import { 
  motion, 
  useMotionValue, 
  useTransform, 
  animate, 
  useInView,
  AnimatePresence 
} from "framer-motion";
// Added FaSatelliteDish and FaLock
import { FaChevronLeft, FaChevronRight, FaFacebook, FaGlobe, FaSatelliteDish, FaLock } from "react-icons/fa"; 

// --- IMPORT COMPONENTS ---
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor";

// --- STATIC DATA ---
const VISION_TEXT = [
  "To provide Computer Science students the extra-curricular learning environment that will help them gain more knowledge, more skills and the right attitude that can ensure their preparedness in becoming computing and technology professionals.",
  "The organization aims to provide Computer Science students the extracurricular learning environment that will help them gain more knowledge, more skills and right attitude that can ensure them of their preparedness in becoming computing and technology professionals.",
  "It provides students an opportunity to experience unity with other Computer Science students through common project.",
  "It also aims to provide the knowledge and skills the students needed by creating and maintaining an exciting extracurricular environment, wherein the youth is united under the banner of leadership, technical excellence and ethical conduct while fostering among them lasting friendship."
];

const MISSION_TEXT = "As an organization that is actively involved in Information and Communication Technology-related concerns of education, industry, business, and government, Junior Philippine Computer Society is pleased to collaborate with its officers and members in helping the university in developing world-class Computer Science students that have leadership, integrity, faith and excellence.";

const CAROUSEL_ITEMS = [
  { title: "Workshops", subtitle: "Skill Building" },
  { title: "Community", subtitle: "Stronger Together" },
  { title: "Innovation", subtitle: "Future Ready" },
  { title: "Leadership", subtitle: "Leading the Way" },
];

// --- UPDATED AFFILIATES DATA ---
const AFFILIATES = [
  { 
    name: "De La Salle Araneta University", 
    acronym: "DLSAU", 
    color: "bg-green-700",
    logo: "/affiliates/dlsau.png",
    facebookUrl: "https://www.facebook.com/dlsauofficial",
    websiteUrl: "https://www.dlsau.edu.ph",
    description: "De La Salle Araneta University (DLSAU) is a private Catholic Lasallian institution founded in 1946 by Don Salvador Z. Araneta as the Araneta Institute of Agriculture (AIA), later renamed the Gregorio Araneta University Foundation (GAUF), and relocated to Malabon in 1947 to better serve its community. After a collaborative integration process that began in 1987, it officially became part of the De La Salle System in 2002, joining the network of Lasallian educational institutions committed to holistic formation and academic excellence."
  },
  { 
    name: "College of Arts, Sciences, and Technology", 
    acronym: "CAST", 
    color: "bg-blue-600",
    logo: "/affiliates/cast.png",
    facebookUrl: "https://www.facebook.com/CSCCASTDLSAU",
    description: "The College of Arts, Sciences, and Technology (CAST) is dedicated to providing a holistic education that equips students with the knowledge, skills, and values necessary to thrive in a rapidly evolving world."
  },
  { 
    name: "Samahan ng Pinagkaisang Samahan", 
    acronym: "SAMPISANAN", 
    color: "bg-yellow-500",
    logo: "/affiliates/sampisanan.png",
    facebookUrl: "https://www.facebook.com/sampisanan",
    websiteUrl: null,
    description: "The Samahan ng Pinagkaisang Samahan (SAMPISANAN) is an institutional umbrella organization of De La Salle Araneta University (DLSAU) that fosters the spirit of camaraderie amongst academic and non-academic student organizations, uniting them through collaboration, shared initiatives, and collective student leadership."
  },
];

// --- COMPONENT: THEMED PLACEHOLDER ---
// This replaces the images in the carousel
const ComingSoonPlaceholder = ({ title }: { title: string }) => (
  <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 overflow-hidden group">
    
    {/* Tech Grid Background */}
    <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.2]" 
         style={{ backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
    </div>

    {/* Animated Scanline */}
    <div className="absolute inset-0 bg-linear-to-b from-transparent via-green-500/10 to-transparent h-[10%] w-full animate-[scan_3s_linear_infinite] pointer-events-none" />

    {/* Icon */}
    <div className="relative z-10 mb-4 p-4 rounded-full border-2 border-zinc-300 dark:border-green-500/30 bg-zinc-200 dark:bg-black/50 text-zinc-400 dark:text-green-500 transform group-hover:scale-110 transition-transform duration-500">
      <FaSatelliteDish className="text-3xl md:text-5xl animate-pulse" />
    </div>

    {/* Text */}
    <h3 className="relative z-10 text-xl font-black uppercase text-zinc-400 dark:text-white tracking-widest mb-1">
      Visuals Pending
    </h3>
    <div className="relative z-10 flex items-center gap-2 text-xs font-mono text-zinc-500 dark:text-green-500/70 bg-zinc-200 dark:bg-green-900/20 px-2 py-1 rounded">
      <FaLock size={10} />
      <span>{title.substring(0, 10).toUpperCase()}_LOCKED</span>
    </div>

    {/* Corner Accents */}
    <div className="absolute top-4 left-4 w-2 h-2 border-t-2 border-l-2 border-zinc-400 dark:border-green-500" />
    <div className="absolute bottom-4 right-4 w-2 h-2 border-b-2 border-r-2 border-zinc-400 dark:border-green-500" />
  </div>
);

// --- SUB-COMPONENT: ANIMATED COUNTER ---
const Counter = ({ value }: { value: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, { duration: 2.5, ease: "circOut" });
      return controls.stop;
    }
  }, [isInView, value, count]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
};

// --- SUB-COMPONENT: INFO CARD ---
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
    className="group relative p-8 md:p-10 rounded-2xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/50 backdrop-blur-md flex flex-col overflow-hidden h-full shadow-lg dark:shadow-none transition-colors duration-300"
  >
    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-green-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
    <h3 className="text-3xl font-bold text-zinc-800 dark:text-white mb-8 flex items-center gap-3">
       <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
       </span>
       {title}
    </h3>
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

// --- SUB-COMPONENT: REUSABLE TOOLTIP ---
const Tooltip = ({ text }: { text: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 5, scale: 0.95 }}
    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold tracking-widest uppercase rounded shadow-xl pointer-events-none whitespace-nowrap z-50 border border-white/10 dark:border-black/10"
  >
    {text}
    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-zinc-900 dark:border-t-zinc-100" />
  </motion.div>
);

import Image from "next/image"; // Re-importing Image for other sections (Affiliates, Identity)

export default function AboutPage() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null);
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

  const SCROLL_STEP = 400; 

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
    <section className="min-h-screen relative overflow-hidden pb-32 transition-colors duration-300">
      
      <CircuitCursor />

      <div className="absolute inset-0 z-0">
         <FloatingCubes />
      </div>

      <div className="absolute top-0 left-0 w-full h-[500px] bg-linear-to-b from-green-100/40 dark:from-green-900/20 to-transparent pointer-events-none z-0" />

      <div className="container mx-auto px-6 pt-32 relative z-10">

        {/* --- HERO --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-32"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-zinc-900 dark:text-white transition-colors duration-300">
            About <span className="text-green-600 dark:text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">JPCS</span>
          </h1>
          <p className="text-zinc-600 dark:text-gray-400 text-lg md:text-xl max-w-2xl mx-auto transition-colors duration-300">
            Innovating the Future, One Line of Code at a Time.
          </p>
        </motion.div>

        {/* --- IDENTITY --- */}
        <div className="relative mb-20"> 
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center pointer-events-none select-none z-0">
                <span className="text-[6rem] md:text-[12rem] font-black text-zinc-900/5 dark:text-white/5 tracking-tighter leading-none whitespace-nowrap transition-colors duration-300">
                    IDENTITY
                </span>
            </div>

            <div className="relative z-10 grid md:grid-cols-12 items-center gap-8">
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
                        className="object-cover md:grayscale md:hover:grayscale-0 transition-all duration-500 contrast-110" 
                    />
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-green-500 z-20" />
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-green-500 z-20" />
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="md:col-span-5 md:-ml-20 relative bg-white/90 dark:bg-black/80 backdrop-blur-xl border border-green-500/30 p-8 md:p-12 rounded-xl shadow-[0_0_50px_rgba(34,197,94,0.15)] transition-colors duration-300"
                >
                    <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight transition-colors duration-300">
                        We Are <br/>
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-green-600 to-green-400 dark:from-green-400 dark:to-green-600 drop-shadow-sm">
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
                </motion.div>
            </div>
        </div>

        {/* --- STATS --- */}
        <div className="flex justify-center mb-40">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full -z-10 group-hover:bg-green-500/30 transition-all duration-500" />
              <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-green-500/30 px-12 py-8 rounded-2xl shadow-xl backdrop-blur-sm flex flex-col items-center gap-2 min-w-[300px]">
                  <div className="flex items-center gap-2 mb-2">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-xs font-mono text-zinc-500 dark:text-green-400 tracking-widest uppercase">
                        System_Status: Online
                     </span>
                  </div>
                  <div className="text-7xl md:text-8xl font-black text-zinc-800 dark:text-white tracking-tighter">
                     <Counter value={107} />
                  </div>
                  <div className="text-zinc-600 dark:text-zinc-400 font-medium text-lg uppercase tracking-wide">
                    Registered Members
                  </div>
                  <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-green-500 opacity-50" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-green-500 opacity-50" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-green-500 opacity-50" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-green-500 opacity-50" />
              </div>
            </motion.div>
        </div>

        {/* --- VISION & MISSION --- */}
        <div className="grid lg:grid-cols-2 gap-8 mb-40 items-stretch">
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
                {MISSION_TEXT}
             </p>
             <div className="inline-block mt-4">
                 <span className="text-green-700 dark:text-green-300 font-bold bg-green-500/10 px-3 py-1 rounded-full text-sm border border-green-500/20">
                   Leadership • Integrity • Faith • Excellence
                 </span>
             </div>
          </InfoCard>
        </div>

        {/* --- CAROUSEL --- */}
        <div className="relative py-10 mb-20">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-zinc-200 dark:border-zinc-800 pb-6 gap-6">
            <div>
               <h2 className="text-4xl md:text-6xl font-black uppercase text-transparent bg-clip-text bg-linear-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">
                 What We Do
               </h2>
               <p className="mt-2 text-zinc-600 dark:text-green-400 font-mono text-sm tracking-widest uppercase">
                 // Highlights & Activities
               </p>
            </div>
            
            <div className="flex items-center gap-4">
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
            className="cursor-grab overflow-hidden active:cursor-grabbing relative z-10 px-2 py-4" 
          >
            <motion.div 
              drag="x" 
              dragConstraints={{ right: 0, left: -width }} 
              style={{ x }} 
              dragElastic={0.1}
              dragTransition={{ power: 0.3, timeConstant: 200 }}
              className="flex gap-6"
            >
              {CAROUSEL_ITEMS.map((item, index) => (
                <motion.div 
                  key={index} 
                  className="group relative min-w-[320px] md:min-w-[450px] h-[500px] rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl"
                  whileHover={{ scale: 1.02, zIndex: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  
                  {/* --- REPLACED IMAGE WITH COMING SOON PLACEHOLDER --- */}
                  <ComingSoonPlaceholder title={item.title} />

                  <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent opacity-90 pointer-events-none" />
                  <div className="absolute inset-4 border border-white/10 group-hover:border-green-500/50 transition-colors duration-300 rounded-xl pointer-events-none" />
                  
                  <div className="absolute bottom-0 left-0 w-full p-8 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 pointer-events-none">
                      <span className="text-green-400 font-mono text-xs tracking-widest uppercase mb-2 block">
                        Event_0{index + 1}
                      </span>
                      <h3 className="text-3xl font-bold text-white mb-1 group-hover:text-green-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-zinc-400 text-sm transform opacity-0 group-hover:opacity-100 transition-all duration-300 delay-75">
                        {item.subtitle}
                      </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-full bg-green-500/5 blur-3xl rounded-full z-0 pointer-events-none" />
        </div>

        {/* --- OUR AFFILIATES --- */}
        <div className="relative py-20 max-w-6xl mx-auto">
          <div className="mb-20 text-center">
             <h2 className="text-4xl md:text-6xl font-black uppercase text-zinc-900 dark:text-white mb-4 transition-colors duration-300">
               Our Affiliates
             </h2>
             <div className="h-1 w-24 bg-green-500 rounded-full mx-auto" /> 
             <p className="mt-4 text-zinc-600 dark:text-green-400 font-mono tracking-widest uppercase text-sm">
               // Partners in Excellence
             </p>
          </div>

          <div className="space-y-24">
             {AFFILIATES.map((affiliate, index) => (
               <motion.div 
                 key={index}
                 initial={{ opacity: 0, y: 50 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true, margin: "-100px" }}
                 transition={{ delay: index * 0.1, duration: 0.6 }}
                 className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${
                    index % 2 === 1 ? "md:flex-row-reverse" : "" 
                 }`}
               >
                 {/* TEXT COLUMN */}
                 <div className="flex-1 text-center md:text-left relative z-10">
                     <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                        <span className="inline-block py-1 px-3 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-mono border border-green-500/30">
                           {affiliate.acronym}
                        </span>

                        <div className="flex items-center gap-3">
                           {/* FACEBOOK BUTTON WITH HOVER TOOLTIP */}
                           <div className="relative">
                             <motion.a 
                               href={affiliate.facebookUrl}
                               target="_blank"
                               rel="noopener noreferrer"
                               onMouseEnter={() => setHoveredSocial(`${affiliate.acronym}-fb`)}
                               onMouseLeave={() => setHoveredSocial(null)}
                               whileHover={{ scale: 1.15, y: -2 }}
                               whileTap={{ scale: 0.9 }}
                               className="text-zinc-400 hover:text-[#1877F2] dark:text-zinc-500 dark:hover:text-[#1877F2] transition-colors duration-300 relative z-20"
                               aria-label={`Visit ${affiliate.acronym} on Facebook`}
                             >
                               <FaFacebook size={24} />
                             </motion.a>
                             <AnimatePresence>
                               {hoveredSocial === `${affiliate.acronym}-fb` && (
                                 <Tooltip text="Facebook" />
                               )}
                             </AnimatePresence>
                           </div>

                           {/* WEBSITE BUTTON WITH HOVER TOOLTIP (Check if URL exists) */}
                           {affiliate.websiteUrl && (
                             <div className="relative">
                               <motion.a 
                                 href={affiliate.websiteUrl}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 onMouseEnter={() => setHoveredSocial(`${affiliate.acronym}-web`)}
                                 onMouseLeave={() => setHoveredSocial(null)}
                                 whileHover={{ scale: 1.15, y: -2 }}
                                 whileTap={{ scale: 0.9 }}
                                 className="text-zinc-400 hover:text-green-600 dark:text-zinc-500 dark:hover:text-green-400 transition-colors duration-300 relative z-20"
                                 aria-label={`Visit ${affiliate.acronym} website`}
                               >
                                 <FaGlobe size={24} />
                               </motion.a>
                               <AnimatePresence>
                                 {hoveredSocial === `${affiliate.acronym}-web` && (
                                   <Tooltip text="Visit Website" />
                                 )}
                               </AnimatePresence>
                             </div>
                           )}
                        </div>
                     </div>

                     <h3 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-6 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                        {affiliate.name}
                     </h3>
                     
                     <div className="p-6 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border-l-4 border-green-500 backdrop-blur-sm shadow-sm">
                        <p className="text-zinc-700 dark:text-zinc-300 text-lg leading-relaxed">
                           {affiliate.description}
                        </p>
                     </div>
                 </div>

                 {/* LOGO COLUMN */}
                 <div className="relative flex-shrink-0 group cursor-default">
                     <div className={`relative w-64 h-64 rounded-3xl bg-white flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(34,197,94,0.15)] border-4 border-zinc-100 dark:border-zinc-800 overflow-hidden transform transition-all duration-500 group-hover:scale-105 group-hover:border-green-500`}>
                        
                        <span className="text-6xl font-black text-zinc-100 absolute select-none">
                          {affiliate.acronym}
                        </span>
                        
                        <Image 
                          src={affiliate.logo} 
                          alt={affiliate.name} 
                          fill
                          className="object-contain p-8 relative z-10"
                        /> 
                     </div>

                     <div className="absolute -top-6 -right-6 w-24 h-24 border-t-2 border-r-2 border-green-500/30 rounded-tr-3xl -z-10 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" />
                     <div className="absolute -bottom-6 -left-6 w-24 h-24 border-b-2 border-l-2 border-green-500/30 rounded-bl-3xl -z-10 group-hover:-translate-x-2 group-hover:translate-y-2 transition-transform duration-500" />
                 </div>
               </motion.div>
             ))}
          </div>
        </div>

      </div>
      
      {/* CSS Animation for the scanline effect */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
      `}</style>
    </section>
  );
}