'use client';

import React, { useState } from 'react';
import { HydraulicCalculationResult, HydraulicConfig, PipelineGeometry } from '../lib/types';
import { Zap, Calculator, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface PumpOptimizationSummaryProps {
  geometry: PipelineGeometry;
  hydraulics: HydraulicCalculationResult;
  config: HydraulicConfig;
}

export const PumpOptimizationSummary: React.FC<PumpOptimizationSummaryProps> = ({
  geometry,
  hydraulics,
  config,
}) => {
  const [showMathDetails, setShowMathDetails] = useState(false);
  const [notes, setNotes] = useState<string>(
    `Hazen-Williams Hydraulic Solver (C=${config.cFactor}) | Flow: ${config.flowRateGPM} ${config.units === 'metric' ? 'L/s' : 'GPM'} | Pipe: ${config.pipeDiameterInches}" ${config.pipeMaterial}`
  );

  const isMetric = config.units === 'metric';
  const unitHead = isMetric ? 'm' : 'ft';
  const unitPress = isMetric ? 'Bar' : 'PSI';
  const unitFlow = isMetric ? 'L/s' : 'GPM';

  const coords = geometry.coordinates;
  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];

  // Calculate table segment rows matching the exact engineering spreadsheet spec
  const segmentRows = hydraulics.pumps.map((pump, idx) => {
    const isLast = idx === hydraulics.pumps.length - 1;
    const nextPump = !isLast ? hydraulics.pumps[idx + 1] : null;

    const setDist = pump.distanceFromStart;
    const endingDist = nextPump ? nextPump.distanceFromStart : geometry.stats.totalLength;
    const pushedDist = Number((endingDist - setDist).toFixed(2));

    const startElev = Math.round(pump.elevation);
    const endElev = nextPump ? Math.round(nextPump.elevation) : Math.round(lastCoord?.elevation || pump.elevation);
    const elevDelta = endElev - startElev;

    const pressureVal = Math.round(pump.dischargePressure);
    const headVal = Math.round(isMetric ? pump.requiredHeadBoost : pump.dischargePressure * 2.31);

    return {
      setAt: idx === 0 ? 'ADD for Pit' : 'ADD for Pit',
      pumpName: `P${pump.pumpNumber}`,
      rpm: 1250,
      setDist: `${setDist.toFixed(2)} mi`,
      pushedDist: `${pushedDist.toFixed(2)} mi`,
      endingDist: `${endingDist.toFixed(2)} mi`,
      startElev: `${startElev.toLocaleString()} ${unitHead}`,
      endElev: `${endElev.toLocaleString()} ${unitHead}`,
      elevDeltaNum: elevDelta,
      elevDeltaStr: elevDelta > 0 ? `${elevDelta}` : `${elevDelta}`,
      pressure: pressureVal,
      head: headVal,
    };
  });

  const totalElevDelta = segmentRows.reduce((acc, r) => acc + r.elevDeltaNum, 0);
  const totalPressure = Math.round(
    isMetric ? hydraulics.totalDynamicHeadFeet * 0.0298 : hydraulics.totalDynamicHeadFeet / 2.31
  );
  const totalHead = Math.round(isMetric ? hydraulics.totalDynamicHeadFeet * 0.3048 : hydraulics.totalDynamicHeadFeet);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white space-y-5">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-100">
              Optimal Booster Pump Placement &amp; Hydraulic Summary
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated Hazen-Williams friction loss calculation &amp; pressure stabilization solver
          </p>
        </div>

        <button
          onClick={() => setShowMathDetails(!showMathDetails)}
          className="flex items-center space-x-1.5 text-xs text-cyan-300 bg-cyan-950 border border-cyan-800/80 px-3 py-1.5 rounded-lg hover:bg-cyan-900 transition-colors self-start md:self-auto"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>{showMathDetails ? 'Hide' : 'Show'} Hazen-Williams Math Formulas</span>
          {showMathDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Pumps Required</p>
          <p className="text-xl font-bold text-amber-400 mt-1">{hydraulics.pumpsRequired}</p>
          <p className="text-[9px] text-slate-500 mt-0.5">Automated Spacing</p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Total Dynamic Head</p>
          <p className="text-xl font-bold text-cyan-400 mt-1">
            {hydraulics.totalDynamicHeadFeet} <span className="text-xs">{unitHead}</span>
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">Static + Friction Lift</p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Total Horsepower</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">
            {hydraulics.totalHorsepower} <span className="text-xs">HP</span>
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">@{config.pumpEfficiencyPct}% Eff</p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Friction Loss Rate</p>
          <p className="text-xl font-bold text-indigo-400 mt-1">
            {hydraulics.frictionHeadLossPer1000Ft} <span className="text-xs">{unitHead}/1kft</span>
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">C = {config.cFactor}</p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Annual Power Cost</p>
          <p className="text-xl font-bold text-teal-400 mt-1">
            ${(hydraulics.annualEnergyCostUSD / 1000).toFixed(1)}k <span className="text-xs">/yr</span>
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">{hydraulics.annualEnergyConsumptionKWh.toLocaleString()} kWh</p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-400 font-medium">Est. Capital Expense</p>
          <p className="text-xl font-bold text-blue-400 mt-1">
            ${(hydraulics.estimatedCapitalCostUSD / 1000).toFixed(0)}k
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">CAPEX Hardware</p>
        </div>
      </div>

      {/* Calculation Formulas Accordion */}
      {showMathDetails && (
        <div className="bg-slate-950 border border-cyan-900/60 rounded-xl p-4 space-y-3 text-xs text-slate-300">
          <div className="flex items-center space-x-2 font-bold text-cyan-400 border-b border-slate-800 pb-2">
            <Calculator className="w-4 h-4" />
            <span>Transparent Hazen-Williams Hydraulic Formulas &amp; Equations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="font-semibold text-white">1. Hazen-Williams Friction Head Loss:</p>
              <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-cyan-300 border border-slate-800">
                h_f = 0.002083 × L × (100 / C)^1.852 × (Q^1.852 / d^4.8655)
              </div>
              <p className="text-[11px] text-slate-400">
                Where Q = {config.flowRateGPM} GPM, d = {config.pipeDiameterInches} in, C = {config.cFactor}. Calculated loss ={' '}
                <strong className="text-white">{hydraulics.frictionHeadLossPer1000Ft} ft per 1,000 ft</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-white">2. Motor Horsepower Equation:</p>
              <div className="bg-slate-900 p-2.5 rounded font-mono text-[11px] text-emerald-300 border border-slate-800">
                HP = (Q × TDH) / (3960 × Efficiency × SafetyFactor)
              </div>
              <p className="text-[11px] text-slate-400">
                Where TDH = {hydraulics.totalDynamicHeadFeet} ft, Efficiency = {config.pumpEfficiencyPct}%, SF = {config.safetyFactor}. Calculated Total HP ={' '}
                <strong className="text-white">{hydraulics.totalHorsepower} HP</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Engineering Pump Schedule Table (Exact Match to User Reference Spec) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Pump Location Summary Table
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            {geometry.name} ({config.flowRateGPM} {unitFlow} @ {config.pipeDiameterInches}&quot;)
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg shadow-2xl">
          <table className="w-full text-center text-xs font-sans border-collapse">
            {/* Header Row (Blue Spec) */}
            <thead className="bg-[#3b82f6] text-slate-950 font-extrabold border-b border-slate-700">
              <tr>
                <th className="px-3 py-2 border-r border-slate-700/60">Set @</th>
                <th className="px-3 py-2 border-r border-slate-700/60">Pump</th>
                <th className="px-3 py-2 border-r border-slate-700/60">RPM</th>
                <th className="px-3 py-2 border-r border-slate-700/60">Set</th>
                <th className="px-3 py-2 border-r border-slate-700/60">Pushed</th>
                <th className="px-3 py-2 border-r border-slate-700/60">Ending</th>
                <th className="px-3 py-2 border-r border-slate-700/60">Start Elev</th>
                <th className="px-3 py-2 border-r border-slate-700/60">End Elev</th>
                <th className="px-3 py-2 border-r border-slate-700/60">Elev ▲</th>
                <th className="px-3 py-2 border-r border-slate-700/60">Pressure</th>
                <th className="px-3 py-2">Head</th>
              </tr>
            </thead>

            <tbody>
              {/* Black Sub-Header Banner Row */}
              <tr className="bg-black text-white font-bold border-b border-slate-700">
                <td colSpan={11} className="py-1.5 px-4 text-center tracking-wide text-xs">
                  {geometry.name} ({config.flowRateGPM} {unitFlow} - {config.pipeDiameterInches}&quot; Line)
                </td>
              </tr>

              {/* Data Rows */}
              {segmentRows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-slate-800 transition-colors ${
                    idx % 2 === 0 ? 'bg-slate-900/90' : 'bg-slate-950/90'
                  } hover:bg-slate-850`}
                >
                  <td className="px-3 py-2 font-bold text-slate-100 text-left border-r border-slate-800">
                    {row.setAt}
                  </td>
                  <td className="px-3 py-2 font-bold text-amber-400 border-r border-slate-800">
                    {row.pumpName}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-300 border-r border-slate-800">
                    {row.rpm}
                  </td>
                  <td className="px-3 py-2 font-mono text-sky-300 border-r border-slate-800">
                    {row.setDist}
                  </td>
                  <td className="px-3 py-2 font-mono text-sky-300 border-r border-slate-800">
                    {row.pushedDist}
                  </td>
                  <td className="px-3 py-2 font-mono text-sky-300 border-r border-slate-800">
                    {row.endingDist}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-200 border-r border-slate-800">
                    {row.startElev}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-200 border-r border-slate-800">
                    {row.endElev}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-100 font-bold border-r border-slate-800">
                    {row.elevDeltaStr}
                  </td>
                  <td className="px-3 py-2 font-mono text-emerald-400 font-bold border-r border-slate-800">
                    {row.pressure}
                  </td>
                  <td className="px-3 py-2 font-mono text-cyan-300 font-bold">
                    {row.head}
                  </td>
                </tr>
              ))}

              {/* Total / Factor Summary Row (Green Highlight Boxes for Pressure & Head) */}
              <tr className="bg-slate-950 font-bold border-t-2 border-slate-700">
                <td className="px-3 py-2 text-cyan-400 bg-sky-950/80 font-bold border-r border-slate-800 text-left">
                  Pit
                </td>
                <td className="px-3 py-2 text-cyan-300 bg-sky-950/80 border-r border-slate-800">
                  {hydraulics.pumpsRequired}x{Math.round(config.flowRateGPM * 4)}
                </td>
                <td className="px-3 py-2 text-cyan-300 bg-sky-950/80 border-r border-slate-800">
                  1250
                </td>
                <td colSpan={5} className="px-3 py-2 text-slate-200 bg-slate-900 border-r border-slate-800 font-semibold text-center italic">
                  factor above elevations changes
                </td>
                <td className="px-3 py-2 font-mono text-white bg-slate-850 border-r border-slate-800">
                  {totalElevDelta > 0 ? `+${totalElevDelta}` : totalElevDelta}
                </td>
                <td className="px-3 py-2 font-mono text-white bg-[#2e7d32] border-r border-slate-800 font-extrabold text-sm">
                  {totalPressure}
                </td>
                <td className="px-3 py-2 font-mono text-white bg-[#2e7d32] font-extrabold text-sm">
                  {totalHead}
                </td>
              </tr>

              {/* Editable Notes Row */}
              <tr className="bg-slate-900 border-t border-slate-800">
                <td colSpan={11} className="p-2.5 text-left">
                  <div className="flex items-center space-x-2 mb-1 text-[11px] font-bold text-slate-300">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Notes:</span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 font-mono focus:border-cyan-500 focus:outline-none resize-none"
                    placeholder="Enter engineering notes or operational comments..."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
