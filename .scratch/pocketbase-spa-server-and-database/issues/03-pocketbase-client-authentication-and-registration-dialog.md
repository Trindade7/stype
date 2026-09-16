# 03 — PocketBase Client Authentication and Registration Dialog

**What to build:** Allow typists to register new accounts and log into existing accounts on PocketBase directly from the SPA account dialog. When visiting a PocketBase-hosted SPA, the dialog detects the current origin automatically. The client authenticates against the users collection and saves the session to local storage.

**Blocked by:** 01 — Prefactor Pluggable Sync Backend Interface, 02 — PocketBase Schema Migrations and Containerized SPA Server.

**Status:** completed

- [x] SPA account linking dialog provides tabs for both logging into existing accounts and registering new accounts.
- [x] Visiting the SPA directly on a PocketBase host defaults the server URL to the current website origin.
- [x] PocketBase sync backend registers new users and authenticates existing users using the PocketBase client library.
- [x] Successful authentication saves the user profile and session token to local storage and updates the application header.
- [x] Form validation and server rejection errors display clearly inside the dialog without closing the modal.
- [x] Component tests verify login, registration, and error states in the account dialog.
