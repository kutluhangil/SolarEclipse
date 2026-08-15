import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CalendarPlus, Camera, Leaf, Video, Volume2, VolumeX } from 'lucide-react';
import { DEFAULT_START_SECONDS, OBSERVATION_STATIONS, SIMULATION_END_SECONDS, SIMULATION_START_SECONDS } from './data/eclipseData';
import { LatLon, ObservationStation, TelemetryReadout } from './types';
import { calculateCustomEclipseTimes, calculateDistanceKm, calculateTelemetry, getAutoTrackingStation, getUmbraPosition, parseTimeToSeconds } from './utils/astronomy';
import { getAudioEngine } from './utils/audioEngine';
import { fetchOpenMeteoForecast } from './utils/weatherApi';
import { downloadEclipseCalendar } from './utils/calendarExport';
import { AttributionModal } from './components/AttributionModal';
import { DiamondRingEffect } from './components/DiamondRingEffect';
import { Earth3D } from './components/Earth3D';
import { EclipsePlannerModal } from './components/EclipsePlannerModal';
import { HeaderClocks } from './components/HeaderClocks';
import { NatureBehaviorPanel } from './components/NatureBehaviorPanel';
import { ObservationCertificateModal } from './components/ObservationCertificateModal';
import { PathTimelinePanel } from './components/PathTimelinePanel';
import { PhotographyGuideModal } from './components/PhotographyGuideModal';
import { ShadowBandsEffect } from './components/ShadowBandsEffect';
import { SkyViewPanel } from './components/SkyViewPanel';
import SolarOracleChat from './components/SolarOracleChat';
import { TelemetryPanel } from './components/TelemetryPanel';
import { TimelineScrubber } from './components/TimelineScrubber';
import { TotalityViewfinderModal } from './components/TotalityViewfinderModal';
import { VideoRecorder } from './components/VideoRecorder';

