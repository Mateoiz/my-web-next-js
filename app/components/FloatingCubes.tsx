'use client';

import { useEffect, useRef } from 'react';

// Define properties for a single cube particle
interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

// Correct way:
export default function FloatingCubes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const requestId = useRef<number>(0);

  // Configuration for subtlety
  const config = {
    particleCount: 30, // Keep low so it's not distracting
    color: '#22c55e',  // Tailwind green-500 (matches your theme)
    baseSpeedY: 0.3,   // Very slow vertical movement
    baseSpeedX: 0.1,   // Slight horizontal drift
    minSize: 10,
    maxSize: 30,
  };

  // Helper to get random number between range
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // Initialize a single particle with random starting values
  const createParticle = (canvasWidth: number, canvasHeight: number, initial: boolean = false): Particle => {
    return {
      // If initial load, place anywhere. If resetting, place just above top screen.
      x: random(0, canvasWidth),
      y: initial ? random(0, canvasHeight) : -50, 
      size: random(config.minSize, config.maxSize),
      // Slight random variations in speed for natural look
      speedX: random(-config.baseSpeedX, config.baseSpeedX),
      speedY: random(config.baseSpeedY / 2, config.baseSpeedY * 1.5),
      rotation: random(0, 360),
      // Very slow rotation
      rotationSpeed: random(-0.01, 0.01),
      // Low opacity for subtlety (between 0.1 and 0.4)
      opacity: random(0.1, 0.4)
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Init Canvas Size & Particles
    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles.current = [];
      for (let i = 0; i < config.particleCount; i++) {
        particles.current.push(createParticle(canvas.width, canvas.height, true));
      }
    };
    
    window.addEventListener('resize', init);
    init(); // Run once on mount

    // 2. Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.current.forEach((p, index) => {
        // Update position and rotation
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        // Reset particle if it goes off bottom or side screen
        if (p.y > canvas.height + p.size || p.x < -p.size || p.x > canvas.width + p.size) {
           particles.current[index] = createParticle(canvas.width, canvas.height);
        }

        // Draw the cube (as an outlined square)
        ctx.save(); // Save current context state
        ctx.globalAlpha = p.opacity; // Set subtlety level
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 1.5; // Thin wiring look

        // Move origin to particle center for rotation
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // Draw square centered at (0,0) relative to translation
        ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);

        ctx.restore(); // Restore context for next particle
      });

      requestId.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', init);
      if (requestId.current) cancelAnimationFrame(requestId.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // Same positioning as the cursor layer: fixed, back layer, ignoring clicks
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}