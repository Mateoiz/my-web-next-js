"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom"; 
import { 
  FaTimes, FaMicrochip, FaFeatherAlt, FaGamepad, FaTrophy, FaArrowLeft, 
  FaSun, FaMoon, FaPuzzlePiece, FaBug, FaTerminal, FaCode, FaWifi, 
  FaDatabase, FaShieldAlt, FaLock, FaKey, FaFingerprint, FaFan, FaPowerOff
} from "react-icons/fa";
import SecretLeaderboard from "./SecretLeaderboard"; 
import { useTheme } from "next-themes"; 

// --- CONFIGURATION ---
const KONAMI_CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
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

// Cyber Match Icons
const MATCH_ICONS = [FaBug, FaTerminal, FaCode, FaWifi, FaDatabase, FaShieldAlt, FaLock, FaKey];

// --- SOUND HOOK ---
const usePopSound = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio object - ensure file exists at /public/sounds/pop.mp3
    audioRef.current = new Audio("/sounds/pop.mp3");
    audioRef.current.volume = 0.5; 
  }, []);

  const playPop = useCallback(() => {
    if (audioRef.current) {
      // Clone allows rapid-fire overlapping sounds (polyphony)
      const soundClone = audioRef.current.cloneNode() as HTMLAudioElement;
      // Randomize pitch for "organic" silicone feel (0.8 to 1.2)
      soundClone.playbackRate = 0.8 + Math.random() * 0.4;
      soundClone.play().catch(() => {
        // Ignore auto-play errors if interaction hasn't happened yet
      });
    }
  }, []);

  return playPop;
};

