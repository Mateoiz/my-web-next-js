"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowRight, FaCheckCircle, FaCloudUploadAlt, FaExclamationTriangle,
  FaPlus, FaSearch, FaSpinner, FaTimes, FaTrashAlt, FaUndo, FaLightbulb,
  FaPaw, FaSeedling, FaLeaf, FaBone, FaWifi, FaUtensils, FaChevronRight,
  FaMicrophone, FaUserMd
} from "react-icons/fa";
import FloatingNature from "@/app/components/FloatingNature";
import WalkingPaws from "@/app/components/WalkingPaws";
import NatureCursor from "@/app/components/NatureCursor";

// ─── Programs & Year Levels ───────────────────────────────────────────────────

export const PROG_DVM = "Doctor of Veterinary Medicine";
export const PROG_AGRI = "Bachelor of Science in Agriculture";
export const PROG_FT = "Bachelor of Science in Food Technology";

export const YEAR_LEVELS = ["1st Year","2nd Year","3rd Year","4th Year","5th Year","6th Year"];
export const PROGRAM_OPTIONS = [PROG_DVM, PROG_AGRI, PROG_FT];

const DVM_AGRI = [PROG_DVM, PROG_AGRI];

// ─── Data ───────────────────────────────────────────────────────────────────── 

const blocks1stYear = [
  "1st Year A","1st Year B","1st Year C","1st Year D",
  "1st Year E","1st Year F","1st Year G","1st Year H",
];

const blocks2ndYear = [
  "2nd Year A","2nd Year B","2nd Year C","2nd Year D","2nd Year E",
  "2nd Year F","2nd Year G","2nd Year H","2nd Year I","2nd Year J",
  "2nd Year K","2nd Year L","2nd Year M","2nd Year N",
];

const blocks3rdYear = [
  "3rd Year A","3rd Year B","3rd Year C","3rd Year D","3rd Year E",
  "3rd Year F","3rd Year G","3rd Year H","3rd Year I","3rd Year J",
  "3rd Year K","3rd Year L",
];

// ─── Incentive badge metadata ─────────────────────────────────────────────────

export const PROFESSOR_INCENTIVE_SCOPE: Record<string, string> = {
  "Ellema, Jovanito":   "DVM & Agriculture Seminar",
  "Nicolas, Elma":      "All Events",
  "Olido, Elena":       "All Seminars",
  "Romualdo, Jenita":   "DVM Seminars",
  "Fragata, Helen":     "All Seminars",
  "Gravidez, Maurice":  "DVM Seminar",
  "Jimenez, Marlon":    "All Seminars",
  "Mirandilla, James Owen": "All Events",
  "Un Ho King, Solomon": "Food Tech Seminar",
  "Maniego, Janine":     "Food Tech Seminar",
  "Salem, Andrea Mae":   "Food Tech Seminar",
};

// ─── Professors offering incentives ─────────────────────────────────────────── 

export const PROFESSORS_DATA: Record<string, { subject: string; blocks: string[]; programs: string[] }[]> = {
  // ── 1st Year (DVM/Agri)
  "Jimenez, Marlon": [
    { subject: "Animal Production", blocks: blocks1stYear, programs: DVM_AGRI },
  ],
  "Gravidez, Maurice": [
    { subject: "Biochemistry Laboratory", blocks: blocks1stYear, programs: DVM_AGRI },
    { subject: "Embryology Laboratory",   blocks: blocks1stYear, programs: DVM_AGRI },
  ],

  // ── 2nd Year (DVM/Agri)
  "Fragata, Helen": [
    { subject: "Ruminant Production (BASC108A)", blocks: blocks2ndYear, programs: DVM_AGRI },
  ],
  "Ellema, Jovanito": [
    { subject: "Ruminant Production Laboratory (BASC108B)", blocks: blocks2ndYear, programs: DVM_AGRI },
  ],
  "Mirandilla, James Owen": [
    { subject: "Gross Anatomy Lecture (ANAT101A)", blocks: blocks2ndYear, programs: DVM_AGRI },
  ],
  "Romualdo, Jenita": [
    { subject: "Embryology Lecture (DEVA100A)", blocks: blocks2ndYear, programs: DVM_AGRI },
  ],

  // ── 3rd Year (DVM/Agri)
  "Nicolas, Elma": [
    { subject: "Pharmacology Laboratory", blocks: blocks3rdYear, programs: DVM_AGRI },
  ],
  "Olido, Elena": [
    { subject: "Systemic Pathology Laboratory", blocks: blocks3rdYear, programs: DVM_AGRI },
    { subject: "Ruminant Medicine",             blocks: ["4th Year"], programs: DVM_AGRI },
  ],

  // ── Food Technology Professors ──
  "Un Ho King, Solomon": [
    { subject: "Food Engineering (Laboratory)", blocks: ["Monday, 8:00 AM–2:00 PM"], programs: [PROG_FT] },
    { subject: "Food Engineering (Lecture)", blocks: ["Wednesday, 7:00 AM–9:00 AM"], programs: [PROG_FT] },
    { subject: "Product Development", blocks: ["Wednesday, 10:00 AM–12:00 PM"], programs: [PROG_FT] }
  ],
  "Maniego, Janine": [
    { subject: "Meat Science (Lecture)", blocks: ["Monday, 8:00 AM–11:00 AM"], programs: [PROG_FT] }
  ],
  "Salem, Andrea Mae": [ 
    { subject: "PUHL Lab", blocks: ["5th Year A","5th Year B","5th Year C"], programs: DVM_AGRI },
    { subject: "Food Analysis (Laboratory)", blocks: ["Monday, 11:30 AM–5:30 PM"], programs: [PROG_FT] },
    { subject: "Food Analysis (Lecture & Laboratory)", blocks: ["Wednesday, 8:00 AM–12:00 PM"], programs: [PROG_FT] }
  ]
};

