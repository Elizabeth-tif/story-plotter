import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '@/lib/kv';
import { getProject, getUploadUrl, r2Paths, objectExists } from '@/lib/r2';
import { uploadRequestSchema, uploadConfirmSchema } from '@/lib/validations';
import type { UploadTracking } from '@/types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST /api/projects/[projectId]/upload/url - Get pre-signed upload URL
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
    const body = await request.json();
    
    // Validate input
    const validationResult = uploadRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { filename, fileType, fileSize, entityType, entityId } = validationResult.data;
    
    // Verify project ownership
    const project = await getProject(userId, projectId);
    if (!project || project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Generate unique file key
    const fileExtension = filename.split('.').pop() || '';
    const uniqueFilename = `${uuidv4()}-${filename}`;
    const fileKey = r2Paths.entityFile(userId, projectId, entityType, uniqueFilename);
    
    // Generate pre-signed upload URL
    const uploadUrl = await getUploadUrl(fileKey, fileType, 3600); // 1 hour expiry
    
    // Create upload tracking record
    const uploadId = uuidv4();
    const uploadTracking: UploadTracking = {
      userId,
      projectId,
      filename,
      r2Key: fileKey,
      status: 'pending',
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };
    
    await kv.set(`upload:${uploadId}`, uploadTracking, { ex: 3600 });
    
    return NextResponse.json({
      success: true,
      uploadUrl,
      fileKey,
      uploadId,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
