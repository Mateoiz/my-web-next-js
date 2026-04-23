"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaSearch, FaArrowUp, FaDownload, FaUserCircle, FaCheck, FaTrashAlt, FaShieldAlt } from "react-icons/fa";
import { collection, query, where, getDocs, orderBy, updateDoc, doc, increment, addDoc, serverTimestamp, deleteDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth"; // <-- ADDED THIS
import { auth, db } from "@/lib/db";

export default function FlashcardExchange() {
  const [decks, setDecks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedDecks, setImportedDecks] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 1. Fetch public decks independently
    const fetchDecks = async () => {
      const q = query(collection(db, "flashcard_decks"), where("isPublic", "==", true), orderBy("upvotes", "desc"));
      const snap = await getDocs(q);
      setDecks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchDecks();

    // 2. Wait for Firebase Auth to confirm user identity, THEN check for Admin role
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleVote = async (deckId: string) => {
    const deckRef = doc(db, "flashcard_decks", deckId);
    await updateDoc(deckRef, { upvotes: increment(1) });
    setDecks(prev => prev.map(d => d.id === deckId ? { ...d, upvotes: d.upvotes + 1 } : d));
  };

  const handleImport = async (deck: any) => {
    if (!auth.currentUser) return alert("You must be logged in to import.");
    setImportingId(deck.id);

    try {
      await addDoc(collection(db, "flashcard_decks"), {
        userId: auth.currentUser.uid,
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
      setImportedDecks(prev => [...prev, deck.id]);
    } catch (error) {
      console.error("Failed to import:", error);
    } finally {
      setImportingId(null);
    }
  };

  const handleAdminDelete = async (deckId: string) => {
    if (!confirm("ADMIN ACTION: Are you sure you want to permanently delete this public flashcard deck?")) return;
    try {
      await deleteDoc(doc(db, "flashcard_decks", deckId));
      setDecks(prev => prev.filter(d => d.id !== deckId));
    } catch (error) {
      alert("Failed to delete. Ensure your Firebase Rules are updated for Admins.");
      console.error(error);
    }
  };

  const filteredDecks = decks.filter(deck => {
    const matchesSearch = (deck.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
                          (deck.subject?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesCollege = collegeFilter === "All" || deck.college === collegeFilter;
    const matchesYear = yearFilter === "All" || deck.yearLevel === yearFilter;
    return matchesSearch && matchesCollege && matchesYear;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight uppercase flex items-center gap-3">
            Community Exchange {isAdmin && <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] rounded-md flex items-center gap-1"><FaShieldAlt /> Admin Mode</span>}
          </h2>
          <p className="text-zinc-500 text-sm font-medium italic">Verified reviewers by Lasallians, for Lasallians.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative group flex-1 sm:w-64">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#06402B] transition-colors" />
            <input 
              type="text" placeholder="Search Title or Subject..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 pl-12 pr-6 outline-none focus:border-[#06402B] transition-all font-bold text-sm shadow-sm" 
            />
          </div>
          <select 
            value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 outline-none focus:border-[#06402B] transition-all font-bold text-sm shadow-sm"
          >
            <option value="All">All Colleges</option>
            <option value="General">General</option>
            <option value="CAST">CAST</option>
            <option value="CBMA">CBMA</option>
            <option value="CVMAS">CVMAS</option>
            <option value="COED">COED</option>
          </select>
          <select 
            value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-3 px-4 outline-none focus:border-[#06402B] transition-all font-bold text-sm shadow-sm"
          >
            <option value="All">All Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
            <option value="Irregular">Irregular</option>
          </select>
        </div>
      </div>

      {filteredDecks.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] text-zinc-500 font-bold uppercase tracking-widest">
          No reviewers found for these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDecks.map((deck) => {
            const isImported = importedDecks.includes(deck.id);
            const isImporting = importingId === deck.id;

            return (
              <motion.div key={deck.id} whileHover={{ y: -5 }} className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 group transition-all flex flex-col relative">
                
                {/* Admin Delete Button */}
                {isAdmin && (
                  <button onClick={() => handleAdminDelete(deck.id)} className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-20" title="Delete as Admin">
                    <FaTrashAlt size={12} />
                  </button>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-[#06402B]/10 text-[#06402B] text-[10px] font-mono font-black rounded-lg uppercase">{deck.subject}</span>
                    {deck.college && <span className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-mono font-bold rounded-lg uppercase">{deck.college}</span>}
                  </div>
                  <button onClick={() => handleVote(deck.id)} className="flex items-center gap-2 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-[#06402B] hover:text-white transition-all">
                    <FaArrowUp size={12} /> <span className="text-xs font-bold">{deck.upvotes || 0}</span>
                  </button>
                </div>
                
                <h3 className="text-lg font-black mb-2 group-hover:text-[#06402B] transition-colors">{deck.title}</h3>
                
                <div className="flex items-center justify-between mb-6 flex-1">
                  <div className="flex items-center gap-2">
                    <FaUserCircle className="text-zinc-400" />
                    <span className="text-[11px] font-bold text-zinc-500">@{deck.authorUsername}</span>
                  </div>
                  {deck.yearLevel && <span className="text-[10px] font-bold text-zinc-400">{deck.yearLevel}</span>}
                </div>
                
                <button 
                  onClick={() => handleImport(deck)}
                  disabled={isImported || isImporting}
                  className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ${isImported ? 'bg-green-500 text-white' : 'bg-zinc-950 dark:bg-white text-white dark:text-black hover:shadow-lg active:scale-95'}`}
                >
                  {isImporting ? "Syncing..." : isImported ? <><FaCheck /> Synced to Vault</> : <><FaDownload /> Import Reviewer</>}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}