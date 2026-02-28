"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { FaBars, FaTimes, FaFacebookF, FaInstagram } from "react-icons/fa"; 

// --- ANIMATION VARIANTS ---
const menuVariants: Variants = {
  closed: {
    x: "100%",
    transition: { type: "spring", stiffness: 400, damping: 40, staggerDirection: -1, when: "afterChildren" }
  },
  open: {
    x: "0%",
    transition: { type: "spring", stiffness: 300, damping: 30, staggerChildren: 0.07, delayChildren: 0.1, when: "beforeChildren" }
  }
};

const linkVariants: Variants = {
  closed: { x: 50, opacity: 0 },
  open: { x: 0, opacity: 1, transition: { type: "tween", ease: "easeOut", duration: 0.3 } }
};

const backdropVariants: Variants = {
  closed: { opacity: 0 },
  open: { opacity: 1 }
};

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Scroll Listener
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock Body Scroll
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
  }, [isMobileMenuOpen]);

  const toggleMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);
  const closeMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const isActive = (path: string) => pathname === path;

  // --- STYLES FOR LINKS (FIXED THEME) ---
  const getNavLinkClass = (path: string) => `
    relative pb-1 transition-colors duration-300 font-medium tracking-wide
    ${isActive(path) 
      ? "text-green-600 dark:text-green-400 after:w-full font-bold" 
      : "text-zinc-600 hover:text-black dark:text-zinc-300 dark:hover:text-white after:w-0 hover:after:w-full"
    }
    after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-green-500 after:transition-all after:duration-300
  `;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ease-in-out border-b will-change-auto global-ui ${
          isScrolled
            ? "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-zinc-200 dark:border-zinc-800 py-3 shadow-sm"
            : "bg-transparent border-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          
          {/* --- LOGO --- */}
          <Link 
            href="/" 
            className="flex items-center gap-3 group relative px-3 py-2 z-50"
            onClick={closeMenu}
          >
            <div className="absolute inset-0 bg-green-500/10 dark:bg-green-500/10 rounded-xl scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out -z-10" />
            <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-110 shrink-0">
               <Image src="/Logo.png" alt="Logo" fill sizes="40px" className="object-contain drop-shadow-md" priority />
            </div>
            {/* TEXT: Fixed to be readable in both modes */}
            <div className={`flex flex-col leading-tight transition-all duration-300 ${isMobileMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
              <span className={`font-bold text-sm md:text-base lg:text-lg tracking-tight transition-colors whitespace-nowrap ${isScrolled ? "text-zinc-900 dark:text-white" : "text-zinc-900 dark:text-white"}`}>
                Junior Philippine Computer Society
              </span>
              <span className="text-[9px] font-bold tracking-[0.1em] text-zinc-500 dark:text-zinc-400 uppercase">
                DLSAU
              </span>
            </div>
          </Link>

          {/* --- DESKTOP NAV --- */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/About" className={getNavLinkClass('/About')}>About</Link>
            <Link href="/Officers" className={getNavLinkClass('/Officers')}>Officers</Link>
            <Link href="/Blogs" className={getNavLinkClass('/Blogs')}>Blogs</Link>
            <Link href="/Events" className={getNavLinkClass('/Events')}>Events</Link>
            <Link href="/Tools" className={getNavLinkClass('/Tools')}>Tools</Link>
            
            {/* Flashing Registration Link */}
            <Link 
              href="/castweek" 
              className={`
                relative flex items-center gap-2 font-black transition-all duration-300 hover:-translate-y-0.5
                text-green-600 dark:text-green-400 drop-shadow-sm
              `}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="uppercase tracking-wider text-sm animate-pulse">
                Registration
              </span>
            </Link>

            <Link 
              href="/Contact" 
              className="
                px-6 py-2 rounded-full font-bold
                border-2 border-green-600 dark:border-green-500
                text-green-600 dark:text-green-400
                bg-transparent transition-all duration-300 ease-out
                hover:bg-green-600 dark:hover:bg-green-600
                hover:text-white dark:hover:text-white 
                hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]
                active:scale-95
              "
            >
              Contact Us
            </Link>
          </div>
          
          {/* --- MOBILE BURGER --- */}
          <button 
            onClick={toggleMenu} 
            className={`md:hidden z-50 p-2 text-2xl focus:outline-none transition-transform active:scale-90 ${isMobileMenuOpen ? "text-zinc-900 dark:text-white" : "text-zinc-900 dark:text-white"}`}
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </nav>

      {/* --- MOBILE MENU OVERLAY --- */}
      <AnimatePresence mode="wait">
        {isMobileMenuOpen && (
          <>
            <motion.div 
              key="backdrop"
              variants={backdropVariants}
              initial="closed"
              animate="open"
              exit="closed"
              onClick={closeMenu}
              className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[101]"
            />

            <motion.div
              key="drawer"
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              // DRAWER BG: White (Light) | Dark Zinc (Dark)
              className="fixed top-0 right-0 h-full w-[85%] max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-[102] flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-green-500/5 rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-rose-500/5 rounded-full pointer-events-none" />

              <div className="flex flex-col h-full pt-28 px-8 pb-8 relative z-10">
                
                {/* --- MOBILE LINKS --- */}
                <div className="flex flex-col gap-6">
                  {[
                    { name: "About Us", path: "/About" },
                    { name: "Officers", path: "/Officers" },
                    { name: "Blogs", path: "/Blogs" },
                    { name: "Events", path: "/Events" },
                    { name: "Tools", path: "/Tools" },
                    { name: "Registration", path: "/castweek", isRegistration: true }, 
                  ].map((link, i) => (
                    <motion.div key={i} variants={linkVariants}>
                      <Link 
                        href={link.path} 
                        onClick={closeMenu}
                        className={`text-3xl font-bold tracking-tight transition-all duration-300 flex items-center gap-4 group ${
                          isActive(link.path) 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-zinc-900 dark:text-white"
                        }`}
                      >
                        <span className={`text-xs font-mono font-normal mt-2 ${isActive(link.path) ? "text-green-600 dark:text-green-400" : "text-zinc-400 dark:text-zinc-600"}`}>
                          0{i + 1}
                        </span>
                        
                        {link.isRegistration ? (
                          <span className="flex items-center gap-3 text-green-600 dark:text-green-400 animate-pulse">
                            {link.name}
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                          </span>
                        ) : (
                          <span>{link.name}</span>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Mobile Footer */}
                <motion.div 
                  variants={linkVariants}
                  className="mt-auto space-y-6"
                >
                  <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />
                  
                  <Link 
                    href="/Contact" 
                    onClick={closeMenu} 
                    className="
                      flex items-center justify-center w-full py-4 rounded-xl font-bold transition-all duration-300
                      border-2 border-green-600 dark:border-green-500
                      text-green-600 dark:text-green-400
                      bg-transparent
                      hover:bg-green-600 dark:hover:bg-green-600
                      hover:text-white dark:hover:text-white
                    "
                  >
                    Contact Us
                  </Link>

                  <div className="flex gap-4 justify-center">
                    {[FaFacebookF,FaInstagram].map((Icon, idx) => (
                      <a 
                        key={idx}
                        href="https://www.facebook.com/JPCSDLSAU" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-green-600 dark:hover:bg-green-600 transition-all duration-300"
                      >
                        <Icon size={14} />
                      </a>
                    ))}
                  </div>
                  
                  <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                    © 2025 JPCS - DLSAU
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}