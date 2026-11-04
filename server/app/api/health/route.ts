import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await query('SELECT 1 as ok, NOW() as time;');
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: result[0]?.time ?? new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'error',
        message: error?.message || 'Database connection error',
      },
      { status: 500 }
    );
  }
}
