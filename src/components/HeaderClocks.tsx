import React, { useEffect, useState } from 'react';
import { Award, Camera, Eye, Globe, Info, Maximize2, Minimize2, Navigation, RotateCcw } from 'lucide-react';
import { getLanguage, setLanguage, SupportedLanguage } from '../utils/i18n';

interface HeaderClocksProps {
  currentTimestamp: number;
  onResetCamera?: () => void;
  onOpenInfo?: () => void;
  onOpenViewfinder?: () => void;
  onOpenPlanner?: () => void;
  onOpenPhotoGuide?: () => void;
  onOpenCertificate?: () => void;
}

interface TimeComponent {
  timeStr: string;
  ampm: string;
}

function getTimeComponentsForOffset(utcSeconds: number, offsetHours: number): TimeComponent {
  const localSeconds = ((utcSeconds + offsetHours * 3600) % 86400 + 86400) % 86400;
  const h24 = Math.floor(localSeconds / 3600) % 24;
  const mins = Math.floor((localSeconds % 3600) / 60);

  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;

  return {
    timeStr: `${h12}:${String(mins).padStart(2, '0')}`,
    ampm,
  };
}

export const HeaderClocks: React.FC<HeaderClocksProps> = ({
  currentTimestamp,
  onResetCamera,
  onOpenInfo,
  onOpenViewfinder,
  onOpenPlanner,
  onOpenPhotoGuide,
  onOpenCertificate,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lang, setLangState] = useState<SupportedLanguage>(getLanguage());

  const handleLangChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setLangState(newLang);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Greenland (East Greenland / Totality Path on Aug 12 is GMT-1 / UTC-1)
  const greenlandTime = getTimeComponentsForOffset(currentTimestamp, -1);
  // Iceland (GMT / UTC+0)
  const icelandTime = getTimeComponentsForOffset(currentTimestamp, 0);
  // Spain (CEST / UTC+2)
  const spainTime = getTimeComponentsForOffset(currentTimestamp, 2);

  return (
    <header className="w-full bg-black border-b border-white/15 px-2 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between z-30 text-white font-sans select-none shrink-0 shadow-2xl relative">
      {/* Spacer on left for symmetry on wide screens */}
      <div className="hidden lg:flex items-center w-36 shrink-0" />

      {/* Main Centered Clocks Bar: responsive, non-wrapping, jitter-free with tight unified units */}
      <div className="flex-1 flex items-center justify-center flex-nowrap gap-2 sm:gap-5 md:gap-8 lg:gap-12 min-w-0">
        {/* Date: AUG 12, 2026 */}
        <div className="shrink-0 text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold text-slate-200 tracking-wider uppercase whitespace-nowrap">
          AUG 12, 2026
        </div>

        {/* 1. Greenland: 🇬🇱 3:00 PM WGST (GMT-1) */}
        <div className="flex items-center shrink-0">
          <span className="text-sm sm:text-lg md:text-2xl lg:text-3xl leading-none select-none drop-shadow-sm mr-1 sm:mr-1.5" role="img" aria-label="Greenland flag">
            🇬🇱
          </span>
          <span className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-none tabular-nums font-mono sm:font-sans">
            {greenlandTime.timeStr}
          </span>
          <div className="ml-1 flex flex-col justify-center text-left leading-[1.05] shrink-0">
            <span className="text-[8px] sm:text-[9px] md:text-[11px] lg:text-xs font-bold text-white tracking-tight uppercase leading-none">
              {greenlandTime.ampm}
            </span>
            <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-semibold text-slate-300 tracking-tight uppercase leading-none mt-0.5">
              WGST
            </span>
          </div>
        </div>

        {/* 2. Iceland: 🇮🇸 4:00 PM GMT (GMT+0) */}
        <div className="flex items-center shrink-0">
          <span className="text-sm sm:text-lg md:text-2xl lg:text-3xl leading-none select-none drop-shadow-sm mr-1 sm:mr-1.5" role="img" aria-label="Iceland flag">
            🇮🇸
          </span>
          <span className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-none tabular-nums font-mono sm:font-sans">
            {icelandTime.timeStr}
          </span>
          <div className="ml-1 flex flex-col justify-center text-left leading-[1.05] shrink-0">
            <span className="text-[8px] sm:text-[9px] md:text-[11px] lg:text-xs font-bold text-white tracking-tight uppercase leading-none">
              {icelandTime.ampm}
            </span>
            <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-semibold text-slate-300 tracking-tight uppercase leading-none mt-0.5">
              GMT
            </span>
          </div>
        </div>

        {/* 3. Spain: 🇪🇸 6:00 PM CEST (GMT+2) */}
        <div className="flex items-center shrink-0">
          <span className="text-sm sm:text-lg md:text-2xl lg:text-3xl leading-none select-none drop-shadow-sm mr-1 sm:mr-1.5" role="img" aria-label="Spain flag">
            🇪🇸
          </span>
          <span className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-bold text-white tracking-tight leading-none tabular-nums font-mono sm:font-sans">
            {spainTime.timeStr}
          </span>
          <div className="ml-1 flex flex-col justify-center text-left leading-[1.05] shrink-0">
            <span className="text-[8px] sm:text-[9px] md:text-[11px] lg:text-xs font-bold text-white tracking-tight uppercase leading-none">
              {spainTime.ampm}
            </span>
            <span className="text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] font-semibold text-slate-300 tracking-tight uppercase leading-none mt-0.5">
              CEST
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls: Language Selector & Feature Modals */}
      <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0">
        {/* Language Switcher Dropdown */}
        <div className="relative flex items-center bg-white/5 border border-white/15 rounded-sm px-1.5 py-0.5 font-mono text-[10px]">
          <Globe className="w-3 h-3 text-cyan-400 mr-1" />
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value as SupportedLanguage)}
            className="bg-transparent text-white font-bold cursor-pointer focus:outline-none uppercase"
          >
            <option value="TR" className="bg-[#050505] text-white">TR (TR)</option>
            <option value="EN" className="bg-[#050505] text-white">EN (EN)</option>
            <option value="ES" className="bg-[#050505] text-white">ES (ES)</option>
            <option value="IS" className="bg-[#050505] text-white">IS (IS)</option>
          </select>
        </div>

        {/* Feature Launchers */}
        {onOpenViewfinder && (
          <button
            onClick={onOpenViewfinder}
            className="flex items-center gap-1 px-2 py-1 rounded-sm bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 transition-all text-[10px] font-mono font-bold"
            title="Open Telescopic Solar Viewfinder"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden xl:inline">Telescope</span>
          </button>
        )}

        {onOpenPlanner && (
          <button
            onClick={onOpenPlanner}
            className="flex items-center gap-1 px-2 py-1 rounded-sm bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all text-[10px] font-mono font-bold"
            title="Open Eclipse Chaser Travel Planner"
          >
            <Navigation className="w-3 h-3" />
            <span className="hidden xl:inline">Planner</span>
          </button>
        )}

        {onOpenPhotoGuide && (
          <button
            onClick={onOpenPhotoGuide}
            className="flex items-center gap-1 px-2 py-1 rounded-sm bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 transition-all text-[10px] font-mono font-bold"
            title="Open Solar Photography Safety Guide"
          >
            <Camera className="w-3 h-3" />
            <span className="hidden xl:inline">Photo</span>
          </button>
        )}

        {onOpenCertificate && (
          <button
            onClick={onOpenCertificate}
            className="flex items-center gap-1 px-2 py-1 rounded-sm bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 transition-all text-[10px] font-mono font-bold"
            title="Generate Observation Pass Certificate"
          >
            <Award className="w-3 h-3" />
            <span className="hidden xl:inline">Pass</span>
          </button>
        )}

        {onOpenInfo && (
          <button
            onClick={onOpenInfo}
            className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 hover:border-white/30 transition-all text-[10px] sm:text-[11px] uppercase tracking-wider font-medium font-mono"
            title="Data Sources & Attributions"
          >
            <Info className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Info</span>
          </button>
        )}

        {onResetCamera && (
          <button
            onClick={onResetCamera}
            className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 hover:border-white/30 transition-all text-[10px] sm:text-[11px] uppercase tracking-wider font-medium font-mono"
            title="Reset Camera & Auto-tracking"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/15 hover:border-white/30 transition-all text-[10px] sm:text-[11px] uppercase tracking-wider font-medium font-mono"
          title={isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3 h-3 text-amber-400" />
          ) : (
            <Maximize2 className="w-3 h-3 text-amber-400" />
          )}
          <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
        </button>
      </div>
    </header>
  );
};
