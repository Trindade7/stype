# 05 — Shadcn-Svelte Form Controls Migration

**What to build:** Accessible design-system form components (Select, RadioGroup, Switch/Checkbox, Textarea) replacing native HTML form controls across Settings and Passage management pages for both Guest and authenticated User flows.

**Blocked by:** None — can start immediately.

**Status:** closed

- [x] SettingsForm replaces native select dropdowns (duration, passage length, theme) with shadcn-svelte Select primitives.
- [x] SettingsForm replaces native radio inputs with shadcn-svelte RadioGroup / styled toggle controls.
- [x] SettingsForm replaces native checkbox inputs with shadcn-svelte Switch or Checkbox primitives.
- [x] Custom passage creation and edit forms in `/passages` and `/app/passages` replace native textareas with shadcn-svelte Textarea primitives.
- [x] All updated form controls support both progressive enhancement form actions (`use:enhance`) on `/app` pages and client-side reactive saving on Guest pages.
- [x] Tests verify that form interactions update settings correctly and passage submission flows remain intact.
