---
title: Multi-Platform Web, Desktop, and Mobile Offline-First Application
status: ready-for-agent
---

## Problem Statement

Typists want to practice typing across desktop computers, mobile phones, and web browsers with zero latency, reliable offline capability, and seamless history synchronization. Currently, Stype is split between a static web Guest SPA using synchronous `localStorage` and a server-rendered web application requiring a live Node.js server and SQLite database.

Because `localStorage` has a strict 5MB quota and serializes entire history arrays on the main thread, regular typists quickly encounter storage quota errors and UI stutters. Furthermore, mobile typists face keyboard occlusion and layout jumping because the interface does not dynamically adapt to on-screen virtual keyboards. Finally, typists cannot install native desktop or mobile apps, and have no way to synchronize typing history or custom passages across multiple offline devices without database collisions.

## Solution

1. Deliver Stype across web, desktop (macOS, Windows, Linux), and mobile (iOS, Android) platforms from a single monorepo using Tauri 2.
2. Unify the frontend into a single Single Page Application (SPA) where every typist starts immediately as a Guest with local persistence and no initial account requirement.
3. Replace synchronous `localStorage` with an asynchronous Local Store adapter that uses native SQLite on desktop and mobile platforms, and IndexedDB in web browsers.
4. Provide a mobile-first visual viewport layout that collapses the navigation header and anchors to `100dvh` during active typing, giving the passage and HUD full visibility above the virtual keyboard.
5. Provide background synchronization over a JSON API. Typists can link their client to an authenticated User account on a self-hosted Stype server.
6. Use client-generated UUIDs for Test Runs and Custom Passages, merging Test Runs append-only and applying timestamped last-write-wins with soft deletes for Custom Passages and Settings.
7. Configure the SvelteKit build pipeline with conditional adapters to output a static SPA bundle for Tauri packaging and static web hosting, or a Node server container for self-hosted instances.

## User Stories

1. As a Guest on web, I want to open the site and immediately take a typing test without signing in, so that I experience zero friction to practice.
2. As a desktop typist, I want to launch an installed native desktop app without internet access, so that I can practice typing anywhere.
3. As a mobile typist, I want to install a native app on my phone, so that I have a distraction-free typing tool on my mobile device.
4. As a Guest, I want all my completed Test Runs stored automatically in the Local Store on my device, so that my practice history persists across app restarts.
5. As a typist with thousands of completed Test Runs, I want history persistence to run off the main thread, so that completing a test run never causes a frame drop or input freeze.
6. As a desktop or mobile typist, I want my data stored in a native SQLite database on disk, so that clearing web browser caches never erases my typing history.
7. As a web browser typist, I want my data stored in IndexedDB, so that my typing history is not limited to the 5MB browser quota of localStorage.
8. As an existing web Guest with localStorage data, I want my existing records automatically migrated into IndexedDB on first load, so that I do not lose past test runs.
9. As a mobile typist tapping the typing input, I want the navigation header to collapse automatically when the virtual keyboard appears, so that the passage remains fully visible.
10. As a mobile typist, I want the typing viewport to anchor to dynamic viewport height (`100dvh`), so that virtual keyboard openings do not push the typing text off screen.
11. As a mobile typist, I want the typing area to prevent native autocorrect, autocapitalization, and spellcheck suggestions, so that the test accurately records raw keystrokes.
12. As a mobile typist completing a test, I want the virtual keyboard to dismiss and the Result Summary to fit cleanly in the viewport, so that I can review my metrics immediately.
13. As a desktop typist, I want standard keyboard shortcuts (`Esc` to restart, `Tab` for next passage) to function identically in the desktop app, so that my muscle memory works without using a mouse.
14. As a typist, I want to create, edit, and delete Custom Passages in the Local Store, so that I can practice specific literature or code offline.
15. As a typist, I want to configure Settings (Passage Mode, Timed Mode duration, Zen Mode, Scroll Mode, Theme) offline, so that the application respects my preferences on each device.
16. As a Guest, I want to click a login button in the header and enter my server URL and credentials, so that I can link my device to my self-hosted User account.
17. As a newly linked User, I want my local Test Runs, Custom Passages, and Settings to upload and merge into my server account, so that I do not lose offline progress.
18. As an authenticated User taking tests while disconnected from the internet, I want my Test Runs saved to my Local Store immediately, so that my typing session is never interrupted by network drops.
19. As an authenticated User reconnecting to the internet, I want pending local Test Runs to sync to the server in the background, so that my server history remains complete.
20. As a typist using both a laptop and a phone, I want Test Runs recorded on my phone to appear on my laptop when both devices sync, so that I have a unified lifetime typing history.
21. As a typist editing a Custom Passage on my desktop while offline, I want my edits to propagate to my phone on next sync based on timestamps, so that the latest version persists everywhere.
22. As a typist deleting a Custom Passage on one device, I want a soft delete tombstone to synchronize across all my linked devices, so that the deleted passage does not resurrect when another device syncs.
23. As an authenticated User logging out on a device, I want the option to clear local account credentials and revert the app to a clean Guest state, so that my account remains secure on shared computers.
24. As a developer, I want all platforms (web, desktop, mobile) to share identical Svelte UI components, so that improvements and bug fixes apply everywhere simultaneously.
25. As a system administrator self-hosting Stype, I want a single command or Docker build to compile and run the Node server with the JSON API, so that hosting remains simple.

