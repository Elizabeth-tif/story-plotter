import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    console.log('[Login API] Attempting login for:', email);
    
    if (!email || !password) {
      console.log('[Login API] Missing email or password');
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const result = await login(email, password);
    
    console.log('[Login API] Login result:', { success: result.success, error: result.error, hasUser: !!result.user });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }
    
    // Create response with user data
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });
    
    return response;
  } catch (error) {
    console.error('[Login API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
