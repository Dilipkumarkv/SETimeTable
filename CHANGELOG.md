# Changelog

All notable changes to the College Timetable PWA project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - Stage 3 — Phase 6: Final Polish, Accessibility & Production Delivery
### Added
- **Final Polish & Comprehensive Production Audit**:
  - **Print Rendering Optimization (`styles.css`)**: Expanded `@media print` rules to cleanly suppress all interactive toolbars (`.week-toolbar`, `.explore-search-bar`, `.sim-active-indicator`, `.explore-filters-box`), preserving only pristine schedule cards and landscape matrix tables.
  - **Accessibility & WAI-ARIA Verification (`index.html`)**: Validated semantic tablist, role attributes, accessible live clocks, high-contrast indicators, and touch target discipline ($\ge 44 \times 44$px).
  - **Offline PWA Precache Complete Registry (`sw.js`)**: Verified all Stage 3 engine components (`ui-today.js`, `ui-week.js`, `ui-explore.js`, icons, manifest) are precached for 100% offline campus operation.
  - **Complete Documentation Suite**: Updated `README.md`, `TECHNICAL_DESIGN.md`, and `DATA_HANDOFF.md` with complete operational and architectural guides.
- **Automated Test Suite Expansion (`tests.js`)**:
  - Added Group Q unit tests verifying print stylesheet rules, accessibility markup, PWA precache completeness, documentation cross-references, and sample data boundaries.
  - Achieved **117 passed tests out of 117 tests (0 failures)** across 17 test groups (Groups A through Q).

## [3.0.0-phase5] - Stage 3 — Phase 5: Real Data Preparation & Production Handoff Protocol
### Added
- **Production Data Template (`data.template.js`)**:
  - Provided a pristine, zero-error production dataset template ready for real schedule entry by academic department heads and college administrators.
  - Pre-populated with official SET Polytechnic academic classes (all 15 classes across CE, CS, EC, EE, ME), the standard 7-period daily bell schedule with designated lunch break, and complete faculty roster.
- **Stand-Alone Command-Line Validator (`validate-cli.js`)**:
  - Engineered terminal CLI validator (`node validate-cli.js [file]` or `npm run validate-data`) providing formatted diagnostic reports.
  - Enforces zero referential integrity faults, zero illegal schedule overlaps, and strict bell schedule compliance before code deployment.
- **Comprehensive Production Handoff Guide (`DATA_HANDOFF.md`)**:
  - Documented 6-step protocol for backing up and replacing sample data with real institutional schedule.
  - Detailed object structure rules, parallel multi-batch lab examples, and resolution guide for common validation errors.
- **Sample Data Invariant & Safety**:
  - Preserved `isSample: true` on active `data.js` to ensure the high-visibility sample data banner remains active until official real data deployment.
- **Automated Test Suite Expansion (`tests.js`)**:
  - Added Group P unit tests verifying template schema validity, CLI validator execution, handoff guide completeness, package.json scripts, and sample data invariants (total: 112 tests, 0 failures).

## [3.0.0-phase4] - Stage 3 — Phase 4: Multi-Dimensional Search & Composable Filter Engine
### Added
- **Multi-Dimensional Search & Composable Filtering Engine (`ui-explore.js`, `time.js`, `styles.css`)**:
  - Implemented the dedicated **`EXPLORE`** screen with instant free-text search matching subjects, faculty names, initials, branches, and class codes.
  - Engineered pure multi-dimensional filtering across 7 key academic dimensions:
    - **Branch** (CE, CS, EC, EE, ME)
    - **Semester** (I, III, V)
    - **Class / Section** (all 15 academic classes)
    - **Faculty Member** (all staff initials/names)
    - **Day** (MON through SAT)
    - **Activity Type** (theory vs practical labs)
    - **Subject**
  - Fully composable filtering: cleanly combines multiple dimensions simultaneously (e.g. `Branch = CS` AND `Sem = III` AND `Day = MON` AND `Type = Lab`).
  - Active filter chips with 1-tap surgical dismissal and global `Clear All Filters` button.
  - Live session result count badge (`12 sessions found`).
  - Calm, informative empty state with 1-tap `Reset All Filters` shortcut.
  - Enforced strict 4-level result card hierarchy: 1. Subject/Activity, 2. Branch • Semester • Class, 3. Faculty with icon, 4. Day & Time range with duration; room kept as subtle secondary metadata.
- **PWA Precache & Test Suite Expansion (`sw.js`, `tests.js`)**:
  - Registered `ui-explore.js` in `sw.js` cache-v6.
  - Added Group O automated unit tests in `tests.js` verifying free-text search, composable multi-dimensional filtering, semester-wide isolation, activity type filtering, zero-match behavior, and offline caching (total: 107 tests, 0 failures).

