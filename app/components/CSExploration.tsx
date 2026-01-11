"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCode, FaBrain, FaShieldAlt, FaTerminal, FaChevronRight, FaGamepad, FaPaintBrush, FaDiceD20, FaLightbulb 
} from "react-icons/fa";

// --- DATA STRUCTURE: TRACKS & GENERATORS ---
const TRACKS = [
  {
    id: "web",
    icon: <FaCode />,
    label: "WEB DEV",
    title: "Full-Stack Architect",
    desc: "Generate modern web app ideas utilizing serverless tech, databases, and reactive UIs.",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-500/50",
    ideas: [
      { title: "Student Org SaaS", diff: "Intermediate", stack: ["Next.js", "Supabase", "Stripe"], task: "Build a platform for student orgs to manage memberships, collect dues, and generate QR tickets for events." },
      { title: "Real-time Code Collab", diff: "Advanced", stack: ["React", "Socket.io", "Redis"], task: "A browser-based IDE where multiple users can type code simultaneously with syntax highlighting." },
      { title: "Smart Campus Map", diff: "Beginner", stack: ["Leaflet.js", "Firebase", "React"], task: "An interactive map of your campus showing real-time facility opening hours and room availability." }
    ]
  },
  {
    id: "ai",
    icon: <FaBrain />,
    label: "AI / ML",
    title: "Machine Learning Engineer",
    desc: "Concepts involving Computer Vision, NLP, and predictive modeling for real-world scenarios.",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-500/10",
    border: "border-purple-500/50",
    ideas: [
      { title: "Sign Language Translator", diff: "Advanced", stack: ["Python", "OpenCV", "TensorFlow"], task: "Use a webcam to detect hand signs in real-time and translate them into text on screen." },
      { title: "Resume Parser Bot", diff: "Intermediate", stack: ["Python", "Spacy", "Streamlit"], task: "An app that scans PDF resumes, extracts skills/experience, and rates them against a job description." },
      { title: "Jeepney Route Optimizer", diff: "Hard", stack: ["Python", "Genetic Alg", "Google Maps API"], task: "An AI agent that simulates and finds the most efficient route for public transport based on traffic data." }
    ]
  },
  {
    id: "sec",
    icon: <FaShieldAlt />,
    label: "SECURITY",
    title: "Cybersec Analyst",
    desc: "Projects focused on network analysis, encryption tools, and vulnerability scanning.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-500/50",
    ideas: [
      { title: "Local Network Scanner", diff: "Intermediate", stack: ["Python", "Scapy", "Linux"], task: "A CLI tool that maps all devices connected to a local WiFi and checks for open ports." },
      { title: "Steganography Tool", diff: "Beginner", stack: ["Python", "Pillow", "Cryptography"], task: "Create an app that hides encrypted text messages inside PNG image files pixel data." },
      { title: "Phishing Sandbox", diff: "Expert", stack: ["VirtualBox", "Wireshark", "Docker"], task: "A safe, isolated environment to detonate and analyze suspicious email links without risking the host OS." }
    ]
  },
  {
    id: "game",
    icon: <FaGamepad />,
    label: "GAME DEV",
    title: "Game Designer",
    desc: "Mechanics and prototypes for 2D/3D experiences using engines and physics.",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    border: "border-orange-500/50",
    ideas: [
      { title: "2D Physics Puzzler", diff: "Beginner", stack: ["Unity", "C#"], task: "A game where players must draw lines that turn into physical objects to bridge gaps for a character." },
      { title: "Procedural Dungeon Gen", diff: "Advanced", stack: ["Godot", "GDScript"], task: "A roguelike where every level layout is mathematically generated so no two runs are the same." },
      { title: "VR Campus Tour", diff: "Intermediate", stack: ["Unreal Engine", "Blender"], task: "A virtual reality walkthrough of the university for incoming freshmen using 360-degree assets." }
    ]
  },
  {
    id: "ux",
    icon: <FaPaintBrush />,
    label: "UX DESIGN",
    title: "Product Designer",
    desc: "Design challenges focused on UI kits, accessibility, and user flows.",
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-500/10",
    border: "border-pink-500/50",
    ideas: [
      { title: "Accessible LMS Redesign", diff: "Intermediate", stack: ["Figma", "WCAG Guidelines"], task: "Redesign the university learning portal to be fully accessible for color-blind and screen-reader users." },
      { title: "Mobile Banking Kit", diff: "Beginner", stack: ["Figma", "Adobe XD"], task: "Create a comprehensive UI component library (Buttons, Inputs, Cards) for a fintech app." },
      { title: "AR Menu Concept", diff: "Advanced", stack: ["Adobe Aero", "Blender"], task: "Design an Augmented Reality interface where restaurant goers can see 3D models of food on their table." }
    ]
  }
];

