"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaHeart, FaRegHeart, FaRandom, FaCamera, FaFingerprint, 
  FaCheckCircle, FaSearch, FaArrowRight, FaEdit, FaSpinner, 
  FaEnvelope, FaSignInAlt, FaFileContract, FaTimes, FaLock, 
  FaEye, FaEyeSlash, FaUserPlus, FaMagic, FaTrash, FaRuler, 
  FaBirthdayCake, FaVenusMars, FaInstagram, FaFacebook, FaPaperPlane, FaArrowLeft, FaRobot
} from "react-icons/fa";

// --- FIREBASE IMPORTS ---
import { collection, addDoc, getDocs, query, where, limit, orderBy, onSnapshot, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, getStorage } from "firebase/storage";
import { db } from "@/lib/db"; 

// --- IMPORT COMPONENTS ---
import CircuitCursor from "../components/CircuitCursor";

// --- STYLES ---
const INPUT_FIELD_STYLE = "w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4 text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all text-sm font-bold backdrop-blur-sm";
const LABEL_STYLE = "text-[10px] font-bold text-zinc-500 uppercase mb-2 block tracking-wider";

// --- CONSTANTS ---
const INTEREST_TAGS = ["Gamer", "K-Pop", "Coding", "Foodie", "Sporty", "Art", "Music", "Travel", "Anime", "Gym", "Reading", "Tech", "Movies", "Photography", "Pets"];

const QUESTS = [
  "Take a selfie at the JPCS Booth.",
  "Buy each other a drink at the food stalls.",
  "Win a prize at the dart game together.",
  "Find the hidden mascot and high-five it."
];

// --- TYPES ---
type AppState = 'WELCOME' | 'LOGIN' | 'SIGNUP' | 'SETUP_PROFILE' | 'SCANNING' | 'MATCH_FOUND' | 'CONNECTING' | 'ITS_A_MATCH' | 'CHAT';

interface UserProfile {
  id?: string;
  email: string;
  password?: string;
  name: string;
  studentId: string;
  course: string;
  bio: string;
  age: string;
  height: string;
  gender: string;
  preferredGender: string; // NEW
  instagram?: string;
  facebook?: string;
  tags: string[];
  imgs: string[];
  isBot?: boolean; // To identify fallback matches
}

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

