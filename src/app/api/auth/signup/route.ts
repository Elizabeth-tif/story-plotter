import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { signupSchema } from '@/lib/validations';

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
    const existingUser = await storage.getUser(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      );
    }
    
    // Generate user ID and hash password
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Store user data
    await storage.setUser(email, {
      userId,
      email,
      passwordHash,
      name,
      emailVerified: true, // Auto-verify for MVP
      createdAt: new Date().toISOString(),
    });
    
    console.log(`User registered: ${email} (${userId})`);
    
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
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during signup';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
