import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '@/lib/kv';
import { getProject, saveProject, objectExists, getPublicUrl } from '@/lib/r2';
import { uploadConfirmSchema } from '@/lib/validations';
import type { UploadTracking, Attachment } from '@/types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// POST /api/projects/[projectId]/upload/confirm - Confirm file upload
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
    const validationResult = uploadConfirmSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { uploadId, fileKey, filename, fileSize, fileType, entityType, entityId } = validationResult.data;
    
    // Verify upload tracking record
    const uploadTracking = await kv.get<UploadTracking>(`upload:${uploadId}`);
    
    if (!uploadTracking) {
      return NextResponse.json(
        { success: false, error: 'Upload record not found or expired' },
        { status: 404 }
      );
    }
    
    if (uploadTracking.userId !== userId || uploadTracking.projectId !== projectId) {
      return NextResponse.json(
        { success: false, error: 'Invalid upload record' },
        { status: 403 }
      );
    }
    
    // Verify file exists in R2
    const fileExists = await objectExists(fileKey);
    if (!fileExists) {
      return NextResponse.json(
        { success: false, error: 'File not found in storage' },
        { status: 404 }
      );
    }
    
    // Get project
    const project = await getProject(userId, projectId);
    if (!project || project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Create attachment record
    const attachment: Attachment = {
      id: uuidv4(),
      filename,
      url: getPublicUrl(fileKey),
      type: fileType,
      size: fileSize,
    };
    
    // Update the appropriate entity
    const now = new Date().toISOString();
    let updated = false;
    
    if (entityType === 'character') {
      const charIdx = project.characters.findIndex((c) => c.id === entityId);
      if (charIdx !== -1) {
        // For characters, if it's an image, set as portrait
        if (fileType.startsWith('image/')) {
          project.characters[charIdx].portraitUrl = attachment.url;
        }
        project.characters[charIdx].updatedAt = now;
        updated = true;
      }
    } else if (entityType === 'scene') {
      const sceneIdx = project.scenes.findIndex((s) => s.id === entityId);
      if (sceneIdx !== -1) {
        project.scenes[sceneIdx].attachments.push(attachment);
        project.scenes[sceneIdx].updatedAt = now;
        updated = true;
      }
    } else if (entityType === 'location') {
      const locIdx = project.locations.findIndex((l) => l.id === entityId);
      if (locIdx !== -1) {
        if (fileType.startsWith('image/')) {
          project.locations[locIdx].images.push(attachment.url);
        }
        updated = true;
      }
    } else if (entityType === 'note') {
      const noteIdx = project.notes.findIndex((n) => n.id === entityId);
      if (noteIdx !== -1) {
        project.notes[noteIdx].attachments.push(attachment);
        project.notes[noteIdx].updatedAt = now;
        updated = true;
      }
    }
    
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      );
    }
    
    // Save updated project
    project.updatedAt = now;
    project.updatedBy = userId;
    project.version += 1;
    
    await saveProject(userId, projectId, project);
    
    // Delete upload tracking record
    await kv.del(`upload:${uploadId}`);
    
    return NextResponse.json({
      success: true,
      attachment,
    });
  } catch (error) {
    console.error('Error confirming upload:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm upload' },
      { status: 500 }
    );
  }
}
