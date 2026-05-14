"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBullhorn, FaPlus, FaTimes, FaTrashAlt,
  FaFacebook, FaExternalLinkAlt, FaSpinner, FaCalendarDay,
  FaSave, FaImage, FaSearch, FaChevronRight, FaNewspaper,
} from "react-icons/fa";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp, getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/db";
import { onAuthStateChanged } from "firebase/auth";
import { createPortal } from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

type BulletinCategory = "Event" | "Academic" | "Announcement" | "Reminder" | "Urgent";

interface BulletinPost {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl?: string;
  sourceUrl?: string;
  category: BulletinCategory;
  formattedDate?: string;
  createdAt: any;
}

// ─── Style Maps ───────────────────────────────────────────────────────────────

const CATEGORY_META: Record<BulletinCategory, { bg: string; text: string; border: string; dot: string; label: string }> = {
  Event:        { bg: "bg-[#06402B]/10 dark:bg-emerald-500/10",   text: "text-[#06402B] dark:text-emerald-400",   border: "border-[#06402B]/20 dark:border-emerald-500/20",   dot: "bg-[#06402B] dark:bg-emerald-500",   label: "JPCS Event" },
  Academic:     { bg: "bg-blue-500/10",                             text: "text-blue-700 dark:text-blue-400",        border: "border-blue-500/20",                                dot: "bg-blue-500",                           label: "Academics" },
  Announcement: { bg: "bg-amber-500/10",                            text: "text-amber-700 dark:text-amber-400",      border: "border-amber-500/20",                               dot: "bg-amber-500",                          label: "Announcement" },
  Reminder:     { bg: "bg-purple-500/10",                           text: "text-purple-700 dark:text-purple-400",    border: "border-purple-500/20",                              dot: "bg-purple-500",                         label: "Reminder" },
  Urgent:       { bg: "bg-red-500/10",                              text: "text-red-700 dark:text-red-400",          border: "border-red-500/20",                                 dot: "bg-red-500",                            label: "Urgent" },
};

const CATEGORIES: BulletinCategory[] = ["Event", "Academic", "Announcement", "Reminder", "Urgent"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: any): string {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const inputCls =
  "w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#06402B] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#06402B]/10 dark:focus:ring-emerald-500/10 transition-all placeholder:text-zinc-400";

// ─── Category Badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category, size = "sm" }: { category: BulletinCategory; size?: "sm" | "xs" }) {
  const m = CATEGORY_META[category] ?? CATEGORY_META.Announcement;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg font-black uppercase tracking-widest border ${m.bg} ${m.text} ${m.border} ${
      size === "xs" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[9px]"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot} shrink-0`} />
      {m.label}
    </span>
  );
}

// ─── Add Post Modal ───────────────────────────────────────────────────────────

interface PostFormState {
  title: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  category: BulletinCategory;
  formattedDate: string;
}

const EMPTY_FORM: PostFormState = {
  title: "", description: "", imageUrl: "",
  sourceUrl: "", category: "Announcement", formattedDate: "",
};

