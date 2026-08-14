import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_START_SECONDS, SIMULATION_START_SECONDS, SIMULATION_END_SECONDS, OBSERVATION_STATIONS } from './data/eclipseData';
import { ObservationStation, LatLon, TelemetryReadout } from './types';
import { calculateTelemetry, getUmbraPosition, calculateDistanceKm, getAutoTrackingStation } from './utils/astronomy';
import { HeaderClocks } from './components/HeaderClocks';
import { Earth3D } from './components/Earth3D';
import { TelemetryPanel } from './components/TelemetryPanel';
import { PathTimelinePanel } from './components/PathTimelinePanel';
import { TimelineScrubber } from './components/TimelineScrubber';
import { SkyViewPanel } from './components/SkyViewPanel';
import { AttributionModal } from './components/AttributionModal';

export default function App() {
  // Simulation State
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(DEFAULT_START_SECONDS);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(300); // default 300x speed

  // Attributions / Info Modal State
  const [isAttributionModalOpen, setIsAttributionModalOpen] = useState<boolean>(false);

  // Selection & Camera State
  const [selectedStation, setSelectedStation] = useState<ObservationStation | null>(() => getAutoTrackingStation(DEFAULT_START_SECONDS));
  const [customStation, setCustomStation] = useState<ObservationStation | null>(null);
  const [cameraMode, setCameraMode] = useState<'free' | 'follow-shadow' | 'focused-station' | 'top-down' | 'spain-fixed' | 'polar'>('follow-shadow');
  const [trackingMode, setTrackingMode] = useState<'auto' | 'manual' | 'spain-fixed'>('auto');
  const [cameraResetTrigger, setCameraResetTrigger] = useState<number>(0);

  // Layer Visibility & Shader State
  const [showPathLine, setShowPathLine] = useState<boolean>(true);
  const [showPenumbra, setShowPenumbra] = useState<boolean>(true);
  const [showDayNightTerminator, setShowDayNightTerminator] = useState<boolean>(true);
  const [umbraOpacity, setUmbraOpacity] = useState<number>(0.90);

  // Mobile Bottom Drawer State
  const [mobileTab, setMobileTab] = useState<'telemetry' | 'sky' | 'timeline'>('telemetry');
  const [isMobilePanelExpanded, setIsMobilePanelExpanded] = useState<boolean>(true);

  // Continuous Simulation loop ticker with loop-to-start
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTimestamp((prev) => {
        const next = prev + (speedMultiplier * 0.05); // 50ms tick interval
        if (next >= SIMULATION_END_SECONDS) {
          return SIMULATION_START_SECONDS; // Seamless loop back to 5:00PM UTC
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier]);

  // Auto-track Eclipse progression:
  // In Auto mode, do NOT show a synthetic "Umbra Center"; instead, focus on the current city,
  // and a short while after the eclipse passes each city, automatically pin to the next city in sequence.
  useEffect(() => {
    if (trackingMode !== 'auto') return;

    const autoStation = getAutoTrackingStation(currentTimestamp);
    if (autoStation && (!selectedStation || selectedStation.id !== autoStation.id || selectedStation.isCustom)) {
      setCustomStation(null);
      setSelectedStation(autoStation);
    }
  }, [currentTimestamp, trackingMode, selectedStation]);

  // Compute live telemetry for selected station
  const activeStation = useMemo(() => customStation || selectedStation, [customStation, selectedStation]);

  const telemetry: TelemetryReadout = useMemo(() => {
    if (!activeStation) {
      return {
        obscurationPercentage: 0,
        sunAltitudeDegrees: 0,
        currentPhase: 'No Eclipse',
        timeToNextPhase: 'N/A',
        distanceToUmbraKm: 9999
      };
    }
    return calculateTelemetry(activeStation.coords, currentTimestamp, activeStation.isCustom ? undefined : activeStation.id);
  }, [activeStation, currentTimestamp]);

  // Handle custom pin drop on 3D Globe
  const handleDropCustomPin = useCallback((coords: LatLon) => {
    setTrackingMode('manual');
    let country: ObservationStation['country'] = 'Ocean';
    let countryCode: ObservationStation['countryCode'] = 'INTL';
    if (coords.lat > 68 && coords.lon < -10) {
      country = 'Greenland';
      countryCode = 'GL';
    } else if (coords.lat > 63 && coords.lat < 67 && coords.lon > -25 && coords.lon < -13) {
      country = 'Iceland';
      countryCode = 'IS';
    } else if (coords.lat > 36 && coords.lat < 44 && coords.lon > -10 && coords.lon < 4) {
      country = 'Spain';
      countryCode = 'ES';
    }

    let baselineTempC = 22.0;
    let cloudCover = 40;
    let clearSkyProb = 60;
    let maxDrop = 3.8;
    let conditions = 'Dynamic user coordinates; maritime August climate projection.';
    let risk: ObservationStation['meteorology']['cloudRiskProfile'] = 'Moderate';
    let humidity = 65;
    let solarMax = 750;

    if (coords.lat > 68) {
      baselineTempC = 7.2;
      cloudCover = 48;
      clearSkyProb = 52;
      maxDrop = 3.2;
      conditions = 'High Arctic zone; crisp air, potential fjord low stratus.';
      risk = 'Moderate';
      humidity = 76;
      solarMax = 520;
    } else if (coords.lat > 60) {
      baselineTempC = 13.8;
      cloudCover = 64;
      clearSkyProb = 38;
      maxDrop = 2.7;
      conditions = 'Subpolar North Atlantic; marine stratocumulus decks common.';
      risk = 'High';
      humidity = 81;
      solarMax = 580;
    } else if (coords.lat >= 36 && coords.lat <= 44 && coords.lon >= -10 && coords.lon <= 5) {
      baselineTempC = 33.5;
      cloudCover = 15;
      clearSkyProb = 86;
      maxDrop = 5.4;
      conditions = 'Iberian Peninsula summer climatology; warm dry air with excellent clarity.';
      risk = 'Very Low';
      humidity = 32;
      solarMax = 880;
    }

    const newCustomStation: ObservationStation = {
      id: 'custom-pin',
      name: `Point (${coords.lat.toFixed(2)}°, ${coords.lon.toFixed(2)}°)`,
      country,
      countryCode,
      coords,
      elevationMeters: 0,
      description: 'Custom user-selected observation point. Telemetry is calculated dynamically in real-time based on distance from the Moon’s umbral shadow path.',
      weatherProspects: 'Dynamically generated point. Consult local meteorological forecasts for August 2026.',
      meteorology: {
        baselineTempC,
        estimatedCloudCoverPercent: cloudCover,
        clearSkyProbabilityPercent: clearSkyProb,
        maxProjectedTempDropC: maxDrop,
        typicalAugustConditions: conditions,
        cloudRiskProfile: risk,
        humidityBaselinePercent: humidity,
        solarIrradianceMaxWm2: solarMax
      },
      eclipseTimes: {
        startPartial: '16:00:00',
        startTotality: '17:30:00',
        peakTotality: '17:31:00',
        endTotality: '17:32:00',
        endPartial: '18:50:00',
        durationSeconds: 120
      },
      maxSunAltitude: 20.0,
      isCustom: true
    };

    setCustomStation(newCustomStation);
    setSelectedStation(newCustomStation);
    setTrackingMode('manual');
    setCameraMode('focused-station');
  }, []);

  const handleSelectStation = useCallback((station: ObservationStation) => {
    setTrackingMode('manual');
    if (station.isCustom && customStation) {
      setSelectedStation(customStation);
    } else {
      setCustomStation(null);
      setSelectedStation(station);
    }
    setCameraMode('focused-station');
  }, [customStation]);

  const handleUserInteract = useCallback(() => {
    setTrackingMode('manual');
  }, []);

  const handleJumpToMilestone = useCallback((timeSeconds: number, stationId?: string) => {
    setCurrentTimestamp(timeSeconds);
    if (stationId) {
      setTrackingMode('manual');
      const found = OBSERVATION_STATIONS.find((s) => s.id === stationId);
      if (found) {
        setCustomStation(null);
        setSelectedStation(found);
        setCameraMode('focused-station');
      }
    }
  }, []);

  const handleSelectTrackingMode = useCallback((mode: 'auto' | 'manual' | 'spain-fixed') => {
    setTrackingMode(mode);
    setCameraResetTrigger((prev) => prev + 1);
    if (mode === 'auto') {
      setCameraMode('follow-shadow');
      setCustomStation(null);
      setSelectedStation(getAutoTrackingStation(currentTimestamp));
    } else if (mode === 'manual') {
      setCameraMode('free');
    } else if (mode === 'spain-fixed') {
      setCameraMode('spain-fixed');
      const madrid = OBSERVATION_STATIONS.find((s) => s.id === 'spain-madrid');
      if (madrid) {
        setCustomStation(null);
        setSelectedStation(madrid);
      }
    }
  }, [currentTimestamp]);

  const handleResetCamera = useCallback(() => {
    setTrackingMode('auto');
    setCameraMode('follow-shadow');
    setCustomStation(null);
    setSelectedStation(getAutoTrackingStation(currentTimestamp));
    setCameraResetTrigger((prev) => prev + 1);
  }, [currentTimestamp]);

  // Global Keyboard Shortcut:
  // - Space bar: Sets camera to fixed Spain zoom-out position
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleSelectTrackingMode('spain-fixed');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectTrackingMode]);

  return (
    <div className="flex flex-col w-screen h-screen bg-[#050505] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Top Header Bar */}
      <HeaderClocks
        currentTimestamp={currentTimestamp}
        onResetCamera={handleResetCamera}
        onOpenInfo={() => setIsAttributionModalOpen(true)}
      />

      {/* 2. Main Workspace: 3D Globe + Floating Reference UI Panels */}
      <main className="flex-1 relative min-h-0 w-full overflow-hidden">
        {/* 3D Earth Studio Canvas */}
        <div className="absolute inset-0 w-full h-full">
          <Earth3D
            currentTimestamp={currentTimestamp}
            selectedStation={activeStation}
            onSelectStation={handleSelectStation}
            cameraMode={cameraMode}
            showPathLine={showPathLine}
            showPenumbra={showPenumbra}
            showDayNightTerminator={showDayNightTerminator}
            umbraOpacity={umbraOpacity}
            onCameraModeChange={(mode) => {
              setCameraMode(mode);
              if (mode === 'free' || mode === 'focused-station' || mode === 'top-down' || mode === 'polar') {
                setTrackingMode('manual');
              } else if (mode === 'follow-shadow') {
                setTrackingMode('auto');
              } else if (mode === 'spain-fixed') {
                setTrackingMode('spain-fixed');
              }
            }}
            onDropCustomPin={handleDropCustomPin}
            onTogglePathLine={() => setShowPathLine(!showPathLine)}
            onTogglePenumbra={() => setShowPenumbra(!showPenumbra)}
            onToggleTerminator={() => setShowDayNightTerminator(!showDayNightTerminator)}
            cameraResetTrigger={cameraResetTrigger}
            onUserInteract={handleUserInteract}
          />
        </div>

        {/* Floating Overlay Panels */}
        <div className="absolute inset-0 pointer-events-none flex justify-between p-4 sm:p-5 lg:p-6 z-20 overflow-hidden transition-opacity duration-300">
          {/* Left Panel: Path of Totality Timeline */}
          <div className="pointer-events-auto self-start hidden lg:block max-h-[calc(100%-16px)] overflow-y-auto no-scrollbar pr-1">
            <PathTimelinePanel
              currentTimestamp={currentTimestamp}
              onSelectMilestone={handleJumpToMilestone}
            />
          </div>

          {/* Right Panel: Observation Point Telemetry Card & Permanent Sky View */}
          <div className="pointer-events-auto self-start hidden md:flex flex-col gap-4 lg:gap-5 max-h-[calc(100%-16px)] overflow-y-auto no-scrollbar pl-1 pr-1 pb-4">
            <TelemetryPanel
              selectedStation={activeStation}
              telemetry={telemetry}
              currentTimestamp={currentTimestamp}
              umbraOpacity={umbraOpacity}
              onUmbraOpacityChange={setUmbraOpacity}
              onSelectStation={handleSelectStation}
              onClearCustomPin={() => {
                setCustomStation(null);
                setSelectedStation(OBSERVATION_STATIONS[1]);
              }}
              trackingMode={trackingMode}
              onSelectTrackingMode={handleSelectTrackingMode}
              isAutoTracking={trackingMode === 'auto'}
              onToggleAutoTrack={() => handleSelectTrackingMode(trackingMode === 'auto' ? 'manual' : 'auto')}
            />
            <SkyViewPanel
              selectedStation={activeStation}
              telemetry={telemetry}
              currentTimestamp={currentTimestamp}
            />
          </div>
        </div>
      </main>

      {/* Mobile-only interactive bottom drawer / tabbed sheet */}
      <div className="md:hidden bg-[#050505]/95 border-t border-white/20 shrink-0 z-30 flex flex-col shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
        {/* Tab Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-2 py-1.5 bg-black/90 font-mono text-xs">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                if (mobileTab === 'telemetry' && isMobilePanelExpanded) {
                  setIsMobilePanelExpanded(false);
                } else {
                  setMobileTab('telemetry');
                  setIsMobilePanelExpanded(true);
                }
              }}
              className={`px-2.5 py-1 rounded-sm transition-all font-bold tracking-wider uppercase flex items-center gap-1 whitespace-nowrap text-[11px] ${
                mobileTab === 'telemetry' && isMobilePanelExpanded
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
              }`}
            >
              <span>📊</span>
              <span>Telemetry</span>
            </button>

            <button
              onClick={() => {
                if (mobileTab === 'sky' && isMobilePanelExpanded) {
                  setIsMobilePanelExpanded(false);
                } else {
                  setMobileTab('sky');
                  setIsMobilePanelExpanded(true);
                }
              }}
              className={`px-2.5 py-1 rounded-sm transition-all font-bold tracking-wider uppercase flex items-center gap-1 whitespace-nowrap text-[11px] ${
                mobileTab === 'sky' && isMobilePanelExpanded
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
              }`}
            >
              <span>🔭</span>
              <span>Sky View</span>
            </button>

            <button
              onClick={() => {
                if (mobileTab === 'timeline' && isMobilePanelExpanded) {
                  setIsMobilePanelExpanded(false);
                } else {
                  setMobileTab('timeline');
                  setIsMobilePanelExpanded(true);
                }
              }}
              className={`px-2.5 py-1 rounded-sm transition-all font-bold tracking-wider uppercase flex items-center gap-1 whitespace-nowrap text-[11px] ${
                mobileTab === 'timeline' && isMobilePanelExpanded
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-white/5 border border-transparent'
              }`}
            >
              <span>📍</span>
              <span>Timeline</span>
            </button>
          </div>

          <button
            onClick={() => setIsMobilePanelExpanded(!isMobilePanelExpanded)}
            className="px-2 py-1 rounded-sm bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/20 ml-1 shrink-0 text-[10px] font-bold font-mono uppercase tracking-wider"
            title={isMobilePanelExpanded ? "Minimize Panel for Full Globe View" : "Expand Panel"}
          >
            {isMobilePanelExpanded ? '▼ MIN' : '▲ MAX'}
          </button>
        </div>

        {/* Panel Content Area (when expanded) */}
        {isMobilePanelExpanded && (
          <div className="p-2 max-h-[36vh] overflow-y-auto no-scrollbar bg-[#04060a]/95 transition-all">
            {mobileTab === 'telemetry' && (
              <TelemetryPanel
                selectedStation={activeStation}
                telemetry={telemetry}
                currentTimestamp={currentTimestamp}
                umbraOpacity={umbraOpacity}
                onUmbraOpacityChange={setUmbraOpacity}
                onSelectStation={handleSelectStation}
                onClearCustomPin={() => {
                  setCustomStation(null);
                  setSelectedStation(OBSERVATION_STATIONS[1]);
                }}
                trackingMode={trackingMode}
                onSelectTrackingMode={handleSelectTrackingMode}
                isAutoTracking={trackingMode === 'auto'}
                onToggleAutoTrack={() => handleSelectTrackingMode(trackingMode === 'auto' ? 'manual' : 'auto')}
              />
            )}
            {mobileTab === 'sky' && (
              <SkyViewPanel
                selectedStation={activeStation}
                telemetry={telemetry}
                currentTimestamp={currentTimestamp}
              />
            )}
            {mobileTab === 'timeline' && (
              <PathTimelinePanel
                currentTimestamp={currentTimestamp}
                onSelectMilestone={handleJumpToMilestone}
              />
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Scrubber Bar */}
      <TimelineScrubber
        currentTimestamp={currentTimestamp}
        isPlaying={isPlaying}
        speedMultiplier={speedMultiplier}
        onTimeChange={setCurrentTimestamp}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onSpeedChange={setSpeedMultiplier}
        onJumpToMilestone={handleJumpToMilestone}
      />

      {/* 4. Data Sources & Attributions Modal */}
      <AttributionModal
        isOpen={isAttributionModalOpen}
        onClose={() => setIsAttributionModalOpen(false)}
      />
    </div>
  );
}
