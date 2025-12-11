"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Standard Link Style (Underline effect)
  const navLinkStyles = "relative pb-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-green-500 after:transition-all after:duration-300 hover:after:w-full hover:text-green-400 transition-colors";

  // Contact Button Style (Hollow -> Solid Block)
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

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out ${
        isScrolled
          ? "bg-black/70 backdrop-blur-md shadow-lg py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-white">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/Logo.png"
            alt="Logo"
            width={40}
            height={40}
            className="group-hover:scale-110 transition-transform duration-300"
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">JPCS</span>
            <span className="text-[10px] opacity-80 tracking-wider">
              DE LA SALLE ARANETA UNIVERSITY
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        {/* Added 'items-center' to ensure the button aligns perfectly with text links */}
        <div className="hidden md:flex gap-8 items-center text-sm font-medium">
          <Link href="/" className={navLinkStyles}>
            Home
          </Link>
          <Link href="/about" className={navLinkStyles}>
            About
          </Link>
          <Link href="/events" className={navLinkStyles}>
            Events
          </Link>
          
          {/* Contact Button is now separate for emphasis */}
          <Link href="/contact" className={contactBtnStyles}>
            Contact Us
          </Link>
        </div>
        
        {/* Mobile Menu Button */}
        <div className="md:hidden">
            <button className="text-white text-2xl">☰</button>
        </div>

      </div>
    </nav>
  );
}