// POST /api/v1/pipelines/:id/scenarios — Generate scenario comparison
import { NextResponse } from 'next/server';
import { getPipeline } from '../../../../../../lib/api/store';
import { createDefaultScenarios } from '../../../../../../lib/scenarios/scenarioManager';
import { badRequest, notFound, serverError } from '../../../../../../lib/api/errors';
import type { HydraulicConfig } from '../../../../../../lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = getPipeline(id);
  if (!entry) return notFound(`Pipeline ${id} not found`);

  let body: { baseConfig: HydraulicConfig };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body — expected { baseConfig: HydraulicConfig }');
  }

  if (!body.baseConfig) {
    return badRequest('Missing baseConfig in request body');
  }

  try {
    const scenarios = createDefaultScenarios(body.baseConfig, entry.pipeline.coordinates);
    return NextResponse.json({ scenarios });
  } catch (err: any) {
    return serverError(err.message || 'Scenario generation failed');
  }
}
