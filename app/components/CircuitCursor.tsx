"use client";

import { useEffect, useRef } from "react";

// Define the structure of a point in our trail history
interface Point {
  x: number;
  y: number;
}

export default function CircuitCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const history = useRef<Point[]>([]);
  
  // 'target' is where the physical mouse/finger is
  const target = useRef({ x: 0, y: 0 });
  // 'currentPos' is the smoothly gliding position that catches up to 'target'
  const currentPos = useRef({ x: 0, y: 0 });
  
  const isTouching = useRef(false);
  const inputType = useRef<"mouse" | "touch">("mouse");
  
  // Used to control the speed of the trail disappearing
  const frameTick = useRef(0); 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use { alpha: true } but avoid other heavy composite operations for mobile performance
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // --- CIRCUIT CONFIGURATION ---
    const config = {
      trailLength: 20,       // Shorter array = better performance
      lineWidth: 2,          // Trace thickness
      color: "#10b981",      // Cyberpunk / Emerald Green
      glowBlur: 4,           // Low blur on the trail to prevent mobile GPU lag
      distanceThreshold: 20, // Distance (px) required before creating a new 90-degree corner
      springFactor: 0.35,    // How fast the cursor catches up (0.1 = slow, 0.9 = fast)
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // --- EVENT LISTENERS ---
    const handleMouseMove = (e: MouseEvent) => {
      if (inputType.current === "touch") return; // Prevent ghost mouse events on mobile
      inputType.current = "mouse";
      target.current = { x: e.clientX, y: e.clientY };
    };

    const handleTouchStart = (e: TouchEvent) => {
      inputType.current = "touch";
      isTouching.current = true;
      const touch = e.touches[0];
      target.current = { x: touch.clientX, y: touch.clientY };
      // Instantly snap the current position to the finger on first touch
      currentPos.current = { x: touch.clientX, y: touch.clientY };
      history.current = [{ ...target.current }]; 
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouching.current) return;
      const touch = e.touches[0];
      target.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = () => {
      isTouching.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    // Initial position setup for desktop
    currentPos.current = { ...target.current };

    // --- Animation Loop ---
    let animationFrameId: number;

    const animate = () => {
      frameTick.current++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. LERP (Linear Interpolation) for buttery smooth gliding movement
      currentPos.current.x += (target.current.x - currentPos.current.x) * config.springFactor;
      currentPos.current.y += (target.current.y - currentPos.current.y) * config.springFactor;

      // Calculate how far the cursor is from the actual mouse/finger target
      const distanceToTarget = Math.hypot(
        target.current.x - currentPos.current.x,
        target.current.y - currentPos.current.y
      );

      // 2. Manage History (Circuit Corners)
      if (inputType.current === "mouse" || isTouching.current) {
        const lastPoint = history.current[history.current.length - 1];
        
        if (!lastPoint) {
          history.current.push({ ...currentPos.current });
        } else {
          // Only drop a new corner if we've moved a certain distance.
          const dist = Math.hypot(currentPos.current.x - lastPoint.x, currentPos.current.y - lastPoint.y);
          if (dist > config.distanceThreshold) {
            history.current.push({ ...currentPos.current });
            if (history.current.length > config.trailLength) {
              history.current.shift();
            }
          }
        }

        // --- NEW: IDLE CONSUMPTION LOGIC ---
        // If the distance is < 0.5, the cursor has effectively stopped moving.
        if (distanceToTarget < 0.5 && history.current.length > 0) {
          // Retract/consume the tail by shifting the array every other frame for a smooth speed
          if (frameTick.current % 2 === 0) {
            history.current.shift();
          }
        }

      } else {
        // If user lifted finger on mobile, quickly drain the line out
        if (history.current.length > 0) {
          history.current.shift();
          if (history.current.length > 0) history.current.shift(); // drain twice as fast on mobile touch end
        }
      }

      // 3. Draw the Circuit Trail
      if (history.current.length > 0) {
        ctx.beginPath();
        ctx.lineCap = "square";
        ctx.lineJoin = "miter";
        ctx.lineWidth = config.lineWidth;
        ctx.strokeStyle = config.color;
        ctx.shadowColor = config.color;
        ctx.shadowBlur = config.glowBlur; // Optimized blur

        ctx.moveTo(history.current[0].x, history.current[0].y);

        // Draw saved corners
        for (let i = 0; i < history.current.length - 1; i++) {
          const curr = history.current[i];
          const nxt = history.current[i + 1];
          
          ctx.lineTo(nxt.x, curr.y); // Horizontal
          ctx.lineTo(nxt.x, nxt.y);  // Vertical
        }
        
        // Dynamically stretch the line from the last saved corner to the currently moving head
        const last = history.current[history.current.length - 1];
        ctx.lineTo(currentPos.current.x, last.y);
        ctx.lineTo(currentPos.current.x, currentPos.current.y);

        ctx.stroke();
      }

      // 4. Draw the Node (Glowing Head)
      // Hide head on mobile if not touching, keep visible on desktop
      if (inputType.current === "mouse" || isTouching.current || history.current.length > 0) {
        ctx.beginPath();
        const nodeSize = 6;
        ctx.rect(
          currentPos.current.x - nodeSize / 2, 
          currentPos.current.y - nodeSize / 2, 
          nodeSize, 
          nodeSize
        );
        ctx.fillStyle = config.color;
        ctx.shadowColor = config.color;
        ctx.shadowBlur = 15; // Give the head a strong glow
        ctx.fill();
        ctx.closePath();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
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