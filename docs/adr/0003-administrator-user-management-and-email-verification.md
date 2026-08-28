# Administrator user management and SMTP-conditional email verification

We need server administrators to manage accounts and enforce verified email credentials while preserving offline and self-hosted local installations that lack mail server infrastructure.

We decided to add role-based authorization (`admin` and `user`) to the User entity, enforce a database-level invariant that at least one Administrator must always exist, and make email verification conditional on SMTP configuration. When SMTP is configured, self-registered users must confirm via a time-limited token before gaining full application access; when SMTP is not configured, accounts auto-confirm at registration to keep offline deployments fully functional without external mail dependencies. Admin-created users are always confirmed by default.
