# Multi-platform offline-first architecture

We need to distribute Stype across web browsers, desktop operating systems (macOS, Windows, Linux), and mobile devices (iOS, Android) without duplicating user interfaces or requiring a live server connection for basic typing practice.

We decided to package a unified Single Page Application (SPA) using Tauri 2 in a monorepo, backed by a local-first asynchronous storage adapter (native SQLite on desktop and mobile, IndexedDB on web). SvelteKit uses conditional adapters to produce static assets for Tauri and Node server builds for self-hosted instances. Multi-device accounts synchronize in the background over a JSON API using client-generated UUIDs, append-only test runs, and timestamped last-write-wins with soft deletes.
