import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { kv } from './kv';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { UserCredentials } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const { email, password } = loginSchema.parse(credentials);
          
          // Fetch user from Vercel KV
          const userCredentials = await kv.get<UserCredentials>(`user:${email.toLowerCase()}`);
          
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  trustHost: true,
});

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
