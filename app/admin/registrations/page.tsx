"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaQrcode, FaUsers, FaCheckCircle, FaHourglass,
  FaSearch, FaDownload, FaSpinner, FaSync, FaSort,
  FaSortUp, FaSortDown, FaCircle, FaClock, FaIdBadge,
  FaWalking, FaBan, FaSignOutAlt, FaMicrophone, FaChevronDown, FaChevronUp,
} from "react-icons/fa";

import FloatingCubes from "@/app/components/FloatingCubes";
import CircuitCursor from "@/app/components/CircuitCursor";
import { SEMINAR_OPTIONS } from "@/lib/seminars";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfessorEntry {  
  professor: string;
  subject: string;
  block: string;
}

interface SeminarAttendance {
  checkedInAt: any;
  checkedOutAt?: any;
  status: "checked-in" | "checked-out";
  checkedInBy?: string;
}

interface Registration {
  id: string;
  fullName: string;
  idNumber: string;
  program: string;
  yearLevel: string;
  studentType: "regular" | "irregular";
  block: string;
  professors: ProfessorEntry[];
  status: "pre-registered" | "attendee" | "invalid";
  createdAt: any;
  seminars: string[];
  
  // New nested attendance structure
  seminarAttendance?: Record<string, SeminarAttendance>;
  
  // Legacy / Break management
  onBreak?: boolean;
  breakStartedAt?: any;
  breakCount?: number;
}

type SortKey = "fullName" | "idNumber" | "program" | "status" | "createdAt" | "totalSeminarsAttended";
type StatusFilter = "all" | "pre-registered" | "attendee" | "invalid";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

