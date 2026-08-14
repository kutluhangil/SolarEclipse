import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  CartesianGrid
} from 'recharts';
import { ObservationStation } from '../types';
import { calculateTelemetry, formatSecondsToUTC, parseTimeToSeconds } from '../utils/astronomy';
import { TrendingDown, Activity, Sparkles, Clock } from 'lucide-react';

interface TemperatureDropChartProps {
  selectedStation: ObservationStation;
  currentTimestamp: number;
  tempUnit: 'C' | 'F';
}

interface ChartPoint {
  timeSeconds: number;
  timeLabel: string;
  timeDisplay: string;
  tempDrop: number;
  absoluteTemp: number;
  obscuration: number;
  isCurrent?: boolean;
  phaseLabel?: string;
}

export const TemperatureDropChart: React.FC<TemperatureDropChartProps> = ({
  selectedStation,
  currentTimestamp,
  tempUnit
}) => {
  const [metricMode, setMetricMode] = useState<'drop' | 'absolute'>('drop');

  // Compute full eclipse time window and generate high-density curve data
  const chartData = useMemo(() => {
    const startSec = parseTimeToSeconds(selectedStation.eclipseTimes.startPartial) - 600; // 10 min before C1
    const endSec = parseTimeToSeconds(selectedStation.eclipseTimes.endPartial) + 600; // 10 min after C4
    const tTotalityStart = parseTimeToSeconds(selectedStation.eclipseTimes.startTotality);
    const tTotalityEnd = parseTimeToSeconds(selectedStation.eclipseTimes.endTotality);
    const tPeak = parseTimeToSeconds(selectedStation.eclipseTimes.peakTotality);

    const safeStart = startSec > 0 ? startSec : 57600; // 16:00 UTC fallback
    const safeEnd = endSec > safeStart ? endSec : 68400; // 19:00 UTC fallback

    const steps = 60;
    const stepDelta = (safeEnd - safeStart) / steps;
    const points: ChartPoint[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = safeStart + i * stepDelta;
      const telem = calculateTelemetry(
        selectedStation.coords,
        t,
        selectedStation.isCustom ? undefined : selectedStation.id
      );

      const meteo = telem.meteorology;
      const tempDrop = tempUnit === 'C'
        ? (meteo?.currentTempDropC ?? 0)
        : (meteo?.currentTempDropF ?? 0);

      const absoluteTemp = tempUnit === 'C'
        ? (meteo?.currentTempC ?? selectedStation.meteorology?.baselineTempC ?? 20)
        : (meteo?.currentTempF ?? ((selectedStation.meteorology?.baselineTempC ?? 20) * 1.8 + 32));

      // Format time label (e.g., 17:35)
      const date = new Date(t * 1000);
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const mins = String(date.getUTCMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${mins}`;

      let phaseLabel = '';
      if (Math.abs(t - tPeak) < stepDelta / 2) {
        phaseLabel = 'Totality Peak';
      } else if (Math.abs(t - tTotalityStart) < stepDelta / 2) {
        phaseLabel = 'C2 Totality Start';
      }

      points.push({
        timeSeconds: t,
        timeLabel: timeStr,
        timeDisplay: `${timeStr} UTC`,
        tempDrop: Math.round(tempDrop * 10) / 10,
        absoluteTemp: Math.round(absoluteTemp * 10) / 10,
        obscuration: telem.obscurationPercentage,
        phaseLabel
      });
    }

    return points;
  }, [selectedStation, tempUnit]);

  // Find nearest point on the curve to the current live simulation time
  const currentLivePoint = useMemo(() => {
    const telem = calculateTelemetry(
      selectedStation.coords,
      currentTimestamp,
      selectedStation.isCustom ? undefined : selectedStation.id
    );
    const meteo = telem.meteorology;
    const date = new Date(currentTimestamp * 1000);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const mins = String(date.getUTCMinutes()).padStart(2, '0');

    const tempDrop = tempUnit === 'C'
      ? (meteo?.currentTempDropC ?? 0)
      : (meteo?.currentTempDropF ?? 0);

    const absoluteTemp = tempUnit === 'C'
      ? (meteo?.currentTempC ?? selectedStation.meteorology?.baselineTempC ?? 20)
      : (meteo?.currentTempF ?? ((selectedStation.meteorology?.baselineTempC ?? 20) * 1.8 + 32));

    return {
      timeSeconds: currentTimestamp,
      timeLabel: `${hours}:${mins}`,
      timeDisplay: `${hours}:${mins} UTC`,
      tempDrop: Math.round(tempDrop * 10) / 10,
      absoluteTemp: Math.round(absoluteTemp * 10) / 10,
      obscuration: telem.obscurationPercentage
    };
  }, [selectedStation, currentTimestamp, tempUnit]);

  // Max peak drop value for reference line
  const maxProjectedDrop = useMemo(() => {
    if (metricMode === 'drop') {
      return tempUnit === 'C'
        ? (selectedStation.meteorology?.maxProjectedTempDropC ?? 4.0)
        : ((selectedStation.meteorology?.maxProjectedTempDropC ?? 4.0) * 1.8);
    } else {
      const base = selectedStation.meteorology?.baselineTempC ?? 25;
      const drop = selectedStation.meteorology?.maxProjectedTempDropC ?? 4.0;
      const minTemp = base - drop;
      return tempUnit === 'C' ? minTemp : (minTemp * 1.8 + 32);
    }
  }, [selectedStation, metricMode, tempUnit]);

  // Find closest timestamp label in chartData for the ReferenceLine
  const closestChartTimeLabel = useMemo(() => {
    if (!chartData.length) return '';
    let closest = chartData[0];
    let minDiff = Infinity;
    for (const pt of chartData) {
      const diff = Math.abs(pt.timeSeconds - currentTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    return closest.timeLabel;
  }, [chartData, currentTimestamp]);

  const unitLabel = tempUnit === 'C' ? '°C' : '°F';
  const dataKey = metricMode === 'drop' ? 'tempDrop' : 'absoluteTemp';

  return (
    <div id="temperature-drop-chart-container" className="bg-black/70 border border-white/15 rounded p-3 text-xs font-mono select-none">
      {/* Chart Top Controls & Metrics */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Activity className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
            Thermal Drop Curve
          </span>
        </div>

        {/* View Mode Toggle (Drop vs Absolute Temp) */}
        <div className="flex items-center gap-1 bg-black/80 p-0.5 rounded border border-white/15 text-[10px]">
          <button
            id="btn-metric-drop"
            onClick={() => setMetricMode('drop')}
            className={`px-1.5 py-0.5 rounded-sm transition-colors ${
              metricMode === 'drop'
                ? 'bg-rose-500/30 text-rose-200 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ΔT Drop
          </button>
          <button
            id="btn-metric-absolute"
            onClick={() => setMetricMode('absolute')}
            className={`px-1.5 py-0.5 rounded-sm transition-colors ${
              metricMode === 'absolute'
                ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ambient T
          </button>
        </div>
      </div>

      {/* Real-time Status Badge & Max Projected Drop indicator */}
      <div className="flex items-center justify-between text-[11px] mb-2 px-1 text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          <span className="text-slate-400 text-[10px] uppercase">Live At Time:</span>
          <span className="text-white font-bold">
            {metricMode === 'drop'
              ? `-${currentLivePoint.tempDrop.toFixed(1)}${unitLabel}`
              : `${currentLivePoint.absoluteTemp.toFixed(1)}${unitLabel}`}
          </span>
        </div>
        <div className="text-[10px] text-slate-400">
          {metricMode === 'drop' ? (
            <span>Max Drop: <strong className="text-rose-400">-{maxProjectedDrop.toFixed(1)}{unitLabel}</strong></span>
          ) : (
            <span>Min T: <strong className="text-cyan-300">{maxProjectedDrop.toFixed(1)}{unitLabel}</strong></span>
          )}
        </div>
      </div>

      {/* Recharts Area & Line Visualization */}
      <div className="w-full h-36 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
          >
            <defs>
              <linearGradient id="tempDropGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="tempAbsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="2 4"
              stroke="rgba(255,255,255,0.08)"
              vertical={false}
            />

            <XAxis
              dataKey="timeLabel"
              tick={{ fill: '#94a3b8', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
              interval="preserveStartEnd"
              minTickGap={20}
            />

            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
              domain={metricMode === 'drop' ? [0, 'auto'] : ['auto', 'auto']}
              tickFormatter={(v) => `${v}${unitLabel}`}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as ChartPoint;
                  return (
                    <div className="bg-[#050505]/95 border border-white/20 rounded p-2 text-[10px] font-mono shadow-2xl backdrop-blur-md">
                      <div className="flex items-center justify-between gap-3 text-cyan-300 font-bold border-b border-white/10 pb-1 mb-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{data.timeDisplay}</span>
                        </span>
                        <span className="text-amber-400">{data.obscuration.toFixed(1)}% Obsc</span>
                      </div>
                      <div className="flex justify-between gap-3 text-slate-300">
                        <span>Temp Drop (ΔT):</span>
                        <span className="text-rose-400 font-bold">-{data.tempDrop.toFixed(1)}{unitLabel}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-slate-300">
                        <span>Ambient Temp:</span>
                        <span className="text-cyan-200 font-bold">{data.absoluteTemp.toFixed(1)}{unitLabel}</span>
                      </div>
                      {data.phaseLabel && (
                        <div className="mt-1 pt-1 border-t border-white/10 text-amber-300 font-bold text-[9px] flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{data.phaseLabel}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Current Real-time cursor line */}
            {closestChartTimeLabel && (
              <ReferenceLine
                x={closestChartTimeLabel}
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{
                  value: 'NOW',
                  position: 'insideTop',
                  fill: '#38bdf8',
                  fontSize: 8,
                  fontWeight: 700
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={metricMode === 'drop' ? '#f43f5e' : '#06b6d4'}
              strokeWidth={2}
              fillOpacity={1}
              fill={metricMode === 'drop' ? 'url(#tempDropGrad)' : 'url(#tempAbsGrad)'}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Axis Footer Note */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1 border-t border-white/10 pt-1">
        <span>C1 (Partial Ingress)</span>
        <span className="text-amber-400 font-bold">● Totality Peak (Max Cooling)</span>
        <span>C4 (Egress)</span>
      </div>
    </div>
  );
};
