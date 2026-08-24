# 01 — Project Skeleton & Session Authentication

**What to build:** A fresh SvelteKit application with Drizzle ORM and SQLite. A user must be able to log in using an automatically seeded `admin` account, maintain an active session, and log out securely. Unauthorized users must be redirected to the login screen.

**Blocked by:** None — can start immediately

**Status:** complete

- [x] SvelteKit app skeleton is created with Drizzle ORM and SQLite configured.
- [x] `users` and `sessions` database schemas are defined.
- [x] The `admin` user is automatically seeded on application boot.
- [x] Login and logout UI are fully functional.
- [x] Server hooks enforce session validation and route protection.