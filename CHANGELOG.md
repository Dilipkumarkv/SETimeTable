# Changelog

All notable changes to the College Timetable PWA project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - Phase 8: Data Handoff Architecture, Real Data Verification & Production Delivery
### Added
- **Zero-Code-Change Real Data Contract Validation (`tests.js` Group I)**:
  - Verified seamless replacement of `data.js` with real production schedule (`isSample: false`), full 15-class cohort, 6 teaching days (MON–SAT), multi-batch lab rotations, and faculty dictionaries.
  - Automated tests confirming `validateTimetable()` passes with 0 errors on production data without altering any application source code.
  - Automatic suppression of sample warning banner when `isSample: false`.
- **Dynamic Clock Orchestration**:
  - In `app.js`, configured dynamic time bootstrap: sample dataset defaults to simulated time (`MON 12:00`) for immediate testing, while handed-off production data (`isSample: false`) directly engages the live device clock with zero manual intervention required.
- **Service Worker Cache Invalidation & Seamless Update Flow**:
  - Documented and tested deterministic cache version bumping in `sw.js` (`CACHE_NAME = 'timetable-cache-vX'`), pre-caching `./data.js`, background fetch detection, in-app update notification banner, and stale cache purging on `activate`.
- **GitHub Pages Sub-Path Portability**:
  - Formally audited all assets, links, manifests, and module imports to verify 100% relative path conformance (`./`) for static hosting under GitHub Pages repository subpaths (`https://<user>.github.io/<repo>/`).
- **Comprehensive Final Master Specification Verification**:
  - Expanded zero-dependency automated test suite to **70 tests**, covering validator rules, boundary conditions, rollover, matrix rendering, collision detection, cross-view filters, PWA offline caching, edge cases, accessibility, and real data handoff.

## [0.8.0] - Phase 7: Hardening, Accessibility & Production Audit
### Added
- **Word Wrapping & Layout Hardening (`styles.css`)**:
  - Added `overflow-wrap: anywhere; word-break: break-word;` across subject titles, table cells, and lecturer badges, preventing horizontal overflow when encountering lengthy subject names.
- **Robust Multi-Lecturer & Null Safety (`ui-now.js`, `ui-next.js`, `ui-overview.js`)**:
  - Guarded all faculty dictionary lookups against missing or null lecturer records, safely falling back to initials without rendering `undefined` or throwing runtime exceptions.
  - Correctly preserved multi-lecturer allocations (e.g. 2 faculty members assigned to a single period).
- **Accessibility & Focus Visibility**:
  - Added accessible high-contrast `:focus-visible` styling with 2px offset rings across all interactive buttons, selects, and inputs for keyboard navigation.
  - Augmented HTML shell with WAI-ARIA tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`), accessible screen-reader labels, and polite live status regions (`role="status"`, `aria-live="polite"`).
  - Added semantic `scope="col"` and `scope="row"` headers across Day and Week matrix overview grids.
- **Dead Code Audit**:
  - Verified complete absence of placeholder code, commented-out dead blocks, `TODO` statements, or third-party runtime dependencies.

## [0.7.0] - Phase 6: PWA, Service Worker & Offline Engine
### Added
- **Web App Manifest (`manifest.webmanifest`)**:
  - Configured standalone PWA manifest conforming to W3C standards with `id`, `name`, `short_name`, `start_url: "./"`, `scope: "./"`, `display: "standalone"`, `theme_color: "#1e3a8a"`, `background_color: "#f8fafc"`.
  - Created compliant 192x192, 512x512, and 512x512 maskable application icons.
- **Service Worker (`sw.js`)**:
  - Implemented versioned cache-first offline service worker caching all core shell assets, scripts, stylesheets, data, and icons.
  - Added automatic activation and cleanup of old versioned caches.
  - Added in-app update banner notifying users when a new service worker version is waiting.
- **In-App Install Prompt & Offline Notification**:
  - Integrated `beforeinstallprompt` listener with custom install button, standalone display-mode detection, and iOS "Add to Home Screen" guide modal.
  - Added live `online`/`offline` event listeners with top-of-screen status banner.

## [0.6.0] - Phase 5: Cross-View Branch & Lecturer Filters
### Added
- **Pure Filtering Engine in `time.js`**:
  - `filterCurrentEntries(currentEntries, filters)`: Evaluates boolean `branch AND lecturer` logic on active periods, isolating matching classes and narrowing multi-batch entries to the selected instructor.
  - `filterUpcomingEntries(upcomingData, filters)`: Filters upcoming slot items by branch and lecturer, pruning empty slot blocks and preserving consolidated multi-slot lab boundaries.
  - `filterDayGrid(dayGrid, filters)`: Filters class rows by branch and day-level lecturer presence, filtering cell entries down to matching lecturer allocations.
- **Global Filter Bar UI (`app.js` & `styles.css`)**:
  - Semantic, accessible filter component mounted directly into `#global-filter-bar`.
  - 6-button branch control (`ALL`, `CE`, `CS`, `EC`, `EE`, `ME`) with $\ge 44\text{px}$ touch targets and high-contrast active state.
  - Accessible `<select id="filter-lecturer-select">` with full name and initials for every faculty member (`Dr. R. B. Lingaraju (RBL)`, `V. Mohan (VM)`, etc.).
  - Dynamic `Clear Filters` button and active filter indicator badge (`Active: Branch: CS • Lecturer: Dr. R. B. Lingaraju`).
  - View visibility routing: Visible on **Now**, **Next**, and **Day Overview**; automatically hidden on **Week Overview** (which maintains its dedicated entity picker).
