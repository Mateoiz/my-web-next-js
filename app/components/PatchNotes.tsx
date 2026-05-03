"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaRocket, FaBug, FaStar, FaWrench, FaChevronUp } from "react-icons/fa";

const CURRENT_VERSION = "1.2.0"; // keep for display only
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || CURRENT_VERSION;
const STORAGE_KEY = `jpcs_patch_seen_${BUILD_ID}`; // unique per build, not per version

const PATCH_NOTES = {
  version: "1.2.0",
  title: "The Social Update",
  date: "May 2026",
  changes: [
    {
      type: "new",
      items: [
        "User profile portals — click any avatar in the Community Exchange or Study Lounge to preview their profile, published reviewers, and stats",
        "College badge now appears beside your avatar in the header",
        "Admin reviewer removal now sends a reason directly to the author's inbox",
        "Upvoting is now limited to once per user per reviewer — persists across sessions",
        "Community Exchange now shows card count and import count per reviewer deck",
        "Loading skeleton cards in the Exchange while decks are fetching",
      ],
    },
    {
      type: "improved",
      items: [
        "University Tracker performance — bulk status updates now use a single batched Firestore write instead of individual calls",
        "Course cards now always show the delete option via a visible kebab menu — no more hover-only buttons",
        "Dashboard stat pills are now clickable shortcuts — Network goes to Study Lounge, Active/Done goes to Tracker",
        "Online friends now appear as an avatar strip on the home dashboard when classmates are active",
        "Quick Nav grid added to the home dashboard for one-tap access to every section",
        "Command Center now has a progress ring, quick task templates, swipe gestures, drag-to-reorder, and course grouping",
        "Calendar tiles on desktop now open a popover instead of a full-screen bottom sheet",
      ],
    },
    {
      type: "fixed",
      items: [
        "Profile modal no longer clips the avatar behind the green banner",
        "UserProfileModal JSX was incorrectly placed inside useEffect — fixed and moved to the render tree",
        "Duplicate key warnings in the Academic Calendar day sheet resolved",
        "Admin delete modal now correctly targets the inbox collection instead of a separate notifications collection",
      ],
    },
  ],
};

const TYPE_META = {
  new:      { label: "What's New",  color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  improved: { label: "Improved",    color: "text-blue-600 dark:text-blue-400",       dot: "bg-blue-500",    bar: "bg-blue-500" },
  fixed:    { label: "Bug Fixes",   color: "text-red-500 dark:text-red-400",         dot: "bg-red-500",     bar: "bg-red-500" },
};

export default function PatchNotes() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("new");

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Small delay so it doesn't fight with the page load
        setTimeout(() => setVisible(true), 1200);
      }
    } catch { /* ignore */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  };

  const currentSection = PATCH_NOTES.changes.find(c => c.type === activeSection);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* ── Collapsed pill (always visible until dismissed) ── */}
          {!expanded && (
            <motion.div
              key="pill"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-2"
            >
              {/* Dismiss X */}
              <button
                onClick={dismiss}
                className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors shadow-md"
              >
                <FaTimes size={10} />
              </button>

              {/* Expand pill */}
              <button
                onClick={() => setExpanded(true)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-[#06402B] dark:bg-emerald-700 text-white rounded-full shadow-xl hover:bg-[#052f1f] dark:hover:bg-emerald-600 active:scale-95 transition-all"
              >
                <FaRocket size={11} />
                <span className="text-[11px] font-black uppercase tracking-widest">v{PATCH_NOTES.version} — {PATCH_NOTES.title}</span>
                <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" />
              </button>
            </motion.div>
          )}

          {/* ── Expanded modal ── */}
          {expanded && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={() => setExpanded(false)}
              />

              {/* Panel — bottom sheet on mobile, side panel on desktop */}
              <motion.div
                key="panel"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="fixed bottom-0 md:bottom-6 md:right-6 z-50 w-full md:w-[400px] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 md:rounded-[2rem] rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[80vh] md:max-h-[600px]"
              >
                {/* Drag handle — mobile */}
                <div className="flex justify-center pt-3 md:hidden shrink-0">
                  <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-[#06402B]/10 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <FaRocket size={14} className="text-[#06402B] dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-zinc-900 dark:text-white leading-none">
                          {PATCH_NOTES.title}
                        </h3>
                        <span className="px-1.5 py-0.5 bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 text-[8px] font-black rounded-md uppercase tracking-widest">
                          v{PATCH_NOTES.version}
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                        {PATCH_NOTES.date} · JPCS DLSAU
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpanded(false)}
                      className="w-7 h-7 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      <FaChevronUp size={10} />
                    </button>
                  </div>
                </div>

                {/* Section tabs */}
                <div className="flex gap-1 px-5 pb-3 shrink-0">
                  {PATCH_NOTES.changes.map(section => {
                    const meta = TYPE_META[section.type as keyof typeof TYPE_META];
                    const isActive = activeSection === section.type;
                    return (
                      <button
                        key={section.type}
                        onClick={() => setActiveSection(section.type)}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          isActive
                            ? `${meta.color} bg-zinc-100 dark:bg-zinc-800`
                            : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        }`}
                      >
                        {meta.label}
                        <span className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] text-white ${isActive ? meta.bar : "bg-zinc-300 dark:bg-zinc-700"}`}>
                          {section.items.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-100 dark:bg-zinc-800 shrink-0" />

                {/* Content */}
                <div className="overflow-y-auto flex-1 px-5 py-4">
                  <AnimatePresence mode="wait">
                    {currentSection && (
                      <motion.ul
                        key={activeSection}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3"
                      >
                        {currentSection.items.map((item, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-start gap-3"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${TYPE_META[activeSection as keyof typeof TYPE_META].dot} shrink-0 mt-1.5`} />
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              {item}
                            </span>
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0 flex gap-2">
                  <button
                    onClick={() => setExpanded(false)}
                    className="flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    Read Later
                  </button>
                  <button
                    onClick={dismiss}
                    className="flex-1 py-2.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#042d1f] dark:hover:bg-emerald-500 active:scale-95 transition-all shadow-md"
                  >
                    Got it 🚀
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </>
      )}
    </AnimatePresence>
  );
}