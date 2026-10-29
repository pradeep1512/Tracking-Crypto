import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';
import { authConfig } from './auth.config';
import { authService } from './auth-service';

const loginCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = loginCredentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, role } = parsed.data;
        const requiredRole = role === 'ADMIN' ? 'ADMIN' : undefined;

        const result = await authService.authenticate(email, password, requiredRole);
        if (!result.success || !result.data) {
          return null;
        }

        return {
          id: result.data.id,
          email: result.data.email,
          name: result.data.name,
          role: result.data.role,
          isActive: result.data.isActive,
        };
      },
    }),
  ],
});
