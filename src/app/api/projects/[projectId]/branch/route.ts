import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import type { StoryBranch } from '@/types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/branch
 * Returns all branches embedded in the project.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const project = await storage.getProject(session.user.id, projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, branches: project.branches ?? [] });
  } catch (error) {
    console.error('[API Branch GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch branches' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[projectId]/branch
 *
 * Creates a new StoryBranch INSIDE the project (tree node).
 * When `parentBranchId` is supplied the branch forks off a scene inside that
 * parent branch, enabling unlimited nesting depth.
 * When omitted the branch forks off a main-trunk scene (existing behaviour).
 *
 * Body: { branchName: string, branchPointSceneId?: string, color?: string, parentBranchId?: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const userId = session.user.id;
    const body = await request.json();
    const { branchName, branchPointSceneId, color, parentBranchId } = body as {
      branchName?: string;
      branchPointSceneId?: string;
      color?: string;
      parentBranchId?: string;
    };

    const project = await storage.getProject(userId, projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    if (project.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Determine the pool of scenes the branch point must come from
    let scenesPool: { id: string; timelinePosition?: number; order: number }[];
    if (parentBranchId) {
      const parentBranch = (project.branches ?? []).find((b: StoryBranch) => b.id === parentBranchId);
      if (!parentBranch) {
        return NextResponse.json(
          { success: false, error: 'Parent branch not found' },
          { status: 404 }
        );
      }
      scenesPool = [...parentBranch.scenes].sort(
        (a, b) => (a.timelinePosition ?? a.order) - (b.timelinePosition ?? b.order)
      );
    } else {
      scenesPool = [...(project.scenes ?? [])].sort(
        (a, b) => (a.timelinePosition ?? a.order) - (b.timelinePosition ?? b.order)
      );
    }

    // Default fork point: last scene in the pool
    let resolvedBranchPointSceneId = branchPointSceneId;
    if (!resolvedBranchPointSceneId) {
      resolvedBranchPointSceneId = scenesPool[scenesPool.length - 1]?.id;
    }

    if (!resolvedBranchPointSceneId) {
      return NextResponse.json(
        { success: false, error: parentBranchId ? 'Parent branch has no scenes to branch from' : 'Project has no scenes to branch from' },
        { status: 400 }
      );
    }

    const forkSceneExists = scenesPool.some((s) => s.id === resolvedBranchPointSceneId);
    if (!forkSceneExists) {
      return NextResponse.json(
        { success: false, error: 'Branch point scene not found' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newBranch: StoryBranch = {
      id: uuidv4(),
      name: branchName?.trim() || 'New Branch',
      color: color ?? '#8B5CF6',
      branchPointSceneId: resolvedBranchPointSceneId,
      ...(parentBranchId ? { parentBranchId } : {}),
      scenes: [],
      createdAt: now,
      updatedAt: now,
    };

    const updatedProject = {
      ...project,
      branches: [...(project.branches ?? []), newBranch],
      updatedAt: now,
      updatedBy: userId,
    };

    await storage.setProject(userId, projectId, updatedProject);

    console.log('[API Branch POST] Created branch:', newBranch.id, 'in project:', projectId);

    return NextResponse.json({ success: true, branch: newBranch, updatedAt: now });
  } catch (error) {
    console.error('[API Branch POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create branch' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[projectId]/branch
 * Body: { branchId: string }
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const userId = session.user.id;
    const { branchId } = (await request.json()) as { branchId: string };

    const project = await storage.getProject(userId, projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    if (project.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Collect the target branch and all its descendants (cascade delete)
    const allBranches = project.branches ?? [] as StoryBranch[];
    const toDelete = new Set<string>();
    const collect = (id: string) => {
      toDelete.add(id);
      for (const b of allBranches) {
        if (b.parentBranchId === id) collect(b.id);
      }
    };
    collect(branchId);

    const now = new Date().toISOString();
    const updatedProject = {
      ...project,
      branches: allBranches.filter((b: StoryBranch) => !toDelete.has(b.id)),
      updatedAt: now,
      updatedBy: userId,
    };

    await storage.setProject(userId, projectId, updatedProject);

    return NextResponse.json({ success: true, deletedIds: Array.from(toDelete), updatedAt: now });
  } catch (error) {
    console.error('[API Branch DELETE] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete branch' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[projectId]/branch
 * Update branch metadata or its scenes array.
 * Body: { branchId: string, ...partial StoryBranch fields }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const userId = session.user.id;
    const body = (await request.json()) as { branchId: string } & Partial<StoryBranch>;
    const { branchId, ...updates } = body;

    const project = await storage.getProject(userId, projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    if (project.userId !== userId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const updatedBranches: StoryBranch[] = (project.branches ?? []).map((b: StoryBranch) =>
      b.id === branchId ? { ...b, ...updates, id: branchId, updatedAt: now } : b
    );

    const updatedProject = {
      ...project,
      branches: updatedBranches,
      updatedAt: now,
      updatedBy: userId,
    };

    await storage.setProject(userId, projectId, updatedProject);

    return NextResponse.json({
      success: true,
      branch: updatedBranches.find((b: StoryBranch) => b.id === branchId),
      updatedAt: now,
    });
  } catch (error) {
    console.error('[API Branch PATCH] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update branch' }, { status: 500 });
  }
}


