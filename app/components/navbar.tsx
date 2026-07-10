"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, type Variants } from "framer-motion";
import { FaBars, FaTimes, FaFacebookF, FaInstagram } from "react-icons/fa"; 

// ─── CENTRALIZED NAVIGATION DATA ──────────────────────────────────────────────
const NAV_LINKS = [
  { name: "About", path: "/About" },
  { name: "Officers", path: "/Officers" },
  { name: "Blogs", path: "/Blogs" },
  { name: "Events", path: "/Events" },
  { name: "Workspace", path: "/Workspace" },
  { name: "CVMAS", path: "/register" },
];

// ─── ANIMATION VARIANTS ───────────────────────────────────────────────────────
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
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const pathname = usePathname();
  const { scrollY, scrollYProgress } = useScroll(); // Added scrollYProgress for the reading bar

  // ─── SMART SCROLL LOGIC ───
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    
    setIsScrolled(latest > 20);

    // Smart hide/show: Hide when scrolling down past 150px, show when scrolling up
    if (latest > 150 && latest > previous && !isMobileMenuOpen) {
      setIsHidden(true);
    } else {
      setIsHidden(false);
    }
  });

  // ─── ACCESSIBILITY & BUG PREVENTION ───
  const closeMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);

  useEffect(() => {
    // 1. Lock body scroll when mobile menu is open
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';

    // 2. Close menu on 'Escape' key press
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) closeMenu();
    };

    // 3. Close menu if window is resized to desktop bounds (>= 1024px)
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileMenuOpen) closeMenu();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobileMenuOpen, closeMenu]);

  // ─── ROUTE MATCHING ───
  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    // Exact match OR sub-route match (e.g. /Blogs highlights even if on /Blogs/123)
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  // THE KILL SWITCH: Hide entirely on Dashboard
  if (pathname && pathname.toLowerCase().startsWith('/dashboard')) {
    return null;
  }

  return (
    <>
      <motion.nav
        variants={{
          visible: { y: 0 },
          hidden: { y: "-100%" }
        }}
        animate={isHidden ? "hidden" : "visible"}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className={`fixed top-0 left-0 w-full z-[100] transition-colors duration-300 border-b will-change-auto global-ui ${
          isScrolled
            ? "bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-zinc-200 dark:border-zinc-800 py-3 shadow-sm"
            : "bg-transparent border-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center relative">
          
          {/* ─── LOGO ─── */}
          <Link 
            href="/" 
            className="flex items-center gap-3 group relative px-3 py-2 z-50 shrink-0 outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-green-500"
            onClick={closeMenu}
          >
            <div className="absolute inset-0 bg-green-500/10 dark:bg-green-500/10 rounded-xl scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out -z-10" />
            <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-110 shrink-0">
               <Image src="/Logo.png" alt="JPCS Logo" fill sizes="40px" className="object-contain drop-shadow-md" priority />
            </div>
            <div className={`flex flex-col leading-tight transition-all duration-300 ${isMobileMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
              <span className={`font-bold text-sm md:text-base lg:text-lg tracking-tight transition-colors whitespace-nowrap text-zinc-900 dark:text-white`}>
                Junior Philippine Computer Society
              </span>
              <span className="text-[9px] font-bold tracking-[0.1em] text-zinc-500 dark:text-zinc-400 uppercase">
                DLSAU
              </span>
            </div>
          </Link>

          {/* ─── DESKTOP NAV ─── */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            <div className="flex items-center gap-1 xl:gap-3">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link 
                    key={link.name} 
                    href={link.path} 
                    className={`relative px-3 py-2 text-sm font-bold tracking-wide transition-colors outline-none rounded-lg focus-visible:ring-2 focus-visible:ring-green-500 ${
                      active 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    }`}
                  >
                    {link.name}
                    
                    {/* Seamless Sliding Underline */}
                    {active && (
                      <motion.div
                        layoutId="desktop-nav-indicator"
                        className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-green-500 rounded-t-full"
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
            
            {/* Contact CTA */}
            <Link 
              href="/Contact" 
              className="
                px-6 py-2 rounded-full font-bold ml-2 text-sm tracking-wide
                border-2 border-green-600 dark:border-green-500
                text-green-600 dark:text-green-400 outline-none
                bg-transparent transition-all duration-300 ease-out
                hover:bg-green-600 dark:hover:bg-green-600
                hover:text-white dark:hover:text-white 
                hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]
                focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black
                active:scale-95
              "
            >
              Contact Us
            </Link>
          </div>
          
          {/* ─── MOBILE BURGER ─── */}
          <button 
            onClick={toggleMenu} 
            className="lg:hidden z-50 p-2 text-2xl text-zinc-900 dark:text-white focus:outline-none transition-transform active:scale-90 rounded-lg focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label={isMobileMenuOpen ? "Close Menu" : "Open Menu"}
            aria-expanded={isMobileMenuOpen}
          >
            <motion.div
              animate={{ rotate: isMobileMenuOpen ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
            </motion.div>
          </button>
        </div>

        {/* ─── READING PROGRESS BAR ─── */}
        {/* Only visible when scrolled down slightly, tracks scroll depth across the site */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-green-500 to-emerald-400 origin-left z-[101]"
          style={{ scaleX: scrollYProgress, opacity: isScrolled ? 1 : 0 }}
        />
      </motion.nav>

      {/* ─── MOBILE MENU OVERLAY ─── */}
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
              className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-[101]"
            />

            <motion.div
              key="drawer"
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed top-0 right-0 h-full w-[85%] max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-[102] flex flex-col justify-between"
            >
              {/* Ambient Background Glows */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-green-500/5 rounded-full pointer-events-none blur-3xl" />
              <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-500/5 rounded-full pointer-events-none blur-3xl" />

              <div className="flex flex-col h-full pt-28 px-8 pb-8 relative z-10 overflow-y-auto">
                
                {/* Mobile Links */}
                <div className="flex flex-col gap-6">
                  {NAV_LINKS.map((link, i) => {
                    const active = isActive(link.path);
                    return (
                      <motion.div key={link.name} variants={linkVariants}>
                        <Link 
                          href={link.path} 
                          onClick={closeMenu}
                          className={`text-2xl sm:text-3xl font-black tracking-tight transition-all duration-300 flex items-center gap-4 group ${
                            active 
                              ? "text-green-600 dark:text-green-400" 
                              : "text-zinc-900 dark:text-white"
                          }`}
                        >
                          <span className={`text-xs font-mono font-bold mt-1 transition-colors duration-300 ${
                            active ? "text-green-600 dark:text-green-400" : "text-zinc-300 dark:text-zinc-700"
                          }`}>
                            0{i + 1}
                          </span> 
                          {link.name}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Mobile Footer Area */}
                <motion.div 
                  variants={linkVariants}
                  className="mt-12 space-y-6"
                >
                  <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />
                  
                  <Link 
                    href="/Contact" 
                    onClick={closeMenu} 
                    className="
                      flex items-center justify-center w-full py-4 rounded-xl font-bold transition-all duration-300
                      border-2 border-green-600 dark:border-green-500 outline-none
                      text-green-600 dark:text-green-400 tracking-wide
                      bg-transparent active:scale-95
                      hover:bg-green-600 dark:hover:bg-green-600 hover:text-white dark:hover:text-white
                      focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2
                    "
                  >
                    Contact Us
                  </Link>

                  <div className="flex gap-4 justify-center">
                    {[
                      { icon: FaFacebookF, url: "https://www.facebook.com/JPCSDLSAU" },
                      { icon: FaInstagram, url: "https://www.instagram.com/jpcs_dlsau/" } 
                    ].map((social, idx) => (
                      <a 
                        key={idx}
                        href={social.url} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-green-600 dark:hover:bg-green-600 hover:border-green-600 transition-all duration-300 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                      >
                        <social.icon size={14} />
                      </a>
                    ))}
                  </div>
                  
                  <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-bold">
                    © {new Date().getFullYear()} JPCS - DLSAU
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