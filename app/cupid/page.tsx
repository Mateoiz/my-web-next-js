"use client";
import { useState, useRef, useEffect, ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaHeart, FaSpinner, FaTimes, FaFileContract, FaCheckCircle, FaEnvelope } from "react-icons/fa";
import { collection, query, orderBy, onSnapshot, serverTimestamp, setDoc, doc, getDoc, updateDoc, getDocs, addDoc, limit, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, User, sendPasswordResetEmail } from "firebase/auth";
import { db, auth, storage } from "@/lib/db";
// REMOVED: import ThemeToggle (User requested removal)

// --- CUSTOM IMPORTS ---
import { AppState, UserProfile, ChatMessage } from "./types";
import { QUESTS, PRIMARY_BTN_STYLE, BTN_SECONDARY_STYLE } from "./constants";
import { ValentineBackground } from "./components/ValentineBackground";
import { AuthForm } from "./components/AuthForm";
import { ProfileForm } from "./components/ProfileForm";
import { ChatInterface } from "./components/ChatInterface";
import { HomeView } from "./components/HomeView"; 
import CircuitCursor from "../components/CircuitCursor";

// BUTTON STYLES (Standard Theme)
const BTN_BASE = "w-full md:w-48 py-4 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm md:text-base";
const BTN_PRIMARY = `${BTN_BASE} bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20`;
const BTN_SECONDARY = `${BTN_BASE} bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-700 dark:text-white backdrop-blur-md`;

