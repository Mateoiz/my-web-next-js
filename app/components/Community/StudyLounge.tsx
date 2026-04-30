"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUserFriends, FaInbox, FaSearch, FaUserPlus, FaCheck, FaDownload, FaPaperPlane, FaUserCheck, FaTrashAlt } from "react-icons/fa";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, onSnapshot, addDoc, serverTimestamp, documentId } from "firebase/firestore";
import { auth, db } from "@/lib/db";
import { useModal } from "../../context/ModalContext";
import UserProfileModal from "../../components/UserProfileModal";

export default function StudyLounge() {
  const [activeTab, setActiveTab] = useState<'friends' | 'inbox'>('friends');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null); // ✅ state is correct
  const { showAlert } = useModal();
  const [myProfile, setMyProfile] = useState<any>(null);
  const [searchUsername, setSearchUsername] = useState("");
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    let unsubFriends = () => {};

    const myRef = doc(db, "users", auth.currentUser.uid);
    const unsubMe = onSnapshot(myRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMyProfile(data);

        const friendUids = data.friends || [];
        if (friendUids.length > 0) {
          const friendsQuery = query(collection(db, "users"), where(documentId(), "in", friendUids.slice(0, 10)));
          unsubFriends = onSnapshot(friendsQuery, (fSnap) => {
            setFriendsList(fSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
          });
        } else {
          setFriendsList([]);
        }
      }
    });

    const inboxQ = query(collection(db, "inbox"), where("recipientId", "==", auth.currentUser.uid));
    const unsubscribeInbox = onSnapshot(inboxQ, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setInboxItems(items);
    });

    // ❌ REMOVED: the modal JSX that was incorrectly placed here inside useEffect

    return () => {
      unsubMe();
      unsubFriends();
      unsubscribeInbox();
    };
  }, []);

  const handleSearchUser = async () => {
    if (!searchUsername.trim()) return;
    setRequestSent(false);
    const q = query(collection(db, "users"), where("username", "==", searchUsername.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const foundDoc = snap.docs[0];
      setSearchResult({ uid: foundDoc.id, ...foundDoc.data() });
    } else {
      setSearchResult("NOT_FOUND");
    }
  };

  const handleSendFriendRequest = async () => {
    if (!auth.currentUser || !searchResult || searchResult === "NOT_FOUND" || !myProfile) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, "inbox"), {
        type: "friend_request",
        recipientId: searchResult.uid,
        senderId: auth.currentUser.uid,
        senderName: myProfile.fullName || "A Lasallian",
        senderUsername: myProfile.username,
        senderAvatar: myProfile.avatarUrl || "",
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setRequestSent(true);
      setTimeout(() => {
        setSearchResult(null);
        setSearchUsername("");
        setRequestSent(false);
        setIsAdding(false);
      }, 1500);
    } catch (error) {
      console.error(error);
      showAlert("Request Failed", "Failed to send request. Please try again.");
      setIsAdding(false);
    }
  };

  const handleAcceptFriend = async (item: any) => {
    if (!auth.currentUser) return;
    setProcessingId(item.id);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), { friends: arrayUnion(item.senderId) });
      await updateDoc(doc(db, "users", item.senderId), { friends: arrayUnion(auth.currentUser.uid) });
      await updateDoc(doc(db, "inbox", item.id), { status: "accepted" });
    } catch (error) {
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcceptDeck = async (item: any) => {
    if (!auth.currentUser) return;
    setProcessingId(item.id);
    try {
      if (!item.cards || item.cards.length === 0) {
        showAlert("Empty Deck", "This deck has no cards to import.");
        return;
      }
      await addDoc(collection(db, "flashcard_decks"), {
        userId: auth.currentUser.uid,
        authorUsername: item.senderName,
        title: item.deckTitle,
        subject: item.deckSubject || "Collab",
        cards: item.cards,
        isPublic: false,
        upvotes: 0,
        downloads: 0,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "inbox", item.id), { status: "accepted" });
    } catch (error) {
      console.error(error);
      showAlert("Import Failed", "Could not save the deck. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingInboxCount = inboxItems.filter(i => i.status !== 'accepted').length;

  return (
    // ✅ Modal is rendered HERE at the top of the JSX return, not inside useEffect
    <>
      {viewingUserId && (
        <UserProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}

      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 w-full">

        <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-end w-full">
          <div>
            <h2 className="text-3xl font-black tracking-tight uppercase text-zinc-900 dark:text-white">Study Lounge</h2>
            <p className="text-zinc-500 text-sm font-medium">Connect with classmates and share resources directly.</p>
          </div>
          <div className="flex bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full md:w-auto shrink-0 shadow-sm">
            <button onClick={() => setActiveTab('friends')} className={`flex-1 md:w-32 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'friends' ? 'bg-white dark:bg-zinc-800 shadow-md text-[#06402B] dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
              <FaUserFriends size={14} /> Network
            </button>
            <button onClick={() => setActiveTab('inbox')} className={`flex-1 md:w-32 py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 relative ${activeTab === 'inbox' ? 'bg-white dark:bg-zinc-800 shadow-md text-[#06402B] dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
              <FaInbox size={14} /> Inbox
              {pendingInboxCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-800 animate-pulse shadow-lg" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* NETWORK TAB */}
          {activeTab === 'friends' && (
            <motion.div key="network" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 w-full">

              <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md p-5 md:p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-4 w-full">
                <div className="relative group flex-1 min-w-0">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#06402B] transition-colors" />
                  <input
                    type="text" placeholder="Search exactly by @username..."
                    value={searchUsername} onChange={(e) => setSearchUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-[#06402B] transition-all font-bold text-sm text-zinc-900 dark:text-white"
                  />
                </div>
                <button onClick={handleSearchUser} className="w-full sm:w-auto px-8 py-4 bg-[#06402B] text-white rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shrink-0">
                  Find User
                </button>
              </div>

              {searchResult && (
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in w-full shadow-sm">
                  {searchResult === "NOT_FOUND" ? (
                    <p className="text-sm font-bold text-red-500 w-full text-center sm:text-left">User not found. Check exact spelling.</p>
                  ) : (
                    <>
                      {/* ✅ Clickable avatar in search result too */}
                      <div
                        className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start cursor-pointer"
                        onClick={() => setViewingUserId(searchResult.uid)}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 shadow-sm relative shrink-0 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 hover:ring-2 hover:ring-[#06402B] transition-all">
                          {searchResult.avatarUrl ? <img src={searchResult.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : searchResult.fullName?.charAt(0)}
                        </div>
                        <div className="min-w-0 text-center sm:text-left">
                          <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{searchResult.fullName || "Lasallian"}</p>
                          <p className="text-[10px] font-mono text-zinc-500 truncate">@{searchResult.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleSendFriendRequest}
                        disabled={isAdding || requestSent}
                        className={`w-full sm:w-auto px-6 py-3 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shrink-0 shadow-md transition-all duration-300 ${requestSent ? 'bg-green-500 scale-105 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-[#06402B] hover:bg-[#042d1f] active:scale-95 disabled:opacity-50'}`}
                      >
                        {requestSent ? <><FaCheck size={14} /> Sent!</> : isAdding ? "Sending..." : <><FaUserPlus size={14} /> Send Request</>}
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="w-full">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 ml-2">My Network ({friendsList.length})</h3>
                {friendsList.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-center text-zinc-500 font-bold uppercase tracking-widest text-xs w-full">
                    Your network is empty. Find friends above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                    {friendsList.map(friend => (
                      <div key={friend.uid} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-5 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 hover:border-[#06402B]/50 transition-colors w-full shadow-sm">
                        
                        {/* ✅ Clickable avatar */}
                        <div
                          className="relative shrink-0 cursor-pointer"
                          onClick={() => setViewingUserId(friend.uid)}
                          title={`View ${friend.fullName}'s profile`}
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold shadow-sm hover:ring-2 hover:ring-[#06402B] transition-all">
                            {friend.avatarUrl
                              ? <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                              : (friend.fullName?.charAt(0) || "U")}
                          </div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-[#121214] ${friend.isOnline ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{friend.fullName}</p>
                          <p className="text-[10px] font-mono text-zinc-500 truncate">{friend.isOnline ? 'Online' : 'Offline'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* INBOX TAB */}
          {activeTab === 'inbox' && (
            <motion.div key="inbox" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 w-full">

              <div className="flex items-center gap-2 mb-2 ml-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Pending Requests</h3>
                {pendingInboxCount > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingInboxCount}</span>}
              </div>

              {inboxItems.length === 0 ? (
                <div className="py-20 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-center text-zinc-500 font-bold uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-3 w-full">
                  <FaInbox size={24} className="opacity-50" />
                  Your inbox is empty.
                </div>
              ) : (
                inboxItems.map(item => {
                  if (item.type === 'friend_request') {
                    return (
                      <div key={item.id} className={`p-5 md:p-6 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full ${item.status === 'accepted' ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60' : 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-[#06402B]/30 shadow-md'}`}>
                        <div className="flex items-center gap-4 min-w-0">
                          <div
                            className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-800 shrink-0 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold shadow-sm cursor-pointer hover:ring-2 hover:ring-[#06402B] transition-all"
                            onClick={() => setViewingUserId(item.senderId)}
                          >
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
                          <button
                            onClick={() => handleAcceptFriend(item)}
                            disabled={processingId === item.id}
                            className="w-full sm:w-auto px-6 py-3 md:py-4 bg-[#06402B] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                          >
                            {processingId === item.id ? "..." : <><FaUserPlus /> Accept</>}
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (item.type === 'deck_removed') {
                    return (
                      <div key={item.id} className={`p-5 md:p-6 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full ${item.status === 'unread' ? 'bg-red-50/60 dark:bg-red-500/5 backdrop-blur-md border-red-300/40 dark:border-red-500/20 shadow-md' : 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60'}`}>
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                            <FaTrashAlt size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest mb-1">Reviewer Removed</p>
                            <h4 className="font-black text-base text-zinc-900 dark:text-white truncate">{item.deckTitle}</h4>
                            {item.deckSubject && (
                              <p className="text-[10px] font-mono text-zinc-400 uppercase mt-0.5">{item.deckSubject}</p>
                            )}
                            <div className="mt-2 px-3 py-2 bg-red-500/10 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                <span className="text-red-500 font-black">Reason: </span>
                                {item.reason}
                              </p>
                            </div>
                          </div>
                        </div>

                        {item.status === 'unread' && (
                          <button
                            onClick={() => updateDoc(doc(db, "inbox", item.id), { status: "read" })}
                            className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shrink-0 flex items-center justify-center gap-2"
                          >
                            <FaCheck size={10} /> Got it
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className={`p-5 md:p-6 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full ${item.status === 'accepted' ? 'bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60' : 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-[#06402B]/30 shadow-md'}`}>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                          <FaPaperPlane size={20} />
                        </div>
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
                        <button
                          onClick={() => handleAcceptDeck(item)}
                          disabled={processingId === item.id}
                          className="w-full sm:w-auto px-6 py-3 md:py-4 bg-[#06402B] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                        >
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