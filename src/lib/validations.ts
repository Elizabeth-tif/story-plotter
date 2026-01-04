import { z } from 'zod';

// ============================================
// Auth Validation Schemas
// ============================================

export const signupSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .transform((email) => email.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((email) => email.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((email) => email.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ============================================
// Project Validation Schemas
// ============================================

export const createProjectSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .default(''),
  genre: z
    .string()
    .max(100, 'Genre must be less than 100 characters')
    .optional()
    .default(''),
  targetWordCount: z
    .number()
    .int()
    .positive()
    .optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional()
    .default('#3B82F6'),
});

export const updateProjectSchema = createProjectSchema.partial();

// ============================================
// Character Validation Schemas
// ============================================

export const createCharacterSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .trim(),
  role: z
    .string()
    .max(100, 'Role must be less than 100 characters')
    .optional()
    .default(''),
  age: z
    .number()
    .int()
    .positive()
    .max(10000)
    .optional(),
  description: z
    .string()
    .max(10000, 'Description must be less than 10000 characters')
    .optional()
    .default(''),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
  tags: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .default([]),
});

export const updateCharacterSchema = createCharacterSchema.partial().extend({
  arc: z.string().max(5000).optional(),
  metadata: z.record(z.unknown()).optional(),
  relationships: z
    .array(
      z.object({
        characterId: z.string().uuid(),
        type: z.string().max(100),
        description: z.string().max(1000),
      })
    )
    .optional(),
});

// ============================================
// Scene Validation Schemas
// ============================================

export const sceneStatusSchema = z.enum(['draft', 'in-progress', 'complete']);

export const createSceneSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .default(''),
  content: z.string().optional().default(''),
  povCharacterId: z.string().uuid().optional(),
  location: z.string().max(255).optional(),
  status: sceneStatusSchema.optional().default('draft'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
  tags: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .default([]),
});

export const updateSceneSchema = createSceneSchema.partial().extend({
  timelinePosition: z.number().int().optional(),
  timestamp: z.string().max(255).optional(),
});

// ============================================
// Plotline Validation Schemas
// ============================================

export const createPlotlineSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .trim(),
  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional()
    .default(''),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
});

export const plotPointSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional().default(''),
  sceneId: z.string().uuid().optional(),
  order: z.number().int().min(0),
});

export const updatePlotlineSchema = createPlotlineSchema.partial().extend({
  plotPoints: z.array(plotPointSchema).optional(),
});

// ============================================
// Location Validation Schemas
// ============================================

export const createLocationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .trim(),
  description: z
    .string()
    .max(10000, 'Description must be less than 10000 characters')
    .optional()
    .default(''),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const updateLocationSchema = createLocationSchema.partial().extend({
  images: z.array(z.string().url()).optional(),
});

// ============================================
// Note Validation Schemas
// ============================================

export const noteCategorySchema = z.enum(['worldbuilding', 'research', 'ideas', 'general']);

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  content: z.string().optional().default(''),
  category: noteCategorySchema.optional().default('general'),
  tags: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .default([]),
});

export const linkedEntitySchema = z.object({
  type: z.enum(['character', 'scene', 'location', 'plotline']),
  id: z.string().uuid(),
});

export const updateNoteSchema = createNoteSchema.partial().extend({
  linkedEntities: z.array(linkedEntitySchema).optional(),
});

// ============================================
// File Upload Validation Schemas
// ============================================

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const uploadRequestSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters'),
  fileType: z.enum(ALLOWED_FILE_TYPES as [string, ...string[]], {
    errorMap: () => ({ message: 'File type not allowed' }),
  }),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, 'File size must be less than 10MB'),
  entityType: z.enum(['character', 'location', 'note', 'scene']),
  entityId: z.string().uuid(),
});

export const uploadConfirmSchema = z.object({
  uploadId: z.string().uuid(),
  fileKey: z.string().min(1),
  filename: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  fileType: z.string().min(1),
  entityType: z.enum(['character', 'location', 'note', 'scene']),
  entityId: z.string().uuid(),
});

// ============================================
// Search Validation Schemas
// ============================================

export const searchSchema = z.object({
  query: z.string().min(1).max(500),
  types: z
    .array(z.enum(['characters', 'scenes', 'locations', 'notes', 'plotlines']))
    .optional(),
  tags: z.array(z.string().max(50)).optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
});

// ============================================
// Reorder Validation Schema
// ============================================

export const reorderSchema = z.object({
  entityType: z.enum(['character', 'scene', 'plotline', 'location', 'note']),
  orderedIds: z.array(z.string().uuid()).min(1),
});

// ============================================
// Type Exports
// ============================================

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
export type CreateSceneInput = z.infer<typeof createSceneSchema>;
export type UpdateSceneInput = z.infer<typeof updateSceneSchema>;
export type CreatePlotlineInput = z.infer<typeof createPlotlineSchema>;
export type UpdatePlotlineInput = z.infer<typeof updatePlotlineSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;
export type UploadConfirmInput = z.infer<typeof uploadConfirmSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
