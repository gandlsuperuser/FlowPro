// POST /api/v1/pipelines/upload — Upload KML/KMZ file (multipart/form-data)
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addPipeline } from '../../../../../lib/api/store';
import { extractKmlFromBuffer, parseKmlToPipelinesServer } from '../../../../../lib/gis/kmlParserServer';
import { badRequest, serverError } from '../../../../../lib/api/errors';

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest('Request must be multipart/form-data with a "file" field');
  }

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return badRequest('Missing "file" field. Upload a .kml or .kmz file.');
  }

  const filename = (file as File).name || 'upload.kml';
  const lower = filename.toLowerCase();
  if (!lower.endsWith('.kml') && !lower.endsWith('.kmz') && !lower.endsWith('.xml')) {
    return badRequest('Unsupported file type. Please upload a .kml or .kmz file.');
  }

  try {
    const buffer = await file.arrayBuffer();
    const kmlText = await extractKmlFromBuffer(buffer, filename);
    const pipelines = parseKmlToPipelinesServer(kmlText, filename.replace(/\.[^/.]+$/, ''));

    // Store first pipeline (primary) — could store all if needed
    const pipeline = pipelines[0];
    const id = uuidv4();
    pipeline.id = id;
    const stored = addPipeline(id, pipeline);

    return NextResponse.json(
      {
        id: stored.id,
        pipeline: stored.pipeline,
        additionalSegments: pipelines.length > 1 ? pipelines.length - 1 : 0,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return serverError(err.message || 'Failed to parse uploaded file');
  }
}
