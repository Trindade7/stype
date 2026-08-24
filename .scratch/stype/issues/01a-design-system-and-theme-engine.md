# 01a — Initialize Design System and Theme Engine

**What to build:** Configure the shadcn-svelte design system foundation using preset `bjH9VeWiI` on Tailwind CSS v4 and Svelte 5. Users can toggle between Dark, Light, and System themes across page reloads without visual flicker. Base typography defaults to Figtree while preserving monospace styling for typing tests.

**Blocked by:** None, can start immediately

**Status:** done

- [x] shadcn-svelte is initialized with preset `bjH9VeWiI` (Vega style, Zinc base, Teal accent, Small radius, Figtree font).
- [x] Tailwind CSS v4 global stylesheet contains required CSS variables and theme mappings for light and dark modes.
- [x] `mode-watcher` is installed and mounted in the root layout to manage light, dark, and system theme persistence without flashing unstyled content.
- [x] Base typography uses Figtree for standard UI text, with `font-mono` preserved for test passage, HUD, and typing cursor elements.
- [x] Type checks and automated test suites pass without regressions.
