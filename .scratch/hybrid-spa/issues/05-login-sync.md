# 05 — Login Sync Endpoint & Client Sync Flow

**What to build:** 
When a Guest user logs into an account, they shouldn't lose the typing history and settings they accumulated locally. This ticket builds the mechanism to automatically upload and merge their `localStorage` data into the server database upon successful authentication.

**Blocked by:** 04 — Guest History & Settings Pages

**Status:** done

- [x] Create a new `POST /app/api/sync` endpoint that accepts a JSON payload of Guest `Test Run`s, `Settings`, and `Custom Passage`s, and securely inserts/merges them into the authenticated User's SQLite database records.
- [x] Update the client-side login process at `/app/login`: upon successful form submission/action, check the `localStorage` utility. If Guest data exists, send it to the sync endpoint, wait for a successful response, and clear the local store before navigating to `/app`.
- [x] Write integration tests for the sync endpoint ensuring idempotency and data integrity.
- [x] Add a component test for the login page to verify the client-side sync flow triggers correctly.