export default function SecretGame() {
  // --- THEME STATE ---
  const { theme } = useTheme(); 
  const [internalTheme, setInternalTheme] = useState<"dark" | "light">("dark"); 

  // --- SOUND STATE ---
  const playPop = usePopSound(); // Initialize sound hook

  // --- GLOBAL STATE ---
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeGame, setActiveGame] = useState<"menu" | "override" | "flappy" | "match" | "fidget">("menu");
  const [showPrizeToast, setShowPrizeToast] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // --- INPUT TRACKING ---
  const [inputSequence, setInputSequence] = useState<string[]>([]);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

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
  const birdY = useRef(GAME_HEIGHT / 2);
  const birdVelocity = useRef(0);
  const pipesRef = useRef<{ x: number; height: number; passed: boolean }[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const pipeSpawnRef = useRef<NodeJS.Timeout | null>(null);
  const [renderBirdY, setRenderBirdY] = useState(GAME_HEIGHT / 2);
  const [renderPipes, setRenderPipes] = useState<{ x: number; height: number }[]>([]);

  // --- CYBER MATCH STATE ---
  const [matchState, setMatchState] = useState<"idle" | "playing" | "gameover">("idle");
  const [matchScore, setMatchScore] = useState(0);
  const [cards, setCards] = useState<{ id: number; iconIndex: number; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [isProcessingMatch, setIsProcessingMatch] = useState(false);

  // --- FIDGET STATE ---
  const [bubbles, setBubbles] = useState<boolean[]>(Array(25).fill(false));
  const [spinVelocity, setSpinVelocity] = useState(0);
  const spinRef = useRef(0);
  const spinLoopRef = useRef<number | null>(null);
  const [clickCount, setClickCount] = useState(0);

  // 1. MOUNTING EFFECT
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && theme) {
      setInternalTheme(theme === "dark" ? "dark" : "light");
    }
  }, [isOpen, theme]);

  // 2. INPUT LISTENERS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const newSeq = [...inputSequence, e.key].slice(-10);
      setInputSequence(newSeq);
      if (JSON.stringify(newSeq) === JSON.stringify(KONAMI_CODE)) openSecretMenu();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isOpen) return;
      const currentTime = Date.now();
      const timeDiff = currentTime - lastTapTimeRef.current;
      if (timeDiff > 400) tapCountRef.current = 0;
      tapCountRef.current += 1;
      lastTapTimeRef.current = currentTime;
      if (tapCountRef.current >= 5) {
        openSecretMenu();
        tapCountRef.current = 0;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, [inputSequence, isOpen]);

  // 3. NAVIGATION
  const openSecretMenu = () => {
    setIsOpen(true);
    setActiveGame("menu");
    setInputSequence([]);
    tapCountRef.current = 0;
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
    document.body.style.overflow = "hidden";
  };

  const closeGame = () => {
    setIsOpen(false);
    resetAllGames();
    document.body.style.overflow = "";
  };

  const returnToMenu = () => {
    resetAllGames();
    setActiveGame("menu");
  };

  const toggleInternalTheme = () => {
      const newTheme = internalTheme === "dark" ? "light" : "dark";
      setInternalTheme(newTheme);
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
    
    setMatchState("idle");
    setMatchScore(0);
    setCards([]);
    setFlippedIndices([]);
    setIsProcessingMatch(false);

    setBubbles(Array(25).fill(false));
    setSpinVelocity(0);
    setClickCount(0);
    if (spinLoopRef.current) cancelAnimationFrame(spinLoopRef.current);

    setShowPrizeToast(false);
  };

  const checkPrize = (score: number) => {
    if (score === PRIZE_SCORE) {
      setShowPrizeToast(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setTimeout(() => setShowPrizeToast(false), 5000);
    }
  };

  // --- GAME LOGIC: SYSTEM OVERRIDE ---
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

  // --- GAME LOGIC: FLAPPY GLITCH ---
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
      pipesRef.current.push({ x: 400, height: Math.random() * (GAME_HEIGHT - GAP_SIZE - 100) + 50, passed: false });
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
        setFlappyScore(s => { const newScore = s + 1; checkPrize(newScore); return newScore; });
      }
      if (pipe.x < -50) pipesRef.current.splice(i, 1);
    }
    const hitFloor = birdY.current + BIRD_SIZE - HITBOX_PADDING >= GAME_HEIGHT;
    const hitCeiling = birdY.current + HITBOX_PADDING <= 0;
    const hitPipe = pipesRef.current.some(p => {
        const pipeLeft = p.x; const pipeRight = p.x + 40;
        const birdLeft = 50 + HITBOX_PADDING; const birdRight = 50 + BIRD_SIZE - HITBOX_PADDING;
        const birdTop = birdY.current + HITBOX_PADDING; const birdBottom = birdY.current + BIRD_SIZE - HITBOX_PADDING;
        if (birdRight > pipeLeft && birdLeft < pipeRight) return birdTop < p.height || birdBottom > p.height + GAP_SIZE;
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

  // --- GAME LOGIC: CYBER MATCH ---
  const startCyberMatch = () => {
    setMatchState("playing");
    setMatchScore(0);
    setFlippedIndices([]);
    setIsProcessingMatch(false);
    const iconIndices = [...Array(8).keys(), ...Array(8).keys()];
    const shuffled = iconIndices.sort(() => Math.random() - 0.5).map((iconIndex, id) => ({ id, iconIndex, isFlipped: false, isMatched: false }));
    setCards(shuffled);
  };
  const handleCardClick = (index: number) => {
    if (isProcessingMatch || cards[index].isFlipped || cards[index].isMatched) return;
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);
    if (newFlipped.length === 2) {
        setIsProcessingMatch(true);
        setTimeout(() => {
            setCards(prev => {
                const next = [...prev];
                const [idx1, idx2] = newFlipped;
                if (next[idx1].iconIndex === next[idx2].iconIndex) {
                    next[idx1].isMatched = true; next[idx2].isMatched = true;
                    setMatchScore(s => s + 10);
                } else {
                    next[idx1].isFlipped = false; next[idx2].isFlipped = false;
                    setMatchScore(s => Math.max(0, s - 2));
                }
                if (next.every(c => c.isMatched)) {
                    checkPrize(matchScore + 10);
                    setTimeout(() => setMatchState("gameover"), 500);
                }
                return next;
            });
            setFlippedIndices([]);
            setIsProcessingMatch(false);
        }, 800);
    }
  };

  // --- GAME LOGIC: FIDGET MODE (UPDATED) ---
  const startFidget = () => {
    setSpinVelocity(0);
    spinRef.current = 0;
    if (spinLoopRef.current) cancelAnimationFrame(spinLoopRef.current);
    spinLoopRef.current = requestAnimationFrame(spinLoop);
  };

  // 1. Core pop logic (used by both click and swipe)
  const triggerPop = (index: number) => {
    if (!bubbles[index]) {
      playPop(); // Play sound
      const newBubbles = [...bubbles];
      newBubbles[index] = true;
      setBubbles(newBubbles);

      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
      
      // Reset if all are popped
      if (newBubbles.every(b => b)) {
          setTimeout(() => setBubbles(Array(25).fill(false)), 300);
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([50, 50, 50]);
      }
    }
  };

  // 2. Handle simple clicks
  const handleBubbleClick = (index: number) => {
    triggerPop(index);
  };

  // 3. Handle Swipe (Pointer Events)
  const handleBubbleSwipe = (e: React.PointerEvent) => {
    // Only if button is pressed (1) or it's a touch move
    if (e.buttons === 1 || e.type === 'touchmove') {
      e.preventDefault(); // Stop scrolling
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const indexAttr = target?.getAttribute("data-bubble-index");
      if (indexAttr) {
        triggerPop(parseInt(indexAttr));
      }
    }
  };

  const handleSpinClick = () => {
    setSpinVelocity(prev => Math.min(prev + 15, 60));
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(20);
  };

  const handleClicker = () => {
    playPop();
    setClickCount(c => c + 1);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(100);
  };

  const spinLoop = () => {
    setSpinVelocity(v => v * 0.98);
    spinRef.current += spinVelocity;
    spinLoopRef.current = requestAnimationFrame(spinLoop);
  };

  // 7. RENDER LOGIC
  if (!mounted || !isOpen) return null;

  const isDark = internalTheme === "dark";
  const bgClass = isDark ? "bg-black" : "bg-zinc-100";
  const textClass = isDark ? "text-green-500" : "text-zinc-900";
  const borderClass = isDark ? "border-green-500" : "border-zinc-300";
  const overlayBg = isDark ? "bg-black/95" : "bg-white/95";

  return createPortal(
    <div className={`fixed inset-0 z-[99999] flex items-center justify-center ${overlayBg} font-mono select-none touch-none animate-in fade-in duration-200 transition-colors duration-300`}>
      
      <div className={`relative w-full h-[100dvh] md:h-[700px] md:max-h-[90vh] md:max-w-md ${bgClass} md:border-2 ${borderClass} md:rounded-2xl shadow-[0_0_100px_rgba(34,197,94,0.2)] overflow-hidden flex flex-col transition-colors duration-300`}>
        
        {/* --- TOAST --- */}
        {showPrizeToast && (
          <div className="absolute top-16 left-4 right-4 z-[999999] bg-green-500 text-black p-4 rounded shadow-lg animate-bounce text-center">
            <h3 className="font-black flex justify-center gap-2"><FaTrophy /> PRIZE UNLOCKED!</h3>
            <p className="text-xs font-bold">Screenshot this!</p>
          </div>
        )}

        {/* --- HEADER --- */}
        <div className={`flex justify-between items-center px-4 py-4 md:py-4 border-b ${isDark ? 'border-green-500/30 bg-zinc-900/80' : 'border-zinc-300 bg-white/80'} backdrop-blur-md pt-safe transition-colors duration-300`}>
          <div className="flex items-center gap-3">
             {activeGame !== "menu" && (
                <button 
                  onClick={returnToMenu}
                  className={`p-2 rounded hover:bg-green-500/20 ${textClass} transition-colors active:scale-95`}
                  aria-label="Back to Menu"
                >
                    <FaArrowLeft size={18} />
                </button>
             )}
             <h2 className={`text-lg font-black tracking-tighter ${textClass} flex items-center gap-2`}>
               <FaMicrochip /> <span className="hidden sm:inline">SECRET</span> TERMINAL
             </h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={toggleInternalTheme}
                className={`p-2 rounded-full active:scale-95 transition-all ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
                aria-label="Toggle Theme"
            >
                {isDark ? <FaSun size={18} /> : <FaMoon size={18} />}
            </button>
            <button onClick={closeGame} className={`${textClass} hover:opacity-70 p-2 active:scale-95 transition-transform`}>
               <FaTimes size={24} />
            </button>
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className={`relative flex-1 ${bgClass} p-4 overflow-hidden flex flex-col items-center justify-center pb-safe transition-colors duration-300`}>
          
          {/* MENU (Fixed Scrolling) */}
          {activeGame === "menu" && (
            <div className="w-full max-w-xs flex flex-col gap-3 overflow-y-auto p-2 flex-1 min-h-0">
              <div className="text-center mb-2 shrink-0">
                 <div className={`inline-block p-4 rounded-full ${isDark ? 'bg-green-900/20' : 'bg-green-100'} mb-2 animate-pulse`}>
                    <FaGamepad className={`text-4xl ${isDark ? 'text-green-500' : 'text-green-600'}`} />
                 </div>
                 <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-800'} mb-1`}>ACCESS GRANTED</h3>
                 <p className={`text-xs ${isDark ? 'text-green-500/70' : 'text-zinc-500'} uppercase tracking-widest`}>Select Protocol</p>
              </div>
              
              <MenuButton icon={<FaGamepad />} title="SYSTEM OVERRIDE" desc="Reflex Test" onClick={() => setActiveGame("override")} isDark={isDark} />
              <MenuButton icon={<FaFeatherAlt />} title="FLAPPY GLITCH" desc="Endless Runner" onClick={() => setActiveGame("flappy")} isDark={isDark} />
              <MenuButton icon={<FaPuzzlePiece />} title="CYBER MATCH" desc="Memory Decryption" onClick={() => setActiveGame("match")} isDark={isDark} />
              <MenuButton icon={<FaFingerprint />} title="NEURAL FIDGET" desc="Stimulation Mode" onClick={() => { setActiveGame("fidget"); startFidget(); }} isDark={isDark} />
            </div>
          )}

          {/* GAME 1: OVERRIDE */}
          {activeGame === "override" && (
            <div className="w-full h-full flex flex-col">
              {overrideState === "idle" && <StartScreen onStart={startOverride} onMenu={returnToMenu} title="System Override" isDark={isDark} />}
              {overrideState === "playing" && (
                <div className="h-full flex flex-col w-full">
                  <div className={`flex justify-between ${isDark ? 'text-green-400' : 'text-green-600'} font-bold mb-4 items-end px-2`}>
                    <span className="text-xl font-mono">SCORE: {overrideScore}</span>
                    <div className={`flex-1 ml-4 h-2 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'} rounded-full mb-2 overflow-hidden relative`}>
                      <div className="absolute top-0 left-0 h-full bg-green-500" style={{ width: '100%', animation: `shrink ${difficultyRef.current}ms linear forwards` }} key={roundId} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 flex-1 pb-4" style={{ touchAction: 'none' }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        onPointerDown={(e) => handleOverrideClick(e, i)}
                        className={`rounded-xl border-2 cursor-pointer transition-all duration-75 active:scale-95 
                            ${activeCell === i 
                                ? "bg-green-500 border-green-400 shadow-[0_0_30px_#22c55e] z-10" 
                                : isDark 
                                    ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" 
                                    : "bg-white border-zinc-200 hover:border-zinc-300"
                            }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              {overrideState === "gameover" && <SecretLeaderboard score={overrideScore} gameMode="override" onReplay={startOverride} onMenu={returnToMenu} isDark={isDark} />}
            </div>
          )}

          {/* GAME 2: FLAPPY */}
          {activeGame === "flappy" && (
            <div className="w-full h-full relative flex flex-col">
              {flappyState === "idle" && <StartScreen onStart={startFlappy} onMenu={returnToMenu} title="Flappy Glitch" isDark={isDark} />}
              {flappyState === "playing" && (
                <div 
                  onPointerDown={flappyJump} 
                  className={`relative w-full flex-1 ${isDark ? 'bg-zinc-900/50 border-green-900/30' : 'bg-zinc-200/50 border-zinc-300'} cursor-pointer touch-none border rounded-lg overflow-hidden mb-safe`}
                >
                  {countdown !== null && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
                        <div className="text-8xl font-black text-green-500 animate-pulse">{countdown}</div>
                      </div>
                  )}
                  <div className={`absolute top-6 right-6 text-6xl font-black ${isDark ? 'text-white/10' : 'text-black/10'} pointer-events-none z-10 select-none`}>{flappyScore}</div>
                  <div className="absolute left-[50px] bg-green-500 border-2 border-white rounded-sm shadow-[0_0_15px_#22c55e] pointer-events-none transition-transform will-change-transform" style={{ top: renderBirdY, width: BIRD_SIZE, height: BIRD_SIZE, transform: `rotate(${Math.min(Math.max(birdVelocity.current * 3, -25), 25)}deg)`}} />
                  {renderPipes.map((p, i) => (
                    <div key={i} className="pointer-events-none">
                      <div className={`absolute w-[40px] ${isDark ? 'bg-green-900/80 border-green-500' : 'bg-green-600/80 border-green-400'} border-b-2 left-0`} style={{ left: p.x, height: p.height, top: 0 }} />
                      <div className={`absolute w-[40px] ${isDark ? 'bg-green-900/80 border-green-500' : 'bg-green-600/80 border-green-400'} border-t-2 left-0`} style={{ left: p.x, top: p.height + GAP_SIZE, bottom: 0 }} />
                    </div>
                  ))}
                  <div className="absolute bottom-0 w-full h-2 bg-green-500/30 pointer-events-none" />
                </div>
              )}
              {flappyState === "gameover" && <SecretLeaderboard score={flappyScore} gameMode="flappy" onReplay={startFlappy} onMenu={returnToMenu} isDark={isDark} />}
            </div>
          )}

          {/* GAME 3: CYBER MATCH */}
          {activeGame === "match" && (
            <div className="w-full h-full flex flex-col">
              {matchState === "idle" && <StartScreen onStart={startCyberMatch} onMenu={returnToMenu} title="Cyber Match" isDark={isDark} />}
              {matchState === "playing" && (
                <div className="h-full flex flex-col w-full">
                    <div className={`flex justify-between ${isDark ? 'text-green-400' : 'text-green-600'} font-bold mb-4 items-center px-2`}>
                        <span className="text-xl font-mono">SCORE: {matchScore}</span>
                        <span className="text-xs uppercase tracking-wider opacity-70">Find Pairs</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 flex-1 pb-4">
                        {cards.map((card, i) => {
                            const Icon = MATCH_ICONS[card.iconIndex];
                            return (
                                <div 
                                    key={card.id} 
                                    onClick={() => handleCardClick(i)}
                                    className={`relative rounded-lg cursor-pointer transition-all duration-300 transform preserve-3d
                                        ${card.isMatched ? 'opacity-50 scale-95 pointer-events-none' : ''}
                                        ${card.isFlipped ? 'rotate-y-180' : ''}
                                    `}
                                    style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
                                >
                                    <div className={`absolute inset-0 flex items-center justify-center rounded-lg border-2 
                                        ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200 border-zinc-300'}
                                        ${card.isFlipped ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
                                    >
                                        <FaMicrochip className={`text-2xl ${isDark ? 'text-zinc-800' : 'text-zinc-400'}`} />
                                    </div>
                                    <div className={`absolute inset-0 flex items-center justify-center rounded-lg border-2 
                                        ${isDark ? 'bg-green-900/20 border-green-500' : 'bg-green-100 border-green-400'}
                                        ${card.isFlipped ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
                                    >
                                        <Icon className={`text-3xl ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
              )}
              {matchState === "gameover" && <SecretLeaderboard score={matchScore} gameMode="override" onReplay={startCyberMatch} onMenu={returnToMenu} isDark={isDark} />}
            </div>
          )}

          {/* GAME 4: NEURAL FIDGET (UPDATED SWIPE LOGIC) */}
          {activeGame === "fidget" && (
            <div className="w-full h-full flex flex-col gap-6 overflow-y-auto pb-4 custom-scrollbar">
                {/* 1. BUBBLE WRAP */}
                <div 
                  className={`p-4 rounded-xl border ${isDark ? 'bg-zinc-900/50 border-green-500/30' : 'bg-zinc-100 border-zinc-300'}`}
                  onPointerMove={handleBubbleSwipe}
                  onPointerDown={handleBubbleSwipe}
                  style={{ touchAction: 'none' }} // Stops scrolling while swiping
                >
                    <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-green-500' : 'text-zinc-500'}`}>Binary Bubble Wrap (Swipe to Pop)</div>
                    <div className="grid grid-cols-5 gap-3">
                        {bubbles.map((popped, i) => (
                            <div 
                                key={i}
                                data-bubble-index={i}
                                onPointerDown={() => handleBubbleClick(i)}
                                className={`aspect-square rounded-full cursor-pointer transition-all duration-100 
                                    ${popped 
                                        ? (isDark ? 'bg-green-900/20 scale-90' : 'bg-zinc-300 scale-90') 
                                        : (isDark ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-zinc-400 shadow-sm')}
                                `}
                            />
                        ))}
                    </div>
                </div>

                {/* 2. VELOCITY SPINNER */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? 'bg-zinc-900/50 border-green-500/30' : 'bg-zinc-100 border-zinc-300'}`}>
                    <div className="flex-1">
                        <div className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-green-500' : 'text-zinc-500'}`}>Hyper Turbine</div>
                        <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Tap to accelerate</div>
                    </div>
                    <div 
                        onPointerDown={handleSpinClick}
                        className={`text-5xl cursor-pointer select-none transition-transform active:scale-95 ${isDark ? 'text-green-400' : 'text-zinc-700'}`}
                        style={{ transform: `rotate(${spinRef.current + spinVelocity * 5}deg)` }} 
                    >
                        <FaFan className={spinVelocity > 20 ? "animate-pulse" : ""} />
                    </div>
                </div>

                {/* 3. STRESS BUTTON */}
                <div className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all
                    ${isDark ? 'bg-zinc-900/50 border-green-500/30 hover:bg-green-900/20' : 'bg-zinc-100 border-zinc-300 hover:bg-zinc-200'}
                `}
                onPointerDown={handleClicker}
                >
                    <FaPowerOff className={`text-4xl ${isDark ? 'text-green-500' : 'text-zinc-600'}`} />
                    <div className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-black'}`}>{clickCount}</div>
                    <div className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Stress Capacitor</div>
                </div>
            </div>
          )}

        </div>
      </div>
      
      <style jsx>{` @keyframes shrink { from { width: 100%; } to { width: 0%; } } `}</style>
    </div>,
    document.body 
  );
}

