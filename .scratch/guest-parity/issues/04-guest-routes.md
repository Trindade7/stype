# 04 — Create Guest Passages and Stats Routes

**What to build:** Guests currently lack access to the `Passages` and `Stats` views, despite the fact that `localStore` tracks their Lifetime Stats and can manage Custom Passages. We need to expose new `/stats` and `/passages` routes in the unauthenticated Guest layout that offer these features using local data.

**Blocked by:** 03-add-pagination.md

**Status:** ready-for-agent

- [ ] Create `src/routes/stats/+page.svelte` that displays Guest Lifetime Stats pulled from `localStore.getTestRuns()`, mirroring the layout of `/app/stats`.
- [ ] Create `src/routes/passages/+page.svelte` that displays Guest Custom Passages pulled from `localStore.getCustomPassages()`, mirroring the layout of `/app/passages`.
- [ ] Ensure the Guest `/passages` route allows creating and deleting Custom Passages via `localStore.saveCustomPassage` and `localStore.deleteCustomPassage`.
- [ ] Ensure the Guest header links to `/stats` and `/passages` resolve successfully.