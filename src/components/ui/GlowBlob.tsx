import React, { useRef, useEffect } from 'react';

interface GlowBlobProps {
  size?: number;
  onClick?: () => void;
  className?: string;
}

export const GlowBlob: React.FC<GlowBlobProps> = ({ size = 56, onClick, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

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

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [size]);

  return (
    <button
      onClick={onClick}
      className={`${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
      />
    </button>
  );
};
