"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore"; // To save the Role
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState(""); // Optional: To auto-assign Admin role
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Determine Role (Simple Secret Code Logic)
      // If they know the code "JPCS_ADMIN_2026", they become an Admin. 
      // Otherwise, they are a Writer.
      const role = secretCode === "JPCS_ADMIN_2026" ? "admin" : "writer";

      // 3. Save Role to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        role: role, // <--- This is what the dashboard checks
        createdAt: new Date().toISOString(),
      });

      // 4. Update Display Name
      await updateProfile(user, { displayName: name });

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
      <form onSubmit={handleSignup} className="max-w-md w-full bg-zinc-900 p-8 rounded-2xl border border-zinc-800">
        <h1 className="text-3xl font-bold mb-2">Join the Team</h1>
        <p className="text-zinc-500 mb-6">Create an account to start publishing.</p>

        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <div className="space-y-4">
          <div className="relative">
            <FaUser className="absolute left-4 top-4 text-zinc-500"/>
            <input 
              type="text" 
              placeholder="Full Name" 
              required
              className="w-full bg-zinc-950 border border-zinc-800 p-3 pl-10 rounded-xl focus:border-green-500 outline-none"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>

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
          
          <div className="relative">
            <input 
              type="text" 
              placeholder="Admin Code (Optional)" 
              className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl focus:border-green-500 outline-none text-sm"
              value={secretCode} onChange={e => setSecretCode(e.target.value)}
            />
          </div>
        </div>

        <button 
          disabled={loading}
          className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <div className="mt-4 text-center text-sm text-zinc-500">
          Already have an account? <Link href="/login" className="text-green-500 hover:underline">Log In</Link>
        </div>
      </form>
    </div>
  );
}