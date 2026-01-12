"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaEnvelope, FaLock } from "react-icons/fa";

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
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
      <form onSubmit={handleLogin} className="max-w-md w-full bg-zinc-900 p-8 rounded-2xl border border-zinc-800">
        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
        <p className="text-zinc-500 mb-6">Enter your credentials to access the terminal.</p>

        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <div className="space-y-4">
          <div className="relative">
            <FaEnvelope className="absolute left-4 top-4 text-zinc-500"/>
            <input 
              type="email" 
              placeholder="Email Address" 
              required
              className="w-full bg-zinc-950 border border-zinc-800 p-3 pl-10 rounded-xl focus:border-green-500 outline-none"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <FaLock className="absolute left-4 top-4 text-zinc-500"/>
            <input 
              type="password" 
              placeholder="Password" 
              required
              className="w-full bg-zinc-950 border border-zinc-800 p-3 pl-10 rounded-xl focus:border-green-500 outline-none"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all"
        >
          {loading ? "Accessing..." : "Initiate Session"}
        </button>

        <div className="mt-4 text-center text-sm text-zinc-500">
          Need access? <Link href="/signup" className="text-green-500 hover:underline">Register</Link>
        </div>
      </form>
    </div>
  );
}