"use client";

import { useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaCalendarAlt, FaDownload, FaPlus, FaTrash, FaExclamationTriangle, 
  FaHeart, FaStar, FaCloud, FaSun, FaLeaf, FaMobileAlt 
} from "react-icons/fa";
import { toPng } from 'html-to-image';

// --- CONSTANTS ---
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const COLORS = [
  { name: "Green", val: "bg-green-500" },
  { name: "Teal", val: "bg-teal-400" },
  { name: "Blue", val: "bg-blue-500" },
  { name: "Purple", val: "bg-violet-500" },
  { name: "Pink", val: "bg-pink-400" },
  { name: "Orange", val: "bg-orange-400" },
  { name: "Red", val: "bg-rose-500" },
  { name: "Zinc", val: "bg-zinc-600" },
];

// --- THEME ENGINE ---
const BG_THEMES = [
  { 
    id: 'coquette', 
    name: 'Coquette', 
    css: {
      background: `conic-gradient(from 90deg at 1px 1px, #0000 90deg, #fce7f3 0) 0 0/20px 20px, conic-gradient(from 90deg at 1px 1px, #0000 90deg, #fce7f3 0) 10px 10px/20px 20px, #fff1f2`,
    },
    text: 'text-pink-900', subtext: 'text-pink-400', border: 'border-pink-300', hex: '#fff1f2', displayHex: '#fbcfe8', decoration: 'bow', font: 'font-serif' 
  },
  { 
    id: 'golden', 
    name: 'Golden Hour', 
    css: { background: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)' },
    text: 'text-orange-900', subtext: 'text-orange-100', border: 'border-white/40', hex: '#fda085', displayHex: '#fb923c', decoration: 'sun', font: 'font-serif italic' 
  },
  { 
    id: 'dreamscape', 
    name: 'Dreamscape', 
    css: { background: 'linear-gradient(to top, #accbee 0%, #e7f0fd 100%)' },
    text: 'text-blue-900', subtext: 'text-blue-400', border: 'border-blue-200', hex: '#e7f0fd', displayHex: '#bfdbfe', decoration: 'cloud', font: 'font-sans tracking-widest' 
  },
  { 
    id: 'botanical', 
    name: 'Botanical', 
    css: { backgroundColor: '#eaf4e7', backgroundImage: 'radial-gradient(#4ade80 0.5px, transparent 0.5px), radial-gradient(#4ade80 0.5px, #eaf4e7 0.5px)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' },
    text: 'text-emerald-900', subtext: 'text-emerald-600', border: 'border-emerald-200', hex: '#eaf4e7', displayHex: '#86efac', decoration: 'leaf', font: 'font-mono' 
  },
  { 
    id: 'y2k', 
    name: 'Cyber Angel', 
    css: { background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
    text: 'text-indigo-900', subtext: 'text-white', border: 'border-white/50', hex: '#e0c3fc', displayHex: '#c084fc', decoration: 'stars', font: 'font-mono tracking-tighter' 
  },
  { id: 'dark', name: 'Midnight', css: { backgroundColor: '#09090b' }, text: 'text-white', subtext: 'text-zinc-500', border: 'border-zinc-800', hex: '#09090b', displayHex: '#09090b', font: 'font-sans' },
  { id: 'light', name: 'Paper', css: { backgroundColor: '#ffffff' }, text: 'text-zinc-900', subtext: 'text-zinc-400', border: 'border-zinc-100', hex: '#ffffff', displayHex: '#e4e4e7', font: 'font-sans' },
  { id: 'sakura', name: 'Sakura', css: { backgroundColor: '#fff1f2' }, text: 'text-rose-950', subtext: 'text-rose-400', border: 'border-rose-200', hex: '#fff1f2', displayHex: '#f472b6', font: 'font-sans' },
  { id: 'navy', name: 'Blueprint', css: { backgroundColor: '#0f172a', backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '20px 20px' }, text: 'text-slate-100', subtext: 'text-slate-500', border: 'border-slate-800', hex: '#0f172a', displayHex: '#0f172a', font: 'font-mono' },
  { id: 'cream', name: 'Journal', css: { backgroundColor: '#f5f5f4' }, text: 'text-stone-800', subtext: 'text-stone-400', border: 'border-stone-200', hex: '#f5f5f4', displayHex: '#d6d3d1', font: 'font-serif' },
];

// --- TYPES ---
interface ClassItem {
  id: string;
  subject: string;
  room: string;
  day: string;
  start: string;
  end: string;
  color: string;
}

const getMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

// --- SUB-COMPONENT: TIME SELECTOR ---
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
           <select value={h12} onChange={(e) => updateTime(parseInt(e.target.value), m.toString().padStart(2,'0'), period)} className="w-full appearance-none p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-center outline-none focus:border-green-500 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700">
             {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => <option key={h} value={h}>{h}</option>)}
           </select>
        </div>
        <span className="text-zinc-400 font-bold">:</span>
        <div className="relative flex-1">
           <select value={m} onChange={(e) => updateTime(h12, e.target.value, period)} className="w-full appearance-none p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold text-center outline-none focus:border-green-500 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-700">
             {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(min => <option key={min} value={min}>{min}</option>)}
           </select>
        </div>
        <button onClick={() => updateTime(h12, m.toString().padStart(2,'0'), period === 'AM' ? 'PM' : 'AM')} className={`flex-1 p-2 rounded-xl text-xs font-bold border transition-colors ${period === 'AM' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'}`}>{period}</button>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function ScheduleMaker() {
  const scheduleRef = useRef<HTMLDivElement>(null);
  const wallpaperRef = useRef<HTMLDivElement>(null);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [currentTheme, setCurrentTheme] = useState(BG_THEMES[0]);
  const [scheduleInfo, setScheduleInfo] = useState({ title: "My Schedule", subtitle: "AY 2025-2026" });
  
  // State
  const [form, setForm] = useState({ subject: "", room: "", days: ["Monday"] as string[], start: "08:00", end: "09:30", color: "bg-green-500" });
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = useCallback((day: string) => {
    setForm(prev => {
      const exists = prev.days.includes(day);
      return { ...prev, days: exists ? prev.days.filter(d => d !== day) : [...prev.days, day] };
    });
  }, []);

  const addClass = useCallback(() => {
    setError(null);
    if (!form.subject.trim()) return setError("Please enter a subject name.");
    if (form.days.length === 0) return setError("Please select at least one day.");

    const startMin = getMinutes(form.start);
    const endMin = getMinutes(form.end);

    if (startMin >= endMin) return setError("End time must be after start time.");
    if (endMin - startMin < 30) return setError("Class must be at least 30 minutes long.");

    for (const day of form.days) {
       const conflictingClass = classes.find(c => {
         if (c.day !== day) return false;
         const cStart = getMinutes(c.start);
         const cEnd = getMinutes(c.end);
         return (startMin < cEnd && endMin > cStart);
       });
       if (conflictingClass) return setError(`Conflict: Overlaps with ${conflictingClass.subject} on ${day}.`);
    }
    
    const newClasses = form.days.map((day, index) => ({ 
      id: `${Date.now()}-${index}`, subject: form.subject, room: form.room, day: day, start: form.start, end: form.end, color: form.color 
    }));
    
    setClasses(prev => [...prev, ...newClasses]);
    if (window.innerWidth < 1024) setMobileTab('preview');
    setForm(prev => ({ ...prev, subject: "", room: "" }));
  }, [form, classes]);

  const removeClass = useCallback((id: string) => setClasses(prev => prev.filter((c) => c.id !== id)), []);

  const downloadImage = useCallback(async (ref: any, suffix: string) => {
    if (ref.current) {
      try {
        const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2, backgroundColor: currentTheme.hex });
        const link = document.createElement("a");
        const safeTitle = scheduleInfo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `${safeTitle}_${suffix}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error(err);
        alert("Error saving image.");
      }
    }
  }, [currentTheme, scheduleInfo.title]);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[600px]">
        <div className="absolute top-0 left-0 w-full h-1 bg-green-500 z-20" />
        
        {/* Header */}
        <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400"><FaCalendarAlt size={20} /></div>
            <div><h2 className="text-xl font-bold text-zinc-900 dark:text-white">Schedule Maker</h2><p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Visual Planner</p></div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {/* Mobile Tabs */}
          <div className="flex lg:hidden border-b border-zinc-200 dark:border-zinc-800">
              <button onClick={() => setMobileTab('editor')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${mobileTab === 'editor' ? 'bg-zinc-100 dark:bg-zinc-800 text-green-600 border-b-2 border-green-500' : 'text-zinc-400'}`}>Editor</button>
              <button onClick={() => setMobileTab('preview')} className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${mobileTab === 'preview' ? 'bg-zinc-100 dark:bg-zinc-800 text-green-600 border-b-2 border-green-500' : 'text-zinc-400'}`}>Preview</button>
          </div>

          <div className="flex flex-col lg:flex-row flex-1">
            {/* Controls */}
            <div className={`${mobileTab === 'editor' ? 'block' : 'hidden'} lg:block w-full lg:w-1/3 p-6 md:p-8 border-r border-zinc-200 dark:border-zinc-800 space-y-6 bg-zinc-50/50 dark:bg-black/20`}>
              <div className="space-y-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Schedule Details</h3>
                  <div className="space-y-3">
                    <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-zinc-400">Title</label><input type="text" placeholder="My Schedule" value={scheduleInfo.title} onChange={(e) => setScheduleInfo({...scheduleInfo, title: e.target.value})} className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-green-500 transition-colors" /></div>
                    <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-zinc-400">Subtitle</label><input type="text" placeholder="AY 2025-2026" value={scheduleInfo.subtitle} onChange={(e) => setScheduleInfo({...scheduleInfo, subtitle: e.target.value})} className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-bold outline-none focus:border-green-500 transition-colors" /></div>
                  </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Add Class</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Subject (e.g. CS 101)" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} className="w-full p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm outline-none focus:border-green-500 transition-colors" />
                  <input type="text" placeholder="Room (e.g. 404)" value={form.room} onChange={(e) => setForm({...form, room: e.target.value})} className="w-full p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm outline-none focus:border-green-500 transition-colors" />
                  <div className="space-y-2"><label className="text-[10px] uppercase font-bold text-zinc-400">Select Days</label><div className="flex flex-wrap gap-2">{DAYS.map((d) => <button key={d} onClick={() => toggleDay(d)} className={`flex-1 min-w-[3rem] py-3 lg:py-2 text-xs font-bold rounded-lg border transition-all ${form.days.includes(d) ? "bg-green-500 border-green-500 text-white shadow-md" : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-green-500"}`}>{d.substring(0, 3)}</button>)}</div></div>
                  <div className="grid grid-cols-2 gap-4 pt-2"><TimeSelector label="Start Time" value={form.start} onChange={(val) => setForm({...form, start: val})} /><TimeSelector label="End Time" value={form.end} onChange={(val) => setForm({...form, end: val})} /></div>
                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 justify-center mt-2 flex-wrap">{COLORS.map((c) => <button key={c.name} onClick={() => setForm({...form, color: c.val})} className={`w-8 h-8 lg:w-6 lg:h-6 rounded-full shadow-sm ${c.val} ${form.color === c.val ? 'ring-2 ring-offset-2 ring-zinc-400 scale-110' : 'opacity-70 hover:opacity-100 hover:scale-105 transition-all'}`} title={c.name} />)}</div>
                  
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-200 dark:border-red-800">
                        <FaExclamationTriangle className="shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button onClick={addClass} className="w-full py-4 lg:py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2"><FaPlus size={12} /> Add to Schedule</button>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Select Aesthetic</h3>
                  <div className="grid grid-cols-5 gap-3 mb-4">
                    {BG_THEMES.map((theme) => (
                      <button key={theme.id} onClick={() => setCurrentTheme(theme)} className={`aspect-square rounded-full border-2 transition-all flex items-center justify-center relative overflow-hidden ${currentTheme.id === theme.id ? 'border-green-500 scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`} style={{ backgroundColor: theme.displayHex }} title={theme.name}>
                        {theme.id === 'coquette' && <span className="text-[10px]">🎀</span>}
                        {theme.id === 'y2k' && <span className="text-[10px]">✨</span>}
                        {theme.id === 'golden' && <span className="text-[10px]">☀️</span>}
                        {theme.id === 'dreamscape' && <span className="text-[10px]">☁️</span>}
                        {theme.id === 'botanical' && <span className="text-[10px]">🌿</span>}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => downloadImage(scheduleRef, 'desktop')} className="py-3 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-xs">
                          <FaDownload size={12} /> Desktop Image
                      </button>
                      <button onClick={() => downloadImage(wallpaperRef, 'wallpaper')} className="py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-xs">
                          <FaMobileAlt size={12} /> Phone Wallpaper
                      </button>
                  </div>
              </div>
            </div>

            {/* Preview */}
            <div className={`${mobileTab === 'preview' ? 'block' : 'hidden'} lg:flex w-full lg:w-2/3 p-4 md:p-8 overflow-x-auto bg-zinc-100 dark:bg-zinc-950 items-start lg:items-center justify-center`}>
              <div className="flex flex-col gap-4 w-full">
                  <ScheduleGrid classes={classes} removeClass={removeClass} scheduleRef={scheduleRef} theme={currentTheme} scheduleInfo={scheduleInfo} />
                  <p className="lg:hidden text-center text-[10px] text-zinc-400 animate-pulse">&larr; Scroll horizontally &rarr;</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* --- HIDDEN MOBILE WALLPAPER RENDERER --- */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
         <MobileWallpaperTemplate 
            wallpaperRef={wallpaperRef} 
            classes={classes} 
            theme={currentTheme} 
            scheduleInfo={scheduleInfo} 
         />
      </div>
    </>
  );
}

// --- SUB-COMPONENT: DESKTOP GRID ---
const ScheduleGrid = memo(({ classes, removeClass, scheduleRef, theme, scheduleInfo }: { classes: ClassItem[], removeClass: (id: string) => void, scheduleRef: any, theme: typeof BG_THEMES[0], scheduleInfo: { title: string, subtitle: string } }) => {
  const getPosition = (timeStr: string) => { const [h, m] = timeStr.split(":").map(Number); return (((h * 60 + m) - (7 * 60)) / 60) * 60; };
  const getHeight = (start: string, end: string) => { const [h1, m1] = start.split(":").map(Number); const [h2, m2] = end.split(":").map(Number); return (((h2 * 60 + m2) - (h1 * 60 + m1)) / 60) * 60; };

  return (
    <div ref={scheduleRef} style={theme.css} className={`w-full min-w-[800px] p-6 lg:p-10 rounded-2xl border transition-all duration-300 relative ${theme.text} ${theme.border} shadow-2xl ${theme.font}`}>
      {theme.decoration === 'bow' && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-pink-300 drop-shadow-md z-50 text-6xl">🎀</div>}
      {theme.decoration === 'sun' && <div className="absolute top-4 right-4 text-orange-200/50 text-6xl animate-pulse"><FaSun /></div>}
      {theme.decoration === 'cloud' && <div className="absolute top-6 left-6 text-white/40 text-6xl animate-bounce" style={{ animationDuration: '3s' }}><FaCloud /></div>}
      {theme.decoration === 'leaf' && <div className="absolute bottom-6 right-6 text-emerald-600/20 text-6xl rotate-45"><FaLeaf /></div>}
      {theme.decoration === 'stars' && (
        <>
          <div className="absolute top-4 right-4 text-white/40 animate-pulse"><FaStar /></div>
          <div className="absolute bottom-10 left-10 text-white/40 animate-pulse delay-700"><FaStar size={12} /></div>
        </>
      )}

      <div className={`flex justify-between items-end mb-8 border-b-2 pb-6 ${theme.border}`}>
        <div>
          <h1 className={`text-4xl font-black uppercase tracking-tighter leading-none mb-1 ${theme.id === 'coquette' ? 'font-serif italic' : ''}`}>{scheduleInfo.title || "My Schedule"}</h1>
          <p className="text-xs font-bold tracking-[0.2em] opacity-60">JPCS STUDENT TOOLKIT</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold opacity-50 ${theme.text}`}>{scheduleInfo.subtitle || "AY 2025-2026"}{theme.id === 'coquette' && <FaHeart className="inline ml-2 text-pink-400" />}</p>
        </div>
      </div>

      <div className="flex relative">
        <div className={`w-16 flex-shrink-0 border-r-2 pr-2 ${theme.border} sticky left-0 z-30`}>
          <div className="h-10"></div> 
          {HOURS.map(h => (
            <div key={h} className={`h-[60px] text-[11px] font-bold opacity-50 text-right pt-1 relative`}>
              {h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}
              <div className={`absolute top-0 right-[-10px] w-2 h-0.5 ${theme.border.replace('border', 'bg')}`}></div>
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-6 relative">
          {HOURS.map((h, i) => (<div key={i} className={`absolute w-full h-px z-0 opacity-20 ${theme.border.replace('border', 'bg')}`} style={{ top: `${i * 60 + 40}px` }} />))}
          {DAYS.map((day) => (
            <div key={day} className={`relative border-r last:border-0 ${theme.border}`}>
              <div className={`h-10 text-center text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center opacity-70 pb-2`}>{day.substring(0, 3)}</div>
              <div className="relative h-[840px]">
                {classes.filter(c => c.day === day).map((c) => (
                  <div key={c.id} className={`absolute left-1 right-1 rounded-xl p-3 text-white shadow-md overflow-hidden cursor-pointer hover:scale-[1.02] active:scale-95 transition-all z-10 ${c.color} border border-white/20`} style={{ top: `${getPosition(c.start)}px`, height: `${getHeight(c.start, c.end)}px` }} onClick={() => removeClass(c.id)}>
                    <div className="text-xs font-bold leading-tight line-clamp-2">{c.subject}</div>
                    <div className="text-[10px] opacity-90 line-clamp-1 mt-0.5">{c.room}</div>
                    <div className="absolute bottom-2 right-2 text-[9px] font-mono opacity-60 bg-black/10 px-1 rounded">{c.start}-{c.end}</div>
                    <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 bg-black/20 rounded-full p-1"><FaTrash size={8} /></div>
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

// --- SUB-COMPONENT: MOBILE WALLPAPER TEMPLATE ---
// FIX: Updated props type to allow null ref
const MobileWallpaperTemplate = ({ wallpaperRef, classes, theme, scheduleInfo }: { wallpaperRef: React.RefObject<HTMLDivElement | null>, classes: ClassItem[], theme: typeof BG_THEMES[0], scheduleInfo: { title: string, subtitle: string } }) => {
  
  const sortClasses = (dayClasses: ClassItem[]) => {
    return dayClasses.sort((a, b) => getMinutes(a.start) - getMinutes(b.start));
  };

  return (
    <div 
      ref={wallpaperRef}
      style={{
        ...theme.css,
        width: '1080px',
        // FIX: Changed height to auto and added minHeight to allow growth
        height: 'auto',
        minHeight: '1920px',
        padding: '180px 80px 180px 80px', 
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}
      className={`relative ${theme.text} ${theme.font}`}
    >
      {/* Dynamic Decorations */}
      {theme.decoration === 'bow' && <div className="absolute top-32 right-10 text-[10rem] opacity-20">🎀</div>}
      {theme.decoration === 'cloud' && <div className="absolute top-20 right-20 text-[10rem] opacity-20"><FaCloud /></div>}
      {theme.decoration === 'sun' && <div className="absolute top-20 right-20 text-orange-200/50 text-[10rem] animate-pulse"><FaSun /></div>}
      {theme.decoration === 'leaf' && <div className="absolute bottom-20 right-20 text-emerald-600/20 text-[10rem] rotate-45"><FaLeaf /></div>}
      {theme.decoration === 'stars' && (
        <>
          <div className="absolute top-32 right-20 text-white/40"><FaStar size={100} /></div>
          <div className="absolute bottom-40 left-20 text-white/40"><FaStar size={60} /></div>
        </>
      )}
      
      {/* Header */}
      <div className={`mb-12 border-b-4 pb-8 ${theme.border}`}>
        <h1 className="text-8xl font-black uppercase tracking-tighter leading-none mb-4">
          {scheduleInfo.title || "My Schedule"}
        </h1>
        <div className="flex justify-between items-center opacity-70">
           <p className="text-3xl font-bold tracking-widest">JPCS TOOLKIT</p>
           <p className="text-3xl font-bold">{scheduleInfo.subtitle}</p>
        </div>
      </div>

      {/* Vertical List of Days */}
      {/* FIX: Removed flex-1 so it doesn't constrain height, added mb-10 for spacing */}
      <div className="flex flex-col gap-10 mb-10">
        {DAYS.map(day => {
          // FIX: Added explicit type for 'c'
          const dayClassesRaw = classes.filter((c: ClassItem) => c.day === day);
          const dayClasses = sortClasses(dayClassesRaw);
          
          if (dayClasses.length === 0) return null; 

          return (
            <div key={day} className="flex gap-8">
               {/* Day Label */}
               <div className="w-32 pt-2">
                  <span className={`text-3xl font-black uppercase tracking-widest opacity-60`}>{day.substring(0,3)}</span>
               </div>

               {/* Classes List */}
               <div className={`flex-1 flex flex-col gap-4 border-l-4 pl-8 ${theme.border}`}>
                  {/* FIX: Added explicit type for 'c' */}
                  {dayClasses.map((c: ClassItem) => (
                    <div key={c.id} className={`p-6 rounded-3xl ${c.color} text-white shadow-lg flex justify-between items-center border-4 border-white/20`}>
                        <div>
                           <div className="text-4xl font-bold mb-2">{c.subject}</div>
                           <div className="text-2xl opacity-90 font-medium">{c.room}</div>
                        </div>
                        <div className="text-right">
                           <div className="text-2xl font-mono opacity-90 bg-black/20 px-4 py-2 rounded-xl inline-block">
                             {c.start} - {c.end}
                           </div>
                        </div>
                    </div>
                  ))}
               </div>
            </div>
          )
        })}
        
        {classes.length === 0 && (
           <div className="flex-1 flex items-center justify-center opacity-30 min-h-[800px]">
              <div className="text-6xl font-bold uppercase tracking-widest text-center">No Classes Added</div>
           </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-10 text-center opacity-40">
         <p className="text-2xl font-bold tracking-[0.5em] uppercase">Generated by JPCS</p>
      </div>
    </div>
  )
};