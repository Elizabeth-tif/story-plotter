import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { storage } from './storage';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ============================================
// Types
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface Session {
  user: AuthUser;
}

// ============================================
// JWT Configuration
// ============================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
);
const JWT_ISSUER = 'story-plotter';
const JWT_AUDIENCE = 'story-plotter-users';
const TOKEN_EXPIRY = '7d'; // 7 days
const COOKIE_NAME = 'auth-token';

// ============================================
// Validation Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ============================================
// JWT Token Functions
// ============================================

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({ 
    id: user.id, 
    email: user.email, 
    name: user.name 
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string | null,
    };
  } catch (error) {
    return null;
  }
}

// ============================================
// Cookie Management
// ============================================

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ============================================
// Session Management (Server-side)
// ============================================

export async function auth(): Promise<Session | null> {
  try {
    const token = await getAuthCookie();
    console.log('[Auth] Token exists:', !!token);
    
    if (!token) {
      return null;
    }
    
    const user = await verifyToken(token);
    console.log('[Auth] User verified:', !!user);
    
    if (!user) {
      return null;
    }
    
    return { user };
  } catch (error) {
    console.error('[Auth] Error getting session:', error);
    return null;
  }
}

// ============================================
// Authentication Actions
// ============================================

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  try {
    console.log('[Auth] Starting login for:', email);
    
    // Validate input
    const validated = loginSchema.parse({ email, password });
    console.log('[Auth] Input validated');
    
    // Get user from storage
    const userCredentials = await storage.getUser(validated.email.toLowerCase());
    console.log('[Auth] User from storage:', userCredentials ? 'found' : 'not found');
    
    if (!userCredentials) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(validated.password, userCredentials.passwordHash);
    console.log('[Auth] Password match:', passwordMatch);
    
    if (!passwordMatch) {
      return { success: false, error: 'Invalid email or password' };
    }
    
    // Check if email is verified
    console.log('[Auth] Email verified:', userCredentials.emailVerified);
    if (!userCredentials.emailVerified) {
      return { success: false, error: 'Please verify your email before logging in' };
    }
    
    const user: AuthUser = {
      id: userCredentials.userId,
      email: userCredentials.email,
      name: userCredentials.name,
    };
    
    // Create and set token
    console.log('[Auth] Creating token for user:', user.id);
    const token = await createToken(user);
    console.log('[Auth] Token created, setting cookie');
    await setAuthCookie(token);
    console.log('[Auth] Cookie set, login successful');
    
    return { success: true, user };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('[Auth] Validation error:', error.errors);
      return { success: false, error: error.errors[0]?.message || 'Invalid input' };
    }
    console.error('[Auth] Login error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function logout(): Promise<void> {
  await removeAuthCookie();
}
