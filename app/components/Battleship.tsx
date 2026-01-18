"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCrosshairs, FaSkull, FaShip, FaRocket, FaEye, 
  FaWater, FaBullseye, FaFire, FaSyncAlt, FaWifi, 
  FaArrowLeft, FaMoon, FaSun, FaShieldAlt 
} from "react-icons/fa";
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/db";

// --- IMPORT YOUR SYSTEM COMPONENTS ---
// Ensure these paths match your project structure
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor";

// --- CONFIG ---
const BOARD_SIZE = 10;
const SHIPS = [
  { name: "Carrier", size: 5, icon: <FaShip /> },
  { name: "Battleship", size: 4, icon: <FaRocket className="rotate-45" /> },
  { name: "Cruiser", size: 3, icon: <FaRocket /> },
  { name: "Submarine", size: 3, icon: <FaShip className="scale-75" /> },
  { name: "Destroyer", size: 2, icon: <FaShip className="scale-50" /> },
];

// --- TYPES ---
type PlayerRole = 'HOST' | 'GUEST';
interface ShipPlacement { name: string; coords: number[]; }
interface GameState {
  status: 'LOBBY' | 'SETUP' | 'BATTLE' | 'FINISHED';
  turn: PlayerRole;
  winner: PlayerRole | null;
  hostShips: ShipPlacement[]; guestShips: ShipPlacement[];
  hostShots: number[]; guestShots: number[]; 
  hostReady: boolean; guestReady: boolean;
  lastAction?: string; turnCount: number;
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function BattleshipPage() {
  // Theme State (Default to Dark)
  const [isDark, setIsDark] = useState(true);

  // Toggle Logic
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <section className="min-h-screen relative overflow-hidden transition-colors duration-500 bg-zinc-50 dark:bg-black font-sans">
      
      {/* --- BACKGROUND SYSTEM --- */}
      <CircuitCursor />
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50 dark:opacity-100">
         <FloatingCubes />
      </div>
      
      {/* Gradient Overlay for Depth */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-100/40 dark:from-green-900/10 to-transparent pointer-events-none z-0" />

      {/* --- HEADER / NAVIGATION --- */}
      <div className="absolute top-0 left-0 w-full z-50 p-6 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-green-400 font-bold hover:scale-105 transition-transform shadow-sm">
            <FaArrowLeft size={12} /> <span className="text-xs uppercase tracking-widest">Abort Mission</span>
        </Link>

        <button 
            onClick={() => setIsDark(!isDark)}
            className="p-3 rounded-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-yellow-400 hover:scale-110 transition-transform shadow-sm"
        >
            {isDark ? <FaSun /> : <FaMoon />}
        </button>
      </div>

      {/* --- GAME CONTAINER --- */}
      <div className="relative z-10 container mx-auto px-4 pt-24 pb-12 flex flex-col items-center justify-center min-h-screen">
         <BattleshipGame />
      </div>

    </section>
  );
}

// ==========================================
// GAME COMPONENT (The "System")
// ==========================================
function BattleshipGame() {
  const [roomId, setRoomId] = useState("");
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  
  // Setup State
  const [placingShipIdx, setPlacingShipIdx] = useState(0);
  const [orientation, setOrientation] = useState<'H' | 'V'>('H');
  const [myShips, setMyShips] = useState<ShipPlacement[]>([]);
  
  // Battle State
  const [viewingMyBoard, setViewingMyBoard] = useState(false);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Feedback State
  const [hudMessage, setHudMessage] = useState("SYSTEM READY");
  const [hudStatus, setHudStatus] = useState<'idle' | 'alert' | 'success'>('idle');

  const prevTurnCountRef = useRef(0);

  // --- GAME SYNC ---
  useEffect(() => {
    if (!roomId || !role) return;
    const unsub = onSnapshot(doc(db, "battleship", roomId), (d) => {
      if (d.exists()) {
        const data = d.data() as GameState;
        
        // Handle Turn Changes / Feedback
        if (data.status === 'BATTLE' && data.turnCount !== prevTurnCountRef.current) {
            const isMyTurn = data.turn === role;
            const action = data.lastAction || "";
            
            if (action.includes("HIT") || action.includes("SUNK")) {
                if (isMyTurn) {
                    setHudMessage(`TARGET CONFIRMED: ${action}`);
                    setHudStatus('success');
                } else {
                    setHudMessage("WARNING: HULL BREACH DETECTED");
                    setHudStatus('alert');
                }
            } else if (action === "MISS") {
                 setHudMessage(isMyTurn ? "SHOT MISSED." : "ENEMY MISSED.");
                 setHudStatus('idle');
            } else {
                 setHudMessage(isMyTurn ? "AWAITING COORDINATES" : "INCOMING TRANSMISSION...");
                 setHudStatus('idle');
            }

            // Auto-switch view logic
            setTimeout(() => {
                setViewingMyBoard(!isMyTurn);
                setSelectedTile(null);
            }, 1500);

            prevTurnCountRef.current = data.turnCount;
        }

        setGame(data);
        if (data.status === 'SETUP' && data.hostReady && data.guestReady && role === 'HOST') {
           updateDoc(doc(db, "battleship", roomId), { status: 'BATTLE' });
        }
      }
    });
    return () => unsub();
  }, [roomId, role]);

  // --- ACTIONS ---
  const createRoom = async () => { 
    setLoading(true);
    const id = Math.random().toString(36).substring(2, 6).toUpperCase();
    await setDoc(doc(db, "battleship", id), {
      status: 'LOBBY', turn: 'HOST', winner: null,
      hostShips: [], guestShips: [], hostShots: [], guestShots: [],
      hostReady: false, guestReady: false, turnCount: 0
    });
    setRoomId(id); setRole('HOST'); setLoading(false);
  };

  const joinRoom = async () => { 
    if (!roomId) return;
    setLoading(true);
    const ref = doc(db, "battleship", roomId);
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().status === 'LOBBY') {
      await updateDoc(ref, { status: 'SETUP' });
      setRole('GUEST');
    } else { alert("Invalid Room"); }
    setLoading(false);
  };

