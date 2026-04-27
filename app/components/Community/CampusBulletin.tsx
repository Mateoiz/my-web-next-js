"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBullhorn, FaPlus, FaTimes, FaTrashAlt,
  FaFacebook, FaExternalLinkAlt, FaSpinner, FaCalendarDay,
  FaSave, FaImage,
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
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const inputCls =
  "w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-3 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#06402B] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#06402B]/10 dark:focus:ring-emerald-500/10 transition-all placeholder:text-zinc-400";

// ─── Add Post Modal ───────────────────────────────────────────────────────────
// Bottom sheet on mobile, centered modal on desktop. No clipping.

function AddPostModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (post: Omit<BulletinPost, "id" | "userId" | "createdAt">) => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [category, setCategory] = useState<BulletinCategory>("Announcement");
  const [formattedDate, setFormattedDate] = useState("");

  const reset = () => {
    setTitle(""); setDescription(""); setImageUrl("");
    setSourceUrl(""); setCategory("Announcement"); setFormattedDate("");
    setIsSaving(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      category,
      formattedDate: formattedDate.trim() || undefined,
    });
    handleClose();
  };

 if (typeof window === "undefined") return null;

return createPortal(
  <AnimatePresence>
    {isOpen && (
      <>
        {/* Backdrop */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        />

        {/* Mobile Sheet */}
        <motion.div
          key="sheet"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          className="fixed bottom-0 left-0 right-0 z-[101] flex flex-col bg-white dark:bg-[#18181b] border-t border-zinc-200 dark:border-zinc-800 rounded-t-3xl shadow-2xl sm:hidden"
          style={{ maxHeight: "92dvh" }}
        >
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          </div>

          <ModalContents {...{
            title, setTitle,
            description, setDescription,
            imageUrl, setImageUrl,
            sourceUrl, setSourceUrl,
            category, setCategory,
            formattedDate, setFormattedDate,
            isSaving, onClose: handleClose, onSave: handleSave
          }} />
        </motion.div>

        {/* Desktop Modal */}
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed inset-0 z-[101] hidden sm:flex items-center justify-center p-4"
        >
          <div
            className="w-full max-w-lg flex flex-col bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl"
            style={{ maxHeight: "90dvh" }}
          >
            <ModalContents {...{
              title, setTitle,
              description, setDescription,
              imageUrl, setImageUrl,
              sourceUrl, setSourceUrl,
              category, setCategory,
              formattedDate, setFormattedDate,
              isSaving, onClose: handleClose, onSave: handleSave
            }} />
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>,
  document.body
);
}

// Shared form content extracted so both mobile/desktop share one implementation
function ModalContents({
  title, setTitle,
  description, setDescription,
  imageUrl, setImageUrl,
  sourceUrl, setSourceUrl,
  category, setCategory,
  formattedDate, setFormattedDate,
  isSaving, onClose, onSave,
}: any) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FaBullhorn size={15} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              New Announcement
            </h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Fill in the details manually
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <FaTimes size={14} />
        </button>
      </div>

      {/* Scrollable fields */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-5 space-y-4">

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => {
                const m = CATEGORY_META[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                      category === cat
                        ? `${m.bg} ${m.text} ${m.border}`
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. JPCS General Assembly — May 20"
              className={`${inputCls} font-bold`}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Time, venue, and other important details…"
              className={`${inputCls} resize-none leading-relaxed`}
            />
          </div>

          {/* Event date */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Event Date (optional)</label>
            <input
              value={formattedDate}
              onChange={e => setFormattedDate(e.target.value)}
              placeholder="e.g. May 20, 2025"
              className={inputCls}
            />
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <FaImage size={9} /> Image URL (optional)
            </label>
            <input
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className={inputCls}
            />
          </div>

          {/* Source URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <FaFacebook size={9} /> Facebook / Source URL (optional)
            </label>
            <input
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://www.facebook.com/…"
              className={inputCls}
            />
          </div>

        </div>
      </div>

      {/* Sticky action bar — always above keyboard */}
      <div className="shrink-0 px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2.5 bg-white dark:bg-[#18181b]">
        <button
          onClick={onClose}
          className="flex-1 py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!title.trim() || isSaving}
          className="flex-1 py-3.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          {isSaving
            ? <><FaSpinner className="animate-spin" size={11} /> Saving…</>
            : <><FaSave size={11} /> Publish</>
          }
        </button>
      </div>
    </>
  );
}

// ─── Bulletin Card ─────────────────────────────────────────────────────────────

function BulletinCard({
  post,
  isAdmin,
  onDelete,
}: {
  post: BulletinPost;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  const meta = CATEGORY_META[post.category] ?? CATEGORY_META.Announcement;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`group relative rounded-2xl border overflow-hidden transition-all hover:shadow-md ${
        post.category === "Urgent"
          ? "border-red-500/30 bg-red-500/5 dark:bg-red-500/10"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.dot}`} />

      {post.imageUrl && (
        <div className="relative w-full h-32 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      )}

      <div className="p-4 pl-5">
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${meta.bg} ${meta.text} ${meta.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-zinc-400">{timeAgo(post.createdAt)}</span>
            {isAdmin && (
              <button
                onClick={onDelete}
                className="p-1.5 text-zinc-300 dark:text-zinc-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <FaTrashAlt size={10} />
              </button>
            )}
          </div>
        </div>

        <h4 className="text-sm font-black text-zinc-900 dark:text-white leading-tight mb-1.5 line-clamp-2">
          {post.title}
        </h4>

        {post.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed line-clamp-3">
            {post.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {post.formattedDate ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <FaCalendarDay size={9} />
              {post.formattedDate}
            </span>
          ) : <div />}
          {post.sourceUrl && (
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] font-bold text-[#06402B] dark:text-emerald-400 hover:underline uppercase tracking-widest"
            >
              <FaFacebook size={10} /> View Post <FaExternalLinkAlt size={8} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CampusBulletin() {
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<BulletinCategory | "All">("All");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setIsAdmin(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        setIsAdmin(snap.data()?.role === "admin");
      } catch { setIsAdmin(false); }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      const q = query(collection(db, "bulletin_posts"), orderBy("createdAt", "desc"));
      const unsubSnap = onSnapshot(q,
        snap => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as BulletinPost))),
        err => console.warn("[CampusBulletin]", err.code, err.message)
      );
      return unsubSnap;
    });
    return () => unsub();
  }, []);

  const handleSave = useCallback(async (post: Omit<BulletinPost, "id" | "userId" | "createdAt">) => {
    if (!auth.currentUser || !isAdmin) return;
    const clean = Object.fromEntries(Object.entries(post).filter(([, v]) => v !== undefined && v !== ""));
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

  const filtered = filterCategory === "All" ? posts : posts.filter(p => p.category === filterCategory);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-[#06402B] dark:text-emerald-400 flex items-center gap-2">
          <FaBullhorn /> Campus Bulletin
        </h3>
        {isAdmin && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#0a5a38] dark:hover:bg-emerald-500 transition-all shadow-sm active:scale-95"
          >
            <FaPlus size={9} /> Add Post
          </button>
        )}
      </div>

      {/* Horizontally scrollable filter row — no wrap on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {(["All", ...CATEGORIES] as const).map(cat => {
          const isActive = filterCategory === cat;
          const m = cat !== "All" ? CATEGORY_META[cat] : null;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                isActive && m
                  ? `${m.bg} ${m.text} ${m.border}`
                  : isActive
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 flex flex-col items-center gap-2 text-zinc-400">
              <FaBullhorn size={24} className="opacity-30" />
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">No announcements yet</p>
              {isAdmin && <p className="text-xs text-zinc-400 opacity-50">Click "Add Post" to create one</p>}
            </motion.div>
          ) : (
            filtered.map(post => (
              <BulletinCard key={post.id} post={post} isAdmin={isAdmin} onDelete={() => handleDelete(post.id)} />
            ))
          )}
        </AnimatePresence>
      </div>

      {isAdmin && (
        <AddPostModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSave={handleSave} />
      )}
    </div>
  );
}