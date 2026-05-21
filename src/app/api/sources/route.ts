import { NextRequest, NextResponse } from 'next/server';
import { getSources, getSourcesByCategory } from '@/lib/db';
import type { SourceCategory } from '@/types';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') as SourceCategory | null;
  const data = category
    ? await getSourcesByCategory(category)
    : await getSources();
  return NextResponse.json(data);
}
