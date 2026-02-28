"use client";

import { useState, ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaLightbulb, FaUsers, FaCheckCircle, FaSpinner, 
  FaIdCard, FaEnvelope, FaUserGraduate, FaChevronRight,
  FaCameraRetro, FaTicketAlt
} from "react-icons/fa";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/db"; 

import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor";

// --- SEMINAR DATA ---
const SEMINARS = [
  {
    id: "innovation-legacy",
    shortName: "Innovation Seminar",
    icon: FaLightbulb,
    type: "GENERAL SEMINAR",
    title: "Innovation Rooted in Legacy: Designing the Future with the Wisdom of the Past",
    color: "from-green-500 to-emerald-600",
    textColor: "text-emerald-500",
    focusAreas: [
      "The role of Arts, Sciences, and Technology in shaping the future",
      "Bridging academic knowledge to real-world application",
      "Student identity and professional growth",
      "Trends in industry and future career pathways",
      "Becoming future-ready graduates"
    ]
  },
  {
    id: "transformative-leadership",
    shortName: "Leadership Training",
    icon: FaUsers,
    type: "LEADERSHIP TRAINING",
    title: "Transformative Leadership: Weaving Vision, Integrity, and Action",
    color: "from-blue-500 to-indigo-600",
    textColor: "text-blue-500",
    focusAreas: [
      "Leadership styles and self-awareness",
      "Ethical and servant leadership",
      "Decision-making and conflict management",
      "Team dynamics and collaboration",
      "Leading with vision and accountability"
    ]
  }
];

// --- BLOCK SECTIONS ---
const BLOCK_SECTIONS = [
  "ABPSYCH1-A", "ABPSYCH1-B", "ABPSYCH2-A", "ABPSYCH2-B", "ABPSYCH3-A", "PSYCH3-B",
  "BSCS1-A", "BSCS2-A", "BSCS3-A", "BSCOE1-A", "BSCOE2-A", "BSCOE3-A"
];

// --- STYLES ---
const INPUT_STYLE = "w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700/50 rounded-xl p-4 text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 outline-none transition-all text-sm font-bold backdrop-blur-sm";
const LABEL_STYLE = "text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2 block tracking-wider";