// --- SUB-COMPONENT: VALENTINE BACKGROUND ---
const ValentineBackground = () => {
  const [particles, setParticles] = useState<{
    id: number;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
    type: string;
    color: string;
  }[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 30 + 15,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      type: Math.random() > 0.6 ? 'heart_solid' : Math.random() > 0.3 ? 'heart_outline' : 'sparkle',
      color: Math.random() > 0.5 ? 'text-rose-500' : 'text-pink-400'
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-500/20 dark:bg-rose-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-500/20 dark:bg-pink-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute ${p.color} opacity-60 dark:opacity-40`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: `${p.size}px` }}
          animate={{ y: [0, -150, 0], opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1], rotate: [0, 20, -20, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        >
          {p.type === 'heart_solid' && <FaHeart />}
          {p.type === 'heart_outline' && <FaRegHeart />}
          {p.type === 'sparkle' && <FaMagic />}
        </motion.div>
      ))}
      <div className="absolute inset-0 opacity-5 dark:opacity-10 bg-[url('https://www.transparenttextures.com/patterns/hearts.png')] mix-blend-overlay"></div>
    </div>
  );
};

export default function CupidPage() {
  const [state, setState] = useState<AppState>('WELCOME');
  
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // User Data State
  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    course: "",
    bio: "",
    age: "",
    height: "",
    gender: "",
    preferredGender: "", // NEW
    instagram: "",
    facebook: "",
    tags: [] as string[]
  });
  
  // Image Upload State
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([null, null, null]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Match & Chat State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [match, setMatch] = useState<UserProfile | null>(null);
  const [compatibility, setCompatibility] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasRerolled, setHasRerolled] = useState(false);
  const [quest, setQuest] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- 1. LOGIN ---
  const handleLogin = async () => {
    if (!email || !password) return alert("Please fill in all fields.");
    setIsCheckingAuth(true);
    try {
      const usersRef = collection(db, "cupid_users");
      const q = query(usersRef, where("email", "==", email), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as UserProfile;
        if (userData.password === password) {
            setCurrentUser({ ...userData, id: userDoc.id });
            findMatch({ ...userData, id: userDoc.id }); 
        } else {
            alert("Incorrect Password.");
        }
      } else {
        alert("Account not found. Please Sign Up first.");
      }
    } catch (e) {
      console.error("Auth error:", e);
      alert("System Offline.");
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // --- 2. SIGNUP ---
  const handleSignupCheck = async () => {
    if (!email.endsWith("@dlsau.edu.ph")) return alert("Use a valid @dlsau.edu.ph email.");
    if (password.length < 6) return alert("Password must be at least 6 characters.");
    if (password !== confirmPassword) return alert("Passwords do not match.");
    if (!agreedToTerms) return alert("Agree to Terms to continue.");

    setIsCheckingAuth(true);
    try {
      const usersRef = collection(db, "cupid_users");
      const q = query(usersRef, where("email", "==", email), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        alert("Account exists! Please Login.");
        setState('LOGIN');
      } else {
        setState('SETUP_PROFILE');
      }
    } catch (e) {
      alert("System Error.");
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // --- 3. IMAGE HANDLERS ---
  const handleImageSelect = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newFiles = [...imageFiles];
      newFiles[index] = file;
      setImageFiles(newFiles);
      const newPreviews = [...previewUrls];
      newPreviews[index] = URL.createObjectURL(file);
      setPreviewUrls(newPreviews);
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles];
    newFiles[index] = null;
    setImageFiles(newFiles);
    const newPreviews = [...previewUrls];
    newPreviews[index] = null;
    setPreviewUrls(newPreviews);
  };

  // --- 4. SUBMIT PROFILE ---
  const handleProfileSubmit = async () => {
    if (imageFiles.filter(f => f !== null).length < 1) return alert("Upload at least 1 photo!");
    if (!formData.name || !formData.age || !formData.gender || !formData.preferredGender) return alert("Fill in required fields.");
    if (formData.tags.length < 3) return alert("Select at least 3 tags.");

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      const storage = getStorage();
      for (const file of imageFiles) {
        if (file) {
          const storageRef = ref(storage, `cupid_avatars/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          uploadedUrls.push(url);
        }
      }
      if (uploadedUrls.length === 0) {
        uploadedUrls.push(`https://api.dicebear.com/7.x/notionists/svg?seed=${formData.name}`);
      }

      const newUser: UserProfile = {
        email: email,
        password: password,
        name: formData.name,
        studentId: formData.studentId,
        course: formData.course || "Student",
        bio: formData.bio || "No bio yet.",
        age: formData.age,
        height: formData.height || "N/A",
        gender: formData.gender,
        preferredGender: formData.preferredGender, // SAVING PREFERENCE
        instagram: formData.instagram,
        facebook: formData.facebook,
        tags: formData.tags,
        imgs: uploadedUrls 
      };

      const docRef = await addDoc(collection(db, "cupid_users"), newUser);
      setCurrentUser({ ...newUser, id: docRef.id });
      setIsUploading(false);
      findMatch({ ...newUser, id: docRef.id });
    } catch (e) {
      console.error(e);
      setIsUploading(false);
      alert("Error saving profile.");
    }
  };

  // --- 5. SMART MATCHING & FALLBACK SYSTEM ---
  const findMatch = async (user: UserProfile, reroll = false) => {
    setState('SCANNING');
    
    try {
      const usersRef = collection(db, "cupid_users");
      let potentialMatches: UserProfile[] = [];

      // 1. Try to find matches based on Gender Preference
      let q;
      if (user.preferredGender === "Any") {
         q = query(usersRef); // Get everyone
      } else {
         q = query(usersRef, where("gender", "==", user.preferredGender));
      }

      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        // Filter out self, current match (if rerolling), and ensure ID doesn't match
        if (doc.id !== user.id && (!reroll || (match && doc.id !== match.id))) {
          potentialMatches.push({ ...data, id: doc.id });
        }
      });

      // 2. FALLBACK: Guaranteed Match System
      // If no real users found, generate a "Cupid Bot" match so user is never lonely
      if (potentialMatches.length === 0) {
         console.log("No real matches found. Generating fallback.");
         const fallbackMatch: UserProfile = {
            id: "cupid_bot_" + Math.random(),
            email: "cupid@dlsau.edu.ph",
            name: user.preferredGender === "Male" ? "Liam (System)" : "Sophia (System)",
            studentId: "00-0000-00",
            course: "Cupid Engineering",
            bio: "I'm a system generated match because you were too early! I'm here to test the chat with you.",
            age: "20",
            height: "5'7",
            gender: user.preferredGender === "Any" ? "Female" : user.preferredGender,
            preferredGender: "Any",
            tags: ["Tech", "Coffee", "Music"],
            imgs: [
                user.preferredGender === "Male" 
                ? "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80" 
                : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80"
            ],
            isBot: true
         };
         potentialMatches.push(fallbackMatch);
      }

      // 3. Compatibility Scoring
      potentialMatches.sort((a, b) => {
        const sharedA = a.tags.filter(t => user.tags.includes(t)).length;
        const sharedB = b.tags.filter(t => user.tags.includes(t)).length;
        return sharedB - sharedA; 
      });

      const topMatches = potentialMatches.slice(0, 3);
      const selectedMatch = topMatches[Math.floor(Math.random() * topMatches.length)];
      
      const sharedTagsCount = selectedMatch.tags.filter(t => user.tags.includes(t)).length;
      const score = 60 + (sharedTagsCount * 10) + Math.floor(Math.random() * 15);

      setTimeout(() => {
        setMatch(selectedMatch);
        setCompatibility(Math.min(score, 99));
        setIsRevealed(false);
        setState('MATCH_FOUND');
        if (reroll) setHasRerolled(true);
      }, 3000); 

    } catch (e) {
      console.error("Error matching: ", e);
      alert("System error. Refreshing.");
      window.location.reload();
    }
  };

  // --- 6. FLUID CONNECT & CHAT LOGIC ---
  const handleConnectRequest = async () => {
    if (!currentUser || !match) return;
    
    // 1. Enter "Connecting" State (Waiting for "other person")
    setState('CONNECTING');

    // 2. Simulate network delay / other person accepting
    setTimeout(() => {
        // 3. Show "IT'S A MATCH" Overlay
        setState('ITS_A_MATCH');
        
        setTimeout(() => {
            // 4. Finally enter Chat
            initializeChat();
        }, 2000); // Show "Match" screen for 2 seconds
    }, 2500); // Fake "Waiting" for 2.5 seconds
  };

  const initializeChat = async () => {
    if (!currentUser || !match) return;
    setQuest(QUESTS[Math.floor(Math.random() * QUESTS.length)]);
    setState('CHAT');

    // Create a consistent ID for the match
    const matchId = [currentUser.id, match.id].sort().join("_");
    
    // Create match doc if not exists
    if (!match.isBot) {
        await setDoc(doc(db, "matches", matchId), {
            users: [currentUser.id, match.id],
            lastUpdated: serverTimestamp()
        }, { merge: true });

        // Listen for real messages
        const messagesRef = collection(db, "matches", matchId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage));
            setMessages(msgs);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        });
    } else {
        // Handle Bot Chat initialization locally
        setMessages([{
            id: "intro",
            text: "Hey! I'm your AI match. I might not be real, but our connection feels electric! ⚡",
            senderId: match.id!,
            createdAt: new Date()
        }]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !match) return;

    if (!match.isBot) {
        // Real Chat
        const matchId = [currentUser.id, match.id].sort().join("_");
        const messagesRef = collection(db, "matches", matchId, "messages");
        await addDoc(messagesRef, {
            text: newMessage,
            senderId: currentUser.id,
            createdAt: serverTimestamp()
        });
    } else {
        // Bot Chat Simulation
        const userMsg = { id: Date.now().toString(), text: newMessage, senderId: currentUser.id!, createdAt: new Date() };
        setMessages(prev => [...prev, userMsg]);
        
        // Bot Reply
        setTimeout(() => {
            const botMsg = { id: (Date.now()+1).toString(), text: "That's cool! Since I'm a demo bot, I can't really reply properly, but you look great! 😉", senderId: match.id!, createdAt: new Date() };
            setMessages(prev => [...prev, botMsg]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }, 1500);
    }

    setNewMessage("");
  };

  // --- RENDERERS ---

  const renderLogin = () => (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-md mx-auto w-full relative z-10">
      <div className="bg-zinc-900/80 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl text-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500 text-2xl"><FaSignInAlt /></div>
        <h2 className="text-2xl font-black text-white mb-2">LASALLIAN LOGIN</h2>
        <div className="space-y-4">
          <div className="relative">
             <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
             <input type="email" className={INPUT_FIELD_STYLE + " pl-12"} placeholder="id_number@dlsau.edu.ph" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="relative">
             <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
             <input type={showPassword ? "text" : "password"} className={INPUT_FIELD_STYLE + " pl-12 pr-12"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
             <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-rose-500">{showPassword ? <FaEyeSlash /> : <FaEye />}</button>
          </div>
          <button onClick={handleLogin} disabled={isCheckingAuth} className="w-full py-4 bg-zinc-700 text-white font-black rounded-xl hover:bg-zinc-600 transition-all">{isCheckingAuth ? <FaSpinner className="animate-spin mx-auto"/> : "AUTHENTICATE"}</button>
        </div>
        <button onClick={() => setState('SIGNUP')} className="mt-6 text-xs text-zinc-500 hover:text-rose-500 underline">No account? Create one here.</button>
      </div>
    </motion.div>
  );

  const renderSignup = () => (
     <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-md mx-auto w-full relative z-10">
      <div className="bg-zinc-900/80 border border-zinc-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl text-center">
        <h2 className="text-2xl font-black text-white mb-6">CREATE ACCOUNT</h2>
        <div className="space-y-4">
          <input type="email" className={INPUT_FIELD_STYLE} placeholder="id_number@dlsau.edu.ph" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" className={INPUT_FIELD_STYLE} placeholder="Create Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input type="password" className={INPUT_FIELD_STYLE} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          <div className="flex items-center gap-2 text-xs text-zinc-400 justify-center"><input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="accent-rose-500" /> I agree to <button onClick={() => setShowTermsModal(true)} className="text-rose-500 hover:underline">Terms & Conditions</button></div>
          <button onClick={handleSignupCheck} disabled={isCheckingAuth} className="w-full py-4 bg-zinc-700 text-white font-black rounded-xl hover:bg-zinc-600 transition-all">{isCheckingAuth ? <FaSpinner className="animate-spin mx-auto"/> : "PROCEED"}</button>
        </div>
        <button onClick={() => setState('LOGIN')} className="mt-6 text-xs text-zinc-500 hover:text-rose-500 underline">Login instead.</button>
      </div>
    </motion.div>
  );

  const renderProfileSetup = () => (
    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-4xl mx-auto w-full relative z-10">
      <div className="bg-zinc-900/80 border border-zinc-800 p-8 md:p-10 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-6">
           <h2 className="text-2xl font-black text-white flex items-center gap-3"><FaFingerprint className="text-rose-500" /> BUILD YOUR PROFILE</h2>
           <span className="text-xs font-mono text-zinc-500">{email}</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
           {/* LEFT: PHOTO COLLAGE */}
           <div className="lg:col-span-5 flex flex-col gap-4">
              <label className={LABEL_STYLE + " text-center"}>Upload 3 Photos (Collage)</label>
              <div className="grid grid-cols-2 grid-rows-2 gap-3 h-80 w-full">
                 <div onClick={() => fileInputRefs.current[0]?.click()} className="col-span-2 row-span-2 relative bg-zinc-800/30 border-2 border-dashed border-zinc-700/50 hover:border-rose-500/50 transition-all cursor-pointer overflow-hidden group rounded-2xl">
                    {previewUrls[0] ? (
                        <> <img src={previewUrls[0]!} className="w-full h-full object-cover" alt="Main" /> <button onClick={(e) => { e.stopPropagation(); removeImage(0); }} className="absolute top-3 right-3 bg-black/60 p-2 rounded-full text-white hover:bg-rose-600/80 transition-colors"><FaTrash size={12}/></button> </>
                    ) : ( <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 group-hover:text-rose-400 transition-colors"><FaCamera size={32} /><span className="text-xs font-bold mt-3 tracking-widest">MAIN PHOTO</span></div> )}
                    <input type="file" ref={el => { fileInputRefs.current[0] = el }} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(0, e)} />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-3 h-32">
                 {[1, 2].map((idx) => (
                    <div key={idx} onClick={() => fileInputRefs.current[idx]?.click()} className="relative bg-zinc-800/30 rounded-xl border-2 border-dashed border-zinc-700/50 hover:border-rose-500/50 transition-all cursor-pointer overflow-hidden group">
                       {previewUrls[idx] ? ( <> <img src={previewUrls[idx]!} className="w-full h-full object-cover" alt={`Side ${idx}`} /> <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-rose-600/80 transition-colors"><FaTrash size={10}/></button> </> ) : ( <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 group-hover:text-rose-400 transition-colors"><FaCamera size={16} /></div> )}
                       <input type="file" ref={el => { fileInputRefs.current[idx] = el }} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(idx, e)} />
                    </div>
                 ))}
              </div>
           </div>

           {/* RIGHT: DETAILS FORM */}
           <div className="lg:col-span-7 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={LABEL_STYLE}>Full Name</label><input type="text" className={INPUT_FIELD_STYLE} placeholder="Marcus Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div><label className={LABEL_STYLE}>Student ID</label><input type="text" className={INPUT_FIELD_STYLE} placeholder="XX-XXXX-XX" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} /></div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                 <div><label className={LABEL_STYLE}>Age</label><input type="number" className={INPUT_FIELD_STYLE} placeholder="18" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} /></div>
                 <div><label className={LABEL_STYLE}>Height</label><input type="text" className={INPUT_FIELD_STYLE} placeholder="5'10" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} /></div>
                 <div>
                    <label className={LABEL_STYLE}>Gender</label>
                    <select className={INPUT_FIELD_STYLE + " appearance-none"} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                       <option value="" className="bg-zinc-900">Select</option> <option value="Male" className="bg-zinc-900">Male</option> <option value="Female" className="bg-zinc-900">Female</option> <option value="LGBTQ+" className="bg-zinc-900">LGBTQ+</option>
                    </select>
                 </div>
              </div>

              {/* NEW PREFERENCE SECTION */}
              <div>
                 <label className={LABEL_STYLE + " text-rose-500"}>Looking For (Preference)</label>
                 <select className={INPUT_FIELD_STYLE + " appearance-none border-rose-500/30"} value={formData.preferredGender} onChange={e => setFormData({...formData, preferredGender: e.target.value})}>
                    <option value="" className="bg-zinc-900">Select Preference</option> 
                    <option value="Female" className="bg-zinc-900">Females</option> 
                    <option value="Male" className="bg-zinc-900">Males</option> 
                    <option value="Any" className="bg-zinc-900">Everyone</option>
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div><label className={LABEL_STYLE}>Instagram</label><input type="text" className={INPUT_FIELD_STYLE} placeholder="@username" value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} /></div>
                 <div><label className={LABEL_STYLE}>Facebook</label><input type="text" className={INPUT_FIELD_STYLE} placeholder="Link/Name" value={formData.facebook} onChange={e => setFormData({...formData, facebook: e.target.value})} /></div>
              </div>

              <div><label className={LABEL_STYLE}>Course & Year</label><input type="text" className={INPUT_FIELD_STYLE} placeholder="BSCS - 3rd Year" value={formData.course} onChange={e => setFormData({...formData, course: e.target.value})} /></div>
              
              <div>
                <label className={LABEL_STYLE + " mb-3 block"}>Interests (Select 3-5) <span className="text-rose-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_TAGS.map(tag => {
                    const isSelected = formData.tags.includes(tag);
                    return (<button key={tag} onClick={() => { if (isSelected) { setFormData({...formData, tags: formData.tags.filter(t => t !== tag)}); } else if (formData.tags.length < 5) { setFormData({...formData, tags: [...formData.tags, tag]}); } }} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isSelected ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-600'}`}>{tag}</button>);
                  })}
                </div>
              </div>
           </div>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-800 flex justify-end">
           <button onClick={handleProfileSubmit} disabled={isUploading} className="px-10 py-4 bg-zinc-700 text-white font-black rounded-xl hover:bg-zinc-600 transition-all flex items-center gap-2 disabled:opacity-50">
             {isUploading ? (<> <FaSpinner className="animate-spin" /> UPLOADING... </>) : (<> FINISH SETUP <FaArrowRight /> </>)}
           </button>
        </div>
      </div>
    </motion.div>
  );

  const renderMatchFound = () => {
    if (!match) return null;
    const images = (match.imgs && match.imgs.length > 0) ? match.imgs : ["https://via.placeholder.com/400"];

    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md mx-auto w-full relative z-10">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="absolute top-4 right-4 z-50 bg-green-500 text-black font-black text-xs px-3 py-1 rounded-full shadow-lg">{compatibility}% MATCH</div>
          
          <div className={`relative w-full overflow-hidden group transition-all duration-700 ${!isRevealed ? 'blur-xl' : 'blur-0'}`}>
             <div className="grid grid-cols-2 gap-1 h-[500px] bg-black">
                <div className="col-span-2 row-span-2 relative">
                   <img src={images[0]} alt="Main" className="w-full h-full object-contain" />
                   <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-transparent to-transparent"></div>
                </div>
                {images[1] && ( <div className="absolute bottom-4 right-4 w-28 h-36 border-2 border-zinc-800 rounded-xl overflow-hidden shadow-2xl transform rotate-[-3deg] z-10 bg-black"><img src={images[1]} alt="Sub" className="w-full h-full object-cover" /></div> )}
                {images[2] && ( <div className="absolute bottom-20 right-2 w-20 h-20 border-2 border-zinc-800 rounded-xl overflow-hidden shadow-xl transform rotate-[6deg] z-20 bg-black"><img src={images[2]} alt="Sub" className="w-full h-full object-cover" /></div> )}
             </div>

             {!isRevealed && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-40">
                <button onClick={() => setIsRevealed(true)} className="flex items-center gap-2 px-8 py-4 bg-zinc-800/50 border border-zinc-700/50 rounded-full text-white font-bold hover:bg-zinc-700/50 transition-all backdrop-blur-md shadow-xl"><FaCamera /> REVEAL MATCH</button>
              </div>
            )}
          </div>

          <div className="p-8 relative top-[-20px] bg-zinc-900/90 backdrop-blur-xl rounded-t-3xl border-t border-zinc-800">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-3xl font-black text-white leading-none">{match.name} {match.isBot && <span className="text-xs bg-rose-500 px-2 py-0.5 rounded text-white ml-2 align-middle">BOT</span>}</h2>
                    <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mt-1">{match.course}</p>
                </div>
                <div className="text-right text-xs font-mono text-zinc-400 bg-zinc-800/50 p-2 rounded-lg border border-zinc-700/50">
                    <p>{match.age} yrs • {match.height}</p>
                    <p>{match.gender}</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              {match.tags.map((t, i) => (<span key={i} className={`text-[10px] px-3 py-1 rounded-lg border font-bold ${currentUser?.tags.includes(t) ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'}`}>{t}</span>))}
            </div>
            
            <div className="bg-zinc-800/30 p-4 rounded-2xl mb-8 border border-zinc-700/30 relative">
               <FaCheckCircle className="absolute -top-2 -right-2 text-rose-500 bg-zinc-900 rounded-full" />
               <p className="text-zinc-300 text-sm italic leading-relaxed">"{match.bio}"</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => currentUser && findMatch(currentUser, true)} disabled={hasRerolled} className="py-4 bg-zinc-800 text-zinc-400 font-bold rounded-2xl hover:bg-zinc-700 transition-all disabled:opacity-50 flex justify-center gap-2 border border-zinc-700/50"><FaRandom /> {hasRerolled ? "LOCKED" : "REROLL"}</button>
              {/* CHANGED: This triggers the connection flow instead of going straight to connected */}
              <button onClick={handleConnectRequest} className="py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-500 transition-all flex justify-center gap-2 shadow-lg shadow-rose-500/20"><FaHeart /> CONNECT</button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderConnecting = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-64 relative z-10 text-center">
        <div className="relative w-32 h-32 mb-8">
            <span className="absolute inset-0 border-4 border-rose-500/30 rounded-full animate-ping duration-1000"></span>
            <span className="absolute inset-0 border-4 border-rose-500/50 rounded-full animate-ping delay-500 duration-1000"></span>
            <div className="absolute inset-0 flex items-center justify-center">
                <FaHeart className="text-rose-500 text-5xl animate-pulse" />
            </div>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">WAITING FOR {match?.name.split(" ")[0].toUpperCase()}...</h2>
        <p className="text-zinc-400 text-sm">Asking them to connect with you.</p>
    </motion.div>
  );

  const renderItsAMatch = () => (
    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center h-full relative z-50">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-500 to-pink-600 drop-shadow-[0_0_50px_rgba(225,29,72,0.8)] italic transform -rotate-6">
            IT'S A<br/>MATCH!
        </h1>
        <div className="flex items-center gap-8 mt-12">
            <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                <img src={currentUser?.imgs[0]} className="w-full h-full object-cover" />
            </div>
            <FaHeart className="text-5xl text-white animate-bounce" />
            <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.5)]">
                <img src={match?.imgs[0]} className="w-full h-full object-cover" />
            </div>
        </div>
    </motion.div>
  );

  const renderChat = () => {
    if (!match) return null;
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md mx-auto w-full relative z-10 h-[80vh]">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative h-full flex flex-col backdrop-blur-xl">
          
          {/* CHAT HEADER */}
          <div className="p-4 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900/50">
             <button onClick={() => setState('MATCH_FOUND')} className="text-zinc-400 hover:text-white"><FaArrowLeft /></button>
             <div className="w-10 h-10 rounded-full overflow-hidden border border-rose-500/50">
               <img src={match.imgs[0] || ""} className="w-full h-full object-cover" />
             </div>
             <div>
               <h3 className="text-white font-bold">{match.name} {match.isBot && <FaRobot className="inline ml-1 text-xs text-rose-500"/>}</h3>
               <span className="text-[10px] text-green-500 flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online</span>
             </div>
          </div>

          {/* CHAT BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700">
             {/* QUEST CARD */}
             <div className="bg-gradient-to-r from-rose-500/20 to-purple-500/20 p-4 rounded-2xl border border-rose-500/30 text-center mb-6">
                <p className="text-xs text-rose-400 font-bold uppercase tracking-widest mb-1">ICEBREAKER QUEST</p>
                <p className="text-white font-medium italic">"{quest}"</p>
             </div>

             {/* MATCH SOCIALS IN CHAT */}
             <div className="flex justify-center gap-4 mb-4">
                {match.instagram && <a href={`https://instagram.com/${match.instagram.replace('@','')}`} target="_blank" className="text-xs bg-pink-900/30 text-pink-300 px-3 py-1 rounded-full border border-pink-700/50 hover:bg-pink-900/50"><FaInstagram className="inline mr-1"/> Instagram</a>}
                {match.facebook && <a href={match.facebook} target="_blank" className="text-xs bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full border border-blue-700/50 hover:bg-blue-900/50"><FaFacebook className="inline mr-1"/> Facebook</a>}
             </div>

             {messages.map((msg) => {
               const isMe = msg.senderId === currentUser?.id;
               return (
                 <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${isMe ? 'bg-rose-600 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-300 rounded-tl-none'}`}>
                       {msg.text}
                    </div>
                 </div>
               );
             })}
             <div ref={messagesEndRef} />
          </div>

          {/* CHAT INPUT */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
             <div className="relative">
                <input 
                  type="text" 
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-full py-3 pl-4 pr-12 text-white text-sm focus:border-rose-500 outline-none"
                  placeholder="Say hello..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center text-white hover:bg-rose-500 transition-all">
                   <FaPaperPlane size={12} />
                </button>
             </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderScanning = () => (
    <div className="flex flex-col items-center justify-center h-64 relative z-10">
      <div className="relative w-32 h-32 mb-8">
        <span className="absolute inset-0 border-4 border-rose-500/30 rounded-full animate-ping"></span>
        <span className="absolute inset-0 border-4 border-rose-500 rounded-full animate-spin border-t-transparent"></span>
        <FaSearch className="absolute inset-0 m-auto text-rose-500 text-3xl animate-pulse" />
      </div>
      <h2 className="text-xl font-mono text-rose-400 animate-pulse">SCANNING DATABASE...</h2>
    </div>
  );

  const renderTermsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-lg w-full relative shadow-2xl">
        <button onClick={() => setShowTermsModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-rose-500"><FaTimes /></button>
        <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3"><FaFileContract className="text-rose-500" /> TERMS & CONDITIONS</h3>
        <div className="text-zinc-400 text-sm space-y-4 max-h-[60vh] overflow-y-auto pr-4 mb-8">
          <p>By participating in the JPCS Matchmaking Event ("Cupid Algorithm"), you explicitly agree to the following:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Eligibility:</strong> You must be at least 18 years old and a currently enrolled student at De La Salle Araneta University (DLSAU).</li>
            <li><strong>Privacy:</strong> Your profile data will only be visible to users you are matched with.</li>
            <li><strong>Conduct:</strong> Harassment or inappropriate behavior will result in an immediate ban.</li>
          </ul>
        </div>
        <button onClick={() => { setAgreedToTerms(true); setShowTermsModal(false); }} className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition-all shadow-lg shadow-rose-500/20">I ACCEPT THESE TERMS</button>
      </motion.div>
    </div>
  );

  const renderWelcome = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-2xl mx-auto relative z-10">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rose-500/30 bg-rose-100 dark:bg-rose-500/10 mb-8 backdrop-blur-md">
        <FaHeart className="text-rose-500 animate-bounce" />
        <span className="text-rose-600 dark:text-rose-200 text-xs font-mono tracking-widest uppercase">SAMPISANAN Special Event</span>
      </div>
      <h1 className="text-5xl md:text-8xl font-black text-zinc-900 dark:text-white mb-6 tracking-tighter drop-shadow-xl">
        FIND YOUR <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 drop-shadow-sm">PLAYER 2</span>
      </h1>
      <p className="text-zinc-300 text-lg mb-10 font-medium">Initialize <strong>The Cupid Algorithm</strong>. Experience a data-driven approach to finding your Valentine at DLSAU.</p>
      <div className="flex flex-col md:flex-row gap-4 justify-center">
        <button onClick={() => setState('LOGIN')} className="px-10 py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all active:scale-95 flex items-center gap-2 justify-center">LOG IN <FaSignInAlt /></button>
        <button onClick={() => setState('SIGNUP')} className="px-10 py-4 bg-zinc-800 text-white border border-zinc-700 font-bold rounded-xl hover:bg-zinc-700 transition-all active:scale-95 flex items-center gap-2 justify-center">SIGN UP <FaUserPlus /></button>
      </div>
    </motion.div>
  );

  return (
    <section className="min-h-screen relative overflow-hidden font-sans bg-black selection:bg-rose-500 selection:text-white dark">
      <CircuitCursor />
      <div className="absolute inset-0 z-0"><ValentineBackground /></div>
      <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-rose-900/20 via-black/0 to-black/0 pointer-events-none z-0" />

      <div className="container mx-auto px-6 pt-32 pb-12 relative z-10 flex flex-col items-center justify-center min-h-[80vh]">
        <AnimatePresence mode="wait">
          <motion.div key={state} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="w-full">
            {state === 'WELCOME' && renderWelcome()}
            {state === 'LOGIN' && renderLogin()}
            {state === 'SIGNUP' && renderSignup()}
            {state === 'SETUP_PROFILE' && renderProfileSetup()}
            {state === 'SCANNING' && renderScanning()}
            {state === 'MATCH_FOUND' && renderMatchFound()}
            {state === 'CONNECTING' && renderConnecting()}
            {state === 'ITS_A_MATCH' && renderItsAMatch()}
            {state === 'CHAT' && renderChat()}
          </motion.div>
        </AnimatePresence>
      </div>

      {showTermsModal && renderTermsModal()}
    </section>
  );
}