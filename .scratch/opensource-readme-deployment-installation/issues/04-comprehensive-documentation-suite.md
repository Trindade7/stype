# 04 — Comprehensive Documentation Suite

**What to build:** Deliver complete, polished documentation for typists, instance administrators, and open source contributors. Replace the template README with a project-focused overview, and provide dedicated guides for self-hosting deployment, multi-platform installation, and developer contributions.

**Blocked by:** 01 — Open Source Licensing and Package Metadata, 02 — Configurable Initial Administrator Credentials, 03 — Production Containerization and Environment Template

**Status:** completed

- [x] The root `README.md` introduces Stype with the official tagline, feature overview (Passage & Timed modes, offline guest mode, sync, live HUD, analytics), quick start instructions (Docker and pnpm), links to guides, and license information.
- [x] `docs/deployment.md` provides a complete self-hosting guide covering Docker Compose, bare-metal Node.js with systemd, reverse proxies (Caddy and Nginx with HTTPS), full environment variable reference, and SQLite backup/restore procedures.
- [x] `docs/installation.md` guides typists and operators on downloading and running desktop binaries (Linux, macOS, Windows), building Tauri packages from source, deploying static web clients (Cloudflare Pages, Vercel, static Nginx), and configuring remote synchronization.
- [x] `docs/development.md` guides contributors through local environment prerequisites, running the dev server, testing with `pnpm test`, typechecking with `pnpm check`, and project conventions (branching, conventional commits).
- [x] Automated tests verify that all documentation files exist, contain required headers, and have valid internal file and link references.
