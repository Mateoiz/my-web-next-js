"use client";

import { motion } from "framer-motion";
import { FaPaw } from "react-icons/fa";

export default function WalkingPaws({ 
  className = "text-[#06402B] dark:text-emerald-400", 
  size = 24 
}: { 
  className?: string; 
  size?: number; 
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {/* Paw 1: Left step */}
      <motion.div
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
        className={className}
        style={{ transform: 'rotate(-15deg) translateY(4px)' }}
      >
        <FaPaw size={size} />
      </motion.div>

      {/* Paw 2: Right step */}
      <motion.div
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
        className={className}
        style={{ transform: 'rotate(15deg) translateY(-4px)' }}
      >
        <FaPaw size={size} />
      </motion.div>

      {/* Paw 3: Left step */}
      <motion.div
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.8 }}
        className={className}
        style={{ transform: 'rotate(-15deg) translateY(4px)' }}
      >
        <FaPaw size={size} />
      </motion.div>
    </div>
  );
}