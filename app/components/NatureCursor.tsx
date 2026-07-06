"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { FaPaw } from "react-icons/fa";

export default function NatureCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  // The 'spring' configuration makes it feel fluid rather than "stuck"
  const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 12); // Offset to center the icon
      cursorY.set(e.clientY - 12);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY]);

  // Disable on mobile/touch devices
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  return (
    <motion.div
      className="fixed top-0 left-0 z-[9999] pointer-events-none text-[#06402B]"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
      }}
    >
      {/* High-quality, crisp SVG Paw */}
      <FaPaw size={24} className="drop-shadow-md" />
    </motion.div>
  );
}