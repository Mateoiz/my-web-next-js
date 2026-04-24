"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaCalendarAlt, FaTimes, FaTrashAlt, 
  FaPalette, FaDownload, FaMobileAlt, FaDesktop, FaImage
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
type ThemeMode = 'light' | 'black' | 'blue' | 'pink';
type FormatMode = 'desktop' | 'mobile';

const COLORS = [
  "bg-[#06402B]", // DLSAU Green
  "bg-blue-600",
  "bg-rose-600",
  "bg-amber-500",
  "bg-purple-600",
  "bg-zinc-800"
];

const THEME_STYLES = {
  light: { bg: 'bg-white', border: 'border-zinc-200', text: 'text-zinc-900', grid: 'bg-zinc-200/50', header: 'bg-zinc-100', subText: 'text-zinc-400' },
  black: { bg: 'bg-zinc-950', border: 'border-zinc-800', text: 'text-white', grid: 'bg-zinc-800/50', header: 'bg-zinc-900', subText: 'text-zinc-500' },
  blue: { bg: 'bg-[#0f172a]', border: 'border-slate-800', text: 'text-slate-100', grid: 'bg-slate-800/50', header: 'bg-slate-900', subText: 'text-slate-400' },
  pink: { bg: 'bg-[#fff1f2]', border: 'border-rose-200', text: 'text-rose-950', grid: 'bg-rose-200/50', header: 'bg-rose-100', subText: 'text-rose-400' }
};

const DAYS_OF_WEEK: Day[] = ['M', 'T', 'W', 'Th', 'F', 'S'];
const START_HOUR = 7; 
const END_HOUR = 19; 
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

