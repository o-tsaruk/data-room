# Data Room

A Next.js app that lets users import files from Google Drive via Google Picker, persist them in Supabase, and view/manage the list.

## Features

- Google Picker to select Drive files
- User identification using a lightweight server-issued session token
- Supabase persistence for files per user
- File list with filter, open-in-browser, and delete

## Prerequisites

- Node.js 18+
- Supabase project (Database + Service Role Key)
- Google Cloud project with Google Picker API enabled

## Environment variables

Create a `.env.local` in the project root:

```env
# Next.js / Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Picker
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_oauth_client_id
NEXT_PUBLIC_GOOGLE_APP_ID=your_gcp_project_number
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is used server-side in Next.js route handlers. Do not expose it to the client outside API routes.
- The Google Cloud Project Number is used as `APP_ID` for Picker.

## Database schema

Run these in Supabase SQL editor (adjust if you already have tables):

```sql
create table public.users (
  id uuid not null default gen_random_uuid (),
  google_sub text not null,
  email text not null,
  session_token text not null,
  created_at timestamp without time zone null default now(),
);

create table files (
  id text primary key,
  user_id uuid references users(id) on delete cascade,
  name text not null,
  url text not null,
  icon_url text not null,
  mime_type text not null,
  uploaded_at timestamp default now()
);
```

## How it works

1. User clicks "Upload New File" → Google Identity Services issues an access token.
2. Client posts access token to `/api/session` which:
   - Validates token with Google
   - Creates/updates a user row and issues a `session_token`
   - Returns `session_token` stored in `localStorage`
3. Client opens Google Picker; on selection, files are posted to `/api/files` with `session_token`.
4. On load, client requests `/api/files` with `x-session-token` to fetch the user’s persisted files.

## Notes

When connecting to Google Drive for the first time, Google may display a warning that the app is unverified. This is expected in development environments and does not affect functionality. In production, you would submit the app for verification.

## API routes

- `POST /api/session` body: `{ access_token }` → `{ session_token }`
- `GET /api/files` header: `x-session-token` → `{ files: File[] }`
- `POST /api/files` body: `{ session_token, files }` → upsert files
- `DELETE /api/files?fileId=...` header: `x-session-token` → delete one file

File shape returned to client:

```ts
export interface File {
  id: string;
  name: string;
  url: string;
  iconUrl?: string;
  lastEditedDate?: string;
  mimeType?: string;
}
```

## Development

Install deps and run dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000

To format code with Prettier run:

```bash
npm run format
```

## Google Picker setup (summary)

- Enable Google Picker API in Google Cloud Console
- Create OAuth 2.0 Client ID (Web) and API Key
- Add `http://localhost:3000` to Authorized JavaScript origins
- Use the credentials in `.env.local`

References:

- Google Picker overview: https://developers.google.com/workspace/drive/picker/guides/overview
- Picker usage with Drive: https://developers.google.com/workspace/drive/api/guides/picker
