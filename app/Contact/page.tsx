"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FaMapMarkerAlt, FaEnvelope } from "react-icons/fa";

export default function ContactPage() {
  const [formState, setFormState] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(""); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult("");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          // =========================================================
          // 👇 PASTE THE KEY YOU RECEIVED AT jpcs@dlsau.edu.ph HERE 👇
          // =========================================================
          access_key: "10785cf2-8db3-4033-805e-f2200df7cdd2", 
          // =========================================================
          
          name: formState.name,
          email: formState.email,
          message: formState.message,
          subject: `New Message from ${formState.name} (JPCS Website)`,
        }),
      });

      const json = await response.json();

      if (response.status === 200) {
        setResult("Message Transmitted Successfully.");
        setFormState({ name: "", email: "", message: "" }); 
      } else {
        setResult(json.message);
      }
    } catch (error) {
      console.log(error);
      setResult("Transmission Failed. Please try again.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setResult(""), 5000);
    }
  };

  return (
    <section className="min-h-screen pt-24 pb-12 px-4 md:px-8 relative overflow-hidden bg-transparent text-white">
      {/* ... (Rest of your design code remains exactly the same) ... */}
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Get in <span className="text-green-500">Touch</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Have a question or want to collaborate? Send us a signal.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* --- LEFT COLUMN: INFO & MAP --- */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full lg:w-1/2 space-y-8"
          >
            <div className="grid gap-6">
              <div className="flex items-start gap-4 p-6 bg-zinc-900/50 border border-green-500/20 rounded-xl backdrop-blur-sm hover:border-green-500/50 transition-colors">
                <div className="p-3 bg-green-500/10 rounded-lg text-green-400 text-xl">
                  <FaMapMarkerAlt />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Visit HQ</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    De La Salle Araneta University<br />
                    Victoneta Ave, Potrero, Malabon, Metro Manila
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 bg-zinc-900/50 border border-green-500/20 rounded-xl backdrop-blur-sm hover:border-green-500/50 transition-colors">
                <div className="p-3 bg-green-500/10 rounded-lg text-green-400 text-xl">
                  <FaEnvelope />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Email Us</h3>
                  <p className="text-gray-400 text-sm">
                    jpcs.dlsau@edu.ph
                  </p>
                </div>
              </div>
            </div>

            {/* Google Map */}
            <div className="w-full h-[300px] rounded-xl overflow-hidden border border-zinc-800 relative group">
               <div className="absolute inset-0 border-4px border-transparent group-hover:border-green-500/20 transition-all z-10 pointer-events-none rounded-xl" />
               <iframe 
                 src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3859.7310431334863!2d120.99598627587532!3d14.67119897534275!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b6a2b78fd96f%3A0xf64909861b56b1b9!2sDe%20La%20Salle%20Araneta%20University!5e0!3m2!1sen!2sph!4v1765609512626!5m2!1sen!2sph" 
                 width="100%" 
                 height="100%" 
                 style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }} 
                 allowFullScreen 
                 loading="lazy" 
                 referrerPolicy="no-referrer-when-downgrade"
               />
            </div>
          </motion.div>

          {/* --- RIGHT COLUMN: FORM --- */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full lg:w-1/2"
          >
            <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800 backdrop-blur-md relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500 rounded-tl-lg" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500 rounded-br-lg" />

              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                  <input 
                    type="text" 
                    id="name"
                    name="name"
                    value={formState.name}
                    onChange={(e) => setFormState({...formState, name: e.target.value})}
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-zinc-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-white placeholder-gray-600"
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                  <input 
                    type="email" 
                    id="email"
                    name="email"
                    value={formState.email}
                    onChange={(e) => setFormState({...formState, email: e.target.value})}
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-zinc-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-white placeholder-gray-600"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-400 mb-2">Message</label>
                  <textarea 
                    id="message"
                    name="message"
                    rows={5}
                    value={formState.message}
                    onChange={(e) => setFormState({...formState, message: e.target.value})}
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-zinc-700 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all text-white placeholder-gray-600 resize-none"
                    placeholder="How can we help?"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-lg font-bold text-lg tracking-wide transition-all duration-300 ${
                    isSubmitting 
                      ? "bg-zinc-700 text-gray-400 cursor-not-allowed" 
                      : "bg-green-600 hover:bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]"
                  }`}
                >
                  {isSubmitting ? "Transmitting..." : "Send Message"}
                </button>

                {result && (
                  <p className={`text-center text-sm font-mono mt-4 ${result.includes("Success") ? "text-green-400" : "text-red-400"}`}>
                    {result}
                  </p>
                )}
              </div>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}