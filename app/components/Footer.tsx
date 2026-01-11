import Link from 'next/link';
import Image from 'next/image';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaLinkedin, FaSnowflake } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { 
      icon: <FaFacebook />, 
      href: 'https://www.facebook.com/JPCSDLSAU',
      // Kept your original hover color, it works well
      color: "hover:text-green-500 hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" 
    },
    { 
      icon: <FaInstagram />, 
      href: 'https://www.instagram.com/jpcs_dlsau?igsh=YXo5emdqNTNpaDd6',
      // Changed Instagram to green to match the new "leaking hue" theme better, 
      // but feel free to change back to red if preferred.
      color: "hover:text-green-500 hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" 
    },
    { 
      icon: <FaYoutube />, 
      href: 'https://youtube.com',
      color: "hover:text-green-500 hover:drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" 
    },
  ];

  return (
    <footer className="relative z-[10] bg-black text-white py-8 mt-auto border-t border-zinc-900 
      {/* CHANGE 1: overflow-visible allows the shadow to 'leak' out */}
      overflow-visible 
      {/* CHANGE 2: The Upward Green Leak Effect */}
      shadow-[0_-20px_60px_-15px_rgba(34,197,94,0.5)]
    ">
      
      {/* --- CYBER BORDER EFFECT (Changed from white to green) --- */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent blur-[2px]" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-80" />
      
      {/* --- CHANGE 3: Internal Radioactive Atmosphere --- */}
      {/* This creates a glow from the bottom center upwards inside the footer */}
      <div className="absolute inset-0 pointer-events-none blur-2xl
        bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-green-700/30 via-zinc-900/10 to-transparent" 
      />

      <div className="relative z-10 container mx-auto flex flex-col items-center gap-6 px-4">
        
        {/* Social Media Icons Section */}
        <div className="flex gap-8">
          {socialLinks.map((link, index) => (
            <Link 
              key={index} 
              href={link.href}
              target="_blank" 
              rel="noopener noreferrer"
              className={`text-2xl text-zinc-500 transition-all duration-500 transform hover:scale-110 hover:-translate-y-1 ${link.color}`}
            >
              {link.icon}
            </Link>
          ))}
        </div>

        {/* Copyright Section with Logo */}
        <div className="flex flex-col md:flex-row items-center gap-3 text-sm md:text-base text-zinc-500 font-mono">
          
          <div className="flex items-center gap-3">
            <Image 
              src="/Logo.png" 
              alt="La Salle Computer Society Logo" 
              width={30} 
              height={30} 
              // Added a green drop shadow on hover to match the theme
              className="h-8 w-auto grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:drop-shadow-[0_0_5px_rgba(34,197,94,0.5)] transition-all duration-500"
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