- **In-Memory State Synchronization**:
  - Filter state (`state.filters = { branch: "ALL", lecturer: "ALL" }`) persists across tab switches in memory with zero `localStorage` dependency.
  - Seamlessly combines with the search bar in Now view (`branch AND lecturer AND query`).
- **Unambiguous "Nothing matches" Empty States**:
  - When filter combinations yield zero results (e.g. Branch `ME` + Lecturer `RBL`), all three views display a prominent `<div class="empty-state-title">Nothing matches</div>` message detailing the active filter parameters and offering a 1-tap `Clear Filters` button.
- **Unit Test Suite Expansion (`tests.js`)**:
  - Added Group F unit tests covering Branch filtering, Lecturer filtering, combined `branch AND lecturer` evaluation, empty match states, Day Overview row pruning, and filter reset across all views.
  - Total automated test count increased to 50 tests, passing with 0 failures.

## [0.5.0] - Phase 4: Overview Matrix (Day Grid & Week Grid with Sticky Headers & Conflict Detection)
### Added
- `ui-overview.js`: Complete matrix overview module with segmented controls for **Day Overview** and **Week Overview**.
- **Day Grid Mode**: Classes on Y-axis (sticky first column), periods/slots on X-axis. Grouped cleanly by branch (`CE`, `CS`, `EC`, `EE`, `ME`) with horizontal divider rows.
- **Sticky Column Architecture**: First column (Class ID in Day view, Day name in Week view) and top-left corner stick with pure CSS sticky positioning (`position: sticky; left: 0`), enabling horizontal scrolling inside `.matrix-scroll-container` without page-level overflow.
- **Context-Aware Current Slot Column Highlighting**: When viewing today's schedule, the current time slot header and column cells are highlighted with `.slot-current-col-header` and `.slot-current-col-cell` along with an inline `LIVE` pill. When viewing another day, highlighting is strictly suppressed.
- **Stacked Lab Batches & Free Period Handling**: Multi-batch labs stack inside cells with batch tags (`B1`, `B2`, `B3`) and `LAB` badges; unscheduled periods display italicized `Free`.
- **Week Grid Mode (By Class or By Lecturer)**: Displays days as rows and slots as columns for one selected entity via a dedicated picker bar.
- **Parallel Lecturer Collision Detection**: Detects and highlights parallel multi-batch assignments (`hasParallelCollision: true`) in high-contrast orange with an inline warning badge `⚠ PARALLEL COLLISION ([N] BATCHES)` rather than hiding concurrent batches.
- `styles.css`: Added styles for segmented control, matrix scrolling container, sticky headers, current slot highlighting, and collision warning badges.
- `app.js`: Integrated `renderOverviewView`, state synchronization, and `window.TimetableApp.setOverviewState`.
- `tests.js`: Added automated test cases (E4, E5, E6) verifying parallel collision detection, free slot detection, and multi-slot lab matrix population (41 total tests passing).

