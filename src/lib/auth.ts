import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { storage } from './storage';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { JWT } from 'next-auth/jwt';
import type { Session, User } from 'next-auth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials);
          
          // Fetch user from storage
          const userCredentials = await storage.getUser(email.toLowerCase());
          
          if (!userCredentials) {
            return null;
          }
          
          // Verify password
          const passwordMatch = await bcrypt.compare(password, userCredentials.passwordHash);
          
          if (!passwordMatch) {
            return null;
          }
          
          // Check if email is verified
          if (!userCredentials.emailVerified) {
            throw new Error('Please verify your email before logging in');
          }
          
          return {
            id: userCredentials.userId,
            email: userCredentials.email,
            name: userCredentials.name,
          };
        } catch (error) {
          if (error instanceof z.ZodError) {
            return null;
          }
          throw error;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
export const handlers = { GET: handler, POST: handler };

// Helper function to get session in API routes (compatible with auth.js v5 pattern)
import { getServerSession } from 'next-auth';

export async function auth() {
  return getServerSession(authOptions);
}

// Extend the default session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
  
  interface User {
    id: string;
    email: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
  }
}
