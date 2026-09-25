// Phase 1: Unit Test Suite for validate.js and time.js
// Runs in browser with zero dependencies.
// Tests every requirement in §4 and §8 (Phase 1):
// - Every time state: before 09:45, exactly at 09:45, 1 minute before period ends (10:39),
//   boundary transition (10:40:00), lunch break, after last period (16:35), Sunday
// - Multi-slot lab appears in every slot it covers
// - 3 batches all appear in their covered slots
// - Validator rejects each bad-data case in §4:
//   * unknown day
//   * unknown classId
//   * unknown startSlot / endSlot
//   * unknown lecturer initial
//   * startSlot > endSlot
//   * entry spanning lunch break
//   * illegal overlap (theory-theory, theory-lab, or labs with null batch)
//   * batch non-null on non-lab type
//   * duplicate slot IDs, class IDs, day IDs
// - Boundary tests: start <= t < end

import { TIMETABLE } from "./data.js";
import { validateTimetable } from "./validate.js";
import {
  getSlotState,
  getCurrentEntries,
  getUpcomingEntries,
  getTodayTimeline,
  filterTodayTimeline,
  getDayGrid,
  getClassWeek,
  getLecturerWeek,
  filterCurrentEntries,
  filterUpcomingEntries,
  filterDayGrid,
  formatDuration,
  getTimeRemaining,
  getRelativeSlotTime,
  getWeeklyWorkloadStats
} from "./time.js";