export default function ProjectIdeaGenerator() {
  const [activeTrack, setActiveTrack] = useState(TRACKS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIdea, setCurrentIdea] = useState<typeof TRACKS[0]['ideas'][0] | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setCurrentIdea(null);
    
    // Simulate "thinking" time
    setTimeout(() => {
      const randomIdea = activeTrack.ideas[Math.floor(Math.random() * activeTrack.ideas.length)];
      setCurrentIdea(randomIdea);
      setIsGenerating(false);
    }, 800);
  };

  const handleTabClick = (track: typeof TRACKS[0]) => {
    setActiveTrack(track);
    setCurrentIdea(null);
    setIsGenerating(false);
  };

  return (
    <section className="py-24 relative z-10 overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4">
        
        {/* --- TITLE SECTION --- */}
        <div className="text-center mb-16 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 p-2 px-4 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-4 shadow-sm"
          >
            <FaLightbulb className="text-yellow-500" />
            <span>PROJECT_NEXUS_V1.0</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
            Stuck on what to <span className="text-blue-600 dark:text-blue-500">Build?</span>
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto text-lg">
            Don't build another To-Do list. Select a track below and generate a unique, portfolio-worthy project idea instantly.
          </p>
        </div>

        {/* --- INTERACTIVE INTERFACE --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT: CONTROLS (Track Selection) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {TRACKS.map((track) => (
              <button
                key={track.id}
                onClick={() => handleTabClick(track)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                  activeTrack.id === track.id 
                    ? `${track.bg} ${track.border} shadow-md dark:shadow-[0_0_20px_rgba(0,0,0,0.2)] translate-x-2` 
                    : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`text-xl ${activeTrack.id === track.id ? track.color : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white"}`}>
                      {track.icon}
                    </div>
                    <div>
                      <h3 className={`text-sm md:text-base font-bold uppercase tracking-wider ${activeTrack.id === track.id ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white"}`}>
                        {track.label}
                      </h3>
                    </div>
                  </div>
                  <FaChevronRight className={`text-xs transition-transform duration-300 ${activeTrack.id === track.id ? "text-zinc-900 dark:text-white opacity-100" : "text-zinc-400 opacity-0 group-hover:opacity-100"}`} />
                </div>
              </button>
            ))}
          </div>

          {/* RIGHT: GENERATOR WINDOW */}
          <div className="lg:col-span-8 relative h-[500px] w-full bg-zinc-900 dark:bg-black rounded-2xl border border-zinc-300 dark:border-zinc-800 overflow-hidden shadow-2xl flex flex-col">
            
            {/* Window Header (Toolbar) */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                  <FaTerminal />
                  <span>generator ~ {activeTrack.id}.sh</span>
                </div>
              </div>

              {/* ACTION BUTTON MOVED HERE */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold font-mono transition-all
                  ${isGenerating 
                    ? "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-wait" 
                    : "bg-black text-white dark:bg-white dark:text-black hover:opacity-80 active:scale-95"
                  }
                `}
              >
                 {isGenerating ? "PROCESSING..." : "GENERATE IDEA"} <FaDiceD20 />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 md:p-8 flex-1 relative flex flex-col bg-zinc-950 dark:bg-black">
              
              {/* Top: Description */}
              <div className="mb-6 shrink-0">
                <h3 className={`text-2xl font-bold mb-2 ${activeTrack.color}`}>
                  {activeTrack.title}
                </h3>
                <p className="text-zinc-400 text-sm">{activeTrack.desc}</p>
              </div>

              {/* Main Screen Area */}
              <div className="flex-1 bg-zinc-900/50 rounded-lg border border-zinc-800 p-6 relative overflow-hidden flex flex-col items-center justify-center text-center">
                
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-mono text-green-500 text-sm"
                    >
                      <span className="inline-block animate-pulse">Querying Database...</span>
                      <div className="mt-2 text-xs text-zinc-600">Analyzing complexity...</div>
                    </motion.div>
                  ) : currentIdea ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full text-left h-full overflow-y-auto custom-scrollbar pr-2"
                    >
                      <div className="flex justify-between items-start mb-4 border-b border-zinc-800 pb-4">
                         <div>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Project Title</span>
                            <h4 className="text-xl md:text-2xl font-bold text-white mt-1">{currentIdea.title}</h4>
                         </div>
                         <div className={`px-2 py-1 rounded text-[10px] font-mono border uppercase tracking-wide ${
                            currentIdea.diff === "Beginner" ? "border-green-500/30 text-green-400 bg-green-500/10" :
                            currentIdea.diff === "Intermediate" ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" :
                            "border-red-500/30 text-red-400 bg-red-500/10"
                         }`}>
                           {currentIdea.diff}
                         </div>
                      </div>

                      <div className="mb-6">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">The Brief</span>
                        <p className="text-zinc-300 text-sm mt-2 leading-relaxed">
                          {currentIdea.task}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Recommended Stack</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {currentIdea.stack.map((tech) => (
                            <span key={tech} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300 border border-zinc-700">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-zinc-600 flex flex-col items-center"
                    >
                      <FaDiceD20 className="text-4xl mb-3 opacity-20" />
                      <p className="text-sm font-mono">System Ready.</p>
                      <p className="text-xs mt-1">Click GENERATE in the toolbar.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Decorative Scanlines */}
              <div className="hidden dark:block absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[5] bg-[length:100%_2px,3px_100%] opacity-20" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}