"use client";

import { useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCalculator, FaEraser, 
  FaArrowRight, FaExclamationTriangle, FaGraduationCap, 
  FaPlus, FaTrash, FaAward, FaChevronDown, FaChevronUp,
  FaCalendarAlt, FaDownload, FaClock
} from "react-icons/fa";
import { toPng } from 'html-to-image';

// --- IMPORT YOUR THEME COMPONENTS ---
// Ensure these paths are correct for your project structure
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor"; 

// --- CONSTANTS & CONFIGURATION ---
// --- CONSTANTS & CONFIGURATION ---
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// ADDED: Pink and Teal for more aesthetic options
const COLORS = [
  { name: "Green", val: "bg-green-500" },
  { name: "Teal", val: "bg-teal-400" }, // New
  { name: "Blue", val: "bg-blue-500" },
  { name: "Purple", val: "bg-violet-500" },
  { name: "Pink", val: "bg-pink-400" }, // New
  { name: "Orange", val: "bg-orange-400" },
  { name: "Red", val: "bg-rose-500" },
  { name: "Zinc", val: "bg-zinc-600" },
];

const BG_THEMES = [
  { 
    id: 'dark', 
    name: 'Midnight', 
    bg: 'bg-zinc-950', 
    text: 'text-white', 
    subtext: 'text-zinc-500',
    border: 'border-zinc-800', 
    hex: '#09090b',       // Actual background color for download
    displayHex: '#09090b' // Button color (Dark is fine)
  },
  { 
    id: 'light', 
    name: 'Paper', 
    bg: 'bg-white', 
    text: 'text-zinc-900', 
    subtext: 'text-zinc-400',
    border: 'border-zinc-100', 
    hex: '#ffffff',
    displayHex: '#e4e4e7' // Zinc-200: Made darker so it's visible as a button
  },
  { 
    id: 'sakura', 
    name: 'Sakura', 
    bg: 'bg-rose-50', 
    text: 'text-rose-950', 
    subtext: 'text-rose-400',
    border: 'border-rose-200', 
    hex: '#fff1f2',       // Keep the schedule background light/subtle
    displayHex: '#f472b6' // Pink-400: Make the button pop!
  },
  { 
    id: 'navy', 
    name: 'Blueprint', 
    bg: 'bg-slate-900', 
    text: 'text-slate-100', 
    subtext: 'text-slate-500',
    border: 'border-slate-800', 
    hex: '#0f172a',
    displayHex: '#0f172a'
  },
  { 
    id: 'cream', 
    name: 'Journal', 
    bg: 'bg-stone-100', 
    text: 'text-stone-800', 
    subtext: 'text-stone-400',
    border: 'border-stone-200', 
    hex: '#f5f5f4',
    displayHex: '#d6d3d1' // Stone-300: Darker for visibility
  },
];

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

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function ToolsPage() {
  return (
    <section className="min-h-screen py-24 px-4 md:px-8 relative overflow-hidden bg-zinc-50 dark:bg-black font-sans selection:bg-green-500/30">
      
      <CircuitCursor />
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute inset-0 opacity-80">
            <FloatingCubes />
         </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white"
          >
            Student <span className="text-green-600 dark:text-green-500">Toolkit</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto text-lg"
          >
            Essential computational tools for the modern student.
          </motion.p>
        </div>

        {/* --- CALCULATORS GRID --- */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start mb-8">
          <GradeCalculator />
          <div className="flex flex-col gap-8">
             <GWACalculator />
          </div>
        </div>

        {/* --- SCHEDULE MAKER (FULL WIDTH) --- */}
        <div className="w-full">
           <ScheduleMaker />
        </div>

      </div>
    </section>
  );
}

// ==========================================
// 1. GRADE CALCULATOR (OPTIMIZED)
// ==========================================
function GradeCalculator() {
  const [isExpanded, setIsExpanded] = useState(false); 

  const [midterms, setMidterms] = useState({ raw: "", total: "", weight: "30" });
  const [finals, setFinals] = useState({ raw: "", total: "", weight: "30" });
  const [finalProduct, setFinalProduct] = useState({ raw: "", total: "", weight: "20" });
  const [classStanding, setClassStanding] = useState({ raw: "", total: "N/A", weight: "20" });

  const [result, setResult] = useState<{ percentage: number | null, gpa: number | null, error: string | null }>({
    percentage: null, gpa: null, error: null
  });

  const calculateGrade = useCallback(() => {
    const getExamPoints = (item: { raw: string; total: string; weight: string }) => {
      const raw = parseFloat(item.raw);
      const total = parseFloat(item.total);
      const weight = parseFloat(item.weight);

      if (isNaN(raw)) return 0;
      if (isNaN(total) || total === 0) return raw > 0 ? -1 : 0;
      if (raw > total) return -2;

      return (raw / total) * 100 * (weight / 100);
    };

    const getClassStandingPoints = (item: { raw: string }) => {
      const raw = parseFloat(item.raw);
      if (isNaN(raw)) return 0;
      if (raw > 20) return -3;
      if (raw < 0) return -4;
      return raw;
    };

    const midPts = getExamPoints(midterms);
    const finPts = getExamPoints(finals);
    const prodPts = getExamPoints(finalProduct);
    const csPts = getClassStandingPoints(classStanding);

    if (midPts === -1 || finPts === -1 || prodPts === -1) {
      setResult({ percentage: null, gpa: null, error: "Please enter 'Total Items' for exams/product." });
      return;
    }
    if (midPts === -2 || finPts === -2 || prodPts === -2) {
      setResult({ percentage: null, gpa: null, error: "Score cannot be higher than Total Items." });
      return;
    }
    if (csPts === -3) {
      setResult({ percentage: null, gpa: null, error: "Class Standing cannot be higher than 20." });
      return;
    }
    if (csPts === -4) {
      setResult({ percentage: null, gpa: null, error: "Scores cannot be negative." });
      return;
    }

    const totalScore = midPts + finPts + prodPts + csPts;
    setResult({ percentage: totalScore, gpa: getGpaFromScore(Math.round(totalScore)), error: null });
  }, [midterms, finals, finalProduct, classStanding]);

  const reset = () => {
    setMidterms({ raw: "", total: "", weight: "30" });
    setFinals({ raw: "", total: "", weight: "30" });
    setFinalProduct({ raw: "", total: "", weight: "20" });
    setClassStanding({ raw: "", total: "N/A", weight: "20" });
    setResult({ percentage: null, gpa: null, error: null });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl relative overflow-hidden transition-all duration-300 ${isExpanded ? 'p-6 md:p-8' : 'p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 cursor-pointer'}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
      
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
            <FaCalculator size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Grade Projector</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Subject Grade Calculator</p>
          </div>
        </div>
        <div className="text-zinc-400 dark:text-zinc-500">
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-8 space-y-4">
              <div className="grid grid-cols-12 text-xs font-bold text-zinc-400 uppercase tracking-widest px-1 gap-2">
                <span className="col-span-4">Category</span>
                <span className="col-span-3 text-center">Score</span>
                <span className="col-span-3 text-center">Total</span>
                <span className="col-span-2 text-center">W%</span>
              </div>

              <GradeRow label="Midterm Exam" values={midterms} setValues={setMidterms} type="exam" />
              <GradeRow label="Final Exam" values={finals} setValues={setFinals} type="exam" />
              <GradeRow label="Final Product" values={finalProduct} setValues={setFinalProduct} type="exam" />
              <GradeRow label="Class Standing" values={classStanding} setValues={setClassStanding} type="direct" />
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={calculateGrade} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                Compute Grade <FaArrowRight size={12} />
              </button>
              <button onClick={reset} className="px-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-colors active:scale-95">
                <FaEraser />
              </button>
            </div>

            {result.error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                <FaExclamationTriangle className="shrink-0" /> <span>{result.error}</span>
              </motion.div>
            )}

            {result.gpa !== null && !result.error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-6 bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center">
                <span className="text-sm text-zinc-500 font-bold uppercase mb-1">Subject GPA</span>
                <div className={`text-6xl font-black tracking-tighter ${result.gpa >= 3.0 ? "text-green-500" : result.gpa >= 1.0 ? "text-yellow-500" : "text-red-500"}`}>
                  {result.gpa.toFixed(1)}
                </div>
                <div className="mt-2 text-zinc-500 dark:text-zinc-400 font-mono text-sm">
                  Raw Score: <span className="text-zinc-800 dark:text-zinc-200 font-bold">{result.percentage?.toFixed(2)}%</span>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {result.gpa >= 4.0 ? "Excellent Work!" : result.gpa >= 3.0 ? "Great Job!" : result.gpa >= 1.0 ? "You Passed." : "See you next term."}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Memoized Row to prevent lag
const GradeRow = memo(({ label, values, setValues, type }: any) => (
  <div className="grid grid-cols-12 gap-2 items-center" onClick={(e) => e.stopPropagation()}>
    <div className="col-span-4 text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate">
      {label}
    </div>
    <div className="col-span-3">
      <input
        type="number"
        placeholder={type === "direct" ? "0-20" : "0"}
        value={values.raw}
        onChange={(e) => setValues({ ...values, raw: e.target.value })}
        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-center font-mono text-sm outline-none focus:border-green-500 transition-colors"
      />
    </div>
    <div className="col-span-3">
      {type === "exam" ? (
        <input
          type="number"
          placeholder="/ 100"
          value={values.total}
          onChange={(e) => setValues({ ...values, total: e.target.value })}
          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-center font-mono text-sm outline-none focus:border-green-500 transition-colors placeholder:text-zinc-500/50"
        />
      ) : (
        <div className="w-full text-center text-xs text-zinc-400 font-mono py-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg border border-transparent dark:border-zinc-800 select-none">
          MAX 20
        </div>
      )}
    </div>
    <div className="col-span-2">
      <input
        type="number"
        value={values.weight}
        disabled
        className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-1 py-2 text-center font-mono text-xs text-zinc-500 outline-none select-none cursor-default"
      />
    </div>
  </div>
));
GradeRow.displayName = 'GradeRow';

// ==========================================
// 2. GWA CALCULATOR (OPTIMIZED)
// ==========================================
function GWACalculator() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subjects, setSubjects] = useState([
    { id: 1, raw: "", units: "3" }, 
    { id: 2, raw: "", units: "3" }, 
    { id: 3, raw: "", units: "3" }
  ]);
  
  const [result, setResult] = useState<{ gwa: number | null, title: string | null, error: string | null }>({
    gwa: null, title: null, error: null
  });

  const addSubject = useCallback(() => {
    setSubjects(prev => [...prev, { id: Date.now(), raw: "", units: "3" }]);
  }, []);

  const removeSubject = useCallback((id: number) => {
    setSubjects(prev => prev.length > 1 ? prev.filter(s => s.id !== id) : prev);
  }, []);

  const updateSubject = useCallback((id: number, field: "raw" | "units", value: string) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const calculateGWA = () => {
    setResult({ gwa: null, title: null, error: null });
    let totalWeightedPoints = 0; 
    let totalUnits = 0;

    for (const s of subjects) {
      if (!s.raw || !s.units) continue;
      const rawScore = parseFloat(s.raw);
      const unitValue = parseFloat(s.units);

      if (isNaN(rawScore) || isNaN(unitValue)) continue;
      
      if (rawScore > 100 || rawScore < 0) {
          setResult(prev => ({ ...prev, error: `Invalid score: ${rawScore}. Must be between 0 and 100.` }));
          return;
      }

      if (unitValue <= 0) {
        setResult(prev => ({ ...prev, error: `Invalid unit: ${unitValue}. Must be greater than 0.` }));
        return;
      }

      const equivalent = getGpaFromScore(rawScore);
      totalWeightedPoints += (equivalent * unitValue);
      totalUnits += unitValue;
    }

    if (totalUnits === 0) {
      setResult(prev => ({ ...prev, error: "Please enter valid scores and units." }));
      return;
    }

    const computedGWA = totalWeightedPoints / totalUnits;
    let honorTitle = null;
    if (computedGWA >= 3.7) honorTitle = "With Highest Honors";
    else if (computedGWA >= 3.4) honorTitle = "With High Honors";
    else if (computedGWA >= 3.0) honorTitle = "With Honors";

    setResult({ gwa: computedGWA, title: honorTitle, error: null });
  };

  const reset = () => {
    setSubjects([{ id: 1, raw: "", units: "3" }, { id: 2, raw: "", units: "3" }, { id: 3, raw: "", units: "3" }]);
    setResult({ gwa: null, title: null, error: null });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className={`bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl relative overflow-hidden transition-all duration-300 ${isExpanded ? 'p-6 md:p-8' : 'p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 cursor-pointer'}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
      
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
            <FaGraduationCap size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">GWA Calculator</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Weighted Average</p>
          </div>
        </div>
        <div className="text-zinc-400 dark:text-zinc-500">
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-8 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-12 gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
                <span className="col-span-2 text-center">Subj</span>
                <span className="col-span-5 text-center">Raw Score</span>
                <span className="col-span-3 text-center">Units</span>
                <span className="col-span-2 text-center">Act</span>
              </div>

              {subjects.map((sub, index) => (
                <SubjectRow 
                  key={sub.id} 
                  sub={sub} 
                  index={index} 
                  updateSubject={updateSubject} 
                  removeSubject={removeSubject} 
                  canRemove={subjects.length > 1}
                />
              ))}
            </div>

            <button onClick={addSubject} className="mt-4 w-full py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 rounded-xl hover:border-green-500 hover:text-green-500 transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <FaPlus /> Add Subject
            </button>

            <div className="flex gap-4 mt-8">
              <button onClick={calculateGWA} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                Calculate GWA <FaArrowRight size={12} />
              </button>
              <button onClick={reset} className="px-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-colors active:scale-95">
                <FaEraser />
              </button>
            </div>

            {result.error && <div className="mt-4 text-center text-red-500 text-xs font-bold">{result.error}</div>}
            
            {result.gwa !== null && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700 text-center">
                <span className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Weighted Average (GWA)</span>
                <div className={`text-5xl font-black my-2 tracking-tighter ${result.gwa >= 3.0 ? "text-green-500" : "text-zinc-700 dark:text-white"}`}>{result.gwa.toFixed(4)}</div>
                {result.title ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-600 dark:text-yellow-400 text-sm font-bold uppercase tracking-wide animate-pulse">
                    <FaAward /> {result.title}
                  </div>
                ) : <p className="text-zinc-400 text-xs mt-2">Keep pushing! You can do it.</p>}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Memoized Subject Row
const SubjectRow = memo(({ sub, index, updateSubject, removeSubject, canRemove }: any) => {
  const previewGPA = sub.raw ? getGpaFromScore(parseFloat(sub.raw)).toFixed(1) : "-.-";
  return (
    <div className="grid grid-cols-12 gap-2 items-center" onClick={(e) => e.stopPropagation()}>
      <div className="col-span-2 text-center text-xs font-mono text-zinc-500">#{index + 1}</div>
      <div className="col-span-5 relative group">
        <input
          type="number"
          placeholder="0-100"
          value={sub.raw}
          onChange={(e) => updateSubject(sub.id, "raw", e.target.value)}
          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-center font-mono text-sm outline-none focus:border-green-500 transition-colors"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-600 dark:text-green-400 pointer-events-none opacity-50 group-focus-within:opacity-100 transition-opacity">
          {sub.raw && !isNaN(parseFloat(sub.raw)) ? `≈ ${previewGPA}` : ""}
        </div>
      </div>
      <div className="col-span-3">
        <input
          type="number"
          placeholder="Unit"
          value={sub.units}
          onChange={(e) => updateSubject(sub.id, "units", e.target.value)}
          className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-center font-mono text-sm outline-none focus:border-green-500 transition-colors text-zinc-600 dark:text-zinc-300"
        />
      </div>
      <div className="col-span-2 text-center">
        <button 
          onClick={() => removeSubject(sub.id)}
          className="text-zinc-400 hover:text-red-500 transition-colors p-2"
          disabled={!canRemove}
        >
          <FaTrash size={12} />
        </button>
      </div>
    </div>
  );
});
SubjectRow.displayName = 'SubjectRow';

// ==========================================
// 3. SCHEDULE MAKER (FIXED & POLISHED)
// ==========================================

// 1. GLOBAL INTERFACE (Moved outside so ScheduleGrid can use it)
interface ClassItem {
  id: string;
  subject: string;
  room: string;
  day: string;
  start: string;
  end: string;
  color: string;
}

// 2. HELPER COMPONENT (TimeSelector)
const TimeSelector = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
  const [h24, m] = value.split(':').map(Number);
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12; 

  const updateTime = (newH12: number, newM: string, newPeriod: string) => {
    let newH24 = newH12 === 12 ? 0 : newH12;
    if (newPeriod === 'PM') newH24 += 12;
    const hStr = newH24.toString().padStart(2, '0');
    onChange(`${hStr}:${newM}`);
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase font-bold text-zinc-400">{label}</label>
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
           <select 
             value={h12}
             onChange={(e) => updateTime(parseInt(e.target.value), m.toString().padStart(2,'0'), period)}
             className="w-full appearance-none p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-center outline-none focus:border-green-500 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
           >
             {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
               <option key={h} value={h}>{h}</option>
             ))}
           </select>
        </div>
        <span className="text-zinc-400 font-bold">:</span>
        <div className="relative flex-1">
           <select 
             value={m}
             onChange={(e) => updateTime(h12, e.target.value, period)}
             className="w-full appearance-none p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-center outline-none focus:border-green-500 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700"
           >
             {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(min => (
               <option key={min} value={min}>{min}</option>
             ))}
           </select>
        </div>
        <button
          onClick={() => updateTime(h12, m.toString().padStart(2,'0'), period === 'AM' ? 'PM' : 'AM')}
          className={`flex-1 p-2 rounded-xl text-xs font-bold border transition-colors ${
            period === 'AM' 
              ? 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200' 
              : 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
          }`}
        >
          {period}
        </button>
      </div>
    </div>
  );
};

// 3. MAIN SCHEDULE MAKER COMPONENT
function ScheduleMaker() {
  const [isExpanded, setIsExpanded] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [currentTheme, setCurrentTheme] = useState(BG_THEMES[0]);

  const [scheduleInfo, setScheduleInfo] = useState({
    title: "My Schedule",
    subtitle: "AY 2025-2026"
  });

  const [form, setForm] = useState({
    subject: "",
    room: "",
    days: ["Monday"] as string[], 
    start: "08:00", 
    end: "09:30",
    color: "bg-green-500"
  });

  const [classes, setClasses] = useState<ClassItem[]>([]);

  const toggleDay = useCallback((day: string) => {
    setForm(prev => {
      const exists = prev.days.includes(day);
      return {
        ...prev,
        days: exists ? prev.days.filter(d => d !== day) : [...prev.days, day]
      };
    });
  }, []);

  const addClass = useCallback(() => {
    if (!form.subject || !form.start || !form.end || form.days.length === 0) return;
    
    const newClasses = form.days.map((day, index) => ({
      id: `${Date.now()}-${index}`,
      subject: form.subject,
      room: form.room,
      day: day,
      start: form.start,
      end: form.end,
      color: form.color
    }));

    setClasses(prev => [...prev, ...newClasses]);
    
    if (window.innerWidth < 1024) {
      setMobileTab('preview');
    }
    
    setForm(prev => ({ ...prev, subject: "", room: "" }));
  }, [form]);

  const removeClass = useCallback((id: string) => {
    setClasses(prev => prev.filter((c) => c.id !== id));
  }, []);

  const downloadSchedule = useCallback(async () => {
    if (scheduleRef.current) {
      try {
        const dataUrl = await toPng(scheduleRef.current, { 
            cacheBust: true, 
            pixelRatio: 2,
            backgroundColor: currentTheme.hex, 
        });
        const link = document.createElement("a");
        const safeTitle = scheduleInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${safeTitle}_${currentTheme.name}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error(err);
        alert("Error saving image.");
      }
    }
  }, [currentTheme, scheduleInfo.title]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl relative overflow-hidden transition-all duration-300 ${isExpanded ? 'p-0' : 'p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 cursor-pointer'}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500 z-20" />

      {/* HEADER */}
      <div
        className={`flex items-center justify-between cursor-pointer relative z-20 ${isExpanded ? 'p-6 md:p-8 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
            <FaCalendarAlt size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Schedule Maker</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Visual Planner</p>
          </div>
        </div>
        <div className="text-zinc-400 dark:text-zinc-500">
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* MOBILE TABS */}
            <div className="flex lg:hidden border-b border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={() => setMobileTab('editor')}
                  className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${mobileTab === 'editor' ? 'bg-zinc-100 dark:bg-zinc-800 text-green-600 dark:text-green-400 border-b-2 border-green-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                >
                  Editor
                </button>
                <button 
                  onClick={() => setMobileTab('preview')}
                  className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${mobileTab === 'preview' ? 'bg-zinc-100 dark:bg-zinc-800 text-green-600 dark:text-green-400 border-b-2 border-green-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                >
                  Preview
                </button>
            </div>

            <div className="flex flex-col lg:flex-row h-full">
              
              {/* LEFT: CONTROLS */}
              <div className={`${mobileTab === 'editor' ? 'block' : 'hidden'} lg:block w-full lg:w-1/3 p-6 md:p-8 border-r border-zinc-200 dark:border-zinc-800 space-y-6 bg-zinc-50/50 dark:bg-black/20`}>
                
                {/* SCHEDULE INFO SECTION */}
                <div className="space-y-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                   <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Schedule Details</h3>
                   <div className="space-y-3">
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-400">Title</label>
                        <input 
                          type="text" 
                          placeholder="My Schedule" 
                          value={scheduleInfo.title}
                          onChange={(e) => setScheduleInfo({...scheduleInfo, title: e.target.value})}
                          className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-green-500 transition-colors"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-400">Subtitle / Term</label>
                        <input 
                          type="text" 
                          placeholder="2nd Term, AY 2025-2026" 
                          value={scheduleInfo.subtitle}
                          onChange={(e) => setScheduleInfo({...scheduleInfo, subtitle: e.target.value})}
                          className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-green-500 transition-colors"
                        />
                     </div>
                   </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Add Class</h3>
                  
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Subject (e.g. CS 101)" 
                      value={form.subject}
                      onChange={(e) => setForm({...form, subject: e.target.value})}
                      className="w-full p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm outline-none focus:border-green-500 transition-colors"
                    />
                    <input 
                      type="text" 
                      placeholder="Room (e.g. 404)" 
                      value={form.room}
                      onChange={(e) => setForm({...form, room: e.target.value})}
                      className="w-full p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm outline-none focus:border-green-500 transition-colors"
                    />
                    
                    {/* Day Buttons */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-zinc-400">Select Days</label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map((d) => {
                                const isSelected = form.days.includes(d);
                                return (
                                    <button
                                        key={d}
                                        onClick={() => toggleDay(d)}
                                        className={`flex-1 min-w-[3rem] py-3 lg:py-2 text-xs font-bold rounded-lg border transition-all ${
                                            isSelected 
                                            ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-500/20" 
                                            : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-green-500"
                                        }`}
                                    >
                                        {d.substring(0, 3)}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* TIME SELECTORS */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <TimeSelector label="Start Time" value={form.start} onChange={(val) => setForm({...form, start: val})} />
                      <TimeSelector label="End Time" value={form.end} onChange={(val) => setForm({...form, end: val})} />
                    </div>

                    {/* Color Picker */}
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 justify-center mt-2 flex-wrap">
                        {COLORS.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => setForm({...form, color: c.val})}
                            className={`w-8 h-8 lg:w-6 lg:h-6 rounded-full shadow-sm ${c.val} ${form.color === c.val ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105 transition-all'}`}
                            title={c.name}
                          />
                        ))}
                    </div>

                    <button 
                      onClick={addClass} 
                      className="w-full py-4 lg:py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2"
                    >
                      <FaPlus size={12} /> Add to Schedule
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                   <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Export Settings</h3>
                   
                   <div className="grid grid-cols-5 gap-3 mb-4">
                     {BG_THEMES.map((theme) => (
                       <button
                         key={theme.id}
                         onClick={() => setCurrentTheme(theme)}
                         className={`aspect-square rounded-full border-2 transition-all ${
                           currentTheme.id === theme.id 
                             ? 'border-green-500 scale-110 shadow-lg shadow-green-500/20' 
                             : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                         }`}
                         style={{ backgroundColor: theme.displayHex }} 
                         title={theme.name}
                       />
                     ))}
                   </div>
                   <p className="text-[10px] text-zinc-400 text-center mb-4">
                      Theme: <span className="font-bold text-zinc-600 dark:text-zinc-300">{currentTheme.name}</span>
                   </p>
                   
                   <button 
                     onClick={downloadSchedule}
                     className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                   >
                     <FaDownload size={14} /> Save Image
                   </button>
                </div>
              </div>

              {/* VISUAL GRID */}
              <div className={`${mobileTab === 'preview' ? 'block' : 'hidden'} lg:flex w-full lg:w-2/3 p-4 md:p-8 overflow-x-auto bg-zinc-100 dark:bg-zinc-950 items-start lg:items-center justify-center`}>
                <div className="flex flex-col gap-4 w-full">
                    <div className="lg:hidden flex justify-end">
                        <button 
                            onClick={downloadSchedule}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg"
                        >
                            <FaDownload /> Save Image
                        </button>
                    </div>

                    <ScheduleGrid 
                       classes={classes} 
                       removeClass={removeClass} 
                       scheduleRef={scheduleRef} 
                       theme={currentTheme}
                       scheduleInfo={scheduleInfo}
                    />
                    
                    <p className="lg:hidden text-center text-[10px] text-zinc-400 animate-pulse">
                        &larr; Scroll horizontally to see full week &rarr;
                    </p>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 4. MEMOIZED VISUAL GRID
const ScheduleGrid = memo(({ 
  classes, 
  removeClass, 
  scheduleRef, 
  theme,
  scheduleInfo 
}: { 
  classes: ClassItem[], 
  removeClass: (id: string) => void, 
  scheduleRef: any,
  theme: typeof BG_THEMES[0],
  scheduleInfo: { title: string, subtitle: string }
}) => {
  
  const getPosition = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const minutes = h * 60 + m;
    const startOfDay = 7 * 60; 
    return ((minutes - startOfDay) / 60) * 60; 
  };

  const getHeight = (start: string, end: string) => {
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    return (diff / 60) * 60; 
  };

  return (
    <div 
      ref={scheduleRef} 
      className={`w-full min-w-[800px] p-6 lg:p-10 rounded-2xl border transition-colors duration-300 ${theme.bg} ${theme.text} ${theme.border}`}
    >
      
      {/* Branding Header */}
      <div className={`flex justify-between items-end mb-8 border-b-2 pb-6 ${theme.border}`}>
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-1">
             {scheduleInfo.title || "My Schedule"}
          </h1>
          <p className="text-xs font-bold tracking-[0.2em] opacity-60">JPCS STUDENT TOOLKIT</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold opacity-50 ${theme.text}`}>
             {scheduleInfo.subtitle || "AY 2025-2026"}
          </p>
        </div>
      </div>

      {/* GRID */}
      <div className="flex relative">
        {/* Time Column (STICKY) */}
        <div className={`w-16 flex-shrink-0 border-r-2 pr-2 ${theme.border} sticky left-0 z-30 ${theme.bg}`}>
          <div className="h-10"></div> 
          {HOURS.map(h => (
            <div key={h} className={`h-[60px] text-[11px] font-bold opacity-40 text-right pt-1 relative`}>
              {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
              <div className={`absolute top-0 right-[-10px] w-2 h-0.5 ${theme.border.replace('border', 'bg')}`}></div>
            </div>
          ))}
        </div>

        {/* Days Columns */}
        <div className="flex-1 grid grid-cols-6 relative">
          {HOURS.map((h, i) => (
              <div key={i} className={`absolute w-full h-px z-0 opacity-30 ${theme.border.replace('border', 'bg')}`} style={{ top: `${i * 60 + 40}px` }} />
          ))}

          {DAYS.map((day) => (
            <div key={day} className={`relative border-r last:border-0 ${theme.border}`}>
              <div className={`h-10 text-center text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center opacity-60 pb-2`}>
                {day.substring(0, 3)}
              </div>

              <div className="relative h-[840px]">
                {classes.filter(c => c.day === day).map((c) => (
                  <div
                    key={c.id}
                    className={`absolute left-1 right-1 rounded-xl p-3 text-white shadow-md overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 transition-all z-10 ${c.color} border border-white/20`}
                    style={{
                      top: `${getPosition(c.start)}px`,
                      height: `${getHeight(c.start, c.end)}px`
                    }}
                    onClick={() => removeClass(c.id)}
                  >
                    <div className="text-xs font-bold leading-tight line-clamp-2">{c.subject}</div>
                    <div className="text-[10px] opacity-90 line-clamp-1 mt-0.5">{c.room}</div>
                    <div className="absolute bottom-2 right-2 text-[9px] font-mono opacity-60 bg-black/10 px-1 rounded">{c.start}-{c.end}</div>
                    
                    <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 bg-black/20 rounded-full p-1">
                        <FaTrash size={8} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
ScheduleGrid.displayName = 'ScheduleGrid';