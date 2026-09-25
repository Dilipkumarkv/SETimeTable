# SET Polytechnic Melukote — Campus Timetable PWA

A phone-first, zero-dependency Progressive Web App built for the polytechnic principal, department heads, and faculty to answer the core campus question in under 3 seconds:

> **"What is happening across the college right now, and what is coming up?"**

---

## Architecture & Product Structure

The application is structured around 3 primary executive views:

1. **`TODAY` (Continuous Chronological Live Feed)**:
   - Replaces fragmented NOW/NEXT states with ONE seamless, continuous timeline: `NOW` $\to$ `NEXT` $\to$ `BREAK` $\to$ `LATER TODAY` $\to$ `DAY COMPLETE`.
   - Clear visual hierarchy on cards: **Subject/Activity** $\to$ **Branch • Sem • Class** $\to$ **Faculty** $\to$ **Time & Duration** (room kept subtle).
   - Multi-slot activities (labs) consolidated to their start slot with complete span timing (`11:35–13:25 • 1h 50m`).
   - Comprehensive time engine states: Before College, Active Period, Lunch/Break, After College, and Sunday/Holiday calm closure.

2. **`WEEK` (Mobile-First Weekly Exploration)**:
   - Mobile-first vertical card feed replacing giant desktop spreadsheet matrices on small screens.
   - Quick Monday–Saturday day tabs (`MON`–`SAT`) with `Today` badge for 1-tap day switching.
   - 3 exploration scopes:
     - `🏛 All Classes`: What does Wednesday look like across all departments?
     - `🎓 By Class`: What is CSE III Sem doing this week?
     - `👨‍🏫 By Faculty`: What is a specific professor's teaching schedule?
   - Workload statistics bar (total sessions, theory count, lab count) and collision warnings for parallel assignments.
   - Preserved desktop/tablet matrix table toggle (`📱 Feed` vs `📊 Grid`) with 1-tap print action.
   - Global NOW shortcut (`⚡ Live Now`) returning directly to the active college timeline.

3. **`EXPLORE` (Multi-Dimensional Search & Composable Filter Engine)**:
   - Instant text search across subjects, faculty names, initials, branches, and class IDs.
   - Multi-dimensional filtering across: **Branch** (CE, CS, EC, EE, ME), **Semester** (I, III, V), **Class**, **Faculty**, **Day**, and **Activity Type** (theory vs lab).
   - Fully composable compound filtering (e.g. `Branch = CS` AND `Sem = III` AND `Day = MON` AND `Type = Lab`).
   - Active filter dismiss chips, clear-all action, live result count, and empty state reset.

---

## Production Readiness & Stage 3 Execution Plan

| Phase | Description | Status |
| :--- | :--- | :--- |
| **Phase 1** | Groundwork, Architecture Contract & Alignment | ✅ **COMPLETED** |
| **Phase 2** | TODAY — Principal Live Assistant & Continuous Timeline | ✅ **COMPLETED** |
| **Phase 3** | WEEK — Mobile-First Weekly Exploration & Schedule Navigator | ✅ **COMPLETED** |
| **Phase 4** | EXPLORE — Multi-Dimensional Search & Composable Filter Engine | ✅ **COMPLETED** |
| **Phase 5** | REAL DATA PREPARATION — Schema, Handoff Protocol & CLI Validator | ✅ **COMPLETED** |
| **Phase 6** | FINAL POLISH & SHIP — Comprehensive Audit, Accessibility & Delivery | ✅ **COMPLETED** |

---

## Real Data Replacement Protocol

The application is deployed with a safe **Sample Data Invariant**:
- A prominent high-contrast banner (`SAMPLE DATA – NOT THE REAL TIMETABLE`) is shown whenever `meta.isSample: true`.
- To deploy the official college timetable:
  1. Follow the step-by-step instructions in **[`DATA_HANDOFF.md`](./DATA_HANDOFF.md)**.
  2. Use the clean template in **[`data.template.js`](./data.template.js)**.
  3. Validate the dataset before deployment:
     ```bash
     npm run validate-data
     ```
  4. In `data.js`, set `meta.isSample: false` to deactivate the sample data banner.
  5. In `sw.js`, bump `CACHE_NAME` to invalidate offline client caches.

---

## Developer Tooling & Simulation

- **Collapsible Dev Panel**: Accessible via the discreet `⚙️ Dev` header button. Allows simulating any weekday and time to verify campus states, lunch transitions, lab spans, and evening rollovers.
- **Active Simulation Pill**: Shows the active simulated time with an instant 1-tap clock reset.

---

## Testing & Quality Control

```bash
# Run TypeScript type check and linter:
npm run lint

# Validate timetable data schema & referential integrity:
npm run validate-data

# Build production bundle:
npm run build

# Run unit tests:
# Open tests.html in browser or run via Node test runner.
```

---

## Documentation Links

- **[`DATA_HANDOFF.md`](./DATA_HANDOFF.md)** — Production data replacement guide for HODs and administrators.
- **[`TECHNICAL_DESIGN.md`](./TECHNICAL_DESIGN.md)** — Core architectural design, time engine specifications, and schema rules.
- **[`CHANGELOG.md`](./CHANGELOG.md)** — Complete chronological history of releases and enhancements.
- **[`data.template.js`](./data.template.js)** — Clean production timetable template.
- **[`validate-cli.js`](./validate-cli.js)** — Command-line timetable validator.
