"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCalendarAlt, FaCalculator, FaLayerGroup,
  FaArrowLeft, FaTasks, FaStickyNote, FaUserCircle, FaGoogle, FaUserTag,
  FaEye, FaEyeSlash, FaLock, FaFileContract, FaTimes, FaCheckCircle
} from "react-icons/fa";

import { signInWithPopup, User, EmailAuthProvider, linkWithCredential, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/db";

import FloatingCubes from "../components/FloatingCubes";
import CircuitCursor from "../components/CircuitCursor";

const ScheduleMaker   = dynamic(() => import('../components/Tools/ScheduleMaker'), { ssr: false });
const GradeCalculator = dynamic(() => import('../components/Tools/WorkspaceCalc'));
const GWACalculator   = dynamic(() => import('../components/Tools/WorkspaceGWACalc'));

// ── Terms Modal ──────────────────────────────────────────────────────────────
function TermsModal({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // Allow accept once user scrolled to ~80% of the terms
    if (el.scrollTop + el.clientHeight >= el.scrollHeight * 0.8) {
      setHasScrolled(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500/10 text-green-400 rounded-xl flex items-center justify-center">
              <FaFileContract size={16} />
            </div>
            <div>
              <h3 className="text-white font-black text-lg tracking-tight">Terms of Agreement</h3>
              <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Please read carefully before continuing</p>
            </div>
          </div>
          <button onClick={onDecline} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1">
            <FaTimes size={18} />
          </button>
        </div>

        {/* Scroll body */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto flex-1 px-6 py-6 text-zinc-400 text-sm leading-relaxed space-y-5 scroll-smooth"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
        >
          <p className="text-zinc-300 font-semibold text-base">Welcome to the Student Workspace Hub</p>
          <p>By creating an account and using this platform, you agree to the following terms and conditions. Please read them thoroughly.</p>

          <div className="space-y-4">
            <Section title="1. Eligibility">
              This platform is intended for enrolled students only. By registering, you confirm that you are a currently enrolled student and that the information you provide is accurate and truthful.
            </Section>

            <Section title="2. Account Responsibility">
              You are solely responsible for maintaining the confidentiality of your account credentials. You agree not to share your password with anyone. Any activity conducted under your account is your responsibility. If you suspect unauthorized access, you must notify us immediately.
            </Section>

            <Section title="3. Acceptable Use">
              You agree to use this platform only for lawful, educational purposes. You must not:
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-500">
                <li>Attempt to gain unauthorized access to any part of the system</li>
                <li>Upload or share malicious content of any kind</li>
                <li>Use the platform to harass, impersonate, or harm others</li>
                <li>Circumvent or interfere with any security features</li>
              </ul>
            </Section>

            <Section title="4. Data & Privacy">
              We collect your Google account information, school email, and username solely to power your dashboard features. Your data is not sold or shared with third parties. We use Firebase to securely store and manage your data. You may request deletion of your account and associated data at any time.
            </Section>

            <Section title="5. Content Ownership">
              Any notes, schedules, or content you create remain yours. By using this platform, you grant us a limited license to store and display your content for the purpose of providing the service.
            </Section>

            <Section title="6. Service Availability">
              We strive for high availability but do not guarantee uninterrupted access. The platform may undergo maintenance, updates, or changes without prior notice. We are not liable for any loss resulting from service interruptions.
            </Section>

            <Section title="7. Modifications to Terms">
              We reserve the right to update these terms at any time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms. We will make reasonable efforts to notify you of significant changes.
            </Section>

            <Section title="8. Termination">
              We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time through the dashboard settings.
            </Section>

            <Section title="9. Limitation of Liability">
              This platform is provided "as is" for educational convenience. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </Section>

            <Section title="10. Contact">
              For any questions regarding these terms, please reach out through the platform's official support channels.
            </Section>
          </div>

          {!hasScrolled && (
            <p className="text-center text-zinc-600 text-xs font-mono animate-pulse pt-2">↓ Scroll to read all terms</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-zinc-800 bg-zinc-900/60 shrink-0 space-y-4">
          <label className={`flex items-start gap-3 cursor-pointer group ${!hasScrolled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div
              onClick={() => hasScrolled && setChecked(c => !c)}
              className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                checked ? 'bg-green-500 border-green-500' : 'border-zinc-600 group-hover:border-zinc-400'
              }`}
            >
              {checked && <FaCheckCircle className="text-white text-xs" />}
            </div>
            <span className="text-zinc-400 text-sm leading-snug">
              I have read and agree to the <span className="text-white font-semibold">Terms of Agreement</span>. I understand that continued use of this platform constitutes acceptance of these terms.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all active:scale-95"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              disabled={!checked || !hasScrolled}
              className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-green-500"
            >
              Accept & Continue
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-zinc-200 font-bold mb-1">{title}</p>
      <p className="text-zinc-500">{children}</p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function WorkspaceHub() {
  const [activeTool, setActiveTool] = useState<'schedule' | 'calc' | null>(null);

  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [usernameInput, setUsernameInput] = useState("");
  const [schoolEmailInput, setSchoolEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [setupError, setSetupError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().username) {
          router.push("/dashboard");
          return;
        }
      }
      setIsCheckingSession(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleRegister = async () => {
    setIsAuthenticating(true);
    setSetupError("");
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().username) {
        await auth.signOut();
        alert("You already have an account! Please log in with your Username and Password.");
        router.push("/login");
      } else {
        setAuthUser(user);
        setSchoolEmailInput(user.email || "");
        // Show terms before proceeding to setup
        setShowTermsModal(true);
        setIsAuthenticating(false);
      }
    } catch (error) {
      console.error(error);
      setIsAuthenticating(false);
    }
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    setNeedsSetup(true);
  };

  const handleTermsDecline = async () => {
    setShowTermsModal(false);
    // Sign the user back out since they declined
    try { await auth.signOut(); } catch {}
    setAuthUser(null);
    setIsAuthenticating(false);
  };

  const handleFinalizeSetup = async () => {
    setSetupError("");

    if (!termsAccepted) {
      return setSetupError("You must accept the Terms of Agreement to continue.");
    }

    const cleanedUsername    = usernameInput.trim().toLowerCase();
    const cleanedSchoolEmail = schoolEmailInput.trim().toLowerCase();

    if (cleanedUsername.length < 3) return setSetupError("Username must be at least 3 characters.");
    if (/[^a-z0-9_]/.test(cleanedUsername)) return setSetupError("Only lowercase letters, numbers, and underscores.");
    if (!cleanedSchoolEmail || !cleanedSchoolEmail.includes('@')) return setSetupError("Please enter a valid school email.");
    if (passwordInput.length < 6) return setSetupError("Password must be at least 6 characters.");
    if (passwordInput !== confirmPasswordInput) return setSetupError("Passwords do not match. Please re-enter.");

    setIsAuthenticating(true);
    try {
      if (!authUser || !authUser.email) throw new Error("Authentication sync lost. Please refresh.");

      const q = query(collection(db, "users"), where("username", "==", cleanedUsername));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setIsAuthenticating(false);
        return setSetupError("Username is already taken. Please choose another.");
      }

      const credential = EmailAuthProvider.credential(authUser.email, passwordInput);
      await linkWithCredential(authUser, credential);

      await setDoc(doc(db, "users", authUser.uid), {
        email: authUser.email,
        schoolEmail: cleanedSchoolEmail,
        fullName: authUser.displayName || "Student",
        username: cleanedUsername,
        role: "student",
        termsAcceptedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      router.push("/dashboard");
    } catch (error: any) {
      console.error(error);
      setSetupError(error.message || "Failed to setup account. Try again.");
      setIsAuthenticating(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
        <span className="w-12 h-12 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin mb-6" />
        <div className="text-zinc-400 font-mono text-sm font-bold tracking-widest uppercase animate-pulse">Checking Session...</div>
      </div>
    );
  }

  return (
    <section className="min-h-screen pt-28 md:pt-32 pb-24 md:pb-32 px-4 md:px-8 relative overflow-hidden bg-zinc-50 dark:bg-black font-sans selection:bg-green-500/30 transition-colors duration-300">

      <div className="hidden md:block"><CircuitCursor /></div>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 opacity-30 sm:opacity-60"><FloatingCubes /></div>
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-green-500/10 rounded-full blur-[100px] md:blur-[150px] pointer-events-none" />
      </div>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <TermsModal onAccept={handleTermsAccept} onDecline={handleTermsDecline} />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto relative z-10">
        <AnimatePresence mode="wait">

          {/* ── Hub ──────────────────────────────────────────────────────── */}
          {!activeTool && (
            <motion.div key="hub" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4 md:space-y-6">

              {/* Register / Setup banner */}
              <div className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl group transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black dark:from-green-950 dark:to-zinc-950 z-0 transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 z-0 mix-blend-overlay" />

                <div className="relative z-10 p-6 md:p-12 border border-zinc-800 dark:border-green-500/30 rounded-[2rem] min-h-[200px] flex items-center">
                  <AnimatePresence mode="wait">

                    {!needsSetup ? (
                      <motion.div
                        key="register-prompt"
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 w-full"
                      >
                        <div className="text-left w-full md:w-auto">
                          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/10 border border-white/20 text-[10px] font-mono font-bold tracking-widest text-zinc-300 uppercase backdrop-blur-md shadow-sm">
                            <FaUserCircle /> Guest Mode
                          </div>
                          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 md:mb-3 tracking-tight">Unlock Your Dashboard</h2>
                          <p className="text-zinc-400 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed">
                            Register an account to access the Task Tracker, Cloud Notes, and sync your schedule across devices. Already have an account?
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
                          <button
                            onClick={handleGoogleRegister}
                            disabled={isAuthenticating}
                            className="w-full sm:w-auto shrink-0 relative px-6 md:px-8 py-4 bg-white text-black font-bold rounded-xl md:rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
                          >
                            {isAuthenticating ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" /> : <FaGoogle />}
                            {isAuthenticating ? "Verifying..." : "Register with Google"}
                          </button>

                          <button
                            onClick={() => router.push('/login')}
                            className="w-full sm:w-auto shrink-0 px-6 md:px-8 py-4 bg-zinc-800 dark:bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white font-bold rounded-xl md:rounded-2xl hover:-translate-y-1 active:scale-95 flex items-center justify-center transition-all"
                          >
                            Log In
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="password-setup"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col md:flex-row items-start justify-between gap-8 w-full"
                      >
                        <div className="text-left w-full md:w-auto mt-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-green-500/20 border border-green-500/50 text-[10px] font-mono font-bold tracking-widest text-green-400 uppercase">
                            <FaUserTag /> Account Setup
                          </div>
                          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 md:mb-3 tracking-tight">Secure Your Profile</h2>
                          <p className="text-zinc-400 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed">
                            Google verified! Set up your username and password below.
                          </p>
                          {/* Terms accepted badge */}
                          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 text-[10px] font-mono font-bold tracking-widest text-green-400 uppercase">
                            <FaCheckCircle size={10} /> Terms Accepted
                          </div>
                        </div>

                        <div className="w-full md:w-auto shrink-0 flex flex-col gap-3">
                          <input
                            type="text"
                            value={usernameInput} onChange={e => setUsernameInput(e.target.value)}
                            placeholder="Create @Username"
                            className="w-full md:w-[320px] px-4 py-3 rounded-xl bg-zinc-900/50 border-2 border-zinc-700 text-white font-bold outline-none focus:border-green-500 transition-colors"
                          />
                          <input
                            type="email"
                            value={schoolEmailInput} onChange={e => setSchoolEmailInput(e.target.value)}
                            placeholder="Enter your school email"
                            className="w-full md:w-[320px] px-4 py-3 rounded-xl bg-zinc-900/50 border-2 border-zinc-700 text-white font-bold outline-none focus:border-green-500 transition-colors"
                          />

                          <div className="relative w-full md:w-[320px]">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
                              placeholder="Create Password"
                              className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border-2 border-zinc-700 text-white font-bold outline-none focus:border-green-500 transition-colors pr-12"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
                              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                            </button>
                          </div>

                          <div className="relative w-full md:w-[320px]">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPasswordInput} onChange={e => setConfirmPasswordInput(e.target.value)}
                              placeholder="Re-enter Password"
                              className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border-2 border-zinc-700 text-white font-bold outline-none focus:border-green-500 transition-colors pr-12"
                              onKeyDown={e => e.key === 'Enter' && handleFinalizeSetup()}
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors">
                              {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                            </button>
                          </div>

                          {setupError && <p className="text-red-400 text-[10px] font-bold px-2 max-w-[320px]">{setupError}</p>}

                          {/* Re-read terms link */}
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-zinc-500 hover:text-zinc-300 text-[11px] font-mono underline underline-offset-2 text-left transition-colors px-1"
                          >
                            <FaFileContract className="inline mr-1" size={10} />
                            Review Terms of Agreement
                          </button>

                          <button
                            onClick={handleFinalizeSetup} disabled={isAuthenticating}
                            className="w-full py-4 bg-green-500 text-white font-bold rounded-xl hover:-translate-y-1 active:scale-95 transition-all mt-2 disabled:opacity-70 disabled:hover:translate-y-0"
                          >
                            {isAuthenticating ? "Saving Profile..." : "Complete Setup"}
                          </button>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>
              </div>

              {/* Tool grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

                <motion.button
                  onClick={() => setActiveTool('schedule')}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="md:col-span-2 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 text-left group overflow-hidden relative shadow-lg hover:shadow-2xl hover:border-green-500/50 transition-all duration-300"
                >
                  <div className="absolute -right-5 -bottom-5 md:-right-10 md:-bottom-10 text-[8rem] md:text-[15rem] text-zinc-100 dark:text-zinc-800/30 group-hover:text-green-500/10 transition-colors z-0 pointer-events-none"><FaCalendarAlt /></div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-inner"><FaCalendarAlt className="text-xl md:text-2xl" /></div>
                    <h3 className="text-2xl md:text-4xl font-black text-zinc-900 dark:text-white mb-2">Schedule Maker</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm md:text-lg max-w-[80%]">Design and export your aesthetic class schedule.</p>
                  </div>
                </motion.button>

                <motion.button
                  onClick={() => setActiveTool('calc')}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 text-left group overflow-hidden relative shadow-lg hover:shadow-2xl hover:border-blue-500/50 transition-all duration-300 flex flex-col justify-between min-h-[200px] md:min-h-[250px]"
                >
                  <div className="relative z-10">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/10 text-blue-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-inner"><FaCalculator className="text-xl md:text-2xl" /></div>
                    <h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white mb-2 leading-tight">Grade<br />Projections</h3>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium text-xs md:text-sm relative z-10">Calculate subject grades and GWA instantly.</p>
                </motion.button>

                <motion.button
                  onClick={() => router.push('/login')}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="md:col-span-2 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 text-left group overflow-hidden relative shadow-lg hover:shadow-2xl hover:border-amber-500/50 transition-all duration-300"
                >
                  <div className="absolute top-6 right-6 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-2">
                    <FaLock /> Requires Login
                  </div>
                  <div className="absolute -right-5 -bottom-5 md:-right-10 md:-bottom-10 text-[8rem] md:text-[15rem] text-zinc-100 dark:text-zinc-800/30 group-hover:text-amber-500/10 transition-colors z-0 pointer-events-none"><FaLayerGroup /></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 mt-6 md:mt-0">
                    <div>
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500/10 text-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-inner"><FaLayerGroup className="text-xl md:text-2xl" /></div>
                      <h3 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white mb-2">Active Recall Reviewer</h3>
                      <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm md:text-base max-w-[85%]">Create flashcard decks, study, and test yourself.</p>
                    </div>
                  </div>
                </motion.button>

                <div className="md:col-span-1 grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-6">
                  <button onClick={() => router.push('/login')} className="w-full flex flex-col bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl p-5 md:p-6 text-left group relative shadow-md hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-300 overflow-hidden active:scale-95">
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl flex items-center justify-center mb-3 md:mb-4"><FaTasks size={16} /></div>
                    <h3 className="text-sm md:text-lg font-bold text-zinc-800 dark:text-zinc-300 mb-1 leading-tight">Task Tracker</h3>
                    <p className="text-zinc-500 dark:text-zinc-500 text-[10px] md:text-xs font-medium mt-auto flex items-center gap-1"><FaLock size={8} /> Dashboard Access</p>
                  </button>

                  <button onClick={() => router.push('/login')} className="w-full flex flex-col bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl md:rounded-3xl p-5 md:p-6 text-left group relative shadow-md hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-300 overflow-hidden active:scale-95">
                    <div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded-xl flex items-center justify-center mb-3 md:mb-4"><FaStickyNote size={16} /></div>
                    <h3 className="text-sm md:text-lg font-bold text-zinc-800 dark:text-zinc-300 mb-1 leading-tight">Cloud Notes</h3>
                    <p className="text-zinc-500 dark:text-zinc-500 text-[10px] md:text-xs font-medium mt-auto flex items-center gap-1"><FaLock size={8} /> Dashboard Access</p>
                  </button>
                </div>

              </div>
            </motion.div>
          )}

          {/* ── Active tool view ──────────────────────────────────────────── */}
          {activeTool && (
            <motion.div key="tool" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }} className="w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8 pb-4 md:pb-6 border-b border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setActiveTool(null)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-full text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                  <FaArrowLeft /> Back to Hub
                </button>
                <div className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-full border border-zinc-200 dark:border-zinc-800 text-[10px] md:text-xs font-mono text-zinc-500 uppercase tracking-widest shadow-inner">
                  Status: Local Mode
                </div>
              </div>

              <div className="min-h-[600px]">
                {activeTool === 'schedule' && <ScheduleMaker />}
                {activeTool === 'calc' && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start w-full">
                    <GradeCalculator />
                    <GWACalculator />
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </section>
  );
}