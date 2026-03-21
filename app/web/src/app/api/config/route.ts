import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const api =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.nutriaidiary.com';
  return NextResponse.json(
    { API_BASE_URL: api },
    {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
