import { NextRequest, NextResponse } from 'next/server';
import { getProjects, getProjectsByCategory } from '@/lib/db';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category');
  const data = category
    ? await getProjectsByCategory(category)
    : await getProjects();
  return NextResponse.json(data);
}
