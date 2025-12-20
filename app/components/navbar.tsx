"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { FaBars, FaTimes, FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa"; 

// --- ANIMATION VARIANTS ---
const menuVariants: Variants = {
  closed: {
    x: "100%",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 40,
      staggerDirection: -1,
      when: "afterChildren"
    }
  },
  open: {
    x: "0%",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.1,
      delayChildren: 0.2,
      when: "beforeChildren"
    }
  }
};

const linkVariants: Variants = {
  closed: { x: 50, opacity: 0 },
  open: { x: 0, opacity: 1 }
};

const backdropVariants: Variants = {
  closed: { opacity: 0 },
  open: { opacity: 1 }
};

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
  }, [isMobileMenuOpen]);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);
  const isActive = (path: string) => pathname === path;

  // Link Hover Styles
  const getNavLinkClass = (path: string) => `
    relative pb-1 transition-colors duration-300 font-medium tracking-wide
    ${isActive(path) 
      ? "text-green-600 dark:text-green-400 after:w-full" 
      : "text-zinc-600 dark:text-zinc-300 hover:text-green-600 dark:hover:text-green-400 after:w-0 hover:after:w-full"
    }
    after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-green-500 after:transition-all after:duration-300
  `;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out border-b ${
          isScrolled
            ? "bg-white/80 dark:bg-black/80 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 py-3 shadow-sm"
            : "bg-transparent border-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          
          {/* --- LOGO SECTION --- */}
          <Link 
            href="/" 
            className="flex items-center gap-3 group relative px-3 py-2 z-50"
            onClick={closeMenu}
          >
            {/* HOVER HIGHLIGHTER */}
            <div className="absolute inset-0 bg-green-500/10 dark:bg-green-500/20 rounded-xl scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-out -z-10" />

            <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-110">
               <Image src="/Logo.png" alt="Logo" fill className="object-contain drop-shadow-md" />
            </div>
            
            <div className={`flex flex-col leading-tight transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-0 md:opacity-100" : "opacity-100"}`}>
              <span className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">JPCS</span>
              <span className="text-[9px] font-bold tracking-[0.1em] text-zinc-500 uppercase">De La Salle Araneta University</span>
            </div>
          </Link>

          {/* --- DESKTOP NAVIGATION --- */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className={getNavLinkClass('/')}>Home</Link>
            <Link href="/About" className={getNavLinkClass('/About')}>About</Link>
            <Link href="/Officers" className={getNavLinkClass('/Officers')}>Officers</Link>
            <Link href="/Events" className={getNavLinkClass('/Events')}>Events</Link>
            
            {/* BUTTON UPDATE: hover:text-white enforced for both light and dark mode */}
            <Link 
              href="/Contact" 
              className="
                px-6 py-2 
                rounded-full font-bold
                border-2 border-green-600 dark:border-green-500
                text-green-700 dark:text-green-400
                bg-transparent
                transition-all duration-300 ease-out
                hover:bg-green-600 dark:hover:bg-green-500
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
            className="md:hidden z-50 p-2 text-2xl text-zinc-800 dark:text-white focus:outline-none transition-transform active:scale-90"
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
            {/* Backdrop */}
            <motion.div 
              key="backdrop"
              variants={backdropVariants}
              initial="closed"
              animate="open"
              exit="closed"
              onClick={closeMenu}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Side Drawer */}
            <motion.div
              key="drawer"
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed top-0 right-0 h-full w-[85%] max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col justify-between"
            >
              {/* Decorative blobs */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-green-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none" />

              <div className="flex flex-col h-full pt-28 px-8 pb-8 relative z-10">
                
                {/* Navigation Links */}
                <div className="flex flex-col gap-6">
                  {[
                    { name: "Home", path: "/" },
                    { name: "About Us", path: "/About" },
                    { name: "Officers", path: "/Officers" },
                    { name: "Events", path: "/Events" },
                  ].map((link, i) => (
                    <motion.div key={i} variants={linkVariants}>
                      <Link 
                        href={link.path} 
                        onClick={closeMenu}
                        className={`text-3xl font-bold tracking-tight transition-all duration-300 flex items-center gap-4 group ${
                          isActive(link.path) ? "text-green-600 dark:text-green-500" : "text-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        <span className={`text-xs font-mono font-normal mt-2 ${isActive(link.path) ? "text-green-600" : "text-zinc-400"}`}>
                          0{i + 1}
                        </span>
                        <span className="group-hover:translate-x-2 transition-transform">
                          {link.name}
                        </span>
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
                  
                  {/* Mobile Contact Button */}
                  <Link 
                    href="/Contact" 
                    onClick={closeMenu} 
                    className="
                      flex items-center justify-center w-full py-4 rounded-xl font-bold transition-all duration-300
                      border-2 border-green-600 dark:border-green-500
                      text-green-700 dark:text-green-400
                      bg-transparent
                      hover:bg-green-600 dark:hover:bg-green-500
                      hover:text-white dark:hover:text-white
                    "
                  >
                    Contact Us
                  </Link>

                  <div className="flex gap-4 justify-center">
                    {[FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn].map((Icon, idx) => (
                      <a 
                        key={idx}
                        href="#" 
                        className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-green-600 hover:border-green-600 transition-all duration-300"
                      >
                        <Icon size={14} />
                      </a>
                    ))}
                  </div>
                  
                  <p className="text-center text-[10px] text-zinc-400 uppercase tracking-widest">
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