## Implementation Decisions

- Monorepo Packaging:
  - Tauri 2 manages native desktop (macOS, Windows, Linux) and mobile (iOS, Android) packaging inside the repository.
  - Native configuration and platform manifests live in the standard `src-tauri` directory.
  - SvelteKit serves as the unified frontend builder, generating static HTML, CSS, and JavaScript assets that Tauri embeds directly into the native webview.

- Build Pipeline and Conditional Adapters:
  - The build process detects an environment variable (`STATIC_BUILD`).
  - When `STATIC_BUILD` is enabled, the configuration applies the SvelteKit static adapter (`@sveltejs/adapter-static`) with an `index.html` single-page app fallback, producing static distribution files for Tauri and static web hosting.
  - When running in default server mode, the configuration applies `@sveltejs/adapter-node` to build a production Node server that serves static files and handles JSON API endpoints.

- Unified Single Page Application Routing:
  - The client application unifies into a single client-rendered route structure for all typists.
  - Pages for typing tests, history, passages, statistics, settings, and authentication run purely on the client across web, desktop, and mobile.
  - The server acts as a JSON API provider, exposing endpoints for authentication, synchronization, and administration.

- Asynchronous Local Store Architecture:
  - The Local Store interface shifts from synchronous methods to an asynchronous storage contract supporting all CRUD operations for settings, passages, and test runs.
  - Platform detection chooses the appropriate storage backend at initialization.
  - On desktop and mobile runtimes, Tauri's SQL plugin connects to a local SQLite database file stored in the application data directory on disk.
  - In web browser runtimes, the storage adapter connects to browser IndexedDB, with an initial one-time migration that reads existing `localStorage` data, writes it to IndexedDB, and frees the `localStorage` keys.

- Mobile Visual Viewport Handling:
  - A responsive layout controller monitors visual viewport geometry using `window.visualViewport` and dynamic viewport units (`100dvh`).
  - When the typing text input receives focus on narrow viewports, the layout transitions into compact mode: the top navigation header collapses out of view, vertical container margins shrink, and the passage display maintains focus directly above the virtual keyboard.
  - Blur events and test completion restore the standard layout and header visibility.

- Distributed Synchronization Protocol:
  - Client-generated identifiers for Test Runs and Custom Passages use standard UUID format rather than autoincrement integers.
  - The synchronization endpoint accepts batch payloads containing local changes and the client's last sync timestamp.
  - Test Runs merge through an append-only set union. Runs existing on the client but missing on the server are inserted. Runs existing on the server but missing on the client are returned in the response payload.
  - Custom Passages and Settings resolve conflicts using last-write-wins based on updated timestamps. Deletions apply soft-delete flags (`deleted_at` timestamp tombstones) to ensure deleted records propagate cleanly without resurrection.

## Testing Decisions

- What makes a good test:
  - Tests verify external behavior and user-observable outcomes rather than private implementation details.
  - The testing suite relies on Svelte Testing Library and Vitest, matching established testing patterns in the repository.

- Client Application Seam:
  - Render unified client pages using Svelte Testing Library with simulated typist interactions.
  - Test typing tests from first keystroke through completion, verifying that results persist to the asynchronous Local Store and render in the Result Summary.
  - Test the mobile compact mode by firing focus and blur events on the hidden input under simulated narrow viewports, asserting header collapsing and container resizing.
  - Prior art: `src/routes/page.test.ts`, `src/lib/components/TypingEngine.test.ts`.

- Sync and Auth API Seam:
  - Test the `/api/sync` endpoint using simulated HTTP Request and Response objects against an in-memory SQLite database.
  - Test append-only deduplication of UUID-tagged Test Runs, bidirectional exchange of new runs, last-write-wins timestamp resolution for custom passages, and soft-delete propagation.
  - Prior art: `src/routes/app/api/sync/server.test.ts`.

- Local Store Seam:
  - Test the asynchronous storage adapter interface across storage operations and ensure seamless migration from existing `localStorage` structures into IndexedDB.
  - Prior art: `src/lib/localStore.test.ts`.

## Out of Scope

- Real-time peer-to-peer multiplayer typing races or WebSockets.
- Third-party social logins (OAuth via Google, GitHub, etc.).
- Compiling custom native C extensions into Tauri beyond standard SQLite plugins.
- Packaging desktop and mobile apps in separate git repositories.

## Further Notes

- Upgrading to UUID keys for test runs and passages will require updating database migrations and schema definitions in the server database.
- The existing shared components (`TypingEngine`, `HistoryTable`, `SettingsForm`, `ResultSummary`, `PerformanceChart`, `TimelineChart`) remain the foundation for all views.
