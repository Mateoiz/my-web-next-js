"use client";

import Image from "next/image";
import { motion, Variants } from "framer-motion";
import { FaLinkedin, FaGithub, FaEnvelope } from "react-icons/fa";

// --- 1. PLACEHOLDER DATA ---
// Update this array with your real officers' details later.
const officers = [
  {
    id: 1,
    name: "Justine Llyod Garma",
    role: "President",
    bio: "Leading the vision for JPCS with a passion for innovation and community building. Focused on creating impactful workshops this year.",
    image: "/officers/PRES.JPG", // Replace with: /images/officers/jane.jpg
    socials: { linkedin: "#", github: "#", email: "" }
  },
  {
    id: 2,
    name: "Ice Matthew Ramirez",
    role: "Vice President - Operations",
    bio: "Ensuring smooth operations within the organization and managing member engagement. A backend development enthusiast.",
    image: "/officers/VPO.JPG",
    socials: { linkedin: "#", github: "#" }
  },
  {
    id: 3,
    name: "Louievince Kyle Laguidao" ,
    role: "Vice President - External",
    bio: "Building bridges with other organizations and industry partners. Expert in networking and corporate relations.",
    image: "/officers/VPE.JPG",
    socials: { linkedin: "#", email: "mailto:maria@example.com" }
  },
  {
    id: 4,
    name: "Ma. Antonette Melon",
    role: "Vice President - Internal",
    bio: "Ensuring Internal Operations are fluid and are optimized for efficiency.",
    image: "/officers/VPI.JPG",
    socials: { linkedin: "#", github: "#" }
  },
  {
    id: 5,
    name: "Reynalyn Ruth Morbo",
    role: "Secretary",
    bio: "Keeping the organization organized and on track with meticulous record-keeping and scheduling.",
    image: "/officers/SEC.JPG",
    socials: { linkedin: "#", email: "mailto:sarah@example.com" }
  },
];

// --- 2. ANIMATION VARIANTS (Framer Motion) ---
// This defines how the cards appear on screen.
// --- 2. ANIMATION VARIANTS (Framer Motion) ---
const cardVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 100, 
    scale: 0.9 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring", 
      bounce: 0.3, 
      duration: 0.8 
    }
  }
};


export default function OfficersPage() {
  return (
    <section className="min-h-screen py-24 px-4 md:px-8 relative overflow-hidden">
      
      {/* Header Section */}
      <div className="max-w-4xl mx-auto text-center mb-24 relative z-20">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-bold text-white mb-6"
        >
          Meet the <span className="text-green-500">Leaders</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto"
        >
          The dedicated minds behind De La Salle Araneta JPCS, committed to fostering technological excellence and community.
        </motion.p>
      </div>

      {/* Officers List */}
      <div className="max-w-6xl mx-auto flex flex-col gap-24 relative z-20">
        {officers.map((officer, index) => {
          // Determine if this is an even or odd row for alternating layout
          const isEven = index % 2 === 0;

          return (
            <motion.div
              key={officer.id}
              // Connect to animation variants defined above
              variants={cardVariants}
              initial="hidden"
              // Trigger animation when 30% of the element is visible in viewport
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              // Dynamic class for alternating layout (row vs row-reverse)
              className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 md:gap-16`}
            >
              
              {/* --- IMAGE SECTION --- */}
              <div className="w-full md:w-1/2 flex justify-center">
                {/* Techy Card Container for Image */}
                <div className="relative group">
                  {/* Glowing border effect behind image */}
                  <div className="absolute inset-0 bg-green-500 blur-[20px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-xl"></div>
                  
                  {/* The Image itself styled as a tech card */}
                  <div className="relative h-[350px] w-[300px] md:h-[400px] md:w-[350px] rounded-xl overflow-hidden border-2 border-green-500/30 bg-zinc-900/80 z-10">
                    <Image
                      src={officer.image}
                      alt={officer.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Scanline overlay effect */}
                    <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none"></div>
                  </div>
                </div>
              </div>

              {/* --- TEXT/INFO SECTION --- */}
              <div className={`w-full md:w-1/2 flex flex-col ${isEven ? 'md:items-start text-left' : 'md:items-end text-right'}`}>
                {/* Role Badge */}
                <span className="inline-block py-1 px-3 rounded-full bg-green-500/10 text-green-400 text-sm font-mono mb-4 border border-green-500/30">
                  {officer.role}
                </span>
                
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  {officer.name}
                </h2>
                
                <p className="text-gray-300 text-lg leading-relaxed mb-8 max-w-xl">
                  {officer.bio}
                </p>

                {/* Social Links */}
                <div className="flex gap-4 text-2xl text-gray-400">
                  {officer.socials.linkedin && (
                    <a href={officer.socials.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors">
                      <FaLinkedin />
                    </a>
                  )}
                  {officer.socials.github && (
                    <a href={officer.socials.github} target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors">
                      <FaGithub />
                    </a>
                  )}
                  {officer.socials.email && (
                    <a href={officer.socials.email} className="hover:text-green-500 transition-colors">
                      <FaEnvelope />
                    </a>
                  )}
                </div>
              </div>

            </motion.div>
          );
        })}
      </div>

      {/* Optional: Subtle background element specifically for this page */}
      <div className="absolute top-[20%] right-0 w-1/3 h-1/3 bg-green-600/10 blur-[100px] rounded-full z-0 pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-0 w-1/3 h-1/3 bg-green-600/5 blur-[120px] rounded-full z-0 pointer-events-none"></div>
    </section>
  );
}