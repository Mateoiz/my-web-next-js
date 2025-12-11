import Link from 'next/link';
import Image from 'next/image';
// Importing brand icons from react-icons/fa (FontAwesome)
import { FaFacebook, FaInstagram, FaLinkedin, FaGithub, FaTwitter } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  // EDIT HERE: Add your actual social media links
  const socialLinks = [
    { href: "https://www.facebook.com/JPCSDLSAU", icon: <FaFacebook size={20} />, label: "Facebook" },
    { href: "https://instagram.com", icon: <FaInstagram size={20} />, label: "Instagram" },
    { href: "https://linkedin.com", icon: <FaLinkedin size={20} />, label: "LinkedIn" },
    { href: "https://github.com", icon: <FaGithub size={20} />, label: "GitHub" },
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
              className="text-2xl hover:text-gray-400 transition-colors"
            >
              {link.icon}
            </Link>
          ))}
        </div>

        {/* Copyright Section with Logo */}
        <div className="flex items-center gap-3 text-sm md:text-base">
          {/* Assuming Logo.png is in your /public folder */}
          <Image 
            src="/logo.png"
            alt="DLSAU JPCS Logo" 
            width={30} 
            height={30} 
            className="h-8 w-auto"
          />
          <p>
            &copy; {currentYear} DLSAU Junior Philippine Computer Society. All Rights Reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}