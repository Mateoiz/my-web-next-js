"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  FaArrowRight, FaTerminal, FaCalendarAlt, FaNewspaper,
  FaMicrochip, FaUserGraduate, FaQuoteLeft,
  FaGraduationCap, FaFacebook, FaEnvelope, FaIdBadge,
  FaCode, FaLaptopCode, FaNetworkWired, FaChevronDown
} from "react-icons/fa";

import SecretGame from "./components/SecretGame";
import FloatingCubes from "./components/FloatingCubes";
import CircuitCursor from "./components/CircuitCursor";
import DailyDecrypt from "./components/DailyDecrypt";
import CSExploration from "./components/CSExploration";
import { EVENTS } from "./constants/events";
import { OFFICERS } from "./constants/officers";
import type { BlogPost } from "@/lib/server-db";

// ─── Terminal boot screen ─────────────────────────────────────────────────

const BOOT_LINES = [
  { text: "JPCS DLSAU — System", delay: 0 },
  { text: "Loading kernel modules...", delay: 120 },
  { text: "Initializing circuit traces.......... OK", delay: 280 },
  { text: "Mounting filesystem..................... OK", delay: 460 },
  { text: "Starting network services.............. OK", delay: 640 },
  { text: "Verifying student credentials........... OK", delay: 820 },
  { text: "All systems nominal.", delay: 980 },
  { text: "// Welcome, Lasallian.", delay: 1120 },
];

function BootScreen({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    BOOT_LINES.forEach(({ text, delay }) => {
      setTimeout(() => setLines(prev => [...prev, text]), delay);
    });
    const exitTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDone, 500);
    }, 1600);
    return () => clearTimeout(exitTimer);
  }, [onDone]);

  return (
    <motion.div
      className={`fixed inset-0 z-[999] bg-black flex flex-col justify-center px-8 md:px-16 scanlines ${exiting ? "boot-exit" : ""}`}
      style={{ fontFamily: "monospace" }}
    >
      {/* Green CRT glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(34,197,94,0.06) 0%, transparent 70%)" }} />

      <div className="max-w-xl w-full crt-flicker">
        <p className="text-green-500 text-xs font-bold mb-6 tracking-widest uppercase opacity-60">
          JPCS-OS · Build 2025
        </p>
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className={`font-mono text-sm md:text-base mb-1 ${
              line.startsWith("//") ? "text-green-400 font-bold" :
              line.includes("OK") ? "text-green-500" :
              line.includes("nominal") ? "text-green-400 font-bold" :
              "text-green-700"
            }`}
          >
            {line.includes("OK") ? (
              <>
                <span className="text-zinc-600">{line.replace(" OK", "")}</span>
                <span className="text-green-400 font-bold"> OK</span>
              </>
            ) : line.startsWith("JPCS") ? (
              <span className="text-green-300 font-black text-base md:text-lg">{line}</span>
            ) : line.startsWith("//") ? (
              <span className="text-green-400">{line}</span>
            ) : (
              <span className="text-green-700">{line}</span>
            )}
          </motion.div>
        ))}
        {/* Blinking cursor */}
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="inline-block w-2.5 h-4 bg-green-500 mt-2 ml-0.5 align-middle"
        />
      </div>
    </motion.div>
  );
}

// ─── Animated counter ──────────────────────────────────────────────────────

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(start);
        }, 16);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

