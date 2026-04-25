"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalculator, FaEraser, FaArrowRight, FaExclamationTriangle,
  FaChevronDown, FaDownload, FaCheckCircle, FaTimes
} from "react-icons/fa";

// ─── Types (must mirror UniversityTracker) ────────────────────────────────────

interface Course { id: string; title: string; }
interface CourseTask {
  id: string; courseId: string; name: string;
  type: string; status: string; deadline: string; grade: string;
}

interface GradeCalculatorProps {
  courses?: Course[];
  tasks?: CourseTask[];
}

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
  midterms:     { raw: "", total: "", weight: "30" } as RowState,
  finals:       { raw: "", total: "", weight: "30" } as RowState,
  finalProduct: { raw: "", total: "", weight: "20" } as RowState,
  classStanding:{ raw: "", total: "N/A", weight: "20" } as RowState,
});

// ─── Parse grade string from tracker ("85", "85/100", "18/20") ───────────────

function parseGrade(gradeStr: string | undefined, isDirect = false): { raw: string; total: string } {
  if (!gradeStr?.trim()) return { raw: "", total: isDirect ? "N/A" : "" };
  if (isDirect) return { raw: gradeStr.split("/")[0].trim(), total: "N/A" };
  if (gradeStr.includes("/")) {
    const [r, t] = gradeStr.split("/");
    return { raw: r.trim(), total: t.trim() };
  }
  return { raw: gradeStr.trim(), total: "100" };
}

