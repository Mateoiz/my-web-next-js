// app/admin/registrations/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaQrcode, FaUsers, FaCheckCircle, FaHourglass,
  FaSearch, FaDownload, FaSpinner, FaSync, FaSort,
  FaSortUp, FaSortDown, FaCircle
} from "react-icons/fa";

import FloatingCubes from "@/app/components/FloatingCubes";
import CircuitCursor from "@/app/components/CircuitCursor";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfessorEntry {
  professor: string;
  subject: string;
  block: string;
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
  status: "pre-registered" | "attendee";
  createdAt: any; // Firestore Timestamp
  checkedInAt?: any; // Firestore Timestamp
}

type SortKey = "fullName" | "idNumber" | "program" | "status" | "createdAt";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Safely resolves Firestore timestamps (even pending local ones) into JS Dates
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

// Prevents CSV injection attacks (Excel evaluating strings starting with =, +, -, @)
function escapeCSV(str: string): string {
  if (!str) return '""';
  let escaped = String(str).replace(/"/g, '""');
  if (escaped.match(/^[=\+\-@]/)) {
    escaped = "'" + escaped;
  }
  return `"${escaped}"`;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pre-registered" | "attendee">("all");
  const [profFilter, setProfFilter] = useState("all");
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "createdAt", direction: "desc" });

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Realtime listener
  useEffect(() => {
    const q = query(collection(db, "cvmas_registrations"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRegistrations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Registration)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Unique professors list for the dropdown filter
  const allProfessors = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach((r) => r.professors?.forEach((p) => set.add(p.professor)));
    return Array.from(set).sort();
  }, [registrations]);

  // Filter & Sort Logic
  const filteredAndSorted = useMemo(() => {
    let result = registrations.filter((r) => {
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

    result.sort((a, b) => {
      let valA: any = a[sortConfig.key];
      let valB: any = b[sortConfig.key];

      // Handle timestamps for sorting
      if (sortConfig.key === "createdAt") {
        valA = resolveDate(a.createdAt)?.getTime() || 0;
        valB = resolveDate(b.createdAt)?.getTime() || 0;
      }

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [registrations, statusFilter, profFilter, search, sortConfig]);

  const totalAttendees = registrations.filter((r) => r.status === "attendee").length;
  const totalPre = registrations.filter((r) => r.status === "pre-registered").length;

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  // Export to Secure CSV
  const exportCSV = useCallback(() => {
    const headers = [
      "Reference Code", "Full Name", "ID Number", "Program",
      "Year Level", "Student Type", "Block", "Status",
      "Registered At", "Checked In At", "Professors"
    ];
    
    const rows = filteredAndSorted.map((r) => [
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
      r.professors?.map((p) => `${p.professor} (${p.subject} · ${p.block})`).join(" | ") ?? "",
    ]);
    
    const csv = [headers, ...rows].map((row) => row.map(escapeCSV).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CVMAS_Registrations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAndSorted]);

  // Safely serialize and Sync to Google Sheets
  const syncToSheets = async () => {
    setIsSyncing(true);
    setSyncStatus("idle");
    
    // STRICT SERIALIZATION: Ensure timestamps don't break JSON.stringify
    const safePayload = registrations.map(r => ({
      ...r,
      createdAt: resolveDate(r.createdAt)?.toISOString() || null,
      checkedInAt: resolveDate(r.checkedInAt)?.toISOString() || null,
    }));

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

      {/* Ambient background layer */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[5%] left-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl opacity-20" />
        <div className="absolute inset-0 opacity-15"><FloatingCubes /></div>
      </div>

      <div className="hidden md:block"><CircuitCursor /></div>

      <div className="relative z-10">

        {/* Header */}
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
            
            {/* Sync Button in Header */}
            <div className="relative z-10 w-full md:w-auto flex flex-col items-end">
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
                <p className="text-[9px] text-emerald-200 mt-2 font-mono opacity-80 text-center w-full md:text-right">
                  Last synced: {lastSynced.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none z-0" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pt-5 space-y-5 pb-20">

          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Total Registrations", value: registrations.length, color: "text-zinc-900 dark:text-zinc-100", bg: "bg-white dark:bg-zinc-900", icon: <FaQrcode size={16} /> },
              { label: "Checked In", value: totalAttendees, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: <FaCheckCircle size={16} /> },
              { label: "Pending", value: totalPre, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", icon: <FaHourglass size={16} /> },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex items-center justify-between shadow-sm`}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{s.label}</p>
                  <p className={`text-3xl font-black leading-none ${s.color}`}>{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.color.replace('text-', 'bg-').split(' ')[0]}/10 ${s.color}`}>
                  {s.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Attendance progress bar */}
          {registrations.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Live Attendance Rate</span>
                <span className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                  {Math.round((totalAttendees / registrations.length) * 100)}%
                </span>
              </div>
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${(totalAttendees / registrations.length) * 100}%` }} transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          )}

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
              <div className="flex bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1">
                {(["all", "pre-registered", "attendee"] as const).map((f) => (
                  <button
                    key={f} onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      statusFilter === f ? "bg-[#06402B] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    {f === "all" ? "All" : f === "pre-registered" ? "Pending" : "Attended"}
                  </button>
                ))}
              </div>

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
                      <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                      <SortableHeader label="Registered" sortKey="createdAt" currentSort={sortConfig} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 relative z-0">
                    <AnimatePresence>
                      {filteredAndSorted.map((r) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group"
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
                                {/* Tooltip for extra professors */}
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
                            <StatusBadge status={r.status} checkedInAt={r.checkedInAt} />
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap">{formatTime(r.createdAt)}</span>
                          </td>
                        </motion.tr>
                      ))}
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

function StatusBadge({ status, checkedInAt }: { status: string, checkedInAt?: any }) {
  const isAttended = status === "attendee";
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${
        isAttended
          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
          : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
      }`}>
        {isAttended ? <FaCheckCircle size={10} /> : <FaCircle size={6} className="animate-pulse" />}
        {isAttended ? "Attended" : "Pending"}
      </span>
      {isAttended && checkedInAt && (
        <span className="text-[9px] font-mono text-zinc-400 whitespace-nowrap">
          {formatTime(checkedInAt).split(',')[1]} {/* Just show the time */}
        </span>
      )}
    </div>
  );
}