function Marquee({ items }: { items: string[] }) {
  return (
    <div className="overflow-hidden border-y border-green-500/20 dark:border-green-500/10 py-3 bg-white/50 dark:bg-black/50 backdrop-blur-sm relative">
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none" style={{ background: "linear-gradient(to right, white, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none dark:hidden" style={{ background: "linear-gradient(to left, white, transparent)" }} />
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none hidden dark:block" style={{ background: "linear-gradient(to right, black, transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none hidden dark:block" style={{ background: "linear-gradient(to left, black, transparent)" }} />

      <div className="marquee-track flex gap-12 whitespace-nowrap w-max">
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-4 text-[11px] font-mono font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            <span className="text-green-500 text-[8px]">◆</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/40 bg-green-500/8 text-[10px] font-mono font-bold text-green-600 dark:text-green-400 tracking-widest uppercase mb-4 neon-pulse"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      {children}
    </motion.div>
  );
}

// ─── Embedded CircuitHero Components ──────────────────────────────────────────

interface Trace {
  id: string;
  d: string;
  viaX: number;
  viaY: number;
  color: "primary" | "accent" | "dim";
  length: number;
  delay: number;
}

const TRACES: Trace[] = [
  { id: "j1", d: "M 70 60 H 20 V 160 H -80 V 120 H -140",    viaX: -140, viaY: 120, color: "primary", length: 340, delay: 0.0 },
  { id: "j2", d: "M 85 170 V 240 H -30 V 280 H -100",        viaX: -100, viaY: 280, color: "dim",     length: 310, delay: 0.1 },
  { id: "j3", d: "M 60 40 V -30 H -60 V -80 H -120",         viaX: -120, viaY: -80, color: "accent",  length: 280, delay: 0.05 },
  { id: "j4", d: "M 50 100 H -40 V 60 H -120 V 30",          viaX: -120, viaY: 30,  color: "dim",     length: 270, delay: 0.17 },
  { id: "p1", d: "M 235 50 H 280 V -20 H 180 V -70 H 80",    viaX: 80,  viaY: -70, color: "primary", length: 350, delay: 0.08 },
  { id: "p2", d: "M 220 160 H 140 V 240 H 60 V 300",         viaX: 60,  viaY: 300, color: "dim",     length: 290, delay: 0.15 },
  { id: "p3", d: "M 255 100 H 340 V 40 H 420 V -10 H 500",   viaX: 500, viaY: -10, color: "accent",  length: 370, delay: 0.12 },
  { id: "c1", d: "M 420 50 H 480 V -30 H 580 V -90",         viaX: 580, viaY: -90, color: "primary", length: 320, delay: 0.04 },
  { id: "c2", d: "M 400 110 H 320 V 200 H 220 V 270 H 140",  viaX: 140, viaY: 270, color: "dim",     length: 390, delay: 0.18 },
  { id: "c3", d: "M 445 170 H 520 V 250 H 640 V 300",        viaX: 640, viaY: 300, color: "accent",  length: 330, delay: 0.09 },
  { id: "c4", d: "M 430 80 H 360 V 30 H 280 V -20",          viaX: 280, viaY: -20, color: "dim",     length: 270, delay: 0.21 },
  { id: "s1", d: "M 650 45 H 720 V -20 H 820 V -70 H 950",   viaX: 950, viaY: -70, color: "primary", length: 400, delay: 0.06 },
  { id: "s2", d: "M 610 110 H 700 V 180 H 800 V 240 H 950",  viaX: 950, viaY: 240, color: "dim",     length: 390, delay: 0.20 },
  { id: "s3", d: "M 660 175 H 740 V 260 H 860 V 310 H 970",  viaX: 970, viaY: 310, color: "accent",  length: 420, delay: 0.14 },
  { id: "s4", d: "M 640 50 H 720 V -10 H 850 V 40 H 960",    viaX: 960, viaY: 40,  color: "primary", length: 390, delay: 0.03 },
  { id: "s5", d: "M 680 140 H 760 V 80 H 860 V 130 H 980",   viaX: 980, viaY: 130, color: "dim",     length: 360, delay: 0.11 },
  { id: "bus1", d: "M -100 210 H 200 V 260 H 500 V 310 H 980", viaX: 980, viaY: 310, color: "dim", length: 1080, delay: 0.24 },
  { id: "bus2", d: "M 1000 -40 H 600 V -80 H 200 V -50 H -80", viaX: -80, viaY: -50, color: "dim", length: 1080, delay: 0.27 },
  { id: "bus3", d: "M -120 80 H 100 V 40 H 300",               viaX: 300, viaY: 40,  color: "accent", length: 480, delay: 0.16 },
  { id: "bus4", d: "M 980 160 H 780 V 200 H 600",              viaX: 600, viaY: 200, color: "accent", length: 440, delay: 0.19 },
];

const COLOR_MAP = {
  primary: { stroke: "#15803d", glow: "rgba(34,197,94,0.8)" },
  accent:  { stroke: "#047857", glow: "rgba(74,222,128,0.7)" },
  dim:     { stroke: "#166534", glow: "rgba(22,101,52,0.6)" },
};

function TracePath({ trace, active }: { trace: Trace; active: boolean }) {
  const { stroke, glow } = COLOR_MAP[trace.color];
  const dashLen = trace.length + 10;

  return (
    <g>
      <path
        d={trace.d}
        fill="none"
        stroke={glow}
        strokeWidth={active ? 10 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${dashLen} ${dashLen}`}
        strokeDashoffset={active ? 0 : dashLen}
        style={{
          transition: active
            ? `stroke-dashoffset ${0.6 + trace.delay}s cubic-bezier(0.4,0,0.2,1) ${trace.delay * 0.4}s, stroke-width 0.3s ease`
            : `stroke-dashoffset 0.3s ease ${(0.15 - trace.delay * 0.1)}s, stroke-width 0.2s ease`,
          filter: "blur(4px)",
        }}
      />
      <path
        d={trace.d}
        fill="none"
        stroke={stroke}
        strokeWidth={active ? 2.5 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${dashLen} ${dashLen}`}
        strokeDashoffset={active ? 0 : dashLen}
        style={{
          transition: active
            ? `stroke-dashoffset ${0.55 + trace.delay}s cubic-bezier(0.4,0,0.2,1) ${trace.delay * 0.4}s, stroke-width 0.3s ease`
            : `stroke-dashoffset 0.25s ease ${(0.12 - trace.delay * 0.08)}s, stroke-width 0.2s ease`,
        }}
      />
      <circle
        cx={trace.viaX}
        cy={trace.viaY}
        r={active ? 5 : 0}
        fill={stroke}
        style={{
          transition: active
            ? `r 0.2s ease ${trace.delay * 0.4 + 0.5}s, opacity 0.2s ease`
            : `r 0.15s ease, opacity 0.2s ease`,
          opacity: active ? 1 : 0,
          filter: `drop-shadow(0 0 6px ${glow})`,
        }}
      />
    </g>
  );
}

const GLITCH_CHARS = ["!", "<", ">", "_", "\\", "/", "[", "]", "{", "}", "—", "=", "+", "*", "?", "#", "0", "1"];

function AnimatedLetter({ letter, index, hovered }: { letter: string; index: number; hovered: boolean; }) {
  const [display, setDisplay] = useState(letter);
  const [charged, setCharged] = useState(false);
  const [flickering, setFlickering] = useState(false);

  useEffect(() => {
    setFlickering(true);
    let ticks = 0;
    const maxTicks = 10 + index * 5;
    const interval = setInterval(() => {
      ticks++;
      if (ticks < maxTicks) {
        setDisplay(GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]);
      } else {
        setDisplay(letter);
        setFlickering(false);
        clearInterval(interval);
      }
    }, 60);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hovered) {
      const timeout = setTimeout(() => {
        setFlickering(true);
        let ticks = 0;
        const int = setInterval(() => {
          ticks++;
          if (ticks < 4) setDisplay(GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]);
          else {
            setDisplay(letter);
            setFlickering(false);
            setCharged(true);
            clearInterval(int);
          }
        }, 30);
        return () => clearInterval(int);
      }, index * 80);
      return () => clearTimeout(timeout);
    } else {
      setCharged(false);
      setDisplay(letter);
      setFlickering(false);
    }
  }, [hovered, index, letter]);

  useEffect(() => {
    if (hovered) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.85 && !flickering) {
        setFlickering(true);
        let ticks = 0;
        const int = setInterval(() => {
          ticks++;
          if (ticks < 5) setDisplay(GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]);
          else {
            setDisplay(letter);
            setFlickering(false);
            clearInterval(int);
          }
        }, 40);
      }
    }, 2000 + index * 1000);
    return () => clearInterval(interval);
  }, [hovered, flickering, index, letter]);

  const floatPhase = index * 0.7;
  return (
    <span
      style={{
        display: "inline-block",
        animation: `letterFloat 3s ease-in-out ${floatPhase}s infinite alternate`,
        color: flickering ? "#86efac" : charged ? "#16a34a" : undefined,
        textShadow: flickering
          ? "0 0 15px rgba(134,239,172,0.8)"
          : charged
          ? "0 0 20px rgba(22,163,74,0.8), 0 0 40px rgba(22,163,74,0.4)"
          : "none",
        transition: "color 0.1s ease, text-shadow 0.1s ease",
        transform: charged && !flickering ? "scaleY(1.04)" : "scaleY(1)",
      }}
      aria-hidden
    >
      {display}
    </span>
  );
}

