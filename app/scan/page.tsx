"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  doc, getDoc, updateDoc, serverTimestamp,
  collection, getDocs, DocumentReference, deleteField
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaQrcode, FaCheckCircle, FaExclamationTriangle,
  FaIdCard, FaLayerGroup, FaRedo, FaSpinner,
  FaUpload, FaCamera, FaLock, FaSignInAlt, FaKeyboard,
  FaUndo, FaHistory, FaBolt, FaTrash, FaChevronDown, FaChevronUp, FaTimes,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import { SEMINAR_OPTIONS, type Seminar, PROGRAM_SHORT_LABEL } from "@/lib/seminars";

import FloatingCubes from "@/app/components/FloatingCubes";
import CircuitCursor from "@/app/components/CircuitCursor";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanResult =
  | { state: "idle" }
  | { state: "scanning" }
  | { state: "loading" }
  | { state: "already_attended"; data: any; seminar: Seminar }
  | { state: "success"; data: any; seminar: Seminar }
  | { state: "not_found" }
  | { state: "not_registered"; data: any; seminar: Seminar }
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

const PROGRAM_FILTERS = ["all", ...Array.from(new Set(SEMINAR_OPTIONS.flatMap(s => s.programs)))];

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

  const [activeSeminarId, setActiveSeminarId] = useState<string | null>(null);
  const activeSeminarIdRef = useRef<string | null>(null);
  const [seminarListOpen, setSeminarListOpen] = useState(true);
  const [programFilter, setProgramFilter] = useState<string>("all");

  const [result, setResult] = useState<ScanResult>({ state: "idle" });
  const [scanMode, setScanMode] = useState<ScanMode>("camera");
  const [scannerReady, setScannerReady] = useState(false);
  const [justLocked, setJustLocked] = useState(false);
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

  // The master software lock for the scanner
  const processingRef = useRef(false);

  // Keep the ref in sync to avoid needing to tear down the camera on seminar switch
  useEffect(() => {
    activeSeminarIdRef.current = activeSeminarId;
  }, [activeSeminarId]);

