"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase"; 
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaSignInAlt } from "react-icons/fa";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/create"); // Success! Go to dashboard
    } catch (err: any) {
      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4 relative overflow-hidden">
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />

      <div className="z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-2xl p-8">
        
        <div className="text-center mb-8">
          <FaSignInAlt className="mx-auto text-4xl text-green-600 mb-2" />
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Officer Login</h1>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1">Email</label>
            <input 
              type="email" required
              className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border-none focus:ring-2 ring-green-500"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1">Password</label>
            <input 
              type="password" required
              className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border-none focus:ring-2 ring-green-500"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition shadow-lg mt-2"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          Need an account? <Link href="/signup" className="text-green-600 font-bold hover:underline">Register here</Link>
        </div>
      </div>
    </main>
  );
}