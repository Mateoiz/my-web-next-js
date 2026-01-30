"use client";
import { useState, useRef, useEffect, ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaHeart, FaSpinner, FaTimes, FaFileContract } from "react-icons/fa";
import { collection, query, where, orderBy, onSnapshot, serverTimestamp, setDoc, doc, getDoc, updateDoc, getDocs, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth, storage } from "@/lib/db";
import { useTheme } from "next-themes"; // <--- 1. IMPORT USE THEME

// --- CUSTOM IMPORTS ---
import { AppState, UserProfile, ChatMessage } from "./types";
import { QUESTS, PRIMARY_BTN_STYLE, BTN_SECONDARY_STYLE } from "./constants";
import { ValentineBackground } from "./components/ValentineBackground";
import { AuthForm } from "./components/AuthForm";
import { ProfileForm } from "./components/ProfileForm";
import { MatchingView } from "./components/MatchingView";
import { ChatInterface } from "./components/ChatInterface";
import { HomeView } from "./components/HomeView"; 
import CircuitCursor from "../components/CircuitCursor";
import ThemeToggle from "../components/ThemeToggle"; // <--- 2. IMPORT THEME TOGGLE (Adjust path if needed)

const BTN_BASE = "w-full md:w-48 py-4 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm md:text-base";
const BTN_PRIMARY = `${BTN_BASE} bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20`;
const BTN_SECONDARY = `${BTN_BASE} bg-zinc-800/50 hover:bg-zinc-700 border border-zinc-700 text-white backdrop-blur-md`;