export async function runAllTests() {
  const results = [];

  function assert(testName, condition, detail = "") {
    if (condition) {
      results.push({ name: testName, pass: true, detail });
    } else {
      results.push({ name: testName, pass: false, detail: detail || "Assertion failed" });
    }
  }

  // Helper to create a specific Date fixture:
  // e.g. "2026-09-28" is a Monday
  // Days of week in Sep/Oct 2026:
  // 2026-09-27 = SUN
  // 2026-09-28 = MON
  // 2026-09-29 = TUE
  // 2026-09-30 = WED
  // 2026-10-01 = THU
  // 2026-10-02 = FRI
  // 2026-10-03 = SAT
  function createDate(dayStr, hours, minutes, seconds = 0) {
    const dayMap = {
      SUN: "2026-09-27",
      MON: "2026-09-28",
      TUE: "2026-09-29",
      WED: "2026-09-30",
      THU: "2026-10-01",
      FRI: "2026-10-02",
      SAT: "2026-10-03"
    };
    const dateStr = `${dayMap[dayStr]}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    return new Date(dateStr);
  }

  // -------------------------------------------------------------
  // Group A: Data Validator Tests
  // -------------------------------------------------------------
  
  // Test A1: Valid sample data passes with 0 errors
  const sampleIssues = validateTimetable(TIMETABLE);
  const sampleErrors = sampleIssues.filter(i => i.level === "error");
  assert("Validator: Sample data has 0 errors", sampleErrors.length === 0, `Got errors: ${sampleErrors.map(e => e.message).join("; ")}`);

  // Helper to clone timetable for mutation tests
  function cloneData() {
    return JSON.parse(JSON.stringify(TIMETABLE));
  }

  // Test A2: Reject unknown day
  const badDayData = cloneData();
  badDayData.entries.push({
    day: "XYZ",
    classId: "CE-III",
    startSlot: "P1",
    endSlot: "P1",
    subject: "MATHS",
    type: "theory",
    batch: null,
    lecturers: ["VM"],
    room: null
  });
  const badDayIssues = validateTimetable(badDayData);
  assert(
    "Validator: Rejects unknown day 'XYZ'",
    badDayIssues.some(i => i.message.includes('invalid day: "XYZ"'))
  );

  // Test A3: Reject unknown classId
  const badClassData = cloneData();
  badClassData.entries.push({
    day: "MON",
    classId: "UNKNOWN-CLASS",
    startSlot: "P1",
    endSlot: "P1",
    subject: "MATHS",
    type: "theory",
    batch: null,
    lecturers: ["VM"],
    room: null
  });
  const badClassIssues = validateTimetable(badClassData);
  assert(
    "Validator: Rejects unknown classId 'UNKNOWN-CLASS'",
    badClassIssues.some(i => i.message.includes('invalid classId: "UNKNOWN-CLASS"'))
  );

  // Test A4: Reject unknown startSlot or endSlot
  const badSlotData = cloneData();
  badSlotData.entries.push({
    day: "MON",
    classId: "CE-III",
    startSlot: "NON_EXISTENT",
    endSlot: "P1",
    subject: "MATHS",
    type: "theory",
    batch: null,
    lecturers: ["VM"],
    room: null
  });
  const badSlotIssues = validateTimetable(badSlotData);
  assert(
    "Validator: Rejects unknown startSlot",
    badSlotIssues.some(i => i.message.includes('invalid startSlot: "NON_EXISTENT"'))
  );

  // Test A5: Reject unknown lecturer initial
  const badLecturerData = cloneData();
  badLecturerData.entries.push({
    day: "MON",
    classId: "CE-III",
    startSlot: "P1",
    endSlot: "P1",
    subject: "MATHS",
    type: "theory",
    batch: null,
    lecturers: ["UNKNOWN_INITIAL"],
    room: null
  });
  const badLecturerIssues = validateTimetable(badLecturerData);
  assert(
    "Validator: Rejects unknown lecturer initial 'UNKNOWN_INITIAL'",
    badLecturerIssues.some(i => i.message.includes('unknown lecturer initial "UNKNOWN_INITIAL"'))
  );

  // Test A6: Reject startSlot > endSlot in order
  const badSlotOrderData = cloneData();
  badSlotOrderData.entries.push({
    day: "MON",
    classId: "CE-III",
    startSlot: "P3",
    endSlot: "P1", // P3 is after P1!
    subject: "MATHS",
    type: "theory",
    batch: null,
    lecturers: ["VM"],
    room: null
  });
  const badSlotOrderIssues = validateTimetable(badSlotOrderData);
  assert(
    "Validator: Rejects inverted slots (startSlot > endSlot)",
    badSlotOrderIssues.some(i => i.message.includes("is after endSlot"))
  );

  // Test A7: Reject entry spanning LUNCH break
  const spanLunchData = cloneData();
  spanLunchData.entries.push({
    day: "MON",
    classId: "ME-I",
    startSlot: "P4",
    endSlot: "P5", // Spans LUNCH (P4 -> LUNCH -> P5)
    subject: "WORKSHOP",
    type: "lab",
    batch: null,
    lecturers: ["MSN"],
    room: null
  });
  const spanLunchIssues = validateTimetable(spanLunchData);
  assert(
    "Validator: Rejects entry spanning LUNCH break",
    spanLunchIssues.some(i => i.message.includes('break slot "LUNCH"'))
  );

  // Test A8: Reject illegal collision (e.g. 2 theory classes at same time for same class)
  const collideData = cloneData();
  collideData.entries.push({
    day: "MON",
    classId: "CE-III",
    startSlot: "P1",
    endSlot: "P1",
    subject: "PHYSICS",
    type: "theory",
    batch: null,
    lecturers: ["KAR"],
    room: null
  });
  const collideIssues = validateTimetable(collideData);
  assert(
    "Validator: Rejects illegal collision for same class at same slot",
    collideIssues.some(i => i.message.includes("Illegal schedule collision"))
  );

  // Test A9: Reject batch non-null on type != 'lab'
  const badBatchTypeData = cloneData();
  badBatchTypeData.entries.push({
    day: "MON",
    classId: "ME-I",
    startSlot: "P1",
    endSlot: "P1",
    subject: "MATHS THEORY",
    type: "theory",
    batch: "B1", // Non-null batch on theory!
    lecturers: ["VM"],
    room: null
  });
  const badBatchIssues = validateTimetable(badBatchTypeData);
  assert(
    "Validator: Rejects non-null batch on non-lab type",
    badBatchIssues.some(i => i.message.includes('must have type "lab"'))
  );

  // Test A10: Reject duplicate slot IDs
  const dupSlotData = cloneData();
  dupSlotData.slots.push({ id: "P1", label: "P1 dup", start: "17:00", end: "18:00", kind: "period" });
  const dupSlotIssues = validateTimetable(dupSlotData);
  assert(
    "Validator: Rejects duplicate slot ID",
    dupSlotIssues.some(i => i.message.includes('Duplicate slot ID found: "P1"'))
  );

  // Test A11: Reject duplicate class IDs
  const dupClassData = cloneData();
  dupClassData.classes.push({ id: "CE-III", branch: "CE", sem: "III" });
  const dupClassIssues = validateTimetable(dupClassData);
  assert(
    "Validator: Rejects duplicate class ID",
    dupClassIssues.some(i => i.message.includes('Duplicate class ID found: "CE-III"'))
  );

  // Test A12: Reject duplicate day IDs
  const dupDayData = cloneData();
  dupDayData.days.push("MON");
  const dupDayIssues = validateTimetable(dupDayData);
  assert(
    "Validator: Rejects duplicate day ID",
    dupDayIssues.some(i => i.message.includes('Duplicate day ID found: "MON"'))
  );


  // -------------------------------------------------------------
  // Group B: Pure Time & Boundary Tests (getSlotState)
  // Rule: start <= t < end
  // -------------------------------------------------------------

  // Test B1: Sunday -> status: "closed"
  const sundayDate = createDate("SUN", 10, 0, 0);
  const sundayState = getSlotState(TIMETABLE, sundayDate);
  assert(
    "Time Engine: Sunday returns status 'closed'",
    sundayState.status === "closed" && sundayState.day === "SUN"
  );

  // Test B2: Monday before 09:45 (e.g. 09:00:00) -> status: "before"
  const beforeDate = createDate("MON", 9, 0, 0);
  const beforeState = getSlotState(TIMETABLE, beforeDate);
  assert(
    "Time Engine: 09:00 (before 09:45) returns status 'before'",
    beforeState.status === "before" && beforeState.nextSlot?.id === "P1"
  );

  // Test B3: Exactly at 09:45:00 -> status: "in-period", currentSlot: "P1" (start boundary inclusive: start <= t)
  const exactStartDate = createDate("MON", 9, 45, 0);
  const exactStartState = getSlotState(TIMETABLE, exactStartDate);
  assert(
    "Time Engine: Exactly at 09:45:00 returns 'in-period' with currentSlot 'P1'",
    exactStartState.status === "in-period" && exactStartState.currentSlot?.id === "P1"
  );

  // Test B4: One minute before period ends (10:39:00) -> status: "in-period", currentSlot: "P1"
  const minBeforeEndDate = createDate("MON", 10, 39, 0);
  const minBeforeEndState = getSlotState(TIMETABLE, minBeforeEndDate);
  assert(
    "Time Engine: 10:39:00 (1 min before end) returns 'in-period' with currentSlot 'P1'",
    minBeforeEndState.status === "in-period" && minBeforeEndState.currentSlot?.id === "P1"
  );

  // Test B5: Exactly at slot boundary (10:40:00) -> transitions cleanly to "P2" (half-open: t < end)
  const boundaryDate = createDate("MON", 10, 40, 0);
  const boundaryState = getSlotState(TIMETABLE, boundaryDate);
  assert(
    "Time Engine: Exactly at 10:40:00 transitions to 'in-period' currentSlot 'P2'",
    boundaryState.status === "in-period" && boundaryState.currentSlot?.id === "P2"
  );

  // Test B6: During lunch break (13:30:00) -> status: "break", currentSlot: "LUNCH"
  const lunchDate = createDate("MON", 13, 30, 0);
  const lunchState = getSlotState(TIMETABLE, lunchDate);
  assert(
    "Time Engine: 13:30:00 returns status 'break' with currentSlot 'LUNCH'",
    lunchState.status === "break" && lunchState.currentSlot?.id === "LUNCH"
  );

  // Test B7: After last period (16:35:00) -> status: "after"
  const afterDate = createDate("MON", 16, 35, 0);
  const afterState = getSlotState(TIMETABLE, afterDate);
  assert(
    "Time Engine: 16:35:00 (after 16:30) returns status 'after'",
    afterState.status === "after" && afterState.currentSlot === null
  );


  // -------------------------------------------------------------
  // Group C: Live Schedule Lookups (getCurrentEntries)
  // -------------------------------------------------------------

  // Test C1: Multi-slot lab appears in every slot it covers (CS-III lab spans P3 and P4)
  // Check during P3 (12:00:00)
  const p3Date = createDate("MON", 12, 0, 0);
  const p3Live = getCurrentEntries(TIMETABLE, p3Date);
  const cs3DuringP3 = p3Live.find(c => c.classId === "CS-III");
  assert(
    "CurrentEntries: Multi-slot lab active during P3 (CS-III)",
    cs3DuringP3 && cs3DuringP3.entries.length === 3
  );

  // Check during P4 (13:00:00)
  const p4Date = createDate("MON", 13, 0, 0);
  const p4Live = getCurrentEntries(TIMETABLE, p4Date);
  const cs3DuringP4 = p4Live.find(c => c.classId === "CS-III");
  assert(
    "CurrentEntries: Multi-slot lab active during P4 (CS-III continues into P4)",
    cs3DuringP4 && cs3DuringP4.entries.length === 3
  );

  // Test C2: 3 batches all appear during CS-III multi-batch lab
  const batches = cs3DuringP3?.entries.map(e => e.batch).sort();
  assert(
    "CurrentEntries: All 3 batches (B1, B2, B3) appear in CS-III lab",
    JSON.stringify(batches) === JSON.stringify(["B1", "B2", "B3"]),
    `Found batches: ${JSON.stringify(batches)}`
  );

  // Test C3: Free period detection (CE-III on MON during P4 is free)
  const ce3DuringP4 = p4Live.find(c => c.classId === "CE-III");
  assert(
    "CurrentEntries: Detects free period for CE-III during MON P4",
    ce3DuringP4 && ce3DuringP4.isFree === true && ce3DuringP4.entries.length === 0
  );

  // Test C4: Non-teaching entry (LIB) on TUE P1 (10:00:00)
  const tueP1Date = createDate("TUE", 10, 0, 0);
  const tueP1Live = getCurrentEntries(TIMETABLE, tueP1Date);
  const ce3TueP1 = tueP1Live.find(c => c.classId === "CE-III");
  assert(
    "CurrentEntries: Non-teaching item LIB rendered for CE-III on TUE P1",
    ce3TueP1 && ce3TueP1.entries[0]?.subject === "LIB" && ce3TueP1.entries[0]?.type === "other"
  );


  // -------------------------------------------------------------
  // Group D: Upcoming Entries (getUpcomingEntries)
  // -------------------------------------------------------------

  // Test D1: Next entries during P1 (10:00 MON) shows upcoming slots starting with P2
  const p1UpcomingDate = createDate("MON", 10, 0, 0);
  const upcomingP1 = getUpcomingEntries(TIMETABLE, p1UpcomingDate);
  assert(
    "UpcomingEntries: During P1, next slot starts at P2",
    upcomingP1.slots.length > 0 && upcomingP1.slots[0].slot.id === "P2"
  );

  // Test D2: Multi-slot lab shown once with full time range, not duplicated per slot
  // When querying from P2 upcoming, CS-III lab spans P3-P4 (11:35 to 13:25).
  // It should appear under P3, and NOT be re-added under P4!
  const p3SlotBlock = upcomingP1.slots.find(s => s.slot.id === "P3");
  const p4SlotBlock = upcomingP1.slots.find(s => s.slot.id === "P4");
  const cs3InP3 = p3SlotBlock?.classes.find(c => c.classId === "CS-III");
  const cs3InP4 = p4SlotBlock?.classes.find(c => c.classId === "CS-III");
  assert(
    "UpcomingEntries: Multi-slot lab shown at span start slot (P3)",
    cs3InP3 && cs3InP3.entries.length === 3 && cs3InP3.entries[0].spanStartSlot.start === "11:35" && cs3InP3.entries[0].spanEndSlot.end === "13:25"
  );
  assert(
    "UpcomingEntries: Multi-slot lab not duplicated in subsequent slot (P4)",
    cs3InP4 === undefined || cs3InP4.entries.length === 0
  );

  // Test D3: Rollover after last period on Monday (17:00) rolls to Tuesday
  const monNightDate = createDate("MON", 17, 0, 0);
  const monNightUpcoming = getUpcomingEntries(TIMETABLE, monNightDate);
  assert(
    "UpcomingEntries: After Monday classes rolls over to Tuesday (isTomorrow: true)",
    monNightUpcoming.isTomorrow === true && monNightUpcoming.displayDay === "TUE"
  );

  // Test D4: Rollover after Saturday classes (17:00 SAT) rolls to Monday (skipping Sunday)
  const satNightDate = createDate("SAT", 17, 0, 0);
  const satNightUpcoming = getUpcomingEntries(TIMETABLE, satNightDate);
  assert(
    "UpcomingEntries: After Saturday classes rolls over to Monday",
    satNightUpcoming.isTomorrow === true && satNightUpcoming.displayDay === "MON"
  );

  // Test D5: Strictly chronological ordering of upcoming slots
  const isChronological = upcomingP1.slots.every((curr, idx, arr) => {
    if (idx === 0) return true;
    return curr.slot.start > arr[idx - 1].slot.start;
  });
  assert(
    "UpcomingEntries: Slots returned in strict chronological order",
    isChronological && upcomingP1.slots.length > 0
  );

  // Test D6: Sunday (college closed) rolls over to Monday morning with isTomorrow: true
  const sundayMidday = createDate("SUN", 12, 0, 0);
  const sundayUpcoming = getUpcomingEntries(TIMETABLE, sundayMidday);
  assert(
    "UpcomingEntries: Sunday rolls over to Monday starting at P1 (isTomorrow: true)",
    sundayUpcoming.isTomorrow === true &&
    sundayUpcoming.displayDay === "MON" &&
    sundayUpcoming.slots[0]?.slot.id === "P1"
  );

  // Test D7: Saturday evening (18:00 SAT) rolls over to Monday morning starting at P1
  const satEveningDate = createDate("SAT", 18, 0, 0);
  const satEveningUpcoming = getUpcomingEntries(TIMETABLE, satEveningDate);
  assert(
    "UpcomingEntries: Saturday evening (18:00) rolls over to Monday morning (P1)",
    satEveningUpcoming.isTomorrow === true &&
    satEveningUpcoming.displayDay === "MON" &&
    satEveningUpcoming.slots[0]?.slot.id === "P1"
  );

  // Test D8: During lunch break (13:30 MON), next period begins with P5 (14:00)
  const lunchUpcomingDate = createDate("MON", 13, 30, 0);
  const lunchUpcoming = getUpcomingEntries(TIMETABLE, lunchUpcomingDate);
  assert(
    "UpcomingEntries: During lunch break (13:30), next period begins with P5",
    lunchUpcoming.isTomorrow === false &&
    lunchUpcoming.displayDay === "MON" &&
    lunchUpcoming.slots[0]?.slot.id === "P5"
  );

  // Test D9: Before college starts (09:00 MON), lists all 7 teaching periods starting at P1
  const morningUpcomingDate = createDate("MON", 9, 0, 0);
  const morningUpcoming = getUpcomingEntries(TIMETABLE, morningUpcomingDate);
  assert(
    "UpcomingEntries: Before college (09:00 MON) lists all 7 periods starting at P1",
    morningUpcoming.isTomorrow === false &&
    morningUpcoming.displayDay === "MON" &&
    morningUpcoming.slots.length === 7 &&
    morningUpcoming.slots[0]?.slot.id === "P1" &&
    morningUpcoming.slots[morningUpcoming.slots.length - 1]?.slot.id === "P7"
  );

  // Test D10: Multi-slot lab ME-V on MON P5-P6 (14:00 - 15:40) appears once under P5 and is not duplicated under P6
  const p5SlotBlock = morningUpcoming.slots.find(s => s.slot.id === "P5");
  const p6SlotBlock = morningUpcoming.slots.find(s => s.slot.id === "P6");
  const mevInP5 = p5SlotBlock?.classes.find(c => c.classId === "ME-V");
  const mevInP6 = p6SlotBlock?.classes.find(c => c.classId === "ME-V");
  assert(
    "UpcomingEntries: ME-V multi-slot lab appears in P5 with full time range and not in P6",
    mevInP5 &&
    mevInP5.entries.length === 1 &&
    mevInP5.entries[0].spanStartSlot.start === "14:00" &&
    mevInP5.entries[0].spanEndSlot.end === "15:40" &&
    (mevInP6 === undefined || mevInP6.entries.length === 0)
  );


  // -------------------------------------------------------------
  // Group E: Overview Matrix Functions
  // -------------------------------------------------------------

  // Test E1: getDayGrid returns all 15 classes as rows
  const dayGrid = getDayGrid(TIMETABLE, "MON");
  assert(
    "DayGrid: Contains all 15 classes as rows",
    dayGrid.rows.length === 15 && dayGrid.slots.length === 8
  );

  // Test E2: getClassWeek returns 6 working days
  const classWeek = getClassWeek(TIMETABLE, "CS-III");
  assert(
    "ClassWeek: Contains 6 working days for CS-III",
    classWeek.days.length === 6 && classWeek.classId === "CS-III"
  );

  // Test E3: getLecturerWeek returns schedule and flags parallel collisions if any
  const lecturerWeek = getLecturerWeek(TIMETABLE, "VM");
  assert(
    "LecturerWeek: Returns weekly schedule for lecturer VM ('V. Mohan')",
    lecturerWeek.initials === "VM" && lecturerWeek.lecturerName === "V. Mohan" && lecturerWeek.days.length === 6
  );

  // Test E4: Parallel batch collision detection in getLecturerWeek
  // Create a timetable fixture where lecturer "RBL" is assigned to two different batches (B1 & B2) in the same slot
  const collisionFixture = JSON.parse(JSON.stringify(TIMETABLE));
  collisionFixture.entries.push({
    day: "MON",
    classId: "CS-III",
    startSlot: "P3",
    endSlot: "P4",
    subject: "ADVANCED DSP LAB",
    type: "lab",
    batch: "B2",
    lecturers: ["RBL"],
    room: "LAB1"
  });
  const rblWeekWithCollision = getLecturerWeek(collisionFixture, "RBL");
  const monRow = rblWeekWithCollision.days.find(d => d.day === "MON");
  const p3Cell = monRow.cells.find(c => c.slot.id === "P3");
  assert(
    "LecturerWeek: Flags parallel collision (hasParallelCollision: true) when assigned to parallel batches",
    p3Cell.hasParallelCollision === true && p3Cell.entries.length === 2
  );

  // Test E5: DayGrid marks free slots when no entries are scheduled
  const ceRow = dayGrid.rows.find(r => r.classId === "CE-III");
  const ceP4Cell = ceRow.cells.find(c => c.slot.id === "P4");
  assert(
    "DayGrid: CE-III on MON at P4 is a scheduled free period (0 entries)",
    ceP4Cell && ceP4Cell.entries.length === 0
  );

  // Test E6: DayGrid lab batches correctly populate multi-slot lab
  const csRow = dayGrid.rows.find(r => r.classId === "CS-III");
  const csP3Cell = csRow.cells.find(c => c.slot.id === "P3");
  const csP4Cell = csRow.cells.find(c => c.slot.id === "P4");
  assert(
    "DayGrid: CS-III multi-slot 3-batch lab appears in both P3 and P4 with 3 entries",
    csP3Cell && csP3Cell.entries.length === 3 &&
    csP4Cell && csP4Cell.entries.length === 3
  );

  // -------------------------------------------------------------
  // Group F: Filters (Phase 5: Branch & Lecturer Combination)
  // -------------------------------------------------------------

  const mon12Date = createDate("MON", 12, 0, 0); // During P3 (11:35 - 12:25)
  const currentEntriesMon12 = getCurrentEntries(TIMETABLE, mon12Date);

  // Test F1: Now view filter by Branch alone
  const csOnlyNow = filterCurrentEntries(currentEntriesMon12, { branch: "CS", lecturer: "ALL" });
  assert(
    "Filter Now: Branch 'CS' alone returns only CS classes",
    csOnlyNow.length > 0 && csOnlyNow.every(c => c.branch === "CS")
  );

  // Test F2: Now view filter by Lecturer alone
  const rblOnlyNow = filterCurrentEntries(currentEntriesMon12, { branch: "ALL", lecturer: "RBL" });
  assert(
    "Filter Now: Lecturer 'RBL' alone returns classes taught by RBL at 12:00",
    rblOnlyNow.length === 1 &&
    rblOnlyNow[0].classId === "CS-III" &&
    rblOnlyNow[0].entries.some(e => e.lecturers.includes("RBL"))
  );

  // Test F3: Now view filter combining Branch AND Lecturer
  const csRblNow = filterCurrentEntries(currentEntriesMon12, { branch: "CS", lecturer: "RBL" });
  assert(
    "Filter Now: Combines Branch 'CS' AND Lecturer 'RBL' correctly",
    csRblNow.length === 1 &&
    csRblNow[0].classId === "CS-III" &&
    csRblNow[0].branch === "CS" &&
    csRblNow[0].entries.some(e => e.lecturers.includes("RBL"))
  );

  // Test F4: Now view filter with 0 matches returns empty results (triggers 'Nothing matches')
  const meRblNow = filterCurrentEntries(currentEntriesMon12, { branch: "ME", lecturer: "RBL" });
  assert(
    "Filter Now: Disjoint combination Branch 'ME' AND Lecturer 'RBL' yields 0 results",
    meRblNow.length === 0
  );

  // Test F5: Next view filter combining Branch AND Lecturer
  const morningDate = createDate("MON", 9, 0, 0);
  const rawUpcomingMorning = getUpcomingEntries(TIMETABLE, morningDate);
  const csRblUpcoming = filterUpcomingEntries(rawUpcomingMorning, { branch: "CS", lecturer: "RBL" });
  assert(
    "Filter Next: Combines Branch 'CS' AND Lecturer 'RBL' in upcoming schedule",
    csRblUpcoming.slots.length > 0 &&
    csRblUpcoming.slots.every(s =>
      s.classes.every(c => c.branch === "CS" && c.entries.every(e => e.entry.lecturers.includes("RBL")))
    )
  );

  // Test F6: Next view filter with 0 matches returns 0 slots (triggers 'Nothing matches')
  const meRblUpcoming = filterUpcomingEntries(rawUpcomingMorning, { branch: "ME", lecturer: "RBL" });
  assert(
    "Filter Next: Disjoint combination Branch 'ME' AND Lecturer 'RBL' yields 0 upcoming slots",
    meRblUpcoming.slots.length === 0
  );

  // Test F7: Day Overview filter combining Branch AND Lecturer
  const rawDayGridMon = getDayGrid(TIMETABLE, "MON");
  const ceVmDayGrid = filterDayGrid(rawDayGridMon, { branch: "CE", lecturer: "VM" });
  assert(
    "Filter DayGrid: Combines Branch 'CE' AND Lecturer 'VM' correctly",
    ceVmDayGrid.rows.length === 1 &&
    ceVmDayGrid.rows[0].classId === "CE-III" &&
    ceVmDayGrid.rows[0].branch === "CE" &&
    ceVmDayGrid.rows[0].cells.some(c => c.entries.some(e => e.lecturers.includes("VM")))
  );

  // Test F8: Day Overview filter with 0 matches returns 0 rows (triggers 'Nothing matches')
  const meRblDayGrid = filterDayGrid(rawDayGridMon, { branch: "ME", lecturer: "RBL" });
  assert(
    "Filter DayGrid: Disjoint combination Branch 'ME' AND Lecturer 'RBL' yields 0 rows",
    meRblDayGrid.rows.length === 0
  );

  // Test F9: Reset filters (ALL / ALL) restores complete datasets
  const allNow = filterCurrentEntries(currentEntriesMon12, { branch: "ALL", lecturer: "ALL" });
  const allDayGrid = filterDayGrid(rawDayGridMon, { branch: "ALL", lecturer: "ALL" });
  assert(
    "Filter Reset: 'ALL' filters restore full unfiltered datasets",
    allNow.length === 15 && allDayGrid.rows.length === 15
  );

  // -------------------------------------------------------------
  // Group G: PWA, Manifest, Service Worker & Offline (Phase 6)
  // -------------------------------------------------------------

  // Test G1: Manifest fetch and valid JSON parsing
  let manifest = null;
  try {
    const res = await fetch("./manifest.webmanifest");
    if (res.ok) {
      manifest = await res.json();
    }
  } catch (err) {
    manifest = null;
  }
  assert("PWA Manifest: File exists and parses as valid JSON", manifest !== null, manifest ? "Parsed successfully" : "Failed to load/parse manifest");

  if (manifest) {
    // Test G2: Manifest Core Required Fields
    const hasCoreFields = (
      manifest.id &&
      manifest.name &&
      manifest.short_name &&
      manifest.start_url &&
      manifest.scope &&
      manifest.display === "standalone" &&
      manifest.theme_color &&
      manifest.background_color
    );
    assert(
      "PWA Manifest: Contains all required core fields (id, name, short_name, start_url, scope, display=standalone, theme_color, background_color)",
      Boolean(hasCoreFields),
      `Found fields: ${Object.keys(manifest).join(", ")}`
    );

    // Test G3: Manifest short_name constraint (<= 12 characters)
    assert(
      "PWA Manifest: short_name is <= 12 characters to prevent truncation on mobile launcher",
      typeof manifest.short_name === "string" && manifest.short_name.length <= 12,
      `short_name is "${manifest.short_name}" (${manifest.short_name ? manifest.short_name.length : 0} chars)`
    );

    // Test G4: Manifest Icons Completeness (192, 512, maskable, relative paths)
    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    const has192Any = icons.some(i => i.sizes === "192x192" && (i.purpose === "any" || !i.purpose));
    const has512Any = icons.some(i => i.sizes === "512x512" && (i.purpose === "any" || !i.purpose));
    const has512Maskable = icons.some(i => i.sizes === "512x512" && i.purpose === "maskable");
    const allPathsRelative = icons.every(i => typeof i.src === "string" && (i.src.startsWith("./") || !i.src.startsWith("/")));

    assert(
      "PWA Manifest: Includes compliant 192x192, 512x512, and 512x512 maskable icons with relative paths",
      has192Any && has512Any && has512Maskable && allPathsRelative,
      `has192: ${has192Any}, has512: ${has512Any}, hasMaskable: ${has512Maskable}, relative: ${allPathsRelative}`
    );

    // Test G5: Relative Scope and Start URL for subdirectory hosting
    const relativeScopeAndStart = (
      typeof manifest.start_url === "string" && manifest.start_url.startsWith("./") &&
      typeof manifest.scope === "string" && manifest.scope.startsWith("./")
    );
    assert(
      "PWA Manifest: start_url and scope use relative paths ('./') for sub-path GitHub Pages hosting",
      relativeScopeAndStart,
      `start_url: "${manifest.start_url}", scope: "${manifest.scope}"`
    );
  }

  // Test G6: Service Worker Source Code & Versioned Precache Verification
  let swCode = "";
  try {
    const swRes = await fetch("./sw.js");
    if (swRes.ok) {
      swCode = await swRes.text();
    }
  } catch (err) {
    swCode = "";
  }
  const hasCacheName = /CACHE_NAME\s*=\s*["']timetable-cache-v\d+["']/.test(swCode);
  const precachesAppFiles = [
    "./index.html",
    "./styles.css",
    "./app.js",
    "./data.js",
    "./time.js",
    "./validate.js",
    "./ui-now.js",
    "./ui-next.js",
    "./ui-overview.js",
    "./manifest.webmanifest"
  ].every(file => swCode.includes(file));
  const hasCacheCleanup = swCode.includes("caches.delete") && swCode.includes("activate");
  const hasCacheFirstFetch = swCode.includes("caches.match") && swCode.includes("fetch");

  assert(
    "Service Worker: Implements versioned cache, pre-caches all app files, cleans old caches on activate, and uses cache-first fetch",
    hasCacheName && precachesAppFiles && hasCacheCleanup && hasCacheFirstFetch,
    `versioned: ${hasCacheName}, precaches: ${precachesAppFiles}, cleanup: ${hasCacheCleanup}, cache-first: ${hasCacheFirstFetch}`
  );

  // Test G7: Zero External Origin / Network Requests
  let indexHtml = "";
  let stylesCss = "";
  try {
    const [hRes, sRes] = await Promise.all([fetch("./index.html"), fetch("./styles.css")]);
    if (hRes.ok) indexHtml = await hRes.text();
    if (sRes.ok) stylesCss = await sRes.text();
  } catch (err) {}

  // Check for external CDN or remote font URLs
  const externalOriginsPattern = /(?:https?:)?\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s"'>]*)?/gi;
  // Ignore harmless xmlns declarations in SVGs or opengraph metadata
  const cleanHtml = indexHtml.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, "").replace(/https?:\/\/ogp\.me/g, "");
  const externalInHtml = (cleanHtml.match(externalOriginsPattern) || []).filter(url => !url.includes("ais-") && !url.includes("google"));
  const externalInCss = stylesCss.match(externalOriginsPattern) || [];

  assert(
    "Zero External Dependencies: App contains 0 external CDN, remote font, or remote library requests",
    externalInHtml.length === 0 && externalInCss.length === 0,
    `HTML external refs: ${externalInHtml.length}, CSS external refs: ${externalInCss.length}`
  );

  // Test G8: Service Worker Registration API availability
  const swSupported = (typeof window !== "undefined" && "serviceWorker" in window.navigator) || (typeof globalThis !== "undefined" && typeof globalThis.navigator !== "undefined");
  assert(
    "Service Worker: navigator.serviceWorker API is available in browser runtime environment",
    swSupported,
    swSupported ? "Supported" : "Not supported in this environment"
  );

  // ==========================================
  // PHASE 7: HARDENING & FINAL AUDIT SUITE
  // ==========================================

  // Test H1: Edge Case - Empty timetable entries array
  const emptyTimetable = {
    ...TIMETABLE,
    entries: []
  };
  const mondayMidday = new Date("2026-09-28T12:00:00");
  const emptyNow = getCurrentEntries(emptyTimetable, mondayMidday);
  const emptyNext = getUpcomingEntries(emptyTimetable, mondayMidday);
  const emptyDayGrid = getDayGrid(emptyTimetable, "MON");
  const emptyClassWeek = getClassWeek(emptyTimetable, "CS-III");
  const emptyLecturerWeek = getLecturerWeek(emptyTimetable, "VM");

  const emptyNowAllFree = emptyNow.every(c => c.isFree && c.entries.length === 0);
  const emptyGridAllCellsEmpty = emptyDayGrid.rows.every(r => r.cells.every(c => c.slot.isBreak || c.entries.length === 0));

  assert(
    "Hardening: Empty timetable data gracefully returns free periods and empty cells without crashing",
    emptyNow.length === 15 && emptyNowAllFree && emptyGridAllCellsEmpty && emptyClassWeek.days.length === 6 && emptyLecturerWeek.days.length === 6,
    `Now classes: ${emptyNow.length}, All free: ${emptyNowAllFree}, Rows: ${emptyDayGrid.rows.length}`
  );

  // Test H2: Edge Case - 2-lecturer and multi-lecturer cell handling
  const multiLecturerData = {
    ...TIMETABLE,
    entries: [
      {
        day: "MON",
        classId: "CS-III",
        startSlot: "P3",
        endSlot: "P3",
        subject: "Team Project",
        type: "lab",
        batch: "B1",
        lecturers: ["VM", "KAR"],
        room: "L1"
      }
    ]
  };
  const multiLecturerEntries = getCurrentEntries(multiLecturerData, new Date("2026-09-28T12:00:00"));
  const cs3Entry = multiLecturerEntries.find(c => c.classId === "CS-III");
  const hasTwoLecturers = cs3Entry && cs3Entry.entries[0] && cs3Entry.entries[0].lecturers.length === 2;

  assert(
    "Hardening: 2-lecturer cell correctly preserves all assigned lecturer initials in entry stack",
    hasTwoLecturers && cs3Entry.entries[0].lecturers.includes("VM") && cs3Entry.entries[0].lecturers.includes("KAR"),
    `Lecturers found: ${JSON.stringify(cs3Entry?.entries[0]?.lecturers)}`
  );

  // Test H3: Edge Case - Missing lecturer name in dictionary falls back safely
  const missingLecturerData = {
    ...TIMETABLE,
    lecturers: {
      "VM": { name: null },
      "KAR": { name: "K. A. Rao" }
    }
  };
  const formatLecturerSafe = (initials, lecturersMap) => {
    return initials.map(l => {
      const info = lecturersMap && lecturersMap[l];
      return info && info.name ? `${info.name} (${l})` : l;
    }).join(", ");
  };
  const formattedWithNull = formatLecturerSafe(["VM", "KAR"], missingLecturerData.lecturers);

  assert(
    "Hardening: Missing or null lecturer name gracefully falls back to initials ('VM, K. A. Rao (KAR)')",
    formattedWithNull === "VM, K. A. Rao (KAR)",
    `Formatted output: "${formattedWithNull}"`
  );

  // Test H4: Long subject name wrapping in styles.css
  const hasSubjectWrap = stylesCss.includes("overflow-wrap: anywhere") || stylesCss.includes("word-break: break-word");
  assert(
    "Hardening: Long subject and cell names include word-break and overflow-wrap to prevent card overflow",
    hasSubjectWrap,
    `Found overflow-wrap/word-break in stylesheet`
  );

  // Test H5: Accessibility - Focus visible styling on interactive elements
  const hasFocusVisible = stylesCss.includes(":focus-visible");
  assert(
    "Accessibility: Interactive elements include visible focus ring (:focus-visible) for keyboard navigation",
    hasFocusVisible,
    `Found :focus-visible rules in styles.css`
  );

  // Test H6: Accessibility - ARIA roles and tab semantics in index.html
  const hasTablist = indexHtml.includes('role="tablist"');
  const hasTabRoles = indexHtml.includes('role="tab"');
  const hasAriaSelected = indexHtml.includes('aria-selected="true"');
  const hasLiveClockRole = indexHtml.includes('role="status"') && indexHtml.includes('aria-live="polite"');

  assert(
    "Accessibility: HTML shell includes WAI-ARIA tablist, tab roles, aria-selected, and polite status live regions",
    hasTablist && hasTabRoles && hasAriaSelected && hasLiveClockRole,
    `tablist: ${hasTablist}, tabs: ${hasTabRoles}, aria-selected: ${hasAriaSelected}, live clock: ${hasLiveClockRole}`
  );

  // -------------------------------------------------------------
  // Group I: Real Data Handoff & Production Readiness (§9 / Phase 8)
  // -------------------------------------------------------------

  // Test I1: Real Data Handoff - Full 15-class, 6-day production dataset validation
  const productionDataFixture = {
    meta: {
      isSample: false,
      term: "2025-26 EVEN SEM",
      version: "2.0.0"
    },
    slots: TIMETABLE.slots,
    days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
    classes: [
      { id: "CE-I", branch: "CE", sem: "I" },
      { id: "CE-III", branch: "CE", sem: "III" },
      { id: "CE-V", branch: "CE", sem: "V" },
      { id: "CS-I", branch: "CS", sem: "I" },
      { id: "CS-III", branch: "CS", sem: "III" },
      { id: "CS-V", branch: "CS", sem: "V" },
      { id: "EC-I", branch: "EC", sem: "I" },
      { id: "EC-III", branch: "EC", sem: "III" },
      { id: "EC-V", branch: "EC", sem: "V" },
      { id: "EE-I", branch: "EE", sem: "I" },
      { id: "EE-III", branch: "EE", sem: "III" },
      { id: "EE-V", branch: "EE", sem: "V" },
      { id: "ME-I", branch: "ME", sem: "I" },
      { id: "ME-III", branch: "ME", sem: "III" },
      { id: "ME-V", branch: "ME", sem: "V" }
    ],
    lecturers: {
      "VM": { name: "V. Mohan" },
      "KAR": { name: "K. A. Ramesh" },
      "SNK": { name: "S. N. Kumar" },
      "BR": { name: "B. R. Raghu" },
      "RBL": { name: "R. B. Lakshmi" }
    },
    entries: [
      { day: "MON", classId: "CE-I", startSlot: "P1", endSlot: "P1", subject: "Maths-I", type: "theory", batch: null, lecturers: ["VM"], room: "C1" },
      { day: "MON", classId: "CS-III", startSlot: "P1", endSlot: "P2", subject: "DS-Lab", type: "lab", batch: "B1", lecturers: ["RBL"], room: "L1" },
      { day: "MON", classId: "CS-III", startSlot: "P1", endSlot: "P2", subject: "OOP-Lab", type: "lab", batch: "B2", lecturers: ["SNK"], room: "L2" },
      { day: "TUE", classId: "EC-V", startSlot: "P3", endSlot: "P4", subject: "VLSI", type: "theory", batch: null, lecturers: ["KAR"], room: "E1" },
      { day: "WED", classId: "EE-III", startSlot: "P5", endSlot: "P6", subject: "Machines", type: "theory", batch: null, lecturers: ["BR"], room: "EE2" },
      { day: "THU", classId: "ME-V", startSlot: "P1", endSlot: "P2", subject: "CAD-CAM", type: "theory", batch: null, lecturers: ["VM"], room: "M1" },
      { day: "FRI", classId: "CS-I", startSlot: "P5", endSlot: "P5", subject: "LIB", type: "other", batch: null, lecturers: [], room: null },
      { day: "SAT", classId: "CE-V", startSlot: "P1", endSlot: "P2", subject: "Testing & Activity", type: "other", batch: null, lecturers: ["VM"], room: "AUD" }
    ]
  };

  const prodValidationIssues = validateTimetable(productionDataFixture);
  const prodErrors = prodValidationIssues.filter(i => i.level === "error");
  assert(
    "Data Handoff (§9): Real timetable dataset with isSample: false validates cleanly with 0 errors",
    prodErrors.length === 0,
    `Validation errors: ${JSON.stringify(prodErrors)}`
  );

  // Test I2: Data Handoff (§9) - isSample: false suppresses sample banner logic
  const isSampleFlag = productionDataFixture.meta.isSample;
  assert(
    "Data Handoff (§9): meta.isSample is strictly false in real timetable handoff to hide sample warning",
    isSampleFlag === false,
    `meta.isSample = ${isSampleFlag}`
  );

  // Test I3: Pure Time Engine on Real Production Data (Zero Code Changes)
  const mondayP1Date = new Date("2026-09-28T10:00:00");
  const realCurrentEntries = getCurrentEntries(productionDataFixture, mondayP1Date);
  const ce1Current = realCurrentEntries.find(c => c.classId === "CE-I");
  const cs3Current = realCurrentEntries.find(c => c.classId === "CS-III");

  assert(
    "Data Handoff (§9): Pure time engine executes seamlessly on real handed-off dataset with zero code changes",
    ce1Current && ce1Current.entries[0]?.subject === "Maths-I" && cs3Current && cs3Current.entries.length === 2,
    `CE-I: ${ce1Current?.entries[0]?.subject}, CS-III batches: ${cs3Current?.entries.length}`
  );

  // Test I4: Real Data Week Grid generation for Class and Lecturer
  const cs3RealWeek = getClassWeek(productionDataFixture, "CS-III");
  const vmRealWeek = getLecturerWeek(productionDataFixture, "VM");
  const cs3Mon = cs3RealWeek.days.find(d => d.day === "MON");
  const cs3MonP1 = cs3Mon?.cells.find(c => c.slot.id === "P1");
  const vmMon = vmRealWeek.days.find(d => d.day === "MON");
  const vmMonP1 = vmMon?.cells.find(c => c.slot.id === "P1");

  assert(
    "Data Handoff (§9): Full matrix week views (class & lecturer) generate accurately on production dataset",
    cs3MonP1?.entries.length === 2 && vmMonP1?.entries.length === 1,
    `CS-III MON P1 slots: ${cs3MonP1?.entries.length}, VM MON P1 slots: ${vmMonP1?.entries.length}`
  );

  // Test I5: Cache Invalidation Strategy - sw.js versioning and lifecycle verification
  const swJsContent = await fetch("./sw.js").then(r => r.text()).catch(() => "");
  const swHasCacheName = swJsContent.includes("const CACHE_NAME =");
  const swCachesDataJs = swJsContent.includes('"./data.js"');
  const swCleansOldCaches = swJsContent.includes("caches.delete");

  assert(
    "PWA Lifecycle (§7 & §9): sw.js pre-caches ./data.js and implements versioned cache deletion on activate",
    swHasCacheName && swCachesDataJs && swCleansOldCaches,
    `CACHE_NAME: ${swHasCacheName}, data.js cached: ${swCachesDataJs}, deletes old: ${swCleansOldCaches}`
  );

  // Test I6: GitHub Pages Portability - Strict relative URLs in index.html
  const hasRelativeManifest = indexHtml.includes('href="./manifest.webmanifest"');
  const hasRelativeCss = indexHtml.includes('href="./styles.css"');
  const hasRelativeAppJs = indexHtml.includes('src="./app.js"');
  const noAbsoluteRootLinks = !indexHtml.includes('href="/styles.css"') && !indexHtml.includes('src="/app.js"');

  assert(
    "Deployment (§3.4 & §7): HTML entrypoint strictly uses relative paths (./) for seamless GitHub Pages hosting",
    hasRelativeManifest && hasRelativeCss && hasRelativeAppJs && noAbsoluteRootLinks,
    `manifest: ${hasRelativeManifest}, css: ${hasRelativeCss}, app.js: ${hasRelativeAppJs}, no root paths: ${noAbsoluteRootLinks}`
  );

  // -------------------------------------------------------------
  // Group J: Stage 2 — Phase 2 Design System & CSS Overhaul
  // -------------------------------------------------------------

  // Test J1: CSS Design Tokens - Branch Accent Tokens in styles.css
  const hasBranchTokens = [
    "--branch-ce",
    "--branch-cs",
    "--branch-ec",
    "--branch-ee",
    "--branch-me"
  ].every(token => stylesCss.includes(token));

  assert(
    "Design System: styles.css specifies branch accent tokens for all 5 academic branches (CE, CS, EC, EE, ME)",
    hasBranchTokens,
    `Branch tokens found in :root: ${hasBranchTokens}`
  );

  // Test J2: Branch Left Border Accent Strips on Class Cards
  const hasBranchCardStrips = [
    "branch-ce",
    "branch-cs",
    "branch-ec",
    "branch-ee",
    "branch-me"
  ].every(cls => stylesCss.includes(cls));

  assert(
    "Design System: Class cards feature 3-4px solid left indicator strips color-coded per branch",
    hasBranchCardStrips,
    `Branch card classes found: ${hasBranchCardStrips}`
  );

  // Test J3: Branch Badge Pills
  const hasBranchPills = stylesCss.includes(".branch-pill") && stylesCss.includes(".branch-pill-cs");
  assert(
    "Design System: styles.css includes high-contrast, rounded branch badge pills (.branch-pill)",
    hasBranchPills,
    `Branch pill classes defined: ${hasBranchPills}`
  );

  // Test J4: Minimum Tap Target Discipline (>= 44px)
  const has44pxButtons = stylesCss.includes("min-height: 44px;");
  assert(
    "Ergonomics: Minimum 44px tap target is strictly enforced across buttons, selects, and inputs",
    has44pxButtons,
    `min-height 44px rules present: ${has44pxButtons}`
  );

  // Test J5: Icon-Augmented Bottom Navigation Bar with WAI-ARIA
  const hasNavIcons = indexHtml.includes("<svg") && indexHtml.includes("nav-tab-icon");
  const hasNavLabels = (indexHtml.includes("Today") && indexHtml.includes("Week") && indexHtml.includes("Explore")) ||
                       (indexHtml.includes("Now") && indexHtml.includes("Next") && indexHtml.includes("Overview"));
  assert(
    "Navigation: Bottom navigation bar includes inline SVG icons and semantic text labels",
    hasNavIcons && hasNavLabels,
    `SVG icons: ${hasNavIcons}, tab labels: ${hasNavLabels}`
  );

  // Test J6: Horizontal Scroll Branch Chips in Filter Bar
  const hasHorizontalChips = stylesCss.includes("overflow-x: auto") && stylesCss.includes(".filter-branch-group");
  assert(
    "Ergonomics: Filter bar uses smooth horizontal scrolling chips (.filter-branch-group) to prevent awkward wrapping",
    hasHorizontalChips,
    `Horizontal chip scrolling defined: ${hasHorizontalChips}`
  );

  // -------------------------------------------------------------
  // Group K: Stage 2 — Phase 3 View-Specific Refinements & Micro-Interactions
  // -------------------------------------------------------------

  // Test K1: Pure Duration Formatting for Multi-Slot Labs
  const dur1 = formatDuration("11:35", "13:25"); // 1h 50m
  const dur2 = formatDuration("14:00", "15:40"); // 1h 40m
  const dur3 = formatDuration("09:45", "10:40"); // 55m
  const dur4 = formatDuration("10:00", "12:00"); // 2h
  const validDurations = (dur1 === "1h 50m") && (dur2 === "1h 40m") && (dur3 === "55m") && (dur4 === "2h");

  assert(
    "Micro-Interactions: formatDuration() calculates hours and minutes correctly for multi-slot spans",
    validDurations,
    `dur1: ${dur1}, dur2: ${dur2}, dur3: ${dur3}, dur4: ${dur4}`
  );

  // Test K2: Time Remaining & Countdown Computations
  const rem1 = getTimeRemaining("12:30", "12:00");
  const rem2 = getTimeRemaining("12:00", "12:00");
  const rem3 = getTimeRemaining("13:25", "11:35");
  const validRemaining = (rem1.diffMins === 30 && rem1.text === "30m left") &&
    (rem2.text === "Ending now") &&
    (rem3.diffMins === 110 && rem3.text === "1h 50m left");

  assert(
    "Micro-Interactions: getTimeRemaining() returns exact countdown minutes and human-readable text",
    validRemaining,
    `rem1: ${rem1.text}, rem2: ${rem2.text}, rem3: ${rem3.text}`
  );

  // Test K3: Relative Upcoming Slot Time Helper
  const relToday = getRelativeSlotTime("14:00", "13:35", false, "MON");
  const relTomorrow = getRelativeSlotTime("09:45", "17:00", true, "TUE");
  const validRelativeTimes = (relToday === "In 25m") && (relTomorrow === "Tomorrow at 09:45");

  assert(
    "Micro-Interactions: getRelativeSlotTime() renders accurate relative countdowns and tomorrow schedule headers",
    validRelativeTimes,
    `relToday: ${relToday}, relTomorrow: ${relTomorrow}`
  );

  // Test K4: Weekly Workload Statistics Aggregator
  const cs3Week = getClassWeek(TIMETABLE, "CS-III");
  const cs3Stats = getWeeklyWorkloadStats(cs3Week);
  const vmWeek = getLecturerWeek(TIMETABLE, "VM");
  const vmStats = getWeeklyWorkloadStats(vmWeek);
  const validStats = (cs3Stats.totalSessions > 0) && (cs3Stats.theoryCount >= 0) && (cs3Stats.labCount >= 0) &&
    (vmStats.totalSessions > 0);

  assert(
    "Micro-Interactions: getWeeklyWorkloadStats() aggregates weekly sessions, theory periods, and lab counts",
    validStats,
    `CS-III: ${cs3Stats.totalSessions} sessions (${cs3Stats.theoryCount} theory, ${cs3Stats.labCount} labs)`
  );

  // Test K5: Time Simulation Presets in Shell UI
  const hasSimPresets = indexHtml.includes("sim-presets-chips") && indexHtml.includes("sim-preset-btn");
  const simPresetCount = (indexHtml.match(/class="sim-preset-btn"/g) || []).length;

  assert(
    "Micro-Interactions: index.html contains instant simulation quick-preset buttons (>= 6 presets)",
    hasSimPresets && simPresetCount >= 6,
    `Preset chips present: ${hasSimPresets}, preset count: ${simPresetCount}`
  );

  // Test K6: Individual Active Filter Dismissal Chips in app.js
  const appJsContent = await fetch("./app.js").then(r => r.text()).catch(() => "");
  const hasFilterDismiss = appJsContent.includes("filter-dismiss-chip") && appJsContent.includes("data-clear");

  assert(
    "Micro-Interactions: app.js supports surgical individual active filter dismissal (Branch / Faculty)",
    hasFilterDismiss,
    `Dismiss chip support in app.js: ${hasFilterDismiss}`
  );

  // Test K7: Search Clear Button & Quick-Jump Department Navigation in ui-now.js
  const uiNowContent = await fetch("./ui-now.js").then(r => r.text()).catch(() => "");
  const hasSearchClear = uiNowContent.includes("search-clear-btn") && uiNowContent.includes("now-search-count");
  const hasBranchJump = uiNowContent.includes("branch-jump-bar") && uiNowContent.includes("branch-jump-chip");

  assert(
    "Micro-Interactions: ui-now.js integrates 1-tap search clear (×), live result counts, and branch quick-jump navigation",
    hasSearchClear && hasBranchJump,
    `searchClear: ${hasSearchClear}, branchJump: ${hasBranchJump}`
  );

  // -------------------------------------------------------------
  // Group L: Stage 2 — Phase 4 Final Polish, Presentation & Production Audit
  // -------------------------------------------------------------

  // Test L1: Print Media Stylesheet Invariants in styles.css
  const hasMediaPrint = stylesCss.includes("@media print");
  const hidesChromeOnPrint = stylesCss.includes(".bottom-nav") && stylesCss.includes("display: none !important;");
  const avoidsRowPageBreak = stylesCss.includes("page-break-inside: avoid !important;");

  assert(
    "Production Polish: styles.css contains @media print rules suppressing app chrome and preventing broken row page breaks",
    hasMediaPrint && hidesChromeOnPrint && avoidsRowPageBreak,
    `hasMediaPrint: ${hasMediaPrint}, hidesChrome: ${hidesChromeOnPrint}, avoidsRowPageBreak: ${avoidsRowPageBreak}`
  );

  // Test L2: Print Schedule Action in ui-overview.js
  const uiOverviewContent = await fetch("./ui-overview.js").then(r => r.text()).catch(() => "");
  const hasPrintButton = uiOverviewContent.includes("btn-print-schedule") && uiOverviewContent.includes("window.print()");

  assert(
    "Production Polish: ui-overview.js provides 1-tap print action buttons calling window.print() for Day and Week grids",
    hasPrintButton,
    `Print button wired: ${hasPrintButton}`
  );

  // Test L3: Metadata & Head OpenGraph Uniformity
  const metadataJson = await fetch("./metadata.json").then(r => r.json()).catch(() => ({}));
  const htmlHasTitle = indexHtml.includes(`<title>${metadataJson.name}</title>`);
  const htmlHasDesc = indexHtml.includes(metadataJson.description);

  assert(
    "Production Polish: index.html title and meta description strictly match metadata.json without placeholders",
    htmlHasTitle && htmlHasDesc,
    `htmlHasTitle: ${htmlHasTitle}, htmlHasDesc: ${htmlHasDesc}`
  );

  // Test L4: Comprehensive Timetable Production Validation
  const prodValidationErrors = validateTimetable(TIMETABLE).filter(e => e.level === "error");

  assert(
    "Production Integrity: Final timetable dataset maintains 0 schema validation errors or referential integrity faults",
    prodValidationErrors.length === 0,
    `Errors found: ${prodValidationErrors.length}`
  );

  // -------------------------------------------------------------
  // Group M: Stage 3 — Phase 2 TODAY Continuous Timeline & Principal UX
  // -------------------------------------------------------------

  // Test M1: Continuous Timeline Generation during Active Period
  const mon12Timeline = getTodayTimeline(TIMETABLE, mon12Date); // MON 12:00 (P3 active)
  const hasNowItem = mon12Timeline.timelineItems.some(i => i.type === "now" && i.slot?.id === "P3");
  const hasCompleteMarker = mon12Timeline.timelineItems.some(i => i.type === "complete");
  const hasBreakItem = mon12Timeline.timelineItems.some(i => i.isBreak && i.slot?.id === "LUNCH");

  assert(
    "TODAY Continuous Timeline: Consolidates NOW, BREAK, LATER periods, and DAY COMPLETE into one sequential feed",
    mon12Timeline.status === "in-period" && hasNowItem && hasBreakItem && hasCompleteMarker,
    `status: ${mon12Timeline.status}, hasNow: ${hasNowItem}, hasBreak: ${hasBreakItem}, hasComplete: ${hasCompleteMarker}`
  );

  // Test M2: Multi-slot Lab Consolidation in Timeline
  const p3Block = mon12Timeline.timelineItems.find(i => i.slot?.id === "P3");
  const cs3LabInP3 = p3Block?.classes.find(c => c.classId === "CS-III");
  const firstLabEntry = cs3LabInP3?.entries[0];
  const isConsolidatedSpan = firstLabEntry?.spanTimeStr === "11:35–13:25" && firstLabEntry?.duration === "1h 50m";

  assert(
    "TODAY Entry Hierarchy: Multi-slot lab entries consolidate to full time span ('11:35–13:25 • 1h 50m') at start slot",
    isConsolidatedSpan,
    `spanTimeStr: ${firstLabEntry?.spanTimeStr}, duration: ${firstLabEntry?.duration}`
  );

  // Test M3: Break / Lunch Time State Representation
  const lunchFixtureDate = createDate("MON", 13, 30, 0); // MON 13:30 (Lunch)
  const lunchTimeline = getTodayTimeline(TIMETABLE, lunchFixtureDate);
  const activeBreakBlock = lunchTimeline.timelineItems.find(i => i.isBreak && i.type === "now");

  assert(
    "TODAY Time States: Lunch break (13:25–14:00) represents active BREAK state with countdown without error",
    lunchTimeline.status === "break" && activeBreakBlock && activeBreakBlock.timeRemaining?.text.includes("left"),
    `status: ${lunchTimeline.status}, countdown: ${activeBreakBlock?.timeRemaining?.text}`
  );

  // Test M4: Before College Time State Representation
  const beforeFixtureDate = createDate("MON", 8, 30, 0); // MON 08:30 (Before college)
  const beforeTimeline = getTodayTimeline(TIMETABLE, beforeFixtureDate);
  const startsAtP1 = beforeTimeline.timelineItems[0]?.slot?.id === "P1";

  assert(
    "TODAY Time States: Before college (08:30) informs that college has not started and shows today's full timeline starting with P1",
    beforeTimeline.status === "before" && beforeTimeline.statusSummary.includes("09:45") && startsAtP1,
    `status: ${beforeTimeline.status}, summary: ${beforeTimeline.statusSummary}, firstSlot: ${beforeTimeline.timelineItems[0]?.slot?.id}`
  );

  // Test M5: After College Time State & Next Working Day Rollover
  const afterFixtureDate = createDate("MON", 17, 0, 0); // MON 17:00 (After last period)
  const afterTimeline = getTodayTimeline(TIMETABLE, afterFixtureDate);

  assert(
    "TODAY Time States: After college (17:00) marks schedule complete and identifies next working day (Tuesday at 09:45)",
    afterTimeline.status === "after" && afterTimeline.nextFullDayName === "Tuesday" && afterTimeline.statusSummary.includes("Tuesday"),
    `status: ${afterTimeline.status}, nextDay: ${afterTimeline.nextFullDayName}, summary: ${afterTimeline.statusSummary}`
  );

  // Test M6: Sunday / Non-working Day State
  const sunDate = createDate("SUN", 11, 0, 0); // Sunday 11:00
  const sunTimeline = getTodayTimeline(TIMETABLE, sunDate);

  assert(
    "TODAY Time States: Sunday displays calm informational closed state and specifies Monday 09:45 resumption",
    sunTimeline.status === "closed" && sunTimeline.isWorkingDay === false && sunTimeline.nextFullDayName === "Monday",
    `status: ${sunTimeline.status}, isWorkingDay: ${sunTimeline.isWorkingDay}, nextDay: ${sunTimeline.nextFullDayName}`
  );

  // Test M7: Composable Filtering on Continuous Timeline (Branch & Faculty)
  const csFilteredTimeline = filterTodayTimeline(mon12Timeline, { branch: "CS", lecturer: "ALL" });
  const p3CsClasses = csFilteredTimeline.timelineItems.find(i => i.slot?.id === "P3")?.classes || [];
  const onlyCsClasses = p3CsClasses.length > 0 && p3CsClasses.every(c => c.branch === "CS");

  const rblFilteredTimeline = filterTodayTimeline(mon12Timeline, { branch: "ALL", lecturer: "RBL" });
  const p3RblClasses = rblFilteredTimeline.timelineItems.find(i => i.slot?.id === "P3")?.classes || [];
  const onlyRblTaught = p3RblClasses.length === 1 && p3RblClasses[0].entries.every(e => e.entry.lecturers.includes("RBL"));

  assert(
    "TODAY Filters: filterTodayTimeline correctly filters continuous feed by Branch ('CS') and Faculty ('RBL')",
    onlyCsClasses && onlyRblTaught,
    `onlyCsClasses: ${onlyCsClasses}, onlyRblTaught: ${onlyRblTaught}`
  );

  // Test M8: Discreet Developer Simulation Panel
  const hasDevToggleBtn = indexHtml.includes("toggle-sim-btn");
  const simPanelCollapsed = indexHtml.includes("sim-panel-collapsible collapsed");
  const hasSimActiveBadge = indexHtml.includes("sim-active-badge");

  assert(
    "Developer Tools: Simulation panel is discreetly collapsible (.collapsed) with dedicated header toggle to prevent UI clutter",
    hasDevToggleBtn && simPanelCollapsed && hasSimActiveBadge,
    `toggleBtn: ${hasDevToggleBtn}, collapsed: ${simPanelCollapsed}, activeBadge: ${hasSimActiveBadge}`
  );

  return results;
}