## [3.0.0-phase3] - Stage 3 — Phase 3: Mobile-First Weekly Exploration & Schedule Navigator
### Added
- **Mobile-First WEEK Experience (`ui-week.js`, `time.js`, `styles.css`)**:
  - Replaced the overwhelming 15-class desktop spreadsheet matrix on mobile with an intuitive chronological day feed.
  - Implemented Monday–Saturday pill selector tabs (`MON`–`SAT`) with active highlight and `Today` badge for instant 1-tap weekday jumping.
  - Multi-slot activities (labs spanning multiple periods) are consolidated to their start slot with complete span timing (`11:35–13:25 • 1h 50m`).
  - Added exploration scopes:
    - **All Classes**: What does Wednesday look like across departments?
    - **By Class**: What is CSE III Sem doing this week?
    - **By Faculty**: What is a specific professor's teaching schedule?
  - Workload summary cards for faculty members (total sessions, theory periods, lab counts) and high-visibility collision warnings for parallel assignments.
  - Preserved desktop/tablet matrix table view toggle (`📱 Feed` vs `📊 Grid`) with 1-tap print action.
  - Added global NOW shortcut action (`⚡ Live Now`) returning the principal directly to the active college timeline.
- **PWA Precache & Test Expansion (`sw.js`, `tests.js`)**:
  - Registered `ui-week.js` in `sw.js` cache-v5.
  - Added Group N automated unit tests in `tests.js` verifying mobile day feed generation, lab consolidation, branch/faculty filtering, tab structure, and offline precaching (total: 100 tests, 0 failures).

## [3.0.0-phase2] - Stage 3 — Phase 2: Principal Live Timetable Assistant & Continuous Timeline
### Added
- **Continuous Chronological Timeline (`ui-today.js`, `time.js`, `styles.css`)**:
  - Replaced the fragmented NOW / NEXT mental model with ONE continuous scrollable feed: `NOW` -> `NEXT` -> `BREAK` -> `LATER TODAY` -> `DAY COMPLETE`.
  - Implemented concise status summary header answering college state in 2-3 seconds without oversized dashboard widgets.
  - Implemented clearly distinguished active `NOW` period with high-contrast accent indicator, subtle background, `NOW` badge, and live countdown.
  - Enforced strict card entry hierarchy: 1. Subject/Activity, 2. Branch • Semester • Class, 3. Faculty, 4. Time & Duration; room metadata kept non-prominent.
  - Added full support for institutional time states: Before-college, Active period, Break/Lunch with countdown, After-college with next working day rollover, and Sunday/Holiday closure.
  - Preserved multi-slot lab consolidation (e.g. `11:35–13:25 • 1h 50m`) to start slot.
- **Navigation Redesign (`index.html`, `app.js`)**:
  - Replaced legacy tabs with mobile-first `Today`, `Week`, `Explore` bottom navigation.
  - Provided backwards-compatible routing and state preservation.
- **De-cluttered Executive Interface & Developer Tooling**:
  - Transformed prominent time simulation controls into a discreet collapsible developer drawer (`.collapsed` by default) accessible via header `⚙️ Dev` toggle.
  - Added non-intrusive active simulation pill with 1-tap clock reset.
- **PWA Precache & Test Suite Expansion**:
  - Registered `ui-today.js` in `sw.js` cache-v4.
  - Added Group M automated unit tests in `tests.js` verifying timeline feed generation, lab consolidation, time states, composable filtering, and dev panel behavior (total: 95 tests, 0 failures).

## [2.0.0] - Stage 2 — Phase 4: Final Polish, Print Presentation & Production Delivery
### Added
- **Institutional Print Stylesheet & Presentation Mode (`styles.css`, `ui-overview.js`)**:
  - Engineered landscape `@media print` rules optimizing Day Overview and Week Overview matrices for physical printing and PDF export without paper clipping.
  - Suppressed all interactive navigation chrome, dev simulation controls, banners, and buttons when printing (`display: none !important;`).
  - Added `page-break-inside: avoid;` on table rows to ensure clean, unbroken printed records.
  - Integrated 1-tap "Print Day" and "Print Week" schedule buttons (`.btn-print-schedule`) inside the Day and Week overview picker bars.
- **PWA Service Worker & Production Cache Alignment (`sw.js`)**:
  - Verified versioned precache list encompasses 100% of application assets and modules (`./`, `./index.html`, `./styles.css`, `./app.js`, `./data.js`, `./time.js`, `./validate.js`, `./ui-now.js`, `./ui-next.js`, `./ui-overview.js`, `./manifest.webmanifest`, icons).
  - Maintained zero runtime external network requests or third-party CDNs.
- **Metadata & OpenGraph Production Alignment (`index.html`, `metadata.json`)**:
  - Synchronized `<title>`, `<meta name="description">`, `og:title`, and `og:description` with official institutional metadata.
- **Automated Test Suite Expansion (`tests.js` Group L)**:
  - Added Group L automated tests verifying print media stylesheet rules, print button integration, metadata synchronization, and schema validation integrity.
  - Total automated test suite now encompasses **87 tests, passing with 0 failures**.

