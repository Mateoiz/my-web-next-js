"use client";

import { useState } from "react";
import { FaChevronLeft, FaChevronRight, FaCalendarDay, FaExclamationCircle } from "react-icons/fa";

const SCHOOL_EVENTS: Record<string, { title: string; type: "academic" | "holiday" | "exam" }> = {
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

// Explicit default export to prevent the React Object Promise error
export default function AcademicCalendar({ userTasks }: { userTasks: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date()); 

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="p-2 min-h-[80px]" />);

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const schoolEvent = SCHOOL_EVENTS[dateStr];
    const personalTasks = userTasks.filter(t => t.deadline === dateStr);
    const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();

    days.push(
      <div key={i} className={`p-2 border border-zinc-200 dark:border-zinc-800 min-h-[80px] md:min-h-[100px] flex flex-col gap-1 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${isToday ? 'bg-green-500/5 dark:bg-green-500/10' : ''}`}>
        <div className={`text-xs font-bold ${isToday ? 'text-green-600 dark:text-green-400 bg-green-500/20 w-6 h-6 flex items-center justify-center rounded-full' : 'text-zinc-500'}`}>
          {i}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 mt-1">
          {schoolEvent && (
            <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider p-1 rounded-md leading-tight ${schoolEvent.type === 'exam' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : schoolEvent.type === 'holiday' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'}`}>
              {schoolEvent.title}
            </div>
          )}
          {personalTasks.map(task => (
            <div key={task.id} className="text-[9px] md:text-[10px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 p-1 rounded-md truncate border border-zinc-300 dark:border-zinc-700 flex items-center gap-1">
              <FaExclamationCircle className="text-[#06402B] shrink-0" /> {task.title || task.name}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-4 md:p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 w-full">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-3"><FaCalendarDay className="text-[#06402B]"/> Master Calendar</h2>
          <p className="text-xs font-medium text-zinc-500">Live University Schedule & Personal Deadlines</p>
        </div>
        <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-800/50 p-2 rounded-xl">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500"><FaChevronLeft size={12} /></button>
          <h3 className="w-32 text-center text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500"><FaChevronRight size={12} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-zinc-100 dark:bg-zinc-900 py-3 text-center text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-500">{day}</div>
        ))}
        {days.map((day, index) => <div key={index} className="bg-white dark:bg-zinc-950">{day}</div>)}
      </div>
    </div>
  );
}