# 02 — PocketBase Schema Migrations and Containerized SPA Server

**What to build:** Provide an all-in-one PocketBase deployment package that runs as a standalone server and database. Automated migrations run on startup to create collections, fields, indexes, and user-level access rules. The server serves the compiled static Single Page Application from its public directory on port 8090 and persists data in a mounted storage directory.

**Blocked by:** None, can start immediately.

**Status:** ready-for-agent

- [ ] PocketBase migration files configure collections for settings, custom passages, and test runs alongside the built-in users collection.
- [ ] Access rules on collections enforce that users can only read, write, and delete their own records.
- [ ] Dedicated Dockerfile builds the static SPA, pulls the PocketBase binary, bundles migrations, and serves the static files from the public folder.
- [ ] Dedicated Docker Compose file configures port 8090 and persistent data volume mounts.
- [ ] Verification tests validate that migrations contain required fields and access rules.
