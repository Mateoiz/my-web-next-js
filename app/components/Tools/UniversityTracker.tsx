"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaPlus, FaBook, FaTrash, FaChevronDown, FaCalendarDay,
  FaArrowLeft, FaFolderOpen, FaExclamationTriangle, FaCheckCircle,
  FaClipboardList, FaTimes, FaPencilAlt, FaCalendarAlt
} from "react-icons/fa";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { auth, db } from "@/lib/db";
import { getGpaFromScore, gpaLabel } from "../../components/Tools/GradeCalculator";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskType =
  | "Assignment" | "Quiz" | "Midterm Exam" | "Final Exam"
  | "Final Product" | "Class Standing" | "Project" | "Presentation";

type TaskStatus = "OPEN" | "Submitted" | "Graded";

interface Course { id: string; title: string; }

interface CourseTask {
  id: string; courseId: string; name: string;
  type: TaskType; status: TaskStatus; deadline: string; grade: string;
}

// ─── Style Maps ───────────────────────────────────────────────────────────────

const TYPE_META: Record<TaskType, { color: string; dot: string }> = {
  Assignment:      { color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",           dot: "bg-blue-500" },
  Quiz:            { color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
  "Midterm Exam":  { color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",               dot: "bg-red-500" },
  "Final Exam":    { color: "bg-red-600/20 text-red-800 dark:text-red-400 border-red-600/30",               dot: "bg-red-600" },
  "Final Product": { color: "bg-purple-600/20 text-purple-800 dark:text-purple-400 border-purple-600/30",   dot: "bg-purple-600" },
  "Class Standing":{ color: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-transparent",   dot: "bg-zinc-500" },
  Project:         { color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",   dot: "bg-purple-500" },
  Presentation:    { color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",       dot: "bg-amber-500" },
};

const STATUS_META: Record<TaskStatus, { color: string; ring: string }> = {
  OPEN:      { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700", ring: "ring-zinc-300 dark:ring-zinc-600" },
  Submitted: { color: "bg-blue-600 text-white border-blue-700",                                                              ring: "ring-blue-400" },
  Graded:    { color: "bg-[#06402B] text-white border-[#042d1f] dark:bg-emerald-600 dark:border-emerald-700",               ring: "ring-emerald-400" },
};

const TASK_TYPES: TaskType[] = ["Assignment","Quiz","Midterm Exam","Final Exam","Final Product","Class Standing","Project","Presentation"];
const TASK_STATUSES_SET = new Set(["OPEN","Submitted","Graded"]);

const DEFAULT_TYPE_META = { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700", dot: "bg-zinc-400" };
const DEFAULT_STATUS_META = { color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700", ring: "ring-zinc-300" };

const safeTypeMeta = (type: string) => TYPE_META[type as TaskType] ?? DEFAULT_TYPE_META;
const safeStatusMeta = (status: string) => STATUS_META[status as TaskStatus] ?? DEFAULT_STATUS_META;
const safeType = (type: string): TaskType => (TASK_TYPES.includes(type as TaskType) ? (type as TaskType) : "Assignment");
const safeStatus = (status: string): TaskStatus => (TASK_STATUSES_SET.has(status) ? (status as TaskStatus) : "OPEN");
const TASK_STATUSES: TaskStatus[] = ["OPEN","Submitted","Graded"];

// ─── Reusable Dropdown — FIXED: uses fixed positioning to escape overflow:hidden ──

interface DropdownProps<T extends string> {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  renderOption: (v: T) => React.ReactNode;
  renderValue: (v: T) => React.ReactNode;
  align?: "left" | "right";
}

function Dropdown<T extends string>({ value, options, onChange, renderOption, renderValue, align = "left" }: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 6,
        ...(align === "right" ? { right: window.innerWidth - rect.right } : { left: rect.left }),
        zIndex: 9999,
        minWidth: Math.max(rect.width, 160),
      });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={ref} className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between gap-1.5 cursor-pointer select-none focus:outline-none"
      >
        {renderValue(value)}
        <FaChevronDown size={8} className={`shrink-0 opacity-50 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={dropdownStyle}
            className="bg-white dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
          >
            <div className="p-1.5 space-y-0.5">
              {options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2.5 ${
                    opt === value
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  {renderOption(opt)}
                  {opt === value && <span className="ml-auto text-[#06402B] dark:text-emerald-400">✓</span>}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Inline Editable Text ─────────────────────────────────────────────────────

function InlineEdit({ value, onSave, placeholder, mono = false, center = false }: {
  value: string; onSave: (v: string) => void;
  placeholder?: string; mono?: boolean; center?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }, [draft, value, onSave]);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        className={`w-full bg-white dark:bg-zinc-900 outline-none border border-[#06402B]/30 dark:border-emerald-500/30 ring-2 ring-[#06402B]/10 dark:ring-emerald-500/10 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 transition-all ${mono ? "font-mono" : ""} ${center ? "text-center" : ""}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`w-full group/edit flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors text-left ${center ? "justify-center" : ""}`}
    >
      <span className={`text-sm font-semibold truncate ${value ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-600"} ${mono ? "font-mono" : ""}`}>
        {value || placeholder}
      </span>
      <FaPencilAlt size={9} className="shrink-0 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
    </button>
  );
}

// ─── Date Input ───────────────────────────────────────────────────────────────

function parseDateInput(raw: string): string {
  if (!raw.trim()) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return raw.trim();
}

function formatDateDisplay(stored: string): string {
  if (!stored) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(stored)) {
    const d = new Date(stored + "T00:00:00");
    if (!isNaN(d.getTime())) return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return stored;
}

function isOverdueDate(stored: string): boolean {
  if (!stored || !/^\d{4}-\d{2}-\d{2}$/.test(stored)) return false;
  return new Date(stored + "T00:00:00") < new Date();
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  const display = formatDateDisplay(value);
  const overdue = isOverdueDate(value);

  const startEdit = () => {
    setDraft(display || value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commit = () => {
    setEditing(false);
    onChange(parseDateInput(draft));
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 w-full">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { setEditing(false); setDraft(""); }
          }}
          placeholder="May 15 or 05/15/25"
          className="flex-1 min-w-0 bg-white dark:bg-zinc-900 outline-none border border-[#06402B]/30 dark:border-emerald-500/30 ring-2 ring-[#06402B]/10 dark:ring-emerald-500/10 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 transition-all"
        />
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => pickerRef.current?.showPicker?.()}
          className="shrink-0 p-1.5 text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="Open calendar"
        >
          <FaCalendarDay size={11} />
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
          onChange={e => { onChange(e.target.value); setEditing(false); }}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          tabIndex={-1}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors text-left group/date"
    >
      <FaCalendarDay size={10} className={`shrink-0 ${overdue ? "text-red-400" : "text-zinc-400 dark:text-zinc-500"}`} />
      <span className={`text-xs font-mono font-semibold truncate ${
        !value ? "text-zinc-300 dark:text-zinc-600" :
        overdue ? "text-red-500 dark:text-red-400" :
        "text-zinc-600 dark:text-zinc-400"
      }`}>
        {display || "Set date"}
      </span>
      {value && (
        <div
        
          onClick={e => { e.stopPropagation(); onChange(""); }}
          className="ml-auto opacity-0 group-hover/date:opacity-100 text-zinc-400 hover:text-red-400 transition-all"
        >
          <FaTimes size={9} />
        </div>
      )}
    </button>
  );
}

// ─── Type Picker — FIXED: uses fixed positioning to escape overflow:hidden ────

type TypeCategory = "Quiz" | "Activity" | "Exams" | "Final Product";

const CATEGORY_TYPE_MAP: Record<Exclude<TypeCategory, "Exams">, TaskType> = {
  Quiz: "Quiz",
  Activity: "Assignment",
  "Final Product": "Final Product",
};

const CATEGORY_META: Record<TypeCategory, { dot: string }> = {
  Quiz:          { dot: "bg-emerald-500" },
  Activity:      { dot: "bg-blue-500" },
  Exams:         { dot: "bg-red-500" },
  "Final Product": { dot: "bg-purple-600" },
};

function typeToCategory(t: TaskType): TypeCategory {
  if (t === "Quiz") return "Quiz";
  if (t === "Midterm Exam" || t === "Final Exam") return "Exams";
  if (t === "Final Product") return "Final Product";
  return "Activity";
}

function TypePicker({ value, onChange }: { value: TaskType; onChange: (v: TaskType) => void }) {
  const [open, setOpen] = useState(false);
  const [examStep, setExamStep] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const category = typeToCategory(value);
  const meta = safeTypeMeta(value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setExamStep(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left,
        zIndex: 9999,
        minWidth: Math.max(rect.width, 160),
      });
    }
    setOpen(o => !o);
    setExamStep(false);
  };

  const selectCategory = (cat: TypeCategory) => {
    if (cat === "Exams") {
      setExamStep(true);
    } else {
      onChange(CATEGORY_TYPE_MAP[cat]);
      setOpen(false);
    }
  };

  const selectExam = (t: "Midterm Exam" | "Final Exam") => {
    onChange(t);
    setOpen(false);
    setExamStep(false);
  };

  const CATEGORIES: TypeCategory[] = ["Quiz", "Activity", "Exams", "Final Product"];

  return (
    <div ref={ref} className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none focus:outline-none ${meta.color}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
          {value}
        </span>
        <FaChevronDown size={8} className={`shrink-0 opacity-50 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={dropdownStyle}
            className="bg-white dark:bg-[#1c1c1f] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {!examStep ? (
                <motion.div
                  key="categories"
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.1 }}
                  className="p-1.5 space-y-0.5"
                >
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => selectCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2.5 ${
                        cat === category
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_META[cat].dot}`} />
                      {cat}
                      {cat === "Exams" && <FaChevronDown size={8} className="-rotate-90 ml-auto opacity-40" />}
                      {cat !== "Exams" && cat === category && <span className="ml-auto text-[#06402B] dark:text-emerald-400">✓</span>}
                    </button>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="exams"
                  initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.1 }}
                  className="p-1.5 space-y-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setExamStep(false)}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <FaChevronDown size={8} className="rotate-90" /> Back
                  </button>
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2 my-1" />
                  {(["Midterm Exam", "Final Exam"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => selectExam(t)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2.5 ${
                        value === t
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${safeTypeMeta(t).dot}`} />
                      {t}
                      {value === t && <span className="ml-auto text-[#06402B] dark:text-emerald-400">✓</span>}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

interface ModalState {
  isOpen: boolean; title: string; message: string;
  confirmText: string; onConfirm: () => void;
}

function ConfirmModal({ modal, onClose }: { modal: ModalState; onClose: () => void }) {
  return (
    <AnimatePresence>
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl z-10 text-center flex flex-col items-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-5">
              <FaExclamationTriangle size={22} />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-2">{modal.title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">{modal.message}</p>
            <div className="flex gap-3 w-full">
              <button onClick={onClose} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
              <button onClick={modal.onConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500 shadow-md transition-colors">{modal.confirmText}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ tasks }: { tasks: CourseTask[] }) {
  const open = tasks.filter(t => t.status === "OPEN").length;
  const submitted = tasks.filter(t => t.status === "Submitted").length;
  const graded = tasks.filter(t => t.status === "Graded").length;
  const gpaResult = computeCourseGpa(tasks);

  const stats = [
    { label: "Open",      value: open,      color: "text-zinc-500 dark:text-zinc-400" },
    { label: "Submitted", value: submitted,  color: "text-blue-600 dark:text-blue-400" },
    { label: "Graded",    value: graded,     color: "text-[#06402B] dark:text-emerald-400" },
  ];

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {stats.map(({ label, value, color }) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-black tabular-nums ${color}`}>{value}</span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
        </div>
      ))}
      {gpaResult && (
        <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 dark:border-zinc-700">
          <div className="text-right">
            <div className={`text-2xl font-black tabular-nums leading-none ${
              gpaResult.gpa >= 3.0 ? "text-[#06402B] dark:text-emerald-400" :
              gpaResult.gpa >= 1.0 ? "text-yellow-500" : "text-red-500"
            }`}>{gpaResult.gpa.toFixed(1)}</div>
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

// ─── Live GPA Calculator ──────────────────────────────────────────────────────

function parseGradeStr(g: string | undefined, isDirect = false): { raw: number; total: number } | null {
  if (!g?.trim()) return null;
  if (isDirect) {
    const raw = parseFloat(g.split("/")[0]);
    return isNaN(raw) ? null : { raw, total: 20 };
  }
  if (g.includes("/")) {
    const [r, t] = g.split("/");
    const raw = parseFloat(r), total = parseFloat(t);
    return isNaN(raw) || isNaN(total) || total === 0 ? null : { raw, total };
  }
  const raw = parseFloat(g);
  return isNaN(raw) ? null : { raw, total: 100 };
}

function computeCourseGpa(tasks: CourseTask[], program = "Standard"): { gpa: number; score: number } | null {
  const graded = tasks.filter(t => t.status === "Graded");
  const mid  = graded.find(t => t.type === "Midterm Exam");
  const fin  = graded.find(t => t.type === "Final Exam");
  const prod = graded.find(t => t.type === "Final Product");
  const cs   = graded.find(t => t.type === "Class Standing");

  const midParsed  = mid  ? parseGradeStr(mid.grade)  : null;
  const finParsed  = fin  ? parseGradeStr(fin.grade)  : null;
  const prodParsed = prod ? parseGradeStr(prod.grade) : null;
  const csParsed   = cs   ? parseGradeStr(cs.grade, true) : null;

  if (!midParsed && !finParsed && !prodParsed && !csParsed) return null;

  const pts = (p: typeof midParsed, weight: number) =>
    p ? (p.raw / p.total) * weight : 0;

  const score =
    pts(midParsed, 30) +
    pts(finParsed, 30) +
    pts(prodParsed, 20) +
    (csParsed ? Math.min(csParsed.raw, 20) : 0);

  return { score, gpa: getGpaFromScore(score, program) };
}

// ─── Schedule Sync Modal ──────────────────────────────────────────────────────
// Lets users push upcoming deadlines from a course into the Schedule Maker
// as time blocks, or open the Schedule Maker pre-seeded with course codes.

interface ScheduleSyncPayload {
  courseTitle: string;
  deadlines: { name: string; type: string; date: string }[];
}

function ScheduleSyncModal({
  isOpen,
  onClose,
  payload,
}: {
  isOpen: boolean;
  onClose: () => void;
  payload: ScheduleSyncPayload | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!payload) return null;

  const upcomingDeadlines = payload.deadlines.filter(d => d.date);

  const handleCopyToClipboard = () => {
    const text = upcomingDeadlines
      .map(d => `${d.type}: ${d.name} — Due ${formatDateDisplay(d.date)}`)
      .join("\n");
    navigator.clipboard.writeText(
      `📚 ${payload.courseTitle} — Upcoming Deadlines\n\n${text}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
                  <FaCalendarAlt size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">Sync to Schedule</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{payload.courseTitle}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1">
                <FaTimes size={14} />
              </button>
            </div>

            {/* Deadline list */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {upcomingDeadlines.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-sm font-bold">
                  No deadlines set for this course yet.
                </div>
              ) : (
                upcomingDeadlines.map((d, i) => {
                  const overdue = isOverdueDate(d.date);
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      overdue
                        ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${safeTypeMeta(d.type).dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{d.name || "Untitled"}</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{d.type}</p>
                      </div>
                      <span className={`text-[10px] font-mono font-bold shrink-0 ${overdue ? "text-red-500" : "text-zinc-500 dark:text-zinc-400"}`}>
                        {formatDateDisplay(d.date)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Info note */}
            <div className="bg-[#06402B]/5 dark:bg-emerald-500/10 border border-[#06402B]/20 dark:border-emerald-500/20 rounded-xl p-3.5">
              <p className="text-[11px] text-[#06402B] dark:text-emerald-400 font-semibold leading-relaxed">
                <span className="font-black">Tip:</span> Open the Schedule Maker, then paste these deadlines into your notes or use the course code to add this subject as a class block.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5">
              <button
                onClick={handleCopyToClipboard}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border ${
                  copied
                    ? "bg-[#06402B] text-white border-[#06402B]"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy Deadlines"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-md transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UniversityTracker() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<CourseTask[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [modal, setModal] = useState<ModalState>({ isOpen: false, title: "", message: "", confirmText: "Confirm", onConfirm: () => {} });

  // Schedule sync modal
  const [syncModal, setSyncModal] = useState<{ isOpen: boolean; payload: ScheduleSyncPayload | null }>({
    isOpen: false, payload: null,
  });

  const closeModal = useCallback(() => setModal(m => ({ ...m, isOpen: false })), []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const unsubCourses = onSnapshot(
      query(collection(db, "courses"), where("userId", "==", uid), orderBy("createdAt", "asc")),
      snap => setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)))
    );
    const unsubTasks = onSnapshot(
      query(collection(db, "course_tasks"), where("userId", "==", uid), orderBy("createdAt", "asc")),
      snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseTask)))
    );
    return () => { unsubCourses(); unsubTasks(); };
  }, []);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim() || !auth.currentUser) return;
    try {
      await addDoc(collection(db, "courses"), { userId: auth.currentUser.uid, title: newCourseTitle.trim(), createdAt: serverTimestamp() });
      setNewCourseTitle("");
      setIsAddingCourse(false);
    } catch {}
  };

  const handleAddTask = async (courseId: string) => {
    if (!auth.currentUser) return;
    await addDoc(collection(db, "course_tasks"), {
      userId: auth.currentUser.uid, courseId, name: "", type: "Assignment",
      status: "OPEN", deadline: "", grade: "", createdAt: serverTimestamp()
    });
  };

  const updateTask = useCallback(async (taskId: string, field: keyof CourseTask, value: string) => {
    await updateDoc(doc(db, "course_tasks", taskId), { [field]: value });
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    await deleteDoc(doc(db, "course_tasks", taskId));
  }, []);

  const triggerDeleteCourse = useCallback((courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModal({
      isOpen: true,
      title: "Delete Course Folder",
      message: "Permanently delete this course and all its deliverables? This cannot be undone.",
      confirmText: "Delete Course",
      onConfirm: async () => {
        if (selectedCourseId === courseId) setSelectedCourseId(null);
        await deleteDoc(doc(db, "courses", courseId));
        await Promise.all(tasks.filter(t => t.courseId === courseId).map(t => deleteDoc(doc(db, "course_tasks", t.id))));
        closeModal();
      }
    });
  }, [selectedCourseId, tasks, closeModal]);

  // ── Open the schedule sync modal for a course ──────────────────────────────
  const handleOpenSync = useCallback((course: Course, courseTasks: CourseTask[], e: React.MouseEvent) => {
    e.stopPropagation();
    setSyncModal({
      isOpen: true,
      payload: {
        courseTitle: course.title,
        deadlines: courseTasks
          .filter(t => t.deadline)
          .sort((a, b) => a.deadline.localeCompare(b.deadline))
          .map(t => ({ name: t.name, type: t.type, date: t.deadline })),
      },
    });
  }, []);

  // ── Course Grid View ────────────────────────────────────────────────────────

  if (!selectedCourseId) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-8 relative">
        <ConfirmModal modal={modal} onClose={closeModal} />
        <ScheduleSyncModal
          isOpen={syncModal.isOpen}
          onClose={() => setSyncModal(s => ({ ...s, isOpen: false }))}
          payload={syncModal.payload}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white/50 dark:bg-[#121214]/50 p-6 md:p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 backdrop-blur-xl shadow-sm">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
              <FaFolderOpen size={10} /> Workspace
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">Course Folders</h2>
            <p className="text-sm text-zinc-400 mt-1.5">{courses.length} {courses.length === 1 ? "subject" : "subjects"} enrolled</p>
          </div>
          <button
            onClick={() => setIsAddingCourse(v => !v)}
            className="w-full sm:w-fit px-8 py-3.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#06402B]/20 dark:shadow-emerald-500/20"
          >
            <FaPlus size={11} /> New Subject
          </button>
        </div>

        {/* Add course form */}
        <AnimatePresence>
          {isAddingCourse && (
            <motion.form
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddCourse}
              className="overflow-hidden max-w-2xl"
            >
              <div className="flex gap-2 bg-white dark:bg-[#18181b] p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg">
                <input
                  autoFocus type="text"
                  placeholder="Course code or title — e.g. CS 101, Philosophy of Mind"
                  value={newCourseTitle}
                  onChange={e => setNewCourseTitle(e.target.value)}
                  onKeyDown={e => e.key === "Escape" && setIsAddingCourse(false)}
                  className="flex-1 bg-transparent px-4 py-2 outline-none font-semibold text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400"
                />
                <button type="button" onClick={() => setIsAddingCourse(false)} className="px-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                  <FaTimes size={13} />
                </button>
                <button type="submit" disabled={!newCourseTitle.trim()} className="px-7 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-40 transition-opacity hover:bg-[#0a5a38] dark:hover:bg-emerald-500">
                  Create
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {courses.length === 0 && !isAddingCourse && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="py-28 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] text-center flex flex-col items-center justify-center gap-3 bg-zinc-50/50 dark:bg-[#121214]/50"
          >
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800/80 rounded-3xl flex items-center justify-center text-zinc-300 dark:text-zinc-600 mb-2">
              <FaFolderOpen size={30} />
            </div>
            <span className="font-black text-zinc-400 uppercase tracking-widest text-xs">Workspace is empty</span>
            <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">Create your first course folder to start tracking deliverables and grades.</p>
          </motion.div>
        )}

        {/* Course cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          <AnimatePresence>
            {courses.map(course => {
              const ct = tasks.filter(t => t.courseId === course.id);
              const done = ct.filter(t => t.status !== "OPEN").length;
              const progress = ct.length > 0 ? (done / ct.length) * 100 : 0;
              const upcoming = ct.filter(t => t.deadline && new Date(t.deadline + "T00:00:00") >= new Date()).sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
              const gpaResult = computeCourseGpa(ct);

              return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedCourseId(course.id)}
                  className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800/80 rounded-[2rem] p-6 cursor-pointer shadow-sm hover:shadow-xl hover:border-[#06402B]/25 dark:hover:border-emerald-500/25 group transition-all relative overflow-hidden"
                >
                  <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#06402B]/5 dark:bg-emerald-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Card header */}
                  <div className="flex justify-between items-start mb-5 relative z-10">
                    <div className="w-12 h-12 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <FaBook size={18} />
                    </div>
                    <div className="flex items-center gap-2">
                      {gpaResult && (
                        <div className={`px-2.5 py-1 rounded-xl text-xs font-black tabular-nums border ${
                          gpaResult.gpa >= 3.0
                            ? "bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 border-[#06402B]/20 dark:border-emerald-500/30"
                            : gpaResult.gpa >= 1.0
                            ? "bg-yellow-50 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30"
                            : "bg-red-50 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30"
                        }`}>
                          {gpaResult.gpa.toFixed(1)}
                        </div>
                      )}
                      {/* ── SCHEDULE SYNC BUTTON ── */}
                      <button
                        onClick={e => handleOpenSync(course, ct, e)}
                        className="p-2 text-zinc-300 dark:text-zinc-700 hover:text-[#06402B] dark:hover:text-emerald-400 hover:bg-[#06402B]/10 dark:hover:bg-emerald-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                        title="Sync deadlines to Schedule Maker"
                      >
                        <FaCalendarAlt size={13} />
                      </button>
                      <button
                        onClick={e => triggerDeleteCourse(course.id, e)}
                        className="p-2 text-zinc-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <FaTrash size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title + meta */}
                  <div className="relative z-10 mb-5">
                    <h3 className="text-lg font-black text-zinc-900 dark:text-white leading-tight mb-0.5 truncate group-hover:text-[#06402B] dark:group-hover:text-emerald-400 transition-colors">{course.title}</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{ct.length} {ct.length === 1 ? "deliverable" : "deliverables"}</p>
                  </div>

                  {/* Upcoming badge */}
                  {upcoming && (
                    <div className="relative z-10 mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20">
                      <FaCalendarDay size={10} className="text-amber-500 shrink-0" />
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 truncate">
                        Next: {upcoming.name || "Untitled"} · {new Date(upcoming.deadline + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="relative z-10 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Completion</span>
                      <span className="text-[10px] font-black text-[#06402B] dark:text-emerald-400 tabular-nums">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-[#06402B] to-emerald-400 dark:from-emerald-600 dark:to-emerald-400 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── Course Detail View ──────────────────────────────────────────────────────

  const activeCourse = courses.find(c => c.id === selectedCourseId);
  const courseTasks = tasks.filter(t => t.courseId === selectedCourseId);

  if (!activeCourse) { setSelectedCourseId(null); return null; }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl mx-auto space-y-6 relative">
      <ConfirmModal modal={modal} onClose={closeModal} />
      <ScheduleSyncModal
        isOpen={syncModal.isOpen}
        onClose={() => setSyncModal(s => ({ ...s, isOpen: false }))}
        payload={syncModal.payload}
      />

      {/* Course header */}
      <div className="bg-white/60 dark:bg-[#121214]/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setSelectedCourseId(null)}
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest hover:text-[#06402B] dark:hover:text-emerald-400 hover:border-[#06402B]/30 rounded-xl transition-all flex items-center gap-2 w-fit"
          >
            <FaArrowLeft size={10} /> Back to Folders
          </button>
          {/* Sync button in detail view header */}
          <button
            onClick={e => handleOpenSync(activeCourse, courseTasks, e)}
            className="px-4 py-2 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 border border-[#06402B]/20 dark:border-emerald-500/20 shadow-sm text-[10px] font-bold uppercase tracking-widest hover:bg-[#06402B]/20 dark:hover:bg-emerald-500/20 rounded-xl transition-all flex items-center gap-2 w-fit"
          >
            <FaCalendarAlt size={10} /> Sync to Schedule
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white">{activeCourse.title}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 flex items-center gap-2">
              <FaCheckCircle className="text-[#06402B] dark:text-emerald-500" size={12} />
              Track deliverables, deadlines, and grades
            </p>
          </div>
          <StatsBar tasks={courseTasks} />
        </div>
      </div>

      {/* Tasks table — FIXED: removed overflow-hidden so dropdowns aren't clipped */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="min-w-[960px] w-full bg-white dark:bg-[#18181b] rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-lg">

          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1.4fr_1.2fr_1.4fr_0.7fr_0.5fr] gap-3 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-[#111113] rounded-t-[2rem] text-[10px] font-black uppercase tracking-widest text-zinc-400 select-none">
            <div className="pl-2">Deliverable</div>
            <div>Type</div>
            <div>Status</div>
            <div className="flex items-center gap-1.5"><FaCalendarDay size={10} /> Deadline</div>
            <div className="text-center">Grade</div>
            <div />
          </div>

          {/* Rows */}
          <div className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
            {courseTasks.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-16 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-300 dark:text-zinc-700 mb-4">
                  <FaClipboardList size={22} />
                </div>
                <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No deliverables yet</span>
                <p className="text-xs text-zinc-400 mt-1">Click "New Deliverable" below to add your first row.</p>
              </motion.div>
            )}

            <AnimatePresence>
              {courseTasks.map(task => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-[2fr_1.4fr_1.2fr_1.4fr_0.7fr_0.5fr] gap-3 px-5 py-3 items-center hover:bg-zinc-50/60 dark:hover:bg-white/[0.03] transition-colors group border-l-[3px] border-l-transparent hover:border-l-[#06402B] dark:hover:border-l-emerald-500"
                >
                  {/* Name */}
                  <InlineEdit
                    value={task.name}
                    onSave={v => updateTask(task.id, "name", v)}
                    placeholder="Untitled deliverable…"
                  />

                  {/* Type picker */}
                  <TypePicker value={safeType(task.type)} onChange={v => updateTask(task.id, "type", v)} />

                  {/* Status dropdown */}
                  <div className={`flex items-center px-2.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${safeStatusMeta(task.status).color}`}>
                    <Dropdown<TaskStatus>
                      value={safeStatus(task.status)}
                      options={TASK_STATUSES}
                      onChange={v => updateTask(task.id, "status", v)}
                      renderValue={v => <span className="truncate">{v}</span>}
                      renderOption={v => <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${safeStatusMeta(v).color}`}>{v}</span>}
                    />
                  </div>

                  {/* Deadline */}
                  <DateInput value={task.deadline} onChange={v => updateTask(task.id, "deadline", v)} />

                  {/* Grade */}
                  <InlineEdit
                    value={task.grade}
                    onSave={v => updateTask(task.id, "grade", v)}
                    placeholder="—"
                    mono center
                  />

                  {/* Delete */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-2 text-zinc-300 dark:text-zinc-700 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-xl active:scale-90"
                    >
                      <FaTrash size={13} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add row footer */}
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#111113] rounded-b-[2rem] flex justify-center">
            <button
              onClick={() => handleAddTask(activeCourse.id)}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-zinc-900 rounded-xl transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 shadow-sm hover:shadow-md"
            >
              <FaPlus size={11} /> New Deliverable
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}