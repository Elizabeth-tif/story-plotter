import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Project, ProjectIndex, VersionSnapshot } from '@/types';

// Initialize S3-compatible client for Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;

// ============================================
// Path Helpers
// ============================================

export const r2Paths = {
  userProfile: (userId: string) => `users/${userId}/profile`,
  userAvatar: (userId: string) => `users/${userId}/profile/avatar`,
  userSettings: (userId: string) => `users/${userId}/profile/settings.json`,
  projectIndex: (userId: string) => `users/${userId}/projects/index.json`,
  project: (userId: string, projectId: string) => 
    `users/${userId}/projects/${projectId}/project.json`,
  projectVersions: (userId: string, projectId: string) => 
    `users/${userId}/projects/${projectId}/versions`,
  projectVersion: (userId: string, projectId: string, version: number, timestamp: string) => 
    `users/${userId}/projects/${projectId}/versions/v${version}-${timestamp}.json`,
  projectFiles: (userId: string, projectId: string) => 
    `users/${userId}/projects/${projectId}/files`,
  entityFile: (userId: string, projectId: string, entityType: string, filename: string) => 
    `users/${userId}/projects/${projectId}/files/${entityType}s/${filename}`,
  exports: (userId: string, projectId: string) => 
    `users/${userId}/projects/${projectId}/files/exports`,
};

// ============================================
// Generic R2 Operations
// ============================================

export async function uploadJSON<T>(key: string, data: T): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  });
  
  await r2Client.send(command);
}

export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const response = await r2Client.send(command);
    const body = await response.Body?.transformToString();
    
    if (!body) return null;
    return JSON.parse(body) as T;
  } catch (error: unknown) {
    if ((error as { name?: string }).name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  await r2Client.send(command);
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    await r2Client.send(command);
    return true;
  } catch (error: unknown) {
    if ((error as { name?: string }).name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

export async function getObjectMetadata(key: string): Promise<{
  lastModified?: Date;
  contentLength?: number;
  contentType?: string;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const response = await r2Client.send(command);
    return {
      lastModified: response.LastModified,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
    };
  } catch (error: unknown) {
    if ((error as { name?: string }).name === 'NotFound') {
      return null;
    }
    throw error;
  }
}

export async function listObjects(prefix: string): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });
  
  const response = await r2Client.send(command);
  return response.Contents?.map((item) => item.Key!).filter(Boolean) ?? [];
}

export async function copyObject(sourceKey: string, destinationKey: string): Promise<void> {
  const command = new CopyObjectCommand({
    Bucket: BUCKET_NAME,
    CopySource: `${BUCKET_NAME}/${sourceKey}`,
    Key: destinationKey,
  });
  
  await r2Client.send(command);
}

// ============================================
// Pre-Signed URL Generation
// ============================================

export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  
  return getSignedUrl(r2Client, command, { expiresIn });
}

export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  return getSignedUrl(r2Client, command, { expiresIn });
}

export function getPublicUrl(key: string): string {
  // Return API-proxied URL instead of direct R2 URL for security
  return `/api/files/${encodeURIComponent(key)}`;
}

// ============================================
// Project Operations
// ============================================

export async function getProjectIndex(userId: string): Promise<ProjectIndex | null> {
  const key = r2Paths.projectIndex(userId);
  return getJSON<ProjectIndex>(key);
}

export async function saveProjectIndex(userId: string, index: ProjectIndex): Promise<void> {
  const key = r2Paths.projectIndex(userId);
  await uploadJSON(key, index);
}

export async function getProject(userId: string, projectId: string): Promise<Project | null> {
  const key = r2Paths.project(userId, projectId);
  return getJSON<Project>(key);
}

export async function saveProject(userId: string, projectId: string, project: Project): Promise<void> {
  const key = r2Paths.project(userId, projectId);
  await uploadJSON(key, project);
}

export async function deleteProject(userId: string, projectId: string): Promise<void> {
  // List all files in the project folder
  const prefix = `users/${userId}/projects/${projectId}/`;
  const files = await listObjects(prefix);
  
  // Delete all files
  for (const file of files) {
    await deleteObject(file);
  }
}

// ============================================
// Version History Operations
// ============================================

export async function createVersionSnapshot(
  userId: string,
  projectId: string,
  project: Project
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = r2Paths.projectVersion(userId, projectId, project.version, timestamp);
  
  const snapshot: VersionSnapshot = {
    version: project.version,
    projectId,
    timestamp: new Date().toISOString(),
    savedBy: project.updatedBy,
    snapshot: project,
  };
  
  await uploadJSON(key, snapshot);
  
  // Clean up old versions (keep last 10)
  await cleanupOldVersions(userId, projectId);
}

export async function getVersions(
  userId: string,
  projectId: string
): Promise<{ version: number; timestamp: string; savedBy: string; key: string }[]> {
  const prefix = r2Paths.projectVersions(userId, projectId);
  const files = await listObjects(prefix);
  
  const versions = await Promise.all(
    files.map(async (key) => {
      const snapshot = await getJSON<VersionSnapshot>(key);
      if (!snapshot) return null;
      return {
        version: snapshot.version,
        timestamp: snapshot.timestamp,
        savedBy: snapshot.savedBy,
        key,
      };
    })
  );
  
  return versions
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => b.version - a.version);
}

export async function getVersionSnapshot(key: string): Promise<VersionSnapshot | null> {
  return getJSON<VersionSnapshot>(key);
}

async function cleanupOldVersions(userId: string, projectId: string): Promise<void> {
  const versions = await getVersions(userId, projectId);
  
  // Keep only the last 10 versions
  const toDelete = versions.slice(10);
  
  for (const version of toDelete) {
    await deleteObject(version.key);
  }
}

// ============================================
// User Initialization
// ============================================

export async function initializeUserStorage(userId: string): Promise<void> {
  // Create empty project index
  const index: ProjectIndex = {
    userId,
    projects: [],
    lastModified: new Date().toISOString(),
  };
  
  await saveProjectIndex(userId, index);
}

// ============================================
// File Upload Operations
// ============================================

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  
  await r2Client.send(command);
}

export async function getFile(key: string): Promise<Buffer | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const response = await r2Client.send(command);
    const bytes = await response.Body?.transformToByteArray();
    
    if (!bytes) return null;
    return Buffer.from(bytes);
  } catch (error: unknown) {
    if ((error as { name?: string }).name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

// Export client for advanced usage
export { r2Client, BUCKET_NAME };