// ─── Custom Dropdown (no native <select>) ────────────────────────────────────

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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 cursor-pointer select-none focus:outline-none w-full"
      >
        {renderValue(value)}
        <FaChevronDown size={9} className={`shrink-0 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.11 }}
            className="absolute z-50 top-full mt-1.5 left-0 min-w-[180px] bg-white dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-1.5 space-y-0.5">
              {options.map(opt => (
                <button
                  key={opt} type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                    opt === value
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  {renderOption(opt)}
                  {opt === value && <span className="ml-auto text-[#06402B] dark:text-emerald-400 text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Grade Row ────────────────────────────────────────────────────────────────

const GradeRow = memo(({ label, values, setValues, type, imported }: {
  label: string;
  values: RowState;
  setValues: (v: RowState) => void;
  type: "exam" | "direct";
  imported?: boolean;
}) => (
  <div className="grid grid-cols-12 gap-2 items-center group/row">
    <div className="col-span-4 flex items-center gap-2">
      <span className="text-xs md:text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate">{label}</span>
      {imported && (
        <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 rounded-md text-[9px] font-black uppercase tracking-widest">
          <FaCheckCircle size={7} /> synced
        </span>
      )}
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

const PROGRAMS = ["Standard", "BSA", "DVM"] as const;
type Program = typeof PROGRAMS[number];

const PROGRAM_LABELS: Record<Program, string> = {
  Standard: "Standard Program",
  BSA: "BS Accountancy",
  DVM: "Vet. Medicine",
};

export default function GradeCalculator({ courses = [], tasks = [] }: GradeCalculatorProps) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [program, setProgram] = useState<Program>("Standard");
  const [rows, setRows] = useState(EMPTY_ROWS());
  // Track which rows were populated by import
  const [importedRows, setImportedRows] = useState<Set<string>>(new Set());

  const [result, setResult] = useState<{
    percentage: number | null; gpa: number | null; error: string | null;
  }>({ percentage: null, gpa: null, error: null });

  // Mark rows as dirty (manually edited) when changed
  const setRow = (key: keyof ReturnType<typeof EMPTY_ROWS>, val: RowState) => {
    setRows(r => ({ ...r, [key]: val }));
    setImportedRows(s => { const n = new Set(s); n.delete(key); return n; });
  };

  // ── Import from tracker ────────────────────────────────────────────────────

  const handleImport = useCallback(() => {
    if (!selectedCourseId) return;
    const graded = tasks.filter(t => t.courseId === selectedCourseId && t.status === "Graded");

    if (graded.length === 0) {
      setResult({ percentage: null, gpa: null, error: "No graded tasks found for this course." });
      return;
    }

    const mid  = graded.find(t => t.type === "Midterm Exam");
    const fin  = graded.find(t => t.type === "Final Exam");
    const prod = graded.find(t => t.type === "Final Product");
    const cs   = graded.find(t => t.type === "Class Standing");

    const newRows = { ...rows };
    const synced = new Set<string>();

    if (mid)  { newRows.midterms     = { ...parseGrade(mid.grade),  weight: "30" }; synced.add("midterms"); }
    if (fin)  { newRows.finals       = { ...parseGrade(fin.grade),  weight: "30" }; synced.add("finals"); }
    if (prod) { newRows.finalProduct = { ...parseGrade(prod.grade), weight: "20" }; synced.add("finalProduct"); }
    if (cs)   { newRows.classStanding= { ...parseGrade(cs.grade, true), weight: "20" }; synced.add("classStanding"); }

    setRows(newRows);
    setImportedRows(synced);
    setResult({ percentage: null, gpa: null, error: null });
  }, [selectedCourseId, tasks, rows]);

  // ── Compute ────────────────────────────────────────────────────────────────

  const calculateGrade = useCallback(() => {
    const getPoints = (item: RowState, isDirect = false): number => {
      const raw = parseFloat(item.raw);
      if (isNaN(raw)) return 0;
      if (isDirect) {
        if (raw > 20) return -3;
        if (raw < 0)  return -4;
        return raw;
      }
      const total  = parseFloat(item.total);
      const weight = parseFloat(item.weight);
      if (isNaN(total) || total === 0) return raw > 0 ? -1 : 0;
      if (raw > total) return -2;
      return (raw / total) * weight;
    };

    const midPts  = getPoints(rows.midterms);
    const finPts  = getPoints(rows.finals);
    const prodPts = getPoints(rows.finalProduct);
    const csPts   = getPoints(rows.classStanding, true);

    if ([midPts, finPts, prodPts].includes(-1)) return setResult({ percentage: null, gpa: null, error: "Please enter a Total for each exam row." });
    if ([midPts, finPts, prodPts].includes(-2)) return setResult({ percentage: null, gpa: null, error: "Score cannot be higher than Total." });
    if (csPts === -3) return setResult({ percentage: null, gpa: null, error: "Class Standing maximum is 20." });
    if (csPts === -4) return setResult({ percentage: null, gpa: null, error: "Negative scores are invalid." });

    const totalScore = midPts + finPts + prodPts + csPts;
    setResult({ percentage: totalScore, gpa: getGpaFromScore(totalScore, program), error: null });
  }, [rows, program]);

  const reset = () => {
    setRows(EMPTY_ROWS());
    setImportedRows(new Set());
    setResult({ percentage: null, gpa: null, error: null });
  };

  const gpa = result.gpa;
  const gpaColor = gpa === null ? "" : gpa >= 3.0 ? "text-[#06402B] dark:text-emerald-400" : gpa >= 1.0 ? "text-yellow-500" : "text-red-500";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto bg-white/80 dark:bg-[#18181b]/80 backdrop-blur-md border border-zinc-200 dark:border-[#06402B]/30 rounded-[2rem] shadow-sm relative overflow-hidden p-6 md:p-8 w-full"
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#06402B] to-emerald-400 dark:from-emerald-600 dark:to-emerald-400" />

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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">

          {/* Course import pill */}
          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 w-full sm:w-auto">
            <CustomSelect<string>
              value={selectedCourseId}
              options={["", ...courses.map(c => c.id)]}
              onChange={setSelectedCourseId}
              renderValue={v => (
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 px-2 w-36 truncate text-left">
                  {courses.find(c => c.id === v)?.title ?? "Select course…"}
                </span>
              )}
              renderOption={v =>
                v === "" ? (
                  <span className="text-zinc-400 italic">Select course…</span>
                ) : (
                  <span>{courses.find(c => c.id === v)?.title ?? v}</span>
                )
              }
            />
            <button
              onClick={handleImport}
              disabled={!selectedCourseId}
              className="px-4 py-2.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40 transition-all hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-sm shrink-0 flex items-center gap-1.5"
            >
              <FaDownload size={10} /> Pull
            </button>
          </div>

          {/* Program selector */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 w-full sm:w-auto">
            <CustomSelect<Program>
              value={program}
              options={[...PROGRAMS]}
              onChange={setProgram}
              renderValue={v => (
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest w-36">
                  {PROGRAM_LABELS[v]}
                </span>
              )}
              renderOption={v => <span className="font-semibold">{PROGRAM_LABELS[v]}</span>}
            />
          </div>
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

        <GradeRow label="Midterm Exam"   values={rows.midterms}      setValues={v => setRow("midterms", v)}      type="exam"   imported={importedRows.has("midterms")} />
        <GradeRow label="Final Exam"     values={rows.finals}        setValues={v => setRow("finals", v)}        type="exam"   imported={importedRows.has("finals")} />
        <GradeRow label="Final Product"  values={rows.finalProduct}  setValues={v => setRow("finalProduct", v)}  type="exam"   imported={importedRows.has("finalProduct")} />
        <GradeRow label="Class Standing" values={rows.classStanding} setValues={v => setRow("classStanding", v)} type="direct" imported={importedRows.has("classStanding")} />
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

            {/* Per-component breakdown */}
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