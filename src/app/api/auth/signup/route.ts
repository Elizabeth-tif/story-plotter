import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { signupSchema } from '@/lib/validations';
import { initializeUserStorage } from '@/lib/r2';
import type { UserCredentials } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { email, password, name } = validationResult.data;
    
    // Check if user already exists
    const existingUser = await kv.get<UserCredentials>(`user:${email}`);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    
    // Generate user ID and hash password
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Store user credentials
    const userCredentials: UserCredentials = {
      userId,
      email,
      passwordHash,
      emailVerified: true, // For MVP, skip email verification
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`user:${email}`, userCredentials);
    
    // Store user profile data
    await kv.set(`profile:${userId}`, {
      id: userId,
      email,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Initialize R2 storage for user
    await initializeUserStorage(userId);
    
    // Generate verification token (for future email verification)
    const verificationToken = uuidv4();
    await kv.set(`verify:${verificationToken}`, { userId, email }, { ex: 86400 }); // 24 hours
    
    // TODO: Send verification email
    // For MVP, we're auto-verifying
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: userId,
        email,
        name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
