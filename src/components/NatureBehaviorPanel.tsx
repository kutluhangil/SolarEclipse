/**
 * Nature & Wildlife Behavior Panel
 * Shows ecological responses to the eclipse based on obscuration and temperature.
 * Birds go silent, insects begin chirping, flowers close, bees return to hives.
 */

import React, { useMemo } from 'react';
import { TelemetryReadout } from '../types';

interface NatureBehaviorPanelProps {
  telemetry: TelemetryReadout;
  isVisible: boolean;
}

interface BehaviorIndicator {
  emoji: string;
  label: string;
  status: string;
  statusColor: string;
  barPercent: number;
  barColor: string;
}

export function NatureBehaviorPanel({ telemetry, isVisible }: NatureBehaviorPanelProps) {
  const obs = telemetry.obscurationPercentage;
  const phase = telemetry.currentPhase;
  const tempDrop = telemetry.meteorology?.currentTempDropC ?? 0;

  const isTotality = phase === 'TOTALITY!';
  const isNearTotality = obs > 85;
  const isDiamondRing = phase === 'Diamond Ring!';

  const lightLevel = useMemo(() => {
    // Approximate lux drop during eclipse
    if (isTotality) return 0.02; // twilight level ~1/50000 of normal
    if (obs > 90) return 0.01 + (100 - obs) * 0.01;
    if (obs > 70) return 1.0 - (obs - 70) / 30 * 0.85;
    return 1.0 - obs / 100 * 0.15;
  }, [obs, isTotality]);

  const visibleStars = useMemo(() => {
    if (isTotality) return 8;
    if (obs > 95) return 3;
    if (obs > 90) return 1;
    return 0;
  }, [obs, isTotality]);

  const indicators: BehaviorIndicator[] = useMemo(() => [
    {
      emoji: '🐦',
      label: 'Birds',
      status: isTotality ? 'Silent / Roosting' : isNearTotality ? 'Quieting Down' : obs > 60 ? 'Restless' : 'Normal Activity',
      statusColor: isTotality ? 'text-slate-400' : isNearTotality ? 'text-yellow-300' : 'text-emerald-400',
      barPercent: isTotality ? 5 : isNearTotality ? 30 : Math.max(10, 100 - obs * 0.7),
      barColor: isTotality ? 'bg-slate-500' : 'bg-emerald-500',
    },
    {
      emoji: '🦗',
      label: 'Night Insects',
      status: isTotality ? 'Chirping Loudly' : isNearTotality ? 'Starting to Chirp' : obs > 70 ? 'Waking Up' : 'Silent (Daytime)',
      statusColor: isTotality ? 'text-lime-300' : isNearTotality ? 'text-lime-400' : 'text-slate-400',
      barPercent: isTotality ? 95 : isNearTotality ? 60 : obs > 70 ? 30 : 5,
      barColor: 'bg-lime-500',
    },
    {
      emoji: '🌸',
      label: 'Flowers',
      status: isTotality ? 'Closed / Drooping' : isNearTotality ? 'Closing Petals' : obs > 50 ? 'Partially Closed' : 'Fully Open',
      statusColor: isTotality ? 'text-pink-400' : isNearTotality ? 'text-pink-300' : 'text-rose-300',
      barPercent: isTotality ? 100 : obs * 0.9,
      barColor: 'bg-pink-500',
    },
    {
      emoji: '🐝',
      label: 'Bees / Pollinators',
      status: isTotality ? 'Returned to Hive' : isNearTotality ? 'Returning to Hive' : obs > 60 ? 'Agitated / Confused' : 'Normal Foraging',
      statusColor: isTotality ? 'text-amber-300' : isNearTotality ? 'text-amber-400' : 'text-amber-200',
      barPercent: isTotality ? 5 : Math.max(5, 100 - obs * 0.85),
      barColor: 'bg-amber-500',
    },
  ], [obs, isTotality, isNearTotality]);

  if (!isVisible) return null;

  return (
    <div className="bg-[#0a0f1a]/90 backdrop-blur-md border border-emerald-500/25 rounded-xl p-3 shadow-xl text-xs font-mono w-64">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-500/20">
        <span className="text-base">🌿</span>
        <div>
          <div className="text-emerald-300 font-bold tracking-wider text-[11px] uppercase">Nature Response</div>
          <div className="text-slate-500 text-[10px]">Biotic eclipse reaction</div>
        </div>
        {isTotality && (
          <span className="ml-auto text-[9px] bg-slate-800 text-slate-300 border border-slate-600 px-1.5 py-0.5 rounded animate-pulse">
            TOTALITY
          </span>
        )}
      </div>

      {/* Light Level Bar */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-slate-400">☀️ Light Level</span>
          <span className={`font-bold ${lightLevel < 0.05 ? 'text-slate-400' : lightLevel < 0.3 ? 'text-amber-300' : 'text-yellow-200'}`}>
            {isTotality ? 'Twilight' : `${Math.round(lightLevel * 100)}%`}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-1000"
            style={{
              width: `${Math.max(2, lightLevel * 100)}%`,
              background: `linear-gradient(to right, #f59e0b, #fef08a)`,
            }}
          />
        </div>
      </div>

      {/* Temperature Drop */}
      {tempDrop > 0 && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">🌡️ Temp Drop</span>
            <span className="text-cyan-300 font-bold">−{tempDrop.toFixed(1)}°C</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-cyan-500 transition-all duration-1000"
              style={{ width: `${Math.min(100, tempDrop * 18)}%` }}
            />
          </div>
        </div>
      )}

      {/* Wildlife indicators */}
      <div className="space-y-2.5">
        {indicators.map((ind) => (
          <div key={ind.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span>{ind.emoji}</span>
                <span className="text-slate-400">{ind.label}</span>
              </div>
              <span className={`text-[10px] font-bold ${ind.statusColor}`}>{ind.status}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all duration-2000 ${ind.barColor}`}
                style={{ width: `${ind.barPercent}%`, opacity: 0.85 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Visible Stars */}
      {visibleStars > 0 && (
        <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-slate-400">⭐ Visible Stars</span>
          <span className="text-indigo-300 font-bold">{visibleStars} naked-eye stars</span>
        </div>
      )}

      {/* Totality message */}
      {isTotality && (
        <div className="mt-2 p-2 bg-slate-800/60 rounded-lg border border-slate-600/40 text-center">
          <div className="text-slate-300 text-[10px] leading-relaxed">
            🌑 Complete daytime darkness.<br/>
            Nature experiences a false dusk.
          </div>
        </div>
      )}

      {isDiamondRing && (
        <div className="mt-2 p-1.5 bg-amber-900/30 rounded border border-amber-500/30 text-center">
          <div className="text-amber-200 text-[10px]">💍 Diamond Ring detected — wildlife startled</div>
        </div>
      )}
    </div>
  );
}
