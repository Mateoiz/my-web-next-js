"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChevronLeft, FaChevronRight, FaCalendarDay,
  FaExclamationCircle, FaPlus, FaTimes, FaShieldAlt,
  FaGraduationCap, FaUmbrellaBeach, FaClipboardList, FaTrash, FaClock
} from "react-icons/fa";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/db";

// ── Types ─────────────────────────────────────────────────────────────────────
type EventType = "academic" | "holiday" | "exam" | "admin" | "schedule";

interface CalendarEvent {
  title: string;
  type: EventType;
  endDate?: string; // for multi-day stretch events
  adminAdded?: boolean;
}

// ── Built-in school events ────────────────────────────────────────────────────
const SCHOOL_EVENTS: Record<string, CalendarEvent> = {
  "2025-09-15": { title: "Start of Classes (1st Term)", type: "academic" },
  "2025-10-23": { title: "Midterm Exams Start", type: "exam" },
  "2025-10-29": { title: "Midterm Exams End", type: "exam" },
  "2025-11-01": { title: "All Saints' Day", type: "holiday" },
  "2025-11-02": { title: "All Souls' Day", type: "holiday" },
  "2025-11-14": { title: "Honors' Assembly (1st Term)", type: "academic" },
  "2025-11-30": { title: "Bonifacio Day", type: "holiday" },
  "2025-12-08": { title: "Immaculate Conception", type: "holiday" },
  "2025-12-12": { title: "Final Exams Start", type: "exam" },
  "2025-12-18": { title: "Final Exams End", type: "exam" },
  "2025-12-25": { title: "Christmas Day", type: "holiday" },
  "2025-12-30": { title: "Rizal Day", type: "holiday" },
  "2026-01-01": { title: "New Year's Day", type: "holiday" },
  "2026-01-12": { title: "Start of Classes (2nd Term)", type: "academic" },
  "2026-02-23": { title: "Midterm Exams Start", type: "exam" },
  "2026-03-02": { title: "Midterm Exams End", type: "exam" },
  "2026-03-20": { title: "Honors' Assembly (2nd Term)", type: "academic" },
  "2026-04-02": { title: "Maundy Thursday", type: "holiday" },
  "2026-04-03": { title: "Good Friday", type: "holiday" },
  "2026-04-09": { title: "Day of Valor", type: "holiday" },
  "2026-04-13": { title: "Final Exams Start", type: "exam" },
  "2026-04-18": { title: "Final Exams End", type: "exam" },
  "2026-05-01": { title: "Labor Day", type: "holiday" },
  "2026-05-04": { title: "Start of Classes (3rd Term)", type: "academic" },
  "2026-06-12": { title: "Independence Day", type: "holiday" },
  "2026-06-15": { title: "Midterm Exams Start", type: "exam" },
  "2026-06-20": { title: "Midterm Exams End", type: "exam" },
  "2026-07-10": { title: "Honors' Assembly (3rd Term)", type: "academic" },
  "2026-08-20": { title: "Deliberation Day", type: "academic" },
  "2026-08-31": { title: "National Heroes Day", type: "holiday" },
  "2026-09-19": { title: "Commencement Exercises", type: "academic" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const eventStyles: Record<EventType, string> = {
  exam:     "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  holiday:  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  academic: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  admin:    "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
  schedule: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20",
};

const eventIcons: Record<EventType, React.ReactNode> = {
  exam:     <FaClipboardList size={9} />,
  holiday:  <FaUmbrellaBeach size={9} />,
  academic: <FaGraduationCap size={9} />,
  admin:    <FaShieldAlt size={9} />,
  schedule: <FaClock size={9} />,
};

// ── Legend pill ───────────────────────────────────────────────────────────────
function LegendPill({ type, label }: { type: EventType; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${eventStyles[type]}`}>
      {eventIcons[type]} {label}
    </span>
  );
}

// ── Day Detail Sheet (mobile tap) ─────────────────────────────────────────────
// ── Day Detail — Popover on desktop, bottom sheet on mobile ──────────────────
function DaySheet({
  dateStr, events, tasks, courseTasks, isAdmin, onClose, onAdminDelete, anchorRect,
  getCourseColorPill,
}: {
  dateStr: string;
  events: CalendarEvent[];
  tasks: any[];
  courseTasks: CourseTaskWithMeta[];
  isAdmin: boolean;
  onClose: () => void;
  onAdminDelete: (title: string) => void;
  anchorRect?: DOMRect | null;
  getCourseColorPill: (color?: string) => string;
}) {
  const date = new Date(dateStr + "T00:00:00");
  const label = date.toLocaleDateString("en-PH", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

const isEmpty = events.length === 0 && tasks.length === 0 && courseTasks.length === 0;


  // ── Desktop popover position ────────────────────────────────────────────────
  const popoverStyle = (() => {
    if (!anchorRect) return {};
    const popW = 280;
    const popH = 320;
    const pad = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = anchorRect.left + anchorRect.width / 2 - popW / 2;
    let top = anchorRect.bottom + pad;

    // Flip above if it'd overflow viewport bottom
    if (top + popH > vh - pad) top = anchorRect.top - popH - pad;
    // Clamp horizontally
    left = Math.max(pad, Math.min(left, vw - popW - pad));

    return { position: "fixed" as const, top, left, width: popW };
  })();

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

if (isDesktop && anchorRect) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="popover-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Popover card */}
      <motion.div
        key="popover-card"
        initial={{ opacity: 0, scale: 0.94, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: -6 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        style={popoverStyle}
        className="z-50 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <p className="text-xs font-black text-zinc-900 dark:text-white">
              {date.toLocaleString("default", { weekday: "long" })}
            </p>
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mt-0.5">
              {date.toLocaleString("default", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shrink-0 mt-0.5"
          >
            <FaTimes size={9} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 max-h-56 overflow-y-auto space-y-1.5">
          {isEmpty ? (
            <p className="text-xs text-zinc-400 font-bold py-4 text-center">No events for this day.</p>
          ) : (
            <>
              {events.map((ev, i) => (
                <div key={`ev-${i}`} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[11px] font-bold ${eventStyles[ev.type]}`}>
                  <span className="flex items-center gap-1.5 min-w-0">
                    {eventIcons[ev.type]}
                    <span className="truncate">{ev.title}</span>
                    {ev.endDate && (
                      <span className="opacity-50 font-normal shrink-0">→ {ev.endDate}</span>
                    )}
                  </span>
                  {isAdmin && ev.adminAdded && (
                    <button
                      onClick={() => onAdminDelete(ev.title)}
                      className="shrink-0 opacity-50 hover:opacity-100 hover:text-red-500 transition-all"
                    >
                      <FaTrash size={10} />
                    </button>
                  )}
                </div>
              ))}
{tasks.map(task => (
  <div key={`task-${task.id}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
    <FaExclamationCircle className="text-[#06402B] shrink-0" size={11} />
    <span className="truncate">{task.title || task.name}</span>
  </div>
))}
{/* Course tasks — colored by course */}
{courseTasks.map(task => (
  <div key={`ct-${task.id}`} className={`flex items-start gap-2 px-3 py-2 rounded-xl text-[11px] font-bold border ${getCourseColorPill(task.courseColor)}`}>
    <div className="flex-1 min-w-0">
      <p className="truncate font-black">{task.name}</p>
      <p className="text-[10px] font-bold opacity-60 truncate">{task.courseTitle} · {task.type}</p>
    </div>
  </div>
))}
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

  // ── Mobile bottom sheet (unchanged) ────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  className="fixed inset-0 z-60 flex items-end justify-center bg-black/50 backdrop-blur-sm"      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
  className="w-full max-w-lg bg-white dark:bg-zinc-950 rounded-t-4xl p-6 pb-28 border-t border-zinc-200 dark:border-zinc-800 shadow-2xl"        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-5" />
        <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
        {isEmpty ? (
          <p className="text-sm text-zinc-400 font-bold py-6 text-center">No events for this day.</p>
        ) : (
          <div className="space-y-2 mt-3">
            {events.map((ev, i) => (
              <div key={i} className={`flex items-start justify-between gap-2 p-3 rounded-xl text-xs font-bold ${eventStyles[ev.type]}`}>
                <span className="flex items-center gap-2">
                  {eventIcons[ev.type]} {ev.title}
                  {ev.endDate && <span className="opacity-60 font-normal">→ {ev.endDate}</span>}
                </span>
                {isAdmin && ev.adminAdded && (
                  <button onClick={() => onAdminDelete(ev.title)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                    <FaTrash size={11} />
                  </button>
                )}
              </div>
            ))}
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 p-3 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                <FaExclamationCircle className="text-[#06402B] shrink-0" size={11} />
                {task.title || task.name}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
// ── Admin Add Event Modal ─────────────────────────────────────────────────────
function AdminEventModal({
  onConfirm, onCancel,
}: {
  onConfirm: (event: { title: string; type: EventType; startDate: string; endDate?: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("admin");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const valid = title.trim() && startDate;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.93, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 20 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="bg-white dark:bg-zinc-900 rounded-4xl p-6 w-full max-w-sm shadow-2xl border border-zinc-200 dark:border-zinc-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <FaShieldAlt className="text-purple-500" size={13} />
            </span>
            <h3 className="font-black text-sm uppercase tracking-tight">Add Event</h3>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            <FaTimes size={12} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Event Title</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Enrollment Period"
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-purple-400 transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["academic", "exam", "holiday", "admin"] as EventType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${type === t ? eventStyles[t] : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"}`}
                >
                  {eventIcons[t]} {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">Start Date</label>
              <input
                type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-sm font-bold outline-none focus:border-purple-400 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1 block">End Date <span className="normal-case font-normal opacity-60">(optional)</span></label>
              <input
                type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-sm font-bold outline-none focus:border-purple-400 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-black text-[11px] uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
            Cancel
          </button>
          <button
            onClick={() => valid && onConfirm({ title: title.trim(), type, startDate, endDate: endDate || undefined })}
            disabled={!valid}
            className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-black text-[11px] uppercase tracking-widest hover:bg-purple-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Event
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface ScheduleClass {
  id: string;
  code: string;
  name: string;
  room: string;
  days: string[];
  startTime: string;
  endTime: string;
  color: string;
}

interface CourseTaskWithMeta {
  id: string;
  name: string;
  type: string;
  deadline: string;
  status: string;
  courseId: string;
  courseTitle?: string;
  courseColor?: string;
}

export default function AcademicCalendar({
  userTasks,
  scheduleClasses = [],
  courses = [],
  courseTasks = [],
}: {
  userTasks: any[];
  scheduleClasses?: ScheduleClass[];
  courses?: any[];
  courseTasks?: any[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEvents, setAdminEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [showAddModal, setShowAddModal] = useState(false);
const [selectedDay, setSelectedDay] = useState<{ dateStr: string; rect: DOMRect } | null>(null);


 const [view, setView] = useState<"month" | "list" | "timeline">("month");

  // ── Auth + Admin check ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return;
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().role === "admin") setIsAdmin(true);
    });
    return () => unsub();
  }, []);

  // ── Load admin events from Firestore ───────────────────────────────────────
useEffect(() => {
    // 1. Wait for Auth to confirm the user is logged in
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return; // If no user, do not ping the database!

      // 2. ONLY start listening to the database after Auth is confirmed
      const unsubSnap = onSnapshot(doc(db, "app_config", "calendar_events"), 
        snap => {
          if (snap.exists()) setAdminEvents(snap.data() as Record<string, CalendarEvent[]>);
        },
        error => {
          console.warn("Calendar sync delayed/failed:", error.message);
        }
      );

      // Clean up the snapshot if the auth state changes
      return () => unsubSnap();
    });

    // Clean up the auth listener when the component unmounts
    return () => unsubAuth();
  }, []);

  // ── Expand stretch events into individual dates ────────────────────────────
  const expandedAdminEvents: Record<string, CalendarEvent[]> = {};
  Object.entries(adminEvents).forEach(([startDate, events]) => {
    events.forEach(ev => {
      if (ev.endDate && ev.endDate > startDate) {
        // Fill every date in the range
        const start = new Date(startDate + "T00:00:00");
        const end = new Date(ev.endDate + "T00:00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
          if (!expandedAdminEvents[key]) expandedAdminEvents[key] = [];
          expandedAdminEvents[key].push({ ...ev, adminAdded: true });
        }
      } else {
        if (!expandedAdminEvents[startDate]) expandedAdminEvents[startDate] = [];
        expandedAdminEvents[startDate].push({ ...ev, adminAdded: true });
      }
    });
  });

