"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaGraduationCap, FaEraser, FaArrowRight, FaPlus, FaTrash, 
  FaAward, FaChevronDown, FaInfoCircle, FaSync, FaCheckCircle, FaTimes, FaExclamationTriangle
} from "react-icons/fa";
import { useModal } from "../../context/ModalContext";
interface GWACalculatorProps {
  autoGrades?: { courseId: string, title: string, average: string | null }[];
}

// --- STRICT GRADING LOGIC ---
const getGpaFromScore = (score: number, program: string, isMajor: boolean) => {
  const activeProgram = isMajor ? program : "Standard";
  

  if (activeProgram === "BSA") {
    if (score >= 98) return 4.0; if (score >= 95) return 3.5;
    if (score >= 91) return 3.0; if (score >= 87) return 2.5;
    if (score >= 82) return 2.0; if (score >= 77) return 1.5;
    if (score >= 72) return 1.0; return 0.0;
  }

  if (activeProgram === "DVM") {
    if (score >= 97) return 4.0; if (score >= 93) return 3.5;
    if (score >= 89) return 3.0; if (score >= 85) return 2.5;
    if (score >= 80) return 2.0; if (score >= 75) return 1.5;
    if (score >= 70) return 1.0; return 0.0;
  }

  // Standard Program
  if (score >= 97) return 4.0; if (score >= 91) return 3.5;
  if (score >= 85) return 3.0; if (score >= 78) return 2.5;
  if (score >= 72) return 2.0; if (score >= 66) return 1.5;
  if (score >= 60) return 1.0; return 0.0;
};
// --- CUSTOM HEADLESS UI DROPDOWN ---
function CustomSelect<T extends string>({
  value, options, onChange, renderOption, renderValue,
}: {
  value: T; options: T[];
  onChange: (v: T) => void;
  renderOption: (v: T) => React.ReactNode;
  renderValue: (v: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative w-full md:w-auto">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full md:w-48 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 outline-none cursor-pointer transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 shadow-sm"
      >
        {renderValue(value)}
        <FaChevronDown size={10} className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.97 }} transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-2 left-0 w-full min-w-[180px] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden py-1.5"
          >
            {options.map(opt => (
              <button
                key={opt} type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-between ${
                  opt === value ? "bg-zinc-50 dark:bg-white/5 text-[#06402B] dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5"
                }`}
              >
                {renderOption(opt)}
                {opt === value && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PROGRAMS = ["Standard", "BSA", "DVM"] as const;
type Program = typeof PROGRAMS[number];
const PROGRAM_LABELS: Record<Program, string> = {
  Standard: "Standard Program",
  BSA: "BS Accountancy",
  DVM: "Vet. Medicine",
};

export default function GWACalculator({ autoGrades = [] }: GWACalculatorProps) {
  const { showAlert } = useModal();

  const [program, setProgram] = useState<Program>("Standard");
  const [subjects, setSubjects] = useState([
    { id: 1, name: "", raw: "", units: "3", isMajor: true }, 
    { id: 2, name: "", raw: "", units: "3", isMajor: true }, 
    { id: 3, name: "", raw: "", units: "3", isMajor: false }
  ]);
  
  // Track dynamically imported rows to display a "synced" badge
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{ gwa: number | null, title: string | null, error: string | null }>({ gwa: null, title: null, error: null });

  const handleSyncWorkspace = () => {
    if (autoGrades.length === 0) {
      showAlert("Nothing to Sync", "No courses or graded tasks found in your workspace tracker.");

      return;
    }
    
    const newSyncedIds = new Set<number>();
    const syncedSubjects = autoGrades.map((course, index) => {
      const newId = Date.now() + index;
      newSyncedIds.add(newId);
      return {
        id: newId,
        name: course.title,
        raw: course.average || "",
        units: "3", 
        isMajor: true,
      };
    });
    
    setSubjects(syncedSubjects);
    setImportedIds(newSyncedIds);
    setResult({ gwa: null, title: null, error: null });
  };

  const addSubject = useCallback(() => setSubjects(prev => [...prev, { id: Date.now(), name: "", raw: "", units: "3", isMajor: false }]), []);
  const removeSubject = useCallback((id: number) => {
    setSubjects(prev => prev.length > 1 ? prev.filter(s => s.id !== id) : prev);
    setImportedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }, []);
  
  const updateSubject = useCallback((id: number, field: "name" | "raw" | "units" | "isMajor", value: any) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

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
      if (raw > 100 || raw < 0) return setResult({ ...result, error: `Invalid score in ${s.name || 'a subject'}: ${raw}` });
      
      const subjectGPA = getGpaFromScore(raw, program, s.isMajor);
      if (subjectGPA < 2.0) hasLowGrade = true;
      
      totalWeighted += subjectGPA * units;
      totalUnits += units;
    }

    if (totalUnits === 0) return setResult({ ...result, error: "Enter valid scores and units." });
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
    setSubjects([{ id: 1, name: "", raw: "", units: "3", isMajor: true }, { id: 2, name: "", raw: "", units: "3", isMajor: true }, { id: 3, name: "", raw: "", units: "3", isMajor: false }]);
    setImportedIds(new Set());
    setResult({ gwa: null, title: null, error: null });
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto h-fit bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-md border border-zinc-200 dark:border-[#06402B]/30 rounded-[2rem] shadow-sm relative overflow-hidden p-6 md:p-8 w-full">
      <div className="absolute top-0 left-0 w-full h-1 bg-[#06402B] dark:bg-emerald-500" />
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#06402B]/10 dark:bg-emerald-500/10 rounded-xl text-[#06402B] dark:text-emerald-400"><FaGraduationCap size={20} /></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">GWA Calculator</h2>
            <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Weighted Average</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          <button onClick={handleSyncWorkspace} className="w-full md:w-auto px-4 py-3.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <FaSync /> Sync Folders
          </button>

          <CustomSelect<Program>
            value={program}
            options={[...PROGRAMS]}
            onChange={setProgram}
            renderValue={v => <span className="text-[10px] sm:text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest truncate">{PROGRAM_LABELS[v]}</span>}
            renderOption={v => <span className="font-bold">{PROGRAM_LABELS[v]}</span>}
          />
        </div>
      </div>

      <div className="mb-6 p-4 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
         <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 text-[10px] sm:text-xs font-bold text-zinc-600 dark:text-zinc-400">
           <div className="flex-1 flex justify-between sm:block sm:text-center"><span className="text-[#06402B] dark:text-emerald-400">3.70 - 4.00</span> <span className="sm:block uppercase tracking-wider mt-1 text-zinc-500">Highest</span></div>
           <div className="flex-1 flex justify-between sm:block sm:text-center sm:border-l border-zinc-200 dark:border-zinc-700"><span className="text-[#06402B]/80 dark:text-emerald-500">3.40 - 3.69</span> <span className="sm:block uppercase tracking-wider mt-1 text-zinc-500">High Honors</span></div>
           <div className="flex-1 flex justify-between sm:block sm:text-center sm:border-l border-zinc-200 dark:border-zinc-700"><span className="text-[#06402B]/60 dark:text-emerald-600">3.00 - 3.39</span> <span className="sm:block uppercase tracking-wider mt-1 text-zinc-500">With Honors</span></div>
         </div>
         <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-3 text-center flex items-center justify-center gap-1.5 font-medium">
           <FaInfoCircle /> {program !== "Standard" ? "*Minors use standard scale. Any grade < 2.0 disqualifies." : "*Any subject grade below 2.0 instantly disqualifies honors."}
         </p>
      </div>

      <div className="pt-2 space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[250px]">
        <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
          <span className="w-5 md:w-8 text-center shrink-0">#</span>
          <span className="flex-1 min-w-[100px]">Subject</span>
          <span className="w-16 md:w-24 text-center shrink-0">Score</span>
          <span className="w-12 md:w-16 text-center shrink-0">Units</span>
          {program !== "Standard" && <span className="w-10 md:w-14 text-center shrink-0" title="Major Subject?">Major</span>}
          <span className="w-8 md:w-10 text-center shrink-0">Act</span>
        </div>
        
        <AnimatePresence>
          {subjects.map((sub, index) => (
            <SubjectRow 
              key={sub.id} 
              sub={sub} 
              index={index} 
              program={program} 
              updateSubject={updateSubject} 
              removeSubject={removeSubject} 
              canRemove={subjects.length > 1} 
              isImported={importedIds.has(sub.id)}
            />
          ))}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-center mt-4">
        <button onClick={addSubject} className="w-full max-w-sm py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 rounded-xl hover:border-[#06402B] hover:text-[#06402B] transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shrink-0">
          <FaPlus size={12} /> Add Subject
        </button>
      </div>
      
      <div className="flex gap-3 md:gap-4 mt-8 shrink-0">
        <button onClick={calculateGWA} className="flex-1 bg-[#06402B] dark:bg-emerald-600 hover:bg-[#042d1f] dark:hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-widest">
          Calculate <FaArrowRight size={12} className="hidden sm:block" />
        </button>
        <button onClick={reset} className="px-5 md:px-6 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-colors active:scale-95 rounded-xl w-fit">
          <FaEraser size={18} />
        </button>
      </div>
      
      <AnimatePresence>
        {result.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2">
            <FaExclamationTriangle className="shrink-0" /> <span>{result.error}</span>
            <button onClick={() => setResult(r => ({ ...r, error: null }))} className="ml-auto text-red-400 hover:text-red-600"><FaTimes size={12} /></button>
          </motion.div>
        )}
        
        {result.gwa !== null && !result.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-6 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] flex flex-col items-center">
            <span className="text-[10px] md:text-xs font-bold uppercase text-zinc-500 tracking-widest mb-1">Weighted Average (GWA)</span>
            <div className={`text-6xl md:text-7xl font-black tracking-tighter ${result.gwa >= 3.0 && result.title ? "text-[#06402B] dark:text-emerald-400" : "text-zinc-700 dark:text-white"}`}>{result.gwa.toFixed(4)}</div>
            
            {result.title ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-600 dark:text-yellow-400 text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-wide animate-pulse"><FaAward size={14} /> {result.title}</div>
            ) : result.gwa >= 3.0 ? (
               <p className="text-red-500 font-bold uppercase tracking-widest text-[10px] mt-4">Disqualified due to a grade below 2.0</p>
            ) : (
               <p className="text-zinc-400 text-xs mt-4 font-medium">Keep pushing next semester!</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const SubjectRow = memo(({ sub, index, program, updateSubject, removeSubject, canRemove, isImported }: any) => {
  const previewGPA = sub.raw ? getGpaFromScore(parseFloat(sub.raw), program, sub.isMajor).toFixed(1) : "-.-";
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-2 w-full group">
      <div className="w-5 md:w-8 text-center text-[10px] md:text-xs font-mono text-zinc-500 shrink-0">#{index + 1}</div>
      
      <div className="flex-1 min-w-[100px] flex flex-col gap-1">
        {isImported && (
          <span className="w-fit inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 rounded-md text-[9px] font-black uppercase tracking-widest ml-1 mb-[-2px]">
            <FaCheckCircle size={7} /> synced
          </span>
        )}
        <input 
          type="text" placeholder="Subject Name" value={sub.name} 
          onChange={(e) => updateSubject(sub.id, "name", e.target.value)} 
          className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-3 md:py-2.5 font-bold text-xs md:text-sm text-zinc-900 dark:text-white outline-none focus:border-[#06402B] transition-colors placeholder:font-normal shadow-sm" 
        />
      </div>
      
      <div className="w-16 md:w-24 relative shrink-0 self-end">
        <input 
          type="number" placeholder="0-100" value={sub.raw} 
          onChange={(e) => updateSubject(sub.id, "raw", e.target.value)} 
          className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-3 md:py-2.5 text-center font-mono font-bold text-sm md:text-base text-[#06402B] dark:text-emerald-400 outline-none focus:border-[#06402B] transition-colors shadow-sm" 
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] md:text-[10px] font-bold text-[#06402B] dark:text-emerald-400 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity hidden md:block">
          {sub.raw && !isNaN(parseFloat(sub.raw)) ? `≈${previewGPA}` : ""}
        </div>
      </div>
      
      <div className="w-12 md:w-16 shrink-0 self-end">
        <input type="number" placeholder="Unit" value={sub.units} onChange={(e) => updateSubject(sub.id, "units", e.target.value)} className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-3 md:py-2.5 text-center font-mono text-sm md:text-base outline-none focus:border-[#06402B] transition-colors text-zinc-600 dark:text-zinc-300 shadow-sm" />
      </div>
      
      {program !== "Standard" && (
        <div className="w-10 md:w-14 shrink-0 self-end">
          <button 
            onClick={() => updateSubject(sub.id, "isMajor", !sub.isMajor)} 
            className={`w-full py-[13px] md:py-3 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${sub.isMajor ? 'bg-[#06402B] dark:bg-emerald-600 text-white shadow-sm' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 border border-zinc-200 dark:border-zinc-700'}`}
          >
            {sub.isMajor ? 'YES' : 'NO'}
          </button>
        </div>
      )}
      
      <div className="w-8 md:w-10 shrink-0 flex justify-center self-end pb-2">
        <button onClick={() => removeSubject(sub.id)} className="text-zinc-400 hover:text-red-500 transition-colors p-2 rounded-lg" disabled={!canRemove}>
          <FaTrash size={14} className="md:w-3 md:h-3" />
        </button>
      </div>
    </motion.div>
  );
});
SubjectRow.displayName = 'SubjectRow';