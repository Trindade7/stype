# Development guide

This guide covers setting up a local development environment, running tests, understanding the project structure, and following contribution conventions.

---

## Prerequisites

- **Node.js:** 20 or later.
- **pnpm:** 9 or later (`corepack enable` is recommended).
- **Rust:** Latest stable toolchain (required only when developing desktop features in `src-tauri`).

---

## Getting started

### 1. Clone the repository

```sh
git clone git@github.com:Trindade7/stype.git
cd stype
```

### 2. Install dependencies

```sh
pnpm install
```

### 3. Start the development server

```sh
pnpm dev
```

Open `http://localhost:5173` in your browser. Changes in `src/` hot-reload automatically.

---

## Project structure

```
stype/
├── CONTEXT.md             # Domain model and ubiquitous language glossary
├── docs/                  # Architecture Decision Records and specifications
│   ├── adr/               # Numbered ADRs
│   ├── deployment.md      # Self-hosting deployment guide
│   ├── installation.md    # Desktop and static hosting guide
│   └── development.md     # Contributor and development guide
├── src/
│   ├── lib/
│   │   ├── components/    # Svelte UI components (TypingEngine, HUD, charts)
│   │   ├── server/        # Server-side auth, db schema, seeders, and email
│   │   ├── storage/       # Multi-platform storage adapters (IndexedDB, SQLite)
│   │   ├── sync/          # Background synchronization controller
│   │   └── localStore.ts  # Local store bridge for guest typists
│   └── routes/            # SvelteKit route hierarchy
│       ├── +page.svelte   # Guest typing test page
│       ├── app/           # Authenticated user pages and admin dashboard
│       └── api/           # Sync and authentication endpoints
├── src-tauri/             # Tauri 2 desktop shell configuration and Rust code
├── static/                # Static assets served at the root
└── tests/                 # End-to-end and browser-level tests
```

---

## Available scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Starts the Vite development server with hot module replacement. |
| `pnpm build` | Builds the production Node server via `@sveltejs/adapter-node`. |
| `pnpm build:static` | Builds the static client SPA via `@sveltejs/adapter-static`. |
| `pnpm build:tauri` | Compiles the native desktop binaries with Tauri and Cargo. |
| `pnpm preview` | Serves the production build locally for verification. |
| `pnpm check` | Runs SvelteKit sync and `svelte-check` for TypeScript verification. |
| `pnpm test` | Executes the complete test suite using Vitest. |

---

## Testing and verification

Stype uses Vitest for testing and `svelte-check` for TypeScript verification. All tests focus on externally observable behavior rather than internal implementation details.

### Run the full test suite

```sh
pnpm test
```

### Run a specific test file

```sh
pnpm vitest run src/lib/components/TypingEngine.test.ts
```

### Watch mode during development

```sh
pnpm vitest src/lib/storage/indexeddb.test.ts
```

### Type checking

Run TypeScript and Svelte template diagnostics:

```sh
pnpm check
```

### Build verification tests

The file `src/build-verification.test.ts` executes end-to-end verification of the build pipeline, ensuring both static SPA and Node server bundles compile and maintain required asset routing.

---

## Contribution conventions

### Branch naming

Use clear branch prefixes:

- `feat/feature-name` for new user-facing functionality
- `fix/bug-name` for bug fixes and patches
- `docs/topic-name` for documentation additions
- `refactor/scope` for code improvements without behavior changes

### Commit messages

Write concise, descriptive commit messages following the Conventional Commits specification:

```
feat(engine): add step scrolling mode
fix(auth): handle expired password reset tokens gracefully
docs(deployment): add systemd service configuration
test(storage): verify indexeddb migration logic
```

### Domain vocabulary

Always check `CONTEXT.md` before naming variables, types, or UI components. Use canonical terms:

- Use `User` for authenticated typists, not `Account` or `Profile`.
- Use `Guest` for unauthenticated typists, not `Anonymous` or `Visitor`.
- Use `Test Run` for a single test attempt, not `Trial` or `Game`.
- Use `Passage` for typing text, not `Prompt` or `Snippet`.
- Use `Administrator` for elevated users, not `Superuser` or `Mod`.

### Pull request checklist

Before opening a pull request, ensure:

1. `pnpm check` passes with zero type errors.
2. `pnpm test` runs with all tests passing.
3. Commit history uses conventional commit format.
4. New features include corresponding tests verifying their behavior.
