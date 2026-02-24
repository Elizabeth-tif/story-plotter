import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';
import type { Project, Scene, TimelineEvent } from '@/types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * POST /api/projects/[projectId]/branch
 *
 * Forks the story at a specific scene (branchPointSceneId).
 * The branch receives:
 *   - All scenes UP TO AND INCLUDING the fork scene (shared history)
 *   - All characters, plotlines, locations, notes (shared world-building)
 *   - Timeline events only for the shared scenes
 *
 * The user then opens the branch and adds NEW scenes after the fork point
 * to continue the divergent story.
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
    const { branchName, title, branchPointSceneId } = body as {
      branchName?: string;
      title?: string;
      branchPointSceneId?: string; // scene ID in the parent where story forks
    };

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

    // Sort scenes by timelinePosition or order to get chronological order
    const sortedScenes: Scene[] = [...(origin.scenes || [])].sort((a, b) => {
      const posA = a.timelinePosition ?? a.order;
      const posB = b.timelinePosition ?? b.order;
      return posA - posB;
    });

    // Determine which scenes belong to the shared history
    let sharedScenes: Scene[];
    let resolvedBranchPointSceneId: string | undefined = branchPointSceneId;

    if (branchPointSceneId) {
      const forkIndex = sortedScenes.findIndex((s) => s.id === branchPointSceneId);
      if (forkIndex === -1) {
        // Scene not found - share all scenes
        sharedScenes = sortedScenes;
        resolvedBranchPointSceneId = sortedScenes[sortedScenes.length - 1]?.id;
      } else {
        // Include scenes up to and including the fork scene
        sharedScenes = sortedScenes.slice(0, forkIndex + 1);
      }
    } else {
      // No fork point specified: share all scenes (branch continues from the end)
      sharedScenes = sortedScenes;
      resolvedBranchPointSceneId = sortedScenes[sortedScenes.length - 1]?.id;
    }

    const sharedSceneIds = new Set(sharedScenes.map((s) => s.id));

    // Filter timeline events to only those for shared scenes
    const sharedTimelineEvents = (origin.timeline?.events || []).filter((e: TimelineEvent) =>
      sharedSceneIds.has(e.sceneId)
    );

    // Build the branch project
    const branchProject: Project = {
      ...JSON.parse(JSON.stringify(origin)), // deep copy for safety
      id: newId,
      userId,
      title: resolvedTitle,
      parentId: projectId,
      branchName: resolvedBranchName,
      branchPointSceneId: resolvedBranchPointSceneId,
      createdAt: now,
      updatedAt: now,
      updatedBy: userId,
      version: 1,
      // Override scenes and timeline with only shared content
      scenes: JSON.parse(JSON.stringify(sharedScenes)),
      timeline: {
        ...origin.timeline,
        events: JSON.parse(JSON.stringify(sharedTimelineEvents)),
      },
      // Characters, plotlines, locations, notes are all shared (deep-copied)
    };

    await storage.setProject(userId, newId, branchProject);

    console.log(
      '[API Branch] Created branch:', newId,
      'from:', projectId,
      'fork at scene:', resolvedBranchPointSceneId,
      'shared scenes:', sharedScenes.length
    );

    return NextResponse.json({
      success: true,
      project: {
        id: newId,
        title: branchProject.title,
        branchName: resolvedBranchName,
        branchPointSceneId: resolvedBranchPointSceneId,
        parentId: projectId,
        createdAt: now,
        updatedAt: now,
        updatedBy: userId,
        archived: false,
        wordCount: sharedScenes.reduce((sum, s) => sum + (s.wordCount || 0), 0),
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


