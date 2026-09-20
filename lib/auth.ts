import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getServerEnv } from './env';

/**
 * Server-side admin authentication. Replaces the old static site's
 * hardcoded `const PASS = '...'` string compared in client JS (trivially
 * bypassable via devtools). The real password never ships to the browser —
 * only its bcrypt hash lives in ADMIN_PASSWORD_HASH, and the comparison
 * happens here, server-side, inside the Credentials `authorize` callback.
 */
// NOTE: read directly (not via getServerEnv()'s throwing `required()`) so that
// this module can be imported during `next build` even when NEXTAUTH_SECRET
// isn't set in the build environment. The middleware/route handlers that
// actually use auth only run at request time, when real env vars are present.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/admin/login',
  },
  providers: [
    Credentials({
      name: 'Admin Password',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const password = credentials?.password;
        if (typeof password !== 'string' || password.length === 0) return null;

        const { adminPasswordHash } = getServerEnv();
        const valid = await bcrypt.compare(password, adminPasswordHash);
        if (!valid) return null;

        // No real user table — this app has a single admin role.
        return { id: 'admin', name: 'Admin' };
      },
    }),
  ],
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session }) {
      return session;
    },
  },
});
