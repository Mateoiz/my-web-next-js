"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase"; 
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUserPlus, FaShieldAlt } from "react-icons/fa";

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    secretCode: "" // <--- Security measure
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- THE SECRET PASSWORD ---
  // Only people who know this can create an account.
  // Change this to whatever you want!
  const OFFICER_CODE = "JPCS2026"; 

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1. Check the Secret Code
    if (formData.secretCode !== OFFICER_CODE) {
      setError("Invalid Officer Code. You are not authorized to create an account.");
      setLoading(false);
      return;
    }

    try {
      // 2. Create User in Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // 3. Add their display name
      await updateProfile(userCredential.user, {
        displayName: formData.name
      });

      alert("Account created successfully!");
      router.push("/admin/create"); // Send to dashboard
      
    } catch (err: any) {
      console.error(err);
      setError("Error creating account: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px]" />

      <div className="z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-8">
        
        <div className="text-center mb-8">
          <FaUserPlus className="mx-auto text-4xl text-green-600 mb-2" />
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Writer Registration</h1>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1">Full Name</label>
            <input 
              type="text" 
              required
              className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border-none focus:ring-2 ring-green-500"
              placeholder="e.g. Juan Dela Cruz"
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border-none focus:ring-2 ring-green-500"
              placeholder="writer@dlsau.edu.ph"
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1">Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border-none focus:ring-2 ring-green-500"
              placeholder="••••••••"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {/* SECRET CODE INPUT */}
          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-green-600 mb-1">
              <FaShieldAlt /> Writer Secret Code
            </label>
            <input 
              type="password" 
              required
              className="w-full p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 focus:ring-2 ring-green-500"
              placeholder="Ask the Lead Dev for the code"
              onChange={(e) => setFormData({...formData, secretCode: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition shadow-lg mt-4"
          >
            {loading ? "Creating Account..." : "Register Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          Already have an account? <Link href="/login" className="text-green-600 font-bold hover:underline">Log In</Link>
        </div>
      </div>
    </main>
  );
}