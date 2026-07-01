// app/admin/registrations/page.tsx
// Piece 4: Admin dashboard — live attendee list + Google Sheets export
// ─────────────────────────────────────────────────────────────────────────────
// SETUP:
//   1. Wrap this route with your existing admin auth check (role === "admin")
//   2. For real-time Sheets sync, set up the API route below this component
//      and add GOOGLE_SHEETS_WEBHOOK_URL to your .env
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection, query, orderBy, onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaQrcode, FaUsers, FaCheckCircle, FaHourglass,
  FaSearch, FaFilter, FaDownload, FaSpinner, FaSync,
} from "react-icons/fa";

import FloatingCubes from "@/app/components/FloatingCubes";
import CircuitCursor from "@/app/components/CircuitCursor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Registration {
  id: string;
  fullName: string;
  idNumber: string;
  program: string;
  yearLevel: string;
  studentType: "regular" | "irregular";
  block: string;
  professors: { professor: string; subject: string; block: string }[];
  status: "pre-registered" | "attendee";
  createdAt: any;
  checkedInAt?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: any): string {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-PH", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pre-registered" | "attendee">("all");
  const [profFilter, setProfFilter] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");

  // Realtime listener
  useEffect(() => {
    const q = query(
      collection(db, "cvmas_registrations"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setRegistrations(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration))
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // All unique professors across all registrations
  const allProfessors = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach((r) => r.professors?.forEach((p) => set.add(p.professor)));
    return Array.from(set).sort();
  }, [registrations]);

  // Filtered list
  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
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
  }, [registrations, statusFilter, profFilter, search]);

  const totalAttendees = registrations.filter((r) => r.status === "attendee").length;
  const totalPre = registrations.filter((r) => r.status === "pre-registered").length;

  // Export to CSV
  const exportCSV = () => {
    const headers = [
      "Reference Code", "Full Name", "ID Number", "Program",
      "Year Level", "Student Type", "Block", "Status",
      "Registered At", "Checked In At", "Professors"
    ];
    const rows = filtered.map((r) => [
      r.id.slice(0, 8).toUpperCase(),
      r.fullName,
      r.idNumber,
      r.program,
      r.yearLevel,
      r.studentType,
      r.block,
      r.status,
      formatTime(r.createdAt),
      formatTime(r.checkedInAt),
      r.professors?.map((p) => `${p.professor} (${p.subject} · ${p.block})`).join("; ") ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cvmas-registrations-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sync to Google Sheets via API route
  const syncToSheets = async () => {
    setIsSyncing(true);
    setSyncStatus("idle");
    try {
      const res = await fetch("/api/sync-to-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrations }),
      });
      setSyncStatus(res.ok ? "success" : "error");
    } catch {
      setSyncStatus("error");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black relative overflow-hidden font-sans selection:bg-green-500/30">

      {/* Ambient background layer — matches the rest of the site, kept faint behind the dense table */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[5%] left-[-10%] w-[400px] h-[400px] bg-green-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute inset-0 opacity-15">
          <FloatingCubes />
        </div>
      </div>

      <div className="hidden md:block">
        <CircuitCursor />
      </div>

      <div className="relative z-10">

        {/* Navbar clearance + header card */}
        <div className="pt-24 md:pt-28 px-4">
          <div className="max-w-6xl mx-auto relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-[#06402B] text-white px-5 py-6">
            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none" />
            <p className="relative text-[9px] font-mono tracking-[0.3em] uppercase text-emerald-300 mb-1">Admin · CVMAS Week</p>
            <h1 className="relative text-xl font-black tracking-tight flex items-center gap-2">
              <FaUsers size={18} /> Registrations
            </h1>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-5 space-y-5 pb-16">

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: registrations.length, color: "text-zinc-900 dark:text-zinc-100", bg: "bg-white dark:bg-zinc-900", icon: <FaQrcode size={14} /> },
              { label: "Attended", value: totalAttendees, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: <FaCheckCircle size={14} /> },
              { label: "Pending", value: totalPre, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", icon: <FaHourglass size={14} /> },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 text-center`}>
                <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
                <p className={`text-2xl font-black leading-none ${s.color}`}>{s.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Attendance rate bar */}
          {registrations.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Attendance rate</span>
                <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  {Math.round((totalAttendees / registrations.length) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalAttendees / registrations.length) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          )}

          {/* Filters + actions row */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <FaSearch size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID, block…"
                className="w-full pl-8 pr-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-[#06402B] dark:focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-1">
              {(["all", "pre-registered", "attendee"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    statusFilter === f
                      ? "bg-[#06402B] text-white border-transparent"
                      : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {f === "all" ? "All" : f === "pre-registered" ? "Pending" : "Attended"}
                </button>
              ))}
            </div>

            {/* Professor filter */}
            <select
              value={profFilter}
              onChange={(e) => setProfFilter(e.target.value)}
              className="py-2.5 px-3 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-700 dark:text-zinc-200 font-medium outline-none focus:border-[#06402B] dark:focus:border-emerald-500"
            >
              <option value="all">All professors</option>
              {allProfessors.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Export CSV */}
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 hover:border-[#06402B]/40 transition-all"
            >
              <FaDownload size={10} /> CSV
            </button>

            {/* Sync to Sheets */}
            <button
              onClick={syncToSheets}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                syncStatus === "success"
                  ? "bg-emerald-500 text-white border-transparent"
                  : syncStatus === "error"
                  ? "bg-red-500 text-white border-transparent"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-[#06402B]/40"
              }`}
            >
              {isSyncing
                ? <FaSpinner className="animate-spin" size={10} />
                : <FaSync size={10} />
              }
              {syncStatus === "success" ? "Synced!" : syncStatus === "error" ? "Failed" : "Sheets"}
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 flex justify-center">
              <FaSpinner className="animate-spin text-[#06402B] dark:text-emerald-400" size={24} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-400">
              <FaUsers size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-xs font-bold uppercase tracking-widest">No registrations found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      {["Ref", "Name", "ID", "Program", "Block", "Type", "Professors", "Status", "Registered", "Checked In"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-zinc-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filtered.map((r) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs font-black text-zinc-500">{r.id.slice(0, 8).toUpperCase()}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{r.fullName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">{r.idNumber}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{r.program} · {r.yearLevel}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">{r.block}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${
                              r.studentType === "regular"
                                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                : "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400"
                            }`}>
                              {r.studentType}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[160px]">
                            <div className="space-y-0.5">
                              {r.professors?.slice(0, 2).map((p, i) => (
                                <p key={i} className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{p.professor}</p>
                              ))}
                              {r.professors?.length > 2 && (
                                <p className="text-[10px] text-zinc-400">+{r.professors.length - 2} more</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] text-zinc-400 font-mono">{formatTime(r.createdAt)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] text-zinc-400 font-mono">{formatTime(r.checkedInAt)}</span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map((r) => (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{r.fullName}</p>
                        <p className="text-[10px] font-mono text-zinc-500">{r.idNumber} · {r.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold text-zinc-500">
                      <span>{r.program} {r.yearLevel}</span>
                      <span>·</span>
                      <span>{r.block}</span>
                      <span>·</span>
                      <span className="capitalize">{r.studentType}</span>
                    </div>
                    {r.professors?.length > 0 && (
                      <p className="text-[10px] text-zinc-400">{r.professors.map((p) => p.professor).join(", ")}</p>
                    )}
                    <p className="text-[9px] font-mono text-zinc-400">{formatTime(r.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-[10px] text-zinc-400">
            {filtered.length} of {registrations.length} registrations · Updates in real time
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
      status === "attendee"
        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "attendee" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
      {status === "attendee" ? "Attended" : "Pending"}
    </span>
  );
}