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
  
  // New: Add a "pulse" state for the heartbeat effect
  const pulseRef = useRef(0); 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- VALENTINE CONFIGURATION ---
    const config = {
      trailLength: 20,       // Slightly shorter for a cleaner heart look
      lineWidth: 2,          // Thicker lines for boldness
      color: '#e11d48',      // Rose-600 (The Love Color)
      glowBlur: 15,          // Soft romantic glow
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

    // Helper: Draw a Heart Shape
    const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.save();
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(x, y + topCurveHeight);
      // Top left curve
      ctx.bezierCurveTo(
        x, y, 
        x - size / 2, y, 
        x - size / 2, y + topCurveHeight
      );
      // Bottom left curve
      ctx.bezierCurveTo(
        x - size / 2, y + (size + topCurveHeight) / 2, 
        x, y + (size + topCurveHeight) / 2, 
        x, y + size
      );
      // Bottom right curve
      ctx.bezierCurveTo(
        x, y + (size + topCurveHeight) / 2, 
        x + size / 2, y + (size + topCurveHeight) / 2, 
        x + size / 2, y + topCurveHeight
      );
      // Top right curve
      ctx.bezierCurveTo(
        x + size / 2, y, 
        x, y, 
        x, y + topCurveHeight
      );
      ctx.closePath();
      ctx.fillStyle = config.color;
      ctx.shadowColor = config.color;
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();
    };

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

      // Pulse Logic (Heartbeat)
      pulseRef.current += 0.1;
      const pulse = Math.sin(pulseRef.current) * 0.5 + 1.5; // Oscillates between 1 and 2

      // Draw the Trail (The "Digital String of Fate")
      if (history.current.length > 1) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = config.lineWidth;
        ctx.strokeStyle = config.color;
        ctx.shadowColor = config.color;
        ctx.shadowBlur = config.glowBlur;

        // Start from oldest
        ctx.moveTo(history.current[0].x, history.current[0].y);

        for (let i = 0; i < history.current.length - 1; i++) {
          const current = history.current[i];
          const next = history.current[i + 1];
          
          // Draw smoother curves instead of sharp circuit angles for "fluid love"
          // Or keep orthogonal for "Digital Love" (I kept orthogonal but softened corners)
          ctx.lineTo(next.x, current.y); // Horizontal
          ctx.lineTo(next.x, next.y);    // Vertical
        }
        ctx.stroke();
      }

      // Draw the Heart Cursor Tip
      if (history.current.length > 0) {
        const lastPoint = history.current[history.current.length - 1];
        // The heart beats with the pulse variable
        drawHeart(ctx, lastPoint.x, lastPoint.y - 10, 12 * pulse);
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
      className="fixed inset-0 pointer-events-none z-50" // Increased Z-index to ensure it floats on top
    />
  );
}