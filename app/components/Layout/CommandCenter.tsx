"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaTimes, FaPlus, FaCheckCircle, FaRegCircle, 
  FaTrashAlt, FaUserFriends, FaChevronLeft, FaChevronRight 
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

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ activeTasks }: { activeTasks: any[] }) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  // Which date is selected (for day-of-tasks drill-down)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  // Build a Set of deadline date strings for O(1) lookup
  const deadlineSet = useMemo(() => {
    const s = new Set<string>();
    activeTasks.forEach(t => { if (t.deadline) s.add(t.deadline); });
    return s;
  }, [activeTasks]);

  // Tasks for selected date
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

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`e-${i}`} className="w-7 h-7" />);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(viewYear, viewMonth, d);
    const isToday = isCurrentMonth && d === today.getDate();
    const hasTask = deadlineSet.has(dateStr);
    const isSelected = selectedDate === dateStr;

    cells.push(
      <button
        key={d}
        type="button"
        onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
        className={`relative w-7 h-7 flex items-center justify-center text-xs rounded-md transition-all font-medium focus:outline-none
          ${isSelected
            ? "bg-[#06402B] text-white ring-2 ring-[#06402B]/30"
            : isToday
            ? "bg-[#06402B] text-white font-bold"
            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
      >
        {d}
        {/* Deadline dot — shown only when not selected/today (those are already highlighted) */}
        {hasTask && !isToday && !isSelected && (
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full" />
        )}
        {/* When today also has tasks, show a white dot */}
        {hasTask && isToday && (
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white/70 rounded-full" />
        )}
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-[#18181b] rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Previous month"
        >
          <FaChevronLeft size={10} />
        </button>
        <button
          type="button"
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(null); }}
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors"
          title="Jump to today"
        >
          {MONTH_NAMES[viewMonth]} {viewYear}
        </button>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Next month"
        >
          <FaChevronRight size={10} />
        </button>
      </div>

      {/* Day labels */}
      <div className="px-4 pt-3 pb-1 grid grid-cols-7 gap-1 text-center">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-xs font-medium text-zinc-400 dark:text-zinc-500 w-7 mx-auto">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="px-4 pb-3 grid grid-cols-7 gap-1 justify-items-center">
        {cells}
      </div>

      {/* Selected date task drill-down */}
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
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </p>
              {tasksOnSelected.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No tasks due this day.</p>
              ) : (
                tasksOnSelected.map(task => (
                  <div key={task.id} className="flex items-center gap-2 py-1">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.status === "Submitted" ? "bg-blue-400" : "bg-amber-400"}`} />
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{task.title}</p>
                    {task.type && (
                      <span className="ml-auto text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">{task.type}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="px-4 pb-3 flex items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Has deadline
        </span>
        <span className="flex items-center gap-1 text-[10px] text-zinc-400">
          <span className="w-3 h-3 rounded-sm bg-[#06402B] inline-block" /> Today
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommandCenter({ 
  isOpen, onClose, activeTasks, friends, onAddTask, onToggleTask, onDeleteTask, onNavigate 
}: CommandCenterProps) {
  
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await onAddTask(newTaskTitle, newTaskDeadline);
    setNewTaskTitle("");
    setNewTaskDeadline("");
    setIsAddingTask(false);
  };

  // Group tasks
  const pendingTasks = activeTasks.filter(t => t.status === "OPEN" || t.status === "pending");
  const ongoingTasks = activeTasks.filter(t => t.status === "Submitted");

  // Upcoming: tasks with a future or today deadline, sorted ascending
  const today = new Date().toISOString().slice(0, 10);
  const upcomingCount = activeTasks.filter(t => t.deadline && t.deadline >= today && t.status !== "Graded").length;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed md:relative top-0 right-0 h-full z-50 md:z-20 bg-[#fafafa] dark:bg-[#0e0e0e] md:bg-white/50 md:dark:bg-[#09090b]/80 border-l border-zinc-200 dark:border-zinc-800/80 shrink-0 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? "translate-x-0 w-[85%] sm:w-80 shadow-xl md:shadow-none" : "translate-x-full md:translate-x-0 md:w-0 opacity-0 overflow-hidden border-none"}`}>
        
        {/* Mobile header */}
        <div className="flex md:hidden items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800/80">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Workspace Tasks</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800">
            <FaTimes size={14} />
          </button>
        </div>

        <div className="p-5 md:p-6 flex-1 flex flex-col h-full min-w-[300px] overflow-y-auto custom-scrollbar gap-8">

          {/* ── LAYER 1: TASK QUEUE ─────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Deliverables</h2>
                {upcomingCount > 0 && (
                  <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md tabular-nums">
                    {upcomingCount} upcoming
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsAddingTask(!isAddingTask)}
                className="text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded"
              >
                <FaPlus size={12} />
              </button>
            </div>
            
            <AnimatePresence>
              {isAddingTask && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleTaskSubmit}
                  className="mb-4 overflow-hidden w-full"
                >
                  <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 flex flex-col gap-3 shadow-sm">
                    <input
                      type="text" autoFocus placeholder="Task name..."
                      value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                      className="w-full text-sm font-medium bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:font-normal placeholder:text-zinc-400"
                    />
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                      <input
                        type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)}
                        className="bg-transparent text-xs text-zinc-500 dark:text-zinc-400 outline-none cursor-pointer"
                      />
                      <button
                        type="submit" disabled={!newTaskTitle.trim()}
                        className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md px-4 py-1.5 text-xs font-medium disabled:opacity-50 hover:opacity-80 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-5">

              {/* Pending */}
              <div>
                <h3 className="text-xs font-medium text-zinc-500 mb-2">Pending ({pendingTasks.length})</h3>
                {pendingTasks.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No pending tasks.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingTasks.map(task => {
                      const isOverdue = task.deadline && task.deadline < today;
                      return (
                        <div
                          key={task.id}
                          className={`group p-3 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-start gap-3 shadow-sm hover:bg-zinc-50 dark:hover:bg-[#202024] transition-colors border-l-4 ${isOverdue ? "border-l-red-400 dark:border-l-red-500" : "border-l-amber-400 dark:border-l-amber-500"}`}
                        >
                          <button onClick={() => onToggleTask(task)} className="mt-0.5 text-zinc-400 hover:text-emerald-500 transition-colors">
                            <FaRegCircle size={16} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {task.isCourseTask && (
                                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">
                                  {task.type || "Course"}
                                </span>
                              )}
                              {task.deadline && (
                                <span className={`text-[10px] ${isOverdue ? "text-red-500 font-bold" : "text-zinc-500"}`}>
                                  {isOverdue ? "⚠ Overdue · " : "Due: "}{task.deadline}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => onDeleteTask(task)} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90 shrink-0">
                            <FaTrashAlt size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ongoing / Submitted */}
              <div>
                <h3 className="text-xs font-medium text-zinc-500 mb-2">Ongoing / Submitted ({ongoingTasks.length})</h3>
                {ongoingTasks.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No tasks in progress.</p>
                ) : (
                  <div className="space-y-2">
                    {ongoingTasks.map(task => (
                      <div
                        key={task.id}
                        className="group p-3 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-start gap-3 shadow-sm border-l-4 border-l-blue-400 dark:border-l-blue-500 hover:bg-zinc-50 dark:hover:bg-[#202024] transition-colors opacity-80 hover:opacity-100"
                      >
                        <button onClick={() => onToggleTask(task)} className="mt-0.5 text-blue-500 transition-colors">
                          <FaCheckCircle size={16} />
                        </button>
                        <div className="flex-1 min-w-0 line-through decoration-zinc-300 dark:decoration-zinc-600">
                          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-snug">{task.title}</p>
                          {task.isCourseTask && (
                            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                              Submitted
                            </span>
                          )}
                        </div>
                        <button onClick={() => onDeleteTask(task)} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90 shrink-0">
                          <FaTrashAlt size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── LAYER 2: MINI CALENDAR ─────────────────────────────────────── */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Calendar</h2>
            </div>
            <MiniCalendar activeTasks={activeTasks} />
          </div>

          {/* ── LAYER 3: NETWORK ────────────────────────────────────────────── */}
          <div className="shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                <FaUserFriends className="text-zinc-400" /> Network
              </h2>
              {/* Online count badge */}
              {friends.filter(f => f.isOnline).length > 0 && (
                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                  {friends.filter(f => f.isOnline).length} online
                </span>
              )}
            </div>
            {friends.length === 0 ? (
              <p className="text-xs text-zinc-400 italic">No friends added yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Sort: online first */}
                {[...friends].sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)).map(friend => (
                  <div
                    key={friend.uid}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        {friend.avatarUrl
                          ? <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          : friend.fullName?.charAt(0)
                        }
                      </div>
                      <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#fafafa] dark:border-[#0e0e0e] transition-colors ${friend.isOnline ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{friend.fullName}</p>
                      <p className="text-xs text-zinc-500 truncate">{friend.isOnline ? "Online" : "Offline"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </aside>
    </>
  );
}