// Upgraded pipeline store with metadata, calculation results, and list capability
import { PipelineGeometry, HydraulicCalculationResult, HydraulicConfig } from '../types';

export interface StoredPipeline {
  id: string;
  pipeline: PipelineGeometry;
  calculationResult?: HydraulicCalculationResult;
  lastConfig?: HydraulicConfig;
  createdAt: string;
  updatedAt: string;
}

const pipelineStore = new Map<string, StoredPipeline>();

export function addPipeline(id: string, pipeline: PipelineGeometry): StoredPipeline {
  const now = new Date().toISOString();
  const entry: StoredPipeline = {
    id,
    pipeline,
    createdAt: now,
    updatedAt: now,
  };
  pipelineStore.set(id, entry);
  return entry;
}

export function getPipeline(id: string): StoredPipeline | undefined {
  return pipelineStore.get(id);
}

export function deletePipeline(id: string): boolean {
  return pipelineStore.delete(id);
}

export function listPipelines(): StoredPipeline[] {
  return Array.from(pipelineStore.values());
}

export function updatePipelineCalcResult(
  id: string,
  result: HydraulicCalculationResult,
  config: HydraulicConfig
): StoredPipeline | undefined {
  const entry = pipelineStore.get(id);
  if (!entry) return undefined;
  entry.calculationResult = result;
  entry.lastConfig = config;
  entry.updatedAt = new Date().toISOString();
  return entry;
}