export default function App() {
  // Simulation State
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(DEFAULT_START_SECONDS);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(300); // default 300x speed

  // Attributions / Info Modal State
  const [isAttributionModalOpen, setIsAttributionModalOpen] = useState<boolean>(false);

  // New Feature Modals State
  const [isViewfinderOpen, setIsViewfinderOpen] = useState<boolean>(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState<boolean>(false);
  const [isPhotoGuideOpen, setIsPhotoGuideOpen] = useState<boolean>(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState<boolean>(false);

  // AI Oracle Chat State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Audio Engine State
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(false);
  const audioEngineRef = useRef(getAudioEngine());

  // Weather data cache: stationId → forecast
  const [weatherData, setWeatherData] = useState<Record<string, any>>({});

  // Selection & Camera State
  const [selectedStation, setSelectedStation] = useState<ObservationStation | null>(() => getAutoTrackingStation(DEFAULT_START_SECONDS));
  const [customStation, setCustomStation] = useState<ObservationStation | null>(null);
  const [cameraMode, setCameraMode] = useState<'free' | 'follow-shadow' | 'focused-station' | 'top-down' | 'spain-fixed' | 'polar' | 'iss' | 'concorde' | 'lunar-surface'>('follow-shadow');
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

  // New Feature UI State
  const [showNaturePanel, setShowNaturePanel] = useState<boolean>(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState<boolean>(false);

  // Renderer canvas ref for VideoRecorder
  const rendererCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const globeCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Diamond Ring & Shadow Bands triggers (based on C2/C3 times of active station)
  const { diamondRingState, shadowBandsState } = useMemo(() => {
    if (!activeStation) return { diamondRingState: null, shadowBandsState: null };
    const c2s = parseTimeToSeconds(activeStation.eclipseTimes.startTotality);
    const c3s = parseTimeToSeconds(activeStation.eclipseTimes.endTotality);
    const DIAMOND_WINDOW = 8;  // ±8s around contact
    const SHADOW_WINDOW  = 40; // ±40s around contact

    // Diamond Ring
    const nearC2 = Math.abs(currentTimestamp - c2s) <= DIAMOND_WINDOW;
    const nearC3 = Math.abs(currentTimestamp - c3s) <= DIAMOND_WINDOW;
    let diamondRingState = null;
    if (nearC2) {
      diamondRingState = { contact: 'c2' as const, progress: (currentTimestamp - (c2s - DIAMOND_WINDOW)) / (DIAMOND_WINDOW * 2) };
    } else if (nearC3) {
      diamondRingState = { contact: 'c3' as const, progress: (currentTimestamp - (c3s - DIAMOND_WINDOW)) / (DIAMOND_WINDOW * 2) };
    }

    // Shadow Bands
    const nearC2sb = Math.abs(currentTimestamp - c2s) <= SHADOW_WINDOW;
    const nearC3sb = Math.abs(currentTimestamp - c3s) <= SHADOW_WINDOW;
    let shadowBandsState = null;
    if (nearC2sb) {
      shadowBandsState = { progress: (currentTimestamp - (c2s - SHADOW_WINDOW)) / (SHADOW_WINDOW * 2) };
    } else if (nearC3sb) {
      shadowBandsState = { progress: (currentTimestamp - (c3s - SHADOW_WINDOW)) / (SHADOW_WINDOW * 2) };
    }

    return { diamondRingState, shadowBandsState };
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
      eclipseTimes: calculateCustomEclipseTimes(coords),
      maxSunAltitude: 20.0,
      isCustom: true
    };

    setCustomStation(newCustomStation);
    setSelectedStation(newCustomStation);
    setTrackingMode('manual');
    setCameraMode('focused-station');

    // Fetch live weather for custom pin
    fetchOpenMeteoForecast(coords.lat, coords.lon, 'custom-pin').then((forecast) => {
      if (forecast) {
        setWeatherData(prev => ({ ...prev, 'custom-pin': forecast }));
      }
    });
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

    // Fetch live weather for newly selected station
    if (!station.isCustom && station.id) {
      fetchOpenMeteoForecast(station.coords.lat, station.coords.lon, station.id).then((forecast) => {
        if (forecast) {
          setWeatherData(prev => ({ ...prev, [station.id]: forecast }));
        }
      });
    }
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

  // Audio engine: enable/disable on user toggle (must happen after gesture)
  useEffect(() => {
    const engine = audioEngineRef.current;
    if (isSoundEnabled) {
      engine.init().then(() => engine.enable());
    } else {
      engine.disable();
    }
  }, [isSoundEnabled]);

  // Audio engine: update phase in real-time
  useEffect(() => {
    if (!isSoundEnabled) return;
    audioEngineRef.current.update(telemetry.obscurationPercentage, telemetry.currentPhase);
  }, [isSoundEnabled, telemetry.obscurationPercentage, telemetry.currentPhase]);

  // Global Keyboard Shortcuts:
  // Space      → Play / Pause
  // ← / →     → Seek -60s / +60s
  // 1–7        → Select observation station by index
  // A          → Auto-tracking mode
  // R          → Reset camera
  // F          → Fullscreen toggle
  // S          → Spain Fixed view
  // ?          → Open attribution info modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;

        case 'ArrowLeft':
          e.preventDefault();
          setCurrentTimestamp(prev => Math.max(SIMULATION_START_SECONDS, prev - 60));
          break;

        case 'ArrowRight':
          e.preventDefault();
          setCurrentTimestamp(prev => Math.min(SIMULATION_END_SECONDS, prev + 60));
          break;

        case 'KeyA':
          handleSelectTrackingMode('auto');
          break;

        case 'KeyR':
          handleResetCamera();
          break;

        case 'KeyS':
          handleSelectTrackingMode('spain-fixed');
          break;

        case 'KeyF':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
          break;

        case 'Slash':
          if (e.shiftKey) setIsAttributionModalOpen(true);
          break;

        default: {
          // 1-7: station shortcuts
          const digit = parseInt(e.key, 10);
          if (!isNaN(digit) && digit >= 1 && digit <= 7) {
            const station = OBSERVATION_STATIONS[digit - 1];
            if (station) {
              setTrackingMode('manual');
              setCustomStation(null);
              setSelectedStation(station);
              setCameraMode('focused-station');
            }
          }
          break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectTrackingMode, handleResetCamera]);

  return (
    <div className="flex flex-col w-screen h-screen bg-[#050505] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Top Header Bar */}
      <HeaderClocks
        currentTimestamp={currentTimestamp}
        onResetCamera={handleResetCamera}
        onOpenInfo={() => setIsAttributionModalOpen(true)}
        onOpenViewfinder={() => setIsViewfinderOpen(true)}
        onOpenPlanner={() => setIsPlannerOpen(true)}
        onOpenPhotoGuide={() => setIsPhotoGuideOpen(true)}
        onOpenCertificate={() => setIsCertificateOpen(true)}
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
              setCameraMode(mode as any);
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
            onRendererReady={(canvas) => { rendererCanvasRef.current = canvas; globeCanvasRef.current = canvas; }}
          />
        </div>

        {/* Diamond Ring & Baily's Beads — full-screen canvas overlay near C2/C3 */}
        {diamondRingState && (
          <DiamondRingEffect
            isActive
            contact={diamondRingState.contact}
            progress={Math.min(1, Math.max(0, diamondRingState.progress))}
          />
        )}

        {/* Shadow Bands — animated ground-pattern near C2/C3 */}
        {shadowBandsState && (
          <ShadowBandsEffect
            isActive
            progress={Math.min(1, Math.max(0, shadowBandsState.progress))}
            sunAzimuth={180}
          />
        )}

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
            {/* Nature Behavior Panel */}
            <NatureBehaviorPanel
              telemetry={telemetry}
              isVisible={showNaturePanel}
            />
            {/* Video Recorder */}
            <VideoRecorder
              canvasRef={globeCanvasRef}
              isVisible={showVideoRecorder}
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

      {/* 4b. Totality Viewfinder Optical Telescope Modal */}
      {activeStation && (
        <TotalityViewfinderModal
          isOpen={isViewfinderOpen}
          onClose={() => setIsViewfinderOpen(false)}
          selectedStation={activeStation}
          telemetry={telemetry}
          currentTimestamp={currentTimestamp}
        />
      )}

      {/* 4c. Eclipse Chaser Travel Score Planner Modal */}
      <EclipsePlannerModal
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        onSelectStation={handleSelectStation}
      />

      {/* 4d. Solar Photography & Safety Filter Guide Modal */}
      <PhotographyGuideModal
        isOpen={isPhotoGuideOpen}
        onClose={() => setIsPhotoGuideOpen(false)}
        telemetry={telemetry}
      />

      {/* 4e. Observation Pass Certificate Exporter Modal */}
      {activeStation && (
        <ObservationCertificateModal
          isOpen={isCertificateOpen}
          onClose={() => setIsCertificateOpen(false)}
          selectedStation={activeStation}
          telemetry={telemetry}
          currentTimestamp={currentTimestamp}
        />
      )}

      {/* 5. Solar Oracle AI Chatbot Panel */}
      {activeStation && (
        <SolarOracleChat
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          selectedStation={activeStation}
          telemetry={telemetry}
          currentTimestamp={currentTimestamp}
        />
      )}

      {/* 6. Floating Action Buttons — bottom right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
        {/* Calendar Export */}
        {activeStation && (
          <button
            id="btn-calendar-export"
            onClick={() => downloadEclipseCalendar(activeStation)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold tracking-wider uppercase border transition-all shadow-lg bg-[#050505]/90 hover:bg-purple-500/15 text-slate-400 hover:text-purple-300 border-white/15 hover:border-purple-500/40"
            title="Download eclipse contact times as .ics calendar file"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Calendar</span>
          </button>
        )}

        {/* Nature Panel Toggle */}
        <button
          id="btn-nature-panel"
          onClick={() => setShowNaturePanel(p => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold tracking-wider uppercase border transition-all shadow-lg ${
            showNaturePanel
              ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60'
              : 'bg-[#050505]/90 hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-300 border-white/15 hover:border-emerald-500/40'
          }`}
          title="Toggle nature & wildlife behavior panel"
        >
          <Leaf className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nature</span>
        </button>

        {/* Video Recorder Toggle */}
        <button
          id="btn-video-recorder"
          onClick={() => setShowVideoRecorder(p => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold tracking-wider uppercase border transition-all shadow-lg ${
            showVideoRecorder
              ? 'bg-red-500/25 text-red-200 border-red-400/60'
              : 'bg-[#050505]/90 hover:bg-red-500/15 text-slate-400 hover:text-red-300 border-white/15 hover:border-red-500/40'
          }`}
          title="Record a 30-second video clip of the simulation"
        >
          <Video className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Record</span>
        </button>

        {/* Sound Toggle */}
        <button
          id="btn-sound-toggle"
          onClick={() => setIsSoundEnabled(p => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold tracking-wider uppercase border transition-all shadow-lg ${
            isSoundEnabled
              ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-[#050505]/90 hover:bg-white/10 text-slate-400 hover:text-white border-white/15'
          }`}
          title={isSoundEnabled ? 'Mute eclipse ambience audio' : 'Enable eclipse ambience audio (Web Audio)'}
        >
          {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isSoundEnabled ? 'Sound On' : 'Sound'}</span>
        </button>

        {/* Solar Oracle Chat Toggle */}
        <button
          id="btn-oracle-toggle"
          onClick={() => setIsChatOpen(p => !p)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs font-bold tracking-wider uppercase border transition-all shadow-xl ${
            isChatOpen
              ? 'bg-amber-500/30 text-amber-200 border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              : 'bg-[#050505]/90 hover:bg-amber-500/15 text-slate-300 hover:text-amber-300 border-white/15 hover:border-amber-500/40'
          }`}
          title="Open Solar Oracle — Gemini AI eclipse assistant"
        >
          <Bot className="w-4 h-4" />
          <span>Solar Oracle</span>
          {!isChatOpen && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
