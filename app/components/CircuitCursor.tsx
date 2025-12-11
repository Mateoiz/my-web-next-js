'use client';

import { useEffect, useRef } from 'react';

// Define the structure of a point in our trail history
interface Point {
  x: number;
  y: number;
  age: number; // 'age' helps us fade out older parts of the trail
}

export default function CircuitCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use refs for mutable data that doesn't trigger re-renders (better performance)
  const history = useRef<Point[]>([]);
  const mouse = useRef({ x: 0, y: 0 });
  const requestId = useRef<number>(0); // Initialize with 0

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration options for the trail
    const config = {
      trailLength: 40,      // How long the trail is
      lineWidth: 2,         // Thickness of the wiring
      color: '#22c55e',     // Tailwind green-500 - matches your logo
      glowBlur: 10,         // The neon glow effect
      fadeSpeed: 0.04,      // How quickly the trail disappears
    };

    // --- 1. Handle Resizing ---
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial size set

    // --- 2. Handle Mouse Movement ---
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- 3. The Main Animation Loop ---
    const animate = () => {
      // Add current mouse position to history
      history.current.unshift({ ...mouse.current, age: 0 });

      // Limit history length so memory doesn't explode
      if (history.current.length > config.trailLength) {
        history.current.pop();
      }

      // Clear the canvas for the next frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set styling for circuit lines
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = config.lineWidth;
      ctx.strokeStyle = config.color;
      ctx.shadowColor = config.color;
      ctx.shadowBlur = config.glowBlur;

      // Begin drawing the path
      ctx.beginPath();

      // We need at least two points to draw a line
      if (history.current.length > 1) {
        // Start at the oldest point
        const oldestPoint = history.current[history.current.length - 1];
        ctx.moveTo(oldestPoint.x, oldestPoint.y);

        // Loop backwards through history (from oldest to newest)
        for (let i = history.current.length - 2; i >= 0; i--) {
          const current = history.current[i];
          const prev = history.current[i + 1];

          // --- THE WIRING LOGIC ---
          // Instead of ctx.lineTo(current.x, current.y) which draws diagonally,
          // We draw in orthogonal steps (right angles) to look like bus lines.
          
          // Step 1: Move horizontally to the new X, keeping old Y
          ctx.lineTo(current.x, prev.y);
          // Step 2: Move vertically to the new Y
          ctx.lineTo(current.x, current.y);

          // Increase age for fading effect (optional logic placeholder)
          current.age += config.fadeSpeed;
        }
      }

      ctx.stroke();

      // Request the next animation frame
      requestId.current = requestAnimationFrame(animate);
    };

    // Start the animation loop
    animate();

    // --- Cleanup ---
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (requestId.current) {
        cancelAnimationFrame(requestId.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // Styles explanation:
      // fixed inset-0: Fills the entire screen and stays in place when scrolling
      // pointer-events-none: Crucial! Lets clicks pass through to buttons/links below
      // z-0: Sits behind your main content
      className="fixed inset-0 pointer-events-none z-1"
    />
  );
}