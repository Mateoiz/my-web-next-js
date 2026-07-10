"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/db";
import QRCode from "react-qr-code";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link"; 
import {
  FaCheckCircle, FaDownload, FaSpinner, FaCalendarAlt,
  FaIdCard, FaUser, FaExclamationTriangle, FaImage, FaCopy, FaShareSquare,
  FaSignOutAlt 
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
    if (typeof navigator !== "undefined" && navigator.canShare()) {
      setCanShare(true);
    }
  }, [fetchRegistration]);

  const handleCopyCode = () => {
    if (!data) return;
    const refCode = data.id.slice(0, 8).toUpperCase();
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveOrSharePng = async () => {
    const svgEl = qrWrapRef.current?.querySelector("svg");
    if (!svgEl || !data) return;

    setDownloadingPng(true);
    try {
      const refCode = data.id.slice(0, 8).toUpperCase();
      
      const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute("width", "720");
      clonedSvg.setAttribute("height", "720");
      
      const svgString = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      const qrPixelSize = 720; 
      const padding = 60;
      const footerHeight = 80;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = svgUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = qrPixelSize + padding * 2;
      canvas.height = qrPixelSize + padding * 2 + footerHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding, padding, qrPixelSize, qrPixelSize);

      ctx.fillStyle = "#06402B";
      ctx.font = "bold 42px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(refCode, canvas.width / 2, qrPixelSize + padding + 56);

      URL.revokeObjectURL(svgUrl);

      if (canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `cvmas-qr-${refCode}.png`, { type: "image/png" });
          try {
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: "CVMAS QR Ticket",
                text: `My CVMAS Registration Code: ${refCode}`,
                files: [file]
              });
            } else {
              triggerDownload(canvas.toDataURL("image/png"), refCode);
            }
          } catch (shareError: any) {
            if (shareError.name !== "AbortError") {
              triggerDownload(canvas.toDataURL("image/png"), refCode);
            }
          }
        }, "image/png");
      } else {
        triggerDownload(canvas.toDataURL("image/png"), refCode);
      }
    } catch (err) {
      console.error("Failed to generate image:", err);
      alert("Failed to generate image. Please try taking a screenshot instead.");
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

      <div className="relative z-10">

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
              <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-sm inline-block">
                <QRCode
                  value={qrValue}
                  size={180}
                  level="H"
                  fgColor="#06402B"
                  bgColor="#ffffff"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
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
                  title="Copy Code"
                >
                  {copied ? <FaCheckCircle className="text-[#06402B] dark:text-emerald-400" /> : <FaCopy />}
                </button>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl print:bg-transparent print:border-zinc-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse print:animate-none print:bg-zinc-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 print:text-zinc-600">
                Pre-registered
              </span>
            </div>

            <div className="space-y-2 text-left border-t border-zinc-100 dark:border-zinc-800 pt-4 print:border-zinc-300">
              <DetailRow icon={<FaUser size={10} />} label="Name" value={data.fullName} />
              <DetailRow icon={<FaIdCard size={10} />} label="ID Number" value={data.idNumber} />
              <DetailRow icon={<FaCalendarAlt size={10} />} label="Program & Year" value={`${data.program} · ${data.yearLevel}`} />
              <DetailRow icon={<span className="text-[9px] font-black">BLK</span>} label="Block" value={data.block} />
            </div>

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

          <div className="flex gap-3 print:hidden">
            <button
              onClick={handleSaveOrSharePng}
              disabled={downloadingPng}
              className="flex-1 py-3.5 bg-[#06402B] dark:bg-emerald-600 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 touch-manipulation"
            >
              {downloadingPng ? (
                <><FaSpinner size={11} className="animate-spin" /> Saving…</>
              ) : (
                <>{canShare ? <FaShareSquare size={11} /> : <FaImage size={11} />} {canShare ? "Share Ticket" : "Save as PNG"}</>
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 py-3.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:text-[#06402B] dark:hover:text-emerald-400 hover:border-[#06402B]/30 transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation shadow-sm"
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
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-amber-500/20"
            >
              Self Check-Out <FaSignOutAlt size={13} />
            </Link>
            <p className="text-center text-[10px] text-zinc-400 mt-3 pb-4">
              Tap here at the end of the seminar to record your attendance.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 print:text-black">
      <span className="text-zinc-400 mt-0.5 shrink-0 print:text-zinc-600">{icon}</span>
      <div className="min-w-0">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 print:text-zinc-500">{label}: </span>
        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 print:text-black">{value}</span>
      </div>
    </div>
  );
}