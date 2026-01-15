import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
);

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/projects'];

// Routes that should redirect to dashboard if already logged in
const authRoutes = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  console.log('[Middleware] Path:', pathname, 'Token exists:', !!token);

  // Check if token is valid
  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET, {
        issuer: 'story-plotter',
        audience: 'story-plotter-users',
      });
      isAuthenticated = true;
      console.log('[Middleware] Token valid, user authenticated');
    } catch (error) {
      // Token is invalid or expired
      console.log('[Middleware] Token invalid:', error);
      isAuthenticated = false;
    }
  }

  // Redirect to login if accessing protected route without auth
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  if (isProtectedRoute && !isAuthenticated) {
    console.log('[Middleware] Protected route, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth routes while logged in
  const isAuthRoute = authRoutes.some(route => pathname === route);
  if (isAuthRoute && isAuthenticated) {
    console.log('[Middleware] Auth route, user logged in, redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
};
