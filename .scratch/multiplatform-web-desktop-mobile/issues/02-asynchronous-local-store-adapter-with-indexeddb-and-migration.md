# 02 — Asynchronous Local Store Adapter with IndexedDB and Migration

**What to build:** Replace the synchronous `localStorage` client storage layer with an asynchronous Local Store adapter. In web browsers, data persists to IndexedDB, removing the 5MB storage ceiling and preventing main-thread UI stutters when saving test runs. On first load, any existing test runs, custom passages, or settings found in `localStorage` migrate into IndexedDB without data loss.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The client storage layer exposes an asynchronous contract for reading and writing Test Runs, Custom Passages, and Settings.
- [ ] In web browsers, the storage adapter reads and writes records using browser IndexedDB.
- [ ] Completed test runs persist to IndexedDB asynchronously without blocking input or causing frame drops during active typing.
- [ ] On first launch with existing `localStorage` keys, records migrate to IndexedDB, and obsolete `localStorage` keys are cleaned up.
- [ ] Client views (TypingEngine, HistoryTable, SettingsForm, Passages) interact with the asynchronous store cleanly with loading states where necessary.
- [ ] Tests verify CRUD operations across all entities in the storage adapter and confirm accurate migration from legacy `localStorage` payloads.
