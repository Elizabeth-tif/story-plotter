/**
 * R2-backed storage for persistent data
 * All user credentials and data are stored in Cloudflare R2
 */

import { uploadJSON, getJSON, deleteObject, listObjects, objectExists } from './r2';
import crypto from 'crypto';

interface UserData {
  userId: string;
  email: string;
  passwordHash: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
}

interface ResetToken {
  userId: string;
  email: string;
  expiresAt: number;
}

interface ProjectData {
  [key: string]: any;
}

// ============================================
// Path Helpers for Auth Data
// ============================================

function hashEmail(email: string): string {
  // Create a hash of email to use as folder name (avoids special chars in paths)
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16);
}

const authPaths = {
  userCredentials: (email: string) => `auth/users/${hashEmail(email)}/credentials.json`,
  userByEmail: (email: string) => `auth/emails/${hashEmail(email)}.json`, // email -> userId mapping
  resetToken: (token: string) => `auth/reset-tokens/${token}.json`,
};

// ============================================
// In-memory fallback for local development without R2
// ============================================

const memoryUsers = new Map<string, UserData>();
const memoryProjects = new Map<string, ProjectData>();
const memoryResetTokens = new Map<string, ResetToken>();

// Check if R2 is configured
const isR2Available = () => {
  return !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID);
};

// ============================================
// Storage Implementation
// ============================================

