"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPlus, FaBook, FaTrash, FaChevronDown, FaCalendarDay,
  FaArrowLeft, FaFolderOpen, FaExclamationTriangle, FaCheckCircle,
  FaClipboardList, FaTimes, FaPencilAlt, FaCalendarAlt,
  FaStar, FaSortAmountDown, FaKeyboard,
  FaExclamationCircle, FaSearch, FaChevronUp, FaCopy,
  FaBell, FaEllipsisH, FaEllipsisV, FaStickyNote, FaDoorOpen, FaClock
} from "react-icons/fa";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, getDocs
} from "firebase/firestore";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaGripVertical } from 'react-icons/fa';
import { auth, db } from "@/lib/db";
import { getGpaFromScore } from "../../components/Tools/GradeCalculator";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskType =
  | "Assignment" | "Quiz" | "Midterm Exam" | "Final Exam"
  | "Final Product" | "Class Standing" | "Project" | "Presentation";

type TaskStatus = "OPEN" | "Submitted" | "Graded";
type SortKey = "deadline" | "type" | "status" | "name" | "none";
type FilterStatus = "ALL" | TaskStatus | "STARRED" | "OVERDUE";

interface Course {
  id: string;
  title: string;
  color?: string;
  // ── Schedule metadata (set when imported from Schedule Maker) ──
  scheduleCode?: string;
  scheduleDays?: string[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  scheduleRoom?: string;
}
interface CourseTask {
  id: string; courseId: string; name: string;
  type: TaskType; status: TaskStatus; deadline: string; grade: string;
  starred?: boolean; notes?: string;
}

interface UniversityTrackerProps {
  defaultCourseId?: string | null;
  onCourseSelected?: () => void;
}

// ─── Course accent colors ─────────────────────────────────────────────────────

const COURSE_COLORS = [
  { name: "emerald", bg: "bg-[#06402B]/10", text: "text-[#06402B] dark:text-emerald-400", dot: "bg-[#06402B] dark:bg-emerald-500", border: "border-[#06402B]/20 dark:border-emerald-500/30", ring: "ring-[#06402B]/30" },
  { name: "blue",    bg: "bg-blue-500/10",   text: "text-blue-600 dark:text-blue-400",     dot: "bg-blue-500",    border: "border-blue-200 dark:border-blue-500/30",    ring: "ring-blue-400/30" },
  { name: "violet",  bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500",  border: "border-violet-200 dark:border-violet-500/30", ring: "ring-violet-400/30" },
  { name: "amber",   bg: "bg-amber-500/10",  text: "text-amber-600 dark:text-amber-400",   dot: "bg-amber-500",   border: "border-amber-200 dark:border-amber-500/30",   ring: "ring-amber-400/30" },
  { name: "rose",    bg: "bg-rose-500/10",   text: "text-rose-600 dark:text-rose-400",     dot: "bg-rose-500",    border: "border-rose-200 dark:border-rose-500/30",     ring: "ring-rose-400/30" },
  { name: "cyan",    bg: "bg-cyan-500/10",   text: "text-cyan-600 dark:text-cyan-400",     dot: "bg-cyan-500",    border: "border-cyan-200 dark:border-cyan-500/30",     ring: "ring-cyan-400/30" },
];

const getCourseColor = (colorName?: string) =>
  COURSE_COLORS.find(c => c.name === colorName) ?? COURSE_COLORS[0];

// ─── Style Maps ───────────────────────────────────────────────────────────────

const TYPE_META: Record<TaskType, { color: string; dot: string }> = {
  Assignment:       { color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",             dot: "bg-blue-500" },
  Quiz:             { color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
  "Midterm Exam":   { color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",                 dot: "bg-red-500" },
  "Final Exam":     { color: "bg-red-600/20 text-red-800 dark:text-red-400 border-red-600/30",                 dot: "bg-red-600" },
  "Final Product":  { color: "bg-purple-600/20 text-purple-800 dark:text-purple-400 border-purple-600/30",     dot: "bg-purple-600" },
  "Class Standing": { color: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-transparent",     dot: "bg-zinc-500" },
  Project:          { color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",     dot: "bg-purple-500" },
  Presentation:     { color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",         dot: "bg-amber-500" },
};

const STATUS_META: Record<TaskStatus, { color: string; ring: string }> = {
  OPEN:      { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700", ring: "ring-zinc-300 dark:ring-zinc-600" },
  Submitted: { color: "bg-blue-600 text-white border-blue-700",                                                              ring: "ring-blue-400" },
  Graded:    { color: "bg-[#06402B] text-white border-[#042d1f] dark:bg-emerald-600 dark:border-emerald-700",               ring: "ring-emerald-400" },
};

const TASK_TYPES: TaskType[]      = ["Assignment","Quiz","Midterm Exam","Final Exam","Final Product","Class Standing","Project","Presentation"];
const TASK_STATUSES: TaskStatus[] = ["OPEN","Submitted","Graded"];

const safeTypeMeta   = (t: string) => TYPE_META[t as TaskType]     ?? { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700", dot: "bg-zinc-400" };
const safeStatusMeta = (s: string) => STATUS_META[s as TaskStatus] ?? { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700", ring: "ring-zinc-300" };
const safeType       = (t: string): TaskType   => TASK_TYPES.includes(t as TaskType)      ? (t as TaskType)   : "Assignment";
const safeStatus     = (s: string): TaskStatus => TASK_STATUSES.includes(s as TaskStatus) ? (s as TaskStatus) : "OPEN";

// ─── Schedule info helpers ────────────────────────────────────────────────────

function formatTime12hr(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function ScheduleBadge({ course }: { course: Course }) {
  const hasDays  = course.scheduleDays && course.scheduleDays.length > 0;
  const hasTime  = course.scheduleStartTime;
  const hasRoom  = course.scheduleRoom;
  if (!hasDays && !hasTime && !hasRoom) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mt-1.5">
      {hasDays && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
          {course.scheduleDays!.join('·')}
        </span>
      )}
      {hasTime && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-[9px] font-mono font-bold">
          <FaClock size={7}/>
          {formatTime12hr(course.scheduleStartTime)}–{formatTime12hr(course.scheduleEndTime)}
        </span>
      )}
      {hasRoom && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg text-[9px] font-mono font-bold">
          <FaDoorOpen size={7}/> {course.scheduleRoom}
        </span>
      )}
    </div>
  );
}

// ─── Urgency helpers ──────────────────────────────────────────────────────────

function daysUntil(stored: string): number | null {
  if (!stored || !/^\d{4}-\d{2}-\d{2}$/.test(stored)) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(stored + "T00:00:00");
  return Math.floor((due.getTime() - today.getTime()) / 86400000);
}

function UrgencyBadge({ deadline, status }: { deadline: string; status: TaskStatus }) {
  if (status === "Graded" || status === "Submitted" || !deadline) return null;
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0)  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded-md text-[9px] font-black uppercase tracking-widest"><FaExclamationCircle size={7}/>Overdue</span>;
  if (days === 0) return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded-md text-[9px] font-black uppercase tracking-widest animate-pulse">Today</span>;
  if (days === 1) return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded-md text-[9px] font-black uppercase tracking-widest"><FaBell size={7}/>Tomorrow</span>;
  if (days <= 3)  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded-md text-[9px] font-black uppercase tracking-widest">In {days}d</span>;
  if (days <= 7)  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-md text-[9px] font-bold">In {days}d</span>;
  return null;
}

// ─── Grade helpers ────────────────────────────────────────────────────────────

function parseGradeStr(g: string | undefined, isDirect = false): { raw: number; total: number } | null {
  if (!g?.trim()) return null;
  if (isDirect) { const raw = parseFloat(g.split("/")[0]); return isNaN(raw) ? null : { raw, total: 20 }; }
  if (g.includes("/")) { const [r, t] = g.split("/"); const raw = parseFloat(r), total = parseFloat(t); return isNaN(raw)||isNaN(total)||total===0 ? null : { raw, total }; }
  const raw = parseFloat(g); return isNaN(raw) ? null : { raw, total: 100 };
}

function gradeColorClass(grade: string): string {
  const p = parseGradeStr(grade); if (!p) return "text-zinc-400";
  const pct = (p.raw / p.total) * 100;
  if (pct >= 90) return "text-[#06402B] dark:text-emerald-400 font-black";
  if (pct >= 75) return "text-blue-600 dark:text-blue-400 font-bold";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400 font-bold";
  return "text-red-500 font-bold";
}

function computeCourseGpa(tasks: CourseTask[]): { gpa: number; score: number } | null {
  const graded = tasks.filter(t => t.status === "Graded");
  const mid    = graded.find(t => t.type === "Midterm Exam");
  const fin    = graded.find(t => t.type === "Final Exam");
  const prod   = graded.find(t => t.type === "Final Product");
  const cs     = graded.find(t => t.type === "Class Standing");
  const midP   = mid  ? parseGradeStr(mid.grade)       : null;
  const finP   = fin  ? parseGradeStr(fin.grade)       : null;
  const prodP  = prod ? parseGradeStr(prod.grade)      : null;
  const csP    = cs   ? parseGradeStr(cs.grade, true)  : null;
  if (!midP && !finP && !prodP && !csP) return null;
  const pts = (p: typeof midP, w: number) => p ? (p.raw / p.total) * w : 0;
  const score = pts(midP,30) + pts(finP,30) + pts(prodP,20) + (csP ? Math.min(csP.raw,20) : 0);
  return { score, gpa: getGpaFromScore(score, "Standard") };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseDateInput(raw: string): string {
  if (!raw.trim()) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return raw.trim();
}

function formatDateDisplay(stored: string): string {
  if (!stored) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(stored)) {
    const d = new Date(stored + "T00:00:00");
    if (!isNaN(d.getTime())) return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  }
  return stored;
}

function isOverdueDate(stored: string): boolean {
  if (!stored || !/^\d{4}-\d{2}-\d{2}$/.test(stored)) return false;
  return new Date(stored + "T00:00:00") < new Date();
}

// ─── Keyboard Hint Badge ──────────────────────────────────────────────────────

function KbdBadge({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-1">
        {keys.map(k => (
          <span key={k} className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[9px] font-mono font-bold text-zinc-300">{k}</span>
        ))}
      </div>
      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ─── Reusable Dropdown (PORTALED) ─────────────────────────────────────────────

interface DropdownProps<T extends string> {
  value: T; options: T[];
  onChange: (v: T) => void;
  renderOption: (v: T) => React.ReactNode;
  renderValue: (v: T) => React.ReactNode;
  align?: "left" | "right";
}

function Dropdown<T extends string>({ value, options, onChange, renderOption, renderValue, align = "left" }: DropdownProps<T>) {
  const [open, setOpen]     = useState(false);
  const [style, setStyle]   = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const ref    = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (btnRef.current?.contains(target) || target.closest('.portal-menu-container')) return;
      setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    const updatePosition = () => {
      if (open && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setStyle({ position:"fixed", top:r.bottom+6, ...(align==="right" ? { right:window.innerWidth-r.right } : { left:r.left }), zIndex:99999, minWidth:Math.max(r.width,160) });
      }
    };
    if (open) {
      window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
      updatePosition();
    }
    return () => window.removeEventListener("scroll", updatePosition, { capture: true });
  }, [open, align]);

  const menu = mounted ? createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0,y:-6,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-4,scale:0.97}} transition={{duration:0.12}}
          style={style} className="portal-menu-container bg-white dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
            {options.map(opt => (
              <button key={opt} type="button" onClick={()=>{onChange(opt);setOpen(false);}}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2.5 ${opt===value?"bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white":"text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"}`}
              >
                {renderOption(opt)}
                {opt===value && <span className="ml-auto text-[#06402B] dark:text-emerald-400">✓</span>}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <div ref={ref} className="relative w-full">
      <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-1.5 cursor-pointer select-none focus:outline-none">
        {renderValue(value)}
        <FaChevronDown size={8} className={`shrink-0 opacity-50 transition-transform duration-200 ${open?"rotate-180":""}`}/>
      </button>
      {menu}
    </div>
  );
}

// ─── Inline Editable Text ─────────────────────────────────────────────────────

function InlineEdit({ value, onSave, placeholder, mono=false, center=false }: {
  value: string; onSave: (v:string)=>void; placeholder?: string; mono?: boolean; center?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const inputRef              = useRef<HTMLInputElement>(null);
  const commit = useCallback(() => { setEditing(false); if (draft!==value) onSave(draft); }, [draft,value,onSave]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (editing) return (
    <input ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setDraft(value);setEditing(false);}}}
      className={`w-full bg-white dark:bg-zinc-900 outline-none border border-[#06402B]/30 dark:border-emerald-500/30 ring-2 ring-[#06402B]/10 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 transition-all ${mono?"font-mono":""} ${center?"text-center":""}`}
      placeholder={placeholder}
    />
  );
  return (
    <button type="button" onClick={()=>{setDraft(value);setEditing(true);}}
      className={`w-full group/edit flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors text-left ${center?"justify-center":""}`}
    >
      <span className={`text-sm font-semibold truncate ${value?"text-zinc-900 dark:text-white":"text-zinc-300 dark:text-zinc-600"} ${mono?"font-mono":""}`}>{value||placeholder}</span>
      <FaPencilAlt size={9} className="shrink-0 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover/edit:opacity-100 transition-opacity"/>
    </button>
  );
}

// ─── Grade Edit ───────────────────────────────────────────────────────────────

function GradeEdit({ value, onSave }: { value: string; onSave: (v:string)=>void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const inputRef              = useRef<HTMLInputElement>(null);
  const commit = useCallback(() => { setEditing(false); if (draft!==value) onSave(draft); }, [draft,value,onSave]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const colorClass = gradeColorClass(value);

  if (editing) return (
    <input ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setDraft(value);setEditing(false);}}}
      placeholder="88 or 44/50"
      className="w-full bg-white dark:bg-zinc-900 outline-none border border-[#06402B]/30 dark:border-emerald-500/30 ring-2 ring-[#06402B]/10 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-center text-zinc-900 dark:text-white transition-all"
    />
  );
  return (
    <button type="button" onClick={()=>{setDraft(value);setEditing(true);}}
      className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors group/grade"
    >
      <span className={`text-sm font-mono tabular-nums ${value?colorClass:"text-zinc-300 dark:text-zinc-600"}`}>{value||"—"}</span>
      <FaPencilAlt size={9} className="shrink-0 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover/grade:opacity-100 transition-opacity"/>
    </button>
  );
}

// ─── Date Input ───────────────────────────────────────────────────────────────

function DateInput({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState("");
  const inputRef              = useRef<HTMLInputElement>(null);
  const pickerRef             = useRef<HTMLInputElement>(null);
  const overdue               = isOverdueDate(value);

  const startEdit = () => { setDraft(formatDateDisplay(value)||value); setEditing(true); setTimeout(()=>inputRef.current?.focus(),0); };
  const commit    = () => { setEditing(false); onChange(parseDateInput(draft)); };

  if (editing) return (
    <div className="flex items-center gap-1 w-full">
      <input ref={inputRef} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();commit();}if(e.key==="Escape"){setEditing(false);setDraft("");}}}
        placeholder="May 15 or 05/15/25"
        className="flex-1 min-w-0 bg-white dark:bg-zinc-900 outline-none border border-[#06402B]/30 dark:border-emerald-500/30 ring-2 ring-[#06402B]/10 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-300 transition-all"
      />
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>pickerRef.current?.showPicker?.()}
        className="shrink-0 p-1.5 text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <FaCalendarDay size={11}/>
      </button>
      <input ref={pickerRef} type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(value)?value:""} onChange={e=>{onChange(e.target.value);setEditing(false);}}
        className="absolute opacity-0 pointer-events-none w-0 h-0" tabIndex={-1}
      />
    </div>
  );
  return (
    <div role="button" tabIndex={0} onClick={startEdit}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors text-left group/date cursor-pointer"
    >
      <FaCalendarDay size={10} className={`shrink-0 ${overdue?"text-red-400":"text-zinc-400 dark:text-zinc-500"}`}/>
      <span className={`text-xs font-mono font-semibold truncate ${!value?"text-zinc-300 dark:text-zinc-600":overdue?"text-red-500 dark:text-red-400":"text-zinc-600 dark:text-zinc-400"}`}>
        {formatDateDisplay(value)||"Set date"}
      </span>
      {value && (
        <button type="button" onClick={e=>{e.stopPropagation();onChange("");}} className="ml-auto opacity-0 group-hover/date:opacity-100 text-zinc-400 hover:text-red-400 transition-all">
          <FaTimes size={9}/>
        </button>
      )}
    </div>
  );
}

// ─── Type Picker (PORTALED) ───────────────────────────────────────────────────

type TypeCategory = "Quiz" | "Activity" | "Exams" | "Final Product";
const CATEGORY_TYPE_MAP: Record<Exclude<TypeCategory,"Exams">, TaskType> = { Quiz:"Quiz", Activity:"Assignment", "Final Product":"Final Product" };
const CATEGORY_META: Record<TypeCategory, { dot: string }> = { Quiz:{dot:"bg-emerald-500"}, Activity:{dot:"bg-blue-500"}, Exams:{dot:"bg-red-500"}, "Final Product":{dot:"bg-purple-600"} };

function typeToCategory(t: TaskType): TypeCategory {
  if (t==="Quiz") return "Quiz";
  if (t==="Midterm Exam"||t==="Final Exam") return "Exams";
  if (t==="Final Product") return "Final Product";
  return "Activity";
}

function TypePicker({ value, onChange }: { value:TaskType; onChange:(v:TaskType)=>void }) {
  const [open, setOpen]         = useState(false);
  const [examStep, setExamStep] = useState(false);
  const [style, setStyle]       = useState<React.CSSProperties>({});
  const [mounted, setMounted]   = useState(false);
  const ref    = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const meta   = safeTypeMeta(value);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (btnRef.current?.contains(target) || target.closest('.portal-menu-container')) return;
      setOpen(false); setExamStep(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    const updatePosition = () => {
      if (open && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setStyle({ position:"fixed", top:r.bottom+6, left:r.left, zIndex:99999, minWidth:Math.max(r.width,160) });
      }
    };
    if (open) {
      window.addEventListener("scroll", updatePosition, { capture: true, passive: true });
      updatePosition();
    }
    return () => window.removeEventListener("scroll", updatePosition, { capture: true });
  }, [open]);

  const menu = mounted ? createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{opacity:0,y:-6,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-4,scale:0.97}} transition={{duration:0.12}}
          style={style} className="portal-menu-container bg-white dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {!examStep ? (
              <motion.div key="cats" initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} transition={{duration:0.1}} className="p-1.5 space-y-0.5">
                {(["Quiz","Activity","Exams","Final Product"] as TypeCategory[]).map(cat => (
                  <button key={cat} type="button" onClick={()=>cat==="Exams"?setExamStep(true):(onChange(CATEGORY_TYPE_MAP[cat]),setOpen(false))}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2.5 ${typeToCategory(value)===cat?"bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white":"text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_META[cat].dot}`}/>{cat}
                    {cat==="Exams"&&<FaChevronDown size={8} className="-rotate-90 ml-auto opacity-40"/>}
                    {cat!=="Exams"&&typeToCategory(value)===cat&&<span className="ml-auto text-[#06402B] dark:text-emerald-400">✓</span>}
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div key="exams" initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:8}} transition={{duration:0.1}} className="p-1.5 space-y-0.5">
                <button type="button" onClick={()=>setExamStep(false)} className="w-full text-left px-3 py-1.5 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                  <FaChevronDown size={8} className="rotate-90"/> Back
                </button>
                <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2 my-1"/>
                {(["Midterm Exam","Final Exam"] as const).map(t => (
                  <button key={t} type="button" onClick={()=>{onChange(t);setOpen(false);setExamStep(false);}}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2.5 ${value===t?"bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white":"text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"}`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${safeTypeMeta(t).dot}`}/>{t}
                    {value===t&&<span className="ml-auto text-[#06402B] dark:text-emerald-400">✓</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  ) : null;

  return (
    <div ref={ref} className="relative w-full">
      <button ref={btnRef} type="button" onClick={()=>{setOpen(o=>!o);setExamStep(false);}}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none focus:outline-none ${meta.color}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`}/>
          {value}
        </span>
        <FaChevronDown size={8} className={`shrink-0 opacity-50 transition-transform duration-200 ${open?"rotate-180":""}`}/>
      </button>
      {menu}
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

interface ModalState { isOpen:boolean; title:string; message:string; confirmText:string; onConfirm:()=>void; danger?:boolean; }

function ConfirmModal({ modal, onClose }: { modal:ModalState; onClose:()=>void }) {
  return (
    <AnimatePresence>
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
          <motion.div initial={{opacity:0,scale:0.95,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:8}} transition={{type:"spring",stiffness:400,damping:30}}
            className="relative w-full max-w-sm bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl z-10 text-center flex flex-col items-center"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${modal.danger!==false?"bg-red-500/10 text-red-500":"bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400"}`}>
              <FaExclamationTriangle size={22}/>
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-2">{modal.title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">{modal.message}</p>
            <div className="flex gap-3 w-full">
              <button onClick={onClose} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
              <button onClick={modal.onConfirm} className={`flex-1 py-3 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md transition-colors ${modal.danger!==false?"bg-red-600 hover:bg-red-500":"bg-[#06402B] dark:bg-emerald-600 hover:bg-[#0a5a38]"}`}>{modal.confirmText}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ tasks }: { tasks:CourseTask[] }) {
  const open      = tasks.filter(t=>t.status==="OPEN").length;
  const submitted = tasks.filter(t=>t.status==="Submitted").length;
  const graded    = tasks.filter(t=>t.status==="Graded").length;
  const starred   = tasks.filter(t=>t.starred).length;
  const overdue   = tasks.filter(t=>t.status==="OPEN"&&isOverdueDate(t.deadline)).length;
  const gpaResult = computeCourseGpa(tasks);

  return (
    <div className="flex items-center gap-5 flex-wrap">
      {[
        { label:"Open",      value:open,      color:"text-zinc-500 dark:text-zinc-400" },
        { label:"Submitted", value:submitted, color:"text-blue-600 dark:text-blue-400" },
        { label:"Graded",    value:graded,    color:"text-[#06402B] dark:text-emerald-400" },
      ].map(({ label, value, color }) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-black tabular-nums ${color}`}>{value}</span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
        </div>
      ))}
      {overdue>0 && <div className="flex items-baseline gap-1.5"><span className="text-2xl font-black tabular-nums text-red-500">{overdue}</span><span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Overdue</span></div>}
      {starred>0 && <div className="flex items-baseline gap-1.5"><span className="text-2xl font-black tabular-nums text-amber-500">{starred}</span><span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">⭐ Starred</span></div>}
      {gpaResult && (
        <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-700">
          <div className="text-right">
            <div className={`text-2xl font-black tabular-nums leading-none ${gpaResult.gpa>=3.0?"text-[#06402B] dark:text-emerald-400":gpaResult.gpa>=1.0?"text-yellow-500":"text-red-500"}`}>{gpaResult.gpa.toFixed(1)}</div>
            <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mt-0.5">Est. GPA</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black tabular-nums text-zinc-600 dark:text-zinc-300 leading-none">{gpaResult.score.toFixed(1)}%</div>
            <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mt-0.5">Raw Score</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Schedule Sync Modal ──────────────────────────────────────────────────────

interface ScheduleSyncPayload { courseTitle:string; deadlines:{name:string;type:string;date:string}[]; }

function ScheduleSyncModal({ isOpen, onClose, payload }: { isOpen:boolean; onClose:()=>void; payload:ScheduleSyncPayload|null }) {
  const [copied, setCopied] = useState(false);
  if (!payload) return null;
  const upcoming = payload.deadlines.filter(d=>d.date);
  const handleCopy = () => {
    const text = upcoming.map(d=>`${d.type}: ${d.name} — Due ${formatDateDisplay(d.date)}`).join("\n");
    navigator.clipboard.writeText(`📚 ${payload.courseTitle} — Upcoming Deadlines\n\n${text}`);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
          <motion.div initial={{opacity:0,scale:0.95,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:8}} transition={{type:"spring",stiffness:400,damping:30}}
            className="relative w-full max-w-md bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-7 shadow-2xl z-10 flex flex-col gap-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 flex items-center justify-center shrink-0"><FaCalendarAlt size={18}/></div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">Sync to Schedule</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{payload.courseTitle}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"><FaTimes size={14}/></button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {upcoming.length===0
                ? <div className="py-8 text-center text-zinc-400 text-sm font-bold">No deadlines set yet.</div>
                : upcoming.map((d,i) => {
                  const overdue = isOverdueDate(d.date);
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${overdue?"bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20":"bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${safeTypeMeta(d.type).dot}`}/>
                      <div className="flex-1 min-w-0"><p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{d.name||"Untitled"}</p><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{d.type}</p></div>
                      <span className={`text-[10px] font-mono font-bold shrink-0 ${overdue?"text-red-500":"text-zinc-500 dark:text-zinc-400"}`}>{formatDateDisplay(d.date)}</span>
                    </div>
                  );
                })
              }
            </div>
            <div className="bg-[#06402B]/5 dark:bg-emerald-500/10 border border-[#06402B]/20 dark:border-emerald-500/20 rounded-xl p-3.5">
              <p className="text-[11px] text-[#06402B] dark:text-emerald-400 font-semibold leading-relaxed"><span className="font-black">Tip:</span> Open the Schedule Maker, then paste these deadlines into your notes or use the course code to add a class block.</p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={handleCopy} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border ${copied?"bg-[#06402B] text-white border-[#06402B]":"bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}>
                {copied?"✓ Copied!":"Copy Deadlines"}
              </button>
              <button onClick={onClose} className="flex-1 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-md transition-colors">Got it</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function CourseColorPicker({ value, onChange }: { value?:string; onChange:(c:string)=>void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e:MouseEvent) => { if (ref.current&&!ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const cur = getCourseColor(value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={()=>setOpen(o=>!o)} className={`w-5 h-5 rounded-full ${cur.dot} ring-2 ring-white dark:ring-zinc-900 hover:scale-110 transition-transform`} title="Change color"/>
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,scale:0.9,y:-4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9,y:-4}} transition={{duration:0.12}}
            className="absolute top-7 left-0 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-3 shadow-xl flex gap-2"
          >
            {COURSE_COLORS.map(c => (
              <button key={c.name} type="button" onClick={()=>{onChange(c.name);setOpen(false);}}
                className={`w-6 h-6 rounded-full ${c.dot} hover:scale-110 transition-transform ${value===c.name?"ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-zinc-400":""}`}
                title={c.name}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Schedule Info Editor (inline on course detail header) ───────────────────

function ScheduleInfoEditor({ course, onSave }: {
  course: Course;
  onSave: (fields: Partial<Course>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [days, setDays]       = useState<string[]>(course.scheduleDays ?? []);
  const [start, setStart]     = useState(course.scheduleStartTime ?? "");
  const [end, setEnd]         = useState(course.scheduleEndTime ?? "");
  const [room, setRoom]       = useState(course.scheduleRoom ?? "");

  const DAYS = ['M','T','W','Th','F','S'];

  const handleSave = async () => {
    await onSave({ scheduleDays: days, scheduleStartTime: start, scheduleEndTime: end, scheduleRoom: room });
    setEditing(false);
  };

  if (!editing) {
    const hasSched = (course.scheduleDays?.length ?? 0) > 0 || course.scheduleStartTime || course.scheduleRoom;
    return (
      <button onClick={() => {
        setDays(course.scheduleDays ?? []);
        setStart(course.scheduleStartTime ?? "");
        setEnd(course.scheduleEndTime ?? "");
        setRoom(course.scheduleRoom ?? "");
        setEditing(true);
      }}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest transition-colors group"
      >
        <FaClock size={9}/>
        {hasSched ? "Edit Schedule" : "Add Schedule"}
        <FaPencilAlt size={8} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
      </button>
    );
  }

  return (
    <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} className="flex flex-col gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
      {/* Day toggles */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest w-10 shrink-0">Days</span>
        <div className="flex gap-1">
          {DAYS.map(d => (
            <button key={d} type="button"
              onClick={() => setDays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])}
              className={`w-8 h-8 rounded-lg text-[10px] font-black uppercase transition-all border ${
                days.includes(d)
                  ? "bg-[#06402B] dark:bg-emerald-600 text-white border-transparent"
                  : "bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-[#06402B] dark:hover:border-emerald-500"
              }`}>{d}</button>
          ))}
        </div>
      </div>
      {/* Time */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest w-10 shrink-0">Time</span>
        <input type="time" value={start} onChange={e=>setStart(e.target.value)}
          className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B]"/>
        <span className="text-zinc-400 font-bold text-xs">–</span>
        <input type="time" value={end} onChange={e=>setEnd(e.target.value)}
          className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B]"/>
      </div>
      {/* Room */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest w-10 shrink-0">Room</span>
        <div className="relative flex-1">
          <FaDoorOpen size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
          <input type="text" value={room} onChange={e=>setRoom(e.target.value)} placeholder="e.g. GK-101"
            className="w-full pl-8 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 outline-none focus:border-[#06402B]"/>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={()=>setEditing(false)} className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
        <button onClick={handleSave} className="flex-1 py-2 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#0a5a38] transition-colors">Save</button>
      </div>
    </motion.div>
  );
}

// ─── Course Card Context Menu ─────────────────────────────────────────────────

function CourseCardMenu({
  course, ct, onDelete, onSync, onColorChange,
}: {
  course: Course; ct: CourseTask[];
  onDelete: (e: React.MouseEvent) => void;
  onSync: (e: React.MouseEvent) => void;
  onColorChange: (color: string) => void;
}) {
  const [open, setOpen]         = useState(false);
  const [showColors, setShowColors] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setShowColors(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => { setOpen(o => !o); setShowColors(false); }}
        className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-all active:scale-90 touch-manipulation"
        title="Options"
      >
        <FaEllipsisV size={13} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.93, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute right-0 top-10 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden min-w-[160px]"
          >
            <div className="p-1.5 space-y-0.5">
              <button onClick={(e) => { onSync(e); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <FaCalendarAlt size={12} className="text-[#06402B] dark:text-emerald-400" /> Sync Deadlines
              </button>
              <button onClick={() => setShowColors(v => !v)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <span className={`w-3 h-3 rounded-full ${getCourseColor(course.color).dot}`} />
                Change Color
                <FaChevronDown size={8} className={`ml-auto opacity-40 transition-transform ${showColors?"rotate-180":""}`} />
              </button>
              <AnimatePresence>
                {showColors && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="flex gap-2 px-3 pb-2 pt-1">
                      {COURSE_COLORS.map(c => (
                        <button key={c.name} onClick={() => { onColorChange(c.name); setOpen(false); setShowColors(false); }}
                          className={`w-6 h-6 rounded-full ${c.dot} hover:scale-110 transition-transform ${course.color===c.name?"ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ring-zinc-400":""}`}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2 my-1" />
              <button onClick={(e) => { onDelete(e); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-black text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-left border border-red-100 dark:border-red-500/20"
              >
                <FaTrash size={12} /> Delete Course
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SortableTaskRow({ id, isDragDisabled, children }: {
  id: string; isDragDisabled: boolean; children: (dragHandleProps: any, isDragging: boolean) => React.ReactNode;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging
  } = useSortable({ id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 1 : 'auto' as any,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners }, isDragging)}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UniversityTracker({
  defaultCourseId,
  onCourseSelected,
}: {
  defaultCourseId?: string | null;
  onCourseSelected?: () => void;
}) {
  const [courses, setCourses]                   = useState<Course[]>([]);
  const [tasks, setTasks]                       = useState<CourseTask[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isAddingCourse, setIsAddingCourse]     = useState(false);
  const [newCourseTitle, setNewCourseTitle]     = useState("");
  const [modal, setModal]                       = useState<ModalState>({ isOpen:false, title:"", message:"", confirmText:"Confirm", onConfirm:()=>{} });
  const [syncModal, setSyncModal]               = useState<{isOpen:boolean;payload:ScheduleSyncPayload|null}>({ isOpen:false, payload:null });
  const [searchQuery, setSearchQuery]           = useState("");
  const [filterStatus, setFilterStatus]         = useState<FilterStatus>("ALL");
  const [sortKey, setSortKey]                   = useState<SortKey>("none");
  const [sortAsc, setSortAsc]                   = useState(true);
  const [showKbdHints, setShowKbdHints]         = useState(false);
  const [expandedNoteId, setExpandedNoteId]     = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds]   = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen]         = useState(false);
  const bulkRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => setModal(m=>({...m,isOpen:false})), []);
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  

  useEffect(() => {
    const h = (e:MouseEvent) => { if (bulkRef.current&&!bulkRef.current.contains(e.target as Node)) setBulkMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag==="INPUT"||tag==="TEXTAREA") return;
      if (e.key==="Escape") setSelectedCourseId(null);
      if (e.key==="n"||e.key==="N") handleAddTask(selectedCourseId);
      if (e.key==="/"||e.key==="f") { e.preventDefault(); (document.getElementById("task-search") as HTMLInputElement)?.focus(); }
      if (e.key==="?"||e.key==="k") setShowKbdHints(v=>!v);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selectedCourseId]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const unsubCourses = onSnapshot(query(collection(db,"courses"),where("userId","==",uid),orderBy("createdAt","asc")), snap=>setCourses(snap.docs.map(d=>({id:d.id,...d.data()} as Course))));
    const unsubTasks   = onSnapshot(query(collection(db,"course_tasks"),where("userId","==",uid),orderBy("createdAt","asc")), snap=>setTasks(snap.docs.map(d=>({id:d.id,...d.data()} as CourseTask))));
    return () => { unsubCourses(); unsubTasks(); };
  }, []);

  useEffect(() => {
    if (selectedCourseId && courses.length > 0 && !courses.find(c => c.id === selectedCourseId)) {
      setSelectedCourseId(null);
    }
  }, [selectedCourseId, courses]);
  useEffect(() => {
  if (defaultCourseId) {
    setSelectedCourseId(defaultCourseId);
    onCourseSelected?.();
  }
}, [defaultCourseId]);

  const activeCourse    = courses.find(c => c.id === selectedCourseId) ?? null;
  const color           = getCourseColor(activeCourse?.color);
  const rawCourseTasks  = useMemo(() => tasks.filter(t => t.courseId === selectedCourseId), [tasks, selectedCourseId]);

  const displayTasks = useMemo(() => {
    let out = [...rawCourseTasks];
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); out = out.filter(t => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)); }
    if (filterStatus === "STARRED") out = out.filter(t => t.starred);
    else if (filterStatus === "OVERDUE") out = out.filter(t => t.status === "OPEN" && isOverdueDate(t.deadline));
    else if (filterStatus !== "ALL") out = out.filter(t => t.status === filterStatus);

    if (sortKey !== "none") {
      out.sort((a, b) => {
        let av = "", bv = "";
        if (sortKey === "deadline") { av = a.deadline || "9999"; bv = b.deadline || "9999"; }
        else if (sortKey === "type")   { av = a.type; bv = b.type; }
        else if (sortKey === "status") { av = a.status; bv = b.status; }
        else if (sortKey === "name")   { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    } else {
      out.sort((a, b) => {
        const ai = manualOrder.indexOf(a.id);
        const bi = manualOrder.indexOf(b.id);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    }

    out.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
    return out;
  }, [rawCourseTasks, searchQuery, filterStatus, sortKey, sortAsc, manualOrder]);

  useEffect(() => {
    setManualOrder(rawCourseTasks.map(t => t.id));
  }, [selectedCourseId]);

  useEffect(() => {
    setManualOrder(prev => {
      const existingIds = new Set(rawCourseTasks.map(t => t.id));
      const newIds = rawCourseTasks.map(t => t.id).filter(id => !prev.includes(id));
      return [...prev.filter(id => existingIds.has(id)), ...newIds];
    });
  }, [rawCourseTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over || active.id === over.id) return;
    setManualOrder(prev => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()||!auth.currentUser) return;
    await addDoc(collection(db,"courses"),{ userId:auth.currentUser.uid, title:newCourseTitle.trim(), color:"emerald", createdAt:serverTimestamp() });
    setNewCourseTitle(""); setIsAddingCourse(false);
  };

  const handleAddTask = async (courseId: string) => {
    if (!auth.currentUser) return;
    await addDoc(collection(db,"course_tasks"),{ userId:auth.currentUser.uid, courseId, name:"", type:"Assignment", status:"OPEN", deadline:"", grade:"", starred:false, notes:"", createdAt:serverTimestamp() });
  };

  const duplicateTask = async (task: CourseTask) => {
    if (!auth.currentUser) return;
    await addDoc(collection(db,"course_tasks"),{ userId:auth.currentUser.uid, courseId:task.courseId, name:`${task.name} (copy)`, type:task.type, status:"OPEN", deadline:task.deadline, grade:"", starred:false, notes:"", createdAt:serverTimestamp() });
  };

  const updateTask = useCallback(async (taskId:string, field:keyof CourseTask, value:string|boolean) => {
    await updateDoc(doc(db,"course_tasks",taskId),{ [field]:value });
  }, []);

  const deleteTask = useCallback(async (taskId:string) => {
    await deleteDoc(doc(db,"course_tasks",taskId));
  }, []);

  // ── NEW: update course (schedule fields etc.) ─────────────────────────────
  const updateCourse = useCallback(async (courseId: string, fields: Partial<Course>) => {
    await updateDoc(doc(db, "courses", courseId), fields as Record<string, any>);
  }, []);

  const bulkDeleteSelected = () => {
    if (selectedTaskIds.size===0) return;
    setModal({
      isOpen:true, title:"Delete Tasks", confirmText:"Delete All", danger:true,
      message:`Permanently delete ${selectedTaskIds.size} selected task${selectedTaskIds.size>1?"s":""}?`,
      onConfirm: async () => {
        const batch = writeBatch(db);
        selectedTaskIds.forEach(id=>batch.delete(doc(db,"course_tasks",id)));
        await batch.commit();
        setSelectedTaskIds(new Set()); closeModal();
      }
    });
  };

  const bulkSetStatus = async (status: TaskStatus) => {
    const batch = writeBatch(db);
    selectedTaskIds.forEach(id=>batch.update(doc(db,"course_tasks",id),{status}));
    await batch.commit();
    setSelectedTaskIds(new Set()); setBulkMenuOpen(false);
  };

const triggerDeleteCourse = useCallback((courseId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  setModal({
    isOpen: true,
    title: "Delete Course Folder",
    message: "Permanently delete this course and all its deliverables?",
    confirmText: "Delete Course",
    danger: true,
    onConfirm: async () => {
      try {
        if (selectedCourseId === courseId) setSelectedCourseId(null);

        // 1. Fetch tasks directly from Firestore (don't rely on local state)
const taskSnap = await getDocs(
  query(
    collection(db, "course_tasks"),
    where("userId", "==", auth.currentUser!.uid), // ← add this
    where("courseId", "==", courseId)
  )
);
        // 2. Batch delete tasks + course atomically
        const batch = writeBatch(db);
        taskSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(doc(db, "courses", courseId));
        await batch.commit();

        closeModal();
      } catch (err) {
        console.error("Delete failed:", err);
        closeModal();
      }
    }
  });
}, [selectedCourseId, closeModal]);

  const handleOpenSync = useCallback((course:Course, courseTasks:CourseTask[], e:React.MouseEvent) => {
    e.stopPropagation();
    setSyncModal({ isOpen:true, payload:{ courseTitle:course.title, deadlines:courseTasks.filter(t=>t.deadline).sort((a,b)=>a.deadline.localeCompare(b.deadline)).map(t=>({name:t.name,type:t.type,date:t.deadline})) }});
  }, []);

  const toggleSort       = (key: SortKey) => { if (sortKey===key) setSortAsc(a=>!a); else { setSortKey(key); setSortAsc(true); } };
  const toggleSelectTask = (id: string)   => { setSelectedTaskIds(prev=>{ const next=new Set(prev); next.has(id)?next.delete(id):next.add(id); return next; }); };
  const selectAll        = () => { if (selectedTaskIds.size===displayTasks.length&&displayTasks.length>0) setSelectedTaskIds(new Set()); else setSelectedTaskIds(new Set(displayTasks.map(t=>t.id))); };

  // ── COURSE GRID ───────────────────────────────────────────────────────────
  if (!selectedCourseId) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-8 relative">
        <ConfirmModal modal={modal} onClose={closeModal}/>
        <ScheduleSyncModal isOpen={syncModal.isOpen} onClose={()=>setSyncModal(s=>({...s,isOpen:false}))} payload={syncModal.payload}/>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white/50 dark:bg-[#121214]/50 p-6 md:p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-xl shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
              <FaFolderOpen size={10}/> Workspace
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">Course Folders</h2>
            <p className="text-sm text-zinc-400 mt-1.5">{courses.length} {courses.length===1?"subject":"subjects"} enrolled</p>
          </div>
          <button onClick={()=>setIsAddingCourse(v=>!v)}
            className="w-full sm:w-fit px-8 py-3.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#06402B]/20"
          >
            <FaPlus size={11}/> New Subject
          </button>
        </div>

        <AnimatePresence>
          {isAddingCourse && (
            <motion.form initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} onSubmit={handleAddCourse} className="overflow-hidden max-w-2xl">
              <div className="flex gap-2 bg-white dark:bg-[#18181b] p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
                <input autoFocus type="text" placeholder="Course code or title — e.g. CS 101" value={newCourseTitle} onChange={e=>setNewCourseTitle(e.target.value)}
                  onKeyDown={e=>e.key==="Escape"&&setIsAddingCourse(false)}
                  className="flex-1 bg-transparent px-4 py-2 outline-none font-semibold text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400"
                />
                <button type="button" onClick={()=>setIsAddingCourse(false)} className="px-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"><FaTimes size={13}/></button>
                <button type="submit" disabled={!newCourseTitle.trim()} className="px-7 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] dark:hover:bg-emerald-500 transition-colors">Create</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {courses.length===0&&!isAddingCourse && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="py-28 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] text-center flex flex-col items-center justify-center gap-3 bg-zinc-50/50 dark:bg-[#121214]/50">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800/80 rounded-3xl flex items-center justify-center text-zinc-300 dark:text-zinc-600 mb-2"><FaFolderOpen size={30}/></div>
            <span className="font-black text-zinc-400 uppercase tracking-widest text-xs">Workspace is empty</span>
            <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">Create your first course folder to start tracking deliverables and grades.</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          <AnimatePresence>
            {courses.map(course => {
              const ct       = tasks.filter(t=>t.courseId===course.id);
              const done     = ct.filter(t=>t.status!=="OPEN").length;
              const progress = ct.length>0?(done/ct.length)*100:0;
              const upcoming = ct.filter(t=>t.deadline&&new Date(t.deadline+"T00:00:00")>=new Date()).sort((a,b)=>a.deadline.localeCompare(b.deadline))[0];
              const overdue  = ct.filter(t=>t.status==="OPEN"&&isOverdueDate(t.deadline)).length;
              const starred  = ct.filter(t=>t.starred).length;
              const gpaResult = computeCourseGpa(ct);
              const c        = getCourseColor(course.color);

              return (
                <motion.div key={course.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}} whileHover={{y:-4}}
                  onClick={()=>setSelectedCourseId(course.id)}
                  className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] p-6 cursor-pointer shadow-sm hover:shadow-xl group transition-all relative"
                >
                  <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none z-0">
                    <div className={`absolute -top-12 -right-12 w-36 h-36 ${c.bg} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}/>
                  </div>

                  <div className="flex justify-between items-start mb-5 relative z-[100]">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${c.bg} ${c.text} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                        <FaBook size={18}/>
                      </div>
                      {gpaResult && (
                        <div className={`px-2.5 py-1 rounded-xl text-xs font-black tabular-nums border ${gpaResult.gpa>=3.0?`${c.bg} ${c.text} ${c.border}`:gpaResult.gpa>=1.0?"bg-yellow-50 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30":"bg-red-50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30"}`}>
                          {gpaResult.gpa.toFixed(1)} GPA
                        </div>
                      )}
                    </div>
                    <div className="relative z-[100]">
                      <CourseCardMenu
                        course={course} ct={ct}
                        onDelete={e => { e.stopPropagation(); triggerDeleteCourse(course.id, e); }}
                        onSync={e => { e.stopPropagation(); handleOpenSync(course, ct, e); }}
                        onColorChange={async (col) => { await updateDoc(doc(db,"courses",course.id),{color:col}); }}
                      />
                    </div>
                  </div>

                  <div className="relative z-10 mb-3">
                    <h3 className={`text-lg font-black text-zinc-900 dark:text-white leading-tight mb-0.5 truncate group-hover:${c.text} transition-colors`}>{course.title}</h3>
                    {/* ── NEW: Schedule badge on card ── */}
                    <ScheduleBadge course={course}/>
                    <div className="flex items-center gap-3 flex-wrap mt-1">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{ct.length} {ct.length===1?"deliverable":"deliverables"}</p>
                      {overdue>0 && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded text-[9px] font-black uppercase tracking-widest"><FaExclamationTriangle size={8} className="-mt-0.5"/>{overdue} overdue</span>}
                      {starred>0 && <span className="inline-flex items-center gap-1 text-amber-400 text-[9px] font-black">⭐{starred}</span>}
                    </div>
                  </div>

                  {upcoming && (
                    <div className="relative z-10 mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20">
                      <FaCalendarDay size={10} className="text-amber-500 shrink-0"/>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 truncate">
                        Next: {upcoming.name||"Untitled"} · {new Date(upcoming.deadline+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                      </span>
                    </div>
                  )}

                  <div className="relative z-10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Completion</span>
                      <span className={`text-[10px] font-black ${c.text} tabular-nums`}>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:0.9,ease:"easeOut",delay:0.1}}
                        className={`h-full ${c.dot} rounded-full opacity-80`}
                      />
                    </div>
                  </div>

                  <div className="relative z-10 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                      {ct.length} deliverable{ct.length!==1?"s":""}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); triggerDeleteCourse(course.id, e); }}
                      className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 hover:bg-red-100 active:scale-95 transition-all touch-manipulation"
                    >
                      <FaTrash size={9} /> Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (!activeCourse) return null;

  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="w-full max-w-6xl mx-auto space-y-4 relative">
      <ConfirmModal modal={modal} onClose={closeModal}/>
      <ScheduleSyncModal isOpen={syncModal.isOpen} onClose={()=>setSyncModal(s=>({...s,isOpen:false}))} payload={syncModal.payload}/>

      {/* Course header */}
      <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl p-5 md:p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-5">
          <button onClick={()=>setSelectedCourseId(null)}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest hover:text-[#06402B] dark:hover:text-emerald-400 hover:border-[#06402B]/30 rounded-xl transition-all touch-manipulation"
          >
            <FaArrowLeft size={10}/> Back <span className="opacity-40 font-mono hidden sm:inline">Esc</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={e=>handleOpenSync(activeCourse,rawCourseTasks,e)}
              className={`p-2.5 ${color.bg} ${color.text} border ${color.border} rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest touch-manipulation`}
            >
              <FaCalendarAlt size={11}/> <span className="hidden sm:inline">Sync</span>
            </button>
            <button onClick={()=>setShowKbdHints(v=>!v)}
              className={`p-2.5 border rounded-xl transition-all hidden md:flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${showKbdHints?"bg-zinc-900 text-white border-zinc-700":"bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-700"}`}
            >
              <FaKeyboard size={11}/> Shortcuts
            </button>
            <button onClick={()=>handleAddTask(activeCourse.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all shadow-md touch-manipulation"
            >
              <FaPlus size={11}/> <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showKbdHints && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden mb-5">
              <div className="p-4 bg-zinc-950 rounded-2xl flex flex-wrap gap-x-6 gap-y-3">
                <KbdBadge keys={["N"]} label="New task"/>
                <KbdBadge keys={["/"]} label="Search"/>
                <KbdBadge keys={["Esc"]} label="Back"/>
                <KbdBadge keys={["?"]} label="Toggle shortcuts"/>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 ${color.bg} ${color.text} rounded-2xl flex items-center justify-center shrink-0`}>
              <FaBook size={18}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white truncate">{activeCourse.title}</h2>
                <div onClick={e=>e.stopPropagation()}>
                  <CourseColorPicker value={activeCourse.color} onChange={async c=>{await updateDoc(doc(db,"courses",activeCourse.id),{color:c});}}/>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-2">
                <FaCheckCircle className={color.text} size={10}/> Track deliverables, deadlines, and grades
              </p>
              {/* ── NEW: Schedule info editor on detail header ── */}
              <ScheduleInfoEditor
                course={activeCourse}
                onSave={async fields => { await updateCourse(activeCourse.id, fields); }}
              />
            </div>
          </div>
          <StatsBar tasks={rawCourseTasks}/>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <FaSearch size={11} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"/>
          <input id="task-search" type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search tasks…"
            className="w-full pl-9 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors"
          />
          {searchQuery && <button onClick={()=>setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"><FaTimes size={10}/></button>}
        </div>

        <div className="flex gap-2 items-center overflow-x-auto pb-1" style={{scrollbarWidth:"none"}}>
          <div className="flex gap-1.5 flex-nowrap">
            {(["ALL","OPEN","Submitted","Graded","STARRED","OVERDUE"] as FilterStatus[]).map(f=>{
              const labels: Record<FilterStatus,string> = { ALL:"All", OPEN:"Open", Submitted:"Done", Graded:"Graded", STARRED:"⭐", OVERDUE:"⚠ Late" };
              return (
                <button key={f} onClick={()=>setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all touch-manipulation ${filterStatus===f?`${color.bg} ${color.text} border ${color.border}`:"bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800"}`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
          <button
            onClick={()=>{ const keys:SortKey[]=["none","deadline","name","type","status"]; const idx=keys.indexOf(sortKey); setSortKey(keys[(idx+1)%keys.length]); }}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all touch-manipulation ${sortKey!=="none"?`${color.bg} ${color.text} ${color.border}`:"bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-800"}`}
          >
            <FaSortAmountDown size={9}/>{sortKey==="none"?"Sort":sortKey}
          </button>
        </div>

        {selectedTaskIds.size>0 && (
          <div ref={bulkRef} className="relative">
            <button onClick={()=>setBulkMenuOpen(o=>!o)}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-widest w-full justify-center hover:opacity-80 transition-all touch-manipulation"
            >
              <FaEllipsisH size={11}/> {selectedTaskIds.size} selected — tap to act
            </button>
            <AnimatePresence>
              {bulkMenuOpen && (
                <motion.div initial={{opacity:0,scale:0.97,y:-4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.97,y:-4}} transition={{duration:0.12}}
                  className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
                >
                  <div className="p-1.5 space-y-0.5">
                    <p className="px-3 py-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Mark as…</p>
                    {TASK_STATUSES.map(s=>(
                      <button key={s} onClick={()=>bulkSetStatus(s)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
                      >
                        <span className={`w-2 h-2 rounded-full ${safeStatusMeta(s).ring.replace("ring-","bg-")}`}/>{s}
                      </button>
                    ))}
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2 my-1"/>
                    <button onClick={bulkDeleteSelected} className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2">
                      <FaTrash size={10}/> Delete selected
                    </button>
                    <button onClick={()=>{setSelectedTaskIds(new Set());setBulkMenuOpen(false);}}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      Deselect all
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── MOBILE CARD VIEW ── */}
      <div className="md:hidden space-y-3">
        {displayTasks.length===0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-300 dark:text-zinc-700"><FaClipboardList size={22}/></div>
            <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{searchQuery||filterStatus!=="ALL"?"No matching tasks":"No deliverables yet"}</span>
            <button onClick={()=>handleAddTask(activeCourse.id)} className="px-6 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#042d1f] transition-all shadow-md touch-manipulation">
              <FaPlus size={11} className="inline mr-2"/> Add First Task
            </button>
          </div>
        ) : (
          <>
            {sortKey === 'none' && !searchQuery && filterStatus === 'ALL' && displayTasks.length > 1 && (
              <div className="flex items-center gap-1.5 px-1">
                <FaGripVertical size={9} className="text-zinc-400"/>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Hold & drag to reorder</p>
              </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={displayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <AnimatePresence>
                  {displayTasks.map(task => {
                    const isSelected     = selectedTaskIds.has(task.id);
                    const typeMeta       = safeTypeMeta(task.type);
                    const statusMeta     = safeStatusMeta(task.status);
                    const isDragDisabled = sortKey !== 'none' || !!searchQuery || filterStatus !== 'ALL';

                    return (
                      <SortableTaskRow key={task.id} id={task.id} isDragDisabled={isDragDisabled}>
                        {(dragHandleProps, isDragging) => (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`bg-white dark:bg-[#18181b] rounded-2xl border transition-all ${
                              isDragging ? 'shadow-2xl border-[#06402B]/30 dark:border-emerald-500/30 scale-[1.01]'
                              : isSelected ? 'border-[#06402B] dark:border-emerald-500 bg-[#06402B]/5 dark:bg-emerald-500/5'
                              : task.starred ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5'
                              : 'border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            <div className="flex items-start gap-3 p-4 pb-3">
                              <div className="flex flex-col items-center gap-2 pt-0.5 shrink-0">
                                {!isDragDisabled ? (
                                  <button {...dragHandleProps} className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing touch-manipulation p-0.5 rounded transition-colors" title="Drag to reorder">
                                    <FaGripVertical size={13}/>
                                  </button>
                                ) : <div className="w-5 h-5" />}
                                <input type="checkbox" checked={isSelected} onChange={() => toggleSelectTask(task.id)} className="w-4 h-4 accent-[#06402B] cursor-pointer"/>
                                <button onClick={() => updateTask(task.id, "starred", !task.starred)} className={`transition-all touch-manipulation ${task.starred ? "text-amber-400" : "text-zinc-300 dark:text-zinc-700"}`}>
                                  <FaStar size={13}/>
                                </button>
                              </div>

                              <div className="flex-1 min-w-0">
                                <InlineEdit value={task.name} onSave={v => updateTask(task.id, "name", v)} placeholder="Untitled deliverable…"/>
<div className="flex items-center gap-2 mt-2 flex-wrap px-2.5">
  <div className={`px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider ${typeMeta.color}`}>
    <TypePicker value={safeType(task.type)} onChange={v => updateTask(task.id, "type", v)} />
  </div>
  <UrgencyBadge deadline={task.deadline} status={task.status}/>
</div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => duplicateTask(task)} className="p-2 text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all active:scale-90 touch-manipulation">
                                  <FaCopy size={11}/>
                                </button>
                                <button onClick={() => deleteTask(task.id)} className="p-2 text-zinc-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all active:scale-90 touch-manipulation">
                                  <FaTrash size={11}/>
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 px-4 pb-3 pt-1 border-t border-zinc-50 dark:border-zinc-800">
                              <div>
                                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 px-1">Status</p>
                                <div className={`flex items-center px-2.5 py-2 rounded-xl border text-[9px] font-bold uppercase tracking-wider ${statusMeta.color}`}>
                                  <Dropdown<TaskStatus> value={safeStatus(task.status)} options={TASK_STATUSES} onChange={v => updateTask(task.id, "status", v)}
                                    renderValue={v => <span className="truncate text-[9px]">{v}</span>}
                                    renderOption={v => <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${safeStatusMeta(v).color}`}>{v}</span>}
                                  />
                                </div>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 px-1">Due</p>
                                <DateInput value={task.deadline} onChange={v => updateTask(task.id, "deadline", v)}/>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 px-1">Grade</p>
                                <GradeEdit value={task.grade} onSave={v => updateTask(task.id, "grade", v)}/>
                              </div>
                            </div>

                            <div className="px-4 pb-4 border-t border-zinc-50 dark:border-zinc-800 pt-2">
                              <button onClick={() => setExpandedNoteId(prev => prev === task.id ? null : task.id)}
                                className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${task.notes?.trim() ? "text-amber-500" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"}`}>
                                <FaStickyNote size={9}/>
                                {task.notes?.trim() ? "Note attached" : "Add note"}
                              </button>
                              <AnimatePresence>
                                {expandedNoteId === task.id && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2">
                                    <textarea value={task.notes || ""} onChange={e => updateTask(task.id, "notes", e.target.value)}
                                      placeholder="Add a note..." rows={2} maxLength={300}
                                      className="w-full bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/20 rounded-xl px-3 py-2 outline-none text-xs font-medium text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 resize-none"/>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{(task.notes || "").length}/300</span>
                                      <button onClick={() => setExpandedNoteId(null)} className="text-[9px] font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest transition-colors">Done</button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </motion.div>
                        )}
                      </SortableTaskRow>
                    );
                  })}
                </AnimatePresence>
              </SortableContext>

              <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
                {activeTaskId && (() => {
                  const task = displayTasks.find(t => t.id === activeTaskId);
                  if (!task) return null;
                  return (
                    <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-[#06402B]/40 dark:border-emerald-500/40 p-4 shadow-2xl rotate-1 opacity-95">
                      <div className="flex items-center gap-2 mb-1">
                        <FaGripVertical size={11} className="text-zinc-400"/>
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">{task.name || "Untitled deliverable"}</p>
                      </div>
                    </div>
                  );
                })()}
              </DragOverlay>
            </DndContext>
          </>
        )}

        {displayTasks.length > 0 && (
          <button onClick={() => handleAddTask(activeCourse.id)}
            className="w-full py-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 font-bold uppercase tracking-widest text-xs hover:border-[#06402B] dark:hover:border-emerald-500 hover:text-[#06402B] dark:hover:text-emerald-400 flex items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation">
            <FaPlus size={10}/> New Deliverable
          </button>
        )}
      </div>

      {/* ── DESKTOP TABLE VIEW ── */}
      <div className="hidden md:block w-full overflow-visible pb-32">
        <div className="min-w-[1020px] w-full bg-white dark:bg-[#18181b] rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-lg relative z-10">

          <div className="grid grid-cols-[28px_20px_24px_2fr_1.4fr_1.2fr_1.4fr_0.7fr_0.5fr_0.4fr_0.3fr] gap-2 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-[#111113] rounded-t-[2rem] text-[10px] font-black uppercase tracking-widest text-zinc-400 select-none">
            <div className="flex items-center">
              <input type="checkbox" checked={selectedTaskIds.size===displayTasks.length&&displayTasks.length>0} onChange={selectAll} className="w-3.5 h-3.5 accent-[#06402B] cursor-pointer"/>
            </div>
            <div title="Drag to reorder" className="flex items-center justify-center">
              {sortKey === 'none' && !searchQuery && filterStatus === 'ALL' ? <FaGripVertical size={9} className="text-zinc-400"/> : <div/>}
            </div>
            <div/>
            {([["name","Deliverable"],["type","Type"],["status","Status"],["deadline","Deadline"]] as [SortKey,string][]).map(([key,label])=>(
              <button key={key} onClick={()=>toggleSort(key)} className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors group text-left">
                {label}
                <span className={`transition-all ${sortKey===key?"opacity-100 text-[#06402B] dark:text-emerald-400":"opacity-0 group-hover:opacity-40"}`}>
                  {sortKey===key&&!sortAsc?<FaChevronUp size={7}/>:<FaChevronDown size={7}/>}
                </span>
              </button>
            ))}
            <div className="text-center">Grade</div>
            <div/><div/>
            <div title="Notes" className="flex items-center justify-center text-zinc-400"><FaStickyNote size={9}/></div>
          </div>

          <div className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
            {displayTasks.length===0 && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} className="p-16 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-300 dark:text-zinc-700 mb-4"><FaClipboardList size={22}/></div>
                <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">{searchQuery||filterStatus!=="ALL"?"No matching tasks":"No deliverables yet"}</span>
              </motion.div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <SortableContext items={displayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <AnimatePresence>
                  {displayTasks.map(task => {
                    const isSelected     = selectedTaskIds.has(task.id);
                    const isDragDisabled = sortKey !== 'none' || !!searchQuery || filterStatus !== 'ALL';

                    return (
                      <SortableTaskRow key={task.id} id={task.id} isDragDisabled={isDragDisabled}>
                        {(dragHandleProps, isDragging) => (
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="group">
                            <div className={`grid grid-cols-[28px_20px_24px_2fr_1.4fr_1.2fr_1.4fr_0.7fr_0.5fr_0.4fr_0.3fr] gap-2 px-5 py-2.5 items-center transition-colors border-l-[3px] ${
                              isDragging ? 'bg-[#06402B]/5 dark:bg-emerald-500/5 border-l-[#06402B] dark:border-l-emerald-500 shadow-lg'
                              : isSelected ? 'bg-[#06402B]/5 dark:bg-emerald-500/5 border-l-[#06402B] dark:border-l-emerald-500'
                              : 'hover:bg-zinc-50/60 dark:hover:bg-white/[0.03] border-l-transparent hover:border-l-[#06402B] dark:hover:border-l-emerald-500'
                            } ${task.starred && !isDragging ? 'bg-amber-50/30 dark:bg-amber-500/5' : ''}`}>
                              <div className="flex items-center">
                                <input type="checkbox" checked={isSelected} onChange={() => toggleSelectTask(task.id)} className="w-3.5 h-3.5 accent-[#06402B] cursor-pointer"/>
                              </div>
                              <div className="flex items-center justify-center">
                                {!isDragDisabled ? (
                                  <button {...dragHandleProps} className="flex items-center justify-center p-1 text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-all rounded" title="Drag to reorder">
                                    <FaGripVertical size={11}/>
                                  </button>
                                ) : <div/>}
                              </div>
                              <button onClick={() => updateTask(task.id, "starred", !task.starred)}
                                className={`flex items-center justify-center transition-all ${task.starred ? "text-amber-400" : "text-zinc-200 dark:text-zinc-700 hover:text-amber-400"}`}>
                                <FaStar size={12}/>
                              </button>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <InlineEdit value={task.name} onSave={v => updateTask(task.id, "name", v)} placeholder="Untitled deliverable…"/>
                                </div>
                                <UrgencyBadge deadline={task.deadline} status={task.status}/>
                              </div>
                              <TypePicker value={safeType(task.type)} onChange={v => updateTask(task.id, "type", v)}/>
                              <div className={`flex items-center px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${safeStatusMeta(task.status).color}`}>
                                <Dropdown<TaskStatus> value={safeStatus(task.status)} options={TASK_STATUSES} onChange={v => updateTask(task.id, "status", v)}
                                  renderValue={v => <span className="truncate">{v}</span>}
                                  renderOption={v => <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${safeStatusMeta(v).color}`}>{v}</span>}
                                />
                              </div>
                              <DateInput value={task.deadline} onChange={v => updateTask(task.id, "deadline", v)}/>
                              <GradeEdit value={task.grade} onSave={v => updateTask(task.id, "grade", v)}/>
                              <button onClick={() => duplicateTask(task)} className="flex items-center justify-center p-1.5 text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all rounded-lg active:scale-90">
                                <FaCopy size={11}/>
                              </button>
                              <button onClick={() => deleteTask(task.id)} className="flex items-center justify-center p-1.5 text-zinc-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all rounded-lg active:scale-90">
                                <FaTrash size={11}/>
                              </button>
                              <button onClick={() => setExpandedNoteId(prev => prev === task.id ? null : task.id)} title="Notes"
                                className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${
                                  expandedNoteId === task.id ? 'text-[#06402B] dark:text-emerald-400 bg-[#06402B]/10'
                                  : task.notes?.trim() ? 'text-amber-500 bg-amber-500/10'
                                  : 'text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 opacity-0 group-hover:opacity-100'
                                }`}>
                                <FaStickyNote size={11}/>
                              </button>
                            </div>

                            <AnimatePresence>
                              {expandedNoteId === task.id && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                                  <div className="px-5 pb-3 pt-2 bg-amber-50/40 dark:bg-amber-500/5 border-l-[3px] border-l-amber-400/50">
                                    <textarea value={task.notes || ""} onChange={e => updateTask(task.id, "notes", e.target.value)}
                                      placeholder="Add a note..." rows={2} maxLength={300}
                                      className="w-full bg-transparent outline-none text-xs font-medium text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none leading-relaxed"/>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{(task.notes || "").length}/300</span>
                                      <button onClick={() => setExpandedNoteId(null)} className="text-[9px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-widest transition-colors">Done</button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </SortableTaskRow>
                    );
                  })}
                </AnimatePresence>
              </SortableContext>

              <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
                {activeTaskId && (() => {
                  const task = displayTasks.find(t => t.id === activeTaskId);
                  if (!task) return null;
                  return (
                    <div className="min-w-[1020px] bg-white dark:bg-[#18181b] border border-[#06402B]/30 dark:border-emerald-500/30 shadow-2xl rounded-xl opacity-95">
                      <div className="grid grid-cols-[28px_20px_24px_2fr_1.4fr_1.2fr_1.4fr_0.7fr_0.5fr_0.4fr_0.3fr] gap-2 px-5 py-2.5 items-center border-l-[3px] border-l-[#06402B] dark:border-l-emerald-500 bg-[#06402B]/5 dark:bg-emerald-500/5">
                        <div/><div className="flex items-center justify-center"><FaGripVertical size={11} className="text-[#06402B] dark:text-emerald-400"/></div><div/>
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate px-2.5">{task.name || "Untitled deliverable"}</p>
                        <span className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${safeTypeMeta(task.type).color}`}>{task.type}</span>
                        <span className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${safeStatusMeta(task.status).color}`}>{task.status}</span>
                        <span className="text-xs font-mono text-zinc-400 px-2.5">{task.deadline || "—"}</span>
                        <span className={`text-sm font-mono text-center ${task.grade ? gradeColorClass(task.grade) : "text-zinc-300"}`}>{task.grade || "—"}</span>
                        <div/><div/><div/>
                      </div>
                    </div>
                  );
                })()}
              </DragOverlay>
            </DndContext>
          </div>

          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#111113] rounded-b-[2rem] flex items-center justify-between">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest tabular-nums">
              {displayTasks.length} of {rawCourseTasks.length} task{rawCourseTasks.length!==1?"s":""}
              {(searchQuery||filterStatus!=="ALL")&&" (filtered)"}
              {sortKey === 'none' && !searchQuery && filterStatus === 'ALL' && displayTasks.length > 1 && (
                <span className="ml-3 text-zinc-300 dark:text-zinc-600 normal-case font-medium">· drag rows to reorder</span>
              )}
            </p>
            <button onClick={() => handleAddTask(activeCourse.id)}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-zinc-900 rounded-xl transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 shadow-sm hover:shadow-md">
              <FaPlus size={11}/> New Deliverable <span className="opacity-40 font-mono ml-1">N</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}