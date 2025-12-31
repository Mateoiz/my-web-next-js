import Link from 'next/link';
import Image from 'next/image';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaLinkedin, FaSnowflake } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { 
      icon: <FaFacebook />, 
      href: 'https://www.facebook.com/JPCSDLSAU',
      color: "hover:text-green-500 hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" // Cyber Green
    },
    { 
      icon: <FaInstagram />, 
      href: 'https://www.instagram.com/jpcs_dlsau?igsh=YXo5emdqNTNpaDd6',
      color: "hover:text-red-500 hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" // Cyber Red
    },
    { 
      icon: <FaYoutube />, 
      href: 'https://youtube.com',
      color: "hover:text-green-500 hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" // Cyber Green
    },
  ];

  return (
   <footer className="relative z-[10] bg-black text-white py-8 mt-auto overflow-hidden border-t border-zinc-800">
      
      {/* --- 1. DIGITAL SNOW CAP (Top Border Effect) --- */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent blur-[1px]" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-50" />
      
      {/* Background Glow (Subtle Christmas vibe) */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900/5 to-red-900/5 pointer-events-none" />

      <div className="relative z-10 container mx-auto flex flex-col items-center gap-6 px-4">
        
        {/* Social Media Icons Section */}
        <div className="flex gap-8">
          {socialLinks.map((link, index) => (
            <Link 
              key={index} 
              href={link.href}
              target="_blank" 
              rel="noopener noreferrer"
              className={`text-2xl text-zinc-400 transition-all duration-300 transform hover:scale-110 ${link.color}`}
            >
              {link.icon}
            </Link>
          ))}
        </div>

        {/* Decorative Divider */}

        {/* Copyright Section with Logo */}
        <div className="flex flex-col md:flex-row items-center gap-3 text-sm md:text-base text-zinc-500">
          
          <div className="flex items-center gap-3">
            <Image 
              src="/Logo.png" 
              alt="La Salle Computer Society Logo" 
              width={30} 
              height={30} 
              className="h-8 w-auto grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
            />
            <p>
              &copy; {currentYear} Junior Philippine Computer Society DLSAU.
            </p>
          </div>

        </div>

      </div>
    </footer>
  );
}