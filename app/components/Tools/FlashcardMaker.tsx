"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaPlay, FaTimes, FaCheck, FaRedo, 
  FaSave, FaGlobe, FaLock, FaTrashAlt, FaLayerGroup, FaKeyboard, FaFileImport, FaEdit, FaTags 
} from "react-icons/fa";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs, orderBy, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/db"; 
import { useModal } from "../../context/ModalContext";
type Card = { id: string; front: string; back: string };
type ViewMode = 'library' | 'editor' | 'study' | 'results';
type StudyMode = 'flip' | 'identification';

export default function FlashcardMaker() {
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const createNewDeck = () => {
    setCurrentDeckId(null);
    setDeckTitle("");
    setDeckSubject("");
    setIsPublic(false);
    setDeckCollege("General");
    setCards([{ id: Date.now().toString(), front: '', back: '' }]);
    setView('editor');
  };

  const editExistingDeck = (deck: any) => {
    setCurrentDeckId(deck.id);
    setDeckTitle(deck.title);
    setDeckSubject(deck.subject);
    setIsPublic(deck.isPublic || false);
    setDeckCollege(deck.college || "General");
    setCards(deck.cards || []);
    setView('editor');
  };

const deleteDeck = (deckId: string) => {
  showConfirm(
    "Delete Reviewer",
    "Are you sure you want to permanently delete this reviewer? This cannot be undone.",
    async () => {
      try {
        await deleteDoc(doc(db, "flashcard_decks", deckId));
        setMyDecks(prev => prev.filter(d => d.id !== deckId));
      } catch (error) {
        console.error(error);
        showAlert("Delete Failed", "Could not delete this deck. Please try again.");
      }
    },
    "Delete",
    true
  );
};

  const quickStudy = (deck: any, mode: StudyMode) => {
    if (!deck.cards || deck.cards.length === 0) return showAlert("Empty Deck", "This deck has no cards to study.");

    setDeckTitle(deck.title);
    setCards(deck.cards);
    startStudy(mode);
  };

  const addCard = () => setCards([...cards, { id: Date.now().toString(), front: '', back: '' }]);
  const updateCard = (id: string, field: 'front' | 'back', value: string) => setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
const removeCard = (id: string) => {
  if (cards.length <= 1) 
    return showAlert("Can't Remove", "A deck must have at least one card.");
  showConfirm(
    "Remove Card",
    "Are you sure you want to remove this card?",
    () => setCards(cards.filter(c => c.id !== id)),
    "Remove",
    true
  );
};
const handleBulkImport = () => {
  if (!importText.trim()) return showAlert("Empty Import", "Please paste your terms before importing.");

  const separator = delimiter === 'tab' ? '\t' : delimiter;

  // Split by newlines, handle both \r\n (Windows) and \n (Unix)
  const lines = importText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) return showAlert("Nothing Found", "No valid lines detected. Make sure your text has content.");
  if (lines.length > 200) return showAlert("Too Many Cards", `You're trying to import ${lines.length} cards at once. Maximum is 200 per import.`);

  const newCards: Card[] = [];
  const skipped: number[] = [];

  lines.forEach((line, index) => {
    // Remove common formatting artifacts
    const cleanLine = line
      .replace(/\u00A0/g, ' ')   // non-breaking spaces
      .replace(/\u200B/g, '')    // zero-width spaces
      .replace(/\uFEFF/g, '')    // BOM characters
      .trim();

    if (!cleanLine) return;

    const splitIndex = cleanLine.indexOf(separator);

    if (splitIndex === -1) {
      // Line has no delimiter — skip it and record line number
      skipped.push(index + 1);
      return;
    }

    const front = cleanLine.substring(0, splitIndex).trim();
    const back = cleanLine.substring(splitIndex + separator.length).trim();

    // Skip if either side is empty after trimming
    if (!front || !back) {
      skipped.push(index + 1);
      return;
    }

    // Truncate extremely long values to prevent layout breakage
    const truncatedFront = front.length > 300 
      ? front.substring(0, 300) + "…" 
      : front;
    const truncatedBack = back.length > 500 
      ? back.substring(0, 500) + "…" 
      : back;

    newCards.push({
      id: `import-${Date.now()}-${index}`,
      front: truncatedFront,
      back: truncatedBack,
    });
  });

  if (newCards.length === 0) {
    return showAlert(
      "No Valid Cards Found",
      `None of the ${lines.length} lines could be parsed. Make sure you selected the correct delimiter (Tab, Dash, or Comma) and that each line has both a term and a description.`
    );
  }

  // Keep existing non-empty cards and append new ones
  const filteredCurrent = cards.filter(c => c.front.trim() || c.back.trim());
  const combined = [...filteredCurrent, ...newCards];

  // Cap total cards at 500
  if (combined.length > 500) {
    return showAlert(
      "Deck Too Large",
      `Adding these cards would bring your deck to ${combined.length} cards. Maximum deck size is 500. Try splitting into multiple decks.`
    );
  }

  setCards(combined);
  setImportText("");
  setShowImportModal(false);

  if (skipped.length > 0) {
    showAlert(
      "Import Complete with Warnings",
      `${newCards.length} cards imported successfully. ${skipped.length} line(s) were skipped (lines ${skipped.slice(0, 5).join(", ")}${skipped.length > 5 ? "…" : ""}) because they were missing a term, description, or the correct delimiter.`
    );
  }
};

 const handleSaveDeck = async () => {
  // Title check
  if (!deckTitle.trim()) 
    return showAlert("Missing Title", "Please give your reviewer a title before saving.");
  if (deckTitle.trim().length < 3) 
    return showAlert("Title Too Short", "Your reviewer title should be at least 3 characters.");
  if (deckTitle.trim().length > 100) 
    return showAlert("Title Too Long", "Reviewer title cannot exceed 100 characters.");

  // Subject check
  if (!deckSubject.trim()) 
    return showAlert("Missing Subject", "Please enter a course code or subject name.");
  if (deckSubject.trim().length > 50) 
    return showAlert("Subject Too Long", "Course code cannot exceed 50 characters.");

  // Cards check
  if (cards.length === 0) 
    return showAlert("No Cards", "Add at least one card before saving.");

  const emptyCards = cards.filter(c => !c.front.trim() || !c.back.trim());
  if (emptyCards.length > 0) 
    return showAlert(
      "Incomplete Cards", 
      `${emptyCards.length} card(s) are missing a term or description. Fill them in or remove them before saving.`
    );

  const duplicateFronts = cards
    .map(c => c.front.trim().toLowerCase())
    .filter((val, idx, arr) => arr.indexOf(val) !== idx);
  if (duplicateFronts.length > 0)
    return showAlert(
      "Duplicate Terms", 
      `You have ${duplicateFronts.length} duplicate term(s) in your deck. Each term should be unique.`
    );

  if (!auth.currentUser) 
    return showAlert("Not Logged In", "You must be logged in to save a deck.");

  setIsSaving(true);
  try {
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const username = userDoc.exists() ? userDoc.data().username : "Lasallian";

    const deckData = {
      userId: auth.currentUser.uid,
      authorUsername: username,
      title: deckTitle.trim(),
      subject: deckSubject.trim().toUpperCase(),
      college: isPublic ? deckCollege : "Private",
      cards: cards.map(c => ({
        id: c.id,
        front: c.front.trim(),
        back: c.back.trim(),
      })),
      isPublic,
    };

    if (currentDeckId) {
      await updateDoc(doc(db, "flashcard_decks", currentDeckId), deckData);
    } else {
      await addDoc(collection(db, "flashcard_decks"), {
        ...deckData,
        upvotes: 0,
        downloads: 0,
        createdAt: serverTimestamp(),
      });
    }
    setView('library');
  } catch (error) {
    console.error(error);
    showAlert("Save Failed", "Something went wrong while saving. Please check your connection and try again.");
  } finally {
    setIsSaving(false);
  }
};

