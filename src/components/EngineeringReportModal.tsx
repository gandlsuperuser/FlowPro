'use client';

import React from 'react';
import { HydraulicCalculationResult, PipelineGeometry, HydraulicConfig } from '../lib/types';
import {
  exportToPDFReport,
  exportToExcel,
  exportToCSV,
  exportToGeoJSON,
  exportToKML,
} from '../lib/export/reportGenerator';
import { Download, FileText, Table, Map, FileCode, X, CheckCircle, Award } from 'lucide-react';

interface EngineeringReportModalProps {
  geometry: PipelineGeometry;
  hydraulics: HydraulicCalculationResult;
  config: HydraulicConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const EngineeringReportModal: React.FC<EngineeringReportModalProps> = ({
  geometry,
  hydraulics,
  config,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden text-white space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Engineering Report &amp; Data Export Hub</h2>
              <p className="text-xs text-slate-400">
                Generate professional engineering documentation and export multi-format spatial GIS assets
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

        {/* Executive Summary Preview */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs text-slate-300">
          <p className="font-bold text-white text-sm">Project: {geometry.name}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-slate-800/80 pt-2">
            <div>
              <p className="text-[10px] text-slate-400">Total Distance</p>
              <p className="font-bold text-cyan-300">{geometry.stats.totalLength} miles</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Pumps Required</p>
              <p className="font-bold text-amber-400">{hydraulics.pumpsRequired} Stations</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Total Dynamic Head</p>
              <p className="font-bold text-white">{hydraulics.totalDynamicHeadFeet} ft</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Annual Power Cost</p>
              <p className="font-bold text-emerald-400">${hydraulics.annualEnergyCostUSD.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Export Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* PDF Report */}
          <button
            onClick={() => exportToPDFReport(geometry, hydraulics, config)}
            className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500 text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Engineering PDF Report</p>
              <p className="text-[10px] text-slate-400">Printable summary, pump schedule &amp; calculations</p>
            </div>
          </button>

          {/* Excel Export */}
          <button
            onClick={() => exportToExcel(geometry, hydraulics, config)}
            className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500 text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-950 border border-teal-800 text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Excel Workbook (.xlsx)</p>
              <p className="text-[10px] text-slate-400">Multi-sheet summary, pumps &amp; profile data</p>
            </div>
          </button>

          {/* CSV Export */}
          <button
            onClick={() => exportToCSV(geometry, hydraulics)}
            className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500 text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Raw Data CSV</p>
              <p className="text-[10px] text-slate-400">Full coordinate-by-coordinate table</p>
            </div>
          </button>

          {/* GeoJSON Export */}
          <button
            onClick={() => exportToGeoJSON(geometry, hydraulics)}
            className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500 text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">GeoJSON Spatial File</p>
              <p className="text-[10px] text-slate-400">LineString &amp; Pump Point features</p>
            </div>
          </button>

          {/* KML Export */}
          <button
            onClick={() => exportToKML(geometry, hydraulics)}
            className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500 text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Optimized KML File</p>
              <p className="text-[10px] text-slate-400">Import into Google Earth &amp; CAD</p>
            </div>
          </button>

          {/* Raw Project JSON */}
          <button
            onClick={() => {
              const data = JSON.stringify({ geometry, hydraulics, config }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${geometry.name.replace(/\s+/g, '_')}_full_project.json`;
              a.click();
            }}
            className="flex items-center space-x-3 p-3.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-500 text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-slate-850 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Project JSON Config</p>
              <p className="text-[10px] text-slate-400">Complete pipeline state backup</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
