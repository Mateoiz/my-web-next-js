"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCalculator, FaEraser, FaArrowRight, FaExclamationTriangle } from "react-icons/fa";

// --- HELPERS ---
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

// --- COMPONENT ---
export default function GradeCalculator() {
  const [midterms, setMidterms] = useState({ raw: "", total: "", weight: "30" });
  const [finals, setFinals] = useState({ raw: "", total: "", weight: "30" });
  const [finalProduct, setFinalProduct] = useState({ raw: "", total: "", weight: "20" });
  const [classStanding, setClassStanding] = useState({ raw: "", total: "N/A", weight: "20" });

  const [result, setResult] = useState<{ percentage: number | null, gpa: number | null, error: string | null }>({
    percentage: null, gpa: null, error: null
  });

  const calculateGrade = useCallback(() => {
    const getPoints = (item: { raw: string; total: string; weight: string }, isDirect = false) => {
      const raw = parseFloat(item.raw);
      if (isNaN(raw)) return 0;
      
      if (isDirect) {
        if (raw > 20) return -3;
        if (raw < 0) return -4;
        return raw;
      }

      const total = parseFloat(item.total);
      const weight = parseFloat(item.weight);
      if (isNaN(total) || total === 0) return raw > 0 ? -1 : 0;
      if (raw > total) return -2;
      return (raw / total) * 100 * (weight / 100);
    };

    const midPts = getPoints(midterms);
    const finPts = getPoints(finals);
    const prodPts = getPoints(finalProduct);
    const csPts = getPoints(classStanding, true);

    if ([midPts, finPts, prodPts].includes(-1)) return setResult({ ...result, error: "Please enter 'Total Items'." });
    if ([midPts, finPts, prodPts].includes(-2)) return setResult({ ...result, error: "Score cannot be higher than Total." });
    if (csPts === -3) return setResult({ ...result, error: "Class Standing max is 20." });
    if (csPts === -4) return setResult({ ...result, error: "Negative scores invalid." });

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
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl relative overflow-hidden p-6 md:p-8">
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400"><FaCalculator size={20} /></div>
          <div><h2 className="text-xl font-bold text-zinc-900 dark:text-white">Grade Projector</h2><p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Subject Grade Calculator</p></div>
        </div>
      </div>

      <div className="pt-2 space-y-4">
        <div className="grid grid-cols-12 text-xs font-bold text-zinc-400 uppercase tracking-widest px-1 gap-2">
          <span className="col-span-4">Category</span><span className="col-span-3 text-center">Score</span><span className="col-span-3 text-center">Total</span><span className="col-span-2 text-center">W%</span>
        </div>
        <GradeRow label="Midterm Exam" values={midterms} setValues={setMidterms} type="exam" />
        <GradeRow label="Final Exam" values={finals} setValues={setFinals} type="exam" />
        <GradeRow label="Final Product" values={finalProduct} setValues={setFinalProduct} type="exam" />
        <GradeRow label="Class Standing" values={classStanding} setValues={setClassStanding} type="direct" />
      </div>

      <div className="flex gap-4 mt-8">
        <button onClick={calculateGrade} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">Compute Grade <FaArrowRight size={12} /></button>
        <button onClick={reset} className="px-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-colors active:scale-95"><FaEraser /></button>
      </div>

      <AnimatePresence>
        {result.error && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2"><FaExclamationTriangle className="shrink-0" /> <span>{result.error}</span></motion.div>}
        {result.gpa !== null && !result.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-6 bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col items-center">
            <span className="text-sm text-zinc-500 font-bold uppercase mb-1">Subject GPA</span>
            <div className={`text-6xl font-black tracking-tighter ${result.gpa >= 3.0 ? "text-green-500" : result.gpa >= 1.0 ? "text-yellow-500" : "text-red-500"}`}>{result.gpa.toFixed(1)}</div>
            <div className="mt-2 text-zinc-500 dark:text-zinc-400 font-mono text-sm">Raw Score: <span className="text-zinc-800 dark:text-zinc-200 font-bold">{result.percentage?.toFixed(2)}%</span></div>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-zinc-400">{result.gpa >= 4.0 ? "Excellent Work!" : result.gpa >= 1.0 ? "You Passed." : "See you next term."}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const GradeRow = memo(({ label, values, setValues, type }: any) => (
  <div className="grid grid-cols-12 gap-2 items-center" onClick={(e) => e.stopPropagation()}>
    <div className="col-span-4 text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate">{label}</div>
    <div className="col-span-3"><input type="number" placeholder={type === "direct" ? "0-20" : "0"} value={values.raw} onChange={(e) => setValues({ ...values, raw: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-center font-mono text-sm outline-none focus:border-green-500 transition-colors" /></div>
    <div className="col-span-3">{type === "exam" ? <input type="number" placeholder="/ 100" value={values.total} onChange={(e) => setValues({ ...values, total: e.target.value })} className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 text-center font-mono text-sm outline-none focus:border-green-500 transition-colors" /> : <div className="w-full text-center text-xs text-zinc-400 font-mono py-2 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg select-none">MAX 20</div>}</div>
    <div className="col-span-2"><input type="number" value={values.weight} disabled className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-1 py-2 text-center font-mono text-xs text-zinc-500 outline-none select-none" /></div>
  </div>
));
GradeRow.displayName = 'GradeRow';