  const handlePlaceShip = (index: number) => {
    if (placingShipIdx >= SHIPS.length) return;
    const currentShip = SHIPS[placingShipIdx];
    const coords = [];
    const x = index % BOARD_SIZE;
    const y = Math.floor(index / BOARD_SIZE);

    for (let i = 0; i < currentShip.size; i++) {
        if (orientation === 'H') {
            if (x + i >= BOARD_SIZE) return;
            coords.push(index + i);
        } else {
            if (y + i >= BOARD_SIZE) return;
            coords.push(index + (i * BOARD_SIZE));
        }
    }
    
    if (coords.some(c => myShips.flatMap(s => s.coords).includes(c))) return;
    setMyShips([...myShips, { name: currentShip.name, coords }]);
    setPlacingShipIdx(prev => prev + 1);
  };

  const confirmPlacement = async () => {
    if (!role || !roomId) return;
    const field = role === 'HOST' ? 'host' : 'guest';
    await updateDoc(doc(db, "battleship", roomId), { [`${field}Ships`]: myShips, [`${field}Ready`]: true });
  };

  const executeFire = async () => {
    if (selectedTile === null || !game || game.turn !== role) return;
    const index = selectedTile;
    const myShots = role === 'HOST' ? game.hostShots : game.guestShots;
    const newShots = [...myShots, index];
    const enemyShips = role === 'HOST' ? game.guestShips : game.hostShips;
    const hitShip = enemyShips.find(s => s.coords.includes(index));
    const isHit = !!hitShip;
    let action = isHit ? "HIT" : "MISS";
    if (isHit && hitShip && hitShip.coords.every(c => newShots.includes(c))) action = `SUNK: ${hitShip.name}`;
    const allSunk = enemyShips.every(s => s.coords.every(c => newShots.includes(c)));
    
    setSelectedTile(null); 
    await updateDoc(doc(db, "battleship", roomId), {
      [`${role === 'HOST' ? 'host' : 'guest'}Shots`]: newShots,
      lastAction: action,
      turn: !isHit ? (role === 'HOST' ? 'GUEST' : 'HOST') : role,
      turnCount: (game.turnCount || 0) + 1,
      ...(allSunk && { status: 'FINISHED', winner: role })
    });
  };

