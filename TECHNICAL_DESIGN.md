# Technical Design Document: College Timetable PWA

**Author:** AI Studio Engineering  
**Project:** SET Polytechnic Melukote Timetable PWA  
**Status:** Phase 5 Complete (Cross-view branch and lecturer filters active on Now, Next, and Day Overview)  
**Last Updated:** Phase 5  

---

## 1. Executive Summary & Purpose

The College Timetable PWA is a phone-first, zero-dependency, read-only Progressive Web Application designed for the polytechnic principal and staff walking across campus. It replaces physical printed master timetable posters by answering in under 2 seconds:
- **"What is happening across the college right now?"**
- **"What is coming up next today (or tomorrow morning)?"**
- **"What is the full schedule for any class, lecturer, or entire day?"**

The system executes completely offline from static assets without a backend, database, client framework, or external network requests.

---

## 2. Architectural Principles & Constraints

### 2.1 Fixed Stack Architecture
- **Vanilla ES Modules & Browser Standard APIs**: Plain modern JavaScript (`ES2022`), native ES Modules (`import`/`export`), semantic HTML5, and vanilla CSS.
- **Zero Framework / Zero Build Dependency**: No React, Vue, Svelte, or runtime virtual DOM. No Webpack, Rollup, or Babel build step required for deployment. Vite or any static HTTP server (e.g. `npx serve`, GitHub Pages, python http.server) serves static files directly.
- **Zero Network Egress**: Absolutely no external fonts, analytics, CDN scripts, telemetry, or remote API calls. All resources are packaged locally.
- **Strict Data/Code Decoupling**: All institutional data resides exclusively in `data.js`. Code files contains zero hardcoded subjects, times, or lecturers.

### 2.2 Functional Schedule & Time Engine
- **Pure Functional Core**: All time, slot, and filtering functions are strictly pure functions taking `(data, date)` as parameters.
- **Deterministic Testability**: System clock (`new Date()`) is read only at the top-level app tick or overridden via the time simulation tool.
- **Half-Open Intervals**: Interval boundaries are strictly defined as `start <= t < end`.
- **Slot Invariants**:
  - `startSlot <= endSlot` in predefined slot sequence.
  - Multi-period lab sessions cannot span across the lunch break.
  - Concurrent overlap for the same class is valid only for multi-batch labs (`B1`, `B2`, `B3`) with distinct non-null batch identifiers.

---

## 3. Data Schema & Contract Specification

### 3.1 Data Schema (`data.js`)
```typescript
interface TimetableMeta {
  isSample: boolean;
  term: string | null;
  version: string;
}

interface Slot {
  id: string;          // e.g. "P1", "LUNCH", "P5"
  label: string;       // e.g. "P1", "Lunch", "P5"
  start: string;       // "HH:MM" 24-hour format
  end: string;         // "HH:MM" 24-hour format
  kind: "period" | "break";
}

interface ClassDef {
  id: string;          // e.g. "CE-I", "CS-III", "ME-V"
  branch: "CE" | "CS" | "EC" | "EE" | "ME";
  sem: "I" | "III" | "V";
}

interface LecturerDef {
  name: string | null;
}

interface TimetableEntry {
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
  classId: string;
  startSlot: string;
  endSlot: string;
  subject: string;
  type: "theory" | "lab" | "other";
  batch: "B1" | "B2" | "B3" | null;
  lecturers: string[]; // Initials array
  room: string | null;
}

interface TimetableData {
  meta: TimetableMeta;
  slots: Slot[];
  days: string[];
  classes: ClassDef[];
  lecturers: Record<string, LecturerDef>;
  entries: TimetableEntry[];
}
```

### 3.2 Validation Engine (`validate.js`)
The validator inspects `data.js` against the following strict invariants:
1. **Referential Integrity**: Every referenced `day`, `classId`, `startSlot`, `endSlot`, and lecturer initial in `entries` must exist in `days`, `classes`, `slots`, and `lecturers`.
2. **Temporal Order**: `startSlot` index must be $\le$ `endSlot` index.
3. **Break Boundary Constraint**: No entry is permitted to start before `LUNCH` and end after `LUNCH`.
4. **Collision Rule**: Multiple entries for the same class and time slot must both be `type: 'lab'` with distinct non-null batches.
5. **Batch Semantics**: Any entry with a non-null `batch` must have `type: 'lab'`.
6. **Uniqueness**: No duplicate slot IDs, class IDs, or day IDs.

