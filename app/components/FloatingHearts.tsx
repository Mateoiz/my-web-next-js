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
  isBroken: boolean; // Added this property
}

export default function FloatingHearts() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -1000, y: -1000 });
  const requestId = useRef<number>(0);

  // Theme Logic
  const { resolvedTheme } = useTheme();
  const colorRef = useRef('#e11d48'); // Default to Rose-600

  const config = {
    particleCount: 35,
    minSize: 15, // Slightly larger than cubes for better heart visibility
    maxSize: 40,
    interactionRadius: 150,
    pushStrength: 2,
    friction: 0.95,
  };

  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // 1. Update Color Ref (Optional: You can adjust shades based on theme)
  useEffect(() => {
    if (resolvedTheme === 'light') {
      colorRef.current = '#e11d48'; // Rose-600 (Darker in light mode)
    } else {
      colorRef.current = '#fb7185'; // Rose-400 (Lighter in dark mode)
    }
  }, [resolvedTheme]);

  // 2. Heart Drawing Helper
  const drawHeartPath = (ctx: CanvasRenderingContext2D, size: number, isBroken: boolean) => {
    const x = 0;
    const y = -size / 2; // Offset to center the heart vertically
    const w = size;
    const h = size;

    ctx.beginPath();
    ctx.moveTo(x, y + h / 4);
    ctx.bezierCurveTo(x, y, x - w / 2, y, x - w / 2, y + h / 4);
    ctx.bezierCurveTo(x - w / 2, y + h / 2, x, y + h * 0.8, x, y + h);
    ctx.bezierCurveTo(x, y + h * 0.8, x + w / 2, y + h / 2, x + w / 2, y + h / 4);
    ctx.bezierCurveTo(x + w / 2, y, x, y, x, y + h / 4);
    ctx.stroke();

    // Draw the "crack" if broken
    if (isBroken) {
        ctx.beginPath();
        ctx.moveTo(x, y + h * 0.2);
        ctx.lineTo(x - w * 0.1, y + h * 0.4);
        ctx.lineTo(x + w * 0.1, y + h * 0.6);
        ctx.lineTo(x, y + h * 0.8);
        ctx.stroke();
    }
  };

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
      isBroken: Math.random() > 0.9, // 10% chance
    };
  };

  // 3. Main Animation Loop
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
        // Physics Calculation
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

        // Loop particles (Reset if off screen)
        if (p.y > canvas.height + p.size) {
           particles.current[index] = createParticle(canvas.width, canvas.height);
        }
        if (p.x > canvas.width + p.size) p.x = -p.size;
        if (p.x < -p.size) p.x = canvas.width + p.size;

        // Draw Logic
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.strokeStyle = colorRef.current;
        ctx.lineWidth = 1.5;
        
        // Move to particle position and rotate
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        // Draw the Heart instead of Rect
        drawHeartPath(ctx, p.size, p.isBroken);
        
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

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* 1. Background Gradient (From original FloatingHearts) */}
        <div className="absolute inset-0 bg-gradient-to-t from-rose-900/20 via-transparent to-transparent opacity-50" />

        {/* 2. Binary Tech Grid (From original FloatingHearts) */}
        <div className="absolute inset-0 opacity-10" 
            style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(225, 29, 72, .3) 25%, rgba(225, 29, 72, .3) 26%, transparent 27%, transparent 74%, rgba(225, 29, 72, .3) 75%, rgba(225, 29, 72, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(225, 29, 72, .3) 25%, rgba(225, 29, 72, .3) 26%, transparent 27%, transparent 74%, rgba(225, 29, 72, .3) 75%, rgba(225, 29, 72, .3) 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}
        ></div>

        {/* 3. The Canvas Layer (Physics Hearts) */}
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
        />
    </div>
  );
}