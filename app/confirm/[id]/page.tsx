"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/db";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link"; 
import {
  FaCheckCircle, FaDownload, FaSpinner, FaCalendarAlt,
  FaIdCard, FaUser, FaExclamationTriangle, FaImage, FaCopy, FaShareSquare,
  FaSignOutAlt, FaLock
} from "react-icons/fa";

import FloatingCubes from "@/app/components/FloatingCubes";
import CircuitCursor from "@/app/components/CircuitCursor";

export default function ConfirmPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<"not_found" | "network" | null>(null);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [copied, setCopied] = useState(false);
  
const [canShare, setCanShare] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editBlock, setEditBlock] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchRegistration = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorState(null);
    try {
      const snap = await getDoc(doc(db, "cvmas_registrations", id as string));
      if (snap.exists()) {
        setData({ id: snap.id, ...snap.data() });
      } else {
        setErrorState("not_found");
      }
    } catch (err: any) {
      console.error(err);
      setErrorState("network");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRegistration();
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [new File([""], "test.png", { type: "image/png" })] })
      ) {
        setCanShare(true);
      }
    } catch {
      // canShare not supported — fall back to download
    }
  }, [fetchRegistration]);

const handleCopyCode = () => {
    if (!data) return;
    const refCode = data.id.slice(0, 8).toUpperCase();
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openEdit = () => {
    setEditBlock(data.block ?? "");
    setEditError("");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    const trimmed = editBlock.trim();
    if (!trimmed) {
      setEditError("Block can't be empty.");
      return;
    }
    if (trimmed.length > 40) {
      setEditError("Too long (max 40 characters).");
      return;
    }
    setSavingEdit(true);
    setEditError("");
    try {
      await updateDoc(doc(db, "cvmas_registrations", data.id), { block: trimmed });
      setData((prev: any) => ({ ...prev, block: trimmed }));
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      setEditError("Couldn't save — check your connection and try again.");
    } finally {
      setSavingEdit(false);
    }
  };

const handleSaveOrSharePng = async () => {
    const svgEl = qrWrapRef.current?.querySelector("svg");
    if (!svgEl || !data) return;

    setDownloadingPng(true);

    try {
      const refCode = data.id.slice(0, 8).toUpperCase();
      const QR_SIZE = 600;
      const PADDING = 48;
      const HEADER_H = 64;
      const FOOTER_H = 72;
      const W = QR_SIZE + PADDING * 2;
      const H = HEADER_H + QR_SIZE + PADDING + FOOTER_H;

      // ── 1. Serialise the live SVG ───────────────────────────────────────
      const cloned = svgEl.cloneNode(true) as SVGSVGElement;
      cloned.setAttribute("width",  String(QR_SIZE));
      cloned.setAttribute("height", String(QR_SIZE));
      // Force viewBox so it scales correctly
      if (!cloned.getAttribute("viewBox")) {
        cloned.setAttribute("viewBox", `0 0 ${QR_SIZE} ${QR_SIZE}`);
      }
      // Inline any currentColor / CSS vars that canvas can't resolve
      cloned.querySelectorAll<SVGElement>("*").forEach(el => {
        const fill = getComputedStyle(el).fill;
        if (fill && fill !== "none") el.setAttribute("fill", fill);
      });

      const svgString = new XMLSerializer().serializeToString(cloned);
      // base64 encode — avoids CORS / blob-URL timing issues on iOS
      const svgB64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));

      // ── 2. Load into an Image ───────────────────────────────────────────
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload  = () => resolve(i);
        i.onerror = reject;
        i.src = svgB64;
      });

      // ── 3. Draw on canvas ───────────────────────────────────────────────
      const canvas = document.createElement("canvas");
      // 2× retina scaling
      const SCALE = 2;
      canvas.width  = W * SCALE;
      canvas.height = H * SCALE;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(SCALE, SCALE);

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);

      // Header strip
      ctx.fillStyle = "#06402B";
      ctx.fillRect(0, 0, W, HEADER_H);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CVMAS WEEK · DLSAU", W / 2, HEADER_H / 2 + 7);

      // QR code
      ctx.drawImage(img, PADDING, HEADER_H, QR_SIZE, QR_SIZE);

      // Thin border around QR
      ctx.strokeStyle = "#e4e4e7";
      ctx.lineWidth = 1;
      ctx.strokeRect(PADDING, HEADER_H, QR_SIZE, QR_SIZE);

      // Footer — ref code
      const footerY = HEADER_H + QR_SIZE;
      ctx.fillStyle = "#f4f4f5";
      ctx.fillRect(0, footerY, W, FOOTER_H);
      ctx.fillStyle = "#71717a";
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("REFERENCE CODE", W / 2, footerY + 22);
      ctx.fillStyle = "#06402B";
      ctx.font = "bold 28px ui-monospace, monospace";
      ctx.fillText(refCode, W / 2, footerY + 54);

      // ── 4. Export ───────────────────────────────────────────────────────
      // toBlob with explicit type + quality is more reliable than toDataURL on iOS
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
      });

      const file = new File([blob], `cvmas-qr-${refCode}.png`, { type: "image/png" });

      // ── 5. Share → Download fallback chain ─────────────────────────────
      let shared = false;

      // A: Web Share API with files (iOS 15+, Chrome Android)
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function"
      ) {
        try {
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "CVMAS QR Ticket",
              text: `My CVMAS Registration Code: ${refCode}`,
              files: [file],
            });
            shared = true;
          }
        } catch (e: any) {
          // AbortError = user cancelled — don't fall through to download
          if (e?.name === "AbortError") { setDownloadingPng(false); return; }
          // Any other error: fall through to next method
        }
      }

      if (shared) { setDownloadingPng(false); return; }

      // B: Open blob in new tab (iOS Safari shows "Save to Photos" / "AirDrop" sheet)
      const blobUrl = URL.createObjectURL(blob);
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

      if (isIOS) {
        // On iOS, opening the blob URL lets the user long-press → Save Image
        window.open(blobUrl, "_blank");
        // Revoke after a delay so the tab can load it first
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
      } else {
        // C: Standard <a download> — works on Chrome, Firefox, Edge desktop/Android
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `cvmas-qr-${refCode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5_000);
      }

    } catch (err) {
      console.error("QR image export failed:", err);
      alert(
        "Couldn't generate the image automatically.\n\n" +
        "Tip: Take a screenshot of this page — it works just as well at the entrance."
      );
    } finally {
      setDownloadingPng(false);
    }
  };

  const triggerDownload = (dataUrl: string, refCode: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `cvmas-qr-${refCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-zinc-50 dark:bg-black">
        <FaSpinner className="animate-spin text-[#06402B] dark:text-emerald-400" size={32} />
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Loading Ticket...</p>
      </div>
    );
  }

  if (errorState === "network") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2">
          <FaExclamationTriangle size={24} className="text-red-500" />
        </div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">Connection Error</h2>
        <p className="text-sm font-medium text-zinc-500 max-w-xs">We couldn't load your ticket. Please check your internet connection.</p>
        <button onClick={fetchRegistration} className="mt-2 px-6 py-3 bg-[#06402B] text-white rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform">
          Try Again
        </button>
      </div>
    );
  }

  if (errorState === "not_found" || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mb-2">
          <FaExclamationTriangle size={24} className="text-zinc-500" />
        </div>
        <h2 className="text-xl font-black text-zinc-900 dark:text-white">Ticket Not Found</h2>
        <p className="text-sm font-medium text-zinc-500 max-w-xs">This registration does not exist or was deleted.</p>
      </div>
    );
  }

  const qrValue = `cvmas:${data.id}`;
  const refCode = data.id.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black relative overflow-hidden font-sans selection:bg-green-500/30 pb-12 print:bg-white print:text-black">

      <div className="absolute inset-0 z-0 pointer-events-none print:hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[10%] left-[-10%] w-[400px] h-[400px] bg-green-500/10 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl opacity-40" />
        <div className="absolute inset-0 opacity-30 sm:opacity-50">
          <FloatingCubes />
        </div>
      </div>

      <div className="hidden md:block print:hidden">
        <CircuitCursor />
      </div>

