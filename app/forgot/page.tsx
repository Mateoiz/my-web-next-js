"use client";

import { useState } from "react";
import Link from "next/link";
import { sendForgotPasswordEmail } from "@/lib/db"; 
import { FaArrowLeft, FaEnvelope, FaLock } from "react-icons/fa";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    
    const res = await sendForgotPasswordEmail(email);
    
    if (res.success) {
      setStatus("success");
      setMessage(res.message);
    } else {
      setStatus("error");
      setMessage(res.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-6">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl">
        {/* Link back to your main login page */}
        <Link href="/login" className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white flex items-center gap-2 mb-6 text-sm transition-colors">
          <FaArrowLeft /> Back to Login
        </Link>

        <div className="mb-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-4">
                <FaLock />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Reset Password</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">Enter your email address and we'll send you a link to get back into your account.</p>
        </div>

        {status === "success" ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl text-center">
            <p className="font-bold text-green-700 dark:text-green-400">{message}</p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-2">Check your spam folder if you don't see it within a few minutes.</p>
            <Link href="/login" className="mt-4 inline-block text-sm font-bold underline hover:no-underline">Return to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">Email Address</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-3 text-zinc-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-zinc-900 dark:text-white"
                  placeholder="writer@jpcs.edu.ph"
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800">{message}</p>
            )}

            <button 
              type="submit" 
              disabled={status === "loading"}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-green-500/20"
            >
              {status === "loading" ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}