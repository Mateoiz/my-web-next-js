"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaCalendarAlt, FaTimes, FaTrashAlt, 
  FaPalette, FaMobileAlt, FaDesktop, FaImage, FaDownload,
  FaBook, FaCheckCircle
} from "react-icons/fa";
import { useModal } from "../../context/ModalContext";

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

// ─── Integration: Course type from UniversityTracker ─────────────────────────
// Pass courses from the tracker into this component to enable the import feature.
interface TrackerCourse {
  id: string;
  title: string;
}

interface DashboardScheduleMakerProps {
  /** Courses from UniversityTracker — used for the "Import from Tracker" feature */
  trackerCourses?: TrackerCourse[];
}
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

// ─── Import from Tracker Modal ────────────────────────────────────────────────
// Shows tracker courses as checkboxes; selected ones get added as class blocks.

function ImportTrackerModal({
  isOpen,
  onClose,
  trackerCourses,
  existingCodes,
  onImport,
}: {
  isOpen: boolean;
  onClose: () => void;
  trackerCourses: TrackerCourse[];
  existingCodes: string[];
  onImport: (selected: TrackerCourse[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    const toImport = trackerCourses.filter(c => selected.has(c.id));
    onImport(toImport);
    setSelected(new Set());
    onClose();
  };

  // Derive a short code from the course title (first word or first 8 chars)
  const deriveCode = (title: string) => {
    const parts = title.trim().split(/\s+/);
    if (parts.length > 1 && parts[0].length <= 6) return parts[0].toUpperCase();
    return title.slice(0, 7).toUpperCase().replace(/[^A-Z0-9]/g, "");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-7 shadow-2xl z-10 flex flex-col gap-5"
          >
            {/* Header */}
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
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1">
                <FaTimes size={14} />
              </button>
            </div>

            {/* Course list */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {trackerCourses.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-sm font-bold">
                  No courses in your tracker yet.
                </div>
              ) : (
                trackerCourses.map((course, i) => {
                  const code = deriveCode(course.title);
                  const alreadyAdded = existingCodes.includes(code);
                  const isChecked = selected.has(course.id);

                  return (
                    <button
                      key={course.id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => !alreadyAdded && toggleSelect(course.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        alreadyAdded
                          ? "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed"
                          : isChecked
                          ? "bg-[#06402B]/5 dark:bg-emerald-500/10 border-[#06402B]/30 dark:border-emerald-500/30"
                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-[#06402B]/30 dark:hover:border-emerald-500/30"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                        alreadyAdded
                          ? "border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
                          : isChecked
                          ? "border-[#06402B] dark:border-emerald-500 bg-[#06402B] dark:bg-emerald-500"
                          : "border-zinc-300 dark:border-zinc-700"
                      }`}>
                        {(isChecked || alreadyAdded) && (
                          <FaCheckCircle size={10} className={alreadyAdded ? "text-zinc-400" : "text-white"} />
                        )}
                      </div>

                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[9px] font-black shrink-0 ${PASTEL_COLORS[i % PASTEL_COLORS.length]}`}>
                        {code.slice(0, 2)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{course.title}</p>
                        <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase">{code}</p>
                      </div>

                      {alreadyAdded && (
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest shrink-0">Added</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
              Imported courses will be added as class blocks with no days or time set. You can configure those in the editor.
            </p>

            {/* Actions */}
            <div className="flex gap-2.5">
              <button onClick={onClose} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="flex-1 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-md transition-all"
              >
                Import {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardScheduleMaker({ trackerCourses = [] }: DashboardScheduleMakerProps) {
    const { showAlert } = useModal(); // ← must be here, inside the function
  const [view, setView] = useState<ViewMode>('editor');
  const [termName, setTermName] = useState("2nd Term, A.Y. 2025-2026");
  
  const [activeTheme, setActiveTheme] = useState<ThemeMode>('light');
  const [format, setFormat] = useState<FormatMode>('desktop');
  const [isExporting, setIsExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  const [bgImage, setBgImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [classes, setClasses] = useState<ClassSession[]>([
    {
      id: '1', code: 'CS101', name: 'Intro to Computing',
      days: ['M', 'W'], startTime: '08:00', endTime: '09:30', color: PASTEL_COLORS[3]
    },
    {
      id: '2', code: 'MATH20', name: 'Discrete Mathematics',
      days: ['T', 'Th'], startTime: '10:00', endTime: '12:00', color: PASTEL_COLORS[6]
    }
  ]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setBgImage(url);
    }
  };

  const addClass = () => {
    setClasses([...classes, { 
      id: Date.now().toString(), code: '', name: '', 
      days: [], startTime: '08:00', endTime: '09:00', color: PASTEL_COLORS[classes.length % PASTEL_COLORS.length]
    }]);
  };

  // ── Integration: Import courses from tracker as class blocks ──────────────
  const handleImportFromTracker = (selected: TrackerCourse[]) => {
    const deriveCode = (title: string) => {
      const parts = title.trim().split(/\s+/);
      if (parts.length > 1 && parts[0].length <= 6) return parts[0].toUpperCase();
      return title.slice(0, 7).toUpperCase().replace(/[^A-Z0-9]/g, "");
    };

    const newClasses: ClassSession[] = selected.map((course, i) => ({
      id: `tracker-${course.id}-${Date.now()}`,
      code: deriveCode(course.title),
      name: course.title,
      days: [],
      startTime: "08:00",
      endTime: "09:00",
      color: PASTEL_COLORS[(classes.length + i) % PASTEL_COLORS.length],
    }));

    setClasses(prev => [...prev, ...newClasses]);
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
    const nextIndex = (PASTEL_COLORS.indexOf(currentColor) + 1) % PASTEL_COLORS.length;
    updateClass(id, 'color', PASTEL_COLORS[nextIndex]);
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
      const { toJpeg } = await import('html-to-image');
      const element = document.getElementById('schedule-canvas');
      if (!element) return;
      
      const dataUrl = await toJpeg(element, { 
        quality: 1.0,
        pixelRatio: format === 'mobile' ? 3 : 2, 
        backgroundColor: activeTheme === 'black' ? '#09090b' : activeTheme === 'blue' ? '#0f172a' : activeTheme === 'pink' ? '#fff1f2' : '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `${termName || 'My_Schedule'}_${format}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      showAlert("Export Failed", "Failed to export. Ensure 'html-to-image' is installed.");

    } finally {
      setIsExporting(false);
    }
  };

  // ==========================================
  // VIEW: 1. EDITOR
  // ==========================================
  if (view === 'editor') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 w-full">

        <ImportTrackerModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          trackerCourses={trackerCourses}
          existingCodes={classes.map(c => c.code)}
          onImport={handleImportFromTracker}
        />
        
        {/* Header Block */}
        <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-5 sm:p-6 md:p-8 shadow-xl flex flex-col lg:flex-row justify-between gap-6 relative overflow-hidden group transition-colors duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#06402B]/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex-1 space-y-3 sm:space-y-4 relative z-10 w-full">
            <input 
              type="text" placeholder="Term / Semester Name" 
              value={termName} onChange={e => setTermName(e.target.value)}
              className="w-full text-2xl md:text-4xl font-black bg-transparent border-none outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-white tracking-tight"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#06402B]">
                {classes.length} Classes Added
              </div>
              {/* ── Integration: Import from Tracker badge ── */}
              {trackerCourses.length > 0 && (
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#06402B]/10 dark:bg-emerald-500/10 border border-[#06402B]/20 dark:border-emerald-500/20 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#06402B] dark:text-emerald-400 hover:bg-[#06402B]/20 dark:hover:bg-emerald-500/20 transition-colors"
                >
                  <FaBook size={10} /> Import from Tracker ({trackerCourses.length})
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 relative z-10 flex flex-col sm:flex-row lg:flex-col justify-end gap-3 w-full lg:w-auto">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 lg:w-full px-4 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-[10px] sm:text-xs">
                <FaImage size={14} /> {bgImage ? 'Change Image' : 'Add Background'}
              </button>
              {bgImage && (
                <button onClick={() => setBgImage(null)} className="px-4 py-3 bg-red-500/10 text-red-500 rounded-2xl font-bold hover:bg-red-500/20 transition-colors">
                  <FaTrashAlt size={14} />
                </button>
              )}
            </div>

            <button onClick={() => setView('canvas')} className="w-full sm:w-auto lg:w-full px-6 sm:px-8 py-3 bg-[#06402B] text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(6,64,43,0.3)] text-[10px] sm:text-xs">
              <FaCalendarAlt size={14} /> View Timetable
            </button>
          </div>
        </div>

        {/* Class Input List */}
        <div className="space-y-4 w-full">
          <AnimatePresence>
            {classes.map((cls) => (
              <motion.div 
                key={cls.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-[1.5rem] p-4 sm:p-5 flex flex-col lg:flex-row gap-4 group transition-colors hover:border-[#06402B]/30 w-full shadow-sm"
              >
                <div className="flex items-center gap-3 w-full lg:w-48 shrink-0">
                  <button onClick={() => cycleColor(cls.id, cls.color)} className={`w-12 h-12 lg:w-10 lg:h-10 rounded-xl lg:rounded-full ${cls.color} flex items-center justify-center transition-colors shadow-inner shrink-0 border-2`} title="Click to change color">
                    <FaPalette size={14} className="opacity-60" />
                  </button>
                  <input 
                    type="text" placeholder="Code" value={cls.code} onChange={(e) => updateClass(cls.id, 'code', e.target.value)}
                    className="flex-1 lg:w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-black text-zinc-900 dark:text-zinc-100 p-3 sm:p-4 lg:p-3 rounded-xl focus:border-[#06402B] transition-colors uppercase text-sm sm:text-base"
                  />
                </div>

                <div className="flex-1 w-full">
                  <input 
                    type="text" placeholder="Course Name" value={cls.name} onChange={(e) => updateClass(cls.id, 'name', e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-bold text-zinc-700 dark:text-zinc-300 p-3 sm:p-4 lg:p-3 rounded-xl focus:border-[#06402B] transition-colors text-sm sm:text-base"
                  />
                </div>

                <div className="flex justify-between sm:justify-center items-center gap-1 sm:gap-2 bg-zinc-100 dark:bg-zinc-950/50 p-2 sm:p-3 lg:p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full lg:w-auto shrink-0">
                  {DAYS_OF_WEEK.map(day => {
                    const isActive = cls.days.includes(day);
                    return (
                      <button 
                        key={day} onClick={() => toggleDay(cls.id, day)}
                        className={`flex-1 sm:w-10 sm:h-10 lg:w-8 lg:h-8 py-2 sm:py-0 rounded-lg text-xs sm:text-sm lg:text-xs font-black transition-all border ${isActive ? `${cls.color} shadow-sm` : 'border-transparent text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between gap-2 w-full lg:w-auto shrink-0">
                  <input 
                    type="time" value={cls.startTime} onChange={(e) => updateClass(cls.id, 'startTime', e.target.value)}
                    className="flex-1 lg:w-28 bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-bold text-zinc-700 dark:text-zinc-300 p-3 sm:p-4 lg:p-2.5 rounded-xl focus:border-[#06402B] text-center text-sm sm:text-base"
                  />
                  <span className="text-zinc-400 font-bold">-</span>
                  <input 
                    type="time" value={cls.endTime} onChange={(e) => updateClass(cls.id, 'endTime', e.target.value)}
                    className="flex-1 lg:w-28 bg-zinc-100 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 outline-none font-bold text-zinc-700 dark:text-zinc-300 p-3 sm:p-4 lg:p-2.5 rounded-xl focus:border-[#06402B] text-center text-sm sm:text-base"
                  />
                </div>

                <button onClick={() => removeClass(cls.id)} className="w-full lg:w-auto bg-red-500/10 lg:bg-transparent text-red-500 hover:text-red-600 transition-colors p-3 sm:p-4 lg:p-2 rounded-xl lg:rounded-none opacity-100 lg:opacity-0 group-hover:opacity-100 shrink-0 flex justify-center items-center mt-2 lg:mt-0 font-bold text-[10px] sm:text-xs uppercase tracking-widest lg:text-base lg:normal-case lg:tracking-normal">
                  <span className="lg:hidden mr-2">Remove Class</span> <FaTrashAlt size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <button onClick={addClass} className="w-full py-5 sm:py-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[1.5rem] text-zinc-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs hover:border-[#06402B] hover:text-[#06402B] hover:bg-[#06402B]/5 transition-all flex items-center justify-center gap-2">
            <FaPlus size={12} /> Add New Class
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: 2. CANVAS & EXPORT
  // ==========================================
  if (view === 'canvas') {
    const currentTheme = THEME_STYLES[activeTheme];

    return (
      <div className="absolute inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 flex flex-col transition-colors duration-300">
        
        {/* TOP HEADER */}
        <div className="h-16 md:h-20 border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-4 md:px-8 flex items-center justify-between shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl z-30">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
            <button onClick={() => setView('editor')} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all text-zinc-500 shrink-0">
              <FaTimes size={14} />
            </button>
            <div className="min-w-0">
              <h3 className="font-black text-xs sm:text-sm md:text-lg uppercase tracking-tight truncate text-zinc-900 dark:text-white">{termName || "My Schedule"}</h3>
              <p className="text-[8px] sm:text-[9px] md:text-[10px] font-mono font-bold text-[#06402B] uppercase tracking-widest truncate">Preview & Export</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="flex bg-zinc-200 dark:bg-zinc-800 p-1 rounded-xl">
              <button onClick={() => setFormat('desktop')} className={`px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${format === 'desktop' ? 'bg-white dark:bg-zinc-950 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                <FaDesktop size={12} /> <span className="hidden sm:inline">Desktop</span>
              </button>
              <button onClick={() => setFormat('mobile')} className={`px-3 py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${format === 'mobile' ? 'bg-white dark:bg-zinc-950 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                <FaMobileAlt size={12} /> <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>

            <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 hidden md:block" />

            <button onClick={downloadJPG} disabled={isExporting} className="flex items-center justify-center gap-1.5 px-3 sm:px-4 md:px-5 py-2 md:py-2.5 bg-[#06402B] text-white font-bold text-[10px] sm:text-xs uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 shrink-0">
              <FaDownload size={14} /> <span className="hidden sm:inline">{isExporting ? "Saving..." : "Export"}</span>
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative w-full">
          
          {/* THEME SIDEBAR */}
          <div className="w-full md:w-20 shrink-0 flex md:flex-col items-center md:justify-center gap-4 p-3 md:p-0 md:border-r border-b md:border-b-0 border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md z-20 transition-colors overflow-x-auto">
            <span className="md:hidden text-[9px] font-bold text-zinc-500 uppercase tracking-widest shrink-0 ml-2">Theme:</span>
            {[
              { id: 'light', color: 'bg-white border-zinc-300' },
              { id: 'black', color: 'bg-zinc-950 border-zinc-700' },
              { id: 'blue', color: 'bg-slate-900 border-slate-700' },
              { id: 'pink', color: 'bg-rose-100 border-rose-300' }
            ].map((t) => (
              <button 
                key={t.id} onClick={() => setActiveTheme(t.id as ThemeMode)} title={`${t.id} theme`}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 shrink-0 transition-all ${t.color} ${activeTheme === t.id ? 'scale-110 shadow-[0_0_15px_rgba(0,0,0,0.2)] ring-2 ring-[#06402B] ring-offset-2 dark:ring-offset-zinc-900' : 'hover:scale-105 opacity-80'}`}
              />
            ))}
          </div>

          {/* CANVAS SCROLL AREA */}
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
                  ? 'w-full min-w-[1000px] max-w-7xl rounded-[2rem] p-8 md:p-10 h-[1000px]' 
                  : 'w-[340px] sm:w-[400px] min-h-[750px] sm:min-h-[850px] rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 border-8 md:border-[12px] shadow-[0_0_50px_rgba(0,0,0,0.15)]' 
              }`}
              style={{
                backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {bgImage && (
                <div className={`absolute inset-0 z-0 backdrop-blur-md ${activeTheme === 'black' ? 'bg-black/70' : activeTheme === 'blue' ? 'bg-slate-900/70' : activeTheme === 'pink' ? 'bg-rose-100/70' : 'bg-white/70'}`} />
              )}

              {format === 'desktop' ? (
                <>
                  <div className="mb-8 text-center relative z-10">
                    <h2 className={`font-black uppercase tracking-tight text-3xl md:text-4xl ${currentTheme.text}`}>{termName || "My Schedule"}</h2>
                    <p className={`font-mono font-bold uppercase tracking-widest text-xs mt-1 ${currentTheme.text} opacity-80`}>Lasallian Hub</p>
                  </div>

                  <div className={`grid grid-cols-7 gap-4 mb-4 shrink-0 relative z-10`}>
                    <div className="col-span-1"></div> 
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
                          return (
                            <div 
                              key={`${cls.id}-${day}`}
                              className={`absolute left-0 right-0 mx-1 rounded-xl shadow-sm border flex flex-col overflow-hidden p-3 transition-all ${cls.color}`}
                              style={{ top: pos.top, height: pos.height }}
                            >
                              <h4 className="font-black leading-tight text-sm truncate">{cls.code}</h4>
                              <p className="font-bold uppercase tracking-widest mt-0.5 text-[10px] truncate opacity-90">{cls.name}</p>
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
                <div className="flex flex-col h-full w-full relative z-10">
                  <div className={`mb-6 border-b-2 pb-5 sm:pb-6 ${currentTheme.border}`}>
                    <h1 className={`text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-none mb-3 ${currentTheme.text}`}>
                      {termName || "My Schedule"}
                    </h1>
                    <div className={`flex justify-between items-center opacity-80 ${currentTheme.text}`}>
                      <p className="text-[10px] sm:text-xs font-bold tracking-widest uppercase">Lasallian Hub</p>
                      <p className="text-[8px] sm:text-[10px] font-mono font-bold uppercase">A.Y. 2025-2026</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-5 sm:gap-6 flex-1 pb-4">
                    {DAYS_OF_WEEK.map(day => {
                      const dayClasses = sortClassesByTime(classes.filter(c => c.days.includes(day)));
                      if (dayClasses.length === 0) return null;
                      const fullDay = { 'M':'MON', 'T':'TUE', 'W':'WED', 'Th':'THU', 'F':'FRI', 'S':'SAT' }[day];

                      return (
                        <div key={day} className="flex gap-3 sm:gap-4">
                          <div className="w-8 sm:w-10 pt-1 shrink-0">
                            <span className={`text-base sm:text-xl font-black tracking-widest opacity-60 ${currentTheme.text}`}>{fullDay}</span>
                          </div>
                          <div className={`flex-1 flex flex-col gap-2 sm:gap-3 border-l-2 pl-3 sm:pl-4 min-w-0 ${currentTheme.border}`}>
                            {dayClasses.map(c => (
                              <div key={c.id} className={`p-3 sm:p-4 rounded-[1rem] shadow-sm flex justify-between items-center border w-full ${c.color}`}>
                                <div className="min-w-0 pr-2">
                                  <div className="text-sm sm:text-lg font-bold truncate leading-tight mb-1">{c.code}</div>
                                  <div className="text-[8px] sm:text-[10px] uppercase tracking-widest opacity-90 font-medium truncate">{c.name}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-[8px] sm:text-[9px] font-mono font-bold opacity-80 mix-blend-multiply dark:mix-blend-color-burn px-2 py-1.5 rounded-lg inline-block text-center leading-tight">
                                    {formatTime12hr(c.startTime)}<br/>{formatTime12hr(c.endTime)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {classes.length === 0 && (
                      <div className={`flex-1 flex items-center justify-center opacity-40 ${currentTheme.text}`}>
                        <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-center">No Classes Added</div>
                      </div>
                    )}
                  </div>

                  <div className={`mt-auto pt-5 sm:pt-6 border-t border-dashed ${currentTheme.border} text-center opacity-60 ${currentTheme.text}`}>
                    <p className="text-[7px] sm:text-[9px] font-bold tracking-[0.4em] uppercase">Generated by JPCS</p>
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