"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaPlay, FaTimes, FaCheck, FaRedo, 
  FaSave, FaGlobe, FaLock, FaTrashAlt, FaLayerGroup, 
  FaKeyboard, FaFileImport, FaEdit, FaTags, FaArrowLeft,
  FaCheckCircle, FaBolt, FaRandom, FaStar, FaExchangeAlt,
  FaChevronLeft, FaChevronRight, FaKeyboard as FaKbd, FaList
} from "react-icons/fa";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs, orderBy, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/db"; 
import { useModal } from "../../context/ModalContext";

type Card = { id: string; front: string; back: string; starred?: boolean };
type ViewMode = 'library' | 'editor' | 'study' | 'results' | 'jump';
type StudyMode = 'flip' | 'identification';


// ─── Study Settings ──────────────────────────────────────────────────────────
interface StudySettings {
  reversed: boolean;      // description → term
  shuffled: boolean;
  onlyStarred: boolean;
  autoAdvance: boolean;   // flip mode: auto-advance after N seconds on reveal
}

const defaultSettings: StudySettings = {
  reversed: false,
  shuffled: false,
  onlyStarred: false,
  autoAdvance: false,
};

// ─── Keyboard Hint Badge ─────────────────────────────────────────────────────
function KbdBadge({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-1">
        {keys.map(k => (
          <span key={k} className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9px] font-mono font-bold text-zinc-400">{k}</span>
        ))}
      </div>
      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ─── Jump-to-Card Sheet ──────────────────────────────────────────────────────
function JumpSheet({ cards, current, onJump, onClose, cardFront }: {
  cards: Card[]; current: number; onJump: (i: number) => void; onClose: () => void;
  cardFront: (c: Card) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl max-h-[70vh] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <p className="text-xs font-black uppercase tracking-widest text-white">Jump to Card</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><FaTimes size={13} /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {cards.map((card, i) => (
            <button
              key={card.id}
              onClick={() => { onJump(i); onClose(); }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-zinc-800/60 transition-colors border-b border-zinc-900 ${i === current ? 'bg-[#06402B]/20' : ''}`}
            >
              <span className="text-[10px] font-mono font-bold text-zinc-500 w-6 shrink-0">{i + 1}</span>
              <span className="text-sm font-bold text-zinc-200 truncate flex-1">{cardFront(card)}</span>
              {card.starred && <FaStar size={10} className="text-amber-400 shrink-0" />}
              {i === current && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Pre-Study Settings Modal ────────────────────────────────────────────────
function StudySettingsModal({
  settings, onChange, onStart, onClose, totalCards, starredCount
}: {
  settings: StudySettings;
  onChange: (s: StudySettings) => void;
  onStart: (mode: StudyMode) => void;
  onClose: () => void;
  totalCards: number;
  starredCount: number;
}) {
  const Toggle = ({ label, sublabel, value, onToggle, disabled }: {
    label: string; sublabel?: string; value: boolean; onToggle: () => void; disabled?: boolean;
  }) => (
    <div className={`flex items-center justify-between gap-3 py-3 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div>
        <p className="text-sm font-bold text-zinc-200">{label}</p>
        {sublabel && <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{sublabel}</p>}
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full relative transition-all shrink-0 ${value ? 'bg-[#06402B]' : 'bg-zinc-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${value ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );

  const set = (patch: Partial<StudySettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-base font-black uppercase tracking-tight text-white">Study Options</p>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{totalCards} cards total • {starredCount} starred</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><FaTimes size={13} /></button>
        </div>

        <div className="px-6 divide-y divide-zinc-900">
          <Toggle
            label="Reverse Cards"
            sublabel="Show description first, type/recall the term"
            value={settings.reversed}
            onToggle={() => set({ reversed: !settings.reversed })}
          />
          <Toggle
            label="Shuffle Order"
            sublabel="Randomize card sequence each session"
            value={settings.shuffled}
            onToggle={() => set({ shuffled: !settings.shuffled })}
          />
          <Toggle
            label="Starred Cards Only"
            sublabel={starredCount === 0 ? "No starred cards yet" : `Study only your ${starredCount} starred cards`}
            value={settings.onlyStarred}
            onToggle={() => set({ onlyStarred: !settings.onlyStarred })}
            disabled={starredCount === 0}
          />
          <Toggle
            label="Auto-Advance (Flip mode)"
            sublabel="Move to next card 2s after revealing"
            value={settings.autoAdvance}
            onToggle={() => set({ autoAdvance: !settings.autoAdvance })}
          />
        </div>

        <div className="px-6 py-5 space-y-2 border-t border-zinc-900">
          <button
            onClick={() => onStart('flip')}
            className="w-full py-3.5 bg-zinc-900 border border-zinc-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:border-emerald-600 transition-all"
          >
            <FaLayerGroup size={12} /> Flashcard Mode
          </button>
          <button
            onClick={() => onStart('identification')}
            className="w-full py-3.5 bg-[#06402B] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#042d1f] active:scale-95 transition-all shadow-lg"
          >
            <FaKeyboard size={12} /> Identification Mode
          </button>
        </div>
      </motion.div>
    </div>
  );
}
interface FlashcardMakerProps {
  onStudyModeChange?: (studying: boolean) => void;
}

export default function FlashcardMaker({ onStudyModeChange }: FlashcardMakerProps) {
// ─── Main Component ──────────────────────────────────────────────────────────
  const [view, setView] = useState<ViewMode>('library');
  const [studyMode, setStudyMode] = useState<StudyMode>('flip');
  const { showAlert, showConfirm } = useModal();

  const [myDecks, setMyDecks] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubject, setDeckSubject] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [deckCollege, setDeckCollege] = useState("General");
  const [isSaving, setIsSaving] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [delimiter, setDelimiter] = useState<'-' | ',' | 'tab'>('tab');

  // Study state
  const [studyCards, setStudyCards] = useState<Card[]>([]);
  const [studySettings, setStudySettings] = useState<StudySettings>(defaultSettings);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<StudyMode | null>(null);
  const [pendingDeck, setPendingDeck] = useState<any | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [showJumpSheet, setShowJumpSheet] = useState(false);
  const [showKbdHints, setShowKbdHints] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  const [originalState, setOriginalState] = useState<{
  title: string; subject: string; cards: Card[];
} | null>(null);

  const [sendToUsername, setSendToUsername] = useState("");
  const [isSending, setIsSending] = useState(false);

  const fetchMyDecks = async () => {
    if (!auth.currentUser) return;
    setIsLoadingLibrary(true);
    const q = query(collection(db, "flashcard_decks"), where("userId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    setMyDecks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setIsLoadingLibrary(false);
  };

  useEffect(() => {
    if (view === 'library') fetchMyDecks();
  }, [view]);

  // ── Keyboard shortcuts (study view) ────────────────────────────────────────
  const handleNext = useCallback((knewIt: boolean) => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (knewIt) { setKnownCount(p => p + 1); setStreak(p => p + 1); }
    else setStreak(0);
    setIsFlipped(false);
    setUserInput("");
    setShowAnswerFeedback('none');
    setTimeout(() => {
      setCurrentIndex(prev => {
        if (prev < studyCards.length - 1) return prev + 1;
        setView('results');
        return prev;
      });
    }, 200);
  }, [studyCards.length]);

  useEffect(() => {
    if (view !== 'study') return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') { e.preventDefault(); setIsFlipped(f => !f); }
      if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
        if (studyMode === 'flip' && isFlipped) handleNext(true);
      }
      if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
        if (studyMode === 'flip' && isFlipped) handleNext(false);
      }
      if (e.key.toLowerCase() === 'k' && studyMode === 'flip' && isFlipped) handleNext(true);
      if (e.key.toLowerCase() === 'a' && studyMode === 'flip' && isFlipped) handleNext(false);
      if (e.key.toLowerCase() === 's') {
        setStudyCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, starred: !c.starred } : c));
      }
      if (e.key.toLowerCase() === 'j') setShowJumpSheet(j => !j);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, studyMode, isFlipped, currentIndex, handleNext]);

  // Auto-advance
  useEffect(() => {
    if (view === 'study' && studyMode === 'flip' && isFlipped && studySettings.autoAdvance) {
      autoAdvanceTimer.current = setTimeout(() => handleNext(true), 2000);
    }
    return () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current); };
  }, [isFlipped, view, studyMode, studySettings.autoAdvance, handleNext]);

  // ── Deck actions ────────────────────────────────────────────────────────────
  const createNewDeck = () => {
  setCurrentDeckId(null); setDeckTitle(""); setDeckSubject("");
  setIsPublic(false); setDeckCollege("General");
  setCards([{ id: Date.now().toString(), front: '', back: '' }]);
  setOriginalState(null); // new deck, nothing to diff against
  setView('editor');
};

const editExistingDeck = (deck: any) => {
  setCurrentDeckId(deck.id); setDeckTitle(deck.title); setDeckSubject(deck.subject);
  setIsPublic(deck.isPublic || false); setDeckCollege(deck.college || "General");
  setCards(deck.cards || []);
  // Save original so we can diff later
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

  // ── Open study settings before starting ─────────────────────────────────────
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

  // ── Start study with settings applied ───────────────────────────────────────
const startStudy = (mode: StudyMode) => {
  setShowSettingsModal(false);
  let pool = (pendingDeck ? (pendingDeck.cards || []).filter((c: Card) => c.front?.trim() && c.back?.trim()) : cards.filter(c => c.front?.trim() && c.back?.trim()))
    .map((c: Card) => ({ ...c }));

  if (studySettings.onlyStarred) {
    const starred = pool.filter((c: Card) => c.starred);
    if (starred.length === 0) { showAlert("No Starred Cards", "Star some cards during study first."); return; }
    pool = starred;
  }
  if (studySettings.shuffled) pool = [...pool].sort(() => Math.random() - 0.5);

  setStudyCards(pool);
  setStudyMode(mode);
  onStudyModeChange?.(true); // ✅ only this
  setCurrentIndex(0); setKnownCount(0); setStreak(0);
  setIsFlipped(false); setUserInput(""); setShowAnswerFeedback('none');
  setPendingDeck(null);
  setView('study');
};

  // Card front/back with reversal
  const cardFront = (c: Card) => studySettings.reversed ? c.back : c.front;
  const cardBack  = (c: Card) => studySettings.reversed ? c.front : c.back;

  // Star toggle during study
  const toggleStar = () => {
    setStudyCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, starred: !c.starred } : c));
  };

  // ── Editor actions ──────────────────────────────────────────────────────────
  const addCard = () => {
    if (cards.length >= 500) return showAlert("Deck Full", "Max 500 cards.");
    setCards([...cards, { id: Date.now().toString(), front: '', back: '' }]);
  };

  const updateCard = (id: string, field: 'front' | 'back', value: string) =>
    setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));

  const removeCard = (id: string) => {
    if (cards.length <= 1) return showAlert("Can't Remove", "Must have at least one card.");
    showConfirm("Remove Card", "Remove this card?", () => setCards(cards.filter(c => c.id !== id)), "Remove", true);
  };

  const handleBulkImport = () => {
    if (!importText.trim()) return showAlert("Empty Import", "Paste your terms first.");
    const separator = delimiter === 'tab' ? '\t' : delimiter;
    const lines = importText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return showAlert("Nothing Found", "No valid lines detected.");
    if (lines.length > 200) return showAlert("Too Many Cards", `Max 200 per import. You tried ${lines.length}.`);
    const newCards: Card[] = []; const skipped: number[] = [];
    lines.forEach((line, index) => {
      const cleanLine = line.replace(/\u00A0/g,' ').replace(/\u200B/g,'').replace(/\uFEFF/g,'').trim();
      if (!cleanLine) return;
      const splitIndex = cleanLine.indexOf(separator);
      if (splitIndex === -1) { skipped.push(index + 1); return; }
      const front = cleanLine.substring(0, splitIndex).trim();
      const back  = cleanLine.substring(splitIndex + separator.length).trim();
      if (!front || !back) { skipped.push(index + 1); return; }
      newCards.push({ id: `import-${Date.now()}-${index}`, front: front.substring(0,300), back: back.substring(0,500) });
    });
    if (newCards.length === 0) return showAlert("No Valid Cards", "Check delimiter and format.");
    const combined = [...cards.filter(c => c.front.trim() || c.back.trim()), ...newCards];
    if (combined.length > 500) return showAlert("Deck Too Large", "Max 500 cards.");
    setCards(combined); setImportText(""); setShowImportModal(false);
    if (skipped.length > 0) showAlert("Import Complete", `${newCards.length} cards imported. ${skipped.length} skipped.`);
  };

  const handleSaveDeck = async () => {
    if (!deckTitle.trim() || deckTitle.trim().length < 3) return showAlert("Title Issue", "Title must be 3–100 characters.");
    if (!deckSubject.trim()) return showAlert("Missing Subject", "Enter a course code.");
    if (cards.length === 0) return showAlert("No Cards", "Add at least one card.");
    const emptyCards = cards.filter(c => !c.front.trim() || !c.back.trim());
    if (emptyCards.length > 0) return showAlert("Incomplete Cards", `${emptyCards.length} card(s) missing term or description.`);
    if (!auth.currentUser) return showAlert("Not Logged In", "You must be logged in to save.");
    setIsSaving(true);
      setOriginalState(null);
  setView('library');
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const username = userDoc.exists() ? userDoc.data().username : "Lasallian";
      const deckData = {
        userId: auth.currentUser.uid, authorUsername: username,
        title: deckTitle.trim(), subject: deckSubject.trim().toUpperCase(),
        college: isPublic ? deckCollege : "Private",
        cards: cards.map(c => ({ id: c.id, front: c.front.trim(), back: c.back.trim(), starred: c.starred || false })),
        isPublic,
      };
      if (currentDeckId) await updateDoc(doc(db, "flashcard_decks", currentDeckId), deckData);
      else await addDoc(collection(db, "flashcard_decks"), { ...deckData, upvotes: 0, downloads: 0, createdAt: serverTimestamp() });
      setView('library');
    } catch { showAlert("Save Failed", "Something went wrong. Try again."); }
    finally { setIsSaving(false); }
  };

  const handleSendToFriend = async () => {
    if (!sendToUsername.trim()) return showAlert("Missing Username", "Enter a username.");
    if (!deckTitle.trim()) return showAlert("No Title", "Save your deck with a title first.");
    const validCards = cards.filter(c => c.front?.trim() && c.back?.trim());
    if (validCards.length === 0) return showAlert("No Cards", "No complete cards to send.");
    if (!auth.currentUser) return showAlert("Not Logged In", "Log in to send.");
    setIsSending(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", sendToUsername.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) { showAlert("User Not Found", "No user with that username."); setIsSending(false); return; }
      if (snap.docs[0].id === auth.currentUser.uid) { showAlert("Can't Send to Yourself", "Pick a different user."); setIsSending(false); return; }
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const myName = userDoc.exists() ? userDoc.data().username : "A Lasallian";
      await addDoc(collection(db, "inbox"), {
        type: "deck_share", recipientId: snap.docs[0].id, senderId: auth.currentUser.uid,
        senderName: myName, deckTitle: deckTitle.trim(), deckSubject: deckSubject.trim() || "General",
        cards: validCards, status: "pending", createdAt: serverTimestamp(),
      });
      showAlert("Sent!", `Reviewer sent to @${sendToUsername.trim()}.`);
      setSendToUsername("");
    } catch { showAlert("Send Failed", "Something went wrong."); }
    finally { setIsSending(false); }
  };

  const checkIdentificationAnswer = () => {
    if (!userInput.trim()) return;
    const normalize = (s: string) => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").replace(/\s{2,}/g," ").trim();
    if (normalize(userInput) === normalize(cardFront(studyCards[currentIndex]))) {
      setShowAnswerFeedback('correct');
      setTimeout(() => handleNext(true), 1000);
    } else {
      setShowAnswerFeedback('incorrect');
      setTimeout(() => setShowAnswerFeedback('none'), 1200);
    }
  };

  useEffect(() => {
    if (view === 'study' && studyMode === 'identification' && !isFlipped) inputRef.current?.focus();
  }, [currentIndex, view, studyMode, isFlipped]);

  // ─── LIBRARY ─────────────────────────────────────────────────────────────────
  if (view === 'library') {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4">
        <AnimatePresence>
          {showSettingsModal && (
            <StudySettingsModal
              settings={studySettings}
              onChange={setStudySettings}
              onStart={startStudy}
              onClose={() => setShowSettingsModal(false)}
              totalCards={pendingDeck?.cards?.length || 0}
              starredCount={(pendingDeck?.cards || []).filter((c: Card) => c.starred).length}
            />
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div>
            <h2 className="text-2xl font-black tracking-tight uppercase text-zinc-900 dark:text-white">My Vault</h2>
            <p className="text-zinc-500 text-sm font-medium mt-0.5">
              {myDecks.length > 0 ? `${myDecks.length} reviewer${myDecks.length !== 1 ? 's' : ''} in your collection` : 'Your personal collection of study materials'}
            </p>
          </div>
          <button onClick={createNewDeck} className="w-full sm:w-auto py-3 px-6 bg-[#06402B] dark:bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shrink-0">
            <FaPlus size={12} /> New Reviewer
          </button>
        </div>

        {isLoadingLibrary ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#06402B]/20 border-t-[#06402B] rounded-full animate-spin"/>
          </div>
        ) : myDecks.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
            <div className="w-16 h-16 rounded-2xl bg-[#06402B]/10 dark:bg-emerald-500/10 flex items-center justify-center text-[#06402B] dark:text-emerald-400">
              <FaLayerGroup size={28} />
            </div>
            <div className="text-center">
              <p className="font-black text-zinc-900 dark:text-white uppercase tracking-tight">No reviewers yet</p>
              <p className="text-zinc-500 text-sm font-medium mt-1">Create your first deck to get started</p>
            </div>
            <button onClick={createNewDeck} className="px-6 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#042d1f] transition-all shadow-md">
              Create First Reviewer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {myDecks.map((deck) => {
              const starredCount = (deck.cards || []).filter((c: Card) => c.starred).length;
              return (
                <motion.div key={deck.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[1.75rem] p-5 hover:border-[#06402B]/40 dark:hover:border-emerald-500/40 hover:shadow-lg transition-all flex flex-col relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="px-2.5 py-1 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-widest">
                      {deck.subject}
                    </span>
                    <div className="flex items-center gap-1.5">
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
                      <button onClick={() => deleteDeck(deck.id)} className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <FaTrashAlt size={9} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 mb-4">
                    <h3 className="text-base font-black text-zinc-900 dark:text-white leading-tight line-clamp-2 mb-1">{deck.title}</h3>
                    <p className="text-[11px] text-zinc-400 font-bold">{deck.cards?.length || 0} {deck.cards?.length === 1 ? 'term' : 'terms'}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => openStudySettings(deck)}
                      className="col-span-2 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 hover:opacity-80 transition-all"
                    >
                      <FaPlay size={9} /> Study
                    </button>
                    <button onClick={() => editExistingDeck(deck)}
                      className="py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center hover:bg-[#06402B] hover:text-white dark:hover:bg-emerald-600 transition-all"
                      title="Edit"
                    >
                      <FaEdit size={11} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── EDITOR ──────────────────────────────────────────────────────────────────
  if (view === 'editor') {
    return (
      <div className="max-w-4xl mx-auto pb-20 animate-in fade-in">
        <AnimatePresence>
          {showSettingsModal && (
            <StudySettingsModal
              settings={studySettings}
              onChange={setStudySettings}
              onStart={startStudy}
              onClose={() => setShowSettingsModal(false)}
              totalCards={cards.filter(c => c.front.trim() && c.back.trim()).length}
              starredCount={cards.filter(c => c.starred).length}
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
                <div className="flex gap-2 mb-4">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest self-center mr-1">Separator:</p>
                  {(['tab', '-', ','] as const).map(sep => (
                    <button key={sep} onClick={() => setDelimiter(sep)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs transition-all border-2 ${delimiter === sep ? 'bg-[#06402B]/10 border-[#06402B] text-[#06402B] dark:bg-emerald-500/10 dark:border-emerald-500 dark:text-emerald-400' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300'}`}
                    >
                      {sep === 'tab' ? 'Tab ↹' : sep === '-' ? 'Dash  —' : 'Comma ,'}
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

        <button onClick={() => {
  const isDirty = originalState
    ? deckTitle !== originalState.title ||
      deckSubject !== originalState.subject ||
      JSON.stringify(cards) !== JSON.stringify(originalState.cards)
    : deckTitle.trim() || deckSubject.trim() || cards.some(c => c.front.trim() || c.back.trim());

  if (isDirty) {
    showConfirm(
      "Discard Changes",
      "You have unsaved changes. Are you sure you want to go back without saving?",
      () => { setOriginalState(null); setView('library'); },
      "Discard",
      true
    );
  } else {
    setOriginalState(null);
    setView('library');
  }
}} className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors mb-6">
  <FaArrowLeft size={11} /> Back to Vault
</button>

        <div className="space-y-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 md:p-7">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-3">
                <input type="text" placeholder="Reviewer Title" value={deckTitle} onChange={e => setDeckTitle(e.target.value)}
                  className="w-full text-2xl md:text-3xl font-black bg-transparent border-none outline-none text-zinc-900 dark:text-white tracking-tight placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                />
                <input type="text" placeholder="Course Code (e.g. CS101)" value={deckSubject} onChange={e => setDeckSubject(e.target.value)}
                  className="w-full sm:w-56 text-xs font-bold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 uppercase tracking-widest text-[#06402B] dark:text-emerald-400 placeholder:text-zinc-400 placeholder:normal-case placeholder:tracking-normal"
                />
              </div>
              <div className="flex flex-row md:flex-col gap-2 shrink-0">
                <button onClick={openStudySettingsFromEditor}
                  className="flex-1 md:w-44 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-80 transition-all text-[10px]"
                >
                  <FaPlay size={11} /> Study
                </button>
                <button onClick={handleSaveDeck} disabled={isSaving}
                  className="flex-1 md:w-44 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? "Saving..." : <><FaSave size={12} /> Save</>}
                </button>
              </div>
            </div>
          </div>

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
                />
                <button onClick={handleSendToFriend} disabled={isSending}
                  className="px-4 py-2.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-[#042d1f] dark:hover:bg-emerald-500 transition-colors"
                >
                  {isSending ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>

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
                    <div className="w-6 shrink-0 flex items-start pt-2">
                      <span className="text-[10px] font-mono font-bold text-zinc-400">{index + 1}</span>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Term</label>
                        <textarea value={card.front} onChange={e => updateCard(card.id, 'front', e.target.value)} placeholder="Enter term..."
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none resize-none font-bold text-zinc-900 dark:text-white p-3 min-h-[56px] rounded-xl focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors text-sm placeholder:font-normal placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Description</label>
                        <textarea value={card.back} onChange={e => updateCard(card.id, 'back', e.target.value)} placeholder="Enter description..."
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none resize-none font-medium text-zinc-700 dark:text-zinc-300 p-3 min-h-[56px] rounded-xl focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors text-sm placeholder:font-normal placeholder:text-zinc-300 dark:placeholder:text-zinc-600"
                        />
                      </div>
                    </div>
                    <button onClick={() => removeCard(card.id)}
                      className="w-7 h-7 shrink-0 flex items-center justify-center text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all mt-1 rounded-lg hover:bg-red-500/10"
                    >
                      <FaTrashAlt size={11} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={addCard}
                className="w-full py-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-400 font-bold uppercase tracking-widest text-xs hover:border-[#06402B] dark:hover:border-emerald-500 hover:text-[#06402B] dark:hover:text-emerald-400 flex items-center justify-center gap-2 transition-all"
              >
                <FaPlus size={10} /> Add Card
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── STUDY ───────────────────────────────────────────────────────────────────
  if (view === 'study') {
    const currentCard = studyCards[currentIndex];
    const progress = (currentIndex / studyCards.length) * 100;

    return (
      <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 flex flex-col">

        {/* Jump Sheet */}
        <AnimatePresence>
          {showJumpSheet && (
            <JumpSheet
              cards={studyCards} current={currentIndex}
              onJump={(i) => { setCurrentIndex(i); setIsFlipped(false); setUserInput(""); setShowAnswerFeedback('none'); }}
              onClose={() => setShowJumpSheet(false)}
              cardFront={cardFront}
            />
          )}
        </AnimatePresence>

        {/* Study header */}
        <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-6 flex items-center justify-between shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => { onStudyModeChange?.(false); setView(currentDeckId ? 'library' : 'editor'); }}
  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-red-500/10 hover:text-red-500 transition-all shrink-0"
>
  <FaTimes size={13} />
</button>
            <div className="min-w-0">
              <h3 className="font-black text-sm uppercase tracking-tight text-zinc-900 dark:text-white truncate">{deckTitle || "Review Session"}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[9px] font-mono font-bold text-[#06402B] dark:text-emerald-400 uppercase tracking-widest">
                  {studyMode === 'flip' ? 'Flashcard' : 'Identification'} Mode
                </p>
                {studySettings.reversed && (
                  <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-400 rounded text-[8px] font-black uppercase tracking-widest">Reversed</span>
                )}
                {studySettings.shuffled && (
                  <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[8px] font-black uppercase tracking-widest">Shuffled</span>
                )}
                {studySettings.onlyStarred && (
                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[8px] font-black uppercase tracking-widest">⭐ Starred</span>
                )}
              </div>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Streak */}
            {streak >= 3 && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded-lg">
                <span className="text-amber-400 text-[10px] font-black">🔥 {streak}</span>
              </div>
            )}
            {/* Card counter / jump trigger */}
            <button onClick={() => setShowJumpSheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              title="Jump to card (J)"
            >
              <FaList size={9} className="text-zinc-400" />
              <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 tabular-nums">{currentIndex + 1}/{studyCards.length}</span>
            </button>
            {/* Keyboard hints toggle */}
            <button onClick={() => setShowKbdHints(h => !h)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${showKbdHints ? 'bg-[#06402B]/20 text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600'}`}
              title="Keyboard shortcuts"
            >
              <FaKbd size={11} />
            </button>
          </div>
        </div>

        {/* Keyboard hints panel */}
        <AnimatePresence>
          {showKbdHints && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-zinc-900/90 border-b border-zinc-800 shrink-0"
            >
              <div className="px-6 py-3 flex flex-wrap gap-x-6 gap-y-2">
                <KbdBadge keys={['Space']} label="Flip" />
                <KbdBadge keys={['→', 'K']} label="Got it" />
                <KbdBadge keys={['←', 'A']} label="Again" />
                <KbdBadge keys={['S']} label="Star card" />
                <KbdBadge keys={['J']} label="Jump to card" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-200 dark:bg-zinc-800 shrink-0">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-[#06402B] dark:bg-emerald-500" />
        </div>

        {/* Study content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">

          {studyMode === 'flip' && (
            <AnimatePresence mode="wait">
              <motion.div key={currentIndex} initial={{ opacity: 0, x: 40, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -40, scale: 0.95 }} transition={{ duration: 0.25 }} className="w-full max-w-2xl">
                {/* Direction indicator */}
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${!isFlipped ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500' : 'bg-transparent text-transparent'}`}>
                    {studySettings.reversed ? 'Description' : 'Term'}
                  </span>
                  <FaExchangeAlt size={8} className="text-zinc-400" />
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${isFlipped ? 'bg-[#06402B]/20 text-emerald-400' : 'bg-transparent text-transparent'}`}>
                    {studySettings.reversed ? 'Term' : 'Description'}
                  </span>
                </div>

                <div className="w-full aspect-[4/3] md:aspect-[16/9] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)} style={{ transformStyle: "preserve-3d" }}>
                  <motion.div animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.5, type: "spring", stiffness: 300, damping: 25 }} className="w-full h-full relative" style={{ transformStyle: "preserve-3d" }}>
                    {/* Front */}
                    <div className="absolute inset-0 backface-hidden bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-xl flex flex-col items-center justify-center p-8 text-center hover:border-[#06402B]/30 transition-colors">
                      <p className="absolute top-5 left-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">{studySettings.reversed ? 'Description' : 'Term'}</p>
                      {/* Star button */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleStar(); }}
                        className={`absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${currentCard.starred ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-amber-400'}`}
                        title="Star card (S)"
                      >
                        <FaStar size={11} />
                      </button>
                      <p className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600 uppercase tracking-widest mb-4">Tap to flip</p>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight text-zinc-900 dark:text-white break-words">{cardFront(currentCard)}</h2>
                    </div>
                    {/* Back */}
                    <div className="absolute inset-0 backface-hidden bg-[#06402B] border-2 border-[#06402B] rounded-[2rem] shadow-xl flex flex-col items-center justify-center p-8 text-center" style={{ transform: "rotateY(180deg)" }}>
                      <p className="absolute top-5 left-5 text-[9px] font-black text-emerald-300/70 uppercase tracking-widest">{studySettings.reversed ? 'Term' : 'Description'}</p>
                      {studySettings.autoAdvance && isFlipped && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg">
                          <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Auto 2s</span>
                        </div>
                      )}
                      <h2 className="text-lg sm:text-xl md:text-2xl font-medium leading-relaxed text-white overflow-y-auto max-h-full">{cardBack(currentCard)}</h2>
                    </div>
                  </motion.div>
                </div>
                {!isFlipped && (
                  <p className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-4">Tap or press Space to reveal</p>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {studyMode === 'identification' && (
            <AnimatePresence mode="wait">
              <motion.div key={currentIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-xl space-y-4">
                <div className={`relative bg-white dark:bg-zinc-900 border-2 rounded-[2rem] p-8 shadow-xl text-center transition-all duration-300 ${showAnswerFeedback === 'incorrect' ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-zinc-200 dark:border-zinc-800'}`}>
                  {showAnswerFeedback === 'correct' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#06402B] rounded-[1.9rem] flex items-center justify-center z-10">
                      <div className="flex flex-col items-center gap-2">
                        <FaCheckCircle size={36} className="text-white" />
                        <p className="text-2xl font-black text-white uppercase tracking-tight">Correct!</p>
                      </div>
                    </motion.div>
                  )}
                  {/* Star */}
                  <button onClick={toggleStar} className={`absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${currentCard.starred ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-amber-400'}`}>
                    <FaStar size={11} />
                  </button>
                  <p className="absolute top-5 left-5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">{studySettings.reversed ? 'Term' : 'Description'}</p>
                  <p className="text-lg sm:text-xl font-medium leading-relaxed text-zinc-800 dark:text-zinc-200 mt-4">{cardBack(currentCard)}</p>
                </div>

                {!isFlipped ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input ref={inputRef} type="text" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkIdentificationAnswer()}
                        placeholder={`Type the ${studySettings.reversed ? 'description' : 'term'} here...`}
                        className={`flex-1 bg-white dark:bg-zinc-900 border-2 outline-none rounded-2xl px-5 py-4 text-base font-bold shadow-sm transition-colors ${showAnswerFeedback === 'incorrect' ? 'border-red-500 text-red-500 dark:text-red-400' : 'border-zinc-200 dark:border-zinc-700 focus:border-[#06402B] dark:focus:border-emerald-500 text-zinc-900 dark:text-white'} placeholder:font-normal placeholder:text-zinc-300 dark:placeholder:text-zinc-600`}
                      />
                      <button onClick={checkIdentificationAnswer} className="px-5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-md hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all text-xs">Check</button>
                    </div>
                    <button onClick={() => setIsFlipped(true)} className="w-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-1">Show answer</button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[#06402B]/5 dark:bg-emerald-500/10 border border-[#06402B]/20 dark:border-emerald-500/20 rounded-2xl p-5 text-center">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">The correct {studySettings.reversed ? 'description' : 'term'} was</p>
                    <p className="text-2xl font-black text-[#06402B] dark:text-emerald-400">{cardFront(currentCard)}</p>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Bottom controls */}
        {(studyMode === 'flip' || isFlipped) && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl px-4 md:px-8 py-4 flex items-center justify-center gap-3 shrink-0">
            <button onClick={() => handleNext(false)} disabled={studyMode === 'flip' && !isFlipped}
              className="flex-1 sm:flex-none sm:w-44 py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 transition-all text-xs"
            >
              <FaRedo size={11} /> Again
            </button>
            <button onClick={() => handleNext(true)} disabled={studyMode === 'flip' && !isFlipped}
              className="flex-1 sm:flex-none sm:w-44 py-3.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-30 hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all shadow-md text-xs"
            >
              <FaCheck size={11} /> Got It
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── RESULTS ─────────────────────────────────────────────────────────────────
  if (view === 'results') {
    const score = Math.round((knownCount / studyCards.length) * 100);
    const starredCount = studyCards.filter(c => c.starred).length;
    return (
      <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 text-center shadow-2xl"
        >
          <div className="relative w-24 h-24 mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-100 dark:text-zinc-800" />
              <motion.circle cx="50" cy="50" r="40" fill="none"
                stroke={score >= 80 ? '#06402B' : score >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - score / 100) }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-black ${score >= 80 ? 'text-[#06402B] dark:text-emerald-400' : score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{score}%</span>
            </div>
          </div>

          <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-1">
            {score >= 80 ? 'Great Job!' : score >= 50 ? 'Keep Going!' : 'Keep Practicing!'}
          </h2>
          <p className="text-zinc-500 font-medium text-sm mb-2">
            You knew <span className="font-black text-zinc-800 dark:text-zinc-200">{knownCount}</span> out of <span className="font-black text-zinc-800 dark:text-zinc-200">{studyCards.length}</span> cards
          </p>
          {starredCount > 0 && (
            <p className="text-[11px] text-amber-500 font-bold mb-4">⭐ {starredCount} card{starredCount !== 1 ? 's' : ''} starred for review</p>
          )}

          <div className="space-y-2 mt-4">
            {/* Study only missed */}
            <button onClick={() => {
              const missed = studyCards.filter((_, i) => i >= knownCount); // approximation; ideally track by id
              startStudy(studyMode);
            }}
              className="w-full py-3.5 bg-[#06402B] dark:bg-emerald-600 text-white font-black rounded-xl uppercase tracking-widest text-xs hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all shadow-md"
            >
              Study Again
            </button>
            {starredCount > 0 && (
              <button onClick={() => {
                setStudySettings(s => ({ ...s, onlyStarred: true }));
                setCards(studyCards); // keep starred state
                startStudy(studyMode);
              }}
                className="w-full py-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black rounded-xl uppercase tracking-widest text-xs hover:bg-amber-500/20 transition-all"
              >
                <FaStar className="inline mr-1.5" size={10} /> Study Starred Only
              </button>
            )}
            <button onClick={() => { onStudyModeChange?.(false); setView('library'); }} className="w-full py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl uppercase tracking-widest text-xs hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
  Back to Vault
</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}