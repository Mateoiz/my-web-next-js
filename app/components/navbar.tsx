"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
// Import icons for the menu button
import { FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileMenuOpen]);

  // Styles
  const navLinkStyles = "relative pb-1 text-lg md:text-sm after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-green-500 after:transition-all after:duration-300 hover:after:w-full hover:text-green-400 transition-colors";
  
  const contactBtnStyles = `
    px-6 py-2 
    border-2 border-green-500 
    text-white font-medium 
    rounded-md 
    transition-all duration-300 
    hover:bg-green-500 
    hover:text-black 
    hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]
    text-center
  `;

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out ${
        isScrolled
          ? "bg-black/70 backdrop-blur-md shadow-lg py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-white">
        
        {/* --- LOGO SECTION --- */}
        <Link 
          href="/" 
          className="
            flex items-center gap-3 group 
            bg-white/95 backdrop-blur-sm 
            px-5 py-2 rounded-lg 
            shadow-[0_0_15px_rgba(34,197,94,0.5)] 
            hover:shadow-[0_0_25px_rgba(34,197,94,0.8)] 
            transition-all duration-300
            z-50 relative
          "
        >
          <Image
            src="/Logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="group-hover:scale-110 transition-transform duration-300 drop-shadow-sm"
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight text-green-700">JPCS</span>
            <span className="text-[10px] opacity-90 tracking-wider text-gray-800 font-semibold">
              DE LA SALLE ARANETA UNIVERSITY
            </span>
          </div>
        </Link>

        {/* --- DESKTOP NAVIGATION --- */}
        <div className="hidden md:flex gap-8 items-center text-sm font-medium">
          <Link href="/" className={navLinkStyles}>Home</Link>
          <Link href="/about" className={navLinkStyles}>About</Link>
          <Link href="/events" className={navLinkStyles}>Events</Link>
          <Link href="/contact" className={contactBtnStyles}>Contact Us</Link>
        </div>
        
        {/* --- MOBILE MENU BUTTON --- */}
        <div className="md:hidden z-50">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white text-2xl hover:text-green-400 transition-colors focus:outline-none"
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
        </div>

        {/* --- MOBILE SIDEBAR OVERLAY --- */}
        {/* 1. The Backdrop (Darkens the screen behind the sidebar) */}
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
            mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* 2. The Sidebar Drawer */}
        <div 
          className={`fixed top-0 right-0 h-full w-[75%] max-w-[300px] bg-zinc-900 shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col pt-24 px-6 gap-6 border-l border-zinc-800 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Mobile Links */}
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className={navLinkStyles}>
            Home
          </Link>
          <Link href="/about" onClick={() => setMobileMenuOpen(false)} className={navLinkStyles}>
            About
          </Link>
          <Link href="/events" onClick={() => setMobileMenuOpen(false)} className={navLinkStyles}>
            Events
          </Link>
          
          <div className="mt-4">
             <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className={contactBtnStyles + " block w-full"}>
              Contact Us
            </Link>
          </div>

          {/* Decorative Bottom Text */}
          <div className="mt-auto mb-8 text-center text-xs text-gray-500">
            &copy; JPCS 2025
          </div>
        </div>

      </div>
    </nav>
  );
}