export default function CupidPage() {
  const [state, setState] = useState<AppState>('LOADING');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // Auth & Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [formData, setFormData] = useState({ 
    name: "", studentId: "", course: "", bio: "", age: "", height: "", 
    gender: "", preferredGender: "", minAge: "18", maxAge: "25",
    instagram: "", facebook: "", tags: [] as string[] 
  });

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  
  // Image State
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([null, null, null]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  // Match State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [match, setMatch] = useState<UserProfile | null>(null);
  const [quest, setQuest] = useState(""); 
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isPartnerDisconnected, setIsPartnerDisconnected] = useState(false);

  const initialLoadComplete = useRef(false);

  // --- UI HIDING LOGIC (MODALS) ---
  useEffect(() => {
    const globalElements = document.querySelectorAll('.global-ui');
    if (showTermsModal || showForgotModal) {
        globalElements.forEach(el => el.classList.add('opacity-0', 'pointer-events-none'));
        document.body.style.overflow = 'hidden';
    } else {
        globalElements.forEach(el => el.classList.remove('opacity-0', 'pointer-events-none'));
        document.body.style.overflow = 'unset';
    }
  }, [showTermsModal, showForgotModal]);

  // --- GLOBAL UI REMOVAL ---
  // This adds the 'chat-mode' class to body immediately on mount.
  // In your globals.css, this class hides nav, footer, and .ThemeToggle.
  useEffect(() => {
    document.body.classList.add('chat-mode');
    return () => document.body.classList.remove('chat-mode');
  }, []);

  // --- AUTH LISTENER ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setFirebaseUser(user);
            const unsubProfile = onSnapshot(doc(db, "cupid_users", user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const userData = { id: user.uid, ...docSnap.data() } as UserProfile;
                    setCurrentUser(userData);

                    if (!initialLoadComplete.current) {
                        if (!userData.preferredGender || !userData.age) {
                            setState('SETUP_PROFILE');
                        } else {
                            setState('HOME');
                        }
                        initialLoadComplete.current = true;
                    }

                    // OMEGLE LOGIC: Check for active match updates
                    if (userData.currentMatchId && state !== 'CHAT') {
                        loadMatchAndConnect(userData.currentMatchId, userData.id!);
                    }
                    if (!userData.currentMatchId && state === 'CHAT') {
                        setIsPartnerDisconnected(true);
                    }

                } else {
                    setState('SETUP_PROFILE'); 
                }
            });
            return () => unsubProfile();
        } else {
            setFirebaseUser(null); 
            setCurrentUser(null); 
            initialLoadComplete.current = false;
            setState((prev) => (prev === 'LOGIN' || prev === 'SIGNUP' ? prev : 'WELCOME'));
        }
    });
    return () => unsubscribeAuth();
  }, [state]); 

  // --- MATCHING LOGIC (OMEGLE STYLE) ---
  const searchForPartner = async () => {
    if (!currentUser?.id) return;
    setState('SEARCHING');
    setIsPartnerDisconnected(false);

    try {
        const queueRef = collection(db, "waiting_queue");
        const q = query(queueRef, orderBy("timestamp", "asc"), limit(20));
        const snapshot = await getDocs(q);

        let partnerDoc = null;

        for (const d of snapshot.docs) {
            const waiter = d.data();
            if (waiter.userId === currentUser.id) continue;

            const isGenderMatch = currentUser.preferredGender === "Any" || currentUser.preferredGender === waiter.gender;
            const isReverseMatch = waiter.preferredGender === "Any" || waiter.preferredGender === currentUser.gender;

            if (isGenderMatch && isReverseMatch) {
                partnerDoc = d;
                break; 
            }
        }

        if (partnerDoc) {
            const partnerId = partnerDoc.data().userId;
            await deleteDoc(partnerDoc.ref);

            const matchId = [currentUser.id, partnerId].sort().join("_");

            await Promise.all([
                updateDoc(doc(db, "cupid_users", currentUser.id), { currentMatchId: matchId, isSearching: false }),
                updateDoc(doc(db, "cupid_users", partnerId), { currentMatchId: matchId, isSearching: false })
            ]);

            await setDoc(doc(db, "matches", matchId), { 
                users: [currentUser.id, partnerId], 
                createdAt: serverTimestamp(),
                active: true 
            });

            loadMatchAndConnect(matchId, currentUser.id);

        } else {
            const queueEntry = {
                userId: currentUser.id,
                gender: currentUser.gender,
                preferredGender: currentUser.preferredGender,
                timestamp: serverTimestamp()
            };
            await setDoc(doc(db, "waiting_queue", currentUser.id), queueEntry);
            await updateDoc(doc(db, "cupid_users", currentUser.id), { isSearching: true });
        }

    } catch (e) {
        console.error("Search Error:", e);
        setState('HOME');
    }
  };

  const loadMatchAndConnect = async (matchId: string, myId: string) => {
      const userIds = matchId.split("_");
      const partnerId = userIds.find(id => id !== myId);
      if (!partnerId) return;

      const partnerSnap = await getDoc(doc(db, "cupid_users", partnerId));
      if (partnerSnap.exists()) {
          const pData = { id: partnerId, ...partnerSnap.data() } as UserProfile;
          setMatch(pData);
          setQuest(QUESTS[Math.floor(Math.random() * QUESTS.length)]);
          
          const messagesRef = collection(db, "matches", matchId, "messages");
          const q = query(messagesRef, orderBy("createdAt", "asc"));
          
          onSnapshot(q, (snap) => {
              setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          });

          await deleteDoc(doc(db, "waiting_queue", myId)).catch(() => {}); 
          setState('CHAT');
      }
  };

  const handleNext = async () => {
      if (!currentUser?.id) return;
      if (match?.id) {
          try { await updateDoc(doc(db, "cupid_users", match.id), { currentMatchId: null }); } catch(e) {} 
      }
      await updateDoc(doc(db, "cupid_users", currentUser.id), { currentMatchId: null });
      setMatch(null);
      setMessages([]);
      searchForPartner();
  };

