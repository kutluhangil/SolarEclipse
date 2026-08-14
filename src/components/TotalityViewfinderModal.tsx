/**
 * TotalityViewfinderModal — High-magnification optical solar viewfinder simulation
 * Displays authentic astronomical phenomena:
 *  - Baily's Beads (Lunar valleys light leakage)
 *  - Diamond Ring flash burst
 *  - Crimson Chromospheric Solar Prominences
 *  - Dynamic Corona Atmosphere
 *  - Venus, Mercury, Regulus planetary alignment during totality
 */

import React, { useEffect, useRef } from 'react';
import { Eye, Sparkles, X } from 'lucide-react';
import { ObservationStation, TelemetryReadout } from '../types';
import { t } from '../utils/i18n';

interface TotalityViewfinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStation: ObservationStation;
  telemetry: TelemetryReadout;
  currentTimestamp: number;
}

export const TotalityViewfinderModal: React.FC<TotalityViewfinderModalProps> = ({
  isOpen,
  onClose,
  selectedStation,
  telemetry,
  currentTimestamp
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = 130; // Solar disc radius

      ctx.clearRect(0, 0, w, h);

      // Deep space pitch black during totality, dark blue during partial
      const obs = telemetry.obscurationPercentage / 100;
      const isTotality = obs >= 0.999;
      const isNearTotality = obs >= 0.98;

      ctx.fillStyle = isTotality ? '#020307' : '#050a14';
      ctx.fillRect(0, 0, w, h);

      // 1. Stars & Planets visible during totality
      if (isNearTotality) {
        const starAlpha = Math.min(1, (obs - 0.98) * 50);

        // Venus (bright magnitude -4.0) — top left of Sun
        const venusX = cx - 220;
        const venusY = cy - 90;
        const vGrad = ctx.createRadialGradient(venusX, venusY, 1, venusX, venusY, 16);
        vGrad.addColorStop(0, `rgba(255, 255, 255, ${starAlpha})`);
        vGrad.addColorStop(0.4, `rgba(224, 242, 254, ${starAlpha * 0.8})`);
        vGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = vGrad;
        ctx.beginPath();
        ctx.arc(venusX, venusY, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(224, 242, 254, ${starAlpha * 0.9})`;
        ctx.font = 'bold 11px monospace';
        ctx.fillText('VENUS (mag -4.0)', venusX - 35, venusY + 22);

        // Mercury (mag 0.2) — bottom right of Sun
        const mercX = cx + 180;
        const mercY = cy + 110;
        const mGrad = ctx.createRadialGradient(mercX, mercY, 1, mercX, mercY, 10);
        mGrad.addColorStop(0, `rgba(253, 230, 138, ${starAlpha})`);
        mGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.arc(mercX, mercY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(253, 230, 138, ${starAlpha * 0.85})`;
        ctx.fillText('MERCURY (mag +0.2)', mercX - 45, mercY + 18);

        // Regulus (Alpha Leonis) — top right
        const regX = cx + 140;
        const regY = cy - 160;
        ctx.fillStyle = `rgba(186, 230, 253, ${starAlpha * 0.75})`;
        ctx.beginPath();
        ctx.arc(regX, regY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('Regulus', regX + 8, regY + 4);
      }

      // 2. Solar Corona (Streamers radiating into space during totality)
      if (isNearTotality) {
        const time = Date.now() * 0.001;
        const coronaAlpha = Math.min(1, (obs - 0.98) * 50);

        for (let ray = 0; ray < 36; ray++) {
          const angle = (ray / 36) * Math.PI * 2;
          const rayLen = radius * (1.6 + Math.sin(ray * 3 + time) * 0.2);

          const cGrad = ctx.createLinearGradient(
            cx + Math.cos(angle) * radius,
            cy + Math.sin(angle) * radius,
            cx + Math.cos(angle) * rayLen,
            cy + Math.sin(angle) * rayLen
          );
          cGrad.addColorStop(0, `rgba(255, 253, 245, ${0.85 * coronaAlpha})`);
          cGrad.addColorStop(0.4, `rgba(217, 249, 157, ${0.35 * coronaAlpha})`);
          cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.strokeStyle = cGrad;
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * (radius - 2), cy + Math.sin(angle) * (radius - 2));
          ctx.lineTo(cx + Math.cos(angle) * rayLen, cy + Math.sin(angle) * rayLen);
          ctx.stroke();
        }
      }

      // 3. Sun Disc (Golden photosphere)
      const sunGrad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
      sunGrad.addColorStop(0, '#ffffff');
      sunGrad.addColorStop(0.7, '#fef08a');
      sunGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // 4. Solar Prominences (Crimson chromospheric loops on limb during totality)
      if (isTotality) {
        const promAngles = [0.4, 1.8, 3.7, 5.2];
        promAngles.forEach((pAngle) => {
          const px = cx + Math.cos(pAngle) * radius;
          const py = cy + Math.sin(pAngle) * radius;
          const pGrad = ctx.createRadialGradient(px, py, 1, px, py, 18);
          pGrad.addColorStop(0, '#ef4444');
          pGrad.addColorStop(0.6, 'rgba(239, 68, 68, 0.6)');
          pGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(px, py, 18, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 5. Moon Disc (Black lunar obscuration sphere shifting across Sun)
      // Offset calculated from obscuration percentage
      const moonShiftX = (1 - obs) * radius * 2.1 - radius * 0.05;
      const moonShiftY = (1 - obs) * radius * 0.4;
      const moonX = cx - moonShiftX;
      const moonY = cy - moonShiftY;

      ctx.fillStyle = '#030712';
      ctx.beginPath();
      ctx.arc(moonX, moonY, radius * 1.015, 0, Math.PI * 2);
      ctx.fill();

      // 6. Baily's Beads & Diamond Ring Flash (at 99.5%-99.99% transition)
      if (obs >= 0.992 && obs < 0.9999) {
        // Flash position on limb
        const flashAngle = Math.PI * 0.25;
        const fx = cx + Math.cos(flashAngle) * radius;
        const fy = cy + Math.sin(flashAngle) * radius;

        const flashGrad = ctx.createRadialGradient(fx, fy, 2, fx, fy, 45);
        flashGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        flashGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.9)');
        flashGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.4)');
        flashGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(fx, fy, 45, 0, Math.PI * 2);
        ctx.fill();

        // Rays flare
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fx - 40, fy); ctx.lineTo(fx + 40, fy);
        ctx.moveTo(fx, fy - 40); ctx.lineTo(fx, fy + 40);
        ctx.stroke();
      }

      // 7. Reticle Crosshair & Scale Overlay
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, 20); ctx.lineTo(cx, h - 20);
      ctx.moveTo(20, cy); ctx.lineTo(w - 20, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Concentric angular scale circles
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.02, 0, Math.PI * 2);
      ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isOpen, telemetry.obscurationPercentage]);

  if (!isOpen) return null;

  const isTotality = telemetry.obscurationPercentage >= 99.9;
  const isNearTotality = telemetry.obscurationPercentage >= 98;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#04060a]/95 border border-cyan-500/40 rounded-xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.3)] flex flex-col gap-4 font-mono text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-sm tracking-wider uppercase text-cyan-300">
              {t('viewfinder')} — 50x OPTICAL SIMULATION
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* High Precision Viewfinder Canvas */}
        <div className="relative flex justify-center items-center bg-black rounded-lg border border-white/15 p-2 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={480}
            height={380}
            className="w-full h-[320px] object-contain rounded"
          />

          {/* Real-Time Optical Status Badge */}
          <div className="absolute top-4 left-4 bg-black/80 border border-cyan-500/40 px-3 py-1.5 rounded text-[11px] flex flex-col gap-0.5 backdrop-blur-md">
            <span className="text-cyan-300 font-bold">
              {selectedStation.name}
            </span>
            <span className="text-slate-400 text-[10px]">
              OBSCURATION: {telemetry.obscurationPercentage.toFixed(2)}%
            </span>
          </div>

          {/* Active Phenomena Alert */}
          <div className="absolute bottom-4 right-4 bg-black/85 border border-amber-500/40 px-3 py-1.5 rounded text-[11px] flex items-center gap-2 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-amber-300 font-bold uppercase text-[10px]">
              {isTotality
                ? "TOTALITY ACTIVE: CORONA & PROMINENCES"
                : isNearTotality
                ? "BAILY'S BEADS & DIAMOND RING"
                : "PARTIAL ECLIPSE IN PROGRESS"}
            </span>
          </div>
        </div>

        {/* Astronomical Observation Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white/5 p-3 rounded border border-white/10">
          <div>
            <span className="text-slate-400 block text-[10px]">SOLAR FILTER</span>
            <span className={isTotality ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {isTotality ? "FILTER OFF (SAFE)" : "ND100000 ON"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">CORONA STRUCTURE</span>
            <span className="text-slate-200 font-bold">
              {isNearTotality ? "Streamers Visible" : "Hidden by Glare"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">PLANETS VISIBLE</span>
            <span className="text-slate-200 font-bold">
              {isNearTotality ? "Venus, Mercury" : "None"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">CHROMOSPHERE</span>
            <span className="text-slate-200 font-bold">
              {isTotality ? "Prominences Active" : "Obscured"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
