# 06 — Tauri Desktop and Mobile Packaging with Native SQLite Persistence

**What to build:** Configure Tauri 2 in `src-tauri` to package the static frontend into native desktop (macOS, Windows, Linux) and mobile (iOS, Android) applications. Wire the asynchronous Local Store adapter to a native SQLite database on disk using Tauri's SQL plugin so typing history remains permanent on the operating system filesystem.

**Blocked by:**
- 01 — Conditional Static Adapter Build Pipeline
- 02 — Asynchronous Local Store Adapter with IndexedDB and Migration
- 05 — Bidirectional Background Synchronization API and Client Controller

**Status:** ready-for-agent

- [ ] Tauri 2 configuration files and manifests are initialized under `src-tauri`.
- [ ] Desktop builds compile cleanly and run the static SPA in a native operating system window.
- [ ] Mobile configurations support building and running the application in iOS and Android environments.
- [ ] On native desktop and mobile platforms, the Local Store adapter connects to native SQLite via Tauri's SQL plugin, storing the database file in the application data directory.
- [ ] Packaged native apps function completely offline on launch, and synchronize with remote servers when linked to a user account.
- [ ] Build and smoke tests verify that Tauri assets package correctly from the static build output.
