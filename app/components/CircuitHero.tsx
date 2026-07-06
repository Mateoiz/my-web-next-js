// app/components/CircuitHero.tsx
// Drop-in replacement for the <h1 className="glitch-text"...> block in HomeClient
// Hover the JPCS wordmark → glowing circuit traces extend outward from the letters
// Mouse leaves → traces retract back in
//
// USAGE in HomeClient.tsx:
//   1. import CircuitHero from "./components/CircuitHero";
//   2. Replace the entire <motion.div> that contains the <h1 className="glitch-text">
//      and the decorative underline <motion.div> with:
//      <CircuitHero />

"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

// ─── Each trace: start (anchored near a letter), then a series of path segments
// All coordinates are in a 900×220 viewBox that sits under the text
// Traces use only 90° turns (true PCB style) and end with a via dot

interface Trace {
  id: string;
  // SVG path data — only horizontal/vertical lines
  d: string;
  // where the via (endpoint dot) sits
  viaX: number;
  viaY: number;
  // color: primary green or accent
  color: "primary" | "accent" | "dim";
  // how long the path is (for stroke-dasharray animation)
  length: number;
  // delay before this trace starts drawing (seconds)
  delay: number;
}

const TRACES: Trace[] = [
  // ── From J — spills far left ─────────────────────────────
  { id: "j1", d: "M 70 60 H 20 V 160 H -80 V 120 H -140",    viaX: -140, viaY: 120, color: "primary", length: 340, delay: 0.0 },
  { id: "j2", d: "M 85 170 V 240 H -30 V 280 H -100",        viaX: -100, viaY: 280, color: "dim",     length: 310, delay: 0.1 },
  { id: "j3", d: "M 60 40 V -30 H -60 V -80 H -120",         viaX: -120, viaY: -80, color: "accent",  length: 280, delay: 0.05 },
  { id: "j4", d: "M 50 100 H -40 V 60 H -120 V 30",          viaX: -120, viaY: 30,  color: "dim",     length: 270, delay: 0.17 },

  // ── From P — fans upward and left ───────────────────────
  { id: "p1", d: "M 235 50 H 280 V -20 H 180 V -70 H 80",    viaX: 80,  viaY: -70, color: "primary", length: 350, delay: 0.08 },
  { id: "p2", d: "M 220 160 H 140 V 240 H 60 V 300",         viaX: 60,  viaY: 300, color: "dim",     length: 290, delay: 0.15 },
  { id: "p3", d: "M 255 100 H 340 V 40 H 420 V -10 H 500",   viaX: 500, viaY: -10, color: "accent",  length: 370, delay: 0.12 },

  // ── From C — spreads wide in all directions ──────────────
  { id: "c1", d: "M 420 50 H 480 V -30 H 580 V -90",         viaX: 580, viaY: -90, color: "primary", length: 320, delay: 0.04 },
  { id: "c2", d: "M 400 110 H 320 V 200 H 220 V 270 H 140",  viaX: 140, viaY: 270, color: "dim",     length: 390, delay: 0.18 },
  { id: "c3", d: "M 445 170 H 520 V 250 H 640 V 300",        viaX: 640, viaY: 300, color: "accent",  length: 330, delay: 0.09 },
  { id: "c4", d: "M 430 80 H 360 V 30 H 280 V -20",          viaX: 280, viaY: -20, color: "dim",     length: 270, delay: 0.21 },

  // ── From S — pushes far right ────────────────────────────
  { id: "s1", d: "M 650 45 H 720 V -20 H 820 V -70 H 950",   viaX: 950, viaY: -70, color: "primary", length: 400, delay: 0.06 },
  { id: "s2", d: "M 610 110 H 700 V 180 H 800 V 240 H 950",  viaX: 950, viaY: 240, color: "dim",     length: 390, delay: 0.20 },
  { id: "s3", d: "M 660 175 H 740 V 260 H 860 V 310 H 970",  viaX: 970, viaY: 310, color: "accent",  length: 420, delay: 0.14 },
  { id: "s4", d: "M 640 50 H 720 V -10 H 850 V 40 H 960",    viaX: 960, viaY: 40,  color: "primary", length: 390, delay: 0.03 },
  { id: "s5", d: "M 680 140 H 760 V 80 H 860 V 130 H 980",   viaX: 980, viaY: 130, color: "dim",     length: 360, delay: 0.11 },

  // ── Long diagonal-ish buses ───────────────────────────────
  { id: "bus1", d: "M -100 210 H 200 V 260 H 500 V 310 H 980", viaX: 980, viaY: 310, color: "dim", length: 1080, delay: 0.24 },
  { id: "bus2", d: "M 1000 -40 H 600 V -80 H 200 V -50 H -80", viaX: -80, viaY: -50, color: "dim", length: 1080, delay: 0.27 },
  { id: "bus3", d: "M -120 80 H 100 V 40 H 300",               viaX: 300, viaY: 40,  color: "accent", length: 480, delay: 0.16 },
  { id: "bus4", d: "M 980 160 H 780 V 200 H 600",              viaX: 600, viaY: 200, color: "accent", length: 440, delay: 0.19 },
];

