# 02 — Hybrid Routing Foundation & Navigation Guards

**What to build:** 
The existing application routes must be relocated to `/app` to make room for the new Guest SPA at the root. The SvelteKit root layout must be configured to disable Server-Side Rendering (`ssr = false`), creating a blank canvas for the Guest experience, while `/app` remains fully server-backed. Navigation guards must be implemented to keep Guests out of `/app` and Users out of `/`.

**Blocked by:** 01 — Prefactor: Extract shared UI components

**Status:** completed

- [x] Move existing server-backed route folders (`login`, `logout`, `history`, `passages`, `settings`, `stats`, and the root `+page.svelte`/`+page.server.ts`) into `src/routes/app/`.
- [x] Update all internal links and redirects in the relocated application to point to the new `/app/...` paths.
- [x] Set `export const ssr = false;` in the root `src/routes/+layout.ts` (or `+layout.server.ts` equivalent for disabling SSR on the static portion).
- [x] Update `src/hooks.server.ts` to intercept requests: redirect users with a valid session away from `/` and Guest routes to the equivalent `/app` route, and redirect unauthenticated users away from `/app` (except `/app/login`) to `/app/login`.
- [x] Verify routing logic via `auth.test.ts` (mocking requests with and without cookies).
