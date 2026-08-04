// GET /api/v1/materials — List available pipe materials and their Hazen-Williams C factors
import { NextResponse } from 'next/server';
import { PIPE_MATERIALS } from '../../../../lib/hydraulics/hazenWilliams';

export async function GET() {
  return NextResponse.json({ materials: PIPE_MATERIALS });
}
