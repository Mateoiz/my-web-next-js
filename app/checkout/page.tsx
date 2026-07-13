"use client";

import { useState, useCallback, useRef } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCheckCircle, FaExclamationTriangle, FaSpinner, FaSignOutAlt,
  FaPaw, FaIdCard, FaClock, FaLock,
} from "react-icons/fa";
import { SEMINAR_OPTIONS } from "@/lib/seminars";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Change this to however many minutes the event requires for full attendance.
// Students who try to check out before this window will be blocked.
const MIN_ATTENDANCE_MINUTES = 60; // 1 hour

// ─────────────────────────────────────────────────────────────────────────────

const ID_REGEX = /^20\d{2}-\d{2}-\d{6}$/;
const ID_MAX = 14;

type CheckoutState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "not_found" }
  | { state: "not_checked_in" }
  | { state: "too_early"; data: any; minutesLeft: number; minutesStayed: number; activeSeminarTitle: string; checkedInAt: any }
  | { state: "already_checked_out"; data: any; latestCheckoutAt: any }
  | { state: "success"; data: any; minutesStayed: number; activeSeminarTitle: string }
  | { state: "error"; message: string };

function formatIdInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  let f = digits.slice(0, 12);
  if (f.length > 6) f = `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6)}`;
  else if (f.length > 4) f = `${f.slice(0, 4)}-${f.slice(4)}`;
  return f;
}

function formatTime(ts: any) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Robustly parse Firestore Timestamp — handles toDate(), _seconds, seconds
const tsToDate = (ts: any): Date => {
  if (!ts) return new Date(0);
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts._seconds !== undefined) return new Date(ts._seconds * 1000);
  if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date(0) : d;
};

