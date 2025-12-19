"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FaTimes, FaMicrochip, FaFeatherAlt, FaGamepad, FaTrophy, FaArrowLeft } from "react-icons/fa";
import SecretLeaderboard from "./SecretLeaderboard"; 
// import { db } from "../../lib/firebase"; 

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

  // --------------------------------------------------------------------------
  // 1. INPUT LISTENERS
  // --------------------------------------------------------------------------
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
      // FIX: Don't track global swipes if the game is already open (prevents conflict)
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

  // --------------------------------------------------------------------------
  // 2. NAVIGATION & MANAGEMENT
  // --------------------------------------------------------------------------
  const openSecretMenu = () => {
    setIsOpen(true);
    setActiveGame("menu");
    setInputSequence([]);
    setSwipeSequence([]);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
  };

  const closeGame = () => {
    setIsOpen(false);
    resetAllGames();
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

  // --------------------------------------------------------------------------
  // 3. GAME LOGIC: SYSTEM OVERRIDE
  // --------------------------------------------------------------------------
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
    // FIX: Prevent default to stop mobile ghost clicks and zooming
    if (e && e.cancelable) {
        e.preventDefault();
        e.stopPropagation();
    }

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

  // --------------------------------------------------------------------------
  // 4. GAME LOGIC: FLAPPY GLITCH
  // --------------------------------------------------------------------------
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
    // FIX: Unified handler with preventDefault to stop double tapping
    if (e && e.cancelable) {
        e.preventDefault();
        e.stopPropagation();
    }

    if (countdown !== null) return; 
    if (flappyState === "playing") birdVelocity.current = JUMP_STRENGTH;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 font-mono select-none">
      <div className="relative w-full max-w-md bg-black border-2 border-green-500 rounded-xl shadow-[0_0_50px_rgba(34,197,94,0.3)] overflow-hidden flex flex-col h-[650px] max-h-[90vh]">
        
        {/* --- TOAST --- */}
        {showPrizeToast && (
          <div className="absolute top-4 left-4 right-4 z-[60] bg-green-500 text-black p-4 rounded shadow-lg animate-bounce text-center">
            <h3 className="font-black flex justify-center gap-2"><FaTrophy /> PRIZE UNLOCKED!</h3>
            <p className="text-xs font-bold">Screenshot this!</p>
          </div>
        )}

        {/* --- HEADER (WITH BACK BUTTON) --- */}
        <div className="flex justify-between items-center p-4 border-b border-green-500/30 bg-zinc-900/50">
          <div className="flex items-center gap-3">
             {/* BACK BUTTON: Only shows if NOT in menu */}
             {activeGame !== "menu" && (
                <button 
                  onClick={returnToMenu}
                  className="p-1 rounded hover:bg-green-500/20 text-green-500 transition-colors"
                  aria-label="Back to Menu"
                >
                   <FaArrowLeft />
                </button>
             )}
             <h2 className="text-lg font-bold text-green-500 flex items-center gap-2">
               <FaMicrochip /> SECRET TERMINAL
             </h2>
          </div>
          <button onClick={closeGame} className="text-green-500 hover:text-white"><FaTimes size={20} /></button>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="relative flex-1 bg-black p-4 overflow-hidden flex flex-col items-center">
          
          {/* MENU */}
          {activeGame === "menu" && (
            <div className="h-full w-full flex flex-col justify-center gap-4">
              <p className="text-center text-gray-500 mb-2">SELECT INFILTRATION METHOD</p>
              <MenuButton icon={<FaGamepad />} title="SYSTEM OVERRIDE" desc="Reflex Test" onClick={() => setActiveGame("override")} />
              <MenuButton icon={<FaFeatherAlt />} title="FLAPPY GLITCH" desc="Flight Test" onClick={() => setActiveGame("flappy")} />
            </div>
          )}

          {/* GAME 1: OVERRIDE */}
          {activeGame === "override" && (
            <div className="w-full h-full flex flex-col">
              {overrideState === "idle" && <StartScreen onStart={startOverride} onMenu={returnToMenu} title="System Override" />}
              
              {overrideState === "playing" && (
                <div className="h-full flex flex-col w-full">
                  <div className="flex justify-between text-green-400 font-bold mb-4">
                    <span>SCORE: {overrideScore}</span>
                    <div className="w-32 h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: '100%', animation: `shrink ${difficultyRef.current}ms linear forwards` }} key={roundId} />
                    </div>
                  </div>
                  {/* FIX: touchAction: none prevents zooming/scrolling on mobile */}
                  <div className="grid grid-cols-3 gap-3 flex-1" style={{ touchAction: 'none' }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        // FIX: Both events call same handler which calls preventDefault
                        onMouseDown={(e) => handleOverrideClick(e, i)}
                        onTouchStart={(e) => handleOverrideClick(e, i)}
                        className={`rounded border-2 cursor-pointer transition-colors duration-75 ${activeCell === i ? "bg-green-500 border-green-400 shadow-[0_0_15px_#22c55e]" : "bg-zinc-900 border-zinc-800"}`}
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
            <div className="w-full h-full relative">
              {flappyState === "idle" && <StartScreen onStart={startFlappy} onMenu={returnToMenu} title="Flappy Glitch" />}
              
              {flappyState === "playing" && (
                <div 
                  // FIX: Unified handler
                  onMouseDown={flappyJump} 
                  onTouchStart={flappyJump} 
                  // FIX: Critical for mobile gameplay
                  style={{ height: GAME_HEIGHT, touchAction: 'none' }} 
                  className="relative w-full bg-zinc-900/50 cursor-pointer touch-none border-b border-green-900 overflow-hidden"
                >
                  {/* COUNTDOWN OVERLAY */}
                  {countdown !== null && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
                        <div className="text-6xl font-black text-green-500 animate-pulse">
                            {countdown}
                        </div>
                      </div>
                  )}

                  <div className="absolute top-4 right-4 text-4xl font-black text-white/20 pointer-events-none z-10">{flappyScore}</div>
                  
                  {/* BIRD */}
                  <div 
                    className="absolute left-[50px] bg-green-500 border-2 border-white rounded-sm shadow-[0_0_15px_#22c55e] pointer-events-none" 
                    style={{ 
                        top: renderBirdY, 
                        width: BIRD_SIZE, 
                        height: BIRD_SIZE 
                    }} 
                  />
                  
                  {/* PIPES */}
                  {renderPipes.map((p, i) => (
                    <div key={i} className="pointer-events-none">
                      <div className="absolute w-[40px] bg-green-900/80 border-b-2 border-green-500 left-0" style={{ left: p.x, height: p.height, top: 0 }} />
                      <div className="absolute w-[40px] bg-green-900/80 border-t-2 border-green-500 left-0" style={{ left: p.x, top: p.height + GAP_SIZE, bottom: 0 }} />
                    </div>
                  ))}
                  
                  <div className="absolute bottom-0 w-full h-1 bg-green-500/30 pointer-events-none" />
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
      <style jsx>{` @keyframes shrink { from { width: 100%; } to { width: 0%; } } `}</style>
    </div>
  );
}

// --- SUBCOMPONENTS ---

const MenuButton = ({ icon, title, desc, onClick }: any) => (
  <button onClick={onClick} className="group w-full py-6 border border-green-500/30 hover:bg-green-500/10 text-green-500 hover:text-green-300 rounded flex items-center justify-center gap-4 transition-all">
    <div className="text-2xl">{icon}</div>
    <div className="text-left">
      <div className="font-bold text-lg">{title}</div>
      <div className="text-xs text-gray-500 group-hover:text-green-400">{desc}</div>
    </div>
  </button>
);

const StartScreen = ({ onStart, onMenu, title }: any) => (
  <div className="h-full flex flex-col items-center justify-center gap-4 animate-in fade-in w-full">
    <h3 className="text-2xl font-bold text-green-500 uppercase">{title}</h3>
    <button onClick={onStart} className="w-full max-w-[200px] py-3 bg-green-600 hover:bg-green-500 text-black font-bold rounded">START MISSION</button>
    <button onClick={onMenu} className="flex items-center gap-2 px-4 py-2 rounded border border-green-500/30 text-xs text-green-500 hover:bg-green-500/10 hover:text-green-400 transition-colors">
        <FaArrowLeft size={10} /> Back to Menu
    </button>
  </div>
);