const COLOR_MAP = {
  primary: { stroke: "#22c55e", glow: "rgba(34,197,94,0.6)" },
  accent:  { stroke: "#4ade80", glow: "rgba(74,222,128,0.4)" },
  dim:     { stroke: "#166534", glow: "rgba(22,101,52,0.3)" },
};

// ─── Individual animated trace ────────────────────────────────────────────────

function TracePath({ trace, active }: { trace: Trace; active: boolean }) {
  const { stroke, glow } = COLOR_MAP[trace.color];
  const dashLen = trace.length + 10;

  return (
    <g>
      {/* Glow layer */}
      <path
        d={trace.d}
        fill="none"
        stroke={glow}
        strokeWidth={active ? 6 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${dashLen} ${dashLen}`}
        strokeDashoffset={active ? 0 : dashLen}
        style={{
          transition: active
            ? `stroke-dashoffset ${0.55 + trace.delay}s cubic-bezier(0.4,0,0.2,1) ${trace.delay * 0.4}s, stroke-width 0.3s ease`
            : `stroke-dashoffset 0.3s ease ${(0.15 - trace.delay * 0.1)}s, stroke-width 0.2s ease`,
          filter: "blur(3px)",
        }}
      />
      {/* Main trace line */}
      <path
        d={trace.d}
        fill="none"
        stroke={stroke}
        strokeWidth={active ? 1.5 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${dashLen} ${dashLen}`}
        strokeDashoffset={active ? 0 : dashLen}
        style={{
          transition: active
            ? `stroke-dashoffset ${0.5 + trace.delay}s cubic-bezier(0.4,0,0.2,1) ${trace.delay * 0.4}s, stroke-width 0.3s ease`
            : `stroke-dashoffset 0.25s ease ${(0.12 - trace.delay * 0.08)}s, stroke-width 0.2s ease`,
        }}
      />
      {/* Via dot at endpoint */}
      <circle
        cx={trace.viaX}
        cy={trace.viaY}
        r={active ? 3.5 : 0}
        fill={stroke}
        style={{
          transition: active
            ? `r 0.2s ease ${trace.delay * 0.4 + 0.45}s, opacity 0.2s ease`
            : `r 0.15s ease, opacity 0.2s ease`,
          opacity: active ? 1 : 0,
          filter: `drop-shadow(0 0 4px ${glow})`,
        }}
      />
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────


// ─── Glitch characters used during flicker phase ─────────────────────────────

const GLITCH_CHARS = ["█", "▓", "▒", "░", "▄", "▀", "■", "◆", "J", "P", "C", "S", "X", "Z", "0", "1"];

// ─── Per-letter animation component ──────────────────────────────────────────
// Phase 1 (ambient, always): subtle vertical float, out of phase per letter
// Phase 2 (on hover enter): flicker through random block chars → resolve to real letter
// Phase 3 (charged): letter glows green, stays bright until hover leaves
// Phase 4 (on hover leave): desaturate back, resume float

function AnimatedLetter({
  letter,
  index,
  hovered,
}: {
  letter: string;
  index: number;
  hovered: boolean;
}) {
  const [display, setDisplay] = useState(letter);
  const [charged, setCharged] = useState(false);
  const [flickering, setFlickering] = useState(false);
  const flickerRef = useRef<any>(null);

  // Charge-up delay per letter — power flows left to right
  const chargeDelay = index * 120; // ms

  useEffect(() => {
    if (hovered) {
      // Start flicker after charge delay, then resolve
      const startTimeout = setTimeout(() => {
        setFlickering(true);
        let ticks = 0;
        const totalTicks = 6 + index * 2; // later letters flicker longer

        flickerRef.current = setInterval(() => {
          ticks++;
          if (ticks < totalTicks) {
            // Random glitch char
            setDisplay(GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]);
          } else {
            // Resolve to real letter
            setDisplay(letter);
            setFlickering(false);
            setCharged(true);
            clearInterval(flickerRef.current);
          }
        }, 55);
      }, chargeDelay);

      return () => {
        clearTimeout(startTimeout);
        clearInterval(flickerRef.current);
      };
    } else {
      // On leave: immediately show real letter, de-charge
      clearInterval(flickerRef.current);
      setDisplay(letter);
      setFlickering(false);

      // Small delay before de-charging so it doesn't feel instant
      const dechargeTimeout = setTimeout(() => setCharged(false), 200);
      return () => clearTimeout(dechargeTimeout);
    }
  }, [hovered, letter, index, chargeDelay]);

  // Float animation — each letter has its own phase offset
  const floatPhase = index * 0.7; // seconds offset

  return (
    <span
      style={{
        display: "inline-block",
        // Vertical float via CSS animation, phase-shifted per letter
        animation: `letterFloat 3s ease-in-out ${floatPhase}s infinite alternate`,
        // Color: dim zinc when idle, bright green when charged, pale green during flicker
        color: flickering
          ? "#86efac"   // light green flicker — system resolving
          : charged
          ? "#22c55e"   // full green when charged
          : undefined,  // inherit from parent
        // Glow when charged
        textShadow: flickering
          ? "0 0 15px rgba(134,239,172,0.5)"
          : charged
          ? "0 0 20px rgba(34,197,94,0.7), 0 0 50px rgba(34,197,94,0.3)"
          : "none",
        transition: "color 0.25s ease, text-shadow 0.25s ease",
        // Slight scale pop when resolving
        transform: charged && !flickering ? "scaleY(1.04)" : "scaleY(1)",
      }}
      aria-hidden
    >
      {display}
    </span>
  );
}

export default function CircuitHero({ onHoverChange }: { onHoverChange?: (v: boolean) => void } = {}) {
  const [hovered, setHovered] = useState(false);
  const [scanLine, setScanLine] = useState(-1); // -1 = hidden
  const scanRef = useRef<any>(null);

  // Scan line sweeps across on hover enter
  const startScan = useCallback(() => {
    setScanLine(0);
    let pos = 0;
    const total = 900;
    const duration = 400; // ms
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
    onHoverChange?.(true);
  }, [startScan, onHoverChange]);

  const handleLeave = useCallback(() => {
    setHovered(false);
    setScanLine(-1);
    if (scanRef.current) cancelAnimationFrame(scanRef.current);
    onHoverChange?.(false);
  }, [onHoverChange]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full flex justify-center select-none overflow-visible"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* ── SVG trace layer — sits behind the text ── */}
      <svg
        viewBox="-160 -110 1280 440"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full pointer-events-none"
        style={{ height: "100%", overflow: "visible", zIndex: 0 }}
        aria-hidden
      >
        {/* Scan line sweep */}
        {scanLine >= 0 && (
          <line
            x1={scanLine - 160} y1={-110}
            x2={scanLine - 160} y2={330}
            stroke="rgba(34,197,94,0.4)"
            strokeWidth={2}
            style={{ filter: "blur(2px)" }}
          />
        )}

        {/* Grid dots — wider spread, PCB substrate feel */}
        {hovered && Array.from({ length: 18 }, (_, row) =>
          Array.from({ length: 26 }, (_, col) => (
            <circle
              key={`dot-${row}-${col}`}
              cx={col * 50 - 130}
              cy={row * 25 - 90}
              r={1}
              fill="#166534"
              opacity={0.35}
              style={{ transition: "opacity 0.5s ease" }}
            />
          ))
        )}

        {/* All traces */}
        {TRACES.map(trace => (
          <TracePath key={trace.id} trace={trace} active={hovered} />
        ))}

        {/* Corner bracket decorations — appear on hover */}
        {hovered && (
          <>
            <path d="M -150 -100 H -120 V -70"  fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />
            <path d="M 1110 -100 H 1080 V -70"  fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />
            <path d="M -150 320 H -120 V 290"   fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />
            <path d="M 1110 320 H 1080 V 290"   fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.5" />
          </>
        )}
      </svg>

      {/* ── The JPCS wordmark — individual animated letters ── */}
      <h1
        className="text-[22vw] md:text-[13rem] font-extrabold tracking-tighter leading-none relative flex"
        aria-label="JPCS"
        style={{ zIndex: 1 }}
      >
        {["J","P","C","S"].map((letter, i) => (
          <AnimatedLetter
            key={letter}
            letter={letter}
            index={i}
            hovered={hovered}
          />
        ))}
      </h1>



      {/* ── Letter float keyframe ── */}
      <style>{`
        @keyframes letterFloat {
          0%   { transform: translateY(0px) scaleY(1); }
          100% { transform: translateY(-8px) scaleY(1.02); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes letterFloat { 0%, 100% { transform: none; } }
        }
      `}</style>

      {/* ── Hover hint — shows on first render, fades after hover ── */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 0 : 0.4 }}
        transition={{ delay: hovered ? 0 : 2, duration: 0.5 }}
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase tracking-[0.3em] text-green-600 dark:text-green-700 whitespace-nowrap pointer-events-none"
        style={{ zIndex: 2 }}
      >
        hover to trace
      </motion.span>
    </motion.div>
  );
}