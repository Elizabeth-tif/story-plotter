import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getProject, 
  saveProject, 
  getVersions, 
  getVersionSnapshot,
  createVersionSnapshot,
  getProjectIndex,
  saveProjectIndex,
} from '@/lib/r2';

interface RouteParams {
  params: Promise<{ projectId: string; versionId: string }>;
}

// GET /api/projects/[projectId]/versions/[versionId] - Get specific version
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { projectId, versionId } = await params;
    const userId = session.user.id;
    
    // Verify project ownership
    const project = await getProject(userId, projectId);
    if (!project || project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Find the version
    const versions = await getVersions(userId, projectId);
    const versionMeta = versions.find((v) => v.version.toString() === versionId);
    
    if (!versionMeta) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }
    
    // Get the full version snapshot
    const snapshot = await getVersionSnapshot(versionMeta.key);
    
    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: 'Version snapshot not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      version: snapshot,
    });
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/versions/[versionId]/restore - Restore to version
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { projectId, versionId } = await params;
    const userId = session.user.id;
    
    // Verify project ownership
    const currentProject = await getProject(userId, projectId);
    if (!currentProject || currentProject.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Find the version
    const versions = await getVersions(userId, projectId);
    const versionMeta = versions.find((v) => v.version.toString() === versionId);
    
    if (!versionMeta) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }
    
    // Get the version snapshot
    const snapshot = await getVersionSnapshot(versionMeta.key);
    
    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: 'Version snapshot not found' },
        { status: 404 }
      );
    }
    
    // Create a backup of current state before restoring
    await createVersionSnapshot(userId, projectId, currentProject);
    
    // Restore the version
    const now = new Date().toISOString();
    const restoredProject = {
      ...snapshot.snapshot,
      updatedAt: now,
      updatedBy: userId,
      version: currentProject.version + 1,
    };
    
    await saveProject(userId, projectId, restoredProject);
    
    // Update project index
    const projectIndex = await getProjectIndex(userId);
    if (projectIndex) {
      const idx = projectIndex.projects.findIndex((p) => p.id === projectId);
      if (idx !== -1) {
        const wordCount = restoredProject.scenes.reduce((sum, scene) => sum + scene.wordCount, 0);
        projectIndex.projects[idx] = {
          ...projectIndex.projects[idx],
          title: restoredProject.title,
          description: restoredProject.description,
          genre: restoredProject.genre,
          updatedAt: now,
          updatedBy: userId,
          wordCount,
          settings: restoredProject.settings,
        };
        projectIndex.lastModified = now;
        await saveProjectIndex(userId, projectIndex);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Restored to version ${versionId}`,
      project: restoredProject,
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore version' },
      { status: 500 }
    );
  }
}
