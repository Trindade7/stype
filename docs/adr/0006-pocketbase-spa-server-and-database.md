# PocketBase SPA server and database

We need a lightweight self-hosting option that serves the static SPA and manages database storage without running a separate Node runtime.

We decided to provide an all-in-one deployment option using PocketBase. PocketBase serves the compiled static SPA from its public directory and stores user accounts, settings, custom passages, and test runs in native collections. The client uses a pluggable sync backend interface with the official PocketBase SDK and Server-Sent Events, preserving offline-first local storage while synchronizing changes in the background.
