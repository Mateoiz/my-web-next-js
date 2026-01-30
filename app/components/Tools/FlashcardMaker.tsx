"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaTrash, FaLayerGroup, FaRedo, FaFileUpload, FaSave, 
  FaCheck, FaTimes, FaClipboardList, FaGamepad, FaFileImport
} from "react-icons/fa";

// --- TYPES ---
type Card = { id: number; q: string; a: string };
type Mode = 'edit' | 'study' | 'quiz';

export default function UltimateStudyTool() {
  const [mode, setMode] = useState<Mode>('edit');
  const [cards, setCards] = useState<Card[]>([]);
  
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

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem('jpcs-flashcards');
    if (saved) setCards(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('jpcs-flashcards', JSON.stringify(cards));
  }, [cards]);

  // --- EDITOR FUNCTIONS ---
  const addCard = () => {
    if (!form.q || !form.a) return;
    setCards([...cards, { id: Date.now(), q: form.q, a: form.a }]);
    setForm({ q: "", a: "" });
  };

  // --- BULK IMPORT (Reviewer Parser) ---
  const handleBulkImport = () => {
    if (!importText.trim()) return;
    
    // We assume the user pastes format like: "Question | Answer" (one per line)
    const lines = importText.split('\n');
    const newCards: Card[] = [];

    lines.forEach(line => {
      // Try to split by pipe | first, or dash - if pipe is missing
      let parts = line.includes('|') ? line.split('|') : line.split(' - ');
      
      if (parts.length >= 2) {
        const q = parts[0].trim();
        const a = parts.slice(1).join(' ').trim(); // Join rest in case answer has dashes
        if (q && a) {
          newCards.push({ id: Date.now() + Math.random(), q, a });
        }
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

  // --- STUDY MODE (Active Recall) ---
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
        const newDeck = [...studyDeck.slice(1), currentCard];
        setStudyDeck(newDeck);
      }
    }, 200);
  };

  // --- QUIZ MODE (Multiple Choice) ---
  const generateOptions = (correctAnswer: string) => {
    // Get all answers from deck except the correct one
    const distractors = cards
      .map(c => c.a)
      .filter(a => a !== correctAnswer);
    
    // Shuffle distractors and pick 3
    const randomDistractors = distractors
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    // Combine with correct answer and shuffle again
    return [...randomDistractors, correctAnswer].sort(() => Math.random() - 0.5);
  };

  const startQuiz = () => {
    if (cards.length < 4) return alert("You need at least 4 cards to start a quiz!");
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setStudyDeck(shuffled); // Reuse studyDeck variable for the quiz order
    setQuizIndex(0);
    setScore(0);
    setQuizFinished(false);
    setSelectedAnswer(null);
    setQuizOptions(generateOptions(shuffled[0].a));
    setMode('quiz');
  };

  const handleQuizAnswer = (answer: string) => {
    if (selectedAnswer) return; // Prevent double clicking
    setSelectedAnswer(answer);

    const isCorrect = answer === studyDeck[quizIndex].a;
    if (isCorrect) setScore(s => s + 1);

    // Wait a moment to show Green/Red feedback then move on
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[650px]"
    >
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col lg:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500"><FaLayerGroup /></div>
           <div>
             <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">JPCS Reviewer</h2>
             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
               {mode === 'edit' ? `${cards.length} Cards` : mode === 'study' ? 'Active Recall' : 'Exam Simulation'}
             </p>
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
              
              {/* Import/Export Bar */}
              <div className="flex flex-wrap justify-end gap-3 mb-6">
                <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-600 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 transition-colors">
                  <FaFileImport /> Import Text
                </button>
                {/* Existing Save/Load buttons would go here (hidden for brevity) */}
              </div>

              {/* TEXT IMPORTER OVERLAY */}
              <AnimatePresence>
                {showImport && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-2 uppercase tracking-wide">
                        Paste from Word/Docs:
                      </p>
                      <p className="text-[10px] text-amber-600/70 mb-3">Format each line as: <code>Question | Answer</code> OR <code>Question - Answer</code></p>
                      <textarea 
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder={"Example:\nWhat is CPU? | Central Processing Unit\nWhat is RAM? - Random Access Memory"}
                        className="w-full h-32 p-3 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 focus:outline-none focus:ring-2 ring-amber-500/20"
                      />
                      <button onClick={handleBulkImport} className="mt-3 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600">
                        Process Text
                      </button>
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
                {cards.map((c, i) => (
                   <div key={c.id} className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
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
                  {/* Progress Header */}
                  <div className="w-full flex justify-between items-end mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Question {quizIndex + 1} of {studyDeck.length}</p>
                      <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mt-2">{studyDeck[quizIndex].q}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-green-500">{score}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Current Score</p>
                    </div>
                  </div>

                  {/* Multiple Choice Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    {quizOptions.map((opt, i) => {
                      // Determine button color based on state
                      let btnClass = "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400";
                      if (selectedAnswer) {
                        if (opt === studyDeck[quizIndex].a) btnClass = "bg-green-100 border-green-500 text-green-700"; // Correct
                        else if (opt === selectedAnswer) btnClass = "bg-red-100 border-red-500 text-red-700"; // Wrong pick
                        else btnClass = "opacity-50"; // Others
                      }

                      return (
                        <button
                          key={i}
                          disabled={!!selectedAnswer}
                          onClick={() => handleQuizAnswer(opt)}
                          className={`p-6 text-left rounded-xl border-2 transition-all font-medium text-sm ${btnClass}`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                /* QUIZ RESULTS */
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

          {/* --- STUDY MODE (Same as previous, omitted for brevity but logic is in startStudy) --- */}
          {mode === 'study' && (
             <div className="flex flex-col items-center justify-center h-full">
                {/* Simplified Card for demo context - insert the Active Recall UI from previous answer here */}
                 {!sessionFinished ? (
                   <div className="text-center">
                     <div 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className={`w-[300px] h-[200px] bg-white dark:bg-zinc-900 border-2 rounded-2xl flex items-center justify-center p-6 cursor-pointer shadow-lg mb-6 ${isFlipped ? 'border-green-500' : 'border-zinc-200 dark:border-zinc-700'}`}
                      >
                       <h3 className="text-xl font-bold">{isFlipped ? studyDeck[0].a : studyDeck[0].q}</h3>
                     </div>
                     {isFlipped && (
                       <div className="flex gap-4 justify-center">
                         <button onClick={() => handleAssessment('forgot')} className="px-6 py-2 bg-red-100 text-red-600 font-bold rounded-lg text-xs uppercase">I Forgot</button>
                         <button onClick={() => handleAssessment('mastered')} className="px-6 py-2 bg-green-100 text-green-600 font-bold rounded-lg text-xs uppercase">Mastered</button>
                       </div>
                     )}
                     <p className="mt-4 text-[10px] text-zinc-400 uppercase tracking-widest">{isFlipped ? 'Rate yourself' : 'Tap to flip'}</p>
                   </div>
                 ) : (
                   <div className="text-center">
                     <h2 className="text-2xl font-bold">Session Complete!</h2>
                     <button onClick={() => setMode('edit')} className="mt-4 px-6 py-2 bg-zinc-900 text-white rounded-lg">Done</button>
                   </div>
                 )}
             </div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}