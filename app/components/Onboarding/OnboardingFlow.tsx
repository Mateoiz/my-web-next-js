"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/db";
import {
  FaFolderOpen, FaChartBar, FaCalculator, FaGraduationCap,
  FaLayerGroup, FaCheckCircle, FaArrowRight, FaTimes,
  FaDownload, FaSync, FaStar
} from "react-icons/fa";
import Image from "next/image";

interface OnboardingFlowProps {
  userId: string;
  userName: string;
  onComplete: () => void;
}

const steps = [
  {
    id: "welcome",
    icon: null,
    title: null,
    isWelcome: true,
  },
  {
    id: "tracker",
    icon: <FaFolderOpen size={28} />,
    title: "The Tracker",
    subtitle: "Your Academic Command Center",
    description: "The Tracker is the heart of the Terminal. Everything starts here.",
    points: [
      "Create a folder for each of your subjects this semester",
      "Add your deliverables — Midterm Exam, Final Exam, Final Product, Class Standing",
      "Set deadlines so the dashboard flags what's coming up",
      "Mark tasks as Open, Submitted, or Graded as the semester progresses",
    ],
    tip: "The more you update your Tracker, the smarter the rest of the platform gets.",
    visual: "tracker",
  },
  {
    id: "grade-tracking",
    icon: <FaChartBar size={28} />,
    title: "Entering Grades",
    subtitle: "Feed the System, Get Insights Back",
    description: "Once your professor releases a grade, enter it directly in the Tracker.",
    points: [
      "Open your course folder in the Tracker",
      "Find the task (e.g. Midterm Exam) and mark it as Graded",
      "Enter your score — you can use formats like 85, 85/100, or 18/20",
      "The dashboard will instantly update your subject average",
    ],
    tip: "Your Home dashboard shows live grade bars for every subject — but only if grades are entered here first.",
    visual: "grades",
  },
  {
    id: "grade-projector",
    icon: <FaCalculator size={28} />,
    title: "Grade Projector",
    subtitle: "Pull Your Grades in One Click",
    description: "The Grade Projector in Academics → Grade Analytics can automatically pull your tracked grades.",
    points: [
      "Go to Academics → Grade Analytics",
      "In the Grade Projector, select your course from the dropdown",
      "Hit the Pull button — your scores sync instantly from the Tracker",
      "Hit Compute Grade to see your subject GPA",
    ],
    tip: "You can also manually type scores if you want to project what-if scenarios before grades are released.",
    visual: "projector",
  },
  {
    id: "gwa",
    icon: <FaGraduationCap size={28} />,
    title: "GWA Calculator",
    subtitle: "Your Weighted Average, Automated",
    description: "The GWA Calculator sits just below the Grade Projector and can sync all your courses at once.",
    points: [
      "Scroll down in Grade Analytics to find the GWA Calculator",
      "Hit Sync Folders — it pulls all your course averages automatically",
      "Adjust units per subject if needed",
      "See your GWA and whether you qualify for honors",
    ],
    tip: "Switch between Standard, BSA, and DVM grading scales depending on your program.",
    visual: "gwa",
  },
  {
    id: "studyhub",
    icon: <FaLayerGroup size={28} />,
    title: "Study Hub",
    subtitle: "Study Smarter, Together",
    description: "The Study Hub is your personal study space and community library all in one.",
    points: [
      "Flashcard Vault — create and study your own reviewer decks",
      "Global Exchange — browse and import reviewers made by fellow Lasallians",
      "Study Lounge — connect with classmates and send decks directly to friends",
      "Study in Flashcard mode or test yourself with Identification mode",
    ],
    tip: "You can bulk import terms from your notes using Tab, Dash, or Comma as separators.",
    visual: "studyhub",
  },
  {
    id: "complete",
    icon: null,
    title: null,
    isComplete: true,
  },
];