// --- SUBCOMPONENTS ---

const MenuButton = ({ icon, title, desc, onClick, isDark }: any) => (
  <button onClick={onClick} className={`group w-full py-4 px-4 border ${isDark ? 'border-green-500/30 bg-zinc-900/50 hover:bg-green-500/20 text-green-500 hover:text-green-300' : 'border-zinc-300 bg-white hover:bg-green-50 text-zinc-800 hover:text-green-600'} rounded-xl flex items-center gap-4 transition-all active:scale-95 shadow-sm hover:shadow-[0_0_20px_rgba(34,197,94,0.1)] flex-shrink-0`}>
    <div className={`text-2xl p-3 rounded-lg border transition-colors ${isDark ? 'bg-black border-green-500/20 group-hover:border-green-500/50' : 'bg-zinc-100 border-zinc-200 group-hover:border-green-400'}`}>{icon}</div>
    <div className="text-left flex-1">
      <div className="font-black text-lg tracking-tight">{title}</div>
      <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'} font-bold uppercase tracking-wide group-hover:text-green-400`}>{desc}</div>
    </div>
    <div className="text-green-500/50 group-hover:translate-x-1 transition-transform">
        <FaArrowLeft className="rotate-180" />
    </div>
  </button>
);

const StartScreen = ({ onStart, onMenu, title, isDark }: any) => (
  <div className="h-full flex flex-col items-center justify-center gap-8 animate-in fade-in w-full pb-10">
    <div className="text-center space-y-2">
        <h3 className={`text-3xl md:text-4xl font-black ${isDark ? 'text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'text-green-600'} uppercase tracking-tighter`}>{title}</h3>
        <p className={`${isDark ? 'text-zinc-500' : 'text-zinc-400'} text-xs uppercase tracking-[0.2em]`}>Ready Player One</p>
    </div>
    
    <button onClick={onStart} className={`w-full max-w-[260px] py-4 ${isDark ? 'bg-green-600 hover:bg-green-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'} font-black rounded-xl hover:shadow-[0_0_50px_rgba(34,197,94,0.6)] transition-all active:scale-95 text-xl tracking-wide uppercase`}>
        Start Mission
    </button>
    
    <button onClick={onMenu} className={`flex items-center gap-2 px-6 py-3 rounded-full border ${isDark ? 'border-green-500/30 text-green-500 hover:bg-green-500/10' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'} text-xs font-bold transition-colors uppercase tracking-wider`}>
        <FaArrowLeft /> Abort
    </button>
  </div>
);