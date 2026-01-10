"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaTrash, FaChevronLeft, FaChevronRight, 
  FaLayerGroup, FaRedo, FaDownload, FaFileUpload, FaSave 
} from "react-icons/fa";

export default function FlashcardMaker() {
  const [mode, setMode] = useState<'edit' | 'study'>('edit');
  const [cards, setCards] = useState<{id: number, q: string, a: string}[]>([]);
  const [form, setForm] = useState({ q: "", a: "" });
  
  // Study Mode State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('jpcs-flashcards');
    if (saved) setCards(JSON.parse(saved));
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    localStorage.setItem('jpcs-flashcards', JSON.stringify(cards));
  }, [cards]);

  const addCard = () => {
    if (!form.q || !form.a) return;
    setCards([...cards, { id: Date.now(), q: form.q, a: form.a }]);
    setForm({ q: "", a: "" });
  };

  // --- NEW: SAVE TO FILE ---
  const saveDeck = () => {
    if (cards.length === 0) return alert("Deck is empty!");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cards));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "my_flashcards.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // --- NEW: LOAD FROM FILE ---
  const loadDeck = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          setCards(json);
          setMode('edit');
          alert("Deck loaded successfully!");
        } else {
          alert("Invalid file format.");
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Could not load file.");
      }
    };
    reader.readAsText(file);
  };

  // Study Controls
  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev + 1) % cards.length), 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length), 150);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-500">
             <FaLayerGroup />
           </div>
           <div>
             <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">Flashcards</h2>
             <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
               {mode === 'edit' ? `Editing Deck (${cards.length})` : `Studying ${cards.length} Cards`}
             </p>
           </div>
        </div>
        
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full md:w-auto">
           <button 
             onClick={() => setMode('edit')}
             className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'edit' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
           >
             Edit
           </button>
           <button 
             onClick={() => { setMode('study'); setIsFlipped(false); setCurrentIndex(0); }}
             className={`flex-1 md:flex-none px-6 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'study' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}
           >
             Study
           </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-50/50 dark:bg-black/20 p-6 md:p-8 flex flex-col">
        <AnimatePresence mode="wait">
          
          {/* --- EDITOR MODE --- */}
          {mode === 'edit' ? (
            <motion.div 
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto w-full h-full flex flex-col"
            >
              
              {/* NEW: Deck Actions (Save/Load) */}
              <div className="flex justify-end gap-3 mb-6">
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={loadDeck} 
                  accept=".json" 
                  className="hidden" 
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <FaFileUpload /> Load Deck
                </button>
                
                <button 
                  onClick={saveDeck}
                  disabled={cards.length === 0}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaSave /> Save Deck
                </button>
              </div>

              {/* Input Form */}
              <div className="bg-white dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row">
                  <input 
                    type="text" 
                    value={form.q}
                    onChange={(e) => setForm({...form, q: e.target.value})}
                    placeholder="Front (Question)"
                    className="flex-1 p-4 bg-transparent text-sm font-medium outline-none border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 placeholder:text-zinc-400"
                  />
                  <input 
                    type="text" 
                    value={form.a}
                    onChange={(e) => setForm({...form, a: e.target.value})}
                    onKeyDown={(e) => { if(e.key === 'Enter') addCard() }} 
                    placeholder="Back (Answer)"
                    className="flex-1 p-4 bg-transparent text-sm font-medium outline-none placeholder:text-zinc-400"
                  />
                  <button 
                    onClick={addCard}
                    className="p-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold md:rounded-r-xl md:rounded-l-none rounded-b-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 min-w-[100px]"
                  >
                    <FaPlus size={10} /> Add
                  </button>
                </div>
              </div>

              {/* Card List */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {cards.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2 opacity-50 min-h-[200px]">
                    <FaLayerGroup size={24} />
                    <p className="text-xs font-medium">No cards yet. Add one above.</p>
                  </div>
                )}
                {cards.map((c, i) => (
                   <motion.div 
                     initial={{ opacity: 0, y: 5 }}
                     animate={{ opacity: 1, y: 0 }}
                     key={c.id} 
                     className="group flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                   >
                      <div className="flex gap-4 items-center overflow-hidden w-full">
                         <span className="text-[10px] font-mono text-zinc-300 w-6">{(i + 1).toString().padStart(2, '0')}</span>
                         <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="truncate text-sm font-bold text-zinc-700 dark:text-zinc-200">{c.q}</div>
                            <div className="truncate text-sm text-zinc-500 dark:text-zinc-400">{c.a}</div>
                         </div>
                      </div>
                      <button 
                        onClick={() => setCards(cards.filter(card => card.id !== c.id))} 
                        className="text-zinc-300 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100"
                      >
                        <FaTrash size={12} />
                      </button>
                   </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            
            /* --- STUDY MODE --- */
            <motion.div 
              key="study"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto w-full"
            >
              {cards.length > 0 ? (
                <>
                  {/* Progress Bar */}
                  <div className="w-full max-w-sm flex items-center gap-3 mb-8">
                    <span className="text-[10px] font-bold text-zinc-400 w-8 text-right">{currentIndex + 1}</span>
                    <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-zinc-900 dark:bg-white rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 w-8">{cards.length}</span>
                  </div>

                  {/* THE CARD */}
                  <div 
                    className="relative w-full aspect-[3/2] cursor-pointer perspective-1000 group"
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <motion.div
                      className="w-full h-full relative preserve-3d"
                      // Fast Flip Animation
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.15, ease: "easeInOut" }}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {/* FRONT (Question) - Green Border on Hover */}
                      <div className="absolute inset-0 backface-hidden bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-sm group-hover:shadow-md group-hover:border-green-500/50 transition-all">
                         <span className="absolute top-6 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Question</span>
                         <h3 className="text-2xl font-bold text-zinc-800 dark:text-white">{cards[currentIndex].q}</h3>
                         <p className="absolute bottom-6 text-[10px] text-zinc-300 uppercase tracking-widest group-hover:text-green-500 transition-colors">Click to Flip</p>
                      </div>

                      {/* BACK (Answer) - Solid Green Border */}
                      <div 
                        className="absolute inset-0 backface-hidden bg-zinc-50 dark:bg-zinc-800 border-2 border-green-500 rounded-2xl flex flex-col items-center justify-center p-8 text-center shadow-lg shadow-green-500/10"
                        style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
                      >
                         <span className="absolute top-6 text-[10px] font-bold text-green-600 uppercase tracking-widest">Answer</span>
                         <h3 className="text-xl font-medium text-zinc-700 dark:text-zinc-200 leading-relaxed">{cards[currentIndex].a}</h3>
                      </div>
                    </motion.div>
                  </div>

                  {/* CONTROLS */}
                  <div className="flex items-center gap-6 mt-10">
                     <button 
                       onClick={prevCard} 
                       className="p-4 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                     >
                       <FaChevronLeft />
                     </button>

                     <button 
                       onClick={() => setIsFlipped(!isFlipped)} 
                       className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:scale-110 active:scale-95 transition-all"
                     >
                        <FaRedo size={14} />
                     </button>

                     <button 
                       onClick={nextCard} 
                       className="p-4 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                     >
                       <FaChevronRight />
                     </button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4 opacity-50">
                   <p className="text-zinc-500 text-sm">Your deck is empty.</p>
                   <button onClick={() => setMode('edit')} className="text-zinc-900 dark:text-white font-bold text-sm underline underline-offset-4">Create some cards</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}