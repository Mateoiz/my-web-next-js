"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaPlay, FaTimes, FaCheck, FaRedo, 
  FaSave, FaGlobe, FaLock, FaTrashAlt, FaLayerGroup, FaKeyboard, FaFileImport, FaEdit, FaTags 
} from "react-icons/fa";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs, orderBy, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/db"; 

type Card = { id: string; front: string; back: string };
type ViewMode = 'library' | 'editor' | 'study' | 'results';
type StudyMode = 'flip' | 'identification';

export default function FlashcardMaker() {
  const [view, setView] = useState<ViewMode>('library');
  const [studyMode, setStudyMode] = useState<StudyMode>('flip');
  
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

  const deleteDeck = async (deckId: string) => {
    if (!confirm("Are you sure you want to delete this reviewer?")) return;
    await deleteDoc(doc(db, "flashcard_decks", deckId));
    setMyDecks(prev => prev.filter(d => d.id !== deckId));
  };

  const quickStudy = (deck: any, mode: StudyMode) => {
    if (!deck.cards || deck.cards.length === 0) return alert("This deck has no cards.");
    setDeckTitle(deck.title);
    setCards(deck.cards);
    startStudy(mode);
  };

  const addCard = () => setCards([...cards, { id: Date.now().toString(), front: '', back: '' }]);
  const updateCard = (id: string, field: 'front' | 'back', value: string) => setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeCard = (id: string) => { if (cards.length > 1) setCards(cards.filter(c => c.id !== id)); };

  const handleBulkImport = () => {
    if (!importText.trim()) return;
    const separator = delimiter === 'tab' ? '\t' : delimiter;
    const newCards = importText.split('\n').filter(line => line.trim() !== '').map((line, index) => {
        const splitIndex = line.indexOf(separator);
        if (splitIndex === -1) return { id: Date.now().toString() + index, front: line.trim(), back: '' };
        return { id: Date.now().toString() + index, front: line.substring(0, splitIndex).trim(), back: line.substring(splitIndex + 1).trim() };
      });
    const filteredCurrent = cards.filter(c => c.front.trim() || c.back.trim());
    setCards([...filteredCurrent, ...newCards]);
    setImportText("");
    setShowImportModal(false);
  };

  const handleSaveDeck = async () => {
    if (!deckTitle || !deckSubject || cards.some(c => !c.front || !c.back)) return alert("Please fill out the Title, Subject, and all card fields.");
    setIsSaving(true);
    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser!.uid));
      const username = userDoc.exists() ? userDoc.data().username : "Ice Matthew Ramirez";

      const deckData = {
        userId: auth.currentUser?.uid,
        authorUsername: username, 
        title: deckTitle,
        subject: deckSubject.toUpperCase(),
        college: isPublic ? deckCollege : "Private", 
        cards: cards,
        isPublic: isPublic,
      };

      if (currentDeckId) {
        await updateDoc(doc(db, "flashcard_decks", currentDeckId), deckData);
      } else {
        await addDoc(collection(db, "flashcard_decks"), {
          ...deckData, upvotes: 0, downloads: 0, createdAt: serverTimestamp(),
        });
      }
      setView('library'); 
    } catch (error) { console.error(error); } 
    finally { setIsSaving(false); }
  };

  const handleSendToFriend = async () => {
    if (!sendToUsername.trim() || cards.length === 0 || !deckTitle) return alert("Ensure deck has a title and cards.");
    setIsSending(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", sendToUsername.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("User not found!");
        setIsSending(false);
        return;
      }
      const friendData = snap.docs[0].data();

      const userDoc = await getDoc(doc(db, "users", auth.currentUser!.uid));
      const myName = userDoc.exists() ? userDoc.data().username : "Ice Matthew Ramirez";

      await addDoc(collection(db, "inbox"), {
        recipientId: friendData.uid,
        senderId: auth.currentUser!.uid,
        senderName: myName,
        deckTitle: deckTitle,
        deckSubject: deckSubject,
        cards: cards,
        status: "pending",
        createdAt: serverTimestamp()
      });
      
      alert("Reviewer sent successfully!");
      setSendToUsername("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  const startStudy = (mode: StudyMode) => {
    if (cards.some(c => !c.front || !c.back)) return alert("Fill empty cards before studying!");
    setStudyMode(mode);
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

  const checkIdentificationAnswer = () => {
    const currentCard = cards[currentIndex];
    const correctAnswer = currentCard.front.trim();
    if (userInput.toLowerCase().trim() === correctAnswer.toLowerCase()) {
      setShowAnswerFeedback('correct');
      setTimeout(() => handleNext(true), 1000);
    } else {
      setShowAnswerFeedback('incorrect');
      setIsFlipped(true); 
    }
  };

  useEffect(() => {
    if (view === 'study' && studyMode === 'identification' && !isFlipped) inputRef.current?.focus();
  }, [currentIndex, view, studyMode, isFlipped]);


  if (view === 'library') {
    return (
      <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex flex-col md:flex-row justify-between gap-6 items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase">My Vault</h2>
            <p className="text-zinc-500 text-sm font-medium">Your personal collection of study materials.</p>
          </div>
          <button onClick={createNewDeck} className="w-full md:w-auto py-4 px-8 bg-[#06402B] text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg">
            <FaPlus /> Create New Reviewer
          </button>
        </div>

        {isLoadingLibrary ? (
          <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-[#06402B]/20 border-t-[#06402B] rounded-full animate-spin"/></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                <h3 className="text-lg font-black mb-1 relative z-10">{deck.title}</h3>
                <p className="text-xs text-zinc-500 font-bold mb-6 flex-1 relative z-10">{deck.cards?.length || 0} Terms</p>
                
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  <button onClick={() => quickStudy(deck, 'flip')} className="py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-80 transition-all">
                    <FaPlay /> Study
                  </button>
                  <button onClick={() => editExistingDeck(deck)} className="py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#06402B] hover:text-white transition-all">
                    <FaEdit /> Edit
                  </button>
                </div>
                <button onClick={() => deleteDeck(deck.id)} className="absolute top-4 right-4 p-2 text-zinc-300 dark:text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-20">
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
      <div className="max-w-5xl mx-auto space-y-8 pb-20 relative animate-in fade-in">
        
        <AnimatePresence>
          {showImportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div onClick={() => setShowImportModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl z-10">
                <div className="flex justify-between items-center mb-6">
                  <div><h3 className="text-2xl font-black uppercase tracking-tight">Bulk Import</h3></div>
                  <button onClick={() => setShowImportModal(false)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:text-red-500"><FaTimes /></button>
                </div>
                <div className="mb-4">
                  <div className="flex gap-2">
                    {(['tab', '-', ','] as const).map(sep => (
                      <button key={sep} onClick={() => setDelimiter(sep)} className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs transition-all border-2 ${delimiter === sep ? 'bg-[#06402B]/10 border-[#06402B] text-[#06402B]' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
                        {sep === 'tab' ? 'Tab' : sep === '-' ? 'Dash (-)' : 'Comma (,)'}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder={`Term 1${delimiter === 'tab' ? '\t' : delimiter}Description 1`} className="w-full h-64 bg-zinc-50 dark:bg-zinc-950/50 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 outline-none focus:border-[#06402B] font-mono text-sm resize-none mb-6 text-zinc-900 dark:text-zinc-100" />
                <button onClick={handleBulkImport} className="w-full py-4 bg-[#06402B] text-white rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex justify-center items-center gap-2"><FaFileImport /> Import Cards</button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setView('library')} className="text-sm font-bold text-zinc-500 hover:text-[#06402B] transition-colors flex items-center gap-2">
            ← Back to Vault
          </button>
        </div>

        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 shadow-xl flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden">
          <div className="flex-1 space-y-4 relative z-10">
            <input type="text" placeholder="Reviewer Title" value={deckTitle} onChange={e => setDeckTitle(e.target.value)} className="w-full text-3xl md:text-4xl font-black bg-transparent border-none outline-none text-zinc-900 dark:text-white tracking-tight" />
            <input type="text" placeholder="Course Code" value={deckSubject} onChange={e => setDeckSubject(e.target.value)} className="w-48 text-sm font-bold bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 outline-none focus:border-[#06402B] uppercase tracking-widest text-[#06402B]" />
          </div>
          <div className="flex flex-col gap-3 shrink-0 relative z-10">
            <div className="flex gap-2">
              <button onClick={() => startStudy('flip')} className="flex-1 px-4 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest flex flex-col items-center gap-1 hover:scale-[1.02] shadow-lg text-[10px]"><FaLayerGroup size={16} /> Flashcards</button>
              <button onClick={() => startStudy('identification')} className="flex-1 px-4 py-4 bg-[#06402B] text-white rounded-2xl font-black uppercase tracking-widest flex flex-col items-center gap-1 hover:scale-[1.02] shadow-[0_0_20px_rgba(6,64,43,0.3)] text-[10px]"><FaKeyboard size={16} /> Identify</button>
            </div>
            <button onClick={handleSaveDeck} disabled={isSaving} className="w-full px-8 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest flex justify-center items-center gap-2 hover:opacity-80">
              {isSaving ? "Saving..." : <><FaSave /> Save Deck</>}
            </button>
          </div>
        </div>

        <div className="p-5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl transition-colors ${isPublic ? 'bg-[#06402B]/10 text-[#06402B]' : 'bg-zinc-500/10 text-zinc-500'}`}>{isPublic ? <FaGlobe size={20} /> : <FaLock size={20} />}</div>
              <div>
                <p className="text-sm font-black uppercase tracking-wide">Publish to Exchange</p>
                <p className="text-[11px] font-medium text-zinc-500 mt-0.5">Allow other Lasallians to discover and sync this reviewer.</p>
              </div>
            </div>
            <button onClick={() => setIsPublic(!isPublic)} className={`w-14 h-7 rounded-full transition-all relative shadow-inner ${isPublic ? 'bg-[#06402B]' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${isPublic ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          
          <AnimatePresence>
            {isPublic && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="pt-5 mt-5 border-t border-zinc-200 dark:border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <FaTags size={14} />
                    <span className="text-xs font-bold uppercase tracking-widest">Tag College Department:</span>
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

        <div className="p-5 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide">Direct Beam</p>
            <p className="text-[11px] font-medium text-zinc-500 mt-0.5">Send this reviewer directly to a friend's inbox.</p>
          </div>
          <div className="flex w-full sm:w-auto shadow-sm rounded-xl overflow-hidden">
            <input 
              type="text" placeholder="@username" 
              value={sendToUsername} onChange={(e) => setSendToUsername(e.target.value)}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B] w-full sm:w-40 border-r-0"
            />
            <button 
              onClick={handleSendToFriend} disabled={isSending}
              className="px-6 py-3 bg-[#06402B] text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 hover:bg-[#042d1f] transition-colors"
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
                  <textarea value={card.front} onChange={e => updateCard(card.id, 'front', e.target.value)} placeholder="Enter term..." className="w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none resize-none font-bold p-3 min-h-[60px] rounded-xl focus:border-[#06402B] transition-colors" />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-2">Description</label>
                  <textarea value={card.back} onChange={e => updateCard(card.id, 'back', e.target.value)} placeholder="Enter description..." className="w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none resize-none font-medium p-3 min-h-[60px] rounded-xl focus:border-[#06402B] transition-colors" />
                </div>
                <button onClick={() => removeCard(card.id)} className="text-zinc-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><FaTrashAlt /></button>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={addCard} className="flex-1 py-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[1.5rem] text-zinc-500 font-bold uppercase tracking-widest text-xs hover:border-[#06402B] hover:text-[#06402B] flex items-center justify-center gap-2"><FaPlus /> Add New Card</button>
            <button onClick={() => setShowImportModal(true)} className="sm:w-64 py-6 border-2 border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] text-zinc-500 font-bold uppercase tracking-widest text-xs hover:border-blue-500 hover:text-blue-500 bg-white/40 dark:bg-zinc-900/40 flex items-center justify-center gap-2"><FaFileImport /> Bulk Import</button>
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
        <div className="h-20 border-b border-zinc-200 dark:border-zinc-800 px-8 flex items-center justify-between shrink-0 bg-white/50 dark:bg-black/50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setView(currentDeckId ? 'library' : 'editor')} className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-zinc-500">
              <FaTimes />
            </button>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight">{deckTitle || "Review Session"}</h3>
              <p className="text-[10px] font-mono font-bold text-[#06402B] uppercase tracking-widest">{studyMode} Mode • Card {currentIndex + 1} of {cards.length}</p>
            </div>
          </div>
          <div className="w-48 md:w-64 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-[#06402B] rounded-full" />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 perspective-1000">
          {studyMode === 'flip' && (
            <AnimatePresence mode="wait">
              <motion.div key={currentIndex} initial={{ opacity: 0, x: 50, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -50, scale: 0.9 }} transition={{ duration: 0.3 }} className="w-full max-w-2xl aspect-[4/3] md:aspect-[16/9] relative cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)} style={{ transformStyle: "preserve-3d" }}>
                <motion.div animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }} className="w-full h-full relative" style={{ transformStyle: "preserve-3d" }}>
                  <div className="absolute inset-0 backface-hidden bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center p-12 text-center group-hover:border-[#06402B]/50 transition-colors">
                    <div className="absolute top-6 left-6 text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Term</div>
                    <h2 className="text-3xl md:text-5xl font-black leading-tight">{currentCard.front}</h2>
                  </div>
                  <div className="absolute inset-0 backface-hidden bg-[#06402B]/10 dark:bg-[#06402B]/20 border-2 border-[#06402B]/30 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center p-12 text-center" style={{ transform: "rotateY(180deg)" }}>
                    <div className="absolute top-6 left-6 text-[10px] font-mono font-bold text-[#06402B] uppercase tracking-widest">Description</div>
                    <h2 className="text-xl md:text-3xl font-medium leading-relaxed">{currentCard.back}</h2>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          )}

          {studyMode === 'identification' && (
            <AnimatePresence mode="wait">
               <motion.div key={currentIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-2xl text-center space-y-10">
                  <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden min-h-[250px] flex flex-col justify-center items-center">
                    {showAnswerFeedback !== 'none' && (
                      <div className={`absolute inset-0 flex items-center justify-center z-10 opacity-95 ${showAnswerFeedback === 'correct' ? 'bg-[#06402B]' : 'bg-red-500'}`}>
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter">{showAnswerFeedback === 'correct' ? 'Correct!' : 'Incorrect'}</h2>
                      </div>
                    )}
                    <div className="absolute top-6 left-6 text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Description</div>
                    <h2 className="text-2xl md:text-4xl font-medium leading-relaxed mt-4">{currentCard.back}</h2>
                  </div>
                  {!isFlipped ? (
                    <div className="flex gap-4 max-w-lg mx-auto">
                      <input ref={inputRef} type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && checkIdentificationAnswer()} placeholder="Type the exact Term..." className="flex-1 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 focus:border-[#06402B] outline-none rounded-2xl px-6 py-4 text-xl font-bold text-center shadow-lg transition-all" />
                      <button onClick={checkIdentificationAnswer} className="bg-[#06402B] text-white rounded-2xl px-8 font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all">Submit</button>
                    </div>
                  ) : (
                    <div className="max-w-lg mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4">
                      <p className="text-sm font-bold text-zinc-500 uppercase">The Correct Term Was:</p>
                      <h3 className="text-3xl font-black text-[#06402B]">{currentCard.front}</h3>
                    </div>
                  )}
               </motion.div>
            </AnimatePresence>
          )}
        </div>

        {(studyMode === 'flip' || isFlipped) && (
          <div className="h-32 bg-white/50 dark:bg-black/50 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-6 shrink-0">
            <button onClick={() => handleNext(false)} disabled={studyMode === 'flip' && !isFlipped} className="px-8 py-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 disabled:opacity-30 hover:bg-orange-500 hover:text-white transition-all"><FaRedo /> Needs Review</button>
            <button onClick={() => handleNext(true)} disabled={studyMode === 'flip' && !isFlipped} className="px-10 py-4 bg-[#06402B] text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 disabled:opacity-30 shadow-lg hover:shadow-[0_0_20px_rgba(6,64,43,0.4)] active:scale-95 transition-all"><FaCheck /> Got It</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'results') {
    return (
      <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-black flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-10 text-center shadow-2xl">
          <div className="w-24 h-24 bg-[#06402B]/10 text-[#06402B] rounded-full flex items-center justify-center mx-auto mb-6"><FaLayerGroup size={40} /></div>
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Session Complete</h2>
          <p className="text-zinc-500 mb-8 font-medium">You mastered {knownCount} out of {cards.length} cards.</p>
          <div className="space-y-3">
            <button onClick={() => startStudy(studyMode)} className="w-full py-4 bg-[#06402B] text-white font-black rounded-xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg">Review Again</button>
            <button onClick={() => setView('library')} className="w-full py-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl uppercase tracking-widest hover:opacity-80 transition-opacity">Back to Vault</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}