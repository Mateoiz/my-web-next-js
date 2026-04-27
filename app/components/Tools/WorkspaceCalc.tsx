"use client";

import { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalculator, FaEraser, FaArrowRight, FaExclamationTriangle, FaTimes
} from "react-icons/fa";

// ─── GPA Scale ────────────────────────────────────────────────────────────────

export const getGpaFromScore = (score: number, program: string): number => {
  if (program === "BSA") {
    if (score >= 98) return 4.0; if (score >= 95) return 3.5;
    if (score >= 91) return 3.0; if (score >= 87) return 2.5;
    if (score >= 82) return 2.0; if (score >= 77) return 1.5;
    if (score >= 72) return 1.0; return 0.0;
  }
  if (program === "DVM") {
    if (score >= 97) return 4.0; if (score >= 93) return 3.5;
    if (score >= 89) return 3.0; if (score >= 85) return 2.5;
    if (score >= 80) return 2.0; if (score >= 75) return 1.5;
    if (score >= 70) return 1.0; return 0.0;
  }
  // Standard
  if (score >= 97) return 4.0; if (score >= 91) return 3.5;
  if (score >= 85) return 3.0; if (score >= 78) return 2.5;
  if (score >= 72) return 2.0; if (score >= 66) return 1.5;
  if (score >= 60) return 1.0; return 0.0;
};

export const gpaLabel = (gpa: number) =>
  gpa >= 4.0 ? "Excellent Work!" : gpa >= 1.0 ? "You Passed." : "See you next term.";

// ─── Grade row state type ─────────────────────────────────────────────────────

interface RowState { raw: string; total: string; weight: string; }

const EMPTY_ROWS = () => ({
  midterms:      { raw: "", total: "100", weight: "30" } as RowState,
  finals:        { raw: "", total: "100", weight: "30" } as RowState,
  finalProduct:  { raw: "", total: "100", weight: "20" } as RowState,
  classStanding: { raw: "", total: "N/A", weight: "20" } as RowState,
});

// ─── Program selector (simple buttons, no custom dropdown needed) ─────────────

const PROGRAMS = ["Standard", "BSA", "DVM"] as const;
type Program = typeof PROGRAMS[number];
const PROGRAM_LABELS: Record<Program, string> = {
  Standard: "Standard",
  BSA: "BS Accountancy",
  DVM: "Vet. Medicine",
};

// ─── Grade Row ────────────────────────────────────────────────────────────────

