import { NextRequest, NextResponse } from 'next/server';
import { getProjects, getProjectsByCategory } from '@/lib/db';
import type { ProjectCategory } from '@/types';

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') as ProjectCategory | null;
  const data = category
    ? await getProjectsByCategory(category)
    : await getProjects();
  return NextResponse.json(data);
}