// ─── Dynamic Seminar options ────────────────────────────────────────────────

interface SeminarOption {
  id: string;
  title: string;
  speaker: string;
  programs: string[];
}

export const SEMINAR_OPTIONS: SeminarOption[] = [
  {
    id: "lao-c-aller-genius",
    title: "Aller-Genius: New Frontiers in Veterinary Allergy Care",
    speaker: "Criselda C. Lao, DVM, RN, MAN, USRN, FelPCCP, FelPCVS-CA",
    programs: DVM_AGRI
  },
  {
    id: "lao-k-photobiomodulation",
    title: "Use of Photobiomodulation Therapy in Chronic Kidney Disease Cases in the Philippines: A Pilot Study",
    speaker: "Ken Anthony L. Lao, DVM, FelPCCP, FelPCVS-CA",
    programs: DVM_AGRI
  },
  {
    id: "sy-emergency",
    title: "Emergency Topic",
    speaker: "Nikki & Joshua Sy",
    programs: DVM_AGRI
  },
  {
    id: "austria-nutrition-surgery",
    title: "Nutrition in Surgery",
    speaker: "Everlyn Austria",
    programs: DVM_AGRI
  },
  {
    id: "dela-cruz-source",
    title: "From Source to Safety: The importance of water microbiology in public health and food system",
    speaker: "Mr. Bryan Dela Cruz",
    programs: [PROG_FT]
  }
];

interface ProfessorEntry { professor: string; subject: string; block: string; }

// ─── Validators ───────────────────────────────────────────────────────────────

const NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ''.,\- ]+$/;
const BLOCK_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ0-9'\- ]+$/;
const ID_REGEX = /^20\d{2}-\d{2}-\d{6}$/;
const ID_MAX = 14;
const NAME_MAX = 100;
const BLOCK_MAX = 40;
const MAX_PROFESSORS = 6;
const DRAFT_KEY = "cvmas_register_draft_v2";

function formatName(s: string) {
  return s.replace(/\s+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase());
}
function formatBlockStr(s: string) {
  return s.replace(/\s+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase());
}
function isValidProfessorEntry(p: ProfessorEntry, program: string): boolean {
  if (!p.professor || !p.subject || !p.block) return false;
  const subjectData = PROFESSORS_DATA[p.professor]?.find(s => s.subject === p.subject && s.programs.includes(program));
  if (!subjectData) return false;
  if (subjectData.blocks.includes(p.block)) return true;
  const trimmed = p.block.trim();
  return trimmed.length > 0 && trimmed.length <= BLOCK_MAX && BLOCK_REGEX.test(trimmed);
}

// ─── Professor Picker ─────────────────────────────────────────────────────────