function CircuitHero() {
  const [hovered, setHovered] = useState(false);
  const [scanLine, setScanLine] = useState(-1); 
  const scanRef = useRef<any>(null);

  const startScan = useCallback(() => {
    setScanLine(0);
    let pos = 0;
    const total = 900;
    const duration = 400; 
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      pos = Math.min((elapsed / duration) * total, total);
      setScanLine(pos);
      if (pos < total) scanRef.current = requestAnimationFrame(tick);
      else setScanLine(-1);
    };
    scanRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => { if (scanRef.current) cancelAnimationFrame(scanRef.current); }, []);

  const handleEnter = useCallback(() => {
    setHovered(true);
    startScan();
  }, [startScan]);

  const handleLeave = useCallback(() => {
    setHovered(false);
    setScanLine(-1);
    if (scanRef.current) cancelAnimationFrame(scanRef.current);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full flex justify-center select-none overflow-visible group cursor-crosshair"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <svg
        viewBox="-160 -110 1280 440"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full pointer-events-none"
        style={{ height: "100%", overflow: "visible", zIndex: 0 }}
        aria-hidden
      >
        {scanLine >= 0 && (
          <line
            x1={scanLine - 160} y1={-110}
            x2={scanLine - 160} y2={330}
            stroke="rgba(22,163,74,0.6)"
            strokeWidth={3}
            style={{ filter: "blur(2px)" }}
          />
        )}
        {hovered && Array.from({ length: 18 }, (_, row) =>
          Array.from({ length: 26 }, (_, col) => (
            <circle
              key={`dot-${row}-${col}`}
              cx={col * 50 - 130}
              cy={row * 25 - 90}
              r={1.5}
              fill="#166534"
              opacity={0.4}
              style={{ transition: "opacity 0.5s ease" }}
            />
          ))
        )}
        {TRACES.map(trace => (
          <TracePath key={trace.id} trace={trace} active={hovered} />
        ))}
      </svg>
      
      <div className="flex items-center justify-center relative z-10">
        <motion.span 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 150 }}
          className="text-[18vw] md:text-[8rem] lg:text-[10rem] font-light text-zinc-300 dark:text-zinc-700 font-mono tracking-tighter"
        >
          &lt;
        </motion.span>
        
        <h1 
          className="cyber-glitch text-[20vw] md:text-[9rem] lg:text-[11rem] font-extrabold tracking-tighter leading-none mx-2 md:mx-4 transition-transform duration-300 group-hover:scale-105 flex" 
          data-text="JPCS"
        >
          {["J","P","C","S"].map((letter, i) => (
            <AnimatedLetter key={letter} letter={letter} index={i} hovered={hovered} />
          ))}
        </h1>

        <motion.span 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 150 }}
          className="text-[18vw] md:text-[8rem] lg:text-[10rem] font-light text-zinc-300 dark:text-zinc-700 font-mono tracking-tighter flex items-center"
        >
          /&gt;
        </motion.span>

        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="ml-2 w-3 md:w-6 h-[10vw] md:h-[6rem] bg-green-500 dark:bg-green-400 inline-block mb-[2vw] md:mb-[1rem]"
        />
      </div>

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 0 : 0.6 }}
        transition={{ delay: hovered ? 0 : 2, duration: 0.5 }}
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.4em] text-green-700 dark:text-green-500 whitespace-nowrap pointer-events-none drop-shadow-sm"
        style={{ zIndex: 2 }}
      >
        hover to trace
      </motion.span>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HomeClient({ latestNews }: { latestNews: BlogPost[] }) {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("jpcs_booted") === "1") {
      setBooted(true);
    }
  }, []);

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const executiveOfficers = OFFICERS.filter(officer =>
    ['President', 'Vice President', 'Secretary', 'Treasurer', 'Auditor'].some(role => officer.role.includes(role))
  );

  const marqueeItems = [
    "Web Development", "Cybersecurity", "AI & Machine Learning",
    "Data Science", "Mobile Dev", "Cloud Computing",
    "Open Source", "Innovation", "DLSAU · JPCS",
  ];

  return (
    <main className="min-h-screen relative selection:bg-green-500/30 bg-white dark:bg-black overflow-hidden font-sans">
      
      {/* UPDATED BOOT LOGIC */}
      {!booted && (
        <BootScreen 
          onDone={() => { 
            sessionStorage.setItem("jpcs_booted", "1"); 
            setBooted(true); 
          }} 
        />
      )}
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl opacity-40" />
        <div className="absolute inset-0 opacity-40 sm:opacity-60">
          <FloatingCubes />
        </div>
      </div>

      <div className="hidden md:block"><CircuitCursor /></div>
      <SecretGame />
      <DailyDecrypt />
      
      <section
        ref={heroRef}
        className="min-h-screen flex flex-col justify-center items-center text-center px-4 relative z-10 py-24 md:py-0 overflow-hidden scanlines"
      >
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="w-full flex flex-col items-center">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8 flex flex-col items-center gap-2">
            <span className="font-mono text-zinc-400 dark:text-zinc-500 text-xs md:text-sm">
              // Import the future
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/5 text-[11px] font-mono text-green-700 dark:text-green-400 tracking-widest shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              System Online · DLSAU Chapter
            </span>
          </motion.div>

          <CircuitHero />

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="mt-8 space-y-2">
            <p className="text-xs sm:text-sm font-mono font-bold uppercase tracking-[0.4em] text-zinc-500 dark:text-zinc-400 drop-shadow-sm">
              Junior Philippine Computer Society
            </p>
            <p className="text-base sm:text-lg md:text-xl font-black text-green-700 dark:text-green-500 tracking-widest uppercase">
              De La Salle Araneta University
            </p>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className="mt-4 text-zinc-600 dark:text-zinc-400 text-sm md:text-base max-w-md mx-auto font-medium">
            Empowering the next generation of tech innovators.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.5 }} className="mt-10 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none justify-center">
            <Link href="/Events" className="group relative px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-full overflow-hidden active:scale-95 flex justify-center items-center gap-2 shadow-[0_0_0_1px_rgba(34,197,94,0)] hover:shadow-[0_0_24px_rgba(34,197,94,0.4)] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2 group-hover:text-white transition-colors">
                Explore Events <FaArrowRight className="group-hover:translate-x-1.5 transition-transform duration-200" />
              </span>
            </Link>
            <Link href="/About" className="group px-8 py-4 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-full hover:border-green-500/60 dark:hover:border-green-500/60 hover:text-green-700 dark:hover:text-green-400 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 bg-white/50 dark:bg-black/50 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]">
              <FaTerminal className="text-xs opacity-70 group-hover:text-green-500 transition-colors" /> About JPCS
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-16 flex flex-col items-center gap-2 text-zinc-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Scroll to explore</span>
            <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
              <FaChevronDown size={14} />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      <div className="relative z-10"><Marquee items={marqueeItems} /></div>

      <section className="relative z-10 py-16 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
            {[
              { value: 80, suffix: "+", label: "Active Members" },
              { value: 10, suffix: "+", label: "Years Running" },
              { value: 30, suffix: "+", label: "Events Held" },
              { value: 10, suffix: "+", label: "Partner Orgs" },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, type: "spring", stiffness: 100 }} className="text-center px-6 group">
                <div className="text-4xl md:text-5xl font-black text-zinc-900 dark:text-white mb-2 tabular-nums relative inline-block">
                  <Counter target={stat.value} suffix={stat.suffix} />
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-green-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </div>
                <p className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CSExploration />

      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="py-24 relative z-10 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <SectionLabel>Who We Are</SectionLabel>
            <h2 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white leading-[1.05] tracking-tight">
              Innovating<br /><span className="text-green-600 dark:text-green-500">the future,</span><br />one line<br />at a time.
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg font-medium leading-relaxed max-w-md">
              More than a student org — we're a community of developers, designers, and visionaries bridging academic theory with industry reality.
            </p>
            <Link href="/About" className="inline-flex items-center gap-2 text-sm font-bold text-green-600 dark:text-green-500 hover:text-green-700 hover:underline underline-offset-4 transition-colors">
              Read our full mission <FaArrowRight className="text-xs" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: FaCode, label: "Development", desc: "Hands-on coding workshops and hackathons" },
              { icon: FaNetworkWired, label: "Networking", desc: "Connect with industry professionals" },
              { icon: FaLaptopCode, label: "Projects", desc: "Real-world software development experience" },
              { icon: FaGraduationCap, label: "Growth", desc: "Scholarships, mentorship and leadership" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, type: "spring", stiffness: 120 }} className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 hover:border-green-500/60 hover:shadow-[0_8px_32px_rgba(34,197,94,0.1)] transition-all group tilt-card cursor-default">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 flex items-center justify-center mb-3 group-hover:bg-green-600 group-hover:text-white group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <item.icon size={16} />
                </div>
                <p className="text-sm font-black text-zinc-900 dark:text-white mb-1 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">{item.label}</p>
                <p className="text-xs font-medium text-zinc-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="py-24 relative z-10 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <SectionLabel>Latest News</SectionLabel>
              <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">What's happening</h2>
            </div>
            <Link href="/Blogs" className="hidden sm:flex items-center gap-2 text-xs font-bold font-mono border-2 border-zinc-300 dark:border-zinc-700 px-5 py-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-400 transition-all shrink-0">
              ALL POSTS <FaArrowRight />
            </Link>
          </div>
          {latestNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestNews.map((blog, i) => (
                <motion.div key={blog.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Link href={`/Blogs/${blog.slug}`} className="group block h-full">
                    <div className={`h-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden hover:border-green-500/60 hover:shadow-lg transition-all duration-300 flex flex-col ${i === 0 ? "md:col-span-2" : ""}`}>
                      <div className="aspect-video w-full bg-zinc-200 dark:bg-zinc-900 overflow-hidden relative">
                        {blog.coverImage ? (
                          <Image src={blog.coverImage} alt={blog.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600 font-mono text-xs font-bold uppercase">No Image</div>
                        )}
                      </div>
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="text-lg font-black text-zinc-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors line-clamp-2 flex-1">
                          {blog.title}
                        </h3>
                        <p className="text-sm font-medium text-zinc-500 line-clamp-2 mb-5">{blog.excerpt}</p>
                        <span className="text-xs font-bold uppercase tracking-widest text-green-600 dark:text-green-500 flex items-center gap-2 group-hover:gap-3 transition-all">
                          Read more <FaArrowRight size={10} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-16 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl text-center bg-white/50 dark:bg-zinc-900/50">
              <p className="text-zinc-500 font-mono font-bold text-sm">No news updates available at the moment.</p>
            </div>
          )}
          <div className="mt-8 text-center sm:hidden">
            <Link href="/Blogs" className="text-sm font-black uppercase tracking-widest text-green-600 dark:text-green-500 hover:underline">View All Posts →</Link>
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="py-24 relative z-10 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <SectionLabel>System Logs</SectionLabel>
              <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">Upcoming Events</h2>
            </div>
            <Link href="/Events" className="hidden sm:flex items-center gap-2 text-xs font-bold font-mono border-2 border-zinc-300 dark:border-zinc-700 px-5 py-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-400 transition-all shrink-0">
              VIEW CALENDAR <FaArrowRight />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {EVENTS.slice(0, 3).map((event, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, type: "spring", stiffness: 100 }} className="group relative rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/50 hover:border-green-500/60 hover:shadow-[0_12px_48px_rgba(34,197,94,0.12)] transition-all duration-300 overflow-hidden flex flex-col">
                <div className="h-0.5 bg-zinc-200 dark:bg-zinc-800 w-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-400 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="relative z-10 p-8 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-6">
                    <span className="px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-lg text-xs font-black text-zinc-600 dark:text-zinc-300 font-mono shadow-sm group-hover:bg-green-500 group-hover:text-white transition-all duration-200 border border-zinc-100 dark:border-zinc-700">
                      {event.date}
                    </span>
                    <motion.div whileHover={{ rotate: 15 }} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-zinc-400 group-hover:bg-green-600 group-hover:text-white transition-all duration-200 border border-zinc-100 dark:border-zinc-700">
                      <FaCalendarAlt size={14} />
                    </motion.div>
                  </div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-3 leading-tight group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">{event.title}</h3>
                  <p className="text-sm font-medium text-zinc-500 flex items-center gap-2 mt-auto">
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse shrink-0" />
                    {event.location}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link href="/Events" className="text-sm font-black uppercase tracking-widest text-green-600 dark:text-green-500 hover:underline">View All Events →</Link>
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="py-24 relative z-10 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-16">
            <div>
              <SectionLabel>The Team</SectionLabel>
              <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white tracking-tight">Executive Officers</h2>
              <p className="text-zinc-500 font-medium text-base mt-3 max-w-md">The student leaders executing the vision.</p>
            </div>
            <Link href="/Officers" className="hidden sm:flex items-center gap-2 text-xs font-bold font-mono border-2 border-zinc-300 dark:border-zinc-700 px-5 py-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-400 transition-all shrink-0">
              FULL ROSTER <FaArrowRight />
            </Link>
          </div>
          <div className="w-full overflow-x-auto pb-8 custom-scrollbar">
            <div className="flex gap-6 w-max px-2">
              {executiveOfficers.map((officer, i) => (
                <motion.div key={officer.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="w-[320px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-7 relative overflow-hidden group hover:border-green-500/60 hover:shadow-xl transition-all duration-300 flex flex-col">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
                  <div className="flex items-center gap-5 mb-6 relative z-10">
                    <div className="relative w-16 h-16 shrink-0">
                      <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-green-500/20 group-hover:border-green-500/60 transition-colors shadow-sm">
                        <Image src={officer.image} alt={officer.name} fill className="object-cover" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-base text-zinc-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">{officer.name}</h3>
                      <span className="inline-block px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/40 text-[9px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest mt-1.5">{officer.role}</span>
                    </div>
                  </div>
                  <div className="relative pl-4 border-l-2 border-green-500/40 flex-1 mb-6 relative z-10">
                    <p className="text-sm font-medium italic text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-4">"{officer.bio}"</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-5 relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5"><FaIdBadge size={11} /> Connect</span>
                    <div className="flex gap-2">
                      {officer.socials.facebook && (
                        <a href={officer.socials.facebook} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-white hover:bg-blue-600 transition-all flex items-center justify-center shadow-sm">
                          <FaFacebook size={13} />
                        </a>
                      )}
                      {officer.socials.email && (
                        <a href={`mailto:${officer.socials.email}`} className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-white hover:bg-green-600 transition-all flex items-center justify-center shadow-sm">
                          <FaEnvelope size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link href="/Officers" className="text-sm font-black uppercase tracking-widest text-green-600 dark:text-green-500 hover:underline">View Full Roster →</Link>
          </div>
        </div>
      </motion.section>

      <section className="py-24 md:py-32 relative z-10 border-t border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Ambient glow behind CTA */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-green-500/8 dark:bg-green-500/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="space-y-8">
            <SectionLabel>Join the Movement</SectionLabel>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl md:text-7xl font-black text-zinc-900 dark:text-white tracking-tight leading-[1.1]"
            >
              Ready to build<br />
              <span className="text-green-600 dark:text-green-400 relative inline-block">
                something great?
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
                />
              </span>
            </motion.h2>
            <p className="text-zinc-600 dark:text-zinc-400 font-medium text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Be the change you want to see.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/Contact" className="group relative px-10 py-5 bg-zinc-900 dark:bg-white text-white dark:text-black font-black rounded-full overflow-hidden active:scale-95 flex justify-center items-center gap-2 shadow-xl hover:shadow-[0_0_40px_rgba(34,197,94,0.35)] transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center gap-2 group-hover:text-white transition-colors text-sm md:text-base">
                  Get in touch <FaArrowRight className="group-hover:translate-x-1.5 transition-transform duration-200" />
                </span>
              </Link>
              <Link href="/Officers" className="group px-10 py-5 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-black rounded-full hover:border-green-500/60 hover:text-green-700 dark:hover:text-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base">
                <FaUserGraduate className="text-sm opacity-70 group-hover:text-green-500 transition-colors" /> Meet the Team
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <style jsx global>{`
        /* ── Scrollbar ─────────────────────────────────────────────────────── */
        .custom-scrollbar::-webkit-scrollbar { height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #22c55e; border-radius: 20px; }

        /* ── Scanline overlay on hero ──────────────────────────────────────── */
        .scanlines::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 3px,
            rgba(0,0,0,0.12) 3px,
            rgba(0,0,0,0.12) 4px
          );
          pointer-events: none;
          z-index: 1;
        }

        /* ── CRT flicker on boot text ──────────────────────────────────────── */
        @keyframes crt-flicker {
          0%,100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.3; }
          94% { opacity: 1; }
          96% { opacity: 0.5; }
          97% { opacity: 1; }
        }
        .crt-flicker { animation: crt-flicker 4s infinite; }

        /* ── Boot screen fade ──────────────────────────────────────────────── */
        @keyframes boot-out {
          0%   { opacity: 1; transform: scale(1); }
          85%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.04); }
        }
        .boot-exit { animation: boot-out 0.5s ease forwards; }

        /* ── Letter float ──────────────────────────────────────────────────── */
        @keyframes letterFloat {
          0%   { transform: translateY(0px) scaleY(1); }
          100% { transform: translateY(-6px) scaleY(1.02); }
        }

        /* ── Chromatic glitch — sharpened, frame-accurate ──────────────────── */
        .cyber-glitch { position: relative; }
        .cyber-glitch::before,
        .cyber-glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          pointer-events: none;
          mix-blend-mode: screen;
        }
        .cyber-glitch::before {
          color: #4ade80;
          z-index: -1;
          clip-path: inset(0 0 100% 0);
          animation: glitch-r 2.8s infinite steps(1);
        }
        .cyber-glitch::after {
          color: #14532d;
          z-index: -2;
          clip-path: inset(100% 0 0 0);
          animation: glitch-l 3.2s infinite steps(1);
        }

        @keyframes glitch-r {
          0%  { clip-path: inset(82% 0  9% 0); transform: translate(-5px,  2px); opacity:.9; }
          5%  { clip-path: inset(12% 0 71% 0); transform: translate( 5px, -1px); opacity:.8; }
          10% { clip-path: inset(48% 0 46% 0); transform: translate(-3px,  3px); opacity:.9; }
          15% { clip-path: inset(67% 0 21% 0); transform: translate( 4px, -2px); opacity:.7; }
          20% { clip-path: inset(30% 0 60% 0); transform: translate(-6px,  1px); opacity:.85;}
          25% { clip-path: inset( 5% 0 89% 0); transform: translate( 3px,  2px); opacity:.9; }
          30% { clip-path: inset(55% 0 35% 0); transform: translate(-4px, -3px); opacity:.8; }
          35%,100% { clip-path: inset(0 0 100% 0); transform: translate(0); opacity:0; }
        }
        @keyframes glitch-l {
          0%  { clip-path: inset( 5% 0 88% 0); transform: translate( 5px, -1px); opacity:.9; }
          8%  { clip-path: inset(72% 0 18% 0); transform: translate(-5px,  2px); opacity:.8; }
          16% { clip-path: inset(35% 0 52% 0); transform: translate( 4px, -2px); opacity:.85;}
          24% { clip-path: inset(91% 0  3% 0); transform: translate(-3px,  3px); opacity:.7; }
          32% { clip-path: inset(20% 0 70% 0); transform: translate( 6px, -1px); opacity:.9; }
          40%,100% { clip-path: inset(100% 0 0 0); transform: translate(0); opacity:0; }
        }

        /* ── Neon pulse on section labels ──────────────────────────────────── */
        @keyframes neon-pulse {
          0%,100% { box-shadow: 0 0 4px rgba(34,197,94,.3); }
          50%     { box-shadow: 0 0 12px rgba(34,197,94,.7), 0 0 24px rgba(34,197,94,.3); }
        }
        .neon-pulse { animation: neon-pulse 2.5s ease-in-out infinite; }

        /* ── Card hover tilt (applied via JS) ─────────────────────────────── */
        .tilt-card { transition: transform .15s ease, box-shadow .15s ease; }
        .tilt-card:hover { box-shadow: 0 20px 60px rgba(34,197,94,.12); }

        /* ── Marquee ──────────────────────────────────────────────────────── */
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 28s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }

        /* ── Hero grid noise ──────────────────────────────────────────────── */
        @keyframes grid-drift {
          0%   { background-position: 0 0; }
          100% { background-position: 24px 24px; }
        }
        .grid-drift { animation: grid-drift 8s linear infinite; }

        /* ── Progress bar on event cards ──────────────────────────────────── */
        @keyframes fill-bar { from { width: 0; } to { width: var(--fill); } }
        .fill-bar { animation: fill-bar 1.2s ease-out forwards; }

        /* ── Underline reveal ─────────────────────────────────────────────── */
        .underline-reveal { position: relative; }
        .underline-reveal::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0;
          width: 0; height: 2px;
          background: #22c55e;
          transition: width .35s ease;
        }
        .underline-reveal:hover::after { width: 100%; }
      `}</style>
    </main>
  );
}