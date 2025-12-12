'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  // We separate 'velocity' (current movement) from 'baseSpeed' (natural drift)
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
  const mouse = useRef({ x: -1000, y: -1000 }); // Start off-screen
  const requestId = useRef<number>(0);

  const config = {
    particleCount: 35,
    color: '#22c55e', // Green
    minSize: 10,
    maxSize: 30,
    interactionRadius: 150, // How close mouse needs to be to push cubes
    pushStrength: 2,        // How hard the mouse pushes
    friction: 0.95,         // How quickly they slow down after being pushed (0.9 = fast stop, 0.99 = icy slide)
  };

  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  const createParticle = (w: number, h: number, initial: boolean = false): Particle => {
    const baseVx = random(-0.2, 0.2); // Slight horizontal drift
    const baseVy = random(0.1, 0.5);  // Slow fall down

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Setup & Resize
    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles.current = [];
      for (let i = 0; i < config.particleCount; i++) {
        particles.current.push(createParticle(canvas.width, canvas.height, true));
      }
    };
    
    window.addEventListener('resize', init);
    init();

    // 2. Track Mouse
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 3. Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach((p, index) => {
        // --- PHYSICS CALCULATION ---
        
        // Calculate distance to mouse
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If mouse is close, push the particle away
        if (distance < config.interactionRadius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          // The closer the mouse, the stronger the push
          const force = (config.interactionRadius - distance) / config.interactionRadius;
          
          p.vx += forceDirectionX * force * config.pushStrength;
          p.vy += forceDirectionY * force * config.pushStrength;
        }

        // Apply friction to blend "burst speed" back to "base speed"
        // This makes the movement smooth instead of jerky
        p.vx = p.vx * config.friction + p.baseVx * (1 - config.friction);
        p.vy = p.vy * config.friction + p.baseVy * (1 - config.friction);

        // Update positions
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Reset if off-screen (Looping logic)
        // We give it a buffer (+ p.size) so it doesn't pop out visibly
        if (p.y > canvas.height + p.size) {
           particles.current[index] = createParticle(canvas.width, canvas.height);
        }
        // Horizontal wrap-around for smoother feel
        if (p.x > canvas.width + p.size) p.x = -p.size;
        if (p.x < -p.size) p.x = canvas.width + p.size;

        // --- DRAWING ---
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.strokeStyle = config.color;
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

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}