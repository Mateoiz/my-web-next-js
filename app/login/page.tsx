"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/db"; // Updated import to use centralized db file
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaEnvelope, FaLock, FaTerminal } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Invalid credentials. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-black dark:text-zinc-100 p-4 font-sans transition-colors duration-300">
      
      <form onSubmit={handleLogin} className="max-w-md w-full bg-zinc-50 dark:bg-zinc-900 p-8 rounded-xl border-2 border-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-none">
        
        {/* Header */}
        <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-green-600 dark:text-black text-[10px] font-bold uppercase tracking-widest mb-4">
               <FaTerminal /> System Access
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Welcome Back</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                Enter your credentials to initiate session.
            </p>
        </div>

        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 text-xs font-bold uppercase tracking-wide text-center">
                {error}
            </div>
        )}

        <div className="space-y-4">
          <div className="relative group">
            <FaEnvelope className="absolute left-4 top-4 text-zinc-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors"/>
            <input 
              type="email" 
              placeholder="Email Address" 
              required
              className="w-full bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 p-3 pl-10 rounded-lg focus:border-black dark:focus:border-white outline-none font-bold placeholder:font-medium placeholder:text-zinc-400 transition-all"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="relative group">
            <FaLock className="absolute left-4 top-4 text-zinc-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors"/>
            <input 
              type="password" 
              placeholder="Password" 
              required
              className="w-full bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 p-3 pl-10 rounded-lg focus:border-black dark:focus:border-white outline-none font-bold placeholder:font-medium placeholder:text-zinc-400 transition-all"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full mt-8 bg-black text-white dark:bg-white dark:text-black font-black uppercase tracking-widest py-4 rounded-lg hover:opacity-80 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
        >
          {loading ? "Authenticating..." : "Initiate Session"}
        </button>

        <div className="mt-6 text-center text-xs font-bold text-zinc-500 uppercase tracking-wide">
          Need access? <Link href="/signup" className="text-black dark:text-white hover:underline">Register Here</Link>
        </div>
      </form>
    </div>
  );
}