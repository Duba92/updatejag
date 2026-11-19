# JAG Gather Share Grow

JAG Gather Share Grow is a community platform for Haramaya University students
to share experiences, advice, photos, audio, and videos.

## Tech stack

- React, TanStack Start, Vite, and Tailwind CSS
- Supabase for data and private file storage
- Drizzle for database schema and migrations

## Prerequisites

Before you start, install:

- Node.js 22.12 or later
- npm
- A Supabase project

## Quick start

1. Copy the environment template:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

2. Add your Supabase values to `backend/.env`. See
   [Configure Supabase](#configure-supabase) below.

3. Install dependencies and start the app:

   ```powershell
   cd backend
   npm ci
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

To stop the development server, press `Ctrl+C`.

## Configure Supabase

Create a Supabase project, then update `backend/.env` with its details.

| Variable | Description |
| --- | --- |
| `SUPABASE_PROJECT_ID` | Your Supabase project reference. |
| `SUPABASE_URL` | Your project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Your project's publishable key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role key. |
| `VITE_SUPABASE_PROJECT_ID` | Same project reference, available to the frontend. |
| `VITE_SUPABASE_URL` | Same project URL, available to the frontend. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same publishable key, available to the frontend. |
| `SUPABASE_DB_URL` | Optional PostgreSQL connection string for Drizzle tools. |

Never expose `SUPABASE_SERVICE_ROLE_KEY` in a `VITE_` variable or commit the
`backend/.env` file. The service role key grants elevated access and is used
only by the server.

## Set up the database and storage

In the Supabase Dashboard, open **SQL Editor** and run the migrations from
`backend/drizzle/migrations/` in this order:

1. `0000_jag_core.sql`
2. `0001_jag_storage_policies.sql`
3. `0002_restrict_post_featuring_and_role_lookup.sql`
4. `0003_scope_public_interactions_and_media.sql`
5. Create these **private** Storage buckets:
   - `avatars`
   - `post-images`
   - `post-audio`
6. `0004_custom_phone_auth.sql`
7. `0005_remove_sample_posts.sql`

Migration `0004` applies file-size and MIME-type rules for the storage buckets.
Migration `0005` deletes posts marked as sample data; run it only when you want
to remove those seeded posts. `SUPABASE_DB_URL` is not needed when applying
migrations through the Supabase SQL Editor.

## Checks

Run these commands from `backend/`:

```powershell
npm test
npm run lint
npm run build
```

## Authentication and security

- Accounts use a phone number and password; SMS and OTP verification are not
  used.
- Phone numbers are not verified, so password recovery requires administrator
  assistance.
- Passwords are hashed and sessions use HttpOnly cookies.
- Uploaded media is stored in private Supabase buckets and served through
  signed URLs.

## Project structure

| Path | Purpose |
| --- | --- |
| `frontend/` | Routes, UI components, styles, tests, and public assets. |
| `backend/src/` | Server-side authentication and data-access code. |
| `backend/drizzle/` | Database schema and SQL migrations. |
| `backend/.env.example` | Template for local Supabase configuration. |

Routes are file-based under `frontend/src/routes/`.
`frontend/src/routeTree.gen.ts` is generated automatically; do not edit it by
hand.