  // --- HELPERS ---
  const isShipSunk = (ship: ShipPlacement, shots: number[]) => ship.coords.every(c => shots.includes(c));
  const getCellStatus = (index: number, isEnemyBoard: boolean) => {
    if (!game) return 'empty';
    const ships = isEnemyBoard ? (role === 'HOST' ? game.guestShips : game.hostShips) : (role === 'HOST' ? game.hostShips : game.guestShips);
    const shots = isEnemyBoard ? (role === 'HOST' ? game.hostShots : game.guestShots) : (role === 'HOST' ? game.guestShots : game.hostShots);
    const isHit = shots.includes(index);
    const ship = ships.find(s => s.coords.includes(index));
    if (isHit && ship) return isShipSunk(ship, shots) ? 'sunk' : 'hit';
    if (isHit && !ship) return 'miss';
    if (!isHit && ship && !isEnemyBoard) return 'ship';
    return 'water';
  };

  // --- RENDER SCREENS ---
  if (!game || !role) return <LobbyScreen createRoom={createRoom} joinRoom={joinRoom} roomId={roomId} setRoomId={setRoomId} loading={loading} />;
  if (game.status === 'LOBBY') return <WaitingScreen roomId={roomId} />;
  if (game.status === 'FINISHED') return <ResultScreen winner={game.winner} role={role} />;

  const isMyTurn = game.turn === role;

  // --- SETUP PHASE ---
  if (game.status === 'SETUP') {
     const isReady = role === 'HOST' ? game.hostReady : game.guestReady;
     if (isReady) return <div className="text-center pt-20 text-blue-600 dark:text-green-500 font-mono animate-pulse tracking-widest text-xl font-bold">ESTABLISHING SECURE UPLINK...</div>;
     
     const currentShip = SHIPS[placingShipIdx];

     return (
        <div className="w-full max-w-lg mx-auto flex flex-col gap-6 font-mono pb-24 md:pb-4">
            {/* SETUP HEADER */}
            <div className="bg-white/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xl backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-blue-600 dark:text-green-500 font-black tracking-widest text-lg">FLEET DEPLOYMENT</h2>
                    <div className="text-xs text-zinc-500 font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        UNIT {placingShipIdx + 1} / {SHIPS.length}
                    </div>
                </div>

                {currentShip ? (
                    <div className="flex items-center gap-4 bg-zinc-50 dark:bg-black/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/50">
                        <div className="p-3 bg-white dark:bg-zinc-800/50 rounded-lg text-blue-500 dark:text-green-400 text-3xl shadow-sm">
                            {currentShip.icon}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-zinc-800 dark:text-zinc-200 font-bold text-lg tracking-wide">{currentShip.name}</h3>
                            <div className="flex gap-1.5 mt-2">
                                {Array.from({length: currentShip.size}).map((_, i) => (
                                    <div key={i} className="w-3 h-3 bg-blue-400/50 dark:bg-green-600/50 rounded-sm" />
                                ))}
                            </div>
                        </div>
                        <button 
                            onClick={() => setOrientation(o => o === 'H' ? 'V' : 'H')} 
                            className="flex flex-col items-center justify-center bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-95 transition-all text-blue-600 dark:text-green-400 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm min-w-[80px]"
                        >
                            <FaSyncAlt className="text-xl mb-1" />
                            <span className="text-[10px] font-bold">{orientation === 'H' ? 'HORZ' : 'VERT'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="p-4 text-center text-blue-500 dark:text-green-500 font-bold text-lg bg-blue-500/10 dark:bg-green-500/10 rounded-xl border border-blue-500/20 dark:border-green-500/20">
                        DEPLOYMENT COMPLETE
                    </div>
                )}
            </div>
            
            {/* SETUP BOARD */}
            <div className="relative w-full bg-white dark:bg-zinc-950 border-4 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden aspect-square">
                 <div className="absolute inset-0 grid gap-px bg-blue-100 dark:bg-green-900/20" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}>
                     {Array.from({ length: 100 }).map((_, i) => (
                        <div key={i} onClick={() => handlePlaceShip(i)} className={`relative bg-zinc-100 dark:bg-zinc-900/95 transition-colors ${myShips.some(s => s.coords.includes(i)) ? 'bg-blue-500/30 dark:bg-green-500/30' : ''}`}>
                            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-700" />
                            </div>
                            {myShips.some(s => s.coords.includes(i)) && (
                                <div className="absolute inset-0 border-2 border-blue-500 dark:border-green-500 bg-blue-500/20 dark:bg-green-500/20" />
                            )}
                        </div>
                     ))}
                 </div>
            </div>

            {/* CONTROLS */}
            <div className="flex gap-3 fixed bottom-0 left-0 w-full p-4 bg-white/90 dark:bg-black/90 backdrop-blur-md md:static md:bg-transparent md:p-0 z-50 border-t border-zinc-200 dark:border-zinc-800 md:border-none">
                <button onClick={() => {setMyShips([]); setPlacingShipIdx(0)}} className="flex-1 py-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold font-mono border border-red-200 dark:border-red-900/30 rounded-xl active:scale-95 transition-all uppercase text-sm">Reset</button>
                <button onClick={confirmPlacement} disabled={placingShipIdx < SHIPS.length} className="flex-[2] py-4 bg-blue-600 dark:bg-green-600 text-white dark:text-black font-black font-mono border border-blue-500 dark:border-green-500 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all uppercase tracking-widest text-base shadow-lg shadow-blue-500/20 dark:shadow-green-900/20">
                    {placingShipIdx < SHIPS.length ? "Deploying..." : "Confirm Deployment"}
                </button>
            </div>
        </div>
     )
  }

