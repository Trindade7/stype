---
title: UI Improvements & Modernization
status: done
---

## Problem Statement

Users and Guests of Stype experience several UI inconsistencies, missing navigation elements, and interface limitations across different devices and pages:

1. **Layout Shift from Scrollbar Toggle**: When navigating between pages of varying height or when content expands dynamically, the appearance and disappearance of the vertical browser scrollbar causes the fixed navigation header and centered layout to jitter horizontally.
2. **Missing Mobile Navigation for Guests**: On mobile viewports, the guest header hides all primary navigation links and only exposes a "Log in" button. Unauthenticated Guests on mobile devices cannot navigate to History, Stats, Passages, or Settings.
3. **Unclear Focus and Input State in the Typing Engine**: The typing area lacks distinct visual feedback when focused versus blurred. The cursor continues to pulse even when the input element is unfocused, confusing users about whether typing will register. Furthermore, upon page reload or initial visit, the input is not always guaranteed to be immediately active and ready for keystroke entry.
4. **Lack of Performance Visualization in Lifetime Stats**: The Lifetime Stats page only displays static metric aggregate cards (Tests Completed, Average Speed, Peak Speed, Average Accuracy). Users and Guests have no visual representation of their speed and accuracy trends across their completed Test Runs.
5. **Inconsistent Native Form Controls**: Settings and passage management pages use native HTML form controls (`<select>`, `<input type="radio">`, `<input type="checkbox">`, and `<textarea>`) styled with utility classes instead of using standard design-system UI primitives from shadcn-svelte.

## Solution

Stype will implement comprehensive UI improvements across layout stability, mobile navigation, typing engine interactivity, statistical data visualization, and design-system form modernization:

1. **Stable Scrollbar Layout**: Apply stable scrollbar gutter styling globally to prevent layout shift and header alignment jumping across page transitions.
2. **Guest Mobile Menu**: Add an accessible mobile dropdown navigation menu to the guest header, providing mobile Guests full access to History, Stats, Passages, Settings, theme controls, and login actions.
3. **Responsive Typing Focus State & Immediate Readiness**: Update the Typing Engine to distinctly style the typing container border and cursor based on focus state. Auto-focus the input on page load and route mount, and allow global keypresses to automatically refocus the typing input.
4. **Lifetime Performance Trend Graph**: Create a reusable performance chart component visualizing historical speed (WPM) and accuracy trends across chronological Test Runs, integrating it into both Guest and authenticated Lifetime Stats pages with support for empty states and hover tooltips.
5. **Shadcn-svelte Form Components**: Modernize all settings and passage forms by replacing native select, radio, checkbox, and textarea elements with accessible shadcn-svelte component primitives compatible with both SvelteKit progressive enhancement form actions and client-side Local Store handlers.

## User Stories

1. As a Guest or User, I want the navigation header and page layout to remain stable when navigating between long and short pages, so that I do not experience distracting horizontal layout shifts when the scrollbar appears.
2. As a Guest on a mobile device, I want a mobile menu in the header, so that I can easily navigate to History, Stats, Passages, and Settings without needing a desktop viewport.
3. As a Guest on a mobile device, I want to toggle between light, dark, and system themes from the mobile header, so that I can customize my viewing preferences on mobile.
4. As a Guest on a mobile device, I want to access the login page from the header, so that I can authenticate into my account from my phone.
5. As a User, I want the typing test area to highlight with an active border when focused, so that I immediately know keystrokes will be registered.
6. As a User, I want the typing test area border to dim and indicate an inactive state when unfocused, so that I clearly know when the engine is not capturing input.
7. As a User, I want the character cursor underline to only pulse when the typing engine is actively focused, so that I am not misled by a blinking cursor when the input is blurred.
8. As a User, I want the typing engine to be immediately focused and ready for typing upon page load or reload, so that I can begin practicing instantly without having to click the container first.
9. As a User, I want pressing any alphanumeric or typing key while unfocused on the test page to automatically focus the typing engine, so that accidental focus loss does not disrupt my typing flow.
10. As a Guest, I want to view a historical performance graph on `/stats`, so that I can visualize my speed and accuracy progression across all my local Test Runs.
11. As an authenticated User, I want to view a historical performance graph on `/app/stats`, so that I can track my long-term typing progression across all my account Test Runs.
12. As a Guest or User with no completed Test Runs, I want the Lifetime Stats performance graph to display an informative empty state, so that I know to complete typing tests to populate the graph.
13. As a Guest or User viewing the performance graph, I want to hover over historical data points to view the specific WPM, accuracy, mode, and date for that Test Run, so that I can inspect individual performance milestones.
14. As a Guest or User on the Settings page, I want to select my preferred Test Mode using design-system radio groups, so that the selection interface is visually consistent and accessible.
15. As a Guest or User on the Settings page, I want to choose Timed Mode duration using a design-system select dropdown, so that the dropdown matches the rest of the application styling.
16. As a Guest or User on the Settings page, I want to select preferred Passage Length using a design-system select dropdown, so that the option picker looks cohesive.
17. As a Guest or User on the Settings page, I want to select visual theme using a design-system select dropdown, so that theme options are presented cleanly.
18. As a Guest or User on the Settings page, I want to toggle Zen Mode using a design-system switch or checkbox, so that distraction-free mode can be toggled smoothly.
19. As a Guest or User creating or editing a Custom Passage, I want to enter passage text using a design-system textarea component, so that text input styling matches the application design system.
20. As a developer, I want all updated form controls to support both server-side form actions via progressive enhancement and client-side reactive state updates, so that Guest and authenticated User flows remain consistent.