const DAY_MAP: Record<string, number> = { M: 1, T: 2, W: 3, Th: 4, F: 5, S: 6 };

  const getScheduleEventsForDate = (dateStr: string): CalendarEvent[] => {
    const date = new Date(dateStr + "T00:00:00");
    const dow = date.getDay(); // 0=Sun,1=Mon,...,6=Sat
    return scheduleClasses
      .filter(cls => cls.days.some((d: string) => DAY_MAP[d] === dow))
      .map(cls => ({
        title: `${cls.code}${cls.room ? ` · ${cls.room}` : ""}`,
        type: "schedule" as EventType,
      }));
  };

 const COURSE_COLOR_MAP: Record<string, { dot: string; pill: string }> = {
  emerald: { dot: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  blue:    { dot: "bg-blue-500",    pill: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  violet:  { dot: "bg-violet-500",  pill: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20" },
  amber:   { dot: "bg-amber-500",   pill: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  rose:    { dot: "bg-rose-500",    pill: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
  cyan:    { dot: "bg-cyan-500",    pill: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20" },
};

const getCourseColorDot = (colorName?: string) =>
  COURSE_COLOR_MAP[colorName ?? "emerald"]?.dot ?? "bg-emerald-500";
const getCourseColorPill = (colorName?: string) =>
  COURSE_COLOR_MAP[colorName ?? "emerald"]?.pill ?? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
const enrichedCourseTasks: CourseTaskWithMeta[] = courseTasks
  .filter(t => t.deadline && t.status !== "Graded" && t.status !== "Submitted")
  .map(t => {
    const course = courses.find(c => c.id === t.courseId);
    return {
      ...t,
      name: t.name || "Untitled",
      courseTitle: course?.title ?? "Unknown Course",
      courseColor: course?.color ?? "emerald",
    };
  });

const getCourseTasksForDate = (dateStr: string) =>
  enrichedCourseTasks.filter(t => t.deadline === dateStr);
  

  const getEventsForDate = (dateStr: string): CalendarEvent[] => {
    const base = SCHOOL_EVENTS[dateStr] ? [SCHOOL_EVENTS[dateStr]] : [];
    return [
      ...base,
      ...(expandedAdminEvents[dateStr] || []),
      ...getScheduleEventsForDate(dateStr),
    ];
  };

  // ── Admin: save new event ──────────────────────────────────────────────────
  const handleAdminAddEvent = async (ev: { title: string; type: EventType; startDate: string; endDate?: string }) => {
    const ref = doc(db, "app_config", "calendar_events");
    const updated = { ...adminEvents };
    if (!updated[ev.startDate]) updated[ev.startDate] = [];
    updated[ev.startDate].push({ title: ev.title, type: ev.type, endDate: ev.endDate, adminAdded: true });
    await setDoc(ref, updated);
    setAdminEvents(updated);
    setShowAddModal(false);
  };

  // ── Admin: delete event ────────────────────────────────────────────────────
  const handleAdminDelete = async (dateStr: string, title: string) => {
    const ref = doc(db, "app_config", "calendar_events");
    const updated = { ...adminEvents };
    // Find and remove from whichever start date contains this event
    Object.keys(updated).forEach(key => {
      updated[key] = updated[key].filter(e => !(e.title === title && (key === dateStr || (e.endDate && dateStr >= key && dateStr <= e.endDate))));
      if (updated[key].length === 0) delete updated[key];
    });
    await setDoc(ref, updated);
    setAdminEvents(updated);
  };

  const changeMonth = (offset: number) =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));

  const goToday = () => setCurrentDate(new Date());

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const todayStr = toDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  // ── List view: upcoming events this month ──────────────────────────────────
  const listEvents = Array.from({ length: daysInMonth }, (_, i) => {
    const dateStr = toDateStr(year, month, i + 1);
    const events = getEventsForDate(dateStr);
    const tasks = userTasks.filter(t => t.deadline === dateStr);
    return { dateStr, events, tasks };
  }).filter(d => d.events.length > 0 || d.tasks.length > 0);

  return (
    <>
      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AdminEventModal onConfirm={handleAdminAddEvent} onCancel={() => setShowAddModal(false)} />
        )}
{selectedDay && (
  <DaySheet
    dateStr={selectedDay.dateStr}
    events={getEventsForDate(selectedDay.dateStr)}
    tasks={userTasks.filter(t => t.deadline === selectedDay.dateStr)}
    courseTasks={getCourseTasksForDate(selectedDay.dateStr)}
    isAdmin={isAdmin}
    onClose={() => setSelectedDay(null)}
    onAdminDelete={(title) => {
      handleAdminDelete(selectedDay.dateStr, title);
      setSelectedDay(null);
    }}
    anchorRect={selectedDay.rect}
    getCourseColorPill={getCourseColorPill}
  />
)}
      </AnimatePresence>

      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-4xl border border-zinc-200 dark:border-zinc-800 p-4 md:p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 w-full">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <FaCalendarDay className="text-[#06402B]" />
                Master Calendar
                {isAdmin && (
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-500 text-[9px] rounded-md flex items-center gap-1 font-black uppercase tracking-widest">
                    <FaShieldAlt size={9} /> Admin
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">University Schedule & Personal Deadlines</p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 active:scale-95 transition-all shadow-md shrink-0"
              >
                <FaPlus size={10} /> Add Event
              </button>
            )}
          </div>

          {/* Nav row */}
          <div className="flex items-center gap-2">
            {/* Month nav */}
            <div className="flex items-center flex-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden">
              <button onClick={() => changeMonth(-1)} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-500 touch-manipulation">
                <FaChevronLeft size={12} />
              </button>
              <span className="flex-1 text-center text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">
                {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-zinc-500 touch-manipulation">
                <FaChevronRight size={12} />
              </button>
            </div>

            {/* Today button */}
            <button
              onClick={goToday}
              className="px-3 py-2.5 rounded-xl bg-[#06402B] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#052f1f] active:scale-95 transition-all shadow-md shrink-0"
            >
              Today
            </button>

            {/* View toggle */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/50 overflow-hidden shrink-0">
              {(["month", "list", "timeline"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all touch-manipulation ${view === v ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            <LegendPill type="exam" label="Exam" />
            <LegendPill type="holiday" label="Holiday" />
            <LegendPill type="academic" label="Academic" />
            {isAdmin && <LegendPill type="admin" label="College Event" />}
            {scheduleClasses.length > 0 && <LegendPill type="schedule" label="Class Schedule" />}
          </div>
        </div>

        {/* ── Month View ── */}
        {view === "month" && (
          <div className="w-full overflow-x-auto pb-2 -mx-1 px-1">
            <div className="min-w-[320px] grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">

              {/* Day headers */}
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="bg-zinc-100 dark:bg-zinc-900 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {d}
                </div>
              ))}

              {/* Empty cells */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`e-${i}`} className="bg-white dark:bg-zinc-950 min-h-15 md:min-h-25" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const dateStr = toDateStr(year, month, day);
                const events = getEventsForDate(dateStr);
                const tasks = userTasks.filter(t => t.deadline === dateStr);
                const isToday = dateStr === todayStr;
                const hasContent = events.length > 0 || tasks.length > 0;

                return (
                  <button
                    key={day}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setSelectedDay({ dateStr, rect });
                    }}
                    className={`
                      bg-white dark:bg-zinc-950 min-h-15 md:min-h-25
                      flex flex-col p-1.5 md:p-2 text-left w-full
                      transition-colors touch-manipulation
                      hover:bg-zinc-50 dark:hover:bg-zinc-900
                      active:bg-zinc-100 dark:active:bg-zinc-800
                      ${isToday ? "ring-2 ring-inset ring-[#06402B]" : ""}
                      ${hasContent ? "cursor-pointer" : ""}
                    `}
                  >
                    {/* Date number */}
                    <span className={`
                      text-[10px] md:text-xs font-black shrink-0 w-5 h-5 flex items-center justify-center rounded-full mb-1
                      ${isToday ? "bg-[#06402B] text-white" : "text-zinc-500"}
                    `}>
                      {day}
                    </span>

                    {/* Event dots — mobile */}
                     <div className="flex md:hidden flex-wrap gap-0.5 mt-auto">
                      {events.slice(0, 3).map((ev, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                          ev.type === "exam" ? "bg-red-400" :
                          ev.type === "holiday" ? "bg-amber-400" :
                          ev.type === "admin" ? "bg-purple-400" : "bg-blue-400"
                        }`} />
                      ))}
                      {getCourseTasksForDate(dateStr).slice(0, 3).map((ct, i) => (
                        <span key={`ct-${i}`} className={`w-1.5 h-1.5 rounded-full ${getCourseColorDot(ct.courseColor)}`} />
                      ))}
                      {tasks.slice(0, 1).map((_, i) => (
                        <span key={`t-${i}`} className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                      ))}
                    </div>  {/* ← this closing tag was missing */}

                    {/* Full event labels — desktop */}

                    {/* Full event labels — desktop */}
                    <div className="hidden md:flex flex-col gap-1 flex-1 overflow-hidden">
                      {events.slice(0, 2).map((ev, i) => (
                        <span key={i} className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 ${eventStyles[ev.type]}`}>
                          {eventIcons[ev.type]}
                          <span className="truncate">{ev.title}</span>
                        </span>
                      ))}
{getCourseTasksForDate(dateStr).slice(0, 1).map(ct => (
  <span key={ct.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate border flex items-center gap-1 ${getCourseColorPill(ct.courseColor)}`}>
    <span className="truncate">{ct.name}</span>
  </span>
))}
{tasks.slice(0, 1).map(task => (
  <span key={task.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
    <FaExclamationCircle className="text-[#06402B] shrink-0" size={8} />
    <span className="truncate">{task.title || task.name}</span>
  </span>
))}
{(events.length + tasks.length + getCourseTasksForDate(dateStr).length) > 3 && (
  <span className="text-[8px] font-black text-zinc-400 px-1">
    +{events.length + tasks.length + getCourseTasksForDate(dateStr).length - 3} more
  </span>
)}
                      {(events.length + tasks.length) > 3 && (
                        <span className="text-[8px] font-black text-zinc-400 px-1">
                          +{events.length + tasks.length - 3} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── List View ── */}
{view === "timeline" && (
  <div className="overflow-x-auto pb-4">
    <div className="min-w-[700px] space-y-3">
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">
        Semester Overview — All Deadlines
      </p>

      {courses.map(course => {
        const color = getCourseColorDot(course.color);
        const pill = getCourseColorPill(course.color);
        const tasks = enrichedCourseTasks
          .filter(t => t.courseId === course.id)
          .sort((a, b) => a.deadline.localeCompare(b.deadline));

        if (tasks.length === 0) return null;

        // Find date range for positioning
        const allDeadlines = enrichedCourseTasks.map(t => t.deadline).sort();
        const minDate = new Date(allDeadlines[0] + "T00:00:00");
        const maxDate = new Date(allDeadlines[allDeadlines.length - 1] + "T00:00:00");
        const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / 86400000) + 14;

        const getPos = (deadline: string) => {
          const d = new Date(deadline + "T00:00:00");
          const dayOffset = (d.getTime() - minDate.getTime()) / 86400000;
          return Math.max(0, Math.min(98, (dayOffset / totalDays) * 100));
        };

        return (
          <div key={course.id} className="flex items-center gap-4">
            {/* Course label */}
            <div className="w-32 shrink-0 text-right">
              <p className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 truncate">{course.title}</p>
            </div>

            {/* Timeline bar */}
            <div className="flex-1 relative h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-visible">
              {/* Today marker */}
              {(() => {
                const todayPos = getPos(todayStr);
                return (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#06402B] z-10"
                    style={{ left: `${todayPos}%` }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-[#06402B] whitespace-nowrap">Today</span>
                  </div>
                );
              })()}

              {/* Task markers */}
              {tasks.map(task => {
                const pos = getPos(task.deadline);
                const isExam = task.type === "Midterm Exam" || task.type === "Final Exam";
                return (
                  <div
                    key={task.id}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer z-20"
                    style={{ left: `${pos}%` }}
                  >
                    <div className={`${isExam ? "w-4 h-4" : "w-3 h-3"} rounded-full ${color} border-2 border-white dark:border-zinc-950 shadow-md transition-transform group-hover:scale-150`} />
                    {/* Tooltip */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                      <div className={`px-2 py-1.5 rounded-xl text-[9px] font-black border whitespace-nowrap shadow-xl ${pill}`}>
                        <p>{task.name}</p>
                        <p className="opacity-60 font-normal">{task.deadline}</p>
                      </div>
                      <div className={`w-1.5 h-1.5 rotate-45 border-r border-b ${pill.includes("emerald") ? "border-emerald-500/20 bg-emerald-500/10" : "border-zinc-200 bg-white"} -mt-1`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Date axis */}
      <div className="flex items-center gap-4 mt-2">
        <div className="w-32 shrink-0" />
        <div className="flex-1 flex justify-between">
          {[0, 1, 2, 3].map(i => {
            const allDeadlines = enrichedCourseTasks.map(t => t.deadline).sort();
            if (allDeadlines.length === 0) return null;
            const minDate = new Date(allDeadlines[0] + "T00:00:00");
            const maxDate = new Date(allDeadlines[allDeadlines.length - 1] + "T00:00:00");
            const totalMs = maxDate.getTime() - minDate.getTime();
            const d = new Date(minDate.getTime() + (totalMs * i / 3));
            return (
              <span key={i} className="text-[9px] font-mono font-bold text-zinc-400">
                {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  </div>
)}

        {view === "list" && (
          <div className="space-y-2">
            {listEvents.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 font-bold text-sm border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                No events this month.
              </div>
            ) : (
              listEvents.map(({ dateStr, events, tasks }) => {
                const date = new Date(dateStr + "T00:00:00");
                const isToday = dateStr === todayStr;
                return (
                  <motion.div
                    key={dateStr}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 p-4 rounded-2xl border transition-colors ${isToday ? "bg-[#06402B]/5 border-[#06402B]/20" : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"}`}
                  >
                    {/* Date column */}
                    <div className="shrink-0 w-10 text-center">
                      <p className={`text-lg font-black leading-none ${isToday ? "text-[#06402B]" : "text-zinc-800 dark:text-white"}`}>
                        {date.getDate()}
                      </p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        {date.toLocaleString("default", { weekday: "short" })}
                      </p>
                    </div>

                    {/* Events column */}
                    <div className="flex-1 flex flex-col gap-1.5">
                      {events.map((ev, i) => (
                        <div key={i} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[11px] font-bold ${eventStyles[ev.type]}`}>
                          <span className="flex items-center gap-1.5">{eventIcons[ev.type]} {ev.title}</span>
                          {isAdmin && ev.adminAdded && (
                            <button onClick={() => handleAdminDelete(dateStr, ev.title)} className="opacity-50 hover:opacity-100 transition-opacity shrink-0">
                              <FaTrash size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          <FaExclamationCircle className="text-[#06402B] shrink-0" size={11} />
                          {task.title || task.name}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}