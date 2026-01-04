// ============================================
// Core Entity Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCredentials {
  userId: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface Session {
  userId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
}

// ============================================
// Project Types
// ============================================

export interface ProjectSummary {
  id: string;
  title: string;
  description: string;
  genre: string;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  archived: boolean;
  wordCount: number;
  settings: ProjectSettings;
}

export interface ProjectSettings {
  targetWordCount?: number;
  color?: string;
  customFields?: Record<string, unknown>;
}

export interface ProjectIndex {
  userId: string;
  projects: ProjectSummary[];
  lastModified: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  genre: string;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
  characters: Character[];
  scenes: Scene[];
  plotlines: Plotline[];
  locations: Location[];
  timeline: Timeline;
  notes: Note[];
}

// ============================================
// Character Types
// ============================================

export interface CharacterRelationship {
  characterId: string;
  type: string;
  description: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  age?: number;
  description: string;
  portraitUrl?: string;
  arc?: string;
  relationships: CharacterRelationship[];
  metadata: Record<string, unknown>;
  color?: string;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Scene Types
// ============================================

export type SceneStatus = 'draft' | 'in-progress' | 'complete';

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  content: string;
  povCharacterId?: string;
  location?: string;
  timelinePosition?: number;
  timestamp?: string;
  status: SceneStatus;
  wordCount: number;
  color?: string;
  tags: string[];
  attachments: Attachment[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Plotline Types
// ============================================

export interface PlotPoint {
  id: string;
  title: string;
  description: string;
  sceneId?: string;
  order: number;
}

export interface Plotline {
  id: string;
  name: string;
  description: string;
  color?: string;
  order: number;
  plotPoints: PlotPoint[];
}

// ============================================
// Location Types
// ============================================

export interface Location {
  id: string;
  name: string;
  description: string;
  images: string[];
  metadata: Record<string, unknown>;
  order: number;
}

// ============================================
// Timeline Types
// ============================================

export interface TimelineEvent {
  id: string;
  sceneId: string;
  position: number;
  timestamp?: string;
  plotlineId?: string;
}

export type TimelineViewMode = 'linear' | 'parallel';

export interface Timeline {
  events: TimelineEvent[];
  viewMode: TimelineViewMode;
}

// ============================================
// Note Types
// ============================================

export type NoteCategory = 'worldbuilding' | 'research' | 'ideas' | 'general';

export interface LinkedEntity {
  type: 'character' | 'scene' | 'location' | 'plotline';
  id: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  tags: string[];
  attachments: Attachment[];
  linkedEntities: LinkedEntity[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Version History Types
// ============================================

export interface VersionSnapshot {
  version: number;
  projectId: string;
  timestamp: string;
  savedBy: string;
  snapshot: Project;
}

export interface VersionMeta {
  version: number;
  timestamp: string;
  savedBy: string;
}

// ============================================
// File Upload Types
// ============================================

export type EntityType = 'character' | 'location' | 'note' | 'scene';

export interface UploadRequest {
  filename: string;
  fileType: string;
  fileSize: number;
  entityType: EntityType;
  entityId: string;
}

export interface UploadResponse {
  uploadUrl: string;
  fileKey: string;
  uploadId: string;
}

export interface UploadConfirmRequest {
  uploadId: string;
  fileKey: string;
  filename: string;
  fileSize: number;
  fileType: string;
  entityType: EntityType;
  entityId: string;
}

export interface UploadTracking {
  userId: string;
  projectId: string;
  filename: string;
  r2Key: string;
  status: 'pending' | 'confirmed' | 'failed';
  expiresAt: string;
}
