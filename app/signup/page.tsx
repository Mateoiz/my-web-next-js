"use client";

import { useState, memo } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from "framer-motion";
import { FaUserShield, FaKey, FaEnvelope, FaLock, FaTerminal, FaCheckCircle, FaExclamationCircle, FaArrowLeft } from 'react-icons/fa';

import FloatingCubes from "../components/FloatingCubes";
import CircuitCursor from "../components/CircuitCursor";

const ADMIN_SECRET_KEY = "JPCS_OFFICER_2026"; 

// --- BACKGROUND LAYER ---
const BackgroundLayer = memo(() => (
  <div className="fixed inset-0 z-0 pointer-events-none">
     <div className="absolute inset-0 opacity-40"><FloatingCubes /></div>
     <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
     <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[120px]" />
     <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
  </div>
));
BackgroundLayer.displayName = "BackgroundLayer";

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (secretKey !== ADMIN_SECRET_KEY) {
      setError("Authorization Failed: Invalid Secret Key.");
      setLoading(false);
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center py-12 px-4 relative bg-zinc-950 text-white font-sans selection:bg-green-500/30 overflow-hidden">
      <CircuitCursor />
      <BackgroundLayer />
<Link 
        href="/" 
        className="absolute top-8 left-8 z-50 flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-colors font-mono text-sm uppercase tracking-widest group"
      >
        <FaArrowLeft className="group-hover:-translate-x-1 transition-transform" />
        Return to Terminal
      </Link>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg" // Increased width
      >
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-800 via-emerald-500 to-zinc-800" />

          <div className="text-center mb-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-mono text-emerald-400 uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <FaUserShield className="text-[10px]" /> Clearance Request
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Officer Registration</h1>
            <p className="text-zinc-400 text-base">Create a secure profile to access administrative tools.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-8">
            
            {/* Secret Key */}
            <div className="space-y-3 group">
              <label className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <FaKey /> Authorization Protocol
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Enter Secret Key..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  // LARGER INPUTS
                  className="w-full bg-zinc-950/50 border-2 border-zinc-800 rounded-2xl px-5 py-5 pl-14 text-lg text-emerald-400 outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-zinc-700 font-mono tracking-widest"
                />
                <FaLock className="absolute left-5 top-1/2 -translate-y-1/2 text-xl text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-zinc-700 group-focus-within:border-emerald-500 transition-colors pointer-events-none" />
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-zinc-800 flex-1" />
              <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">User Credentials</span>
              <div className="h-px bg-zinc-800 flex-1" />
            </div>

            {/* Email */}
            <div className="space-y-3 group">
              <label className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <FaEnvelope /> Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="officer@dlsau.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  // LARGER INPUTS
                  className="w-full bg-zinc-950/50 border-2 border-zinc-800 rounded-2xl px-5 py-5 pl-14 text-lg text-zinc-300 outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 transition-all placeholder:text-zinc-700"
                />
                <FaTerminal className="absolute left-5 top-1/2 -translate-y-1/2 text-xl text-zinc-600 group-focus-within:text-green-500 transition-colors" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-3 group">
              <label className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 ml-1">
                <FaLock /> Set Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  // LARGER INPUTS
                  className="w-full bg-zinc-950/50 border-2 border-zinc-800 rounded-2xl px-5 py-5 pl-14 text-lg text-zinc-300 outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/10 transition-all placeholder:text-zinc-700"
                />
                <FaKey className="absolute left-5 top-1/2 -translate-y-1/2 text-xl text-zinc-600 group-focus-within:text-green-500 transition-colors" />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center gap-2 text-red-400 text-sm font-mono bg-red-500/10 p-4 rounded-xl border border-red-500/20"
                >
                  <FaExclamationCircle /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className={`w-full group relative font-bold py-5 rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-3 overflow-hidden text-lg
                ${loading 
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-emerald-500/50"
                }`}
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <span>Create Credentials</span>
                  <FaCheckCircle className="group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>

          </form>

          <div className="mt-10 pt-6 border-t border-zinc-800 text-center">
            <p className="text-sm text-zinc-500 font-mono">
              ALREADY CREDENTIALED?{' '}
              <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-bold hover:underline transition-colors ml-1">
                ACCESS TERMINAL
              </Link>
            </p>
          </div>

        </div>
      </motion.div>
    </section>
  );
}