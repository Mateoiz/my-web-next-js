"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaCalendarAlt, FaTimes, FaTrashAlt, 
  FaPalette, FaDownload
} from "react-icons/fa";

type Day = 'M' | 'T' | 'W' | 'Th' | 'F' | 'S';
type ClassSession = {
  id: string;
  code: string;
  name: string;
  days: Day[];
  startTime: string; 
  endTime: string;   
  color: string;
};

type ViewMode = 'editor' | 'canvas';

const COLORS = [
  "bg-[#06402B]", // DLSAU Green
  "bg-blue-600",
  "bg-rose-600",
  "bg-amber-500",
  "bg-purple-600",
  "bg-zinc-800"
];

const DAYS_OF_WEEK: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];
const START_HOUR = 7; 
const END_HOUR = 19; 
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

export default function DashboardScheduleMaker() {
  const [view, setView] = useState<ViewMode>('editor');
  const [termName, setTermName] = useState("2nd Term, A.Y. 2025-2026");
  
  const [classes, setClasses] = useState<ClassSession[]>([
    {
      id: '1', code: 'CS101', name: 'Intro to Computing',
      days: ['M', 'W'], startTime: '08:00', endTime: '09:30', color: COLORS[0]
    },
    {
      id: '2', code: 'MATH20', name: 'Discrete Mathematics',
      days: ['T', 'Th'], startTime: '10:00', endTime: '12:00', color: COLORS[1]
    }
  ]);

  const addClass = () => {
    setClasses([...classes, { 
      id: Date.now().toString(), code: '', name: '', 
      days: [], startTime: '08:00', endTime: '09:00', color: COLORS[0] 
    }]);
  };

  const updateClass = (id: string, field: keyof ClassSession, value: any) => {
    setClasses(classes.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  const toggleDay = (id: string, day: Day) => {
    setClasses(classes.map(c => {
      if (c.id === id) {
        const newDays = c.days.includes(day) ? c.days.filter(d => d !== day) : [...c.days, day];
        return { ...c, days: newDays };
      }
      return c;
    }));
  };

  const cycleColor = (id: string, currentColor: string) => {
    const nextIndex = (COLORS.indexOf(currentColor) + 1) % COLORS.length;
    updateClass(id, 'color', COLORS[nextIndex]);
  };

  const getPositionStyle = (start: string, end: string) => {
    if (!start || !end) return { top: '0%', height: '0%' };
    
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    
    const startMin = (sh * 60 + sm) - (START_HOUR * 60);
    const endMin = (eh * 60 + em) - (START_HOUR * 60);

    const top = (startMin / TOTAL_MINUTES) * 100;
    const height = ((endMin - startMin) / TOTAL_MINUTES) * 100;

    return { top: `${top}%`, height: `${height}%` };
  };

  const formatTime12hr = (time: string) => {
    if (!time) return "";
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  if (view === 'editor') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
        
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#06402B]/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex-1 space-y-4 relative z-10 w-full">
            <input 
              type="text" placeholder="Term / Semester Name" 
              value={termName} onChange={e => setTermName(e.target.value)}
              className="w-full text-2xl md:text-4xl font-black bg-transparent border-none outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-white tracking-tight"
            />
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs md:text-sm font-bold uppercase tracking-widest text-[#06402B]">
              {classes.length} Classes Added
            </div>
          </div>

          <div className="shrink-0 relative z-10 flex flex-col justify-end w-full md:w-auto">
            <button onClick={() => setView('canvas')} className="w-full md:w-auto px-8 py-4 bg-[#06402B] text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(6,64,43,0.3)]">
              <FaCalendarAlt size={18} /> View Timetable
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {classes.map((cls, index) => (
              <motion.div 
                key={cls.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 group transition-colors hover:border-[#06402B]/30"
              >
                
                <div className="flex items-center gap-3 w-full lg:w-48 shrink-0">
                  <button onClick={() => cycleColor(cls.id, cls.color)} className={`w-10 h-10 lg:w-8 lg:h-8 rounded-full ${cls.color} flex items-center justify-center text-white/50 hover:text-white transition-colors shadow-inner shrink-0`} title="Click to change color">
                    <FaPalette size={14} />
                  </button>
                  <input 
                    type="text" placeholder="Code (CS101)" value={cls.code} onChange={(e) => updateClass(cls.id, 'code', e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-black text-zinc-900 dark:text-zinc-100 p-3 lg:p-3 rounded-xl focus:border-[#06402B] transition-colors uppercase"
                  />
                </div>

                <div className="flex-1 w-full">
                  <input 
                    type="text" placeholder="Course Name (Intro to Computing)" value={cls.name} onChange={(e) => updateClass(cls.id, 'name', e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-bold text-zinc-700 dark:text-zinc-300 p-3 rounded-xl focus:border-[#06402B] transition-colors"
                  />
                </div>

                <div className="flex flex-wrap justify-center items-center gap-1 bg-zinc-100 dark:bg-zinc-950/50 p-2 lg:p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full lg:w-auto shrink-0">
                  {DAYS_OF_WEEK.map(day => (
                    <button 
                      key={day} onClick={() => toggleDay(cls.id, day)}
                      className={`w-10 h-10 lg:w-8 lg:h-8 rounded-lg text-xs font-black transition-all ${cls.days.includes(day) ? `${cls.color} text-white shadow-md` : 'text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
                  <input 
                    type="time" value={cls.startTime} onChange={(e) => updateClass(cls.id, 'startTime', e.target.value)}
                    className="flex-1 lg:w-28 bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-bold text-zinc-700 dark:text-zinc-300 p-3 lg:p-2.5 rounded-xl focus:border-[#06402B] text-center text-sm"
                  />
                  <span className="text-zinc-400 font-bold">-</span>
                  <input 
                    type="time" value={cls.endTime} onChange={(e) => updateClass(cls.id, 'endTime', e.target.value)}
                    className="flex-1 lg:w-28 bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-bold text-zinc-700 dark:text-zinc-300 p-3 lg:p-2.5 rounded-xl focus:border-[#06402B] text-center text-sm"
                  />
                </div>

                <button onClick={() => removeClass(cls.id)} className="w-full lg:w-auto bg-red-500/10 lg:bg-transparent text-red-500 hover:text-red-600 transition-colors p-3 lg:p-2 rounded-xl lg:rounded-none opacity-100 lg:opacity-0 group-hover:opacity-100 shrink-0 flex justify-center items-center mt-2 lg:mt-0 font-bold text-xs uppercase tracking-widest lg:text-base lg:normal-case lg:tracking-normal">
                  <span className="lg:hidden mr-2">Delete Subject</span> <FaTrashAlt />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <button onClick={addClass} className="w-full py-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[1.5rem] text-zinc-500 font-bold uppercase tracking-widest text-xs hover:border-[#06402B] hover:text-[#06402B] hover:bg-[#06402B]/5 transition-all flex items-center justify-center gap-2">
            <FaPlus /> Add New Subject
          </button>
        </div>

      </div>
    );
  }

  if (view === 'canvas') {
    return (
      <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        
        <div className="h-16 md:h-20 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-8 flex items-center justify-between shrink-0 bg-white/50 dark:bg-black/50 backdrop-blur-xl">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setView('editor')} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-zinc-500">
              <FaTimes />
            </button>
            <div className="min-w-0">
              <h3 className="font-black text-sm md:text-lg uppercase tracking-tight truncate">{termName || "My Schedule"}</h3>
              <p className="text-[9px] md:text-[10px] font-mono font-bold text-[#06402B] uppercase tracking-widest truncate">Academic Timetable</p>
            </div>
          </div>
          <button onClick={() => window.print()} className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[#06402B] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md">
            <FaDownload /> Export PDF
          </button>
        </div>

        <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-8 custom-scrollbar relative">
          {/* Added a prompt for mobile users to scroll sideways */}
          <div className="md:hidden text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 animate-pulse">
            Swipe left/right to view full grid ↔
          </div>
          <div className="min-w-[800px] w-full max-w-6xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl p-4 md:p-6 relative">
            
            <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4">
              <div className="col-span-1"></div> 
              {DAYS_OF_WEEK.map(day => {
                const fullDay = { 'M':'Monday', 'T':'Tuesday', 'W':'Wednesday', 'Th':'Thursday', 'F':'Friday', 'S':'Saturday' }[day];
                return (
                  <div key={day} className="col-span-1 text-center py-2 md:py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <p className="font-black text-zinc-900 dark:text-white uppercase tracking-wider text-[10px] md:text-sm">{fullDay}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 gap-2 md:gap-4 relative h-[800px]">
              
              <div className="col-span-1 flex flex-col justify-between border-r border-dashed border-zinc-200 dark:border-zinc-800 pr-2 md:pr-4">
                {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                  const hour = START_HOUR + i;
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  const displayHr = hour > 12 ? hour - 12 : hour;
                  return (
                    <div key={i} className="text-right text-[9px] md:text-[10px] font-mono font-bold text-zinc-400 uppercase relative -top-2">
                      {displayHr}:00 <span className="hidden sm:inline">{ampm}</span>
                    </div>
                  );
                })}
              </div>

              <div className="absolute inset-0 left-[calc(100%/7)] right-0 pointer-events-none flex flex-col justify-between z-0">
                {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
                  <div key={i} className="w-full h-px bg-zinc-200 dark:bg-zinc-800/50" />
                ))}
              </div>

              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="col-span-1 relative z-10 h-full border-r border-dashed border-zinc-200 dark:border-zinc-800/30 last:border-0">
                  {classes.filter(c => c.days.includes(day)).map(cls => {
                    const pos = getPositionStyle(cls.startTime, cls.endTime);
                    return (
                      <motion.div 
                        key={`${cls.id}-${day}`}
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className={`absolute left-0 right-0 mx-0.5 md:mx-1 rounded-xl p-1.5 md:p-3 shadow-lg flex flex-col overflow-hidden text-white ${cls.color}`}
                        style={{ top: pos.top, height: pos.height }}
                      >
                        <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none" />
                        <h4 className="font-black text-[10px] md:text-sm leading-tight relative z-10 truncate">{cls.code}</h4>
                        <p className="text-[8px] md:text-[10px] font-bold text-white/80 uppercase tracking-widest mt-0.5 truncate relative z-10">{cls.name}</p>
                        <p className="text-[8px] md:text-[10px] font-mono font-bold mt-auto opacity-80 relative z-10 truncate">
                          {formatTime12hr(cls.startTime)}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
            
          </div>
        </div>

      </div>
    );
  }

  return null;
}