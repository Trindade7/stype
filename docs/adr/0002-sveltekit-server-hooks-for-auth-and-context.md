# SvelteKit server hooks for session resolution and route guarding

Authentication state and database context must be consistently resolved on every request without duplicating verification logic across routes and server endpoints.

We decided to organize hook implementations modularly inside `src/lib/hooks/` (such as `auth.ts` or `session.ts`) and compose them in `src/hooks.server.ts` via the SvelteKit `sequence` helper. The hook validates the session cookie on incoming requests, attaches `user` and `session` objects to `event.locals`, and enforces authentication boundaries before passing control to route loaders and endpoints.