const [isOnline, setIsOnline] = useState(true);
  const [cameraPermission, setCameraPermission] = useState<"unknown" | "prompting" | "granted" | "denied" | "unavailable">("unknown");
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const activeSeminar = SEMINAR_OPTIONS.find(s => s.id === activeSeminarId) ?? null;

  const visibleSeminars = useMemo(() => {
    if (programFilter === "all") return SEMINAR_OPTIONS;
    return SEMINAR_OPTIONS.filter(s => s.programs.includes(programFilter));
  }, [programFilter]);

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
        // Html5Qrcode exposes isScanning; only call stop() if actively
        // running, then clear() to tear down the video element. Both are
        // guarded with typeof checks since teardown can race with init.
        if (scannerRef.current.isScanning && typeof scannerRef.current.stop === "function") {
          await scannerRef.current.stop();
        }
        if (typeof scannerRef.current.clear === "function") {
          scannerRef.current.clear();
        }
      } catch (err) {
        console.warn("Scanner teardown warning:", err);
      }
      scannerRef.current = null;
    }
    setScannerReady(false);
  }, []);

  const checkInDocRef = useCallback(async (docRef: DocumentReference, currentSeminar: Seminar) => {
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      setResult({ state: "not_found" });
      recordScan({ name: "Unknown reference", status: "not_found" });
      playFeedback("error");
      return;
    }

    const data = { id: snap.id, ...snap.data() } as any;

    if (data.seminarAttendance?.[currentSeminar.id]) {
      setResult({ state: "already_attended", data, seminar: currentSeminar });
      recordScan({ name: data.fullName, idNumber: data.idNumber, status: "duplicate" });
      playFeedback("duplicate");
      return;
    }

    const registeredIds: string[] = Array.isArray(data.seminars)
      ? data.seminars
          .map((s: any) => (typeof s === "string" ? s : s?.id))
          .filter((id: any): id is string => typeof id === "string" && id.length > 0)
      : [];

    if (registeredIds.length > 0 && !registeredIds.includes(currentSeminar.id)) {
      setResult({ state: "not_registered", data, seminar: currentSeminar });
      recordScan({ name: data.fullName, idNumber: data.idNumber, status: "error" });
      playFeedback("error");
      return;
    }

    await updateDoc(docRef, {
      [`seminarAttendance.${currentSeminar.id}.checkedInAt`]: serverTimestamp(),
      [`seminarAttendance.${currentSeminar.id}.checkedInBy`]: authUser?.uid ?? "unknown",
      [`seminarAttendance.${currentSeminar.id}.status`]: "checked-in", 
      status: "attendee",
      lastCheckedInAt: serverTimestamp(),
    });

    setResult({ state: "success", data: { ...data, status: "attendee" }, seminar: currentSeminar });
    recordScan({ name: data.fullName, idNumber: data.idNumber, status: "checked_in" });
    playFeedback("success");
  }, [authUser, recordScan, playFeedback]);

  const processQR = useCallback(async (rawValue: string) => {
    if (processingRef.current) return;
    processingRef.current = true; // Lock engaged until explicitly reset by the user/timer!

    const currentSeminarId = activeSeminarIdRef.current;
    const currentSeminar = SEMINAR_OPTIONS.find(s => s.id === currentSeminarId) ?? null;

    if (!currentSeminar) {
      setResult({ state: "error", message: "Please select a seminar first." });
      return;
    }

    if (!navigator.onLine) {
      setResult({ state: "error", message: "You are offline. Reconnect to Wi-Fi/Data to scan." });
      recordScan({ name: "Network Error", status: "error" });
      playFeedback("error");
      return;
    }

    if (!rawValue.startsWith("cvmas:")) {
      setResult({ state: "error", message: "Invalid QR code. Not a CVMAS registration." });
      recordScan({ name: "Unrecognized format", status: "error" });
      playFeedback("error");
      return;
    }

    const docId = rawValue.replace("cvmas:", "").trim();
    setResult({ state: "loading" });

    try {
      await checkInDocRef(doc(db, "cvmas_registrations", docId), currentSeminar);
    } catch (err: any) {
      const message = err?.code === "permission-denied"
        ? "Permission denied. Ensure your account has admin access."
        : "Failed to update database. Check your connection.";
      setResult({ state: "error", message });
      recordScan({ name: "System Error", status: "error" });
      playFeedback("error");
    }
    // Intentionally omitting `finally { processingRef.current = false }` 
    // This software lock breaks the 300x scan loop by waiting for handleReset.
  }, [recordScan, playFeedback, checkInDocRef]);

  const processRefCode = useCallback(async (code: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    const currentSeminarId = activeSeminarIdRef.current;
    const currentSeminar = SEMINAR_OPTIONS.find(s => s.id === currentSeminarId) ?? null;

    if (!currentSeminar) {
      setResult({ state: "error", message: "Please select a seminar first." });
      return;
    }

    if (!navigator.onLine) {
      setResult({ state: "error", message: "You are offline. Reconnect to Wi-Fi/Data to scan." });
      recordScan({ name: "Network Error", status: "error" });
      playFeedback("error");
      return;
    }

    setResult({ state: "loading" });

    try {
      const resolved = await resolveRefCode(code);
      if (!resolved) {
        setResult({ state: "not_found" });
        recordScan({ name: `Ref code ${code.toUpperCase()}`, status: "not_found" });
        playFeedback("error");
        return;
      }
      await checkInDocRef(doc(db, "cvmas_registrations", resolved.id), currentSeminar);
    } catch (err: any) {
      const message = err?.code === "permission-denied"
        ? "Permission denied. Ensure your account has admin access."
        : "Failed to update database. Check your connection.";
      setResult({ state: "error", message });
      recordScan({ name: "System Error", status: "error" });
      playFeedback("error");
    }
  }, [recordScan, playFeedback, checkInDocRef]);

 const startCameraScanner = useCallback(async () => {
    if (scannerRef.current) return; // Prevent dual mounts

    // No camera hardware at all — don't even attempt a permission prompt.
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraPermission("unavailable");
      setResult({ state: "error", message: "This device or browser doesn't support camera access." });
      return;
    }

    setCameraPermission("prompting");
    setResult({ state: "scanning" });
    setUploadPreview(null);
    processingRef.current = false;

    // Request the camera explicitly first, so we can distinguish "user
    // denied" from "no camera" from "camera busy" — instead of letting
    // Html5QrcodeScanner's internal prompt fail silently into one generic
    // error message.
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCameraPermission("granted");
    } catch (err: any) {
      console.error("Camera permission error", err);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraPermission("denied");
        setResult({ state: "error", message: "Camera access was denied. Enable it in your browser's site settings, then retry." });
      } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        setCameraPermission("unavailable");
        setResult({ state: "error", message: "No camera was found on this device." });
      } else if (err?.name === "NotReadableError") {
        setCameraPermission("denied");
        setResult({ state: "error", message: "Camera is already in use by another app. Close it and retry." });
      } else {
        setCameraPermission("denied");
        setResult({ state: "error", message: "Couldn't access the camera. Please retry." });
      }
      return;
    } finally {
      // We only needed this stream to trigger/confirm the permission prompt;
      // Html5QrcodeScanner opens its own stream right after. Release ours
      // immediately so we don't hold the camera open twice.
      stream?.getTracks().forEach(t => t.stop());
    }

