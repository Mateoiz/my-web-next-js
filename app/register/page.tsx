"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUser, FaIdCard, FaLayerGroup, FaSearch, FaTimes, FaPlus,
  FaTrashAlt, FaCheckCircle, FaSpinner, FaExclamationTriangle,
  FaChevronDown, FaChevronRight, FaArrowRight
} from "react-icons/fa";
import FloatingCubes from "@/app/components/FloatingCubes";
import CircuitCursor from "@/app/components/CircuitCursor";

// ─── Data ─────────────────────────────────────────────────────────────────────

export const PROFESSORS_DATA: Record<string, { subject: string; blocks: string[] }[]> = {
  "Laurio, Shiela": [{ subject: "Biochemistry Lec & Lab", blocks: ["1st Year A","1st Year B","1st Year C","1st Year D","1st Year E","1st Year F","1st Year G","1st Year H"] }],
  "Galino-Ibanez, Genevieve": [{ subject: "Biochemistry Lec & Lab", blocks: ["1st Year A","1st Year B","1st Year C","1st Year D","1st Year E","1st Year F","1st Year G","1st Year H"] }],
  "Butt, Paul Keenan": [{ subject: "Biochemistry Lab", blocks: ["1st Year A","1st Year B","1st Year C","1st Year D","1st Year E","1st Year F","1st Year G","1st Year H"] }],
  "Jimenez, Marlon": [{ subject: "Animal Production", blocks: ["1st Year A","1st Year B","1st Year C","1st Year D","1st Year E","1st Year F","1st Year G","1st Year H"] }],
  "Olido, Elena": [{ subject: "Pathology Lab", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] }],
  "Manangan, Felisa": [{ subject: "Pathology Lab", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] }],
  "Jusnayan, Peirce": [{ subject: "Physiology Lab", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] }],
  "Ferrer, Elena": [
    { subject: "Physiology Lab", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] },
    { subject: "Physiology Lec", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] },
  ],
  "Bagus, Rosario": [
    { subject: "Pharmacology Lec", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] },
    { subject: "Swine Medicine", blocks: ["4th Year"] },
  ],
  "Rivera III, Miguel": [{ subject: "Pharmacology Lec", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] }],
  "Reyes, Kriscel": [{ subject: "Pathology Lec", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] }],
  "Dycoco": [{ subject: "Immunology", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] }],
  "Nicolas, Elma": [{ subject: "Pharmacology Lab", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] }],
  "Coma, Luc Jesse": [
    { subject: "Pharmacology Lab", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] },
    { subject: "Canine Medicine", blocks: ["4th Year"] },
  ],
  "Lorenzo, Clarissa": [{ subject: "Pharmacology Lab", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] }],
  "Glinoga": [{ subject: "Physiology Lec", blocks: ["3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E","3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J","3rd Year K","3rd Year L"] }],
  "Rosario, Almer": [
    { subject: "Canine Medicine", blocks: ["4th Year"] },
    { subject: "Feline Medicine", blocks: ["4th Year"] },
    { subject: "VCIP 3", blocks: ["6th Year"] },
  ],
  "Mariano, Monty": [{ subject: "Poultry Medicine", blocks: ["4th Year"] }],
  "Silbor, Danilo": [{ subject: "Swine Medicine", blocks: ["4th Year"] }],
  "Miranda, Jocelyn": [{ subject: "Equine Medicine", blocks: ["4th Year"] }],
  "Ellema, Jovanito": [{ subject: "Ruminant Medicine", blocks: ["4th Year"] }],
  "Guno, Angel": [{ subject: "Ruminant Medicine", blocks: ["4th Year"] }],
  "Masong, Rizchel": [{ subject: "ESPM", blocks: ["4th Year"] }],
  "Lalisan, Lindsy Eunice": [{ subject: "ESPM", blocks: ["4th Year"] }],
  "Cruz, Franz": [{ subject: "Surgery Lec & Lab", blocks: ["5th Year A","5th Year B","5th Year C"] }],
  "Espiritu, Ana Maria": [{ subject: "PUHL Lec", blocks: ["5th Year A","5th Year B","5th Year C"] }],
  "Salem, Andrea Mae": [{ subject: "PUHL Lab", blocks: ["5th Year A","5th Year B","5th Year C"] }],
  "Granadozin, Manuel": [{ subject: "Clerkship", blocks: ["5th Year A","5th Year B","5th Year C"] }],
  "Retiro, Libeliza": [{ subject: "Clinical Internship", blocks: ["6th Year"] }],
};