function ProfessorPicker({
  entry, index, onChange, onRemove, canRemove, isDuplicate, studentType, globalBlock, program
}: {
  entry: ProfessorEntry; index: number;
  onChange: (e: ProfessorEntry) => void;
  onRemove: () => void; canRemove: boolean;
  isDuplicate: boolean;
  studentType: "regular" | "irregular" | "";
  globalBlock: string;
  program: string;
}) {
  const [searchQuery, setSearchQuery] = useState(entry.professor);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [customBlockMode, setCustomBlockMode] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter professors to only those who teach subjects for the selected program
  const programProfessors = useMemo(() => {
    return Object.keys(PROFESSORS_DATA).filter(prof => 
      PROFESSORS_DATA[prof].some(s => s.programs.includes(program))
    );
  }, [program]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return programProfessors.filter(p => {
      if (p.toLowerCase().includes(q)) return true;
      return PROFESSORS_DATA[p].some(s => s.programs.includes(program) && s.subject.toLowerCase().includes(q));
    });
  }, [searchQuery, programProfessors, program]);

  const selectedSubjects = entry.professor ? (PROFESSORS_DATA[entry.professor] || []).filter(s => s.programs.includes(program)) : [];
  const selectedBlocks = entry.subject
    ? selectedSubjects.find(s => s.subject === entry.subject)?.blocks ?? []
    : [];

  const customBlockInvalid = customBlockMode && entry.block.trim().length > 0 &&
    (!BLOCK_REGEX.test(entry.block.trim()) || entry.block.trim().length > BLOCK_MAX);

  const isComplete = !!(entry.professor && entry.subject && entry.block) && !customBlockInvalid;

  useEffect(() => {
    setSearchQuery(entry.professor);
    if (entry.block && selectedBlocks.length > 0 && !selectedBlocks.includes(entry.block)) {
      setCustomBlockMode(true);
    }
  }, [entry.professor]);

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
    
    // Auto-select subject and block if there's only one option for this program
    const subjects = (PROFESSORS_DATA[name] ?? []).filter(s => s.programs.includes(program));
    let autoSubject = "", autoBlock = "";
    
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
      if (subjData.blocks.length === 1) autoBlock = subjData.blocks[0];
      else if (studentType === "regular" && globalBlock) {
        const match = subjData.blocks.find(b => b.toLowerCase() === globalBlock.toLowerCase());
        if (match) autoBlock = match;
      }
    }
    onChange({ ...entry, subject: subjName, block: autoBlock });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if ((e.key === "ArrowDown" || e.key === "Enter") && searchQuery.trim().length > 0) { e.preventDefault(); setOpen(true); }
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
      className={`rounded-2xl border-2 transition-all bg-white shadow-sm ${
        isDuplicate ? "border-red-300 bg-red-50/50"
        : isComplete ? "border-[#06402B]/30 bg-[#06402B]/[0.03]"
        : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-colors shrink-0 ${
            isDuplicate ? "bg-red-500 text-white"
            : isComplete ? "bg-[#06402B] text-white"
            : "bg-emerald-50 text-emerald-700"
          }`}>
            {isDuplicate ? <FaExclamationTriangle size={9} /> : isComplete ? <FaCheckCircle size={10} /> : <span className="font-black">{index + 1}</span>}
          </div>
          <span className="text-xs font-black text-zinc-500 truncate max-w-[160px]">
            {isComplete ? `${entry.professor}` : `Professor ${index + 1}`}
          </span>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="p-1.5 text-zinc-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all shrink-0">
            <FaTrashAlt size={10} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Search */}
        <div ref={wrapRef} className="relative">
          <div className="relative">
            <FaSearch size={11} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              ref={inputRef} type="text" value={searchQuery}
              onChange={e => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val !== entry.professor) { setCustomBlockMode(false); onChange({ professor: "", subject: "", block: "" }); }
                setOpen(val.trim().length > 0);
              }}
              onFocus={() => { if (searchQuery.trim().length > 0 && !entry.professor) setOpen(true); }}
              onKeyDown={handleKeyDown}
              placeholder="Name or subject code…"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-9 py-2.5 text-sm font-medium text-zinc-900 outline-none focus:border-[#06402B] focus:ring-2 focus:ring-[#06402B]/10 transition-all placeholder:text-zinc-400"
              autoComplete="off" autoCorrect="off" spellCheck={false}
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
                initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.12 }}
                className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-zinc-200 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden"
              >
                {filtered.length === 0 ? (
                  <div className="px-4 py-5 text-center">
                    <p className="text-sm text-zinc-400 font-medium">No match</p>
                    <p className="text-[11px] text-zinc-400 mt-1">Try a last name or subject code like "RZAL101A"</p>
                  </div>
                ) : (
                  <ul className="max-h-48 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
                    {filtered.map((prof, i) => {
                      const q = searchQuery.trim().toLowerCase();
                      const matchIdx = prof.toLowerCase().indexOf(q);
                      const subjects = PROFESSORS_DATA[prof] || [];
                      const matchedSubject = matchIdx < 0 ? subjects.find(s => s.programs.includes(program) && s.subject.toLowerCase().includes(q)) : null;
                      return (
                        <li key={prof}>
                          <button type="button"
                            onMouseDown={e => { e.preventDefault(); selectProfessor(prof); }}
                            onMouseEnter={() => setHighlightIndex(i)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between gap-2 ${
                              i === highlightIndex ? "bg-[#06402B]/10 text-[#06402B]" : "text-zinc-700 hover:bg-zinc-50"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="truncate block">
                                {matchIdx >= 0 ? (
                                  <>{prof.slice(0, matchIdx)}<span className="font-black text-[#06402B]">{prof.slice(matchIdx, matchIdx + q.length)}</span>{prof.slice(matchIdx + q.length)}</>
                                ) : prof}
                              </span>
                              {matchedSubject && <span className="text-[10px] text-zinc-400 font-normal">matches {matchedSubject.subject}</span>}
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
              <div className="flex flex-wrap gap-1.5">
                {selectedSubjects.map(s => (
                  <button key={s.subject} type="button" onClick={() => selectSubject(s.subject)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      entry.subject === s.subject ? "bg-[#06402B] text-white border-[#06402B] shadow-sm" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-[#06402B]/40"
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
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Block or Schedule</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedBlocks.map(b => (
                  <button key={b} type="button" onClick={() => { setCustomBlockMode(false); onChange({ ...entry, block: b }); }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                      entry.block === b && !customBlockMode ? "bg-[#06402B] text-white border-[#06402B] shadow-sm" : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-[#06402B]/40"
                    }`}
                  >
                    {b}
                  </button>
                ))}
                <button type="button" onClick={() => { setCustomBlockMode(true); onChange({ ...entry, block: "" }); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border border-dashed ${
                    customBlockMode ? "bg-zinc-200 text-zinc-800 border-zinc-400" : "bg-transparent text-zinc-400 border-zinc-300 hover:text-zinc-600"
                  }`}
                >
                  + Other
                </button>
              </div>
              <AnimatePresence>
                {customBlockMode && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-2 space-y-1">
                    <input
                      type="text" value={entry.block}
                      onChange={e => onChange({ ...entry, block: e.target.value })}
                      onBlur={e => onChange({ ...entry, block: formatBlockStr(e.target.value) })}
                      placeholder="e.g. VETMED2-J"
                      maxLength={BLOCK_MAX}
                      className={`w-full bg-zinc-50 border rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 outline-none focus:border-[#06402B] transition-all ${
                        customBlockInvalid ? "border-red-400 bg-red-50" : "border-zinc-200"
                      }`}
                      autoFocus
                    />
                    {customBlockInvalid && (
                      <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                        <FaExclamationTriangle size={9} /> Letters, numbers, spaces, dashes only.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Incentive scope badge */}
      <AnimatePresence>
        {entry.professor && PROFESSOR_INCENTIVE_SCOPE[entry.professor] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mx-4 mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl"
          >
            <span className="text-amber-500 text-[10px]">🎁</span>
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
              Incentive for: {PROFESSOR_INCENTIVE_SCOPE[entry.professor]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer status */}
      <AnimatePresence>
        {isDuplicate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 rounded-b-2xl border-t border-red-200">
            <FaExclamationTriangle size={9} className="text-red-500 shrink-0" />
            <p className="text-[11px] font-bold text-red-600">Duplicate entry — already added above.</p>
          </motion.div>
        )}
        {isComplete && !isDuplicate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-4 py-2.5 bg-[#06402B]/10 rounded-b-2xl border-t border-[#06402B]/20">
            <FaCheckCircle size={9} className="text-[#06402B] shrink-0" />
            <p className="text-[11px] font-bold text-[#06402B] truncate">{entry.subject} · {entry.block}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, warning, hint, children, className = "", htmlFor, required }: {
  label: string; error?: string; warning?: string; hint?: string;
  children: React.ReactNode; className?: string; htmlFor?: string; required?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-[11px] font-black uppercase tracking-widest text-zinc-500">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && !warning && <p className="text-[10px] text-zinc-400 font-medium">{hint}</p>}
      <AnimatePresence>
        {warning && !error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            role="status" className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 overflow-hidden"
          >
            <FaExclamationTriangle size={9} /> {warning}
          </motion.p>
        )}
        {error && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            role="alert" className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 overflow-hidden"
          >
            <FaExclamationTriangle size={9} /> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls = "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-[#06402B] focus:ring-2 focus:ring-[#06402B]/10 transition-all placeholder:text-zinc-400 appearance-none";

// ─── Main ─────────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

export default function RegisterPage() {
  const router = useRouter();
  const { setTheme } = useTheme();
  useEffect(() => { setTheme("light"); }, [setTheme]);

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [program, setProgram] = useState(PROGRAM_OPTIONS[0]);
  const [yearLevel, setYearLevel] = useState("");
  const [studentType, setStudentType] = useState<"regular" | "irregular" | "">("");
  const [block, setBlock] = useState("");
  const [seminars, setSeminars] = useState<string[]>([]);
  const [professors, setProfessors] = useState<ProfessorEntry[]>([{ professor: "", subject: "", block: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [idError, setIdError] = useState("");
  const [idChecking, setIdChecking] = useState(false);
  const [idYearWarning, setIdYearWarning] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const errorRef = useRef<HTMLDivElement>(null);
  const submitLockRef = useRef(false);
  const draftClearedRef = useRef(false);
  const idCheckTokenRef = useRef(0);
  const hydratedRef = useRef(false);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }, []);

  const toggleSeminar = useCallback((id: string) => {
    setSeminars(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }, []);

  // Filter available seminars dynamically based on selected program
  const availableSeminars = useMemo(() => {
    return SEMINAR_OPTIONS.filter(sem => sem.programs.includes(program));
  }, [program]);

  // Draft restore
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.fullName) setFullName(d.fullName);
        if (d.idNumber) setIdNumber(d.idNumber);
        if (d.program) setProgram(d.program);
        if (d.yearLevel) setYearLevel(d.yearLevel);
        if (d.studentType) setStudentType(d.studentType);
        if (d.block) setBlock(d.block);
        if (Array.isArray(d.seminars)) setSeminars(d.seminars);
        if (Array.isArray(d.professors) && d.professors.length > 0) setProfessors(d.professors);
        if (typeof d.step === "number") setStep(d.step);
        setDraftRestored(true);
      }
    } catch {}
    hydratedRef.current = true;
  }, []);

  // Autosave draft
  useEffect(() => {
    if (!hydratedRef.current || draftClearedRef.current) return;
    const hasContent = fullName || idNumber || yearLevel || studentType || block || seminars.length > 0 || professors.some(p => p.professor);
    if (!hasContent) return;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ fullName, idNumber, program, yearLevel, studentType, block, seminars, professors, step })); } catch {}
  }, [fullName, idNumber, program, yearLevel, studentType, block, seminars, professors, step]);

  // Before unload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (draftClearedRef.current || isSubmitting) return;
      if (fullName || idNumber || yearLevel || block || seminars.length > 0 || professors.some(p => p.professor)) {
        e.preventDefault(); e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [fullName, idNumber, yearLevel, block, seminars, professors, isSubmitting]);

  // Connectivity
  useEffect(() => {
    setIsOffline(typeof navigator !== "undefined" && !navigator.onLine);
    const goOn = () => setIsOffline(false);
    const goOff = () => setIsOffline(true);
    window.addEventListener("online", goOn);
    window.addEventListener("offline", goOff);
    return () => { window.removeEventListener("online", goOn); window.removeEventListener("offline", goOff); };
  }, []);

  const clearDraft = useCallback(() => {
    draftClearedRef.current = true;
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
  }, []);

  const startOver = useCallback(() => {
    if (!window.confirm("Discard this draft and start fresh?")) return;
    setFullName(""); setIdNumber(""); setYearLevel(""); setStudentType(""); setBlock("");
    setSeminars([]);
    setProfessors([{ professor: "", subject: "", block: "" }]);
    setStep(0); setIdError(""); setError("");
    clearDraft(); draftClearedRef.current = false; setDraftRestored(false);
  }, [clearDraft]);

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    let f = digits.slice(0, 12);
    if (f.length > 6) f = `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6)}`;
    else if (f.length > 4) f = `${f.slice(0, 4)}-${f.slice(4)}`;
    setIdNumber(f);
  };

useEffect(() => {
    const trimmed = idNumber.trim();
    
    // 1. If empty, stop animation and clear errors
    if (!trimmed) { 
      setIdError(""); 
      setIdChecking(false); 
      setIdYearWarning(""); 
      return; 
    }
    
    // 2. WHILE TYPING: Show the walking paws (idChecking = true), but DON'T query the DB yet
    if (!ID_REGEX.test(trimmed)) { 
      setIdError(""); 
      setIdChecking(true); 
      setIdYearWarning(""); 
      return; 
    }
    
    // 3. DONE TYPING: Check for weird years
    const yearPart = parseInt(trimmed.slice(0, 4), 10);
    const currentYear = new Date().getFullYear();
    setIdYearWarning(yearPart < currentYear - 8 || yearPart > currentYear + 1 ? `Double-check — "${yearPart}" looks unusual.` : "");
    
    // 4. QUERY DB: Keep paws walking while checking Firebase
    const token = ++idCheckTokenRef.current;
    setIdChecking(true); 
    setIdError("");
    
    const t = setTimeout(async () => {
      try {
        const snap = await getDocs(query(collection(db, "cvmas_registrations"), where("idNumber", "==", trimmed)));
        if (idCheckTokenRef.current !== token) return;
        setIdError(snap.empty ? "" : "This ID number is already registered.");
      } catch {
        if (idCheckTokenRef.current === token) setIdError("Couldn't verify ID — check your connection.");
      } finally {
        if (idCheckTokenRef.current === token) setIdChecking(false);
      }
    }, 550);
    
    return () => clearTimeout(t);
  }, [idNumber]);

  const nameError = useMemo(() => {
    const t = fullName.trim();
    if (!t) return "";
    if (t.length < 3) return "Name must be at least 3 characters.";
    if (t.length > NAME_MAX) return `Too long (max ${NAME_MAX}).`;
    if (!NAME_REGEX.test(t)) return "Use letters and basic punctuation only.";
    return "";
  }, [fullName]);

  const blockError = useMemo(() => {
    const t = block.trim();
    if (!t) return "";
    if (t.length > BLOCK_MAX) return `Too long (max ${BLOCK_MAX}).`;
    if (!BLOCK_REGEX.test(t)) return "Use letters, numbers, spaces, dashes only.";
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

  const step0Valid = useMemo(() =>
    fullName.trim().length >= 3 && !nameError && ID_REGEX.test(idNumber) && !idError && !idChecking,
    [fullName, nameError, idNumber, idError, idChecking]
  );

  const seminarsValid = seminars.length > 0;

  const step1Valid = useMemo(() =>
    !!yearLevel && !!studentType && !blockError && (studentType === "irregular" || block.trim().length > 0) && seminarsValid,
    [yearLevel, studentType, block, blockError, seminarsValid]
  );

  const filledProfessors = useMemo(() => professors.filter(p => isValidProfessorEntry(p, program)), [professors, program]);
  const hasDuplicateProfessors = duplicateKeys.size > 0;
  const step2Valid = useMemo(() =>
  !hasDuplicateProfessors,
  [hasDuplicateProfessors]
);
  const incompleteProfessorCount = useMemo(() => professors.filter(p => (p.professor || p.subject || p.block) && !isValidProfessorEntry(p, program)).length, [professors, program]);

  const goNext = () => { setError(""); setStep(s => Math.min(s + 1, TOTAL_STEPS - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goBack = () => { setError(""); setStep(s => Math.max(s - 1, 0)); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 0) { if (step0Valid) goNext(); else showError("Please complete every field before continuing."); return; }
    if (step === 1) {
      if (step1Valid) goNext();
      else showError(!seminarsValid ? "Select at least one seminar you're attending." : "Please complete every field before continuing.");
      return;
    }
    if (!step2Valid) { showError(hasDuplicateProfessors ? "Fix duplicate professor entries first." : "Add at least one complete professor entry."); return; }
    if (nameError || idError || blockError) { showError("Please fix highlighted fields before submitting."); return; }
    if (isSubmitting || submitLockRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { showError("You're offline. Reconnect and try again."); return; }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setError("");

    const cleanName = formatName(fullName);
    const cleanId = idNumber.trim();
    const cleanBlock = studentType === "regular" ? formatBlockStr(block) : block.trim() ? `Irregular (${formatBlockStr(block)})` : "Irregular";
    const finalProfessors = professors.filter(p => isValidProfessorEntry(p, program));
    const finalSeminars = SEMINAR_OPTIONS.filter(s => seminars.includes(s.id));
    if (finalSeminars.length === 0) { showError("Select at least one seminar you're attending."); setIsSubmitting(false); submitLockRef.current = false; return; }

    try {
      const submitPromise = (async () => {
        const snap = await getDocs(query(collection(db, "cvmas_registrations"), where("idNumber", "==", cleanId)));
        if (!snap.empty) throw new Error("duplicate-id");
        return addDoc(collection(db, "cvmas_registrations"), {
          fullName: cleanName, idNumber: cleanId, program, yearLevel, studentType,
          block: cleanBlock, professors: finalProfessors,
          seminars: finalSeminars,
          status: "pre-registered", createdAt: serverTimestamp(),
        });
      })();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("network-timeout")), 10000));
      const docRef = await Promise.race([submitPromise, timeoutPromise]) as any;
      clearDraft();
      router.push(`/confirm/${docRef.id}`);
    } catch (err: any) {
      if (err.message === "duplicate-id") showError("This ID number is already registered.");
      else if (err.message === "network-timeout") showError("Connection timed out. Check your Wi-Fi and try again.");
      else { showError("Something went wrong. Please try again."); console.error(err); }
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const stepConfig = [
    { title: "Your Details", desc: "Name and ID number", color: "border-t-[#06402B]", icon: <FaPaw size={14} /> },
    { title: "Academic Roots", desc: "Year level, block & seminars", color: "border-t-emerald-500", icon: <FaSeedling size={14} /> },
    { title: "Bonus Points Hunt", desc: "Professors giving incentives", color: "border-t-amber-500", icon: <FaSearch size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[#f5f8f5] font-sans text-zinc-900 selection:bg-emerald-200 overflow-x-hidden">

      {/* Offline banner */}
      <AnimatePresence>
        {isOffline && (
          <motion.div initial={{ y: -50 }} animate={{ y: 0 }} exit={{ y: -50 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-center py-2 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <FaWifi size={11} /> You're offline — reconnect to save your registration
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(#10b981 1px, transparent 1px)", backgroundSize: "40px 40px", opacity: 0.07 }} />
        <div className="absolute top-0 left-0 right-0 h-[60vh] bg-gradient-to-b from-[#06402B]/8 to-transparent" />
        <div className="absolute top-[5%] right-[-5%] w-[400px] h-[400px] bg-emerald-400/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[120px]" />
        <div className="absolute inset-0 text-emerald-700/15">
          <FloatingNature />
        </div>
      </div>

      <div className="hidden md:block"><NatureCursor /></div>

      {/* ── HERO HEADER ── full width, bold, themed */}
      <div className="relative z-10 pt-24 md:pt-28 pb-0">
        <div className="w-full px-4 sm:px-8 md:px-12 lg:px-16">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#06402B] shadow-2xl mb-0">
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />

            <div className="relative px-6 sm:px-10 md:px-14 py-10 md:py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-4">
                  🐾 DLSAU · CVMAS Week 2026
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight mb-2">
                  Hilway<br className="sm:hidden" /> Talks
                </h1>
                <p className="text-emerald-100/80 text-sm md:text-base font-medium max-w-md leading-relaxed">
                  Register to get your official entrance QR code. Screenshot it after — you'll need it at the door.
                </p>
              </div>

              {/* Step overview — desktop only */}
              <div className="hidden lg:flex flex-col gap-2 shrink-0">
                {stepConfig.map((s, i) => (
                  <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                    i === step ? "bg-white/15 text-white" : i < step ? "text-emerald-300" : "text-white/40"
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      i < step ? "bg-emerald-400 text-white" : i === step ? "bg-white text-[#06402B]" : "bg-white/10 text-white/40"
                    }`}>
                      {i < step ? <FaCheckCircle size={10} /> : i + 1}
                    </div>
                    <span className="text-sm font-bold">{s.title}</span>
                    {i === step && <FaChevronRight size={9} className="ml-auto opacity-60" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar at bottom of hero */}
            <div className="h-1 bg-white/10">
              <motion.div
                animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full bg-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── FORM BODY ── */}
      <div className="relative z-10 w-full px-4 sm:px-8 md:px-12 lg:px-16 py-6 md:py-8">

        {/* Mobile step indicator */}
        <div className="flex items-center gap-2 mb-6 lg:hidden">
          {stepConfig.map((s, i) => (
            <div key={i} className={`flex items-center gap-2 ${i < stepConfig.length - 1 ? "flex-1" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${
                i < step ? "bg-[#06402B] text-white" : i === step ? "bg-[#06402B] text-white ring-4 ring-[#06402B]/20" : "bg-zinc-200 text-zinc-500"
              }`}>
                {i < step ? <FaCheckCircle size={10} /> : i + 1}
              </div>
              {i < stepConfig.length - 1 && (
                <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-zinc-200">
                  <div className={`h-full bg-[#06402B] transition-all duration-500 ${i < step ? "w-full" : "w-0"}`} />
                </div>
              )}
            </div>
          ))}
          <p className="ml-3 text-xs font-black text-[#06402B] shrink-0">{stepConfig[step].title}</p>
        </div>

        {/* Draft restored banner */}
        <AnimatePresence>
          {draftRestored && step === 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
              <div className="flex items-center gap-3 p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm">
                <FaCloudUploadAlt className="text-zinc-400 shrink-0" size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-700">Draft restored from your last session</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Your progress was saved automatically.</p>
                </div>
                <button type="button" onClick={startOver} className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-500 border border-zinc-200 hover:border-red-200 rounded-xl transition-all shrink-0">
                  <FaUndo size={10} /> Restart
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} noValidate>
          <AnimatePresence mode="wait">

            {/* ── STEP 0: Personal Info ── */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                  {/* Main form card */}
                  <div className="xl:col-span-2 bg-white rounded-3xl border border-zinc-200 border-t-4 border-t-[#06402B] shadow-sm p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-2xl bg-[#06402B]/10 text-[#06402B] flex items-center justify-center shrink-0"><FaPaw size={15} /></div>
                      <div>
                        <h2 className="text-lg font-black text-zinc-900 leading-none">Your Details</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">Name and student ID</p>
                      </div>
                    </div>

                    <Field label="Full Name" error={nameError} required htmlFor="fullName">
                      <input
                        id="fullName" type="text" value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        onBlur={e => setFullName(formatName(e.target.value))}
                        placeholder="Last Name, First Name M.I."
                        maxLength={NAME_MAX}
                        className={`${inputCls} ${nameError ? "border-red-400 bg-red-50" : ""}`}
                        autoComplete="name" autoFocus
                      />
                    </Field>

                    <Field label="ID Number" error={idError} warning={idYearWarning} hint="Format: 20XX-XX-XXXXXX" required htmlFor="idNumber">
                      <div className="relative">
                        <input
                          id="idNumber"
                          type="text" 
                          inputMode="numeric"
                          value={idNumber}
                          onChange={handleIdChange}
                          placeholder="20XX-XX-XXXXXX"
                          maxLength={ID_MAX}
                          // Added pr-14 to give the 3 paws enough room to animate
                          className={`${inputCls} font-mono tracking-widest ${idError ? "border-red-400 bg-red-50" : ""} pr-14`}
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-end">
                          {/* Renders the custom animation when checking */}
                          {idChecking && <WalkingPaws size={10} className="text-[#06402B]" />}
                          
                          {/* Success / Error states */}
                          {!idChecking && ID_REGEX.test(idNumber) && !idError && <FaCheckCircle size={12} className="text-[#06402B]" />}
                          {!idChecking && idError && <FaExclamationTriangle size={12} className="text-red-500" />}
                        </div>
                      </div>
                    </Field>

                    <Field label="Program" required>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {PROGRAM_OPTIONS.map(p => {
                          const Icon = p.includes("Veterinary") ? FaBone : p.includes("Food") ? FaUtensils : FaSeedling;
                          return (
                            <button key={p} type="button" onClick={() => {
                              if (program !== p) {
                                setProgram(p);
                                setSeminars([]); // Reset seminars on program change to avoid keeping invalid options
                                setProfessors([{ professor: "", subject: "", block: "" }]); // Reset professors to prevent DVM profs being sent for Food Tech
                              }
                            }}
                              className={`w-full py-3 px-4 rounded-xl border-2 text-xs font-black transition-all flex flex-col items-center gap-2 text-center leading-tight ${
                                program === p ? "border-[#06402B] bg-[#06402B]/5 text-[#06402B] shadow-sm" : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50"
                              }`}
                            >
                              <Icon size={16} className={program === p ? "text-[#06402B]" : "text-zinc-400"} />
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <FaLightbulb className="text-blue-500 shrink-0" size={14} />
                        <p className="text-[11px] font-black uppercase tracking-widest text-blue-800">Important</p>
                      </div>
                      <p className="text-xs font-medium text-blue-700 leading-relaxed">
                        Your ID number is permanently linked to your QR code and <strong>cannot be changed</strong> after submission. Double-check before continuing.
                      </p>
                    </div>

                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
                      <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">What happens next</p>
                      {[
                        "Fill out 3 quick steps",
                        "Get your personal QR code",
                        "Screenshot it and show at the door",
                      ].map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full bg-[#06402B]/10 text-[#06402B] flex items-center justify-center text-[9px] font-black shrink-0">{i + 1}</div>
                          <p className="text-xs font-medium text-zinc-600">{s}</p>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
<button type="submit" disabled={!step2Valid || isSubmitting || isOffline}
  className="flex-1 py-4 bg-[#06402B] ..."
>
  {isSubmitting ? (
    <><FaSpinner className="animate-spin" size={14} /> Submitting…</>
  ) : isOffline ? (
    <><FaWifi size={13} /> Offline — Reconnect</>
  ) : filledProfessors.length === 0 ? (
    <>Skip & Register 🐾</>
  ) : (
    <>Complete Registration 🐾</>
  )}
</button>

                    {!step0Valid && (
                      <p className="text-center text-[11px] text-zinc-400 font-medium">
                        {!fullName.trim() ? "Enter your name to continue" : !ID_REGEX.test(idNumber) ? "Complete your ID number" : idChecking ? "Verifying ID…" : idError || ""}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: Academic Details ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                  <div className="xl:col-span-2 bg-white rounded-3xl border border-zinc-200 border-t-4 border-t-emerald-500 shadow-sm p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><FaSeedling size={15} /></div>
                      <div>
                        <h2 className="text-lg font-black text-zinc-900 leading-none">Academic Roots</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">Year level, block section, and seminars</p>
                      </div>
                    </div>

                    <Field label="Year Level" required>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field label="Student Type" required>
                        <div className="grid grid-cols-2 gap-3">
                          {(["regular", "irregular"] as const).map(type => (
                            <button key={type} type="button" onClick={() => { setStudentType(type); setBlock(""); }}
                              className={`py-4 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all ${
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
                          <motion.div key="reg" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                            <Field label="Block Section" error={blockError} required htmlFor="block">
                              <input
                                id="block" type="text" value={block}
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
                          <motion.div key="irreg" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                            <Field label="Base Block (Optional)" error={blockError} htmlFor="blockIrr">
                              <input
                                id="blockIrr" type="text" value={block}
                                onChange={e => setBlock(e.target.value)}
                                onBlur={e => setBlock(formatBlockStr(e.target.value))}
                                placeholder="Leave blank if none"
                                maxLength={BLOCK_MAX}
                                className={`${inputCls} ${blockError ? "border-red-400 bg-red-50" : ""}`}
                                autoFocus
                              />
                            </Field>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <Field
                      label="Seminars You're Attending"
                      required
                      hint="Select every session you plan to attend — this is used for attendance and record keeping."
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableSeminars.map(sem => {
                          const selected = seminars.includes(sem.id);
                          return (
                            <button
                              key={sem.id}
                              type="button"
                              onClick={() => toggleSeminar(sem.id)}
                              aria-pressed={selected}
                              className={`text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                                selected
                                  ? "border-[#06402B] bg-[#06402B]/5 shadow-sm"
                                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                selected ? "bg-[#06402B] text-white" : "bg-zinc-100 text-zinc-400"
                              }`}>
                                {selected ? <FaCheckCircle size={12} /> : <FaMicrophone size={11} />}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-black leading-snug ${selected ? "text-[#06402B]" : "text-zinc-800"}`}>
                                  {sem.title}
                                </p>
                                <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 mt-1">
                                  <FaUserMd size={9} className="shrink-0" /> {sem.speaker}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                      <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-3">Your progress</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500 font-medium">Name</span>
                          <span className="font-black text-zinc-900 truncate max-w-[140px]">{formatName(fullName)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500 font-medium">ID</span>
                          <span className="font-mono font-black text-zinc-900">{idNumber}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500 font-medium">Program</span>
                          <span className="font-bold text-zinc-700 truncate max-w-[140px]">{program.split(" ")[0]}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500 font-medium">Seminars</span>
                          <span className="font-bold text-zinc-700">{seminars.length || "—"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-auto">
                      <button type="button" onClick={goBack}
                        className="px-5 py-4 bg-white border border-zinc-200 text-zinc-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:border-zinc-300 hover:bg-zinc-50 transition-all active:scale-95 shadow-sm"
                      >
                        Back
                      </button>
                      <button type="submit" disabled={!step1Valid}
                        className="flex-1 py-4 bg-[#06402B] text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        Professors <FaArrowRight size={13} />
                      </button>
                    </div>
                    {!step1Valid && !seminarsValid && !!yearLevel && !!studentType && (
                      <p className="text-center text-[11px] text-zinc-400 font-medium">
                        Select at least one seminar to continue
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }} className="space-y-5">

                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm">
                  <FaExclamationTriangle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-amber-800 mb-0.5">Bonus Points Notice</p>
                    <p className="text-xs font-medium text-amber-700 leading-relaxed">
                      Only professors who confirmed they are giving bonus points appear in the list. Enter your correct subject and block — <strong className="font-black">this is what gets submitted to your professor</strong>.
                    </p>
                  </div>
                </div>

                {/* Section header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><FaSearch size={14} /></div>
                    <div>
                      <h2 className="text-lg font-black text-zinc-900 leading-none">Bonus Points Hunt</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {filledProfessors.length > 0
                        ? `${filledProfessors.length} professor${filledProfessors.length !== 1 ? "s" : ""} added`
                        : "Only professors confirmed to give incentives are listed"}
                    </p>
                    </div>
                  </div>
                  {professors.length < MAX_PROFESSORS && (
                    <button type="button" onClick={() => setProfessors(p => [...p, { professor: "", subject: "", block: "" }])}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-600 rounded-xl font-black text-xs uppercase tracking-widest hover:border-[#06402B]/30 hover:text-[#06402B] transition-all shadow-sm active:scale-95"
                    >
                      <FaPlus size={10} /> Add
                    </button>
                  )}
                </div>

                {/* Professor grid — 1 col on mobile, 2 on md, 3 on xl */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {professors.map((entry, i) => {
                      const key = entry.professor && entry.subject ? `${entry.professor}::${entry.subject}` : "";
                      return (
                        <ProfessorPicker
                          key={i} index={i} entry={entry}
                          onChange={e => setProfessors(p => p.map((x, idx) => idx === i ? e : x))}
                          onRemove={() => setProfessors(p => p.filter((_, idx) => idx !== i))}
                          canRemove={professors.length > 1}
                          isDuplicate={!!key && duplicateKeys.has(key)}
                          studentType={studentType} globalBlock={block}
                          program={program}
                        />
                      );
                    })}
                    

                    {/* Add card */}
                    {professors.length < MAX_PROFESSORS && (
                      <motion.button
                        key="add-card"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        type="button" onClick={() => setProfessors(p => [...p, { professor: "", subject: "", block: "" }])}
                        className="min-h-[140px] border-2 border-dashed border-zinc-300 rounded-2xl text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-[#06402B] hover:border-[#06402B]/40 hover:bg-[#06402B]/5 transition-all flex flex-col items-center justify-center gap-3 active:scale-95 bg-zinc-50/50"
                      >
                        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center"><FaPlus size={14} /></div>
                        Add Subject
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Warnings */}
                <AnimatePresence>
                  {hasDuplicateProfessors && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert"
                      className="flex items-center gap-2 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold shadow-sm"
                    >
                      <FaExclamationTriangle size={13} className="shrink-0" /> Duplicate professor + subject entries detected. Fix them to continue.
                    </motion.div>
                  )}
                  {!hasDuplicateProfessors && incompleteProfessorCount > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status"
                      className="flex items-center gap-2 px-5 py-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-xs font-bold shadow-sm"
                    >
                      <FaExclamationTriangle size={13} className="shrink-0" />
                      {incompleteProfessorCount} incomplete card{incompleteProfessorCount > 1 ? "s" : ""} — won't be included unless finished.
                    </motion.div>
                  )}
                </AnimatePresence>
                    
                    
{/* Add this below the professor grid */}
<p className="text-center text-[11px] text-zinc-400 font-medium">
  No professor incentives?{" "}
  <span className="font-bold text-zinc-500">You can skip this step.</span>
</p>
                {/* Final review */}
                {step2Valid && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm"
                  >
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3">Review before submitting</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Student</p>
                        <p className="font-black text-zinc-900">{formatName(fullName)}</p>
                        <p className="font-mono text-zinc-600 text-xs">{idNumber}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Academic</p>
                        <p className="font-bold text-zinc-700 text-xs">{yearLevel} · {studentType === "regular" ? formatBlockStr(block) : "Irregular"}</p>
                        <p className="text-zinc-500 text-xs">{program.split(" ")[0]}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-100">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Seminars ({seminars.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {SEMINAR_OPTIONS.filter(s => seminars.includes(s.id)).map(s => (
                          <span key={s.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-bold">
                            <FaMicrophone size={9} /> {s.title}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-100">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2">Professors ({filledProfessors.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {filledProfessors.map((p, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#06402B]/10 text-[#06402B] rounded-lg text-[11px] font-bold">
                            <FaCheckCircle size={9} /> {p.professor.split(",")[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div ref={errorRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert"
                      className="flex items-center gap-2 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold shadow-sm"
                    >
                      <FaExclamationTriangle size={13} className="shrink-0" /> {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={goBack}
                    className="px-6 py-4 bg-white border border-zinc-200 text-zinc-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:border-zinc-300 hover:bg-zinc-50 transition-all active:scale-95 shadow-sm"
                  >
                    Back
                  </button>
                  <button type="submit" disabled={!step2Valid || isSubmitting || isOffline}
                    className="flex-1 py-4 bg-[#06402B] text-white rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-40 hover:bg-[#0a5a38] shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isSubmitting ? (
                      <><FaSpinner className="animate-spin" size={14} /> Submitting…</>
                    ) : isOffline ? (
                      <><FaWifi size={13} /> Offline — Reconnect</>
                    ) : (
                      <>Complete Registration 🐾</>
                    )}
                  </button>
                </div>

                <p className="text-center text-[11px] text-zinc-400 font-medium pb-4">
                  Your QR code will appear after submission. Screenshot it!
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}