const handleStop = async () => {
      setState('HOME');
      setMatch(null);
      setMessages([]);

      if (!currentUser?.id) return;

      try {
          const promises = [];
          if (match?.id) {
              promises.push(updateDoc(doc(db, "cupid_users", match.id), { currentMatchId: null }).catch(() => {}));
          }
          promises.push(updateDoc(doc(db, "cupid_users", currentUser.id), { currentMatchId: null, isSearching: false }));
          promises.push(deleteDoc(doc(db, "waiting_queue", currentUser.id)).catch(() => {}));
          await Promise.all(promises);
      } catch (e) {
          console.warn("Cleanup warning (non-fatal):", e);
      }
  };

  // --- GENERAL HANDLERS ---
  const handleForgotPassword = async () => {
      if (!forgotEmail) { alert("Please enter your email address."); return; }
      setResetStatus('sending');
      try {
          await sendPasswordResetEmail(auth, forgotEmail);
          setResetStatus('sent');
      } catch (error: any) {
          setResetStatus('error');
      }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser?.id || !match?.id) return;
    const text = newMessage; setNewMessage("");
    const mid = [currentUser.id, match.id].sort().join("_");
    await addDoc(collection(db, "matches", mid, "messages"), { text, senderId: currentUser.id, createdAt: serverTimestamp() });
  };

  const handleLogin = async () => { if (!email || !password) { setAuthError("Fill all fields."); return; } setIsCheckingAuth(true); setAuthError(""); try { await signInWithEmailAndPassword(auth, email, password); } catch (e) { setAuthError("Invalid credentials."); setIsCheckingAuth(false); } };
  const handleSignup = async () => { if (!email.endsWith("@dlsau.edu.ph")) { setAuthError("Must use a @dlsau.edu.ph email."); return; } if (password.length < 6) { setAuthError("Password must be at least 6 characters."); return; } if (password !== confirmPassword) { setAuthError("Passwords do not match."); return; } if (!agreedToTerms) { setAuthError("You must agree to the terms."); return; } setIsCheckingAuth(true); setAuthError(""); try { await createUserWithEmailAndPassword(auth, email, password); } catch (e: any) { if (e.code === 'auth/email-already-in-use') setAuthError("Account exists. Log In."); else if (e.code === 'auth/weak-password') setAuthError("Password too weak."); else setAuthError("Signup failed."); setIsCheckingAuth(false); } };
  const handleImageSelect = (index: number, e: ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; const newFiles = [...imageFiles]; newFiles[index] = file; setImageFiles(newFiles); const newPreviews = [...previewUrls]; newPreviews[index] = URL.createObjectURL(file); setPreviewUrls(newPreviews); } };
  const removeImage = (index: number) => { const newFiles = [...imageFiles]; newFiles[index] = null; setImageFiles(newFiles); const newPreviews = [...previewUrls]; newPreviews[index] = null; setPreviewUrls(newPreviews); };
  
  const handleProfileSubmit = async () => {
    if (!firebaseUser) return; setIsUploading(true);
    try {
        let urls = currentUser?.imgs ? [...currentUser.imgs] : [];
        for(let i=0; i<3; i++) {
            if(imageFiles[i]) {
                const r = ref(storage, `cupid_avatars/${firebaseUser.uid}_${Date.now()}_${i}`);
                await uploadBytes(r, imageFiles[i]!);
                const u = await getDownloadURL(r);
                if(i < urls.length) urls[i] = u; else urls.push(u);
            }
        }
        if(urls.length===0) urls.push(`https://api.dicebear.com/7.x/notionists/svg?seed=${formData.name}`);
        const u: UserProfile = { ...formData, id: firebaseUser.uid, email: firebaseUser.email!, imgs: urls };
        await setDoc(doc(db, "cupid_users", firebaseUser.uid), u);
        setCurrentUser(u); setIsUploading(false); setState('HOME');
    } catch(e) { setIsUploading(false); alert("Save failed. Check console."); }
  };

  const handleLogout = async () => { await signOut(auth); window.location.reload(); };

  // --- RENDER FUNCTIONS ---
  
  const renderWelcome = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-2xl mx-auto relative z-50 px-4">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose-500/30 bg-rose-100 dark:bg-rose-500/10 mb-8 backdrop-blur-md">
        <FaHeart className="text-rose-500 animate-bounce" />
        <span className="text-rose-600 dark:text-rose-200 text-xs font-mono uppercase tracking-widest">SAMPISANAN Special</span>
      </div>
      <h1 className="text-5xl md:text-8xl font-black text-zinc-900 dark:text-white mb-6 tracking-tighter drop-shadow-xl transition-colors">
        FIND YOUR <br className="md:hidden" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500">PLAYER 2</span>
      </h1>
      <p className="text-zinc-600 dark:text-zinc-300 text-sm md:text-lg mb-10 font-medium max-w-lg mx-auto leading-relaxed transition-colors">Initialize <strong>The Cupid Algorithm</strong>. A data-driven approach to finding your Valentine at DLSAU.</p>
      <div className="flex flex-col md:flex-row gap-4 justify-center items-center w-full max-w-sm md:max-w-none mx-auto">
        <button onClick={() => setState('LOGIN')} className={BTN_PRIMARY}>LOG IN</button>
        <button onClick={() => setState('SIGNUP')} className={BTN_SECONDARY}>SIGN UP</button>
      </div>
    </motion.div>
  );

  const renderTermsModal = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md">
      <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-zinc-900 border-0 md:border border-zinc-200 dark:border-zinc-800 w-full h-full md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-3xl relative shadow-2xl flex flex-col overflow-hidden transition-colors">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900 z-10 shadow-sm transition-colors">
            <div><h3 className="text-xl font-black text-zinc-900 dark:text-white flex items-center gap-2 transition-colors"><FaFileContract className="text-rose-500" /> TERMS & RULES</h3><p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold mt-0.5">Please read carefully</p></div>
            <button onClick={() => setShowTermsModal(false)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all active:scale-95"><FaTimes /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <section><h4 className="text-zinc-900 dark:text-white font-bold mb-2 text-sm flex items-center gap-2">1. Eligibility & Identity</h4><ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed"><li>You must be a currently enrolled student at <strong>De La Salle Araneta University (DLSAU)</strong>.</li><li>You must use your valid institutional email (@dlsau.edu.ph) for verification.</li></ul></section>
          <section><h4 className="text-zinc-900 dark:text-white font-bold mb-2 text-sm flex items-center gap-2">2. Code of Conduct</h4><ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed"><li><strong>Respect is Mandatory:</strong> Harassment will not be tolerated.</li><li><strong>No Catfishing:</strong> Photos must be of you.</li></ul></section>
          <section><h4 className="text-zinc-900 dark:text-white font-bold mb-2 text-sm flex items-center gap-2">3. Privacy & Data</h4><ul className="list-disc pl-5 space-y-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed"><li>Your profile data is visible <strong>only to users you match with</strong>.</li></ul></section>
          <div className="h-20 md:h-0"></div>
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-10 pb-8 md:pb-4 transition-colors">
            <button onClick={() => { setAgreedToTerms(true); setShowTermsModal(false); }} className={`${PRIMARY_BTN_STYLE} w-full py-4 text-sm font-black shadow-lg shadow-rose-900/20 active:scale-[0.98]`}>I ACCEPT & JOIN</button>
        </div>
      </motion.div>
    </div>
  );

  const renderForgotModal = () => (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-8 rounded-3xl max-w-sm w-full relative shadow-2xl transition-colors duration-300 bg-white border border-zinc-200 dark:bg-black dark:border-zinc-800">
        <button onClick={() => { setShowForgotModal(false); setResetStatus('idle'); }} className="absolute top-6 right-6 transition-colors text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white"><FaTimes /></button>
        <h3 className="text-2xl font-black mb-2 text-zinc-900 dark:text-white">RESET PASSWORD</h3>
        <p className="text-xs mb-6 text-zinc-500 dark:text-zinc-400">Enter your student email to receive a reset link.</p>
        {resetStatus === 'sent' ? (
            <div className="p-4 rounded-xl text-center bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <FaCheckCircle className="text-3xl mx-auto mb-2 text-green-600 dark:text-green-500" />
                <p className="font-bold text-sm text-green-700 dark:text-green-400">Email Sent!</p>
                <p className="text-xs mt-1 text-green-600/70 dark:text-green-400/60">Check your inbox (and spam folder).</p>
                <button onClick={() => setShowForgotModal(false)} className="mt-4 text-xs underline text-zinc-900 dark:text-white">Close</button>
            </div>
        ) : (
            <>
                <div className="relative mb-6 group">
                    <FaEnvelope className="absolute top-4 left-4 transition-colors text-zinc-400 group-focus-within:text-rose-500 dark:text-zinc-500 dark:group-focus-within:text-rose-400" />
                    <input type="email" placeholder="dlsau email..." value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="w-full rounded-xl p-4 pl-12 outline-none text-sm font-bold transition-all bg-zinc-50 border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-rose-500 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-600 dark:focus:border-rose-500" />
                </div>
                <button onClick={handleForgotPassword} disabled={resetStatus === 'sending'} className="w-full py-4 rounded-2xl font-black text-sm transition-all duration-300 shadow-lg border-0 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                    {resetStatus === 'sending' ? <FaSpinner className="animate-spin mx-auto" /> : 'SEND LINK'}
                </button>
                {resetStatus === 'error' && <p className="text-xs font-bold mt-4 text-center text-red-600 dark:text-red-400">Failed to send. Check email.</p>}
            </>
        )}
      </motion.div>
    </div>
  );

  return (
    <section className="min-h-screen relative overflow-hidden font-sans bg-zinc-50 dark:bg-black selection:bg-rose-500 selection:text-white transition-colors duration-300">
      <CircuitCursor />
      <ValentineBackground />
      
      {/* NOTE: No <ThemeToggle /> here.
         The global one is hidden by the 'chat-mode' class added in useEffect above.
      */}

      <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-rose-200/40 dark:from-rose-900/20 via-white/0 dark:via-black/0 to-transparent pointer-events-none z-0" />
      <div className="container mx-auto px-6 pt-32 pb-12 relative z-50 flex flex-col items-center justify-center min-h-[80vh]">
        <AnimatePresence mode="wait">
          <motion.div key={state} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
            
            {state === 'WELCOME' && renderWelcome()}
            
            {state === 'LOGIN' && <AuthForm mode="LOGIN" email={email} setEmail={setEmail} password={password} setPassword={setPassword} isLoading={isCheckingAuth} showPassword={showPassword} setShowPassword={setShowPassword} authError={authError} onSubmit={handleLogin} onSwitchMode={() => setState('SIGNUP')} onForgotPassword={() => setShowForgotModal(true)} />}
            {state === 'SIGNUP' && <AuthForm mode="SIGNUP" email={email} setEmail={setEmail} password={password} setPassword={setPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} isLoading={isCheckingAuth} showPassword={showPassword} setShowPassword={setShowPassword} authError={authError} onSubmit={handleSignup} onSwitchMode={() => setState('LOGIN')} agreedToTerms={agreedToTerms} setAgreedToTerms={setAgreedToTerms} onShowTerms={() => setShowTermsModal(true)} />}
            {state === 'SETUP_PROFILE' && <ProfileForm email={email} formData={formData} setFormData={setFormData} imageFiles={imageFiles} previewUrls={previewUrls} onImageSelect={handleImageSelect} onRemoveImage={removeImage} onSubmit={handleProfileSubmit} onCancel={currentUser?.name ? () => setState('HOME') : undefined} isUploading={isUploading} fileInputRefs={fileInputRefs} />}
            
            {state === 'HOME' && (
                <HomeView 
                    currentUser={currentUser} 
                    onStartChat={searchForPartner} 
                    onEditProfile={() => { setFormData({ name: currentUser?.name || "", studentId: currentUser?.studentId || "", course: currentUser?.course || "", bio: currentUser?.bio || "", age: currentUser?.age || "", height: currentUser?.height || "", gender: currentUser?.gender || "", preferredGender: currentUser?.preferredGender || "", minAge: currentUser?.minAge || "18", maxAge: currentUser?.maxAge || "25", instagram: currentUser?.instagram || "", facebook: currentUser?.facebook || "", tags: currentUser?.tags || [] }); const currentImgs = currentUser?.imgs || []; setPreviewUrls([...currentImgs, null, null, null].slice(0, 3)); setImageFiles([null, null, null]); setState('SETUP_PROFILE'); }} 
                    onLogout={handleLogout} 
                />
            )}

            {state === 'SEARCHING' && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-20 h-20 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-6" />
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white animate-pulse">LOOKING FOR A MATCH...</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">Please wait while we connect you.</p>
                    <button onClick={handleStop} className="mt-8 px-6 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">Cancel</button>
                </div>
            )}

            {state === 'CHAT' && (
                <ChatInterface 
                    match={match} 
                    currentUser={currentUser} 
                    messages={messages} 
                    quest={quest} 
                    newMessage={newMessage} 
                    setNewMessage={setNewMessage} 
                    onSendMessage={sendMessage} 
                    onStop={handleStop} 
                    onNext={handleNext}
                    messagesEndRef={messagesEndRef}
                    isPartnerDisconnected={isPartnerDisconnected}
                />
            )}

            {state === 'LOADING' && <div className="flex items-center justify-center h-64"><FaSpinner className="text-rose-500 text-4xl animate-spin" /></div>}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {showTermsModal && renderTermsModal()}
      {showForgotModal && renderForgotModal()}
    </section>
  );
}