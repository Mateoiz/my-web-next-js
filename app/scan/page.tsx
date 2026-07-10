"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  doc, getDoc, updateDoc, serverTimestamp,
  collection, getDocs, DocumentReference,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaQrcode, FaCheckCircle, FaExclamationTriangle,
  FaUser, FaIdCard, FaLayerGroup, FaRedo, FaSpinner,
  FaUpload, FaCamera, FaLock, FaSignInAlt, FaKeyboard,
  FaUndo, FaHistory, FaBolt, FaTrash, FaChevronDown, FaChevronUp, FaTimes,
} from "react-icons/fa";
import { useRouter } from "next/navigation";

import FloatingCubes from "@/app/components/FloatingCubes";
import CircuitCursor from "@/app/components/CircuitCursor";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanResult =
  | { state: "idle" }
  | { state: "scanning" }
  | { state: "loading" }
  | { state: "already_attended"; data: any }
  | { state: "success"; data: any }
  | { state: "not_found" }
  | { state: "error"; message: string };

type ScanMode = "camera" | "upload";

type RecentScan = {
  name: string;
  idNumber?: string;
  status: "checked_in" | "duplicate" | "not_found" | "error";
  time: number;
};

type SessionStats = { scanned: number; checkedIn: number; duplicate: number; error: number };

const EMPTY_STATS: SessionStats = { scanned: 0, checkedIn: 0, duplicate: 0, error: 0 };

// ─── Local Storage Helpers ────────────────────────────────────────────────────

function loadStats(): SessionStats {
  if (typeof window === "undefined") return EMPTY_STATS;
  try {
    const raw = sessionStorage.getItem("cvmas_scan_stats");
    return raw ? { ...EMPTY_STATS, ...JSON.parse(raw) } : EMPTY_STATS;
  } catch { return EMPTY_STATS; }
}

function loadRecent(): RecentScan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem("cvmas_recent_scans");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ─── Reference code resolution ─────────────────────────────────────────────────
// The dashboard shows a short "REF CODE" (e.g. "RB53BQQG") which is a display
// slice of the real Firestore document ID, not a separately stored field. A
// manual getDoc() against that short string will never match. Instead, we
// find any registration whose real doc ID starts with the typed code
// (case-insensitive) — this works for every existing registration with no
// migration needed, since it derives the same way the dashboard displays it.
async function resolveRefCode(code: string): Promise<{ id: string } | null> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return null;

  const snap = await getDocs(collection(db, "cvmas_registrations"));
  const match = snap.docs.find(d => d.id.toUpperCase().startsWith(cleanCode));
  return match ? { id: match.id } : null;
}

