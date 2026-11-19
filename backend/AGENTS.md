## Project rules

- Enforce featured-status changes with the database admin-only trigger, and keep has_role restricted to the caller's own roles to prevent promotion and role enumeration.
- Public likes/comments must belong to published posts; storage reads require ownership or an exact public profile/published-post reference so draft and unattached uploads stay private.
- Phone/password authentication is app-managed in `src/app-auth.server.ts`: passwords are PBKDF2-hashed, sessions use HttpOnly cookies, and phone numbers are not verified because SMS/OTP is not used. Forgotten-password recovery requires administrator assistance. Keep service-role database and storage access in this backend, and route authenticated operations through frontend server functions with explicit ownership checks. Never derive synthetic email identities from phones.
- Keep banner images full-bleed with breakpoint-specific CSS token overlays so text remains readable and photos stay visible on phones.
- Storage buckets are private (workspace blocks public buckets); media refs are stored as `storage:<bucket>/<path>` and resolved to signed URLs via `../frontend/src/lib/media.ts`.
- Post HTML is sanitized at render with `../frontend/src/lib/sanitize.ts`; never render user HTML unsanitized.
- Embeds with multiple FKs to profiles must name the FK (e.g. `profiles!posts_author_id_fkey`) or PostgREST returns ambiguity errors.