export const storage = {
  // User operations
  async getUser(email: string): Promise<UserData | null> {
    if (!isR2Available()) {
      return memoryUsers.get(email.toLowerCase()) || null;
    }
    
    try {
      const key = authPaths.userCredentials(email);
      return await getJSON<UserData>(key);
    } catch (error) {
      console.error('Error getting user from R2:', error);
      return null;
    }
  },

  async setUser(email: string, userData: UserData): Promise<void> {
    if (!isR2Available()) {
      memoryUsers.set(email.toLowerCase(), userData);
      return;
    }
    
    try {
      const key = authPaths.userCredentials(email);
      await uploadJSON(key, userData);
      
      // Also store email mapping for lookups
      const emailKey = authPaths.userByEmail(email);
      await uploadJSON(emailKey, { email: email.toLowerCase(), userId: userData.userId });
    } catch (error) {
      console.error('Error saving user to R2:', error);
      throw error;
    }
  },

  async userExists(email: string): Promise<boolean> {
    if (!isR2Available()) {
      return memoryUsers.has(email.toLowerCase());
    }
    
    try {
      const key = authPaths.userCredentials(email);
      return await objectExists(key);
    } catch (error) {
      console.error('Error checking user exists in R2:', error);
      return false;
    }
  },

  async updateUser(email: string, updates: Partial<UserData>): Promise<void> {
    const user = await this.getUser(email);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser = { ...user, ...updates };
    await this.setUser(email, updatedUser);
  },

  // Reset token operations
  async setResetToken(token: string, data: ResetToken): Promise<void> {
    if (!isR2Available()) {
      memoryResetTokens.set(token, data);
      return;
    }
    
    try {
      const key = authPaths.resetToken(token);
      await uploadJSON(key, data);
    } catch (error) {
      console.error('Error saving reset token to R2:', error);
      throw error;
    }
  },

  async getResetToken(token: string): Promise<ResetToken | null> {
    if (!isR2Available()) {
      return memoryResetTokens.get(token) || null;
    }
    
    try {
      const key = authPaths.resetToken(token);
      return await getJSON<ResetToken>(key);
    } catch (error) {
      console.error('Error getting reset token from R2:', error);
      return null;
    }
  },

  async deleteResetToken(token: string): Promise<void> {
    if (!isR2Available()) {
      memoryResetTokens.delete(token);
      return;
    }
    
    try {
      const key = authPaths.resetToken(token);
      await deleteObject(key);
    } catch (error) {
      console.error('Error deleting reset token from R2:', error);
    }
  },

  // Project operations (these are mostly handled by r2.ts directly now)
  async getProject(userId: string, projectId: string): Promise<ProjectData | null> {
    if (!isR2Available()) {
      const key = `${userId}:${projectId}`;
      return memoryProjects.get(key) || null;
    }
    
    try {
      const key = `users/${userId}/projects/${projectId}/project.json`;
      return await getJSON<ProjectData>(key);
    } catch (error) {
      console.error('Error getting project from R2:', error);
      return null;
    }
  },

  async setProject(userId: string, projectId: string, projectData: ProjectData): Promise<void> {
    if (!isR2Available()) {
      const key = `${userId}:${projectId}`;
      memoryProjects.set(key, projectData);
      return;
    }
    
    try {
      const key = `users/${userId}/projects/${projectId}/project.json`;
      await uploadJSON(key, projectData);
      
      // Update project index
      const indexKey = `users/${userId}/projects/index.json`;
      let index = await getJSON<{ projects: Array<{ id: string; updatedAt: string }> }>(indexKey);
      
      if (!index) {
        index = { projects: [] };
      }
      
      // Add or update project in index
      const existingIndex = index.projects.findIndex(p => p.id === projectId);
      if (existingIndex >= 0) {
        index.projects[existingIndex] = { id: projectId, updatedAt: projectData.updatedAt || new Date().toISOString() };
      } else {
        index.projects.push({ id: projectId, updatedAt: projectData.updatedAt || new Date().toISOString() });
      }
      
      await uploadJSON(indexKey, index);
    } catch (error) {
      console.error('Error saving project to R2:', error);
      throw error;
    }
  },

  async deleteProject(userId: string, projectId: string): Promise<void> {
    if (!isR2Available()) {
      const key = `${userId}:${projectId}`;
      memoryProjects.delete(key);
      return;
    }
    
    try {
      // List and delete all files in project folder
      const prefix = `users/${userId}/projects/${projectId}/`;
      const files = await listObjects(prefix);
      for (const file of files) {
        await deleteObject(file);
      }
      
      // Update project index
      const indexKey = `users/${userId}/projects/index.json`;
      const index = await getJSON<{ projects: Array<{ id: string; updatedAt: string }> }>(indexKey);
      
      if (index && index.projects) {
        index.projects = index.projects.filter(p => p.id !== projectId);
        await uploadJSON(indexKey, index);
      }
    } catch (error) {
      console.error('Error deleting project from R2:', error);
      throw error;
    }
  },

  async getUserProjects(userId: string): Promise<ProjectData[]> {
    if (!isR2Available()) {
      const userProjects: ProjectData[] = [];
      const entries = Array.from(memoryProjects.entries());
      for (const [key, project] of entries) {
        if (key.startsWith(`${userId}:`)) {
          userProjects.push(project);
        }
      }
      return userProjects;
    }
    
    try {
      // Get project index from R2
      const indexKey = `users/${userId}/projects/index.json`;
      const index = await getJSON<{ projects: Array<{ id: string }> }>(indexKey);
      
      if (!index || !index.projects) {
        return [];
      }
      
      // Fetch each project
      const projects = await Promise.all(
        index.projects.map(async (p) => {
          const project = await this.getProject(userId, p.id);
          return project;
        })
      );
      
      return projects.filter((p): p is ProjectData => p !== null);
    } catch (error) {
      console.error('Error getting user projects from R2:', error);
      return [];
    }
  },

  // Clear all data (for testing - only works with in-memory)
  async clear(): Promise<void> {
    memoryUsers.clear();
    memoryProjects.clear();
    memoryResetTokens.clear();
  },

  // Get stats
  getStats() {
    return {
      storageType: isR2Available() ? 'R2' : 'in-memory',
      memoryUsers: memoryUsers.size,
      memoryProjects: memoryProjects.size,
    };
  },

  // Check storage status
  isR2Available,
};
