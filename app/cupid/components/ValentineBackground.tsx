"use client";
import { useEffect, useState } from "react";

export const ValentineBackground = () => {
  const [hearts, setHearts] = useState<{ id: number; left: string; delay: string; duration: string }[]>([]);

  useEffect(() => {
    // Generate static values only once on mount
    const newHearts = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${10 + Math.random() * 10}s`, // Slower, smoother animation (10-20s)
    }));
    setHearts(newHearts);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* CSS for the floating animation */}
      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(110vh) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-10vh) scale(1) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute text-rose-500/20 dark:text-rose-500/10 text-4xl"
          style={{
            left: heart.left,
            animation: `floatUp ${heart.duration} linear infinite`,
            animationDelay: heart.delay,
            willChange: "transform, opacity", // Hint to browser for GPU acceleration
          }}
        >
          ♥
        </div>
      ))}
      
      {/* Optional: Static Gradient Overlay for mood without cost */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
};