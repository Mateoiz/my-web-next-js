"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FaTimes, FaMicrochip, FaFeatherAlt, FaGamepad, FaTrophy } from "react-icons/fa";

// --- CONFIGURATION ---
const KONAMI_CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", 
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", 
  "b", "a"
];
const PRIZE_SCORE = 30;

// --- FLAPPY BIRD CONSTANTS ---
const GRAVITY = 0.5;        // Lowered slightly for better feel
const JUMP_STRENGTH = -8;
const PIPE_SPEED = 3;
const PIPE_SPAWN_RATE = 1800; 
const GAME_HEIGHT = 400;
const BIRD_SIZE = 30;
const GAP_SIZE = 140;       // Made gap slightly bigger for fairness

export default function SecretGame() {
  // --- GLOBAL STATE ---
  const [inputSequence, setInputSequence] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<"menu" | "override" | "flappy">("menu");
  const [prizeUnlocked, setPrizeUnlocked] = useState(false);
  const [showPrizeToast, setShowPrizeToast] = useState(false);

  // --- SYSTEM OVERRIDE STATE ---
  const [overrideState, setOverrideState] = useState<"idle" | "playing" | "gameover">("idle");
  const [overrideScore, setOverrideScore] = useState(0);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [roundId, setRoundId] = useState(0); 
  const overrideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const difficultyRef = useRef(2000);

  // --- FLAPPY BIRD STATE ---
  const [flappyState, setFlappyState] = useState<"idle" | "playing" | "gameover">("idle");
  // We use refs for physics state to avoid "stale closure" bugs in the loop
  const birdY = useRef(GAME_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipesRef = useRef<{ x: number; height: number; passed: boolean }[]>([]);
  const scoreRef = useRef(0);
  
  // These states are ONLY used for rendering
  const [renderBirdY, setRenderBirdY] = useState(GAME_HEIGHT / 2);
  const [renderPipes, setRenderPipes] = useState<{ x: number; height: number; passed: boolean }[]>([]);
  const [renderScore, setRenderScore] = useState(0);

  const gameLoopRef = useRef<number | null>(null);
  const pipeSpawnRef = useRef<NodeJS.Timeout | null>(null);

  // --------------------------------------------------------------------------
  // 1. GLOBAL: LISTEN FOR KONAMI CODE
  // --------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newSequence = [...inputSequence, e.key].slice(-10);
      setInputSequence(newSequence);

      if (JSON.stringify(newSequence) === JSON.stringify(KONAMI_CODE)) {
        setIsOpen(true);
        setActiveGame("menu");
        setInputSequence([]); 
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputSequence]);

  // --------------------------------------------------------------------------
  // 2. SHARED: PRIZE CHECKER
  // --------------------------------------------------------------------------
  const checkScore = (currentScore: number) => {
    if (currentScore === PRIZE_SCORE && !prizeUnlocked) {
      setPrizeUnlocked(true);
      setShowPrizeToast(true);
      setTimeout(() => setShowPrizeToast(false), 6000);
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
  // 3. GAME 1 LOGIC: SYSTEM OVERRIDE (Whack-a-Mole)
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
  // 4. GAME 2 LOGIC: FLAPPY GLITCH (FIXED)
  // --------------------------------------------------------------------------
  const startFlappy = () => {
    // 1. Reset Logic
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (pipeSpawnRef.current) clearInterval(pipeSpawnRef.current);

    setFlappyState("playing");
    
    // Reset Refs (Physics State)
    birdY.current = GAME_HEIGHT / 2;
    birdVelocity.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;

    // Reset Visual State
    setRenderBirdY(GAME_HEIGHT / 2);
    setRenderPipes([]);
    setRenderScore(0);

    // 2. Start Pipe Spawner
    pipeSpawnRef.current = setInterval(() => {
      // Spawn pipe far to the right (400px is game width)
      pipesRef.current.push({ 
        x: 400, 
        height: Math.random() * (GAME_HEIGHT - GAP_SIZE - 50) + 50, 
        passed: false 
      });
    }, PIPE_SPAWN_RATE);

    // 3. Start Game Loop
    gameLoopRef.current = requestAnimationFrame(flappyLoop);
  };

  const flappyLoop = () => {
    // A. Apply Physics
    birdVelocity.current += GRAVITY;
    birdY.current += birdVelocity.current;

    // B. Move Pipes
    pipesRef.current.forEach(pipe => {
      pipe.x -= PIPE_SPEED;
    });
    
    // Cleanup off-screen pipes
    if (pipesRef.current.length > 0 && pipesRef.current[0].x < -50) {
      pipesRef.current.shift();
    }

    // C. Collision Detection
    const birdTop = birdY.current;
    const birdBottom = birdY.current + BIRD_SIZE;
    const birdLeft = 50; 
    const birdRight = 50 + BIRD_SIZE;
    
    let collision = false;

    // Floor/Ceiling
    if (birdTop < 0 || birdBottom > GAME_HEIGHT) {
      collision = true;
    }

    // Pipes
    pipesRef.current.forEach(pipe => {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + 40; // Pipe width
      const gapTop = pipe.height;
      const gapBottom = pipe.height + GAP_SIZE;

      // Check horizontal overlap
      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        // Check vertical hit
        if (birdTop < gapTop || birdBottom > gapBottom) {
          collision = true;
        }
      }

      // Score Update
      if (!pipe.passed && birdLeft > pipeRight) {
        pipe.passed = true;
        scoreRef.current += 1;
        checkScore(scoreRef.current);
      }
    });

    // D. Update React State for Rendering
    // We update state every frame. React 18 handles this efficiently.
    setRenderBirdY(birdY.current);
    setRenderPipes([...pipesRef.current]); // Copy array to trigger re-render
    setRenderScore(scoreRef.current);

    // E. Decide Next Frame
    if (collision) {
      setFlappyState("gameover");
      if (pipeSpawnRef.current) clearInterval(pipeSpawnRef.current);
    } else {
      gameLoopRef.current = requestAnimationFrame(flappyLoop);
    }
  };

  const flappyJump = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent double firing on touch devices
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
                 className="relative w-full bg-zinc-900 border border-zinc-700 overflow-hidden cursor-pointer select-none"
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
                       {/* Top Pipe */}
                       <div 
                         className="absolute w-[40px] bg-green-900 border-b-4 border-green-500"
                         style={{ left: pipe.x + 'px', top: 0, height: pipe.height + 'px' }}
                       />
                       {/* Bottom Pipe */}
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