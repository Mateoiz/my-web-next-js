"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUserFriends, FaInbox, FaSearch, FaUserPlus, FaCheck,
  FaDownload, FaPaperPlane, FaUserCheck, FaTrashAlt, FaGraduationCap,
  FaTimes
} from "react-icons/fa";
import {
  collection, query, where, getDocs, doc, updateDoc,
  arrayUnion, onSnapshot, addDoc, serverTimestamp, documentId, limit
} from "firebase/firestore";
import { auth, db } from "@/lib/db";
import { useModal } from "../../context/ModalContext";
import UserProfileModal from "../../components/UserProfileModal";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLLEGE_LABELS: Record<string, string> = {
  CAST:  "College of Arts, Sciences & Technology",
  CBMA:  "College of Business Management & Accountancy",
  COED:  "College of Education",
  CVMAS: "College of Veterinary Medicine & Animal Science",
};

const COLLEGE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; pill: string }> = {
  CAST:  { bg: "bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400",       border: "border-blue-500/20",    dot: "bg-blue-500",    pill: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"    },
  CBMA:  { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",     border: "border-amber-500/20",   dot: "bg-amber-500",   pill: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"   },
  COED:  { bg: "bg-violet-500/10",  text: "text-violet-600 dark:text-violet-400",   border: "border-violet-500/20",  dot: "bg-violet-500",  pill: "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30"  },
  CVMAS: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-500", pill: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30" },
};

// ─── Presence helpers ─────────────────────────────────────────────────────────

function isUserOnline(user: any): boolean {
  if (!user?.lastSeen) return false;
  return Date.now() - new Date(user.lastSeen).getTime() < 2 * 60 * 1000;
}

function getLastSeen(user: any): string {
  if (!user?.lastSeen) return "Offline";
  const diff = Date.now() - new Date(user.lastSeen).getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 2)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24)  return `${hrs}h ago`;
  if (days < 7)  return `${days}d ago`;
  return "A while ago";
}

// ─── Portrait suggestion card (top scrollable row) ────────────────────────────

