"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowRight, FaCheckCircle, FaCloudUploadAlt, FaExclamationTriangle,
  FaPlus, FaSearch, FaSpinner, FaTimes, FaTrashAlt, FaUndo, FaLightbulb,
  FaPaw, FaSeedling, FaLeaf, FaBone
} from "react-icons/fa";
import FloatingNature from "@/app/components/FloatingNature";
import WalkingPaws from "@/app/components/WalkingPaws";
import NatureCursor from "@/app/components/NatureCursor";
// ─── Data ─────────────────────────────────────────────────────────────────────

const blocks2ndYear = [
  "2nd Year A", "2nd Year B", "2nd Year C", "2nd Year D", "2nd Year E", 
  "2nd Year F", "2nd Year G", "2nd Year H", "2nd Year I", "2nd Year J", 
  "2nd Year K", "2nd Year L", "2nd Year M", "2nd Year N"
];

export const PROFESSORS_DATA: Record<string, { subject: string; blocks: string[] }[]> = {
  "Laurio, Shiela": [{ subject: "Biochemistry Lec & Lab", blocks: ["1st Year A","1st Year B","1st Year C","1st Year D","1st Year E","1st Year F","1st Year G","1st Year H"] }],
  "Galino-Ibanez, Genevieve": [{ subject: "Biochemistry Lec & Lab", blocks: ["1st Year A","1st Year B","1st Year C","1st Year D","1st Year E","1st Year F","1st Year G","1st Year H"] }],
  "Butt, Paul Keenan": [{ subject: "Biochemistry Lab", blocks: ["1st Year A","1st Year B","1st Year C","1st Year D","1st Year E","1st Year F","1st Year G","1st Year H"] }],
  "Jimenez, Marlon": [{ subject: "Animal Production", blocks: ["1st Year A","1st Year B","1st Year C","1st Year D","1st Year E","1st Year F","1st Year G","1st Year H"] }],
  
  "Castillo, Roniel": [{ subject: "RZAL101A", blocks: blocks2ndYear }],
  "Alejo, Ernilita": [{ subject: "RZAL101A", blocks: blocks2ndYear }],
  "Tolentino, Ma. Lourdes": [{ subject: "RZAL101A", blocks: blocks2ndYear }],
  "Mirandilla, James Owen": [{ subject: "ANAT101A", blocks: blocks2ndYear }],
  "Domingo, Cecilia": [{ subject: "ANAT101B", blocks: blocks2ndYear }],
  "Ortiz": [{ subject: "ANAT101B", blocks: blocks2ndYear }],
  "Fragata, Helen": [{ subject: "BASC108A", blocks: blocks2ndYear }],
  "Fulgencio, Niña": [{ subject: "BASC108B", blocks: blocks2ndYear }],
  "Edisa, Rhio": [{ subject: "BASC107A", blocks: blocks2ndYear }],
  "Rosales, Joanna": [{ subject: "BASC107A", blocks: blocks2ndYear }],
  "Romualdo, Jenita": [{ subject: "DEVA100A", blocks: blocks2ndYear }],
  "Salem, Andrei": [{ subject: "DEVA100B", blocks: blocks2ndYear }],
  "Guno, Edelmira": [{ subject: "DEVA100B", blocks: blocks2ndYear }],

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
  
  "Miranda, Jocelyn": [
    { subject: "Equine Medicine", blocks: ["4th Year"] },
    { subject: "BASC107A", blocks: blocks2ndYear }
  ],
  "Ellema, Jovanito": [
    { subject: "Ruminant Medicine", blocks: ["4th Year"] },
    { subject: "BASC108B", blocks: blocks2ndYear }
  ],
  
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
export const PROGRAM_OPTIONS = [
  "Doctor of Veterinary Medicine (DVM)",
  "Bachelor of Science in Agriculture"
];

interface ProfessorEntry { professor: string; subject: string; block: string; }

// ─── Strict Formatters & Validators ──────────────────────────────────────────

const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ'’.,\- ]+$/;
const BLOCK_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ0-9'\- ]+$/;

// STRICT ID REGEX: Exactly 20XX-XX-XXXXXX
const ID_REGEX = /^20\d{2}-\d{2}-\d{6}$/;
const ID_MAX = 14; 
const NAME_MAX = 100;
const BLOCK_MAX = 40;

const DRAFT_KEY = "cvmas_register_draft_v2";

function formatName(s: string) {
  return s.replace(/\s+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase());
}

function formatBlockStr(s: string) {
  return s.replace(/\s+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Professor autocomplete ───────────────────────────────────────────────────

function ProfessorPicker({
  entry, index, onChange, onRemove, canRemove, isDuplicate, studentType, globalBlock
}: {
  entry: ProfessorEntry; index: number;
  onChange: (e: ProfessorEntry) => void;
  onRemove: () => void; canRemove: boolean;
  isDuplicate: boolean;
  studentType: "regular" | "irregular" | "";
  globalBlock: string;
}) {
  const [searchQuery, setSearchQuery] = useState(entry.professor);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [customBlockMode, setCustomBlockMode] = useState(false);
  
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const allProfessors = Object.keys(PROFESSORS_DATA);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allProfessors.filter(p => p.toLowerCase().includes(q));
  }, [searchQuery]);

  const selectedSubjects = entry.professor ? PROFESSORS_DATA[entry.professor] ?? [] : [];
  const selectedBlocks = entry.subject
    ? selectedSubjects.find(s => s.subject === entry.subject)?.blocks ?? []
    : [];

  const isComplete = entry.professor && entry.subject && entry.block;

  useEffect(() => {
    setSearchQuery(entry.professor);
    if (entry.block && selectedBlocks.length > 0 && !selectedBlocks.includes(entry.block)) {
      setCustomBlockMode(true);
    }
  }, [entry.professor, entry.block, selectedBlocks]);

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
    setCustomBlockMode(false);
    
    let autoSubject = "";
    let autoBlock = "";
    
    const subjects = PROFESSORS_DATA[name] ?? [];
    if (subjects.length === 1) {
      autoSubject = subjects[0].subject;
      if (subjects[0].blocks.length === 1) {
        autoBlock = subjects[0].blocks[0];
      } else if (studentType === "regular" && globalBlock) {
        const match = subjects[0].blocks.find(b => b.toLowerCase() === globalBlock.toLowerCase());
        if (match) autoBlock = match;
      }
    }
    
    onChange({ professor: name, subject: autoSubject, block: autoBlock });
  };

  const selectSubject = (subjName: string) => {
    setCustomBlockMode(false);
    const subjData = selectedSubjects.find(s => s.subject === subjName);
    let autoBlock = "";
    
    if (subjData) {
      if (subjData.blocks.length === 1) {
        autoBlock = subjData.blocks[0];
      } else if (studentType === "regular" && globalBlock) {
        const match = subjData.blocks.find(b => b.toLowerCase() === globalBlock.toLowerCase());
        if (match) autoBlock = match;
      }
    }
    onChange({ ...entry, subject: subjName, block: autoBlock });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if ((e.key === "ArrowDown" || e.key === "Enter") && searchQuery.trim().length > 0) {
        e.preventDefault(); setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (filtered[highlightIndex]) selectProfessor(filtered[highlightIndex]); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className={`rounded-2xl border transition-all h-full flex flex-col bg-white shadow-sm hover:shadow-md ${
        isDuplicate ? "border-red-300 bg-red-50/60"
          : isComplete ? "border-[#06402B]/30 bg-[#06402B]/5"
          : "border-zinc-200"
      }`}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
            isDuplicate ? "bg-red-500 text-white" : isComplete ? "bg-[#06402B] text-white" : "bg-emerald-100 text-[#06402B]"
          }`}>
            {isDuplicate ? <FaExclamationTriangle size={9} /> : isComplete ? <FaCheckCircle size={10} /> : <FaPaw size={10} />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {isComplete ? entry.professor : `Professor ${index + 1}`}
          </span>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-1.5 text-zinc-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all">
            <FaTrashAlt size={11} />
          </button>
        )}
      </div>

      <div className="px-4 pb-4 space-y-3 flex-1">
        <div ref={wrapRef} className="relative">
          <div className="relative">
            <FaSearch size={11} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={e => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val !== entry.professor) {
                  setCustomBlockMode(false);
                  onChange({ professor: "", subject: "", block: "" });
                }
                setOpen(val.trim().length > 0);
              }}
              onFocus={() => { if (searchQuery.trim().length > 0 && !entry.professor) setOpen(true); }}
              onKeyDown={handleKeyDown}
              placeholder="Search professor (e.g. Ferrer) 🐾"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-9 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-[#06402B] focus:ring-2 focus:ring-[#06402B]/10 transition-all placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(""); setOpen(false); setCustomBlockMode(false); onChange({ professor: "", subject: "", block: "" }); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <FaTimes size={11} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {open && searchQuery.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.12 }}
                className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-zinc-200 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden"
              >
                {filtered.length === 0 ? (
                  <div className="px-4 py-5 text-center space-y-1">
                    <p className="text-sm text-zinc-400 font-medium">No match for "{searchQuery}"</p>
                    <p className="text-xs text-zinc-400">Try a last name, e.g. "Ferrer" or "Cruz"</p>
                  </div>
                ) : (
                  <ul ref={listRef} className="max-h-52 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
                    {filtered.map((prof, i) => {
                      const matchIdx = prof.toLowerCase().indexOf(searchQuery.trim().toLowerCase());
                      const before = matchIdx >= 0 ? prof.slice(0, matchIdx) : prof;
                      const match = matchIdx >= 0 ? prof.slice(matchIdx, matchIdx + searchQuery.trim().length) : "";
                      const after = matchIdx >= 0 ? prof.slice(matchIdx + searchQuery.trim().length) : "";
                      return (
                        <li key={prof}>
                          <button
                            type="button"
                            onMouseDown={e => { e.preventDefault(); selectProfessor(prof); }}
                            onMouseEnter={() => setHighlightIndex(i)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between gap-2 ${
                              i === highlightIndex ? "bg-[#06402B]/10 text-[#06402B]" : "text-zinc-700 hover:bg-zinc-50"
                            }`}
                          >
                            <span className="truncate">
                              {before}<span className="font-black text-[#06402B]">{match}</span>{after}
                            </span>
                            {entry.professor === prof && <FaCheckCircle size={10} className="text-[#06402B] shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {entry.professor && selectedSubjects.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Subject</p>
              <div className="flex flex-wrap gap-2">
                {selectedSubjects.map(s => (
                  <button
                    key={s.subject}
                    type="button"
                    onClick={() => selectSubject(s.subject)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      entry.subject === s.subject
                        ? "bg-[#06402B] text-white border-[#06402B] shadow-md"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-[#06402B]/40"
                    }`}
                  >
                    {s.subject}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {entry.subject && selectedBlocks.length > 1 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Which block do you attend?</p>
              <div className="flex flex-wrap gap-2">
                {selectedBlocks.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => { setCustomBlockMode(false); onChange({ ...entry, block: b }); }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                      entry.block === b && !customBlockMode
                        ? "bg-[#06402B] text-white border-[#06402B] shadow-md"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-[#06402B]/40"
                    }`}
                  >
                    {b}
                  </button>
                ))}
                
                <button
                  type="button"
                  onClick={() => { setCustomBlockMode(true); onChange({ ...entry, block: "" }); }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border border-dashed ${
                    customBlockMode 
                      ? "bg-zinc-200 text-zinc-800 border-zinc-400" 
                      : "bg-transparent text-zinc-500 border-zinc-300 hover:text-zinc-700"
                  }`}
                >
                  + Other
                </button>
              </div>

              <AnimatePresence>
                {customBlockMode && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-3">
                    <input
                      type="text"
                      value={entry.block}
                      onChange={e => onChange({ ...entry, block: e.target.value })}
                      onBlur={e => onChange({ ...entry, block: formatBlockStr(e.target.value) })}
                      placeholder="e.g. VETMED2-J"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 outline-none focus:border-[#06402B] transition-all"
                      autoFocus
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isDuplicate && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-b-2xl border-t border-red-200 mt-auto">
            <FaExclamationTriangle size={10} className="text-red-500 shrink-0" />
            <p className="text-[11px] font-bold text-red-600">Already added in another card.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isComplete && !isDuplicate && !customBlockMode && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-3 py-2 bg-[#06402B]/10 rounded-b-2xl border-t border-[#06402B]/20 mt-auto">
            <FaCheckCircle size={10} className="text-[#06402B] shrink-0" />
            <p className="text-[11px] font-bold text-[#06402B] truncate">{entry.subject} · {entry.block}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">{label}</label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            role="alert" aria-live="polite" className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 overflow-hidden"
          >
            <FaExclamationTriangle size={9} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls = "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-[#06402B] focus:ring-2 focus:ring-[#06402B]/10 transition-all placeholder:text-zinc-400 appearance-none";

// ─── Multi-step form ──────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [program, setProgram] = useState(PROGRAM_OPTIONS[0]);
  const [yearLevel, setYearLevel] = useState("");
  const [studentType, setStudentType] = useState<"regular" | "irregular" | "">("");
  const [block, setBlock] = useState("");

  const [professors, setProfessors] = useState<ProfessorEntry[]>([
    { professor: "", subject: "", block: "" }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [idError, setIdError] = useState("");
  const [idChecking, setIdChecking] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  
  const formTopRef = useRef<HTMLDivElement>(null);
  const submitLockRef = useRef(false);
  const draftClearedRef = useRef(false);
  const idCheckTokenRef = useRef(0);
  const hydratedRef = useRef(false);

  const scrollToTop = () => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (typeof draft.fullName === "string") setFullName(draft.fullName);
        if (typeof draft.idNumber === "string") setIdNumber(draft.idNumber);
        if (typeof draft.program === "string") setProgram(draft.program);
        if (typeof draft.yearLevel === "string") setYearLevel(draft.yearLevel);
        if (draft.studentType === "regular" || draft.studentType === "irregular") setStudentType(draft.studentType);
        if (typeof draft.block === "string") setBlock(draft.block);
        if (Array.isArray(draft.professors) && draft.professors.length > 0) setProfessors(draft.professors);
        if (typeof draft.step === "number" && draft.step >= 0 && draft.step < TOTAL_STEPS) setStep(draft.step);
        setDraftRestored(true);
      }
    } catch {}
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || draftClearedRef.current) return;
    const hasContent = fullName || idNumber || yearLevel || studentType || block || professors.some(p => p.professor);
    if (!hasContent) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ fullName, idNumber, program, yearLevel, studentType, block, professors, step }));
    } catch {}
  }, [fullName, idNumber, program, yearLevel, studentType, block, professors, step]);

  const clearDraft = useCallback(() => {
    draftClearedRef.current = true;
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
  }, []);

  const startOver = useCallback(() => {
    if (!window.confirm("Discard this draft and start a new registration?")) return;
    setFullName(""); setIdNumber(""); setYearLevel(""); setStudentType(""); setBlock("");
    setProfessors([{ professor: "", subject: "", block: "" }]);
    setStep(0); setIdError(""); setError("");
    clearDraft();
    draftClearedRef.current = false;
    setDraftRestored(false);
  }, [clearDraft]);

  // ─── STRICT ID NUMBER FORMATTING (20XX-XX-XXXXXX) ───
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip everything except numbers
    const digits = e.target.value.replace(/\D/g, "");
    let formatted = digits.slice(0, 12); // Max 12 digits (14 chars total with dashes)
    
    // Auto-insert dashes
    if (formatted.length > 6) {
      formatted = `${formatted.slice(0, 4)}-${formatted.slice(4, 6)}-${formatted.slice(6)}`;
    } else if (formatted.length > 4) {
      formatted = `${formatted.slice(0, 4)}-${formatted.slice(4)}`;
    }
    
    setIdNumber(formatted);
  };

  useEffect(() => {
    const trimmed = idNumber.trim();
    if (!trimmed) { setIdError(""); setIdChecking(false); return; }

    // If the format isn't complete yet, just show the walking paws.
    // This removes the aggressive red "Format must be..." error while they type.
    if (!ID_REGEX.test(trimmed)) {
      setIdError(""); 
      setIdChecking(true); 
      return;
    }

    const token = ++idCheckTokenRef.current;
    setIdChecking(true);
    setIdError("");

    const t = setTimeout(async () => {
      try {
        const snap = await getDocs(query(collection(db, "cvmas_registrations"), where("idNumber", "==", trimmed)));
        if (idCheckTokenRef.current !== token) return; 
        setIdError(snap.empty ? "" : "This ID number is already registered.");
      } catch {
        if (idCheckTokenRef.current === token) setIdError("Couldn't verify ID right now — check your connection.");
      } finally {
        if (idCheckTokenRef.current === token) setIdChecking(false);
      }
    }, 550);
    return () => clearTimeout(t);
  }, [idNumber]);

  const nameError = useMemo(() => {
    const trimmed = fullName.trim();
    if (!trimmed || trimmed.length < 3) return "";
    if (trimmed.length > NAME_MAX) return `Name is too long (max ${NAME_MAX} characters).`;
    if (!NAME_REGEX.test(trimmed)) return "Use letters and basic punctuation only — no numbers or symbols.";
    return "";
  }, [fullName]);

  const blockError = useMemo(() => {
    const trimmed = block.trim();
    if (!trimmed) return ""; 
    if (trimmed.length > BLOCK_MAX) return `Block is too long (max ${BLOCK_MAX} characters).`;
    if (!BLOCK_REGEX.test(trimmed)) return "Use letters, numbers, spaces, and dashes only.";
    return "";
  }, [block]);

  const duplicateKeys = useMemo(() => {
    const counts: Record<string, number> = {};
    professors.forEach(p => {
      if (p.professor && p.subject) {
        const k = `${p.professor}::${p.subject}`;
        counts[k] = (counts[k] || 0) + 1;
      }
    });
    return new Set(Object.keys(counts).filter(k => counts[k] > 1));
  }, [professors]);

  const hasDuplicateProfessors = duplicateKeys.size > 0;

  const step0Valid = useMemo(() =>
    fullName.trim().length >= 3 && !nameError &&
    ID_REGEX.test(idNumber) && !idError && !idChecking, // STRICT CHECK
    [fullName, nameError, idNumber, idError, idChecking]
  );

  const step1Valid = useMemo(() =>
    !!yearLevel && !!studentType && !blockError &&
    (studentType === "irregular" || block.trim().length > 0), 
    [yearLevel, studentType, block, blockError]
  );

  const filledProfessors = professors.filter(p => p.professor && p.subject && p.block);
  
  const step2Valid = useMemo(() =>
    filledProfessors.length > 0 && !hasDuplicateProfessors,
    [filledProfessors, hasDuplicateProfessors]
  );

  const goNext = () => { setError(""); setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)); scrollToTop(); };
  const goBack = () => { setError(""); setStep(s => Math.max(s - 1, 0)); scrollToTop(); };

  const addProfessor = () => {
    if (professors.length >= 6) return;
    setProfessors(p => [...p, { professor: "", subject: "", block: "" }]);
  };

  const updateProfessor = (i: number, entry: ProfessorEntry) => setProfessors(p => p.map((x, idx) => idx === i ? entry : x));
  const removeProfessor = (i: number) => setProfessors(p => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 0) { if (step0Valid) goNext(); return; }
    if (step === 1) { if (step1Valid) goNext(); return; }

    if (!step2Valid) {
      setError(hasDuplicateProfessors
        ? "Remove or fix duplicate professor entries before submitting."
        : "Add at least one complete professor entry before submitting.");
      return;
    }
    if (nameError || idError || blockError) {
      setError("Please fix the highlighted fields before submitting.");
      return;
    }
    if (isSubmitting || submitLockRef.current) return;

    if (!navigator.onLine) {
      setError("You are offline. Please reconnect to the internet and try again.");
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setError("");

    const cleanName = formatName(fullName);
    const cleanId = idNumber.replace(/\s+/g, "").trim(); 
    
    // Final sanity check before database push
    if (!ID_REGEX.test(idNumber)) {
      setError("Critical Error: ID format is invalid.");
      setIsSubmitting(false); submitLockRef.current = false; return;
    }

    const cleanBlock = studentType === "regular" 
      ? formatBlockStr(block) 
      : block.trim() ? `Irregular (${formatBlockStr(block)})` : "Irregular";

    if (!cleanName || !NAME_REGEX.test(cleanName)) {
      setError("Please enter a valid name.");
      setIsSubmitting(false); submitLockRef.current = false; return;
    }
    
    setProfessors(filledProfessors);

    try {
      const submitPromise = (async () => {
        const snap = await getDocs(query(collection(db, "cvmas_registrations"), where("idNumber", "==", cleanId)));
        if (!snap.empty) throw new Error("duplicate-id");

        return addDoc(collection(db, "cvmas_registrations"), {
          fullName: cleanName,
          idNumber: cleanId,
          program,
          yearLevel,
          studentType,
          block: cleanBlock,
          professors: filledProfessors,
          status: "pre-registered",
          createdAt: serverTimestamp(),
        });
      })();

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("network-timeout")), 10000));
      const docRef = await Promise.race([submitPromise, timeoutPromise]) as any;

      clearDraft();
      router.push(`/confirm/${docRef.id}`);
      
    } catch (err: any) {
      if (err.message === "duplicate-id") {
        setError("This ID number is already registered.");
      } else if (err.message === "network-timeout") {
        setError("Connection timed out. Campus Wi-Fi might be unstable — please try again.");
      } else {
        setError("Something went wrong. Please try again.");
        console.error(err);
      }
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const stepTitles = ["Your Details", "Academic Roots", "Bonus Points Hunt"];
  const stepDescriptions = ["Tell us who you are", "Your year level and block", "Professors giving incentives"];

  return (
    <div className="min-h-screen bg-[#f8faf8] cursor-paw relative overflow-hidden font-sans selection:bg-emerald-500/30 text-zinc-900 pb-24">
      
      {/* ─── BACKGROUND GRAPHICS ─── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.1 }} />
        <div className="absolute top-[10%] left-[-5%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 text-emerald-700/20">
          <FloatingNature />
        </div>
      </div>
     <div className="hidden md:block"><NatureCursor /></div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-28 lg:pt-36 flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
        
        {/* ─── LEFT PANEL ─── */}
        <div className="w-full lg:w-[420px] shrink-0 lg:sticky lg:top-32 flex flex-col gap-6">
          
          <div className="relative overflow-hidden rounded-[2rem] border border-[#06402B]/10 shadow-xl bg-[#06402B]">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#06402B] via-[#08553a] to-[#107c57] opacity-80 pointer-events-none" />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
            
            <div className="relative px-6 py-10 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-4 shadow-sm">
                🐾 DLSAU · CVMAS WEEK
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">Event<br/>Pre-Registration</h1>
              <p className="text-sm text-emerald-100/90 font-medium max-w-[250px] mx-auto leading-relaxed">
                Register below to get your official entrance QR code for the CVMAS Week festivities.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-t-4 border-t-emerald-600 border-zinc-200 shadow-sm p-6 relative overflow-hidden">
            <FaPaw className="absolute -bottom-6 -right-6 text-zinc-50 opacity-40 rotate-12" size={100} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#06402B]/60">Step {step + 1} of {TOTAL_STEPS}</p>
                  <p className="text-base font-black text-[#06402B] leading-none mt-1">{stepTitles[step]}</p>
                </div>
                <p className="text-[11px] font-medium text-zinc-400 text-right max-w-[100px] leading-tight">{stepDescriptions[step]}</p>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden shadow-inner">
                <motion.div animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} transition={{ duration: 0.4, ease: "easeOut" }} className="h-full bg-emerald-600 rounded-full" />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="tip0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-start gap-3 p-5 bg-blue-50 border border-blue-200 rounded-2xl shadow-sm">
                <FaLightbulb className="text-blue-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-blue-800 mb-1">ID Number Notice</p>
                  <p className="text-xs font-medium text-blue-700 leading-relaxed">
                    Make sure your ID number is correct. It will be permanently linked to your QR code and cannot be changed after submission.
                  </p>
                </div>
              </motion.div>
            )}
            
            {step === 2 && (
              <motion.div key="tip2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-start gap-3 p-5 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
                <FaExclamationTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-amber-800 mb-1">Bonus Points Caution</p>
                  <p className="text-xs font-medium text-amber-700 leading-relaxed">
                    Please answer with correct and proper details as <strong className="font-black">this will determine whether you get your bonus points</strong>. Double-check your spelling before submitting!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {draftRestored && step === 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex items-center gap-3 p-4 bg-zinc-100 border border-zinc-200 rounded-2xl">
                  <FaCloudUploadAlt className="text-zinc-400 shrink-0" size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-600">Draft Restored</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">We saved your progress locally.</p>
                  </div>
                  <button type="button" onClick={startOver} className="shrink-0 flex flex-col items-center justify-center p-2 text-[9px] font-black uppercase text-zinc-500 hover:text-red-600 transition-colors">
                    <FaUndo size={12} className="mb-1" /> Restart
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div ref={formTopRef} className="w-full flex-1">
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait">

              {/* ─── STEP 0: Personal Info ─── */}
              {step === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-6">
                  
                  <div className="bg-white rounded-3xl border-t-4 border-t-[#06402B] border border-zinc-200 p-6 md:p-8 shadow-sm relative overflow-hidden">
                    <FaPaw className="absolute -bottom-6 -right-6 text-zinc-50 opacity-40 rotate-12 pointer-events-none" size={140} />
                    
                    <h2 className="text-lg font-black text-zinc-800 mb-6 flex items-center gap-2 relative">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#06402B]/10 text-[#06402B] text-xs"><FaPaw size={10} /></span>
                      Your Details
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 relative">
                      <Field label="Full Name" error={nameError} className="md:col-span-2">
                        <input
                          type="text" value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          onBlur={e => setFullName(formatName(e.target.value))}
                          placeholder="Last Name, First Name M.I."
                          maxLength={NAME_MAX}
                          className={`${inputCls} ${nameError ? "border-red-400 bg-red-50" : ""}`}
                          autoComplete="name" autoFocus
                        />
                      </Field>

                      <Field label="ID Number" error={idError}>
                        <div className="relative">
                          {/* THE NEW AUTO-FORMATTING INPUT */}
                          <input
                            type="text" 
                            value={idNumber}
                            onChange={handleIdChange}
                            placeholder="20XX-XX-XXXXXX"
                            maxLength={ID_MAX}
                            className={`${inputCls} font-mono tracking-widest ${idError ? "border-red-400 bg-red-50" : ""} pr-10`}
                          />
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                            {idChecking && <WalkingPaws size={12} className="text-[#06402B]" />}
                            {!idChecking && ID_REGEX.test(idNumber) && !idError && <FaCheckCircle size={12} className="text-[#06402B]" />}
                            {!idChecking && idError && <FaExclamationTriangle size={12} className="text-red-500" />}
                          </div>
                        </div>
                      </Field>

                      <Field label="Program">
                        <div className="flex flex-col gap-2 h-full">
                          {PROGRAM_OPTIONS.map(p => {
                            const isVet = p.includes("Veterinary");
                            return (
                              <button key={p} type="button" onClick={() => setProgram(p)}
                                className={`w-full flex-1 py-3 px-4 rounded-xl border-2 text-xs font-black transition-all flex items-center justify-center gap-2 text-center leading-tight ${
                                  program === p ? "border-[#06402B] bg-[#06402B]/5 text-[#06402B] shadow-sm" : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
                                }`}
                              >
                                {isVet ? <FaBone size={14} className={program === p ? "text-[#06402B]" : "text-zinc-400"} /> : <FaSeedling size={14} className={program === p ? "text-[#06402B]" : "text-zinc-400"} />}
                                {p}
                              </button>
                            );
                          })}
                        </div>
                      </Field>
                    </div>
                  </div>

                  <button type="submit" disabled={!step0Valid} className="w-full py-4 bg-[#06402B] text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95">
                    Continue to Details <FaArrowRight size={13} />
                  </button>
                </motion.div>
              )}

              {/* ─── STEP 1: Student Details ─── */}
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }} className="space-y-6">
                  
                  <div className="bg-white rounded-3xl border-t-4 border-t-emerald-600 border border-zinc-200 p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden">
                    <FaLeaf className="absolute -bottom-6 -right-6 text-zinc-50 opacity-40 -rotate-12 pointer-events-none" size={140} />
                    
                    <h2 className="text-lg font-black text-zinc-800 mb-2 flex items-center gap-2 relative">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs"><FaSeedling size={10} /></span>
                      Academic Roots
                    </h2>

                    <Field label="Year Level" className="relative">
                      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6 gap-2">
                        {YEAR_LEVELS.map(y => (
                          <button key={y} type="button" onClick={() => setYearLevel(y)}
                            className={`py-3 rounded-xl border-2 text-[11px] font-black transition-all ${
                              yearLevel === y ? "border-[#06402B] bg-[#06402B]/5 text-[#06402B] shadow-sm" : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
                            }`}
                          >
                            {y.replace(" Year", "")}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                      <Field label="Student Type">
                        <div className="grid grid-cols-2 gap-3 h-full">
                          {(["regular", "irregular"] as const).map(type => (
                            <button key={type} type="button" onClick={() => { setStudentType(type); setBlock(""); }}
                              className={`py-4 px-2 rounded-xl border-2 font-black text-[11px] uppercase tracking-widest transition-all h-full ${
                                studentType === type ? "border-[#06402B] bg-[#06402B]/5 text-[#06402B] shadow-sm" : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <AnimatePresence mode="wait">
                        {studentType === "regular" && (
                          <motion.div key="reg" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full">
                            <Field label="Block Section" error={blockError} className="h-full flex flex-col">
                              <input
                                type="text" value={block}
                                onChange={e => setBlock(e.target.value)}
                                onBlur={e => setBlock(formatBlockStr(e.target.value))}
                                placeholder="e.g. 2nd Year A"
                                maxLength={BLOCK_MAX}
                                className={`${inputCls} flex-1 ${blockError ? "border-red-400 bg-red-50" : ""}`}
                                autoFocus
                              />
                            </Field>
                          </motion.div>
                        )}
                        
                        {studentType === "irregular" && (
                          <motion.div key="irreg" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full flex flex-col">
                            <Field label="Base Block (Optional)" error={blockError}>
                              <input
                                type="text" value={block}
                                onChange={e => setBlock(e.target.value)}
                                onBlur={e => setBlock(formatBlockStr(e.target.value))}
                                placeholder="e.g. 3rd Year B (Leave blank if none)"
                                maxLength={BLOCK_MAX}
                                className={`${inputCls} ${blockError ? "border-red-400 bg-red-50" : ""}`}
                                autoFocus
                              />
                            </Field>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={goBack} className="px-6 py-4 bg-white border border-zinc-200 text-zinc-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:border-zinc-300 hover:bg-zinc-50 transition-all active:scale-95 shadow-sm">
                      Back
                    </button>
                    <button type="submit" disabled={!step1Valid} className="flex-1 py-4 bg-[#06402B] text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95">
                      Professors <FaArrowRight size={13} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ─── STEP 2: Professors ─── */}
              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="space-y-6">
                  
                  <div className="bg-white rounded-3xl border-t-4 border-t-amber-500 border border-zinc-200 p-6 md:p-8 shadow-sm">
                    <h2 className="text-lg font-black text-zinc-800 mb-1 flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs"><FaSearch size={10} /></span>
                      Bonus Points Hunt
                    </h2>
                    <p className="text-sm font-medium text-zinc-500 mb-6 pl-8">
                      Search and add up to 6 professors who are giving bonus points for your attendance. Empty cards will be ignored.
                    </p>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <AnimatePresence>
                        {professors.map((entry, i) => {
                          const key = entry.professor && entry.subject ? `${entry.professor}::${entry.subject}` : "";
                          return (
                            <div key={i} className="h-full">
                              <ProfessorPicker
                                index={i} entry={entry}
                                onChange={e => updateProfessor(i, e)} onRemove={() => removeProfessor(i)}
                                canRemove={professors.length > 1} isDuplicate={!!key && duplicateKeys.has(key)}
                                studentType={studentType} globalBlock={block} 
                              />
                            </div>
                          );
                        })}
                      </AnimatePresence>

                      {professors.length < 6 && (
                        <button type="button" onClick={addProfessor} className="h-full min-h-[140px] border-2 border-dashed border-zinc-300 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-[#06402B] hover:border-[#06402B]/40 hover:bg-[#06402B]/5 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 bg-zinc-50/50">
                          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                            <FaPlus size={14} /> 
                          </div>
                          Add Subject
                        </button>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {hasDuplicateProfessors && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert" className="flex items-center gap-2 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold shadow-sm">
                        <FaExclamationTriangle size={14} className="shrink-0" /> Some professor + subject entries are duplicated. Fix or remove them to continue.
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {step2Valid && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-zinc-100 border border-zinc-200 rounded-3xl space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Final Review</p>
                      <p className="text-sm text-zinc-700"><span className="font-black text-zinc-900">{formatName(fullName)}</span> &bull; {idNumber.trim()}</p>
                      <p className="text-sm text-zinc-700 font-medium">{program} &bull; {yearLevel} &bull; {studentType === "regular" ? formatBlockStr(block) : (block.trim() ? `Irregular (${formatBlockStr(block)})` : "Irregular")}</p>
                      {filledProfessors.length > 0 && (
                        <p className="text-sm font-bold text-[#06402B] pt-2 flex items-center gap-2">
                          <FaCheckCircle /> {filledProfessors.length} Professor{filledProfessors.length !== 1 ? "s" : ""} securely attached.
                        </p>
                      )}
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert" className="flex items-center gap-2 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold shadow-sm">
                        <FaExclamationTriangle size={14} className="shrink-0" /> {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3">
                    <button type="button" onClick={goBack} className="px-6 py-4 bg-white border border-zinc-200 text-zinc-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:border-zinc-300 hover:bg-zinc-50 transition-all active:scale-95 shadow-sm">
                      Back
                    </button>
                    <button type="submit" disabled={!step2Valid || isSubmitting} className="flex-1 py-4 bg-[#06402B] text-white rounded-2xl font-black text-sm md:text-base uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-95">
                      {isSubmitting ? (
                        <><WalkingPaws size={16} className="text-white" /> Submitting…</>
                      ) : (
                        <>Complete Registration 🐾</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </form>
        </div>
      </div>
    </div>
  );
}