'use client';

import React, { useState, useEffect } from 'react';
import { SAMPLE_PIPELINES } from '../data/samplePipelines';
import {
  PipelineGeometry,
  HydraulicConfig,
  HydraulicCalculationResult,
  UnitSystem,
  PipelineCoordinate,
  Scenario,
} from '../lib/types';
import { optimizePumpPlacement } from '../lib/hydraulics/pumpOptimizer';
import { createDefaultScenarios } from '../lib/scenarios/scenarioManager';

import { Header } from '../components/Header';
import { FileUploader } from '../components/FileUploader';
import { InteractiveMap } from '../components/InteractiveMap';
import { ElevationProfileChart } from '../components/ElevationProfileChart';
import { HydraulicControls } from '../components/HydraulicControls';
import { PumpOptimizationSummary } from '../components/PumpOptimizationSummary';
import { ScenarioComparer } from '../components/ScenarioComparer';
import { AiAssistantDrawer } from '../components/AiAssistantDrawer';
import { EngineeringReportModal } from '../components/EngineeringReportModal';
import { Mountain, Layers, Activity, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [pipelineList, setPipelineList] = useState<PipelineGeometry[]>(SAMPLE_PIPELINES);
  const [activePipeline, setActivePipeline] = useState<PipelineGeometry>(SAMPLE_PIPELINES[0]);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

  // Hydraulic Configuration state
  const [config, setConfig] = useState<HydraulicConfig>({
    units: 'imperial',
    flowRateGPM: 1500,
    pipeDiameterInches: 12.0,
    pipeMaterial: 'PVC / HDPE (Smooth Plastic)',
    cFactor: 150,
    desiredPressurePSI: 60,
    minPressurePSI: 25,
    maxPressurePSI: 120,
    pumpEfficiencyPct: 75,
    safetyFactor: 1.15,
    electricityCostPerKwh: 0.12,
  });

  const [hydraulicsResult, setHydraulicsResult] = useState<HydraulicCalculationResult | null>(null);
  const [selectedCoordinate, setSelectedCoordinate] = useState<PipelineCoordinate | null>(null);

  // Scenarios state
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('scenario-a');
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);

  // AI & Report Modals state
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);

  // Run Hydraulic Pump Placement Optimizer whenever pipeline or config changes
  useEffect(() => {
    if (activePipeline && activePipeline.coordinates.length > 0) {
      try {
        const result = optimizePumpPlacement(activePipeline.coordinates, config);
        setHydraulicsResult(result);

        // Generate baseline design scenarios
        const defaultScenarios = createDefaultScenarios(config, activePipeline.coordinates);
        setScenarios(defaultScenarios);
      } catch (err) {
        console.error('Error optimizing pump placement:', err);
      }
    }
  }, [activePipeline, config]);

  // Handle unit system switch
  const handleToggleUnitSystem = (units: UnitSystem) => {
    setUnitSystem(units);
    if (units === 'metric' && config.units === 'imperial') {
      setConfig((prev) => ({
        ...prev,
        units: 'metric',
        flowRateGPM: Number((prev.flowRateGPM / 15.8503).toFixed(1)), // GPM -> L/s
        pipeDiameterInches: Number((prev.pipeDiameterInches * 25.4).toFixed(0)), // in -> mm
        desiredPressurePSI: Number((prev.desiredPressurePSI / 14.5038).toFixed(1)), // PSI -> Bar
        minPressurePSI: Number((prev.minPressurePSI / 14.5038).toFixed(1)),
        maxPressurePSI: Number((prev.maxPressurePSI / 14.5038).toFixed(1)),
      }));
    } else if (units === 'imperial' && config.units === 'metric') {
      setConfig((prev) => ({
        ...prev,
        units: 'imperial',
        flowRateGPM: Math.round(prev.flowRateGPM * 15.8503),
        pipeDiameterInches: Number((prev.pipeDiameterInches / 25.4).toFixed(1)),
        desiredPressurePSI: Math.round(prev.desiredPressurePSI * 14.5038),
        minPressurePSI: Math.round(prev.minPressurePSI * 14.5038),
        maxPressurePSI: Math.round(prev.maxPressurePSI * 14.5038),
      }));
    }
  };

  const handlePipelineParsed = (newPipelines: PipelineGeometry[]) => {
    setPipelineList((prev) => [...newPipelines, ...prev]);
    setActivePipeline(newPipelines[0]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header */}
      <Header
        currentPipeline={activePipeline}
        samplePipelines={pipelineList}
        onSelectPipeline={(p) => {
          setActivePipeline(p);
          setSelectedCoordinate(null);
        }}
        unitSystem={unitSystem}
        onToggleUnitSystem={handleToggleUnitSystem}
        onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onToggleScenarioView={() => setIsScenarioModalOpen(true)}
        isScenarioViewOpen={isScenarioModalOpen}
        isFetchingUsgs={isProcessingFile}
      />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Top Row: File Uploader & Quick Pipeline Overview Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <FileUploader
              onPipelineParsed={handlePipelineParsed}
              isProcessing={isProcessingFile}
              setIsProcessing={setIsProcessingFile}
            />
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h2 className="text-sm font-bold text-slate-100">{activePipeline.name}</h2>
                <p className="text-xs text-slate-400">{activePipeline.description}</p>
              </div>
              <span className="text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 px-2.5 py-1 rounded-lg">
                {activePipeline.stats.totalLength} mi total length
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Elevation Gain</p>
                <p className="text-base font-bold text-cyan-400 mt-0.5">+{activePipeline.stats.elevationGain} ft</p>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Elevation Loss</p>
                <p className="text-base font-bold text-indigo-400 mt-0.5">-{activePipeline.stats.elevationLoss} ft</p>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Max Slope</p>
                <p className="text-base font-bold text-amber-400 mt-0.5">{activePipeline.stats.maxSlope}%</p>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Peak Elevation</p>
                <p className="text-base font-bold text-white mt-0.5">{activePipeline.stats.maxElevation} ft</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Interactive Map */}
        {hydraulicsResult && (
          <div className="space-y-2">
            <InteractiveMap
              geometry={activePipeline}
              hydraulics={hydraulicsResult}
              selectedCoordinate={selectedCoordinate}
              onSelectCoordinate={(coord) => setSelectedCoordinate(coord)}
            />
          </div>
        )}

        {/* Section 3: Elevation & Hydraulic Profile Chart */}
        {hydraulicsResult && (
          <ElevationProfileChart
            geometry={activePipeline}
            hydraulics={hydraulicsResult}
            onSelectCoordinate={(coord) => setSelectedCoordinate(coord)}
          />
        )}

        {/* Section 4: Live Hydraulic Controls */}
        <HydraulicControls config={config} onChangeConfig={(newConfig) => setConfig(newConfig)} />

        {/* Section 5: Pump Optimization Summary & Schedule */}
        {hydraulicsResult && (
          <PumpOptimizationSummary
            geometry={activePipeline}
            hydraulics={hydraulicsResult}
            config={config}
          />
        )}
      </main>

      {/* Scenario Comparison Modal */}
      {isScenarioModalOpen && hydraulicsResult && (
        <ScenarioComparer
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          onSelectScenario={(sc) => {
            setConfig(sc.config);
            setActiveScenarioId(sc.id);
          }}
          onClose={() => setIsScenarioModalOpen(false)}
        />
      )}

      {/* AI Assistant Floating Drawer */}
      {hydraulicsResult && (
        <AiAssistantDrawer
          geometry={activePipeline}
          hydraulics={hydraulicsResult}
          config={config}
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
        />
      )}

      {/* Engineering Report Export Modal */}
      {hydraulicsResult && (
        <EngineeringReportModal
          geometry={activePipeline}
          hydraulics={hydraulicsResult}
          config={config}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-900/80 border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          HydroElevation AI Platform • Powered by USGS National Map 3DEP Elevation REST API &amp; Hazen-Williams Hydraulic Engine
        </p>
      </footer>
    </div>
  );
}