If any invariant fails with severity `error`, the application refuses to render the schedule and instead displays a high-visibility validation diagnostic table.

---

## 4. UI Architecture & View Specifications

### 4.1 Mobile-First Geometry
- **Design Target**: 360px viewport width (responsive up to desktop 1440px+).
- **No Page-Level Horizontal Scrolling**: The document body never scrolls horizontally. Sub-tables (like Day and Week overview grids) scroll within localized container cards with a sticky first column for class/day names.
- **Accessibility**: Minimum touch targets 44×44px, body text $\ge$ 16px, high contrast conforming to WCAG AA.

### 4.2 Application Shell & Views
```
+---------------------------------------------------------+
| [Header] SET Polytechnic Melukote | Live Clock / Day    |
+---------------------------------------------------------+
| [Banner] (If isSample: true) SAMPLE DATA - NOT REAL     |
+---------------------------------------------------------+
| [Dev Tool] Simulate Time (Collapsible)                 |
+---------------------------------------------------------+
| [Global Filters] Branch (All/CE/CS/EC/EE/ME) | Lecturer  |
+---------------------------------------------------------+
|                                                         |
|  <Active View: Now | Next | Overview (Day / Week)>      |
|                                                         |
+---------------------------------------------------------+
| [Bottom Tab Bar]   [NOW]      [NEXT]      [OVERVIEW]    |
+---------------------------------------------------------+
```

1. **Now View (`ui-now.js`)**:
   - Class-grouped real-time card list.
   - States handled: Before College (`before`), In Class (`in-period`), Lunch Break (`break`), Free Period (`free`), After Hours (`after`), Weekend/Sunday (`closed`).
   - Lab batches are stacked cleanly inside the class card.
   - Search filter for class, subject, or lecturer initials/name.
2. **Next View (`ui-next.js`)**:
   - **Chronological Ordering**: Slots are strictly sorted in forward chronological order (`slot.start`). Breaks are excluded from the teaching list; during lunch, next periods start directly at P5.
   - **Day Rollover Engine**: When `getSlotState` detects that classes have completed (`after`), or that today is a holiday (`closed` on Sunday), the view rolls over automatically to the next working day (`isTomorrow: true`). On Saturday evening or Sunday, it rolls directly to Monday morning (P1). The header displays a prominent, high-contrast `<span class="tomorrow-badge">Tomorrow</span> [DAY] Schedule` banner.
   - **Lab Span Consolidation**: Labs spanning multiple periods (e.g. CS-III across P3 and P4, ME-V across P5 and P6) are consolidated to appear exactly once at their start slot with the full time range (`spanStart.start – spanEnd.end`) and slot range tag `[Start–End]`. Subsequent slots covered by the lab session omit the entry using set-based deduplication (`seenEntries`), eliminating confusing duplicates while preserving multi-batch stacks (`B1/B2/B3`).
   - **Branch-Grouped Hierarchy**: Within each slot section, classes are organized by branch (`CE`, `CS`, `EC`, `EE`, `ME`), with explicit branch subheaders for immediate visual scanning.
3. **Overview View (`ui-overview.js`)**:
   - **Segmented Mode Toggle**: Switch between **Day Overview** and **Week Overview** without page reloads.
   - **Day Grid Mode**: Classes on Y-axis (sticky first column), slots on X-axis. Grouped by branch (`CE`, `CS`, `EC`, `EE`, `ME`) with horizontal divider rows.
     - **Sticky First Column**: Left column sticks with `position: sticky; left: 0; z-index: 10`, allowing smooth horizontal scrolling across all 8 periods while keeping class labels in view.
     - **Current Slot Highlight**: The active slot column receives `.slot-current-col-header` and `.slot-current-col-cell` with a LIVE tag **only** when viewing today. When viewing another day, highlighting is suppressed.
     - **Stacked Lab Batches & Free Periods**: Parallel batches stack vertically inside cells with batch tags (`B1`, `B2`, `B3`) and `LAB` badges; unscheduled periods display italicized `Free`.
   - **Week Grid Mode**: Days on Y-axis (sticky first column), slots on X-axis for one selected entity.
     - **Entity Picker**: Toggle between "By Class" and "By Lecturer", with dynamic dropdown selection.
      - **Parallel Lecturer Conflict Detection**: If a lecturer is assigned to multiple batches/classes in the same slot (or if concurrent batches occur), `hasParallelCollision` is computed by the time engine; the cell is prominently flagged with `.cell-collision-flag` and an inline warning badge `⚠ PARALLEL COLLISION ([N] BATCHES)` rather than hiding any entries.