function AddPostModal({
  isOpen, onClose, onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (post: Omit<BulletinPost, "id" | "userId" | "createdAt">) => Promise<void>;
}) {
  const [form, setForm] = useState<PostFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens
  useEffect(() => { if (isOpen) setForm(EMPTY_FORM); }, [isOpen]);

  const set = (key: keyof PostFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
        category: form.category,
        formattedDate: form.formattedDate.trim() || undefined,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (typeof window === "undefined") return null;

  const contents = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FaBullhorn size={15} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white">New Announcement</h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">JPCS DLSAU · Admin Only</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 touch-manipulation">
          <FaTimes size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-5 space-y-4">

          {/* Category — button group, no native select */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const m = CATEGORY_META[cat];
                const isActive = form.category === cat;
                return (
                  <button key={cat} type="button" onClick={() => setForm(p => ({ ...p, category: cat }))}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 touch-manipulation ${
                      isActive ? `${m.bg} ${m.text} ${m.border}` : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                    }`}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Title <span className="text-red-400">*</span></label>
            <input value={form.title} onChange={set("title")} placeholder="e.g. JPCS General Assembly — May 20"
              className={`${inputCls} font-bold`} style={{ fontSize: "16px" }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
            <textarea value={form.description} onChange={set("description")} rows={4}
              placeholder="Time, venue, and other important details…"
              className={`${inputCls} resize-none leading-relaxed`} style={{ fontSize: "16px" }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Event Date (optional)</label>
            <input value={form.formattedDate} onChange={set("formattedDate")} placeholder="e.g. May 20, 2025"
              className={inputCls} style={{ fontSize: "16px" }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <FaImage size={9} /> Image URL (optional)
            </label>
            <input value={form.imageUrl} onChange={set("imageUrl")} placeholder="https://..."
              className={inputCls} inputMode="url" style={{ fontSize: "16px" }} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <FaFacebook size={9} /> Source URL (optional)
            </label>
            <input value={form.sourceUrl} onChange={set("sourceUrl")} placeholder="https://www.facebook.com/…"
              className={inputCls} inputMode="url" style={{ fontSize: "16px" }} />
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2.5 bg-white dark:bg-[#18181b]"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <button onClick={onClose}
          className="flex-1 py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95 touch-manipulation">
          Cancel
        </button>
        <button onClick={handleSave} disabled={!form.title.trim() || isSaving}
          className="flex-1 py-3.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation">
          {isSaving ? <><FaSpinner className="animate-spin" size={11} /> Saving…</> : <><FaSave size={11} /> Publish</>}
        </button>
      </div>
    </>
  );

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" />

          {/* Mobile bottom sheet */}
          <motion.div key="sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed bottom-0 left-0 right-0 z-[201] flex flex-col bg-white dark:bg-[#18181b] border-t border-zinc-200 dark:border-zinc-800 rounded-t-3xl shadow-2xl sm:hidden"
            style={{ maxHeight: "92dvh" }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
            </div>
            {contents}
          </motion.div>

          {/* Desktop modal */}
          <motion.div key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[201] hidden sm:flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg flex flex-col bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl" style={{ maxHeight: "90dvh" }}>
              {contents}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Bulletin Card (widget — compact) ────────────────────────────────────────

function BulletinCard({ post, isAdmin, onDelete }: { post: BulletinPost; isAdmin: boolean; onDelete: () => void }) {
  const meta = CATEGORY_META[post.category] ?? CATEGORY_META.Announcement;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className={`group relative rounded-2xl border overflow-hidden transition-all hover:shadow-md ${
        post.category === "Urgent"
          ? "border-red-500/30 bg-red-500/5 dark:bg-red-500/10"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.dot}`} />

      {post.imageUrl && (
        <div className="relative w-full h-32 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      )}

      <div className="p-4 pl-5">
        <div className="flex items-center justify-between mb-2">
          <CategoryBadge category={post.category} size="xs" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono font-bold text-zinc-400">{timeAgo(post.createdAt)}</span>
            {isAdmin && (
              <button onClick={onDelete}
                className="p-1.5 text-zinc-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all touch-manipulation">
                <FaTrashAlt size={10} />
              </button>
            )}
          </div>
        </div>

        <h4 className="text-sm font-black text-zinc-900 dark:text-white leading-tight mb-1.5 line-clamp-2">{post.title}</h4>
        {post.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed line-clamp-3">{post.description}</p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {post.formattedDate ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <FaCalendarDay size={9} />{post.formattedDate}
            </span>
          ) : <div />}
          {post.sourceUrl && (
            <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] font-bold text-[#06402B] dark:text-emerald-400 hover:underline uppercase tracking-widest">
              <FaFacebook size={10} /> View Post <FaExternalLinkAlt size={8} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Full Bulletin Card (overlay — expanded) ──────────────────────────────────

function FullBulletinCard({ post, isAdmin, onDelete }: { post: BulletinPost; isAdmin: boolean; onDelete: () => void }) {
  const meta = CATEGORY_META[post.category] ?? CATEGORY_META.Announcement;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className={`group relative rounded-3xl border overflow-hidden transition-all ${
        post.category === "Urgent"
          ? "border-red-500/30 bg-red-500/5 dark:bg-red-500/10"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${meta.dot}`} />

      {post.imageUrl && (
        <div className="relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800" style={{ height: "180px" }}>
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-5">
            <CategoryBadge category={post.category} />
          </div>
        </div>
      )}

      <div className="p-4 pl-6">
        <div className="flex items-start justify-between gap-2 mb-3">
          {!post.imageUrl && <CategoryBadge category={post.category} />}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <span className="text-[10px] font-mono font-bold text-zinc-400">{timeAgo(post.createdAt)}</span>
            {isAdmin && (
              <button onClick={onDelete}
                className="w-10 h-10 flex items-center justify-center text-zinc-300 dark:text-zinc-700 active:text-red-500 active:bg-red-50 dark:active:bg-red-500/10 rounded-xl transition-all touch-manipulation">
                <FaTrashAlt size={11} />
              </button>
            )}
          </div>
        </div>

        <h4 className="text-[15px] font-black text-zinc-900 dark:text-white leading-snug mb-2">{post.title}</h4>

        {post.description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{post.description}</p>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 gap-2 flex-wrap">
          {post.formattedDate ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <FaCalendarDay size={9} />{post.formattedDate}
            </span>
          ) : <div />}
          {post.sourceUrl && (
            <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2.5 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest active:bg-[#06402B]/20 transition-all touch-manipulation">
              <FaFacebook size={10} /> View Post <FaExternalLinkAlt size={8} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Full Bulletin Overlay ────────────────────────────────────────────────────

function FullBulletinView({
  isOpen, onClose, posts, isAdmin, onDelete, onAddPost,
}: {
  isOpen: boolean;
  onClose: () => void;
  posts: BulletinPost[];
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onAddPost: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<BulletinCategory | "All">("All");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) { setSearch(""); setFilterCategory("All"); return; }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const filtered = posts
    .filter(p => filterCategory === "All" || p.category === filterCategory)
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    });

  const urgentPosts  = filtered.filter(p => p.category === "Urgent");
  const regularPosts = filtered.filter(p => p.category !== "Urgent");

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div key="fv-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="fv-panel"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-[151] bg-zinc-50 dark:bg-[#09090b] flex flex-col"
            style={{ height: "100dvh", borderRadius: "1.5rem 1.5rem 0 0" }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 md:px-8 py-3 shrink-0 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-[#06402B]/10 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <FaNewspaper size={14} className="text-[#06402B] dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none truncate">Campus Bulletin</h2>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{posts.length} post{posts.length !== 1 ? "s" : ""} · JPCS DLSAU</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isAdmin && (
                  <button onClick={onAddPost}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm touch-manipulation">
                    <FaPlus size={9} /><span className="hidden sm:inline">Add Post</span>
                  </button>
                )}
                <button onClick={onClose}
                  className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 active:bg-red-500 active:text-white transition-all touch-manipulation">
                  <FaTimes size={13} />
                </button>
              </div>
            </div>

            {/* Search + Filter */}
            <div className="px-4 md:px-8 pt-3 pb-2 shrink-0 space-y-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090b]">
              <div className="relative">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={12} />
                <input
                  ref={searchRef}
                  type="search"
                  inputMode="search"
                  autoCorrect="off"
                  autoCapitalize="off"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search announcements…"
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-9 pr-10 py-3 font-medium text-zinc-900 dark:text-white outline-none focus:border-[#06402B] dark:focus:border-emerald-500 transition-all placeholder:text-zinc-400"
                  style={{ fontSize: "16px" }}
                />
                {search && (
                  <button onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-500 touch-manipulation">
                    <FaTimes size={9} />
                  </button>
                )}
              </div>

              {/* Filter pills */}
              <div
                className="-mx-4 md:-mx-8 overflow-x-auto flex gap-1.5 px-4 md:px-8 pb-1"
                style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
              >
                {(["All", ...CATEGORIES] as const).map(cat => {
                  const isActive = filterCategory === cat;
                  const m = cat !== "All" ? CATEGORY_META[cat] : null;
                  return (
                    <button key={cat} onClick={() => setFilterCategory(cat)}
                      className={`shrink-0 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all touch-manipulation active:scale-95 ${
                        isActive && m ? `${m.bg} ${m.text} ${m.border}`
                        : isActive ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                        : "bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                      }`}
                    >{cat}</button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-8 py-5 space-y-5"
              style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            >
              <div style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                {filtered.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-24 flex flex-col items-center gap-3 text-zinc-400">
                    <FaBullhorn size={36} className="opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest opacity-50 text-center">
                      {search ? "No results found" : "No announcements yet"}
                    </p>
                    {search && (
                      <button onClick={() => setSearch("")}
                        className="text-[11px] font-bold text-[#06402B] dark:text-emerald-400 uppercase tracking-widest py-2 px-4 rounded-xl bg-[#06402B]/10 dark:bg-emerald-500/10 touch-manipulation">
                        Clear search
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <>
                    {urgentPosts.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Urgent
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <AnimatePresence>
                            {urgentPosts.map(post => (
                              <FullBulletinCard key={post.id} post={post} isAdmin={isAdmin} onDelete={() => onDelete(post.id)} />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                    {regularPosts.length > 0 && (
                      <div className="space-y-3">
                        {urgentPosts.length > 0 && (
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">All Posts</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <AnimatePresence>
                            {regularPosts.map(post => (
                              <FullBulletinCard key={post.id} post={post} isAdmin={isAdmin} onDelete={() => onDelete(post.id)} />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CampusBulletin() {
  const [posts, setPosts]               = useState<BulletinPost[]>([]);
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<BulletinCategory | "All">("All");
  const [isAdmin, setIsAdmin]           = useState(false);

  // Single onAuthStateChanged that handles both admin check and Firestore listener
  useEffect(() => {
    let unsubSnap: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Tear down previous snapshot listener whenever auth state changes
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }

      if (!user) {
        setIsAdmin(false);
        setPosts([]);
        return;
      }

      // Admin check — run in parallel with listener setup
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setIsAdmin(snap.data()?.role === "admin");
      } catch {
        setIsAdmin(false);
      }

      // Firestore listener — now properly assigned so cleanup can reach it
      unsubSnap = onSnapshot(
        query(collection(db, "bulletin_posts"), orderBy("createdAt", "desc")),
        snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as BulletinPost))),
        err  => console.warn("[CampusBulletin]", err.code, err.message)
      );
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, []);

  const handleSave = useCallback(async (post: Omit<BulletinPost, "id" | "userId" | "createdAt">) => {
    if (!auth.currentUser || !isAdmin) return;
    // Strip undefined values before writing — Firestore rejects them
    const clean = Object.fromEntries(
      Object.entries(post).filter(([, v]) => v !== undefined && v !== "")
    );
    await addDoc(collection(db, "bulletin_posts"), {
      ...clean,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
  }, [isAdmin]);

  const handleDelete = useCallback(async (id: string) => {
    if (!isAdmin) return;
    await deleteDoc(doc(db, "bulletin_posts", id));
  }, [isAdmin]);

  const filtered    = filterCategory === "All" ? posts : posts.filter(p => p.category === filterCategory);
  const widgetPosts = filtered.slice(0, 3);

  return (
    <>
      <div className="flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#06402B] dark:text-emerald-400 flex items-center gap-2">
            <FaBullhorn /> Campus Bulletin
          </h3>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0a5a38] dark:hover:bg-emerald-500 transition-all shadow-sm active:scale-95 touch-manipulation">
                <FaPlus size={9} /> Add
              </button>
            )}
            {posts.length > 0 && (
              <button onClick={() => setIsFullViewOpen(true)}
                className="flex items-center gap-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 touch-manipulation">
                See All <FaChevronRight size={8} />
              </button>
            )}
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {(["All", ...CATEGORIES] as const).map(cat => {
            const isActive = filterCategory === cat;
            const m = cat !== "All" ? CATEGORY_META[cat] : null;
            return (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all touch-manipulation ${
                  isActive && m ? `${m.bg} ${m.text} ${m.border}`
                  : isActive ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                }`}>
                {cat}
              </button>
            );
          })}
        </div>

        {/* Widget posts (max 3) */}
        <div className="space-y-3">
          <AnimatePresence>
            {widgetPosts.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="py-10 flex flex-col items-center gap-2 text-zinc-400">
                <FaBullhorn size={24} className="opacity-30" />
                <p className="text-xs font-bold uppercase tracking-widest opacity-60">No announcements yet</p>
                {isAdmin && <p className="text-xs text-zinc-400 opacity-50">Click "Add" to create one</p>}
              </motion.div>
            ) : (
              widgetPosts.map(post => (
                <BulletinCard key={post.id} post={post} isAdmin={isAdmin} onDelete={() => handleDelete(post.id)} />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* See all footer */}
        {filtered.length > 3 && (
          <button onClick={() => setIsFullViewOpen(true)}
            className="w-full py-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest hover:border-[#06402B] hover:text-[#06402B] dark:hover:border-emerald-500 dark:hover:text-emerald-400 hover:bg-[#06402B]/5 transition-all flex items-center justify-center gap-2 touch-manipulation">
            View all {filtered.length} posts <FaChevronRight size={9} />
          </button>
        )}

      </div>

      {isAdmin && (
        <AddPostModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSave={handleSave} />
      )}

      <FullBulletinView
        isOpen={isFullViewOpen}
        onClose={() => setIsFullViewOpen(false)}
        posts={posts}
        isAdmin={isAdmin}
        onDelete={handleDelete}
        onAddPost={() => { setIsFullViewOpen(false); setIsAddOpen(true); }}
      />
    </>
  );
}