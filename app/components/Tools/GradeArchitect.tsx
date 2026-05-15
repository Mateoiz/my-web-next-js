"use client";

import { useState, useMemo } from "react";
import { FaBullseye, FaPlus, FaTrashAlt, FaExclamationTriangle, FaChartLine, FaGraduationCap } from "react-icons/fa";

type ComponentEntry = { id: string; name: string; score: string; weight: string };

const GRADE_SCALE = [
  { label: "1.0", value: 1.0, desc: "Excellent", color: "text-emerald-600 dark:text-emerald-400" },
  { label: "1.25", value: 1.25, desc: "Superior", color: "text-emerald-600 dark:text-emerald-400" },
  { label: "1.5", value: 1.5, desc: "Very Good", color: "text-emerald-500 dark:text-emerald-400" },
  { label: "1.75", value: 1.75, desc: "Good", color: "text-blue-600 dark:text-blue-400" },
  { label: "2.0", value: 2.0, desc: "Satisfactory", color: "text-blue-500 dark:text-blue-400" },
  { label: "2.25", value: 2.25, desc: "Fair", color: "text-amber-600 dark:text-amber-400" },
  { label: "2.5", value: 2.5, desc: "Passing", color: "text-amber-500 dark:text-amber-400" },
  { label: "2.75", value: 2.75, desc: "Low Pass", color: "text-orange-500 dark:text-orange-400" },
  { label: "3.0", value: 3.0, desc: "Minimum Pass", color: "text-red-500 dark:text-red-400" },
  { label: "5.0", value: 5.0, desc: "Failed", color: "text-red-600 dark:text-red-500" },
];

// Convert raw percentage score to DLSAU grade equivalent
function scoreToGrade(score: number): number {
  if (score >= 97) return 1.0;
  if (score >= 94) return 1.25;
  if (score >= 91) return 1.5;
  if (score >= 88) return 1.75;
  if (score >= 85) return 2.0;
  if (score >= 82) return 2.25;
  if (score >= 79) return 2.5;
  if (score >= 76) return 2.75;
  if (score >= 75) return 3.0;
  return 5.0;
}

// Convert grade to minimum percentage score
function gradeToMinScore(grade: number): number {
  if (grade <= 1.0) return 97;
  if (grade <= 1.25) return 94;
  if (grade <= 1.5) return 91;
  if (grade <= 1.75) return 88;
  if (grade <= 2.0) return 85;
  if (grade <= 2.25) return 82;
  if (grade <= 2.5) return 79;
  if (grade <= 2.75) return 76;
  if (grade <= 3.0) return 75;
  return 0;
}

