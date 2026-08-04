// POST /api/v1/pipelines/:id/calculate — Run hydraulic optimization
import { NextResponse } from 'next/server';
import { getPipeline, updatePipelineCalcResult } from '../../../../../../lib/api/store';
import { optimizePumpPlacement } from '../../../../../../lib/hydraulics/pumpOptimizer';
import { badRequest, notFound, serverError } from '../../../../../../lib/api/errors';
import type { HydraulicConfig } from '../../../../../../lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = getPipeline(id);
  if (!entry) return notFound(`Pipeline ${id} not found`);

  let config: HydraulicConfig;
  try {
    config = await request.json();
  } catch {
    return badRequest('Invalid JSON body — expected HydraulicConfig object');
  }

  // Validate required config fields
  const required: (keyof HydraulicConfig)[] = [
    'units', 'flowRateGPM', 'pipeDiameterInches', 'pipeMaterial',
    'cFactor', 'desiredPressurePSI', 'minPressurePSI', 'maxPressurePSI',
    'pumpEfficiencyPct', 'safetyFactor', 'electricityCostPerKwh',
  ];
  for (const key of required) {
    if (config[key] === undefined || config[key] === null) {
      return badRequest(`Missing required config field: ${key}`);
    }
  }

  try {
    const result = optimizePumpPlacement(entry.pipeline.coordinates, config);
    updatePipelineCalcResult(id, result, config);
    return NextResponse.json(result);
  } catch (err: any) {
    return serverError(err.message || 'Hydraulic calculation failed');
  }
}
