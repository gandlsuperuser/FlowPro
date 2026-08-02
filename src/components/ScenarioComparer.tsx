'use client';

import React from 'react';
import { Scenario, HydraulicConfig, PipelineGeometry } from '../lib/types';
import { Layers, Zap, CheckCircle2, TrendingDown, ArrowRight, X } from 'lucide-react';

interface ScenarioComparerProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  onSelectScenario: (scenario: Scenario) => void;
  onClose: () => void;
}

export const ScenarioComparer: React.FC<ScenarioComparerProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden text-white space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Design Scenario Comparison Matrix</h2>
              <p className="text-xs text-slate-400">
                Compare pipe sizing, flow rates, pump counts, energy costs, and head loss trade-offs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((sc) => {
            const isActive = sc.id === activeScenarioId;
            const res = sc.result;

            return (
              <div
                key={sc.id}
                className={`relative bg-slate-950 rounded-xl border p-4 transition-all flex flex-col justify-between ${
                  isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-indigo-500/10 shadow-xl'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {isActive && (
                  <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active Model</span>
                  </span>
                )}

                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{sc.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{sc.description}</p>
                  </div>

                  {res && (
                    <div className="space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Pumps Required</span>
                        <span className="font-bold text-amber-400">{res.pumpsRequired} Stations</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Pipe Diameter</span>
                        <span className="font-semibold text-white">{sc.config.pipeDiameterInches} in</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Flow Rate</span>
                        <span className="font-semibold text-white">{sc.config.flowRateGPM} GPM</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Friction Loss</span>
                        <span className="font-mono text-cyan-300">{res.frictionHeadLossPer1000Ft} ft/1kft</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Total Dynamic Head</span>
                        <span className="font-mono text-cyan-300">{res.totalDynamicHeadFeet} ft</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Total Horsepower</span>
                        <span className="font-semibold text-emerald-400">{res.totalHorsepower} HP</span>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-800/60 pt-2">
                        <span className="text-slate-400">Annual Power Cost</span>
                        <span className="font-bold text-teal-300">${res.annualEnergyCostUSD.toLocaleString()} /yr</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Estimated CAPEX</span>
                        <span className="font-bold text-blue-400">${res.estimatedCapitalCostUSD.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    onSelectScenario(sc);
                    onClose();
                  }}
                  className={`mt-4 w-full py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <span>{isActive ? 'Currently Loaded' : 'Load This Scenario'}</span>
                  {!isActive && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
