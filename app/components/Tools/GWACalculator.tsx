"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaGraduationCap, FaEraser, FaArrowRight, FaPlus, FaTrash, FaAward, FaChevronDown, FaInfoCircle } from "react-icons/fa";

// --- STRICT GRADING LOGIC WITH MAJOR/MINOR BYPASS ---
const getGpaFromScore = (score: number, program: string, isMajor: boolean) => {
  // If the subject is NOT a major, it automatically falls back to the Standard Program scale
  const activeProgram = isMajor ? program : "Standard";

  if (activeProgram === "BSA") {
    if (score >= 98) return 4.0;
    if (score >= 95) return 3.5;
    if (score >= 91) return 3.0;
    if (score >= 87) return 2.5;
    if (score >= 82) return 2.0;
    if (score >= 77) return 1.5;
    if (score >= 72) return 1.0;
    return 0.0;
  }

  if (activeProgram === "DVM") {
    if (score >= 97) return 4.0;
    if (score >= 93) return 3.5;
    if (score >= 89) return 3.0;
    if (score >= 85) return 2.5;
    if (score >= 80) return 2.0;
    if (score >= 75) return 1.5;
    if (score >= 70) return 1.0;
    return 0.0;
  }

  // Standard Program (Also acts as the fallback for Minor subjects in BSA/DVM)
  if (score >= 97) return 4.0;
  if (score >= 91) return 3.5;
  if (score >= 85) return 3.0;
  if (score >= 78) return 2.5;
  if (score >= 72) return 2.0;
  if (score >= 66) return 1.5;
  if (score >= 60) return 1.0;
  return 0.0;
};