const GradeRow = memo(({ label, values, setValues, type }: {
  label: string;
  values: RowState;
  setValues: (v: RowState) => void;
  type: "exam" | "direct";
}) => (
  <div className="grid grid-cols-12 gap-2 items-center">
    <div className="col-span-4">
      <span className="text-xs md:text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate block">{label}</span>
    </div>
    <div className="col-span-3">
      <input
        type="number"
        placeholder={type === "direct" ? "0–20" : "0"}
        value={values.raw}
        onChange={e => setValues({ ...values, raw: e.target.value })}
        className={`w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-3 md:py-2 text-center font-mono font-bold text-sm outline-none focus:border-[#06402B] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#06402B]/10 dark:focus:ring-emerald-500/10 transition-colors ${type === "direct" ? "text-[#06402B] dark:text-emerald-400" : ""}`}
      />
    </div>
    <div className="col-span-3">
      {type === "exam" ? (
        <input
          type="number"
          placeholder="/ 100"
          value={values.total}
          onChange={e => setValues({ ...values, total: e.target.value })}
          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-3 md:py-2 text-center font-mono text-sm outline-none focus:border-[#06402B] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#06402B]/10 dark:focus:ring-emerald-500/10 transition-colors text-zinc-600 dark:text-zinc-400"
        />
      ) : (
        <div className="w-full text-center text-[10px] md:text-xs text-zinc-400 font-black tracking-widest py-3 md:py-2.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg select-none uppercase">
          Max 20
        </div>
      )}
    </div>
    <div className="col-span-2">
      <input
        type="number"
        value={values.weight}
        disabled
        className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-1 py-3 md:py-2 text-center font-mono text-xs text-zinc-500 outline-none select-none"
      />
    </div>
  </div>
));
GradeRow.displayName = "GradeRow";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GradeCalculator() {
  const [program, setProgram] = useState<Program>("Standard");
  const [rows, setRows] = useState(EMPTY_ROWS());

  const [result, setResult] = useState<{
    percentage: number | null; gpa: number | null; error: string | null;
  }>({ percentage: null, gpa: null, error: null });

  const setRow = (key: keyof ReturnType<typeof EMPTY_ROWS>, val: RowState) =>
    setRows(r => ({ ...r, [key]: val }));

  // ── Compute ────────────────────────────────────────────────────────────────

  const calculateGrade = useCallback(() => {
    const getPoints = (item: RowState, isDirect = false): number => {
      const raw = parseFloat(item.raw);
      if (isNaN(raw)) return 0;

      if (isDirect) {
        if (!Number.isFinite(raw)) return -5;
        if (raw > 20) return -3;
        if (raw < 0)  return -4;
        return raw;
      }

      const total  = parseFloat(item.total);
      const weight = parseFloat(item.weight);

      if (!Number.isFinite(raw)) return -5;
      if (raw < 0) return -4;
      if (isNaN(total) || total === 0) return raw > 0 ? -1 : 0;
      if (total < 0) return -6;
      if (total > 1000) return -7;
      if (raw > total) return -2;
      if (raw > 1000) return -8;

      return (raw / total) * weight;
    };

    const midPts  = getPoints(rows.midterms);
    const finPts  = getPoints(rows.finals);
    const prodPts = getPoints(rows.finalProduct);
    const csPts   = getPoints(rows.classStanding, true);

    const allEmpty = [rows.midterms, rows.finals, rows.finalProduct, rows.classStanding]
      .every(r => r.raw.trim() === "");
    if (allEmpty) return setResult({
      percentage: null, gpa: null,
      error: "Please enter at least one score to compute your grade."
    });

    const errors: Record<number, string> = {
      [-1]: "Please enter a valid Total for each exam row.",
      [-2]: "Score cannot be higher than the Total.",
      [-3]: "Class Standing score cannot exceed 20.",
      [-4]: "Negative scores are not valid.",
      [-5]: "Please enter a valid numeric score.",
      [-6]: "Total score cannot be negative.",
      [-7]: "Total score seems unrealistically high. Please double check.",
      [-8]: "Raw score seems unrealistically high. Please double check.",
    };

    for (const [pts, label] of [
      [midPts,  "Midterm Exam"],
      [finPts,  "Final Exam"],
      [prodPts, "Final Product"],
      [csPts,   "Class Standing"],
    ] as [number, string][]) {
      if (pts < 0 && errors[pts]) {
        return setResult({ percentage: null, gpa: null, error: `${label}: ${errors[pts]}` });
      }
    }

    const checkDecimalPrecision = (val: string) => {
      if (val.includes(".")) {
        const decimals = val.split(".")[1];
        if (decimals && decimals.length > 4) return false;
      }
      return true;
    };

    for (const { val, label } of [
      { val: rows.midterms.raw,      label: "Midterm Exam" },
      { val: rows.finals.raw,        label: "Final Exam" },
      { val: rows.finalProduct.raw,  label: "Final Product" },
      { val: rows.classStanding.raw, label: "Class Standing" },
    ]) {
      if (val && !checkDecimalPrecision(val)) {
        return setResult({ percentage: null, gpa: null, error: `${label}: Too many decimal places. Max 4 decimal digits allowed.` });
      }
    }

    const totalScore = midPts + finPts + prodPts + csPts;

    if (totalScore > 100) return setResult({ percentage: null, gpa: null, error: "Computed score exceeds 100%. Please check your inputs." });
    if (totalScore < 0)   return setResult({ percentage: null, gpa: null, error: "Computed score is negative. Please check your inputs." });

    setResult({ percentage: totalScore, gpa: getGpaFromScore(totalScore, program), error: null });
  }, [rows, program]);

  const reset = () => {
    setRows(EMPTY_ROWS());
    setResult({ percentage: null, gpa: null, error: null });
  };

  const gpa = result.gpa;
  const gpaColor = gpa === null ? "" : gpa >= 3.0 ? "text-[#06402B] dark:text-emerald-400" : gpa >= 1.0 ? "text-yellow-500" : "text-red-500";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-md border border-zinc-200 dark:border-[#06402B]/30 rounded-[2rem] shadow-sm relative p-6 md:p-8 w-full"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#06402B] to-emerald-400 dark:from-emerald-600 dark:to-emerald-400 rounded-t-[2rem]" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start justify-between mb-8 gap-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#06402B]/10 rounded-xl text-[#06402B] dark:text-emerald-400">
            <FaCalculator size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Grade Projector</h2>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Subject Grade Calculator</p>
          </div>
        </div>

        {/* Program selector — simple pill toggle */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1">
          {PROGRAMS.map(p => (
            <button
              key={p}
              onClick={() => setProgram(p)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                program === p
                  ? "bg-[#06402B] text-white shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              }`}
            >
              {PROGRAM_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="grid grid-cols-12 text-[10px] md:text-xs font-black text-zinc-400 uppercase tracking-widest px-1 gap-2">
          <span className="col-span-4">Category</span>
          <span className="col-span-3 text-center">Score</span>
          <span className="col-span-3 text-center">Total</span>
          <span className="col-span-2 text-center">W%</span>
        </div>

        <GradeRow label="Midterm Exam"   values={rows.midterms}      setValues={v => setRow("midterms", v)}      type="exam" />
        <GradeRow label="Final Exam"     values={rows.finals}        setValues={v => setRow("finals", v)}        type="exam" />
        <GradeRow label="Final Product"  values={rows.finalProduct}  setValues={v => setRow("finalProduct", v)}  type="exam" />
        <GradeRow label="Class Standing" values={rows.classStanding} setValues={v => setRow("classStanding", v)} type="direct" />
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="flex gap-3 mt-8">
        <button
          onClick={calculateGrade}
          className="flex-1 bg-[#06402B] dark:bg-emerald-600 hover:bg-[#042d1f] dark:hover:bg-emerald-500 text-white font-black py-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-widest"
        >
          Compute Grade <FaArrowRight size={12} className="hidden sm:block" />
        </button>
        <button
          onClick={reset}
          className="py-4 px-5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-colors active:scale-95 rounded-xl flex items-center justify-center"
          title="Reset"
        >
          <FaEraser size={18} />
        </button>
      </div>

      {/* ── Result ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result.error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-2"
          >
            <FaExclamationTriangle className="shrink-0" />
            <span>{result.error}</span>
            <button onClick={() => setResult(r => ({ ...r, error: null }))} className="ml-auto text-red-400 hover:text-red-600">
              <FaTimes size={12} />
            </button>
          </motion.div>
        )}

        {gpa !== null && !result.error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-6 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] flex flex-col items-center"
          >
            <span className="text-[10px] md:text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Subject GPA</span>
            <div className={`text-6xl md:text-7xl font-black tracking-tighter ${gpaColor}`}>
              {gpa.toFixed(1)}
            </div>
            <div className="mt-2 text-zinc-500 dark:text-zinc-400 font-mono text-sm">
              Raw Score: <span className="text-zinc-800 dark:text-zinc-200 font-bold">{result.percentage?.toFixed(2)}%</span>
            </div>

            <div className="mt-4 w-full max-w-sm grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Midterm", row: rows.midterms,      isDirect: false },
                { label: "Finals",  row: rows.finals,        isDirect: false },
                { label: "Product", row: rows.finalProduct,  isDirect: false },
                { label: "CS",      row: rows.classStanding, isDirect: true  },
              ].map(({ label, row, isDirect }) => {
                const raw = parseFloat(row.raw);
                const total = parseFloat(row.total);
                const weight = parseFloat(row.weight);
                const pts = !isNaN(raw)
                  ? isDirect ? raw : (!isNaN(total) && total > 0 ? (raw / total) * weight : 0)
                  : 0;
                return (
                  <div key={label} className="bg-white dark:bg-zinc-900 rounded-xl py-2.5 px-1 border border-zinc-100 dark:border-zinc-800">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">{label}</div>
                    <div className="text-sm font-black text-zinc-800 dark:text-zinc-200 tabular-nums">{pts.toFixed(1)}</div>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-400">
              {gpaLabel(gpa)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}