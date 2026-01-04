import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { kv } from '@/lib/kv';
import { objectExists, getPublicUrl } from '@/lib/r2';
import type { UploadTracking } from '@/types';

interface ConfirmUploadBody {
  key: string;
}

// POST /api/upload/confirm - Confirm file upload to R2
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
    const body: ConfirmUploadBody = await request.json();
    
    const { key } = body;
    
    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Missing file key' },
        { status: 400 }
      );
    }
    
    // Verify user owns this file
    if (!key.startsWith(`users/${userId}/`)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to file' },
        { status: 403 }
      );
    }
    
    // Verify file exists in R2
    const fileExists = await objectExists(key);
    if (!fileExists) {
      return NextResponse.json(
        { success: false, error: 'File not found in storage' },
        { status: 404 }
      );
    }
    
    // Get public URL (not direct R2 URL, but proxied through API)
    const publicUrl = `/api/files/${encodeURIComponent(key)}`;
    
    return NextResponse.json({
      success: true,
      key,
      publicUrl,
    });
  } catch (error) {
    console.error('Error confirming upload:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm upload' },
      { status: 500 }
    );
  }
}
