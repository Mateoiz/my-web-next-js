"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPlus, FaPlay, FaTimes, FaCheck, FaRedo,
  FaSave, FaGlobe, FaLock, FaTrashAlt, FaLayerGroup,
  FaKeyboard, FaFileImport, FaEdit, FaTags,
  FaCheckCircle, FaBolt, FaStar, FaExchangeAlt,
  FaChevronLeft, FaChevronRight, FaList, FaFire,
  FaBrain, FaClock, FaChartBar, FaRandom, FaArrowRight,
  FaExclamationCircle, FaLightbulb, FaBookOpen, FaTrophy
} from "react-icons/fa";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp, query, where, getDocs, orderBy, getDoc
} from "firebase/firestore";
import { auth, db } from "@/lib/db";
import { useModal } from "../../context/ModalContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Card = {
  id: string;
  front: string;
  back: string;
  starred?: boolean;
  // Spaced repetition fields (SM-2 inspired)
  interval?: number;      // days until next review
  easeFactor?: number;    // 1.3–2.5, default 2.5
  repetitions?: number;   // times answered correctly in a row
  nextReview?: number;    // timestamp ms
  lastResult?: 'know' | 'again' | null;
};

type ViewMode = 'library' | 'editor' | 'study' | 'results';
type StudyMode = 'flip' | 'identification' | 'spaced';

interface StudySettings {
  reversed: boolean;
  shuffled: boolean;
  onlyStarred: boolean;
  onlyDue: boolean;       // spaced repetition: only cards due today
  autoAdvance: boolean;
}

// Per-card result tracking for the session
interface CardResult {
  cardId: string;
  front: string;
  back: string;
  knew: boolean;
  attempts: number;
}

const defaultSettings: StudySettings = {
  reversed: false,
  shuffled: false,
  onlyStarred: false,
  onlyDue: false,
  autoAdvance: false,
};

// ─── SM-2 Spaced Repetition ────────────────────────────────────────────────

