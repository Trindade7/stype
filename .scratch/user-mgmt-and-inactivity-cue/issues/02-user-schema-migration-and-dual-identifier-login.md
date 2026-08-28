# 02 — User Schema Migration and Dual Identifier Login

**What to build:** Expand user accounts in the database to include unique email addresses and display names while preserving existing username handles. Existing SQLite databases automatically apply safe column alterations on initialization. The default seeded admin user is updated with an email of `admin@stype.local` and a display name of `Admin`. Typists visiting the login page can enter either their username or their email address to authenticate with their password.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Database schema includes unique `email` and optional `name` columns on the users table.
- [x] Database initialization applies safe, idempotent column additions for existing databases without data loss.
- [x] Seeded admin user is created or updated with email `admin@stype.local` and display name `Admin`.
- [x] Typists can successfully log in using their username and password.
- [x] Typists can successfully log in using their email address and password.
- [x] Invalid username/email or password credentials return a clean error message.
- [x] The login form input label and placeholder indicate that either username or email is accepted.
- [x] Quick-fill credential buttons for the default admin user continue to work seamlessly.
