# 03 — Production Containerization and Environment Template

**What to build:** Provide a turnkey self-hosting setup via Docker and Docker Compose. Include a multi-stage `Dockerfile` optimized for Node.js production runtime and SQLite persistence, a `docker-compose.yml` with persistent storage volume mapping, and an environment template documenting all server, database, security, and SMTP settings.

**Blocked by:** 02 — Configurable Initial Administrator Credentials

**Status:** completed

- [x] A multi-stage `Dockerfile` builds the application bundle and prepares a minimal production image running under the unprivileged `node` user.
- [x] The container image exposes port 3000 and configures persistent database storage under `/app/data`.
- [x] A `docker-compose.yml` file is provided that mounts `./data` to `/app/data` and maps port 3000 to the host.
- [x] A `.env.example` file is provided that lists and explains all configuration options: `PORT`, `HOST`, `ORIGIN`, `DATABASE_URL`, `INITIAL_ADMIN_PASSWORD`, `INITIAL_ADMIN_EMAIL`, and `SMTP_*` parameters.
- [x] Automated tests verify that container configurations and `.env.example` match recognized environment variables in the codebase.
