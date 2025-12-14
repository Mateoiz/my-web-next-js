'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

export default function FloatingCubes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -1000, y: -1000 });
  const requestId = useRef<number>(0);

  // Theme Logic
  const { resolvedTheme } = useTheme();
  // Default to green so it works immediately, will update on mount
  const colorRef = useRef('#22c55e'); 

  const config = {
    particleCount: 35,
    minSize: 10,
    maxSize: 30,
    interactionRadius: 150,
    pushStrength: 2,
    friction: 0.95,
  };

  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // 1. Update Color Ref when theme changes
  useEffect(() => {
    if (resolvedTheme === 'light') {
      colorRef.current = '#18181b'; // Zinc-950 (Black/Dark Gray)
    } else {
      colorRef.current = '#22c55e'; // Green-500
    }
  }, [resolvedTheme]);

  const createParticle = (w: number, h: number, initial: boolean = false): Particle => {
    const baseVx = random(-0.2, 0.2);
    const baseVy = random(0.1, 0.5);

    return {
      x: random(0, w),
      y: initial ? random(0, h) : -50,
      size: random(config.minSize, config.maxSize),
      vx: baseVx,
      vy: baseVy,
      baseVx: baseVx,
      baseVy: baseVy,
      rotation: random(0, 360),
      rotationSpeed: random(-0.02, 0.02),
      opacity: random(0.1, 0.4),
    };
  };

  // 2. Main Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup & Resize
    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles.current = [];
      for (let i = 0; i < config.particleCount; i++) {
        particles.current.push(createParticle(canvas.width, canvas.height, true));
      }
    };
    
    // Initialize immediately
    init();
    window.addEventListener('resize', init);

    // Track Mouse
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach((p, index) => {
        // Physics
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < config.interactionRadius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (config.interactionRadius - distance) / config.interactionRadius;
          
          p.vx += forceDirectionX * force * config.pushStrength;
          p.vy += forceDirectionY * force * config.pushStrength;
        }

        p.vx = p.vx * config.friction + p.baseVx * (1 - config.friction);
        p.vy = p.vy * config.friction + p.baseVy * (1 - config.friction);

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Loop particles
        if (p.y > canvas.height + p.size) {
           particles.current[index] = createParticle(canvas.width, canvas.height);
        }
        if (p.x > canvas.width + p.size) p.x = -p.size;
        if (p.x < -p.size) p.x = canvas.width + p.size;

        // Draw
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.strokeStyle = colorRef.current; // Uses the ref which updates automatically
        ctx.lineWidth = 1.5;
        
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
        
        ctx.restore();
      });

      requestId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', handleMouseMove);
      if (requestId.current) cancelAnimationFrame(requestId.current);
    };
  }, []); 

  // REMOVED THE "if (!mounted) return null" CHECK
  // This ensures the canvas is always there when the useEffect above runs.

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
    />
  );
}