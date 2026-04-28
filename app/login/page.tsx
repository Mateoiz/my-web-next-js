"use client";

import { useState, Suspense, useRef } from "react";
import { signInWithEmailAndPassword, signInWithPopup, EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/db";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUserAlt, FaLock, FaTerminal, FaGoogle, FaEye, FaEyeSlash,
  FaCheckCircle, FaFileContract, FaTimes, FaUserTag, FaEnvelope
} from "react-icons/fa";

// ── Terms Modal ──────────────────────────────────────────────────────────────
function TermsModal({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [checked, setChecked] = useState(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight * 0.8) setHasScrolled(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400 rounded-xl flex items-center justify-center">
              <FaFileContract size={16} />
            </div>
            <div>
              <h3 className="text-zinc-900 dark:text-white font-black text-lg tracking-tight">Terms of Agreement</h3>
              <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Please read carefully before continuing</p>
            </div>
          </div>
          <button onClick={onDecline} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1">
            <FaTimes size={16} />
          </button>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto flex-1 px-6 py-6 text-zinc-500 text-sm leading-relaxed space-y-5"
          style={{ scrollbarWidth: 'thin' }}
        >
          <p className="text-zinc-900 dark:text-zinc-100 font-bold text-base">Welcome to the Academic Lasallian Terminal</p>
          <p>By creating an account and using this platform, you agree to the following terms and conditions.</p>

          {[
            ["1. Eligibility", "This platform is intended for enrolled students only. By registering, you confirm that you are a currently enrolled student and that the information you provide is accurate and truthful."],
            ["2. Account Responsibility", "You are solely responsible for maintaining the confidentiality of your account credentials. You agree not to share your password with anyone. Any activity conducted under your account is your responsibility."],
            ["3. Acceptable Use", "You agree to use this platform only for lawful, educational purposes. You must not attempt unauthorized access, upload malicious content, use the platform to harass or harm others, or circumvent security features."],
            ["4. Data & Privacy", "We collect your Google account information, school email, and username solely to power your dashboard features. Your data is not sold or shared with third parties. We use Firebase to securely store and manage your data."],
            ["5. Content Ownership", "Any notes, schedules, or content you create remain yours. By using this platform, you grant us a limited license to store and display your content for the purpose of providing the service."],
            ["6. Service Availability", "We strive for high availability but do not guarantee uninterrupted access. The platform may undergo maintenance or changes without prior notice."],
            ["7. Modifications to Terms", "We reserve the right to update these terms at any time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms."],
            ["8. Termination", "We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time through dashboard settings."],
            ["9. Limitation of Liability", "This platform is provided as-is for educational convenience. We are not liable for any indirect, incidental, or consequential damages."],
            ["10. Contact", "For any questions regarding these terms, please reach out through the platform's official support channels."],
          ].map(([title, body]) => (
            <div key={title}>
              <p className="text-zinc-800 dark:text-zinc-200 font-bold mb-1">{title}</p>
              <p className="text-zinc-500">{body}</p>
            </div>
          ))}

          {!hasScrolled && (
            <p className="text-center text-zinc-400 text-xs font-mono animate-pulse pt-2">↓ Scroll to read all terms</p>
          )}
        </div>

        <div className="px-6 py-5 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-4">
          <label className={`flex items-start gap-3 cursor-pointer ${!hasScrolled ? 'opacity-40 pointer-events-none' : ''}`}>
            <div
              onClick={() => hasScrolled && setChecked(c => !c)}
              className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-[#06402B] border-[#06402B]' : 'border-zinc-300 dark:border-zinc-600'}`}
            >
              {checked && <FaCheckCircle className="text-white text-xs" />}
            </div>
            <span className="text-zinc-600 dark:text-zinc-400 text-sm leading-snug">
              I have read and agree to the <span className="text-zinc-900 dark:text-white font-bold">Terms of Agreement</span>.
            </span>
          </label>

          <div className="flex gap-3">
            <button onClick={onDecline} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl transition-all">
              Decline
            </button>
            <button
              onClick={onAccept}
              disabled={!checked || !hasScrolled}
              className="flex-1 py-3 bg-[#06402B] hover:bg-[#042d1f] text-white font-bold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Accept & Continue
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Form ────────────────────────────────────────────────────────────────
function AuthForm() {


  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Register state
  const [regStep, setRegStep] = useState<'google' | 'setup'>('google');
  const [authUser, setAuthUser] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [schoolEmailInput, setSchoolEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Shared state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  
  const redirectTo = searchParams.get("redirect") || "/dashboard";
    const [mode, setMode] = useState<'login' | 'register'>(
  searchParams.get('tab') === 'register' ? 'register' : 'login'
);

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError("");
    setRegStep('google');
    setAuthUser(null);
    setTermsAccepted(false);
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", username.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("Username not found.");
      await signInWithEmailAndPassword(auth, snap.docs[0].data().email, password);
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message === "Username not found." ? err.message : "Invalid credentials. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (userDoc.exists() && userDoc.data().username) {
        router.push(redirectTo);
      } else {
        await auth.signOut();
        setError("No profile found. Please register first.");
      }
    } catch {
      setError("Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const handleGoogleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      if (userDoc.exists() && userDoc.data().username) {
        await auth.signOut();
        setError("You already have an account. Please log in instead.");
        setLoading(false);
        return;
      }
      setAuthUser(result.user);
      setSchoolEmailInput(result.user.email || "");
      setShowTerms(true);
      setLoading(false);
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTerms(false);
    setRegStep('setup');
  };

  const handleTermsDecline = async () => {
    setShowTerms(false);
    try { await auth.signOut(); } catch {}
    setAuthUser(null);
  };

  const handleFinalizeSetup = async () => {
    setError("");
    if (!termsAccepted) return setError("You must accept the Terms to continue.");

    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanEmail = schoolEmailInput.trim().toLowerCase();

    if (cleanUsername.length < 3) return setError("Username must be at least 3 characters.");
    if (/[^a-z0-9_]/.test(cleanUsername)) return setError("Only lowercase letters, numbers, and underscores allowed.");
    if (!cleanEmail.includes('@')) return setError("Please enter a valid school email.");
    if (passwordInput.length < 6) return setError("Password must be at least 6 characters.");
    if (passwordInput !== confirmPasswordInput) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), where("username", "==", cleanUsername)));
      if (!snap.empty) { setLoading(false); return setError("Username already taken."); }

      const credential = EmailAuthProvider.credential(authUser.email, passwordInput);
      await linkWithCredential(authUser, credential);

      await setDoc(doc(db, "users", authUser.uid), {
        email: authUser.email,
        schoolEmail: cleanEmail,
        fullName: authUser.displayName || "Student",
        username: cleanUsername,
        role: "student",
        termsAcceptedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Setup failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showTerms && (
          <TermsModal onAccept={handleTermsAccept} onDecline={handleTermsDecline} />
        )}
      </AnimatePresence>

      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-xl overflow-hidden">

          {/* Top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-[#06402B] to-emerald-400" />

          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <FaTerminal size={9} /> Academic Lasallian Terminal
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-1">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-zinc-500 text-sm font-medium">
              {mode === 'login'
                ? 'Sign in to access your dashboard'
                : 'Join the Lasallian Terminal'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="mx-8 mb-6 flex bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-1">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  mode === m
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="px-8 pb-8">

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2"
                >
                  <span className="shrink-0">⚠</span> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">

              {/* ── LOGIN ── */}
              {mode === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="relative group">
                      <FaUserAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#06402B] dark:group-focus-within:text-emerald-400 transition-colors" size={13} />
                      <input
                        type="text"
                        placeholder="Username"
                        required
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors placeholder:font-normal placeholder:text-zinc-400"
                      />
                    </div>

                    <div className="relative group">
                      <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#06402B] dark:group-focus-within:text-emerald-400 transition-colors" size={13} />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-10 pr-12 text-sm font-bold outline-none focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors placeholder:font-normal placeholder:text-zinc-400"
                      />
                      <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                        {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                      </button>
                    </div>

                    <div className="text-right">
                      <Link href="/forgot" className="text-xs font-bold text-[#06402B] dark:text-emerald-400 hover:underline">
                        Forgot Password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#06402B] dark:bg-emerald-600 hover:bg-[#042d1f] dark:hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-md text-sm"
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </button>
                  </form>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">or</span>
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold py-3.5 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-sm"
                  >
                    <FaGoogle /> Continue with Google
                  </button>
                </motion.div>
              )}

              {/* ── REGISTER — Step 1: Google ── */}
              {mode === 'register' && regStep === 'google' && (
                <motion.div
                  key="reg-google"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                    <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">How registration works</p>
                    {[
                      "Sign in with your Google account",
                      "Read and accept the Terms of Agreement",
                      "Set up your username and password",
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-black">{i + 1}</span>
                        </div>
                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{s}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleGoogleRegister}
                    disabled={loading}
                    className="w-full bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-black py-4 rounded-xl hover:border-[#06402B] dark:hover:border-emerald-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-sm"
                  >
                    {loading ? (
                      <span className="w-5 h-5 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
                    ) : (
                      <FaGoogle />
                    )}
                    {loading ? "Verifying..." : "Continue with Google"}
                  </button>

                  <p className="text-center text-[11px] text-zinc-400 font-medium">
                    Already have an account?{" "}
                    <button onClick={() => switchMode('login')} className="text-[#06402B] dark:text-emerald-400 font-bold hover:underline">
                      Sign in
                    </button>
                  </p>
                </motion.div>
              )}

              {/* ── REGISTER — Step 2: Setup ── */}
              {mode === 'register' && regStep === 'setup' && (
                <motion.div
                  key="reg-setup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  {/* Google verified badge */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <FaCheckCircle size={12} className="text-emerald-500 shrink-0" />
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      Google verified — {authUser?.email}
                    </p>
                  </div>

                  {/* Terms accepted badge */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-[#06402B]/5 border border-[#06402B]/20 dark:bg-emerald-500/5 dark:border-emerald-500/20 rounded-xl">
                    <FaFileContract size={12} className="text-[#06402B] dark:text-emerald-400 shrink-0" />
                    <p className="text-xs font-bold text-[#06402B] dark:text-emerald-400">Terms accepted</p>
                    <button onClick={() => setShowTerms(true)} className="ml-auto text-[10px] text-zinc-400 hover:text-zinc-600 underline">
                      Review
                    </button>
                  </div>

                  {/* Username */}
                  <div className="relative group">
                    <FaUserTag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#06402B] dark:group-focus-within:text-emerald-400 transition-colors" size={13} />
                    <input
                      type="text"
                      placeholder="Create @username"
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors placeholder:font-normal placeholder:text-zinc-400"
                    />
                  </div>

                  {/* School email */}
                  <div className="relative group">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#06402B] dark:group-focus-within:text-emerald-400 transition-colors" size={13} />
                    <input
                      type="email"
                      placeholder="School email"
                      value={schoolEmailInput}
                      onChange={e => setSchoolEmailInput(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-sm font-bold outline-none focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors placeholder:font-normal placeholder:text-zinc-400"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative group">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#06402B] dark:group-focus-within:text-emerald-400 transition-colors" size={13} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create password"
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-10 pr-12 text-sm font-bold outline-none focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors placeholder:font-normal placeholder:text-zinc-400"
                    />
                    <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                      {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>

                  {/* Confirm password */}
                  <div className="relative group">
                    <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#06402B] dark:group-focus-within:text-emerald-400 transition-colors" size={13} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPasswordInput}
                      onChange={e => setConfirmPasswordInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleFinalizeSetup()}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-10 pr-12 text-sm font-bold outline-none focus:border-[#06402B] dark:focus:border-emerald-500 transition-colors placeholder:font-normal placeholder:text-zinc-400"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                      {showConfirmPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                    </button>
                  </div>

                  <button
                    onClick={handleFinalizeSetup}
                    disabled={loading}
                    className="w-full bg-[#06402B] dark:bg-emerald-600 hover:bg-[#042d1f] dark:hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 shadow-md text-sm mt-2"
                  >
                    {loading ? "Creating Account..." : "Complete Registration"}
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-zinc-400 font-medium mt-4">
          By using this platform you agree to our{" "}
          <button className="text-[#06402B] dark:text-emerald-400 font-bold hover:underline">
            Terms of Agreement
          </button>
        </p>

      </div>
    </>
  );
}

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#09090b] p-4 font-sans transition-colors duration-300">
      <Suspense fallback={
        <div className="font-mono text-[#06402B] dark:text-emerald-400 animate-pulse text-sm uppercase tracking-widest">
          Loading...
        </div>
      }>
        <AuthForm />
      </Suspense>
    </div>
  );
}