## Implementation Decisions

- **Global Scrollbar Gutter Configuration**:
  - Configure stable scrollbar gutters globally on the root HTML document so that the viewport layout width remains constant regardless of whether vertical scrolling is active on a given page.
  - Maintain the fixed/sticky header alignment to prevent horizontal offset mismatches between header and main content containers.

- **Guest Mobile Navigation Architecture**:
  - Enhance the Guest Header with a responsive mobile menu dropdown or sheet triggered by a mobile menu button on viewports smaller than the standard desktop breakpoint.
  - The mobile menu will contain navigation links to `/history`, `/stats`, `/passages`, `/settings`, a theme selection toggle, and a direct link to `/app/login`.
  - Ensure the mobile menu closes automatically when a navigation link is clicked.

- **Typing Engine Focus State and Auto-Focus Mechanics**:
  - Introduce reactive focus tracking (`isFocused`) on the hidden typing input within the Typing Engine.
  - Dynamically style the typing container with active border and ring classes when focused, and muted border classes when blurred.
  - Restrict the animated character cursor to only render when `isFocused` is true. When blurred, render a static or dimmed cursor indicator.
  - Trigger programmatic focus on mount and after passage transitions.
  - Attach a window-level keydown handler that redirects typing keystrokes back to the input if the user begins typing while unfocused (ignoring global shortcut keys like Tab, Escape, or modifier keys).

- **Lifetime Performance Chart Component**:
  - Build a reusable `PerformanceChart` component adhering to the Component Props Strategy.
  - The component accepts an array of historical test run summary points (containing run timestamp/index, WPM, accuracy, and test mode).
  - The visualization renders SVG trend lines for speed (WPM) and accuracy (%) over chronological test run sequence or date buckets, consistent with the existing post-test timeline chart aesthetic.
  - Provide interactive hover guides with tooltip overlays displaying detailed run metrics.
  - Integrate `PerformanceChart` into the Guest stats route (`/stats`) using data from the Local Store, and into the authenticated stats route (`/app/stats`) using server-loaded lifetime test run history.

- **Shadcn-svelte Form Components Migration**:
  - Install and configure required shadcn-svelte component primitives (Select, RadioGroup, Switch/Checkbox, Textarea).
  - Refactor `SettingsForm` to replace native select elements with `Select`, native radio inputs with `RadioGroup` / styled toggle primitives, and native checkboxes with `Switch` / `Checkbox`.
  - Maintain hidden inputs or appropriate `name`/`value` bindings within form wrappers to ensure SvelteKit progressive enhancement form actions (`use:enhance`) on `/app/settings` continue to submit valid FormData payloads.
  - Retain the reactive props and `onSave` event handler on `SettingsForm` for Guest Local Store persistence.
  - Refactor Custom Passage creation and edit dialogs in `/passages` and `/app/passages` to use shadcn-svelte `Textarea` and `Label` primitives.

## Testing Decisions

All tests will verify external user-facing behaviors and visual contracts rather than private component state:

- **Component Seam (`src/lib/components/TypingEngine.test.ts`)**:
  - Test that the typing container updates border and ring styling upon input focus and blur events.
  - Test that the character cursor indicator is rendered during focus and hidden/dimmed during blur.
  - Test that the input receives focus upon component mount.
- **Chart Component Seam (`src/lib/components/PerformanceChart.test.ts`)**:
  - Test that the performance chart renders speed and accuracy SVG paths when given historical test run data.
  - Test that hover events trigger tooltip overlays with correct WPM and accuracy numbers.
  - Test that an empty state placeholder is rendered when zero test runs are supplied.
- **Form Controls Seam (`src/lib/components/SettingsForm.test.ts`, `src/routes/app/settings/page.server.test.ts`)**:
  - Test that interacting with shadcn-svelte Select, RadioGroup, and Switch components updates form values.
  - Test that submitting the form triggers the `onSave` callback with expected settings values.
  - Test that server form actions receive correct FormData fields when submitted.
- **Mobile Navigation Seam (`src/lib/components/GuestHeader.test.ts`, `src/routes/layout.test.ts`)**:
  - Test that the mobile menu trigger button renders on mobile viewports.
  - Test that clicking the menu trigger exposes links to History, Stats, Passages, Settings, and Log in.
- **Route Integration Seam (`src/routes/stats/page.svelte.test.ts`, `src/routes/app/stats/page.svelte.test.ts`)**:
  - Test that the Guest stats page loads test runs from the Local Store and passes them into the performance chart.
  - Test that the authenticated stats page renders the performance chart with server-supplied test run history.

## Out of Scope

- Modifying the underlying SQLite database schema or backend database engine.
- Adding real-time multi-user multiplayer typing competitions.
- Exporting statistical chart data as downloadable CSV or image formats.
- Offline PWA service worker caching for authenticated routes.

## Further Notes

- The performance chart should gracefully handle varied test run counts (e.g., 1 run, 10 runs, 100+ runs) with responsive SVG scaling and adaptive axis tick intervals.
- Form controls must remain fully accessible via keyboard navigation (Tab, Arrow keys, Enter, Space) and retain high-contrast focus rings.
