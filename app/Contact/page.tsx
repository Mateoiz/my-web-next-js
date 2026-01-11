"use client";

import { useState, FormEvent, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaPaperPlane, FaTerminal, FaCheckCircle, FaExclamationCircle, 
  FaBug, FaLightbulb, FaCommentDots, FaUser, FaEnvelope, 
  FaMapMarkerAlt, FaTag
} from "react-icons/fa";

// --- IMPORT COMPONENTS ---
import FloatingCubes from "../components/FloatingCubes";
import CircuitCursor from "../components/CircuitCursor";

// --- 1. MEMOIZED BACKGROUND ---
const BackgroundLayer = memo(() => (
  <div className="absolute inset-0 z-0 pointer-events-none">
     <CircuitCursor />
     <div className="absolute inset-0 opacity-80">
        <FloatingCubes />
     </div>
     <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl opacity-30" />
     <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl opacity-30" />
  </div>
));

BackgroundLayer.displayName = "BackgroundLayer";

// --- 2. MAIN PAGE COMPONENT ---
export default function ContactPage() {
  return (
    <section className="min-h-screen py-24 px-4 md:px-8 relative overflow-hidden bg-zinc-50 dark:bg-black font-sans selection:bg-green-500/30">
      <BackgroundLayer />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/30 bg-green-500/5 backdrop-blur-md text-xs font-mono text-green-700 dark:text-green-400 mb-4"
          >
            <FaTerminal /> System Uplink
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white"
          >
            Transmit <span className="text-green-600 dark:text-green-500">Feedback</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto text-lg"
          >
            Encountered a bug? Have an idea? Or just want to say hello?
            <br />Establish a connection with the development team.
          </motion.p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <ContactInfo />
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

// --- 3. FORM COMPONENT ---
function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "general",
    subject: "", 
    message: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(""); 

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResult(""); 

    // --- MANUAL VALIDATION CHECK ---
    // This ensures fields are filled even if HTML5 validation is bypassed
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
        setResult("Error: Please fill in all required fields.");
        return;
    }

    // Specific check for the Conditional Subject Field
    if (formData.type === "general" && !formData.subject.trim()) {
        setResult("Error: Subject is required for General inquiries.");
        return;
    }
    // -------------------------------

    setIsSubmitting(true);

    // Subject Line Logic
    let finalSubject = "";
    if (formData.type === "general") {
      finalSubject = `[GENERAL] ${formData.subject}`;
    } else {
      finalSubject = `[${formData.type.toUpperCase()}] Message from ${formData.name}`;
    }

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "10785cf2-8db3-4033-805e-f2200df7cdd2", 
          name: formData.name,
          email: formData.email,
          subject: finalSubject,
          message: `Type: ${formData.type}\n\n${formData.message}`,
        }),
      });

      const json = await response.json();

      if (response.status === 200) {
        setResult("Message Transmitted Successfully.");
        setFormData({ name: "", email: "", type: "general", subject: "", message: "" }); 
      } else {
        setResult(json.message || "Transmission Error");
      }
    } catch (error) {
      console.log(error);
      setResult("Transmission Failed. Please check your connection.");
    } finally {
      setIsSubmitting(false);
      if(result.includes("Success")) {
          setTimeout(() => setResult(""), 5000);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="w-full lg:w-2/3 flex flex-col"
    >
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-green-500/30 rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden flex-grow">
        
        {/* Top Decorative Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-400 to-green-500" />

        <form onSubmit={handleSubmit} className="space-y-8 h-full flex flex-col">
          
          {/* 1. SIGNAL SELECTOR */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TypeOption 
              icon={<FaCommentDots />} 
              label="General" 
              selected={formData.type === "general"} 
              onClick={() => setFormData({ ...formData, type: "general" })} 
            />
            <TypeOption 
              icon={<FaBug />} 
              label="Bug Report" 
              selected={formData.type === "bug"} 
              onClick={() => setFormData({ ...formData, type: "bug" })} 
            />
            <TypeOption 
              icon={<FaLightbulb />} 
              label="Suggestion" 
              selected={formData.type === "feature"} 
              onClick={() => setFormData({ ...formData, type: "feature" })} 
            />
          </div>

          {/* 2. IDENTITY FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label icon={<FaUser size={10} />} text="User Identity" required />
              <input 
                type="text" 
                placeholder="Your Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:border-green-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label icon={<FaEnvelope size={10} />} text="Return Frequency" required />
              <input 
                type="email" 
                placeholder="Email Address"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:border-green-500 transition-colors"
              />
            </div>
          </div>

          {/* 3. SUBJECT FIELD (Conditional) */}
          <AnimatePresence mode="popLayout">
            {formData.type === "general" && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <Label icon={<FaTag size={10} />} text="Transmission Subject" required />
                <input 
                  type="text" 
                  placeholder="What is this regarding?"
                  required={formData.type === "general"}
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white outline-none focus:border-green-500 transition-colors"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 4. MESSAGE AREA */}
          <div className="flex-grow space-y-2 flex flex-col">
            <Label icon={<FaTerminal size={10} />} text="Data Packet" required />
            
            <div className="relative group flex-grow h-full">
              <textarea 
                rows={formData.type === "general" ? 5 : 8} 
                placeholder="Enter your message transmission here..."
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full h-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-4 text-zinc-900 dark:text-white outline-none focus:border-green-500 transition-colors resize-none"
              />
              <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-zinc-300 dark:border-zinc-600 group-focus-within:border-green-500 transition-colors" />
            </div>
          </div>

          {/* 5. SUBMIT BUTTON */}
          <div className="space-y-4 pt-4">
            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full group relative overflow-hidden font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${
                isSubmitting 
                  ? "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                  : "bg-green-600 hover:bg-green-500 text-white dark:text-black"
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-800 rounded-full animate-spin" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                  <span>Execute Transmission</span>
                  <FaPaperPlane className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </button>

            {/* Status Message */}
            <AnimatePresence>
              {result && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-bold border ${
                    result.includes("Success") 
                      ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30" 
                      : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30"
                  }`}
                >
                  {result.includes("Success") ? <FaCheckCircle /> : <FaExclamationCircle />}
                  {result}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </form>
      </div>
    </motion.div>
  );
}

// --- 4. STATIC INFO COMPONENT (Redesigned for Space & Clarity) ---
const ContactInfo = memo(() => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.3 }}
    className="w-full lg:w-1/3 space-y-6"
  >
     <div className="space-y-6"> {/* Increased vertical spacing */}
        
        {/* VISIT HQ CARD - NEW LAYOUT */}
        <div className="p-6 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl backdrop-blur-sm shadow-sm hover:border-green-500/50 transition-all group">
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
             <div className="p-3 bg-green-100 dark:bg-green-500/10 rounded-xl text-green-600 dark:text-green-400 text-xl group-hover:scale-110 transition-transform">
               <FaMapMarkerAlt />
             </div>
             <h3 className="font-bold text-lg text-zinc-900 dark:text-white">Visit HQ</h3>
          </div>

          <div className="space-y-4">
             {/* Section 1: Street Address */}
             <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1 block">Campus Location</span>
                <p className="text-zinc-600 dark:text-zinc-300 leading-snug">
                  302 Victoneta Avenue, Potrero<br />
                  Malabon City 1475, Philippines
                </p>
             </div>

             {/* Section 2: Boxed Office Detail (Fixes the cramped feeling) */}
             <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500" /> {/* Accent Line */}
                <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-1 block">Specific Office</span>
                <p className="font-bold text-zinc-800 dark:text-zinc-100 text-sm">
                  Life Science Building, 4th Floor
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Dept. of Technology<br/>
                  College of Arts, Sciences, & Tech
                </p>
             </div>
          </div>
        </div>

        {/* EMAIL US CARD */}
        <div className="flex items-center gap-4 p-6 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl backdrop-blur-sm shadow-sm hover:border-green-500/50 transition-all group">
          <div className="p-3 bg-green-100 dark:bg-green-500/10 rounded-xl text-green-600 dark:text-green-400 text-xl group-hover:scale-110 transition-transform shrink-0">
            <FaEnvelope />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5 block">Direct Line</span>
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white">jpcs@dlsau.edu.ph</h3>
          </div>
        </div>
     </div>

     {/* Map - Added slightly more height for balance */}
     <div className="w-full h-[280px] lg:h-[320px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative group shadow-lg">
        <div className="absolute inset-0 border-4 border-transparent group-hover:border-green-500/20 transition-all z-10 pointer-events-none rounded-2xl" />
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3859.7310431334804!2d120.99598627574215!3d14.67119897534308!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b6a2b78fd96f%3A0xf64909861b56b1b9!2sDe%20La%20Salle%20Araneta%20University!5e0!3m2!1sen!2sph!4v1766485397075!5m2!1sen!2sph"
          width="100%" 
          height="100%" 
          className="border-0 dark:invert-[.85] dark:hue-rotate-180 dark:contrast-[1.1] transition-all duration-500"
          allowFullScreen 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
        />
     </div>
  </motion.div>
));

ContactInfo.displayName = "ContactInfo";

// --- HELPER COMPONENTS ---

// UPDATED LABEL COMPONENT WITH RED ASTERISK FOR REQUIRED FIELDS
const Label = ({ icon, text, required = false }: { icon: any, text: string, required?: boolean }) => (
  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-1">
    {icon} {text} {required && <span className="text-red-500">*</span>}
  </label>
);

interface TypeOptionProps {
  icon: any;
  label: string;
  selected: boolean;
  onClick: () => void;
}

const TypeOption = ({ icon, label, selected, onClick }: TypeOptionProps) => (
  <div 
    onClick={onClick}
    className={`cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-3 text-center group
      ${selected 
        ? "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]" 
        : "bg-zinc-50 dark:bg-zinc-900/50 border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
  >
    <div className={`text-2xl ${selected ? "scale-110" : "group-hover:scale-110"} transition-transform duration-300`}>
      {icon}
    </div>
    <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
    
    {selected && (
      <motion.div 
        layoutId="selected-marker"
        className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"
      />
    )}
  </div>
);