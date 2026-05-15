"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch, FaArrowUp, FaDownload, FaUserCircle,
  FaCheck, FaTrashAlt, FaShieldAlt, FaLayerGroup, FaTimes
} from "react-icons/fa";
import {
  collection, query, where, getDocs, orderBy, updateDoc,
  doc, increment, addDoc, serverTimestamp, deleteDoc, getDoc, arrayUnion
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/db";
import { useModal } from "../../context/ModalContext";
import UserProfileModal from "../../components/UserProfileModal"; // adjust path


// ─── Admin Delete Modal ───────────────────────────────────────────────────────
function AdminDeleteModal({
  deck,
  onConfirm,
  onCancel,
}: {
  deck: any;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const presets = [
    "Contains plagiarized content",
    "Inaccurate or misleading information",
    "Violates community guidelines",
    "Duplicate or spam content",
    "Inappropriate language or content",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        className="bg-white dark:bg-zinc-900 rounded-[2rem] p-7 w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 bg-red-500/10 rounded-xl flex items-center justify-center">
              <FaTrashAlt className="text-red-500" size={13} />
            </span>
            <h3 className="font-black text-base uppercase tracking-tight">Remove Reviewer</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <FaTimes size={12} />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mb-4 ml-10">
          A notification will be sent to{" "}
          <span className="font-bold text-zinc-700 dark:text-zinc-300">@{deck.authorUsername}</span>{" "}
          explaining why their deck was removed.
        </p>

        {/* Deck preview */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 mb-5 border border-zinc-200 dark:border-zinc-700">
          <p className="font-black text-sm truncate">{deck.title}</p>
          <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">{deck.subject}</p>
        </div>

        {/* Preset reasons */}
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Quick Reasons</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setReason(p)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                reason === p
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-red-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Custom reason */}
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Custom Reason</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe why this reviewer is being removed..."
          rows={3}
          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm font-medium outline-none focus:border-red-400 transition-all resize-none mb-5"
        />

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-black text-[11px] uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-[11px] uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Remove & Notify
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 flex flex-col gap-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
      </div>
      <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded-lg mt-2" />
      <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
      <div className="h-12 w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl mt-4" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FlashcardExchange() {
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const { showAlert } = useModal();
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedDecks, setImportedDecks] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [upvotedDecks, setUpvotedDecks] = useState<string[]>([]);
  const [deletingDeck, setDeletingDeck] = useState<any | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);


  useEffect(() => {
    const fetchDecks = async () => {
      const q = query(
        collection(db, "flashcard_decks"),
        where("isPublic", "==", true),
        orderBy("upvotes", "desc")
      );
      const snap = await getDocs(q);
      setDecks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchDecks();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.role === "admin") setIsAdmin(true);
          // Load previously upvoted decks from user's profile
          setUpvotedDecks(data.upvotedDecks || []);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ── Upvote (once per user) ──────────────────────────────────────────────────
  const handleVote = async (deckId: string) => {
    if (!currentUser) return showAlert("Not Logged In", "You must be logged in to upvote.");
    if (upvotedDecks.includes(deckId)) return; // already voted

    const deckRef = doc(db, "flashcard_decks", deckId);
    const userRef = doc(db, "users", currentUser.uid);

    await Promise.all([
      updateDoc(deckRef, { upvotes: increment(1) }),
      // Store voted deck ID in user document to persist across sessions
      updateDoc(userRef, { upvotedDecks: arrayUnion(deckId) }),
    ]);

    setUpvotedDecks((prev) => [...prev, deckId]);
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, upvotes: (d.upvotes || 0) + 1 } : d))
    );
  };

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleImport = async (deck: any) => {
    if (!currentUser) return showAlert("Not Logged In", "You must be logged in to import.");
    setImportingId(deck.id);
    try {
      await addDoc(collection(db, "flashcard_decks"), {
        userId: currentUser.uid,
        authorUsername: "Imported",
        title: deck.title,
        subject: deck.subject,
        cards: deck.cards,
        isPublic: false,
        upvotes: 0,
        downloads: 0,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "flashcard_decks", deck.id), { downloads: increment(1) });
      setImportedDecks((prev) => [...prev, deck.id]);
      setDecks((prev) =>
        prev.map((d) => (d.id === deck.id ? { ...d, downloads: (d.downloads || 0) + 1 } : d))
      );
    } catch (error) {
      console.error("Failed to import:", error);
      showAlert("Import Failed", "Something went wrong. Please try again.");
    } finally {
      setImportingId(null);
    }
  };

  // ── Admin Delete with Notification ─────────────────────────────────────────
const handleAdminDeleteConfirm = async (deck: any, reason: string) => {
  try {
    await deleteDoc(doc(db, "flashcard_decks", deck.id));

    // ✅ Write to "inbox" not "notifications" so it shows up in StudyLounge
    await addDoc(collection(db, "inbox"), {
      type: "deck_removed",
      recipientId: deck.userId,         // who receives it
      deckTitle: deck.title,
      deckSubject: deck.subject,
      reason,
      removedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      status: "unread",
    });

    setDecks((prev) => prev.filter((d) => d.id !== deck.id));
    setDeletingDeck(null);
  } catch (error) {
    showAlert("Delete Failed", "Ensure your Firebase Rules are updated for Admins.");
    console.error(error);
  }
};

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredDecks = decks.filter((deck) => {
    const matchesSearch =
      (deck.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (deck.subject?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesCollege = collegeFilter === "All" || deck.college === collegeFilter;
    const matchesYear = yearFilter === "All" || deck.yearLevel === yearFilter;
    return matchesSearch && matchesCollege && matchesYear;
  });



  return (
    <>
      {/* Admin Delete Modal */}
      <AnimatePresence>
        {deletingDeck && (
          <AdminDeleteModal
            deck={deletingDeck}
            onConfirm={(reason) => handleAdminDeleteConfirm(deletingDeck, reason)}
            onCancel={() => setDeletingDeck(null)}
          />
        )}
      </AnimatePresence>

          {/* ✅ Profile Modal — ADD HERE */}
    {viewingUserId && (
      <UserProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
    )}

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* ── Header + Filters ── */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
              Community Exchange{" "}
              {isAdmin && (
                <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] rounded-md flex items-center gap-1">
                  <FaShieldAlt /> Admin Mode
                </span>
              )}
            </h2>
            <p className="text-zinc-500 text-sm font-medium italic">
              Verified reviewers by Lasallians, for Lasallians.
            </p>
          </div>

<div className="flex flex-col gap-3 w-full lg:w-auto">
  {/* Search */}
  <div className="relative group">
    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#06402B] dark:group-focus-within:text-emerald-400 transition-colors" size={13} />
    <input
      type="text"
      placeholder="Search title or subject..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-[#06402B] dark:focus:border-emerald-500 transition-all font-bold text-sm shadow-sm placeholder:font-normal placeholder:text-zinc-400"
    />
    {searchQuery && (
      <button
        onClick={() => setSearchQuery("")}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <FaTimes size={11} />
      </button>
    )}
  </div>

  {/* College filter pills */}
  <div className="flex flex-wrap gap-1.5">
    {["All", "General", "CAST", "CBMA", "CVMAS", "COED"].map(col => (
      <button
        key={col}
        onClick={() => setCollegeFilter(col)}
        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 touch-manipulation ${
          collegeFilter === col
            ? "bg-[#06402B] dark:bg-emerald-600 text-white border-transparent shadow-sm"
            : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-[#06402B]/40 dark:hover:border-emerald-500/40"
        }`}
      >
        {col === "All" ? "All Colleges" : col}
      </button>
    ))}
  </div>

  {/* Year filter pills */}
  <div className="flex flex-wrap gap-1.5">
    {["All", "1st Year", "2nd Year", "3rd Year", "4th Year", "Irregular"].map(yr => (
      <button
        key={yr}
        onClick={() => setYearFilter(yr)}
        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 touch-manipulation ${
          yearFilter === yr
            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-sm"
            : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-500"
        }`}
      >
        {yr === "All" ? "All Years" : yr.replace(" Year", "")}
      </button>
    ))}
  </div>
</div>


        {/* ── Results count ── */}
{!loading && (
  <div className="flex items-center gap-3 -mt-4">
    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
      {filteredDecks.length} reviewer{filteredDecks.length !== 1 ? "s" : ""} found
    </p>
    {(searchQuery || collegeFilter !== "All" || yearFilter !== "All") && (
      <button
        onClick={() => { setSearchQuery(""); setCollegeFilter("All"); setYearFilter("All"); }}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[9px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      >
        <FaTimes size={8} /> Clear filters
      </button>
    )}
  </div>
)}

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
) : filteredDecks.length === 0 ? (
  <div className="py-24 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem]">
    <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-600">
      <FaLayerGroup size={22} />
    </div>
    <div className="text-center">
      <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">No reviewers found</p>
      <p className="text-xs text-zinc-400 font-medium mt-1">Try adjusting your filters or search query</p>
    </div>
    <button
      onClick={() => { setSearchQuery(""); setCollegeFilter("All"); setYearFilter("All"); }}
      className="px-5 py-2.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#042d1f] transition-all shadow-md"
    >
      Clear All Filters
    </button>
  </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDecks.map((deck) => {
              const isImported = importedDecks.includes(deck.id);
              const isImporting = importingId === deck.id;
              const hasUpvoted = upvotedDecks.includes(deck.id);

              return (
                <motion.div
                  key={deck.id}
                  whileHover={{ y: -5 }}
                  className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 group transition-all flex flex-col relative"
                >
                  {/* Admin Delete Button */}
                  {isAdmin && (
                    <button
                      onClick={() => setDeletingDeck(deck)}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-20"
                      title="Remove as Admin"
                    >
                      <FaTrashAlt size={12} />
                    </button>
                  )}

                  {/* Tags + Upvote */}
<div className="flex justify-between items-start mb-4">
  <div className="flex gap-1.5 flex-wrap">
    <span className="px-2.5 py-1 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 text-[10px] font-black rounded-lg uppercase tracking-widest">
      {deck.subject}
    </span>
    {deck.college && deck.college !== "Private" && (
      <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold rounded-lg uppercase tracking-widest">
        {deck.college}
      </span>
    )}
  </div>
  <button
    onClick={() => handleVote(deck.id)}
    disabled={hasUpvoted}
    title={hasUpvoted ? "Already upvoted" : "Upvote this reviewer"}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all shrink-0 active:scale-95 touch-manipulation ${
      hasUpvoted
        ? "bg-[#06402B] dark:bg-emerald-600 text-white border-transparent cursor-not-allowed"
        : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:border-[#06402B]/40 hover:text-[#06402B] dark:hover:text-emerald-400"
    }`}
  >
    <FaArrowUp size={10} className={hasUpvoted ? "" : "group-hover:scale-110 transition-transform"} />
    <span className="tabular-nums">{deck.upvotes || 0}</span>
  </button>
</div>

                  {/* Title */}
                  <h3 className="text-lg font-black mb-3 group-hover:text-[#06402B] transition-colors leading-tight">
                    {deck.title}
                  </h3>

                  {/* Meta row */}
<div className="flex items-center justify-between gap-2 mb-4">
  <button
    onClick={() => deck.userId && setViewingUserId(deck.userId)}
    className="flex items-center gap-2 group/author min-w-0"
    title="View profile"
  >
    <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden group-hover/author:ring-2 group-hover/author:ring-[#06402B]/40 transition-all">
      <FaUserCircle className="text-zinc-400 group-hover/author:text-[#06402B] dark:group-hover/author:text-emerald-400 transition-colors" size={14} />
    </div>
    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 group-hover/author:text-[#06402B] dark:group-hover/author:text-emerald-400 transition-colors truncate">
      @{deck.authorUsername}
    </span>
  </button>

  <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 shrink-0">
    {deck.cards?.length != null && (
      <span className="flex items-center gap-1">
        <FaLayerGroup size={9} /> {deck.cards.length}
      </span>
    )}
    {deck.downloads != null && (
      <span className="flex items-center gap-1">
        <FaDownload size={9} /> {deck.downloads}
      </span>
    )}
  </div>
</div>

<button
  onClick={() => handleImport(deck)}
  disabled={isImported || isImporting}
  className={`mt-auto w-full py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation ${
    isImported
      ? "bg-emerald-500/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-not-allowed"
      : isImporting
      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-wait"
      : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-[#06402B] dark:hover:bg-zinc-100 shadow-sm hover:shadow-md"
  }`}
>
  {isImporting ? (
    <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-400 border-t-zinc-600 animate-spin" /> Syncing…</span>
  ) : isImported ? (
    <span className="flex items-center gap-2"><FaCheck size={11} /> Synced to Vault</span>
  ) : (
    <span className="flex items-center gap-2"><FaDownload size={11} /> Import Reviewer</span>
  )}
</button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>   {/* closes space-y-8 */}
    </div>   
  </>        
  );        
}    