<main className="relative z-10">

        <div className="pt-16 md:pt-24 px-4 print:hidden">
          <div className="max-w-sm mx-auto relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-[#06402B] text-white text-center px-5 py-8">
            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none" />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative flex justify-center mb-3"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <FaCheckCircle size={28} className="text-emerald-300" />
              </div>
            </motion.div>
            <h1 className="relative text-xl font-black tracking-tight mb-1">You're pre-registered!</h1>
            <p className="relative text-sm text-emerald-100">CVMAS Week · DLSAU</p>
          </div>
        </div>

        <div className="max-w-sm mx-auto px-4 pt-6 space-y-4 print:pt-0 print:shadow-none print:max-w-full">

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 text-center shadow-xl space-y-5 print:border-none print:shadow-none print:p-0 print:bg-transparent"
          >
<div ref={qrWrapRef} className="flex justify-center">
              <div
                className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm inline-block"
                role="img"
                aria-label={`QR code ticket for CVMAS Week entry. Your reference code is ${refCode}. Present this to staff at the door, or read them the reference code directly.`}
              >
                <QRCode
                  value={qrValue}
                  size={180}
                  level="H"
                  fgColor="#06402B"
                  bgColor="#ffffff"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  aria-hidden="true"
                />
              </div>
            </div>

