"use client";

import { useState, Suspense } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/db"; 
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaUserAlt, FaLock, FaTerminal, FaGoogle } from "react-icons/fa";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // --- 1. Standard Username + Password Login ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();

      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", cleanUsername));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Username not found. Please register first.");
      }

      const userEmail = querySnapshot.docs[0].data().email;
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

  // --- 2. FULLY UNLOCKED GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if they actually finished setting up a username in the Workspace
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().username) {
        // Fully registered! Let them right into the dashboard.
        router.push(redirectTo);
      } else {
        // They used Google but never created a profile
        await auth.signOut();
        setError("No profile found. Please register in the Workspace first.");
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError("Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-zinc-50 dark:bg-zinc-900 p-8 rounded-xl border-2 border-black dark:border-zinc-800 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-none transition-colors duration-300">
      <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-green-600 dark:text-black text-[10px] font-bold uppercase tracking-widest mb-4">
             <FaTerminal /> System Access
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Welcome Back</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
             Enter your credentials or use Google.
          </p>
      </div>

      {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 text-xs font-bold uppercase tracking-wide text-center">
              {error}
          </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
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
        
        <div className="mt-4 pb-4">
          <Link href="/forgot" className="text-xs font-bold text-green-600 hover:text-green-500 hover:underline transition-colors">
            Forgot Password?
          </Link>
        </div>

        <button disabled={loading} type="submit" className="w-full bg-black text-white dark:bg-white dark:text-black font-black uppercase tracking-widest py-4 rounded-lg hover:opacity-80 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none disabled:opacity-50">
          {loading ? "Authenticating..." : "Initiate Session"}
        </button>
      </form>

      {/* --- UNLOCKED GOOGLE LOGIN --- */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">OR</span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800"></div>
      </div>

      <button 
        type="button" 
        onClick={handleGoogleLogin} 
        disabled={loading} 
        className="w-full bg-white dark:bg-zinc-950 text-black dark:text-white border-2 border-zinc-200 dark:border-zinc-800 font-bold py-4 rounded-lg hover:border-black dark:hover:border-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
      >
        <FaGoogle /> Continue with Google
      </button>

      <div className="mt-8 text-center text-xs font-bold text-zinc-500 uppercase tracking-wide">
        Need an account? <Link href="/Workspace" className="text-black dark:text-white hover:underline">Register in Workspace</Link>
      </div>
    </div>
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