export default function DashboardScheduleMaker() {
  const [view, setView] = useState<ViewMode>('editor');
  const [termName, setTermName] = useState("2nd Term, A.Y. 2025-2026");
  
  const [activeTheme, setActiveTheme] = useState<ThemeMode>('light');
  const [format, setFormat] = useState<FormatMode>('desktop');
  const [isExporting, setIsExporting] = useState(false);

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

  const sortClassesByTime = (dayClasses: ClassSession[]) => {
    return dayClasses.sort((a, b) => {
      const aMin = parseInt(a.startTime.split(':')[0]) * 60 + parseInt(a.startTime.split(':')[1]);
      const bMin = parseInt(b.startTime.split(':')[0]) * 60 + parseInt(b.startTime.split(':')[1]);
      return aMin - bMin;
    });
  };

const downloadJPG = async () => {
    setIsExporting(true);
    try {
      // Import the modern library dynamically
      const { toJpeg } = await import('html-to-image');
      const element = document.getElementById('schedule-canvas');
      if (!element) return;
      
      const dataUrl = await toJpeg(element, { 
        quality: 1.0,
        pixelRatio: format === 'mobile' ? 3 : 2, // High-res export
        backgroundColor: activeTheme === 'black' ? '#09090b' : activeTheme === 'blue' ? '#0f172a' : activeTheme === 'pink' ? '#fff1f2' : '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `${termName || 'My_Schedule'}_${format}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to export. Ensure 'html-to-image' is installed.");
    } finally {
      setIsExporting(false);
    }
  };

  if (view === 'editor') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-xl flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden group transition-colors duration-300">
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
                    type="text" placeholder="Code" value={cls.code} onChange={(e) => updateClass(cls.id, 'code', e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-black text-zinc-900 dark:text-zinc-100 p-3 lg:p-3 rounded-xl focus:border-[#06402B] transition-colors uppercase"
                  />
                </div>

                <div className="flex-1 w-full">
                  <input 
                    type="text" placeholder="Course Name" value={cls.name} onChange={(e) => updateClass(cls.id, 'name', e.target.value)}
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
    const currentTheme = THEME_STYLES[activeTheme];

    return (
      <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 flex flex-col transition-colors duration-300">
        
        {/* TOP HEADER */}
        <div className="h-16 md:h-20 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-8 flex items-center justify-between shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-30">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setView('editor')} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-zinc-500 shrink-0">
              <FaTimes />
            </button>
            <div className="min-w-0">
              <h3 className="font-black text-sm md:text-lg uppercase tracking-tight truncate text-zinc-900 dark:text-white">{termName || "My Schedule"}</h3>
              <p className="text-[9px] md:text-[10px] font-mono font-bold text-[#06402B] uppercase tracking-widest truncate">Preview & Export</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-xl">
              <button onClick={() => setFormat('desktop')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${format === 'desktop' ? 'bg-white dark:bg-zinc-950 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                <FaDesktop size={12} /> Desktop
              </button>
              <button onClick={() => setFormat('mobile')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${format === 'mobile' ? 'bg-white dark:bg-zinc-950 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                <FaMobileAlt size={12} /> Mobile
              </button>
            </div>

            <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 hidden md:block" />

            <button onClick={() => window.print()} className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-bold text-xs uppercase tracking-widest rounded-xl hover:opacity-80 transition-all">
              <FaDownload /> PDF
            </button>
            <button onClick={downloadJPG} disabled={isExporting} className="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-[#06402B] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 shrink-0">
              <FaImage /> {isExporting ? "Saving..." : "JPG"}
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT (Sidebar + Canvas) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* THEME SIDEBAR */}
          <div className="w-full md:w-20 shrink-0 flex md:flex-col items-center justify-center gap-4 p-4 md:p-0 md:border-r border-b md:border-b-0 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md z-20 transition-colors">
            <span className="md:hidden text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2">Theme</span>
            {[
              { id: 'light', color: 'bg-white border-zinc-300' },
              { id: 'black', color: 'bg-zinc-950 border-zinc-700' },
              { id: 'blue', color: 'bg-slate-900 border-slate-700' },
              { id: 'pink', color: 'bg-rose-100 border-rose-300' }
            ].map((t) => (
              <button 
                key={t.id} 
                onClick={() => setActiveTheme(t.id as ThemeMode)}
                title={`${t.id} theme`}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all ${t.color} ${activeTheme === t.id ? 'scale-110 shadow-[0_0_15px_rgba(0,0,0,0.2)] ring-2 ring-[#06402B] ring-offset-2 dark:ring-offset-zinc-900' : 'hover:scale-105 opacity-80'}`}
              />
            ))}
          </div>

          {/* CANVAS SCROLL AREA */}
          <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar flex md:items-start justify-center bg-zinc-100/50 dark:bg-black/20">
            <div 
              id="schedule-canvas" 
              className={`relative transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${currentTheme.bg} ${currentTheme.border} border shadow-2xl overflow-hidden shrink-0 flex flex-col ${
                format === 'desktop' 
                  ? 'w-full min-w-[1000px] max-w-7xl rounded-[2rem] p-8 md:p-10 h-[1000px]' // Bigger desktop canvas
                  : 'w-[400px] min-h-[850px] rounded-[3rem] p-8 border-8 md:border-[12px] shadow-[0_0_50px_rgba(0,0,0,0.15)]' // Mobile wallpaper format
              }`}
            >
              
              {/* === DESKTOP GRID FORMAT === */}
              {format === 'desktop' ? (
                <>
                  <div className="mb-8 text-center">
                    <h2 className={`font-black uppercase tracking-tight text-3xl md:text-4xl ${currentTheme.text}`}>{termName || "My Schedule"}</h2>
                    <p className={`font-mono font-bold uppercase tracking-widest text-xs mt-1 ${currentTheme.subText}`}>Lasallian Hub</p>
                  </div>

                  <div className={`grid grid-cols-7 gap-4 mb-4 shrink-0`}>
                    <div className="col-span-1"></div> 
                    {DAYS_OF_WEEK.map(day => {
                      const fullDay = { 'M':'Monday', 'T':'Tuesday', 'W':'Wednesday', 'Th':'Thursday', 'F':'Friday', 'S':'Saturday' }[day];
                      return (
                        <div key={day} className={`col-span-1 text-center py-3 rounded-xl border ${currentTheme.header} ${currentTheme.border}`}>
                          <p className={`font-black uppercase tracking-wider text-sm ${currentTheme.text}`}>
                            {fullDay}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-7 gap-4 relative flex-1">
                    <div className={`col-span-1 flex flex-col justify-between border-r border-dashed ${currentTheme.border} pr-4`}>
                      {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                        const hour = START_HOUR + i;
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const displayHr = hour > 12 ? hour - 12 : hour;
                        return (
                          <div key={i} className={`text-right font-mono font-bold uppercase relative -top-2 text-[10px] ${currentTheme.subText}`}>
                            {displayHr}:00 {ampm}
                          </div>
                        );
                      })}
                    </div>

                    <div className="absolute inset-0 left-[calc(100%/7)] right-0 pointer-events-none flex flex-col justify-between z-0">
                      {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
                        <div key={i} className={`w-full h-px ${currentTheme.grid}`} />
                      ))}
                    </div>

                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day} className={`col-span-1 relative z-10 h-full border-r border-dashed ${currentTheme.border} last:border-0`}>
                        {classes.filter(c => c.days.includes(day)).map(cls => {
                          const pos = getPositionStyle(cls.startTime, cls.endTime);
                          return (
                            <div 
                              key={`${cls.id}-${day}`}
                              className={`absolute left-0 right-0 mx-1 rounded-xl shadow-md flex flex-col overflow-hidden text-white p-3 ${cls.color}`}
                              style={{ top: pos.top, height: pos.height }}
                            >
                              <div className="absolute inset-0 bg-black/10 mix-blend-overlay pointer-events-none" />
                              <h4 className={`font-black leading-tight relative z-10 text-sm truncate`}>{cls.code}</h4>
                              <p className={`font-bold text-white/80 uppercase tracking-widest mt-0.5 relative z-10 text-[10px] truncate`}>{cls.name}</p>
                              <p className={`font-mono font-bold mt-auto opacity-90 relative z-10 text-[10px] truncate`}>
                                {formatTime12hr(cls.startTime)} - {formatTime12hr(cls.endTime)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </>
              ) : (

                /* === MOBILE WALLPAPER (VERTICAL LIST) FORMAT === */
                <div className="flex flex-col h-full">
                  
                  <div className={`mb-6 border-b-2 pb-6 ${currentTheme.border}`}>
                    <h1 className={`text-3xl font-black uppercase tracking-tighter leading-none mb-3 ${currentTheme.text}`}>
                      {termName || "My Schedule"}
                    </h1>
                    <div className={`flex justify-between items-center opacity-80 ${currentTheme.subText}`}>
                      <p className="text-xs font-bold tracking-widest uppercase">Lasallian Hub</p>
                      <p className="text-[10px] font-mono font-bold uppercase">A.Y. 2025-2026</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 flex-1 pb-4">
                    {DAYS_OF_WEEK.map(day => {
                      const dayClasses = sortClassesByTime(classes.filter(c => c.days.includes(day)));
                      if (dayClasses.length === 0) return null;
                      const fullDay = { 'M':'MON', 'T':'TUE', 'W':'WED', 'Th':'THU', 'F':'FRI', 'S':'SAT' }[day];

                      return (
                        <div key={day} className="flex gap-4">
                          <div className="w-10 pt-1 shrink-0">
                            <span className={`text-xl font-black tracking-widest opacity-50 ${currentTheme.text}`}>{fullDay}</span>
                          </div>
                          
                          <div className={`flex-1 flex flex-col gap-3 border-l-2 pl-4 ${currentTheme.border}`}>
                            {dayClasses.map(c => (
                              <div key={c.id} className={`p-4 rounded-[1rem] ${c.color} text-white shadow-md flex justify-between items-center border-2 border-white/20`}>
                                <div className="min-w-0 pr-2">
                                  <div className="text-lg font-bold truncate leading-tight mb-1">{c.code}</div>
                                  <div className="text-[10px] uppercase tracking-widest opacity-90 font-medium truncate">{c.name}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-[9px] font-mono font-bold opacity-90 bg-black/20 px-2 py-1.5 rounded-lg inline-block text-center leading-tight">
                                    {formatTime12hr(c.startTime)}<br/>{formatTime12hr(c.endTime)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {classes.length === 0 && (
                      <div className={`flex-1 flex items-center justify-center opacity-30 ${currentTheme.text}`}>
                        <div className="text-sm font-bold uppercase tracking-widest text-center">No Classes Added</div>
                      </div>
                    )}
                  </div>

                  <div className={`mt-auto pt-6 border-t border-dashed ${currentTheme.border} text-center opacity-50 ${currentTheme.subText}`}>
                    <p className="text-[9px] font-bold tracking-[0.4em] uppercase">Generated by JPCS</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    );
  }

  return null;
}