function formatTime(ts: any): string {
  const d = resolveDate(ts);
  if (!d) return "—";
  return d.toLocaleString("en-PH", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function calculateMinutes(start: any, end: any): number | null {
  const s = resolveDate(start);
  const e = resolveDate(end);
  if (!s || !e) return null;
  return Math.round((e.getTime() - s.getTime()) / 60000);
}

function formatDuration(minutes?: number | null): string {
  if (minutes === undefined || minutes === null || isNaN(minutes)) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function escapeCSV(str: string): string {
  if (!str) return '""';
  let escaped = String(str).replace(/"/g, '""');
  if (escaped.match(/^[=\+\-@]/)) {
    escaped = "'" + escaped;
  }
  return `"${escaped}"`;
}

function formatIdInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  let f = digits.slice(0, 12);
  if (f.length > 6) f = `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6)}`;
  else if (f.length > 4) f = `${f.slice(0, 4)}-${f.slice(4)}`;
  return f;
}

// ─── Computed Data Helpers ────────────────────────────────────────────────────

function getActiveSeminar(registration: Registration) {
  if (!registration.seminarAttendance) return null;
  for (const [seminarId, att] of Object.entries(registration.seminarAttendance)) {
    if (att.status === "checked-in") {
      return {
        id: seminarId,
        title: SEMINAR_OPTIONS.find(s => s.id === seminarId)?.title || "Unknown Seminar",
        checkedInAt: att.checkedInAt
      };
    }
  }
  return null;
}

function getTotalSeminarsAttended(registration: Registration) {
  if (!registration.seminarAttendance) return 0;
  return Object.keys(registration.seminarAttendance).length;
}

// ─── Live Timer Component for Breaks ──────────────────────────────────────────
function BreakTimer({ breakStartedAt }: { breakStartedAt: any }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const start = resolveDate(breakStartedAt);
    if (!start) return;

    const interval = setInterval(() => {
      const diffSecs = Math.floor((Date.now() - start.getTime()) / 1000);
      const m = Math.floor(diffSecs / 60).toString().padStart(2, "0");
      const s = (diffSecs % 60).toString().padStart(2, "0");
      setElapsed(`${m}:${s}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [breakStartedAt]);

  return <span className="font-mono tabular-nums">{elapsed || "00:00"}</span>;
}

// ─── Session History Panel (Instant inline read now) ──────────────────────────
function SessionHistoryPanel({ registration }: { registration: Registration }) {
  const attendance = registration.seminarAttendance || {};
  const sessions = Object.entries(attendance).map(([id, att]) => ({
    id,
    title: SEMINAR_OPTIONS.find(s => s.id === id)?.title || "Unknown Seminar",
    ...att,
    minutesAttended: calculateMinutes(att.checkedInAt, att.checkedOutAt)
  })).sort((a, b) => (resolveDate(b.checkedInAt)?.getTime() || 0) - (resolveDate(a.checkedInAt)?.getTime() || 0));

  if (sessions.length === 0) {
    return <p className="py-4 text-center text-xs text-zinc-400 font-medium">No seminar sessions recorded yet.</p>;
  }

  return (
    <div className="py-3 space-y-2">
      {sessions.map(s => (
        <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{s.title}</p>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
              {formatTime(s.checkedInAt)} → {s.checkedOutAt ? formatTime(s.checkedOutAt) : "still inside"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {s.checkedOutAt ? (
              <span className="text-[10px] font-bold text-zinc-500">{formatDuration(s.minutesAttended)}</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                <FaCircle size={5} className="animate-pulse" /> Live
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [seminarFilter, setSeminarFilter] = useState("all");
  const [profFilter, setProfFilter] = useState("all");

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "createdAt", direction: "desc" });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const [breakId, setBreakId] = useState("");
  const [breakActionStatus, setBreakActionStatus] = useState<{ msg: string; type: "error"|"success" } | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "cvmas_registrations"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRegistrations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ─── 15 MINUTE RULE AUTOMATION ──────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      registrations.forEach(async (r) => {
        if (r.onBreak && r.breakStartedAt && r.status !== "invalid") {
          const breakStart = resolveDate(r.breakStartedAt);
          if (breakStart) {
            const diffMins = (now.getTime() - breakStart.getTime()) / 60000;
            if (diffMins >= 15) {
              try {
                await updateDoc(doc(db, "cvmas_registrations", r.id), {
                  onBreak: false,
                  status: "invalid",
                });
              } catch (e) { console.error("Auto-invalidate failed", e); }
            }
          }
        }
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [registrations]);

  const handleBreakAction = async (type: "out" | "in") => {
    const cleanId = breakId.trim();
    if (cleanId.length < 14) {
      setBreakActionStatus({ msg: "Incomplete ID.", type: "error" });
      return;
    }

    const student = registrations.find(r => r.idNumber === cleanId);
    if (!student) {
      setBreakActionStatus({ msg: "Student not found.", type: "error" });
      return;
    }
    if (student.status === "invalid") {
      setBreakActionStatus({ msg: "Student is marked invalid (cut).", type: "error" });
      return;
    }
    
    const activeSem = getActiveSeminar(student);
    
    if (type === "out" && !activeSem) {
      setBreakActionStatus({ msg: "Student is not currently inside a seminar.", type: "error" });
      return;
    }

    try {
      if (type === "out") {
        if (student.onBreak) {
          setBreakActionStatus({ msg: "Already on break.", type: "error" });
          return;
        }
        await updateDoc(doc(db, "cvmas_registrations", student.id), {
          onBreak: true,
          breakStartedAt: serverTimestamp(),
          breakCount: increment(1)
        });
        setBreakActionStatus({ msg: "Pass Issued. Break started.", type: "success" });
      } else {
        if (!student.onBreak) {
          setBreakActionStatus({ msg: "Student is not on break.", type: "error" });
          return;
        }
        await updateDoc(doc(db, "cvmas_registrations", student.id), {
          onBreak: false,
          breakStartedAt: null,
        });
        setBreakActionStatus({ msg: "ID Returned. Break ended.", type: "success" });
      }
      setBreakId("");
      setTimeout(() => setBreakActionStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setBreakActionStatus({ msg: "Failed to update.", type: "error" });
    }
  };

  const allProfessors = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach((r) => r.professors?.forEach((p) => set.add(p.professor)));
    return Array.from(set).sort();
  }, [registrations]);

  // Live headcount per seminar computed from nested data
  const seminarOccupancy = useMemo(() => {
    return SEMINAR_OPTIONS.map(sem => ({
      ...sem,
      count: registrations.filter(r => r.seminarAttendance?.[sem.id]?.status === "checked-in").length,
    }));
  }, [registrations]);

  const filteredAndSorted = useMemo(() => {
    let result = registrations.filter((r) => {
      const activeSem = getActiveSeminar(r);
      
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      
      if (seminarFilter !== "all") {
        if (seminarFilter === "not-in-seminar") {
          if (activeSem) return false;
        } else if (!activeSem || activeSem.id !== seminarFilter) {
          return false;
        }
      }
      
      if (profFilter !== "all" && !r.professors?.some((p) => p.professor === profFilter)) return false;
      const q = search.toLowerCase();
      if (q) {
        return (
          r.fullName.toLowerCase().includes(q) ||
          r.idNumber.toLowerCase().includes(q) ||
          r.program.toLowerCase().includes(q) ||
          r.block.toLowerCase().includes(q)
        );
      }
      return true;
    });

    result.sort((a, b) => {
let valA: any = (a as any)[sortConfig.key];
let valB: any = (b as any)[sortConfig.key];
      if (sortConfig.key === "createdAt") {
        valA = resolveDate(a.createdAt)?.getTime() || 0;
        valB = resolveDate(b.createdAt)?.getTime() || 0;
      }
      if (sortConfig.key === "totalSeminarsAttended") {
        valA = getTotalSeminarsAttended(a);
        valB = getTotalSeminarsAttended(b);
      }

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [registrations, statusFilter, seminarFilter, profFilter, search, sortConfig]);

  const totalEverAttended = registrations.filter((r) => getTotalSeminarsAttended(r) > 0).length;
  const totalPre = registrations.filter((r) => r.status === "pre-registered").length;
  const totalOnBreak = registrations.filter((r) => r.onBreak).length;
  const currentlyInSeminar = registrations.filter((r) => getActiveSeminar(r) !== null).length;

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const exportCSV = useCallback(() => {
    const headers = [
      "Reference Code", "Full Name", "ID Number", "Program",
      "Year Level", "Student Type", "Block", "Status", "Currently In Seminar",
      "Total Seminars Attended", "Break Status", "Total Breaks Taken",
      "Registered At", "Professors"
    ];

    const rows = filteredAndSorted.map((r) => {
      const activeSem = getActiveSeminar(r);
      return [
        r.id.slice(0, 8).toUpperCase(),
        r.fullName,
        r.idNumber,
        r.program,
        r.yearLevel,
        r.studentType,
        r.block,
        r.status.toUpperCase(),
        activeSem ? activeSem.title : "—",
        getTotalSeminarsAttended(r).toString(),
        r.onBreak ? "ON BREAK" : "—",
        (r.breakCount || 0).toString(),
        formatTime(r.createdAt),
        r.professors?.map((p) => `${p.professor} (${p.subject} · ${p.block})`).join(" | ") ?? "",
      ]
    });

    const csv = [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CVMAS_Registrations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAndSorted]);

  const exportSessionsCSV = useCallback(async () => {
    setIsSyncing(true);
    try {
      const headers = ["Full Name", "ID Number", "Seminar", "Checked In At", "Checked Out At", "Minutes Attended"];
      const rows: string[][] = [];

      for (const r of registrations) {
        if (!r.seminarAttendance) continue;
        for (const sem of SEMINAR_OPTIONS) {
          const att = r.seminarAttendance[sem.id];
          if (att) {
            rows.push([
              r.fullName,
              r.idNumber,
              sem.title,
              formatTime(att.checkedInAt),
              att.checkedOutAt ? formatTime(att.checkedOutAt) : "still inside",
              calculateMinutes(att.checkedInAt, att.checkedOutAt)?.toString() ?? "",
            ]);
          }
        }
      }

      const csv = [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CVMAS_Seminar_Sessions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export session history.");
    } finally {
      setIsSyncing(false);
    }
  }, [registrations]);

  const syncToSheets = async () => {
    setIsSyncing(true);
    setSyncStatus("idle");

    // Make safe payloads with ISO strings
    const safePayload = registrations.map(r => {
      const safeAtt: any = {};
      if (r.seminarAttendance) {
        for (const [k, v] of Object.entries(r.seminarAttendance)) {
          safeAtt[k] = {
            ...v,
            checkedInAt: resolveDate(v.checkedInAt)?.toISOString() || null,
            checkedOutAt: resolveDate(v.checkedOutAt)?.toISOString() || null,
          };
        }
      }
      return {
        ...r,
        createdAt: resolveDate(r.createdAt)?.toISOString() || null,
        seminarAttendance: safeAtt,
      };
    });

    try {
      const res = await fetch("/api/sync-to-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrations: safePayload }),
      });

      if (res.ok) {
        setSyncStatus("success");
        setLastSynced(new Date());
        setTimeout(() => setSyncStatus("idle"), 3000);
      } else {
        throw new Error("API returned non-200");
      }
    } catch (err) {
      console.error("Sheets Sync Error:", err);
      setSyncStatus("error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black relative overflow-hidden font-sans selection:bg-emerald-500/30">

      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[5%] left-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl opacity-20" />
        <div className="absolute inset-0 opacity-15"><FloatingCubes /></div>
      </div>

      <div className="hidden md:block"><CircuitCursor /></div>

      <div className="relative z-10">

        <div className="pt-24 md:pt-28 px-4">
          <div className="max-w-7xl mx-auto relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-[#06402B] text-white px-6 py-6 md:py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-emerald-300">Live Database</p>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2">
                <FaUsers /> CVMAS Dashboard
              </h1>
            </div>

            <div className="relative z-10 w-full md:w-auto flex flex-col md:flex-row items-stretch md:items-end gap-2">
              <button
                onClick={exportSessionsCSV}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
              >
                <FaDownload size={13} /> Export Session History
              </button>
              <div className="flex flex-col items-end">
                <button
                  onClick={syncToSheets}
                  disabled={isSyncing}
                  className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                    syncStatus === "success" ? "bg-emerald-500 text-white"
                    : syncStatus === "error" ? "bg-red-500 text-white"
                    : "bg-white text-[#06402B] hover:bg-emerald-50"
                  }`}
                >
                  {isSyncing ? <FaSpinner className="animate-spin" size={14} /> : <FaSync size={14} />}
                  {syncStatus === "success" ? "Synced Successfully" : syncStatus === "error" ? "Sync Failed" : "Push to Google Sheets"}
                </button>
                {lastSynced && (
                  <p className="text-[9px] text-emerald-200 mt-2 font-mono opacity-80 text-right">
                    Last synced: {lastSynced.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none z-0" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-5 space-y-5 pb-20">

          {/* Live Seminar Occupancy */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-black flex items-center gap-2 text-zinc-900 dark:text-white mb-4">
              <FaMicrophone className="text-[#06402B] dark:text-emerald-400" /> Live Seminar Occupancy
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {seminarOccupancy.map(sem => (
                <button
                  key={sem.id}
                  onClick={() => setSeminarFilter(seminarFilter === sem.id ? "all" : sem.id)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    seminarFilter === sem.id
                      ? "border-[#06402B] bg-[#06402B]/5 dark:border-emerald-500 dark:bg-emerald-500/10"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <p className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{sem.count}</p>
                  <p className="text-[10px] font-bold text-zinc-500 mt-1.5 leading-snug line-clamp-2">{sem.title}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-4">

            <div className="xl:w-1/3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-black flex items-center gap-2 text-zinc-900 dark:text-white">
                    <FaWalking className="text-amber-500" /> CR Break Manager
                  </h2>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Auto-cuts attendee if gone for &gt; 15 mins</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                  {totalOnBreak}
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <FaIdBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={12} />
                  <input
                    type="text" value={breakId} onChange={e => setBreakId(formatIdInput(e.target.value))}
                    placeholder="20XX-XX-XXXXXX" maxLength={14}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm font-mono font-bold tracking-widest text-zinc-900 dark:text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleBreakAction("out")} disabled={breakId.length < 14} className="flex-1 bg-amber-500 hover:bg-amber-400 text-white rounded-xl py-2 text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95 shadow-sm">
                    Issue Pass
                  </button>
                  <button onClick={() => handleBreakAction("in")} disabled={breakId.length < 14} className="flex-1 bg-[#06402B] hover:bg-[#08553a] text-white rounded-xl py-2 text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all active:scale-95 shadow-sm">
                    Return ID
                  </button>
                </div>
                {breakActionStatus && (
                  <p className={`text-[10px] font-bold text-center mt-1 ${breakActionStatus.type === "error" ? "text-red-500" : "text-emerald-500"}`}>
                    {breakActionStatus.msg}
                  </p>
                )}
              </div>
            </div>

            <div className="xl:w-2/3 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Registrations", value: registrations.length, color: "text-zinc-900 dark:text-zinc-100", bg: "bg-white dark:bg-zinc-900", icon: <FaQrcode size={16} /> },
                { label: "In A Seminar Now", value: currentlyInSeminar, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: <FaCheckCircle size={16} /> },
                { label: "Ever Attended", value: totalEverAttended, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10", icon: <FaSignOutAlt size={16} /> },
                { label: "Pending", value: totalPre, color: "text-zinc-500 dark:text-zinc-400", bg: "bg-zinc-50 dark:bg-zinc-800/50", icon: <FaHourglass size={16} /> },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col justify-between shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{s.label}</p>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.color.replace('text-', 'bg-').split(' ')[0]}/10 ${s.color}`}>
                      {s.icon}
                    </div>
                  </div>
                  <p className={`text-4xl font-black leading-none ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

          </div>

          {/* Toolbar (Search & Filters) */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <FaSearch size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID number, or block..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:border-[#06402B] dark:focus:border-emerald-500 font-medium transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex flex-wrap bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
                {(["all", "pre-registered", "attendee", "invalid"] as const).map((f) => (
                  <button
                    key={f} onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      statusFilter === f ? "bg-[#06402B] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    {f === "all" ? "All" : f === "pre-registered" ? "Pending" : f === "attendee" ? "Ever Attended" : "Cut/Invalid"}
                  </button>
                ))}
              </div>

              <select
                value={seminarFilter} onChange={(e) => setSeminarFilter(e.target.value)}
                className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 outline-none focus:border-[#06402B] dark:focus:border-emerald-500"
              >
                <option value="all">Any Seminar Status</option>
                <option value="not-in-seminar">Not In A Seminar Right Now</option>
                {SEMINAR_OPTIONS.map((s) => <option key={s.id} value={s.id}>Currently In: {s.title}</option>)}
              </select>

              <select
                value={profFilter} onChange={(e) => setProfFilter(e.target.value)}
                className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 outline-none focus:border-[#06402B] dark:focus:border-emerald-500"
              >
                <option value="all">All Professors</option>
                {allProfessors.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>

              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors active:scale-95"
              >
                <FaDownload size={12} /> Export CSV
              </button>
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
              <FaSpinner className="animate-spin text-[#06402B] dark:text-emerald-400" size={32} />
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading Database...</p>
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white/50 dark:bg-zinc-900/50">
              <FaUsers size={40} className="mx-auto mb-4 text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm font-black uppercase tracking-widest text-zinc-500">No registrations found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm flex flex-col max-h-[800px]">
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-20 bg-zinc-50/95 dark:bg-[#111113]/95 backdrop-blur-md shadow-sm">
                    <tr>
                      <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">Ref Code</th>
                      <SortableHeader label="Student Name" sortKey="fullName" currentSort={sortConfig} onSort={handleSort} />
                      <SortableHeader label="ID Number" sortKey="idNumber" currentSort={sortConfig} onSort={handleSort} />
                      <SortableHeader label="Program" sortKey="program" currentSort={sortConfig} onSort={handleSort} />
                      <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">Professors</th>
                      <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">Current Seminar</th>
                      <SortableHeader label="Sessions" sortKey="totalSeminarsAttended" currentSort={sortConfig} onSort={handleSort} />
                      <SortableHeader label="Registered" sortKey="createdAt" currentSort={sortConfig} onSort={handleSort} />
                      <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 dark:border-zinc-800" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 relative z-0">
                    <AnimatePresence>
                      {filteredAndSorted.map((r) => {
                        const activeSem = getActiveSeminar(r);
                        return (
                          <React.Fragment key={r.id}>
                            <motion.tr
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className={`transition-colors group ${r.status === 'invalid' ? 'bg-red-50/50 dark:bg-red-900/10' : activeSem ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'}`}
                            >
                              <td className="px-5 py-3">
                                <span className="font-mono text-[11px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                  {r.id.slice(0, 8).toUpperCase()}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{r.fullName}</p>
                                <p className="text-[10px] font-medium text-zinc-500 mt-0.5 capitalize">{r.studentType} Student</p>
                              </td>
                              <td className="px-5 py-3">
                                <span className="font-mono text-xs font-medium text-zinc-600 dark:text-zinc-400">{r.idNumber}</span>
                              </td>
                              <td className="px-5 py-3">
                                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{r.program}</p>
                                <p className="text-[10px] font-medium text-zinc-500">{r.yearLevel} · {r.block}</p>
                              </td>
                              <td className="px-5 py-3 max-w-[200px]">
                                {r.professors?.length > 0 ? (
                                  <div className="relative group/tooltip inline-block w-full">
                                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 truncate cursor-help border-b border-dashed border-zinc-300 dark:border-zinc-700 pb-0.5">
                                      {r.professors[0].professor} {r.professors.length > 1 && <span className="text-emerald-500 font-bold ml-1">+{r.professors.length - 1}</span>}
                                    </p>
                                    {r.professors.length > 1 && (
                                      <div className="absolute left-0 bottom-full mb-2 w-max max-w-[300px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-[10px] rounded-xl p-3 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                                        <ul className="space-y-1.5">
                                          {r.professors.map((p, i) => (
                                            <li key={i} className="font-medium"><strong className="font-black">{p.professor}</strong> — {p.subject} ({p.block})</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ) : <span className="text-zinc-400 text-xs">—</span>}
                              </td>
                              <td className="px-5 py-3">
                                <CurrentSeminarBadge
                                  status={r.status}
                                  isCheckedIn={!!activeSem}
                                  currentSeminarTitle={activeSem?.title}
                                  currentCheckedInAt={activeSem?.checkedInAt}
                                  onBreak={r.onBreak}
                                  breakStartedAt={r.breakStartedAt}
                                  breakCount={r.breakCount}
                                />
                              </td>
                              <td className="px-5 py-3">
                                <span className="text-sm font-black text-zinc-700 dark:text-zinc-300">{getTotalSeminarsAttended(r)}</span>
                              </td>
                              <td className="px-5 py-3">
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap">{formatTime(r.createdAt)}</span>
                              </td>
                              <td className="px-5 py-3">
                                <button
                                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                                  className="p-2 rounded-lg text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                  title="View seminar session history"
                                >
                                  {expandedId === r.id ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                                </button>
                              </td>
                            </motion.tr>
                            {expandedId === r.id && (
                              <tr>
                                <td colSpan={9} className="px-5 pb-3 bg-zinc-50/50 dark:bg-zinc-950/50">
                                  <SessionHistoryPanel registration={r} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              <div className="bg-zinc-50 dark:bg-[#111113] border-t border-zinc-200 dark:border-zinc-800 px-5 py-3 text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Showing {filteredAndSorted.length} of {registrations.length} Entries
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SortableHeader({ label, sortKey, currentSort, onSort }: { label: string, sortKey: SortKey, currentSort: { key: string, direction: string }, onSort: (k: SortKey) => void }) {
  const isActive = currentSort.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors select-none group"
    >
      <div className="flex items-center gap-1.5">
        <span className={`transition-colors ${isActive ? 'text-zinc-800 dark:text-zinc-200' : 'group-hover:text-zinc-600 dark:group-hover:text-zinc-300'}`}>{label}</span>
        <span className="text-[10px]">
          {isActive
            ? (currentSort.direction === "asc" ? <FaSortUp className="text-emerald-500" /> : <FaSortDown className="text-emerald-500" />)
            : <FaSort className="opacity-0 group-hover:opacity-50 transition-opacity" />
          }
        </span>
      </div>
    </th>
  );
}

function CurrentSeminarBadge({
  status, isCheckedIn, currentSeminarTitle, currentCheckedInAt, onBreak, breakStartedAt, breakCount,
}: {
  status: string; isCheckedIn?: boolean; currentSeminarTitle?: string | null; currentCheckedInAt?: any;
  onBreak?: boolean; breakStartedAt?: any; breakCount?: number;
}) {
  if (status === "invalid") {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20">
          <FaBan size={10} /> Cut Seminar
        </div>
        {!!breakCount && (
          <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            Breaks taken: {breakCount}
          </span>
        )}
      </div>
    );
  }

  if (onBreak) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20">
          <FaWalking size={10} /> On Break
        </span>
        <span className="text-[9px] font-mono text-amber-600 dark:text-amber-500 flex items-center gap-1">
          <FaClock size={8} /> <BreakTimer breakStartedAt={breakStartedAt} />
        </span>
      </div>
    );
  }

  if (isCheckedIn) {
    return (
      <div className="flex flex-col items-start gap-1 max-w-[180px]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20">
          <FaCircle size={6} className="animate-pulse" /> In Seminar
        </span>
        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-2">{currentSeminarTitle}</span>
        {currentCheckedInAt && (
          <span className="text-[9px] font-mono text-zinc-400">since {formatTime(currentCheckedInAt).split(',')[1]}</span>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700">
      <FaCircle size={6} /> Not In A Seminar
    </span>
  );
}

// React.Fragment import needed for the table row grouping above