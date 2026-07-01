"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaQrcode, FaCheckCircle, FaExclamationTriangle,
  FaUser, FaIdCard, FaLayerGroup, FaRedo, FaSpinner,
  FaUpload, FaCamera, FaLock, FaSignInAlt, FaKeyboard,
  FaUndo, FaHistory, FaBolt, FaTrash, FaChevronDown, FaChevronUp,
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

// ─── Small storage helpers (sessionStorage only — resets when the shift ends) ─

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

// ─── Main scanner component ───────────────────────────────────────────────────

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

  // ── QoL state ──────────────────────────────────────────────────────────────
  const [sessionStats, setSessionStats] = useState<SessionStats>(EMPTY_STATS);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [recentOpen, setRecentOpen] = useState(false);
  const [autoContinue, setAutoContinue] = useState(true);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [undoing, setUndoing] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const processingRef = useRef(false);
  const lastCheckedInRef = useRef<{ id: string; name: string } | null>(null);

  // Hydrate session stats/log once mounted on the client
  useEffect(() => {
    setSessionStats(loadStats());
    setRecentScans(loadRecent());
  }, []);

  // ── Auth check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setIsCheckingAuth(false);
    });
    return () => unsub();
  }, []);

  // ── Feedback: tone + vibration so staff can check-in without staring at the screen ─

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

  // ── Scanner helpers ────────────────────────────────────────────────────────

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  }, []);

  const processQR = useCallback(async (rawValue: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    await stopScanner();

    if (!rawValue.startsWith("cvmas:")) {
      setResult({ state: "error", message: "Invalid QR code. Not a CVMAS registration." });
      recordScan({ name: "Unrecognized code", status: "error" });
      playFeedback("error");
      processingRef.current = false;
      return;
    }

    const docId = rawValue.replace("cvmas:", "").trim();
    setResult({ state: "loading" });

    try {
      const docRef = doc(db, "cvmas_registrations", docId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        setResult({ state: "not_found" });
        recordScan({ name: "Unknown QR", status: "not_found" });
        playFeedback("error");
        processingRef.current = false;
        return;
      }

      const data = { id: snap.id, ...snap.data() } as any;

      if (data.status === "attendee") {
        setResult({ state: "already_attended", data });
        recordScan({ name: data.fullName, idNumber: data.idNumber, status: "duplicate" });
        playFeedback("duplicate");
        processingRef.current = false;
        return;
      }

      // ← This requires admin — check first to give clear feedback

      await updateDoc(docRef, {
        status: "attendee",
        checkedInAt: serverTimestamp(),
        checkedInBy: authUser?.uid ?? "unknown",
      });

      lastCheckedInRef.current = { id: data.id, name: data.fullName };
      setResult({ state: "success", data: { ...data, status: "attendee" } });
      recordScan({ name: data.fullName, idNumber: data.idNumber, status: "checked_in" });
      playFeedback("success");
    } catch (err: any) {
      const message = err?.code === "permission-denied"
        ? "Permission denied. Make sure your account has admin privileges."
        : "Failed to update registration. Check your connection.";
      setResult({ state: "error", message });
      recordScan({ name: "Scan failed", status: "error" });
      playFeedback("error");
    } finally {
      processingRef.current = false;
    }
  }, [stopScanner, authUser, recordScan, playFeedback]);

  // ── Camera scanner ─────────────────────────────────────────────────────────

  const startCameraScanner = useCallback(async () => {
    setResult({ state: "scanning" });
    setUploadPreview(null);
    processingRef.current = false;

    const { Html5QrcodeScanner } = await import("html5-qrcode");

    if (containerRef.current) {
      containerRef.current.innerHTML = '<div id="qr-reader"></div>';
    }

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
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
  }, [processQR]);

  // ── Image upload scanner ───────────────────────────────────────────────────

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
        message: "No valid QR code found in this image. Try a clearer photo with better lighting.",
      });
      recordScan({ name: "Unreadable image", status: "error" });
      playFeedback("error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [stopScanner, processQR, recordScan, playFeedback]);

  // ── Mode switch ────────────────────────────────────────────────────────────

  const switchMode = useCallback(async (mode: ScanMode) => {
    await stopScanner();
    setResult({ state: "idle" });
    setUploadPreview(null);
    setScanMode(mode);
    setScannerReady(false);
    processingRef.current = false;
  }, [stopScanner]);

  // ── Auto-start camera on mount / mode switch ───────────────────────────────

  useEffect(() => {
    if (!authUser || scanMode !== "camera") return;
    startCameraScanner();
    return () => { stopScanner(); };
  }, [authUser, scanMode]);

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

  // ── Undo last check-in (misscan safety net) ────────────────────────────────

  const handleUndo = useCallback(async () => {
    if (result.state !== "success") return;
    if (!window.confirm(`Undo check-in for ${result.data.fullName}? They'll be marked as not yet attended.`)) return;

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
      setRecentScans(prev => {
        const next = prev.filter(s => !(s.time === prev[0]?.time));
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

  // ── Auto-resume scanning after a successful / duplicate result ─────────────

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.state, autoContinue, scanMode]);

  // ── Manual code entry fallback ──────────────────────────────────────────────

  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setManualEntryOpen(false);
    setManualCode("");
    processQR(code.startsWith("cvmas:") ? code : `cvmas:${code}`);
  }, [manualCode, processQR]);

  // ── Auth loading ───────────────────────────────────────────────────────────

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center gap-4">
        <FaSpinner className="animate-spin text-[#06402B] dark:text-emerald-400" size={28} />
        <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Verifying access…</p>
      </div>
    );
  }

  // ── Not logged in ──────────────────────────────────────────────────────────

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

  // ── Main UI ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black relative overflow-hidden font-sans selection:bg-green-500/30 flex flex-col">

      {/* Ambient background layer — matches the rest of the site, kept subtle behind the camera view */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[10%] left-[-10%] w-[350px] h-[350px] bg-green-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute inset-0 opacity-20">
          <FloatingCubes />
        </div>
      </div>

      <div className="hidden md:block">
        <CircuitCursor />
      </div>

      <div className="relative z-10 flex flex-col flex-1">

        {/* Navbar clearance + header card */}
        <div className="pt-24 md:pt-28 px-4 shrink-0">
          <div className="max-w-sm mx-auto relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-[#06402B] text-white">
            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none" />
            <div className="relative px-5 py-5">
              <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-emerald-300 mb-1 text-center">
                CVMAS Week · Staff
              </p>
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <FaQrcode size={18} /> QR Scanner
                </h1>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-widest">
                    {authUser.email?.split("@")[0]}
                  </span>
                </div>
              </div>

              {/* Live session tally */}
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

          {/* QoL toggles: auto-continue + sound */}
          <div className="w-full flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <button
              onClick={() => setAutoContinue(v => !v)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border transition-all ${
                autoContinue
                  ? "bg-[#06402B]/10 border-[#06402B]/30 text-[#06402B] dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
              }`}
            >
              <FaBolt size={10} /> Auto-resume {autoContinue ? "on" : "off"}
            </button>
            <button
              onClick={() => setSoundOn(v => !v)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border transition-all ${
                soundOn
                  ? "bg-[#06402B]/10 border-[#06402B]/30 text-[#06402B] dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
              }`}
            >
              🔊 Sound {soundOn ? "on" : "off"}
            </button>
          </div>

          {/* Mode toggle */}
          <div className="w-full flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 gap-1">
            <button
              onClick={() => switchMode("camera")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                scanMode === "camera"
                  ? "bg-[#06402B] text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <FaCamera size={12} /> Camera
            </button>
            <button
              onClick={() => switchMode("upload")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                scanMode === "upload"
                  ? "bg-[#06402B] text-white shadow-md"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <FaUpload size={12} /> Upload Image
            </button>
          </div>

          {/* Camera viewport */}
          {scanMode === "camera" && (
            <div
              className={`w-full rounded-3xl overflow-hidden border-2 transition-colors duration-300 relative ${
                result.state === "success"
                  ? "border-emerald-500"
                  : result.state === "already_attended"
                  ? "border-amber-500"
                  : result.state === "not_found" || result.state === "error"
                  ? "border-red-500"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <div ref={containerRef} className="w-full bg-black" style={{ minHeight: 280 }}>
                <div id="qr-reader" />
              </div>

              {/* Auto-resume countdown chip */}
              {autoCountdown !== null && (
                <button
                  onClick={handleReset}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black/90 transition-all"
                >
                  Next scan in {autoCountdown}s · tap to skip
                </button>
              )}
            </div>
          )}

          {/* Upload area */}
          {scanMode === "upload" && (
            <div className="w-full space-y-3">
              <div id="qr-file-reader" className="hidden" />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />

              {uploadPreview ? (
                <div className={`w-full rounded-3xl overflow-hidden border-2 transition-colors duration-300 relative ${
                  result.state === "success"
                    ? "border-emerald-500"
                    : result.state === "already_attended"
                    ? "border-amber-500"
                    : result.state === "error" || result.state === "not_found"
                    ? "border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}>
                  <img
                    src={uploadPreview}
                    alt="Uploaded QR"
                    className="w-full object-contain max-h-72 bg-black"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <FaSpinner className="animate-spin text-white" size={28} />
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-14 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-[#06402B] dark:hover:border-emerald-500 hover:bg-[#06402B]/5 transition-all active:scale-95 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-[#06402B] dark:group-hover:text-emerald-400 transition-colors">
                    <FaUpload size={22} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                      Tap to upload
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 font-medium">
                      Photo, screenshot, or saved QR image
                    </p>
                  </div>
                </button>
              )}

              {uploadPreview && result.state !== "loading" && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
                >
                  <FaUpload size={10} /> Upload Different Image
                </button>
              )}
            </div>
          )}

          {/* Manual code entry fallback — for damaged or unreadable QR codes */}
          <div className="w-full">
            {!manualEntryOpen ? (
              <button
                onClick={() => setManualEntryOpen(true)}
                className="w-full py-2.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 flex items-center justify-center gap-2 transition-colors"
              >
                <FaKeyboard size={11} /> Trouble scanning? Enter reference code
              </button>
            ) : (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                onSubmit={handleManualSubmit}
                className="w-full flex gap-2 overflow-hidden"
              >
                <input
                  autoFocus
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  placeholder="Reference code or scanned ID"
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#06402B] dark:focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest"
                >
                  Go
                </button>
                <button
                  type="button"
                  onClick={() => { setManualEntryOpen(false); setManualCode(""); }}
                  className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl text-xs font-black uppercase tracking-widest"
                >
                  ×
                </button>
              </motion.form>
            )}
          </div>

          {/* Result panel */}
          <AnimatePresence mode="wait">
            {result.state === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full py-3 text-center">
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                  {scanMode === "camera" ? "Initializing camera…" : "Upload a QR code image to scan"}
                </p>
              </motion.div>
            )}

            {result.state === "scanning" && (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full py-3 text-center">
                <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                  Point camera at QR code
                </p>
              </motion.div>
            )}

            {result.state === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full py-5 text-center flex flex-col items-center gap-3">
                <FaSpinner className="animate-spin text-[#06402B] dark:text-emerald-400" size={24} />
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Verifying…</p>
              </motion.div>
            )}

            {result.state === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 rounded-3xl p-5 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                    <FaCheckCircle size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">✓ Checked in!</p>
                    <p className="text-lg font-black text-zinc-900 dark:text-white leading-tight">{result.data.fullName}</p>
                  </div>
                </div>
                <StudentDetail data={result.data} />
                <div className="flex gap-2">
                  <ResetButton onReset={handleReset} label={scanMode === "upload" ? "Scan Another" : "Scan Next"} />
                  <button
                    onClick={handleUndo}
                    disabled={undoing}
                    title="Wrong person? Undo this check-in"
                    className="px-4 py-3.5 bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {undoing ? <FaSpinner className="animate-spin" size={11} /> : <FaUndo size={11} />}
                  </button>
                </div>
              </motion.div>
            )}

            {result.state === "already_attended" && (
              <motion.div
                key="already"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-3xl p-5 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                    <FaExclamationTriangle size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">⚠ Already checked in</p>
                    <p className="text-lg font-black text-zinc-900 dark:text-white leading-tight">{result.data.fullName}</p>
                  </div>
                </div>
                {result.data.checkedInAt && (
                  <p className="text-xs font-mono text-amber-600 dark:text-amber-400 px-1">
                    Checked in at: {new Date(result.data.checkedInAt?.toDate?.() ?? result.data.checkedInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                <StudentDetail data={result.data} />
                <ResetButton onReset={handleReset} label={scanMode === "upload" ? "Scan Another" : "Scan Next"} />
              </motion.div>
            )}

            {result.state === "not_found" && (
              <ErrorPanel
                title="Not found"
                message="This QR code doesn't match any CVMAS registration."
                onReset={handleReset}
                scanMode={scanMode}
              />
            )}

            {result.state === "error" && (
              <ErrorPanel
                title="Error"
                message={(result as any).message}
                onReset={handleReset}
                scanMode={scanMode}
              />
            )}
          </AnimatePresence>

          {/* Recent scans log — lets staff double-check without re-scanning */}
          {recentScans.length > 0 && (
            <div className="w-full bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => setRecentOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-500"
              >
                <span className="flex items-center gap-2"><FaHistory size={11} /> Recent scans ({recentScans.length})</span>
                {recentOpen ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
              </button>
              <AnimatePresence>
                {recentOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                      {recentScans.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            s.status === "checked_in" ? "bg-emerald-500"
                            : s.status === "duplicate" ? "bg-amber-500"
                            : "bg-red-500"
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">{s.name}</p>
                            {s.idNumber && <p className="text-[10px] text-zinc-400 font-mono">{s.idNumber}</p>}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium shrink-0">{timeAgo(s.time)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Footer */}
          <p className="text-[10px] font-mono text-zinc-400 text-center">
            Real-time sync · Updates instantly · Admin: {authUser.email?.split("@")[0]}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
            <p key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
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

function ErrorPanel({ title, message, onReset, scanMode }: {
  title: string;
  message: string;
  onReset: () => void;
  scanMode: ScanMode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="w-full bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-3xl p-5 space-y-3 text-center"
    >
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
        <FaExclamationTriangle size={20} className="text-red-500" />
      </div>
      <div>
        <p className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-widest">{title}</p>
        <p className="text-xs font-medium text-red-600 dark:text-red-300 mt-1 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onReset}
        className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
      >
        <FaRedo size={11} /> {scanMode === "upload" ? "Try Another Image" : "Try Again"}
      </button>
    </motion.div>
  );
}