### 4.4 Cross-View Filters & Memory State Synchronization (Phase 5)
- **Filter Invariants**:
  - Dual filter dimensions: **Branch** (`ALL`, `CE`, `CS`, `EC`, `EE`, `ME`) and **Lecturer** (`ALL` or specific faculty initials).
  - Scope of application: Wires into **Now**, **Next**, and **Day Overview**. Automatically suppressed in **Week Overview** (which maintains its dedicated single-entity inspection model).
  - In-Memory Only: Filter state is retained strictly in application memory (`state.filters`), requiring zero `localStorage` or cookie storage.
- **Boolean Combination**:
  - Filters combine with strict `branch AND lecturer` logic.
  - If a class belongs to the selected branch and has an active or scheduled session involving the selected lecturer, it is retained.
  - Subordinate multi-batch labs are isolated to the specific batch taught by the selected instructor.
- **Empty Results Handling**:
  - Disjoint filter combinations (e.g. Branch `ME` + Lecturer `RBL`) render a standardized, prominent `<div class="empty-state-title">Nothing matches</div>` message with contextual filter explanations and a 1-tap `Clear Filters` button.

---

## 5. Time & Filter Engine Specifications (`time.js`)

Pure functions signature specifications:
- `getSlotState(data, date)`: Returns `{ status: 'before' | 'in-period' | 'break' | 'after' | 'closed', currentSlot, nextSlot, timeRemainingMs }`.
- `getCurrentEntries(data, date)`: Returns list of entries active at `date` for all 15 classes.
- `getUpcomingEntries(data, date)`: Returns chronological upcoming slots for today or tomorrow.
- `getDayGrid(data, day)`: Returns 2D matrix of `classId x slotId -> TimetableEntry[]`.
- `getClassWeek(data, classId)`: Returns 2D matrix of `day x slotId -> TimetableEntry[]`.
- `getLecturerWeek(data, initials)`: Returns 2D matrix of `day x slotId -> TimetableEntry[]`.
- `filterCurrentEntries(currentEntries, filters)`: Pure filter combining `branch AND lecturer` for active periods in Now view.
- `filterUpcomingEntries(upcomingData, filters)`: Pure filter combining `branch AND lecturer` across upcoming slot blocks in Next view.
- `filterDayGrid(dayGrid, filters)`: Pure filter combining `branch AND lecturer` across class rows and slot cells in Day Overview.

---

## 6. Offline & PWA Strategy

- **Service Worker (`sw.js`)**:
  - Cache versioning: `const CACHE_NAME = 'timetable-v1'`.
  - Cache-first strategy for precached local assets (`index.html`, `styles.css`, `data.js`, `time.js`, `validate.js`, `app.js`, `manifest.webmanifest`, icons).
  - Cache invalidation on activate: purges any old cache keys.
  - Reliable data-only update protocol: updating `data.js` and incrementing `CACHE_NAME` triggers `skipWaiting()` and background cache update for installed PWAs.
- **Web App Manifest (`manifest.webmanifest`)**:
  - `start_url: "./"`
  - `display: "standalone"`
  - Maskable and standard 192x192 and 512x512 icons.

---

## 7. Quality Assurance & Test Architecture

- **Browser-Native Test Harness (`tests.html` + `tests.js`)**:
  - Standalone HTML page executable directly in browser without Node/npm.
  - Tests pure functions against all boundary conditions (before 09:45, boundary at 09:45:00, 10:39:59, 10:40:00, lunch period, after 16:30, Sunday).
  - Validation test suite asserting detection of broken foreign keys, inverted slot times, lunch-spanning sessions, invalid batch types, and duplicates.
