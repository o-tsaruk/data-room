## Data Room

A Next.js application for managing a personal “data room”: authenticate with Google or email, persist files in Supabase, star/unstar, and manage your account. Built with Next.js App Router, NextAuth, Supabase, and a small UI kit.

## Tech stack

- Next.js 16 (App Router)
- React 19
- NextAuth 4 with Google and email providers
- Supabase (database) + `@auth/supabase-adapter`
- Tailwind CSS 4
- Shadcn library

## Features

- Auth via Google OAuth or email magic link (NextAuth)
- Persist files per user in Supabase
- List, filter, delete, and star/unstar files
- View session details from an authenticated endpoint
- Delete account (removes your user row)

## Project layout

```
src/
  app/
    api/
      auth/[...nextauth]/route.ts   # NextAuth handlers
      session/route.ts              # Get current session JSON
      files/route.ts                # List/insert/delete files
      files/starred/route.ts        # Toggle starred flag
      account/route.ts              # Delete account
    dashboard/page.tsx              # Main app UI
    login/page.tsx                  # Sign-in page
    layout.tsx                      # Root layout
  auth.ts                           # NextAuth options and helpers
  components/                       # App components
```

## Prerequisites

- Node.js 18+
- Supabase project (Database + Service Role Key)
- Google Cloud project with OAuth credentials for Google provider
- SMTP service for email magic link (for dev, Mailtrap/Resend/etc.)

## Environment variables

Create `.env.local` in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
NEXTAUTH_SECRET=your_random_long_secret

# Google provider (NextAuth)
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret

# Email provider (NextAuth)
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM="Your App <no-reply@yourdomain.com>"
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is used only on the server (route handlers). Never expose it in client code.
- Google OAuth must have Authorized redirect set for NextAuth (e.g. `http://localhost:3000/api/auth/callback/google` in development).

## Database

This app uses its own database schema. Apply the following SQL:

```sql
-- users table
CREATE TABLE public.users (
  email TEXT PRIMARY KEY,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- files table
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES public.users(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_url TEXT,
  mime_type TEXT,
  starred BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  last_interacted TIMESTAMP DEFAULT NOW()
);
```

## API routes

- `GET /api/auth/*` – NextAuth handlers
- `GET /api/session` – returns the current authenticated session JSON
- `GET /api/files` – returns `{ files: File[] }` for the signed-in user
- `POST /api/files` – body `{ files: { name, url, iconUrl?, mimeType? }[] }` to insert
- `DELETE /api/files?fileId=ID` – deletes a single file belonging to the user
- `PATCH /api/files/starred` – body `{ fileId, starred }` to toggle star
- `DELETE /api/account` – deletes the current user row

Type shape returned by `/api/files`:

```ts
export interface File {
  id: string;
  name: string;
  url: string;
  iconUrl?: string;
  mimeType?: string;
  starred?: boolean;
  lastEditedDate?: string;
  uploadedAt?: string;
}
```

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Use the Login page to authenticate via Google or email. Formatting and linting:

```bash
npm run format
npm run lint
```

## Deployment

- Recommended: Vercel. Set all environment variables in your hosting environment.
- Ensure your Google OAuth redirect URLs match the deployed domain (e.g. `https://your-domain.com/api/auth/callback/google`).
- Supply the same Supabase URL and Service Role key in production.

## Security

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. It is used only in server route handlers.
- All file operations are scoped to the authenticated user (via NextAuth session email).

## Troubleshooting

- Sign-in redirect loop: verify `NEXTAUTH_SECRET` and Google OAuth redirect URLs.
- 401 from APIs: ensure you are signed in and sending cookies; check that `serverSession` can read your session in the route environment.
- No files returned: confirm `files.user_email` matches your session email and the table/schema exists.
