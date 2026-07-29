"use client";

import { useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/db";
import {
  FaUserEdit, FaSpinner, FaCheckCircle, FaExclamationTriangle,
  FaSearch, FaClock, FaIdBadge,
} from "react-icons/fa";
import { SEMINAR_OPTIONS, getRegisteredSeminarIds } from "@/lib/seminars";

// ─── Config ───────────────────────────────────────────────────────────────────
// Tune these to control how "spread out" the generated timings look.

const EVENT_DAY = "2026-07-14"; // the CVMAS event date, in local time
const DAY_START_HOUR = 9;        // earliest a session can start (9 AM)
const DAY_END_HOUR = 17.5;         // latest a session can end (5 PM)
const MIN_SESSION_MINUTES = 60;  // shortest plausible seminar duration
const MAX_SESSION_MINUTES = 140; // longest plausible seminar duration
const MIN_GAP_MINUTES = 4;       // minimum gap between sessions (walking time)
const MAX_GAP_MINUTES = 60;      // maximum gap between sessions (break time)

function formatIdInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  let f = digits.slice(0, 12);
  if (f.length > 6) f = `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6)}`;
  else if (f.length > 4) f = `${f.slice(0, 4)}-${f.slice(4)}`;
  return f;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toLocalISO(hour: number, minute: number) {
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `${EVENT_DAY}T${h}:${m}:00+08:00`;
}

interface GeneratedSession {
  id: string;
  title: string;
  checkedInAt: string;
  checkedOutAt: string;
}

interface PreviewData {
  docId: string;
  fullName: string;
  idNumber: string;
  registeredSeminarIds: string[];
  sessions: GeneratedSession[];
}

// ─── Generate a realistic, non-overlapping schedule ───────────────────────────

function generateSchedule(seminarIds: string[]): GeneratedSession[] {
  const sessions: GeneratedSession[] = [];
  let cursorMinutes = DAY_START_HOUR * 60 + randInt(0, 20); // small random start offset

  for (const id of seminarIds) {
    const title = SEMINAR_OPTIONS.find(s => s.id === id)?.title ?? id;
    const duration = randInt(MIN_SESSION_MINUTES, MAX_SESSION_MINUTES);
    const endMinutes = cursorMinutes + duration;

    // Stop scheduling if we'd run past the end of the day
    if (endMinutes > DAY_END_HOUR * 60) break;

    const startH = Math.floor(cursorMinutes / 60);
    const startM = cursorMinutes % 60;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;

    sessions.push({
      id,
      title,
      checkedInAt: toLocalISO(startH, startM),
      checkedOutAt: toLocalISO(endH, endM),
    });

    cursorMinutes = endMinutes + randInt(MIN_GAP_MINUTES, MAX_GAP_MINUTES);
  }

  return sessions;
}

export default function RepairAttendancePage() {
  const [idNumber, setIdNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "searching" | "preview" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const handleSearch = async () => {
    const cleanId = idNumber.trim();
    if (!cleanId) return;

    setStatus("searching");
    setMessage("");
    setPreview(null);

    try {
      const snap = await getDocs(query(collection(db, "cvmas_registrations"), where("idNumber", "==", cleanId)));
      if (snap.empty) {
        setStatus("error");
        setMessage(`No registration found for ID ${cleanId}.`);
        return;
      }

      const docSnap = snap.docs[0];
      const data = docSnap.data();
      const registeredIds = getRegisteredSeminarIds(data.seminars);

      if (registeredIds.length === 0) {
        setStatus("error");
        setMessage("This student has no registered seminars to repair — nothing to generate.");
        return;
      }

      const sessions = generateSchedule(registeredIds);

      setPreview({
        docId: docSnap.id,
        fullName: data.fullName ?? "Unknown",
        idNumber: data.idNumber ?? cleanId,
        registeredSeminarIds: registeredIds,
        sessions,
      });
      setStatus("preview");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message || "Failed to look up student.");
    }
  };

  const handleRegenerate = () => {
    if (!preview) return;
    setPreview({
      ...preview,
      sessions: generateSchedule(preview.registeredSeminarIds),
    });
  };

const handleApply = async () => {
    if (!preview) return;
    if (!window.confirm(`Overwrite attendance for ${preview.fullName}? This will apply the fixed schedule.`)) return;

    setStatus("saving");
    try {
      const docRef = doc(db, "cvmas_registrations", preview.docId);
      
      // Define the fixed schedule based on your specific requirements
      // The order here MUST match the order of the seminars in their registration
      const fixedSchedule = [
        { id: preview.registeredSeminarIds[0], start: "09:00", end: "11:10" },
        { id: preview.registeredSeminarIds[1], start: "11:30", end: "13:00" },
        { id: preview.registeredSeminarIds[2], start: "13:10", end: "15:40" },
        { id: preview.registeredSeminarIds[3], start: "15:40", end: "17:10" }
      ];

      const attendanceMap: Record<string, any> = {};
      
      fixedSchedule.forEach(s => {
        if (!s.id) return;
        attendanceMap[s.id] = {
          status: "checked-out",
          checkedInBy: "admin-repair",
          checkedInAt: new Date(`${EVENT_DAY}T${s.start}:00+08:00`),
          checkedOutAt: new Date(`${EVENT_DAY}T${s.end}:00+08:00`),
        };
      });

      await updateDoc(docRef, {
        status: "attendee",
        lastCheckedInAt: new Date(`${EVENT_DAY}T${fixedSchedule[fixedSchedule.length - 1].start}:00+08:00`),
        seminars: preview.registeredSeminarIds, 
        seminarAttendance: attendanceMap,
      });

      setStatus("success");
      setMessage(`Repaired attendance for ${preview.fullName} using fixed schedule.`);
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err?.message || "Failed to update document.");
    }
  };

  const reset = () => {
    setIdNumber("");
    setPreview(null);
    setStatus("idle");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div>
          <h1 className="text-xl font-black text-white mb-2 flex items-center gap-2">
            <FaUserEdit className="text-amber-500" /> Attendance Repair Tool
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Enter an ID number to generate realistic, non-overlapping check-in/check-out
            times for every seminar that student registered for. Useful for fixing corrupted
            or missing attendance records.
          </p>
        </div>

        {/* ID search */}
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Student ID Number
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FaIdBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={12} />
              <input
                type="text"
                value={idNumber}
                onChange={e => setIdNumber(formatIdInput(e.target.value))}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="20XX-XX-XXXXXX"
                maxLength={14}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-3 text-sm font-mono font-bold tracking-widest text-white outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={status === "searching" || idNumber.trim().length < 14}
              className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-40 transition-all flex items-center gap-2"
            >
              {status === "searching" ? <FaSpinner className="animate-spin" size={12} /> : <FaSearch size={12} />}
            </button>
          </div>
        </div>

        {/* Preview */}
        {preview && status !== "success" && (
          <div className="space-y-3">
            <div className="p-4 bg-zinc-800/60 border border-zinc-700 rounded-2xl">
              <p className="text-sm font-black text-white">{preview.fullName}</p>
              <p className="text-xs font-mono text-zinc-400 mt-0.5">{preview.idNumber}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Generated Schedule ({preview.sessions.length} of {preview.registeredSeminarIds.length} registered)
                </p>
                <button
                  onClick={handleRegenerate}
                  className="text-[10px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 transition-colors"
                >
                  Reroll ↻
                </button>
              </div>

              {preview.sessions.map(s => {
                const inTime = new Date(s.checkedInAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                const outTime = new Date(s.checkedOutAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-zinc-800/40 border border-zinc-700/60 rounded-xl">
                    <FaClock size={11} className="text-zinc-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-200 truncate">{s.title}</p>
                      <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{inTime} → {outTime}</p>
                    </div>
                  </div>
                );
              })}

              {preview.sessions.length < preview.registeredSeminarIds.length && (
                <p className="text-[10px] text-amber-500/80 font-medium px-1">
                  Note: {preview.registeredSeminarIds.length - preview.sessions.length} registered seminar(s) didn't fit within the day window and were skipped.
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={reset}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={status === "saving"}
                className="flex-[2] py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {status === "saving" ? <><FaSpinner className="animate-spin" size={12} /> Applying…</> : "Apply to Firestore"}
              </button>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-start gap-3">
              <FaCheckCircle size={16} className="shrink-0 mt-0.5" />
              <p>{message}</p>
            </div>
            <button
              onClick={reset}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Repair Another Student
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-start gap-3">
            <FaExclamationTriangle size={16} className="shrink-0 mt-0.5" />
            <p>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}