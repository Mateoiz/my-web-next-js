"use client";

import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/db";
import { useRouter } from "next/navigation";
import { FaSpinner, FaExclamationTriangle, FaSearch } from "react-icons/fa";

const ID_REGEX = /^20\d{2}-\d{2}-\d{6}$/;

function formatIdInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  let f = digits.slice(0, 12);
  if (f.length > 6) f = `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6)}`;
  else if (f.length > 4) f = `${f.slice(0, 4)}-${f.slice(4)}`;
  return f;
}

export default function RecoverPage() {
  const router = useRouter();
  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = idNumber.trim();
    if (!ID_REGEX.test(clean)) {
      setError("Enter a valid ID number in the format 20XX-XX-XXXXXX.");
      return;
    }
    // Basic client-side throttle — real rate limiting should also live in
    // Firestore security rules / a Cloud Function if this gets abused.
    if (attempts >= 5) {
      setError("Too many attempts. Please wait a moment and try again, or ask an organizer for help.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(
        query(collection(db, "cvmas_registrations"), where("idNumber", "==", clean))
      );
      if (snap.empty) {
        setAttempts(a => a + 1);
        setError("No registration found with that ID number. Double-check and try again.");
        return;
      }
      // Only ever returns the single document matching the exact ID the
      // person themselves typed in — never a list, never other students'
      // data. This is the same lookup shape as the checkout page.
      router.push(`/confirm/${snap.docs[0].id}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8f5] dark:bg-black flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#06402B] text-white flex items-center justify-center mx-auto shadow-lg">
            <FaSearch size={20} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">Lost your QR ticket?</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
            Enter the ID number you used to register — we'll pull up your ticket.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 border-t-4 border-t-[#06402B] shadow-sm p-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="idNumber" className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">
              Your ID Number
            </label>
            <input
              id="idNumber"
              type="text"
              inputMode="numeric"
              value={idNumber}
              onChange={e => setIdNumber(formatIdInput(e.target.value))}
              placeholder="20XX-XX-XXXXXX"
              maxLength={14}
              autoFocus
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-base font-mono font-bold tracking-widest text-zinc-900 dark:text-white outline-none focus:border-[#06402B] focus:ring-2 focus:ring-[#06402B]/10 transition-all"
            />
          </div>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-[11px] font-bold text-red-500">
              <FaExclamationTriangle size={9} /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !ID_REGEX.test(idNumber.trim())}
            className="w-full py-3.5 bg-[#06402B] text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            {loading ? <><FaSpinner className="animate-spin" size={14} /> Looking up…</> : "Find My Ticket"}
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-400 font-medium">
          Still can't find it? Ask any CVMAS staff member at the entrance for help.
        </p>
      </div>
    </div>
  );
}