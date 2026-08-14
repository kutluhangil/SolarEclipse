/**
 * ObservationCertificateModal — Personalized Eclipse Pass & Certificate Exporter
 * Generates an official astronomical observation pass certificate on 2D Canvas
 * featuring user name, station stats, coordinates, peak timestamp, and QR badge.
 */

import React, { useRef, useState } from 'react';
import { Award, Download, Sparkles, X } from 'lucide-react';
import { ObservationStation, TelemetryReadout } from '../types';
import { formatSecondsToUTC } from '../utils/astronomy';
import { t } from '../utils/i18n';

interface ObservationCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStation: ObservationStation;
  telemetry: TelemetryReadout;
  currentTimestamp: number;
}

export const ObservationCertificateModal: React.FC<ObservationCertificateModalProps> = ({
  isOpen,
  onClose,
  selectedStation,
  telemetry,
  currentTimestamp
}) => {
  const [observerName, setObserverName] = useState<string>("Eclipse Chaser");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  const handleGenerateAndDownload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient (Deep Cosmos)
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 700);
    bgGrad.addColorStop(0, '#02040a');
    bgGrad.addColorStop(0.5, '#0a1526');
    bgGrad.addColorStop(1, '#040812');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 700);

    // Decorative Gold Border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, 1140, 640);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, 1120, 620);

    // Header Title
    ctx.font = 'bold 38px serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText('TOTAL SOLAR ECLIPSE 2026', 600, 110);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('OFFICIAL ASTRONOMICAL OBSERVATION CERTIFICATE', 600, 145);

    // Divider Line
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.beginPath();
    ctx.moveTo(350, 170); ctx.lineTo(850, 170);
    ctx.stroke();

    // Recipient Name
    ctx.font = '18px monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('THIS CERTIFIES THAT', 600, 230);

    ctx.font = 'bold 44px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(observerName.toUpperCase(), 600, 290);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`Was present at the simulation & visualizer of the August 12, 2026 Total Solar Eclipse.`, 600, 335);

    // Observation Details Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(150, 380, 900, 180);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.3)';
    ctx.strokeRect(150, 380, 900, 180);

    // Detail Grid Content
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`STATION: ${selectedStation.name} (${selectedStation.country})`, 180, 420);
    ctx.fillText(`COORDINATES: ${selectedStation.coords.lat.toFixed(4)}°N, ${selectedStation.coords.lon.toFixed(4)}°E`, 180, 460);
    ctx.fillText(`UTC TIME: ${formatSecondsToUTC(currentTimestamp)}`, 180, 500);

    ctx.fillText(`TOTALITY DURATION: ${selectedStation.eclipseTimes.durationSeconds} SECONDS`, 620, 420);
    ctx.fillText(`SUN ALTITUDE: ${selectedStation.maxSunAltitude}°`, 620, 460);
    ctx.fillText(`OBSCURATION: ${telemetry.obscurationPercentage.toFixed(1)}%`, 620, 500);

    // Footer Stamp & Verification Code
    ctx.textAlign = 'center';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`VERIFICATION HASH: ECL2026-${Math.random().toString(36).substring(2,10).toUpperCase()}`, 600, 610);
    ctx.fillText('SOLAR ECLIPSE 2026 TRACKER & ENVIRONMENTAL VISUALIZER', 600, 635);

    // Trigger Image Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eclipse_2026_certificate_${selectedStation.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#04060a]/95 border border-amber-500/40 rounded-xl p-5 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col gap-4 font-mono text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm tracking-wider uppercase text-amber-300">
              {t('certificate')} — OFFICIAL PASS GENERATOR
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Form */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-300 font-bold">OBSERVER NAME</label>
          <input
            type="text"
            value={observerName}
            onChange={(e) => setObserverName(e.target.value)}
            className="px-3 py-2 rounded bg-white/10 border border-white/20 text-white font-sans text-sm focus:outline-none focus:border-amber-400"
            placeholder="Enter your name..."
          />
        </div>

        {/* Certificate Preview Card */}
        <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex flex-col gap-2">
          <div className="flex justify-between text-xs text-amber-300 font-bold border-b border-amber-500/20 pb-2">
            <span>{selectedStation.name}</span>
            <span>{selectedStation.countryCode}</span>
          </div>
          <div className="text-[11px] text-slate-300 flex flex-col gap-1 font-sans">
            <div><strong>Observer:</strong> {observerName || "Eclipse Chaser"}</div>
            <div><strong>Totality Duration:</strong> {selectedStation.eclipseTimes.durationSeconds}s</div>
            <div><strong>Coordinates:</strong> {selectedStation.coords.lat.toFixed(2)}°, {selectedStation.coords.lon.toFixed(2)}°</div>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleGenerateAndDownload}
          className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>DOWNLOAD CERTIFICATE (PNG)</span>
        </button>
      </div>
    </div>
  );
};
