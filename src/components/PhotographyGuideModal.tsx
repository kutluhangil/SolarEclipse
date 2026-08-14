/**
 * PhotographyGuideModal — Solar Photography & Filter Safety Guide
 * Provides real-time camera setting recommendations (ISO, Shutter Speed, Aperture, Filter Safety)
 * dynamically synchronized to the active eclipse phase.
 */

import React from 'react';
import { AlertTriangle, Camera, CheckCircle2, ShieldAlert, Sliders, X } from 'lucide-react';
import { TelemetryReadout } from '../types';
import { t } from '../utils/i18n';

interface PhotographyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryReadout;
}

export const PhotographyGuideModal: React.FC<PhotographyGuideModalProps> = ({
  isOpen,
  onClose,
  telemetry
}) => {
  if (!isOpen) return null;

  const obs = telemetry.obscurationPercentage;
  const isTotality = obs >= 99.9;
  const isDiamondRing = obs >= 99.2 && obs < 99.9;

  let iso = "100 - 200";
  let shutter = "1/4000s - 1/1000s";
  let aperture = "f/8 - f/11";
  let filterStatus = "ND100000 / ISO 12312-2 SOLAR FILTER REQUIRED";
  let filterSafe = false;

  if (isTotality) {
    iso = "400 - 800";
    shutter = "1/1000s (Chromosphere) to 2s (Outer Corona)";
    aperture = "f/5.6 - f/8";
    filterStatus = "NO FILTER REQUIRED — REMOVE SOLAR FILTER NOW!";
    filterSafe = true;
  } else if (isDiamondRing) {
    iso = "100 - 200";
    shutter = "1/2000s - 1/500s";
    aperture = "f/8";
    filterStatus = "QUICK FILTER REMOVAL (DIAMOND RING / BAILY'S BEADS)";
    filterSafe = false;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-[#04060a]/95 border border-emerald-500/40 rounded-xl p-5 shadow-[0_0_50px_rgba(16,185,129,0.25)] flex flex-col gap-4 font-mono text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-wider uppercase text-emerald-300">
              {t('photoGuide')} — SOLAR PHOTOGRAPHY CHEAT SHEET
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safety Filter Banner */}
        <div className={`p-3.5 rounded-lg border flex items-center gap-3 ${
          filterSafe
            ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200'
            : 'bg-rose-500/20 border-rose-500/60 text-rose-200'
        }`}>
          {filterSafe ? (
            <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-6 h-6 shrink-0 text-rose-400 animate-pulse" />
          )}
          <div className="flex flex-col">
            <span className="font-bold text-xs uppercase tracking-wider">{filterStatus}</span>
            <span className="text-[10px] opacity-80 font-sans">
              {filterSafe
                ? "During 100% totality, looking or shooting directly without filter is safe."
                : "NEVER look or point camera directly at partial Sun without certified ISO 12312-2 filter!"}
            </span>
          </div>
        </div>

        {/* Recommended Camera Settings */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex flex-col items-center">
            <span className="text-[10px] text-slate-400">RECOMMENDED ISO</span>
            <span className="text-lg font-bold text-emerald-300 my-1">{iso}</span>
            <span className="text-[9px] text-slate-500">Low Noise</span>
          </div>

          <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex flex-col items-center">
            <span className="text-[10px] text-slate-400">SHUTTER SPEED</span>
            <span className="text-lg font-bold text-amber-300 my-1">{shutter}</span>
            <span className="text-[9px] text-slate-500">Phase Bracket</span>
          </div>

          <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex flex-col items-center">
            <span className="text-[10px] text-slate-400">APERTURE</span>
            <span className="text-lg font-bold text-cyan-300 my-1">{aperture}</span>
            <span className="text-[9px] text-slate-500">Sweet Spot</span>
          </div>
        </div>

        {/* Bracketing Exposure Guide for Totality Corona */}
        <div className="bg-white/5 p-3.5 rounded-lg border border-white/10 flex flex-col gap-2 text-xs">
          <span className="font-bold text-amber-300 uppercase text-[11px] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            HDR Corona Exposure Bracketing (At Totality)
          </span>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-300">
            <div className="bg-black/40 p-2 rounded">
              <span className="block font-bold text-slate-200">1/1000s</span>
              <span>Inner Chromosphere & Red Prominences</span>
            </div>
            <div className="bg-black/40 p-2 rounded">
              <span className="block font-bold text-slate-200">1/250s</span>
              <span>Mid Corona Rays</span>
            </div>
            <div className="bg-black/40 p-2 rounded">
              <span className="block font-bold text-slate-200">1s to 2s</span>
              <span>Outer Streamers & Earthshine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
