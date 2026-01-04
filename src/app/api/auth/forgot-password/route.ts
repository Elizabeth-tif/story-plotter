import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations';
import type { UserCredentials } from '@/types';

// Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a reset request or forgot request
    if (body.token) {
      // This is a reset password request
      return handleResetPassword(body);
    }
    
    // This is a forgot password request
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const { email } = validationResult.data;
    
    // Check if user exists
    const user = await kv.get<UserCredentials>(`user:${email}`);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link',
      });
    }
    
    // Generate reset token
    const resetToken = uuidv4();
    
    // Store reset token with 1 hour expiry
    await kv.set(
      `reset:${resetToken}`,
      { userId: user.userId, email },
      { ex: 3600 }
    );
    
    // TODO: Send reset email
    // For now, just log the token (in development)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link',
      // Include token in development for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

async function handleResetPassword(body: unknown) {
  const validationResult = resetPasswordSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, error: validationResult.error.errors[0].message },
      { status: 400 }
    );
  }
  
  const { token, password } = validationResult.data;
  
  // Get reset token data
  const resetData = await kv.get<{ userId: string; email: string }>(`reset:${token}`);
  
  if (!resetData) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired reset token' },
      { status: 400 }
    );
  }
  
  // Get user credentials
  const userCredentials = await kv.get<UserCredentials>(`user:${resetData.email}`);
  
  if (!userCredentials) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
  }
  
  // Hash new password
  const passwordHash = await bcrypt.hash(password, 12);
  
  // Update user credentials
  await kv.set(`user:${resetData.email}`, {
    ...userCredentials,
    passwordHash,
  });
  
  // Delete reset token
  await kv.del(`reset:${token}`);
  
  return NextResponse.json({
    success: true,
    message: 'Password has been reset successfully',
  });
}
