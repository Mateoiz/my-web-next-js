"use client";

import { useState, Suspense } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/db"; 
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaUserAlt, FaLock, FaTerminal } from "react-icons/fa";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();

      // 1. Look up the Email associated with this Username in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", cleanUsername));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Username not found. Please register first.");
      }

      // 2. Extract the email from the found user document
      const userEmail = querySnapshot.docs[0].data().email;

      // 3. Log them in using Firebase's actual auth method
      await signInWithEmailAndPassword(auth, userEmail, password);
      
      router.push(redirectTo);

    } catch (err: any) {
      console.error(err);
      setError(err.message === "Username not found. Please register first." 
        ? err.message 
        : "Invalid credentials. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="max-w-md w-full bg-zinc-50 dark:bg-zinc-900 p-8 rounded-xl border-2 border-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-none transition-colors duration-300">
      <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-green-600 dark:text-black text-[10px] font-bold uppercase tracking-widest mb-4">
             <FaTerminal /> System Access
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Welcome Back</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
             Enter your Username and Password.
          </p>
      </div>

      {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 text-xs font-bold uppercase tracking-wide text-center">
              {error}
          </div>
      )}

      <div className="space-y-4">
        {/* CHANGED TO USERNAME INPUT */}
        <div className="relative group">
          <FaUserAlt className="absolute left-4 top-4 text-zinc-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors"/>
          <input 
            type="text" 
            placeholder="Username" 
            required
            className="w-full bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 p-3 pl-10 rounded-lg focus:border-black dark:focus:border-white outline-none font-bold placeholder:font-medium placeholder:text-zinc-400 transition-all"
            value={username} onChange={e => setUsername(e.target.value)}
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
      
      <div className="mt-4">
        <Link href="/forgot" className="text-xs font-bold text-green-600 hover:text-green-500 hover:underline transition-colors">
          Forgot Password?
        </Link>
      </div>

      <button disabled={loading} className="w-full mt-8 bg-black text-white dark:bg-white dark:text-black font-black uppercase tracking-widest py-4 rounded-lg hover:opacity-80 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none disabled:opacity-50">
        {loading ? "Authenticating..." : "Initiate Session"}
      </button>

      <div className="mt-6 text-center text-xs font-bold text-zinc-500 uppercase tracking-wide">
        Need an account? <Link href="/workspace" className="text-black dark:text-white hover:underline">Register in Workspace</Link>
      </div>
    </form>
  );
}

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 text-black dark:text-zinc-100 p-4 font-sans transition-colors duration-300">
      <Suspense fallback={<div className="font-mono text-green-500 animate-pulse">Loading secure gateway...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}