try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (containerRef.current) {
        containerRef.current.innerHTML = '<div id="qr-reader" style="width: 100%;"></div>';
      }

      const scanner = new Html5Qrcode("qr-reader", { verbose: false });

      // Html5Qrcode.start() takes over immediately with the camera we
      // already have permission for — no second internal permission
      // gate/button like Html5QrcodeScanner shows, so no flash-on-then-off.
await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 340, height: 340 },
          aspectRatio: 1,
        },
        (decodedText: string) => {
          // Fire the Lens-style "lock" snap the instant a code is detected,
          // slightly ahead of the actual async verification, so the UI
          // feels instantly responsive even while Firestore is still loading.
          if (!processingRef.current) {
            setJustLocked(true);
            setTimeout(() => setJustLocked(false), 500);
          }
          processQR(decodedText);
        },
        () => {}
      );

      scannerRef.current = scanner;
      setScannerReady(true);
    } catch (error) {
      console.error("Scanner init failed", error);
      setResult({ state: "error", message: "Camera initialization failed. Please retry." });
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
      
      processingRef.current = false;
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
  }, [processQR, stopScanner, recordScan, playFeedback]);

  const switchMode = useCallback(async (mode: ScanMode) => {
    await stopScanner();
    setResult({ state: "idle" });
    setUploadPreview(null);
    setScanMode(mode);
    processingRef.current = false;
  }, [stopScanner]);

  // Notice we use !!activeSeminarId to strictly prevent constant tear downs when swapping seminars.
  // The scanner binds to the processQR closure once, which resolves the active seminar securely via ref.
  useEffect(() => {
    if (!authUser || scanMode !== "camera" || !activeSeminarId) return;
    startCameraScanner();
    return () => { stopScanner(); };
  }, [authUser, scanMode, !!activeSeminarId, startCameraScanner, stopScanner]);

  useEffect(() => {
    const isSheetOpen = result.state === "success" || result.state === "already_attended" || result.state === "not_found" || result.state === "not_registered" || result.state === "error";
    if (isSheetOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevPosition = document.body.style.position;
      document.body.style.overflow = "hidden";
      // iOS Safari specifically ignores overflow:hidden on body while a fixed
      // element is focused/scrolling underneath; position:fixed is the
      // reliable cross-iOS-version fix for locking background scroll.
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.position = prevPosition;
        document.body.style.width = "";
      };
    }
  }, [result.state]);

  const handleReset = useCallback(() => {
    if (autoResumeTimeoutRef.current) clearTimeout(autoResumeTimeoutRef.current);
    if (autoResumeIntervalRef.current) clearInterval(autoResumeIntervalRef.current);
    setAutoCountdown(null);
    
    setUploadPreview(null);
    
    // Instead of completely tearing down the camera, we just lift the software lock
    // and let the running instance seamlessly accept new frames.
    if (scanMode === "camera") {
      setResult({ state: "scanning" });
    } else {
      setResult({ state: "idle" });
    }
    
    processingRef.current = false;
  }, [scanMode]);

  const selectSeminar = (id: string) => {
    setActiveSeminarId(id);
    setSeminarListOpen(false);
    handleReset();
  };

  // ── Undo ───────────────────────────────────────────────────────────────────

  const handleUndo = useCallback(async () => {
    if (result.state !== "success") return;
    if (!activeSeminar) return;
    if (!window.confirm(`Undo check-in for ${result.data.fullName}?`)) return;

    setUndoing(true);
    try {
      const docRef = doc(db, "cvmas_registrations", result.data.id);
      await updateDoc(docRef, {
        [`seminarAttendance.${activeSeminar.id}`]: deleteField(),
      });
      setSessionStats(prev => {
        const next = { ...prev, checkedIn: Math.max(0, prev.checkedIn - 1) };
        try { sessionStorage.setItem("cvmas_scan_stats", JSON.stringify(next)); } catch {}
        return next;
      });
      setRecentScans(prev => {
        const next = prev.filter(s => !(s.time === prev[0]?.time && s.status === "checked_in"));
        try { sessionStorage.setItem("cvmas_recent_scans", JSON.stringify(next)); } catch {}
        return next;
      });
      handleReset();
    } catch (err) {
      console.error(err);
      alert("Failed to undo check-in. Try again.");
    } finally {
      setUndoing(false);
    }
  }, [result, handleReset, activeSeminar]);

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
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[10%] left-[-10%] w-[350px] h-[350px] bg-green-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute inset-0 opacity-20"><FloatingCubes /></div>
      </div>
      <div className="hidden md:block"><CircuitCursor /></div>

      <div className="relative z-10 flex flex-col flex-1">
        <div className="pt-24 md:pt-28 px-4 shrink-0" style={{ paddingTop: "max(6rem, calc(env(safe-area-inset-top) + 4rem))" }}>