export default function GradeArchitect() {
  const [targetGrade, setTargetGrade] = useState<number>(2.0);
  const [finalWeight, setFinalWeight] = useState<string>("40");
  const [components, setComponents] = useState<ComponentEntry[]>([
    { id: '1', name: 'Class Standing', score: '', weight: '20' },
    { id: '2', name: 'Midterm Exam', score: '', weight: '30' },
    { id: '3', name: 'Final Product', score: '', weight: '10' },
  ]);

  const addComponent = () => {
    setComponents(prev => [...prev, { id: Date.now().toString(), name: '', score: '', weight: '' }]);
  };

  const update = (id: string, field: keyof ComponentEntry, value: string) => {
    setComponents(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const remove = (id: string) => {
    if (components.length > 1) setComponents(prev => prev.filter(e => e.id !== id));
  };

  const calc = useMemo(() => {
    const finalW = Number(finalWeight) || 0;
    const otherW = components.reduce((s, e) => s + (Number(e.weight) || 0), 0);
    const totalW = otherW + finalW;

    // Accumulated weighted score from known components
    const accumulated = components.reduce((s, e) => {
      const score = Number(e.score) || 0;
      const weight = Number(e.weight) || 0;
      return s + (score * weight / 100);
    }, 0);

    // Target score = minimum score needed for target grade
    const targetScore = gradeToMinScore(targetGrade);

    // What score do you need on the final?
    // accumulated + (finalScore * finalW / 100) = targetScore
    // finalScore = (targetScore - accumulated) / (finalW / 100)
    const needed = finalW > 0
      ? (targetScore - accumulated) / (finalW / 100)
      : null;

    const allFilled = components.every(e => e.score !== '' && e.weight !== '');

    return {
      needed,
      finalW,
      otherW,
      totalW,
      accumulated,
      targetScore,
      allFilled,
      overWeight: totalW > 100,
      underWeight: totalW < 100,
    };
  }, [components, finalWeight, targetGrade]);

  const status = useMemo(() => {
    if (calc.overWeight) return {
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      title: "Weight Overload",
      desc: "Your percentages add up to more than 100%. Double-check your syllabus.",
    };
    if (calc.needed === null) return {
      color: "text-zinc-500",
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/20",
      title: "Set Final Weight",
      desc: "Enter the weight of your final exam to see what score you need.",
    };
    if (calc.needed > 100) return {
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      title: "Not Achievable",
      desc: `You would need more than 100% on the final to hit a ${targetGrade}. Consider adjusting your target grade.`,
    };
    if (calc.needed < 0) return {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      title: "Already Secured!",
      desc: `Your current scores are already enough to pass even with a 0 on the final. You've secured at least a ${targetGrade}.`,
    };
    if (calc.needed >= 95) return {
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      title: "Grind Time",
      desc: "You need a near-perfect final exam score. Every point counts — go review everything.",
    };
    if (calc.needed >= 85) return {
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      title: "Totally Doable",
      desc: "A solid performance on the final will get you there. Stay focused and review key topics.",
    };
    return {
      color: "text-[#06402B] dark:text-emerald-400",
      bg: "bg-[#06402B]/10",
      border: "border-[#06402B]/20",
      title: "Safe Zone",
      desc: "You have breathing room. A comfortable passing score on the final is all you need.",
    };
  }, [calc, targetGrade]);

  const neededGrade = calc.needed !== null && calc.needed >= 0 && calc.needed <= 100
    ? scoreToGrade(calc.needed)
    : null;

  const neededGradeInfo = neededGrade !== null
    ? GRADE_SCALE.find(g => g.value === neededGrade)
    : null;

  return (
    <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-5 sm:p-6 md:p-8 shadow-2xl flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        <div className="p-3 bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 rounded-2xl shadow-inner shrink-0">
          <FaBullseye size={20} />
        </div>
        <div>
          <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-tight">
            Final Exam Calculator
          </h3>
          <p className="text-[9px] md:text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
            What score do you need on the final?
          </p>
        </div>
      </div>

      {/* Step 1: Target grade picker */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 block">
          1. What grade do you want to achieve?
        </label>
        <div className="flex flex-wrap gap-2">
          {GRADE_SCALE.filter(g => g.value !== 5.0).map(g => (
            <button
              key={g.label}
              onClick={() => setTargetGrade(g.value)}
              className={`px-3 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 touch-manipulation ${
                targetGrade === g.value
                  ? "bg-[#06402B] dark:bg-emerald-600 text-white border-[#06402B] dark:border-emerald-600 shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-[#06402B]/40"
              }`}
            >
              {g.label}
              <span className={`block text-[8px] font-bold mt-0.5 ${targetGrade === g.value ? "text-white/70" : "text-zinc-400"}`}>
                {g.desc}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-400 font-medium ml-1">
          Minimum score needed: <span className="font-black text-zinc-700 dark:text-zinc-300">{gradeToMinScore(targetGrade)}%</span>
        </p>
      </div>

      {/* Step 2: Other components */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 block">
          2. Enter your scores for other grade components
        </label>

        {components.map(entry => (
          <div key={entry.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-zinc-100 dark:bg-zinc-950/50 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            {/* Name */}
            <input
              type="text"
              placeholder="Component name"
              value={entry.name}
              onChange={e => update(entry.id, 'name', e.target.value)}
              className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm font-bold px-3 py-2.5 rounded-xl placeholder:text-zinc-400 focus:border-[#06402B] transition-colors text-zinc-900 dark:text-white"
            />
            {/* Score */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Score"
                  value={entry.score}
                  onChange={e => update(entry.id, 'score', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm font-black text-center px-3 py-2.5 rounded-xl placeholder:text-zinc-400 focus:border-[#06402B] transition-colors text-zinc-900 dark:text-white"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">%</span>
              </div>
              {/* Weight */}
              <div className="relative flex-1 sm:w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Weight"
                  value={entry.weight}
                  onChange={e => update(entry.id, 'weight', e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 outline-none text-sm font-bold text-center px-3 py-2.5 rounded-xl placeholder:text-zinc-400 focus:border-[#06402B] transition-colors text-[#06402B] dark:text-emerald-400"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400">wt</span>
              </div>
              {/* Remove */}
              <button
                onClick={() => remove(entry.id)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-500/30 transition-all shrink-0 touch-manipulation"
              >
                <FaTrashAlt size={12} />
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addComponent}
          className="w-full py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-500 font-bold text-xs uppercase tracking-widest hover:border-[#06402B] hover:text-[#06402B] hover:bg-[#06402B]/5 transition-all flex items-center justify-center gap-2 touch-manipulation"
        >
          <FaPlus size={10} /> Add Component
        </button>
      </div>

      {/* Step 3: Final exam weight */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1 block">
          3. What is the weight of your Final Exam?
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[160px]">
            <input
              type="number"
              min="0"
              max="100"
              value={finalWeight}
              onChange={e => setFinalWeight(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 focus:border-[#06402B] dark:focus:border-emerald-500 outline-none text-2xl font-black text-center px-4 py-3 rounded-2xl transition-colors text-zinc-900 dark:text-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">%</span>
          </div>
          <div className="flex-1">
            {calc.overWeight ? (
              <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                <FaExclamationTriangle size={11} /> Total is {calc.totalW}% — over 100%
              </p>
            ) : calc.underWeight ? (
              <p className="text-[11px] text-zinc-400 font-medium">
                Total weight: <span className="font-black text-zinc-600 dark:text-zinc-300">{calc.totalW}%</span>
                {calc.totalW < 100 && <span className="text-zinc-400"> ({100 - calc.totalW}% unaccounted)</span>}
              </p>
            ) : (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1.5">
                ✓ Weights add up to 100%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Result card */}
      <div className={`rounded-[1.5rem] border-2 p-5 md:p-6 transition-all ${status.bg} ${status.border}`}>
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[10px] font-black uppercase tracking-widest ${status.color}`}>
            {status.title}
          </span>
          {calc.needed !== null && calc.needed > 95 && calc.needed <= 100
            ? <FaExclamationTriangle className={status.color} size={14} />
            : <FaChartLine className={status.color} size={14} />
          }
        </div>

        {calc.needed !== null && !calc.overWeight ? (
          <>
            {calc.needed < 0 ? (
              <div className="flex items-center gap-3 mb-3">
                <FaGraduationCap size={28} className="text-emerald-500" />
                <div>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Already there!</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                    Grade {targetGrade} is secured regardless of your final score
                  </p>
                </div>
              </div>
            ) : calc.needed > 100 ? (
              <div className="mb-3">
                <p className="text-2xl font-black text-red-500">Impossible</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                  Even a perfect 100% on the final won't be enough
                </p>
              </div>
            ) : (
              <div className="mb-3">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-xs font-bold text-zinc-500">You need at least</span>
                  <span className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">
                    {calc.needed.toFixed(1)}
                    <span className="text-xl font-bold text-zinc-400">%</span>
                  </span>
                </div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  on your Final Exam (worth {calc.finalW}% of total grade)
                </p>

                {/* Grade equivalent */}
                {neededGradeInfo && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Equivalent to:</span>
                    <span className={`text-sm font-black ${neededGradeInfo.color}`}>
                      {neededGradeInfo.label}
                    </span>
                    <span className={`text-[10px] font-bold ${neededGradeInfo.color}`}>
                      ({neededGradeInfo.desc})
                    </span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-4 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      calc.needed >= 95 ? "bg-red-500"
                      : calc.needed >= 85 ? "bg-amber-500"
                      : "bg-[#06402B] dark:bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(calc.needed, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] font-bold text-zinc-400">0%</span>
                  <span className="text-[8px] font-bold text-zinc-400">100%</span>
                </div>
              </div>
            )}
          </>
        ) : !calc.overWeight && (
          <p className="text-sm font-bold text-zinc-400 mb-3">
            Fill in your scores and final exam weight above.
          </p>
        )}

        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed border-t border-black/10 dark:border-white/10 pt-3 mt-1">
          {status.desc}
        </p>
      </div>

      {/* Score breakdown — only if all scores entered */}
      {calc.allFilled && calc.needed !== null && calc.needed >= 0 && calc.needed <= 100 && (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Score Breakdown</p>
          {components.map(e => {
            const score = Number(e.score) || 0;
            const weight = Number(e.weight) || 0;
            const contribution = score * weight / 100;
            return (
              <div key={e.id} className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 truncate flex-1">
                  {e.name || "Component"}
                </span>
                <span className="text-[11px] font-mono text-zinc-500 shrink-0">{score}% × {weight}%</span>
                <span className="text-[11px] font-black text-zinc-700 dark:text-zinc-300 shrink-0 w-10 text-right">
                  {contribution.toFixed(1)}
                </span>
              </div>
            );
          })}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex items-center justify-between">
            <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Accumulated</span>
            <span className="text-[11px] font-black text-[#06402B] dark:text-emerald-400">
              {calc.accumulated.toFixed(2)} / {100 - calc.finalW}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}