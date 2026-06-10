import React, { useRef, useEffect, useState, useCallback } from 'react';

interface GlowBlobProps {
  size?: number;
  onClick?: () => void;
  className?: string;
  visible?: boolean;
}

export const GlowBlob: React.FC<GlowBlobProps> = ({ size = 56, onClick, className = '', visible = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  // Drag state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const posRef = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const hasMoved = useRef(false);

  // Initialize position to bottom center
  useEffect(() => {
    if (posRef.current === null) {
      const x = window.innerWidth / 2 - size / 2;
      const y = window.innerHeight - size - 64;
      posRef.current = { x, y };
      setPos({ x, y });
    }
  }, [size]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    hasMoved.current = false;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      px: posRef.current?.x ?? 0,
      py: posRef.current?.y ?? 0,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true;

    const newX = Math.max(0, Math.min(window.innerWidth - size, dragStart.current.px + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - size, dragStart.current.py + dy));
    setPos({ x: newX, y: newY });
    posRef.current = { x: newX, y: newY };
  }, [size]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    dragStart.current = null;
    if (!hasMoved.current && onClick) {
      onClick();
    }
  }, [onClick]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const drawBlobPath = (points: { x: number; y: number }[]) => {
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const n = points[(i + 1) % points.length];
        const mx = (p.x + n.x) / 2;
        const my = (p.y + n.y) / 2;
        if (i === 0) ctx.moveTo(mx, my);
        ctx.quadraticCurveTo(p.x, p.y, mx, my);
      }
      ctx.closePath();
    };

    const animate = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const cx = size / 2;
      const cy = size / 2;
      const scale = 1 + Math.sin(t * 2) * 0.03;
      const r = (size * 0.32) * scale;

      ctx.clearRect(0, 0, size, size);

      const points: { x: number; y: number }[] = [];
      const count = 40;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const noise =
          Math.sin(angle * 3 + t * 0.8) * 2 +
          Math.sin(angle * 5 - t * 1.2) * 1.5 +
          Math.sin(angle * 8 + t * 0.5) * 0.8;
        const radius = r + noise;
        points.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
      }

      // Outer glow
      ctx.save();
      drawBlobPath(points);
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(130, 255, 240, 0.5)';
      ctx.fillStyle = 'rgba(80, 255, 240, 0.08)';
      ctx.filter = 'blur(4px)';
      ctx.fill();
      ctx.restore();

      // Second glow layer
      ctx.save();
      drawBlobPath(points);
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(140, 255, 250, 0.6)';
      ctx.fillStyle = 'rgba(140, 255, 250, 0.15)';
      ctx.filter = 'blur(2px)';
      ctx.fill();
      ctx.restore();

      // Main body
      ctx.save();
      const gradient = ctx.createRadialGradient(
        cx - r * 0.25, cy - r * 0.3, 0,
        cx, cy, r
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.3, 'rgba(220, 255, 240, 0.9)');
      gradient.addColorStop(0.7, 'rgba(150, 255, 220, 0.7)');
      gradient.addColorStop(1, 'rgba(100, 255, 240, 0.1)');
      drawBlobPath(points);
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
      ctx.restore();

      // Highlight
      ctx.save();
      const shine = ctx.createRadialGradient(
        cx - r * 0.35, cy - r * 0.45, 0,
        cx - r * 0.35, cy - r * 0.45, r * 0.6
      );
      shine.addColorStop(0, 'rgba(255,255,255,0.9)');
      shine.addColorStop(0.5, 'rgba(255,255,255,0.5)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cx - r * 0.22, cy - r * 0.22, r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = shine;
      ctx.fill();
      ctx.restore();

      // Eyes with blink
      const blink = Math.abs(Math.sin(t * 2.2)) > 0.97 ? 0.15 : 1;
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.18, cy - r * 0.05, r * 0.06, r * 0.1 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.18, cy - r * 0.05, r * 0.06, r * 0.1 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animRef.current = requestAnimationFrame(animate);
    };

    if (visible) {
      animRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [size, visible]);

  const currentPos = pos ?? posRef.current ?? { x: 0, y: 0 };

  return (
    <div
      onPointerDown={visible ? handlePointerDown : undefined}
      onPointerMove={visible ? handlePointerMove : undefined}
      onPointerUp={visible ? handlePointerUp : undefined}
      className={`touch-none select-none ${className}`}
      style={{
        position: 'fixed',
        left: currentPos.x,
        top: currentPos.y,
        width: size,
        height: size,
        cursor: dragging.current ? 'grabbing' : 'grab',
        zIndex: 30,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.3s',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size, pointerEvents: 'none' }}
      />
    </div>
  );
};
