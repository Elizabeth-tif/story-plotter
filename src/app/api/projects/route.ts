import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import {
  getProjectIndex,
  saveProjectIndex,
  saveProject,
  getProject,
  deleteProject as deleteProjectFromR2,
} from '@/lib/r2';
import { createProjectSchema } from '@/lib/validations';
import type { Project, ProjectSummary, ProjectIndex } from '@/types';

// GET /api/projects - List all projects
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const projectIndex = await getProjectIndex(userId);
    
    if (!projectIndex) {
      return NextResponse.json({
        projects: [],
        lastModified: new Date().toISOString(),
      });
    }
    
    // Filter out archived projects by default
    const activeProjects = projectIndex.projects.filter((p) => !p.archived);
    
    return NextResponse.json({
      projects: activeProjects,
      lastModified: projectIndex.lastModified,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const body = await request.json();
    
    // Validate input
    const validationResult = createProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { title, description, genre, targetWordCount, color } = validationResult.data;
    
    // Generate project ID
    const projectId = uuidv4();
    const now = new Date().toISOString();
    
    // Create full project structure
    const project: Project = {
      id: projectId,
      userId,
      title,
      description: description || '',
      genre: genre || '',
      settings: {
        targetWordCount,
        color,
        customFields: {},
      },
      createdAt: now,
      updatedAt: now,
      updatedBy: userId,
      version: 1,
      characters: [],
      scenes: [],
      plotlines: [],
      locations: [],
      timeline: {
        events: [],
        viewMode: 'linear',
      },
      notes: [],
    };
    
    // Save project to R2
    await saveProject(userId, projectId, project);
    
    // Update project index
    let projectIndex = await getProjectIndex(userId);
    if (!projectIndex) {
      projectIndex = {
        userId,
        projects: [],
        lastModified: now,
      } as ProjectIndex;
    }
    
    const projectSummary: ProjectSummary = {
      id: projectId,
      title,
      description: description || '',
      genre: genre || '',
      createdAt: now,
      updatedAt: now,
      updatedBy: userId,
      archived: false,
      wordCount: 0,
      settings: project.settings,
    };
    
    projectIndex.projects.unshift(projectSummary);
    projectIndex.lastModified = now;
    
    await saveProjectIndex(userId, projectIndex);
    
    return NextResponse.json({
      success: true,
      project: projectSummary,
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
