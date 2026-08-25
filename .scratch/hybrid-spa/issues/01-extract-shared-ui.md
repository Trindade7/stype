# 01 — Prefactor: Extract shared UI components

**What to build:** 
The application's core views (the typing test HUD, the history table, and the settings forms) need to be decoupled from SvelteKit's `$page.data` so they can be used in both server-rendered and local-storage contexts. This ticket extracts the UI from the current `+page.svelte` files into reusable, prop-driven components in `src/lib/components/` while keeping the current server-backed application working exactly as it did before.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Extract the typing test HUD/engine interface into a shared component that accepts configuration and initial state via props.
- [ ] Extract the history data table and result summary views into shared components that accept an array of `Test Run`s via props.
- [ ] Extract the settings form into a shared component that takes the current settings and a callback/event dispatcher for saves.
- [ ] Refactor the existing routes (`/`, `/history`, `/settings`) to use these new components, passing down data loaded from their `+page.server.ts` files.
- [ ] Verify existing component and page tests pass.
