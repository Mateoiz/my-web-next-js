"use client";

import { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaChevronDown, FaCalendarDay } from "react-icons/fa";
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/db";

type TaskType = "Quiz" | "Assignment" | "Exam" | "Presentation" | "Project";
type TaskStatus = "OPEN" | "Submitted" | "Graded";

interface CourseTask {
  id: string;
  courseId: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  deadline: string;
  grade: string;
}

const TYPE_COLORS: Record<TaskType, string> = {
  Quiz: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 border-emerald-500/20",
  Assignment: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 border-blue-500/20",
  Exam: "bg-red-500/10 text-red-600 dark:bg-red-500/20 border-red-500/20",
  Presentation: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 border-amber-500/20",
  Project: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 border-purple-500/20",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  OPEN: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Submitted: "bg-emerald-600 text-white",
  Graded: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black",
};

export default function UniversityTracker({ courseId }: { courseId: string }) {
  const [tasks, setTasks] = useState<CourseTask[]>([]);

  useEffect(() => {
    if (!auth.currentUser || !courseId) return;
    const qTasks = query(collection(db, "course_tasks"), where("courseId", "==", courseId), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(qTasks, (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseTask))));
    return () => unsub();
  }, [courseId]);

  const handleAddTask = async () => {
    if (!auth.currentUser) return;
    await addDoc(collection(db, "course_tasks"), {
      userId: auth.currentUser.uid, courseId, name: "", type: "Assignment", status: "OPEN", deadline: "", grade: "", createdAt: serverTimestamp()
    });
  };

  const updateTask = async (taskId: string, field: keyof CourseTask, value: string) => {
    await updateDoc(doc(db, "course_tasks", taskId), { [field]: value });
  };

  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, "course_tasks", taskId));
  };

  return (
    <div className="w-full overflow-x-auto custom-scrollbar shadow-sm rounded-2xl animate-in fade-in">
      <div className="min-w-[800px] w-full bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/50 text-[10px] font-black uppercase tracking-widest text-zinc-500 select-none">
          <div className="col-span-4 pl-2">Aa Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 flex items-center gap-2"><FaCalendarDay /> Deadline</div>
          <div className="col-span-1 text-center">Grade</div>
          <div className="col-span-1 text-center">Act</div>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {tasks.length === 0 && <div className="p-8 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">No tasks created yet. Click New below.</div>}

          {tasks.map((task) => (
            <div key={task.id} className="grid grid-cols-12 gap-4 p-2 md:p-3 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
              <div className="col-span-4">
                <input type="text" placeholder="Task name..." defaultValue={task.name} onBlur={(e) => updateTask(task.id, 'name', e.target.value)} className="w-full bg-transparent outline-none font-bold text-xs md:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 px-2 py-1.5 focus:bg-white dark:focus:bg-zinc-950 rounded-lg transition-colors" />
              </div>
              <div className="col-span-2 relative">
                <select value={task.type} onChange={(e) => updateTask(task.id, 'type', e.target.value)} className={`w-full appearance-none outline-none text-[10px] md:text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer ${TYPE_COLORS[task.type]}`}>
                  <option value="Quiz">Quiz</option><option value="Assignment">Assignment</option><option value="Exam">Exam</option><option value="Presentation">Presentation</option><option value="Project">Project</option>
                </select>
                <FaChevronDown size={8} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
              </div>
              <div className="col-span-2 relative">
                <select value={task.status} onChange={(e) => updateTask(task.id, 'status', e.target.value)} className={`w-full appearance-none outline-none text-[10px] md:text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer ${STATUS_COLORS[task.status]}`}>
                  <option value="OPEN">OPEN</option><option value="Submitted">Submitted</option><option value="Graded">Graded</option>
                </select>
                <FaChevronDown size={8} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
              </div>
              <div className="col-span-2">
                <input type="date" defaultValue={task.deadline} onBlur={(e) => updateTask(task.id, 'deadline', e.target.value)} className="w-full bg-transparent outline-none font-mono text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400 px-2 py-1.5 cursor-pointer" />
              </div>
              <div className="col-span-1">
                <input type="text" placeholder="-" defaultValue={task.grade} onBlur={(e) => updateTask(task.id, 'grade', e.target.value)} className="w-full bg-transparent outline-none font-mono font-bold text-xs md:text-sm text-zinc-900 dark:text-zinc-100 text-center px-1 py-1.5 focus:bg-white dark:focus:bg-zinc-950 rounded-lg transition-colors" />
              </div>
              <div className="col-span-1 flex justify-center">
                <button onClick={() => deleteTask(task.id)} className="p-2 text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"><FaTrash size={12} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
          <button onClick={handleAddTask} className="w-full flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-[#06402B] hover:bg-[#06402B]/5 rounded-xl transition-colors"><FaPlus size={10} /> New Deliverable</button>
        </div>
      </div>
    </div>
  );
}