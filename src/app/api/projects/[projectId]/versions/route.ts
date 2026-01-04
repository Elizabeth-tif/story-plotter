import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, getVersions, getVersionSnapshot, saveProject, createVersionSnapshot } from '@/lib/r2';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/[projectId]/versions - List all versions
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { projectId } = await params;
    const userId = session.user.id;
    
    // Verify project ownership
    const project = await getProject(userId, projectId);
    if (!project || project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const versions = await getVersions(userId, projectId);
    
    return NextResponse.json({
      success: true,
      versions: versions.map((v) => ({
        version: v.version,
        timestamp: v.timestamp,
        savedBy: v.savedBy,
      })),
      currentVersion: project.version,
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch versions' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/versions - Create a manual version snapshot
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { projectId } = await params;
    const userId = session.user.id;
    
    // Get current project
    const project = await getProject(userId, projectId);
    if (!project || project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Create version snapshot
    await createVersionSnapshot(userId, projectId, project);
    
    return NextResponse.json({
      success: true,
      message: 'Version snapshot created',
      version: project.version,
    });
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create version' },
      { status: 500 }
    );
  }
}
