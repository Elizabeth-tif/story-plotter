// API Request/Response Types

import type { Project, ProjectSummary, Character, Scene, Plotline, Location, Note, VersionMeta } from './index';

// ============================================
// Auth API Types
// ============================================

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================
// Project API Types
// ============================================

export interface CreateProjectRequest {
  title: string;
  description?: string;
  genre?: string;
  targetWordCount?: number;
  color?: string;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  genre?: string;
  settings?: {
    targetWordCount?: number;
    color?: string;
    customFields?: Record<string, unknown>;
  };
}

export interface SaveProjectRequest {
  project: Project;
  lastKnownTimestamp: string;
  forceOverwrite?: boolean;
}

export interface SaveProjectResponse {
  success: boolean;
  timestamp: string;
  version: number;
}

export interface ConflictResponse {
  conflict: true;
  serverVersion: Project;
  clientVersion: Project;
  serverTimestamp: string;
  serverUpdatedBy: string;
}

export interface ProjectListResponse {
  projects: ProjectSummary[];
  lastModified: string;
}

// ============================================
// Entity API Types
// ============================================

export interface CreateCharacterRequest {
  name: string;
  role?: string;
  age?: number;
  description?: string;
  color?: string;
  tags?: string[];
}

export interface UpdateCharacterRequest extends Partial<CreateCharacterRequest> {
  arc?: string;
  metadata?: Record<string, unknown>;
  relationships?: {
    characterId: string;
    type: string;
    description: string;
  }[];
}

export interface CreateSceneRequest {
  title: string;
  description?: string;
  content?: string;
  povCharacterId?: string;
  location?: string;
  status?: 'draft' | 'in-progress' | 'complete';
  color?: string;
  tags?: string[];
}

export interface UpdateSceneRequest extends Partial<CreateSceneRequest> {
  timelinePosition?: number;
  timestamp?: string;
}

export interface CreatePlotlineRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdatePlotlineRequest extends Partial<CreatePlotlineRequest> {
  plotPoints?: {
    id: string;
    title: string;
    description: string;
    sceneId?: string;
    order: number;
  }[];
}

export interface CreateLocationRequest {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateLocationRequest extends Partial<CreateLocationRequest> {
  images?: string[];
}

export interface CreateNoteRequest {
  title: string;
  content?: string;
  category?: 'worldbuilding' | 'research' | 'ideas' | 'general';
  tags?: string[];
}

export interface UpdateNoteRequest extends Partial<CreateNoteRequest> {
  linkedEntities?: {
    type: 'character' | 'scene' | 'location' | 'plotline';
    id: string;
  }[];
}

// ============================================
// Search API Types
// ============================================

export interface SearchRequest {
  query: string;
  types?: ('characters' | 'scenes' | 'locations' | 'notes' | 'plotlines')[];
  tags?: string[];
  limit?: number;
}

export interface SearchResult {
  type: 'character' | 'scene' | 'location' | 'note' | 'plotline';
  id: string;
  title: string;
  excerpt?: string;
  matchedField: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

// ============================================
// Export API Types
// ============================================

export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'zip' | 'json';

export interface ExportRequest {
  format: ExportFormat;
  options?: {
    includeCharacters?: boolean;
    includeScenes?: boolean;
    includeNotes?: boolean;
    includeFiles?: boolean;
  };
}

export interface ExportResponse {
  downloadUrl: string;
  filename: string;
  expiresAt: string;
}

// ============================================
// Version API Types
// ============================================

export interface VersionListResponse {
  versions: VersionMeta[];
}

export interface RestoreVersionRequest {
  versionId: string;
}

// ============================================
// Reorder API Types
// ============================================

export interface ReorderRequest {
  entityType: 'character' | 'scene' | 'plotline' | 'location' | 'note';
  orderedIds: string[];
}

// ============================================
// Generic API Response
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
