"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { FaFacebook, FaEnvelope, FaCamera, FaPen, FaVideo, FaPaintBrush } from "react-icons/fa";

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
    id: 6,
    name: "Joshua Enriquez",
    role: "Assistant Secretary",
    bio: "Supporting the secretary in all administrative tasks and ensuring effective communication within the team.",
    image: "/officers/ASEC.JPG",
    socials: { facebook: "https://www.facebook.com/joshua.enriquez.5891", email: "#" }
  },
  {
    id: 7,
    name: "Iris Caryl Chua",
    role: "Treasurer",
    bio: "Keeping the organization organized and on track with meticulous record-keeping and scheduling.",
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

// --- 2. MULTIMEDIA TEAM DATA ---
const multimediaTeam = [
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

// --- 3. ANIMATION VARIANTS ---
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

  useEffect(() => {
    if (carouselRef.current) {
      setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
    }
  }, []);

  return (
    // ADAPTED: Removed bg-transparent and hardcoded text-white. 
    // Now relies on layout.tsx for background, and handles text color dynamically.
    <section className="min-h-screen py-24 px-4 md:px-8 relative overflow-hidden transition-colors duration-300">
      
      {/* Header Section */}
      <div className="max-w-4xl mx-auto text-center mb-24 relative z-20">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          // ADAPTED: text-zinc-900 (Light) vs text-white (Dark)
          className="text-4xl md:text-6xl font-bold mb-6 text-zinc-900 dark:text-white transition-colors duration-300"
        >
          Meet the <span className="text-green-600 dark:text-green-500">Leaders</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          // ADAPTED: text-zinc-600 (Light) vs text-gray-300 (Dark)
          className="text-zinc-600 dark:text-gray-300 text-lg md:text-xl max-w-2xl mx-auto transition-colors duration-300"
        >
          The dedicated minds behind De La Salle Araneta JPCS, committed to fostering technological excellence and community.
        </motion.p>
      </div>

      {/* --- MAIN OFFICERS LIST --- */}
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
              
              {/* Image Section */}
              <div className="w-full md:w-1/2 flex justify-center">
                <div className="relative group">
                  <div className="absolute inset-0 bg-green-500 blur-[20px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-xl"></div>
                  
                  {/* ADAPTED: Border and Background color for the image frame */}
                  <div className="relative h-[350px] w-[300px] md:h-[400px] md:w-[350px] rounded-xl overflow-hidden border-2 border-green-500/30 bg-white dark:bg-zinc-900 shadow-xl z-10 transition-colors duration-300">
                    <Image
                      src={officer.image}
                      alt={officer.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Scanlines effect (Optional: reduced opacity in light mode) */}
                    <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-5 dark:opacity-10 pointer-events-none"></div>
                  </div>
                </div>
              </div>

              {/* Text Section */}
              <div className={`w-full md:w-1/2 flex flex-col ${isEven ? 'md:items-start text-left' : 'md:items-end text-right'}`}>
                {/* ADAPTED: Badge colors */}
                <span className="inline-block py-1 px-3 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-mono mb-4 border border-green-500/30 transition-colors duration-300">
                  {officer.role}
                </span>
                
                {/* ADAPTED: Name color */}
                <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4 transition-colors duration-300">
                  {officer.name}
                </h2>
                
                {/* ADAPTED: Bio text color */}
                <p className="text-zinc-600 dark:text-gray-300 text-lg leading-relaxed mb-8 max-w-xl transition-colors duration-300">
                  {officer.bio}
                </p>

                {/* ADAPTED: Social Icons */}
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

      {/* --- MULTIMEDIA TEAM CAROUSEL --- */}
      <div className="max-w-7xl mx-auto relative z-20 mt-32 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-zinc-900 dark:text-white transition-colors duration-300">
            The <span className="text-green-600 dark:text-green-500">Creatives</span>
          </h2>
          <p className="text-zinc-600 dark:text-gray-400 transition-colors duration-300">Our Multimedia Team making magic happen.</p>
        </div>

        <motion.div 
          ref={carouselRef} 
          className="cursor-grab overflow-hidden px-4" 
          whileTap={{ cursor: "grabbing" }}
        >
          <motion.div 
            drag="x" 
            dragConstraints={{ right: 0, left: -width }} 
            className="flex gap-6"
          >
            {multimediaTeam.map((member, index) => (
              <motion.div 
                key={index} 
                // ADAPTED: Card background and border
                className="min-w-[280px] h-[350px] relative rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-green-500/20 group hover:border-green-500/50 shadow-lg dark:shadow-none transition-all duration-300"
              >
                {/* Image Section */}
                {/* ADAPTED: Background behind image */}
                <div className="relative h-2/3 w-full bg-zinc-100 dark:bg-zinc-800">
                   <Image
                      src={member.image} 
                      alt={member.name}
                      fill
                      className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                   {/* Icon Badge - ADAPTED colors */}
                   <div className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full text-green-600 dark:text-green-400 border border-green-500/30 shadow-sm">
                     {member.icon}
                   </div>
                </div>

                {/* Info Text */}
                {/* ADAPTED: Gradient background for text area */}
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

      {/* Background Decor - Kept subtle for both modes */}
      <div className="absolute top-[20%] right-0 w-1/3 h-1/3 bg-green-500/10 blur-[100px] rounded-full z-0 pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-0 w-1/3 h-1/3 bg-green-500/5 blur-[120px] rounded-full z-0 pointer-events-none"></div>
    </section>
  );
}