"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaRocket, FaBug, FaStar, FaWrench } from "react-icons/fa";

const CURRENT_VERSION = "1.1.0"; // bump this each push
const STORAGE_KEY = `jpcs_patch_seen_${CURRENT_VERSION}`;

const PATCH_NOTES = {
  version: "1.1.0",
  title: "The QoL Update",
  date: "April 2026",
  changes: [
    {
      type: "new",
      icon: <FaStar size={11} />,
      items: [
        "Schedule Maker now autosaves your classes locally — your schedule is never lost when switching tabs or navigating away",
        "Undo / Redo support in Schedule Maker (Ctrl+Z / Ctrl+Y)",
        "Conflict detection — overlapping classes are now highlighted in red",
        "College field added to your profile (CAST, CBMA, COED, CVMAS)",
        "You can now view other users' profile previews",
        "Calendar legends are now labeled — Exam, Holiday, Academic, and College Events are clearly marked",
        "JPCS socials and credits added to Settings",
      ],
    },
    {
      type: "improved",
      icon: <FaWrench size={11} />,
      items: [
        "Mobile nav now hides during flashcard study mode for distraction-free studying",
        "Calendar bottom sheet no longer hidden behind the mobile nav",
        "Course card delete is now always visible on mobile — no more hunting for it",
        "Unsaved changes banner in Settings warns before you navigate away",
        "Save button now shows a spinner instead of plain 'Uploading...' text",
      ],
    },
    {
      type: "fixed",
      icon: <FaBug size={11} />,
      items: [
        "College field now correctly loads your saved value on page refresh",
        "Settings view now properly animates with the rest of the navigation",
        "Flashcard study exit correctly resets the nav visibility state",
      ],
    },
  ],
};

const TYPE_STYLES = {
  new:      { label: "What's New",   bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
  improved: { label: "Improved",     bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",             dot: "bg-blue-500" },
  fixed:    { label: "Bug Fixes",    bg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",                 dot: "bg-red-500" },
};

export default function PatchNotes() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setVisible(true);
    } catch { /* ignore */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pb-8 sm:pb-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
className="relative w-full max-w-md bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl z-10 overflow-hidden max-h-[80vh] flex flex-col mx-2"          >
           <div className="sm:hidden w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 shrink-0" />

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#06402B]/10 flex items-center justify-center shrink-0">
                    <FaRocket size={18} className="text-[#06402B] dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">
                        {PATCH_NOTES.title}
                      </h3>
                      <span className="px-2 py-0.5 bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 text-[9px] font-black rounded-lg uppercase tracking-widest">
                        v{PATCH_NOTES.version}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                      {PATCH_NOTES.date} · JPCS DLSAU
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="w-7 h-7 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors shrink-0 mt-0.5"
                >
                  <FaTimes size={12} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
              {PATCH_NOTES.changes.map((section) => {
                const style = TYPE_STYLES[section.type as keyof typeof TYPE_STYLES];
                return (
                  <div key={section.type}>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest mb-3 ${style.bg}`}>
                      {section.icon}
                      {style.label}
                    </div>
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0 mt-1.5`} />
                          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 pb-safe">
              <button
                onClick={dismiss}
                className="w-full py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all shadow-md"
              >
                Got it, let's go 🚀
              </button>
              <p className="text-center text-[9px] text-zinc-400 font-medium mt-2">
                You won't see this again until the next update.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}