export default function CastWeekRegistration() {
  const [activeTab, setActiveTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    middleInitial: "",
    studentId: "",
    email: "",
    blockSection: "",
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(""); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.lastName || !formData.firstName || !formData.studentId || !formData.email || !formData.blockSection) {
      setError("Please fill in all required fields.");
      return;
    }

    const rawId = formData.studentId.replace(/[^0-9]/g, '');
    const yearPrefix = parseInt(rawId.substring(0, 4));
    
    if (isNaN(yearPrefix) || yearPrefix < 2019 || yearPrefix > 2026) {
      setError("ID must start with a valid year (2019-2026).");
      return;
    }
    if (rawId.length < 8 || rawId.length > 12) {
      setError("Invalid ID format. Must be between 8 to 12 digits.");
      return;
    }

    setIsSubmitting(true);

    try {
      const seminarId = SEMINARS[activeTab].id;
      
      // 1. Create a composite Document ID: [Student ID]_[Seminar ID]
      const registrationDocId = `${rawId}_${seminarId}`;
      const registrationRef = doc(db, "castweek_registrations", registrationDocId);

      // 2. Check if they are already registered for THIS seminar
      const docSnap = await getDoc(registrationRef);
      if (docSnap.exists()) {
        setError(`Student ID ${rawId} is already registered for this specific seminar.`);
        setIsSubmitting(false);
        return;
      }

      // 3. Generate a clean random 8-character Ticket Reference & Format Name
      const generatedTicketRef = Math.random().toString(36).substring(2, 10).toUpperCase();
      const formattedFullName = `${formData.lastName}, ${formData.firstName} ${formData.middleInitial}`.trim();

      // 4. Save to Firebase Database
      await setDoc(registrationRef, {
        ...formData,
        fullName: formattedFullName,
        studentId: rawId, 
        seminarId: seminarId,
        seminarTitle: SEMINARS[activeTab].title,
        ticketRef: generatedTicketRef,
        registeredAt: serverTimestamp(),
      });

      // 5. Save to Google Sheets via Webhook
      const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycby8DGS5iHfP20pATsaTzurrROCYd0rsTRJU1Fd6rseDwV-y9Y5hXq_a0ftJg4HfFMA/exec"; 
      
      await fetch(GOOGLE_SHEETS_URL, {
        method: "POST",
        mode: "no-cors", 
        headers: {
          "Content-Type": "text/plain;charset=utf-8", 
        },
        body: JSON.stringify({
          referenceId: generatedTicketRef,
          seminarName: SEMINARS[activeTab].shortName,
          fullName: formattedFullName,
          studentId: rawId,
          blockSection: formData.blockSection,
          email: formData.email
        }),
      });

      // 6. Setup Success UI Data
      setTicketDetails({
        fullName: formattedFullName,
        studentId: rawId,
        blockSection: formData.blockSection,
        seminarName: SEMINARS[activeTab].shortName,
        referenceId: generatedTicketRef, 
      });

      setIsSuccess(true);
      setFormData({ lastName: "", firstName: "", middleInitial: "", studentId: "", email: "", blockSection: "" });
    } catch (err) {
      console.error("Registration Error: ", err);
      setError("An error occurred while submitting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSeminar = SEMINARS[activeTab];
  const Icon = activeSeminar.icon;

  return (
    <section className="min-h-screen relative transition-colors duration-300 bg-white dark:bg-black font-sans pt-24 pb-20 overflow-hidden">
      <CircuitCursor />
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
         <FloatingCubes />
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        
        {/* PAGE HEADER */}
        <div className="text-center mb-12">
          <span className="inline-block py-1 px-3 rounded-full bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-mono font-bold tracking-widest mb-4 border border-green-500/20">
            CAST WEEK 2026
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter mb-4">
            Official <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600">Registration</span>
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Secure your slot for our upcoming seminars. Please select the event you wish to attend and fill out the form below.
          </p>
        </div>

        {/* TABS */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8 md:mb-12">
          {SEMINARS.map((seminar, idx) => (
            <button
              key={seminar.id}
              onClick={() => { setActiveTab(idx); setIsSuccess(false); setError(""); }}
              className={`relative px-8 py-4 rounded-2xl font-bold text-sm md:text-base uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden ${
                activeTab === idx 
                  ? "text-white shadow-xl scale-105" 
                  : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {activeTab === idx && (
                <div className={`absolute inset-0 bg-gradient-to-r ${seminar.color} z-0`} />
              )}
              <seminar.icon className={`relative z-10 ${activeTab === idx ? "animate-pulse" : ""}`} size={18} />
              <span className="relative z-10">{seminar.shortName}</span>
            </button>
          ))}
        </div>

        {/* MAIN CONTENT SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT: SEMINAR DETAILS */}
          <motion.div 
            key={`info-${activeTab}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-5 flex flex-col justify-center"
          >
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden h-full flex flex-col justify-center">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${activeSeminar.color} opacity-10 rounded-bl-full`} />
              
              <span className={`text-[10px] font-black tracking-widest uppercase mb-3 block ${activeSeminar.textColor}`}>
                {activeSeminar.type}
              </span>
              
              <h2 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white leading-tight mb-8">
                {activeSeminar.title}
              </h2>

              <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  Focus Areas
                </h3>
                <ul className="space-y-3 md:space-y-4">
                  {activeSeminar.focusAreas.map((area, i) => (
                    <motion.li 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 text-zinc-700 dark:text-zinc-300 text-sm font-medium leading-relaxed"
                    >
                      <FaChevronRight className={`mt-1 shrink-0 ${activeSeminar.textColor}`} size={12} />
                      {area}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: REGISTRATION FORM / SUCCESS TICKET */}
          <motion.div 
            key={`form-${activeTab}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-7"
          >
            <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 md:p-10 border border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl h-full">
              
              <AnimatePresence mode="wait">
                {isSuccess && ticketDetails ? (
                  // --- SUCCESS TICKET UI ---
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-full min-h-[450px]"
                  >
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500 mb-4 animate-bounce">
                      <FaCameraRetro size={24} />
                      <span className="font-black uppercase tracking-widest text-sm">Take a Screenshot!</span>
                    </div>

                    {/* TICKET CARD */}
                    <div className="w-full max-w-sm bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
                      
                      {/* Ticket Header */}
                      <div className={`p-6 bg-gradient-to-r ${activeSeminar.color} text-white relative`}>
                        <div className="absolute top-0 right-0 opacity-10 pt-4 pr-4">
                           <FaTicketAlt size={60} />
                        </div>
                        <p className="text-[10px] font-mono tracking-widest uppercase mb-1 opacity-80">Event Pass</p>
                        <h3 className="font-black text-xl leading-tight">{ticketDetails.seminarName}</h3>
                      </div>

                      {/* Ticket Body */}
                      <div className="p-6 space-y-4">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Participant Name</p>
                          <p className="text-lg font-black text-zinc-900 dark:text-white uppercase truncate">{ticketDetails.fullName}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Student ID</p>
                            <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">{ticketDetails.studentId}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Section</p>
                            <p className="text-base font-bold text-zinc-800 dark:text-zinc-200">{ticketDetails.blockSection}</p>
                          </div>
                        </div>

                        <div className="border-t-2 border-dashed border-zinc-200 dark:border-zinc-800 pt-4 mt-2">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold text-center mb-1">Reference Number</p>
                          <p className="text-2xl font-mono text-center font-black tracking-widest text-zinc-900 dark:text-white">
                            {ticketDetails.referenceId}
                          </p>
                        </div>
                      </div>
                      
                      {/* Cutout circles to look like a ticket */}
                      <div className="absolute left-[-15px] top-[100px] w-[30px] h-[30px] bg-white dark:bg-zinc-900 rounded-full border-r-2 border-zinc-200 dark:border-zinc-800" />
                      <div className="absolute right-[-15px] top-[100px] w-[30px] h-[30px] bg-white dark:bg-zinc-900 rounded-full border-l-2 border-zinc-200 dark:border-zinc-800" />
                    </div>

                    <p className="text-zinc-500 dark:text-zinc-400 mt-6 text-sm text-center max-w-xs">
                      Please present this digital pass at the registration desk for verification.
                    </p>

                    <button 
                      onClick={() => setIsSuccess(false)}
                      className="mt-6 text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors underline underline-offset-4"
                    >
                      Register Another Student
                    </button>
                  </motion.div>
                ) : (
                  // --- REGISTRATION FORM ---
                  <motion.form 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit} 
                    className="space-y-5 md:space-y-6"
                  >
                    <div className="flex items-center gap-3 mb-4 md:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${activeSeminar.color} text-white`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-none">Participant Details</h3>
                        <p className="text-[10px] md:text-xs text-zinc-500 mt-1">Fields marked with * are required.</p>
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold">
                        {error}
                      </div>
                    )}

                    {/* NAME ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-5">
                        <label className={LABEL_STYLE}>Surname *</label>
                        <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className={INPUT_STYLE} placeholder="e.g. Dela Cruz" required />
                      </div>
                      <div className="md:col-span-5">
                        <label className={LABEL_STYLE}>First Name *</label>
                        <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className={INPUT_STYLE} placeholder="e.g. Juan" required />
                      </div>
                      <div className="md:col-span-2">
                        <label className={LABEL_STYLE}>M.I.</label>
                        <input type="text" name="middleInitial" value={formData.middleInitial} onChange={handleInputChange} className={INPUT_STYLE} placeholder="A." maxLength={3} />
                      </div>
                    </div>

                    {/* ID & EMAIL ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <label className={LABEL_STYLE}>Student ID *</label>
                        <div className="relative">
                          <FaIdCard className="absolute top-4 right-4 text-zinc-400" />
                          <input type="text" name="studentId" value={formData.studentId} onChange={handleInputChange} className={INPUT_STYLE} placeholder="202XXXXXXX" maxLength={15} required />
                        </div>
                      </div>
                      <div>
                        <label className={LABEL_STYLE}>Email Address *</label>
                        <div className="relative">
                          <FaEnvelope className="absolute top-4 right-4 text-zinc-400" />
                          <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={INPUT_STYLE} placeholder="student@dlsau.edu.ph" required />
                        </div>
                      </div>
                    </div>

                    {/* BLOCK SECTION */}
                    <div>
                      <label className={LABEL_STYLE}>Block Section *</label>
                      <div className="relative">
                        <FaUserGraduate className="absolute top-4 right-4 text-zinc-400 pointer-events-none" />
                        <select name="blockSection" value={formData.blockSection} onChange={handleInputChange} className={`${INPUT_STYLE} appearance-none pr-10`} required>
                          <option value="" disabled className="bg-zinc-900 text-zinc-400">Select Section</option>
                          {BLOCK_SECTIONS.map(section => (
                            <option key={section} value={section} className="bg-zinc-900 text-white">
                              {section}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className={`w-full py-4 mt-6 rounded-xl font-black text-white bg-gradient-to-r ${activeSeminar.color} hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 disabled:opacity-50`}
                    >
                      {isSubmitting ? <><FaSpinner className="animate-spin" /> PROCESSING...</> : "CONFIRM REGISTRATION"}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
              
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}