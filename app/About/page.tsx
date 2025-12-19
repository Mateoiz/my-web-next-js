"use client";

import { useRef, useEffect, useState, ReactNode } from "react";
import Image from "next/image";
import { 
  motion, 
  useMotionValue, 
  useTransform, 
  animate, 
  useInView 
} from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa"; 

// --- STATIC DATA ---
const VISION_TEXT = [
  "To provide Computer Science students the extra-curricular learning environment that will help them gain more knowledge, more skills and the right attitude that can ensure their preparedness in becoming computing and technology professionals.",
  "The organization aims to provide Computer Science students the extracurricular learning environment that will help them gain more knowledge, more skills and right attitude that can ensure them of their preparedness in becoming computing and technology professionals.",
  "It provides students an opportunity to experience unity with other Computer Science students through common project.",
  "It also aims to provide the knowledge and skills the students needed by creating and maintaining an exciting extracurricular environment, wherein the youth is united under the banner of leadership, technical excellence and ethical conduct while fostering among them lasting friendship."
];

const MISSION_TEXT = "As an organization that is actively involved in Information and Communication Technology-related concerns of education, industry, business, and government, Junior Philippine Computer Society is pleased to collaborate with its officers and members in helping the university in developing world-class Computer Science students that have leadership, integrity, faith and excellence.";

const CAROUSEL_ITEMS = [
  { src: "/about/CS2.JPG", title: "Workshops", subtitle: "Skill Building" },
  { src: "/about/CS1.JPG", title: "Community", subtitle: "Stronger Together" },
  { src: "/about/CS3.JPG", title: "Innovation", subtitle: "Future Ready" },
  { src: "/about/CS4.JPG", title: "Leadership", subtitle: "Leading the Way" },
];

const AFFILIATES = [
  { 
    name: "De La Salle Araneta University", 
    acronym: "DLSAU", 
    // Uses a placeholder background color if no image is found
    color: "bg-green-700",
    logo: "/affiliates/dlsau.png",
    description: "De La Salle Araneta University (DLSAU) is a Catholic private Lasallian university in Malabon, Philippines. It is the seventh campus of De La Salle Philippines. It was formerly known as the Araneta Institute of Agriculture (AIA)."
  },
  { 
    name: "College of Arts, Sciences, and Technology", 
    acronym: "CAST", 
    color: "bg-blue-600",
    logo: "/affiliates/cast.png",
    description: "The College of Arts, Sciences, and Technology (CAST) is dedicated to providing a holistic education that equips students with the knowledge, skills, and values necessary to thrive in a rapidly evolving world."
  },
  { 
    name: "Samahan ng Pinagkaisang Samahan", 
    acronym: "SAMPISANAN", 
    color: "bg-yellow-500",
    logo: "/affiliates/sampisanan.png",
    description: "Sampisanan ng mga Mag-aaral ng De La Salle Araneta University (SM-DLSAU) is the highest governing student body of the university. It serves as the voice of the students and acts as a bridge between the student body and the administration."
  },
];

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
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
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

export default function AboutPage() {
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
      
      {/* Top Gradient Fade */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-green-100/40 dark:from-green-900/20 to-transparent pointer-events-none" />

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
               <h2 className="text-4xl md:text-6xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">
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
                  <Image 
                    src={item.src} 
                    alt={item.title} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                  <div className="absolute inset-4 border border-white/10 group-hover:border-green-500/50 transition-colors duration-300 rounded-xl" />
                  
                  <div className="absolute bottom-0 left-0 w-full p-8 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
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
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-full bg-green-500/5 blur-3xl rounded-full -z-0 pointer-events-none" />
        </div>

        {/* --- 5. OUR AFFILIATES (NEW LAYOUT) --- */}
        {/* --- 5. OUR AFFILIATES (IMPROVED DESIGN) --- */}
        <div className="relative py-20 max-w-6xl mx-auto">
          {/* Section Header */}
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
                 // Layout: Flex Row for Desktop, Column for Mobile
                 className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${
                    index % 2 === 1 ? "md:flex-row-reverse" : "" // Alternates Left/Right layout
                 }`}
               >
                  {/* TEXT COLUMN */}
                  <div className="flex-1 text-center md:text-left relative z-10">
                     {/* Decorative Label */}
                     <span className="inline-block py-1 px-3 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-mono mb-4 border border-green-500/30">
                        {affiliate.acronym}
                     </span>

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
                     {/* The Logo Box */}
                     <div className={`relative w-64 h-64 rounded-3xl bg-white flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(34,197,94,0.15)] border-4 border-zinc-100 dark:border-zinc-800 overflow-hidden transform transition-all duration-500 group-hover:scale-105 group-hover:border-green-500`}>
                        
                        {/* Fallback Acronym (Behind Image) */}
                        <span className="text-6xl font-black text-zinc-100 absolute select-none">
                          {affiliate.acronym}
                        </span>
                        
                        {/* UNCOMMENT THIS when you have the images */}
                        {
                        <Image 
                          src={affiliate.logo} 
                          alt={affiliate.name} 
                          fill
                          className="object-contain p-8 relative z-10"
                        /> 
                        }
                     </div>

                     {/* Tech Decor Elements behind the logo */}
                     <div className="absolute -top-6 -right-6 w-24 h-24 border-t-2 border-r-2 border-green-500/30 rounded-tr-3xl -z-10 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500" />
                     <div className="absolute -bottom-6 -left-6 w-24 h-24 border-b-2 border-l-2 border-green-500/30 rounded-bl-3xl -z-10 group-hover:-translate-x-2 group-hover:translate-y-2 transition-transform duration-500" />
                  </div>
               </motion.div>
             ))}
          </div>
        </div>

      </div>
    </section>
  );
}