## [2.0.0-phase3] - Stage 2 — Phase 3: View-Specific Refinements & Micro-Interactions
### Added
- **Now View Refinements & Instant Ergonomics (`ui-now.js`, `styles.css`)**:
  - Integrated active period live countdown pill (`.time-countdown-pill`) computing minutes remaining (e.g. `Ends at 13:25 · 45 min remaining` and `(45m left)` on live class cards).
  - Added dedicated clear button (`×`) on search input with instant query dismissal and live match counter (`.search-count-chip`: `Showing 5 of 15 classes`).
  - Added Quick-Jump Department Navigation Bar (`.branch-jump-bar`) with smooth scrolling to branch sections (`#branch-section-ce`, etc.).
  - Polished free period cards with explicit `Free Period — No lecture scheduled` label and muted tone.
- **Next View Chronological Timeline & Span Duration Formatting (`ui-next.js`, `time.js`)**:
  - Integrated pure `formatDuration()` to display human-readable span duration on consolidated multi-slot labs (e.g. `[P3–P4 · 1h 50m]`, `[P5–P6 · 1h 40m]`).
  - Added relative slot start badges (`.slot-rel-badge`: e.g. `In 25m`, `Starts now`, `Tomorrow at 09:45`).
  - Added slot summary and clear filter action on empty results.
- **Overview Matrix Polish & Workload Stats (`ui-overview.js`, `time.js`)**:
  - Added Department Quick-Jump chips above Day Overview matrix to instantly navigate to branch divider rows (`#matrix-branch-divider-cs`, etc.).
  - Added Weekly Workload Statistics Bar (`.workload-stat-bar`) in Week Overview showing total periods, theory count, and lab count for the selected class or lecturer.
  - Highlighted current slot header and cells with accent border and `LIVE` pill strictly when viewing today.
- **Shell & Dev Tool Micro-Interactions (`app.js`, `index.html`)**:
  - Added 6 Instant Simulation Quick-Preset buttons (`Mon P1 09:45`, `Mon Lab 11:35`, `Lunch 13:30`, `Mon P5 14:00`, `Evening 17:00`, `Sunday 11:00`) for 1-tap testing without manual input manipulation.
  - Added surgical individual active filter dismissal (`.filter-dismiss-chip`: `Branch: CS ×`, `Faculty: VM ×`), allowing users to clear one filter while retaining the other.
- **Automated Test Suite Expansion (`tests.js` Group K)**:
  - Added 7 automated tests verifying `formatDuration`, `getTimeRemaining`, `getRelativeSlotTime`, `getWeeklyWorkloadStats`, simulation preset buttons, individual filter dismissal, and search clear/branch jump components.
  - Total automated test suite expanded to **83 tests, passing with 0 failures**.

## [2.0.0-phase2] - Stage 2 — Phase 2: Design System & CSS Overhaul
### Added
- **Academic Branch Design Token System (`styles.css`)**:
  - Engineered distinct, high-contrast, WCAG AA-compliant branch accent palettes for all 5 departments:
    - Civil Engineering (`CE`): Warm Ochre/Amber (`--branch-ce: #d97706; --branch-ce-bg: #fffbeb;`)
    - Computer Science (`CS`): Tech Royal Blue (`--branch-cs: #2563eb; --branch-cs-bg: #eff6ff;`)
    - Electronics & Communication (`EC`): Purple/Violet (`--branch-ec: #7c3aed; --branch-ec-bg: #faf5ff;`)
    - Electrical & Electronics (`EE`): Emerald Green (`--branch-ee: #059669; --branch-ee-bg: #f0fdf4;`)
    - Mechanical Engineering (`ME`): Crimson/Rose (`--branch-me: #e11d48; --branch-me-bg: #fff1f2;`)
  - Integrated 4px solid left indicator strips color-coded per branch on class cards across Now and Next views (`.class-card[data-branch="..."]`).
  - Added rounded branch badge pills (`.branch-pill`) on class cards, department headers, and overview matrix rows.
- **Ergonomic Filter Bar with Horizontal Scrolling Chips (`app.js`, `styles.css`)**:
  - Replaced wrap-heavy branch buttons with a smooth horizontal scroll chip container (`.filter-branch-group`), maintaining $\ge 44$px touch targets and keeping vertical screen consumption under 95px on 360px mobile viewports.
  - Added clear active state contrast and 1-tap "× Clear Filters" reset action.
- **Icon-Augmented Navigation & Mobile Header Polish (`index.html`, `styles.css`)**:
  - Upgraded bottom navigation tab bar with inline SVGs for Now (clock), Next (calendar/arrow), and Overview (grid matrix) alongside accessible WAI-ARIA tab semantics.
  - Added iOS safe-area inset padding (`env(safe-area-inset-bottom)`) for edge-to-edge mobile devices.
  - Added collapsible toggle state badge ("Hide Controls" / "Show Controls") to dev simulation time panel.
- **Automated Test Suite Expansion (`tests.js` Group J)**:
  - Added 6 automated tests verifying branch design tokens, left indicator border strips, badge pills, 44px tap targets, SVG navigation icons, and horizontal chip scrolling.
  - Total automated test suite now encompasses **76 tests, passing with 0 failures**.

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
