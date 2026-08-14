import React, { useState, useEffect } from 'react';
import { RotateCcw, Maximize2, Minimize2, Info } from 'lucide-react';

interface HeaderClocksProps {
  currentTimestamp: number;
  onResetCamera?: () => void;
  onOpenInfo?: () => void;
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
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

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

      {/* Right Controls: Info Button, Reset Button and Toggle Fullscreen Button */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
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
