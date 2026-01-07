"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCalculator, FaTerminal, FaNetworkWired, FaEraser, 
  FaArrowRight, FaExclamationTriangle, FaGraduationCap, 
  FaPlus, FaTrash, FaAward, FaChevronDown, FaChevronUp 
} from "react-icons/fa";

// --- IMPORT YOUR THEME COMPONENTS ---
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor"; 

// --- SHARED UTILITY: DLSAU GRADING SCALE ---
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

export default function ToolsPage() {
  return (
    <section className="min-h-screen py-24 px-4 md:px-8 relative overflow-hidden bg-zinc-50 dark:bg-black font-sans selection:bg-green-500/30">
      
      <CircuitCursor />
      <div className="absolute inset-0 z-0 pointer-events-none">
         <div className="absolute inset-0 opacity-80">
            <FloatingCubes />
         </div>
         <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl opacity-30" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl opacity-30" />
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          <GradeCalculator />
          
          <div className="flex flex-col gap-8">
             <GWACalculator />
          </div>
        </div>
      </div>
    </section>
  );
}

// --- TOOL 1: GRADE PROJECTOR (EXPANDABLE) ---
function GradeCalculator() {
  const [isExpanded, setIsExpanded] = useState(false); // Default: Folded

  const [midterms, setMidterms] = useState({ raw: "", total: "", weight: "30" });
  const [finals, setFinals] = useState({ raw: "", total: "", weight: "30" });
  const [finalProduct, setFinalProduct] = useState({ raw: "", total: "", weight: "20" });
  const [classStanding, setClassStanding] = useState({ raw: "", total: "N/A", weight: "20" });

  const [finalPercentage, setFinalPercentage] = useState<number | null>(null);
  const [gpa, setGpa] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateGrade = () => {
    setError(null);

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
      setError("Please enter 'Total Items' for exams/product.");
      return;
    }
    if (midPts === -2 || finPts === -2 || prodPts === -2) {
      setError("Score cannot be higher than Total Items.");
      return;
    }
    if (csPts === -3) {
      setError("Class Standing cannot be higher than 20.");
      return;
    }
    if (csPts === -4) {
      setError("Scores cannot be negative.");
      return;
    }

    const totalScore = midPts + finPts + prodPts + csPts;

    setFinalPercentage(totalScore);
    setGpa(getGpaFromScore(Math.round(totalScore)));
  };

  const reset = () => {
    setMidterms({ raw: "", total: "", weight: "30" });
    setFinals({ raw: "", total: "", weight: "30" });
    setFinalProduct({ raw: "", total: "", weight: "20" });
    setClassStanding({ raw: "", total: "N/A", weight: "20" });
    setFinalPercentage(null);
    setGpa(null);
    setError(null);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl relative overflow-hidden transition-all duration-300 ${isExpanded ? 'p-6 md:p-8' : 'p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 cursor-pointer'}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
      
      {/* HEADER (Click to Toggle) */}
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

      {/* EXPANDABLE CONTENT */}
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

            {/* BUTTONS - REFERENCE DESIGN */}
            <div className="flex gap-4 mt-8">
              <button onClick={calculateGrade} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                Compute Grade <FaArrowRight size={12} />
              </button>
              <button onClick={reset} className="px-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-colors active:scale-95">
                <FaEraser />
              </button>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                <FaExclamationTriangle className="shrink-0" /> <span>{error}</span>
              </motion.div>
            )}

            {gpa !== null && !error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-6 bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center">
                <span className="text-sm text-zinc-500 font-bold uppercase mb-1">Subject GPA</span>
                <div className={`text-6xl font-black tracking-tighter ${gpa >= 3.0 ? "text-green-500" : gpa >= 1.0 ? "text-yellow-500" : "text-red-500"}`}>
                  {gpa.toFixed(1)}
                </div>
                <div className="mt-2 text-zinc-500 dark:text-zinc-400 font-mono text-sm">
                  Raw Score: <span className="text-zinc-800 dark:text-zinc-200 font-bold">{finalPercentage?.toFixed(2)}%</span>
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {gpa >= 4.0 ? "Excellent Work!" : gpa >= 3.0 ? "Great Job!" : gpa >= 1.0 ? "You Passed." : "See you next term."}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- ROW COMPONENT ---
interface GradeRowProps {
  label: string;
  values: { raw: string; total: string; weight: string };
  setValues: (val: { raw: string; total: string; weight: string }) => void;
  type: "exam" | "direct";
}

const GradeRow = ({ label, values, setValues, type }: GradeRowProps) => (
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
);

// --- TOOL 2: GWA & HONORS CALCULATOR (EXPANDABLE) ---
// --- TOOL 2: GWA & HONORS CALCULATOR (UPDATED WITH UNITS) ---
function GWACalculator() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Added 'units' to the state object, defaulting to 3
  const [subjects, setSubjects] = useState([
    { id: 1, raw: "", units: "3" }, 
    { id: 2, raw: "", units: "3" }, 
    { id: 3, raw: "", units: "3" }
  ]);
  
  const [gwa, setGwa] = useState<number | null>(null);
  const [honorTitle, setHonorTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addSubject = () => {
    setSubjects([...subjects, { id: Date.now(), raw: "", units: "3" }]);
  };

  const removeSubject = (id: number) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter(s => s.id !== id));
    }
  };

  // Updated to handle changing both Raw Score and Units
  const updateSubject = (id: number, field: "raw" | "units", value: string) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const calculateGWA = () => {
    setError(null);
    let totalWeightedPoints = 0; // Sum of (Grade * Units)
    let totalUnits = 0;          // Sum of Units

    // 

    for (const s of subjects) {
      // Skip empty rows
      if (!s.raw || !s.units) continue;
      
      const rawScore = parseFloat(s.raw);
      const unitValue = parseFloat(s.units);

      if (isNaN(rawScore) || isNaN(unitValue)) continue;
      
      if (rawScore > 100 || rawScore < 0) {
          setError(`Invalid score: ${rawScore}. Must be between 0 and 100.`);
          return;
      }

      if (unitValue <= 0) {
        setError(`Invalid unit: ${unitValue}. Must be greater than 0.`);
        return;
      }

      // 1. Convert Raw Score (e.g., 95) to GPA Point (e.g., 4.0)
      const equivalent = getGpaFromScore(rawScore);
      
      // 2. Multiply Grade by Units
      totalWeightedPoints += (equivalent * unitValue);
      
      // 3. Add to Total Units
      totalUnits += unitValue;
    }

    if (totalUnits === 0) {
      setError("Please enter valid scores and units.");
      return;
    }

    // 4. Divide Total Weighted Points by Total Units
    const computedGWA = totalWeightedPoints / totalUnits;
    setGwa(computedGWA);

    // Honors Logic (Adjust based on your school's specific GWA cutoffs)
    if (computedGWA >= 3.7) setHonorTitle("With Highest Honors");
    else if (computedGWA >= 3.4) setHonorTitle("With High Honors");
    else if (computedGWA >= 3.0) setHonorTitle("With Honors");
    else setHonorTitle(null);
  };

  const reset = () => {
    setSubjects([{ id: 1, raw: "", units: "3" }, { id: 2, raw: "", units: "3" }, { id: 3, raw: "", units: "3" }]);
    setGwa(null);
    setHonorTitle(null);
    setError(null);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className={`bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl relative overflow-hidden transition-all duration-300 ${isExpanded ? 'p-6 md:p-8' : 'p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 cursor-pointer'}`}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
      
      {/* HEADER (Click to Toggle) */}
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

      {/* EXPANDABLE CONTENT */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-8 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {/* UPDATED GRID HEADER */}
              <div className="grid grid-cols-12 gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
                <span className="col-span-2 text-center">Subj</span>
                <span className="col-span-5 text-center">Raw Score</span>
                <span className="col-span-3 text-center">Units</span>
                <span className="col-span-2 text-center">Act</span>
              </div>

              {subjects.map((sub, index) => {
                const previewGPA = sub.raw ? getGpaFromScore(parseFloat(sub.raw)).toFixed(1) : "-.-";
                return (
                  <div key={sub.id} className="grid grid-cols-12 gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                    <div className="col-span-2 text-center text-xs font-mono text-zinc-500">#{index + 1}</div>
                    
                    {/* RAW SCORE INPUT */}
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

                    {/* UNITS INPUT (NEW) */}
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
                        disabled={subjects.length <= 1}
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
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

            {error && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 text-center text-red-500 text-xs font-bold">{error}</motion.div>}
            
            {gwa !== null && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700 text-center">
                <span className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Weighted Average (GWA)</span>
                <div className={`text-5xl font-black my-2 tracking-tighter ${gwa >= 3.0 ? "text-green-500" : "text-zinc-700 dark:text-white"}`}>{gwa.toFixed(4)}</div>
                {honorTitle ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-600 dark:text-yellow-400 text-sm font-bold uppercase tracking-wide animate-pulse">
                    <FaAward /> {honorTitle}
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

const PlaceholderTool = ({ icon, title, desc, status }: any) => (
  <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex items-center gap-4 p-6 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
    <div className="p-4 bg-zinc-200 dark:bg-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-500 group-hover:text-green-500 transition-colors">{icon}</div>
    <div className="flex-1">
      <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{title}</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">{desc}</p>
    </div>
    <div className="absolute top-4 right-4"><span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500">{status}</span></div>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
  </motion.div>
);