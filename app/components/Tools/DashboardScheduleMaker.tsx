"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaCalendarAlt, FaTimes, FaTrashAlt, 
  FaPalette, FaMobileAlt, FaDesktop, FaImage, FaDownload,
  FaBook, FaCheckCircle, FaUndo, FaRedo, FaCopy,
  FaExclamationTriangle, FaCloudUploadAlt, FaFolderPlus, FaDoorOpen
} from "react-icons/fa";
import { useModal } from "../../context/ModalContext";
import {
  collection, addDoc, serverTimestamp, getDocs, query, where, doc, setDoc, getDoc
} from "firebase/firestore";

import { auth, db } from "@/lib/db";

type Day = 'M' | 'T' | 'W' | 'Th' | 'F' | 'S';
type ClassSession = {
  id: string;
  code: string;
  name: string;
  room: string; // ← NEW
  days: Day[];
  startTime: string; 
  endTime: string;   
  color: string;
};

type ViewMode = 'editor' | 'canvas';
type ThemeMode = 'light' | 'black' | 'blue' | 'pink';
type FormatMode = 'desktop' | 'mobile';

interface TrackerCourse {
  id: string;
  title: string;
}

interface DashboardScheduleMakerProps {
  trackerCourses?: TrackerCourse[];
  /** Called after courses are exported so the tracker can refresh */
  onCoursesExported?: () => void;
}
// Add this state in the component
const PASTEL_COLORS = [
  "bg-rose-200 text-rose-950 border-rose-300",
  "bg-orange-200 text-orange-950 border-orange-300",
  "bg-amber-200 text-amber-950 border-amber-300",
  "bg-emerald-200 text-emerald-950 border-emerald-300",
  "bg-teal-200 text-teal-950 border-teal-300",
  "bg-cyan-200 text-cyan-950 border-cyan-300",
  "bg-blue-200 text-blue-950 border-blue-300",
  "bg-indigo-200 text-indigo-950 border-indigo-300",
  "bg-violet-200 text-violet-950 border-violet-300",
  "bg-purple-200 text-purple-950 border-purple-300",
  "bg-fuchsia-200 text-fuchsia-950 border-fuchsia-300",
  "bg-zinc-200 text-zinc-950 border-zinc-300"
];

// Map pastel class string → a named colour for the tracker colour system
const PASTEL_TO_TRACKER_COLOR: Record<string, string> = {
  "bg-rose-200 text-rose-950 border-rose-300":    "rose",
  "bg-orange-200 text-orange-950 border-orange-300": "amber",
  "bg-amber-200 text-amber-950 border-amber-300": "amber",
  "bg-emerald-200 text-emerald-950 border-emerald-300": "emerald",
  "bg-teal-200 text-teal-950 border-teal-300":    "cyan",
  "bg-cyan-200 text-cyan-950 border-cyan-300":    "cyan",
  "bg-blue-200 text-blue-950 border-blue-300":    "blue",
  "bg-indigo-200 text-indigo-950 border-indigo-300": "blue",
  "bg-violet-200 text-violet-950 border-violet-300": "violet",
  "bg-purple-200 text-purple-950 border-purple-300": "violet",
  "bg-fuchsia-200 text-fuchsia-950 border-fuchsia-300": "rose",
  "bg-zinc-200 text-zinc-950 border-zinc-300":    "emerald",
};

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
const STORAGE_KEY = 'jpcs_schedule_v1';
const MAX_HISTORY = 30;

interface PersistedState {
  classes: ClassSession[];
  termName: string;
  activeTheme: ThemeMode;
  format: FormatMode;
  savedAt: number;
}

// ─── Conflict detection ───────────────────────────────────────────────────────
function detectConflicts(classes: ClassSession[]): Map<string, string[]> {
  const conflicts = new Map<string, string[]>();
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const a = classes[i], b = classes[j];
      const sharedDays = a.days.filter(d => b.days.includes(d));
      if (sharedDays.length === 0) continue;
      const aStart = timeToMin(a.startTime), aEnd = timeToMin(a.endTime);
      const bStart = timeToMin(b.startTime), bEnd = timeToMin(b.endTime);
      if (aStart < bEnd && bStart < aEnd) {
        const addConflict = (id: string, conflictId: string) => {
          const existing = conflicts.get(id) || [];
          if (!existing.includes(conflictId)) conflicts.set(id, [...existing, conflictId]);
        };
        addConflict(a.id, b.id);
        addConflict(b.id, a.id);
      }
    }
  }
  return conflicts;
}

