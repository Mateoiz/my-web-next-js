"use client";

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import confetti from 'canvas-confetti';
import { 
  motion, 
  AnimatePresence 
} from "framer-motion";
import { 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaVoteYea, 
  FaSearchPlus, 
  FaTimes,
  FaBolt,
  FaSpinner,
  FaInfoCircle,
  FaShareAlt
} from "react-icons/fa";

// --- FIREBASE IMPORTS ---
import { db } from '../../lib/firebase'; 
import { 
  collection, 
  setDoc, 
  doc, 
  getDoc,
  getDocs, 
  query,   
  where,
  orderBy,
  limit,
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";

// --- VISUAL COMPONENTS ---
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor";

// --- CONFIGURATION ---
const SHIRT_OPTIONS = [
  { id: 'shirt_1', name: 'Design 1: CAST Magic - Maroon', img: '/CAST/1.jpg' },
  { id: 'shirt_2', name: 'Design 2: CAST Magic - Khaki', img: '/CAST/2.jpg' },
  { id: 'shirt_3', name: 'Design 3: CAST Minimal - Maroon', img: '/CAST/3.jpg' },
  { id: 'shirt_4', name: 'Design 4: CAST Minimal - Khaki', img: '/CAST/4.jpg' }
];

const BLOCK_OPTIONS = [
  "BSCS-1A", "BSCS-2A", "BSCS-3A", "BSCS-4A",
  "BSCOE-1A", "BSCOE-2A", "BSCOE-3A", "BSCOE-4A",
  "ABPSYCH-1A", "ABPSYCH-1B",
  "ABPSYCH-2A", "ABPSYCH-2B",
  "ABPSYCH-3A", "ABPSYCH-3B",
  "ABPSYCH-4A", "ABPSYCH-4B"
];

const COLLECTION_NAME = "jpcs_shirt_votes";

interface VoteActivity {
  id: string;
  name: string;
  shirtName: string;
  timestamp: number;
}

export default function Voting() {
  // --- STATE ---
  const [formData, setFormData] = useState({
    fullName: '',
    blockSection: '',
    studentId: ''
  });
  const [selectedShirt, setSelectedShirt] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  
  // UI State
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Real-time Data
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [recentVotes, setRecentVotes] = useState<VoteActivity[]>([]);

  // --- 1. CHECK LOCAL STORAGE (LAYER 1) ---
  useEffect(() => {
    const checkLocalVote = () => {
      const storedVote = localStorage.getItem('jpcs_has_voted');
      const storedName = localStorage.getItem('jpcs_voter_name');
      const storedChoice = localStorage.getItem('jpcs_voter_choice');
      const storedId = localStorage.getItem('jpcs_voter_id');

      if (storedVote === 'true' && storedName && storedChoice && storedId) {
        setFormData(prev => ({ ...prev, fullName: storedName, studentId: storedId }));
        setSelectedShirt(storedChoice);
        setStatus('success');
      } else {
        setStatus('idle');
      }
    };
    checkLocalVote();
  }, []);

  // --- 2. ADMIN RESET LISTENER (NEW FEATURE) ---
  // If the user has voted (status === 'success'), we watch their document.
  // If it gets deleted in Firebase, we automatically unlock their screen.
  useEffect(() => {
    if (status !== 'success' || !formData.studentId) return;

    const cleanId = formData.studentId.trim().toUpperCase().replace(/\s+/g, '');
    const userVoteRef = doc(db, COLLECTION_NAME, cleanId);

    const unsubscribe = onSnapshot(userVoteRef, (docSnap) => {
      // If the document ceases to exist while we think we are in 'success' mode...
      if (!docSnap.exists()) {
        console.log("Record deleted remotely. Resetting user state...");
        
        // 1. Clear Local Storage
        localStorage.removeItem('jpcs_has_voted');
        localStorage.removeItem('jpcs_voter_name');
        localStorage.removeItem('jpcs_voter_choice');
        localStorage.removeItem('jpcs_voter_id');

        // 2. Reset UI State
        setStatus('idle');
        setSelectedShirt(null);
        setFormData(prev => ({ ...prev, studentId: '', fullName: '', blockSection: '' }));
        
        // 3. Notify User
        alert("System Notice: Your vote record has been reset. You may vote again.");
      }
    });

    return () => unsubscribe();
  }, [status, formData.studentId]);

  // --- 3. GLOBAL REAL-TIME LISTENERS ---
  useEffect(() => {
    // A. COUNTS LISTENER
    const unsubscribeCounts = onSnapshot(collection(db, COLLECTION_NAME), (snapshot) => {
      const counts: Record<string, number> = { shirt_1: 0, shirt_2: 0, shirt_3: 0, shirt_4: 0 };
      let total = 0;

      snapshot.forEach((docSnap) => {
        const choice = docSnap.data().voteChoice;
        if (choice && counts[choice] !== undefined) {
          counts[choice]++;
          total++;
        }
      });
      
      setVoteCounts(counts);
      setTotalVotes(total);
    });

    // B. FEED LISTENER
    const qRecent = query(
      collection(db, COLLECTION_NAME), 
      orderBy('timestamp', 'desc'), 
      limit(5)
    );

    const unsubscribeFeed = onSnapshot(qRecent, (snapshot) => {
      const activityList: VoteActivity[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.fullName && data.voteChoice) {
           const shirt = SHIRT_OPTIONS.find(s => s.id === data.voteChoice);
           const shortName = shirt ? shirt.name.split(':')[0] : 'Unknown';
           const firstName = data.fullName.split(' ')[0];
           
           activityList.push({
             id: docSnap.id,
             name: firstName,
             shirtName: shortName,
             timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now()
           });
        }
      });
      
      setRecentVotes(activityList);
    });

    return () => {
      unsubscribeCounts();
      unsubscribeFeed();
    };
  }, []);

  // --- 4. HANDLERS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleZoom = (e: React.MouseEvent, imgSrc: string) => {
    e.stopPropagation(); 
    setTimeout(() => setZoomedImage(imgSrc), 50);
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleShare = async () => {
    const shirtName = SHIRT_OPTIONS.find(s => s.id === selectedShirt)?.name;
    const shareData = {
      title: 'JPCS Shirt Vote',
      text: `I just voted for ${shirtName} in the JPCS Shirt Design Contest! Cast your vote now.`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.text + " " + shareData.url);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    if (!formData.fullName || !formData.blockSection || !formData.studentId) {
      setErrorMessage("Please fill in all details.");
      setStatus('error');
      return;
    }
    if (!selectedShirt) {
      setErrorMessage("Please select a shirt design.");
      setStatus('error');
      return;
    }

    try {
      // Input Normalization
      const cleanId = formData.studentId.trim().toUpperCase().replace(/\s+/g, '');
      const cleanName = formData.fullName.trim().replace(/\s+/g, ' '); 
      
      // Layer 2 Check: ID
      const voteRef = doc(db, COLLECTION_NAME, cleanId);
      const docSnap = await getDoc(voteRef);
      if (docSnap.exists()) {
        const existingName = docSnap.data().fullName;
        setErrorMessage(`Student ID ${cleanId} has already voted (Registered as: ${existingName}).`);
        setStatus('error');
        return;
      }

      // Layer 3 Check: Name
      const nameQuery = query(
        collection(db, COLLECTION_NAME), 
        where("fullName", "==", cleanName)
      );
      const nameSnapshot = await getDocs(nameQuery);
      if (!nameSnapshot.empty) {
        setErrorMessage(`"${cleanName}" has already voted. One vote per student allowed.`);
        setStatus('error');
        return;
      }

      // Submit
      await setDoc(voteRef, {
        fullName: cleanName,
        blockSection: formData.blockSection,
        studentId: cleanId,
        voteChoice: selectedShirt,
        timestamp: serverTimestamp()
      });

      // Layer 1 Set: Local Storage
      localStorage.setItem('jpcs_has_voted', 'true');
      localStorage.setItem('jpcs_voter_name', cleanName);
      localStorage.setItem('jpcs_voter_choice', selectedShirt);
      localStorage.setItem('jpcs_voter_id', cleanId);

      setStatus('success');
      triggerConfetti();

    } catch (error) {
      console.error("Error voting:", error);
      setErrorMessage("Connection failed. Please try again.");
      setStatus('error');
    }
  };

  if (status === 'loading' && !selectedShirt && !errorMessage) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
           <FaSpinner className="animate-spin text-green-500 text-4xl" />
        </div>
     );
  }

  return (
    <section className="min-h-screen relative overflow-hidden pb-32 bg-zinc-50 dark:bg-black transition-colors duration-300">
      
      {/* Visual Effects */}
      <CircuitCursor />
      <div className="absolute inset-0 z-0 pointer-events-none"><FloatingCubes /></div>
      
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-green-100/40 dark:from-green-900/20 to-transparent pointer-events-none z-0" />

      {/* --- LIGHTBOX --- */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4"
            onClick={() => setZoomedImage(null)}
          >
            <button 
              className="hidden md:block absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2"
              onClick={() => setZoomedImage(null)}
            >
              <FaTimes size={32} />
            </button>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-3xl h-[60vh] md:h-[80vh] rounded-lg overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()} 
            >
              <Image 
                src={zoomedImage} 
                alt="Zoomed Design" 
                fill 
                className="object-contain"
              />
            </motion.div>
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-8 bg-zinc-800 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 md:hidden active:scale-95 transition-transform"
              onClick={() => setZoomedImage(null)}
            >
              <FaTimes /> Close Preview
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 sm:px-6 pt-24 md:pt-32 relative z-10">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12 md:mb-20"
        >
          <h1 className="text-4xl md:text-7xl font-black mb-4 md:mb-6 text-zinc-900 dark:text-white transition-colors duration-300">
            Shirt <span className="text-green-600 dark:text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">Voting</span>
          </h1>
          <p className="text-zinc-600 dark:text-gray-400 text-sm md:text-xl max-w-2xl mx-auto font-mono">
            // Select your gear. Define the future identity.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          
          {/* LEFT: VOTING FORM */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7"
          >
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-green-500/30 rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />

              {status === 'success' ? (
                <div className="text-center py-10">
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-6"
                  >
                    <FaCheckCircle size={48} />
                  </motion.div>
                  <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-2">Vote Recorded</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-8">
                    Welcome back, <strong className="text-green-600 dark:text-green-400">{formData.fullName}</strong>.<br/>
                    You voted for <strong>{SHIRT_OPTIONS.find(s => s.id === selectedShirt)?.name || 'a design'}</strong>.
                  </p>
                  
                  {/* SHARE BUTTON */}
                  <button 
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg"
                  >
                    <FaShareAlt /> Share your vote
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <AnimatePresence>
                    {status === 'error' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-3 text-sm font-medium"
                      >
                        <FaExclamationTriangle className="flex-shrink-0" /> 
                        <span>{errorMessage}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mb-8 md:mb-10">
                    <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-6 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      1. Student Identity
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">Full Name</label>
                        <input name="fullName" type="text" onChange={handleInputChange} className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all placeholder:text-zinc-400" placeholder="e.g. Juan Dela Cruz" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* ROBUST DROPDOWN FOR SECTION */}
                        <div>
                          <label className="block text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">Block/Section</label>
                          <div className="relative">
                            <select 
                              name="blockSection" 
                              onChange={handleInputChange} 
                              className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all appearance-none cursor-pointer"
                              defaultValue=""
                            >
                              <option value="" disabled>Select Section</option>
                              {BLOCK_OPTIONS.map(block => (
                                <option key={block} value={block}>{block}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">Student ID #</label>
                          <input name="studentId" type="text" onChange={handleInputChange} className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-300 dark:border-zinc-700 rounded-lg p-3 text-base text-zinc-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all" placeholder="e.g. 2023-0001" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SHIRT SELECTION */}
                  <div className="mb-8 md:mb-10">
                    <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-700 pb-2 mb-6 flex items-center gap-2">
                       <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                       2. Select Design
                    </h2>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      {SHIRT_OPTIONS.map((shirt) => (
                        <div
                          key={shirt.id}
                          onClick={() => setSelectedShirt(shirt.id)}
                          className={`relative cursor-pointer rounded-xl border-2 transition-all duration-300 overflow-hidden group ${
                            selectedShirt === shirt.id
                              ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-[1.02]'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-green-500/50 hover:shadow-lg dark:bg-zinc-900'
                          }`}
                        >
                          <div className="bg-zinc-100 dark:bg-zinc-950 aspect-[4/5] flex items-center justify-center relative overflow-hidden">
                            <button
                              type="button"
                              onClick={(e) => handleZoom(e, shirt.img)}
                              className="absolute top-2 right-2 z-20 p-3 bg-black/60 hover:bg-green-600 text-white rounded-full backdrop-blur-sm transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:translate-y-2 lg:group-hover:translate-y-0"
                              title="Zoom In"
                            >
                              <FaSearchPlus size={16} />
                            </button>
                            <Image 
                              src={shirt.img} 
                              alt={shirt.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            {selectedShirt === shirt.id && (
                              <div className="absolute inset-0 bg-green-500/20 z-10 flex items-center justify-center pointer-events-none">
                                <div className="bg-green-600 text-white rounded-full p-2 shadow-lg scale-110">
                                  <FaCheckCircle size={24} />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className={`p-3 text-center text-xs md:text-sm font-semibold transition-colors ${
                            selectedShirt === shirt.id 
                              ? 'bg-green-600 text-white' 
                              : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                          }`}>
                            {shirt.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WARNING BANNER */}
                  <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/50 flex items-start gap-3">
                    <FaInfoCircle className="text-amber-600 dark:text-amber-500 mt-1 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-400">
                      <strong>Strict One-Vote Policy:</strong> Once you submit, your choice is final and cannot be changed or deleted. Please double-check your selection.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full bg-zinc-900 dark:bg-green-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-zinc-800 dark:hover:bg-green-500 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-green-500/40 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                       {status === 'loading' ? 'Verifying...' : (
                         <>Submit Vote <FaVoteYea /></>
                       )}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </motion.div>

          {/* RIGHT: LIVE RESULTS */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 space-y-6 md:space-y-8"
          >
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-green-500/30 rounded-3xl p-6 md:p-8 shadow-2xl lg:sticky lg:top-32">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white">Live Analytics</h2>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-500/10 border border-green-500/20">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[10px] font-mono font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">
                    Online
                  </span>
                </div>
              </div>

              <div className="space-y-5 md:space-y-6">
                {SHIRT_OPTIONS.map((shirt) => {
                  const count = voteCounts[shirt.id] || 0;
                  const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const maxVotes = Math.max(...Object.values(voteCounts));
                  const isLeader = count > 0 && count === maxVotes;

                  return (
                    <div key={shirt.id} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <span className={`text-sm font-medium ${
                          isLeader ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'
                        }`}>
                          {shirt.name} {isLeader && '👑'}
                        </span>
                        <span className="text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-500">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            isLeader 
                              ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' 
                              : 'bg-zinc-400 dark:bg-zinc-600 group-hover:bg-green-400'
                          }`}
                        ></motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
                <div className="text-3xl md:text-4xl font-black text-zinc-800 dark:text-white">{totalVotes}</div>
                <div className="text-xs text-zinc-500 dark:text-green-500/70 font-mono uppercase tracking-widest mt-1">Total Votes</div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-green-500/20 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                 <FaBolt className="text-yellow-400" />
                 <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Real-time Feed</h3>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {recentVotes.length === 0 ? (
                    <p className="text-sm text-zinc-500 italic">Waiting for incoming data...</p>
                  ) : (
                    recentVotes.map((vote) => (
                      <motion.div 
                        key={vote.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 text-sm p-3 rounded-xl bg-white dark:bg-black/40 border border-zinc-100 dark:border-zinc-800 shadow-sm"
                      >
                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                         <p className="text-zinc-700 dark:text-zinc-300">
                           <span className="font-bold text-zinc-900 dark:text-white">{vote.name}</span> just voted for <span className="text-green-600 dark:text-green-400 font-semibold">{vote.shirtName}</span>!
                         </p>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}