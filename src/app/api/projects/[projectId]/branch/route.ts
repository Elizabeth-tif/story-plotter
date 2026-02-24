import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import type { Project } from '@/types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST /api/projects/[projectId]/branch
// Creates a full deep-copy of the project as a new branch child.
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const userId = session.user.id;
    const body = await request.json();
    const { branchName, title } = body as { branchName?: string; title?: string };

    // Load origin project
    const origin = await storage.getProject(userId, projectId);
    if (!origin) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    if (origin.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const newId = uuidv4();
    const resolvedBranchName = branchName?.trim() || 'Branch';
    const resolvedTitle = title?.trim() || `${origin.title} — ${resolvedBranchName}`;

    // Deep-copy all content; assign new identity
    const branchProject: Project = {
      ...JSON.parse(JSON.stringify(origin)), // deep copy
      id: newId,
      userId,
      title: resolvedTitle,
      parentId: projectId,
      branchName: resolvedBranchName,
      createdAt: now,
      updatedAt: now,
      updatedBy: userId,
      version: 1,
    };

    await storage.setProject(userId, newId, branchProject);

    console.log('[API Branch] Created branch:', newId, 'from:', projectId);

    return NextResponse.json({
      success: true,
      project: {
        id: newId,
        title: branchProject.title,
        branchName: resolvedBranchName,
        parentId: projectId,
        createdAt: now,
        updatedAt: now,
        updatedBy: userId,
        archived: false,
        wordCount: origin.wordCount ?? 0,
        settings: origin.settings || {},
        genre: origin.genre || '',
        description: origin.description || '',
      },
    });
  } catch (error) {
    console.error('[API Branch] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create branch' }, { status: 500 });
  }
}
