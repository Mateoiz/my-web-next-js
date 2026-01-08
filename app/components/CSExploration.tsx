"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCode, FaBrain, FaShieldAlt, FaTerminal, FaChevronRight, FaGamepad, FaPaintBrush, FaPlay, FaTools 
} from "react-icons/fa";
import { SiReact, SiPython, SiTensorflow, SiUnity, SiFigma, SiKalilinux, SiUnrealengine, SiTypescript } from "react-icons/si";

// --- EXPANDED PATHS DATA (THEME AWARE COLORS) ---
const PATHS = [
  {
    id: "build",
    icon: <FaCode />,
    label: "BUILD",
    title: "Software Engineering",
    desc: "Architect the apps that billions use. From mobile screens to cloud servers, you build the digital world.",
    code: `const App = () => {
  const [future, setFuture] = useState("Bright");
  return <World status={future} />;
}`,
    output: "> App compiled successfully.\n> Deploying to global_network...\n> Status: LIVE 🟢",
    // Light Mode: Darker Text / Lighter Bg || Dark Mode: Lighter Text / Darker Bg
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-500/50",
    tools: [<SiReact key="1"/>, <SiTypescript key="2"/>]
  },
  {
    id: "predict",
    icon: <FaBrain />,
    label: "PREDICT",
    title: "Artificial Intelligence",
    desc: "Teach machines to learn. Create brains that drive cars, diagnose diseases, and generate art.",
    code: `model = NeuralNet()
model.train(dataset)
prediction = model.think(new_data)
print(f"Confidence: {prediction}%")`,
    output: "> Training Epoch 1... [=====>] 20%\n> Training Epoch 50... [==========] 100%\n> Prediction: 99.8% Accuracy 🧠",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-500/10",
    border: "border-purple-500/50",
    tools: [<SiPython key="1"/>, <SiTensorflow key="2"/>]
  },
  {
    id: "protect",
    icon: <FaShieldAlt />,
    label: "PROTECT",
    title: "Cybersecurity",
    desc: "The digital guardian. You stand between order and chaos, defending systems from malicious attacks.",
    code: `while (system.isUnderAttack()) {
  firewall.strengthen();
  trace_ip(intruder);
  encrypt(payload);
}`,
    output: "> ALERT: Intrusion Detected.\n> Rerouting traffic...\n> Threat Neutralized. System Secure. 🛡️",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-500/50",
    tools: [<SiKalilinux key="1"/>, <FaTerminal key="2"/>]
  },
  {
    id: "simulate",
    icon: <FaGamepad />,
    label: "SIMULATE",
    title: "Game Development",
    desc: "Construct physics, lighting, and logic to build immersive virtual worlds where players get lost.",
    code: `void Update() {
  if (Input.GetButton("Jump")) {
    player.velocity = new Vector3(0, 10, 0);
    sound.Play("Jump_SFX");
  }
}`,
    output: "> Engine Initialized.\n> Physics: ON\n> Rendering 60 FPS... Ready Player One. 🎮",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    border: "border-orange-500/50",
    tools: [<SiUnity key="1"/>, <SiUnrealengine key="2"/>]
  },
  {
    id: "design",
    icon: <FaPaintBrush />,
    label: "DESIGN",
    title: "Creative Technology",
    desc: "Where code meets art. Design beautiful interfaces and interactive experiences that delight users.",
    code: `.hero-section {
  backdrop-filter: blur(20px);
  animation: float 3s infinite ease-in-out;
  box-shadow: 0 0 50px rgba(0,255,0,0.2);
}`,
    output: "> Styles Applied.\n> Animation: Smooth\n> UX Score: 100/100 ✨",
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-500/10",
    border: "border-pink-500/50",
    tools: [<SiFigma key="1"/>, <FaPaintBrush key="2"/>]
  }
];

