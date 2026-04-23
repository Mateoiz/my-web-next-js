"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUserFriends, FaInbox, FaSearch, FaUserPlus, FaCheck, FaDownload, FaCircle, FaPaperPlane } from "react-icons/fa";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, onSnapshot, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/db";

export default function StudyLounge() {
  const [activeTab, setActiveTab] = useState<'friends' | 'inbox'>('friends');
  
  // Friends State
  const [searchUsername, setSearchUsername] = useState("");
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Inbox State
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // 1. Fetch current user's friend UIDs, then listen to those friends' profiles
    const fetchFriends = async () => {
      const userRef = doc(db, "users", auth.currentUser!.uid);
      const userSnap = await getDoc(userRef);
      const friendUids = userSnap.exists() ? userSnap.data().friends || [] : [];
      
      if (friendUids.length > 0) {
        const q = query(collection(db, "users"), where("uid", "in", friendUids));
        const snap = await getDocs(q);
        setFriendsList(snap.docs.map(d => d.data()));
      }
    };
    fetchFriends();

    // 2. Listen to Inbox
    const inboxQ = query(collection(db, "inbox"), where("recipientId", "==", auth.currentUser.uid));
    const unsubscribeInbox = onSnapshot(inboxQ, (snap) => {
      setInboxItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribeInbox();
  }, []);

  // --- FRIEND LOGIC ---
  const handleSearchUser = async () => {
    if (!searchUsername.trim()) return;
    const q = query(collection(db, "users"), where("username", "==", searchUsername.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setSearchResult(snap.docs[0].data());
    } else {
      setSearchResult("NOT_FOUND");
    }
  };

  const handleAddFriend = async () => {
    if (!auth.currentUser || !searchResult || searchResult === "NOT_FOUND") return;
    setIsAdding(true);
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, {
        friends: arrayUnion(searchResult.uid)
      });
      setFriendsList([...friendsList, searchResult]);
      setSearchResult(null);
      setSearchUsername("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  // --- INBOX LOGIC ---
  const handleAcceptDeck = async (item: any) => {
    if (!auth.currentUser) return;
    setImportingId(item.id);

    try {
      // 1. Copy the deck to their vault
      await addDoc(collection(db, "flashcard_decks"), {
        userId: auth.currentUser.uid,
        authorUsername: item.senderName, 
        title: item.deckTitle,
        subject: item.deckSubject || "Collab",
        cards: item.cards, 
        isPublic: false, 
        createdAt: serverTimestamp(),
      });

      // 2. Mark inbox item as accepted (or delete it)
      await updateDoc(doc(db, "inbox", item.id), { status: "accepted" });
    } catch (error) {
      console.error(error);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
      
      <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase">Study Lounge</h2>
          <p className="text-zinc-500 text-sm font-medium">Connect with classmates and share resources directly.</p>
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full md:w-auto">
          <button onClick={() => setActiveTab('friends')} className={`flex-1 md:w-32 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'friends' ? 'bg-white dark:bg-zinc-800 shadow-md text-[#06402B] dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            <FaUserFriends /> Network
          </button>
          <button onClick={() => setActiveTab('inbox')} className={`flex-1 md:w-32 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 relative ${activeTab === 'inbox' ? 'bg-white dark:bg-zinc-800 shadow-md text-[#06402B] dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
            <FaInbox /> Inbox
            {inboxItems.filter(i => i.status !== 'accepted').length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* --- NETWORK TAB --- */}
        {activeTab === 'friends' && (
          <motion.div key="network" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            
            {/* Search Bar */}
            <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-4">
              <div className="relative group flex-1">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#06402B] transition-colors" />
                <input 
                  type="text" placeholder="Search by @username..." 
                  value={searchUsername} onChange={(e) => setSearchUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-[#06402B] transition-all font-bold text-sm"
                />
              </div>
              <button onClick={handleSearchUser} className="px-8 py-4 bg-[#06402B] text-white rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md">
                Find User
              </button>
            </div>

            {/* Search Result */}
            {searchResult && (
              <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between animate-in fade-in">
                {searchResult === "NOT_FOUND" ? (
                  <p className="text-sm font-bold text-red-500 ml-2">User not found. Check the username.</p>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#06402B]/10 text-[#06402B] rounded-full flex items-center justify-center"><FaUserFriends /></div>
                      <div>
                        <p className="font-bold text-sm">{searchResult.fullName}</p>
                        <p className="text-[10px] font-mono text-zinc-500">@{searchResult.username}</p>
                      </div>
                    </div>
                    <button onClick={handleAddFriend} disabled={isAdding} className="px-4 py-2 bg-[#06402B] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:opacity-80 disabled:opacity-50 flex items-center gap-2">
                      <FaUserPlus /> Add
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Friends Grid */}
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-2">My Network</h3>
              {friendsList.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-center text-zinc-500 font-bold uppercase tracking-widest text-xs">
                  Your network is empty. Find friends above.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {friendsList.map(friend => (
                    <div key={friend.uid} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 hover:border-[#06402B]/50 transition-colors">
                      <div className="relative">
                        <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500">
                          {friend.fullName.charAt(0)}
                        </div>
                        {/* Simulated Status Indicator */}
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 ${friend.isOnline ? 'bg-green-500' : 'bg-zinc-400'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{friend.fullName}</p>
                        <p className="text-[10px] font-mono text-zinc-500">@{friend.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* --- INBOX TAB --- */}
        {activeTab === 'inbox' && (
          <motion.div key="inbox" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {inboxItems.length === 0 ? (
               <div className="py-20 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-center text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-3">
                 <FaInbox size={24} className="opacity-50" />
                 No incoming flashcards.
               </div>
            ) : (
              inboxItems.map(item => (
                <div key={item.id} className={`p-6 rounded-[1.5rem] border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${item.status === 'accepted' ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60' : 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-[#06402B]/30 shadow-md'}`}>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                      <FaPaperPlane size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-1">
                        From: @{item.senderName}
                      </p>
                      <h4 className="font-black text-lg">{item.deckTitle}</h4>
                      <p className="text-xs font-medium text-zinc-500 mt-0.5">{item.cards?.length || 0} Terms Included</p>
                    </div>
                  </div>

                  {item.status === 'accepted' ? (
                    <div className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <FaCheck /> Synced to Vault
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleAcceptDeck(item)} disabled={importingId === item.id}
                      className="w-full sm:w-auto px-6 py-3 bg-[#06402B] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {importingId === item.id ? "Syncing..." : <><FaDownload /> Save to Vault</>}
                    </button>
                  )}
                </div>
              ))
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}