"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaGraduationCap, FaEraser, FaArrowRight, FaPlus, FaTrash, FaAward } from "react-icons/fa";

const getGpaFromScore = (score: number) => {
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
  const [subjects, setSubjects] = useState([{ id: 1, raw: "", units: "3" }, { id: 2, raw: "", units: "3" }, { id: 3, raw: "", units: "3" }]);
  const [result, setResult] = useState<{ gwa: number | null, title: string | null, error: string | null }>({ gwa: null, title: null, error: null });

  const addSubject = useCallback(() => setSubjects(prev => [...prev, { id: Date.now(), raw: "", units: "3" }]), []);
  const removeSubject = useCallback((id: number) => setSubjects(prev => prev.length > 1 ? prev.filter(s => s.id !== id) : prev), []);
  const updateSubject = useCallback((id: number, field: "raw" | "units", value: string) => setSubjects(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s)), []);

  const calculateGWA = () => {
    setResult({ gwa: null, title: null, error: null });
    let totalWeighted = 0, totalUnits = 0;

    for (const s of subjects) {
      if (!s.raw || !s.units) continue;
      const raw = parseFloat(s.raw);
      const units = parseFloat(s.units);
      if (isNaN(raw) || isNaN(units)) continue;
      if (raw > 100 || raw < 0) return setResult({ ...result, error: `Invalid score: ${raw}` });
      
      totalWeighted += getGpaFromScore(raw) * units;
      totalUnits += units;
    }

    if (totalUnits === 0) return setResult({ ...result, error: "Enter valid scores." });
    const computedGWA = totalWeighted / totalUnits;
    
    let title = null;
    if (computedGWA >= 3.7) title = "With Highest Honors";
    else if (computedGWA >= 3.4) title = "With High Honors";
    else if (computedGWA >= 3.0) title = "With Honors";

    setResult({ gwa: computedGWA, title, error: null });
  };

  const reset = () => {
    setSubjects([{ id: 1, raw: "", units: "3" }, { id: 2, raw: "", units: "3" }, { id: 3, raw: "", units: "3" }]);
    setResult({ gwa: null, title: null, error: null });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl relative overflow-hidden p-6 md:p-8">
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400"><FaGraduationCap size={20} /></div>
          <div><h2 className="text-xl font-bold text-zinc-900 dark:text-white">GWA Calculator</h2><p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Weighted Average</p></div>
        </div>
      </div>

      <div className="pt-2 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
          <span className="col-span-2 text-center">Subj</span><span className="col-span-5 text-center">Raw Score</span><span className="col-span-3 text-center">Units</span><span className="col-span-2 text-center">Act</span>
        </div>
        {subjects.map((sub, index) => <SubjectRow key={sub.id} sub={sub} index={index} updateSubject={updateSubject} removeSubject={removeSubject} canRemove={subjects.length > 1} />)}
      </div>
      <button onClick={addSubject} className="mt-4 w-full py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 rounded-xl hover:border-green-500 hover:text-green-500 transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"><FaPlus /> Add Subject</button>
      <div className="flex gap-4 mt-8">
        <button onClick={calculateGWA} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">Calculate GWA <FaArrowRight size={12} /></button>
        <button onClick={reset} className="px-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-colors active:scale-95"><FaEraser /></button>
      </div>
      
      <AnimatePresence>
        {result.error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 text-center text-red-500 text-xs font-bold">{result.error}</motion.div>}
        {result.gwa !== null && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700 text-center">
            <span className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Weighted Average (GWA)</span>
            <div className={`text-5xl font-black my-2 tracking-tighter ${result.gwa >= 3.0 ? "text-green-500" : "text-zinc-700 dark:text-white"}`}>{result.gwa.toFixed(4)}</div>
            {result.title ? <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-600 dark:text-yellow-400 text-sm font-bold uppercase tracking-wide animate-pulse"><FaAward /> {result.title}</div> : <p className="text-zinc-400 text-xs mt-2">Keep pushing!</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const SubjectRow = memo(({ sub, index, updateSubject, removeSubject, canRemove }: any) => {
  const previewGPA = sub.raw ? getGpaFromScore(parseFloat(sub.raw)).toFixed(1) : "-.-";
  return (
    <div className="grid grid-cols-12 gap-2 items-center">
      <div className="col-span-2 text-center text-xs font-mono text-zinc-500">#{index + 1}</div>
      <div className="col-span-5 relative group">
        <input type="number" placeholder="0-100" value={sub.raw} onChange={(e) => updateSubject(sub.id, "raw", e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-center font-mono text-sm outline-none focus:border-green-500 transition-colors" />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-600 dark:text-green-400 pointer-events-none opacity-50 group-focus-within:opacity-100 transition-opacity">{sub.raw && !isNaN(parseFloat(sub.raw)) ? `≈ ${previewGPA}` : ""}</div>
      </div>
      <div className="col-span-3"><input type="number" placeholder="Unit" value={sub.units} onChange={(e) => updateSubject(sub.id, "units", e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-center font-mono text-sm outline-none focus:border-green-500 transition-colors text-zinc-600 dark:text-zinc-300" /></div>
      <div className="col-span-2 text-center"><button onClick={() => removeSubject(sub.id)} className="text-zinc-400 hover:text-red-500 transition-colors p-2" disabled={!canRemove}><FaTrash size={12} /></button></div>
    </div>
  );
});
SubjectRow.displayName = 'SubjectRow';