  // --- BATTLE RENDER ---
  const enemyShips = role === 'HOST' ? game.guestShips : game.hostShips;
  const myShots = role === 'HOST' ? game.hostShots : game.guestShots;

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 font-mono pb-24 md:pb-4 relative min-h-[85vh]">
        
        {/* HUD */}
        <div className={`p-4 rounded-xl border-2 transition-all duration-300 flex justify-between items-center shadow-lg backdrop-blur-sm ${
            hudStatus === 'alert' ? 'bg-red-100/80 dark:bg-red-950/40 border-red-500/50' : 
            hudStatus === 'success' ? 'bg-blue-100/80 dark:bg-green-950/40 border-blue-500/50 dark:border-green-500/50' : 'bg-white/80 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
        }`}>
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex justify-between text-[10px] text-zinc-500 tracking-[0.2em] mb-1 font-bold">
                    <span>CMD LINE</span>
                    <span>TURN: {String(game.turnCount).padStart(3, '0')}</span>
                </div>
                <div className={`text-sm md:text-base font-bold truncate ${
                    hudStatus === 'alert' ? 'text-red-600 dark:text-red-400 animate-pulse' : 
                    hudStatus === 'success' ? 'text-blue-600 dark:text-green-400' : 'text-zinc-800 dark:text-zinc-200'
                }`}>
                    {hudMessage}
                </div>
            </div>
            <div className="pl-3 border-l border-zinc-300 dark:border-zinc-700/50 ml-2">
                <button 
                    onClick={() => setViewingMyBoard(!viewingMyBoard)} 
                    className="h-12 w-12 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-400 active:text-white active:border-blue-500 dark:active:border-green-500 active:bg-zinc-700 transition-all shadow-sm"
                >
                    {viewingMyBoard ? <FaCrosshairs size={20} /> : <FaEye size={20} />}
                </button>
            </div>
        </div>

