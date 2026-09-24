# PROMPT: College Timetable PWA (phase-gated build)

You are building a small, production-quality Progressive Web App. Read this whole document before writing anything. Follow the **Working Rules** and **Phase Loop** exactly. If any rule here conflicts with what you would normally do, this document wins.

---

## 1. What this is

A phone-first PWA for a polytechnic principal who walks the campus visiting classes and labs. Today he reads a printed master timetable on a notice board. The app answers one question fast:

> **"What is happening across the college right now, and what is coming up?"**

Secondary need: an **overview** of a whole day, or a whole week for one class or lecturer.

Single user type, read-only. No login, no backend, no database, no editing UI.

## 2. The real-world data shape (do not simplify this)

- **Days:** Monday to Saturday. Sunday = no classes.
- **Branches (5):** CE, CS, EC, EE, ME
- **Semesters per branch (3):** I, III, V → **15 classes** total (e.g. `CE-I`, `CS-III`, `ME-V`)
- **Time slots per day:** 6 teaching slots plus one lunch break. Treat these as *defaults to be confirmed*, held in data and never hard-coded in logic:
  - P1 09:45–10:40
  - P2 10:40–11:35
  - P3 11:35–12:30
  - P4 12:30–13:25
  - LUNCH 13:25–14:00 (break)
  - P5 14:00–14:50
  - P6 14:50–15:40
  - P7 15:40–16:30
- **A timetable cell can be:**
  - a normal theory class (one subject, one lecturer)
  - a **lab that spans 2 or more consecutive slots**
  - a **lab split into up to 3 parallel batches** (B1, B2, B3), each with its own lab subject and lecturer, running at the same time for the same class
  - a non-teaching item: `LIB`, `SPORTS`, `ACTIVITY`, or (on Saturdays) "Test and activity submission"
- Lecturers are identified by **initials** (e.g. `VM`, `KAR`, `SNK`). A separate map turns initials into full names.
- A cell may be empty (free period).

## 3. Working Rules (non-negotiable)

1. **No invented data.** Never make up subjects, lecturers, rooms or times. Unknown = `null`, rendered as `—`.
2. **Sample data must be impossible to mistake for real data.** Until real data arrives, `data.js` has `isSample: true` and the UI shows a permanent, high-contrast banner: `SAMPLE DATA – NOT THE REAL TIMETABLE`. Real data will be delivered later, in the schema below, by replacing `data.js` only.
3. **Data and code are separate.** All timetable content lives in `data.js`. Logic files contain zero timetable content.
4. **Stack is fixed:** plain HTML + CSS + vanilla JavaScript (ES modules are fine). **No frameworks, no build step, no npm, no CDN or external network requests of any kind.** Everything must work offline and when opened from a simple static server.
5. **Pure functions for all time and schedule logic**, taking `(data, date)` as inputs and never reading the system clock internally, so they can be tested.
6. **Do not claim anything works unless you can point to evidence.** For every acceptance check, report `PASS`, `FAIL` or `NOT VERIFIED`, and give the evidence (test name, the exact steps, or the code path). If you cannot execute code, say so and mark the item `NOT VERIFIED`. Never write "should work" or "this will work".
7. **No silent scope creep.** Don't add features, libraries, analytics, dark-mode themes, animations, or settings that are not listed. If you think something is missing, list it under "Suggestions" at the end of the phase report and do not build it.
8. **No placeholder code.** No `TODO`, no stubs, no `// implement later`, no commented-out blocks, no fake handlers. If a piece belongs to a later phase, leave it out entirely.
9. **Small, readable files.** Suggested layout (you may propose changes in Phase 0):
   ```
   index.html
   styles.css
   data.js            # ONLY timetable data
   time.js            # pure time/schedule logic
   ui-now.js  ui-next.js  ui-overview.js  ui-filters.js
   app.js             # wiring/router
   tests.html + tests.js   # browser test runner, no dependencies
   validate.js        # data validator (runs in browser and on tests page)
   sw.js  manifest.webmanifest  icons/
   ```
10. **Show full file contents when a file changes**, never "rest unchanged" snippets. Reviewers copy files directly.
11. **Ask, don't guess.** If a requirement is ambiguous, list the question in the phase report and pick the most conservative option, clearly labelled as an assumption.

