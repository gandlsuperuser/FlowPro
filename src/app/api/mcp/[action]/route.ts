// Next.js App Router handler for MCP actions
// File: src/app/api/mcp/[action]/route.ts
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addGeometry, getGeometry } from '../../../../lib/mcp/store';
import type { HydraulicConfig } from '../../../../lib/types';
import { optimizePumpPlacement } from '../../../../lib/hydraulics/pumpOptimizer';
import { generateReport } from '../../../../lib/export/reportGenerator';

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;


  // Helper to parse JSON body (used for calculate and report)
  const json = await request.json().catch(() => null);

  if (action === 'upload') {
    // Expect a multipart/form-data with a file named "kmz".
    // For simplicity we support a JSON payload with a "geometry" field if multipart parsing is unavailable.
    if (json && json.geometry) {
      const pipelineId = uuidv4();
      addGeometry(pipelineId, json.geometry);
      return NextResponse.json({ pipelineId, geometry: json.geometry }, { status: 200 });
    }
    return NextResponse.json({ error: 'File upload not implemented in this stub' }, { status: 400 });
  }

  if (action === 'calculate') {
    if (!json?.pipelineId || !json?.config) {
      return NextResponse.json({ error: 'Missing pipelineId or config' }, { status: 400 });
    }
    const geometry = getGeometry(json.pipelineId);
    if (!geometry) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
    // Run the existing hydraulic optimizer (sync)
    const result = await optimizePumpPlacement(geometry.coordinates, json.config as HydraulicConfig);
    return NextResponse.json(result, { status: 200 });
  }

  if (action === 'report') {
    if (!json?.pipelineId) {
      return NextResponse.json({ error: 'Missing pipelineId' }, { status: 400 });
    }
    const geometry = getGeometry(json.pipelineId);
    if (!geometry) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
    // Generate a simple HTML report (PDF generation can be added later)
    const reportPath = await generateReport(geometry, json.options || {});
    const downloadUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/reports/${reportPath}`;
    return NextResponse.json({ downloadUrl }, { status: 200 });
  }

  return NextResponse.json({ error: 'Unknown MCP action' }, { status: 404 });
}
