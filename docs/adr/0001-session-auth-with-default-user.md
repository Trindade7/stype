# Session-based authentication with seeded default user

We need to support user-specific history, settings, and passages for local and small personal server deployments without external service dependencies.

We decided to implement username and password authentication with server-side sessions stored in SQLite and managed via secure cookies. On initial database initialization, a default user account is automatically seeded (`admin` / `admin123`). This keeps the application fully functional offline while isolating user data.