<div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Reference Code</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-black tracking-[0.15em] text-zinc-900 dark:text-white font-mono print:text-black">
                  {refCode}
                </p>
<button 
                  onClick={handleCopyCode} 
                  className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-white rounded-lg transition-colors active:scale-90 print:hidden"
                  aria-label={copied ? "Reference code copied" : "Copy reference code to clipboard"}
                  title="Copy Code"
                >
                  {copied ? <FaCheckCircle className="text-[#06402B] dark:text-emerald-400" /> : <FaCopy />}
                </button>
                <span className="sr-only" role="status" aria-live="polite">
                  {copied ? "Reference code copied to clipboard" : ""}
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl print:bg-transparent print:border-zinc-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse print:animate-none print:bg-zinc-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 print:text-zinc-600">
                Pre-registered
              </span>
            </div>

<dl className="space-y-2 text-left border-t border-zinc-100 dark:border-zinc-800 pt-4 print:border-zinc-300">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Your details</span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 print:hidden">
                  <FaLock size={8} /> Locked after registration
                </span>
              </div>
              <DetailRow icon={<FaUser size={10} />} label="Name" value={data.fullName} locked />
              <DetailRow icon={<FaIdCard size={10} />} label="ID Number" value={data.idNumber} locked />
              <DetailRow icon={<FaCalendarAlt size={10} />} label="Program & Year" value={`${data.program} · ${data.yearLevel}`} locked />
              <div className="flex items-center justify-between gap-2">
                <DetailRow icon={<span className="text-[9px] font-black">BLK</span>} label="Block" value={data.block} className="flex-1" />
                <button
                  onClick={openEdit}
                  className="shrink-0 text-[10px] font-black uppercase tracking-widest text-[#06402B] dark:text-emerald-400 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded px-1.5 py-1 print:hidden"
                >
                  Edit
                </button>
              </div>
            </dl>
{Array.isArray(data.seminars) && data.seminars.length > 0 && (() => {
              const attendance = data.seminarAttendance ?? {};
              return (
                <div className="text-left border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-2 print:border-zinc-300">
<div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                      Registered seminars ({data.seminars.length})
                    </p>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-zinc-400 print:hidden">
                      <FaLock size={8} /> Locked
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {data.seminars.map((s: any, i: number) => {
                      const seminarId = typeof s === "string" ? s : s?.id;
                      const title = typeof s === "string" ? s : s?.title ?? s?.id ?? "Unknown seminar";
                      const att = seminarId ? attendance[seminarId] : null;
                      const checkedIn = !!att?.checkedInAt;
                      const checkedOut = !!att?.checkedOutAt;

                      return (
                        <li key={i} className="text-xs font-medium text-zinc-700 dark:text-zinc-300 print:text-black">
                          <div className="flex items-start gap-2">
                            <FaCheckCircle
                              size={10}
                              className={`mt-0.5 shrink-0 print:hidden ${checkedIn ? "text-emerald-500" : "text-zinc-300 dark:text-zinc-600"}`}
                              aria-hidden="true"
                            />
                            <div className="min-w-0 flex-1">
                              <span>{title}</span>
                              {checkedIn && (
                                <span className="block text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  {checkedOut ? "Attended — checked out" : "Currently checked in"}
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            {data.professors?.length > 0 && (
              <div className="text-left border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-2 print:border-zinc-300">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Incentive professors</p>
                {data.professors.map((p: any, i: number) => (
                  <div key={i} className="text-xs text-zinc-600 dark:text-zinc-400 font-medium print:text-black">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 print:text-black">{p.professor}</span>
                    {" — "}{p.subject} · {p.block}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl space-y-2 print:hidden">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Important</p>
            <ul className="space-y-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 list-disc list-inside">
              <li>Save or screenshot this ticket</li>
              <li>Present this at the CVMAS Week entrance</li>
              <li>Staff will scan it to mark you as an attendee</li>
            </ul>
          </div>

{/iphone|ipad|ipod/i.test(typeof navigator !== "undefined" ? navigator.userAgent : "") && (
            <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl text-blue-700 dark:text-blue-300">
              <span className="text-base shrink-0">📱</span>
              <p className="text-[11px] font-medium leading-relaxed">
                iPhone tip: Tap <strong>"Save / Share"</strong> then long-press the image → <strong>Save to Photos</strong>. Or just take a screenshot — it works at the entrance too.
              </p>
            </div>
          )}
          <div className="flex gap-3 print:hidden">
            <button
              onClick={handleSaveOrSharePng}
              disabled={downloadingPng}
className="flex-1 py-3.5 bg-[#06402B] dark:bg-emerald-600 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"            >
              {downloadingPng ? (
                <><FaSpinner size={11} className="animate-spin" /> Saving…</>
              ) : (
              <>{canShare ? <FaShareSquare size={11} /> : <FaImage size={11} />} {canShare ? "Share / Save" : "Save as Image"}</>
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 py-3.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:text-[#06402B] dark:hover:text-emerald-400 hover:border-[#06402B]/30 transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#06402B]/40 focus-visible:ring-offset-2"
            >
              <FaDownload size={11} /> Print / PDF
            </button>
          </div>
          
          {/* ─── NEW: SEAMLESS CHECK-OUT LINK ─── */}
          <div className="pt-6 print:hidden">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div></div>
              <div className="relative flex justify-center"><span className="bg-zinc-50 dark:bg-black px-4 text-[10px] uppercase tracking-widest font-black text-zinc-400">Event Over?</span></div>
            </div>
            
            <Link 
              href="/checkout"
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-amber-500/20 outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2"
            >
              Self Check-Out <FaSignOutAlt size={13} />
            </Link>
            <p className="text-center text-[10px] text-zinc-400 mt-3 pb-4">
              Tap here at the end of the seminar to record your attendance.
            </p>
          </div>

        </div>

        <AnimatePresence>
          {editOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => !savingEdit && setEditOpen(false)}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                role="dialog" aria-modal="true" aria-labelledby="edit-block-title"
                className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4"
              >
                <h2 id="edit-block-title" className="text-lg font-black text-zinc-900 dark:text-white">Edit block section</h2>
<p className="text-xs text-zinc-500 font-medium leading-relaxed">
                  Your name, ID number, program, and seminar selections are locked once
                  submitted — they're tied to your QR code and attendance records, so
                  changing them here could break your check-in. Only your block section
                  can be corrected. Contact an organizer if anything else needs fixing.
                </p>
                <div className="space-y-1.5">
                  <label htmlFor="editBlock" className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">
                    Block Section
                  </label>
                  <input
                    id="editBlock"
                    type="text"
                    value={editBlock}
                    onChange={e => setEditBlock(e.target.value)}
                    maxLength={40}
                    autoFocus
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-base font-bold text-zinc-900 dark:text-white outline-none focus:border-[#06402B] dark:focus:border-emerald-500"
                  />
                  {editError && (
                    <p role="alert" className="text-[11px] font-bold text-red-500">{editError}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditOpen(false)}
                    disabled={savingEdit}
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="flex-1 py-3 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#0a5a38] dark:hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    {savingEdit ? <><FaSpinner className="animate-spin" size={11} /> Saving…</> : "Save"}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function DetailRow({ icon, label, value, locked, className = "" }: { icon: React.ReactNode; label: string; value: string; locked?: boolean; className?: string }) {
  return (
    <div className={`flex items-start gap-2 print:text-black ${className}`}>
      <span className="text-zinc-400 mt-0.5 shrink-0 print:text-zinc-600" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <dt className="inline text-[9px] font-bold uppercase tracking-widest text-zinc-400 print:text-zinc-500">{label}: </dt>
        <dd className="inline text-xs font-bold text-zinc-800 dark:text-zinc-200 print:text-black">{value}</dd>
        {locked && <FaLock size={7} className="inline ml-1.5 text-zinc-300 dark:text-zinc-600 print:hidden" aria-hidden="true" />}
      </div>
    </div>
  );
}