'use client';

import React, { useState } from 'react';
import { HydraulicCalculationResult, HydraulicConfig, PipelineGeometry } from '../lib/types';
import { Zap, Cpu, DollarSign, Calculator, Layers, ChevronDown, ChevronUp, CheckCircle, ShieldCheck } from 'lucide-react';

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

  const isMetric = config.units === 'metric';
  const unitHead = isMetric ? 'm' : 'ft';
  const unitPress = isMetric ? 'Bar' : 'PSI';
  const unitFlow = isMetric ? 'L/s' : 'GPM';
  const unitDia = isMetric ? 'mm' : 'in';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white space-y-5">
      {/* Title */}
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

      {/* Metric Cards Grid */}
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

      {/* Transparent Math & Calculation Formulas Accordion */}
      {showMathDetails && (
        <div className="bg-slate-950 border border-cyan-900/60 rounded-xl p-4 space-y-3 text-xs text-slate-300">
          <div className="flex items-center space-x-2 font-bold text-cyan-400 border-b border-slate-800 pb-2">
            <Calculator className="w-4 h-4" />
            <span>Transparent Hazen-Williams Hydraulic Formulas &amp; Equations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="font-semibold text-white">1. Hazen-Williams Friction Head Loss (Imperial):</p>
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

      {/* Recommended Pumps Schedule Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Recommended Booster Pump Locations &amp; Sizing Schedule
          </h3>
          <span className="text-[10px] text-slate-400">
            Maintains pressure between {config.minPressurePSI} and {config.maxPressurePSI} {unitPress}
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">Pump #</th>
                <th className="px-3 py-2.5">Station Type</th>
                <th className="px-3 py-2.5">Location (mi)</th>
                <th className="px-3 py-2.5">Elevation</th>
                <th className="px-3 py-2.5">Suction Press</th>
                <th className="px-3 py-2.5">Discharge Press</th>
                <th className="px-3 py-2.5">Required Boost</th>
                <th className="px-3 py-2.5">Power</th>
                <th className="px-3 py-2.5">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {hydraulics.pumps.map((pump) => (
                <tr key={pump.id} className="hover:bg-slate-850/60 transition-colors">
                  <td className="px-3 py-2.5 font-bold text-amber-400">P{pump.pumpNumber}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${pump.type === 'Intake Station' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'}`}>
                      {pump.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-cyan-300">{pump.distanceFromStart} mi</td>
                  <td className="px-3 py-2.5 font-mono">{pump.elevation} {unitHead}</td>
                  <td className="px-3 py-2.5 font-mono">{pump.suctionPressure} {unitPress}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-emerald-400">{pump.dischargePressure} {unitPress}</td>
                  <td className="px-3 py-2.5 font-mono text-amber-300">+{pump.requiredHeadBoost} {unitHead}</td>
                  <td className="px-3 py-2.5 font-bold text-white">{pump.horsepower} HP</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400">${pump.estimatedCost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
