---
title: PocketBase SPA Server and Database
status: ready-for-agent
---

## Problem Statement

Typists who self-host Stype currently must run a multi-container or Node runtime environment with a SvelteKit server build to support user accounts and background data synchronization. Running a Node runtime, compiling server endpoints, and managing server processes adds operational overhead and resource usage for individuals or small teams who only want a lightweight, single-binary server. Furthermore, the existing static Single Page Application only links against the custom Node server sync API, preventing typists from using lightweight alternatives such as PocketBase for backend storage and authentication.

## Solution

Stype provides a fourth deployment and synchronization option using PocketBase as a single server binary and SQLite database. PocketBase serves the static SPA bundle directly from its public directory and stores user accounts, settings, custom passages, and test runs in native collections. The client introduces a pluggable sync backend interface, allowing the same unified frontend bundle across web, desktop, and PocketBase hosting to communicate with either a Stype Node server or PocketBase. Typists continue to practice with an offline-first workflow, while the PocketBase sync backend uses the official PocketBase SDK and Server-Sent Events to deliver real-time background synchronization.

## User Stories

1. As a self-hoster, I want to deploy Stype with a single PocketBase container or binary, so that I do not have to configure or maintain a separate Node runtime environment.
2. As a self-hoster, I want PocketBase to serve the static Single Page Application assets directly from its public directory, so that I do not need a reverse proxy or separate web server for the frontend.
3. As a self-hoster, I want database collections, fields, and API access rules created automatically upon first startup, so that I do not have to perform manual schema imports in the admin dashboard.
4. As an administrator, I want to inspect user accounts, test run records, custom passages, and settings in the built-in PocketBase admin dashboard, so that I can monitor server data and manage users with a web interface.
5. As an administrator, I want PocketBase access rules to enforce row-level ownership, so that users can only read, write, and delete their own test runs, passages, and settings.
6. As a guest typist visiting a PocketBase-hosted instance, I want to practice typing immediately without creating an account or logging in, so that I experience zero barrier to practice.
7. As an offline typist using a PocketBase-hosted SPA, I want my test runs and settings saved directly to local browser storage with zero latency, so that network latency or disconnections never interrupt my typing practice.
8. As a typist on a PocketBase instance, I want to open the account dialog and see the server URL pre-filled with the current website origin, so that I do not have to copy and paste the host address.
9. As a new typist on a PocketBase instance, I want to register a new account directly from the SPA account dialog, so that I do not need to request an account from an administrator or visit an external page.
10. As an existing typist on a PocketBase instance, I want to log in using my username or email and password within the SPA dialog, so that my account links to the server.
11. As a newly authenticated user with guest data in local storage, I want my local test runs, custom passages, and settings to upload and merge into my PocketBase account, so that I do not lose my prior offline practice.
12. As an authenticated user completing a test run, I want the run saved immediately to local storage and synchronized to PocketBase in the background, so that my post-test summary appears without delay.
13. As an authenticated user practicing while disconnected from the internet, I want completed test runs queued locally and sent to PocketBase once connectivity returns, so that my typing records never get lost.
14. As a multi-device typist, I want custom passages edited on one device to synchronize to PocketBase and update on my other devices based on timestamps, so that the latest version appears everywhere.
15. As a multi-device typist, I want deleted custom passages to create soft delete tombstones that sync to PocketBase, so that deleted passages do not reappear when other devices sync.
16. As a multi-device typist, I want completed test runs from multiple devices to merge into an append-only collection using client identifiers, so that my lifetime stats reflect all my practice sessions without duplicate records.
17. As an active typist with multiple browser tabs or devices open simultaneously, I want the client to receive real-time updates through Server-Sent Events, so that changes on one device appear immediately on other active devices.
18. As an authenticated user experiencing an internet interruption, I want the real-time subscription to automatically reconnect when the network returns, so that cross-device synchronization resumes without manual page reloads.
19. As a desktop or static web typist, I want to connect my client to either a Stype Node server or a PocketBase server using the same application bundle, so that I can choose which self-hosted backend to use.
20. As an authenticated user, I want the option to unlink my account from the PocketBase server, so that I can safely revert my local client to guest mode on shared computers.
21. As a self-hoster, I want PocketBase data stored in a single mounted directory, so that backing up and restoring my server database requires copying only one folder.
22. As an administrator who wants a private server, I want to disable public registration through PocketBase collection rules, so that only invited typists can create accounts.
23. As a typist entering invalid login credentials, I want clear and specific error messages displayed inside the account dialog, so that I know how to correct my username or password.
24. As a typist attempting to register with an existing username or email, I want validation feedback indicating the conflict, so that I can choose a different username.

## Implementation Decisions

- Pluggable Sync Backend Architecture. The client sync controller decouples synchronization and authentication into a pluggable backend interface. The interface defines operations for logging in, registering, logging out, fetching remote changes, uploading local changes, and subscribing to real-time updates. The controller selects the backend implementation dynamically based on server response signatures or host origin.
- PocketBase Sync Implementation. A dedicated PocketBase backend implementation uses the official PocketBase JavaScript SDK. It handles authentication against the built-in users collection, manages token persistence, executes collection queries for settings, custom passages, and test runs, and maintains a Server-Sent Events subscription for live collection updates.
- Native PocketBase Schema and Access Rules. The backend uses four collections: the standard users auth collection, a user settings collection, a custom passages collection, and a test runs collection. Every collection links records to the owning user and applies access rules requiring an authenticated user matching the record owner. Test runs store the client identifier in an indexed field to preserve append-only union semantics. Custom passages track timestamps and soft deletion flags.
- Automated Schema Provisioning. Collections, fields, indexes, and security rules are provisioned through JavaScript migration files executed automatically by the PocketBase binary on startup. This eliminates manual schema imports in the admin console and ensures reproducible fresh installations.
- Account Dialog Registration Tab. The account linking modal in the SPA expands to include both login and registration tabs. When the SPA is loaded directly from a PocketBase host, the server URL field automatically defaults to the current origin.
- Containerization and Local Runner. A dedicated Dockerfile and Docker Compose configuration build the static SPA, download the PocketBase binary, copy migration scripts, and configure data directory mounts and port mappings on port 8090. A package script provides a local runner command for development.

## Testing Decisions

- Good test criteria. Tests must assert observable external behavior, verifying that credentials authenticate, records synchronize correctly, and errors surface clearly without asserting internal implementation details or private state.
- Primary testing seams.
  1. The client sync controller seam. Tests verify that the controller authenticates users, registers new accounts, and performs synchronization against a PocketBase backend interface, verifying Last-Write-Wins for passages and settings and append-only union for test runs.
  2. The account dialog component seam. Tests verify that the dialog renders login and registration tabs, submits forms, handles server errors, and toggles between linked and unlinked states.
  3. The schema migration verification seam. Tests verify that PocketBase migration scripts define valid collections, required fields, and appropriate ownership rules.
- Prior art. Existing tests in the sync controller test suite and account linking dialog test suite provide direct patterns for mocking backend requests, asserting sync payload merging, and testing dialog interactions.

## Out of Scope

- Modifying or replacing the existing Node server deployment or SvelteKit SSR routes.
- Migrating the primary local client storage away from IndexedDB on web or SQLite on desktop.
- Admin dashboard reimplementation inside the SPA, since PocketBase provides a built-in admin web interface.
- OAuth2 social login providers in this initial PocketBase integration.

## Further Notes

- PocketBase port 8090 avoids collisions with the Node server port 3000, allowing both servers to operate on the same host during testing.
- The client-generated identifier field on test runs avoids conflicts with PocketBase internal record identifier constraints.
