# Data Room

A modern file management application built with Next.js that allows users to organize, search, and manage files from Google Drive. Features a clean, intuitive interface with folder organization, global search, and starred files.

## Tech Stack

**Frontend:**
- **Next.js 16** (App Router) - React framework
- **React 19** - UI library
- **NextAuth 4** - Authentication with Google OAuth and email magic links
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **TanStack Table** - Table component
- **Sonner** - Toast notifications
- **Google Picker API** - File selection from Google Drive

**Backend:**
- **Flask** - Python web framework
- **Gunicorn** - WSGI HTTP server
- **Supabase Python SDK** - Database client
- **Supabase** - PostgreSQL database

## UI Decisions and Features

### Design

The application follows a modern, clean design with a focus on usability and performance:

- **Sidebar Navigation**: Collapsible sidebar with folder tree structure for easy navigation
- **Table View**: Sortable, filterable table for files with columns for name, upload date, type, and actions
- **Empty States**: Contextual empty states that guide users to take action
- **Loading States**: Skeleton loaders and spinners provide visual feedback during async operations
- **Toast Notifications**: Non-intrusive toast messages for user feedback

### Key Features

1. **Folder Organization**
   - Hierarchical folder structure with nested folders
   - "All files" view (root folder) for files not in any folder
   - Collapsible folder tree in sidebar

2. **Starred Files**
   - Dedicated "Starred" section in sidebar
   - Quick access to important files

3. **Global Search**
   - Real-time search across all files
   - Debounced API calls for performance
   - Server-side search by file name (case-insensitive)

4. **File Management**
   - Upload files from Google Drive via Google Picker
   - Duplicate detection and resolution
   - Star/unstar files
   - Delete files with confirmation

## shadcn/ui Usage

This project uses **shadcn/ui** components, which are:

- **Copy-paste components**: Not installed as dependencies, but copied into the project for full customization
- **Built on Radix UI**: Accessible, unstyled primitives with full keyboard and screen reader support
- **Tailwind CSS styled**: All components use Tailwind utility classes
- **Fully customizable**: Since components are in your codebase, you can modify them directly

Components are located in `/components/ui/` and can be customized to match your design system.

## Database Schema

This project uses **Supabase SDK** (`@supabase/supabase-js`) as an alternative to traditional ORMs. The SDK provides:

- **Type-safe queries**: TypeScript support with query builders
- **Direct SQL access**: More control than ORMs while maintaining safety
- **Simple API**: Intuitive query builder syntax

**Note**: The schema below is for context only and is not meant to be run directly. Table order and constraints may not be valid for execution.

```sql
CREATE TABLE public.users (
  email text NOT NULL,
  name text,
  image text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (email)
);

CREATE TABLE public.folders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_email text,
  name text NOT NULL,
  parent_folder_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT folders_pkey PRIMARY KEY (id),
  CONSTRAINT folders_user_email_fkey FOREIGN KEY (user_email) REFERENCES public.users(email),
  CONSTRAINT folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.folders(id)
);

CREATE INDEX idx_folders_user_email ON public.folders(user_email);
CREATE INDEX idx_folders_parent_folder_id ON public.folders(parent_folder_id);
CREATE INDEX idx_folders_user_parent ON public.folders(user_email, parent_folder_id);

CREATE TABLE public.files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_email text,
  name text NOT NULL,
  url text NOT NULL,
  icon_url text,
  mime_type text,
  starred boolean DEFAULT false,
  uploaded_at timestamp without time zone DEFAULT now(),
  last_interacted timestamp without time zone DEFAULT now(),
  folder_id uuid,
  CONSTRAINT files_pkey PRIMARY KEY (id),
  CONSTRAINT files_user_email_fkey FOREIGN KEY (user_email) REFERENCES public.users(email),
  CONSTRAINT files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id)
);

CREATE INDEX idx_files_user_email ON public.files(user_email);
CREATE INDEX idx_files_user_folder ON public.files(user_email, folder_id);
CREATE INDEX idx_files_user_starred ON public.files(user_email, starred);
```

## Project Structure

```
src/
  app/
    api/               # API routes
    dashboard/         # Dashboard page
    login/             # Login page
  components/         # React components
  auth.ts             # NextAuth configuration
  types.ts            # TypeScript interfaces
  utils/              # Utility functions
```

## Prerequisites

- **Node.js 18+** - JavaScript runtime
- **Python 3.12+** - Python runtime
- **Supabase account** - Database hosting
- **Google Cloud Console** - For Google OAuth and Picker API
- **SMTP service** (optional) - For email magic link authentication

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
# Flask Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth
NEXTAUTH_SECRET=your_random_long_secret_min_32_chars
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (NextAuth)
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret

# Google Picker API
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
NEXT_PUBLIC_GOOGLE_APP_ID=your_google_app_id

# Email Provider (NextAuth) - Optional
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM="Data Room <no-reply@yourdomain.com>"
```

### Backend (`backend/.env`)

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CORS_ORIGINS=http://localhost:3000
```

## Development

### Backend

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

### Code Quality

```bash
npm run format
npm run lint
```

## API Routes

**Next.js (Auth & Session):**
- `GET /api/auth/[...nextauth]` - NextAuth authentication
- `GET /api/session` - Current session

**Flask Backend:**
- `GET /api/files` - Get files (supports `folderId`, `starred`, `search`)
- `POST /api/files` - Create file records
- `PATCH /api/files` - Rename file
- `DELETE /api/files` - Delete file(s) (`fileId` or `all=true`)
- `PATCH /api/files/starred` - Toggle starred status
- `GET /api/folders` - Get all folders
- `POST /api/folders` - Create folder
- `PATCH /api/folders` - Rename folder
- `DELETE /api/folders` - Delete folder (`folderId`)
- `DELETE /api/account` - Delete account

## Deployment

### Backend (Render)

1. Push code to GitHub
2. Create Web Service in Render
3. Set Root Directory: `backend`
4. Set Start Command: `gunicorn wsgi:app`
5. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CORS_ORIGINS` (your frontend URL)

### Frontend (Vercel)

1. Push code to GitHub
2. Import project in Vercel
3. Set Root Directory: `frontend`
4. Add all environment variables from `frontend/.env.local`
5. Update `NEXT_PUBLIC_API_URL` to your Render backend URL
6. Deploy

## Security Considerations

1. **Service Role Key**: Only used in server-side API routes, never exposed to client
2. **User Isolation**: All queries filter by `user_email` to ensure data isolation
3. **Input Validation**: Folder names validated (alphanumeric), file names sanitized
4. **Foreign Key Constraints**: Database enforces referential integrity
5. **Authentication**: All API routes require valid NextAuth session

## Notes

**Google Drive Access**: On the first login, you may need to check the checkbox to grant Google access to your Drive. This is a one-time permission request required by Google OAuth. On subsequent logins, you won't need to do this again.
