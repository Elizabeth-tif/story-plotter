import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/storage';
import { createProjectSchema } from '@/lib/validations';
import type { Project, ProjectSummary } from '@/types';

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
    const projects = await storage.getUserProjects(userId);
    
    // Filter out archived projects by default
    const activeProjects = projects.filter((p) => !p.archived);
    
    // Map to summary format
    const projectSummaries: ProjectSummary[] = activeProjects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description || '',
      genre: p.genre || '',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      updatedBy: p.updatedBy || '',
      archived: p.archived ?? false,
      wordCount: p.wordCount ?? 0,
      settings: p.settings || {},
      parentId: p.parentId,
      branchName: p.branchName,
    }));
    
    return NextResponse.json({
      projects: projectSummaries,
      lastModified: new Date().toISOString(),
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
    console.log('[API Projects POST] Creating new project...');
    const session = await auth();
    console.log('[API Projects POST] Session:', session?.user?.id ? 'authenticated' : 'not authenticated');
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const body = await request.json();
    console.log('[API Projects POST] Creating project for user:', userId);
    
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
      archived: false,
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
    
    // Save project to storage
    await storage.setProject(userId, projectId, project);
    
    console.log('[API Projects POST] Project created:', projectId);
    
    return NextResponse.json({
      success: true,
      project: {
        id: projectId,
        title,
        description: description || '',
        genre: genre || '',
        createdAt: now,
        updatedAt: now,
        updatedBy: userId,
        archived: false,
        wordCount: 0,
        settings: {
          targetWordCount,
          color,
        },
      },
    });
  } catch (error) {
    console.error('[API Projects POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
