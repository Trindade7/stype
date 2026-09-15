# 02 — Configurable Initial Administrator Credentials

**What to build:** Allow instance administrators to define initial administrator credentials via environment variables during initial database seeding, while preserving zero-friction defaults for development and test suites.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Initial database seeding checks `INITIAL_ADMIN_PASSWORD` and `INITIAL_ADMIN_EMAIL` environment variables when populating the administrator account.
- [x] If `INITIAL_ADMIN_PASSWORD` is provided, the seeded administrator account is initialized with a secure hash of that password.
- [x] If `INITIAL_ADMIN_EMAIL` is provided, the seeded administrator account is assigned that email address.
- [x] If either environment variable is omitted, the seeding process cleanly falls back to `admin123` and `admin@stype.local`.
- [x] Automated tests verify that custom environment variables correctly initialize administrator credentials and that fallback behavior functions when variables are omitted.
