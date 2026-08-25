# 04 — Guest History & Settings Pages

**What to build:** 
Guests should be able to view their accumulated `Test Run` history and change their local preferences without creating an account. This ticket builds the static `/history` and `/settings` pages for the Guest SPA.

**Blocked by:** 03 — Guest Typing Test SPA (Local Store Integration)

**Status:** completed

- [x] Implement the static Guest history route (`src/routes/history/+page.svelte`) using the shared history component, wired to read `Test Run`s from the `localStorage` utility.
- [x] Implement the static Guest settings route (`src/routes/settings/+page.svelte`) using the shared settings form component, wired to read/write from the `localStorage` utility.
- [x] Add navigation links between the Guest root, history, and settings pages (and a link to "Log in / Sign up").
- [x] Verify the pages render correctly and persist changes locally via component tests.