## 4. Data contract (`data.js`)

```js
export const TIMETABLE = {
  meta: { isSample: true, term: "string|null", version: "string" },

  slots: [   // ordered; kind is "period" or "break"
    { id: "P1", label: "P1", start: "09:45", end: "10:40", kind: "period" },
    { id: "LUNCH", label: "Lunch", start: "13:25", end: "14:00", kind: "break" }
    // ...
  ],

  days: ["MON","TUE","WED","THU","FRI","SAT"],

  classes: [ { id: "CE-III", branch: "CE", sem: "III" } /* 15 total */ ],

  lecturers: { "VM": { name: "string|null" } },

  entries: [
    {
      day: "MON",
      classId: "CE-III",
      startSlot: "P1",
      endSlot: "P2",            // inclusive; same as startSlot for a single period
      subject: "string",
      type: "theory" | "lab" | "other",
      batch: null | "B1" | "B2" | "B3",   // only for labs split into batches
      lecturers: ["VM"],        // initials; may be empty
      room: null                // optional, usually null
    }
  ]
};
```

**Validator rules (`validate.js`), all must be enforced and unit-tested:**
- every `day`, `classId`, `startSlot`, `endSlot`, lecturer initial exists in the lists above
- `startSlot` ≤ `endSlot` in slot order, and an entry must **not span the LUNCH break**
- two entries for the same class overlapping in time are allowed **only** if both are `type: "lab"` with different non-null `batch` values
- `batch` non-null ⇒ `type` is `"lab"`
- no duplicate class ids, slot ids or day ids
- return a list of `{level: "error"|"warn", message, entryIndex}`; the app **refuses to render** and shows the error list if any `error` exists

## 5. Views and behaviour

**Global:** mobile-first (360px wide is the design target), works up to desktop. Bottom tab bar with three tabs: **Now · Next · Overview**. Header shows current day, time, and the sample banner when applicable.

### 5.1 Now
- Shows every class (grouped by branch) and what it has **at this moment**: subject, lecturer(s), lab batches stacked, "ends at HH:MM".
- States that must be handled and worded clearly: before first period, in a period, during lunch, between periods (if any), after last period, Sunday/no classes.
- Free period = show "Free" (muted). Never leave a blank cell.
- A tiny "Search: class / lecturer / subject" box at the top filters the list.

### 5.2 Next
- A vertically scrolling list of the **upcoming** slots for today, starting with the next one, grouped by time, then by branch.
- Each row shows class, subject, lecturer(s), batch(es), and time range.
- If today is over, show tomorrow (skipping Sunday) with a clear "Tomorrow" header.

### 5.3 Overview
Two modes, toggled with a segmented control:
- **Day:** a grid with classes as rows (grouped by branch, sticky first column) and slots as columns, for a chosen day (default today, day picker Mon–Sat). Horizontal scroll is allowed, page-level horizontal scroll is not. Lab batches stack inside a cell. The current slot column is highlighted when viewing today.
- **Week:** a grid with days as rows and slots as columns, for **one selected class or one selected lecturer** (picker at the top). Do not attempt a whole-college week view.

### 5.4 Filters
- Branch filter (All / CE / CS / EC / EE / ME) and lecturer filter apply to Now, Next and Day overview.
- Filter state is kept in memory only. No localStorage is needed.

### 5.5 Time simulation (dev tool, required)
A small, collapsible "Simulate time" panel (day + time inputs + reset button) that overrides the clock for the whole app. It is the only way the developer can test at night or on Sunday. It must be clearly labelled and visually distinct.

## 6. Visual design

Flat and functional. Nothing decorative.
- No shadows, gradients, blur, rounded-card stacks, or animations (except instant state changes).
- One neutral background, one accent colour, one muted text colour, 1px borders. System font stack.
- Minimum tap target 44px. Body text ≥ 16px. Contrast ≥ WCAG AA.
- Current/live items are marked with a solid accent left border or a filled label, **not** with colour alone (also add text such as "LIVE").
- Labs are marked with a text tag `LAB`, batches as `B1/B2/B3`.

