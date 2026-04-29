"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaTimes, FaPlus, FaCheckCircle, FaRegCircle, 
  FaTrashAlt, FaUserFriends, FaChevronLeft, FaChevronRight,
  FaFire, FaClock, FaExclamationTriangle, FaInbox,
  FaCalendarAlt, FaSortAmountDown
} from "react-icons/fa";
import Image from "next/image";

interface CommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  activeTasks: any[];
  friends: any[];
  onAddTask: (title: string, deadline: string) => Promise<void>;
  onToggleTask: (task: any) => Promise<void>;
  onDeleteTask: (task: any) => Promise<void>;
  onNavigate: (view: string) => void;
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

function UrgencyChip({ deadline, status }: { deadline: string; status: string }) {
  if (!deadline || status === "Graded" || status === "completed") return null;
  const days = daysUntil(deadline);
  if (days === null) return null;
  if (days < 0)  return <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Overdue</span>;
  if (days === 0) return <span className="text-[9px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest animate-pulse">Today</span>;
  if (days === 1) return <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Tomorrow</span>;
  if (days <= 3)  return <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-widest">In {days}d</span>;
  return <span className="text-[9px] font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">{deadline}</span>;
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
        className={`relative w-7 h-7 flex items-center justify-center text-[11px] rounded-lg transition-all font-medium focus:outline-none
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
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <FaChevronLeft size={9} />
        </button>
        <button type="button"
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(null); }}
          className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </button>
        <button type="button" onClick={nextMonth}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
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
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.status === "Submitted" ? "bg-blue-400" : "bg-amber-400"}`} />
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate flex-1">{task.title}</p>
                    {task.type && (
                      <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">{task.type}</span>
                    )}
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

// ─── Task Item ────────────────────────────────────────────────────────────────

function TaskItem({ task, onToggle, onDelete, today }: {
  task: any; onToggle: () => void; onDelete: () => void; today: string;
}) {
  const isOverdue = task.deadline && task.deadline < today;
  const isSubmitted = task.status === "Submitted";
  const days = daysUntil(task.deadline);
  const isUrgent = !isSubmitted && days !== null && days <= 1 && days >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
      className={`group flex items-start gap-3 p-3 rounded-xl border transition-all
        ${isSubmitted
          ? "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800/50 opacity-70"
          : isOverdue
          ? "bg-red-50/50 dark:bg-red-500/5 border-red-200/60 dark:border-red-500/20"
          : isUrgent
          ? "bg-amber-50/50 dark:bg-amber-500/5 border-amber-200/60 dark:border-amber-500/20"
          : "bg-white dark:bg-[#18181b] border-zinc-200 dark:border-zinc-800 hover:border-[#06402B]/30"
        }`}
    >
      <button onClick={onToggle} className={`mt-0.5 shrink-0 transition-colors ${isSubmitted ? "text-blue-500" : "text-zinc-300 dark:text-zinc-600 hover:text-emerald-500"}`}>
        {isSubmitted ? <FaCheckCircle size={15} /> : <FaRegCircle size={15} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold leading-snug truncate ${isSubmitted ? "line-through text-zinc-400" : "text-zinc-800 dark:text-zinc-200"}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {task.isCourseTask && task.type && (
            <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-widest">
              {task.type}
            </span>
          )}
          <UrgencyChip deadline={task.deadline} status={task.status} />
        </div>
      </div>

      <button onClick={onDelete}
        className="shrink-0 text-zinc-300 dark:text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90 p-1">
        <FaTrashAlt size={11} />
      </button>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommandCenter({ 
  isOpen, onClose, activeTasks, friends, onAddTask, onToggleTask, onDeleteTask, onNavigate 
}: CommandCenterProps) {
  
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'network'>('tasks');
  const [sortByUrgency, setSortByUrgency] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await onAddTask(newTaskTitle, newTaskDeadline);
    setNewTaskTitle(""); setNewTaskDeadline(""); setIsAddingTask(false);
  };

  // ── Smart task sorting by urgency ─────────────────────────────────────────
  const sortedTasks = useMemo(() => {
    const pending = activeTasks.filter(t => t.status === "OPEN" || t.status === "pending");
    const submitted = activeTasks.filter(t => t.status === "Submitted");

    if (sortByUrgency) {
      const sorted = [...pending].sort((a, b) => {
        // Overdue first, then by days ascending, then no deadline last
        const da = daysUntil(a.deadline);
        const db = daysUntil(b.deadline);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
      return { pending: sorted, submitted };
    }
    return { pending, submitted };
  }, [activeTasks, sortByUrgency]);

  const overdueCount = activeTasks.filter(t =>
    (t.status === "OPEN" || t.status === "pending") && t.deadline && t.deadline < today
  ).length;

  const urgentCount = activeTasks.filter(t => {
    const d = daysUntil(t.deadline);
    return (t.status === "OPEN" || t.status === "pending") && d !== null && d >= 0 && d <= 2;
  }).length;

  const onlineCount = friends.filter(f => f.isOnline).length;

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
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Command Center</h2>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                {activeTasks.length} active · {friends.length} in network
              </p>
            </div>
            <button onClick={onClose}
              className="md:hidden w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors">
              <FaTimes size={13} />
            </button>
          </div>

          {/* Urgency summary strip */}
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
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-t-xl border-b-2
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
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    {sortedTasks.pending.length} pending · {sortedTasks.submitted.length} submitted
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSortByUrgency(v => !v)} title="Sort by urgency"
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        sortByUrgency
                          ? 'bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 dark:bg-emerald-500/10'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                      <FaSortAmountDown size={9} /> Urgency
                    </button>
                    <button onClick={() => setIsAddingTask(v => !v)}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        isAddingTask
                          ? 'bg-[#06402B] text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-[#06402B] dark:hover:text-emerald-400'
                      }`}>
                      <FaPlus size={11} />
                    </button>
                  </div>
                </div>

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

                {/* Pending tasks */}
                {sortedTasks.pending.length === 0 && sortedTasks.submitted.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-3 text-zinc-400">
                    <FaCheckCircle size={24} className="opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">All clear!</p>
                    <p className="text-[10px] text-zinc-400 text-center">No active tasks. Enjoy the peace.</p>
                  </div>
                ) : (
                  <>
                    {sortedTasks.pending.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                          Pending — {sortedTasks.pending.length}
                        </p>
                        <AnimatePresence>
                          {sortedTasks.pending.map(task => (
                            <TaskItem
                              key={task.id} task={task} today={today}
                              onToggle={() => onToggleTask(task)}
                              onDelete={() => onDeleteTask(task)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}

                    {sortedTasks.submitted.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                          Submitted — {sortedTasks.submitted.length}
                        </p>
                        <AnimatePresence>
                          {sortedTasks.submitted.map(task => (
                            <TaskItem
                              key={task.id} task={task} today={today}
                              onToggle={() => onToggleTask(task)}
                              onDelete={() => onDeleteTask(task)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                )}

                {/* Navigate to tracker */}
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

                {/* Upcoming this week */}
                {(() => {
                  const upcoming = activeTasks
                    .filter(t => { const d = daysUntil(t.deadline); return d !== null && d >= 0 && d <= 7; })
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
                {/* Online summary */}
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