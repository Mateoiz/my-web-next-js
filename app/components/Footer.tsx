import Link from 'next/link';
import Image from 'next/image';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaLinkedin } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: <FaFacebook />, href: 'https://www.facebook.com/JPCSDLSAU' },
    { icon: <FaTwitter />, href: 'https://twitter.com' },
    { icon: <FaInstagram />, href: 'https://www.instagram.com/jpcs_dlsau?igsh=YXo5emdqNTNpaDd6' },
    { icon: <FaYoutube />, href: 'https://youtube.com' },
    { icon: <FaLinkedin />, href: 'https://linkedin.com' },
  ];

  return (
    <footer className="bg-black text-white py-6 mt-auto">
      <div className="container mx-auto flex flex-col items-center gap-4 px-4">
        
        {/* Social Media Icons Section */}
        <div className="flex gap-6">
          {socialLinks.map((link, index) => (
            <Link 
              key={index} 
              href={link.href}
              // These two lines make it open in a new tab
              target="_blank" 
              rel="noopener noreferrer"
              className="text-2xl hover:text-gray-400 transition-colors"
            >
              {link.icon}
            </Link>
          ))}
        </div>

        {/* Copyright Section with Logo */}
        <div className="flex items-center gap-3 text-sm md:text-base">
          <Image 
            src="/Logo.png" 
            alt="La Salle Computer Society Logo" 
            width={30} 
            height={30} 
            className="h-8 w-auto"
          />
          <p>
            &copy; {currentYear} La Salle Computer Society. All Rights Reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}