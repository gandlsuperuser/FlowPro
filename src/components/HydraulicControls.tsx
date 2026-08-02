'use client';

import React from 'react';
import { HydraulicConfig, PipeMaterialSpec } from '../lib/types';
import { PIPE_MATERIALS } from '../lib/hydraulics/hazenWilliams';
import { Sliders, Gauge, Droplet, ShieldAlert, DollarSign, Settings2 } from 'lucide-react';

interface HydraulicControlsProps {
  config: HydraulicConfig;
  onChangeConfig: (newConfig: HydraulicConfig) => void;
}

export const HydraulicControls: React.FC<HydraulicControlsProps> = ({ config, onChangeConfig }) => {
  const isMetric = config.units === 'metric';

  const handleChange = (key: keyof HydraulicConfig, value: any) => {
    onChangeConfig({
      ...config,
      [key]: value,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">Hydraulic Calculator &amp; Pipe Configuration</h2>
        </div>
        <span className="text-[11px] text-cyan-300 font-semibold bg-cyan-950 border border-cyan-800/80 px-2 py-0.5 rounded">
          Live Recalculation Engine
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Water Flow & Pipe Sizing */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-cyan-300">
            <Droplet className="w-4 h-4 text-cyan-400" />
            <span>Water Flow &amp; Pipe Specs</span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Flow Rate ({isMetric ? 'L/s' : 'GPM'})
            </label>
            <input
              type="number"
              value={config.flowRateGPM}
              onChange={(e) => handleChange('flowRateGPM', Math.max(1, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Inner Pipe Diameter ({isMetric ? 'mm' : 'inches'})
            </label>
            <input
              type="number"
              step={isMetric ? 5 : 0.5}
              value={config.pipeDiameterInches}
              onChange={(e) => handleChange('pipeDiameterInches', Math.max(0.5, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Pipe Material &amp; C-Factor</label>
            <select
              value={config.pipeMaterial}
              onChange={(e) => {
                const mat = PIPE_MATERIALS.find((m) => m.name === e.target.value);
                onChangeConfig({
                  ...config,
                  pipeMaterial: e.target.value,
                  cFactor: mat ? mat.cFactor : config.cFactor,
                });
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              {PIPE_MATERIALS.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} (C = {m.cFactor})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Pump Target Pressures */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-300">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span>Target Line Pressure (HGL)</span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Desired Constant Pressure ({isMetric ? 'Bar' : 'PSI'})
            </label>
            <input
              type="number"
              step="any"
              value={config.desiredPressurePSI}
              onChange={(e) => handleChange('desiredPressurePSI', Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-emerald-400 font-bold font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                Min Pressure ({isMetric ? 'Bar' : 'PSI'})
              </label>
              <input
                type="number"
                value={config.minPressurePSI}
                onChange={(e) => handleChange('minPressurePSI', Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                Max Pressure ({isMetric ? 'Bar' : 'PSI'})
              </label>
              <input
                type="number"
                value={config.maxPressurePSI}
                onChange={(e) => handleChange('maxPressurePSI', Math.max(10, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. Pump Efficiency & Energy Cost */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>Efficiency &amp; Power Cost</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Pump Efficiency (%)</label>
              <input
                type="number"
                value={config.pumpEfficiencyPct}
                onChange={(e) => handleChange('pumpEfficiencyPct', Math.min(99, Math.max(10, parseFloat(e.target.value) || 0)))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Safety Factor</label>
              <input
                type="number"
                step="0.05"
                value={config.safetyFactor}
                onChange={(e) => handleChange('safetyFactor', Math.max(1.0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Electricity Cost ($ / kWh)</label>
            <input
              type="number"
              step="0.01"
              value={config.electricityCostPerKwh}
              onChange={(e) => handleChange('electricityCostPerKwh', Math.max(0.01, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
