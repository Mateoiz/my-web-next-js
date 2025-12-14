"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FaTimes, FaMicrochip, FaFeatherAlt, FaGamepad, FaTrophy } from "react-icons/fa";

// --- CONFIGURATION ---
const KONAMI_CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", 
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", 
  "b", "a"
];
// Mobile Swipe Sequence: Up, Down, Left, Right
const MOBILE_CODE = ["UP", "DOWN", "LEFT", "RIGHT"];

const PRIZE_SCORE = 30;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 1800; 
const GAME_HEIGHT = 400;
const BIRD_SIZE = 30;
const GAP_SIZE = 140;

export default function SecretGame() {
  // --- GLOBAL STATE ---
  const [inputSequence, setInputSequence] = useState<string[]>([]);
  const [swipeSequence, setSwipeSequence] = useState<string[]>([]); // New State for Swipes
  const [isOpen, setIsOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<"menu" | "override" | "flappy">("menu");
  const [prizeUnlocked, setPrizeUnlocked] = useState(false);
  const [showPrizeToast, setShowPrizeToast] = useState(false);

  // --- TOUCH TRACKING REFS ---
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  // --- SYSTEM OVERRIDE STATE ---
  const [overrideState, setOverrideState] = useState<"idle" | "playing" | "gameover">("idle");
  const [overrideScore, setOverrideScore] = useState(0);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [roundId, setRoundId] = useState(0); 
  const overrideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const difficultyRef = useRef(2000);

  // --- FLAPPY BIRD STATE ---
  const [flappyState, setFlappyState] = useState<"idle" | "playing" | "gameover">("idle");
  const birdY = useRef(GAME_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipesRef = useRef<{ x: number; height: number; passed: boolean }[]>([]);
  const scoreRef = useRef(0);
  
  const [renderBirdY, setRenderBirdY] = useState(GAME_HEIGHT / 2);
  const [renderPipes, setRenderPipes] = useState<{ x: number; height: number; passed: boolean }[]>([]);
  const [renderScore, setRenderScore] = useState(0);

  const gameLoopRef = useRef<number | null>(null);
  const pipeSpawnRef = useRef<NodeJS.Timeout | null>(null);

  // --------------------------------------------------------------------------
  // 1. LISTEN FOR KONAMI CODE (DESKTOP)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newSequence = [...inputSequence, e.key].slice(-10);
      setInputSequence(newSequence);

      if (JSON.stringify(newSequence) === JSON.stringify(KONAMI_CODE)) {
        openSecretMenu();
        setInputSequence([]); 
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputSequence]);

  // --------------------------------------------------------------------------
  // 2. LISTEN FOR SWIPES (MOBILE)
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
      
      // Determine swipe direction (must be a significant swipe > 30px)
      let direction = "";
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal
        if (Math.abs(diffX) > 30) direction = diffX > 0 ? "RIGHT" : "LEFT";
      } else {
        // Vertical
        if (Math.abs(diffY) > 30) direction = diffY > 0 ? "DOWN" : "UP";
      }

      if (direction) {
        // Add to sequence
        setSwipeSequence(prev => {
          const newSeq = [...prev, direction].slice(-4); // Keep last 4 swipes
          
          // Check if it matches Up, Down, Left, Right
          if (JSON.stringify(newSeq) === JSON.stringify(MOBILE_CODE)) {
            openSecretMenu();
            return []; // Reset
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

  const openSecretMenu = () => {
    setIsOpen(true);
    setActiveGame("menu");
    // Haptic feedback if available
    if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(200); 
    }
  };

  // --------------------------------------------------------------------------
  // 3. PRIZE CHECKER
  // --------------------------------------------------------------------------
  const checkScore = (currentScore: number) => {
    if (currentScore === PRIZE_SCORE && !prizeUnlocked) {
      setPrizeUnlocked(true);
      setShowPrizeToast(true);
      setTimeout(() => setShowPrizeToast(false), 6000);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  };

  const closeGame = () => {
    setIsOpen(false);
    setActiveGame("menu");
    resetAllGames();
  };

  const backToMenu = () => {
    setActiveGame("menu");
    resetAllGames();
  };

  const resetAllGames = () => {
    // Override Cleanup
    setOverrideState("idle");
    if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    
    // Flappy Cleanup
    setFlappyState("idle");
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (pipeSpawnRef.current) clearInterval(pipeSpawnRef.current);
    setPrizeUnlocked(false);
    setShowPrizeToast(false);
  };

  // --------------------------------------------------------------------------
  // 4. GAME 1: SYSTEM OVERRIDE
  // --------------------------------------------------------------------------
  const nextOverrideRound = useCallback(() => {
    setActiveCell((prev) => {
      let next = Math.floor(Math.random() * 9);
      while (next === prev) next = Math.floor(Math.random() * 9);
      return next;
    });
    setRoundId((prev) => prev + 1);
    if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    
    overrideTimeoutRef.current = setTimeout(() => {
      setOverrideState("gameover");
      setActiveCell(null);
    }, difficultyRef.current);
  }, []);

  const startOverride = () => {
    setOverrideState("playing");
    setOverrideScore(0);
    difficultyRef.current = 2000;
    nextOverrideRound();
  };

  const handleOverrideClick = (index: number) => {
    if (overrideState !== "playing") return;
    if (index === activeCell) {
      const newScore = overrideScore + 1;
      setOverrideScore(newScore);
      checkScore(newScore);
      difficultyRef.current = Math.max(400, difficultyRef.current * 0.95);
      nextOverrideRound();
    } else {
      setOverrideState("gameover");
      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
    }
  };

  // --------------------------------------------------------------------------
  // 5. GAME 2: FLAPPY GLITCH
  // --------------------------------------------------------------------------
  const startFlappy = () => {
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (pipeSpawnRef.current) clearInterval(pipeSpawnRef.current);

    setFlappyState("playing");
    birdY.current = GAME_HEIGHT / 2;
    birdVelocity.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;

    setRenderBirdY(GAME_HEIGHT / 2);
    setRenderPipes([]);
    setRenderScore(0);

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

    pipesRef.current.forEach(pipe => {
      pipe.x -= PIPE_SPEED;
    });
    
    if (pipesRef.current.length > 0 && pipesRef.current[0].x < -50) {
      pipesRef.current.shift();
    }

    const birdTop = birdY.current;
    const birdBottom = birdY.current + BIRD_SIZE;
    const birdLeft = 50; 
    const birdRight = 50 + BIRD_SIZE;
    
    let collision = false;

    if (birdTop < 0 || birdBottom > GAME_HEIGHT) collision = true;

    pipesRef.current.forEach(pipe => {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + 40; 
      const gapTop = pipe.height;
      const gapBottom = pipe.height + GAP_SIZE;

      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        if (birdTop < gapTop || birdBottom > gapBottom) {
          collision = true;
        }
      }

      if (!pipe.passed && birdLeft > pipeRight) {
        pipe.passed = true;
        scoreRef.current += 1;
        checkScore(scoreRef.current);
      }
    });

    setRenderBirdY(birdY.current);
    setRenderPipes([...pipesRef.current]);
    setRenderScore(scoreRef.current);

    if (collision) {
      setFlappyState("gameover");
      if (pipeSpawnRef.current) clearInterval(pipeSpawnRef.current);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
    } else {
      gameLoopRef.current = requestAnimationFrame(flappyLoop);
    }
  };

  const flappyJump = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent default to stop scrolling/zooming while tapping
    if(e.cancelable) e.preventDefault(); 
    if (flappyState === "playing") {
      birdVelocity.current = JUMP_STRENGTH;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 font-mono select-none">
      <div className="relative w-full max-w-md bg-black border-2 border-green-500 p-6 rounded-xl shadow-[0_0_50px_rgba(34,197,94,0.3)] overflow-hidden">
        
        {/* --- PRIZE NOTIFICATION --- */}
        {showPrizeToast && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-green-500 text-black p-4 rounded shadow-lg animate-bounce text-center">
            <h3 className="font-black text-xl flex items-center justify-center gap-2">
               <FaTrophy /> PRIZE UNLOCKED!
            </h3>
            <p className="text-sm font-bold leading-tight">
              Screenshot this screen and claim your free prize from an officer!
            </p>
          </div>
        )}

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 border-b border-green-500/30 pb-4">
          <h2 className="text-xl font-bold text-green-500 flex items-center gap-2">
            <FaMicrochip /> SECRET TERMINAL
          </h2>
          <button onClick={closeGame} className="text-green-500 hover:text-white transition-colors">
            <FaTimes size={24} />
          </button>
        </div>

        {/* ========================================================== */}
        {/* MENU SCREEN                                                */}
        {/* ========================================================== */}
        {activeGame === "menu" && (
          <div className="text-center space-y-6 py-4">
            <p className="text-gray-400">Select infiltration method:</p>
            
            <button 
              onClick={() => setActiveGame("override")}
              className="group w-full py-4 border border-green-500/50 hover:bg-green-500/10 text-green-400 hover:text-white rounded transition-all flex items-center justify-center gap-3"
            >
              <FaGamepad size={24} />
              <div className="text-left">
                <div className="font-bold text-lg">SYSTEM OVERRIDE</div>
                <div className="text-xs text-gray-500 group-hover:text-green-300">Fast-paced Reflex Test</div>
              </div>
            </button>

            <button 
              onClick={() => setActiveGame("flappy")}
              className="group w-full py-4 border border-green-500/50 hover:bg-green-500/10 text-green-400 hover:text-white rounded transition-all flex items-center justify-center gap-3"
            >
              <FaFeatherAlt size={24} />
              <div className="text-left">
                <div className="font-bold text-lg">FLAPPY GLITCH</div>
                <div className="text-xs text-gray-500 group-hover:text-green-300">Precision Flight Test</div>
              </div>
            </button>
          </div>
        )}

        {/* ========================================================== */}
        {/* GAME 1: SYSTEM OVERRIDE                                    */}
        {/* ========================================================== */}
        {activeGame === "override" && (
          <div>
            {overrideState === "idle" && (
               <div className="text-center py-8">
                 <button onClick={startOverride} className="w-full py-4 bg-green-600 hover:bg-green-500 text-black font-bold text-xl rounded uppercase tracking-widest">
                    Start Override
                 </button>
                 <button onClick={backToMenu} className="mt-4 text-sm text-gray-500 hover:text-white underline">Back to Menu</button>
               </div>
            )}

            {overrideState === "playing" && (
              <div className="space-y-6">
                <div className="flex justify-between text-green-400 font-bold">
                  <span>SCORE: {overrideScore}</span>
                  <div className="h-2 w-32 bg-zinc-800 rounded-full overflow-hidden relative">
                    <div 
                      key={roundId} 
                      className="absolute top-0 left-0 h-full bg-green-500"
                      style={{ width: '100%', animation: `shrink ${difficultyRef.current}ms linear forwards` }} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      onMouseDown={(e) => { e.preventDefault(); handleOverrideClick(i); }}
                      className={`aspect-square rounded border-2 cursor-pointer transition-colors duration-75 ${
                        activeCell === i ? "bg-green-500 border-green-400 shadow-[0_0_20px_#22c55e]" : "bg-black border-zinc-800"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {overrideState === "gameover" && (
              <div className="text-center space-y-4 py-6">
                <h3 className="text-3xl font-bold text-red-500">FAILURE</h3>
                <div className="text-6xl text-white font-black">{overrideScore}</div>
                <div className="flex gap-4">
                   <button onClick={backToMenu} className="flex-1 py-3 border border-zinc-700 text-gray-400 hover:text-white rounded">Menu</button>
                   <button onClick={startOverride} className="flex-1 py-3 bg-green-600 text-black font-bold rounded">Retry</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* GAME 2: FLAPPY GLITCH                                      */}
        {/* ========================================================== */}
        {activeGame === "flappy" && (
          <div>
            {flappyState === "idle" && (
               <div className="text-center py-8">
                 <button onClick={startFlappy} className="w-full py-4 bg-green-600 hover:bg-green-500 text-black font-bold text-xl rounded uppercase tracking-widest">
                    Start Flight
                 </button>
                 <p className="mt-4 text-xs text-gray-500">Click or Tap to Jump</p>
                 <button onClick={backToMenu} className="mt-4 text-sm text-gray-500 hover:text-white underline">Back to Menu</button>
               </div>
            )}

            {flappyState === "playing" && (
               <div 
                 onMouseDown={flappyJump}
                 onTouchStart={flappyJump}
                 className="relative w-full bg-zinc-900 border border-zinc-700 overflow-hidden cursor-pointer select-none touch-none"
                 style={{ height: GAME_HEIGHT + 'px' }}
               >
                 {/* Score Overlay */}
                 <div className="absolute top-4 right-4 z-20 text-4xl font-black text-white/50">{renderScore}</div>

                 {/* The Bird */}
                 <div 
                   className="absolute left-[50px] w-[30px] h-[30px] bg-green-500 border-2 border-white rounded-sm shadow-[0_0_15px_#22c55e]"
                   style={{ top: renderBirdY + 'px' }}
                 />

                 {/* The Pipes */}
                 {renderPipes.map((pipe, i) => (
                    <div key={i}>
                       <div 
                         className="absolute w-[40px] bg-green-900 border-b-4 border-green-500"
                         style={{ left: pipe.x + 'px', top: 0, height: pipe.height + 'px' }}
                       />
                       <div 
                         className="absolute w-[40px] bg-green-900 border-t-4 border-green-500"
                         style={{ left: pipe.x + 'px', top: (pipe.height + GAP_SIZE) + 'px', bottom: 0 }}
                       />
                    </div>
                 ))}
               </div>
            )}

            {flappyState === "gameover" && (
              <div className="text-center space-y-4 py-6">
                <h3 className="text-3xl font-bold text-red-500">CRASHED</h3>
                <div className="text-6xl text-white font-black">{renderScore}</div>
                <div className="flex gap-4">
                   <button onClick={backToMenu} className="flex-1 py-3 border border-zinc-700 text-gray-400 hover:text-white rounded">Menu</button>
                   <button onClick={startFlappy} className="flex-1 py-3 bg-green-600 text-black font-bold rounded">Retry</button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}