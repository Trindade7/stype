# 01 — Role Authorization and Administration Route Shell

**What to build:** Establish role-based authorization for Users and Administrators. Elevate the default seeded admin user to the Administrator role on startup, guard the administration route so non-administrators receive a 403 Forbidden response, provide an "Administration" navigation link in the authenticated user dropdown menu visible only to Administrators, and render a base administration shell view.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] The user entity includes a role attribute supporting `admin` and `user`, defaulting to `user`.
- [x] Database initialization applies the role column idempotently for existing SQLite databases.
- [x] Database startup elevates the default seeded `admin` account to the `admin` role.
- [x] Authenticated sessions expose the user role on the request locals context.
- [x] Requests to `/app/admin/*` by non-administrators are denied with a 403 Forbidden status.
- [x] Requests to `/app/admin/*` by unauthenticated guests redirect to the login screen.
- [x] The authenticated user dropdown menu renders an "Administration" link targeting the admin area only when the logged-in user is an Administrator.
- [x] An administration page shell at `/app/admin/users` renders with proper layout constraints.
- [x] Automated tests verify role column migration, seeded account role elevation, server route authorization guards, and dropdown navigation link visibility.
