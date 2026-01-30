"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaHeart, FaRegHeart, FaMagic } from "react-icons/fa";

export const ValentineBackground = () => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; duration: number; delay: number; type: string; color: string; }[]>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 30 + 15,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      type: Math.random() > 0.6 ? 'heart_solid' : Math.random() > 0.3 ? 'heart_outline' : 'sparkle',
      color: Math.random() > 0.5 ? 'text-rose-500' : 'text-pink-400'
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-rose-500/20 dark:bg-rose-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-pink-500/20 dark:bg-pink-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
      {particles.map((p) => (
        <motion.div key={p.id} className={`absolute ${p.color} opacity-60 dark:opacity-40`} style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: `${p.size}px` }} animate={{ y: [0, -150, 0], opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1], rotate: [0, 20, -20, 0] }} transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}>
          {p.type === 'heart_solid' && <FaHeart />}
          {p.type === 'heart_outline' && <FaRegHeart />}
          {p.type === 'sparkle' && <FaMagic />}
        </motion.div>
      ))}
      <div className="absolute inset-0 opacity-5 dark:opacity-10 bg-[url('https://www.transparenttextures.com/patterns/hearts.png')] mix-blend-overlay"></div>
    </div>
  );
};