export const YEAR_LEVELS = ["1st Year","2nd Year","3rd Year","4th Year","5th Year","6th Year"];
export const PROGRAM_OPTIONS = ["Doctor of Veterinary Medicine (DVM)"];

interface ProfessorEntry { professor: string; subject: string; block: string; }

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <motion.div
            animate={{
              width: i === current ? 28 : 8,
              backgroundColor: i < current ? '#06402B' : i === current ? '#06402B' : '#d4d4d8',
            }}
            transition={{ duration: 0.3 }}
            className="h-2 rounded-full"
          />
        </div>
      ))}
    </div>
  );
}

// ─── Professor autocomplete ───────────────────────────────────────────────────

function ProfessorPicker({
  entry, index, onChange, onRemove, canRemove,
}: {
  entry: ProfessorEntry; index: number;
  onChange: (e: ProfessorEntry) => void;
  onRemove: () => void; canRemove: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState(entry.professor);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const allProfessors = Object.keys(PROFESSORS_DATA);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allProfessors;
    return allProfessors.filter(p =>
      p.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const selectedSubjects = entry.professor ? PROFESSORS_DATA[entry.professor] ?? [] : [];
  const selectedBlocks = entry.subject
    ? selectedSubjects.find(s => s.subject === entry.subject)?.blocks ?? []
    : [];

  const isComplete = entry.professor && entry.subject && entry.block;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setHighlightIndex(0); }, [filtered.length]);

  const selectProfessor = (name: string) => {
    setSearchQuery(name);
    setOpen(false);
    onChange({ professor: name, subject: "", block: "" });
    // Auto-select subject if only one
    const subjects = PROFESSORS_DATA[name] ?? [];
    if (subjects.length === 1) {
      const onlySubject = subjects[0];
      onChange({ professor: name, subject: onlySubject.subject, block: onlySubject.blocks.length === 1 ? onlySubject.blocks[0] : "" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (filtered[highlightIndex]) selectProfessor(filtered[highlightIndex]); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`rounded-2xl border transition-all ${
        isComplete
          ? "border-[#06402B]/30 dark:border-emerald-500/30 bg-[#06402B]/5 dark:bg-emerald-500/5"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
      }`}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
            isComplete ? "bg-[#06402B] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
          }`}>
            {isComplete ? <FaCheckCircle size={10} /> : index + 1}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {isComplete ? entry.professor : `Professor ${index + 1}`}
          </span>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-1.5 text-zinc-300 dark:text-zinc-700 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
            <FaTrashAlt size={11} />
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Professor search */}
        <div ref={wrapRef} className="relative">
          <div className="relative">
            <FaSearch size={11} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setOpen(true);
                if (e.target.value !== entry.professor) onChange({ professor: "", subject: "", block: "" });
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search professor name…"
              className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-9 py-3 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#06402B] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#06402B]/10 dark:focus:ring-emerald-500/10 transition-all placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(""); setOpen(false); onChange({ professor: "", subject: "", block: "" }); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
              >
                {filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-zinc-400 font-medium">No professors found</div>
                ) : (
                  <ul ref={listRef} className="max-h-52 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
                    {filtered.map((prof, i) => (
                      <li key={prof}>
                        <button
                          type="button"
                          onMouseDown={e => { e.preventDefault(); selectProfessor(prof); }}
                          onMouseEnter={() => setHighlightIndex(i)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between gap-2 ${
                            i === highlightIndex
                              ? "bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400"
                              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <span className="truncate">{prof}</span>
                          {entry.professor === prof && <FaCheckCircle size={10} className="text-[#06402B] dark:text-emerald-400 shrink-0" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Subject pills */}
        <AnimatePresence>
          {entry.professor && selectedSubjects.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Subject</p>
              <div className="flex flex-wrap gap-2">
                {selectedSubjects.map(s => (
                  <button
                    key={s.subject}
                    type="button"
                    onClick={() => onChange({ ...entry, subject: s.subject, block: s.blocks.length === 1 ? s.blocks[0] : "" })}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      entry.subject === s.subject
                        ? "bg-[#06402B] dark:bg-emerald-600 text-white border-[#06402B] dark:border-emerald-600 shadow-md"
                        : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-[#06402B]/40 dark:hover:border-emerald-500/40"
                    }`}
                  >
                    {s.subject}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Block pills */}
        <AnimatePresence>
          {entry.subject && selectedBlocks.length > 1 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Your block</p>
              <div className="flex flex-wrap gap-2">
                {selectedBlocks.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => onChange({ ...entry, block: b })}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                      entry.block === b
                        ? "bg-[#06402B] dark:bg-emerald-600 text-white border-[#06402B] dark:border-emerald-600 shadow-md"
                        : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-[#06402B]/40 dark:hover:border-emerald-500/40"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completion row */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 bg-[#06402B]/10 dark:bg-emerald-500/10 rounded-xl"
            >
              <FaCheckCircle size={10} className="text-[#06402B] dark:text-emerald-400 shrink-0" />
              <p className="text-[11px] font-bold text-[#06402B] dark:text-emerald-400 truncate">
                {entry.subject} · {entry.block}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 overflow-hidden"
          >
            <FaExclamationTriangle size={9} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls = "w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#06402B] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#06402B]/10 dark:focus:ring-emerald-500/10 transition-all placeholder:text-zinc-400 appearance-none";

// ─── Multi-step form ──────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Personal info
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [program, setProgram] = useState("BSVetMed");
  const [yearLevel, setYearLevel] = useState("");
  const [studentType, setStudentType] = useState<"regular" | "irregular" | "">(""); 
  const [block, setBlock] = useState("");

  // Professors
  const [professors, setProfessors] = useState<ProfessorEntry[]>([
    { professor: "", subject: "", block: "" }
  ]);

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [idError, setIdError] = useState("");
  const [idChecking, setIdChecking] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    setTimeout(() => formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const checkIdDuplicate = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setIdChecking(true);
    try {
      const snap = await getDocs(query(collection(db, "cvmas_registrations"), where("idNumber", "==", id.trim())));
      setIdError(snap.empty ? "" : "This ID number is already registered.");
    } catch { /* silent */ }
    finally { setIdChecking(false); }
  }, []);

  // Step validation
  const step0Valid = useMemo(() =>
    fullName.trim().length >= 3 && idNumber.trim().length >= 5 && !idError && !idChecking,
    [fullName, idNumber, idError, idChecking]
  );

  const step1Valid = useMemo(() =>
    yearLevel && studentType && (studentType === "irregular" || block.trim().length > 0),
    [yearLevel, studentType, block]
  );

  const step2Valid = useMemo(() =>
    professors.some(p => p.professor && p.subject && p.block),
    [professors]
  );

  const filledProfessors = professors.filter(p => p.professor && p.subject && p.block);

  const goNext = () => {
    setError("");
    setStep(s => s + 1);
    scrollToTop();
  };

  const goBack = () => {
    setError("");
    setStep(s => s - 1);
    scrollToTop();
  };

  const addProfessor = () => {
    if (professors.length >= 6) return;
    setProfessors(p => [...p, { professor: "", subject: "", block: "" }]);
  };

  const updateProfessor = (i: number, entry: ProfessorEntry) =>
    setProfessors(p => p.map((x, idx) => idx === i ? entry : x));

  const removeProfessor = (i: number) =>
    setProfessors(p => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");

    try {
      const snap = await getDocs(query(collection(db, "cvmas_registrations"), where("idNumber", "==", idNumber.trim())));
      if (!snap.empty) { setError("This ID number is already registered."); setIsSubmitting(false); return; }

      const docRef = await addDoc(collection(db, "cvmas_registrations"), {
        fullName: fullName.trim(),
        idNumber: idNumber.trim(),
        program,
        yearLevel,
        studentType,
        block: studentType === "regular" ? block.trim() : "Irregular",
        professors: filledProfessors,
        status: "pre-registered",
        createdAt: serverTimestamp(),
      });

      router.push(`/confirm/${docRef.id}`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = ["Personal Info", "Student Details", "Professors"];
  const stepDescriptions = [
    "Tell us who you are",
    "Your year level and block",
    "Professors giving incentives",
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black relative overflow-hidden font-sans selection:bg-green-500/30">

      {/* Ambient background layer — matches the workspace hub's visual language */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-[10%] left-[-10%] w-[400px] h-[400px] bg-green-500/10 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl opacity-40" />
        <div className="absolute inset-0 opacity-30 sm:opacity-50">
          <FloatingCubes />
        </div>
      </div>

      <div className="hidden md:block">
        <CircuitCursor />
      </div>

      <div className="relative z-10">

        {/* Navbar clearance + hero header (now an inset card, not edge-to-edge) */}
        <div className="pt-24 md:pt-28 px-4">
          <div className="max-w-lg mx-auto relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl bg-[#06402B]">
            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none" />
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
              backgroundSize: "30px 30px"
            }} />
            <div className="relative px-5 py-8 md:py-10 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
                </span>
                DLSAU · JPCS · CVMAS Week
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-1">
                Event Pre-Registration
              </h1>
              <p className="text-sm text-emerald-200 font-medium">
                Fill out the form to get your QR code
              </p>
            </div>
          </div>
        </div>

        {/* Sticky progress — offset below the fixed navbar instead of pinning to the viewport top */}
        <div className="sticky top-16 md:top-20 z-30 mt-6 bg-white/90 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="max-w-lg mx-auto px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Step {step + 1} of {TOTAL_STEPS}
              </p>
              <p className="text-sm font-black text-zinc-900 dark:text-white leading-none">
                {stepTitles[step]}
              </p>
            </div>
            <p className="text-[11px] font-medium text-zinc-400">{stepDescriptions[step]}</p>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full bg-[#06402B] dark:bg-emerald-500 rounded-full"
            />
          </div>
        </div>
      </div>

      <div ref={formTopRef} className="max-w-lg mx-auto px-4 pt-6 pb-20">
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">

            {/* ── Step 0: Personal Info ── */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">

                  <Field label="Full Name" >
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Last Name, First Name M.I."
                      className={inputCls}
                      autoComplete="name"
                      autoFocus
                    />
                  </Field>

                  <Field label="ID Number" error={idError}>
                    <div className="relative">
                      <input
                        type="text"
                        value={idNumber}
                        onChange={e => { setIdNumber(e.target.value); setIdError(""); }}
                        onBlur={e => checkIdDuplicate(e.target.value)}
                        placeholder="e.g. 2021-00001"
                        className={`${inputCls} ${idError ? "border-red-400 dark:border-red-500" : ""} pr-10`}
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        {idChecking && <FaSpinner size={12} className="animate-spin text-zinc-400" />}
                        {!idChecking && idNumber && !idError && <FaCheckCircle size={12} className="text-[#06402B] dark:text-emerald-400" />}
                        {!idChecking && idError && <FaExclamationTriangle size={12} className="text-red-500" />}
                      </div>
                    </div>
                  </Field>

                  <Field label="Program">
                    <div className="flex gap-2">
                      {PROGRAM_OPTIONS.map(p => (
                        <button key={p} type="button" onClick={() => setProgram(p)}
                          className={`flex-1 py-3 rounded-xl border-2 text-sm font-black transition-all ${
                            program === p
                              ? "border-[#06402B] bg-[#06402B]/5 text-[#06402B] dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                {/* Tip */}
                <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl">
                  <span className="text-blue-500 mt-0.5 shrink-0">💡</span>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 leading-relaxed">
                    Make sure your ID number is correct — it will be linked to your QR code and cannot be changed after submission.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!step0Valid}
                  className="w-full py-4 bg-[#06402B] dark:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  Continue <FaArrowRight size={13} />
                </button>
              </motion.div>
            )}

            {/* ── Step 1: Student Details ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-5">

                  <Field label="Year Level">
                    <div className="grid grid-cols-3 gap-2">
                      {YEAR_LEVELS.map(y => (
                        <button key={y} type="button" onClick={() => setYearLevel(y)}
                          className={`py-3 rounded-xl border-2 text-xs font-black transition-all ${
                            yearLevel === y
                              ? "border-[#06402B] bg-[#06402B]/5 text-[#06402B] dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-600"
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Student Type">
                    <div className="grid grid-cols-2 gap-3">
                      {(["regular", "irregular"] as const).map(type => (
                        <button key={type} type="button" onClick={() => { setStudentType(type); setBlock(""); }}
                          className={`py-4 rounded-xl border-2 font-black text-sm uppercase tracking-widest transition-all ${
                            studentType === type
                              ? "border-[#06402B] bg-[#06402B]/5 text-[#06402B] dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "border-zinc-200 dark:border-zinc-700 text-zinc-500"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <AnimatePresence>
                    {studentType === "regular" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <Field label="Block Section">
                          <input
                            type="text"
                            value={block}
                            onChange={e => setBlock(e.target.value)}
                            placeholder="e.g. 3-A, 1st Year Block A"
                            className={inputCls}
                            autoFocus
                          />
                        </Field>
                      </motion.div>
                    )}
                    {studentType === "irregular" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                        <p className="text-[11px] font-medium text-zinc-500 leading-relaxed">
                          As an irregular student, your block will be tracked per professor below.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={goBack}
                    className="px-6 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-bold text-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button type="button" onClick={goNext} disabled={!step1Valid}
                    className="flex-1 py-4 bg-[#06402B] dark:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    Continue <FaArrowRight size={13} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Professors ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Header card */}
                <div className="bg-white dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                  <p className="text-xs font-bold text-zinc-500 leading-relaxed">
                    Search for professors who will give you incentives for attending. Add up to 6.
                  </p>
                </div>

                {/* Professor cards */}
                <AnimatePresence>
                  {professors.map((entry, i) => (
                    <ProfessorPicker
                      key={i}
                      index={i}
                      entry={entry}
                      onChange={e => updateProfessor(i, e)}
                      onRemove={() => removeProfessor(i)}
                      canRemove={professors.length > 1}
                    />
                  ))}
                </AnimatePresence>

                {/* Add more */}
                {professors.length < 6 && (
                  <button type="button" onClick={addProfessor}
                    className="w-full py-3.5 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-[#06402B] dark:hover:text-emerald-400 hover:border-[#06402B]/30 dark:hover:border-emerald-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <FaPlus size={9} /> Add another professor
                  </button>
                )}

                {/* Summary of filled */}
                <AnimatePresence>
                  {filledProfessors.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="p-4 bg-[#06402B]/5 dark:bg-emerald-500/10 border border-[#06402B]/15 dark:border-emerald-500/20 rounded-2xl"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#06402B] dark:text-emerald-400 mb-2">
                        {filledProfessors.length} professor{filledProfessors.length !== 1 ? "s" : ""} added
                      </p>
                      <div className="space-y-1">
                        {filledProfessors.map((p, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <FaCheckCircle size={9} className="text-[#06402B] dark:text-emerald-400 shrink-0" />
                            <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 truncate">
                              {p.professor} — {p.subject}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium"
                    >
                      <FaExclamationTriangle size={12} /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={goBack}
                    className="px-6 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-2xl font-bold text-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!step2Valid || isSubmitting}
                    className="flex-1 py-4 bg-[#06402B] dark:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isSubmitting ? (
                      <><FaSpinner className="animate-spin" size={13} /> Submitting…</>
                    ) : (
                      <><FaCheckCircle size={13} /> Complete Registration</>
                    )}
                  </button>
                </div>

                <p className="text-center text-[11px] text-zinc-400 pb-4">
                  Your QR code will appear after submission. Screenshot it — you'll need it at the event.
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </form>
      </div>

      </div>
    </div>
  );
}