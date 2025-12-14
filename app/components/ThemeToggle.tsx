"use client";

import { useTheme } from "next-themes";
import { FaSun, FaMoon } from "react-icons/fa";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="
        fixed bottom-6 right-6 
        z-[9999] /* Updated to be super high */
        cursor-pointer /* Forces the hand cursor */
        p-4 rounded-full shadow-lg
 
        /* Light Mode Styles */
        bg-white text-yellow-500 border-2 border-yellow-400
        
        /* Dark Mode Styles (Tailwind 'dark:' modifier) */
        dark:bg-zinc-800 dark:text-purple-400 dark:border-zinc-600
        dark:shadow-[0_0_20px_rgba(168,85,247,0.4)]
      "
      aria-label="Toggle Dark Mode"
    >
      {theme === "dark" ? <FaMoon size={20} /> : <FaSun size={20} />}
    </button>
  );
}