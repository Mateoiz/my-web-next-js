  "use client";

  import { useEffect, useState, useMemo } from "react";
  import { motion } from "framer-motion";
  // 1. Import useTheme hook
  import { useTheme } from "next-themes";

  export default function HolidayTheme() {
    const [mounted, setMounted] = useState(false);
    // 2. Get the current resolved theme (light or dark)
    const { resolvedTheme } = useTheme();

    useEffect(() => {
      setMounted(true);
    }, []);

    // Prevent rendering until mounted to know the actual theme
    if (!mounted) return null;

    const isLightMode = resolvedTheme === 'light';

    return (
      <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
        
        {/* --- 1. CYBER LIGHTS (Top Border) - Keep these as they work in both modes --- */}
        <div className="absolute top-0 left-0 w-full flex justify-center gap-8 sm:gap-12 md:gap-24 overflow-hidden py-2">
          {/* Wire - adjusted color slightly for visibility in light mode */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-zinc-300/50 dark:bg-zinc-800/50" />
          
          {/* Bulbs */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="relative group">
              {/* Socket */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-3 bg-zinc-400 dark:bg-zinc-800" />
              {/* Bulb */}
              <div 
                className={`w-3 h-3 rounded-full shadow-lg animate-pulse ${
                  i % 2 === 0 
                    ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]" 
                    : "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]"
                }`}
                style={{
                  animationDuration: `${(i % 3) + 2}s`, 
                  animationDelay: `${(i % 2) * 0.5}s`
                }}
              />
            </div>
          ))}
        </div>

        {/* --- 2. ENHANCED SNOWFALL / STARS --- */}
        {Array.from({ length: 50 }).map((_, i) => (
          // 3. Pass the theme status down to the child component
          <SnowFlake key={i} isLightMode={isLightMode} />
        ))}

      </div>
    );
  }

  // Sub-component for individual flakes/stars
  // 4. Accept the prop
  const SnowFlake = ({ isLightMode }: { isLightMode: boolean }) => {
    const config = useMemo(() => ({
      left: Math.random() * 100, 
      duration: Math.random() * 15 + 10, 
      delay: Math.random() * -20, 
      size: Math.random() * 4 + 2, 
      sway: Math.random() * 100 - 50, 
    }), []);

    // 5. Define styles based on theme
    const particleStyles = isLightMode
      ? "bg-yellow-400 rounded-sm shadow-[0_0_4px_rgba(250,204,21,0.8)]" // Light mode: Yellow, sharper corners, glowing star looks
      : "bg-white/80 rounded-full blur-[0.5px]"; // Dark mode: White, round, soft snow look

    return (
      <motion.div
        initial={{ y: -50, x: 0, opacity: 0 }}
        animate={{ 
          y: "110vh", 
          x: config.sway, 
          // Slightly different opacity curve for stars vs snow
          opacity: isLightMode ? [0, 1, 0.8, 0] : [0, 0.8, 0.4, 0],
          rotate: 360 
        }}
        transition={{
          duration: config.duration,
          repeat: Infinity,
          delay: config.delay,
          ease: "linear",
        }}
        style={{
          left: `${config.left}%`,
          width: config.size,
          height: config.size,
          willChange: "transform",
        }}
        // 6. Apply conditional styles
        className={`absolute top-[-20px] ${particleStyles}`}
      />
    );
  };