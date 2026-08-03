'use client';

import React from 'react';
import { UnitSystem, PipelineGeometry } from '../lib/types';
import { Activity, Layers, Bot, Download, Cpu, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentPipeline: PipelineGeometry;
  samplePipelines: PipelineGeometry[];
  onSelectPipeline: (pipeline: PipelineGeometry) => void;
  unitSystem: UnitSystem;
  onToggleUnitSystem: (units: UnitSystem) => void;
  onOpenAiAssistant: () => void;
  onOpenReportModal: () => void;
  onToggleScenarioView: () => void;
  isScenarioViewOpen: boolean;
  isFetchingUsgs: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentPipeline,
  samplePipelines,
  onSelectPipeline,
  unitSystem,
  onToggleUnitSystem,
  onOpenAiAssistant,
  onOpenReportModal,
  onToggleScenarioView,
  isScenarioViewOpen,
  isFetchingUsgs,
}) => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-40 px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and App Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-cyan-500/20 shadow-lg flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                HydroElevation AI
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                v2.5 Pro
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Terrain Elevation Analysis &amp; Water Pump Optimization
            </p>
          </div>
        </div>

        {/* Dataset Selector & Controls */}
        <div className="flex items-center flex-wrap justify-center gap-2">


          {/* Unit Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => onToggleUnitSystem('imperial')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                unitSystem === 'imperial'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Imperial (PSI/GPM)
            </button>
            <button
              onClick={() => onToggleUnitSystem('metric')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                unitSystem === 'metric'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Metric (Bar/L/s)
            </button>
          </div>

          {/* Scenario Comparison View Button */}
          <button
            onClick={onToggleScenarioView}
            className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              isScenarioViewOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20 shadow-md'
                : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scenarios</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white border border-cyan-400/30 shadow-md shadow-cyan-900/30 transition-all"
          >
            <Bot className="w-3.5 h-3.5 animate-bounce" />
            <span>AI Engineer</span>
            <Sparkles className="w-3 h-3 text-cyan-200" />
          </button>

          {/* Report & Export Button */}
          <button
            onClick={onOpenReportModal}
            className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/30 shadow-md shadow-emerald-900/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* USGS Loading Banner */}
      {isFetchingUsgs && (
        <div className="mt-2 text-center text-xs text-cyan-300 bg-cyan-950/80 border border-cyan-800 py-1 px-3 rounded-md animate-pulse flex items-center justify-center space-x-2">
          <Cpu className="w-3.5 h-3.5 animate-spin" />
          <span>Fetching high-precision elevation data from USGS 3DEP Elevation REST API...</span>
        </div>
      )}
    </header>
  );
};
