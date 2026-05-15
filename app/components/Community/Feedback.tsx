"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaLightbulb, FaBug, FaStar, FaHeart, FaRocket,
  FaChevronRight, FaCheck, FaTimes, FaPaperPlane,
  FaRegSmile, FaRegMeh, FaRegFrown,
} from "react-icons/fa";
import {
  collection, addDoc, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedbackCategory = "Feature Request" | "Bug Report" | "General Feedback" | "Content" | "Performance";
type SatisfactionLevel = "love" | "okay" | "improve";

interface FeedbackData {
  category: FeedbackCategory;
  satisfaction: SatisfactionLevel | null;
  title: string;
  message: string;
  email: string;
  anonymous: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { id: FeedbackCategory; icon: React.ReactNode; desc: string; color: string; bg: string; border: string }[] = [
  {
    id: "Feature Request",
    icon: <FaLightbulb size={16} />,
    desc: "Something new you'd love to see",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    id: "Bug Report",
    icon: <FaBug size={16} />,
    desc: "Something isn't working right",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
  {
    id: "General Feedback",
    icon: <FaStar size={16} />,
    desc: "Thoughts on your experience",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    id: "Content",
    icon: <FaHeart size={16} />,
    desc: "Bulletins, calendar, resources",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
  },
  {
    id: "Performance",
    icon: <FaRocket size={16} />,
    desc: "Speed, loading, reliability",
    color: "text-[#06402B] dark:text-emerald-400",
    bg: "bg-[#06402B]/10",
    border: "border-[#06402B]/30",
  },
];

const SATISFACTION: { id: SatisfactionLevel; icon: React.ReactNode; label: string; color: string; bg: string; border: string }[] = [
  {
    id: "love",
    icon: <FaRegSmile size={22} />,
    label: "Love it",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  {
    id: "okay",
    icon: <FaRegMeh size={22} />,
    label: "It's okay",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
  },
  {
    id: "improve",
    icon: <FaRegFrown size={22} />,
    label: "Needs work",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  },
];

const PLACEHOLDER_MAP: Record<FeedbackCategory, string> = {
  "Feature Request": "e.g. I'd love a pomodoro timer built into the Study Hub, or a way to share notes with classmates directly...",
  "Bug Report": "e.g. When I open the Grade Calculator on mobile, the weights don't save properly after refreshing...",
  "General Feedback": "e.g. The Schedule Canvas is really helpful but I wish the export quality was higher...",
  "Content": "e.g. It would be great to have more academic calendar events pre-filled, especially DLSAU-specific ones...",
  "Performance": "e.g. The Flashcard Exchange tab takes a long time to load when I have a slow connection...",
};

const inputCls = "w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#06402B] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#06402B]/10 dark:focus:ring-emerald-500/10 transition-all placeholder:text-zinc-400 resize-none";

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current
              ? "w-4 bg-[#06402B] dark:bg-emerald-500"
              : i === current
              ? "w-6 bg-[#06402B] dark:bg-emerald-500"
              : "w-1.5 bg-zinc-300 dark:bg-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 gap-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-[#06402B]/10 dark:bg-emerald-500/10 flex items-center justify-center"
      >
        <FaCheck size={32} className="text-[#06402B] dark:text-emerald-400" />
      </motion.div>

      <div className="space-y-2">
        <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
          Thank you, Lasallian!
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium max-w-xs leading-relaxed">
          Your feedback has been submitted to the JPCS dev team. We read every single one.
        </p>
      </div>

      <div className="flex items-center gap-2 px-4 py-3 bg-[#06402B]/10 dark:bg-emerald-500/10 border border-[#06402B]/20 dark:border-emerald-500/20 rounded-2xl">
        <FaHeart size={12} className="text-[#06402B] dark:text-emerald-400" />
        <p className="text-[11px] font-black text-[#06402B] dark:text-emerald-400 uppercase tracking-widest">
          Built by Lasallians, for Lasallians
        </p>
      </div>

      <button
        onClick={onReset}
        className="text-[11px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 uppercase tracking-widest transition-colors"
      >
        Submit another response
      </button>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FeedbackForm() {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [data, setData] = useState<FeedbackData>({
    category: "Feature Request",
    satisfaction: null,
    title: "",
    message: "",
    email: "",
    anonymous: false,
  });

  const set = (field: keyof FeedbackData, value: any) =>
    setData(prev => ({ ...prev, [field]: value }));

  const TOTAL_STEPS = 3;

  const canNext = () => {
    if (step === 0) return data.category && data.satisfaction !== null;
    if (step === 1) return data.title.trim().length >= 5 && data.message.trim().length >= 10;
    return true;
  };

  const handleSubmit = useCallback(async () => {
    if (!canNext()) return;
    setIsSubmitting(true);
    setError("");
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "feedback"), {
        category: data.category,
        satisfaction: data.satisfaction,
        title: data.title.trim(),
        message: data.message.trim(),
        email: data.anonymous ? null : (data.email.trim() || user?.email || null),
        userId: data.anonymous ? null : (user?.uid || null),
        displayName: data.anonymous ? "Anonymous" : (user?.displayName || null),
        anonymous: data.anonymous,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [data]);

  const reset = () => {
    setData({ category: "Feature Request", satisfaction: null, title: "", message: "", email: "", anonymous: false });
    setStep(0);
    setSubmitted(false);
    setError("");
  };

  const selectedCategory = CATEGORIES.find(c => c.id === data.category)!;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 w-full">

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight uppercase text-zinc-900 dark:text-white">
          Share Feedback
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
          Help us make the Lasallian Terminal better for everyone.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 md:p-8 shadow-xl">

        {submitted ? (
          <SuccessScreen onReset={reset} />
        ) : (
          <>
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-8">
              <StepDots current={step} total={TOTAL_STEPS} />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Step {step + 1} of {TOTAL_STEPS}
              </span>
            </div>

            <AnimatePresence mode="wait">

              {/* ── STEP 0: Category + Satisfaction ── */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                      What type of feedback is this?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => set("category", cat.id)}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] touch-manipulation ${
                            data.category === cat.id
                              ? `${cat.bg} ${cat.border}`
                              : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          <span className={`shrink-0 ${data.category === cat.id ? cat.color : "text-zinc-400"}`}>
                            {cat.icon}
                          </span>
                          <div className="min-w-0">
                            <p className={`text-xs font-black uppercase tracking-widest leading-none ${data.category === cat.id ? cat.color : "text-zinc-700 dark:text-zinc-300"}`}>
                              {cat.id}
                            </p>
                            <p className="text-[10px] font-medium text-zinc-400 mt-0.5 truncate">{cat.desc}</p>
                          </div>
                          {data.category === cat.id && (
                            <FaCheck size={10} className={`ml-auto shrink-0 ${cat.color}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                      How do you feel about the platform overall?
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {SATISFACTION.map(s => (
                        <button
                          key={s.id}
                          onClick={() => set("satisfaction", s.id)}
                          className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border transition-all active:scale-[0.97] touch-manipulation ${
                            data.satisfaction === s.id
                              ? `${s.bg} ${s.border}`
                              : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                          }`}
                        >
                          <span className={data.satisfaction === s.id ? s.color : "text-zinc-400"}>
                            {s.icon}
                          </span>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${data.satisfaction === s.id ? s.color : "text-zinc-500"}`}>
                            {s.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 1: Title + Message ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Category reminder pill */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${selectedCategory.bg} ${selectedCategory.border} ${selectedCategory.color}`}>
                    {selectedCategory.icon}
                    {selectedCategory.id}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                      Give it a title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={data.title}
                      onChange={e => set("title", e.target.value)}
                      placeholder="e.g. Add a Pomodoro Timer to Study Hub"
                      maxLength={100}
                      className={inputCls}
                      style={{ fontSize: "16px" }}
                    />
                    <p className="text-[10px] text-zinc-400 text-right">{data.title.length}/100</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                      Tell us more <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={data.message}
                      onChange={e => set("message", e.target.value)}
                      placeholder={PLACEHOLDER_MAP[data.category]}
                      rows={5}
                      maxLength={1000}
                      className={inputCls}
                      style={{ fontSize: "16px" }}
                    />
                    <p className="text-[10px] text-zinc-400 text-right">{data.message.length}/1000</p>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2: Identity + Submit ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Summary card */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Your feedback summary</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${selectedCategory.bg} ${selectedCategory.border} ${selectedCategory.color}`}>
                        {selectedCategory.icon} {selectedCategory.id}
                      </span>
                      {data.satisfaction && (() => {
                        const s = SATISFACTION.find(x => x.id === data.satisfaction)!;
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${s.bg} ${s.border} ${s.color}`}>
                            {s.icon} {s.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 leading-snug">{data.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">{data.message}</p>
                  </div>

                  {/* Anonymous toggle */}
                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div>
                      <p className="text-sm font-black text-zinc-800 dark:text-zinc-200">Submit anonymously</p>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Your name and account won't be attached</p>
                    </div>
                    <button
                      onClick={() => set("anonymous", !data.anonymous)}
                      className={`w-12 h-6 rounded-full transition-all duration-200 relative touch-manipulation ${data.anonymous ? "bg-[#06402B] dark:bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${data.anonymous ? "left-6" : "left-0.5"}`} />
                    </button>
                  </div>

                  {/* Optional email */}
                  {!data.anonymous && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                        Email for follow-up <span className="text-zinc-400 normal-case font-medium">(optional)</span>
                      </label>
                      <input
                        type="email"
                        value={data.email}
                        onChange={e => set("email", e.target.value)}
                        placeholder="your@email.com"
                        className={inputCls}
                        style={{ fontSize: "16px" }}
                      />
                      <p className="text-[10px] text-zinc-400 font-medium">
                        Only used if we need to clarify your suggestion. Never shared.
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <FaTimes size={11} className="text-red-500 shrink-0" />
                      <p className="text-xs font-bold text-red-500">{error}</p>
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center gap-3 mt-8">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="px-5 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95 touch-manipulation"
                >
                  Back
                </button>
              )}

              <button
                onClick={() => {
                  if (!canNext()) return;
                  if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
                  else handleSubmit();
                }}
                disabled={!canNext() || isSubmitting}
                className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 touch-manipulation shadow-md ${
                  step === TOTAL_STEPS - 1
                    ? "bg-[#06402B] dark:bg-emerald-600 text-white hover:bg-[#0a5a38] dark:hover:bg-emerald-500 shadow-[0_0_20px_rgba(6,64,43,0.25)]"
                    : "bg-[#06402B] dark:bg-emerald-600 text-white hover:bg-[#0a5a38] dark:hover:bg-emerald-500"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Submitting…
                  </>
                ) : step === TOTAL_STEPS - 1 ? (
                  <><FaPaperPlane size={12} /> Submit Feedback</>
                ) : (
                  <>Continue <FaChevronRight size={10} /></>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer note */}
      {!submitted && (
        <p className="text-center text-[10px] text-zinc-400 font-medium">
          Feedback is reviewed by the JPCS DLSAU dev team. All responses are confidential.
        </p>
      )}
    </div>
  );
}