        {/* SHIP STATUS ROW */}
        {!viewingMyBoard && (
            <div className="flex justify-between px-3 py-2 bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 items-center overflow-x-auto shadow-sm">
                {enemyShips.map((ship, i) => {
                    const isSunk = isShipSunk(ship, myShots);
                    return (
                        <div key={i} className={`transition-all duration-500 flex flex-col items-center gap-1 min-w-[40px] ${isSunk ? 'text-red-500 dark:text-red-900 opacity-40 grayscale' : 'text-blue-500 dark:text-green-600'}`}>
                            <div className="text-xl">{SHIPS.find(s => s.name === ship.name)?.icon}</div>
                            {!isSunk && <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-green-500 rounded-full" />}
                        </div>
                    );
                })}
            </div>
        )}

        {/* THE BOARD */}
        <div className="relative w-full aspect-square bg-zinc-100 dark:bg-zinc-950 border-4 border-zinc-300 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="absolute top-3 left-3 z-20 pointer-events-none">
                <span className={`text-[10px] font-bold px-2 py-1 rounded border shadow-sm backdrop-blur-sm ${
                    viewingMyBoard 
                    ? 'bg-blue-100/90 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/50' 
                    : 'bg-red-100/90 dark:bg-red-900/80 text-red-700 dark:text-red-300 border-red-300 dark:border-red-500/50'
                }`}>
                    {viewingMyBoard ? "HOME SECTOR" : "HOSTILE SECTOR"}
                </span>
            </div>

            <div className="absolute inset-0 grid gap-px bg-blue-200/50 dark:bg-green-900/30" style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)` }}>
                {Array.from({ length: 100 }).map((_, i) => {
                    const status = getCellStatus(i, !viewingMyBoard);
                    const isSelected = selectedTile === i;
                    
                    return (
                        <button
                            key={i}
                            disabled={viewingMyBoard || !isMyTurn || status !== 'water'} 
                            onClick={() => !viewingMyBoard && setSelectedTile(i)}
                            className="relative w-full h-full bg-white dark:bg-zinc-900 focus:outline-none group overflow-hidden active:bg-zinc-100 dark:active:bg-zinc-800"
                        >
                            {/* Peg Hole */}
                            {status === 'water' && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-30 dark:opacity-20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600 shadow-inner" />
                                </div>
                            )}

                            {/* Target Lock */}
                            {isSelected && (
                                <motion.div layoutId="target-lock" className="absolute inset-0 flex items-center justify-center bg-blue-500/20 dark:bg-green-500/10 z-10">
                                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-blue-500 dark:border-green-500" />
                                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-blue-500 dark:border-green-500" />
                                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-blue-500 dark:border-green-500" />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-blue-500 dark:border-green-500" />
                                    <FaCrosshairs className="text-blue-500 dark:text-green-500 text-xs animate-spin-slow opacity-80" />
                                </motion.div>
                            )}

                            {/* Pegs */}
                            <AnimatePresence>
                                {status === 'miss' && (
                                    <motion.div initial={{scale:0}} animate={{scale:1}} className="absolute inset-0 flex items-center justify-center z-20">
                                        <div className="w-3 h-3 md:w-4 md:h-4 bg-zinc-300 dark:bg-white rounded-full shadow-md border border-zinc-400 dark:border-zinc-300" />
                                    </motion.div>
                                )}
                                {status === 'hit' && (
                                    <motion.div initial={{scale:0}} animate={{scale:1}} className="absolute inset-0 flex items-center justify-center z-20">
                                        <div className="w-3 h-3 md:w-4 md:h-4 bg-red-500 dark:bg-red-600 rounded-full shadow-md animate-pulse border border-red-600 dark:border-red-500" />
                                        <FaFire className="text-orange-500 text-xs md:text-lg absolute -top-1 animate-bounce opacity-80" />
                                    </motion.div>
                                )}
                                {status === 'sunk' && (
                                    <motion.div initial={{scale:0}} animate={{scale:1}} className="absolute inset-0 flex items-center justify-center z-20 bg-red-500/20 dark:bg-red-900/40">
                                        <FaSkull className="text-red-600 dark:text-red-500 text-lg md:text-2xl drop-shadow-md" />
                                    </motion.div>
                                )}
                                {status === 'ship' && (
                                    <div className="absolute inset-0 border border-blue-500/50 dark:border-green-600/50 bg-blue-100/50 dark:bg-green-900/20" />
                                )}
                            </AnimatePresence>
                        </button>
                    );
                })}
            </div>
        </div>

        {/* FIRE BUTTON */}
        {!viewingMyBoard && (
            <div className="fixed bottom-0 left-0 w-full p-4 bg-white/90 dark:bg-black/85 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 md:static md:bg-transparent md:border-none md:p-0 flex justify-center z-50">
                <button
                    disabled={selectedTile === null || !isMyTurn}
                    onClick={executeFire}
                    className={`
                        relative group overflow-hidden rounded-xl font-black font-mono tracking-[0.2em] md:tracking-[0.3em] text-lg md:text-xl w-full max-w-xl h-16 md:h-20 transition-all duration-200 border-b-[6px] active:border-b-0 active:translate-y-2
                        ${selectedTile !== null && isMyTurn
                            ? 'bg-blue-600 dark:bg-green-600 border-blue-800 dark:border-green-800 text-white dark:text-black shadow-xl hover:bg-blue-500 dark:hover:bg-green-500' 
                            : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-70'}
                    `}
                >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                        {isMyTurn ? (selectedTile !== null ? "ENGAGE" : "SELECT TARGET") : "SYSTEM LOCKED"}
                        {selectedTile !== null && isMyTurn && <FaBullseye className="animate-ping" />}
                    </span>
                </button>
            </div>
        )}
    </div>
  );
}

// --- SUB-COMPONENTS ---
function LobbyScreen({ createRoom, joinRoom, roomId, setRoomId, loading }: any) {
    return (
        <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center shadow-2xl relative overflow-hidden font-mono mt-10">
            <h1 className="text-3xl font-black text-blue-600 dark:text-green-500 mb-8 tracking-tighter">NET_WARFARE</h1>
            <button onClick={createRoom} disabled={loading} className="w-full py-4 bg-blue-600 dark:bg-green-600 hover:bg-blue-500 dark:hover:bg-green-500 text-white dark:text-black font-bold rounded-xl mb-6 shadow-lg">
                {loading ? "INITIALIZING..." : "INITIALIZE HOST"}
            </button>
            <div className="relative flex items-center gap-2">
                <div className="absolute left-4 text-zinc-400"><FaRocket className="-rotate-45" /></div>
                <input placeholder="ACCESS KEY" onChange={e => setRoomId(e.target.value.toUpperCase())} className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl py-4 pl-10 pr-4 text-center text-blue-600 dark:text-green-400 font-bold outline-none focus:border-blue-500 dark:focus:border-green-500 uppercase" maxLength={4} />
            </div>
            <button onClick={joinRoom} disabled={loading} className="w-full mt-3 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-green-400 font-bold rounded-xl border border-zinc-200 dark:border-zinc-700">CONNECT</button>
        </div>
    );
}

function WaitingScreen({ roomId }: { roomId: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] font-mono p-4 text-center">
            <div className="text-xs text-zinc-500 tracking-widest mb-4 font-bold">SECURE CHANNEL</div>
            <div className="text-6xl font-black text-zinc-800 dark:text-white tracking-widest mb-8 border-b-4 border-blue-500 dark:border-green-500/50 pb-2 px-8">{roomId}</div>
            <div className="flex items-center gap-3 text-blue-600 dark:text-green-500 text-sm font-bold animate-pulse bg-blue-50 dark:bg-green-500/10 px-4 py-2 rounded-full">
                <FaWifi /> WAITING FOR PLAYER...
            </div>
        </div>
    );
}

function ResultScreen({ winner, role }: { winner: string | null, role: string }) {
    const won = winner === role;
    return (
        <div className="fixed inset-0 bg-white/90 dark:bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 z-[100] font-mono">
            <div className={`p-8 md:p-12 border-4 rounded-3xl text-center max-w-lg w-full shadow-2xl ${won ? 'border-blue-500 dark:border-green-500 bg-blue-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}`}>
                <h1 className={`text-4xl md:text-6xl font-black mb-2 tracking-tighter ${won ? 'text-blue-600 dark:text-white' : 'text-red-600 dark:text-red-100'}`}>{won ? "VICTORY" : "DEFEAT"}</h1>
                <p className={`text-xs md:text-sm tracking-widest mb-8 font-bold ${won ? 'text-blue-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {won ? "ENEMY FLEET NEUTRALIZED" : "CRITICAL MISSION FAILURE"}
                </p>
                <button onClick={() => window.location.reload()} className="bg-zinc-900 dark:bg-white text-white dark:text-black font-black py-4 px-10 rounded-xl shadow-xl hover:scale-105 transition-transform w-full">SYSTEM REBOOT</button>
            </div>
        </div>
    );
}