export default function CSExploration() {
  const [activePath, setActivePath] = useState(PATHS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    setShowOutput(false);
    setTimeout(() => {
      setIsRunning(false);
      setShowOutput(true);
    }, 1500); // 1.5s simulated loading time
  };

  const handleTabClick = (path: typeof PATHS[0]) => {
    setActivePath(path);
    setShowOutput(false);
    setIsRunning(false);
  };

  return (
    // Light: White BG, Dark: Zinc-950 BG
    <section className="py-24 relative z-10 overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* Background Grid - Adaptive Opacity */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4">
        
        {/* --- TITLE SECTION --- */}
        <div className="text-center mb-16 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block p-2 px-4 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-4 shadow-sm"
          >
            INITIALIZE_SEQUENCE: CHOOSE_YOUR_PATH
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4"
          >
            What will you <span className="text-green-600 dark:text-green-500">Create?</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto text-lg"
          >
            Computer Science is the closest thing to magic we have. 
            Select a specialized path below to initialize your journey.
          </motion.p>
        </div>

        {/* --- INTERACTIVE INTERFACE --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT: CONTROLS (List of Paths) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {PATHS.map((path) => (
              <button
                key={path.id}
                onClick={() => handleTabClick(path)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                  activePath.id === path.id 
                    ? `${path.bg} ${path.border} shadow-md dark:shadow-[0_0_20px_rgba(0,0,0,0.2)] translate-x-2` 
                    : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`text-xl ${activePath.id === path.id ? path.color : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white"}`}>
                      {path.icon}
                    </div>
                    <div>
                      <h3 className={`text-sm md:text-base font-bold uppercase tracking-wider ${activePath.id === path.id ? "text-zinc-900 dark:text-white" : "text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white"}`}>
                        {path.label}
                      </h3>
                    </div>
                  </div>
                  <FaChevronRight className={`text-xs transition-transform duration-300 ${activePath.id === path.id ? "text-zinc-900 dark:text-white opacity-100" : "text-zinc-400 opacity-0 group-hover:opacity-100"}`} />
                </div>
              </button>
            ))}
          </div>

          {/* RIGHT: VISUALIZATION WINDOW */}
          <div className="lg:col-span-8 relative h-[500px] w-full bg-zinc-900 dark:bg-black rounded-2xl border border-zinc-300 dark:border-zinc-800 overflow-hidden shadow-2xl flex flex-col">
            
            {/* Window Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0 transition-colors duration-300">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                  <FaTerminal />
                  <span>jpcs_terminal ~ {activePath.id}.exe</span>
                </div>
              </div>
              
              {/* RUN BUTTON */}
              <button 
                onClick={handleRun}
                disabled={isRunning}
                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold font-mono transition-all
                  ${isRunning ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 cursor-wait" : "bg-green-600 hover:bg-green-500 text-white dark:text-black"}
                `}
              >
                <FaPlay size={10} /> {isRunning ? "COMPILING..." : "RUN CODE"}
              </button>
            </div>

            {/* Content Area - Always Dark for Terminal Feel, but adaptable */}
            <div className="p-6 md:p-8 flex-1 relative overflow-y-auto custom-scrollbar flex flex-col bg-zinc-950 dark:bg-black transition-colors duration-300">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePath.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full"
                >
                  {/* Title & Tech Stack */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className={`text-3xl font-bold mb-2 ${activePath.color}`}>
                        {activePath.title}
                        </h3>
                        <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-lg">
                        {activePath.desc}
                        </p>
                    </div>
                    {/* Tech Icons */}
                    <div className="hidden md:flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase"><FaTools className="inline"/> TOOLS</span>
                        <div className="flex gap-3 text-2xl text-zinc-300">
                            {activePath.tools}
                        </div>
                    </div>
                  </div>

                  {/* Code Mockup (Always Dark BG for Code) */}
                  <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 font-mono text-xs md:text-sm overflow-hidden relative group shadow-inner">
                    <pre className="text-zinc-300 relative z-10">
                      <code>
                        {activePath.code.split('\n').map((line, i) => (
                          <div key={i} className="flex">
                            <span className="text-zinc-700 w-8 select-none text-right pr-3">{i + 1}</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </code>
                    </pre>
                  </div>

                  {/* OUTPUT CONSOLE */}
                  <div className="mt-4 flex-1">
                    <div className="text-[10px] font-mono text-zinc-500 mb-1 uppercase tracking-widest">Console Output</div>
                    <div className="h-24 bg-black border border-zinc-800 rounded p-3 font-mono text-xs md:text-sm text-green-400 shadow-inner">
                        {isRunning ? (
                            <span className="animate-pulse">_ Processing request...</span>
                        ) : showOutput ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="whitespace-pre-wrap"
                            >
                                {activePath.output}
                            </motion.div>
                        ) : (
                            <span className="text-zinc-600">Waiting for execution... (Click RUN CODE)</span>
                        )}
                    </div>
                  </div>

                </motion.div>
              </AnimatePresence>

              {/* Scanlines Overlay - Only visible in Dark Mode for aesthetic */}
              <div className="hidden dark:block absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[5] bg-[length:100%_2px,3px_100%] opacity-20" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}