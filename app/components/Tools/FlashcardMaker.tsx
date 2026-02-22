"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaTrash, FaLayerGroup, FaRedo, FaFileImport, FaSave, 
  FaClipboardList, FaGamepad, FaDownload, FaUpload, FaFolderPlus
} from "react-icons/fa";

// --- TYPES ---
type Card = { id: number; q: string; a: string };
type Mode = 'edit' | 'study' | 'quiz';

export default function UltimateStudyTool() {
  const [mode, setMode] = useState<Mode>('edit');
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Profile / Deck State
  const [profiles, setProfiles] = useState<string[]>(['Default']);
  const [activeProfile, setActiveProfile] = useState<string>('Default');
  const [newProfileName, setNewProfileName] = useState("");

  // Editor State
  const [form, setForm] = useState({ q: "", a: "" });
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  // Study/Active Recall State
  const [studyDeck, setStudyDeck] = useState<Card[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PERSISTENCE & PROFILES ---
  useEffect(() => {
    const savedProfiles = localStorage.getItem('jpcs-profiles');
    let loadedProfiles = ['Default'];
    if (savedProfiles) loadedProfiles = JSON.parse(savedProfiles);
    setProfiles(loadedProfiles);

    const savedActive = localStorage.getItem('jpcs-active-profile') || loadedProfiles[0];
    setActiveProfile(savedActive);

    const savedCards = localStorage.getItem(`jpcs-cards-${savedActive}`);
    if (savedCards) setCards(JSON.parse(savedCards));
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(`jpcs-cards-${activeProfile}`, JSON.stringify(cards));
      localStorage.setItem('jpcs-profiles', JSON.stringify(profiles));
      localStorage.setItem('jpcs-active-profile', activeProfile);
    }
  }, [cards, activeProfile, profiles, isLoaded]);

  const switchProfile = (name: string) => {
    setActiveProfile(name);
    const savedCards = localStorage.getItem(`jpcs-cards-${name}`);
    setCards(savedCards ? JSON.parse(savedCards) : []);
    setMode('edit'); // Always return to editor on switch to avoid breaking quiz state
  };

  const createProfile = () => {
    const trimmed = newProfileName.trim();
    if (!trimmed || profiles.includes(trimmed)) return alert("Invalid or duplicate deck name!");
    setProfiles([...profiles, trimmed]);
    switchProfile(trimmed);
    setNewProfileName("");
  };

  const deleteProfile = (name: string) => {
    if (profiles.length === 1) return alert("You must have at least one deck!");
    if (confirm(`Are you sure you want to delete the deck "${name}"?`)) {
      const newProfiles = profiles.filter(p => p !== name);
      setProfiles(newProfiles);
      if (activeProfile === name) switchProfile(newProfiles[0]);
      localStorage.removeItem(`jpcs-cards-${name}`);
    }
  };

  // --- EDITOR FUNCTIONS ---
  const addCard = () => {
    if (!form.q || !form.a) return;
    setCards([...cards, { id: Date.now(), q: form.q, a: form.a }]);
    setForm({ q: "", a: "" });
  };

  // --- BULK TEXT IMPORT ---
  const handleBulkImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n');
    const newCards: Card[] = [];

    lines.forEach(line => {
      let parts = line.includes('|') ? line.split('|') : line.split(' - ');
      if (parts.length >= 2) {
        const q = parts[0].trim();
        const a = parts.slice(1).join(' ').trim();
        if (q && a) newCards.push({ id: Date.now() + Math.random(), q, a });
      }
    });

    if (newCards.length > 0) {
      setCards([...cards, ...newCards]);
      setImportText("");
      setShowImport(false);
      alert(`Successfully imported ${newCards.length} cards!`);
    } else {
      alert("Could not find any cards. Make sure to format as 'Question | Answer'.");
    }
  };

  // --- JSON EXPORT / IMPORT ---
  const exportJSON = () => {
    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeProfile.replace(/\s+/g, '-').toLowerCase()}-deck.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported) && imported.length > 0 && 'q' in imported[0] && 'a' in imported[0]) {
          setCards([...cards, ...imported]); // Append to current deck
          alert(`Successfully loaded ${imported.length} cards into "${activeProfile}"!`);
        } else {
          alert("Invalid file format. Please upload a valid deck JSON.");
        }
      } catch (err) {
        alert("Error reading file. Ensure it is a valid JSON deck.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; // reset input
  };

  // --- STUDY MODE ---
  const startStudy = () => {
    if (cards.length === 0) return alert("Deck is empty");
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setStudyDeck(shuffled);
    setSessionFinished(false);
    setIsFlipped(false);
    setMode('study');
  };

  const handleAssessment = (result: 'forgot' | 'mastered') => {
    setIsFlipped(false);
    setTimeout(() => {
      if (result === 'mastered') {
        const newDeck = studyDeck.slice(1);
        setStudyDeck(newDeck);
        if (newDeck.length === 0) setSessionFinished(true);
      } else {
        const currentCard = studyDeck[0];
        setStudyDeck([...studyDeck.slice(1), currentCard]);
      }
    }, 200);
  };

  // --- QUIZ MODE ---
  const generateOptions = (correctAnswer: string) => {
    const distractors = cards.map(c => c.a).filter(a => a !== correctAnswer);
    const randomDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 3);
    return [...randomDistractors, correctAnswer].sort(() => Math.random() - 0.5);
  };

  const startQuiz = () => {
    if (cards.length < 4) return alert("You need at least 4 cards to start a quiz!");
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setStudyDeck(shuffled);
    setQuizIndex(0);
    setScore(0);
    setQuizFinished(false);
    setSelectedAnswer(null);
    setQuizOptions(generateOptions(shuffled[0].a));
    setMode('quiz');
  };

  const handleQuizAnswer = (answer: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);

    const isCorrect = answer === studyDeck[quizIndex].a;
    if (isCorrect) setScore(s => s + 1);

    setTimeout(() => {
      if (quizIndex + 1 < studyDeck.length) {
        setQuizIndex(i => i + 1);
        setSelectedAnswer(null);
        setQuizOptions(generateOptions(studyDeck[quizIndex + 1].a));
      } else {
        setQuizFinished(true);
      }
    }, 1000);
  };

  if (!isLoaded) return null; // Prevent hydration mismatch

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[650px]"
    >
      {/* HEADER & PROFILE MANAGER */}
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col lg:flex-row justify-between items-center gap-4 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
           <div className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-zinc-500"><FaLayerGroup /></div>
           <div className="flex-1 flex items-center gap-2">
             <select 
               value={activeProfile} 
               onChange={(e) => switchProfile(e.target.value)}
               className="bg-transparent text-lg font-bold text-zinc-900 dark:text-white outline-none cursor-pointer"
             >
               {profiles.map(p => <option key={p} value={p}>{p}</option>)}
             </select>
             <button onClick={() => deleteProfile(activeProfile)} className="text-zinc-400 hover:text-red-500 text-xs" title="Delete Deck"><FaTrash /></button>
           </div>
        </div>
        
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full lg:w-auto overflow-x-auto">
           {[
             { id: 'edit', label: 'Editor', icon: FaClipboardList },
             { id: 'study', label: 'Study', icon: FaLayerGroup },
             { id: 'quiz', label: 'Test Me', icon: FaGamepad }
           ].map((m) => (
             <button 
               key={m.id}
               onClick={() => {
                 if (m.id === 'quiz') startQuiz();
                 else if (m.id === 'study') startStudy();
                 else setMode('edit');
               }}
               className={`flex-1 lg:flex-none px-6 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${mode === m.id ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
             >
               <m.icon size={12} /> {m.label}
             </button>
           ))}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 bg-zinc-50/50 dark:bg-black/20 p-6 md:p-8 flex flex-col relative">
        <AnimatePresence mode="wait">
          
          {/* --- EDITOR MODE --- */}
          {mode === 'edit' && (
            <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto w-full h-full flex flex-col">
              
              {/* Deck Management & Import/Export Bar */}
              <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={newProfileName} 
                    onChange={e => setNewProfileName(e.target.value)}
                    placeholder="New Deck Name..." 
                    className="px-3 py-2 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-zinc-400"
                  />
                  <button onClick={createProfile} className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 transition-colors"><FaFolderPlus /></button>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-zinc-600 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 transition-colors"><FaFileImport /> Paste Text</button>
                  <button onClick={exportJSON} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-zinc-600 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 transition-colors"><FaDownload /> Export .json</button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-zinc-600 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 transition-colors"><FaUpload /> Import .json</button>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json" className="hidden" />
                </div>
              </div>

              {/* TEXT IMPORTER OVERLAY */}
              <AnimatePresence>
                {showImport && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-2 uppercase tracking-wide">Paste from Word/Docs:</p>
                      <p className="text-[10px] text-amber-600/70 mb-3">Format each line as: <code>Question | Answer</code> OR <code>Question - Answer</code></p>
                      <textarea 
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder={"Example:\nWhat is CPU? | Central Processing Unit\nWhat is RAM? - Random Access Memory"}
                        className="w-full h-32 p-3 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 focus:outline-none focus:ring-2 ring-amber-500/20"
                      />
                      <button onClick={handleBulkImport} className="mt-3 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600">Process Text</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Form */}
              <div className="bg-white dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row">
                  <input type="text" value={form.q} onChange={(e) => setForm({...form, q: e.target.value})} placeholder="Front (Question)" className="flex-1 p-4 bg-transparent text-sm font-medium outline-none border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800" />
                  <input type="text" value={form.a} onChange={(e) => setForm({...form, a: e.target.value})} onKeyDown={(e) => { if(e.key === 'Enter') addCard() }} placeholder="Back (Answer)" className="flex-1 p-4 bg-transparent text-sm font-medium outline-none" />
                  <button onClick={addCard} className="p-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold md:rounded-r-xl md:rounded-l-none rounded-b-xl hover:opacity-90 flex items-center justify-center gap-2 min-w-[100px]">
                    <FaPlus /> Add
                  </button>
                </div>
              </div>

              {/* Cards List */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {cards.length === 0 && <div className="text-center text-zinc-400 text-sm mt-10">Deck is empty. Add a card above!</div>}
                {cards.map((c, i) => (
                  <div key={`${c.id}-${i}`} className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <div className="flex gap-4 items-center overflow-hidden w-full">
                         <span className="text-[10px] font-mono text-zinc-300 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                         <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="truncate text-sm font-bold text-zinc-700 dark:text-zinc-200">{c.q}</div>
                            <div className="truncate text-sm text-zinc-500 dark:text-zinc-400">{c.a}</div>
                         </div>
                      </div>
                      <button onClick={() => setCards(cards.filter(card => card.id !== c.id))} className="text-zinc-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100"><FaTrash /></button>
                   </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* --- QUIZ MODE --- */}
          {mode === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full">
              {!quizFinished ? (
                <>
                  <div className="w-full flex justify-between items-end mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Question {quizIndex + 1} of {studyDeck.length}</p>
                      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">{studyDeck[quizIndex].q}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-green-500">{score}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Score</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {quizOptions.map((opt, i) => {
                      let btnClass = "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400";
                      if (selectedAnswer) {
                        if (opt === studyDeck[quizIndex].a) btnClass = "bg-green-100 border-green-500 text-green-700";
                        else if (opt === selectedAnswer) btnClass = "bg-red-100 border-red-500 text-red-700";
                        else btnClass = "opacity-50";
                      }
                      return (
                        <button key={i} disabled={!!selectedAnswer} onClick={() => handleQuizAnswer(opt)} className={`p-6 text-left rounded-xl border-2 transition-all font-medium text-sm ${btnClass}`}>
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center">
                   <div className="text-6xl mb-4">{score / studyDeck.length >= 0.7 ? '🏆' : '📚'}</div>
                   <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2">Quiz Complete</h2>
                   <p className="text-zinc-500 mb-8">You scored <span className="text-zinc-900 dark:text-white font-bold">{score}</span> out of <span className="text-zinc-900 dark:text-white font-bold">{studyDeck.length}</span> ({Math.round((score/studyDeck.length)*100)}%)</p>
                   <div className="flex gap-4 justify-center">
                     <button onClick={startQuiz} className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl flex items-center gap-2"><FaRedo /> Retry</button>
                     <button onClick={() => setMode('edit')} className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl">Back to Editor</button>
                   </div>
                </div>
              )}
            </motion.div>
          )}

          {/* --- STUDY MODE --- */}
          {mode === 'study' && (
             <motion.div key="study" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full">
                 {!sessionFinished ? (
                   <div className="text-center">
                     <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Cards left: {studyDeck.length}</p>
                     <div 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className={`w-full max-w-sm min-h-[250px] bg-white dark:bg-zinc-900 border-2 rounded-2xl flex items-center justify-center p-8 cursor-pointer shadow-lg transition-colors mb-6 ${isFlipped ? 'border-indigo-500' : 'border-zinc-200 dark:border-zinc-700'}`}
                      >
                       <h3 className="text-xl font-bold text-zinc-900 dark:text-white text-center">
                         {isFlipped ? studyDeck[0].a : studyDeck[0].q}
                       </h3>
                     </div>
                     {isFlipped && (
                       <div className="flex gap-4 justify-center">
                         <button onClick={() => handleAssessment('forgot')} className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs uppercase transition-colors">I Forgot</button>
                         <button onClick={() => handleAssessment('mastered')} className="px-6 py-3 bg-green-100 hover:bg-green-200 text-green-700 font-bold rounded-xl text-xs uppercase transition-colors">Mastered</button>
                       </div>
                     )}
                     {!isFlipped && <p className="mt-4 text-[10px] text-zinc-400 uppercase tracking-widest">Tap card to flip</p>}
                   </div>
                 ) : (
                   <div className="text-center">
                     <div className="text-6xl mb-4">✨</div>
                     <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
                     <p className="text-zinc-500 mb-8">You've mastered all cards in this session.</p>
                     <div className="flex justify-center gap-4">
                        <button onClick={startStudy} className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl flex items-center gap-2"><FaRedo /> Restart</button>
                        <button onClick={() => setMode('edit')} className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl">Done</button>
                     </div>
                   </div>
                 )}
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}