// ─── Main Scanner Component ───────────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const autoResumeTimeoutRef = useRef<any>(null);
  const autoResumeIntervalRef = useRef<any>(null);

  const [result, setResult] = useState<ScanResult>({ state: "idle" });
  const [scanMode, setScanMode] = useState<ScanMode>("camera");
  const [scannerReady, setScannerReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [sessionStats, setSessionStats] = useState<SessionStats>(EMPTY_STATS);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [recentOpen, setRecentOpen] = useState(false);
  const [autoContinue, setAutoContinue] = useState(true);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const processingRef = useRef(false);

  useEffect(() => {
    setSessionStats(loadStats());
    setRecentScans(loadRecent());
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setIsCheckingAuth(false);
    });
    return () => unsub();
  }, []);

  // ── Feedback (Audio/Vibration) ─────────────────────────────────────────────

  const playFeedback = useCallback((type: "success" | "duplicate" | "error") => {
    if (soundOn) {
      try {
        if (!audioCtxRef.current) {
          const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        const now = ctx.currentTime;
        const beep = (freq: number, start: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, now + start);
          gain.gain.exponentialRampToValueAtTime(0.2, now + start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + start);
          osc.stop(now + start + dur + 0.02);
        };
        if (type === "success") { beep(880, 0, 0.12); beep(1320, 0.13, 0.14); }
        else if (type === "duplicate") { beep(600, 0, 0.15); beep(600, 0.2, 0.15); }
        else { beep(220, 0, 0.25); }
      } catch {}
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      if (type === "success") navigator.vibrate(60);
      else if (type === "duplicate") navigator.vibrate([50, 80, 50]);
      else navigator.vibrate([120, 60, 120]);
    }
  }, [soundOn]);

  const recordScan = useCallback((entry: Omit<RecentScan, "time">) => {
    setSessionStats(prev => {
      const next: SessionStats = {
        scanned: prev.scanned + 1,
        checkedIn: prev.checkedIn + (entry.status === "checked_in" ? 1 : 0),
        duplicate: prev.duplicate + (entry.status === "duplicate" ? 1 : 0),
        error: prev.error + (entry.status === "not_found" || entry.status === "error" ? 1 : 0),
      };
      try { sessionStorage.setItem("cvmas_scan_stats", JSON.stringify(next)); } catch {}
      return next;
    });
    setRecentScans(prev => {
      const next = [{ ...entry, time: Date.now() }, ...prev].slice(0, 8);
      try { sessionStorage.setItem("cvmas_recent_scans", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const handleResetSession = useCallback(() => {
    if (!window.confirm("Reset session counters and scan log? This won't undo any check-ins already recorded.")) return;
    setSessionStats(EMPTY_STATS);
    setRecentScans([]);
    try {
      sessionStorage.removeItem("cvmas_scan_stats");
      sessionStorage.removeItem("cvmas_recent_scans");
    } catch {}
  }, []);

  // ── Scanner Engine ─────────────────────────────────────────────────────────

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Scanner teardown warning:", err);
      }
      scannerRef.current = null;
    }
    // Hard DOM clear to ensure video element is killed on mobile
    if (containerRef.current) {
      containerRef.current.innerHTML = '<div id="qr-reader"></div>';
    }
  }, []);

  // Shared check-in logic once we have a resolved document reference —
  // used by both the QR path (doc ID known directly) and the manual
  // reference-code path (doc ID resolved via prefix match first).
  const checkInDocRef = useCallback(async (docRef: DocumentReference) => {
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      setResult({ state: "not_found" });
      recordScan({ name: "Unknown reference", status: "not_found" });
      playFeedback("error");
      return;
    }

    const data = { id: snap.id, ...snap.data() } as any;

    if (data.status === "attendee") {
      setResult({ state: "already_attended", data });
      recordScan({ name: data.fullName, idNumber: data.idNumber, status: "duplicate" });
      playFeedback("duplicate");
      return;
    }

    await updateDoc(docRef, {
      status: "attendee",
      checkedInAt: serverTimestamp(),
      checkedInBy: authUser?.uid ?? "unknown",
    });

    setResult({ state: "success", data: { ...data, status: "attendee" } });
    recordScan({ name: data.fullName, idNumber: data.idNumber, status: "checked_in" });
    playFeedback("success");
  }, [authUser, recordScan, playFeedback]);

  const processQR = useCallback(async (rawValue: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    await stopScanner();

    // STRICT OFFLINE CHECK
    if (!navigator.onLine) {
      setResult({ state: "error", message: "You are offline. Reconnect to Wi-Fi/Data to scan." });
      recordScan({ name: "Network Error", status: "error" });
      playFeedback("error");
      processingRef.current = false;
      return;
    }

    if (!rawValue.startsWith("cvmas:")) {
      setResult({ state: "error", message: "Invalid QR code. Not a CVMAS registration." });
      recordScan({ name: "Unrecognized format", status: "error" });
      playFeedback("error");
      processingRef.current = false;
      return;
    }

    const docId = rawValue.replace("cvmas:", "").trim();
    setResult({ state: "loading" });

    try {
      await checkInDocRef(doc(db, "cvmas_registrations", docId));
    } catch (err: any) {
      const message = err?.code === "permission-denied"
        ? "Permission denied. Ensure your account has admin access."
        : "Failed to update database. Check your connection.";
      setResult({ state: "error", message });
      recordScan({ name: "System Error", status: "error" });
      playFeedback("error");
    } finally {
      processingRef.current = false;
    }
  }, [stopScanner, recordScan, playFeedback, checkInDocRef]);

  // Manual reference-code path: resolve the short REF CODE to a real doc ID
  // by prefix match, then run through the same check-in logic as the QR path.
  const processRefCode = useCallback(async (code: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    await stopScanner();

    if (!navigator.onLine) {
      setResult({ state: "error", message: "You are offline. Reconnect to Wi-Fi/Data to scan." });
      recordScan({ name: "Network Error", status: "error" });
      playFeedback("error");
      processingRef.current = false;
      return;
    }

    setResult({ state: "loading" });

    try {
      const resolved = await resolveRefCode(code);
      if (!resolved) {
        setResult({ state: "not_found" });
        recordScan({ name: `Ref code ${code.toUpperCase()}`, status: "not_found" });
        playFeedback("error");
        processingRef.current = false;
        return;
      }
      await checkInDocRef(doc(db, "cvmas_registrations", resolved.id));
    } catch (err: any) {
      const message = err?.code === "permission-denied"
        ? "Permission denied. Ensure your account has admin access."
        : "Failed to update database. Check your connection.";
      setResult({ state: "error", message });
      recordScan({ name: "System Error", status: "error" });
      playFeedback("error");
    } finally {
      processingRef.current = false;
    }
  }, [stopScanner, recordScan, playFeedback, checkInDocRef]);

  const startCameraScanner = useCallback(async () => {
    setResult({ state: "scanning" });
    setUploadPreview(null);
    processingRef.current = false;

    try {
      const { Html5QrcodeScanner } = await import("html5-qrcode");

      if (containerRef.current) {
        containerRef.current.innerHTML = '<div id="qr-reader" style="width: 100%;"></div>';
      }

      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1,
          showTorchButtonIfSupported: true,
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText: string) => processQR(decodedText),
        () => {}
      );

      scannerRef.current = scanner;
      setScannerReady(true);
    } catch (error) {
      console.error("Camera init failed", error);
      setResult({ state: "error", message: "Camera initialization failed. Please allow camera permissions." });
    }
  }, [processQR]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setResult({ state: "error", message: "Please upload a valid image file." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setResult({ state: "error", message: "Image too large. Maximum size is 10MB." });
      return;
    }

    await stopScanner();
    setIsUploading(true);
    setResult({ state: "loading" });

    const previewUrl = URL.createObjectURL(file);
    setUploadPreview(previewUrl);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const qrScanner = new Html5Qrcode("qr-file-reader");

      const decodedText = await qrScanner.scanFile(file, true);
      await qrScanner.clear();
      await processQR(decodedText);
    } catch (err: any) {
      console.error("Image scan error:", err);
      setResult({
        state: "error",
        message: "No readable QR code found in this image. Ensure the image is clear and well-lit.",
      });
      recordScan({ name: "Unreadable image", status: "error" });
      playFeedback("error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [stopScanner, processQR, recordScan, playFeedback]);

  const switchMode = useCallback(async (mode: ScanMode) => {
    await stopScanner();
    setResult({ state: "idle" });
    setUploadPreview(null);
    setScanMode(mode);
    setScannerReady(false);
    processingRef.current = false;
  }, [stopScanner]);

  useEffect(() => {
    if (!authUser || scanMode !== "camera") return;
    startCameraScanner();
    return () => { stopScanner(); };
  }, [authUser, scanMode, startCameraScanner, stopScanner]);

  const handleReset = useCallback(async () => {
    if (autoResumeTimeoutRef.current) clearTimeout(autoResumeTimeoutRef.current);
    if (autoResumeIntervalRef.current) clearInterval(autoResumeIntervalRef.current);
    setAutoCountdown(null);
    await stopScanner();
    setUploadPreview(null);
    setScannerReady(false);
    setResult({ state: "idle" });
    processingRef.current = false;
    if (scanMode === "camera") {
      startCameraScanner();
    }
  }, [stopScanner, scanMode, startCameraScanner]);

  // ── Undo ───────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(async () => {
    if (result.state !== "success") return;
    if (!window.confirm(`Undo check-in for ${result.data.fullName}? They will be marked as 'Pending' again.`)) return;

    setUndoing(true);
    try {
      const docRef = doc(db, "cvmas_registrations", result.data.id);
      await updateDoc(docRef, {
        status: "pre-registered",
        checkedInAt: null,
        checkedInBy: null,
      });
      setSessionStats(prev => {
        const next = { ...prev, checkedIn: Math.max(0, prev.checkedIn - 1) };
        try { sessionStorage.setItem("cvmas_scan_stats", JSON.stringify(next)); } catch {}
        return next;
      });
      // Remove latest success scan from log
      setRecentScans(prev => {
        const next = prev.filter(s => !(s.time === prev[0]?.time && s.status === "checked_in"));
        try { sessionStorage.setItem("cvmas_recent_scans", JSON.stringify(next)); } catch {}
        return next;
      });
      await handleReset();
    } catch (err) {
      console.error(err);
      alert("Failed to undo check-in. Try again.");
    } finally {
      setUndoing(false);
    }
  }, [result, handleReset]);

  // ── Auto-Resume Loop ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!autoContinue || scanMode !== "camera") return;
    if (result.state !== "success" && result.state !== "already_attended") return;

    let remaining = 2;
    setAutoCountdown(remaining);
    autoResumeIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setAutoCountdown(remaining);
      if (remaining <= 0 && autoResumeIntervalRef.current) {
        clearInterval(autoResumeIntervalRef.current);
      }
    }, 1000);
    autoResumeTimeoutRef.current = setTimeout(() => { handleReset(); }, 2200);

    return () => {
      if (autoResumeIntervalRef.current) clearInterval(autoResumeIntervalRef.current);
      if (autoResumeTimeoutRef.current) clearTimeout(autoResumeTimeoutRef.current);
      setAutoCountdown(null);
    };
  }, [result.state, autoContinue, scanMode, handleReset]);

  // ── Manual Input ────────────────────────────────────────────────────────────

  const handleManualSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code || manualSubmitting) return;
    setManualSubmitting(true);
    setManualEntryOpen(false);
    setManualCode("");
    await processRefCode(code);
    setManualSubmitting(false);
  }, [manualCode, manualSubmitting, processRefCode]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center gap-4">
        <FaSpinner className="animate-spin text-[#06402B] dark:text-emerald-400" size={28} />
        <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Verifying access…</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center gap-5 p-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
          <FaLock size={24} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white mb-1">Access Restricted</h2>
          <p className="text-sm text-zinc-500 font-medium">You must be logged in as an admin to use the scanner.</p>
        </div>
        <button
          onClick={() => router.push("/login?redirect=/scan")}
          className="flex items-center gap-2 px-6 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#042d1f] transition-all shadow-md"
        >
          <FaSignInAlt size={12} /> Log In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black relative overflow-hidden font-sans selection:bg-green-500/30 flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[10%] left-[-10%] w-[350px] h-[350px] bg-green-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute inset-0 opacity-20"><FloatingCubes /></div>
      </div>
      <div className="hidden md:block"><CircuitCursor /></div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Header */}
        <div className="pt-24 md:pt-28 px-4 shrink-0">
          <div className="max-w-sm mx-auto relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-[#06402B] text-white">
            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none" />
            <div className="relative px-5 py-5">
              <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-emerald-300 mb-1 text-center">
                CVMAS Week · Terminal
              </p>
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <FaQrcode size={18} /> QR Scanner
                </h1>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-widest truncate max-w-[80px]">
                    {authUser.email?.split("@")[0]}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-2">
                <StatPill label="Scanned" value={sessionStats.scanned} />
                <StatPill label="Checked in" value={sessionStats.checkedIn} accent="emerald" />
                <StatPill label="Dupes" value={sessionStats.duplicate} accent="amber" />
                <button
                  onClick={handleResetSession}
                  title="Reset session counters"
                  className="ml-auto p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white shrink-0"
                >
                  <FaTrash size={11} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center px-4 pt-5 pb-10 max-w-sm mx-auto w-full space-y-4">
          
          {/* Toggles */}
          <div className="w-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <button
              onClick={() => setAutoContinue(v => !v)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border transition-all ${
                autoContinue ? "bg-[#06402B]/10 border-[#06402B]/30 text-[#06402B] dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
              }`}
            >
              <FaBolt size={10} /> Auto-resume {autoContinue ? "on" : "off"}
            </button>
            <button
              onClick={() => setSoundOn(v => !v)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border transition-all ${
                soundOn ? "bg-[#06402B]/10 border-[#06402B]/30 text-[#06402B] dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
              }`}
            >
              🔊 Sound {soundOn ? "on" : "off"}
            </button>
          </div>

          <div className="w-full flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 gap-1">
            <button
              onClick={() => switchMode("camera")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                scanMode === "camera" ? "bg-[#06402B] text-white shadow-md" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <FaCamera size={12} /> Camera
            </button>
            <button
              onClick={() => switchMode("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                scanMode === "upload" ? "bg-[#06402B] text-white shadow-md" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <FaUpload size={12} /> Upload Image
            </button>
          </div>

          {/* Viewport */}
          {scanMode === "camera" && (
            <div className="relative w-full rounded-3xl overflow-hidden border-2 transition-colors duration-500 border-zinc-300 dark:border-zinc-700 bg-black aspect-square flex items-center justify-center">
              
              <div ref={containerRef} className="absolute inset-0 w-full h-full object-cover">
                <div id="qr-reader" />
              </div>

              {/* Viewfinder Overlay */}
              {result.state === "scanning" && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className="w-[60%] h-[60%] relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl" />
                    
                    {/* Animated Scanning Laser */}
                    <motion.div 
                      animate={{ y: ["0%", "300%"] }} 
                      transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatType: "reverse" }}
                      className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] opacity-70"
                    />
                  </div>
                </div>
              )}

              <AnimatePresence>
                {result.state === "scanning" && (
                  <motion.div
                    key="chip-scanning" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full z-20"
                  >
                    Point camera at QR code
                  </motion.div>
                )}
                {result.state === "loading" && (
                  <motion.div
                    key="chip-loading" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 z-20"
                  >
                    <FaSpinner className="animate-spin" size={10} /> Verifying…
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {autoCountdown !== null && (
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleReset}
                    className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black/90 transition-all z-20"
                  >
                    Next in {autoCountdown}s · tap to skip
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}

          {scanMode === "upload" && (
            <div className="w-full space-y-3">
              <div id="qr-file-reader" className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />

              {uploadPreview ? (
                <div className={`w-full rounded-3xl overflow-hidden border-2 transition-colors duration-300 relative ${
                  result.state === "success" ? "border-emerald-500" : result.state === "already_attended" ? "border-amber-500" : result.state === "error" || result.state === "not_found" ? "border-red-500" : "border-zinc-300 dark:border-zinc-700"
                }`}>
                  <img src={uploadPreview} alt="Uploaded QR" className="w-full object-contain max-h-72 bg-black" />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <FaSpinner className="animate-spin text-white" size={28} />
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full py-14 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-[#06402B] dark:hover:border-emerald-500 hover:bg-[#06402B]/5 transition-all active:scale-95 group">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-[#06402B] dark:group-hover:text-emerald-400 transition-colors">
                    <FaUpload size={22} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Tap to upload</p>
                    <p className="text-xs text-zinc-400 mt-1 font-medium">Photo, screenshot, or saved QR</p>
                  </div>
                </button>
              )}

              {uploadPreview && result.state !== "loading" && (
                <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95">
                  <FaUpload size={10} /> Upload Different Image
                </button>
              )}
            </div>
          )}

          {/* Manual Entry Fallback */}
          <div className="w-full">
            {!manualEntryOpen ? (
              <button onClick={() => setManualEntryOpen(true)} className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 flex items-center justify-center gap-2 transition-colors">
                <FaKeyboard size={11} /> Trouble scanning? Enter reference code
              </button>
            ) : (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} onSubmit={handleManualSubmit} className="w-full flex gap-2 overflow-hidden">
                <input
                  autoFocus
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  placeholder="e.g. RB53BQQG"
                  disabled={manualSubmitting}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-bold font-mono tracking-widest text-zinc-900 dark:text-white outline-none focus:border-[#06402B] dark:focus:border-emerald-500 uppercase disabled:opacity-60"
                />
                <button type="submit" disabled={manualSubmitting || !manualCode.trim()} className="px-4 py-2.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#042d1f] dark:hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[52px]">
                  {manualSubmitting ? <FaSpinner className="animate-spin" size={12} /> : "Go"}
                </button>
                <button type="button" onClick={() => { setManualEntryOpen(false); setManualCode(""); }} className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                  <FaTimes size={12} />
                </button>
              </motion.form>
            )}
          </div>

          {/* Idle / Initial State */}
          <AnimatePresence mode="wait">
            {result.state === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full py-3 text-center">
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                  {scanMode === "camera" ? "Ready to scan" : "Upload an image"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Scans Log (Terminal Style) */}
          {recentScans.length > 0 && (
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner mt-4">
              <button
                onClick={() => setRecentOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
              >
                <span className="flex items-center gap-2"><FaHistory size={11} /> System Log ({recentScans.length})</span>
                {recentOpen ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
              </button>
              
              <AnimatePresence>
                {recentOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 space-y-2">
                      {recentScans.map((scan, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {scan.status === "checked_in" ? <FaCheckCircle size={10} className="text-emerald-500 shrink-0" /> :
                             scan.status === "duplicate" ? <FaExclamationTriangle size={10} className="text-amber-500 shrink-0" /> :
                             <FaTimes size={10} className="text-red-500 shrink-0" />}
                            <div className="truncate">
                              <p className="text-xs font-bold text-zinc-200 truncate">{scan.name}</p>
                              {scan.idNumber && <p className="text-[9px] font-mono text-zinc-500 truncate">{scan.idNumber}</p>}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0 ml-3">{timeAgo(scan.time)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Bottom Sheet Results */}
          <AnimatePresence>
            {(result.state === "success" || result.state === "already_attended" || result.state === "not_found" || result.state === "error") && (
              <>
                <motion.div
                  key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={handleReset} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                />
                <motion.div
                  key="sheet" initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", stiffness: 350, damping: 35 }}
                  className="fixed bottom-0 left-0 right-0 z-50 max-w-sm mx-auto"
                >
                  <div className={`rounded-t-[2rem] p-6 space-y-4 border-t-4 shadow-2xl ${
                    result.state === "success" ? "bg-white dark:bg-zinc-900 border-emerald-500" : result.state === "already_attended" ? "bg-white dark:bg-zinc-900 border-amber-500" : "bg-white dark:bg-zinc-900 border-red-500"
                  }`}>
                    <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto -mt-2 mb-2" />

                    {result.state === "success" && (
                      <>
                        <div className="flex items-center gap-4">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }} className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                            <FaCheckCircle size={24} className="text-white" />
                          </motion.div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">✓ Checked In</p>
                            <p className="text-xl font-black text-zinc-900 dark:text-white leading-tight">{result.data.fullName}</p>
                          </div>
                        </div>
                        <StudentDetail data={result.data} />
                        <div className="flex gap-2 pt-1">
                          <ResetButton onReset={handleReset} label="Scan Next" />
                          <button onClick={handleUndo} disabled={undoing} title="Undo this check-in" className="px-4 py-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 disabled:opacity-50 shrink-0">
                            {undoing ? <FaSpinner className="animate-spin" size={11} /> : <FaUndo size={11} />}
                          </button>
                        </div>
                        {autoCountdown !== null && (
                          <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 2.2, ease: "linear" }} className="h-full bg-emerald-500 rounded-full" />
                          </div>
                        )}
                      </>
                    )}

                    {result.state === "already_attended" && (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0">
                            <FaExclamationTriangle size={22} className="text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">⚠ Already Checked In</p>
                            <p className="text-xl font-black text-zinc-900 dark:text-white leading-tight">{result.data.fullName}</p>
                            {result.data.checkedInAt && (
                              <p className="text-[11px] font-mono text-amber-500 mt-0.5">
                                at {new Date(result.data.checkedInAt?.toDate?.() ?? result.data.checkedInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            )}
                          </div>
                        </div>
                        <StudentDetail data={result.data} />
                        <ResetButton onReset={handleReset} label="Scan Next" />
                        {autoCountdown !== null && (
                          <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 2.2, ease: "linear" }} className="h-full bg-amber-500 rounded-full" />
                          </div>
                        )}
                      </>
                    )}

                    {result.state === "not_found" && <ErrorPanel title="Not found" message="This code doesn't match any CVMAS registration." onReset={handleReset} scanMode={scanMode} />}
                    {result.state === "error" && <ErrorPanel title="Error" message={(result as any).message} onReset={handleReset} scanMode={scanMode} />}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: number; accent?: "emerald" | "amber" }) {
  const color = accent === "emerald" ? "text-emerald-300" : accent === "amber" ? "text-amber-300" : "text-white";
  return (
    <div className="flex items-baseline gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10">
      <span className={`text-sm font-black ${color}`}>{value}</span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">{label}</span>
    </div>
  );
}

function StudentDetail({ data }: { data: any }) {
  return (
    <div className="space-y-1.5 text-sm border-t border-zinc-200/50 dark:border-zinc-700/50 pt-3">
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
        <FaIdCard size={10} className="shrink-0" />
        <span className="font-mono text-xs">{data.idNumber}</span>
        <span className="text-zinc-400">·</span>
        <span className="text-xs font-bold">{data.program} {data.yearLevel}</span>
      </div>
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
        <FaLayerGroup size={10} className="shrink-0" />
        <span className="text-xs font-bold">{data.block}</span>
        <span className="text-zinc-400">·</span>
        <span className="text-xs capitalize font-medium">{data.studentType}</span>
      </div>
      {data.professors?.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Incentive professors</p>
          {data.professors.map((p: any, i: number) => (
            <p key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium truncate">
              {p.professor} — {p.subject}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ResetButton({ onReset, label = "Scan Next" }: { onReset: () => void; label?: string }) {
  return (
    <button
      onClick={onReset}
      className="flex-1 py-3.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#0a5a38] dark:hover:bg-emerald-500 transition-all active:scale-95 shadow-md"
    >
      <FaRedo size={11} /> {label}
    </button>
  );
}

function ErrorPanel({ title, message, onReset, scanMode }: { title: string; message: string; onReset: () => void; scanMode: ScanMode; }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="w-full bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-3xl p-5 space-y-3 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
        <FaExclamationTriangle size={20} className="text-red-500" />
      </div>
      <div>
        <p className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-widest">{title}</p>
        <p className="text-xs font-medium text-red-600 dark:text-red-300 mt-1 leading-relaxed">{message}</p>
      </div>
      <button onClick={onReset} className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
        <FaRedo size={11} /> {scanMode === "upload" ? "Try Another Image" : "Try Again"}
      </button>
    </motion.div>
  );
}