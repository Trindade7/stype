# 01 — Prefactor Pluggable Sync Backend Interface

**What to build:** Decouple the client sync controller from specific server endpoints by introducing a pluggable sync backend interface. The existing Node server HTTP communication becomes a concrete Node sync backend, preserving all existing sync functionality and passing all existing tests.

**Blocked by:** None, can start immediately.

**Status:** completed

- [x] Client sync controller uses a backend interface for authentication and synchronization operations.
- [x] Existing Node server HTTP communication lives in a dedicated Node backend adapter conforming to the interface.
- [x] Account linking and unlinking work identically across the application with no behavioral regressions.
- [x] Background polling and manual sync operations continue functioning with the Node backend.
- [x] All existing sync controller and account linking unit tests pass.