export default function GWACalculator() {
  const [program, setProgram] = useState("Standard");
  // Added isMajor to state
  const [subjects, setSubjects] = useState([
    { id: 1, raw: "", units: "3", isMajor: true }, 
    { id: 2, raw: "", units: "3", isMajor: true }, 
    { id: 3, raw: "", units: "3", isMajor: false }
  ]);
  const [result, setResult] = useState<{ gwa: number | null, title: string | null, error: string | null }>({ gwa: null, title: null, error: null });

  const addSubject = useCallback(() => setSubjects(prev => [...prev, { id: Date.now(), raw: "", units: "3", isMajor: false }]), []);
  const removeSubject = useCallback((id: number) => setSubjects(prev => prev.length > 1 ? prev.filter(s => s.id !== id) : prev), []);
  const updateSubject = useCallback((id: number, field: "raw" | "units" | "isMajor", value: any) => setSubjects(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s)), []);

  const calculateGWA = () => {
    setResult({ gwa: null, title: null, error: null });
    let totalWeighted = 0;
    let totalUnits = 0;
    let hasLowGrade = false; 

    for (const s of subjects) {
      if (!s.raw || !s.units) continue;
      const raw = parseFloat(s.raw);
      const units = parseFloat(s.units);
      if (isNaN(raw) || isNaN(units)) continue;
      if (raw > 100 || raw < 0) return setResult({ ...result, error: `Invalid score: ${raw}` });
      
      const subjectGPA = getGpaFromScore(raw, program, s.isMajor);
      if (subjectGPA < 2.0) hasLowGrade = true;
      
      totalWeighted += subjectGPA * units;
      totalUnits += units;
    }

    if (totalUnits === 0) return setResult({ ...result, error: "Enter valid scores." });
    const computedGWA = totalWeighted / totalUnits;
    
    let title = null;
    if (!hasLowGrade) {
      if (computedGWA >= 3.7) title = "With Highest Honors";
      else if (computedGWA >= 3.4) title = "With High Honors";
      else if (computedGWA >= 3.0) title = "With Honors";
    }

    setResult({ gwa: computedGWA, title, error: null });
  };

  const reset = () => {
    setSubjects([{ id: 1, raw: "", units: "3", isMajor: true }, { id: 2, raw: "", units: "3", isMajor: true }, { id: 3, raw: "", units: "3", isMajor: false }]);
    setResult({ gwa: null, title: null, error: null });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl relative overflow-hidden p-5 md:p-8 flex flex-col h-full">
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400"><FaGraduationCap size={20} /></div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white leading-tight">GWA Calculator</h2>
            <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Weighted Average</p>
          </div>
        </div>

        <div className="relative w-full md:w-auto group">
          <select 
            value={program} 
            onChange={(e) => setProgram(e.target.value)}
            className="w-full md:w-48 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl px-4 py-3 pr-10 outline-none focus:border-green-500 cursor-pointer appearance-none transition-colors group-hover:border-zinc-300 dark:group-hover:border-zinc-600 shadow-sm"
          >
            <option value="Standard">Standard Program</option>
            <option value="BSA">BS Accountancy</option>
            <option value="DVM">Vet. Medicine</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
            <FaChevronDown size={10} />
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
         <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-400">
           <div className="flex-1 flex justify-between sm:block sm:text-center"><span className="text-green-600 dark:text-green-400">3.70 - 4.00</span> <span className="sm:block uppercase tracking-wider mt-1 text-zinc-500">Highest</span></div>
           <div className="flex-1 flex justify-between sm:block sm:text-center sm:border-l border-zinc-200 dark:border-zinc-700"><span className="text-green-500 dark:text-green-500">3.40 - 3.69</span> <span className="sm:block uppercase tracking-wider mt-1 text-zinc-500">High Honors</span></div>
           <div className="flex-1 flex justify-between sm:block sm:text-center sm:border-l border-zinc-200 dark:border-zinc-700"><span className="text-green-400 dark:text-green-600">3.00 - 3.39</span> <span className="sm:block uppercase tracking-wider mt-1 text-zinc-500">With Honors</span></div>
         </div>
         <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-3 text-center flex items-center justify-center gap-1.5 font-medium">
           <FaInfoCircle /> {program !== "Standard" ? "*Minors use standard scale. Any grade < 2.0 disqualifies." : "*Any subject grade below 2.0 instantly disqualifies honors."}
         </p>
      </div>

      <div className="pt-2 space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[250px]">
        
        {/* Dynamic Responsive Header */}
        <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
          <span className="w-5 md:w-8 text-center shrink-0">#</span>
          <span className="flex-1 text-center">Score</span>
          <span className="w-12 md:w-16 text-center shrink-0">Units</span>
          {program !== "Standard" && <span className="w-10 md:w-14 text-center shrink-0" title="Major Subject?">Major</span>}
          <span className="w-8 md:w-10 text-center shrink-0">Act</span>
        </div>
        
        {subjects.map((sub, index) => (
          <SubjectRow 
            key={sub.id} 
            sub={sub} 
            index={index} 
            program={program} 
            updateSubject={updateSubject} 
            removeSubject={removeSubject} 
            canRemove={subjects.length > 1} 
          />
        ))}
      </div>
      
      <button onClick={addSubject} className="mt-4 w-full py-3 md:py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 rounded-xl hover:border-green-500 hover:text-green-500 transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shrink-0">
        <FaPlus size={12} /> Add Subject
      </button>
      
      <div className="flex gap-3 md:gap-4 mt-6 shrink-0">
        <button onClick={calculateGWA} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 md:py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider">
          Calculate <FaArrowRight size={12} className="hidden sm:block" />
        </button>
        <button onClick={reset} className="px-5 md:px-6 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-colors active:scale-95 rounded-xl">
          <FaEraser size={18} />
        </button>
      </div>
      
      <AnimatePresence>
        {result.error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 text-center text-red-500 text-xs font-bold shrink-0">{result.error}</motion.div>}
        {result.gwa !== null && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700 text-center shrink-0">
            <span className="text-[10px] md:text-xs font-bold uppercase text-zinc-500 tracking-widest">Weighted Average (GWA)</span>
            <div className={`text-4xl md:text-5xl font-black my-2 tracking-tighter ${result.gwa >= 3.0 && result.title ? "text-green-500" : "text-zinc-700 dark:text-white"}`}>{result.gwa.toFixed(4)}</div>
            
            {result.title ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 mt-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-600 dark:text-yellow-400 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wide animate-pulse"><FaAward size={14} /> {result.title}</div>
            ) : result.gwa >= 3.0 ? (
               <p className="text-red-500 font-bold uppercase tracking-widest text-[10px] mt-2">Disqualified due to a grade below 2.0</p>
            ) : (
               <p className="text-zinc-400 text-xs mt-2 font-medium">Keep pushing next semester!</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const SubjectRow = memo(({ sub, index, program, updateSubject, removeSubject, canRemove }: any) => {
  // Pass the isMajor flag into the real-time preview logic
  const previewGPA = sub.raw ? getGpaFromScore(parseFloat(sub.raw), program, sub.isMajor).toFixed(1) : "-.-";
  
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="w-5 md:w-8 text-center text-[10px] md:text-xs font-mono text-zinc-500 shrink-0">#{index + 1}</div>
      
      <div className="flex-1 relative group min-w-0">
        <input type="number" placeholder="0-100" value={sub.raw} onChange={(e) => updateSubject(sub.id, "raw", e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-3 md:py-2 text-center font-mono text-sm md:text-base outline-none focus:border-green-500 transition-colors" />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] md:text-[10px] font-bold text-green-600 dark:text-green-400 pointer-events-none opacity-50 group-focus-within:opacity-100 transition-opacity hidden sm:block">
          {sub.raw && !isNaN(parseFloat(sub.raw)) ? `≈ ${previewGPA}` : ""}
        </div>
      </div>
      
      <div className="w-12 md:w-16 shrink-0">
        <input type="number" placeholder="Unit" value={sub.units} onChange={(e) => updateSubject(sub.id, "units", e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-3 md:py-2 text-center font-mono text-sm md:text-base outline-none focus:border-green-500 transition-colors text-zinc-600 dark:text-zinc-300" />
      </div>

      {/* Conditionally render the Major Toggle ONLY if they are using BSA or DVM */}
      {program !== "Standard" && (
        <div className="w-10 md:w-14 shrink-0">
          <button 
            onClick={() => updateSubject(sub.id, "isMajor", !sub.isMajor)} 
            className={`w-full py-3.5 md:py-2.5 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-colors ${sub.isMajor ? 'bg-[#06402B] text-white shadow-md' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
          >
            {sub.isMajor ? 'YES' : 'NO'}
          </button>
        </div>
      )}
      
      <div className="w-8 md:w-10 shrink-0 flex justify-center">
        <button onClick={() => removeSubject(sub.id)} className="text-zinc-400 hover:text-red-500 transition-colors p-2" disabled={!canRemove}>
          <FaTrash size={14} className="md:w-3 md:h-3" />
        </button>
      </div>
    </div>
  );
});
SubjectRow.displayName = 'SubjectRow';