const handleSendToFriend = async () => {
  if (!sendToUsername.trim()) 
    return showAlert("Missing Username", "Please enter a username to send to.");
  if (!deckTitle.trim()) 
    return showAlert("No Title", "Save your deck with a title before sending.");
  
  const validCards = cards.filter(c => c.front?.trim() && c.back?.trim());
  if (validCards.length === 0) 
    return showAlert("No Cards", "Your deck has no complete cards to send.");

  if (!auth.currentUser) 
    return showAlert("Not Logged In", "You must be logged in to send a deck.");

  if (sendToUsername.trim().toLowerCase() === 
    (await getDoc(doc(db, "users", auth.currentUser.uid))).data()?.username?.toLowerCase()
  ) return showAlert("Can't Send to Yourself", "You can't send a reviewer to yourself.");

  setIsSending(true);
  try {
    const q = query(
      collection(db, "users"), 
      where("username", "==", sendToUsername.trim().toLowerCase())
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      showAlert("User Not Found", "No user found with that username. Check the spelling and try again.");
      setIsSending(false);
      return;
    }

    const recipientId = snap.docs[0].id;
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const myName = userDoc.exists() ? userDoc.data().username : "A Lasallian";

    await addDoc(collection(db, "inbox"), {
      type: "deck_share",
      recipientId,
      senderId: auth.currentUser.uid,
      senderName: myName,
      deckTitle: deckTitle.trim(),
      deckSubject: deckSubject.trim() || "General",
      cards: validCards,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    showAlert("Sent!", `Reviewer successfully sent to @${sendToUsername.trim()}.`);
    setSendToUsername("");
  } catch (error) {
    console.error(error);
    showAlert("Send Failed", "Something went wrong. Please check your connection and try again.");
  } finally {
    setIsSending(false);
  }
};

const startStudy = (mode: StudyMode) => {
  const validCards = cards.filter(c => c.front?.trim() && c.back?.trim());
  
  if (validCards.length === 0) 
    return showAlert("No Valid Cards", "Please fill in all card fronts and backs before studying.");
  
  if (validCards.length < cards.length)
    showAlert(
      "Some Cards Skipped", 
      `${cards.length - validCards.length} incomplete card(s) were skipped for this session.`
    );

  setStudyMode(mode);
  setCards(validCards);
  setCurrentIndex(0);
  setKnownCount(0);
  setIsFlipped(false);
  setUserInput("");
  setShowAnswerFeedback('none');
  setView('study');
};

  const handleNext = (knewIt: boolean) => {
    if (knewIt) setKnownCount(prev => prev + 1);
    setIsFlipped(false);
    setUserInput("");
    setShowAnswerFeedback('none');
    setTimeout(() => {
      if (currentIndex < cards.length - 1) setCurrentIndex(prev => prev + 1);
      else setView('results');
    }, 200); 
  };

  // --- SMART IDENTIFICATION LOGIC ---
  const checkIdentificationAnswer = () => {
    if (!userInput.trim()) return;

    const currentCard = cards[currentIndex];
    const correctTerm = currentCard.front;

    // Normalizes strings: removes punctuation, standardizes casing, and trims excess spaces
    const normalize = (str: string) => 
      str.toLowerCase()
         .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
         .replace(/\s{2,}/g," ")
         .trim();

    if (normalize(userInput) === normalize(correctTerm)) {
      setShowAnswerFeedback('correct');
      setTimeout(() => handleNext(true), 1000);
    } else {
      setShowAnswerFeedback('incorrect');
      // Give them a chance to retry instead of automatically failing
      setTimeout(() => setShowAnswerFeedback('none'), 1200);
    }
  };

  useEffect(() => {
    if (view === 'study' && studyMode === 'identification' && !isFlipped) inputRef.current?.focus();
  }, [currentIndex, view, studyMode, isFlipped]);


  if (view === 'library') {
    return (
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-6 items-start md:items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase text-zinc-900 dark:text-white">My Vault</h2>
            <p className="text-zinc-500 text-sm font-medium">Your personal collection of study materials.</p>
          </div>
          <button onClick={createNewDeck} className="w-full md:w-auto py-4 px-8 bg-[#06402B] text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shrink-0">
            <FaPlus /> Create New Reviewer
          </button>
        </div>

        {isLoadingLibrary ? (
          <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-[#06402B]/20 border-t-[#06402B] rounded-full animate-spin"/></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {myDecks.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-zinc-500 font-bold uppercase tracking-widest">
                No reviewers found. Create one to get started!
              </div>
            )}
            
            {myDecks.map((deck) => (
              <div key={deck.id} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 group transition-all hover:border-[#06402B]/50 flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <span className="px-3 py-1 bg-[#06402B]/10 text-[#06402B] text-[10px] font-mono font-black rounded-lg uppercase">{deck.subject}</span>
                  {deck.isPublic && <FaGlobe className="text-blue-500" title="Published to Exchange" />}
                </div>
                <h3 className="text-lg font-black mb-1 relative z-10 text-zinc-900 dark:text-white">{deck.title}</h3>
                <p className="text-xs text-zinc-500 font-bold mb-6 flex-1 relative z-10">{deck.cards?.length || 0} Terms</p>
                
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  <button onClick={() => quickStudy(deck, 'flip')} className="py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-80 transition-all">
                    <FaPlay /> Study
                  </button>
                  <button onClick={() => editExistingDeck(deck)} className="py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#06402B] hover:text-white transition-all">
                    <FaEdit /> Edit
                  </button>
                </div>
                <button onClick={() => deleteDeck(deck.id)} className="absolute top-4 right-4 p-2 text-zinc-300 dark:text-zinc-700 hover:text-red-500 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all z-20">
                  <FaTrashAlt />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (view === 'editor') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20 relative animate-in fade-in">
        
        <AnimatePresence>
          {showImportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div onClick={() => setShowImportModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl z-10">
                <div className="flex justify-between items-center mb-6">
                  <div><h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Bulk Import</h3></div>
                  <button onClick={() => setShowImportModal(false)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:text-red-500"><FaTimes /></button>
                </div>
                <div className="mb-4">
                  <div className="flex gap-2">
                    {(['tab', '-', ','] as const).map(sep => (
                      <button key={sep} onClick={() => setDelimiter(sep)} className={`flex-1 py-3 rounded-xl font-bold uppercase text-[10px] md:text-xs transition-all border-2 ${delimiter === sep ? 'bg-[#06402B]/10 border-[#06402B] text-[#06402B]' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
                        {sep === 'tab' ? 'Tab' : sep === '-' ? 'Dash (-)' : 'Comma (,)'}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder={`Term 1${delimiter === 'tab' ? '\t' : delimiter}Description 1`} className="w-full h-48 md:h-64 bg-zinc-50 dark:bg-zinc-950/50 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 outline-none focus:border-[#06402B] font-mono text-xs md:text-sm resize-none mb-6 text-zinc-900 dark:text-zinc-100" />
                <button onClick={handleBulkImport} className="w-full py-4 bg-[#06402B] text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex justify-center items-center gap-2"><FaFileImport /> Import Cards</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setView('library')} className="text-xs md:text-sm font-bold text-zinc-500 hover:text-[#06402B] transition-colors flex items-center gap-2">
            ← Back to Vault
          </button>
        </div>

        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden">
          <div className="flex-1 space-y-4 relative z-10 w-full">
            <input type="text" placeholder="Reviewer Title" value={deckTitle} onChange={e => setDeckTitle(e.target.value)} className="w-full text-2xl sm:text-3xl md:text-4xl font-black bg-transparent border-none outline-none text-zinc-900 dark:text-white tracking-tight" />
            <input type="text" placeholder="Course Code" value={deckSubject} onChange={e => setDeckSubject(e.target.value)} className="w-full md:w-48 text-sm font-bold bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 outline-none focus:border-[#06402B] uppercase tracking-widest text-[#06402B]" />
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0 relative z-10 w-full md:w-auto">
            <div className="flex flex-1 gap-2">
              <button onClick={() => startStudy('flip')} className="flex-1 md:w-32 px-4 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 hover:scale-[1.02] shadow-lg text-[10px]"><FaLayerGroup size={16} /> Flashcards</button>
              <button onClick={() => startStudy('identification')} className="flex-1 md:w-32 px-4 py-4 bg-[#06402B] text-white rounded-2xl font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 hover:scale-[1.02] shadow-[0_0_20px_rgba(6,64,43,0.3)] text-[10px]"><FaKeyboard size={16} /> Identify</button>
            </div>
            <button onClick={handleSaveDeck} disabled={isSaving} className="w-full md:w-auto px-8 py-4 md:py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest flex justify-center items-center gap-2 hover:opacity-80">
              {isSaving ? "Saving..." : <><FaSave /> Save Deck</>}
            </button>
          </div>
        </div>

        <div className="p-5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl transition-colors ${isPublic ? 'bg-[#06402B]/10 text-[#06402B]' : 'bg-zinc-500/10 text-zinc-500'}`}>{isPublic ? <FaGlobe size={20} /> : <FaLock size={20} />}</div>
              <div>
                <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">Publish to Exchange</p>
                <p className="text-[10px] sm:text-[11px] font-medium text-zinc-500 mt-0.5">Allow other Lasallians to discover this reviewer.</p>
              </div>
            </div>
            <button onClick={() => setIsPublic(!isPublic)} className={`w-12 h-6 md:w-14 md:h-7 rounded-full transition-all relative shadow-inner shrink-0 ${isPublic ? 'bg-[#06402B]' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
              <div className={`absolute top-1 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full transition-all shadow-md ${isPublic ? 'left-7 md:left-8' : 'left-1'}`} />
            </button>
          </div>
          
          <AnimatePresence>
            {isPublic && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-5 mt-5 border-t border-zinc-200 dark:border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <FaTags size={14} />
                    <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Tag College Dept:</span>
                  </div>
                  <select 
                    value={deckCollege} onChange={e => setDeckCollege(e.target.value)} 
                    className="w-full sm:w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] shadow-sm"
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

        <div className="p-5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">Direct Beam</p>
            <p className="text-[10px] sm:text-[11px] font-medium text-zinc-500 mt-0.5">Send this reviewer directly to a friend's inbox.</p>
          </div>
          <div className="flex w-full sm:w-auto shadow-sm rounded-xl overflow-hidden shrink-0">
            <input 
              type="text" placeholder="@username" 
              value={sendToUsername} onChange={(e) => setSendToUsername(e.target.value)}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] w-full sm:w-32 md:w-40 border-r-0"
            />
            <button 
              onClick={handleSendToFriend} disabled={isSending}
              className="px-4 md:px-6 py-3 bg-[#06402B] text-white font-black text-[10px] md:text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-[#042d1f] transition-colors shrink-0"
            >
              {isSending ? "..." : "Send"}
            </button>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          <AnimatePresence>
            {cards.map((card, index) => (
              <motion.div key={card.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] p-4 flex flex-col md:flex-row gap-4 group hover:border-[#06402B]/30 transition-colors">
                <div className="flex justify-center items-center px-2 border-r border-zinc-200 dark:border-zinc-800 hidden md:flex"><span className="text-xs font-mono font-bold text-zinc-400">{index + 1}</span></div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-2">Term</label>
                  <textarea value={card.front} onChange={e => updateCard(card.id, 'front', e.target.value)} placeholder="Enter term..." className="w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none resize-none font-bold text-zinc-900 dark:text-white p-3 min-h-[60px] rounded-xl focus:border-[#06402B] transition-colors" />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-2">Description</label>
                  <textarea value={card.back} onChange={e => updateCard(card.id, 'back', e.target.value)} placeholder="Enter description..." className="w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none resize-none font-medium text-zinc-800 dark:text-zinc-200 p-3 min-h-[60px] rounded-xl focus:border-[#06402B] transition-colors" />
                </div>
                <button onClick={() => removeCard(card.id)} className="w-full md:w-auto bg-red-500/10 md:bg-transparent text-red-500 p-3 md:p-2 rounded-xl md:rounded-none opacity-100 md:opacity-0 group-hover:opacity-100 transition-all font-bold text-xs uppercase tracking-widest flex justify-center items-center gap-2">
                  <span className="md:hidden">Delete Card</span> <FaTrashAlt />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={addCard} className="flex-1 py-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[1.5rem] text-zinc-500 font-bold uppercase tracking-widest text-xs hover:border-[#06402B] hover:text-[#06402B] flex items-center justify-center gap-2 transition-colors"><FaPlus /> Add New Card</button>
            <button onClick={() => setShowImportModal(true)} className="w-full sm:w-64 py-6 border-2 border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] text-zinc-500 font-bold uppercase tracking-widest text-xs hover:border-blue-500 hover:text-blue-500 bg-white/40 dark:bg-zinc-900/40 flex items-center justify-center gap-2 transition-colors"><FaFileImport /> Bulk Import</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'study') {
    const currentCard = cards[currentIndex];
    const progress = ((currentIndex) / cards.length) * 100;

    return (
      <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        <div className="h-16 md:h-20 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-8 flex items-center justify-between shrink-0 bg-white/50 dark:bg-black/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            <button onClick={() => setView(currentDeckId ? 'library' : 'editor')} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-zinc-500 shrink-0">
              <FaTimes />
            </button>
            <div className="min-w-0">
              <h3 className="font-black text-sm md:text-lg uppercase tracking-tight text-zinc-900 dark:text-white truncate">{deckTitle || "Review Session"}</h3>
              <p className="text-[8px] md:text-[10px] font-mono font-bold text-[#06402B] uppercase tracking-widest truncate">{studyMode} Mode • Card {currentIndex + 1} of {cards.length}</p>
            </div>
          </div>
          <div className="w-24 sm:w-48 md:w-64 h-2 md:h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-[#06402B] rounded-full" />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 perspective-1000 overflow-y-auto">
          {studyMode === 'flip' && (
            <AnimatePresence mode="wait">
              <motion.div key={currentIndex} initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -50, scale: 0.9 }} transition={{ duration: 0.3 }} className="w-full max-w-2xl aspect-[4/3] md:aspect-[16/9] relative cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)} style={{ transformStyle: "preserve-3d" }}>
                <motion.div animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }} className="w-full h-full relative" style={{ transformStyle: "preserve-3d" }}>
                  <div className="absolute inset-0 backface-hidden bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center p-6 md:p-12 text-center group-hover:border-[#06402B]/50 transition-colors">
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 text-[9px] md:text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Term</div>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-black leading-tight text-zinc-900 dark:text-white break-words w-full">{currentCard.front}</h2>
                  </div>
                  <div className="absolute inset-0 backface-hidden bg-[#06402B]/10 dark:bg-[#06402B]/20 border-2 border-[#06402B]/30 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center p-6 md:p-12 text-center" style={{ transform: "rotateY(180deg)" }}>
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 text-[9px] md:text-[10px] font-mono font-bold text-[#06402B] uppercase tracking-widest">Description</div>
                    <h2 className="text-lg sm:text-xl md:text-3xl font-medium leading-relaxed text-zinc-900 dark:text-white overflow-y-auto w-full max-h-full custom-scrollbar">{currentCard.back}</h2>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}

          {studyMode === 'identification' && (
            <AnimatePresence mode="wait">
               <motion.div key={currentIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl text-center space-y-6 md:space-y-8">
                  
                  {/* Prompt Card: Showing the Description */}
                  <div className={`bg-white dark:bg-zinc-900 border-2 transition-colors duration-300 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden min-h-[200px] md:min-h-[250px] flex flex-col justify-center items-center ${showAnswerFeedback === 'incorrect' ? 'border-red-500/50 bg-red-500/5 dark:bg-red-500/10' : 'border-zinc-200 dark:border-zinc-800'}`}>
                    {showAnswerFeedback === 'correct' && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 opacity-95 bg-[#06402B]">
                        <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter">Correct!</h2>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 text-[9px] md:text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Description</div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-medium leading-relaxed mt-4 text-zinc-900 dark:text-white">{currentCard.back}</h2>
                  </div>

                  {!isFlipped ? (
                    <div className="flex flex-col gap-3 w-full max-w-lg mx-auto">
                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full">
                        <input 
                          ref={inputRef} 
                          type="text" 
                          value={userInput} 
                          onChange={(e) => setUserInput(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && checkIdentificationAnswer()} 
                          placeholder="Type the exact Term..." 
                          className={`flex-1 w-full bg-white dark:bg-zinc-900 border-2 outline-none rounded-2xl px-4 py-3 md:px-6 md:py-4 text-lg md:text-xl font-bold text-center shadow-lg transition-colors ${showAnswerFeedback === 'incorrect' ? 'border-red-500 text-red-500' : 'border-zinc-300 dark:border-zinc-700 focus:border-[#06402B] text-zinc-900 dark:text-white'}`} 
                        />
                        <button 
                          onClick={checkIdentificationAnswer} 
                          className="w-full sm:w-auto bg-[#06402B] text-white rounded-2xl py-4 sm:py-0 px-8 font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-transform"
                        >
                          Submit
                        </button>
                      </div>
                      
                      {/* Give Up / Show Answer Button */}
                      <button 
                        onClick={() => setIsFlipped(true)}
                        className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest hover:text-[#06402B] transition-colors py-2"
                      >
                        I don't know / Show Answer
                      </button>
                    </div>
                  ) : (
                    <div className="w-full max-w-lg mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      <p className="text-xs md:text-sm font-bold text-zinc-500 uppercase">The Correct Term Was:</p>
                      <h3 className="text-2xl md:text-3xl font-black text-[#06402B]">{currentCard.front}</h3>
                    </div>
                  )}
               </motion.div>
            </AnimatePresence>
          )}
        </div>

        {(studyMode === 'flip' || isFlipped) && (
          <div className="py-4 px-4 sm:py-0 sm:h-32 bg-white/50 dark:bg-black/50 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-6 shrink-0">
            <button onClick={() => handleNext(false)} disabled={studyMode === 'flip' && !isFlipped} className="w-full sm:w-auto px-8 py-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-30 hover:bg-orange-500 hover:text-white transition-all text-xs md:text-sm"><FaRedo /> Needs Review</button>
            <button onClick={() => handleNext(true)} disabled={studyMode === 'flip' && !isFlipped} className="w-full sm:w-auto px-10 py-4 bg-[#06402B] text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-30 shadow-lg hover:shadow-[0_0_20px_rgba(6,64,43,0.4)] active:scale-95 transition-all text-xs md:text-sm"><FaCheck /> Got It</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'results') {
    return (
      <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-black flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 text-center shadow-2xl">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-[#06402B]/10 text-[#06402B] rounded-full flex items-center justify-center mx-auto mb-6"><FaLayerGroup size={32} className="md:w-10 md:h-10" /></div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-2 text-zinc-900 dark:text-white">Session Complete</h2>
          <p className="text-zinc-500 mb-8 font-medium text-sm md:text-base">You mastered {knownCount} out of {cards.length} cards.</p>
          <div className="space-y-3">
            <button onClick={() => startStudy(studyMode)} className="w-full py-4 bg-[#06402B] text-white font-black rounded-xl uppercase tracking-widest text-xs md:text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg">Review Again</button>
            <button onClick={() => setView('library')} className="w-full py-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl uppercase tracking-widest text-xs md:text-sm hover:opacity-80 transition-opacity">Back to Vault</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}