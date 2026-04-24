"use client";

import { useState, useMemo } from "react";
import { FaBullseye, FaPlus, FaTrashAlt, FaExclamationTriangle, FaChartLine } from "react-icons/fa";

type GradeEntry = { id: string; name: string; grade: string; weight: string };

export default function GradeArchitect() {
  const [targetGrade, setTargetGrade] = useState<string>("2.0");
  const [entries, setEntries] = useState<GradeEntry[]>([
    { id: '1', name: 'Midterm Exam', grade: '2.5', weight: '30' }
  ]);

  const addEntry = () => {
    setEntries([...entries, { id: Date.now().toString(), name: '', grade: '', weight: '' }]);
  };

  const updateEntry = (id: string, field: keyof GradeEntry, value: string) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const { requiredGrade, weightLeft, totalWeight } = useMemo(() => {
    const totalW = entries.reduce((sum, e) => sum + (Number(e.weight) || 0), 0);
    const accumulated = entries.reduce((sum, e) => sum + ((Number(e.grade) || 0) * ((Number(e.weight) || 0) / 100)), 0);
    
    const left = 100 - totalW;
    let req = 0;
    
    if (left > 0) {
      req = (Number(targetGrade) - accumulated) / (left / 100);
    }

    return { requiredGrade: parseFloat(req.toFixed(2)), weightLeft: left, totalWeight: totalW };
  }, [entries, targetGrade]);

  const status = useMemo(() => {
    if (totalWeight >= 100) return {
      color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20",
      title: "Weight Overload", desc: "Your total percentages add up to 100% or more. Double-check your syllabus."
    };
    if (requiredGrade < 1.0) return { 
      color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", 
      title: "Mathematically Impossible", 
      desc: "You would need a grade higher than a 1.0 to pull this off. It might be time to lower the goal grade." 
    };
    if (requiredGrade <= 1.5) return { 
      color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20", 
      title: "Grind Time", 
      desc: "You need near-perfect scores on whatever is left in the semester. Lock in." 
    };
    if (requiredGrade <= 3.0) return { 
      color: "text-[#06402B]", bg: "bg-[#06402B]/10", border: "border-[#06402B]/20", 
      title: "Totally Doable", 
      desc: "This goal is well within reach. Just keep your momentum going." 
    };
    return { 
      color: "text-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/20", 
      title: "Safe Zone", 
      desc: "You have a lot of breathing room. Even a passing grade on the rest will get you your goal." 
    };
  }, [requiredGrade, totalWeight]);

  return (
    <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-5 sm:p-6 md:p-8 shadow-2xl h-full flex flex-col">
      
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 shrink-0">
        <div className="p-3 bg-[#06402B]/10 text-[#06402B] rounded-2xl shadow-inner shrink-0">
          <FaBullseye size={20} className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h3 className="text-base md:text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-tight">Grade Target</h3>
          <p className="text-[9px] md:text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Find out what you need</p>
        </div>
      </div>

      <div className="space-y-6">
        
        <div>
          <label className="text-[10px] md:text-xs font-bold text-zinc-500 block mb-3 ml-2 uppercase tracking-wider">1. Grades you already have</label>
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-zinc-100 dark:bg-zinc-950/50 p-3 sm:p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                
                {/* Name Input (Full width on mobile) */}
                <input 
                  type="text" placeholder="e.g., Midterms" 
                  value={entry.name} onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                  className="w-full sm:flex-1 bg-white dark:bg-zinc-900 sm:bg-transparent border border-zinc-200 dark:border-zinc-700 sm:border-none outline-none text-sm font-bold p-3 sm:px-2 rounded-xl sm:rounded-none placeholder:text-zinc-400 focus:border-[#06402B] transition-colors"
                />
                
                <div className="hidden sm:block w-px h-6 bg-zinc-300 dark:bg-zinc-800 shrink-0" />
                
                {/* Mobile Wrapper for Grade, Weight, Trash */}
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="flex-1 sm:w-16 relative">
                    <input 
                      type="number" step="0.1" placeholder="Grade" 
                      value={entry.grade} onChange={(e) => updateEntry(entry.id, 'grade', e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 sm:bg-transparent border border-zinc-200 dark:border-zinc-700 sm:border-none outline-none text-sm font-black text-center p-3 sm:p-0 rounded-xl sm:rounded-none placeholder:text-zinc-400 focus:border-[#06402B] transition-colors"
                    />
                  </div>
                  
                  <div className="hidden sm:block w-px h-6 bg-zinc-300 dark:bg-zinc-800 shrink-0" />
                  
                  <div className="flex-1 sm:w-20 relative flex items-center bg-white dark:bg-zinc-900 sm:bg-transparent border border-zinc-200 dark:border-zinc-700 sm:border-none rounded-xl sm:rounded-none focus-within:border-[#06402B] transition-colors pr-2">
                    <input 
                      type="number" placeholder="Weight" 
                      value={entry.weight} onChange={(e) => updateEntry(entry.id, 'weight', e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-sm font-bold text-right p-3 sm:p-0 placeholder:text-zinc-400 text-[#06402B]"
                    />
                    <span className="text-xs font-bold text-zinc-400 ml-1">%</span>
                  </div>

                  <button onClick={() => removeEntry(entry.id)} className="p-3 sm:p-2 text-zinc-400 bg-white dark:bg-zinc-900 sm:bg-transparent border border-zinc-200 dark:border-zinc-700 sm:border-none rounded-xl sm:rounded-none hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0 flex items-center justify-center">
                    <FaTrashAlt size={14} className="sm:w-3 sm:h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={addEntry} className="mt-3 w-full py-4 sm:py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-500 font-bold text-xs uppercase tracking-widest hover:border-[#06402B] hover:text-[#06402B] hover:bg-[#06402B]/5 transition-all flex items-center justify-center gap-2">
            <FaPlus /> Add Another Score
          </button>
        </div>

        {/* CONNECTED GOAL & VERDICT SECTION */}
        <div className="mt-4 flex flex-col">
          <div className="bg-zinc-100 dark:bg-zinc-900/50 p-4 md:p-5 rounded-t-[1.5rem] md:rounded-t-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-0">
            <label className="text-xs md:text-sm font-bold text-zinc-600 dark:text-zinc-400">2. What is your goal final grade?</label>
            <input 
              type="number" step="0.1" 
              value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)} 
              className="w-full sm:w-24 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-[#06402B] p-3 rounded-xl outline-none font-black text-lg transition-all text-center text-zinc-900 dark:text-white shadow-sm" 
            />
          </div>

          <div className={`p-5 md:p-6 rounded-b-[1.5rem] md:rounded-b-3xl border-2 transition-all ${status.bg} ${status.border} border-t-0`}>
            <div className="flex justify-between items-center mb-4">
              <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest ${status.color}`}>{status.title}</span>
              {requiredGrade <= 1.5 || totalWeight >= 100 ? <FaExclamationTriangle className={status.color} /> : <FaChartLine className={status.color} />}
            </div>
            
            {totalWeight < 100 ? (
              <>
                <div className="flex items-baseline gap-2 mb-1 md:mb-2">
                  <span className="text-xs md:text-sm font-bold text-zinc-500">You need to average a</span>
                  <span className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">{requiredGrade}</span>
                </div>
                <p className="text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">On the remaining {weightLeft}% of your class</p>
              </>
            ) : (
              <div className="text-xl md:text-2xl font-black text-red-500 mb-2">Error</div>
            )}

            <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
              {status.desc}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}