function PortraitCard({
  person, alreadySent, isSending, onConnect, onView, onDismiss,
}: {
  person: any; alreadySent: boolean; isSending: boolean;
  onConnect: () => void; onView: () => void; onDismiss: () => void;
}) {
  const online   = isUserOnline(person);
  const initials = (person.fullName || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const college  = person.college ? COLLEGE_COLORS[person.college] : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative flex-shrink-0 w-[148px] flex flex-col items-center gap-2.5 p-4 pt-5 rounded-[1.25rem] border transition-all ${
        alreadySent
          ? "bg-[#06402B]/5 dark:bg-emerald-500/10 border-[#06402B]/20 dark:border-emerald-500/20"
          : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {/* Dismiss */}
      {!alreadySent && (
        <button
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
        >
          <FaTimes size={9} />
        </button>
      )}

      {/* Avatar */}
      <div className="relative cursor-pointer" onClick={onView}>
        <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-sm font-black text-zinc-500 overflow-hidden">
          {person.avatarUrl
            ? <img src={person.avatarUrl} alt={person.fullName} className="w-full h-full object-cover" />
            : <span>{initials}</span>}
        </div>
        <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${online ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
      </div>

      {/* Info */}
      <div className="text-center w-full space-y-0.5">
        <p className="text-[13px] font-black text-zinc-900 dark:text-zinc-100 leading-tight truncate w-full px-1">
          {person.fullName || "Lasallian"}
        </p>
        <p className="text-[10px] font-mono text-zinc-400 truncate w-full px-1">@{person.username}</p>
      </div>

      {/* College pill */}
      {college && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${college.pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${college.dot} shrink-0`} />
          {person.college}
        </span>
      )}

      {/* Year + presence */}
      <p className={`text-[9px] font-bold uppercase tracking-widest ${online ? "text-emerald-500" : "text-zinc-400"}`}>
        {person.yearLevel ? `${person.yearLevel} · ` : ""}
        {online ? "Online" : getLastSeen(person)}
      </p>

      {/* Connect button */}
      <button
        onClick={onConnect}
        disabled={alreadySent || isSending}
        className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
          alreadySent
            ? "bg-[#06402B] dark:bg-emerald-600 text-white cursor-default"
            : isSending
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-wait"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
        }`}
      >
        {alreadySent
          ? <span className="flex items-center justify-center gap-1"><FaCheck size={8} />Added</span>
          : isSending ? "Sending…" : "Connect"}
      </button>
    </motion.div>
  );
}

// ─── Compact list card (bottom grid) ─────────────────────────────────────────

function ListCard({
  person, alreadySent, isSending, onConnect, onView,
}: {
  person: any; alreadySent: boolean; isSending: boolean;
  onConnect: () => void; onView: () => void;
}) {
  const online   = isUserOnline(person);
  const initials = (person.fullName || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
    >
      {/* Avatar */}
      <div className="relative shrink-0 cursor-pointer" onClick={onView}>
        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-black text-zinc-500 overflow-hidden">
          {person.avatarUrl
            ? <img src={person.avatarUrl} alt={person.fullName} className="w-full h-full object-cover" />
            : <span>{initials}</span>}
        </div>
        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${online ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
        <p className="text-[13px] font-black text-zinc-900 dark:text-zinc-100 truncate leading-none">{person.fullName || "Lasallian"}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <p className="text-[10px] font-mono text-zinc-400 truncate">@{person.username}</p>
          {person.yearLevel && (
            <>
              <span className="text-zinc-300 dark:text-zinc-700 text-[10px]">·</span>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{person.yearLevel}</span>
            </>
          )}
        </div>
        <p className={`text-[9px] font-bold mt-0.5 ${online ? "text-emerald-500" : "text-zinc-400"}`}>
          {online ? "● Online" : getLastSeen(person)}
        </p>
      </div>

      {/* Button */}
      <button
        onClick={onConnect}
        disabled={alreadySent || isSending}
        className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
          alreadySent
            ? "bg-[#06402B] dark:bg-emerald-600 text-white"
            : isSending
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-wait"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
        }`}
      >
        {alreadySent ? <FaCheck size={9} /> : <FaUserPlus size={9} />}
        {alreadySent ? "Added" : isSending ? "…" : "Add"}
      </button>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudyLounge() {
  const [activeTab, setActiveTab]         = useState<'friends' | 'inbox'>('friends');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const { showAlert }                     = useModal();

  const [myProfile, setMyProfile]         = useState<any>(null);
  const [friendsList, setFriendsList]     = useState<any[]>([]);
  const [collegemates, setCollegemates]   = useState<any[]>([]);
  const [dismissed, setDismissed]         = useState<Set<string>>(new Set());
  const [inboxItems, setInboxItems]       = useState<any[]>([]);

  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult]     = useState<any | null>(null);
  const [isAdding, setIsAdding]             = useState(false);
  const [requestSent, setRequestSent]       = useState(false);

  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
  const [sentRequests, setSentRequests]         = useState<Set<string>>(new Set());
  const [processingId, setProcessingId]         = useState<string | null>(null);

  // Ticker — re-evaluate presence every 30s without extra Firestore reads
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Subscriptions ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    let unsubFriends = () => {};

    const unsubMe = onSnapshot(doc(db, "users", auth.currentUser.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setMyProfile(data);

      const friendUids: string[] = data.friends || [];
      if (friendUids.length > 0) {
        const q = query(collection(db, "users"), where(documentId(), "in", friendUids.slice(0, 10)));
        unsubFriends = onSnapshot(q, (s) => setFriendsList(s.docs.map(d => ({ uid: d.id, ...d.data() }))));
      } else {
        setFriendsList([]);
      }
    });

    const unsubInbox = onSnapshot(
      query(collection(db, "inbox"), where("recipientId", "==", auth.currentUser.uid)),
      (snap) => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        items.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setInboxItems(items);
      }
    );

    return () => { unsubMe(); unsubFriends(); unsubInbox(); };
  }, []);

  // ── Fetch & shuffle collegemates ──────────────────────────────────────────
  useEffect(() => {
    if (!myProfile?.college || !auth.currentUser) return;

    const fetchCollegemates = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "users"), where("college", "==", myProfile.college), limit(50))
        );
        const friendUids = new Set<string>(myProfile.friends || []);
        const pool = snap.docs
          .filter(d => d.id !== auth.currentUser!.uid && !friendUids.has(d.id))
          .map(d => ({ uid: d.id, ...d.data() }));

        // Fisher-Yates shuffle — different order every session
        for (let i = pool.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        setCollegemates(pool.slice(0, 10));
      } catch (err) {
        console.error("Failed to fetch collegemates:", err);
      }
    };

    fetchCollegemates();
  }, [myProfile?.college]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSearchUser = async () => {
    if (!searchUsername.trim()) return;
    setRequestSent(false);
    const snap = await getDocs(query(collection(db, "users"), where("username", "==", searchUsername.trim())));
    setSearchResult(snap.empty ? "NOT_FOUND" : { uid: snap.docs[0].id, ...snap.docs[0].data() });
  };

  const handleSendFriendRequest = async (targetUser: any, isFromSearch = false) => {
    if (!auth.currentUser || !myProfile) return;
    if (isFromSearch) setIsAdding(true);
    else setSendingRequestTo(targetUser.uid);

    try {
      await addDoc(collection(db, "inbox"), {
        type: "friend_request",
        recipientId: targetUser.uid,
        senderId: auth.currentUser.uid,
        senderName: myProfile.fullName || "A Lasallian",
        senderUsername: myProfile.username,
        senderAvatar: myProfile.avatarUrl || "",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      if (isFromSearch) {
        setRequestSent(true);
        setTimeout(() => { setSearchResult(null); setSearchUsername(""); setRequestSent(false); setIsAdding(false); }, 1500);
      } else {
        setSentRequests(prev => new Set([...prev, targetUser.uid]));
        setSendingRequestTo(null);
      }
    } catch (err) {
      console.error(err);
      showAlert("Request Failed", "Failed to send request. Please try again.");
      setIsAdding(false);
      setSendingRequestTo(null);
    }
  };

  const handleAcceptFriend = async (item: any) => {
    if (!auth.currentUser) return;
    setProcessingId(item.id);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { friends: arrayUnion(item.senderId) });
      await updateDoc(doc(db, "users", item.senderId), { friends: arrayUnion(auth.currentUser.uid) });
      await updateDoc(doc(db, "inbox", item.id), { status: "accepted" });
    } catch (err) { console.error(err); }
    finally { setProcessingId(null); }
  };

  const handleAcceptDeck = async (item: any) => {
    if (!auth.currentUser) return;
    setProcessingId(item.id);
    try {
      if (!item.cards?.length) { showAlert("Empty Deck", "This deck has no cards to import."); return; }
      await addDoc(collection(db, "flashcard_decks"), {
        userId: auth.currentUser.uid, authorUsername: item.senderName,
        title: item.deckTitle, subject: item.deckSubject || "Collab",
        cards: item.cards, isPublic: false, upvotes: 0, downloads: 0, createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "inbox", item.id), { status: "accepted" });
    } catch (err) {
      console.error(err);
      showAlert("Import Failed", "Could not save the deck. Please try again.");
    } finally { setProcessingId(null); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const pendingInboxCount    = inboxItems.filter(i => i.status !== 'accepted').length;
  const college              = myProfile?.college;
  const collegeColor         = college ? COLLEGE_COLORS[college] : null;
  const friendUidSet         = new Set(friendsList.map(f => f.uid));
  const visibleCollegemates  = collegemates.filter(c => !friendUidSet.has(c.uid) && !dismissed.has(c.uid));
  const topRow               = visibleCollegemates.slice(0, 5);
  const listGrid             = visibleCollegemates.slice(5, 10);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {viewingUserId && <UserProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />}

      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 w-full">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-end w-full">
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase text-zinc-900 dark:text-white">Study Lounge</h2>
            <p className="text-zinc-500 text-sm font-medium">Connect with classmates and share resources directly.</p>
          </div>
          <div className="flex bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full md:w-auto shrink-0 shadow-sm">
            <button onClick={() => setActiveTab('friends')} className={`flex-1 md:w-32 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'friends' ? 'bg-white dark:bg-zinc-800 shadow-md text-[#06402B] dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
              <FaUserFriends size={14} /> Network
            </button>
            <button onClick={() => setActiveTab('inbox')} className={`relative flex-1 md:w-32 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'inbox' ? 'bg-white dark:bg-zinc-800 shadow-md text-[#06402B] dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
              <FaInbox size={14} /> Inbox
              {pendingInboxCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-800 animate-pulse shadow-lg" />}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ══════════ NETWORK TAB ══════════ */}
          {activeTab === 'friends' && (
            <motion.div key="network" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 w-full">

              {/* Search */}
              <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md p-5 md:p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-4 w-full">
                <div className="relative group flex-1 min-w-0">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#06402B] transition-colors" />
                  <input type="text" placeholder="Search exactly by @username..." value={searchUsername}
                    onChange={e => setSearchUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-[#06402B] transition-all font-bold text-sm text-zinc-900 dark:text-white"
                  />
                </div>
                <button onClick={handleSearchUser} className="w-full sm:w-auto px-8 py-4 bg-[#06402B] text-white rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shrink-0">
                  Find User
                </button>
              </div>

              {/* Search result */}
              {searchResult && (
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in w-full shadow-sm">
                  {searchResult === "NOT_FOUND" ? (
                    <p className="text-sm font-bold text-red-500 w-full text-center sm:text-left">User not found. Check exact spelling.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start cursor-pointer" onClick={() => setViewingUserId(searchResult.uid)}>
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 shadow-sm relative shrink-0 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 hover:ring-2 hover:ring-[#06402B] transition-all">
                          {searchResult.avatarUrl ? <img src={searchResult.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : searchResult.fullName?.charAt(0)}
                        </div>
                        <div className="min-w-0 text-center sm:text-left">
                          <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{searchResult.fullName || "Lasallian"}</p>
                          <p className="text-[10px] font-mono text-zinc-500 truncate">@{searchResult.username}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${isUserOnline(searchResult) ? "text-emerald-500" : "text-zinc-400"}`}>
                            {isUserOnline(searchResult) ? "● Online" : `Last seen ${getLastSeen(searchResult)}`}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleSendFriendRequest(searchResult, true)} disabled={isAdding || requestSent}
                        className={`w-full sm:w-auto px-6 py-3 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shrink-0 shadow-md transition-all duration-300 ${requestSent ? 'bg-green-500 scale-105' : 'bg-[#06402B] hover:bg-[#042d1f] active:scale-95 disabled:opacity-50'}`}>
                        {requestSent ? <><FaCheck size={14} /> Sent!</> : isAdding ? "Sending..." : <><FaUserPlus size={14} /> Send Request</>}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ══ INSTAGRAM-STYLE SUGGESTIONS ══ */}
              {college && collegeColor && visibleCollegemates.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                  {/* Section header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${collegeColor.bg} ${collegeColor.border}`}>
                        <FaGraduationCap size={11} className={collegeColor.text} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${collegeColor.text}`}>{college}</span>
                      </div>
                      <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                        Suggested for you
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest shrink-0">
                      {visibleCollegemates.length} student{visibleCollegemates.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Top row — horizontally scrollable portrait cards */}
                  {topRow.length > 0 && (
                    <div
                      className="flex gap-2.5 overflow-x-auto pb-2"
                      style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
                    >
                      <AnimatePresence>
                        {topRow.map(person => (
                          <PortraitCard
                            key={person.uid}
                            person={person}
                            alreadySent={sentRequests.has(person.uid)}
                            isSending={sendingRequestTo === person.uid}
                            onConnect={() => handleSendFriendRequest(person)}
                            onView={() => setViewingUserId(person.uid)}
                            onDismiss={() => setDismissed(prev => new Set([...prev, person.uid]))}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Divider with label */}
                  {listGrid.length > 0 && (
                    <>
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest shrink-0">
                          More from {COLLEGE_LABELS[college] || college}
                        </span>
                        <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                      </div>

                      {/* Bottom grid — compact list layout */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <AnimatePresence>
                          {listGrid.map(person => (
                            <ListCard
                              key={person.uid}
                              person={person}
                              alreadySent={sentRequests.has(person.uid)}
                              isSending={sendingRequestTo === person.uid}
                              onConnect={() => handleSendFriendRequest(person)}
                              onView={() => setViewingUserId(person.uid)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* No college nudge */}
              {!college && (
                <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl">
                  <FaGraduationCap size={16} className="text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Set your college</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-500 font-medium mt-0.5">
                      Go to Settings → Profile to set your college and discover classmates.
                    </p>
                  </div>
                </div>
              )}

              {/* ── My Network ── */}
              <div className="w-full">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-2">
                  My Network ({friendsList.length})
                </h3>
                {friendsList.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-center text-zinc-500 font-bold uppercase tracking-widest text-xs w-full">
                    Your network is empty. Find friends above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                    {friendsList.map(friend => {
                      const online = isUserOnline(friend);
                      return (
                        <div key={friend.uid} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 hover:border-[#06402B]/50 transition-colors w-full shadow-sm">
                          <div className="relative shrink-0 cursor-pointer" onClick={() => setViewingUserId(friend.uid)}>
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold shadow-sm hover:ring-2 hover:ring-[#06402B] transition-all">
                              {friend.avatarUrl ? <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : (friend.fullName?.charAt(0) || "U")}
                            </div>
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#121214] ${online ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{friend.fullName}</p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <p className={`text-[10px] font-mono font-bold ${online ? "text-emerald-500" : "text-zinc-400"}`}>
                                {online ? "● Online" : getLastSeen(friend)}
                              </p>
                              {friend.college && (
                                <>
                                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{friend.college}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════ INBOX TAB ══════════ */}
          {activeTab === 'inbox' && (
            <motion.div key="inbox" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 w-full">
              <div className="flex items-center gap-2 mb-2 ml-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pending Requests</h3>
                {pendingInboxCount > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingInboxCount}</span>}
              </div>

              {inboxItems.length === 0 ? (
                <div className="py-20 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-center text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-3 w-full">
                  <FaInbox size={24} className="opacity-50" /> Your inbox is empty.
                </div>
              ) : (
                inboxItems.map(item => {

                  if (item.type === 'friend_request') return (
                    <div key={item.id} className={`p-5 md:p-6 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full ${item.status === 'accepted' ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60' : 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-[#06402B]/30 shadow-md'}`}>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-800 shrink-0 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold shadow-sm cursor-pointer hover:ring-2 hover:ring-[#06402B] transition-all" onClick={() => setViewingUserId(item.senderId)}>
                          {item.senderAvatar ? <img src={item.senderAvatar} alt="Avatar" className="w-full h-full object-cover" /> : item.senderName?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono font-bold text-[#06402B] uppercase tracking-widest mb-1 truncate">Friend Request</p>
                          <h4 className="font-black text-base md:text-lg text-zinc-900 dark:text-white truncate">{item.senderName}</h4>
                          <p className="text-xs font-medium text-zinc-500 mt-0.5">@{item.senderUsername} wants to connect</p>
                        </div>
                      </div>
                      {item.status === 'accepted' ? (
                        <div className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-zinc-200 dark:bg-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-2 shrink-0">
                          <FaUserCheck /> Request Accepted
                        </div>
                      ) : (
                        <button onClick={() => handleAcceptFriend(item)} disabled={processingId === item.id}
                          className="w-full sm:w-auto px-6 py-3 md:py-4 bg-[#06402B] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 shrink-0">
                          {processingId === item.id ? "..." : <><FaUserPlus /> Accept</>}
                        </button>
                      )}
                    </div>
                  );

                  if (item.type === 'deck_removed') return (
                    <div key={item.id} className={`p-5 md:p-6 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full ${item.status === 'unread' ? 'bg-red-50/60 dark:bg-red-500/5 backdrop-blur-md border-red-300/40 dark:border-red-500/20 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5"><FaTrashAlt size={18} /></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest mb-1">Reviewer Removed</p>
                          <h4 className="font-black text-base text-zinc-900 dark:text-white truncate">{item.deckTitle}</h4>
                          {item.deckSubject && <p className="text-[10px] font-mono text-zinc-400 uppercase mt-0.5">{item.deckSubject}</p>}
                          <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed"><span className="text-red-500 font-black">Reason: </span>{item.reason}</p>
                          </div>
                        </div>
                      </div>
                      {item.status === 'unread' && (
                        <button onClick={() => updateDoc(doc(db, "inbox", item.id), { status: "read" })}
                          className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shrink-0 flex items-center justify-center gap-2">
                          <FaCheck size={10} /> Got it
                        </button>
                      )}
                    </div>
                  );

                  return (
                    <div key={item.id} className={`p-5 md:p-6 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full ${item.status === 'accepted' ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60' : 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-[#06402B]/30 shadow-md'}`}>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0"><FaPaperPlane size={20} /></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1 truncate">Deck From: @{item.senderName}</p>
                          <h4 className="font-black text-base md:text-lg text-zinc-900 dark:text-white truncate">{item.deckTitle}</h4>
                          <p className="text-xs font-medium text-zinc-500 mt-0.5">{item.cards?.length || 0} Terms Included</p>
                        </div>
                      </div>
                      {item.status === 'accepted' ? (
                        <div className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-zinc-200 dark:bg-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-2 shrink-0">
                          <FaCheck /> Synced to Vault
                        </div>
                      ) : (
                        <button onClick={() => handleAcceptDeck(item)} disabled={processingId === item.id}
                          className="w-full sm:w-auto px-6 py-3 md:py-4 bg-[#06402B] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 shrink-0">
                          {processingId === item.id ? "Syncing..." : <><FaDownload /> Save to Vault</>}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}