# 01 — Conditional Static Adapter Build Pipeline

**What to build:** Configure the build system so the frontend can compile into a standalone static Single Page Application (SPA) when `STATIC_BUILD=1` is provided, while maintaining default Node server adapter builds for self-hosted instances. The static export contains an `index.html` fallback and serves all client-rendered views (typing tests, history, stats, passages, and settings) without requiring server-side rendering or a live Node process.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] When building with `STATIC_BUILD=1`, SvelteKit uses `@sveltejs/adapter-static` with an `index.html` fallback.
- [x] Running a static build produces a clean, standalone static asset directory without throwing errors on server routes.
- [x] Previewing or serving the static build allows a user to run typing tests, view history, inspect stats, and adjust settings in a browser without a backend server running.
- [x] When `STATIC_BUILD` is unset, the project builds with `@sveltejs/adapter-node` to support self-hosted server deployments.
- [x] Automated build verification tests assert that both static and node builds complete successfully without errors.
