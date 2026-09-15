# Stype

A lightweight typing test application for web, desktop, and mobile for practicing and tracking typing speed and accuracy.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Svelte](https://img.shields.io/badge/Svelte-5-orange.svg)](https://svelte.dev)
[![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB.svg)](https://tauri.app)

Stype is an offline-first typing test app. It runs in the browser without an account, packages as a native desktop app with local SQLite storage, or deploys as a multi-user server with background synchronization.

## Features

- **Passage and timed modes.** Practice with seeded pangrams and custom text, or test yourself against 15, 30, 60, or 120 second countdown timers.
- **Offline guest mode.** Start typing immediately without creating an account. Test runs, custom passages, and settings save directly to your browser via IndexedDB or to native SQLite on desktop.
- **Live metrics and Zen mode.** Track real-time words per minute and accuracy on the live HUD, or enable Zen mode to hide metrics until the test completes.
- **Configurable scrolling.** Choose between center auto-scroll, step scrolling, or manual scrolling to match your typing style.
- **Performance charts.** Review results with post-test summaries, timeline speed curves, error breakdowns, and lifetime statistics.
- **Multi-user sync.** Deploy a self-hosted server so users can create accounts, log in, and sync offline test runs and custom passages across devices.
- **Multi-platform.** Available as a web app, a self-hosted Node service, and desktop binaries for Linux, macOS, and Windows.

## Quick start

### Run locally

Prerequisites: Node.js 20 or later, and pnpm 9 or later.

```sh
# Clone the repository
git clone git@github.com:Trindade7/stype.git
cd stype

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open `http://localhost:5173` in your browser.

### Self-host with Docker

Run a complete instance with SQLite storage using Docker Compose:

```sh
# Copy the environment template
cp .env.example .env

# Start the container
docker compose up -d
```

Open `http://localhost:3000` in your browser. Default administrator credentials are `admin` and `admin123`.

## Documentation

- [Deployment guide](docs/deployment.md). Instructions for Docker Compose, bare Node.js deployments, systemd services, reverse proxies (Caddy and Nginx), environment variables, and database backups.
- [Installation guide](docs/installation.md). Instructions for installing desktop builds, hosting the static web client on Cloudflare Pages or static file servers, and configuring remote synchronization.
- [Development guide](docs/development.md). Contributor setup, testing with Vitest, type checking, Tauri builds, and code conventions.

## Architecture

Stype uses a conditional adapter strategy in SvelteKit:

- **Static client build.** Compiles to static HTML, JavaScript, and CSS using `@sveltejs/adapter-static`. Uses IndexedDB on the web or native SQLite via Tauri on desktop.
- **Node server build.** Compiles to a Node.js server using `@sveltejs/adapter-node`. Uses SQLite via `better-sqlite3` and Drizzle ORM, handling user authentication, sessions, admin management, and sync APIs.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
