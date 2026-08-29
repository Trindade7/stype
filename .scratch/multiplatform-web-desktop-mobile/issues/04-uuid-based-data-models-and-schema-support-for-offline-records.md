# 04 — UUID-Based Data Models and Schema Support for Offline Records

**What to build:** Update client and server data schemas so Test Runs and Custom Passages use client-generated UUID identifiers rather than autoincrement integers. Add `updated_at` and `deleted_at` timestamp fields to Custom Passages and Settings. This enables offline clients to generate records independently without ID collisions and supports tombstone-based deletions.

**Blocked by:** 02 — Asynchronous Local Store Adapter with IndexedDB and Migration.

**Status:** ready-for-agent

- [ ] Client storage and server SQLite schemas define `id` as a UUID string for Test Runs and Custom Passages.
- [ ] Database migrations on the server upgrade existing integer-based records to UUIDs while maintaining relational integrity.
- [ ] Custom Passages and Settings include `updated_at` and nullable `deleted_at` timestamps for tracking edits and deletions.
- [ ] Deleting a Custom Passage in the client or server marks the record with a `deleted_at` timestamp rather than hard-deleting it immediately.
- [ ] Database tests and client store tests verify UUID creation, timestamp updates, and soft-delete behavior across all record types.
