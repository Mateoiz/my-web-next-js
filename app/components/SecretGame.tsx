"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FaTimes, FaMicrochip } from "react-icons/fa";

// KONAMI CODE SEQUENCE
const KONAMI_CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", 
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", 
  "b", "a"
];

export default function SecretGame() {
  const [inputSequence, setInputSequence] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  
  // 'roundId' forces the CSS timer to reset without complex React logic
  const [roundId, setRoundId] = useState(0);

  // Refs store data without causing re-renders
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const difficultyRef = useRef(2000); // Start with 2 seconds

  // --- 1. LISTEN FOR SECRET CODE ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newSequence = [...inputSequence, e.key].slice(-10);
      setInputSequence(newSequence);

      if (JSON.stringify(newSequence) === JSON.stringify(KONAMI_CODE)) {
        setIsOpen(true);
        setInputSequence([]); 
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputSequence]);

  // --- 2. OPTIMIZED GAME LOGIC ---
  
  // This function only runs ONCE per round (Optimization)
  const nextRound = useCallback(() => {
    // Pick a new random cell different from the last one
    setActiveCell((prev) => {
      let next = Math.floor(Math.random() * 9);
      while (next === prev) next = Math.floor(Math.random() * 9);
      return next;
    });
    
    // Increment ID to restart the CSS animation instantly
    setRoundId((prev) => prev + 1);

    // Clear old timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Set a single timer for Game Over. 
    // This is the huge optimization: No intervals running in background.
    timeoutRef.current = setTimeout(() => {
      setGameState("gameover");
      setActiveCell(null);
    }, difficultyRef.current);

  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    difficultyRef.current = 2000;
    nextRound();
  };

  const handleCellClick = (index: number) => {
    if (gameState !== "playing") return;

    if (index === activeCell) {
      // Correct Click
      setScore((s) => s + 1);
      // Increase speed (make time shorter)
      difficultyRef.current = Math.max(400, difficultyRef.current * 0.95);
      nextRound();
    } else {
      // Wrong Click
      setGameState("gameover");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  const closeGame = () => {
    setIsOpen(false);
    setGameState("idle");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 font-mono select-none">
      <div className="relative w-full max-w-md bg-black border-2 border-green-500 p-6 rounded-xl shadow-[0_0_50px_rgba(34,197,94,0.3)]">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-green-500/30 pb-4">
          <h2 className="text-2xl font-bold text-green-500 flex items-center gap-2">
            <FaMicrochip /> SYSTEM OVERRIDE
          </h2>
          <button onClick={closeGame} className="text-green-500 hover:text-white">
            <FaTimes size={24} />
          </button>
        </div>

        {/* --- IDLE SCREEN --- */}
        {gameState === "idle" && (
          <div className="text-center space-y-6 py-8">
            <p className="text-gray-400">Security Protocols Bypassed.</p>
            <button 
              onClick={startGame}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-black font-bold text-xl rounded uppercase tracking-widest transition-transform hover:scale-105"
            >
              Initiate Hack
            </button>
          </div>
        )}

        {/* --- PLAYING SCREEN --- */}
        {gameState === "playing" && (
          <div className="space-y-6">
            <div className="flex justify-between text-green-400 font-bold">
              <span>DECRYPTING...</span>
              <span>SCORE: {score}</span>
            </div>
            
            {/* OPTIMIZED TIMER BAR (CSS Animation) */}
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden relative">
              <div 
                key={roundId} // Resets animation when roundId changes
                className="absolute top-0 left-0 h-full bg-green-500"
                style={{ 
                  width: '100%',
                  // The browser handles this animation smoothly on the GPU
                  animation: `shrink ${difficultyRef.current}ms linear forwards`
                }} 
              />
            </div>

            {/* Game Grid */}
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  onMouseDown={(e) => { e.preventDefault(); handleCellClick(i); }}
                  className={`
                    aspect-square rounded border-2 cursor-pointer transition-colors duration-75
                    ${activeCell === i 
                      ? "bg-green-500 border-green-400 shadow-[0_0_20px_#22c55e]" 
                      : "bg-black border-zinc-800 hover:border-zinc-600"
                    }
                  `}
                />
              ))}
            </div>
          </div>
        )}

        {/* --- GAME OVER SCREEN --- */}
        {gameState === "gameover" && (
          <div className="text-center space-y-6 py-8">
            <h3 className="text-3xl font-bold text-red-500">ACCESS DENIED</h3>
            <div className="text-6xl text-white font-black">{score}</div>
            <div className="flex gap-4">
              <button onClick={closeGame} className="flex-1 py-3 border border-zinc-700 text-gray-400 hover:text-white rounded">Exit</button>
              <button onClick={startGame} className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-black font-bold rounded">Retry</button>
            </div>
          </div>
        )}
        
      </div>
      
      {/* CSS Keyframe for the timer */}
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}