function sm2Update(card: Card, quality: 0 | 1 | 2 | 3 | 4 | 5): Partial<Card> {
  // quality: 0-2 = fail, 3-5 = pass (5=perfect, 3=correct with difficulty)
  const ef = Math.max(1.3, (card.easeFactor ?? 2.5) + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const reps = quality >= 3 ? (card.repetitions ?? 0) + 1 : 0;
  let interval: number;
  if (reps === 0) interval = 1;
  else if (reps === 1) interval = 1;
  else if (reps === 2) interval = 6;
  else interval = Math.round((card.interval ?? 1) * ef);

  return {
    easeFactor: ef,
    repetitions: reps,
    interval,
    nextReview: Date.now() + interval * 86400000,
    lastResult: quality >= 3 ? 'know' : 'again',
  };
}

function isDueToday(card: Card): boolean {
  if (!card.nextReview) return true; // never reviewed = always due
  return card.nextReview <= Date.now();
}

function getDueCount(cards: Card[]): number {
  return cards.filter(isDueToday).length;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
  return dp[m][n];
}

function fuzzyMatch(input: string, answer: string): 'exact' | 'close' | 'wrong' {
  const a = normalize(input), b = normalize(answer);
  if (a === b) return 'exact';
  const dist = levenshtein(a, b);
  const threshold = Math.floor(b.length * 0.2); // allow 20% typo tolerance
  if (dist <= Math.max(1, threshold)) return 'close';
  return 'wrong';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KbdBadge({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-1">
        {keys.map(k => (
          <span key={k} className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9px] font-mono font-bold text-zinc-300">{k}</span>
        ))}
      </div>
      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function ProgressRing({ value, max, size = 80, color = '#06402B' }: { value: number; max: number; size?: number; color?: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max === 0 ? 0 : value / max;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-zinc-200 dark:text-zinc-800" />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

// ─── Jump Sheet ───────────────────────────────────────────────────────────────

function JumpSheet({ cards, current, onJump, onClose, cardFront }: {
  cards: Card[]; current: number;
  onJump: (i: number) => void; onClose: () => void;
  cardFront: (c: Card) => string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl max-h-[80vh] sm:max-h-[70vh] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <p className="text-xs font-black uppercase tracking-widest text-white">Jump to Card</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><FaTimes size={13} /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {cards.map((card, i) => (
            <button key={card.id} onClick={() => { onJump(i); onClose(); }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-zinc-800/60 transition-colors border-b border-zinc-900 ${i === current ? 'bg-[#06402B]/20' : ''}`}
            >
              <span className="text-[10px] font-mono font-bold text-zinc-500 w-6 shrink-0">{i + 1}</span>
              <span className="text-sm font-bold text-zinc-200 truncate flex-1">{cardFront(card)}</span>
              {card.starred && <FaStar size={10} className="text-amber-400 shrink-0" />}
              {card.lastResult === 'again' && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Needs review" />}
              {card.lastResult === 'know' && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Known" />}
              {i === current && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Study Settings Modal ─────────────────────────────────────────────────────

function StudySettingsModal({
  settings, onChange, onStart, onClose, totalCards, starredCount, dueCount
}: {
  settings: StudySettings;
  onChange: (s: StudySettings) => void;
  onStart: (mode: StudyMode) => void;
  onClose: () => void;
  totalCards: number;
  starredCount: number;
  dueCount: number;
}) {
  const set = (patch: Partial<StudySettings>) => onChange({ ...settings, ...patch });

  const Toggle = ({ label, sublabel, value, onToggle, disabled }: {
    label: string; sublabel?: string; value: boolean; onToggle: () => void; disabled?: boolean;
  }) => (
    <div className={`flex items-center justify-between gap-3 py-3.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div>
        <p className="text-sm font-bold text-zinc-200">{label}</p>
        {sublabel && <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{sublabel}</p>}
      </div>
      <button onClick={onToggle}
        className={`w-11 h-6 rounded-full relative transition-all shrink-0 ${value ? 'bg-[#06402B]' : 'bg-zinc-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${value ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-base font-black uppercase tracking-tight text-white">Study Options</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] font-mono text-zinc-500">{totalCards} cards</span>
              {starredCount > 0 && <span className="text-[10px] font-mono text-amber-400">⭐ {starredCount} starred</span>}
              {dueCount < totalCards && <span className="text-[10px] font-mono text-emerald-400">🔁 {dueCount} due</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><FaTimes size={13} /></button>
        </div>

        <div className="px-6 divide-y divide-zinc-900 overflow-y-auto">
          <Toggle label="Reverse Cards" sublabel="Show description first, recall the term" value={settings.reversed} onToggle={() => set({ reversed: !settings.reversed })} />
          <Toggle label="Shuffle Order" sublabel="Randomize card sequence" value={settings.shuffled} onToggle={() => set({ shuffled: !settings.shuffled })} />
          <Toggle label="Starred Only" sublabel={starredCount === 0 ? "No starred cards yet" : `${starredCount} starred cards`} value={settings.onlyStarred} onToggle={() => set({ onlyStarred: !settings.onlyStarred })} disabled={starredCount === 0} />
          <Toggle label="Due Cards Only" sublabel={`${dueCount} cards due for review today`} value={settings.onlyDue} onToggle={() => set({ onlyDue: !settings.onlyDue })} disabled={dueCount === 0} />
          <Toggle label="Auto-Advance" sublabel="Move to next card 2s after flip" value={settings.autoAdvance} onToggle={() => set({ autoAdvance: !settings.autoAdvance })} />
        </div>

        <div className="px-6 py-5 space-y-2 border-t border-zinc-900">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Choose Mode</p>

          {[
            {
              mode: 'spaced' as StudyMode,
              icon: <FaBrain size={16} />,
              label: "Spaced Repetition",
              sub: "SM-2 algorithm · builds long-term memory",
              badge: "Recommended",
              cls: "bg-[#06402B] border-[#06402B] text-white hover:bg-[#042d1f]",
              badgeCls: "bg-white/15 text-white/80",
            },
            {
              mode: 'flip' as StudyMode,
              icon: <FaLayerGroup size={16} />,
              label: "Flashcard Mode",
              sub: "Classic flip cards · self-assessed",
              badge: null,
              cls: "bg-zinc-900 border-zinc-700 text-white hover:border-zinc-500",
              badgeCls: "",
            },
            {
              mode: 'identification' as StudyMode,
              icon: <FaKeyboard size={16} />,
              label: "Identification",
              sub: "Type the answer · fuzzy matching",
              badge: null,
              cls: "bg-zinc-900 border-zinc-700 text-white hover:border-zinc-500",
              badgeCls: "",
            },
          ].map(({ mode, icon, label, sub, badge, cls, badgeCls }) => (
            <button key={mode} onClick={() => onStart(mode)}
              className={`w-full px-4 py-3.5 rounded-2xl border font-black uppercase tracking-widest text-xs flex items-center gap-3 active:scale-[0.98] transition-all touch-manipulation relative overflow-hidden ${cls}`}
            >
              <span className="shrink-0 opacity-80">{icon}</span>
              <span className="flex flex-col items-start gap-0.5 text-left">
                <span className="text-xs font-black uppercase tracking-widest">{label}</span>
                <span className="text-[9px] font-medium normal-case tracking-normal opacity-60">{sub}</span>
              </span>
              {badge && (
                <span className={`ml-auto shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${badgeCls}`}>{badge}</span>
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Missed Cards Review Sheet ────────────────────────────────────────────────

function MissedCardsSheet({ missed, onClose }: { missed: CardResult[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl max-h-[80vh] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white flex items-center gap-2">
              <FaExclamationCircle className="text-red-500" size={13} />
              Missed Cards ({missed.length})
            </p>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Cards to focus on next session</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1">
            <FaTimes size={13} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {missed.map((r, i) => (
            <div key={r.cardId} className="flex gap-3 p-3 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl">
              <span className="text-[10px] font-mono font-bold text-red-400 w-5 shrink-0 pt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-zinc-900 dark:text-white truncate">{r.front}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 line-clamp-2">{r.back}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <button onClick={onClose}
            className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FlashcardMakerProps {
  onStudyModeChange?: (studying: boolean) => void;
}

export default function FlashcardMaker({ onStudyModeChange }: FlashcardMakerProps) {

  const { showAlert, showConfirm } = useModal();

  // ── View & mode ────────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewMode>('library');
  const [studyMode, setStudyMode] = useState<StudyMode>('spaced');

  // ── Library ────────────────────────────────────────────────────────────────
  const [myDecks, setMyDecks] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

  // ── Editor state ───────────────────────────────────────────────────────────
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubject, setDeckSubject] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [deckCollege, setDeckCollege] = useState("General");
  const [isSaving, setIsSaving] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [originalState, setOriginalState] = useState<{ title: string; subject: string; cards: Card[] } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [delimiter, setDelimiter] = useState<'-' | ',' | 'tab'>('tab');

  // ── Study state ────────────────────────────────────────────────────────────
  const [studyCards, setStudyCards] = useState<Card[]>([]);
  const [studySettings, setStudySettings] = useState<StudySettings>(defaultSettings);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingDeck, setPendingDeck] = useState<any | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [inputFeedback, setInputFeedback] = useState<'none' | 'exact' | 'close' | 'wrong'>('none');
  const [showJumpSheet, setShowJumpSheet] = useState(false);
  const [showKbdHints, setShowKbdHints] = useState(false);
  const [showMissedSheet, setShowMissedSheet] = useState(false);
  const [showMissedOnResults, setShowMissedOnResults] = useState(false);
  const [sessionResults, setSessionResults] = useState<CardResult[]>([]);
  const [cardAttempts, setCardAttempts] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);

  // Spaced rep: cards that still need 'again' review in this session
  const [againQueue, setAgainQueue] = useState<Card[]>([]);

  // Send to friend
  const [sendToUsername, setSendToUsername] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ── Fetch library ──────────────────────────────────────────────────────────
  const fetchMyDecks = useCallback(async () => {
    if (!auth.currentUser) return;
    setIsLoadingLibrary(true);
    const snap = await getDocs(query(
      collection(db, "flashcard_decks"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    ));
    setMyDecks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setIsLoadingLibrary(false);
  }, []);

  useEffect(() => { if (view === 'library') fetchMyDecks(); }, [view, fetchMyDecks]);

  // ── Card front/back (with reversal) ───────────────────────────────────────
  const cardFront = useCallback((c: Card) => studySettings.reversed ? c.back : c.front, [studySettings.reversed]);
  const cardBack  = useCallback((c: Card) => studySettings.reversed ? c.front : c.back,  [studySettings.reversed]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleNext = useCallback((knew: boolean, quality?: 0|1|2|3|4|5) => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);

    const card = studyCards[currentIndex];
    const attempts = (cardAttempts[card.id] ?? 0) + 1;

    // Record result
    setSessionResults(prev => {
      const existing = prev.findIndex(r => r.cardId === card.id);
      const result: CardResult = { cardId: card.id, front: cardFront(card), back: cardBack(card), knew, attempts };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      return [...prev, result];
    });

    if (knew) {
      setKnownCount(p => p + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(prev => Math.max(prev, newStreak));
    } else {
      setStreak(0);
      // In spaced mode: add to againQueue to review at end
      if (studyMode === 'spaced') {
        setAgainQueue(prev => prev.find(c => c.id === card.id) ? prev : [...prev, { ...card }]);
      }
    }

    // Apply SM-2 update
    if (studyMode === 'spaced') {
      const q = quality ?? (knew ? 4 : 1);
      const update = sm2Update(card, q);
      setStudyCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, ...update } : c));
    }

    setIsFlipped(false);
    setUserInput("");
    setInputFeedback('none');

    setTimeout(() => {
      setCurrentIndex(prev => {
        if (prev < studyCards.length - 1) return prev + 1;
        // End of deck
        if (studyMode === 'spaced' && againQueue.length > 0) {
          // Schedule the again-queue reset after this state update completes
          setTimeout(() => {
            setStudyCards([...againQueue]);
            setAgainQueue([]);
            setCurrentIndex(0);
            setIsFlipped(false);
          }, 50);
          return prev; // hold position while reset happens
        }
        setView('results');
        return prev;
      });
    }, 200);
  }, [studyCards, currentIndex, streak, studyMode, againQueue, cardAttempts, cardFront, cardBack]);

  // Quality rating for spaced mode
  const rateCard = useCallback((quality: 0|1|2|3|4|5) => {
    handleNext(quality >= 3, quality);
  }, [handleNext]);

  // Auto-advance
  useEffect(() => {
    if (view === 'study' && studyMode === 'flip' && isFlipped && studySettings.autoAdvance) {
      autoAdvanceTimer.current = setTimeout(() => handleNext(true), 2000);
    }
    return () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current); };
  }, [isFlipped, view, studyMode, studySettings.autoAdvance, handleNext]);

  // Keyboard shortcuts
  useEffect(() => {
    if (view !== 'study') return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); setIsFlipped(f => !f); }
      if ((e.code === 'ArrowRight' || e.key === 'k') && isFlipped) handleNext(true);
      if ((e.code === 'ArrowLeft'  || e.key === 'a') && isFlipped) handleNext(false);
      if (e.key === 's') setStudyCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, starred: !c.starred } : c));
      if (e.key === 'j') setShowJumpSheet(j => !j);
      if (e.key === '1') rateCard(1);
      if (e.key === '2') rateCard(2);
      if (e.key === '3') rateCard(3);
      if (e.key === '4') rateCard(4);
      if (e.key === '5') rateCard(5);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, isFlipped, currentIndex, handleNext, rateCard]);

  // Focus input in identification mode
  useEffect(() => {
    if (view === 'study' && studyMode === 'identification' && !isFlipped)
      inputRef.current?.focus();
  }, [currentIndex, view, studyMode, isFlipped]);

  // ── Deck CRUD ──────────────────────────────────────────────────────────────
  const createNewDeck = () => {
    setCurrentDeckId(null); setDeckTitle(""); setDeckSubject("");
    setIsPublic(false); setDeckCollege("General");
    setCards([{ id: Date.now().toString(), front: '', back: '' }]);
    setOriginalState(null);
    setView('editor');
  };

  const editExistingDeck = (deck: any) => {
    setCurrentDeckId(deck.id); setDeckTitle(deck.title); setDeckSubject(deck.subject);
    setIsPublic(deck.isPublic || false); setDeckCollege(deck.college || "General");
    setCards(deck.cards || []);
    setOriginalState({ title: deck.title, subject: deck.subject, cards: deck.cards || [] });
    setView('editor');
  };

  const deleteDeck = (deckId: string) => {
    showConfirm("Delete Reviewer", "Permanently delete this reviewer?", async () => {
      try {
        await deleteDoc(doc(db, "flashcard_decks", deckId));
        setMyDecks(prev => prev.filter(d => d.id !== deckId));
      } catch { showAlert("Delete Failed", "Could not delete. Please try again."); }
    }, "Delete", true);
  };

  // ── Study start ────────────────────────────────────────────────────────────
  const openStudySettings = (deck: any) => {
    const valid = (deck.cards || []).filter((c: Card) => c.front?.trim() && c.back?.trim());
    if (valid.length === 0) return showAlert("Empty Deck", "Add complete cards first.");
    setDeckTitle(deck.title);
    setCards(valid);
    setPendingDeck(deck);
    setShowSettingsModal(true);
  };

  const openStudySettingsFromEditor = () => {
    const valid = cards.filter(c => c.front?.trim() && c.back?.trim());
    if (valid.length === 0) return showAlert("No Valid Cards", "Fill in all cards first.");
    setShowSettingsModal(true);
  };

  const startStudy = useCallback((mode: StudyMode) => {
    setShowSettingsModal(false);
    setShowMissedOnResults(false);
    let pool: Card[] = (pendingDeck
      ? (pendingDeck.cards || []).filter((c: Card) => c.front?.trim() && c.back?.trim())
      : cards.filter(c => c.front?.trim() && c.back?.trim())
    ).map((c: Card) => ({ ...c }));

    if (studySettings.onlyStarred) {
      pool = pool.filter(c => c.starred);
      if (pool.length === 0) return showAlert("No Starred Cards", "Star some cards first.");
    }
    if (studySettings.onlyDue) {
      pool = pool.filter(isDueToday);
      if (pool.length === 0) return showAlert("No Cards Due", "No cards are due for review today.");
    }
    if (studySettings.shuffled) pool = [...pool].sort(() => Math.random() - 0.5);
    
    setStudyCards(pool);
    setStudyMode(mode);
    setCurrentIndex(0);
    setKnownCount(0);
    setStreak(0);
    setMaxStreak(0);
    setIsFlipped(false);
    setUserInput("");
    setInputFeedback('none');
    setSessionResults([]);
    setCardAttempts({});
    setAgainQueue([]);
    setPendingDeck(null);
    onStudyModeChange?.(true);
    setView('study');
  }, [pendingDeck, cards, studySettings, onStudyModeChange]);

  // ── Identification answer check ────────────────────────────────────────────
  const checkAnswer = useCallback(() => {
    if (!userInput.trim()) return;
    const answer = cardFront(studyCards[currentIndex]);
    const result = fuzzyMatch(userInput, answer);
    setCardAttempts(prev => ({ ...prev, [studyCards[currentIndex].id]: (prev[studyCards[currentIndex].id] ?? 0) + 1 }));

    if (result === 'exact') {
      setInputFeedback('exact');
      setTimeout(() => handleNext(true, 5), 800);
    } else if (result === 'close') {
      setInputFeedback('close');
      // Show the correct answer but still count as correct
      setTimeout(() => handleNext(true, 3), 1600);
    } else {
      setInputFeedback('wrong');
      setTimeout(() => setInputFeedback('none'), 1200);
    }
  }, [userInput, studyCards, currentIndex, cardFront, handleNext]);

  // ── Editor actions ─────────────────────────────────────────────────────────
  const addCard = () => {
    if (cards.length >= 500) return showAlert("Deck Full", "Max 500 cards.");
    setCards(prev => [...prev, { id: Date.now().toString(), front: '', back: '' }]);
  };

  const updateCard = (id: string, field: 'front' | 'back', value: string) =>
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

  const removeCard = (id: string) => {
    if (cards.length <= 1) return showAlert("Can't Remove", "Must have at least one card.");
    showConfirm("Remove Card", "Remove this card?", () => setCards(prev => prev.filter(c => c.id !== id)), "Remove", true);
  };

  const moveCard = (id: string, dir: 'up' | 'down') => {
    setCards(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      if (dir === 'up' && idx === 0) return prev;
      if (dir === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const handleBulkImport = () => {
    if (!importText.trim()) return showAlert("Empty Import", "Paste your terms first.");
    const separator = delimiter === 'tab' ? '\t' : delimiter;
    const lines = importText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return showAlert("Nothing Found", "No valid lines detected.");
    if (lines.length > 200) return showAlert("Too Many Cards", `Max 200 per import.`);
    const newCards: Card[] = [];
    const skipped: number[] = [];
    lines.forEach((line, i) => {
      const clean = line.replace(/\u00A0/g,' ').replace(/[\u200B\uFEFF]/g,'').trim();
      if (!clean) return;
      const splitIdx = clean.indexOf(separator);
      if (splitIdx === -1) { skipped.push(i + 1); return; }
      const front = clean.substring(0, splitIdx).trim();
      const back  = clean.substring(splitIdx + separator.length).trim();
      if (!front || !back) { skipped.push(i + 1); return; }
      newCards.push({ id: `import-${Date.now()}-${i}`, front: front.substring(0, 300), back: back.substring(0, 500) });
    });
    if (newCards.length === 0) return showAlert("No Valid Cards", "Check your delimiter and format.");
    const combined = [...cards.filter(c => c.front.trim() || c.back.trim()), ...newCards];
    if (combined.length > 500) return showAlert("Deck Too Large", "Max 500 cards.");
    setCards(combined);
    setImportText("");
    setShowImportModal(false);
    if (skipped.length > 0) showAlert("Import Complete", `${newCards.length} imported, ${skipped.length} skipped.`);
  };

const handleSaveDeck = async () => {
  if (!deckTitle.trim() || deckTitle.trim().length < 3) return showAlert("Title Issue", "Title must be 3–100 chars.");
  if (!deckSubject.trim()) return showAlert("Missing Subject", "Enter a course code.");
  const empty = cards.filter(c => !c.front.trim() || !c.back.trim());
  if (empty.length > 0) return showAlert("Incomplete Cards", `${empty.length} card(s) missing term or description.`);
  if (!auth.currentUser) return showAlert("Not Logged In", "You must be logged in to save.");
  setIsSaving(true);
  try {
    let username = "Lasallian";
    try {
      const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userSnap.exists()) username = userSnap.data().username;
    } catch {
      // network unavailable — use fallback, write will still queue via offline persistence
    }
    const deckData = {
      userId: auth.currentUser.uid, authorUsername: username,
      title: deckTitle.trim(), subject: deckSubject.trim().toUpperCase(),
      college: isPublic ? deckCollege : "Private",
cards: cards.map(c => ({
  id: c.id, front: c.front.trim(), back: c.back.trim(),
  starred: c.starred || false,
  interval: c.interval ?? null,
  easeFactor: c.easeFactor ?? null,
  repetitions: c.repetitions ?? null,
  nextReview: c.nextReview ?? null,
})),
      isPublic,
    };
    if (currentDeckId) await updateDoc(doc(db, "flashcard_decks", currentDeckId), deckData);
    else await addDoc(collection(db, "flashcard_decks"), { ...deckData, upvotes: 0, downloads: 0, createdAt: serverTimestamp() });
    setOriginalState(null);
    setView('library');
  } catch { showAlert("Save Failed", "Something went wrong. Try again."); }
  finally { setIsSaving(false); }
};

  const handleSendToFriend = async () => {
    if (!sendToUsername.trim()) return showAlert("Missing Username", "Enter a username.");
    if (!deckTitle.trim()) return showAlert("No Title", "Title your deck first.");
    const valid = cards.filter(c => c.front?.trim() && c.back?.trim());
    if (valid.length === 0) return showAlert("No Cards", "No complete cards to send.");
    if (!auth.currentUser) return showAlert("Not Logged In", "Log in to send.");
    setIsSending(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), where("username", "==", sendToUsername.trim().toLowerCase())));
      if (snap.empty) { showAlert("User Not Found", "No user with that username."); setIsSending(false); return; }
      if (snap.docs[0].id === auth.currentUser.uid) { showAlert("Can't Send to Yourself", "Pick a different user."); setIsSending(false); return; }
      const mySnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const myName = mySnap.exists() ? mySnap.data().username : "A Lasallian";
      await addDoc(collection(db, "inbox"), {
        type: "deck_share", recipientId: snap.docs[0].id, senderId: auth.currentUser.uid,
        senderName: myName, deckTitle: deckTitle.trim(), deckSubject: deckSubject.trim() || "General",
        cards: valid, status: "pending", createdAt: serverTimestamp(),
      });
      showAlert("Sent!", `Reviewer sent to @${sendToUsername.trim()}.`);
      setSendToUsername("");
    } catch { showAlert("Send Failed", "Something went wrong."); }
    finally { setIsSending(false); }
  };

  const isDirty = useMemo(() => originalState
    ? deckTitle !== originalState.title || deckSubject !== originalState.subject || JSON.stringify(cards) !== JSON.stringify(originalState.cards)
    : deckTitle.trim() || deckSubject.trim() || cards.some(c => c.front.trim() || c.back.trim()),
    [originalState, deckTitle, deckSubject, cards]
  );

  const goBackFromEditor = () => {
    if (isDirty) {
      showConfirm("Discard Changes", "You have unsaved changes. Discard them?",
        () => { setOriginalState(null); setView('library'); }, "Discard", true);
    } else { setOriginalState(null); setView('library'); }
  };

  // ─── LIBRARY ─────────────────────────────────────────────────────────────────
  if (view === 'library') {
    const totalTerms = myDecks.reduce((acc, d) => acc + (d.cards?.length || 0), 0);

    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4">
        <AnimatePresence>
          {showSettingsModal && (
            <StudySettingsModal
              settings={studySettings} onChange={setStudySettings} onStart={startStudy}
              onClose={() => setShowSettingsModal(false)}
              totalCards={pendingDeck?.cards?.length || 0}
              starredCount={(pendingDeck?.cards || []).filter((c: Card) => c.starred).length}
              dueCount={getDueCount(pendingDeck?.cards || [])}
            />
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-black tracking-tight uppercase text-zinc-900 dark:text-white">My Vault</h2>
              {myDecks.length > 0 && (
                <span className="px-2.5 py-1 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-widest">{myDecks.length}</span>
              )}
            </div>
            <p className="text-zinc-500 text-sm font-medium">
              {myDecks.length > 0
                ? `${totalTerms} total terms across ${myDecks.length} reviewer${myDecks.length !== 1 ? 's' : ''}`
                : 'Your personal collection of study materials'}
            </p>
          </div>
          <button onClick={createNewDeck}
            className="w-full sm:w-auto py-3 px-6 bg-[#06402B] dark:bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shrink-0"
          >
            <FaPlus size={12} /> New Reviewer
          </button>
        </div>

        {!isLoadingLibrary && myDecks.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap -mt-2">
            {[
              {
                label: "Total Terms",
                value: myDecks.reduce((a, d) => a + (d.cards?.length || 0), 0),
                color: "text-zinc-800 dark:text-zinc-200",
              },
              {
                label: "Mastered",
                value: myDecks.reduce((a, d) => a + (d.cards || []).filter((c: Card) => (c.repetitions ?? 0) >= 2).length, 0),
                color: "text-[#06402B] dark:text-emerald-400",
              },
              {
                label: "Due Today",
                value: myDecks.reduce((a, d) => a + getDueCount(d.cards || []), 0),
                color: "text-amber-500",
              },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <span className={`text-sm font-black tabular-nums ${s.color}`}>{s.value}</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {isLoadingLibrary ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#06402B]/20 border-t-[#06402B] rounded-full animate-spin" />
          </div>
        ) : myDecks.length === 0 ? (
          <div className="py-16 sm:py-24 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
            <div className="w-16 h-16 rounded-2xl bg-[#06402B]/10 dark:bg-emerald-500/10 flex items-center justify-center text-[#06402B] dark:text-emerald-400">
              <FaLayerGroup size={28} />
            </div>
            <div className="text-center">
              <p className="font-black text-zinc-900 dark:text-white uppercase tracking-tight">No reviewers yet</p>
              <p className="text-zinc-500 text-sm font-medium mt-1">Create your first deck to get started</p>
            </div>
            <button onClick={createNewDeck}
              className="px-6 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#042d1f] transition-all shadow-md"
            >
              Create First Reviewer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
             {myDecks.map((deck) => {
              const starredCount = (deck.cards || []).filter((c: Card) => c.starred).length;
              const dueCount = getDueCount(deck.cards || []);
              const masteredCount = (deck.cards || []).filter((c: Card) => (c.repetitions ?? 0) >= 2).length;
              const totalDeckCards = deck.cards?.length || 0;
              const masteryPct = totalDeckCards > 0 ? masteredCount / totalDeckCards : 0;

              return (
                <motion.div key={deck.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * (myDecks.indexOf(deck) % 8) }}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[1.75rem] overflow-hidden hover:border-[#06402B]/40 dark:hover:border-emerald-500/40 hover:shadow-xl transition-all duration-300 flex flex-col relative"
                >
                  {/* Colored top accent bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-[#06402B] to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-2.5 py-1 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-widest border border-[#06402B]/10 dark:border-emerald-500/20">
                      {deck.subject}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {dueCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded-lg" title={`${dueCount} due for review`}>
                          <FaClock size={8} className="text-emerald-500" />
                          <span className="text-[9px] font-black text-emerald-500">{dueCount}</span>
                        </div>
                      )}
                      {starredCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded-lg" title={`${starredCount} starred`}>
                          <FaStar size={8} className="text-amber-400" />
                          <span className="text-[9px] font-black text-amber-500">{starredCount}</span>
                        </div>
                      )}
                      {deck.isPublic && (
                        <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center" title="Published">
                          <FaGlobe size={10} className="text-blue-500" />
                        </div>
                      )}
                      <button onClick={() => deleteDeck(deck.id)}
                        className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <FaTrashAlt size={9} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 mb-4">
                    <h3 className="text-base font-black text-zinc-900 dark:text-white leading-tight line-clamp-2 mb-1">{deck.title}</h3>
                    <p className="text-[11px] text-zinc-400 font-bold">{totalDeckCards} {totalDeckCards === 1 ? 'term' : 'terms'}</p>

                    {/* Mastery bar */}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Mastery</span>
                        <span className="text-[9px] font-black text-[#06402B] dark:text-emerald-400">{Math.round(masteryPct * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${masteryPct * 100}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-[#06402B] dark:bg-emerald-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => openStudySettings(deck)}
                      className="col-span-2 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:opacity-80 active:scale-95 transition-all touch-manipulation"
                    >
                      <FaPlay size={9} /> Study
                    </button>
                    <button onClick={() => editExistingDeck(deck)}
                      className="py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center hover:bg-[#06402B] hover:text-white dark:hover:bg-emerald-600 active:scale-95 transition-all touch-manipulation"
                      title="Edit"
                    >
                      <FaEdit size={11} />
                    </button>
                  </div>
                  </div>{/* closes p-5 */}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── EDITOR ───────────────────────────────────────────────────────────────────
  if (view === 'editor') {
    return (
      <div className="max-w-4xl mx-auto pb-20 animate-in fade-in">
        <AnimatePresence>
          {showSettingsModal && (
            <StudySettingsModal
              settings={studySettings} onChange={setStudySettings} onStart={startStudy}
              onClose={() => setShowSettingsModal(false)}
              totalCards={cards.filter(c => c.front.trim() && c.back.trim()).length}
              starredCount={cards.filter(c => c.starred).length}
              dueCount={getDueCount(cards)}
            />
          )}
          {showImportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowImportModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-2xl z-10"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Bulk Import</h3>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">Paste your terms below, one per line</p>
                  </div>
                  <button onClick={() => setShowImportModal(false)} className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-500 transition-colors">
                    <FaTimes size={13} />
                  </button>
                </div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest self-center mr-1">Separator:</p>
                  {(['tab', '-', ','] as const).map(sep => (
                    <button key={sep} onClick={() => setDelimiter(sep)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs transition-all border-2 ${delimiter === sep ? 'bg-[#06402B]/10 border-[#06402B] text-[#06402B] dark:bg-emerald-500/10 dark:border-emerald-500 dark:text-emerald-400' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300'}`}
                    >
                      {sep === 'tab' ? 'Tab ↹' : sep === '-' ? 'Dash —' : 'Comma ,'}
                    </button>
                  ))}
                </div>
                <div className="mb-3 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <p className="text-[10px] font-mono text-zinc-400">
                    Example: <span className="text-zinc-600 dark:text-zinc-300">Mitosis{delimiter === 'tab' ? ' [TAB] ' : ` ${delimiter} `}Process of cell division</span>
                  </p>
                </div>
                <textarea value={importText} onChange={e => setImportText(e.target.value)}
                  placeholder={`Term${delimiter === 'tab' ? '\t' : ` ${delimiter} `}Description`}
                  className="w-full h-48 bg-zinc-50 dark:bg-zinc-950/50 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 font-mono text-xs resize-none mb-4 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                  style={{ fontSize: "16px" }}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowImportModal(false)} className="px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
                  <button onClick={handleBulkImport} className="flex-1 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-[#042d1f] dark:hover:bg-emerald-500 transition-all flex justify-center items-center gap-2">
                    <FaFileImport size={12} /> Import Cards
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={goBackFromEditor}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all shrink-0 touch-manipulation"
            >
              <FaChevronLeft size={10} /> Vault
            </button>
            <FaChevronRight size={8} className="text-zinc-300 dark:text-zinc-700 shrink-0" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white truncate">
              {currentDeckId ? (deckTitle || 'Edit Reviewer') : 'New Reviewer'}
            </span>
          </div>
          {isDirty && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Unsaved</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Title / actions card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 md:p-7">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <input type="text" placeholder="Reviewer Title" value={deckTitle} onChange={e => setDeckTitle(e.target.value)}
                  className="w-full text-2xl md:text-3xl font-black bg-transparent border-none outline-none text-zinc-900 dark:text-white tracking-tight placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                  style={{ fontSize: "clamp(1.25rem, 4vw, 1.875rem)" }}
                />
                <input type="text" placeholder="Course Code (e.g. CS101)" value={deckSubject} onChange={e => setDeckSubject(e.target.value.toUpperCase())}
                  className="w-full sm:w-56 text-xs font-bold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 uppercase tracking-widest text-[#06402B] dark:text-emerald-400 placeholder:text-zinc-400 placeholder:normal-case placeholder:tracking-normal"
                  style={{ fontSize: "16px" }}
                  autoCapitalize="characters"
                />
              </div>
              <div className="flex flex-row md:flex-col gap-2 shrink-0">
                <button onClick={openStudySettingsFromEditor}
                  className="flex-1 md:w-44 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-80 transition-all text-[10px]"
                >
                  <FaPlay size={11} /> Study
                </button>
                <button onClick={handleSaveDeck} disabled={isSaving}
                  className="flex-1 md:w-44 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-[#042d1f] dark:hover:bg-emerald-500 disabled:opacity-50 active:scale-95 transition-all shadow-md relative overflow-hidden"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <><FaSave size={12} /> Save Deck</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Visibility + Send */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${isPublic ? 'bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                    {isPublic ? <FaGlobe size={14} /> : <FaLock size={14} />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-zinc-900 dark:text-white">{isPublic ? 'Published' : 'Private'}</p>
                    <p className="text-[10px] font-medium text-zinc-400 mt-0.5">{isPublic ? 'Visible in Exchange' : 'Only you can see this'}</p>
                  </div>
                </div>
                <button onClick={() => setIsPublic(!isPublic)}
                  className={`w-11 h-6 rounded-full transition-all relative shadow-inner shrink-0 ${isPublic ? 'bg-[#06402B] dark:bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${isPublic ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <AnimatePresence>
                {isPublic && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                      <FaTags size={11} className="text-zinc-400 shrink-0" />
                      <select value={deckCollege} onChange={e => setDeckCollege(e.target.value)}
                        className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] dark:focus:border-emerald-500"
                      >
                        <option value="General">General / All</option>
                        <option value="CAST">CAST</option>
                        <option value="CBMA">CBMA</option>
                        <option value="CVMAS">CVMAS</option>
                        <option value="COED">COED</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><FaBolt size={14} /></div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-zinc-900 dark:text-white">Direct Beam</p>
                  <p className="text-[10px] font-medium text-zinc-400 mt-0.5">Send to a friend's inbox</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="@username" value={sendToUsername} onChange={e => setSendToUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendToFriend()}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 placeholder:font-normal"
                  style={{ fontSize: "16px" }}
                />
                <button onClick={handleSendToFriend} disabled={isSending}
                  className="px-4 py-2.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-[#042d1f] dark:hover:bg-emerald-500 transition-colors"
                >
                  {isSending ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>

          {/* Cards list */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">Cards</span>
                <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-[10px] font-black text-zinc-500">{cards.length}</span>
              </div>
              <button onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-[#06402B]/40 dark:hover:border-emerald-500/40 transition-all"
              >
                <FaFileImport size={9} /> Bulk Import
              </button>
            </div>
            <div className="p-4 space-y-3">
              <AnimatePresence>
                {cards.map((card, index) => (
                  <motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                    className="group flex gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 hover:border-[#06402B]/20 dark:hover:border-emerald-500/20 transition-all"
                  >
                    {/* Index + reorder */}
                    <div className="w-6 shrink-0 flex flex-col items-center gap-1 pt-1">
                      <span className="text-[10px] font-mono font-bold text-zinc-400 mb-1">{index + 1}</span>
                      <button onClick={() => moveCard(card.id, 'up')} disabled={index === 0}
                        className="w-6 h-6 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400 disabled:opacity-20 transition-all rounded-lg touch-manipulation active:scale-90"
                      >
                        <FaChevronLeft size={9} className="rotate-90" />
                      </button>
                      <button onClick={() => moveCard(card.id, 'down')} disabled={index === cards.length - 1}
                        className="w-6 h-6 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400 disabled:opacity-20 transition-all rounded-lg touch-manipulation active:scale-90"
                      >
                        <FaChevronRight size={9} className="rotate-90" />
                      </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Term</label>
                        <textarea value={card.front} onChange={e => updateCard(card.id, 'front', e.target.value)} placeholder="Enter term..."
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none resize-none font-bold text-zinc-900 dark:text-white p-3 min-h-[56px] rounded-xl focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors text-sm placeholder:font-normal placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Description</label>
                        <textarea value={card.back} onChange={e => updateCard(card.id, 'back', e.target.value)} placeholder="Enter description..."
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none resize-none font-medium text-zinc-700 dark:text-zinc-300 p-3 min-h-[56px] rounded-xl focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors text-sm placeholder:font-normal placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                    </div>

                    <button onClick={() => removeCard(card.id)}
                      className="w-7 h-7 shrink-0 flex items-center justify-center text-zinc-300 dark:text-zinc-600 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-all mt-1 rounded-lg hover:bg-red-500/10 touch-manipulation active:scale-90"
                    >
                      <FaTrashAlt size={11} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={addCard}
                className="w-full py-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-400 font-bold uppercase tracking-widest text-xs hover:border-[#06402B] dark:hover:border-emerald-500 hover:text-[#06402B] dark:hover:text-emerald-400 flex items-center justify-center gap-2 transition-all touch-manipulation"
              >
                <FaPlus size={10} /> Add Card
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STUDY ────────────────────────────────────────────────────────────────────
  if (view === 'study') {
    const currentCard = studyCards[currentIndex];
    const progress = (currentIndex / studyCards.length) * 100;
    const missedInSession = sessionResults.filter(r => !r.knew);

    return (
      <div className="fixed inset-0 z-50 flex flex-col md:absolute overflow-hidden"
        style={{ background: "var(--study-bg, #f9fafb)" }}
      >
        {/* Ambient glow — follows theme */}
        <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-950 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#06402B]/5 dark:bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-emerald-500/3 dark:bg-emerald-500/3 rounded-full blur-[60px] pointer-events-none" />
        <AnimatePresence>
          {showJumpSheet && (
            <JumpSheet cards={studyCards} current={currentIndex}
              onJump={(i) => { setCurrentIndex(i); setIsFlipped(false); setUserInput(""); setInputFeedback('none'); }}
              onClose={() => setShowJumpSheet(false)} cardFront={cardFront}
            />
          )}
          {showMissedSheet && (
            <MissedCardsSheet missed={missedInSession} onClose={() => setShowMissedSheet(false)} />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-6 flex items-center justify-between shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
                        <button onClick={() => {
              if (currentDeckId && studyCards.length > 0) {
                setMyDecks(prev => prev.map(deck => {
                  if (deck.id !== currentDeckId) return deck;
                  const updatedCards = (deck.cards || []).map((dc: Card) => {
                    const studied = studyCards.find((sc: Card) => sc.id === dc.id);
                    return studied ? { ...dc, ...studied } : dc;
                  });
                  return { ...deck, cards: updatedCards };
                }));
              }
              onStudyModeChange?.(false);
              setView(currentDeckId ? 'library' : 'editor');
            }}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 transition-all shrink-0 touch-manipulation"
            >
              <FaChevronLeft size={10} />
              <span className="hidden sm:inline">Exit</span>
            </button>
            <div className="min-w-0">
              <h3 className="font-black text-sm uppercase tracking-tight text-zinc-900 dark:text-white truncate">{deckTitle || "Review Session"}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[9px] font-mono font-bold text-[#06402B] dark:text-emerald-400 uppercase tracking-widest">
                  {studyMode === 'spaced' ? '🧠 Spaced Rep' : studyMode === 'flip' ? 'Flashcard' : 'Identification'}
                </p>
                {studySettings.reversed  && <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-400 rounded text-[8px] font-black uppercase">Reversed</span>}
                {studySettings.shuffled  && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[8px] font-black uppercase">Shuffled</span>}
                {studySettings.onlyStarred && <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[8px] font-black uppercase">⭐ Starred</span>}
                {againQueue.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded text-[8px] font-black uppercase">{againQueue.length} again</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {streak >= 3 && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded-lg">
                <FaFire size={10} className="text-amber-400" />
                <span className="text-amber-400 text-[10px] font-black">{streak}</span>
              </div>
            )}
            {missedInSession.length > 0 && (
              <button onClick={() => setShowMissedSheet(true)}
                className="hidden sm:flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                title="View missed cards"
              >
                <FaExclamationCircle size={9} className="text-red-400" />
                <span className="text-red-400 text-[10px] font-black">{missedInSession.length}</span>
              </button>
            )}
            <button onClick={() => setShowJumpSheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors touch-manipulation"
            >
              <FaList size={9} className="text-zinc-400" />
              <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 tabular-nums">{currentIndex + 1}/{studyCards.length}</span>
            </button>
            <button onClick={() => setShowKbdHints(h => !h)}
              className={`hidden md:flex w-8 h-8 rounded-xl items-center justify-center transition-all ${showKbdHints ? 'bg-[#06402B]/20 text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600'}`}
            >
              <FaKeyboard size={11} />
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <AnimatePresence>
          {showKbdHints && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-zinc-900/90 border-b border-zinc-800 shrink-0"
            >
              <div className="px-6 py-3 flex flex-wrap gap-x-6 gap-y-2">
                <KbdBadge keys={['Space']} label="Flip" />
                <KbdBadge keys={['→', 'K']} label="Got it" />
                <KbdBadge keys={['←', 'A']} label="Again" />
                <KbdBadge keys={['S']} label="Star" />
                <KbdBadge keys={['J']} label="Jump" />
                {studyMode === 'spaced' && <KbdBadge keys={['1-5']} label="Rate difficulty" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <div className="shrink-0 px-4 md:px-6 pt-2 pb-1.5 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-[#06402B] to-emerald-400 rounded-full"
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-black text-[#06402B] dark:text-emerald-400 tabular-nums">{knownCount}✓</span>
              {sessionResults.filter(r => !r.knew).length > 0 && (
                <span className="text-[10px] font-black text-red-400 tabular-nums">{sessionResults.filter(r => !r.knew).length}✗</span>
              )}
            </div>
          </div>
        </div>

        {/* Study content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">

          {/* ── FLIP MODE ── */}
          {(studyMode === 'flip' || studyMode === 'spaced') && (
            <AnimatePresence mode="wait">
              <motion.div key={currentIndex}
                initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -40, scale: 0.95 }} transition={{ duration: 0.22 }}
                className="w-full max-w-2xl"
              >
                {/* Side indicator */}
                <div className="flex items-center justify-center mb-3">
                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-full p-0.5 gap-0.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-300 ${!isFlipped ? 'bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 shadow-sm' : 'text-zinc-400'}`}>
                      {studySettings.reversed ? 'Description' : 'Term'}
                    </span>
                    <span className="text-[8px] text-zinc-400 px-1">→</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-300 ${isFlipped ? 'bg-[#06402B] text-white shadow-sm' : 'text-zinc-400'}`}>
                      {studySettings.reversed ? 'Term' : 'Description'}
                    </span>
                  </div>
                </div>

                <div className="w-full aspect-[3/2] sm:aspect-[4/3] md:aspect-[16/9] cursor-pointer select-none" onClick={() => setIsFlipped(!isFlipped)} style={{ transformStyle: "preserve-3d" }}>
                  <motion.div animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.45, type: "spring", stiffness: 320, damping: 28 }}
                    className="w-full h-full relative" style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 backface-hidden bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-xl flex flex-col items-center justify-center p-8 text-center hover:border-[#06402B]/30 transition-colors">
                      <p className="absolute top-5 left-6 text-[9px] font-black text-zinc-400 uppercase tracking-widest">{studySettings.reversed ? 'Description' : 'Term'}</p>
                      <button onClick={e => { e.stopPropagation(); setStudyCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, starred: !c.starred } : c)); }}
                        className={`absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${currentCard.starred ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-amber-400'}`}
                        title="Star card (S)"
                      >
                        <FaStar size={12} />
                      </button>
                      {/* Spaced rep interval badge */}
                      {studyMode === 'spaced' && currentCard.interval && (
                        <div className="absolute bottom-4 right-5 flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                          <FaClock size={8} className="text-zinc-400" />
                          <span className="text-[9px] font-black text-zinc-500">+{currentCard.interval}d</span>
                        </div>
                      )}
                      {!isFlipped && (
                        <div className="flex items-center gap-1.5 mb-5 text-zinc-300 dark:text-zinc-700">
                          <div className="w-4 h-px bg-current" />
                          <p className="text-[9px] font-black uppercase tracking-[0.2em]">tap to reveal</p>
                          <div className="w-4 h-px bg-current" />
                        </div>
                      )}
                      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black leading-tight text-zinc-900 dark:text-white break-words max-w-full px-2">{cardFront(currentCard)}</h2>
                    </div>
                    {/* Back */}
                    <div className="absolute inset-0 backface-hidden rounded-[2rem] shadow-xl flex flex-col items-center justify-center p-8 text-center overflow-hidden"
                      style={{ transform: "rotateY(180deg)", background: "linear-gradient(135deg, #06402B 0%, #0a5c3a 60%, #0d7a4d 100%)" }}
                    >
                      {/* Subtle dot pattern */}
                      <div className="absolute inset-0 opacity-[0.07]"
                        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
                      />
                      <p className="absolute top-5 left-6 text-[9px] font-black text-emerald-200/60 uppercase tracking-widest z-10">{studySettings.reversed ? 'Term' : 'Description'}</p>
                      {studySettings.autoAdvance && isFlipped && (
                        <div className="absolute top-4 right-5 flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg z-10">
                          <FaClock size={8} className="text-white/50" />
                          <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">2s</span>
                        </div>
                      )}
                      <div className="relative z-10 overflow-y-auto max-h-full w-full flex items-center justify-center">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold leading-relaxed text-white">{cardBack(currentCard)}</h2>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {!isFlipped && (
                  <p className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-4">Tap or press Space to reveal</p>
                )}

                {/* Spaced rep rating buttons — shown after flip */}
                <AnimatePresence>
                  {studyMode === 'spaced' && isFlipped && (
                    <motion.div
                      initial={{ opacity: 0, y: 16, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="mt-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] p-4 space-y-3"
                    >
                      <p className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest">How well did you know this?</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { q: 1 as const, label: "Again",  sub: "Blackout",         emoji: "😶", color: "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 active:bg-red-500/30" },
                          { q: 2 as const, label: "Hard",   sub: "With effort",       emoji: "😓", color: "bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20 active:bg-orange-500/30" },
                          { q: 3 as const, label: "Good",   sub: "Some hesitation",   emoji: "🙂", color: "bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20 active:bg-amber-500/30" },
                          { q: 5 as const, label: "Easy",   sub: "Perfect recall",    emoji: "😄", color: "bg-[#06402B]/10 border-[#06402B]/30 text-[#06402B] dark:text-emerald-400 hover:bg-[#06402B]/20 active:bg-[#06402B]/30" },
                        ].map(({ q, label, sub, emoji, color }) => (
                          <button key={q} onClick={() => rateCard(q)}
                            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 touch-manipulation ${color}`}
                          >
                            <span className="text-base">{emoji}</span>
                            {label}
                            <span className="text-[8px] font-medium normal-case tracking-normal opacity-70">{sub}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest opacity-60 hidden md:block">Press 1–4 on keyboard to rate</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          )}

          {/* ── IDENTIFICATION MODE ── */}
          {studyMode === 'identification' && (
            <AnimatePresence mode="wait">
              <motion.div key={currentIndex}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-xl space-y-4"
              >
                <div className={`relative bg-white dark:bg-zinc-900 border-2 rounded-[2rem] p-8 shadow-xl text-center transition-all duration-300 ${
                  inputFeedback === 'wrong' ? 'border-red-500 bg-red-50 dark:bg-red-500/10'
                  : inputFeedback === 'close' ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/5'
                  : 'border-zinc-200 dark:border-zinc-800'
                }`}>
                  {inputFeedback === 'exact' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#06402B] rounded-[1.9rem] flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <FaCheckCircle size={36} className="text-white" />
                        <p className="text-2xl font-black text-white uppercase tracking-tight">Correct!</p>
                      </div>
                    </motion.div>
                  )}
                  {inputFeedback === 'close' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-amber-500 rounded-[1.9rem] flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <FaLightbulb size={36} className="text-white" />
                        <p className="text-xl font-black text-white uppercase tracking-tight">Close Enough!</p>
                        <p className="text-sm text-white/80 font-medium">Typo accepted</p>
                      </div>
                    </motion.div>
                  )}
                  <button onClick={() => setStudyCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, starred: !c.starred } : c))}
                    className={`absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${currentCard.starred ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-amber-400'}`}
                  >
                    <FaStar size={12} />
                  </button>
                  <p className="absolute top-5 left-6 text-[9px] font-black text-zinc-400 uppercase tracking-widest">{studySettings.reversed ? 'Term' : 'Description'}</p>
                  <p className="text-lg sm:text-xl font-medium leading-relaxed text-zinc-800 dark:text-zinc-200 mt-4">{cardBack(currentCard)}</p>
                </div>

                {!isFlipped ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input ref={inputRef} type="text" value={userInput}
                        onChange={e => { setUserInput(e.target.value); setInputFeedback('none'); }}
                        onKeyDown={e => e.key === 'Enter' && checkAnswer()}
                        onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                        placeholder={`Type the ${studySettings.reversed ? 'description' : 'term'}…`}
                        className={`flex-1 bg-white dark:bg-zinc-900 border-2 outline-none rounded-2xl px-5 py-4 text-base font-bold shadow-sm transition-colors ${
                          inputFeedback === 'wrong' ? 'border-red-500 text-red-500 dark:text-red-400'
                          : inputFeedback === 'close' ? 'border-amber-400'
                          : 'border-zinc-200 dark:border-zinc-700 focus:border-[#06402B] dark:focus:border-emerald-500 text-zinc-900 dark:text-white'
                        } placeholder:font-normal placeholder:text-zinc-300 dark:placeholder:text-zinc-600`}
                        style={{ fontSize: "16px", animation: inputFeedback === 'wrong' ? 'shake 0.3s ease-in-out' : 'none' }}
                        autoCapitalize="off" autoCorrect="off" spellCheck={false}
                      />
                      <button onClick={checkAnswer}
                        className="px-5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-md hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all text-xs touch-manipulation"
                      >
                        Check
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setIsFlipped(true)}
                        className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-1"
                      >
                        Show answer
                      </button>
                      {inputFeedback === 'wrong' && (
                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse">Try again…</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-[#06402B]/5 dark:bg-emerald-500/10 border border-[#06402B]/20 dark:border-emerald-500/20 rounded-2xl p-5 text-center"
                  >
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">The correct {studySettings.reversed ? 'description' : 'term'} was</p>
                    <p className="text-2xl font-black text-[#06402B] dark:text-emerald-400">{cardFront(currentCard)}</p>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Bottom controls — flip/standard mode */}
        {studyMode !== 'spaced' && (studyMode === 'flip' || isFlipped) && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl px-4 md:px-8 py-3 md:py-4 shrink-0"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            {/* Swipe hint — mobile only, disappears after first flip */}
            {studyMode === 'flip' && !isFlipped && (
              <p className="text-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2 md:hidden">
                Tap card to reveal answer
              </p>
            )}
            <div className="flex items-center justify-center gap-3 max-w-sm mx-auto">
              <button onClick={() => handleNext(false)} disabled={studyMode === 'flip' && !isFlipped}
                className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 active:scale-95 transition-all text-xs touch-manipulation"
              >
                <FaRedo size={11} /> Again
              </button>
              <button onClick={() => handleNext(true)} disabled={studyMode === 'flip' && !isFlipped}
                className="flex-1 py-4 bg-[#06402B] dark:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-20 hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all shadow-md text-xs touch-manipulation"
              >
                <FaCheck size={11} /> Got It
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── RESULTS ─────────────────────────────────────────────────────────────────
  if (view === 'results') {
    const score = Math.min(100, Math.round((sessionResults.length > 0 ? sessionResults.filter(r => r.knew).length / sessionResults.length : 0) * 100));
    const starredCount = studyCards.filter(c => c.starred).length;
    const missedCards = sessionResults.filter(r => !r.knew);
    const perfectCards = sessionResults.filter(r => r.knew && r.attempts === 1);

    return (
        <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto"
          style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
        >
        <AnimatePresence>
          {showMissedOnResults && <MissedCardsSheet missed={missedCards} onClose={() => setShowMissedOnResults(false)} />}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 sm:p-8 text-center shadow-2xl my-auto"
        >
          {/* Score ring */}
          <div className="relative w-28 h-28 mx-auto mb-4 flex items-center justify-center">
            <ProgressRing value={score} max={100} size={112}
              color={score >= 80 ? '#06402B' : score >= 50 ? '#f59e0b' : '#ef4444'}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-black ${score >= 80 ? 'text-[#06402B] dark:text-emerald-400' : score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{score}%</span>
            </div>
          </div>

          {deckTitle && (
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 truncate px-2">{deckTitle}</p>
          )}
          <h2 className={`text-2xl font-black uppercase tracking-tight mb-1 ${
            score >= 90 ? 'text-[#06402B] dark:text-emerald-400'
            : score >= 80 ? 'text-zinc-900 dark:text-white'
            : score >= 50 ? 'text-amber-600 dark:text-amber-400'
            : 'text-red-600 dark:text-red-400'
          }`}>
            {score >= 90 ? '🏆 Mastered!' : score >= 80 ? '🎉 Great Job!' : score >= 50 ? '💪 Keep Going!' : '🔁 Keep Practicing!'}
          </h2>
          <p className="text-zinc-500 font-medium text-sm mb-4">
            <span className="font-black text-zinc-800 dark:text-zinc-200">{sessionResults.filter(r => r.knew).length}</span>
            <span className="text-zinc-400 mx-1">of</span>
            <span className="font-black text-zinc-800 dark:text-zinc-200">{sessionResults.length}</span>
            <span className="text-zinc-400 ml-1">known</span>
          </p>
          {/* Session stats row */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Best Streak", value: maxStreak, icon: "🔥", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
              { label: "First Try", value: perfectCards.length, icon: "⚡", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20" },
              { label: "Missed", value: missedCards.length, icon: "❌", color: missedCards.length === 0 ? "text-emerald-500" : "text-red-500", bg: missedCards.length === 0 ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
            ].map(s => (
              <div key={s.label} className={`flex flex-col items-center gap-1 p-3 rounded-xl border ${s.bg}`}>
                <span className="text-base">{s.icon}</span>
                <span className={`text-xl font-black tabular-nums ${s.color}`}>{s.value}</span>
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest text-center leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Missed cards shortcut */}
          {missedCards.length > 0 && (
            <button onClick={() => setShowMissedOnResults(true)}
              className="w-full mb-3 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors touch-manipulation"
            >
              <FaExclamationCircle size={10} /> Review {missedCards.length} missed card{missedCards.length !== 1 ? 's' : ''}
            </button>
          )}

          {starredCount > 0 && (
            <p className="text-[11px] text-amber-500 font-bold mb-3">⭐ {starredCount} card{starredCount !== 1 ? 's' : ''} starred</p>
          )}

          <div className="space-y-2">
            <button onClick={() => startStudy(studyMode)}
              className="w-full py-3.5 bg-[#06402B] dark:bg-emerald-600 text-white font-black rounded-xl uppercase tracking-widest text-xs hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all shadow-md touch-manipulation"
            >
              Study Again
            </button>
            {missedCards.length > 0 && (
              <button onClick={() => {
                // Study only missed cards
                const missedPool = studyCards.filter(c => sessionResults.find(r => r.cardId === c.id && !r.knew));
                setStudyCards(missedPool.length > 0 ? missedPool : studyCards);
                setCurrentIndex(0); setKnownCount(0); setStreak(0); setMaxStreak(0);
                setIsFlipped(false); setUserInput(""); setInputFeedback('none');
                setSessionResults([]); setCardAttempts({}); setAgainQueue([]);
                onStudyModeChange?.(true);
                setView('study');
              }}
                className="w-full py-3.5 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-black rounded-xl uppercase tracking-widest text-xs hover:bg-red-500/20 transition-all touch-manipulation"
              >
                <FaRedo className="inline mr-1.5" size={10} /> Retry Missed Only
              </button>
            )}
            {starredCount > 0 && (
              <button onClick={() => {
                setStudySettings(s => ({ ...s, onlyStarred: true }));
                setCards(studyCards);
                startStudy(studyMode);
              }}
                className="w-full py-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black rounded-xl uppercase tracking-widest text-xs hover:bg-amber-500/20 transition-all touch-manipulation"
              >
                <FaStar className="inline mr-1.5" size={10} /> Study Starred Only
              </button>
            )}
            <button onClick={() => {
              // Sync SM-2 fields + starred state back into myDecks local state
              if (currentDeckId) {
                setMyDecks(prev => prev.map(deck => {
                  if (deck.id !== currentDeckId) return deck;
                  const updatedCards = (deck.cards || []).map((dc: Card) => {
                    const studied = studyCards.find((sc: Card) => sc.id === dc.id);
                    return studied ? { ...dc, ...studied } : dc;
                  });
                  return { ...deck, cards: updatedCards };
                }));
              }
              onStudyModeChange?.(false);
              setView('library');
            }}
              className="w-full py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl uppercase tracking-widest text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors touch-manipulation"
            >
              Back to Vault
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}