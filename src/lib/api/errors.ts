// Standardized API error responses
import { NextResponse } from 'next/server';

interface ApiError {
  error: string;
  code: string;
}

export function badRequest(message: string): NextResponse<ApiError> {
  return NextResponse.json({ error: message, code: 'BAD_REQUEST' }, { status: 400 });
}

export function notFound(message: string): NextResponse<ApiError> {
  return NextResponse.json({ error: message, code: 'NOT_FOUND' }, { status: 404 });
}

export function serverError(message: string): NextResponse<ApiError> {
  return NextResponse.json({ error: message, code: 'INTERNAL_ERROR' }, { status: 500 });
}

export function methodNotAllowed(): NextResponse<ApiError> {
  return NextResponse.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
