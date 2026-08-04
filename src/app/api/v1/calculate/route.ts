// POST /api/v1/calculate — Stateless one-shot hydraulic calculation
// Accepts raw coordinates + config, runs the full pipeline, returns results without storing anything.
import { NextResponse } from 'next/server';
import { processCoordinatesIntoPipeline } from '../../../../lib/gis/kmlParser';
import { optimizePumpPlacement } from '../../../../lib/hydraulics/pumpOptimizer';
import { badRequest, serverError } from '../../../../lib/api/errors';
import type { HydraulicConfig } from '../../../../lib/types';

export async function POST(request: Request) {
  let body: { coordinates: any[]; config: HydraulicConfig };
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { coordinates, config } = body;

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    return badRequest('coordinates must be an array of at least 2 points with { lat, lng, elevation }');
  }

  if (!config) {
    return badRequest('Missing config (HydraulicConfig object)');
  }

  // Validate coordinate structure
  for (let i = 0; i < coordinates.length; i++) {
    const c = coordinates[i];
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number') {
      return badRequest(`coordinates[${i}] must have numeric lat and lng`);
    }
    if (c.elevation === undefined) c.elevation = 0;
  }

  try {
    // Process raw coordinates into pipeline geometry
    const pipeline = processCoordinatesIntoPipeline(coordinates, 'One-shot Calculation');

    // Run hydraulic optimization
    const result = optimizePumpPlacement(pipeline.coordinates, config);

    return NextResponse.json({
      pipeline: {
        name: pipeline.name,
        stats: pipeline.stats,
      },
      result,
    });
  } catch (err: any) {
    return serverError(err.message || 'Calculation failed');
  }
}
