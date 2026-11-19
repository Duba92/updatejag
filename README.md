# JAG Gather Share Grow

The project root contains only `frontend/`, `backend/`, and this README.

## Folders

- `frontend/` — pages, UI, styles, and public assets.
- `backend/` — server-only auth/data, Supabase config, migrations, dependencies, and tool configuration.

## Run locally

Use Node.js 22.12 or later. Copy `backend/.env.example` to `backend/.env` and add your Supabase URL and keys. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

From the project root:

```sh
cd backend
npm install
npm run dev
```

For checks, run these from `backend/`:

```sh
npm test
npm run build
```

Apply `backend/drizzle/migrations/` in filename order. Create private `avatars`, `post-images`, and `post-audio` buckets before applying `0004_custom_phone_auth.sql`.

Signup and login use phone and password without SMS/OTP. Passwords are hashed and sessions use HttpOnly cookies. Phone numbers are not verified, so users can register numbers they do not own; password recovery requires an administrator.

Routes are file-based under `frontend/src/routes/`; `frontend/src/routeTree.gen.ts` is generated automatically.