// Visual components for each step
function TrackerVisual() {
  return (
    <div className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-2">
      {["Midterm Exam", "Final Exam", "Final Product", "Class Standing"].map((task, i) => (
        <div key={task} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-emerald-500" : i === 1 ? "bg-orange-400" : "bg-zinc-300 dark:bg-zinc-600"}`} />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{task}</span>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
            i === 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
            i === 1 ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" :
            "bg-zinc-100 dark:bg-zinc-700 text-zinc-500"
          }`}>
            {i === 0 ? "Graded" : i === 1 ? "Submitted" : "Open"}
          </span>
        </div>
      ))}
    </div>
  );
}

function GradesVisual() {
  const grades = [
    { subject: "CS 101", score: 92, color: "bg-emerald-500" },
    { subject: "MATH 20", score: 78, color: "bg-blue-500" },
    { subject: "ENG 1", score: 85, color: "bg-emerald-500" },
  ];
  return (
    <div className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-3">
      {grades.map(g => (
        <div key={g.subject} className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{g.subject}</span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{g.score}%</span>
          </div>
          <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${g.score}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className={`h-full rounded-full ${g.color}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectorVisual() {
  const [pulled, setPulled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPulled(true), 1000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
          CS 101 — Intro to Computing
        </div>
        <div className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all duration-500 ${pulled ? "bg-emerald-500 text-white" : "bg-[#06402B] text-white"}`}>
          <FaDownload size={9} /> {pulled ? "Pulled!" : "Pull"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Midterm", value: pulled ? "85/100" : "—" },
          { label: "Finals", value: pulled ? "90/100" : "—" },
          { label: "Product", value: pulled ? "78/100" : "—" },
          { label: "CS", value: pulled ? "18/20" : "—" },
        ].map(r => (
          <div key={r.label} className="bg-white dark:bg-zinc-800 rounded-xl p-2.5 border border-zinc-100 dark:border-zinc-700 text-center">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{r.label}</p>
            <p className={`text-sm font-black mt-0.5 transition-all duration-500 ${pulled ? "text-[#06402B] dark:text-emerald-400" : "text-zinc-300 dark:text-zinc-600"}`}>
              {r.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GWAVisual() {
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSynced(true), 1000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-3">
      <button className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-500 ${synced ? "bg-emerald-500 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"}`}>
        <FaSync className={synced ? "animate-spin" : ""} /> {synced ? "Synced!" : "Sync Folders"}
      </button>
      {synced && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center py-3">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Your GWA</p>
          <p className="text-5xl font-black text-[#06402B] dark:text-emerald-400">3.50</p>
          <p className="text-xs font-bold text-yellow-500 mt-1">✦ With High Honors</p>
        </motion.div>
      )}
    </div>
  );
}

function StudyHubVisual() {
  return (
    <div className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 space-y-2">
      {[
        { label: "Flashcard Vault", desc: "Your private reviewer decks", color: "bg-[#06402B]/10 text-[#06402B] dark:text-emerald-400", icon: "🗂️" },
        { label: "Global Exchange", desc: "Community reviewer library", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: "🌐" },
        { label: "Study Lounge", desc: "Friends & shared materials", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400", icon: "👥" },
      ].map(item => (
        <div key={item.label} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
          <span className="text-xl">{item.icon}</span>
          <div>
            <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">{item.label}</p>
            <p className="text-[10px] font-medium text-zinc-500">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepVisual({ visual }: { visual: string }) {
  if (visual === "tracker") return <TrackerVisual />;
  if (visual === "grades") return <GradesVisual />;
  if (visual === "projector") return <ProjectorVisual />;
  if (visual === "gwa") return <GWAVisual />;
  if (visual === "studyhub") return <StudyHubVisual />;
  return null;
}

export default function OnboardingFlow({ userId, userName, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep) / (steps.length - 1)) * 100;

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        hasSeenOnboarding: true,
      });
    } catch (err) {
      console.error("Failed to save onboarding state:", err);
    } finally {
      onComplete();
    }
  };

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => handleComplete();

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl z-10 overflow-hidden"
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#06402B] to-emerald-400" />

        {/* Progress bar */}
        {!isFirst && !isLast && (
          <div className="absolute top-1 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
              className="h-full bg-gradient-to-r from-[#06402B] to-emerald-400"
            />
          </div>
        )}

        {/* Skip button */}
        {!isLast && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors z-10 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
          >
            Skip <FaTimes size={10} />
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="p-7 md:p-8"
          >
            {/* WELCOME STEP */}
            {step.isWelcome && (
              <div className="flex flex-col items-center text-center gap-5 py-4">
                <div className="relative w-20 h-20">
                  <Image src="/affiliates/dlsau.png" alt="DLSAU" fill sizes="80px" className="object-contain" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono font-bold text-[#06402B] dark:text-emerald-400 uppercase tracking-[0.3em]">
                    Welcome to
                  </p>
                  <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">
                    The Academic<br />
                    <span className="text-[#06402B] dark:text-emerald-400">Lasallian Terminal</span>
                  </h1>
                </div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">
                  Hi <span className="font-black text-zinc-800 dark:text-zinc-200">{userName?.split(" ")[0] || "Scholar"}</span>! 👋 Before you dive in, let us walk you through everything in under a minute.
                </p>
                <div className="grid grid-cols-3 gap-3 w-full mt-2">
                  {[
                    { emoji: "📁", label: "Track Requirements" },
                    { emoji: "📊", label: "Compute Grades" },
                    { emoji: "🧠", label: "Study Smarter" },
                  ].map(f => (
                    <div key={f.label} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col items-center gap-2">
                      <span className="text-2xl">{f.emoji}</span>
                      <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-widest text-center leading-tight">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* COMPLETE STEP */}
            {step.isComplete && (
              <div className="flex flex-col items-center text-center gap-5 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-[#06402B]/10 dark:bg-emerald-500/10 flex items-center justify-center text-[#06402B] dark:text-emerald-400"
                >
                  <FaStar size={36} />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
                    You're all set!
                  </h2>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm">
                    The Terminal is yours to explore. Start by adding your courses in the <span className="font-black text-zinc-800 dark:text-zinc-200">Tracker</span> — everything else will follow.
                  </p>
                </div>
                <div className="w-full p-4 bg-[#06402B]/5 dark:bg-emerald-500/10 border border-[#06402B]/20 dark:border-emerald-500/20 rounded-2xl text-left space-y-2">
                  <p className="text-[10px] font-black text-[#06402B] dark:text-emerald-400 uppercase tracking-widest">Quick Start</p>
                  {[
                    "Go to Tracker → Add your courses",
                    "Add your tasks and set deadlines",
                    "Enter grades as they come in",
                    "Use Grade Analytics to compute your GPA",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <FaCheckCircle size={10} className="text-[#06402B] dark:text-emerald-400 mt-0.5 shrink-0" />
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* REGULAR STEPS */}
            {!step.isWelcome && !step.isComplete && (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-bold text-[#06402B] dark:text-emerald-400 uppercase tracking-widest">
                      Step {currentStep} of {steps.length - 2}
                    </p>
                    <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white leading-none">
                      {step.title}
                    </h2>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{step.subtitle}</p>
                  </div>
                </div>

                {/* Visual */}
                {step.visual && <StepVisual visual={step.visual} />}

                {/* Description */}
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {step.description}
                </p>

                {/* Points */}
                <div className="space-y-2">
                  {step.points?.map((point, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-2.5"
                    >
                      <div className="w-5 h-5 rounded-full bg-[#06402B]/10 dark:bg-emerald-500/10 text-[#06402B] dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] font-black">{i + 1}</span>
                      </div>
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed">{point}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Tip */}
                {step.tip && (
                  <div className="p-3 bg-[#06402B]/5 dark:bg-emerald-500/10 border border-[#06402B]/15 dark:border-emerald-500/20 rounded-xl">
                    <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      <span className="font-black text-[#06402B] dark:text-emerald-400">💡 Tip: </span>
                      {step.tip}
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="px-7 md:px-8 pb-7 md:pb-8 flex items-center justify-between gap-3">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-4 h-2 bg-[#06402B] dark:bg-emerald-500"
                    : i < currentStep
                    ? "w-2 h-2 bg-[#06402B]/40 dark:bg-emerald-500/40"
                    : "w-2 h-2 bg-zinc-200 dark:bg-zinc-700"
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && !isLast && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isCompleting}
              className="px-6 py-2.5 bg-[#06402B] dark:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#042d1f] dark:hover:bg-emerald-500 transition-all active:scale-95 shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isLast ? (
                isCompleting ? "Starting…" : "Let's Go! 🚀"
              ) : (
                <>{isFirst ? "Start Tour" : "Next"} <FaArrowRight size={10} /></>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}