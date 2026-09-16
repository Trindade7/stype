# 04 — PocketBase Bidirectional Data Synchronization

**What to build:** Enable background data synchronization between local storage and PocketBase collections. Merges test runs into an append-only collection using client identifiers, updates custom passages using timestamped Last-Write-Wins and soft deletes, and synchronizes settings. Offline tests queue locally and upload when connectivity returns.

**Blocked by:** 03 — PocketBase Client Authentication and Registration Dialog.

**Status:** ready-for-agent

- [ ] Test runs recorded locally upload to the PocketBase test runs collection and merge server runs into local storage using client-generated identifiers without duplicates.
- [ ] Custom passages sync bidirectionally using updated timestamp comparisons and propagate soft delete tombstones.
- [ ] Settings sync bidirectionally using Last-Write-Wins based on updated timestamp.
- [ ] Disconnections during typing tests do not interrupt practice, and pending records upload on next successful connection.
- [ ] Unlinking an account clears server tokens while retaining local test history.
- [ ] Automated tests verify batch data reconciliation against the PocketBase backend.
