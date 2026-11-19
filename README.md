# JAG Gather Share Grow

JAG Gather Share Grow is a community app where Haramaya University students can
share experiences, advice, photos, audio, and videos.

## Requirements

- Node.js 22.12 or later
- npm
- A Supabase project

## Set up Supabase

1. Create a Supabase project.
2. Copy the environment template from the project root:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

3. Open `backend/.env` and replace the example values with your Supabase
   project's values:
   - `SUPABASE_PROJECT_ID` and `VITE_SUPABASE_PROJECT_ID`: the project reference
   - `SUPABASE_URL` and `VITE_SUPABASE_URL`: the project URL
   - `SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`: the
     publishable key
   - `SUPABASE_SERVICE_ROLE_KEY`: the server-only service role key

   Keep the service role key private. Never add it to a `VITE_` variable or
   commit `backend/.env`. The `.env.example` file contains placeholders only.

4. In the Supabase Dashboard, open **SQL Editor** and apply the SQL files in
   `backend/drizzle/migrations/` in filename order:
   `0000`, `0001`, `0002`, `0003`, then `0004`.
5. Before applying `0004_custom_phone_auth.sql`, create these **private**
   Storage buckets:
   - `avatars`
   - `post-images`
   - `post-audio`

   Migration `0004` configures their file-size and MIME-type limits.

`SUPABASE_DB_URL` is optional and is only needed when using Drizzle tools that
connect directly to PostgreSQL. It is not required for the local app when you
apply migrations in the Supabase SQL Editor.

## Run locally

From the project root, install dependencies and start the development server:

```powershell
cd backend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Stop the server with
`Ctrl+C`.

## Run checks

Run these commands from `backend/`:

```powershell
npm test
npm run lint
npm run build
```

## Authentication notes

Signup and login use a phone number and password; SMS and OTP verification are
not used. Phone numbers are not verified, so users may register numbers they do
not own. Forgotten-password recovery requires an administrator.

## Project structure

- `frontend/` contains the routes, UI components, styles, and public assets.
- `backend/` contains server-side authentication and data access, Supabase
  configuration, database schema and migrations, and the npm project.
- Routes are file-based under `frontend/src/routes/`.
- `frontend/src/routeTree.gen.ts` is generated automatically; do not edit it
  by hand.
