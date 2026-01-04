import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

interface RouteParams {
  params: Promise<{ key: string[] }>;
}

// GET /api/files/[...key] - Fetch file from R2 through API proxy
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const { key: keyParts } = await params;
    const fileKey = decodeURIComponent(keyParts.join('/'));
    
    // Verify user has access to this file
    if (!fileKey.startsWith(`users/${userId}/`)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access to file' },
        { status: 403 }
      );
    }
    
    // Fetch file from R2
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    
    const response = await r2Client.send(command);
    
    if (!response.Body) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const buffer = Buffer.concat(chunks);
    
    // Return file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Content-Length': response.ContentLength?.toString() || '',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': response.ETag || '',
      },
    });
  } catch (error: any) {
    console.error('Error fetching file from R2:', error);
    
    if (error.name === 'NoSuchKey') {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}
