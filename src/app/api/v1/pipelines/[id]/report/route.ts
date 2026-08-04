// POST /api/v1/pipelines/:id/report — Generate engineering report
import { NextResponse } from 'next/server';
import { getPipeline } from '../../../../../../lib/api/store';
import { generateReport } from '../../../../../../lib/export/reportGenerator';
import { badRequest, notFound, serverError } from '../../../../../../lib/api/errors';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = getPipeline(id);
  if (!entry) return notFound(`Pipeline ${id} not found`);

  let body: { options?: { format?: string } } = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    // No body is fine — use defaults
  }

  try {
    const filename = await generateReport(entry.pipeline, body.options || {});
    return NextResponse.json({ filename, pipelineId: id });
  } catch (err: any) {
    return serverError(err.message || 'Report generation failed');
  }
}