## 7. PWA requirements
- `manifest.webmanifest` (name, short_name, start_url `./`, display `standalone`, theme/background colours, 192 and 512 icons: simple generated flat icons are fine)
- Service worker with a **versioned cache name**, pre-caching every app file, cache-first for those files, and old-cache cleanup on activate
- All paths **relative** (the app will be hosted under a sub-path on GitHub Pages)
- Works fully offline after first load
- Updating `data.js` and bumping the cache version must deliver the new data to already-installed users. Explain exactly how in the final report.

---

## 8. Phase Loop (how you must work)

You work in **phases**. For every phase, run this loop:

```
BUILD → SELF-AUDIT → FIX → SELF-AUDIT → ... → REPORT → STOP
```

1. **BUILD** only what the current phase lists.
2. **SELF-AUDIT:** go through the phase's acceptance checks one by one. Mark each `PASS` / `FAIL` / `NOT VERIFIED` with evidence (rule 6).
3. **FIX:** if any check is `FAIL`, fix it and audit again. Maximum **3 loops**. If still failing, stop and report the blocker honestly.
4. **REPORT** in exactly this format:
   ```
   PHASE N REPORT
   Files changed: ...
   How to run / test: ...
   Acceptance checks: (table: check | status | evidence)
   Assumptions made: ...
   Open questions: ...
   Suggestions (NOT built): ...
   ```
5. **STOP.** Do not start the next phase until the user replies exactly `APPROVED PHASE N`.

### Phase 0: Contract (no code)
Restate the requirements in your own words in ≤ 15 lines, list your assumptions, list open questions, propose the file layout, and identify the 3 riskiest parts of this build.
*Acceptance:* no code is written; every question is specific; the risks are concrete.

### Phase 1: Data layer, validator, time engine, tests
Build `data.js` (sample: 2 days, at least 3 classes, including one multi-slot lab, one 3-batch lab, one LIB and one free period; `isSample: true`), `validate.js`, `time.js`, and `tests.html/tests.js`.
`time.js` must export pure functions: `getSlotState(data, date)` (returns before / in-period / break / after / closed), `getCurrentEntries(data, date)`, `getUpcomingEntries(data, date)`, `getDayGrid(data, day)`, `getClassWeek(data, classId)`, `getLecturerWeek(data, initials)`.
*Acceptance:* tests cover every state above (before 09:45, exactly at 09:45, one minute before a period ends, exactly at a boundary, lunch, after last period, Sunday); multi-slot lab appears in every slot it covers; 3 batches all appear; validator rejects each bad-data case in §4 with a test for each; boundaries use `start ≤ t < end`. No UI yet.

### Phase 2: Shell + Now view
App shell, tab bar, sample banner, simulate-time panel, and the Now view with all its states and the search box.
*Acceptance:* every state in §5.1 is reachable via Simulate Time and renders correctly; no blank cells; lab batches stack; nothing scrolls horizontally at 360px.

### Phase 3: Next view
*Acceptance:* correct ordering; the "Tomorrow" roll-over works, including Saturday evening → Monday; lab spans are shown once with the full time range, not duplicated per slot.

### Phase 4: Overview (Day + Week)
*Acceptance:* sticky first column works; the current slot is highlighted only when viewing today; the week view works for both a class and a lecturer; a lecturer with parallel batches in the same slot is flagged, not hidden.

### Phase 5: Filters
Branch and lecturer filters wired into Now, Next, Day overview.
*Acceptance:* filters combine correctly (branch AND lecturer); an empty result shows a clear "Nothing matches" message.

### Phase 6: PWA and offline
*Acceptance:* manifest valid; the service worker registers; the app loads with the network disabled; a data-only update path is documented and correct; no request goes to any external origin.

### Phase 7: Hardening and final audit
Review edge cases (empty data, huge subject names wrapping, 2-lecturer cells, missing lecturer names, very small screen), accessibility (labels, focus order, contrast), and remove dead code.
*Acceptance:* a final full checklist of §3, §5, §6, §7 with status and evidence for each line item; a short "Deploy to GitHub Pages" guide (≤ 10 steps).

---

## 9. Data handoff (for later)
The real timetable will be delivered as a replacement `data.js` in exactly the §4 schema with `isSample: false`. After replacing it, the app must need **zero code changes**. If the schema would make that impossible, say so in Phase 0.

## 10. Start
Begin with **Phase 0 only**. Do not write code yet.
