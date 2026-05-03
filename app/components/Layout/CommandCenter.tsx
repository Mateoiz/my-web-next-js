"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, useDragControls, Reorder } from "framer-motion";
import { 
  FaTimes, FaPlus, FaCheckCircle, FaRegCircle, 
  FaTrashAlt, FaUserFriends, FaChevronLeft, FaChevronRight,
  FaFire, FaClock, FaExclamationTriangle, FaInbox,
  FaCalendarAlt, FaSortAmountDown, FaBolt, FaLayerGroup,
  FaGripVertical, FaCheck
} from "react-icons/fa";

interface CommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  activeTasks: any[];
  friends: any[];
  onAddTask: (title: string, deadline: string) => Promise<void>;
  onToggleTask: (task: any) => Promise<void>;
  onDeleteTask: (task: any) => Promise<void>;
  onNavigate: (view: string) => void;
  courses: any[];
  courseTasks: any[];
  onNavigateToCourse: (courseId: string) => void;
  userProfile: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

function daysUntil(deadline: string): number | null {
  if (!deadline) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(deadline + "T00:00:00");
  return Math.floor((due.getTime() - today.getTime()) / 86400000);
}

function isTaskDone(status: string): boolean {
  return status === "Graded" || status === "Submitted" || status === "completed";
}

// Get next weekday date string
function getNextWeekday(dayOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

function UrgencyChip({ deadline, status }: { deadline: string; status: string }) {
  if (!deadline || isTaskDone(status)) return null;
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0)  return <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Overdue</span>;
  if (days === 0) return <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest animate-pulse">Today</span>;
  if (days === 1) return <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Tomorrow</span>;
  if (days <= 3)  return <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest">In {days}d</span>;
  return <span className="text-[9px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">{deadline}</span>;
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#06402B";

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-zinc-100 dark:text-zinc-800" />
        <motion.circle
          cx="24" cy="24" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-black text-zinc-900 dark:text-white leading-none">{pct}%</span>
        <span className="text-[8px] font-bold text-zinc-400 leading-none mt-0.5">done</span>
      </div>
    </div>
  );
}

// ─── Quick Templates ──────────────────────────────────────────────────────────

const TEMPLATES = [
  { label: "Quiz tmrw", icon: "⚡", title: "Quiz", deadline: () => getNextWeekday(1) },
  { label: "Assignment", icon: "📝", title: "Assignment", deadline: () => getNextWeekday(3) },
  { label: "Project due", icon: "📁", title: "Project", deadline: () => getNextWeekday(7) },
  { label: "Exam prep", icon: "📚", title: "Exam Review", deadline: () => getNextWeekday(2) },
  { label: "Lab report", icon: "🔬", title: "Lab Report", deadline: () => getNextWeekday(5) },
  { label: "Presentation", icon: "🎤", title: "Presentation", deadline: () => getNextWeekday(4) },
];

