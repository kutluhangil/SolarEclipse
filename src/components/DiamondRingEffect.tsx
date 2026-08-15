/**
 * Diamond Ring & Baily's Beads Effect
 * Full-screen canvas overlay triggered ±8s around C2/C3 totality contacts.
 * Renders photorealistic Baily's beads and diamond ring flare using Canvas 2D.
 */

import { useEffect, useRef } from 'react';

interface DiamondRingEffectProps {
  /** Is the effect currently active? */
  isActive: boolean;
  /** 'c2' = ingress contact, 'c3' = egress contact */
  contact: 'c2' | 'c3';
  /** 0..1 — how far into the effect window (0 = start, 1 = peak/end) */
  progress: number;
}

export function DiamondRingEffect({ isActive, contact, progress }: DiamondRingEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (!canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;

      // During C2: beads appear first (progress 0→0.5), then diamond ring (0.5→1.0)
      // During C3: diamond ring first (progress 0→0.5), then beads appear (0.5→1.0)
      const t = frame * 0.016; // time in seconds
      frame++;

      // Master fade: fade-in and fade-out
      let masterAlpha: number;
      if (progress < 0.15) {
        masterAlpha = progress / 0.15;
      } else if (progress > 0.85) {
        masterAlpha = (1.0 - progress) / 0.15;
      } else {
        masterAlpha = 1.0;
      }

      // Phase: for C2, diamond ring builds toward totality start
      // For C3, diamond ring appears as totality ends
      const ringPhase = contact === 'c2' ? progress : 1.0 - progress;

      // Radii in pixels
      const moonR = Math.min(W, H) * 0.14;
      const sunR  = moonR * 1.004; // Sun slightly larger, shows ring

      // ── Moon disc (black) ─────────────────────────────────────────────────
      ctx.save();
      ctx.globalAlpha = masterAlpha;
      ctx.beginPath();
      ctx.arc(cx, cy, moonR, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.restore();

      // ── Diamond Ring chromosphere arc ─────────────────────────────────────
      // The ring is a thin arc of the photosphere showing around the Moon limb
      // Thickness depends on ringPhase: thin ring → growing as moon moves
      const ringThick = sunR - moonR + 2;
      ctx.save();
      ctx.globalAlpha = masterAlpha * Math.max(0, Math.sin(ringPhase * Math.PI));
      const ringGrad = ctx.createRadialGradient(cx, cy, moonR - 1, cx, cy, moonR + ringThick + 4);
      ringGrad.addColorStop(0,   'rgba(255, 255, 200, 0)');
      ringGrad.addColorStop(0.3, 'rgba(255, 240, 150, 0.95)');
      ringGrad.addColorStop(0.7, 'rgba(255, 180, 60, 0.80)');
      ringGrad.addColorStop(1,   'rgba(255, 120, 0, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, moonR + ringThick + 4, 0, Math.PI * 2);
      ctx.arc(cx, cy, moonR - 1, 0, Math.PI * 2, true);
      ctx.fillStyle = ringGrad;
      ctx.fill('evenodd');
      ctx.restore();

      // ── Baily's Beads ─────────────────────────────────────────────────────
      // 14 bright spots on the ring, shimmer with noise
      const beadCount = 14;
      // Beads are strongest when ring is thin (ringPhase near 0 or 1)
      const beadStrength = 1.0 - Math.sin(ringPhase * Math.PI) * 0.85;
      ctx.save();
      ctx.globalAlpha = masterAlpha * beadStrength;
      for (let i = 0; i < beadCount; i++) {
        const angle = (i / beadCount) * Math.PI * 2 + t * 0.05;
        // Lunar limb roughness: some beads brighter than others
        const brightnessSeed = Math.sin(i * 2.39996 + t * 0.12) * 0.5 + 0.5;
        const beadR = (moonR + ringThick * 0.5) + Math.sin(i * 5.1 + t) * ringThick * 0.35;
        const bx = cx + Math.cos(angle) * beadR;
        const by = cy + Math.sin(angle) * beadR;
        const bSize = (3 + brightnessSeed * 7) * (moonR / 200);
        if (brightnessSeed < 0.3) continue; // sparse beads (some valleys are dark)
        const bg = ctx.createRadialGradient(bx, by, 0, bx, by, bSize * 2.5);
        const intensity = brightnessSeed;
        bg.addColorStop(0,   `rgba(255, 255, ${Math.floor(180 + intensity * 75)}, ${intensity})`);
        bg.addColorStop(0.4, `rgba(255, 220, 100, ${intensity * 0.7})`);
        bg.addColorStop(1,   'rgba(255, 150, 0, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, bSize * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // ── Diamond — single bright bead grows into the flare ─────────────────
      const diamondAngle = contact === 'c2' ? Math.PI * 1.65 : Math.PI * 0.35;
      const diamondGrowth = Math.max(0, Math.sin(ringPhase * Math.PI * 0.85)) * masterAlpha;
      if (diamondGrowth > 0.02) {
        const dx = cx + Math.cos(diamondAngle) * moonR;
        const dy = cy + Math.sin(diamondAngle) * moonR;
        const dRadius = (moonR * 0.08 + moonR * 0.32 * diamondGrowth);

        // Core bright white gem
        ctx.save();
        ctx.globalAlpha = masterAlpha * diamondGrowth;
        const dg = ctx.createRadialGradient(dx, dy, 0, dx, dy, dRadius * 3);
        dg.addColorStop(0,   'rgba(255, 255, 255, 1.0)');
        dg.addColorStop(0.15,'rgba(255, 255, 220, 0.95)');
        dg.addColorStop(0.4, 'rgba(255, 220, 100, 0.70)');
        dg.addColorStop(0.75,'rgba(255, 140, 30, 0.30)');
        dg.addColorStop(1,   'rgba(255, 80, 0, 0)');
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.arc(dx, dy, dRadius * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Diffraction spikes (4-arm cross + 2 diagonal)
        const spikeLen = dRadius * (8 + diamondGrowth * 18);
        const spikeAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 0.25, Math.PI * 1.25];
        ctx.save();
        ctx.globalAlpha = masterAlpha * diamondGrowth * 0.7;
        spikeAngles.forEach((a, i) => {
          const grad = ctx.createLinearGradient(dx, dy,
            dx + Math.cos(a) * spikeLen,
            dy + Math.sin(a) * spikeLen
          );
          const isPrimary = i < 4;
          grad.addColorStop(0,   `rgba(255, 255, 240, ${isPrimary ? 0.9 : 0.5})`);
          grad.addColorStop(0.3, `rgba(255, 220, 120, ${isPrimary ? 0.5 : 0.3})`);
          grad.addColorStop(1,   'rgba(255, 160, 0, 0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = isPrimary ? 2.5 * (moonR / 200) : 1.5 * (moonR / 200);
          ctx.beginPath();
          ctx.moveTo(dx, dy);
          ctx.lineTo(dx + Math.cos(a) * spikeLen, dy + Math.sin(a) * spikeLen);
          ctx.stroke();
        });
        ctx.restore();

        // Lens flare ring
        ctx.save();
        ctx.globalAlpha = masterAlpha * diamondGrowth * 0.35;
        const flareR = moonR * (0.5 + diamondGrowth * 0.8);
        const fg = ctx.createRadialGradient(cx, cy, flareR * 0.92, cx, cy, flareR);
        fg.addColorStop(0,   'rgba(255, 240, 180, 0)');
        fg.addColorStop(0.5, 'rgba(255, 230, 130, 0.18)');
        fg.addColorStop(1,   'rgba(255, 200, 80, 0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(cx, cy, flareR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Outer glow halo (always present) ─────────────────────────────────
      ctx.save();
      ctx.globalAlpha = masterAlpha * 0.25;
      const haloG = ctx.createRadialGradient(cx, cy, moonR * 1.05, cx, cy, moonR * 2.8);
      haloG.addColorStop(0,   'rgba(255, 220, 100, 0.35)');
      haloG.addColorStop(0.5, 'rgba(255, 160, 40, 0.12)');
      haloG.addColorStop(1,   'rgba(255, 100, 0, 0)');
      ctx.fillStyle = haloG;
      ctx.beginPath();
      ctx.arc(cx, cy, moonR * 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (isActive) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isActive, contact, progress]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-40"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