## [0.4.0] - Phase 3: Next View with Chronological Rollover & Lab Span Consolidation
### Added
- `ui-next.js`: Next view renderer presenting upcoming slots in chronological order, grouped by slot start time and subdivided by branch (`CE`, `CS`, `EC`, `EE`, `ME`).
- Lab span consolidation: Multi-slot lab entries (e.g. CS-III DSP/CN/SNA lab covering P3–P4, ME-V workshop/lab covering P5–P6) are displayed exactly once at their start slot with the full time range (`11:35 – 13:25`, `14:00 – 15:40`) and span indicator tag (`[P3–P4]`, `[P5–P6]`). Subsequent periods covered by the session are deduplicated.
- Day rollover engine: Automatically switches to next day schedule when today's classes end (`status === 'after'`) or when opened on holidays (`status === 'closed'` on Sunday). On Saturday after hours or Sunday, rolls over directly to Monday morning (P1), rendering an explicit `<span class="tomorrow-badge">Tomorrow</span> [DAY] Schedule` status header.
- Mid-day and lunch handling: When viewed during lunch break (`13:25 – 14:00`), next slot begins directly with P5 (`14:00`), skipping elapsed morning periods.
- `app.js`: Connected `renderNextView` to the `next` navigation tab and dynamic time simulation lifecycle.
- `styles.css`: Added `.tomorrow-badge` high-contrast indicator and `.next-branch-header` subheadings.
- `tests.js`: Expanded test suite to 38 automated tests, adding automated verifications for chronological sorting, Sunday rollover, Saturday evening rollover, lunch break transitions, before-hours all-period listing, and ME-V multi-slot lab consolidation.

## [0.3.0] - Phase 2: App Shell, Time Simulation Panel & Now View
### Added
- `styles.css`: Strict flat, high-contrast, functional CSS architecture without decorative blur/gradients/shadows, enforcing $\ge$ 44px tap targets and $\ge$ 16px font sizing.
- `index.html`: Semantic PWA HTML5 shell including high-contrast sample banner, live header with status dot, collapsible time simulation panel, main content container, and bottom tab bar (`Now · Next · Overview`).
- `app.js`: Application orchestrator handling data validation gating, tab navigation, clock ticks, dynamic time simulation overriding, and search synchronization.
- `ui-now.js`: Now view module displaying every class grouped by branch, handling all schedule states (`before`, `in-period`, `break`, `after`, `closed`), stacking parallel lab batches (`B1/B2/B3`) with subject and lecturer names, explicit free period labels, and instant search filter.

## [0.2.0] - Phase 1: Data Layer, Validator, Time Engine & Tests
### Added
- `data.js`: Implemented pure timetable data schema with sample data (`isSample: true`) for 2 days (MON, TUE), 3 classes (CE-III, CS-III, ME-V), multi-slot lab, 3-batch lab (B1/B2/B3), LIB non-teaching entry, and free period.
- `validate.js`: Complete data validation engine strictly enforcing foreign key integrity, non-inversion, break isolation, legal collision semantics (labs with distinct batches only), batch type consistency, and uniqueness.
- `time.js`: Pure schedule engine with deterministic functions (`getSlotState`, `getCurrentEntries`, `getUpcomingEntries`, `getDayGrid`, `getClassWeek`, `getLecturerWeek`) implementing half-open time boundaries (`start <= t < end`).
- `tests.js` & `tests.html`: Zero-dependency browser & headless unit test harness containing 32 automated tests covering all validator rules and boundary conditions.

## [0.1.0] - Phase 0: Contract & Scaffolding
### Added
- `master.md`: Frozen requirements document and phase-gated execution plan.
- `TECHNICAL_DESIGN.md`: Technical design document covering architecture decisions, data contract, validation rules, pure time engine, UI views, and PWA offline strategy.
- `CHANGELOG.md`: Project audit log tracking phase progression.
- `README.md`: Project summary, phase roadmap, running instructions, and architecture overview.
- Updated `metadata.json` with official application title and description.
