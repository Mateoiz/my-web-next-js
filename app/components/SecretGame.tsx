"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom"; // IMPORT PORTAL
import { FaTimes, FaMicrochip, FaFeatherAlt, FaGamepad, FaTrophy, FaArrowLeft } from "react-icons/fa";
import SecretLeaderboard from "./SecretLeaderboard"; 

// --- CONFIGURATION ---
const KONAMI_CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const MOBILE_CODE = ["UP", "DOWN", "LEFT", "RIGHT"];
const PRIZE_SCORE = 30;

// Game Constants
const GAME_HEIGHT = 500; 
const BIRD_SIZE = 30;    
const HITBOX_PADDING = 4; 
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 1800;
const GAP_SIZE = 160;    

export default function SecretGame() {
  // --- GLOBAL STATE ---
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // For Portal
  const [activeGame, setActiveGame] = useState<"menu" | "override" | "flappy">("menu");
  const [showPrizeToast, setShowPrizeToast] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // --- INPUT TRACKING ---
  const [inputSequence, setInputSequence] = useState<string[]>([]);
  const [swipeSequence, setSwipeSequence] = useState<string[]>([]);
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  // --- OVERRIDE STATE ---
  const [overrideState, setOverrideState] = useState<"idle" | "playing" | "gameover">("idle");
  const [overrideScore, setOverrideScore] = useState(0);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [roundId, setRoundId] = useState(0);
  const overrideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const difficultyRef = useRef(2000);

  // --- FLAPPY STATE ---
  const [flappyState, setFlappyState] = useState<"idle" | "playing" | "gameover">("idle");
  const [flappyScore, setFlappyScore] = useState(0);
  
  // Refs for Game Loop
  const birdY = useRef(GAME_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipesRef = useRef<{ x: number; height: number; passed: boolean }[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const pipeSpawnRef = useRef<NodeJS.Timeout | null>(null);

  // Render State
  const [renderBirdY, setRenderBirdY] = useState(GAME_HEIGHT / 2);
  const [renderPipes, setRenderPipes] = useState<{ x: number; height: number }[]>([]);

  // 1. MOUNTING EFFECT (Required for Portals)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. INPUT LISTENERS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newSeq = [...inputSequence, e.key].slice(-10);
      setInputSequence(newSeq);
      if (JSON.stringify(newSeq) === JSON.stringify(KONAMI_CODE)) openSecretMenu();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputSequence]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isOpen) return;
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isOpen || !touchStartRef.current) return;
      const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      const diffX = touchEnd.x - touchStartRef.current.x;
      const diffY = touchEnd.y - touchStartRef.current.y;
      
      const MIN_SWIPE_DISTANCE = 75; 
      const AXIS_STRICTNESS = 1.5;

      let direction = "";
      if (Math.abs(diffX) > Math.abs(diffY) * AXIS_STRICTNESS) {
        if (Math.abs(diffX) > MIN_SWIPE_DISTANCE) direction = diffX > 0 ? "RIGHT" : "LEFT";
      } else if (Math.abs(diffY) > Math.abs(diffX) * AXIS_STRICTNESS) {
        if (Math.abs(diffY) > MIN_SWIPE_DISTANCE) direction = diffY > 0 ? "DOWN" : "UP";
      }

      if (direction) {
        setSwipeSequence(prev => {
          const newSeq = [...prev, direction].slice(-4); 
          if (JSON.stringify(newSeq) === JSON.stringify(MOBILE_CODE)) {
            openSecretMenu();
            return []; 
          }
          return newSeq;
        });
      }
      touchStartRef.current = null;
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isOpen]);

  // 3. NAVIGATION & MANAGEMENT
  const openSecretMenu = () => {
    setIsOpen(true);
    setActiveGame("menu");
    setInputSequence([]);
    setSwipeSequence([]);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
    // CRITICAL: Lock Body Scroll
    document.body.style.overflow = "hidden";
  };

  const closeGame = () => {
    setIsOpen(false);
    resetAllGames();
    // CRITICAL: Restore Body Scroll
    document.body.style.overflow = "";
  };

  const returnToMenu = () => {
    resetAllGames();
    setActiveGame("menu");
  };

  const resetAllGames = () => {
    setOverrideState("idle");
    setOverrideScore(0);
    setActiveCell(null);
    if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    
    setFlappyState("idle");
    setFlappyScore(0);
    setCountdown(null); 
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (pipeSpawnRef.current) clearInterval(pipeSpawnRef.current);
    
    setShowPrizeToast(false);
  };

  const checkPrize = (score: number) => {
    if (score === PRIZE_SCORE) {
      setShowPrizeToast(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setTimeout(() => setShowPrizeToast(false), 5000);
    }
  };

  // 4. GAME LOGIC: SYSTEM OVERRIDE
  const startOverride = () => {
    setOverrideState("playing");
    setOverrideScore(0);
    difficultyRef.current = 2000;
    nextOverrideRound();
  };

  const nextOverrideRound = useCallback(() => {
    setActiveCell((prev) => {
      let next;
      do { next = Math.floor(Math.random() * 9); } while (next === prev);
      return next;
    });
    setRoundId(p => p + 1);
    
    if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    overrideTimeoutRef.current = setTimeout(() => {
      setOverrideState("gameover");
    }, difficultyRef.current);
  }, []);

  const handleOverrideClick = (e: React.SyntheticEvent | Event, index: number) => {
    if (e && e.cancelable) e.preventDefault();
    if (overrideState !== "playing") return;
    
    if (index === activeCell) {
      const newScore = overrideScore + 1;
      setOverrideScore(newScore);
      checkPrize(newScore);
      difficultyRef.current = Math.max(400, difficultyRef.current * 0.95);
      nextOverrideRound();
    } else {
      setOverrideState("gameover");
      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    }
  };

  // 5. GAME LOGIC: FLAPPY GLITCH
  const startFlappy = () => {
    setFlappyState("playing");
    setCountdown(3); 
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => (c ? c - 1 : 0)), 1000);
      return () => clearTimeout(timer);
    } 
    if (countdown === 0) {
      setCountdown(null); 
      initFlappyLoop();
    }
  }, [countdown]);

  const initFlappyLoop = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    setFlappyScore(0);
    birdY.current = GAME_HEIGHT / 2;
    birdVelocity.current = 0;
    pipesRef.current = [];
    setRenderBirdY(birdY.current);
    setRenderPipes([]);

    pipeSpawnRef.current = setInterval(() => {
      pipesRef.current.push({ 
        x: 400, 
        height: Math.random() * (GAME_HEIGHT - GAP_SIZE - 100) + 50, 
        passed: false 
      });
    }, PIPE_SPAWN_RATE);

    gameLoopRef.current = requestAnimationFrame(flappyLoop);
  };

  const flappyLoop = () => {
    birdVelocity.current += GRAVITY;
    birdY.current += birdVelocity.current;

    for (let i = pipesRef.current.length - 1; i >= 0; i--) {
      const pipe = pipesRef.current[i];
      pipe.x -= PIPE_SPEED;
      
      if (!pipe.passed && pipe.x + 40 < 50) {
        pipe.passed = true;
        setFlappyScore(s => {
          const newScore = s + 1;
          checkPrize(newScore);
          return newScore;
        });
      }
      
      if (pipe.x < -50) pipesRef.current.splice(i, 1);
    }

    const hitFloor = birdY.current + BIRD_SIZE - HITBOX_PADDING >= GAME_HEIGHT;
    const hitCeiling = birdY.current + HITBOX_PADDING <= 0;

    const birdLeft = 50 + HITBOX_PADDING;
    const birdRight = 50 + BIRD_SIZE - HITBOX_PADDING;
    const birdTop = birdY.current + HITBOX_PADDING;
    const birdBottom = birdY.current + BIRD_SIZE - HITBOX_PADDING;

    const hitPipe = pipesRef.current.some(p => {
        const pipeLeft = p.x;
        const pipeRight = p.x + 40;
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            return birdTop < p.height || birdBottom > p.height + GAP_SIZE;
        }
        return false;
    });

    if (hitFloor || hitCeiling || hitPipe) {
      setFlappyState("gameover");
      if (pipeSpawnRef.current) clearInterval(pipeSpawnRef.current);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
      return; 
    }

    setRenderBirdY(birdY.current);
    setRenderPipes([...pipesRef.current]);
    gameLoopRef.current = requestAnimationFrame(flappyLoop);
  };

  const flappyJump = (e: React.SyntheticEvent | Event) => {
    if (e && e.cancelable) e.preventDefault();
    if (countdown !== null) return; 
    if (flappyState === "playing") birdVelocity.current = JUMP_STRENGTH;
  };

  // 6. RENDER LOGIC: PORTAL
  // If not open or not mounted, render nothing
  if (!mounted || !isOpen) return null;

  // Render directly to document.body
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 font-mono select-none touch-none animate-in fade-in duration-200">
      
      {/* Container: Full Screen on Mobile (100dvh), Modal on Desktop */}
      <div className="relative w-full h-[100dvh] md:h-[700px] md:max-h-[90vh] md:max-w-md bg-black md:border-2 border-green-500 md:rounded-2xl shadow-[0_0_100px_rgba(34,197,94,0.2)] overflow-hidden flex flex-col">
        
        {/* --- TOAST --- */}
        {showPrizeToast && (
          <div className="absolute top-16 left-4 right-4 z-[999999] bg-green-500 text-black p-4 rounded shadow-lg animate-bounce text-center">
            <h3 className="font-black flex justify-center gap-2"><FaTrophy /> PRIZE UNLOCKED!</h3>
            <p className="text-xs font-bold">Screenshot this!</p>
          </div>
        )}

        {/* --- HEADER --- */}
        {/* pt-safe and pb-safe ensure we respect iPhone notches */}
        <div className="flex justify-between items-center px-4 py-4 md:py-4 border-b border-green-500/30 bg-zinc-900/80 backdrop-blur-md pt-safe">
          <div className="flex items-center gap-3">
             {activeGame !== "menu" && (
                <button 
                  onClick={returnToMenu}
                  className="p-2 rounded hover:bg-green-500/20 text-green-500 transition-colors active:scale-95"
                  aria-label="Back to Menu"
                >
                    <FaArrowLeft size={18} />
                </button>
             )}
             <h2 className="text-lg font-black tracking-tighter text-green-500 flex items-center gap-2">
               <FaMicrochip /> <span className="hidden sm:inline">SECRET</span> TERMINAL
             </h2>
          </div>
          <button onClick={closeGame} className="text-green-500 hover:text-white p-2 active:scale-95 transition-transform">
             <FaTimes size={24} />
          </button>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="relative flex-1 bg-black p-4 overflow-hidden flex flex-col items-center justify-center pb-safe">
          
          {/* MENU */}
          {activeGame === "menu" && (
            <div className="w-full max-w-xs flex flex-col justify-center gap-4">
              <div className="text-center mb-6">
                 <div className="inline-block p-4 rounded-full bg-green-900/20 mb-4 animate-pulse">
                    <FaGamepad className="text-4xl text-green-500" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-1">ACCESS GRANTED</h3>
                 <p className="text-xs text-green-500/70 uppercase tracking-widest">Select Protocol</p>
              </div>
              
              <MenuButton icon={<FaGamepad />} title="SYSTEM OVERRIDE" desc="Test your reflexes" onClick={() => setActiveGame("override")} />
              <MenuButton icon={<FaFeatherAlt />} title="FLAPPY GLITCH" desc="Navigate the network" onClick={() => setActiveGame("flappy")} />
            </div>
          )}

          {/* GAME 1: OVERRIDE */}
          {activeGame === "override" && (
            <div className="w-full h-full flex flex-col">
              {overrideState === "idle" && <StartScreen onStart={startOverride} onMenu={returnToMenu} title="System Override" />}
              
              {overrideState === "playing" && (
                <div className="h-full flex flex-col w-full">
                  <div className="flex justify-between text-green-400 font-bold mb-4 items-end px-2">
                    <span className="text-xl font-mono">SCORE: {overrideScore}</span>
                    <div className="flex-1 ml-4 h-2 bg-zinc-800 rounded-full mb-2 overflow-hidden relative">
                      <div className="absolute top-0 left-0 h-full bg-green-500" style={{ width: '100%', animation: `shrink ${difficultyRef.current}ms linear forwards` }} key={roundId} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 flex-1 pb-4" style={{ touchAction: 'none' }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        onPointerDown={(e) => handleOverrideClick(e, i)}
                        className={`rounded-xl border-2 cursor-pointer transition-all duration-75 active:scale-95 ${activeCell === i ? "bg-green-500 border-green-400 shadow-[0_0_30px_#22c55e] z-10" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {overrideState === "gameover" && (
                <SecretLeaderboard 
                  score={overrideScore} 
                  gameMode="override" 
                  onReplay={startOverride} 
                  onMenu={returnToMenu} 
                />
              )}
            </div>
          )}

          {/* GAME 2: FLAPPY */}
          {activeGame === "flappy" && (
            <div className="w-full h-full relative flex flex-col">
              {flappyState === "idle" && <StartScreen onStart={startFlappy} onMenu={returnToMenu} title="Flappy Glitch" />}
              
              {flappyState === "playing" && (
                <div 
                  onPointerDown={flappyJump} 
                  className="relative w-full flex-1 bg-zinc-900/50 cursor-pointer touch-none border border-green-900/30 rounded-lg overflow-hidden mb-safe"
                >
                  {/* COUNTDOWN */}
                  {countdown !== null && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
                        <div className="text-8xl font-black text-green-500 animate-pulse">
                            {countdown}
                        </div>
                      </div>
                  )}

                  <div className="absolute top-6 right-6 text-6xl font-black text-white/10 pointer-events-none z-10 select-none">{flappyScore}</div>
                  
                  {/* BIRD */}
                  <div 
                    className="absolute left-[50px] bg-green-500 border-2 border-white rounded-sm shadow-[0_0_15px_#22c55e] pointer-events-none transition-transform will-change-transform" 
                    style={{ 
                        top: renderBirdY, 
                        width: BIRD_SIZE, 
                        height: BIRD_SIZE,
                        transform: `rotate(${Math.min(Math.max(birdVelocity.current * 3, -25), 25)}deg)`
                    }} 
                  />
                  
                  {/* PIPES */}
                  {renderPipes.map((p, i) => (
                    <div key={i} className="pointer-events-none">
                      <div className="absolute w-[40px] bg-green-900/80 border-b-2 border-green-500 left-0" style={{ left: p.x, height: p.height, top: 0 }} />
                      <div className="absolute w-[40px] bg-green-900/80 border-t-2 border-green-500 left-0" style={{ left: p.x, top: p.height + GAP_SIZE, bottom: 0 }} />
                    </div>
                  ))}
                  
                  <div className="absolute bottom-0 w-full h-2 bg-green-500/30 pointer-events-none" />
                </div>
              )}

              {flappyState === "gameover" && (
                <SecretLeaderboard 
                  score={flappyScore} 
                  gameMode="flappy" 
                  onReplay={startFlappy} 
                  onMenu={returnToMenu} 
                />
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Global Styles for Animations */}
      <style jsx>{` @keyframes shrink { from { width: 100%; } to { width: 0%; } } `}</style>
    </div>,
    document.body // PORTAL TARGET
  );
}

// --- SUBCOMPONENTS ---

const MenuButton = ({ icon, title, desc, onClick }: any) => (
  <button onClick={onClick} className="group w-full py-6 px-6 border border-green-500/30 bg-zinc-900/50 hover:bg-green-500/20 text-green-500 hover:text-green-300 rounded-xl flex items-center gap-6 transition-all active:scale-95 shadow-sm hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]">
    <div className="text-3xl bg-black p-3 rounded-lg border border-green-500/20 group-hover:border-green-500/50 transition-colors">{icon}</div>
    <div className="text-left flex-1">
      <div className="font-black text-lg tracking-tight">{title}</div>
      <div className="text-xs text-zinc-500 font-bold uppercase tracking-wide group-hover:text-green-400">{desc}</div>
    </div>
    <div className="text-green-500/50 group-hover:translate-x-1 transition-transform">
        <FaArrowLeft className="rotate-180" />
    </div>
  </button>
);

const StartScreen = ({ onStart, onMenu, title }: any) => (
  <div className="h-full flex flex-col items-center justify-center gap-8 animate-in fade-in w-full pb-10">
    <div className="text-center space-y-2">
        <h3 className="text-3xl md:text-4xl font-black text-green-500 uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">{title}</h3>
        <p className="text-zinc-500 text-xs uppercase tracking-[0.2em]">Ready Player One</p>
    </div>
    
    <button onClick={onStart} className="w-full max-w-[260px] py-4 bg-green-600 hover:bg-green-500 text-black font-black rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.4)] hover:shadow-[0_0_50px_rgba(34,197,94,0.6)] transition-all active:scale-95 text-xl tracking-wide uppercase">
        Start Mission
    </button>
    
    <button onClick={onMenu} className="flex items-center gap-2 px-6 py-3 rounded-full border border-green-500/30 text-xs font-bold text-green-500 hover:bg-green-500/10 hover:text-green-400 transition-colors uppercase tracking-wider">
        <FaArrowLeft /> Abort
    </button>
  </div>
);