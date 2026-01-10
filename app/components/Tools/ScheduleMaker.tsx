"use client";

import { useState, useRef, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { FaCalendarAlt, FaDownload, FaPlus, FaTrash } from "react-icons/fa";
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

const BG_THEMES = [
  { id: 'dark', name: 'Midnight', bg: 'bg-zinc-950', text: 'text-white', subtext: 'text-zinc-500', border: 'border-zinc-800', hex: '#09090b', displayHex: '#09090b' },
  { id: 'light', name: 'Paper', bg: 'bg-white', text: 'text-zinc-900', subtext: 'text-zinc-400', border: 'border-zinc-100', hex: '#ffffff', displayHex: '#e4e4e7' },
  { id: 'sakura', name: 'Sakura', bg: 'bg-rose-50', text: 'text-rose-950', subtext: 'text-rose-400', border: 'border-rose-200', hex: '#fff1f2', displayHex: '#f472b6' },
  { id: 'navy', name: 'Blueprint', bg: 'bg-slate-900', text: 'text-slate-100', subtext: 'text-slate-500', border: 'border-slate-800', hex: '#0f172a', displayHex: '#0f172a' },
  { id: 'cream', name: 'Journal', bg: 'bg-stone-100', text: 'text-stone-800', subtext: 'text-stone-400', border: 'border-stone-200', hex: '#f5f5f4', displayHex: '#d6d3d1' },
];

// --- INTERFACES & HELPERS ---
interface ClassItem {
  id: string;
  subject: string;
  room: string;
  day: string;
  start: string;
  end: string;
  color: string;
}

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
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [currentTheme, setCurrentTheme] = useState(BG_THEMES[0]);
  const [scheduleInfo, setScheduleInfo] = useState({ title: "My Schedule", subtitle: "AY 2025-2026" });
  const [form, setForm] = useState({ subject: "", room: "", days: ["Monday"] as string[], start: "08:00", end: "09:30", color: "bg-green-500" });
  const [classes, setClasses] = useState<ClassItem[]>([]);

  const toggleDay = useCallback((day: string) => {
    setForm(prev => {
      const exists = prev.days.includes(day);
      return { ...prev, days: exists ? prev.days.filter(d => d !== day) : [...prev.days, day] };
    });
  }, []);

  const addClass = useCallback(() => {
    if (!form.subject || !form.start || !form.end || form.days.length === 0) return;
    const newClasses = form.days.map((day, index) => ({ id: `${Date.now()}-${index}`, subject: form.subject, room: form.room, day: day, start: form.start, end: form.end, color: form.color }));
    setClasses(prev => [...prev, ...newClasses]);
    if (window.innerWidth < 1024) setMobileTab('preview');
    setForm(prev => ({ ...prev, subject: "", room: "" }));
  }, [form]);

  const removeClass = useCallback((id: string) => setClasses(prev => prev.filter((c) => c.id !== id)), []);

  const downloadSchedule = useCallback(async () => {
    if (scheduleRef.current) {
      try {
        const dataUrl = await toPng(scheduleRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: currentTheme.hex });
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-green-500/30 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[600px]">
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500 z-20" />
      
      {/* Header (Static) */}
      <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400"><FaCalendarAlt size={20} /></div>
          <div><h2 className="text-xl font-bold text-zinc-900 dark:text-white">Schedule Maker</h2><p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Visual Planner</p></div>
        </div>
      </div>

      {/* Content (Always Visible) */}
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
                <button onClick={addClass} className="w-full py-4 lg:py-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2"><FaPlus size={12} /> Add to Schedule</button>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Export Settings</h3>
                <div className="grid grid-cols-5 gap-3 mb-4">{BG_THEMES.map((theme) => <button key={theme.id} onClick={() => setCurrentTheme(theme)} className={`aspect-square rounded-full border-2 transition-all ${currentTheme.id === theme.id ? 'border-green-500 scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`} style={{ backgroundColor: theme.displayHex }} title={theme.name} />)}</div>
                <button onClick={downloadSchedule} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"><FaDownload size={14} /> Save Image</button>
            </div>
          </div>

          {/* Preview */}
          <div className={`${mobileTab === 'preview' ? 'block' : 'hidden'} lg:flex w-full lg:w-2/3 p-4 md:p-8 overflow-x-auto bg-zinc-100 dark:bg-zinc-950 items-start lg:items-center justify-center`}>
            <div className="flex flex-col gap-4 w-full">
                <div className="lg:hidden flex justify-end"><button onClick={downloadSchedule} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg"><FaDownload /> Save</button></div>
                <ScheduleGrid classes={classes} removeClass={removeClass} scheduleRef={scheduleRef} theme={currentTheme} scheduleInfo={scheduleInfo} />
                <p className="lg:hidden text-center text-[10px] text-zinc-400 animate-pulse">&larr; Scroll horizontally &rarr;</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- SUB-COMPONENT: SCHEDULE GRID ---
const ScheduleGrid = memo(({ classes, removeClass, scheduleRef, theme, scheduleInfo }: { classes: ClassItem[], removeClass: (id: string) => void, scheduleRef: any, theme: typeof BG_THEMES[0], scheduleInfo: { title: string, subtitle: string } }) => {
  const getPosition = (timeStr: string) => { const [h, m] = timeStr.split(":").map(Number); return (((h * 60 + m) - (7 * 60)) / 60) * 60; };
  const getHeight = (start: string, end: string) => { const [h1, m1] = start.split(":").map(Number); const [h2, m2] = end.split(":").map(Number); return (((h2 * 60 + m2) - (h1 * 60 + m1)) / 60) * 60; };

  return (
    <div ref={scheduleRef} className={`w-full min-w-[800px] p-6 lg:p-10 rounded-2xl border transition-colors duration-300 ${theme.bg} ${theme.text} ${theme.border}`}>
      <div className={`flex justify-between items-end mb-8 border-b-2 pb-6 ${theme.border}`}>
        <div><h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-1">{scheduleInfo.title || "My Schedule"}</h1><p className="text-xs font-bold tracking-[0.2em] opacity-60">JPCS STUDENT TOOLKIT</p></div>
        <div className="text-right"><p className={`text-sm font-bold opacity-50 ${theme.text}`}>{scheduleInfo.subtitle || "AY 2025-2026"}</p></div>
      </div>
      <div className="flex relative">
        <div className={`w-16 flex-shrink-0 border-r-2 pr-2 ${theme.border} sticky left-0 z-30 ${theme.bg}`}>
          <div className="h-10"></div> 
          {HOURS.map(h => (<div key={h} className={`h-[60px] text-[11px] font-bold opacity-40 text-right pt-1 relative`}>{h > 12 ? h - 12 : h} {h >= 12 ? 'PM' : 'AM'}<div className={`absolute top-0 right-[-10px] w-2 h-0.5 ${theme.border.replace('border', 'bg')}`}></div></div>))}
        </div>
        <div className="flex-1 grid grid-cols-6 relative">
          {HOURS.map((h, i) => (<div key={i} className={`absolute w-full h-px z-0 opacity-30 ${theme.border.replace('border', 'bg')}`} style={{ top: `${i * 60 + 40}px` }} />))}
          {DAYS.map((day) => (
            <div key={day} className={`relative border-r last:border-0 ${theme.border}`}>
              <div className={`h-10 text-center text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center opacity-60 pb-2`}>{day.substring(0, 3)}</div>
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