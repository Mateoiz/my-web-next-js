"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTimes, FaLayerGroup, FaArrowUp, FaGraduationCap,
  FaBuilding, FaCalendarAlt, FaUserPlus, FaCheck,
  FaUserFriends, FaChevronDown
} from "react-icons/fa";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/db";

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-3 px-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
      <span className="text-xl font-black text-zinc-900 dark:text-white tabular-nums">{value}</span>
      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5 text-center leading-tight">{label}</span>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 whitespace-nowrap">
      <span className="text-[#06402B]">{icon}</span>
      {label}
    </span>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-5 pt-2">
      <div className="flex justify-end">
        <div className="h-8 w-24 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="space-y-2">
        <div className="h-6 w-36 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-10 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      <div className="flex gap-2">
        {[1, 2, 3].map(i => <div key={i} className="flex-1 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />)}
      </div>
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
      </div>
    </div>
  );
}

export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [publicDecks, setPublicDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [decksExpanded, setDecksExpanded] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", userId));
        if (!userSnap.exists()) { setLoading(false); return; }
        setProfile({ uid: userSnap.id, ...userSnap.data() });

        const me = auth.currentUser;
        if (me) {
          if (me.uid === userId) {
            setIsSelf(true);
          } else {
            const mySnap = await getDoc(doc(db, "users", me.uid));
            if (mySnap.exists()) {
              setIsFriend((mySnap.data().friends || []).includes(userId));
            }
          }
        }

        const q = query(
          collection(db, "flashcard_decks"),
          where("userId", "==", userId),
          where("isPublic", "==", true)
        );
        const snap = await getDocs(q);
        setPublicDecks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleSendFriendRequest = async () => {
    if (!auth.currentUser || !profile || sending) return;
    setSending(true);
    try {
      const mySnap = await getDoc(doc(db, "users", auth.currentUser.uid));
      const myData = mySnap.data();
      await addDoc(collection(db, "inbox"), {
        type: "friend_request",
        recipientId: userId,
        senderId: auth.currentUser.uid,
        senderName: myData?.fullName || "A Lasallian",
        senderUsername: myData?.username || "",
        senderAvatar: myData?.avatarUrl || "",
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setRequestSent(true);
    } finally {
      setSending(false);
    }
  };

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const totalUpvotes = publicDecks.reduce((acc, d) => acc + (d.upvotes || 0), 0);
  const visibleDecks = decksExpanded ? publicDecks : publicDecks.slice(0, 3);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="relative bg-zinc-50 dark:bg-zinc-950 w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[92dvh] sm:max-h-[88dvh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle — mobile only */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
            <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>

          {/* Banner + Avatar as one relative block */}
          <div className="relative shrink-0">
            {/* Green banner */}
            <div className="h-28 sm:h-32 bg-gradient-to-br from-[#06402B] via-[#085c38] to-[#042d1f] overflow-hidden rounded-t-[2.5rem] sm:rounded-t-[2.5rem] relative">
              <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-4 right-8 w-24 h-24 rounded-full bg-white/5 blur-xl" />
              <div className="absolute top-3 left-5 w-2 h-2 rounded-full bg-white/20" />
              <div className="absolute top-8 left-12 w-1 h-1 rounded-full bg-white/30" />
              <div className="absolute bottom-5 left-1/3 w-1.5 h-1.5 rounded-full bg-white/20" />

              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close profile"
                className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/25 active:bg-white/30 text-white rounded-full flex items-center justify-center transition-all touch-manipulation z-10"
              >
                <FaTimes size={13} />
              </button>

              {/* Username in banner */}
              {!loading && profile?.username && (
                <div className="absolute bottom-4 left-5">
                  <span className="text-[10px] font-mono font-bold text-white/60 uppercase tracking-widest">
                    @{profile.username}
                  </span>
                </div>
              )}
            </div>

            {/* Avatar — absolutely positioned over the banner bottom edge */}
            <div className="absolute -bottom-9 left-5 z-10">
              <div className="relative">
                <div className="w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] rounded-2xl border-4 border-zinc-50 dark:border-zinc-950 bg-zinc-200 dark:bg-zinc-800 overflow-hidden shadow-xl">
                  {loading ? (
                    <div className="w-full h-full animate-pulse bg-zinc-300 dark:bg-zinc-700" />
                  ) : profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile?.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-zinc-500 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800">
                      {profile?.fullName?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                {profile?.isOnline && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-50 dark:border-zinc-950 shadow" />
                )}
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto overscroll-contain flex-1 px-5 pb-8 pt-14">

            {loading ? (
              <ProfileSkeleton />
            ) : !profile ? (
              <div className="py-16 text-center text-zinc-500 font-bold">User not found.</div>
            ) : (
              <>
                {/* CTA button */}
                {!isSelf && (
                  <div className="flex justify-end mb-4">
                    {isFriend ? (
                      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#06402B]/10 text-[#06402B] dark:bg-[#06402B]/20 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <FaUserFriends size={11} /> Connected
                      </div>
                    ) : requestSent ? (
                      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-green-500/10 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <FaCheck size={11} /> Sent!
                      </div>
                    ) : (
                      <button
                        onClick={handleSendFriendRequest}
                        disabled={sending}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#06402B] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#052f1f] active:scale-95 transition-all shadow-md touch-manipulation disabled:opacity-60"
                      >
                        <FaUserPlus size={11} />
                        {sending ? "Sending..." : "Connect"}
                      </button>
                    )}
                  </div>
                )}

                {/* Identity */}
                <h2 className="text-xl font-black text-zinc-900 dark:text-white leading-tight">
                  {profile.fullName || "Lasallian"}
                </h2>
                {profile.isOnline !== undefined && (
                  <p className="text-[10px] font-bold mt-0.5 mb-3">
                    {profile.isOnline
                      ? <span className="text-emerald-500">● Online</span>
                      : <span className="text-zinc-400">● Offline</span>
                    }
                  </p>
                )}

                {/* Bio */}
                {profile.bio && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed pl-3 border-l-2 border-[#06402B]/40 italic">
                    {profile.bio}
                  </p>
                )}

                {/* Info chips */}
                {(profile.program || profile.college || profile.yearLevel) && (
                  <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                    {profile.program && <Chip icon={<FaGraduationCap />} label={profile.program} />}
                    {profile.college && <Chip icon={<FaBuilding />} label={profile.college} />}
                    {profile.yearLevel && <Chip icon={<FaCalendarAlt />} label={profile.yearLevel} />}
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-2.5 mb-6">
                  <StatPill label="Reviewers" value={publicDecks.length} />
                  <StatPill label="Network" value={profile.friends?.length || 0} />
                  <StatPill label="Upvotes" value={totalUpvotes} />
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 mb-5" />

                {/* Public Decks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Published Reviewers
                    </h3>
                    {publicDecks.length > 0 && (
                      <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                        {publicDecks.length}
                      </span>
                    )}
                  </div>

                  {publicDecks.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                      <p className="text-xs text-zinc-400 font-bold">No public reviewers yet.</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {visibleDecks.map((deck, i) => (
                          <motion.div
                            key={deck.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-[#06402B]/30 transition-colors group"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-zinc-800 dark:text-white truncate group-hover:text-[#06402B] transition-colors">
                                {deck.title}
                              </p>
                              <p className="text-[10px] font-mono text-zinc-400 uppercase mt-0.5">{deck.subject}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                                <FaLayerGroup size={9} /> {deck.cards?.length || 0}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                                <FaArrowUp size={9} /> {deck.upvotes || 0}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {publicDecks.length > 3 && (
                        <button
                          onClick={() => setDecksExpanded(v => !v)}
                          className="mt-3 w-full py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:border-[#06402B]/40 hover:text-[#06402B] transition-all flex items-center justify-center gap-2 touch-manipulation"
                        >
                          <motion.span
                            animate={{ rotate: decksExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <FaChevronDown size={10} />
                          </motion.span>
                          {decksExpanded ? "Show Less" : `Show ${publicDecks.length - 3} More`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}