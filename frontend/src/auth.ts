import { SupabaseAdapter } from '@auth/supabase-adapter';
import { createClient } from '@supabase/supabase-js';
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';

const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
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
  callbacks: {
    async signIn({ user }) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const email = user.email ?? undefined;
        if (!email) return true;

        const name = user.name ?? null;
        const image = (user as any).image ?? null;

        await supabase.from('users').upsert([{ email, name, image }], { onConflict: 'email' });
      } catch (e) {
        console.error('User upsert failed:', e);
      }
      return true;
    },
    jwt: async ({ token, user, account }) => {
      if (account && account.access_token) {
        token.accessToken = account.access_token;
      }

      return token;
    },
    redirect: async ({ url, baseUrl }) => {
      return baseUrl;
    },
    session: async ({ session, token, user }) => {
      return { ...session, token: token.accessToken };
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};

function serverSession(
  ...args:
    | [GetServerSidePropsContext['req'], GetServerSidePropsContext['res']]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...args, authOptions);
}

export { authOptions, serverSession };
