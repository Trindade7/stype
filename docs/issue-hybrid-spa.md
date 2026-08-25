## Problem Statement

Users of the Stype typing application currently must log in to use the application and record their typing tests. This creates friction for new visitors who just want to practice typing immediately without creating an account. Furthermore, the application relies entirely on server-side rendering and a SQLite backend, preventing it from functioning as a standalone static SPA for purely local, unauthenticated use. Users want to be able to visit the root URL, immediately use the typing test as a static Single Page Application (SPA), save their data locally, and optionally log in later to sync their progress to a persistent server account.

## Solution

Stype will adopt a hybrid architecture. The current server-backed application and authentication workflows will be moved under the `/app` route prefix. The root routes (e.g., `/`, `/history`, `/settings`) will become a static SPA (with Server-Side Rendering disabled) designed for "Guest" users. Guest users can complete typing tests and change settings, with all data saved to the browser's Local Store (localStorage). When a Guest decides to log in at `/app/login`, their locally saved `Test Run`s and `Settings` will automatically sync and merge into their authenticated server account, ensuring no loss of progress.

## User Stories

1. As a Guest user, I want to visit the root URL (`/`) and immediately start a typing test without logging in, so that I have zero friction to begin practicing.
2. As a Guest user, I want my completed `Test Run`s to be saved to my browser's Local Store, so that I can track my local typing history over time.
3. As a Guest user, I want to view my past performance on a local History page, so that I can review my progress without an account.
4. As a Guest user, I want to modify my test Settings (like Zen Mode or Timed Mode duration) and have them saved locally, so that the app remembers my preferences across sessions.
5. As a Guest user, I want to create Custom Passages that are saved in the Local Store, so that I can practice specific text even when unauthenticated.
6. As a Guest user with local data, I want to navigate to `/app/login` and log into an account, so that I can persist my progress on the server.
7. As a newly logged-in User who had local data, I want my local `Test Run`s, Settings, and Custom Passages to be merged into my server account, so that I do not lose the progress I made while playing as a Guest.
8. As a logged-in User, I want to automatically be redirected to `/app` if I accidentally visit the Guest SPA root (`/`), so that I do not accidentally fragment my data into the Local Store.
9. As a Guest user, I want to be redirected to `/app/login` if I attempt to access any `/app` routes directly, so that the server-backed area remains secure.
10. As a developer, I want the Guest UI and User UI to share the same underlying Svelte components, so that I do not have to maintain duplicate interface code.

## Implementation Decisions

- **Hybrid Routing Strategy**: 
  - The SvelteKit adapter remains `@sveltejs/adapter-auto` (or node) to preserve backend SQLite functionality.
  - The root `+layout.ts` will `export const ssr = false;` to turn the Guest routes (`/`, `/history`, `/settings`, etc.) into a static SPA.
  - Server-dependent routes will be moved to `/src/routes/app/` (e.g., `/app`, `/app/history`, `/app/settings`, `/app/login`).

- **Shared UI Components**: 
  - The typing test HUD, history tables, and settings forms will be extracted into "dumb" shared components in `src/lib/components/`. 
  - These components will receive all data via Svelte props. Guest pages will supply this data from `localStorage`, while `/app` pages will supply it from `$page.data` (via `+page.server.ts`).

- **Navigation Guards**: 
  - A server-side check in `src/hooks.server.ts` will intercept requests. If a request is for the root SPA and contains a valid session cookie, it will immediately redirect to the equivalent `/app` path.

- **Data Sync on Login**: 
  - The Local Store sync cannot happen directly within the form action since the server cannot read `localStorage`. 
  - Instead, the client login page (`/app/login`) will intercept successful logins, read `localStorage`, send a payload containing Guest `Test Run`s, `Settings`, and `Custom Passage`s to a new `POST /app/api/sync` endpoint, and then clear the Local Store before redirecting to `/app`.

- **Local Store Constraints**:
  - `localStorage` will be used over `IndexedDB` for simplicity. If a Guest exceeds typical size constraints (~5MB), they will be prompted to create an account.

## Testing Decisions

Tests must verify external behavioral contracts, specifically focusing on the new routing rules and the data sync logic.

- **Routing / Hooks Seam (`src/lib/hooks/auth.test.ts`)**: 
  - Test the navigation guards by simulating requests with and without valid session cookies to verify correct redirection between `/` and `/app`.
- **Component Seam (`src/routes/page.test.ts`, `src/routes/app/page.test.ts`)**: 
  - Use Svelte Testing Library to render the new shared UI components in both modes. 
  - Mock `localStorage` for Guest route tests, and mock server data for `/app` route tests, asserting that the shared component renders identically in both scenarios.
- **Data Sync Seam (`src/routes/app/api/sync/server.test.ts`, `login/login.test.ts`)**: 
  - Test the `POST /app/api/sync` endpoint by submitting mock Local Store data and verifying it correctly inserts into the SQLite test database. 
  - Note: This builds on prior art in the codebase for endpoint testing via Mock Request/Response objects.

## Out of Scope

- Offline synchronization logic for logged-in Users (Service Workers / PWA features are not being added; Users must have a connection to use `/app`).
- Migrating the database from SQLite to a distributed store (the backend remains identical).
- Using IndexedDB for the Guest Local Store.

## Further Notes

- The Local Store sync endpoint must gracefully handle duplicate test runs or IDs to ensure idempotency if the sync process is interrupted or repeated.
