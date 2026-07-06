"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaPaw, FaLeaf, FaBone, FaSeedling } from "react-icons/fa";

export default function FloatingNature() {
  const [elements, setElements] = useState<any[]>([]);

  useEffect(() => {
    const icons = [FaPaw, FaLeaf, FaBone, FaSeedling];
    const newElements = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      Icon: icons[Math.floor(Math.random() * icons.length)],
      size: Math.random() * 20 + 15, // between 15px and 35px
      left: Math.random() * 100, // random left percentage
      delay: Math.random() * 5, // random start delay
      duration: Math.random() * 10 + 15, // between 15s and 25s float time
      rotation: Math.random() * 360,
    }));
    setElements(newElements);
  }, []);

  if (elements.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {elements.map((el) => {
        const { Icon } = el;
        return (
          <motion.div
            key={el.id}
            initial={{ 
              y: "110vh", 
              x: `${el.left}vw`, 
              opacity: 0, 
              rotate: el.rotation 
            }}
            animate={{ 
              y: "-10vh", 
              opacity: [0, 0.2, 0.4, 0.2, 0], // Fades in and out softly
              rotate: el.rotation + (Math.random() > 0.5 ? 90 : -90) // Slowly spins
            }}
            transition={{
              duration: el.duration,
              delay: el.delay,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute text-[#06402B] dark:text-emerald-500/20"
            style={{ fontSize: el.size }}
          >
            <Icon />
          </motion.div>
        );
      })}
    </div>
  );
}