<div className="max-w-2xl mx-auto relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-[#06402B] text-white">
            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none" />
            <AnimatePresence>
              {!isOnline && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg z-30"
                >
                  Offline
                </motion.div>
              )}
            </AnimatePresence>
            <div className="relative px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[9px] font-mono tracking-[0.3em] uppercase text-emerald-300">
                    CVMAS Week · Terminal
                  </p>
                  <h1 className="text-lg font-black tracking-tight flex items-center gap-2 mt-0.5">
                    <FaQrcode size={16} /> QR Scanner
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-widest truncate max-w-[80px]">
                    {authUser.email?.split("@")[0]}
                  </span>
                </div>
              </div>

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

        <div className="flex-1 flex flex-col items-center px-4 pt-5 pb-10 max-w-2xl mx-auto w-full space-y-4">

          <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm z-20 relative">
            <button
              onClick={() => setSeminarListOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${activeSeminar ? "bg-emerald-500 animate-pulse" : "bg-zinc-300 dark:bg-zinc-600"}`} />
                <div className="min-w-0 text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Seminar</p>
                  <p className={`text-sm font-black truncate ${activeSeminar ? "text-zinc-900 dark:text-white" : "text-zinc-400"}`}>
                    {activeSeminar ? activeSeminar.title : "Tap to select seminar"}
                  </p>
                </div>
              </div>
              {seminarListOpen ? <FaChevronUp size={11} className="text-zinc-400 shrink-0" /> : <FaChevronDown size={11} className="text-zinc-400 shrink-0" />}
            </button>

            <AnimatePresence>
              {seminarListOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                >
                  {PROGRAM_FILTERS.length > 2 && (
                    <div className="flex gap-1.5 px-3 pt-3 overflow-x-auto">
                      {PROGRAM_FILTERS.map(pf => (
                        <button
                          key={pf}
                          onClick={() => setProgramFilter(pf)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            programFilter === pf
                              ? "bg-[#06402B] text-white shadow-sm"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                          }`}
                        >
                          {pf === "all" ? "All Programs" : (PROGRAM_SHORT_LABEL[pf] ?? pf)}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-3 space-y-2">
                    {visibleSeminars.length === 0 ? (
                      <p className="text-center text-xs font-bold text-zinc-400 py-4">No seminars for this program.</p>
                    ) : visibleSeminars.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => selectSeminar(s.id)}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${
                          activeSeminarId === s.id
                            ? "border-[#06402B] bg-[#06402B]/5 dark:bg-emerald-500/10"
                            : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${
                            activeSeminarId === s.id ? "bg-[#06402B] text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                          }`}>
                            {activeSeminarId === s.id ? <FaCheckCircle size={9} /> : i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-black leading-tight ${
                              activeSeminarId === s.id ? "text-[#06402B] dark:text-emerald-400" : "text-zinc-800 dark:text-zinc-200"
                            }`}>
                              {s.title}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-0.5 font-medium leading-snug">{s.speaker}</p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {s.programs.map(p => (
                                <span key={p} className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-wide">
                                  {PROGRAM_SHORT_LABEL[p] ?? p}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!activeSeminar ? (
            <div className="w-full py-14 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
              <FaQrcode size={28} className="text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest text-center">
                Select a seminar above<br />to start scanning
              </p>
            </div>
          ) : (
            <>
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                  <button
                    onClick={() => setAutoContinue(v => !v)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border transition-all ${
                      autoContinue ? "bg-[#06402B]/10 border-[#06402B]/30 text-[#06402B] dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <FaBolt size={10} /> Auto {autoContinue ? "on" : "off"}
                  </button>
                  <button
                    onClick={() => setSoundOn(v => !v)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border transition-all ${
                      soundOn ? "bg-[#06402B]/10 border-[#06402B]/30 text-[#06402B] dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400" : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                    }`}
                  >
                    🔊 {soundOn ? "on" : "off"}
                  </button>
                </div>

                <div className="flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 gap-1">
                  <button
                    onClick={() => switchMode("camera")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      scanMode === "camera" ? "bg-[#06402B] text-white shadow-md" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    }`}
                  >
                    <FaCamera size={12} /> Camera
                  </button>
                  <button
                    onClick={() => switchMode("upload")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      scanMode === "upload" ? "bg-[#06402B] text-white shadow-md" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    }`}
                  >
                    <FaUpload size={12} /> Upload
                  </button>
                </div>
              </div>
{scanMode === "camera" && result.state === "error" && (
                <div className="w-full py-10 flex flex-col items-center gap-3 border-2 border-dashed border-red-200 dark:border-red-900/40 rounded-3xl bg-red-50/50 dark:bg-red-500/5 px-6">
                  <FaExclamationTriangle size={22} className="text-red-400" />
                  <p className="text-xs font-bold text-red-500 text-center">{(result as any).message}</p>
                  {cameraPermission === "denied" && (
                    <p className="text-[10px] text-zinc-400 text-center leading-relaxed max-w-xs">
                      Look for a camera icon in your address bar, or check
                      Site Settings → Camera in your browser, then retry.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => startCameraScanner()}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 transition-all active:scale-95"
                    >
                      Retry Camera
                    </button>
                    {cameraPermission === "unavailable" && (
                      <button
                        onClick={() => switchMode("upload")}
                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all active:scale-95"
                      >
                        Use Upload Instead
                      </button>
                    )}
                  </div>
                </div>
              )}

              {scanMode === "camera" && result.state !== "error" && (
                <div className="relative w-full rounded-[2rem] overflow-hidden border-4 transition-colors duration-500 border-zinc-800 dark:border-zinc-700 bg-black aspect-square flex items-center justify-center shadow-2xl">

                  <div ref={containerRef} className="absolute inset-0 w-full h-full object-cover">
                    <div id="qr-reader" />
                  </div>
{(result.state === "scanning" || result.state === "loading") && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                      <motion.div
                        animate={{
                          width: justLocked ? "50%" : "72%",
                          height: justLocked ? "50%" : "72%",
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 26 }}
                        className="relative"
                      >
                        {/* Corner brackets — snap inward and flash emerald on lock */}
                        <motion.div
                          animate={{
                            borderColor: justLocked ? "#34d399" : "#10b981",
                            scale: justLocked ? 1.08 : 1,
                          }}
                          transition={{ duration: 0.25 }}
                          className="absolute top-0 left-0 w-12 h-12 border-t-[6px] border-l-[6px] rounded-tl-2xl"
                          style={{ borderColor: "#10b981" }}
                        />
                        <motion.div
                          animate={{
                            borderColor: justLocked ? "#34d399" : "#10b981",
                            scale: justLocked ? 1.08 : 1,
                          }}
                          transition={{ duration: 0.25 }}
                          className="absolute top-0 right-0 w-12 h-12 border-t-[6px] border-r-[6px] rounded-tr-2xl"
                          style={{ borderColor: "#10b981" }}
                        />
                        <motion.div
                          animate={{
                            borderColor: justLocked ? "#34d399" : "#10b981",
                            scale: justLocked ? 1.08 : 1,
                          }}
                          transition={{ duration: 0.25 }}
                          className="absolute bottom-0 left-0 w-12 h-12 border-b-[6px] border-l-[6px] rounded-bl-2xl"
                          style={{ borderColor: "#10b981" }}
                        />
                        <motion.div
                          animate={{
                            borderColor: justLocked ? "#34d399" : "#10b981",
                            scale: justLocked ? 1.08 : 1,
                          }}
                          transition={{ duration: 0.25 }}
                          className="absolute bottom-0 right-0 w-12 h-12 border-b-[6px] border-r-[6px] rounded-br-2xl"
                          style={{ borderColor: "#10b981" }}
                        />

                        {/* Scanning laser — only while actively hunting, hidden once locked */}
                        <AnimatePresence>
                          {!justLocked && result.state === "scanning" && (
                            <motion.div
                              exit={{ opacity: 0 }}
                              animate={{ y: ["0%", "300%"] }}
                              transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatType: "reverse" }}
                              className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.9)] opacity-80"
                            />
                          )}
                        </AnimatePresence>

                        {/* Lock flash — brief radiating pulse the moment a code locks */}
                        <AnimatePresence>
                          {justLocked && (
                            <motion.div
                              initial={{ opacity: 0.9, scale: 0.6 }}
                              animate={{ opacity: 0, scale: 1.6 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className="absolute inset-0 rounded-2xl border-4 border-emerald-400"
                            />
                          )}
                        </AnimatePresence>

                        {/* Center checkmark pop on lock */}
                        <AnimatePresence>
                          {justLocked && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 20 }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <div className="w-12 h-12 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                                <FaCheckCircle size={22} className="text-white" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  )}

                  <AnimatePresence>
                    {result.state === "scanning" && (
                      <motion.div
                        key="chip-scanning" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="absolute top-5 left-1/2 -translate-x-1/2 px-5 py-2 bg-black/60 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest rounded-full z-20"
                      >
                        Point camera at QR code
                      </motion.div>
                    )}
                    {result.state === "loading" && (
                      <motion.div
                        key="chip-loading" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="absolute top-5 left-1/2 -translate-x-1/2 px-5 py-2 bg-black/80 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest rounded-full flex items-center gap-2 z-20"
                      >
                        <FaSpinner className="animate-spin" size={12} /> Verifying…
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="absolute bottom-5 left-5 max-w-[55%] z-20">
                    <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl">
                      <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Scanning for</p>
                      <p className="text-[11px] font-bold text-white truncate">{activeSeminar.title}</p>
                    </div>
                  </div>

<AnimatePresence>
                    {autoCountdown !== null && (
                      <motion.button
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={handleReset}
                        className="absolute bottom-5 right-5 flex items-center gap-2 px-3.5 py-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black/90 active:scale-95 transition-all z-20"
                      >
                        <motion.span
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        />
                        Next in {autoCountdown}s
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
                    <div className={`w-full rounded-[2rem] overflow-hidden border-4 transition-colors duration-300 relative shadow-2xl aspect-square ${
                      result.state === "success" ? "border-emerald-500" : result.state === "already_attended" ? "border-amber-500" : result.state === "not_registered" || result.state === "error" || result.state === "not_found" ? "border-red-500" : "border-zinc-800 dark:border-zinc-700"
                    }`}>
                      <img src={uploadPreview} alt="Uploaded QR" className="w-full h-full object-contain bg-black" />
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                          <FaSpinner className="animate-spin text-white" size={32} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-square rounded-[2rem] border-4 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-4 hover:border-[#06402B] dark:hover:border-emerald-500 hover:bg-[#06402B]/5 transition-all active:scale-95 group">
                      <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-[#06402B] dark:group-hover:text-emerald-400 transition-colors">
                        <FaUpload size={32} />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Tap to upload</p>
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
                      className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-base font-bold font-mono tracking-widest text-zinc-900 dark:text-white outline-none focus:border-[#06402B] dark:focus:border-emerald-500 uppercase disabled:opacity-60"                    />
<button type="submit" disabled={manualSubmitting || !manualCode.trim()} className="px-4 py-2.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#042d1f] dark:hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[52px] min-h-[44px]">
                      {manualSubmitting ? <FaSpinner className="animate-spin" size={12} /> : "Go"}
                    </button>
                    <button type="button" onClick={() => { setManualEntryOpen(false); setManualCode(""); }} className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors min-h-[44px] min-w-[44px]">
                      <FaTimes size={12} />
                    </button>
                  </motion.form>
                )}
              </div>

              <AnimatePresence mode="wait">
                {result.state === "idle" && (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full py-3 text-center">
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                      {scanMode === "camera" ? "Ready to scan" : "Upload an image"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

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
            </>
          )}

          <AnimatePresence>
            {(result.state === "success" || result.state === "already_attended" || result.state === "not_found" || result.state === "not_registered" || result.state === "error") && (
              <>
                <motion.div
                  key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={handleReset} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                />
<motion.div
                  key="sheet"
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.5 }}
                  dragMomentum={false}
                  onDragEnd={(_, info) => { if (info.offset.y > 80 || info.velocity.y > 500) handleReset(); }}
                  initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", stiffness: 350, damping: 35 }}
                  style={{ touchAction: "none" }}
                  className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto"
                >
<div
                    style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
                    className={`rounded-t-[2rem] p-6 space-y-4 border-t-4 shadow-2xl ${
                    result.state === "success" ? "bg-white dark:bg-zinc-900 border-emerald-500" : result.state === "already_attended" ? "bg-white dark:bg-zinc-900 border-amber-500" : "bg-white dark:bg-zinc-900 border-red-500"
                  }`}>
                    <div className="w-10 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto -mt-2 mb-2" />

                    {result.state === "success" && (
                      <>
                        <div className="flex items-center gap-4">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }} className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
                            <FaCheckCircle size={24} className="text-white" />
                          </motion.div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">✓ Checked In</p>
                            <p className="text-xl font-black text-zinc-900 dark:text-white leading-tight truncate">{result.data.fullName}</p>
                            <p className="text-[11px] font-bold text-zinc-500 mt-0.5 truncate">{result.seminar.title}</p>
                          </div>
                        </div>
                        <StudentDetail data={result.data} activeSeminarId={result.seminar.id} />
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
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">⚠ Already Checked In</p>
                            <p className="text-xl font-black text-zinc-900 dark:text-white leading-tight truncate">{result.data.fullName}</p>
                            <p className="text-[11px] font-bold text-zinc-500 mt-0.5 truncate">{result.seminar.title}</p>
                            {result.data.seminarAttendance?.[result.seminar.id]?.checkedInAt && (
                              <p className="text-[11px] font-mono text-amber-500 mt-0.5">
                                at {new Date(result.data.seminarAttendance[result.seminar.id].checkedInAt?.toDate?.() ?? result.data.seminarAttendance[result.seminar.id].checkedInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            )}
                          </div>
                        </div>
                        <StudentDetail data={result.data} activeSeminarId={result.seminar.id} />
                        <ResetButton onReset={handleReset} label="Scan Next" />
                        {autoCountdown !== null && (
                          <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 2.2, ease: "linear" }} className="h-full bg-amber-500 rounded-full" />
                          </div>
                        )}
                      </>
                    )}

                    {result.state === "not_registered" && (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
                            <FaTimes size={22} className="text-red-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-0.5">Not Registered</p>
                            <p className="text-xl font-black text-zinc-900 dark:text-white leading-tight truncate">{result.data.fullName}</p>
                            <p className="text-[11px] font-bold text-zinc-400 mt-0.5 truncate">Did not register for this seminar</p>
                          </div>
                        </div>
                        <StudentDetail data={result.data} activeSeminarId={result.seminar.id} />
                        <ResetButton onReset={handleReset} label="Scan Next" />
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
      <motion.span
        key={value}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
        className={`text-sm font-black ${color}`}
      >
        {value}
      </motion.span>
      <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">{label}</span>
    </div>
  );
}

function StudentDetail({ data, activeSeminarId }: { data: any; activeSeminarId?: string }) {
  const attendance = data.seminarAttendance ?? {};

  return (
    <div className="space-y-3 border-t border-zinc-200 dark:border-zinc-700 pt-3">
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
        <FaIdCard size={10} className="shrink-0" />
        <span className="font-mono text-xs font-bold">{data.idNumber}</span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        <span className="text-xs font-bold">{data.yearLevel}</span>
        <span className="text-zinc-300 dark:text-zinc-600">·</span>
        <span className="text-xs font-medium capitalize">{data.studentType}</span>
      </div>
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
        <FaLayerGroup size={10} className="shrink-0" />
        <span className="text-xs font-bold">{data.block}</span>
      </div>

      {/* Seminar attendance tracker */}
      <div className="space-y-1.5 pt-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Seminar Attendance</p>
        {SEMINAR_OPTIONS.map(s => {
          const attended = !!attendance[s.id];
          const isCurrent = s.id === activeSeminarId;
          const checkedInTime = attendance[s.id]?.checkedInAt;
          return (
            <div key={s.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${
              isCurrent && attended
                ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                : isCurrent
                ? "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
                : attended
                ? "bg-zinc-50 dark:bg-zinc-800/30 border border-transparent dark:border-transparent"
                : "opacity-40 border border-transparent dark:border-transparent"
            }`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                attended ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"
              }`}>
                {attended && <FaCheckCircle size={8} className="text-white" />}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <p className={`text-[11px] font-bold truncate leading-tight ${
                  isCurrent
                    ? attended ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300"
                    : "text-zinc-500 dark:text-zinc-500"
                }`}>
                  {s.title}
                </p>
              </div>
              {attended && checkedInTime && (
                <p className="text-[9px] font-mono text-zinc-400 shrink-0">
                  {new Date(checkedInTime?.toDate?.() ?? checkedInTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              {isCurrent && !attended && (
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 shrink-0">Now</span>
              )}
            </div>
          );
        })}
      </div>
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