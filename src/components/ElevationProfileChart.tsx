'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import { HydraulicCalculationResult, PipelineGeometry, PipelineCoordinate } from '../lib/types';
import { TrendingUp, Mountain, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ElevationProfileChartProps {
  geometry: PipelineGeometry;
  hydraulics: HydraulicCalculationResult;
  onSelectCoordinate: (coord: PipelineCoordinate) => void;
}

export const ElevationProfileChart: React.FC<ElevationProfileChartProps> = ({
  geometry,
  hydraulics,
  onSelectCoordinate,
}) => {
  const isMetric = hydraulics.coordinates[0]?.elevation !== undefined && false; // checked via parent unit

  // Truncate coordinate data at the last pump station – anything beyond the last
  // pump is outside the designed pipeline and creates visual artifacts on the chart.
  const lastPumpIdx =
    hydraulics.pumps && hydraulics.pumps.length > 0
      ? hydraulics.pumps[hydraulics.pumps.length - 1].coordinateIndex
      : undefined;

  const relevantCoords =
    lastPumpIdx !== undefined && lastPumpIdx > 0 && lastPumpIdx < hydraulics.coordinates.length
      ? hydraulics.coordinates.slice(0, lastPumpIdx + 1)
      : hydraulics.coordinates;

  // Prepare chart data array – clamp pressure to 0 minimum so the line doesn't
  // produce wild negative swings (visual artifacts) past the last pump station.
  const chartData = relevantCoords.map((coord) => ({
    dist: coord.distanceFromStart,
    elevation: coord.elevation,
    pressure: Math.max(0, coord.pressure || 0),
    headLoss: coord.headLoss || 0,
    coord,
  }));

  const highPoint = geometry.stats.highPointCoords;
  const lowPoint = geometry.stats.lowPointCoords;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <Mountain className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">Terrain Elevation &amp; Hydraulic Grade Line (HGL) Profile</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            X-Axis: Cumulative Distance (mi) | Y-Axis Left: Ground Elevation (ft) | Y-Axis Right: Line Pressure (PSI)
          </p>
        </div>

        {/* Badges for High/Low/Pumps */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {highPoint && (
            <span className="bg-amber-950/80 border border-amber-800/80 text-amber-300 px-2 py-0.5 rounded flex items-center space-x-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
              <span>High: {highPoint.elev} ft (@ {highPoint.dist} mi)</span>
            </span>
          )}
          {lowPoint && (
            <span className="bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 px-2 py-0.5 rounded flex items-center space-x-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-indigo-400" />
              <span>Low: {lowPoint.elev} ft (@ {lowPoint.dist} mi)</span>
            </span>
          )}
          <span className="bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 px-2 py-0.5 rounded flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Pumps: {hydraulics.pumpsRequired} Stations</span>
          </span>
        </div>
      </div>

      {/* Recharts Chart Container */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload[0]) {
                const coord = e.activePayload[0].payload.coord;
                if (coord) onSelectCoordinate(coord);
              }
            }}
          >
            <defs>
              <linearGradient id="terrainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="dist" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v} mi`} />
            <YAxis yAxisId="elev" stroke="#38bdf8" fontSize={11} domain={['auto', 'auto']} unit=" ft" />
            <YAxis yAxisId="press" orientation="right" stroke="#34d399" fontSize={11} domain={[0, 'auto']} unit=" PSI" />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950/95 border border-slate-700 text-white rounded-lg p-2.5 shadow-2xl text-xs space-y-1">
                      <p className="font-bold text-cyan-300">Distance: {data.dist} mi</p>
                      <p className="text-slate-300">Ground Elevation: <span className="font-semibold text-white">{data.elevation} ft</span></p>
                      <p className="text-slate-300">Line Pressure: <span className="font-semibold text-emerald-400">{data.pressure} PSI</span></p>
                      <p className="text-slate-300">Accumulated Friction Loss: <span className="font-semibold text-amber-300">{data.headLoss} ft</span></p>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Terrain Elevation Area */}
            <Area yAxisId="elev" type="monotone" dataKey="elevation" stroke="#06b6d4" strokeWidth={2} fill="url(#terrainGrad)" name="Terrain Elevation (ft)" />

            {/* Line Pressure Profile Line */}
            <Line yAxisId="press" type="monotone" dataKey="pressure" stroke="#10b981" strokeWidth={2.5} dot={false} name="Line Pressure (PSI)" />

            {/* Reference Dots for Pumps */}
            {hydraulics.pumps.map((p) => (
              <ReferenceDot
                key={p.id}
                yAxisId="elev"
                x={p.distanceFromStart}
                y={p.elevation}
                r={6}
                fill="#f59e0b"
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
