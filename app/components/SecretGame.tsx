"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FaTimes, FaMicrochip, FaFeatherAlt, FaGamepad, FaTrophy } from "react-icons/fa";
// Import the leaderboard component we made above
import SecretLeaderboard from "./SecretLeaderboard"; 
// Adjust this path if needed based on your folder structure (e.g., "@/lib/firebase")
import { db } from "../../lib/firebase"; 

// --- CONFIGURATION ---
const KONAMI_CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const MOBILE_CODE = ["UP", "DOWN", "LEFT", "RIGHT"];
const PRIZE_SCORE = 30;

// Game Constants
const GAME_HEIGHT = 400;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 1800;
const GAP_SIZE = 140;

export default function SecretGame() {
  // --- GLOBAL STATE ---
  const [isOpen, setIsOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<"menu" | "override" | "flappy">("menu");
  const [showPrizeToast, setShowPrizeToast] = useState(false);

  // --- INPUT TRACKING ---
  const [inputSequence, setInputSequence] = useState<string[]>([]);
  // ADDED: State to track mobile swipes
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
  
  // Refs for Game Loop (Performance Optimization: don't use State for physics)
  const birdY = useRef(GAME_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipesRef = useRef<{ x: number; height: number; passed: boolean }[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const pipeSpawnRef = useRef<NodeJS.Timeout | null>(null);

  // Render State (Only what needs to be drawn)
  const [renderBirdY, setRenderBirdY] = useState(GAME_HEIGHT / 2);
  const [renderPipes, setRenderPipes] = useState<{ x: number; height: number }[]>([]);

  // --------------------------------------------------------------------------
  // 1. INPUT LISTENERS (Konami Code)
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

  // --------------------------------------------------------------------------
  // 2. LISTEN FOR SWIPES (MOBILE) - IMPROVED STRICTNESS
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
      };

      const diffX = touchEnd.x - touchStartRef.current.x;
      const diffY = touchEnd.y - touchStartRef.current.y;
      
      // CONFIG: Minimum distance to count as a swipe (increased to prevent scroll triggers)
      const MIN_SWIPE_DISTANCE = 75; 
      // CONFIG: How strict the angle must be (1.5 means X must be 1.5x bigger than Y to be horizontal)
      const AXIS_STRICTNESS = 1.5;

      let direction = "";

      // Check if Horizontal Swipe
      if (Math.abs(diffX) > Math.abs(diffY) * AXIS_STRICTNESS) {
        if (Math.abs(diffX) > MIN_SWIPE_DISTANCE) {
          direction = diffX > 0 ? "RIGHT" : "LEFT";
        }
      } 
      // Check if Vertical Swipe
      else if (Math.abs(diffY) > Math.abs(diffX) * AXIS_STRICTNESS) {
        if (Math.abs(diffY) > MIN_SWIPE_DISTANCE) {
          direction = diffY > 0 ? "DOWN" : "UP";
        }
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
  }, []);

  // --------------------------------------------------------------------------
  // 3. GAME MANAGEMENT LOGIC
  // --------------------------------------------------------------------------
  const openSecretMenu = () => {
    setIsOpen(true);
    setActiveGame("menu");
    setInputSequence([]);
    setSwipeSequence([]); // Reset swipes too
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
  };

  const closeGame = () => {
    setIsOpen(false);
    resetAllGames();
  };

  const resetAllGames = () => {
    // Override Cleanup
    setOverrideState("idle");
    setOverrideScore(0);
    setActiveCell(null);
    if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    
    // Flappy Cleanup
    setFlappyState("idle");
    setFlappyScore(0);
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
  // 4. GAME LOGIC: SYSTEM OVERRIDE
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
      setOverrideState("gameover"); // Time ran out
    }, difficultyRef.current);
  }, []);

  const handleOverrideClick = (index: number) => {
    if (overrideState !== "playing") return;
    
    if (index === activeCell) {
      const newScore = overrideScore + 1;
      setOverrideScore(newScore);
      checkPrize(newScore);
      difficultyRef.current = Math.max(400, difficultyRef.current * 0.95);
      nextOverrideRound();
    } else {
      setOverrideState("gameover"); // Wrong click
      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    }
  };

  // --------------------------------------------------------------------------
  // 5. GAME LOGIC: FLAPPY GLITCH
  // --------------------------------------------------------------------------
  const startFlappy = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    setFlappyState("playing");
    setFlappyScore(0);
    
    birdY.current = GAME_HEIGHT / 2;
    birdVelocity.current = 0;
    pipesRef.current = [];
    
    // Spawn Pipes
    pipeSpawnRef.current = setInterval(() => {
      pipesRef.current.push({ 
        x: 400, 
        height: Math.random() * (GAME_HEIGHT - GAP_SIZE - 50) + 50, 
        passed: false 
      });
    }, PIPE_SPAWN_RATE);

    gameLoopRef.current = requestAnimationFrame(flappyLoop);
  };

  const flappyLoop = () => {
    birdVelocity.current += GRAVITY;
    birdY.current += birdVelocity.current;

    // Move Pipes
    for (let i = pipesRef.current.length - 1; i >= 0; i--) {
      const pipe = pipesRef.current[i];
      pipe.x -= PIPE_SPEED;
      
      // Scoring
      if (!pipe.passed && pipe.x + 40 < 50) {
        pipe.passed = true;
        setFlappyScore(s => {
          const newScore = s + 1;
          checkPrize(newScore);
          return newScore;
        });
      }
      
      // Cleanup off-screen pipes
      if (pipe.x < -50) pipesRef.current.splice(i, 1);
    }

    // Collision Detection
    const hitPipe = pipesRef.current.some(p => 
      (50 + 30 > p.x && 50 < p.x + 40) && 
      (birdY.current < p.height || birdY.current + 30 > p.height + GAP_SIZE)
    );

    if (birdY.current < 0 || birdY.current > GAME_HEIGHT || hitPipe) {
      setFlappyState("gameover");
      if (pipeSpawnRef.current) clearInterval(pipeSpawnRef.current);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
      return; 
    }

    // Update Render State
    setRenderBirdY(birdY.current);
    setRenderPipes([...pipesRef.current]);
    gameLoopRef.current = requestAnimationFrame(flappyLoop);
  };

  const flappyJump = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    if (flappyState === "playing") birdVelocity.current = JUMP_STRENGTH;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 font-mono select-none">
      <div className="relative w-full max-w-md bg-black border-2 border-green-500 rounded-xl shadow-[0_0_50px_rgba(34,197,94,0.3)] overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
        
        {/* --- TOAST --- */}
        {showPrizeToast && (
          <div className="absolute top-4 left-4 right-4 z-[60] bg-green-500 text-black p-4 rounded shadow-lg animate-bounce text-center">
            <h3 className="font-black flex justify-center gap-2"><FaTrophy /> PRIZE UNLOCKED!</h3>
            <p className="text-xs font-bold">Screenshot this!</p>
          </div>
        )}

        {/* --- HEADER --- */}
        <div className="flex justify-between items-center p-4 border-b border-green-500/30 bg-zinc-900/50">
          <h2 className="text-lg font-bold text-green-500 flex items-center gap-2">
            <FaMicrochip /> SECRET TERMINAL
          </h2>
          <button onClick={closeGame} className="text-green-500 hover:text-white"><FaTimes size={20} /></button>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="relative flex-1 bg-black p-4 overflow-hidden">
          
          {/* MENU */}
          {activeGame === "menu" && (
            <div className="h-full flex flex-col justify-center gap-4">
              <p className="text-center text-gray-500 mb-2">SELECT INFILTRATION METHOD</p>
              <MenuButton icon={<FaGamepad />} title="SYSTEM OVERRIDE" desc="Reflex Test" onClick={() => setActiveGame("override")} />
              <MenuButton icon={<FaFeatherAlt />} title="FLAPPY GLITCH" desc="Flight Test" onClick={() => setActiveGame("flappy")} />
            </div>
          )}

          {/* GAME 1: OVERRIDE */}
          {activeGame === "override" && (
            <>
              {overrideState === "idle" && <StartScreen onStart={startOverride} onMenu={() => setActiveGame("menu")} title="System Override" />}
              
              {overrideState === "playing" && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between text-green-400 font-bold mb-4">
                    <span>SCORE: {overrideScore}</span>
                    <div className="w-32 h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: '100%', animation: `shrink ${difficultyRef.current}ms linear forwards` }} key={roundId} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 flex-1">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        onMouseDown={(e) => { e.preventDefault(); handleOverrideClick(i); }}
                        className={`rounded border-2 cursor-pointer transition-colors duration-75 ${activeCell === i ? "bg-green-500 border-green-400 shadow-[0_0_15px_#22c55e]" : "bg-zinc-900 border-zinc-800"}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* LEADERBOARD OVERLAY ON GAME OVER */}
              {overrideState === "gameover" && (
                <SecretLeaderboard 
                  score={overrideScore} 
                  gameMode="override" 
                  onReplay={startOverride} 
                  onMenu={() => setActiveGame("menu")} 
                />
              )}
            </>
          )}

          {/* GAME 2: FLAPPY */}
          {activeGame === "flappy" && (
            <>
              {flappyState === "idle" && <StartScreen onStart={startFlappy} onMenu={() => setActiveGame("menu")} title="Flappy Glitch" />}
              
              {flappyState === "playing" && (
                <div 
                  onMouseDown={flappyJump} 
                  onTouchStart={flappyJump} 
                  className="absolute inset-0 bg-zinc-900 cursor-pointer touch-none"
                >
                  <div className="absolute top-4 right-4 text-4xl font-black text-white/20 pointer-events-none">{flappyScore}</div>
                  <div className="absolute left-[50px] w-[30px] h-[30px] bg-green-500 border-2 border-white rounded-sm shadow-[0_0_15px_#22c55e]" style={{ top: renderBirdY }} />
                  {renderPipes.map((p, i) => (
                    <div key={i}>
                      <div className="absolute w-[40px] bg-green-900/80 border-b-2 border-green-500 left-0" style={{ left: p.x, height: p.height, top: 0 }} />
                      <div className="absolute w-[40px] bg-green-900/80 border-t-2 border-green-500 left-0" style={{ left: p.x, top: p.height + GAP_SIZE, bottom: 0 }} />
                    </div>
                  ))}
                </div>
              )}

              {/* LEADERBOARD OVERLAY ON GAME OVER */}
              {flappyState === "gameover" && (
                <SecretLeaderboard 
                  score={flappyScore} 
                  gameMode="flappy" 
                  onReplay={startFlappy} 
                  onMenu={() => setActiveGame("menu")} 
                />
              )}
            </>
          )}
        </div>
      </div>
      <style jsx>{` @keyframes shrink { from { width: 100%; } to { width: 0%; } } `}</style>
    </div>
  );
}

// --- SUBCOMPONENTS FOR CLEANLINESS ---

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
  <div className="h-full flex flex-col items-center justify-center gap-4 animate-in fade-in">
    <h3 className="text-2xl font-bold text-green-500 uppercase">{title}</h3>
    <button onClick={onStart} className="w-full max-w-[200px] py-3 bg-green-600 hover:bg-green-500 text-black font-bold rounded">START MISSION</button>
    <button onClick={onMenu} className="text-xs text-gray-500 hover:text-white underline">Back to Menu</button>
  </div>
);