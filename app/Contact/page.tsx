"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FaMapMarkerAlt, FaEnvelope, FaPhone, FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from "react-icons/fa";

export default function ContactPage() {
  const [formState, setFormState] = useState({ name: "", email: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate network request
    setTimeout(() => {
      alert("Message Sent! (This is a demo)");
      setIsSubmitting(false);
      setFormState({ name: "", email: "", message: "" });
    }, 1500);
  };

  return (
    <section className="min-h-screen pt-24 pb-12 px-4 md:px-8 relative overflow-hidden bg-black text-white">
      
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
            {/* Contact Details Cards */}
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
                    jpcs.dlsau@example.com
                  </p>
                </div>
              </div>
            </div>

            {/* Google Map Embed */}
            <div className="w-full h-[300px] rounded-xl overflow-hidden border border-zinc-800 relative group">
               {/* Tech overlay on map */}
               <div className="absolute inset-0 border-[4px] border-transparent group-hover:border-green-500/20 transition-all z-10 pointer-events-none rounded-xl" />
               <iframe 
                 src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3859.953767878896!2d120.99395237587895!3d14.664871475653492!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b6979a071d1b%3A0x86704953934d4021!2sDe%20La%20Salle%20Araneta%20University!5e0!3m2!1sen!2sph!4v1709620000000!5m2!1sen!2sph" 
                 width="100%" 
                 height="100%" 
                 style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }} // Optional: Makes map dark mode-ish
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
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-500 rounded-tl-lg" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-500 rounded-br-lg" />

              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                  <input 
                    type="text" 
                    id="name"
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
              </div>
            </form>
          </motion.div>

        </div>
      </div>
    </section>
  );
}