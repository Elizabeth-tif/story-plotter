import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { storage } from '@/lib/storage';
import { updateProjectSchema } from '@/lib/validations';
import type { Project } from '@/types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/[projectId] - Get project details
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
    
    const project = await storage.getProject(userId, projectId);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership
    if (project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[projectId] - Update project (full save)
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json();
    
    const { project: clientProject, lastKnownTimestamp, forceOverwrite } = body as {
      project: Project;
      lastKnownTimestamp: string;
      forceOverwrite?: boolean;
    };
    
    // Get current project from storage
    const serverProject = await storage.getProject(userId, projectId);
    
    if (!serverProject) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Verify ownership
    if (serverProject.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Check for conflicts (unless force overwrite)
    if (!forceOverwrite && lastKnownTimestamp !== serverProject.updatedAt) {
      return NextResponse.json(
        {
          conflict: true,
          serverVersion: serverProject,
          clientVersion: clientProject,
          serverTimestamp: serverProject.updatedAt,
          serverUpdatedBy: serverProject.updatedBy,
        },
        { status: 409 }
      );
    }
    
    // Update project
    const now = new Date().toISOString();
    const newVersion = serverProject.version + 1;
    
    const updatedProject: Project = {
      ...clientProject,
      id: projectId,
      userId,
      updatedAt: now,
      updatedBy: userId,
      version: newVersion,
    };
    
    // Save to storage
    await storage.setProject(userId, projectId, updatedProject);
    
    return NextResponse.json({
      success: true,
      timestamp: now,
      version: newVersion,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[projectId] - Update project metadata only
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json();
    
    // Validate input
    const validationResult = updateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const updates = validationResult.data;
    
    // Get current project
    const project = await storage.getProject(userId, projectId);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    if (project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    const now = new Date().toISOString();
    
    // Update project
    const updatedProject: Project = {
      ...project,
      ...(updates.title && { title: updates.title }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.genre !== undefined && { genre: updates.genre }),
      settings: {
        ...project.settings,
        ...(updates.targetWordCount && { targetWordCount: updates.targetWordCount }),
        ...(updates.color && { color: updates.color }),
      },
      updatedAt: now,
      updatedBy: userId,
      version: project.version + 1,
    };
    
    await storage.setProject(userId, projectId, updatedProject);
    
    return NextResponse.json({
      success: true,
      project: updatedProject,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId] - Delete project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    
    // Get project to verify ownership
    const project = await storage.getProject(userId, projectId);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    if (project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // Soft delete - mark as archived
    const searchParams = new URL(request.url).searchParams;
    const permanent = searchParams.get('permanent') === 'true';
    
    if (permanent) {
      // Permanently delete from storage
      await storage.deleteProject(userId, projectId);
    } else {
      // Soft delete - mark as archived
      const now = new Date().toISOString();
      const updatedProject = {
        ...project,
        archived: true,
        updatedAt: now,
        updatedBy: userId,
      };
      await storage.setProject(userId, projectId, updatedProject);
    }
    
    return NextResponse.json({
      success: true,
      message: permanent ? 'Project permanently deleted' : 'Project archived',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
