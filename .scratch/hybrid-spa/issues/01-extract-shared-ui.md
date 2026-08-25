# 01 — Prefactor: Extract shared UI components

**What to build:** 
The application's core views (the typing test HUD, the history table, and the settings forms) need to be decoupled from SvelteKit's `$page.data` so they can be used in both server-rendered and local-storage contexts. This ticket extracts the UI from the current `+page.svelte` files into reusable, prop-driven components in `src/lib/components/` while keeping the current server-backed application working exactly as it did before.

**Blocked by:** None — can start immediately.

**Status:** closed

- [x] Extract the typing test HUD/engine interface into a shared component that accepts configuration and initial state via props.
- [x] Extract the history data table and result summary views into shared components that accept an array of `Test Run`s via props.
- [x] Extract the settings form into a shared component that takes the current settings and a callback/event dispatcher for saves.
- [x] Refactor the existing routes (`/`, `/history`, `/settings`) to use these new components, passing down data loaded from their `+page.server.ts` files.
- [x] Verify existing component and page tests pass.
