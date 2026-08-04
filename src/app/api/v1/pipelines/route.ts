// GET  /api/v1/pipelines — List all stored pipelines
// POST /api/v1/pipelines — Create a pipeline from JSON coordinates
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addPipeline, listPipelines } from '../../../../lib/api/store';
import { processCoordinatesIntoPipeline } from '../../../../lib/gis/kmlParser';
import { badRequest } from '../../../../lib/api/errors';

export async function GET() {
  const all = listPipelines();
  const summary = all.map((entry) => ({
    id: entry.id,
    name: entry.pipeline.name,
    totalLength: entry.pipeline.stats.totalLength,
    pointCount: entry.pipeline.coordinates.length,
    hasCalculation: !!entry.calculationResult,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }));
  return NextResponse.json({ pipelines: summary });
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { name, coordinates, description } = body;

  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    return badRequest('coordinates must be an array of at least 2 points with { lat, lng, elevation }');
  }

  // Validate coordinate structure
  for (let i = 0; i < coordinates.length; i++) {
    const c = coordinates[i];
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number') {
      return badRequest(`coordinates[${i}] must have numeric lat and lng`);
    }
    if (c.elevation === undefined) c.elevation = 0;
  }

  const pipeline = processCoordinatesIntoPipeline(
    coordinates,
    name || 'Untitled Pipeline',
    description || ''
  );

  const id = uuidv4();
  pipeline.id = id;
  const stored = addPipeline(id, pipeline);

  return NextResponse.json(
    { id: stored.id, pipeline: stored.pipeline },
    { status: 201 }
  );
}
