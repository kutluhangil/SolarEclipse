/**
 * EclipsePlannerModal — Interactive Travel & Duration Chaser Planner
 * Calculates custom station rating scores based on:
 *  - Clear sky probability (August Open-Meteo climatology)
 *  - Totality duration
 *  - Sun altitude angle
 *  - Composite Chaser Score (0-100)
 */

import React, { useState } from 'react';
import { Award, Compass, MapPin, Navigation, Sparkles, Sun, X } from 'lucide-react';
import { OBSERVATION_STATIONS } from '../data/eclipseData';
import { ObservationStation } from '../types';
import { t } from '../utils/i18n';

interface EclipsePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation: (station: ObservationStation) => void;
}

export const EclipsePlannerModal: React.FC<EclipsePlannerModalProps> = ({
  isOpen,
  onClose,
  onSelectStation
}) => {
  const [selectedStationId, setSelectedStationId] = useState<string>(OBSERVATION_STATIONS[0].id);

  if (!isOpen) return null;

  const currentStation = OBSERVATION_STATIONS.find(s => s.id === selectedStationId) || OBSERVATION_STATIONS[0];

  // Calculate Composite Chaser Rating Score (0 to 100)
  const clearSkyScore = currentStation.meteorology.clearSkyProbabilityPercent * 0.45;
  const durationScore = Math.min(100, (currentStation.eclipseTimes.durationSeconds / 138) * 100) * 0.35;
  const altitudeScore = Math.min(100, (currentStation.maxSunAltitude / 30) * 100) * 0.20;
  const totalScore = Math.round(clearSkyScore + durationScore + altitudeScore);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
    if (score >= 60) return 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10';
    if (score >= 40) return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/50 bg-rose-500/10';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#04060a]/95 border border-amber-500/40 rounded-xl p-5 shadow-[0_0_50px_rgba(245,158,11,0.25)] flex flex-col gap-5 font-mono text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm tracking-wider uppercase text-amber-300">
              {t('travelPlanner')} — ECLIPSE 2026 CHASER SCORE
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Station Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {OBSERVATION_STATIONS.map((st) => {
            const isSelected = st.id === selectedStationId;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStationId(st.id)}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400/80 text-white shadow-md'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{st.name}</span>
                  <span className="text-[10px] opacity-75">{st.countryCode}</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Totality: {st.eclipseTimes.durationSeconds}s
                </div>
              </button>
            );
          })}
        </div>

        {/* Station Score Breakdown Card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-base text-amber-200">{currentStation.name}</span>
              <span className="text-xs text-slate-400">({currentStation.country})</span>
            </div>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {currentStation.weatherProspects}
            </p>
          </div>

          {/* Composite Score Circle */}
          <div className={`shrink-0 flex flex-col items-center justify-center p-4 rounded-xl border ${getScoreColor(totalScore)}`}>
            <span className="text-[10px] font-bold tracking-widest uppercase">CHASER SCORE</span>
            <span className="text-3xl font-extrabold my-1">{totalScore}</span>
            <span className="text-[10px] opacity-80">OUT OF 100</span>
          </div>
        </div>

        {/* Metric Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">CLEAR SKY PROB.</span>
              <span className="text-emerald-400 font-bold">{currentStation.meteorology.clearSkyProbabilityPercent}%</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-400 h-full transition-all" style={{ width: `${currentStation.meteorology.clearSkyProbabilityPercent}%` }} />
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">TOTALITY DURATION</span>
              <span className="text-amber-400 font-bold">{currentStation.eclipseTimes.durationSeconds}s</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-400 h-full transition-all" style={{ width: `${Math.min(100, (currentStation.eclipseTimes.durationSeconds / 138) * 100)}%` }} />
            </div>
          </div>

          <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">SUN ALTITUDE</span>
              <span className="text-cyan-400 font-bold">{currentStation.maxSunAltitude}°</span>
            </div>
            <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
              <div className="bg-cyan-400 h-full transition-all" style={{ width: `${Math.min(100, (currentStation.maxSunAltitude / 35) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            onSelectStation(currentStation);
            onClose();
          }}
          className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Compass className="w-4 h-4" />
          <span>SET SIMULATION TO {currentStation.name}</span>
        </button>
      </div>
    </div>
  );
};