function QuickTemplates({ onSelect }: { onSelect: (title: string, deadline: string) => void }) {
  return (
    <div>
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <FaBolt size={8} className="text-amber-400" /> Quick Add
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {TEMPLATES.map(t => (
          <button
            key={t.label}
            onClick={() => onSelect(t.title, t.deadline())}
            className="flex flex-col items-center gap-1 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-[#06402B]/40 hover:bg-[#06402B]/5 transition-all active:scale-95 touch-manipulation"
          >
            <span className="text-base leading-none">{t.icon}</span>
            <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider leading-tight text-center">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Swipeable Task Item ──────────────────────────────────────────────────────

function SwipeableTaskItem({ task, onToggle, onDelete, today }: {
  task: any;
  onToggle: () => void;
  onDelete: () => void;
  today: string;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);
  const isDone = isTaskDone(task.status);
  const isOverdue = !isDone && task.deadline && task.deadline < today;
  const days = daysUntil(task.deadline);
  const isUrgent = !isDone && days !== null && days <= 1 && days >= 0;
  const THRESHOLD = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startX.current;
    setSwipeX(Math.max(-80, Math.min(80, diff)));
  };

  const handleTouchEnd = () => {
    if (swipeX < -THRESHOLD) onDelete();
    else if (swipeX > THRESHOLD) onToggle();
    setSwipeX(0);
  };
  const showComplete = swipeX > 10;
  const showDelete = swipeX < -10;

return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Left reveal — complete — only visible when swiping right */}
      {showComplete && (
        <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-center bg-emerald-500 rounded-xl">
          <FaCheck size={13} className="text-white" />
        </div>
      )}
      {/* Right reveal — delete — only visible when swiping left */}
      {showDelete && (
        <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-center bg-red-500 rounded-xl">
          <FaTrashAlt size={13} className="text-white" />
        </div>
      )}

       <motion.div
        style={{ x: swipeX }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`group relative flex items-start gap-3 p-3 rounded-xl border z-10
          ${isDone
            ? "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800/50 opacity-70"
            : isOverdue
            ? "bg-red-50/50 dark:bg-red-500/5 border-red-200/60 dark:border-red-500/20"
            : isUrgent
            ? "bg-amber-50/50 dark:bg-amber-500/5 border-amber-200/60 dark:border-amber-500/20"
            : "bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 hover:border-[#06402B]/30"
          }`}
      >
        {/* Drag handle — desktop only */}
        <div className="hidden md:flex items-center shrink-0 text-zinc-300 dark:text-zinc-700 cursor-grab active:cursor-grabbing mt-0.5">
          <FaGripVertical size={11} />
        </div>

        <button onClick={onToggle} className={`mt-0.5 shrink-0 transition-colors ${
          task.status === "Graded" ? "text-emerald-500"
          : task.status === "Submitted" ? "text-blue-500"
          : "text-zinc-300 dark:text-zinc-600 hover:text-emerald-500"
        }`}>
          {isDone ? <FaCheckCircle size={15} /> : <FaRegCircle size={15} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold leading-snug truncate ${isDone ? "line-through text-zinc-400" : "text-zinc-800 dark:text-zinc-200"}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {task.status === "Graded" && (
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Graded</span>
            )}
            {task.isCourseTask && task.type && (
              <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-widest">
                {task.type}
              </span>
            )}
            {!isDone && <UrgencyChip deadline={task.deadline} status={task.status} />}
          </div>
        </div>

        <button onClick={onDelete}
          className="shrink-0 text-zinc-300 dark:text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90 p-1">
          <FaTrashAlt size={11} />
        </button>
      </motion.div>
    </div>
  );
}
// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ activeTasks }: { activeTasks: any[] }) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const deadlineSet = useMemo(() => {
    const s = new Set<string>();
    activeTasks.forEach(t => { if (t.deadline) s.add(t.deadline); });
    return s;
  }, [activeTasks]);

  const tasksOnSelected = useMemo(() => {
    if (!selectedDate) return [];
    return activeTasks.filter(t => t.deadline === selectedDate);
  }, [activeTasks, selectedDate]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const cells: React.ReactNode[] = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`e-${i}`} className="w-7 h-7" />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(viewYear, viewMonth, d);
    const isToday = isCurrentMonth && d === today.getDate();
    const hasTask = deadlineSet.has(dateStr);
    const isSelected = selectedDate === dateStr;
    const days = daysUntil(dateStr);
    const isUrgent = hasTask && days !== null && days >= 0 && days <= 2;

    cells.push(
      <button
        key={d} type="button"
        onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
        className={`relative w-7 h-7 flex items-center justify-center text-[11px] rounded-lg transition-all font-medium focus:outline-none touch-manipulation
          ${isSelected ? "bg-[#06402B] text-white ring-2 ring-[#06402B]/30"
          : isToday ? "bg-[#06402B] text-white font-black"
          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }`}
      >
        {d}
        {hasTask && !isToday && !isSelected && (
          <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isUrgent ? "bg-red-500" : "bg-amber-500"}`} />
        )}
        {hasTask && isToday && (
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/70 rounded-full" />
        )}
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200 dark:border-zinc-800/80 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <button type="button" onClick={prevMonth}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-manipulation">
          <FaChevronLeft size={9} />
        </button>
        <button type="button"
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(null); }}
          className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </button>
        <button type="button" onClick={nextMonth}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors touch-manipulation">
          <FaChevronRight size={9} />
        </button>
      </div>

      <div className="px-3 pt-3 pb-1 grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 w-7 mx-auto uppercase tracking-widest">{d}</div>
        ))}
      </div>

      <div className="px-3 pb-3 grid grid-cols-7 gap-1 justify-items-center">
        {cells}
      </div>

      <AnimatePresence>
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
          >
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
              {tasksOnSelected.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-1">No tasks due this day.</p>
              ) : (
                tasksOnSelected.map(task => (
                  <div key={task.id} className="flex items-center gap-2 py-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      task.status === "Graded" ? "bg-emerald-500"
                      : task.status === "Submitted" ? "bg-blue-400"
                      : "bg-amber-400"
                    }`} />
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate flex-1">{task.title}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {task.status === "Graded" && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-widest">Graded</span>
                      )}
                      {task.type && (
                        <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{task.type}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 pb-3 flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Deadline
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> Urgent
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommandCenter({
  isOpen, onClose, activeTasks, friends, onAddTask, onToggleTask, onDeleteTask, onNavigate,
  courses, courseTasks, onNavigateToCourse, userProfile
}: CommandCenterProps) {

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'network'>('tasks');
  const [groupByCourse, setGroupByCourse] = useState(false);
  const [orderedTasks, setOrderedTasks] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  // Sync ordered tasks when activeTasks changes
  useMemo(() => {
    setOrderedTasks(prev => {
      const prevIds = new Set(prev.map((t: any) => t.id));
      const newIds = new Set(activeTasks.map(t => t.id));
      // Remove deleted, add new
      const filtered = prev.filter((t: any) => newIds.has(t.id));
      const added = activeTasks.filter(t => !prevIds.has(t.id));
      return [...filtered, ...added];
    });
  }, [activeTasks]);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await onAddTask(newTaskTitle, newTaskDeadline);
    setNewTaskTitle(""); setNewTaskDeadline(""); setIsAddingTask(false);
    setShowTemplates(false);
  };

  const handleTemplateSelect = async (title: string, deadline: string) => {
    await onAddTask(title, deadline);
    setShowTemplates(false);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalTasks = activeTasks.length;
  const doneTasks = activeTasks.filter(t => isTaskDone(t.status)).length;

  const overdueCount = activeTasks.filter(t =>
    (t.status === "OPEN" || t.status === "pending") && t.deadline && t.deadline < today
  ).length;

  const urgentCount = activeTasks.filter(t => {
    const d = daysUntil(t.deadline);
    return (t.status === "OPEN" || t.status === "pending") && d !== null && d >= 0 && d <= 2;
  }).length;

  const onlineCount = friends.filter(f => f.isOnline).length;

  // ── Sorted tasks ───────────────────────────────────────────────────────────
  const sortedTasks = useMemo(() => {
    const pending   = orderedTasks.filter(t => t.status === "OPEN" || t.status === "pending");
    const submitted = orderedTasks.filter(t => t.status === "Submitted");
    const graded    = orderedTasks.filter(t => t.status === "Graded" || t.status === "completed");
    return { pending, submitted, graded };
  }, [orderedTasks]);

  // ── Group by course ────────────────────────────────────────────────────────
  const courseGroups = useMemo(() => {
    if (!groupByCourse) return null;
    const groups: Record<string, { course: any; tasks: any[] }> = {};
    const general: any[] = [];

    orderedTasks.forEach(task => {
      if (!task.isCourseTask || !task.courseId) {
        general.push(task);
        return;
      }
      const course = courses.find(c => c.id === task.courseId);
      const key = task.courseId;
      if (!groups[key]) groups[key] = { course: course || { title: "Unknown Course", id: key }, tasks: [] };
      groups[key].tasks.push(task);
    });

    return { groups: Object.values(groups), general };
  }, [orderedTasks, courses, groupByCourse]);

  const TABS = [
    { id: 'tasks', icon: <FaInbox size={12} />, label: 'Tasks', badge: overdueCount > 0 ? overdueCount : null, badgeColor: 'bg-red-500' },
    { id: 'calendar', icon: <FaCalendarAlt size={12} />, label: 'Calendar', badge: null, badgeColor: '' },
    { id: 'network', icon: <FaUserFriends size={12} />, label: 'Network', badge: onlineCount > 0 ? onlineCount : null, badgeColor: 'bg-emerald-500' },
  ] as const;

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed md:relative top-0 right-0 h-full z-50 md:z-20 flex flex-col transition-all duration-300 ease-in-out
        bg-white/95 dark:bg-[#0d0d0f]/95 backdrop-blur-2xl
        border-l border-zinc-200 dark:border-zinc-800/80
        ${isOpen ? "translate-x-0 w-[88%] sm:w-80 shadow-2xl md:shadow-none" : "translate-x-full md:translate-x-0 md:w-0 opacity-0 overflow-hidden border-none"}`}
      >
        {/* ── Header ── */}
        <div className="shrink-0 px-4 pt-4 pb-0 border-b border-zinc-100 dark:border-zinc-800/80">
          {/* Top row — progress ring + title + close */}
          <div className="flex items-center gap-3 mb-4">
            <ProgressRing done={doneTasks} total={totalTasks} />
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Command Center</h2>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                {doneTasks}/{totalTasks} tasks complete
              </p>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                {friends.length} in network
              </p>
            </div>
            <button onClick={onClose}
              className="md:hidden w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors shrink-0">
              <FaTimes size={13} />
            </button>
          </div>

          {/* Urgency strip */}
          {(overdueCount > 0 || urgentCount > 0) && (
            <div className="flex gap-2 mb-3">
              {overdueCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl flex-1">
                  <FaExclamationTriangle size={9} className="text-red-500 shrink-0" />
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{overdueCount} overdue</span>
                </div>
              )}
              {urgentCount > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex-1">
                  <FaFire size={9} className="text-amber-500 shrink-0" />
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{urgentCount} urgent</span>
                </div>
              )}
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1 -mx-1 px-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-t-xl border-b-2 touch-manipulation
                  ${activeTab === tab.id
                    ? 'text-[#06402B] dark:text-emerald-400 border-[#06402B] dark:border-emerald-400 bg-[#06402B]/5 dark:bg-emerald-500/5'
                    : 'text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge !== null && (
                  <span className={`absolute -top-1 -right-1 w-4 h-4 ${tab.badgeColor} text-white text-[8px] font-black rounded-full flex items-center justify-center`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">

            {/* ── TASKS TAB ── */}
            {activeTab === 'tasks' && (
              <motion.div key="tasks"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="p-4 space-y-4"
              >
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Group by course toggle */}
                    <button
                      onClick={() => setGroupByCourse(v => !v)}
                      title="Group by course"
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all touch-manipulation ${
                        groupByCourse
                          ? 'bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 dark:bg-emerald-500/10'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <FaLayerGroup size={9} /> Course
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Templates toggle */}
                    <button
                      onClick={() => setShowTemplates(v => !v)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all touch-manipulation ${
                        showTemplates
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <FaBolt size={9} /> Quick
                    </button>

                    {/* Add task */}
                    <button onClick={() => { setIsAddingTask(v => !v); setShowTemplates(false); }}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all touch-manipulation ${
                        isAddingTask
                          ? 'bg-[#06402B] text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400'
                      }`}>
                      <FaPlus size={11} />
                    </button>
                  </div>
                </div>

                {/* Quick templates */}
                <AnimatePresence>
                  {showTemplates && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <QuickTemplates onSelect={handleTemplateSelect} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Add task form */}
                <AnimatePresence>
                  {isAddingTask && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleTaskSubmit} className="overflow-hidden"
                    >
                      <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col gap-3 shadow-sm">
                        <input
                          type="text" autoFocus placeholder="New task name..."
                          value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                          className="w-full text-sm font-medium bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:font-normal placeholder:text-zinc-400"
                        />
                        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3 gap-2">
                          <div className="flex items-center gap-1.5 text-zinc-400">
                            <FaClock size={9} />
                            <input
                              type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)}
                              className="bg-transparent text-xs text-zinc-500 dark:text-zinc-400 outline-none cursor-pointer"
                            />
                          </div>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => setIsAddingTask(false)}
                              className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                              Cancel
                            </button>
                            <button type="submit" disabled={!newTaskTitle.trim()}
                              className="px-3 py-1.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-[#042d1f] transition-colors">
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Swipe hint — mobile only, shown once */}
                {activeTasks.length > 0 && (
                  <p className="text-[9px] text-zinc-400 font-medium text-center md:hidden">
                    ← swipe to delete · swipe to complete →
                  </p>
                )}

                {/* ── GROUPED BY COURSE ── */}
                {groupByCourse && courseGroups ? (
                  <div className="space-y-5">
                    {courseGroups.groups.map(({ course, tasks }) => (
                      <div key={course.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => { onNavigateToCourse(course.id); onClose(); }}
                            className="flex items-center gap-1.5 text-[9px] font-black text-[#06402B] dark:text-emerald-400 uppercase tracking-widest hover:underline"
                          >
                            <FaLayerGroup size={8} />
                            {course.title}
                          </button>
                          <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                            {tasks.length}
                          </span>
                        </div>
                        <Reorder.Group
  axis="y"
  values={sortedTasks.pending}
  onReorder={(reordered) => {
    setOrderedTasks(prev => {
      const reorderedIds = new Set(reordered.map((t: any) => t.id));
      const rest = prev.filter(t => !reorderedIds.has(t.id));
      return [...reordered, ...rest];
    });
  }}
  className="space-y-2"
>
  {sortedTasks.pending.map(task => (
    <Reorder.Item key={task.id} value={task} className="list-none">
      <SwipeableTaskItem
        task={task}
        today={today}
        onToggle={() => onToggleTask(task)}
        onDelete={() => onDeleteTask(task)}
      />
    </Reorder.Item>
  ))}
</Reorder.Group>
                      </div>
                    ))}

                    {/* General tasks */}
                    {courseGroups.general.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">General</p>
                        {courseGroups.general.map(task => (
                          <SwipeableTaskItem
                            key={task.id} task={task} today={today}
                            onToggle={() => onToggleTask(task)}
                            onDelete={() => onDeleteTask(task)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                ) : (
                  // ── FLAT LIST with drag reorder ──
                  <>
                    {sortedTasks.pending.length === 0 && sortedTasks.submitted.length === 0 && sortedTasks.graded.length === 0 ? (
                      <div className="py-12 flex flex-col items-center gap-3 text-zinc-400">
                        <FaCheckCircle size={24} className="opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">All clear!</p>
                        <p className="text-[10px] text-zinc-400 text-center">No active tasks. Enjoy the peace.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {sortedTasks.pending.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                              Pending — {sortedTasks.pending.length}
                            </p>
<Reorder.Group
  axis="y"
  values={sortedTasks.pending}
  onReorder={(reordered) => {
    setOrderedTasks(prev => {
      const reorderedIds = new Set(reordered.map((t: any) => t.id));
      const rest = prev.filter(t => !reorderedIds.has(t.id));
      return [...reordered, ...rest];
    });
  }}
  className="space-y-2"
>
  {sortedTasks.pending.map(task => (
    <Reorder.Item key={task.id} value={task} className="list-none">
      <SwipeableTaskItem
        task={task}
        today={today}
        onToggle={() => onToggleTask(task)}
        onDelete={() => onDeleteTask(task)}
      />
    </Reorder.Item>
  ))}
</Reorder.Group>
                          </div>
                        )}

                        {sortedTasks.submitted.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                              Submitted — {sortedTasks.submitted.length}
                            </p>
                            <AnimatePresence>
                              {sortedTasks.submitted.map(task => (
                                <SwipeableTaskItem
                                  key={task.id} task={task} today={today}
                                  onToggle={() => onToggleTask(task)}
                                  onDelete={() => onDeleteTask(task)}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        )}

                        {sortedTasks.graded.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                              Graded — {sortedTasks.graded.length}
                            </p>
                            <AnimatePresence>
                              {sortedTasks.graded.map(task => (
                                <SwipeableTaskItem
                                  key={task.id} task={task} today={today}
                                  onToggle={() => onToggleTask(task)}
                                  onDelete={() => onDeleteTask(task)}
                                />
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <button onClick={() => { onNavigate('tracker'); onClose(); }}
                  className="w-full py-2.5 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:border-[#06402B]/40 dark:hover:border-emerald-500/40 transition-all flex items-center justify-center gap-1.5">
                  Open Full Tracker →
                </button>
              </motion.div>
            )}

            {/* ── CALENDAR TAB ── */}
            {activeTab === 'calendar' && (
              <motion.div key="calendar"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="p-4 space-y-4"
              >
                <MiniCalendar activeTasks={activeTasks} />
                {(() => {
                  const upcoming = activeTasks
                    .filter(t => {
                      const d = daysUntil(t.deadline);
                      return !isTaskDone(t.status) && d !== null && d >= 0 && d <= 7;
                    })
                    .sort((a, b) => (daysUntil(a.deadline) ?? 99) - (daysUntil(b.deadline) ?? 99));
                  if (upcoming.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">This Week</p>
                      {upcoming.map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-2.5 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl">
                          <div className="text-center shrink-0 w-8">
                            <p className="text-sm font-black text-[#06402B] dark:text-emerald-400 leading-none">{daysUntil(task.deadline) === 0 ? "!" : daysUntil(task.deadline)}</p>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase">{daysUntil(task.deadline) === 0 ? "today" : "days"}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{task.title}</p>
                            {task.type && <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{task.type}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <button onClick={() => { onNavigate('calendar'); onClose(); }}
                  className="w-full py-2.5 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:border-[#06402B]/40 transition-all flex items-center justify-center gap-1.5">
                  Open Master Calendar →
                </button>
              </motion.div>
            )}

            {/* ── NETWORK TAB ── */}
            {activeTab === 'network' && (
              <motion.div key="network"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="p-4 space-y-4"
              >
                {onlineCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                      {onlineCount} classmate{onlineCount > 1 ? 's' : ''} online now
                    </span>
                  </div>
                )}
                {friends.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-3 text-zinc-400">
                    <FaUserFriends size={24} className="opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">No network yet</p>
                    <p className="text-[10px] text-center">Connect with classmates to see them here.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">
                      {friends.length} in your network
                    </p>
                    {[...friends]
                      .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                      .map(friend => (
                        <motion.div key={friend.uid}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                        >
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-600 dark:text-zinc-400 border-2 border-white dark:border-zinc-900">
                              {friend.avatarUrl
                                ? <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                : <span>{friend.fullName?.charAt(0) || "?"}</span>
                              }
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#0d0d0f] transition-colors ${friend.isOnline ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{friend.fullName}</p>
                            <div className="flex items-center gap-1.5">
                              <p className={`text-[9px] font-bold uppercase tracking-widest ${friend.isOnline ? "text-emerald-500" : "text-zinc-400"}`}>
                                {friend.isOnline ? "Online" : "Offline"}
                              </p>
                              {friend.college && (
                                <>
                                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{friend.college}</p>
                                </>
                              )}
                            </div>
                          </div>
                          {friend.yearLevel && (
                            <span className="text-[9px] font-black text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-lg uppercase tracking-widest shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {friend.yearLevel}
                            </span>
                          )}
                        </motion.div>
                      ))}
                  </div>
                )}
                <button onClick={() => { onNavigate('studyhub'); onClose(); }}
                  className="w-full py-2.5 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:border-[#06402B]/40 transition-all flex items-center justify-center gap-1.5">
                  Open Study Lounge →
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </aside>
    </>
  );
}