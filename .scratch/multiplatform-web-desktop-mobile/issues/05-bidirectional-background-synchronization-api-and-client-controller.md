# 05 — Bidirectional Background Synchronization API and Client Controller

**What to build:** Implement bidirectional background synchronization between client devices and authenticated user accounts on a self-hosted Stype server. Typists can link their client via server URL and credentials. The client merges Test Runs using an append-only set union, and resolves Custom Passages and Settings using timestamped last-write-wins and soft-delete tombstones.

**Blocked by:** 04 — UUID-Based Data Models and Schema Support for Offline Records.

**Status:** ready-for-agent

- [x] Client interface provides an account linking dialog allowing typists to enter a server URL and user credentials.
- [x] Successful authentication retrieves and securely stores an API session token on the client.
- [x] Background sync pushes pending local Test Runs to the `/api/sync` endpoint and receives new server runs, merging them idempotently by UUID.
- [x] Custom Passages synchronize bidirectionally, applying updates according to the newest `updated_at` timestamp and propagating soft deletes across devices.
- [x] Settings resolve conflicts using last-write-wins based on `updated_at`.
- [x] Network failures during sync fail gracefully without interrupting typing, and retry automatically upon reconnect.
- [x] API endpoint tests verify batch sync payloads, conflict resolution rules, and tombstone propagation.
