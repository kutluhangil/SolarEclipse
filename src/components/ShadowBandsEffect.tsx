/**
 * Shadow Bands Effect
 * Full-screen canvas overlay: subtle dark/light undulating bands visible on
 * the ground ±40 seconds around C2 and C3 totality contacts.
 * Caused by atmospheric turbulence diffracting the thin solar crescent.
 */

import { useEffect, useRef } from 'react';

interface ShadowBandsEffectProps {
  isActive: boolean;
  /** 0..1 — 0 = start of window, 0.5 = peak (nearest to contact), 1 = fade out */
  progress: number;
  /** Sun azimuth in degrees — bands run perpendicular to this direction */
  sunAzimuth?: number;
}

export function ShadowBandsEffect({ isActive, progress, sunAzimuth = 180 }: ShadowBandsEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let startTime: number | null = null;

    const draw = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = (now - startTime) / 1000; // seconds

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Master alpha: ramps up to peak at progress=0.5, back down
      const peakFactor = Math.sin(progress * Math.PI);
      const masterAlpha = peakFactor * 0.10; // very subtle max 10% opacity

      if (masterAlpha < 0.001) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      // Band direction perpendicular to sun azimuth
      const perpAngle = ((sunAzimuth + 90) * Math.PI) / 180;
      const bx = Math.cos(perpAngle);
      const by = Math.sin(perpAngle);

      // Draw bands using sinusoidal pattern along the projection axis
      const diagonal = Math.sqrt(W * W + H * H);
      const bandWidth = 12 + Math.sin(elapsed * 0.3) * 3; // slight oscillation in width
      const speed1 = 95 + Math.sin(elapsed * 0.7) * 25;  // px/s — fast-moving bands
      const speed2 = 75 + Math.cos(elapsed * 0.5) * 20;

      const imageData = ctx.createImageData(W, H);
      const data = imageData.data;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          // Project pixel onto band axis
          const proj1 = x * bx + y * by;
          const proj2 = x * bx * 0.95 + y * by * 1.05; // slight skew for 2nd wave

          // Two interfering sinusoidal waves
          const wave1 = Math.sin((proj1 - elapsed * speed1) / bandWidth * Math.PI * 2);
          const wave2 = Math.sin((proj2 - elapsed * speed2) / (bandWidth * 0.7) * Math.PI * 2 + 1.2);
          const combined = (wave1 * 0.6 + wave2 * 0.4);

          // Only show dark bands (suppress the bright side)
          const darkness = Math.max(0, -combined);
          const alpha = darkness * darkness * masterAlpha * 255;

          const idx = (y * W + x) * 4;
          data[idx]     = 0;   // R
          data[idx + 1] = 0;   // G
          data[idx + 2] = 0;   // B
          data[idx + 3] = alpha; // A
        }
      }

      ctx.putImageData(imageData, 0, 0);

      if (isActive) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isActive, progress, sunAzimuth]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-35"
    />
  );
}
