# Server-side pagination for user administration

We need the Administrator user management table to remain responsive and scalable as the user base grows, without degrading server response times or exhausting browser memory.

We decided to implement server-side pagination with SQL query limits, offsets, and URL search parameters (`?page=...&search=...`) for user administration at `/app/admin/users`, using a fixed page size of 25 users. While user-scoped collections like passages and test run history use client-side pagination because single-user datasets are naturally bounded, users are global system records that grow indefinitely. Server-side pagination and debounced query navigation prevent large payload transfers and heavy client-side serialization while keeping search shareable and deep-linkable.
