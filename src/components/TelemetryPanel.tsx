import React, { useState } from 'react';
import { ObservationStation, TelemetryReadout } from '../types';
import { OBSERVATION_STATIONS } from '../data/eclipseData';
import { ChevronDown, Compass, RefreshCw, CloudSun, Thermometer, Droplets, SunMedium, Wind, Sparkles, Download, Check, Moon, Gauge, Timer, Zap } from 'lucide-react';
import { TemperatureDropChart } from './TemperatureDropChart';
import { formatSecondsToUTC, calculateUmbraInstantaneousSpeed } from '../utils/astronomy';

interface TelemetryPanelProps {
  selectedStation: ObservationStation | null;
  telemetry: TelemetryReadout;
  currentTimestamp?: number;
  umbraOpacity?: number;
  onUmbraOpacityChange?: (opacity: number) => void;
  onSelectStation: (station: ObservationStation) => void;
  onOpenSkyView?: () => void;
  onClearCustomPin?: () => void;
  isAutoTracking?: boolean;
  onToggleAutoTrack?: () => void;
  trackingMode?: 'auto' | 'manual' | 'spain-fixed';
  onSelectTrackingMode?: (mode: 'auto' | 'manual' | 'spain-fixed') => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  selectedStation,
  telemetry,
  currentTimestamp = 63000,
  umbraOpacity = 0.90,
  onUmbraOpacityChange,
  onSelectStation,
  onClearCustomPin,
  isAutoTracking = false,
  onToggleAutoTrack,
  trackingMode = isAutoTracking ? 'auto' : 'manual',
  onSelectTrackingMode
}) => {
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);

  const handleDownloadData = () => {
    if (!selectedStation) return;

    const meteoData = telemetry.meteorology;
    const exportPayload = {
      snapshotMetadata: {
        application: "Total Solar Eclipse 2026 Simulation & Environmental Visualizer",
        targetEventDate: "2026-08-12",
        exportedAtUTC: new Date().toISOString(),
        simulationTimestampSeconds: currentTimestamp,
        simulationTimeUTC: formatSecondsToUTC(currentTimestamp)
      },
      observationStation: {
        id: selectedStation.id,
        name: selectedStation.name,
        country: selectedStation.country,
        countryCode: selectedStation.countryCode,
        coordinates: {
          latitude: selectedStation.coords.lat,
          longitude: selectedStation.coords.lon
        },
        elevationMeters: selectedStation.elevationMeters ?? 0,
        description: selectedStation.description,
        isCustomPin: !!selectedStation.isCustom,
        eclipseTimeWindowsUTC: selectedStation.eclipseTimes,
        totalityDurationSeconds: selectedStation.eclipseTimes.durationSeconds,
        sunAltitudePeakDegrees: selectedStation.maxSunAltitude
      },
      astronomicalTelemetry: {
        currentPhase: telemetry.currentPhase,
        obscurationPercentage: telemetry.obscurationPercentage,
        sunAltitudeDegrees: telemetry.sunAltitudeDegrees,
        distanceToUmbraKm: telemetry.distanceToUmbraKm,
        timeToNextPhase: telemetry.timeToNextPhase
      },
      meteorologicalProjections: {
        cloudCover: {
          estimatedCloudCoverPercent: meteoData?.cloudCoverPercent ?? selectedStation.meteorology?.estimatedCloudCoverPercent ?? 0,
          clearSkyProbabilityPercent: meteoData?.clearSkyProbabilityPercent ?? selectedStation.meteorology?.clearSkyProbabilityPercent ?? 0,
          cloudRiskProfile: meteoData?.cloudRiskProfile ?? selectedStation.meteorology?.cloudRiskProfile ?? 'Moderate'
        },
        temperature: {
          baseline: {
            celsius: meteoData?.baselineTempC ?? selectedStation.meteorology?.baselineTempC ?? 0,
            fahrenheit: meteoData?.baselineTempF ?? Math.round(((selectedStation.meteorology?.baselineTempC ?? 0) * 1.8 + 32) * 10) / 10
          },
          currentProjected: {
            celsius: meteoData?.currentTempC ?? 0,
            fahrenheit: meteoData?.currentTempF ?? 0
          },
          currentDrop: {
            celsius: meteoData?.currentTempDropC ?? 0,
            fahrenheit: meteoData?.currentTempDropF ?? 0
          },
          maximumProjectedDrop: {
            celsius: meteoData?.maxProjectedTempDropC ?? selectedStation.meteorology?.maxProjectedTempDropC ?? 0,
            fahrenheit: meteoData?.maxProjectedTempDropF ?? Math.round(((selectedStation.meteorology?.maxProjectedTempDropC ?? 0) * 1.8) * 10) / 10
          }
        },
        atmosphericDynamics: {
          solarIrradianceWattsPerSqMeter: meteoData?.solarIrradianceWm2 ?? 0,
          relativeHumidityPercent: meteoData?.relativeHumidityPercent ?? 0,
          cumulusDissipationActive: meteoData?.cumulusDissipationActive ?? false,
          microclimateAnalysis: meteoData?.microclimateSummary ?? ''
        },
        climatologicalContext: selectedStation.meteorology?.typicalAugustConditions || selectedStation.weatherProspects
      }
    };

    const dataBlob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(dataBlob);
    const downloadAnchor = document.createElement('a');
    const sanitizedName = selectedStation.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    downloadAnchor.href = downloadUrl;
    downloadAnchor.download = `eclipse_2026_${sanitizedName}_environmental_data.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(downloadUrl);

    setIsDownloaded(true);
    setTimeout(() => {
      setIsDownloaded(false), 2500;
    }, 2500);
  };

  if (!selectedStation) {
    return (
      <div className="w-full md:w-88 lg:w-96 xl:w-[410px] bg-[#04060a]/95 backdrop-blur-2xl border border-white/15 rounded p-5 text-slate-400 font-mono text-xs shadow-2xl">
        [ SELECT_STATION_TO_MONITOR ]
      </div>
    );
  }

  const getFlagEmoji = (code: string) => {
    switch (code) {
      case 'GL': return '🇬🇱';
      case 'IS': return '🇮🇸';
      case 'ES': return '🇪🇸';
      case 'CUSTOM': return '📍';
      case 'INTL': return '🌊';
      default: return '🌐';
    }
  };

  const durationMin = Math.floor(selectedStation.eclipseTimes.durationSeconds / 60);
  const durationSec = selectedStation.eclipseTimes.durationSeconds % 60;
  const durationFormatted = `${durationMin}m ${durationSec}s`;

  const meteo = telemetry.meteorology;
  const cloudCover = meteo?.cloudCoverPercent ?? selectedStation.meteorology?.estimatedCloudCoverPercent ?? 35;
  const clearSkyProb = meteo?.clearSkyProbabilityPercent ?? selectedStation.meteorology?.clearSkyProbabilityPercent ?? 65;
  const cloudRisk = meteo?.cloudRiskProfile ?? selectedStation.meteorology?.cloudRiskProfile ?? 'Moderate';

  const baselineTemp = tempUnit === 'C'
    ? `${meteo?.baselineTempC.toFixed(1) ?? selectedStation.meteorology?.baselineTempC.toFixed(1) ?? '25.0'}°C`
    : `${meteo?.baselineTempF.toFixed(1) ?? ((selectedStation.meteorology?.baselineTempC ?? 25) * 1.8 + 32).toFixed(1)}°F`;

  const currentTemp = tempUnit === 'C'
    ? `${meteo?.currentTempC.toFixed(1) ?? '25.0'}°C`
    : `${meteo?.currentTempF.toFixed(1) ?? '77.0'}°F`;

  const currentDrop = tempUnit === 'C'
    ? `-${meteo?.currentTempDropC.toFixed(1) ?? '0.0'}°C`
    : `-${meteo?.currentTempDropF.toFixed(1) ?? '0.0'}°F`;

  const maxDrop = tempUnit === 'C'
    ? `-${meteo?.maxProjectedTempDropC.toFixed(1) ?? selectedStation.meteorology?.maxProjectedTempDropC.toFixed(1) ?? '4.0'}°C`
    : `-${meteo?.maxProjectedTempDropF.toFixed(1) ?? ((selectedStation.meteorology?.maxProjectedTempDropC ?? 4) * 1.8).toFixed(1)}°F`;

  // Thermal drop progression ratio (0 to 1)
  const dropRatio = meteo && meteo.maxProjectedTempDropC > 0
    ? Math.min(1, Math.max(0, meteo.currentTempDropC / meteo.maxProjectedTempDropC))
    : 0;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Very Low':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Low':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'Moderate':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'High':
      default:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  };

  return (
    <div id="telemetry-panel" className="w-full md:w-88 lg:w-96 xl:w-[410px] bg-[#050505]/95 backdrop-blur-2xl border border-white/20 rounded p-4 md:p-5 lg:p-6 flex flex-col justify-start text-slate-200 shadow-2xl shrink-0 font-sans select-none">
      <div>
        {/* Architectural Header */}
        <div className="border-b border-white/20 pb-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,242,254,0.8)]" title="Active Telemetry Link" />
            <h2 className="text-xs lg:text-[13px] font-mono tracking-[0.2em] uppercase text-slate-300 font-bold">
              OBSERVATION POINT
            </h2>
          </div>

          {selectedStation.isCustom && trackingMode !== 'auto' && onClearCustomPin && (
            <button
              id="btn-reset-custom-pin"
              onClick={onClearCustomPin}
              className="text-slate-400 hover:text-white text-xs font-mono tracking-wider uppercase underline underline-offset-4"
            >
              Reset Pin
            </button>
          )}
        </div>

        {/* 2-Mode Tracking Bar */}
        <div className="grid grid-cols-2 gap-1.5 mb-4 bg-black/70 p-1.5 rounded border border-white/15 font-mono text-xs lg:text-[13px] shadow-inner">
          <button
            id="btn-tracking-auto"
            onClick={() => {
              if (onSelectTrackingMode) onSelectTrackingMode('auto');
              else if (onToggleAutoTrack && !isAutoTracking) onToggleAutoTrack();
            }}
            className={`py-2 px-2 rounded-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              trackingMode === 'auto'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_10px_rgba(0,242,254,0.25)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Auto-tracking: Automatically track the center of the Moon's umbral shadow across the Earth"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${trackingMode === 'auto' ? 'animate-spin' : ''}`} style={{ animationDuration: '8s' }} />
            <span className="truncate">AUTO</span>
          </button>

          <button
            id="btn-tracking-manual"
            onClick={() => {
              if (onSelectTrackingMode) onSelectTrackingMode('manual');
              else if (onToggleAutoTrack && isAutoTracking) onToggleAutoTrack();
            }}
            className={`py-2 px-2 rounded-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              trackingMode === 'manual'
                ? 'bg-white/15 text-white border border-white/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Manual mode: Free globe rotation and manual station selection without forced camera movement"
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">MANUAL</span>
          </button>
        </div>

        {/* Country & Station Title */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2.5 mb-1">
            <span className="text-2xl lg:text-3xl leading-none">{getFlagEmoji(selectedStation.countryCode)}</span>
            <span className="text-xl lg:text-2xl font-extrabold text-white tracking-tight uppercase">
              {selectedStation.country === 'Ocean' ? 'Custom Point' : selectedStation.country}
            </span>
          </div>
          <div className="text-sm lg:text-base font-mono text-cyan-300 font-bold tracking-wide pl-9 lg:pl-10">
            {selectedStation.name}
          </div>
        </div>

        {/* Precise Location Selector Box */}
        <div className="relative mb-5 group">
          <div className="w-full bg-black/80 border border-white/20 group-hover:border-cyan-500/50 transition-colors rounded px-4 py-3 flex items-center justify-between text-xs lg:text-sm font-mono text-slate-300 shadow-inner">
            <div className="flex items-center gap-2.5 truncate">
              <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate text-white/90">
                {selectedStation.coords.lat >= 0 ? `${selectedStation.coords.lat.toFixed(4)}° N` : `${Math.abs(selectedStation.coords.lat).toFixed(4)}° S`},{' '}
                {selectedStation.coords.lon >= 0 ? `${selectedStation.coords.lon.toFixed(4)}° E` : `${Math.abs(selectedStation.coords.lon).toFixed(4)}° W`}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
          </div>

          <select
            id="station-selector-dropdown"
            value={selectedStation.id}
            onChange={(e) => {
              const found = OBSERVATION_STATIONS.find((s) => s.id === e.target.value);
              if (found) onSelectStation(found);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {OBSERVATION_STATIONS.map((station) => (
              <option key={station.id} value={station.id} className="bg-[#050505] text-white py-1.5 font-mono text-xs lg:text-sm">
                {getFlagEmoji(station.countryCode)} {station.name} ({station.country})
              </option>
            ))}
            {selectedStation.isCustom && (
              <option value={selectedStation.id} className="bg-[#050505] text-emerald-400 font-bold font-mono text-xs lg:text-sm">
                📍 {selectedStation.name}
              </option>
            )}
          </select>
        </div>

        {/* Astronomical Data Table */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 mt-4 text-xs font-mono border-t border-white/20 pt-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] lg:text-xs tracking-wider text-slate-400 uppercase font-medium">Totality Duration</span>
            <span className="text-base lg:text-lg font-bold text-white tracking-wide">{durationFormatted}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] lg:text-xs tracking-wider text-slate-400 uppercase font-medium">Magnitude</span>
            <span className="text-base lg:text-lg font-bold text-white tracking-wide">1.028</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] lg:text-xs tracking-wider text-slate-400 uppercase font-medium">Sun Altitude</span>
            <span className="text-base lg:text-lg font-bold text-white tracking-wide">{telemetry.sunAltitudeDegrees.toFixed(1)}°</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] lg:text-xs tracking-wider text-slate-400 uppercase font-medium">Obscuration</span>
            <span className="text-base lg:text-lg font-bold text-amber-400 tracking-wide">{telemetry.obscurationPercentage.toFixed(1)}%</span>
          </div>
        </div>

        {/* Shadow Dynamics Widget */}
        <div id="shadow-dynamics-widget" className="mt-4 pt-3.5 border-t border-white/20">
          <div className="bg-black/75 border border-white/15 rounded-lg p-3 text-xs font-mono shadow-inner">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-slate-200 uppercase tracking-wider text-[11px] font-bold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>Shadow Dynamics</span>
              </span>
              <span className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE</span>
              </span>
            </div>

            {/* Instantaneous Umbra Speed & Totality Duration */}
            <div className="grid grid-cols-2 gap-2">
              {/* 1. Umbra Speed (km/h) */}
              <div id="metric-umbra-speed" className="bg-white/5 border border-white/10 rounded p-2.5 flex flex-col justify-between">
                <div className="text-[10px] uppercase text-slate-400 font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Umbra Speed</span>
                </div>
                <div className="mt-1.5">
                  <div className="text-base lg:text-lg font-bold text-cyan-300 font-mono tracking-tight flex items-baseline gap-1">
                    <span>{calculateUmbraInstantaneousSpeed(currentTimestamp) > 0 ? calculateUmbraInstantaneousSpeed(currentTimestamp).toLocaleString() : '---'}</span>
                    <span className="text-[10px] text-slate-400 font-normal">km/h</span>
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                    {calculateUmbraInstantaneousSpeed(currentTimestamp) > 0 
                      ? `~${(calculateUmbraInstantaneousSpeed(currentTimestamp) / 3600).toFixed(2)} km/s`
                      : 'Outside active track'}
                  </div>
                </div>
              </div>

              {/* 2. Totality Duration (seconds) */}
              <div id="metric-totality-duration" className="bg-white/5 border border-white/10 rounded p-2.5 flex flex-col justify-between">
                <div className="text-[10px] uppercase text-slate-400 font-medium flex items-center gap-1">
                  <Timer className="w-3 h-3 text-sky-400" />
                  <span>Totality Duration</span>
                </div>
                <div className="mt-1.5">
                  <div className="text-base lg:text-lg font-bold text-amber-300 font-mono tracking-tight flex items-baseline gap-1">
                    <span>{selectedStation.eclipseTimes.durationSeconds}</span>
                    <span className="text-[10px] text-slate-400 font-normal">seconds</span>
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                    {durationFormatted} total
                  </div>
                </div>
              </div>
            </div>

            {/* Velocity status footnote */}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="truncate">
                <span className="text-slate-500">Centerline: </span>
                <span className="text-slate-300">{telemetry.distanceToUmbraKm <= 120 ? 'In Umbra Path' : `${telemetry.distanceToUmbraKm} km to axis`}</span>
              </span>
              <span className="text-cyan-400 shrink-0 ml-1">
                {telemetry.currentPhase === 'TOTALITY!' ? 'Totality Active' : telemetry.currentPhase === 'Diamond Ring!' ? 'Diamond Ring' : 'Supersonic Shadow'}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Slider: Moon's Umbra Projection Opacity Control */}
        {onUmbraOpacityChange && (
          <div id="umbra-opacity-control" className="mt-4 pt-3.5 border-t border-white/20">
            <div className="bg-black/70 border border-white/15 rounded-lg p-3 text-xs font-mono shadow-inner">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-200 uppercase tracking-wider text-[11px] font-bold flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Moon's Umbra Opacity</span>
                </span>
                <span className="text-cyan-300 font-bold text-xs bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-500/40">
                  {Math.round(umbraOpacity * 100)}%
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2.5 font-sans leading-tight">
                Controls the opacity of the Moon's shadow projected on the Earth to better highlight the path of totality against terrain.
              </p>

              {/* Slider Track with Glow Accent */}
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] text-slate-500 font-mono">10%</span>
                <input
                  id="slider-umbra-opacity"
                  type="range"
                  min="0.10"
                  max="1.00"
                  step="0.05"
                  value={umbraOpacity}
                  onChange={(e) => onUmbraOpacityChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer transition-all"
                  title="Adjust Moon's Umbra Shadow Opacity"
                />
                <span className="text-[10px] text-slate-400 font-mono">100%</span>
              </div>

              {/* Quick Opacity Presets */}
              <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                {[
                  { label: '25%', value: 0.25 },
                  { label: '50%', value: 0.50 },
                  { label: '75%', value: 0.75 },
                  { label: '100%', value: 1.00 },
                ].map((preset) => {
                  const isSelected = Math.abs(umbraOpacity - preset.value) < 0.03;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      id={`btn-umbra-preset-${preset.label}`}
                      onClick={() => onUmbraOpacityChange(preset.value)}
                      className={`py-1 rounded text-[10px] font-mono transition-all border ${
                        isSelected
                          ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400/80 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Local Meteorological Section */}
        <div id="local-meteorological-section" className="mt-5 border-t border-white/20 pt-4">
          {/* Section Header with Units Switcher */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs lg:text-[13px] font-mono tracking-[0.15em] uppercase text-sky-300 font-bold">
                LOCAL METEOROLOGICAL
              </h3>
            </div>

            <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded border border-white/15 text-[10px] font-mono">
              <button
                id="btn-unit-c"
                onClick={() => setTempUnit('C')}
                className={`px-1.5 py-0.5 rounded-sm transition-colors ${tempUnit === 'C' ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                °C
              </button>
              <button
                id="btn-unit-f"
                onClick={() => setTempUnit('F')}
                className={`px-1.5 py-0.5 rounded-sm transition-colors ${tempUnit === 'F' ? 'bg-cyan-500/30 text-cyan-200 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                °F
              </button>
            </div>
          </div>

          {/* Cloud Cover & Clear Sky Probability Card */}
          <div className="bg-black/60 border border-white/15 rounded p-3 mb-3 text-xs font-mono">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span>Estimated Cloud Cover</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getRiskColor(cloudRisk)}`}>
                {cloudRisk} Risk
              </span>
            </div>

            {/* Cloud Cover vs Clear Sky Progress Bar */}
            <div className="w-full bg-slate-800 h-2.5 rounded-sm overflow-hidden flex mb-2 border border-white/10">
              <div
                className="bg-sky-400 h-full transition-all duration-300"
                style={{ width: `${cloudCover}%` }}
                title={`Cloud Cover: ${cloudCover}%`}
              />
              <div
                className="bg-amber-400/80 h-full transition-all duration-300"
                style={{ width: `${clearSkyProb}%` }}
                title={`Clear Sky Probability: ${clearSkyProb}%`}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Cloud Cover: <strong className="text-white font-bold">{cloudCover}%</strong></span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Clear Sky: <strong className="text-white font-bold">{clearSkyProb}%</strong></span>
              </span>
            </div>

            {/* Cumulus Dissipation Alert Indicator */}
            {meteo?.cumulusDissipationActive && (
              <div className="mt-2.5 p-1.5 bg-cyan-950/40 border border-cyan-500/30 rounded flex items-center gap-2 text-[10px] text-cyan-200">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
                <span><strong>Cumulus Dissipation Effect:</strong> Solar cooling shuts down updrafts, thinning shallow cloud cover.</span>
              </div>
            )}
          </div>

          {/* Temperature Drop Projections */}
          <div className="bg-black/60 border border-white/15 rounded p-3 mb-3 text-xs font-mono">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
              <span className="text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                <span>Temperature Drop Projections</span>
              </span>
              <span className="text-[11px] text-rose-300 font-bold">
                Max Projected: <span className="text-rose-400">{maxDrop}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center my-2">
              <div className="flex flex-col bg-white/5 p-1.5 rounded border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase">Baseline</span>
                <span className="text-sm lg:text-base font-bold text-slate-200">{baselineTemp}</span>
              </div>
              <div className="flex flex-col bg-white/5 p-1.5 rounded border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase">Live Projected</span>
                <span className="text-sm lg:text-base font-bold text-cyan-300">{currentTemp}</span>
              </div>
              <div className="flex flex-col bg-rose-500/10 p-1.5 rounded border border-rose-500/30">
                <span className="text-[10px] text-rose-300 uppercase">Current Drop</span>
                <span className="text-sm lg:text-base font-bold text-rose-400">{currentDrop}</span>
              </div>
            </div>

            {/* Dynamic Thermal Cooling Gauge */}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Thermal Cooling Progression</span>
                <span className="text-cyan-300">{Math.round(dropRatio * 100)}% of Max Drop</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-rose-400 transition-all duration-300"
                  style={{ width: `${Math.round(dropRatio * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Real-time Temperature Drop Line Graph across Eclipse Duration */}
          <div className="mb-3">
            <TemperatureDropChart
              selectedStation={selectedStation}
              currentTimestamp={currentTimestamp}
              tempUnit={tempUnit}
            />
          </div>

          {/* Secondary Microclimate & Solar Radiation Readout */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-black/60 border border-white/15 rounded p-2.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase">
                <SunMedium className="w-3.5 h-3.5 text-amber-400" />
                <span>Solar Irradiance</span>
              </div>
              <div className="text-sm font-bold text-amber-300 mt-1">
                {meteo?.solarIrradianceWm2 ?? 0} <span className="text-[10px] font-normal text-slate-400">W/m²</span>
              </div>
            </div>

            <div className="bg-black/60 border border-white/15 rounded p-2.5 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span>Relative Humidity</span>
              </div>
              <div className="text-sm font-bold text-blue-300 mt-1">
                {meteo?.relativeHumidityPercent ?? 50}%
              </div>
            </div>
          </div>

          {/* Station Climate Note */}
          <div className="mt-2.5 text-[11px] font-sans text-slate-400 leading-relaxed border-l-2 border-sky-500/50 pl-2.5 py-0.5">
            {selectedStation.meteorology?.typicalAugustConditions || selectedStation.weatherProspects}
          </div>

          {/* Download Data Button */}
          <div className="mt-3.5 pt-3 border-t border-white/10">
            <button
              id="btn-download-station-data"
              onClick={handleDownloadData}
              className={`w-full py-2.5 px-3 rounded font-mono text-xs font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 border ${
                isDownloaded
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-white/5 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-200 border-white/20 hover:border-cyan-500/40 shadow-sm'
              }`}
              title="Download structured JSON snapshot of current station telemetry, eclipse times, and environmental projections"
            >
              {isDownloaded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Snapshot Saved!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Download Data (JSON)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


