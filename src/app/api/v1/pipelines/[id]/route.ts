// GET    /api/v1/pipelines/:id — Get a single pipeline
// DELETE /api/v1/pipelines/:id — Delete a pipeline
import { NextResponse } from 'next/server';
import { getPipeline, deletePipeline } from '../../../../../lib/api/store';
import { notFound } from '../../../../../lib/api/errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = getPipeline(id);
  if (!entry) return notFound(`Pipeline ${id} not found`);

  return NextResponse.json({
    id: entry.id,
    pipeline: entry.pipeline,
    calculationResult: entry.calculationResult || null,
    lastConfig: entry.lastConfig || null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existed = deletePipeline(id);
  if (!existed) return notFound(`Pipeline ${id} not found`);

  return NextResponse.json({ deleted: true, id });
}
