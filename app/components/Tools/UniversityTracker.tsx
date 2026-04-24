"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPlus, FaBook, FaTrash, FaChevronDown, FaCalendarDay, 
  FaArrowLeft, FaFolderOpen, FaExclamationTriangle 
} from "react-icons/fa";
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/db";

type TaskType = "Quiz" | "Assignment" | "Exam" | "Presentation" | "Project";
type TaskStatus = "OPEN" | "Submitted" | "Graded";

interface Course {
  id: string;
  title: string;
}

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
  Quiz: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20",
  Assignment: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20",
  Exam: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-500/20",
  Presentation: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20",
  Project: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  OPEN: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700",
  Submitted: "bg-emerald-600 text-white border-emerald-700",
  Graded: "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black border-zinc-950 dark:border-zinc-200",
};

export default function UniversityTracker() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<CourseTask[]>([]);
  
  // --- View State ---
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");

  // --- Modal State ---
  const [modal, setModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    onConfirm: () => {}
  });

  useEffect(() => {
    if (!auth.currentUser) return;

    const qCourses = query(collection(db, "courses"), where("userId", "==", auth.currentUser.uid), orderBy("createdAt", "asc"));
    const unsubCourses = onSnapshot(qCourses, (snap) => {
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Course)));
    });

    const qTasks = query(collection(db, "course_tasks"), where("userId", "==", auth.currentUser.uid), orderBy("createdAt", "asc"));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseTask)));
    });

    return () => { unsubCourses(); unsubTasks(); };
  }, []);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim() || !auth.currentUser) return;
    try {
      await addDoc(collection(db, "courses"), {
        userId: auth.currentUser.uid,
        title: newCourseTitle,
        createdAt: serverTimestamp()
      });
      setNewCourseTitle("");
      setIsAddingCourse(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddTask = async (courseId: string) => {
    if (!auth.currentUser) return;
    await addDoc(collection(db, "course_tasks"), {
      userId: auth.currentUser.uid,
      courseId,
      name: "",
      type: "Assignment",
      status: "OPEN",
      deadline: "",
      grade: "",
      createdAt: serverTimestamp()
    });
  };

  const updateTask = async (taskId: string, field: keyof CourseTask, value: string) => {
    await updateDoc(doc(db, "course_tasks", taskId), { [field]: value });
  };

  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, "course_tasks", taskId));
  };

  // --- CUSTOM DELETE CONFIRMATION ---
  const triggerDeleteCourse = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the card click event
    setModal({
      isOpen: true,
      title: "Delete Course Folder",
      message: "Are you sure you want to delete this course and all its tasks? This action cannot be undone.",
      confirmText: "Delete",
      onConfirm: async () => {
        if (selectedCourseId === courseId) setSelectedCourseId(null);
        await deleteDoc(doc(db, "courses", courseId));
        const courseTasksToDelete = tasks.filter(t => t.courseId === courseId);
        courseTasksToDelete.forEach(t => deleteDoc(doc(db, "course_tasks", t.id)));
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ==========================================
  // VIEW: 1. GRID OF CARDS
  // ==========================================
  if (!selectedCourseId) {
    return (
      <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 relative">
        
        {/* --- GLOBAL MODAL OVERLAY --- */}
        <AnimatePresence>
          {modal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                onClick={() => setModal(prev => ({ ...prev, isOpen: false }))} 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} 
                className="relative w-full max-w-sm bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-2xl z-10 text-center flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                  <FaExclamationTriangle size={24} />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-2">{modal.title}</h3>
                <p className="text-sm font-medium text-zinc-500 mb-6">{modal.message}</p>
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setModal(prev => ({ ...prev, isOpen: false }))} 
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-80 transition-opacity"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={modal.onConfirm} 
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500 transition-colors shadow-md"
                  >
                    {modal.confirmText}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">Course Folders</h2>
            <p className="text-xs font-medium text-zinc-500">Select a subject to manage deliverables.</p>
          </div>
          <button 
            onClick={() => setIsAddingCourse(!isAddingCourse)} 
            className="px-4 py-2 md:px-6 md:py-3 bg-[#06402B] text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md"
          >
            <FaPlus size={12} /> Add Course
          </button>
        </div>

        <AnimatePresence>
          {isAddingCourse && (
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddCourse} className="overflow-hidden">
              <div className="flex gap-2 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-4">
                <input 
                  autoFocus type="text" placeholder="e.g., CS101: Intro to Computing" value={newCourseTitle} onChange={(e) => setNewCourseTitle(e.target.value)} 
                  className="flex-1 bg-transparent px-4 py-2 outline-none font-bold text-sm text-zinc-900 dark:text-white" 
                />
                <button type="submit" disabled={!newCourseTitle.trim()} className="px-6 bg-[#06402B] text-white rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50">Save</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {courses.length === 0 && !isAddingCourse && (
          <div className="py-16 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-center text-zinc-500 flex flex-col items-center justify-center gap-4">
            <FaFolderOpen size={32} className="opacity-20" />
            <span className="font-bold uppercase tracking-widest text-xs">No courses added yet.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {courses.map(course => {
            const courseTasks = tasks.filter(t => t.courseId === course.id);
            const completedTasks = courseTasks.filter(t => t.status === "Submitted" || t.status === "Graded");
            const progress = courseTasks.length > 0 ? (completedTasks.length / courseTasks.length) * 100 : 0;

            return (
              <motion.div 
                key={course.id}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedCourseId(course.id)}
                className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 cursor-pointer shadow-sm hover:shadow-md group transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-[#06402B]/10 text-[#06402B] rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <FaBook size={18} />
                  </div>
                  <button 
                    onClick={(e) => triggerDeleteCourse(course.id, e)} 
                    className="p-2 text-zinc-300 dark:text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
                
                <h3 className="text-lg font-black text-zinc-900 dark:text-white leading-tight mb-1 truncate">{course.title}</h3>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6">
                  {courseTasks.length} {courseTasks.length === 1 ? 'Deliverable' : 'Deliverables'}
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    <span>Progress</span>
                    <span className="text-[#06402B]">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${progress}%` }} 
                      className="h-full bg-[#06402B] rounded-full transition-all duration-500" 
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: 2. COURSE DETAIL TABLE
  // ==========================================
  const activeCourse = courses.find(c => c.id === selectedCourseId);
  const courseTasks = tasks.filter(t => t.courseId === selectedCourseId);

  if (!activeCourse) {
    setSelectedCourseId(null);
    return null;
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 relative">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => setSelectedCourseId(null)}
            className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-[#06402B] transition-colors flex items-center gap-2 mb-2"
          >
            <FaArrowLeft /> Back to Courses
          </button>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
            {activeCourse.title}
          </h2>
        </div>
      </div>

      <div className="w-full overflow-x-auto custom-scrollbar pb-2 shadow-sm rounded-2xl">
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
            {courseTasks.length === 0 && (
              <div className="p-8 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                No tasks created yet. Click New below.
              </div>
            )}

            {courseTasks.map((task) => (
              <div key={task.id} className="grid grid-cols-12 gap-4 p-2 md:p-3 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                <div className="col-span-4">
                  <input 
                    type="text" placeholder="Task name..." defaultValue={task.name} 
                    onBlur={(e) => updateTask(task.id, 'name', e.target.value)}
                    className="w-full bg-transparent outline-none font-bold text-xs md:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 px-2 py-1.5 focus:bg-white dark:focus:bg-zinc-950 rounded-lg transition-colors"
                  />
                </div>
                <div className="col-span-2 relative">
                  <select 
                    value={task.type} onChange={(e) => updateTask(task.id, 'type', e.target.value)}
                    className={`w-full appearance-none outline-none text-[10px] md:text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer ${TYPE_COLORS[task.type]}`}
                  >
                    <option value="Quiz">Quiz</option><option value="Assignment">Assignment</option><option value="Exam">Exam</option><option value="Presentation">Presentation</option><option value="Project">Project</option>
                  </select>
                  <FaChevronDown size={8} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                </div>
                <div className="col-span-2 relative">
                  <select 
                    value={task.status} onChange={(e) => updateTask(task.id, 'status', e.target.value)}
                    className={`w-full appearance-none outline-none text-[10px] md:text-xs font-bold px-3 py-2 rounded-lg border cursor-pointer ${STATUS_COLORS[task.status]}`}
                  >
                    <option value="OPEN">OPEN</option><option value="Submitted">Submitted</option><option value="Graded">Graded</option>
                  </select>
                  <FaChevronDown size={8} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                </div>
                <div className="col-span-2">
                  <input 
                    type="date" defaultValue={task.deadline} 
                    onBlur={(e) => updateTask(task.id, 'deadline', e.target.value)}
                    className="w-full bg-transparent outline-none font-mono text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400 px-2 py-1.5 cursor-pointer"
                  />
                </div>
                <div className="col-span-1">
                  <input 
                    type="text" placeholder="-" defaultValue={task.grade} 
                    onBlur={(e) => updateTask(task.id, 'grade', e.target.value)}
                    className="w-full bg-transparent outline-none font-mono font-bold text-xs md:text-sm text-zinc-900 dark:text-zinc-100 text-center px-1 py-1.5 focus:bg-white dark:focus:bg-zinc-950 rounded-lg transition-colors"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button onClick={() => deleteTask(task.id)} className="p-2 text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30">
            <button 
              onClick={() => handleAddTask(activeCourse.id)} 
              className="w-full flex items-center gap-2 py-3 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-[#06402B] hover:bg-[#06402B]/5 rounded-xl transition-colors"
            >
              <FaPlus size={10} /> New Deliverable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}