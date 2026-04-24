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
  
  // Fill empty spaces before the 1st of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="p-2 min-h-[100px] md:min-h-[120px] bg-zinc-50/50 dark:bg-zinc-900/20" />);
  }

  // Render actual days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const schoolEvent = SCHOOL_EVENTS[dateStr];
    const personalTasks = userTasks.filter(t => t.deadline === dateStr);
    const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();

    days.push(
      <div key={i} className={`p-1.5 md:p-2 border border-zinc-200 dark:border-zinc-800 min-h-[100px] md:min-h-[120px] flex flex-col gap-1 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${isToday ? 'bg-green-500/5 dark:bg-green-500/10' : ''}`}>
        
        {/* Date Number */}
        <div className={`text-[10px] md:text-xs font-bold shrink-0 ${isToday ? 'text-green-600 dark:text-green-400 bg-green-500/20 w-6 h-6 flex items-center justify-center rounded-full' : 'text-zinc-500 ml-1'}`}>
          {i}
        </div>
        
        {/* Events Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 mt-1 pr-0.5">
          {schoolEvent && (
            <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider p-1.5 rounded-md leading-tight whitespace-normal ${
              schoolEvent.type === 'exam' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 
              schoolEvent.type === 'holiday' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 
              'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
            }`}>
              {schoolEvent.title}
            </div>
          )}
          
          {personalTasks.map(task => (
            <div key={task.id} className="text-[9px] md:text-[10px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 p-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 flex items-start gap-1">
              <FaExclamationCircle className="text-[#06402B] shrink-0 mt-0.5" size={10} /> 
              <span className="whitespace-normal leading-tight">{task.title || task.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-4 md:p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 w-full">
      
      {/* --- MOBILE OPTIMIZED HEADER --- */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-8 gap-4">
        
        {/* Title */}
        <div className="w-full md:w-auto text-center md:text-left">
          <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center justify-center md:justify-start gap-2 md:gap-3">
            <FaCalendarDay className="text-[#06402B]"/> Master Calendar
          </h2>
          <p className="text-[10px] md:text-xs font-medium text-zinc-500 mt-1 md:mt-0">Live University Schedule & Personal Deadlines</p>
        </div>
        
        {/* Month Switcher (Full width on mobile for easy tapping) */}
        <div className="flex items-center justify-between w-full md:w-auto gap-2 md:gap-4 bg-zinc-100 dark:bg-zinc-800/50 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
          <button onClick={() => changeMonth(-1)} className="p-3 md:p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500 active:scale-95 shadow-sm md:shadow-none bg-white md:bg-transparent">
            <FaChevronLeft size={14} />
          </button>
          
          <h3 className="flex-1 md:w-40 text-center text-xs md:text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">
            {currentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
          </h3>
          
          <button onClick={() => changeMonth(1)} className="p-3 md:p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500 active:scale-95 shadow-sm md:shadow-none bg-white md:bg-transparent">
            <FaChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* --- MOBILE OPTIMIZED GRID (Horizontal Scroll) --- */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-2">
        <div className="min-w-[700px] md:min-w-full grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
          
          {/* Days Header */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-zinc-100 dark:bg-zinc-900 py-3 text-center text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-500">
              {day}
            </div>
          ))}
          
          {/* Calendar Cells */}
          {days.map((day, index) => (
            <div key={index} className="bg-white dark:bg-zinc-950">
              {day}
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}