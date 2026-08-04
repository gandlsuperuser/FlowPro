// GET /api/v1/health — Health check endpoint
import { NextResponse } from 'next/server';

const startTime = Date.now();

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'hydroelevation-api',
    version: '1.0.0',
    uptime: Math.round((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
}