function timeToMin(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ─── Export to Tracker Modal ──────────────────────────────────────────────────
function ExportToTrackerModal({
  isOpen, onClose, classes, existingTitles, onExport,
}: {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassSession[];
  existingTitles: string[];
  onExport: (selected: ClassSession[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen) { setSelected(new Set()); setDone(false); }
  }, [isOpen]);

  const toggle = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleExport = async () => {
    setLoading(true);
    await onExport(classes.filter(c => selected.has(c.id)));
    setLoading(false);
    setDone(true);
    setTimeout(onClose, 1200);
  };

  const formatDays = (days: Day[]) =>
    DAYS_OF_WEEK.filter(d => days.includes(d)).join('·');

  const formatTime12hr = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-7 shadow-2xl z-10 flex flex-col gap-5">

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FaFolderPlus size={17} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">Export to Tracker</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{classes.length} classes in schedule</p>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"><FaTimes size={14} /></button>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
              Selected classes will be created as <span className="font-black text-zinc-700 dark:text-zinc-200">Course Folders</span> in the University Tracker, with their schedule (days, time, room) saved automatically.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {classes.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-sm font-bold">No classes in your schedule yet.</div>
              ) : (
                classes.map((cls) => {
                  const label = cls.code || cls.name || "Untitled";
                  const alreadyExists = existingTitles.some(t =>
                    t.toLowerCase() === label.toLowerCase() || t.toLowerCase() === cls.name.toLowerCase()
                  );
                  const isChecked = selected.has(cls.id);
                  return (
                    <button key={cls.id} type="button" disabled={alreadyExists}
                      onClick={() => !alreadyExists && toggle(cls.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        alreadyExists
                          ? "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed"
                          : isChecked
                          ? "bg-[#06402B]/5 dark:bg-emerald-500/10 border-[#06402B]/30 dark:border-emerald-500/30"
                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-[#06402B]/30 dark:hover:border-emerald-500/30"
                      }`}>
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                        alreadyExists ? "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
                        : isChecked ? "border-[#06402B] dark:border-emerald-500 bg-[#06402B] dark:bg-emerald-500"
                        : "border-zinc-300 dark:border-zinc-700"}`}>
                        {(isChecked || alreadyExists) && <FaCheckCircle size={10} className={alreadyExists ? "text-zinc-400" : "text-white"} />}
                      </div>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[9px] font-black shrink-0 border ${cls.color}`}>
                        {(cls.code || cls.name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 truncate">{label}</p>
                        <p className="text-[10px] font-semibold text-zinc-400 truncate">{cls.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cls.days.length > 0 && (
                            <span className="text-[9px] font-mono font-bold text-zinc-500">{formatDays(cls.days)}</span>
                          )}
                          {cls.startTime && (
                            <span className="text-[9px] font-mono text-zinc-400">{formatTime12hr(cls.startTime)}–{formatTime12hr(cls.endTime)}</span>
                          )}
                          {cls.room && (
                            <span className="text-[9px] font-mono text-zinc-400 flex items-center gap-0.5">
                              <FaDoorOpen size={7}/> {cls.room}
                            </span>
                          )}
                        </div>
                      </div>
                      {alreadyExists && <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Exists</span>}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex gap-2.5">
              <button onClick={onClose} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
              <button onClick={handleExport} disabled={selected.size === 0 || loading || done}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md transition-all disabled:opacity-40 ${done ? "bg-emerald-500 text-white" : "bg-[#06402B] dark:bg-emerald-600 text-white hover:bg-[#0a5a38] dark:hover:bg-emerald-500"}`}>
                {done ? "✓ Exported!" : loading ? "Exporting…" : `Export${selected.size > 0 ? ` (${selected.size})` : ""}`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Import from Tracker Modal ────────────────────────────────────────────────
function ImportTrackerModal({
  isOpen, onClose, trackerCourses, existingCodes, onImport,
}: {
  isOpen: boolean; onClose: () => void; trackerCourses: TrackerCourse[];
  existingCodes: string[]; onImport: (selected: TrackerCourse[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const handleImport = () => {
    onImport(trackerCourses.filter(c => selected.has(c.id)));
    setSelected(new Set());
    onClose();
  };
  const deriveCode = (title: string) => {
    const parts = title.trim().split(/\s+/);
    if (parts.length > 1 && parts[0].length <= 6) return parts[0].toUpperCase();
    return title.slice(0, 7).toUpperCase().replace(/[^A-Z0-9]/g, "");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-7 shadow-2xl z-10 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FaBook size={17} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">Import from Tracker</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{trackerCourses.length} courses available</p>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"><FaTimes size={14} /></button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {trackerCourses.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-sm font-bold">No courses in your tracker yet.</div>
              ) : (
                trackerCourses.map((course, i) => {
                  const code = deriveCode(course.title);
                  const alreadyAdded = existingCodes.includes(code);
                  const isChecked = selected.has(course.id);
                  return (
                    <button key={course.id} type="button" disabled={alreadyAdded} onClick={() => !alreadyAdded && toggleSelect(course.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        alreadyAdded ? "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed"
                        : isChecked ? "bg-[#06402B]/5 dark:bg-emerald-500/10 border-[#06402B]/30 dark:border-emerald-500/30"
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-[#06402B]/30 dark:hover:border-emerald-500/30"}`}>
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                        alreadyAdded ? "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
                        : isChecked ? "border-[#06402B] dark:border-emerald-500 bg-[#06402B] dark:bg-emerald-500"
                        : "border-zinc-300 dark:border-zinc-700"}`}>
                        {(isChecked || alreadyAdded) && <FaCheckCircle size={10} className={alreadyAdded ? "text-zinc-400" : "text-white"} />}
                      </div>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[9px] font-black shrink-0 ${PASTEL_COLORS[i % PASTEL_COLORS.length]}`}>
                        {code.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{course.title}</p>
                        <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase">{code}</p>
                      </div>
                      {alreadyAdded && <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Added</span>}
                    </button>
                  );
                })
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
              Imported courses will be added as class blocks with no days or time set. You can configure those in the editor.
            </p>
            <div className="flex gap-2.5">
              <button onClick={onClose} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
              <button onClick={handleImport} disabled={selected.size === 0}
                className="flex-1 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-md transition-all">
                Import {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Conflict badge ───────────────────────────────────────────────────────────
function ConflictBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-widest">
      <FaExclamationTriangle size={10} />
      {count} schedule conflict{count > 1 ? 's' : ''}
    </motion.div>
  );
}

// ─── Auto-save indicator ─────────────────────────────────────────────────────
function SaveIndicator({ savedAt }: { savedAt: number | null }) {
  if (!savedAt) return null;
  const ago = Math.round((Date.now() - savedAt) / 1000);
  const label = ago < 5 ? "Saved just now" : ago < 60 ? `Saved ${ago}s ago` : "Saved";
  return (
    <motion.div key={savedAt} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
      <FaCloudUploadAlt size={11} /> {label}
    </motion.div>
  );
}

function PasteScheduleModal({
  isOpen, onClose, onImport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (classes: ClassSession[]) => void;
}) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ClassSession[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) { setText(""); setPreview([]); setError(""); }
  }, [isOpen]);

  const DAY_MAP: Record<string, Day[]> = {
    'M':['M'],'T':['T'],'W':['W'],'TH':['Th'],'F':['F'],'S':['S'],
    'MT':['M','T'],'MW':['M','W'],'MF':['M','F'],
    'TTH':['T','Th'],'TF':['T','F'],'WF':['W','F'],
    'MWF':['M','W','F'],'MTWTHF':['M','T','W','Th','F'],
  };

  const toTime = (t: string) => `${t.slice(0,2)}:${t.slice(2,4)}`;

  const parse = (raw: string): ClassSession[] => {
    const results: ClassSession[] = [];
    const seen = new Set<string>();
    const blockRegex = /([A-Z]{2,}\d{2,}[A-Z]?)\s*\n\s*([^\n]+)\s*\n\s*([^\n]*?)\s*-\s*([A-Z]{1,6})(\d{4})-(\d{4})/gm;
    let match;
    while ((match = blockRegex.exec(raw)) !== null) {
      const code = match[1].trim();
      const section = match[2].trim();
      const roomPart = match[3].replace(/^-\s*/, '').trim();
      const dayStr = match[4].toUpperCase();
      const startTime = toTime(match[5]);
      const endTime = toTime(match[6]);
      const key = `${code}-${dayStr}-${startTime}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const days: Day[] = DAY_MAP[dayStr] || [];
      results.push({
        id: `paste-${Date.now()}-${results.length}`,
        code, name: section,
        room: roomPart === '-' || roomPart === '' ? '' : roomPart,
        days, startTime, endTime,
        color: PASTEL_COLORS[results.length % PASTEL_COLORS.length],
      });
    }
    return results;
  };

  const handleParse = () => {
    setError("");
    const parsed = parse(text);
    if (parsed.length === 0) {
      setError("No classes detected. Make sure you copied the full schedule table including course codes, sections, and time patterns like MW0730-0930.");
      setPreview([]);
    } else {
      setPreview(parsed);
    }
  };

  const formatDays = (days: Day[]) => days.join('·');
  const fmt12 = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl z-10 flex flex-col gap-4 max-h-[85dvh] overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FaCalendarAlt size={17} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">Paste Schedule</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Auto-parse from your enrollment sheet</p>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"><FaTimes size={14} /></button>
            </div>

{/* Two-panel layout: paste area OR preview */}
            <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">

              {/* Instructions — hidden once preview is showing to save space */}
              {preview.length === 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shrink-0">
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed">
                    Copy your <span className="font-black text-zinc-700 dark:text-zinc-200">Weekly Schedule</span> from your enrollment system and paste below. Course codes, rooms, days and times will be extracted automatically.
                  </p>
                </div>
              )}

              {/* Textarea — shrinks when preview is shown */}
              {preview.length === 0 ? (
                <textarea
                  value={text}
                  onChange={e => { setText(e.target.value); setPreview([]); setError(""); }}
                  placeholder={"Paste your schedule here...\n\nExample:\nCORE104\nBSCS2A\nRM506 - MW0730-0930"}
                  rows={7}
                  className="flex-1 w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-mono text-zinc-700 dark:text-zinc-300 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 resize-none"
                />
              ) : (
                /* Compact re-paste strip when preview is visible */
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shrink-0">
                  <FaCalendarAlt size={10} className="text-zinc-400 shrink-0"/>
                  <p className="text-[10px] font-bold text-zinc-500 flex-1 truncate">
                    {text.length} chars pasted · {preview.length} classes found
                  </p>
                  <button
                    onClick={() => { setPreview([]); setError(""); }}
                    className="text-[9px] font-black text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 uppercase tracking-widest shrink-0 transition-colors"
                  >
                    Re-paste
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl shrink-0">
                  <FaExclamationTriangle size={11} className="text-red-500 mt-0.5 shrink-0"/>
                  <p className="text-[11px] font-bold text-red-500 leading-relaxed">{error}</p>
                </div>
              )}

              {/* Preview list — scrollable, fills remaining space */}
              {preview.length > 0 && (
                <div className="flex-1 overflow-y-auto min-h-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  {/* Sticky header */}
                  <div className="sticky top-0 flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-10">
                    <p className="text-[10px] font-black text-[#06402B] dark:text-emerald-400 uppercase tracking-widest">
                      {preview.length} classes detected
                    </p>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Review before adding</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {preview.map((cls, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-[#06402B]/30 transition-colors">
                        {/* Color swatch */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 border ${cls.color}`}>
                          {cls.code.slice(0,2)}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-xs font-black text-zinc-800 dark:text-zinc-200 truncate">{cls.code}</p>
                            {cls.days.length > 0 && (
                              <span className="shrink-0 text-[9px] font-black text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md font-mono">
                                {formatDays(cls.days)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-medium text-zinc-400 truncate">{cls.name}</span>
                            {cls.startTime && (
                              <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                                {fmt12(cls.startTime)}–{fmt12(cls.endTime)}
                              </span>
                            )}
                            {cls.room && (
                              <span className="text-[9px] font-mono text-zinc-400 flex items-center gap-0.5 shrink-0">
                                <FaDoorOpen size={7}/>{cls.room}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
{/* Footer buttons */}
            <div className="flex gap-2.5 shrink-0">
              <button onClick={onClose}
                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                Cancel
              </button>
              {preview.length === 0 ? (
                <button onClick={handleParse} disabled={!text.trim()}
                  className="flex-1 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-md transition-all">
                  Parse Schedule
                </button>
              ) : (
                <button onClick={() => { onImport(preview); onClose(); }}
                  className="flex-1 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-md transition-all flex items-center justify-center gap-2">
                  <FaCheckCircle size={12}/> Add {preview.length} Class{preview.length !== 1 ? "es" : ""}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardScheduleMaker({ trackerCourses = [], onCoursesExported }: DashboardScheduleMakerProps) {
  const { showAlert, showConfirm } = useModal();

  const [classes, setClassesRaw] = useState<ClassSession[]>([]);
  const [termName, setTermNameRaw] = useState("2nd Term, A.Y. 2025-2026");
  const [activeTheme, setActiveTheme] = useState<ThemeMode>('light');
  const [format, setFormat] = useState<FormatMode>('desktop');

  const [view, setView] = useState<ViewMode>('editor');
  const [isExporting, setIsExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false); // ← NEW
  const [wallpaperMode, setWallpaperMode] = useState<'lockscreen' | 'homescreen'>('lockscreen');
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [history, setHistory] = useState<ClassSession[][]>([]);
  const [future, setFuture] = useState<ClassSession[][]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
const [pasteText, setPasteText] = useState("");
const [parsePreview, setParsePreview] = useState<ClassSession[]>([]);
const [parsError, setParsError] = useState("");

  // ── Hydrate ──────────────────────────────────────────────
// ── Hydrate — Firestore first, localStorage fallback ─────
  useEffect(() => {
    const load = async () => {
      let loaded = false;

      // 1. Try Firestore first (works across devices)
      try {
        const uid = auth.currentUser?.uid;
        if (uid) {
          const snap = await getDoc(doc(db, "schedules", uid));
          if (snap.exists()) {
            const data = snap.data();
            // Use Firestore data if it's newer than localStorage
            const localRaw = localStorage.getItem(STORAGE_KEY);
            const localSavedAt = localRaw ? (JSON.parse(localRaw).savedAt || 0) : 0;
            const remoteSavedAt = data.savedAt || 0;

            if (remoteSavedAt >= localSavedAt) {
setClassesRaw((data.classes || []).map((c: ClassSession) => ({ ...c, room: c.room ?? '' })));
              setTermNameRaw(data.termName || "2nd Term, A.Y. 2025-2026");
              setActiveTheme(data.activeTheme || 'light');
              setFormat(data.format || 'desktop');
              setSavedAt(data.savedAt || null);
              // Sync localStorage with Firestore data
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data })); } catch { /* ignore */ }
              loaded = true;
            }
          }
        }
      } catch (err) {
        console.warn("Firestore schedule load failed, falling back to localStorage:", err);
      }

      // 2. Fall back to localStorage if Firestore had nothing or failed
      if (!loaded) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed: PersistedState = JSON.parse(raw);
            setClassesRaw((parsed.classes || []).map(c => ({ ...c, room: c.room ?? '' })));
            setTermNameRaw(parsed.termName || "2nd Term, A.Y. 2025-2026");
            setActiveTheme(parsed.activeTheme || 'light');
            setFormat(parsed.format || 'desktop');
            setSavedAt(parsed.savedAt || null);
            loaded = true;
          }
        } catch { /* ignore */ }
      }

      // 3. Neither had data — show defaults
      if (!loaded) {
        setClassesRaw([
          { id: '1', code: 'CS101', name: 'Intro to Computing', room: 'GK-101', days: ['M', 'W'], startTime: '08:00', endTime: '09:30', color: PASTEL_COLORS[3] },
          { id: '2', code: 'MATH20', name: 'Discrete Mathematics', room: 'AGN-301', days: ['T', 'Th'], startTime: '10:00', endTime: '12:00', color: PASTEL_COLORS[6] }
        ]);
      }

      setHydrated(true);
    };

    // Wait for auth to be ready before loading
    const unsub = auth.onAuthStateChanged(() => {
      load();
      unsub(); // only run once
    });
  }, []);

  // ── Persist ──────────────────────────────────────────────
const persist = useCallback((cls: ClassSession[], name: string, theme: ThemeMode, fmt: FormatMode) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const now = Date.now();
      const state: PersistedState = { classes: cls, termName: name, activeTheme: theme, format: fmt, savedAt: now };

      // Always save to localStorage as fast local cache
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setSavedAt(now);
      } catch { /* quota */ }

      // Also save to Firestore if logged in
      try {
        const uid = auth.currentUser?.uid;
        if (uid) {
          await setDoc(doc(db, "schedules", uid), {
            classes: cls,
            termName: name,
            activeTheme: theme,
            format: fmt,
            savedAt: now,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn("Firestore schedule save failed:", err);
      }
    }, 800);
  }, []);

  const pushHistory = useCallback((prev: ClassSession[]) => {
    setHistory(h => [...h.slice(-MAX_HISTORY), prev]);
    setFuture([]);
  }, []);

  const setClasses = useCallback((updater: ClassSession[] | ((prev: ClassSession[]) => ClassSession[]), skipHistory = false) => {
    setClassesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!skipHistory) pushHistory(prev);
      persist(next, termName, activeTheme, format);
      return next;
    });
  }, [termName, activeTheme, format, persist, pushHistory]);

  const setTermName = useCallback((name: string) => {
    setTermNameRaw(name);
    persist(classes, name, activeTheme, format);
  }, [classes, activeTheme, format, persist]);

  const handleThemeChange = useCallback((t: ThemeMode) => {
    setActiveTheme(t);
    persist(classes, termName, t, format);
  }, [classes, termName, format, persist]);

  const handleFormatChange = useCallback((f: FormatMode) => {
    setFormat(f);
    persist(classes, termName, activeTheme, f);
  }, [classes, termName, activeTheme, persist]);

  // ── Undo / Redo ──────────────────────────────────────────
  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture(f => [classes, ...f]);
    setHistory(h => h.slice(0, -1));
    setClassesRaw(prev);
    persist(prev, termName, activeTheme, format);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(h => [...h, classes]);
    setFuture(f => f.slice(1));
    setClassesRaw(next);
    persist(next, termName, activeTheme, format);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Conflicts ────────────────────────────────────────────
  const conflicts = detectConflicts(classes);
  const conflictPairs = new Set<string>();
  conflicts.forEach((vals, key) => vals.forEach(v => conflictPairs.add([key, v].sort().join('|'))));

  // ── Image upload ─────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setBgImage(URL.createObjectURL(e.target.files[0]));
  };

  // ── Class CRUD ───────────────────────────────────────────
  const addClass = () => {
    setClasses(prev => [...prev, {
      id: Date.now().toString(), code: '', name: '', room: '',
      days: [], startTime: '08:00', endTime: '09:00',
      color: PASTEL_COLORS[prev.length % PASTEL_COLORS.length]
    }]);
  };

  const duplicateClass = (cls: ClassSession) => {
    setClasses(prev => [...prev, { ...cls, id: Date.now().toString(), code: cls.code + '_2' }]);
  };

  const handleImportFromTracker = (selected: TrackerCourse[]) => {
    const deriveCode = (title: string) => {
      const parts = title.trim().split(/\s+/);
      if (parts.length > 1 && parts[0].length <= 6) return parts[0].toUpperCase();
      return title.slice(0, 7).toUpperCase().replace(/[^A-Z0-9]/g, "");
    };
    setClasses(prev => [...prev, ...selected.map((course, i) => ({
      id: `tracker-${course.id}-${Date.now()}`,
      code: deriveCode(course.title), name: course.title, room: '',
      days: [] as Day[], startTime: "08:00", endTime: "09:00",
      color: PASTEL_COLORS[(prev.length + i) % PASTEL_COLORS.length],
    }))]);
  };

  // ── NEW: Export to Tracker (Firestore) ───────────────────
  const handleExportToTracker = async (selected: ClassSession[]) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    // Fetch existing course titles to avoid duplication
    const existing = await getDocs(query(collection(db, "courses"), where("userId", "==", uid)));
    const existingTitles = existing.docs.map(d => (d.data().title as string).toLowerCase());

    for (const cls of selected) {
      const title = cls.name?.trim() || cls.code?.trim() || "Untitled Course";
      if (existingTitles.includes(title.toLowerCase())) continue;

      const trackerColor = PASTEL_TO_TRACKER_COLOR[cls.color] ?? "emerald";

      await addDoc(collection(db, "courses"), {
        userId: uid,
        title,
        color: trackerColor,
        // Schedule metadata stored on the course document
        scheduleCode: cls.code,
        scheduleDays: cls.days,
        scheduleStartTime: cls.startTime,
        scheduleEndTime: cls.endTime,
        scheduleRoom: cls.room,
        createdAt: serverTimestamp(),
      });
    }

    onCoursesExported?.();
  };

  const updateClass = (id: string, field: keyof ClassSession, value: any) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeClass = (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
  };

  const toggleDay = (id: string, day: Day) => {
    setClasses(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newDays = c.days.includes(day) ? c.days.filter(d => d !== day) : [...c.days, day];
      return { ...c, days: newDays };
    }));
  };

  const cycleColor = (id: string, currentColor: string) => {
    const nextIndex = (PASTEL_COLORS.indexOf(currentColor) + 1) % PASTEL_COLORS.length;
    updateClass(id, 'color', PASTEL_COLORS[nextIndex]);
  };

  const clearAll = () => {
    showConfirm(
      "Clear All Classes",
      "This will remove all classes from your schedule. This action can be undone with Ctrl+Z.",
      () => setClasses([]),
      "Clear All",
      false
    );
  };

  // ── Position helpers ─────────────────────────────────────
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

  const sortClassesByTime = (dayClasses: ClassSession[]) =>
    [...dayClasses].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime));

  // ── Export JPG ───────────────────────────────────────────
  const downloadJPG = async () => {
    setIsExporting(true);
    try {
      const { toJpeg } = await import('html-to-image');
      const element = document.getElementById('schedule-canvas');
      if (!element) return;
      const dataUrl = await toJpeg(element, {
        quality: 1.0, pixelRatio: format === 'mobile' ? 4 : 2,
        backgroundColor: activeTheme === 'black' ? '#09090b' : activeTheme === 'blue' ? '#0f172a' : activeTheme === 'pink' ? '#fff1f2' : '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `${termName || 'My_Schedule'}_${format}.jpg`;
      link.href = dataUrl; link.click();
    } catch (err) {
      showAlert("Export Failed", "Failed to export. Ensure 'html-to-image' is installed.");
    } finally { setIsExporting(false); }
  };

  if (!hydrated) return (
    <div className="flex items-center justify-center py-20">
      <span className="w-8 h-8 rounded-full border-4 border-[#06402B]/30 border-t-[#06402B] animate-spin" />
    </div>
  );

  const parseScheduleText = (text: string): ClassSession[] => {
  const results: ClassSession[] = [];
  const seen = new Set<string>();

  // Pattern: COURSECODE\nSECTION\nRM... - DAYS TIME-TIME  or  - - DAYS TIME-TIME
  const blockRegex = /([A-Z]{2,}\d{2,}[A-Z]?)\s*\n\s*([A-Z0-9]+)\s*\n\s*(.+?)\s*-\s*([A-Z]{1,6})(\d{4})-(\d{4})/gm;

  const DAY_MAP: Record<string, Day[]> = {
    'M':   ['M'],
    'T':   ['T'],
    'W':   ['W'],
    'TH':  ['Th'],
    'F':   ['F'],
    'S':   ['S'],
    'MT':  ['M','T'],
    'MW':  ['M','W'],
    'MF':  ['M','F'],
    'TTH': ['T','Th'],
    'TF':  ['T','F'],
    'WF':  ['W','F'],
    'MWF': ['M','W','F'],
    'MTWTHF': ['M','T','W','Th','F'],
  };

  const toTime = (t: string) => {
    const h = t.slice(0, 2);
    const m = t.slice(2, 4);
    return `${h}:${m}`;
  };

  let match;
  while ((match = blockRegex.exec(text)) !== null) {
    const code = match[1].trim();
    const section = match[2].trim();
    const roomPart = match[3].trim();
    const dayStr = match[4].toUpperCase();
    const startTime = toTime(match[5]);
    const endTime = toTime(match[6]);

    const key = `${code}-${dayStr}-${startTime}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const days: Day[] = DAY_MAP[dayStr] || [];
    const room = roomPart.replace(/^-\s*/, '').trim();

    results.push({
      id: `paste-${Date.now()}-${results.length}`,
      code,
      name: section,
      room: room === '-' ? '' : room,
      days,
      startTime,
      endTime,
      color: PASTEL_COLORS[results.length % PASTEL_COLORS.length],
    });
  }

  return results;
};

  // ==========================================
  // VIEW: EDITOR
  // ==========================================
  if (view === 'editor') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 w-full">

        <ImportTrackerModal
          isOpen={showImportModal} onClose={() => setShowImportModal(false)}
          trackerCourses={trackerCourses} existingCodes={classes.map(c => c.code)}
          onImport={handleImportFromTracker}
        />

        {/* ← NEW: Export to Tracker modal */}
        <ExportToTrackerModal
          isOpen={showExportModal} onClose={() => setShowExportModal(false)}
          classes={classes}
          existingTitles={trackerCourses.map(c => c.title)}
          onExport={handleExportToTracker}
        />
        {/* In the editor JSX, alongside ImportTrackerModal */}
<PasteScheduleModal
  isOpen={showPasteModal}
  onClose={() => setShowPasteModal(false)}
  onImport={(parsed) => setClasses(prev => [...prev, ...parsed])}
/>

        {/* Header Block */}
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-5 sm:p-6 md:p-8 shadow-xl flex flex-col lg:flex-row justify-between gap-6 relative overflow-hidden transition-colors duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#06402B]/10 blur-[100px] rounded-full pointer-events-none" />

          <div className="flex-1 space-y-3 sm:space-y-4 relative z-10 w-full">
            <input
              type="text" placeholder="Term / Semester Name"
              value={termName} onChange={e => setTermName(e.target.value)}
              className="w-full text-2xl md:text-4xl font-black bg-transparent border-none outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-white tracking-tight"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#06402B]">
                {classes.length} Classes
              </div>
              {trackerCourses.length > 0 && (
                <button onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#06402B]/10 dark:bg-emerald-500/10 border border-[#06402B]/20 dark:border-emerald-500/20 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#06402B] dark:text-emerald-400 hover:bg-[#06402B]/20 dark:hover:bg-emerald-500/20 transition-colors">
                  <FaBook size={10} /> Import from Tracker ({trackerCourses.length})
                </button>
                
              )}
              {/* Button in the header, alongside Import from Tracker */}
<button onClick={() => setShowPasteModal(true)}
  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
  <FaCalendarAlt size={10} /> Paste Schedule
</button>
              {/* ← NEW: Export to Tracker button */}
              {classes.length > 0 && (
                <button onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors">
                  <FaFolderPlus size={10} /> Export to Tracker
                </button>
              )}
              <ConflictBadge count={conflictPairs.size} />
              <SaveIndicator savedAt={savedAt} />
            </div>
          </div>

          <div className="shrink-0 relative z-10 flex flex-col sm:flex-row lg:flex-col justify-end gap-3 w-full lg:w-auto">
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={undo} disabled={history.length === 0} title="Undo (Ctrl+Z)"
                className="flex-1 lg:flex-none px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition-all text-[10px] sm:text-xs">
                <FaUndo size={12} /> <span className="hidden sm:inline">Undo</span>
              </button>
              <button onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)"
                className="flex-1 lg:flex-none px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition-all text-[10px] sm:text-xs">
                <FaRedo size={12} /> <span className="hidden sm:inline">Redo</span>
              </button>
            </div>

            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => fileInputRef.current?.click()}
                className="flex-1 lg:w-full px-4 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-[10px] sm:text-xs">
                <FaImage size={14} /> {bgImage ? 'Change Image' : 'Add Background'}
              </button>
              {bgImage && (
                <button onClick={() => setBgImage(null)} className="px-4 py-3 bg-red-500/10 text-red-500 rounded-2xl font-bold hover:bg-red-500/20 transition-colors">
                  <FaTrashAlt size={14} />
                </button>
              )}
            </div>

            <button onClick={() => {
              if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
                try {
                  const state = { classes, termName, activeTheme, format, savedAt: Date.now() };
                  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                  setSavedAt(state.savedAt);
                } catch { /* ignore */ }
              }
              setView('canvas');
            }}
              className="w-full sm:w-auto lg:w-full px-6 sm:px-8 py-3 bg-[#06402B] text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(6,64,43,0.3)] text-[10px] sm:text-xs">
              <FaCalendarAlt size={14} /> View Timetable
            </button>
          </div>
        </div>

        {/* Class Input List */}
        <div className="space-y-4 w-full">
          <AnimatePresence>
            {classes.map((cls) => {
              const hasConflict = conflicts.has(cls.id);
              return (
                <motion.div
                  key={cls.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border rounded-[1.5rem] p-4 sm:p-5 flex flex-col gap-4 group transition-colors w-full shadow-sm ${
                    hasConflict
                      ? 'border-red-400/50 dark:border-red-500/40'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-[#06402B]/30'
                  }`}
                >
                  {hasConflict && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[9px] font-black uppercase tracking-widest w-full">
                      <FaExclamationTriangle size={9} /> Time conflict detected
                    </div>
                  )}

                  {/* Row 1: Color + Code + Name */}
                  <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex items-center gap-3 w-full lg:w-48 shrink-0">
                      <button onClick={() => cycleColor(cls.id, cls.color)} title="Click to change color"
                        className={`w-12 h-12 lg:w-10 lg:h-10 rounded-xl lg:rounded-full ${cls.color} flex items-center justify-center transition-all shadow-inner shrink-0 border-2 hover:scale-110 active:scale-90`}>
                        <FaPalette size={14} className="opacity-60" />
                      </button>
                      <input
                        type="text" placeholder="Code" value={cls.code}
                        onChange={(e) => updateClass(cls.id, 'code', e.target.value)}
                        className="flex-1 lg:w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-black text-zinc-900 dark:text-zinc-100 p-3 sm:p-4 lg:p-3 rounded-xl focus:border-[#06402B] transition-colors uppercase text-sm sm:text-base"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <input
                        type="text" placeholder="Course Name" value={cls.name}
                        onChange={(e) => updateClass(cls.id, 'name', e.target.value)}
                        className="w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-bold text-zinc-700 dark:text-zinc-300 p-3 sm:p-4 lg:p-3 rounded-xl focus:border-[#06402B] transition-colors text-sm sm:text-base"
                      />
                    </div>
                    {/* ← NEW: Room field */}
                    <div className="w-full lg:w-36 shrink-0">
                      <div className="relative">
                        <FaDoorOpen size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
                        <input
                          type="text" placeholder="Room" value={cls.room}
                          onChange={(e) => updateClass(cls.id, 'room', e.target.value)}
                          className="w-full pl-8 bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-bold text-zinc-700 dark:text-zinc-300 p-3 sm:p-4 lg:p-3 rounded-xl focus:border-[#06402B] transition-colors text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Days + Times + Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Day toggles */}
                    <div className="flex justify-between sm:justify-center items-center gap-1 sm:gap-2 bg-zinc-100 dark:bg-zinc-950/50 p-2 sm:p-3 lg:p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex-1 sm:flex-none">
                      {DAYS_OF_WEEK.map(day => {
                        const isActive = cls.days.includes(day);
                        return (
                          <button key={day} onClick={() => toggleDay(cls.id, day)}
                            className={`flex-1 sm:w-10 sm:h-10 lg:w-8 lg:h-8 py-2 sm:py-0 rounded-lg text-xs sm:text-sm lg:text-xs font-black transition-all border ${
                              isActive ? `${cls.color} shadow-sm` : 'border-transparent text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}>
                            {day}
                          </button>
                        );
                      })}
                    </div>

                    {/* Times */}
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time" value={cls.startTime}
                        onChange={(e) => updateClass(cls.id, 'startTime', e.target.value)}
                        className="flex-1 bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-bold text-zinc-700 dark:text-zinc-300 p-3 sm:p-4 lg:p-2.5 rounded-xl focus:border-[#06402B] text-center text-sm sm:text-base"
                      />
                      <span className="text-zinc-400 font-bold shrink-0">–</span>
                      <input
                        type="time" value={cls.endTime}
                        onChange={(e) => updateClass(cls.id, 'endTime', e.target.value)}
                        className="flex-1 bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-bold text-zinc-700 dark:text-zinc-300 p-3 sm:p-4 lg:p-2.5 rounded-xl focus:border-[#06402B] text-center text-sm sm:text-base"
                      />
                    </div>

                    {/* Duplicate + Delete */}
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => duplicateClass(cls)} title="Duplicate class"
                        className="flex-1 sm:flex-none bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest">
                        <span className="sm:hidden">Duplicate</span><FaCopy size={13} />
                      </button>
                      <button onClick={() => removeClass(cls.id)} title="Remove class"
                        className="flex-1 sm:flex-none bg-red-500/10 text-red-500 hover:text-red-600 hover:bg-red-500/20 transition-colors p-3 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest">
                        <span className="sm:hidden">Remove</span><FaTrashAlt size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {classes.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
              <FaCalendarAlt size={28} className="opacity-30" />
              <p className="text-sm font-bold uppercase tracking-widest">No classes yet</p>
              <p className="text-xs text-zinc-400 font-medium">Add a class below or import from your Tracker</p>
            </motion.div>
          )}

          <div className="flex gap-3">
            <button onClick={addClass}
              className="flex-1 py-5 sm:py-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[1.5rem] text-zinc-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:border-[#06402B] hover:text-[#06402B] hover:bg-[#06402B]/5 transition-all flex items-center justify-center gap-2">
              <FaPlus size={12} /> Add New Class
            </button>
            {classes.length > 0 && (
              <button onClick={clearAll}
                className="px-5 py-5 sm:py-6 border-2 border-dashed border-red-200 dark:border-red-900/40 rounded-[1.5rem] text-red-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:border-red-400 hover:bg-red-500/5 transition-all flex items-center justify-center gap-2">
                <FaTrashAlt size={12} /> <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>

          <p className="text-center text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-widest pt-2">
            Ctrl+Z to undo · Ctrl+Y to redo · Changes auto-saved
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: CANVAS & EXPORT
  // ==========================================
  if (view === 'canvas') {
    const currentTheme = THEME_STYLES[activeTheme];

    return (
      <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 flex flex-col transition-colors duration-300">

        {/* TOP HEADER */}
        <div className="h-16 md:h-20 border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-4 md:px-8 flex items-center justify-between shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-30">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
            <button onClick={() => setView('editor')}
              className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-zinc-500 shrink-0">
              <FaTimes size={14} />
            </button>
            <div className="min-w-0">
              <h3 className="font-black text-xs sm:text-sm md:text-lg uppercase tracking-tight truncate text-zinc-900 dark:text-white">{termName || "My Schedule"}</h3>
              <p className="text-[8px] sm:text-[9px] md:text-[10px] font-mono font-bold text-[#06402B] uppercase tracking-widest truncate">Preview & Export</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {/* ← NEW: Export to Tracker button in canvas view */}
            <button onClick={() => setShowExportModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-violet-500/20 transition-colors">
              <FaFolderPlus size={11}/> To Tracker
            </button>

            <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-xl">
              <button onClick={() => handleFormatChange('desktop')}
                className={`px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${format === 'desktop' ? 'bg-white dark:bg-zinc-950 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                <FaDesktop size={12} /> <span className="hidden sm:inline">Desktop</span>
              </button>
              <button onClick={() => handleFormatChange('mobile')}
                className={`px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${format === 'mobile' ? 'bg-white dark:bg-zinc-950 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                <FaMobileAlt size={12} /> <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            {format === 'mobile' && (
              <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-xl">
                <button onClick={() => setWallpaperMode('lockscreen')}
                  className={`px-2.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${wallpaperMode === 'lockscreen' ? 'bg-white dark:bg-zinc-950 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                  Lock
                </button>
                <button onClick={() => setWallpaperMode('homescreen')}
                  className={`px-2.5 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${wallpaperMode === 'homescreen' ? 'bg-white dark:bg-zinc-950 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                  Home
                </button>
              </div>
            )}

            <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 hidden md:block" />

            <button onClick={downloadJPG} disabled={isExporting}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 md:px-5 py-2 md:py-2.5 bg-[#06402B] text-white font-bold text-[10px] sm:text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 shrink-0">
              <FaDownload size={14} /> <span className="hidden sm:inline">{isExporting ? "Saving..." : "Export JPG"}</span>
            </button>
          </div>
        </div>

        {/* Export modal accessible from canvas view too */}
        <ExportToTrackerModal
          isOpen={showExportModal} onClose={() => setShowExportModal(false)}
          classes={classes}
          existingTitles={trackerCourses.map(c => c.title)}
          onExport={handleExportToTracker}
        />

        {/* MAIN LAYOUT */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative w-full">

          {/* THEME SIDEBAR */}
          <div className="w-full md:w-20 shrink-0 flex md:flex-col items-center md:justify-center gap-4 p-3 md:p-0 md:border-r border-b md:border-b-0 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md z-20 transition-colors overflow-x-auto">
            <span className="md:hidden text-[9px] font-bold text-zinc-500 uppercase tracking-widest shrink-0 ml-2">Theme:</span>
            {([
              { id: 'light', color: 'bg-white border-zinc-300' },
              { id: 'black', color: 'bg-zinc-950 border-zinc-700' },
              { id: 'blue', color: 'bg-slate-900 border-slate-700' },
              { id: 'pink', color: 'bg-rose-100 border-rose-300' }
            ] as { id: ThemeMode; color: string }[]).map((t) => (
              <button key={t.id} onClick={() => handleThemeChange(t.id)} title={`${t.id} theme`}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 shrink-0 transition-all ${t.color} ${activeTheme === t.id ? 'scale-110 shadow-[0_0_15px_rgba(0,0,0,0.2)] ring-2 ring-[#06402B] ring-offset-2 dark:ring-offset-zinc-900' : 'hover:scale-105 opacity-80'}`}
              />
            ))}
          </div>

          {/* CANVAS */}
          <div className="flex-1 overflow-auto p-4 md:p-8 flex md:items-start justify-center bg-zinc-100/50 dark:bg-black/20 w-full relative">
            {format === 'desktop' && (
              <div className="md:hidden absolute top-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] font-bold px-4 py-1.5 rounded-full z-40 backdrop-blur-md animate-pulse whitespace-nowrap pointer-events-none">
                Scroll horizontally ↔
              </div>
            )}

            <div
              id="schedule-canvas"
              className={`relative transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${!bgImage && currentTheme.bg} ${currentTheme.border} border shadow-2xl overflow-hidden shrink-0 flex flex-col ${
                format === 'desktop'
                  ? 'w-full min-w-250 max-w-7xl rounded-4xl p-8 md:p-10 h-250'
                  : 'w-90 h-195 rounded-[2.5rem] border-8 shadow-[0_0_50px_rgba(0,0,0,0.15)] overflow-hidden'
              }`}
              style={{ backgroundImage: bgImage ? `url(${bgImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              {bgImage && (
                <div className={`absolute inset-0 z-0 backdrop-blur-md ${activeTheme === 'black' ? 'bg-black/70' : activeTheme === 'blue' ? 'bg-slate-900/70' : activeTheme === 'pink' ? 'bg-rose-100/70' : 'bg-white/70'}`} />
              )}

              {/* ── DESKTOP CANVAS ── */}
              {format === 'desktop' ? (
                <>
                  <div className="mb-8 text-center relative z-10">
                    <h2 className={`font-black uppercase tracking-tight text-3xl md:text-4xl ${currentTheme.text}`}>{termName || "My Schedule"}</h2>
                    <p className={`font-mono font-bold uppercase tracking-widest text-xs mt-1 ${currentTheme.text} opacity-80`}>Lasallian Hub</p>
                  </div>

                  <div className="grid grid-cols-7 gap-4 mb-4 shrink-0 relative z-10">
                    <div className="col-span-1" />
                    {DAYS_OF_WEEK.map(day => {
                      const fullDay = { 'M':'Monday', 'T':'Tuesday', 'W':'Wednesday', 'Th':'Thursday', 'F':'Friday', 'S':'Saturday' }[day];
                      return (
                        <div key={day} className={`col-span-1 text-center py-3 rounded-xl border ${currentTheme.border} ${bgImage ? 'bg-black/10 dark:bg-white/10 backdrop-blur-sm' : currentTheme.header}`}>
                          <p className={`font-black uppercase tracking-wider text-sm ${currentTheme.text}`}>{fullDay}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-7 gap-4 relative flex-1 z-10">
                    <div className={`col-span-1 flex flex-col justify-between border-r border-dashed ${currentTheme.border} pr-4`}>
                      {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                        const hour = START_HOUR + i;
                        const ampm = hour >= 12 ? 'PM' : 'AM';
                        const displayHr = hour > 12 ? hour - 12 : hour;
                        return (
                          <div key={i} className={`text-right font-mono font-bold uppercase relative -top-2 text-[10px] ${currentTheme.text} opacity-70`}>
                            {displayHr}:00 {ampm}
                          </div>
                        );
                      })}
                    </div>

                    <div className="absolute inset-0 left-[calc(100%/7)] right-0 pointer-events-none flex flex-col justify-between z-0">
                      {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
                        <div key={i} className={`w-full h-px ${bgImage ? 'bg-black/10 dark:bg-white/10' : currentTheme.grid}`} />
                      ))}
                    </div>

                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day} className={`col-span-1 relative z-10 h-full border-r border-dashed ${currentTheme.border} last:border-0`}>
                        {classes.filter(c => c.days.includes(day)).map(cls => {
                          const pos = getPositionStyle(cls.startTime, cls.endTime);
                          const hasConflict = conflicts.has(cls.id);
                          return (
                            <div
                              key={`${cls.id}-${day}`}
                              className={`absolute left-0 right-0 mx-1 rounded-xl shadow-sm border flex flex-col overflow-hidden p-3 transition-all ${cls.color} ${hasConflict ? 'ring-2 ring-red-500' : ''}`}
                              style={{ top: pos.top, height: pos.height }}
                            >
                              <h4 className="font-black leading-tight text-sm truncate">{cls.code}</h4>
                              <p className="font-bold uppercase tracking-widest mt-0.5 text-[10px] truncate opacity-90">{cls.name}</p>
                              {/* ← NEW: Room shown on canvas block */}
                              {cls.room && (
                                <p className="font-mono text-[9px] opacity-70 truncate mt-0.5 flex items-center gap-0.5">
                                  <FaDoorOpen size={7}/> {cls.room}
                                </p>
                              )}
                              <p className="font-mono font-bold mt-auto opacity-80 text-[10px] truncate">
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
                /* ── MOBILE CANVAS ── */
                <div className="flex flex-col h-full w-full relative z-10">
                  {wallpaperMode === 'lockscreen' ? (
                    <div className="flex flex-col h-full w-full relative z-10 justify-end">
                      <div className="flex flex-col gap-1.5 px-4 pt-2 pb-6 overflow-hidden">
                        <div className={`flex items-center justify-between mb-1 ${currentTheme.text}`}>
                          <p className="text-[8px] font-black uppercase tracking-[0.25em] opacity-60">{termName}</p>
                          <p className="text-[7px] font-mono opacity-30">JPCS DLSAU</p>
                        </div>

                        {DAYS_OF_WEEK.map(day => {
                          const dayClasses = sortClassesByTime(classes.filter(c => c.days.includes(day)));
                          if (dayClasses.length === 0) return null;
                          const fullDay = { 'M':'MON','T':'TUE','W':'WED','Th':'THU','F':'FRI','S':'SAT' }[day];
                          return (
                            <div key={day} className={`flex gap-1.5 items-stretch rounded-xl overflow-hidden border ${currentTheme.border}`}>
                              <div className={`w-9 shrink-0 flex items-center justify-center ${activeTheme === 'light' ? 'bg-zinc-900' : activeTheme === 'pink' ? 'bg-rose-300' : 'bg-white/10'}`}>
                                <span className={`text-[7px] font-black uppercase tracking-widest ${activeTheme === 'light' ? 'text-white' : currentTheme.text}`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                  {fullDay}
                                </span>
                              </div>
                              <div className="flex-1 flex flex-col gap-1 py-1 pr-2 min-w-0">
                                {dayClasses.map(c => (
                                  <div key={c.id} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${c.color} ${conflicts.has(c.id) ? 'ring-1 ring-red-500' : ''}`}>
                                    {c.room && <span className="shrink-0 text-[7px] font-black font-mono bg-black/15 px-1 py-0.5 rounded">{c.room}</span>}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[9px] font-black leading-none truncate">{c.code}</p>
                                      <p className="text-[7px] font-bold opacity-70 leading-none truncate mt-0.5 uppercase">{c.name}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="text-[7px] font-mono font-bold opacity-80 leading-none">{formatTime12hr(c.startTime)}</p>
                                      <p className="text-[7px] font-mono font-bold opacity-80 leading-none mt-0.5">{formatTime12hr(c.endTime)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full px-4 pt-8 pb-28 gap-1.5">
                      <div className={`flex items-center justify-between mb-1 ${currentTheme.text}`}>
                        <p className="text-[8px] font-black uppercase tracking-[0.25em] opacity-60">{termName}</p>
                        <p className="text-[7px] font-mono opacity-30">JPCS DLSAU</p>
                      </div>

                      {DAYS_OF_WEEK.map(day => {
                        const dayClasses = sortClassesByTime(classes.filter(c => c.days.includes(day)));
                        if (dayClasses.length === 0) return null;
                        const fullDay = { 'M':'MON','T':'TUE','W':'WED','Th':'THU','F':'FRI','S':'SAT' }[day];
                        return (
                          <div key={day} className={`flex gap-1.5 items-stretch rounded-xl overflow-hidden border ${currentTheme.border}`}>
                            <div className={`w-9 shrink-0 flex items-center justify-center ${activeTheme === 'light' ? 'bg-zinc-900' : activeTheme === 'pink' ? 'bg-rose-300' : 'bg-white/10'}`}>
                              <span className={`text-[7px] font-black uppercase tracking-widest ${activeTheme === 'light' ? 'text-white' : currentTheme.text}`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                {fullDay}
                              </span>
                            </div>
                            <div className="flex-1 flex flex-col gap-1 py-1 pr-2 min-w-0">
                              {dayClasses.map(c => (
                                <div key={c.id} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${c.color} ${conflicts.has(c.id) ? 'ring-1 ring-red-500' : ''}`}>
                                  {c.room && <span className="shrink-0 text-[7px] font-black font-mono bg-black/15 px-1 py-0.5 rounded">{c.room}</span>}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-black leading-none truncate">{c.code}</p>
                                    <p className="text-[7px] font-bold opacity-70 leading-none truncate mt-0.5 uppercase">{c.name}</p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-[7px] font-mono font-bold opacity-80 leading-none">{formatTime12hr(c.startTime)}</p>
                                    <p className="text-[7px] font-mono font-bold opacity-80 leading-none mt-0.5">{formatTime12hr(c.endTime)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      <div className={`mt-auto pt-2 text-center opacity-15 ${currentTheme.text}`}>
                        <p className="text-[6px] font-mono uppercase tracking-widest">dock area</p>
                      </div>
                    </div>
                  )}
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