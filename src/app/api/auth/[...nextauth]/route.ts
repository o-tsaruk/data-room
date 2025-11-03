import { SupabaseAdapter } from '@auth/supabase-adapter';
import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';

const handler = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST!,
        port: Number(process.env.SMTP_PORT!),
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASSWORD!,
        },
      },
      from: process.env.SMTP_FROM!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'database' },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
