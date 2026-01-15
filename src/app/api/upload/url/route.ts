import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { getUploadUrl, uploadJSON } from '@/lib/r2';
import type { UploadTracking } from '@/types';

interface UploadRequestBody {
  filename: string;
  contentType: string;
  size: number;
}

// POST /api/upload/url - Get pre-signed upload URL for generic file uploads
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
    const body: UploadRequestBody = await request.json();
    
    const { filename, contentType, size } = body;
    
    if (!filename || !contentType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }
    
    // Generate unique file key
    const fileExtension = filename.split('.').pop() || '';
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const fileKey = `users/${userId}/uploads/${uniqueFilename}`;
    
    // Generate pre-signed upload URL (1 hour expiry)
    const uploadUrl = await getUploadUrl(fileKey, contentType, 3600);
    
    // Create upload tracking record
    const uploadId = uuidv4();
    const uploadTracking: UploadTracking = {
      userId,
      projectId: '', // Generic upload, no project association yet
      filename,
      r2Key: fileKey,
      status: 'pending',
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };
    
    // Store upload tracking in R2 (will be cleaned up on confirm or expire naturally)
    await uploadJSON(`auth/uploads/${uploadId}.json`, uploadTracking);
    
    return NextResponse.json({
      success: true,
      uploadUrl,
      key: fileKey,
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
