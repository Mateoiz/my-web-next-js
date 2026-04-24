"use client";

import { useState } from "react";
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

  // Group tasks for Notion-style categorization
  const pendingTasks = activeTasks.filter(t => t.status === 'OPEN' || t.status === 'pending');
  const ongoingTasks = activeTasks.filter(t => t.status === 'Submitted');

  // --- REFINED MINI CALENDAR ---
  const renderMiniCalendar = () => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-6 h-6" />);

    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = i === today.getDate();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hasTask = activeTasks.some(t => t.deadline === dateStr);

      days.push(
        <div key={i} className="relative w-7 h-7 flex items-center justify-center">
          <div className={`w-full h-full flex items-center justify-center text-xs rounded-md transition-colors ${isToday ? 'bg-[#06402B] text-white font-bold' : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
            {i}
          </div>
          {hasTask && !isToday && <span className="absolute bottom-1 right-1 w-1 h-1 bg-amber-500 rounded-full" />}
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-[#18181b] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/80 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex gap-2 text-zinc-400">
            <FaChevronLeft size={10} className="cursor-pointer hover:text-zinc-800 dark:hover:text-white" />
            <FaChevronRight size={10} className="cursor-pointer hover:text-zinc-800 dark:hover:text-white" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d, i) => <div key={i} className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 justify-items-center">
          {days}
        </div>
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
        )}
      </AnimatePresence>

      <aside className={`fixed md:relative top-0 right-0 h-full z-50 md:z-20 bg-[#fafafa] dark:bg-[#0e0e0e] md:bg-white/50 md:dark:bg-[#09090b]/80 border-l border-zinc-200 dark:border-zinc-800/80 shrink-0 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0 w-[85%] sm:w-80 shadow-xl md:shadow-none' : 'translate-x-full md:translate-x-0 md:w-0 opacity-0 overflow-hidden border-none'}`}>
        
        <div className="flex md:hidden items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800/80">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Workspace Tasks</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"><FaTimes size={14}/></button>
        </div>

        <div className="p-5 md:p-6 flex-1 flex flex-col h-full min-w-[300px] overflow-y-auto custom-scrollbar gap-8">
          
          {/* LAYER 1: TASK QUEUE */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Deliverables</h2>
              <button onClick={() => setIsAddingTask(!isAddingTask)} className="text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 transition-colors p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded">
                <FaPlus size={12} />
              </button>
            </div>
            
            <AnimatePresence>
              {isAddingTask && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleTaskSubmit} className="mb-4 overflow-hidden w-full">
                  <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 flex flex-col gap-3 shadow-sm">
                    <input type="text" autoFocus placeholder="Task name..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full text-sm font-medium bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:font-normal placeholder:text-zinc-400" />
                    <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                      <input type="date" value={newTaskDeadline} onChange={(e) => setNewTaskDeadline(e.target.value)} className="bg-transparent text-xs text-zinc-500 dark:text-zinc-400 outline-none cursor-pointer" />
                      <button type="submit" disabled={!newTaskTitle.trim()} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md px-4 py-1.5 text-xs font-medium disabled:opacity-50 hover:opacity-80 transition-colors">Save</button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-5">
              
              {/* Pending Section */}
              <div>
                <h3 className="text-xs font-medium text-zinc-500 mb-2">Pending ({pendingTasks.length})</h3>
                {pendingTasks.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No pending tasks.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingTasks.map(task => (
                      <div key={task.id} className="group p-3 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-start gap-3 shadow-sm border-l-4 border-l-amber-400 dark:border-l-amber-500 hover:bg-zinc-50 dark:hover:bg-[#202024] transition-colors">
                        <button onClick={() => onToggleTask(task)} className="mt-0.5 text-zinc-400 hover:text-emerald-500"><FaRegCircle size={16} /></button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {task.isCourseTask && <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">{task.type || "Course"}</span>}
                            {task.deadline && <span className="text-[10px] text-zinc-500">Due: {task.deadline}</span>}
                          </div>
                        </div>
                        <button onClick={() => onDeleteTask(task)} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90 shrink-0"><FaTrashAlt size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ongoing / In Progress Section */}
              <div>
                <h3 className="text-xs font-medium text-zinc-500 mb-2">Ongoing / Submitted ({ongoingTasks.length})</h3>
                {ongoingTasks.length === 0 ? (
                   <p className="text-xs text-zinc-400 italic">No tasks in progress.</p>
                ) : (
                  <div className="space-y-2">
                    {ongoingTasks.map(task => (
                      <div key={task.id} className="group p-3 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-start gap-3 shadow-sm border-l-4 border-l-blue-400 dark:border-l-blue-500 hover:bg-zinc-50 dark:hover:bg-[#202024] transition-colors opacity-80 hover:opacity-100">
                        <button onClick={() => onToggleTask(task)} className="mt-0.5 text-blue-500"><FaCheckCircle size={16} /></button>
                        <div className="flex-1 min-w-0 line-through decoration-zinc-300 dark:decoration-zinc-600">
                          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-snug">{task.title}</p>
                          {task.isCourseTask && <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">Submitted</span>}
                        </div>
                        <button onClick={() => onDeleteTask(task)} className="text-zinc-300 dark:text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90 shrink-0"><FaTrashAlt size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* LAYER 2: MINI CALENDAR */}
          <div className="shrink-0">
            {renderMiniCalendar()}
          </div>

          {/* LAYER 3: NETWORK */}
          <div className="shrink-0">
             <div className="flex items-center justify-between mb-3">
               <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2"><FaUserFriends className="text-zinc-400" /> Network</h2>
             </div>
             {friends.length === 0 ? (
               <p className="text-xs text-zinc-400 italic">No friends added yet.</p>
             ) : (
               <div className="flex flex-col gap-3">
                 {friends.map(friend => (
                   <div key={friend.uid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                     <div className="relative">
                       <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
                         {friend.avatarUrl ? <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : friend.fullName?.charAt(0)}
                       </div>
                       <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#fafafa] dark:border-[#0e0e0e]" />
                     </div>
                     <div className="min-w-0 flex-1">
                       <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{friend.fullName}</p>
                       <p className="text-xs text-zinc-500 truncate">Online</p>
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