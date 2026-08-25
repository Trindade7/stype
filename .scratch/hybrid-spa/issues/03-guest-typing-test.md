# 03 — Guest Typing Test SPA (Local Store Integration)

**What to build:** 
Unauthenticated users should be able to visit the root URL and immediately take a typing test, with their results saved directly to their browser's `localStorage`. This ticket implements the `localStorage` utility and the root Guest route.

**Blocked by:** 02 — Hybrid Routing Foundation & Navigation Guards

**Status:** completed

- [x] Create a `localStorage` wrapper utility (e.g., in `src/lib/localStore.ts`) capable of reading and writing Guest `Test Run`s, `Settings`, and `Custom Passage`s.
- [x] Implement the static Guest root route (`src/routes/+page.svelte` / `+page.ts`) using the shared typing component from Ticket 01.
- [x] Wire the Guest root route to load configuration from the `localStorage` wrapper and save completed `Test Run`s back to it.
- [x] Add unit/component tests for the `localStorage` utility and the Guest root route using mocked storage.
