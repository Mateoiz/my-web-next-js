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
  const history = useRef<Point[]>([]);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- CIRCUIT CONFIGURATION ---
    const config = {
      trailLength: 30,       // Longer trail for circuit trace
      lineWidth: 2,          // Trace thickness
      color: '#10b981',      // Cyberpunk / Emerald Green
      glowBlur: 10,          // Neon glow
      fadeSpeed: 0.10,       
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- Animation Loop ---
    let animationFrameId: number;

    const animate = () => {
      // Add current mouse position
      history.current.push({ ...mouse.current, age: 0 });

      // Limit history length
      if (history.current.length > config.trailLength) {
        history.current.shift();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the Circuit Trail
      if (history.current.length > 1) {
        ctx.beginPath();
        // Sharp, robotic corners for a circuit feel
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.lineWidth = config.lineWidth;
        ctx.strokeStyle = config.color;
        ctx.shadowColor = config.color;
        ctx.shadowBlur = config.glowBlur;

        // Start from oldest
        ctx.moveTo(history.current[0].x, history.current[0].y);

        for (let i = 0; i < history.current.length - 1; i++) {
          const current = history.current[i];
          const next = history.current[i + 1];
          
          // Orthogonal circuit lines (90-degree angles)
          ctx.lineTo(next.x, current.y); // Horizontal
          ctx.lineTo(next.x, next.y);    // Vertical
        }
        ctx.stroke();
      }

      // Draw the Circuit Node (Cursor Tip)
      if (history.current.length > 0) {
        const lastPoint = history.current[history.current.length - 1];
        
        ctx.beginPath();
        // Draw a small square to act as a data node/solder pad
        const nodeSize = 6;
        ctx.rect(lastPoint.x - nodeSize / 2, lastPoint.y - nodeSize / 2, nodeSize, nodeSize);
        ctx.fillStyle = config.color;
        ctx.shadowColor = config.color;
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.closePath();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  );
}