// Progress ring for the "too early" state
function TimeRing({ progress, size = 80 }: { progress: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(1, progress));
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e4e4e7" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#06402B" strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

export default function SelfCheckoutPage() {
  const [idNumber, setIdNumber] = useState("");
  const [result, setResult] = useState<CheckoutState>({ state: "idle" });
  const submitLockRef = useRef(false);

  const reset = useCallback(() => {
    setIdNumber("");
    setResult({ state: "idle" });
    submitLockRef.current = false;
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = idNumber.trim();
    if (!ID_REGEX.test(cleanId) || submitLockRef.current) return;

    submitLockRef.current = true;
    setResult({ state: "loading" });

    try {
      const snap = await getDocs(
        query(collection(db, "cvmas_registrations"), where("idNumber", "==", cleanId))
      );

      if (snap.empty) {
        setResult({ state: "not_found" });
        submitLockRef.current = false;
        return;
      }

      const docSnap = snap.docs[0];
      const data = { id: docSnap.id, ...docSnap.data() } as any;
      const attendance = data.seminarAttendance || {};

      // Find the seminar they are CURRENTLY checked into
// Older check-in records never wrote a `status` field at all — they
      // only have checkedInAt/checkedInBy. Treat any record with a
      // checkedInAt but no checkedOutAt as "currently active," regardless
      // of whether `status` says "checked-in" or is missing entirely.
      const activeEntry = Object.entries(attendance).find(
        ([_, v]: any) => v.checkedInAt && !v.checkedOutAt
      );

      if (!activeEntry) {
        // They are not in a seminar right now. Have they checked out of one previously?
        const completedSessions = Object.values(attendance).filter(
          (v: any) => v.checkedInAt && v.checkedOutAt
        );
        if (completedSessions.length > 0) {
          // Find the most recent checkout time
          const latestCheckoutAt = completedSessions
            .map((v: any) => tsToDate(v.checkedOutAt).getTime())
            .sort((a, b) => b - a)[0];
          setResult({ state: "already_checked_out", data, latestCheckoutAt });
        } else {
          setResult({ state: "not_checked_in" });
        }
        submitLockRef.current = false;
        return;
      }

      const [activeSeminarId, activeRecord] = activeEntry as [string, any];
      const activeSeminarTitle = SEMINAR_OPTIONS.find(s => s.id === activeSeminarId)?.title || "Unknown Seminar";

      // Calculate time stayed in CURRENT seminar
      const checkedInDate = tsToDate(activeRecord.checkedInAt);
      const now = new Date();
      const currentSessionMinutes = Math.max(0, Math.floor((now.getTime() - checkedInDate.getTime()) / 60000));

let previousTotalMinutes = 0;
      Object.values(attendance).forEach((v: any) => {
        // Same status-field-agnostic check as above — count any completed
        // session (has both timestamps) regardless of the status string.
        if (v.checkedInAt && v.checkedOutAt) {
          previousTotalMinutes += Math.max(0, Math.floor((tsToDate(v.checkedOutAt).getTime() - tsToDate(v.checkedInAt).getTime()) / 60000));
        }
      });
      const totalMinutesStayed = previousTotalMinutes + currentSessionMinutes;
      const minutesLeft = MIN_ATTENDANCE_MINUTES - totalMinutesStayed;

      if (minutesLeft > 0) {
        setResult({ 
          state: "too_early", 
          data, 
          minutesLeft, 
          minutesStayed: totalMinutesStayed,
          activeSeminarTitle,
          checkedInAt: activeRecord.checkedInAt
        });
        submitLockRef.current = false;
        return;
      }

      // Update the active seminar record specifically
      await updateDoc(doc(db, "cvmas_registrations", data.id), {
        [`seminarAttendance.${activeSeminarId}.checkedOutAt`]: serverTimestamp(),
        [`seminarAttendance.${activeSeminarId}.status`]: "checked-out",
      });

      setResult({ state: "success", data, minutesStayed: totalMinutesStayed, activeSeminarTitle });
    } catch (err) {
      console.error(err);
      setResult({ state: "error", message: "Something went wrong. Check your connection and try again." });
    } finally {
      submitLockRef.current = false;
    }
  }, [idNumber]);

  const showForm = result.state === "idle" || result.state === "loading"
    || result.state === "not_found" || result.state === "error";

  return (
    <div className="min-h-screen bg-[#f5f8f5] font-sans text-zinc-900 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-5">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#06402B] text-white flex items-center justify-center mx-auto shadow-lg">
            <FaSignOutAlt size={22} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900">Heading out?</h1>
          <p className="text-sm text-zinc-500 font-medium leading-relaxed">
            Enter your ID number to check out. You must have attended for at least{" "}
            <strong className="text-zinc-700">{formatDuration(MIN_ATTENDANCE_MINUTES)}</strong> to qualify.
          </p>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-zinc-200 border-t-4 border-t-[#06402B] shadow-sm p-6 space-y-4">
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
                maxLength={ID_MAX}
                autoFocus
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-widest text-zinc-900 outline-none focus:border-[#06402B] focus:ring-2 focus:ring-[#06402B]/10 transition-all placeholder:text-zinc-400"
              />
            </div>

            <AnimatePresence>
              {result.state === "not_found" && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 overflow-hidden"
                >
                  <FaExclamationTriangle size={9} /> No registration found with that ID.
                </motion.p>
              )}
              {result.state === "error" && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 overflow-hidden"
                >
                  <FaExclamationTriangle size={9} /> {result.message}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!ID_REGEX.test(idNumber.trim()) || result.state === "loading"}
              className="w-full py-3.5 bg-[#06402B] text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {result.state === "loading"
                ? <><FaSpinner className="animate-spin" size={14} /> Checking…</>
                : <>Check Out <FaSignOutAlt size={13} /></>
              }
            </button>
          </form>
        )}

        {/* ── TOO EARLY ── the main new state */}
        {result.state === "too_early" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-200 border-t-4 border-t-[#06402B] rounded-3xl p-6 space-y-5"
          >
            {/* Progress ring + time info */}
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <TimeRing
                  progress={result.minutesStayed / MIN_ATTENDANCE_MINUTES}
                  size={80}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-black text-[#06402B]">
                    {Math.round((result.minutesStayed / MIN_ATTENDANCE_MINUTES) * 100)}%
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <FaLock size={10} className="text-[#06402B]" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#06402B]">Not yet eligible</p>
                </div>
                <p className="text-lg font-black text-zinc-900 leading-tight truncate">{result.data.fullName}</p>
                <p className="text-xs text-zinc-500 font-medium mt-0.5 truncate">
                  {result.activeSeminarTitle}
                </p>
              </div>
            </div>

            {/* Time breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-50 rounded-2xl p-3.5 text-center border border-zinc-200">
                <p className="text-xl font-black text-zinc-900">{formatDuration(result.minutesStayed)}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mt-0.5">Time stayed</p>
              </div>
              <div className="bg-[#06402B]/5 rounded-2xl p-3.5 text-center border border-[#06402B]/20">
                <p className="text-xl font-black text-[#06402B]">{formatDuration(result.minutesLeft)}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#06402B]/70 mt-0.5">Still needed</p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 font-medium text-center leading-relaxed">
              You need to stay for at least{" "}
              <strong className="text-zinc-700">{formatDuration(MIN_ATTENDANCE_MINUTES)}</strong> across all sessions.
              Come back to check out in{" "}
              <strong className="text-[#06402B]">{formatDuration(result.minutesLeft)}</strong>.
            </p>

            <button onClick={reset}
              className="w-full py-3 bg-zinc-100 text-zinc-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
            >
              Got it
            </button>
          </motion.div>
        )}

        {/* Not checked in */}
        {result.state === "not_checked_in" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-3xl p-6 space-y-3 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <FaExclamationTriangle size={20} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-700 uppercase tracking-widest">Not checked in yet</p>
              <p className="text-xs font-medium text-amber-600 mt-1 leading-relaxed">
                We don't have an active check-in record for you. Make sure you scan in at a seminar door first!
              </p>
            </div>
            <button onClick={reset}
              className="w-full py-3 bg-white border border-amber-300 text-amber-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-100 transition-all active:scale-95"
            >
              Try a different ID
            </button>
          </motion.div>
        )}

        {/* Already checked out */}
        {result.state === "already_checked_out" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-200 border-t-4 border-t-amber-500 rounded-3xl p-6 space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0">
                <FaClock size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-0.5">No Active Sessions</p>
                <p className="text-lg font-black text-zinc-900 leading-tight truncate">{result.data.fullName}</p>
                <p className="text-[11px] font-mono text-amber-600 mt-0.5">
                  Last checkout at {formatTime(result.latestCheckoutAt)}
                </p>
              </div>
            </div>
            <button onClick={reset}
              className="w-full py-3 bg-zinc-100 text-zinc-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
            >
              Done
            </button>
          </motion.div>
        )}

        {/* Success */}
        {result.state === "success" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-200 border-t-4 border-t-emerald-500 rounded-3xl p-6 space-y-4"
          >
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30"
              >
                <FaCheckCircle size={24} className="text-white" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">✓ Checked out</p>
                <p className="text-xl font-black text-zinc-900 leading-tight truncate">{result.data.fullName}</p>
                <p className="text-xs text-zinc-500 font-bold mt-0.5 truncate">{result.activeSeminarTitle}</p>
              </div>
            </div>

            {/* Attendance summary */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Total attendance</p>
                <p className="text-2xl font-black text-emerald-700">{formatDuration(result.minutesStayed)}</p>
              </div>
              <FaCheckCircle size={28} className="text-emerald-400" />
            </div>

            <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium border-t border-zinc-100 pt-3">
              <FaIdCard size={10} className="shrink-0" /> {result.data.idNumber}
              <span className="text-zinc-300">·</span>
              <FaClock size={10} className="shrink-0" /> Checkout Complete
            </div>

            <p className="text-center text-xs text-zinc-500 font-medium flex items-center justify-center gap-1.5">
              <FaPaw size={10} /> Attendance recorded — safe travels!
            </p>

            <button onClick={reset}
              className="w-full mt-2 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
            >
              Done
            </button>
          </motion.div>
        )}

        {/* Required duration notice at the bottom */}
        <p className="text-center text-[10px] text-zinc-400 font-medium">
          Minimum attendance: {formatDuration(MIN_ATTENDANCE_MINUTES)} · CVMAS Week 2025
        </p>

      </div>
    </div>
  );
}