export default function CupidPage() {
  const { setTheme } = useTheme(); // <--- 3. INITIALIZE THEME HOOK
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
  
  // Image State
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([null, null, null]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  // Match State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [match, setMatch] = useState<UserProfile | null>(null);
  const [compatibility, setCompatibility] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasRerolled, setHasRerolled] = useState(false);
  const [quest, setQuest] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const initialLoadComplete = useRef(false);

  // --- LOGIC TO HIDE UI ELEMENTS WHEN MODAL IS OPEN ---
  useEffect(() => {
    const globalElements = document.querySelectorAll('.global-ui');
    
    if (showTermsModal) {
        globalElements.forEach(el => el.classList.add('opacity-0', 'pointer-events-none'));
    } else {
        globalElements.forEach(el => el.classList.remove('opacity-0', 'pointer-events-none'));
    }
  }, [showTermsModal]);

  useEffect(() => {
    // 4. SET DARK MODE CORRECTLY VIA HOOK
    setTheme('dark'); 
    
    signOut(auth); 

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setFirebaseUser(user);
            const unsubProfile = onSnapshot(doc(db, "cupid_users", user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const userData = { id: user.uid, ...docSnap.data() } as UserProfile;
                    setCurrentUser(userData);
                    setHasRerolled(!!userData.hasRerolled);

                    if (!initialLoadComplete.current) {
                        if (!userData.preferredGender || !userData.age) {
                            setState('SETUP_PROFILE');
                        } else {
                            setState('HOME');
                        }
                        initialLoadComplete.current = true;
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
  }, []); 

  const loadExistingMatch = async (matchId: string, myId: string) => {
      setState('LOADING');
      try {
          const matchDoc = await getDoc(doc(db, "cupid_users", matchId));
          if (matchDoc.exists()) {
              const matchData = { id: matchId, ...matchDoc.data() } as UserProfile;
              setMatch(matchData);
              initializeChat(matchId, true, myId, matchData); 
          } else {
              console.warn("Match missing - resetting profile");
              await updateDoc(doc(db, "cupid_users", myId), { currentMatchId: "" });
              setMatch(null);
              setState('HOME');
          }
      } catch (e) {
          console.error("Error loading match:", e);
          setState('HOME');
      }
  };

  const handleLogin = async () => {
    if (!email || !password) { setAuthError("Fill all fields."); return; }
    setIsCheckingAuth(true); setAuthError("");
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (e) { setAuthError("Invalid credentials."); setIsCheckingAuth(false); }
  };

  const handleSignup = async () => {
    if (!email.endsWith("@dlsau.edu.ph")) { setAuthError("Must use a @dlsau.edu.ph email."); return; }
    if (password.length < 6) { setAuthError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setAuthError("Passwords do not match."); return; }
    if (!agreedToTerms) { setAuthError("You must agree to the terms."); return; }
    setIsCheckingAuth(true); setAuthError("");
    try { await createUserWithEmailAndPassword(auth, email, password); } 
    catch (e: any) { 
        console.error("Signup Error:", e);
        if (e.code === 'auth/email-already-in-use') setAuthError("Account exists. Log In.");
        else if (e.code === 'auth/weak-password') setAuthError("Password too weak.");
        else setAuthError("Signup failed.");
        setIsCheckingAuth(false); 
    }
  };

  const handleImageSelect = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFiles = [...imageFiles]; newFiles[index] = file; setImageFiles(newFiles);
      const newPreviews = [...previewUrls]; newPreviews[index] = URL.createObjectURL(file); setPreviewUrls(newPreviews);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles]; newFiles[index] = null; setImageFiles(newFiles);
    const newPreviews = [...previewUrls]; newPreviews[index] = null; setPreviewUrls(newPreviews);
  };

  const handleProfileSubmit = async () => {
    if (!firebaseUser) return;
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = currentUser?.imgs ? [...currentUser.imgs] : [];
      for (let i = 0; i < 3; i++) {
          if (imageFiles[i]) {
              const storageRef = ref(storage, `cupid_avatars/${firebaseUser.uid}_${Date.now()}_${i}`);
              await uploadBytes(storageRef, imageFiles[i]!);
              const url = await getDownloadURL(storageRef);
              i < uploadedUrls.length ? uploadedUrls[i] = url : uploadedUrls.push(url);
          }
      }
      if (uploadedUrls.length === 0) uploadedUrls.push(`https://api.dicebear.com/7.x/notionists/svg?seed=${formData.name}`);
      const newUser: UserProfile = { ...formData, id: firebaseUser.uid, email: firebaseUser.email!, imgs: uploadedUrls, currentMatchId: currentUser?.currentMatchId || "", hasRerolled: currentUser?.hasRerolled || false };
      await setDoc(doc(db, "cupid_users", firebaseUser.uid), newUser);
      setCurrentUser(newUser); setIsUploading(false);
      setState('HOME');
    } catch (e) { setIsUploading(false); alert("Error saving."); }
  };

  const findMatch = async (user: UserProfile, isReroll = false, excludeId?: string) => {
    if (!user.id) { console.error("User ID missing"); return; }
    
    setState('SCANNING'); 

    if (user.currentMatchId && !isReroll) { 
        loadExistingMatch(user.currentMatchId, user.id); 
        return; 
    }
    if (isReroll && user.hasRerolled) { alert("Reroll used!"); setState('HOME'); return; }

    try {
      const q = user.preferredGender === "Any" 
        ? query(collection(db, "cupid_users")) 
        : query(collection(db, "cupid_users"), where("gender", "==", user.preferredGender));
      const snapshot = await getDocs(q);
      
      const minAge = parseInt(user.minAge || "18");
      const maxAge = parseInt(user.maxAge || "99");

      let potentialMatches = snapshot.docs
        .map(d => ({id: d.id, ...d.data()} as UserProfile))
        .filter(u => {
             const cAge = parseInt(u.age);
             return u.id !== user.id && (!user.currentMatchId || u.id !== user.currentMatchId) && (!excludeId || u.id !== excludeId) && (!isNaN(cAge) && cAge >= minAge && cAge <= maxAge);
        });
      
      potentialMatches = potentialMatches.sort(() => Math.random() - 0.5);

      if (potentialMatches.length > 0) {
          const foundMatch = potentialMatches[0];
          setMatch(foundMatch); setCompatibility(Math.floor(Math.random() * 30) + 70); setIsRevealed(false);
          if (isReroll) { await updateDoc(doc(db, "cupid_users", user.id), { hasRerolled: true }); setHasRerolled(true); }
          setTimeout(() => setState('MATCH_FOUND'), 2500);
      } else {
          alert("No matches found in your age range! Try adjusting your preferences.");
          setState('HOME'); 
      }
    } catch (e) { console.error(e); alert("Match error."); setState('HOME'); }
  };

  const handleConnect = async () => {
    if (!currentUser?.id || !match?.id || match.isBot) return;
    setState('CONNECTING');
    try {
        const myUpdate = updateDoc(doc(db, "cupid_users", currentUser.id), { currentMatchId: match.id });
        const theirUpdate = updateDoc(doc(db, "cupid_users", match.id), { currentMatchId: currentUser.id });
        await Promise.all([myUpdate, theirUpdate]);
        const myId = currentUser.id;
        const matchData = match; 
        setTimeout(() => { setState('ITS_A_MATCH'); setTimeout(() => initializeChat(matchData.id!, false, myId, matchData), 2000); }, 2500);
    } catch (error) { console.error("Connection failed:", error); alert("Failed to connect."); setState('HOME'); }
  };

  const initializeChat = async (pid: string, isLoad: boolean, myId?: string, directMatchData?: UserProfile) => {
    setQuest(QUESTS[0]); 
    setState('CHAT');
    const uid = myId || currentUser?.id;
    const targetMatch = directMatchData || match;
    if (!targetMatch?.isBot && pid !== 'bot') {
        if (!uid || !pid) return;
        const mid = [uid, pid].sort().join("_");
        if (!isLoad) await setDoc(doc(db, "matches", mid), { users: [uid, pid], lastUpdated: serverTimestamp() }, { merge: true });
        onSnapshot(query(collection(db, "matches", mid, "messages"), orderBy("createdAt", "asc")), (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        });
    } else { setMessages([{ id: "1", text: "Hello! I am a bot.", senderId: "bot", createdAt: new Date() }]); }
  };

  const sendMessage = async () => {
      if (!newMessage.trim() || !currentUser || !currentUser.id || !match) return;
      const textToSend = newMessage; setNewMessage(""); 
      const tempMsg: ChatMessage = { id: Date.now().toString(), text: textToSend, senderId: currentUser.id, createdAt: { seconds: Date.now() / 1000 } };
      setMessages(prev => [...prev, tempMsg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 10);
      if (!match.isBot && match.id) {
          const mid = [currentUser.id, match.id].sort().join("_");
          await addDoc(collection(db, "matches", mid, "messages"), { text: textToSend, senderId: currentUser.id, createdAt: serverTimestamp() });
      } 
  };

  const handleLogout = async () => { await signOut(auth); window.location.reload(); };

  // --- RENDER FUNCTIONS ---
  const renderWelcome = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-2xl mx-auto relative z-50 px-4">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose-500/30 bg-rose-100 dark:bg-rose-500/10 mb-8 backdrop-blur-md">
        <FaHeart className="text-rose-500 animate-bounce" />
        <span className="text-rose-600 dark:text-rose-200 text-xs font-mono uppercase tracking-widest">SAMPISANAN Special</span>
      </div>
      <h1 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tighter drop-shadow-xl">
        FIND YOUR <br className="md:hidden" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500">PLAYER 2</span>
      </h1>
      <p className="text-zinc-300 text-sm md:text-lg mb-10 font-medium max-w-lg mx-auto leading-relaxed">Initialize <strong>The Cupid Algorithm</strong>. A data-driven approach to finding your Valentine at DLSAU.</p>
      <div className="flex flex-col md:flex-row gap-4 justify-center items-center w-full max-w-sm md:max-w-none mx-auto">
        <button onClick={() => setState('LOGIN')} className={BTN_PRIMARY}>LOG IN</button>
        <button onClick={() => setState('SIGNUP')} className={BTN_SECONDARY}>SIGN UP</button>
      </div>
    </motion.div>
  );

  const renderTermsModal = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-md">
      <motion.div 
        initial={{ y: "100%", opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="bg-zinc-900 border-0 md:border border-zinc-800 w-full h-full md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-3xl relative shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 z-10 shadow-sm">
            <div><h3 className="text-xl font-black text-white flex items-center gap-2"><FaFileContract className="text-rose-500" /> TERMS & RULES</h3><p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Please read carefully</p></div>
            <button onClick={() => setShowTermsModal(false)} className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all active:scale-95"><FaTimes /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <section><h4 className="text-white font-bold mb-2 text-sm flex items-center gap-2">1. Eligibility & Identity</h4><ul className="list-disc pl-5 space-y-2 text-xs text-zinc-400 leading-relaxed"><li>You must be a currently enrolled student at <strong>De La Salle Araneta University (DLSAU)</strong>.</li><li>You must use your valid institutional email (@dlsau.edu.ph) for verification.</li><li>Impersonation of other students will result in an immediate ban.</li></ul></section>
          <section><h4 className="text-white font-bold mb-2 text-sm flex items-center gap-2">2. Code of Conduct</h4><ul className="list-disc pl-5 space-y-2 text-xs text-zinc-400 leading-relaxed"><li><strong>Respect is Mandatory:</strong> Harassment, hate speech, bullying, or inappropriate language will not be tolerated.</li><li><strong>No Catfishing:</strong> Photos must be of you.</li><li><strong>Consent First:</strong> Do not share personal contact details unless both parties are comfortable.</li></ul></section>
          <section><h4 className="text-white font-bold mb-2 text-sm flex items-center gap-2">3. Privacy & Data</h4><ul className="list-disc pl-5 space-y-2 text-xs text-zinc-400 leading-relaxed"><li>Your profile data is visible <strong>only to users you match with</strong>.</li><li>We do not sell or share your data with third parties.</li></ul></section>
          <section><h4 className="text-white font-bold mb-2 text-sm flex items-center gap-2">4. Safety Disclaimer</h4><div className="text-xs text-zinc-400 leading-relaxed bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30"><p>While we facilitate matches, JPCS is not responsible for offline interactions. Please meet in public spaces (like the University Quadrangle) for your first meetup.</p></div></section>
          <div className="h-20 md:h-0"></div>
        </div>
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm z-10 pb-8 md:pb-4">
            <button onClick={() => { setAgreedToTerms(true); setShowTermsModal(false); }} className={`${PRIMARY_BTN_STYLE} w-full py-4 text-sm font-black shadow-lg shadow-rose-900/20 active:scale-[0.98]`}>I ACCEPT & JOIN</button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <section className="min-h-screen relative overflow-hidden font-sans bg-black selection:bg-rose-500 selection:text-white dark">
      <CircuitCursor />
      <ValentineBackground />
      {/* 5. RENDER THEME TOGGLE */}
      <ThemeToggle /> 
      
      <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-rose-900/20 via-black/0 to-black/0 pointer-events-none z-0" />
      <div className="container mx-auto px-6 pt-32 pb-12 relative z-50 flex flex-col items-center justify-center min-h-[80vh]">
        <AnimatePresence mode="wait">
          <motion.div key={state} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
            {state === 'WELCOME' && renderWelcome()}
            {state === 'LOGIN' && <AuthForm mode="LOGIN" email={email} setEmail={setEmail} password={password} setPassword={setPassword} isLoading={isCheckingAuth} showPassword={showPassword} setShowPassword={setShowPassword} authError={authError} onSubmit={handleLogin} onSwitchMode={() => setState('SIGNUP')} />}
            {state === 'SIGNUP' && <AuthForm mode="SIGNUP" email={email} setEmail={setEmail} password={password} setPassword={setPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} isLoading={isCheckingAuth} showPassword={showPassword} setShowPassword={setShowPassword} authError={authError} onSubmit={handleSignup} onSwitchMode={() => setState('LOGIN')} agreedToTerms={agreedToTerms} setAgreedToTerms={setAgreedToTerms} onShowTerms={() => setShowTermsModal(true)} />}
            
            {state === 'SETUP_PROFILE' && (
                <ProfileForm email={email} formData={formData} setFormData={setFormData} imageFiles={imageFiles} previewUrls={previewUrls} onImageSelect={handleImageSelect} onRemoveImage={removeImage} onSubmit={handleProfileSubmit} onCancel={currentUser?.name ? () => setState('HOME') : undefined} isUploading={isUploading} fileInputRefs={fileInputRefs} />
            )}
            
            {state === 'HOME' && (
                <HomeView currentUser={currentUser} onStartMatching={() => findMatch(currentUser!)} onContinueChat={(mid, uid) => loadExistingMatch(mid, uid)} onEditProfile={() => {
                        setFormData({ 
                            name: currentUser?.name || "", studentId: currentUser?.studentId || "", course: currentUser?.course || "", bio: currentUser?.bio || "", age: currentUser?.age || "", height: currentUser?.height || "", gender: currentUser?.gender || "", preferredGender: currentUser?.preferredGender || "", minAge: currentUser?.minAge || "18", maxAge: currentUser?.maxAge || "25", instagram: currentUser?.instagram || "", facebook: currentUser?.facebook || "", tags: currentUser?.tags || [] 
                        });
                        const currentImgs = currentUser?.imgs || [];
                        setPreviewUrls([...currentImgs, null, null, null].slice(0, 3));
                        setImageFiles([null, null, null]);
                        setState('SETUP_PROFILE');
                    }} onLogout={handleLogout} 
                />
            )}

            {(state === 'SCANNING' || state === 'MATCH_FOUND' || state === 'CONNECTING' || state === 'ITS_A_MATCH') && (
                <MatchingView state={state} match={match} currentUser={currentUser} compatibility={compatibility} hasRerolled={hasRerolled} onReroll={() => findMatch(currentUser!, true, match?.id)} onConnect={handleConnect} />
            )}

            {state === 'CHAT' && <ChatInterface match={match} currentUser={currentUser} messages={messages} quest={quest} newMessage={newMessage} setNewMessage={setNewMessage} onSendMessage={sendMessage} onBack={() => setState('HOME')} messagesEndRef={messagesEndRef} />}
            {state === 'LOADING' && <div className="flex items-center justify-center h-64"><FaSpinner className="text-rose-500 text-4xl animate-spin" /></div>}
          </motion.div>
        </AnimatePresence>
      </div>
      {showTermsModal && renderTermsModal()}
    </section>
  );
}