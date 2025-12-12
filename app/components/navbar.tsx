"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaBars, FaTimes } from "react-icons/fa"; 

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  const navLinkStyles = "relative pb-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-green-500 after:transition-all after:duration-300 hover:after:w-full hover:text-green-400 transition-colors";

  const contactBtnStyles = `
    px-6 py-2 
    border-2 border-green-500 
    text-white font-medium 
    rounded-md 
    transition-all duration-300 
    hover:bg-green-500 
    hover:text-black 
    hover:shadow-[0_0_20px_rgba(34,197,94,0.5)]
  `;

  const mobileLinkStyles = "block py-4 text-xl border-b border-gray-800 hover:text-green-400 transition-colors";

  return (
    <>
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out ${
          isScrolled
            ? "bg-black/70 backdrop-blur-md shadow-lg py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-white">
          
          {/* Logo Section */}
          <Link 
            href="/" 
            className="
              flex items-center group 
              bg-transparent hover:bg-white 
              px-5 py-2 rounded-lg 
              transition-all duration-300
              z-50 relative
              hover:shadow-[0_0_25px_rgba(34,197,94,0.8)]
            "
          >
            <Image
              src="/Logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="group-hover:scale-110 transition-transform duration-300 drop-shadow-sm"
            />
            
            <div className={`
              flex flex-col 
              overflow-hidden whitespace-nowrap 
              transition-all duration-500 ease-in-out
              ${isMobileMenuOpen ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-3"}
            `}>
              <span className="font-bold text-lg leading-tight text-white group-hover:text-green-700 transition-colors duration-300">
                JPCS
              </span>
              <span className="text-[10px] opacity-90 tracking-wider text-gray-300 group-hover:text-black font-semibold transition-colors duration-300">
                DE LA SALLE ARANETA UNIVERSITY
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-8 items-center text-sm font-medium">
            <Link href="/" className={navLinkStyles}>Home</Link>
            <Link href="/About" className={navLinkStyles}>About</Link>
            {/* NEW OFFICERS LINK */}
            <Link href="/Officers" className={navLinkStyles}>Officers</Link>
            <Link href="/Events" className={navLinkStyles}>Events</Link>
            <Link href="/Contact" className={contactBtnStyles}>Contact Us</Link>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden z-50">
              <button 
                onClick={toggleMenu} 
                className="text-white text-2xl focus:outline-none hover:text-green-400 transition-colors"
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
              </button>
          </div>
        </div>
      </nav>

      {/* --- MOBILE SIDEBAR --- */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMenu} 
      />

      <div 
        className={`fixed top-0 right-0 h-full w-[75%] max-w-sm bg-zinc-900 border-l border-zinc-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out pt-24 px-8 ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-2 text-white font-medium">
          <Link href="/" onClick={closeMenu} className={mobileLinkStyles}>Home</Link>
          <Link href="/About" onClick={closeMenu} className={mobileLinkStyles}>About</Link>
          {/* NEW OFFICERS LINK MOBILE */}
          <Link href="/Officers" onClick={closeMenu} className={mobileLinkStyles}>Officers</Link>
          <Link href="/Events" onClick={closeMenu} className={mobileLinkStyles}>Events</Link>
          <div className="mt-8">
            <Link 
              href="/Contact" 
              onClick={closeMenu} 
              className="block w-full text-center py-3 bg-green-600 hover:bg-green-500 text-black font-bold rounded-md shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}