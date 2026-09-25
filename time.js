// Phase 1: Pure Time & Schedule Engine
// Invariants:
// - All functions are pure, accepting (data, date)
// - No internal calls to new Date() or system clock
// - Half-open intervals: start <= t < end
// - Multi-slot labs appear in every slot they cover
// - 3 batches all appear for their covered slots

// Convert "HH:MM" to minutes since midnight
export function timeStringToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// Convert Date object to day code ("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN")
export function dateToDayCode(date) {
  const dayIndex = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const map = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return map[dayIndex];
}

// Convert Date object to minutes since midnight (00:00:00.000 to 23:59:59.999)
// Uses fractional minutes or integer minutes with seconds consideration:
// Here we use exact seconds: hours * 60 + minutes + seconds / 60
export function dateToFractionalMinutes(date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

/**
 * Returns the state of college schedule at given date.
 * States:
 * - "closed": Sunday or days outside timetable.days
 * - "before": Time before first slot on a working day
 * - "in-period": Inside an active teaching period
 * - "break": Inside lunch or a scheduled break
 * - "after": After the last slot ends on that working day
 * 
 * Returns: {
 *   status: "closed" | "before" | "in-period" | "break" | "after",
 *   day: string,
 *   currentSlot: Slot | null,
 *   nextSlot: Slot | null,
 *   timeStr: string
 * }
 */
export function getSlotState(data, date) {
  const day = dateToDayCode(date);
  const isWorkingDay = data.days.includes(day);

  if (!isWorkingDay) {
    return {
      status: "closed",
      day,
      currentSlot: null,
      nextSlot: null,
      timeStr: formatTimeHHMM(date)
    };
  }

  const currentMinutes = dateToFractionalMinutes(date);
  const slots = data.slots;
  if (!slots || slots.length === 0) {
    return {
      status: "closed",
      day,
      currentSlot: null,
      nextSlot: null,
      timeStr: formatTimeHHMM(date)
    };
  }

  const firstSlotStart = timeStringToMinutes(slots[0].start);
  const lastSlotEnd = timeStringToMinutes(slots[slots.length - 1].end);

  // Before first slot starts: start <= t < end
  if (currentMinutes < firstSlotStart) {
    return {
      status: "before",
      day,
      currentSlot: null,
      nextSlot: slots[0],
      timeStr: formatTimeHHMM(date)
    };
  }

  // After last slot ends
  if (currentMinutes >= lastSlotEnd) {
    return {
      status: "after",
      day,
      currentSlot: null,
      nextSlot: null,
      timeStr: formatTimeHHMM(date)
    };
  }

  // Check each slot: start <= t < end
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const sStart = timeStringToMinutes(slot.start);
    const sEnd = timeStringToMinutes(slot.end);

    if (currentMinutes >= sStart && currentMinutes < sEnd) {
      const nextSlot = i + 1 < slots.length ? slots[i + 1] : null;
      return {
        status: slot.kind === "break" ? "break" : "in-period",
        day,
        currentSlot: slot,
        nextSlot,
        timeStr: formatTimeHHMM(date)
      };
    }

    // Between slots gap (if any exists)
    if (i + 1 < slots.length) {
      const nextStart = timeStringToMinutes(slots[i + 1].start);
      if (currentMinutes >= sEnd && currentMinutes < nextStart) {
        return {
          status: "break",
          day,
          currentSlot: null,
          nextSlot: slots[i + 1],
          timeStr: formatTimeHHMM(date)
        };
      }
    }
  }

  return {
    status: "after",
    day,
    currentSlot: null,
    nextSlot: null,
    timeStr: formatTimeHHMM(date)
  };
}

export function formatTimeHHMM(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Returns a slot index map for fast range queries.
 */
function getSlotIndexMap(slots) {
  const map = new Map();
  slots.forEach((s, idx) => map.set(s.id, idx));
  return map;
}

/**
 * Checks if an entry covers the given slot index.
 */
function entryCoversSlot(entry, slotIdx, slotIndexMap) {
  const startIdx = slotIndexMap.get(entry.startSlot);
  const endIdx = slotIndexMap.get(entry.endSlot);
  if (startIdx === undefined || endIdx === undefined) return false;
  return slotIdx >= startIdx && slotIdx <= endIdx;
}

/**
 * Returns current active entries across all 15 classes at the given date/time.
 * Grouped by classId.
 * For each class, returns:
 * {
 *   classId: string,
 *   branch: string,
 *   sem: string,
 *   isFree: boolean,
 *   entries: TimetableEntry[],
 *   currentSlot: Slot | null,
 *   slotStatus: string
 * }
 */
export function getCurrentEntries(data, date) {
  const slotState = getSlotState(data, date);
  const { status, day, currentSlot } = slotState;

  const slotIndexMap = getSlotIndexMap(data.slots);
  const currentSlotIdx = currentSlot ? slotIndexMap.get(currentSlot.id) : null;

  return data.classes.map(c => {
    let activeEntries = [];

    if (status === "in-period" && currentSlotIdx !== null) {
      activeEntries = data.entries.filter(e => {
        return e.day === day && e.classId === c.id && entryCoversSlot(e, currentSlotIdx, slotIndexMap);
      });
    }

    return {
      classId: c.id,
      branch: c.branch,
      sem: c.sem,
      isFree: status === "in-period" && activeEntries.length === 0,
      entries: activeEntries,
      currentSlot,
      slotStatus: status
    };
  });
}

/**
 * Returns upcoming slots and entries for today (or tomorrow if today has ended).
 * Invariant: Multi-slot lab spans are consolidated to display once with their full time range.
 * Returns: {
 *   displayDay: string,
 *   isTomorrow: boolean,
 *   slots: Array<{
 *     slot: Slot,
 *     classes: Array<{
 *       classId: string,
 *       branch: string,
 *       sem: string,
 *       entries: Array<{
 *         entry: TimetableEntry,
 *         spanStartSlot: Slot,
 *         spanEndSlot: Slot,
 *         isSpanStart: boolean
 *       }>
 *     }>
 *   }>
 * }
 */
export function getUpcomingEntries(data, date) {
  const slotState = getSlotState(data, date);
  const slotIndexMap = getSlotIndexMap(data.slots);

  let targetDay = slotState.day;
  let isTomorrow = false;
  let startingSlotIdx = 0;

  if (slotState.status === "closed" || slotState.status === "after") {
    // Roll over to the next working day
    isTomorrow = true;
    const workingDays = data.days;
    let currentDayIdx = workingDays.indexOf(slotState.day);

    if (currentDayIdx === -1) {
      // e.g. Sunday -> Monday (which is first working day)
      targetDay = workingDays[0];
    } else {
      // Next day in working days (Saturday wraps to Monday)
      const nextDayIdx = (currentDayIdx + 1) % workingDays.length;
      targetDay = workingDays[nextDayIdx];
    }
    startingSlotIdx = 0;
  } else if (slotState.status === "before") {
    targetDay = slotState.day;
    startingSlotIdx = 0;
  } else {
    // Currently "in-period" or "break"
    targetDay = slotState.day;
    const currentSlotIdx = slotState.currentSlot ? slotIndexMap.get(slotState.currentSlot.id) : -1;
    // Next periods start after current period
    startingSlotIdx = currentSlotIdx + 1;
  }

  // Filter slots to only periods (exclude break slots from teaching period list if desired,
  // but keep slot sequence clear)
  const remainingSlots = data.slots
    .map((slot, idx) => ({ slot, idx }))
    .filter(item => item.idx >= startingSlotIdx && item.slot.kind === "period");

  // Track entries already seen so multi-slot spans only appear once at their starting slot
  const seenEntries = new Set();

  const slotResults = remainingSlots.map(({ slot, idx }) => {
    const classResults = data.classes.map(c => {
      // Find entries that start at this slot OR cover this slot
      const coveringEntries = data.entries.filter(e => {
        return e.day === targetDay && e.classId === c.id && entryCoversSlot(e, idx, slotIndexMap);
      });

      // Filter to only entries whose span starts at or after startingSlotIdx,
      // and only include them at their earliest visible slot
      const visibleEntries = [];
      for (const entry of coveringEntries) {
        const startIdx = slotIndexMap.get(entry.startSlot);
        const endIdx = slotIndexMap.get(entry.endSlot);

        // Determine the first slot in remainingSlots where this entry appears
        const effectiveDisplayIdx = Math.max(startIdx, startingSlotIdx);

        if (idx === effectiveDisplayIdx && !seenEntries.has(entry)) {
          seenEntries.add(entry);
          visibleEntries.push({
            entry,
            spanStartSlot: data.slots[startIdx],
            spanEndSlot: data.slots[endIdx],
            isSpanStart: idx === startIdx
          });
        }
      }

      return {
        classId: c.id,
        branch: c.branch,
        sem: c.sem,
        entries: visibleEntries
      };
    }).filter(c => c.entries.length > 0);

    return {
      slot,
      classes: classResults
    };
  });

  return {
    displayDay: targetDay,
    isTomorrow,
    slots: slotResults
  };
}

/**
 * Returns full 2D grid matrix of Day: classes as rows, slots as columns.
 * Format:
 * {
 *   day: string,
 *   slots: Slot[],
 *   rows: Array<{
 *     classId: string,
 *     branch: string,
 *     sem: string,
 *     cells: Array<{
 *       slot: Slot,
 *       entries: TimetableEntry[]
 *     }>
 *   }>
 * }
 */
export function getDayGrid(data, day) {
  const slotIndexMap = getSlotIndexMap(data.slots);

  const rows = data.classes.map(c => {
    const cells = data.slots.map((slot, sIdx) => {
      const entries = data.entries.filter(e => {
        return e.day === day && e.classId === c.id && entryCoversSlot(e, sIdx, slotIndexMap);
      });
      return {
        slot,
        entries
      };
    });

    return {
      classId: c.id,
      branch: c.branch,
      sem: c.sem,
      cells
    };
  });

  return {
    day,
    slots: data.slots,
    rows
  };
}

/**
 * Returns full 2D grid matrix of Week for one selected class: days as rows, slots as columns.
 */
export function getClassWeek(data, classId) {
  const slotIndexMap = getSlotIndexMap(data.slots);

  const days = data.days.map(day => {
    const cells = data.slots.map((slot, sIdx) => {
      const entries = data.entries.filter(e => {
        return e.day === day && e.classId === classId && entryCoversSlot(e, sIdx, slotIndexMap);
      });
      return {
        slot,
        entries
      };
    });

    return {
      day,
      cells
    };
  });

  return {
    classId,
    slots: data.slots,
    days
  };
}

/**
 * Returns full 2D grid matrix of Week for one selected lecturer: days as rows, slots as columns.
 * Also flags parallel collision if lecturer is assigned to multiple batches in the same slot.
 */
export function getLecturerWeek(data, initials) {
  const slotIndexMap = getSlotIndexMap(data.slots);

  const days = data.days.map(day => {
    const cells = data.slots.map((slot, sIdx) => {
      const entries = data.entries.filter(e => {
        return (
          e.day === day &&
          Array.isArray(e.lecturers) &&
          e.lecturers.includes(initials) &&
          entryCoversSlot(e, sIdx, slotIndexMap)
        );
      });

      return {
        slot,
        entries,
        hasParallelCollision: entries.length > 1
      };
    });

    return {
      day,
      cells
    };
  });

  return {
    initials,
    lecturerName: data.lecturers[initials] ? data.lecturers[initials].name : null,
    slots: data.slots,
    days
  };
}

/**
 * Pure filter for current entries (Now view).
 * Combines branch AND lecturer filters:
 * - branch: "ALL" or specific branch (e.g. "CS")
 * - lecturer: "ALL" or lecturer initials (e.g. "RBL")
 */
export function filterCurrentEntries(currentEntries, filters = {}) {
  const branchFilter = filters.branch || "ALL";
  const lecturerFilter = filters.lecturer || "ALL";

  if (branchFilter === "ALL" && lecturerFilter === "ALL") {
    return currentEntries;
  }

  return currentEntries
    .filter(item => {
      // 1. Branch match
      if (branchFilter !== "ALL" && item.branch !== branchFilter) {
        return false;
      }
      // 2. Lecturer match: must have at least one current entry taught by this lecturer
      if (lecturerFilter !== "ALL") {
        const hasLecturer = item.entries && item.entries.some(entry =>
          entry.lecturers && entry.lecturers.includes(lecturerFilter)
        );
        if (!hasLecturer) {
          return false;
        }
      }
      return true;
    })
    .map(item => {
      if (lecturerFilter === "ALL") {
        return item;
      }
      // Keep only entries taught by the selected lecturer
      const matchingEntries = item.entries.filter(entry =>
        entry.lecturers && entry.lecturers.includes(lecturerFilter)
      );
      return {
        ...item,
        entries: matchingEntries,
        isFree: matchingEntries.length === 0
      };
    });
}

/**
 * Pure filter for upcoming entries (Next view).
 * Combines branch AND lecturer filters across upcoming slots.
 */
export function filterUpcomingEntries(upcomingData, filters = {}) {
  const branchFilter = filters.branch || "ALL";
  const lecturerFilter = filters.lecturer || "ALL";

  if (branchFilter === "ALL" && lecturerFilter === "ALL") {
    return upcomingData;
  }

  const filteredSlots = upcomingData.slots
    .map(slotBlock => {
      const matchingClasses = (slotBlock.classes || [])
        .filter(classItem => {
          // 1. Branch match
          if (branchFilter !== "ALL" && classItem.branch !== branchFilter) {
            return false;
          }
          // 2. Lecturer match
          if (lecturerFilter !== "ALL") {
            const hasLecturer = classItem.entries && classItem.entries.some(eObj =>
              eObj.entry && eObj.entry.lecturers && eObj.entry.lecturers.includes(lecturerFilter)
            );
            if (!hasLecturer) {
              return false;
            }
          }
          return true;
        })
        .map(classItem => {
          if (lecturerFilter === "ALL") {
            return classItem;
          }
          // Narrow down entries within class to those taught by lecturer
          const matchingEntries = classItem.entries.filter(eObj =>
            eObj.entry && eObj.entry.lecturers && eObj.entry.lecturers.includes(lecturerFilter)
          );
          return {
            ...classItem,
            entries: matchingEntries
          };
        })
        .filter(classItem => classItem.entries.length > 0);

      return {
        ...slotBlock,
        classes: matchingClasses
      };
    })
    .filter(slotBlock => slotBlock.classes.length > 0);

  return {
    ...upcomingData,
    slots: filteredSlots
  };
}

/**
 * Pure filter for Day grid (Day Overview).
 * Combines branch AND lecturer filters across rows and cells.
 */
export function filterDayGrid(dayGrid, filters = {}) {
  const branchFilter = filters.branch || "ALL";
  const lecturerFilter = filters.lecturer || "ALL";

  if (branchFilter === "ALL" && lecturerFilter === "ALL") {
    return dayGrid;
  }

  const filteredRows = dayGrid.rows
    .filter(row => {
      // 1. Branch match
      if (branchFilter !== "ALL" && row.branch !== branchFilter) {
        return false;
      }
      // 2. Lecturer match: class must have at least one entry taught by lecturer on this day
      if (lecturerFilter !== "ALL") {
        const hasLecturerAnywhere = row.cells.some(cell =>
          cell.entries && cell.entries.some(entry =>
            entry.lecturers && entry.lecturers.includes(lecturerFilter)
          )
        );
        if (!hasLecturerAnywhere) {
          return false;
        }
      }
      return true;
    })
    .map(row => {
      if (lecturerFilter === "ALL") {
        return row;
      }
      // For cells, keep only entries taught by this lecturer
      const newCells = row.cells.map(cell => {
        if (!cell.entries || cell.entries.length === 0) {
          return cell;
        }
        const matchingEntries = cell.entries.filter(entry =>
          entry.lecturers && entry.lecturers.includes(lecturerFilter)
        );
        return {
          ...cell,
          entries: matchingEntries
        };
      });
      return {
        ...row,
        cells: newCells
      };
    });

  return {
    ...dayGrid,
    rows: filteredRows
  };
}

/**
 * Formats a duration in human-readable notation (e.g. "1h 50m", "45m", "2h").
 */
export function formatDuration(startStr, endStr) {
  if (!startStr || !endStr) return "";
  const startMins = timeStringToMinutes(startStr);
  const endMins = timeStringToMinutes(endStr);
  const diff = Math.max(0, endMins - startMins);
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  }
  if (hours > 0 && mins === 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Computes remaining minutes and label between currentTimeStr and endTimeStr.
 */
export function getTimeRemaining(endTimeStr, currentTimeStr) {
  if (!endTimeStr || !currentTimeStr) return { diffMins: 0, text: "" };
  const curMins = timeStringToMinutes(currentTimeStr);
  const endMins = timeStringToMinutes(endTimeStr);
  const diffMins = endMins - curMins;

  if (diffMins <= 0) {
    return { diffMins, text: "Ending now" };
  }
  if (diffMins < 60) {
    return { diffMins, text: `${diffMins}m left` };
  }
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  return { diffMins, text: m > 0 ? `${h}h ${m}m left` : `${h}h left` };
}

/**
 * Computes relative timing badge string for upcoming slots.
 */
export function getRelativeSlotTime(slotStartStr, currentTimeStr, isTomorrow = false, dayName = "") {
  if (isTomorrow) {
    return `Tomorrow at ${slotStartStr}`;
  }
  if (!slotStartStr || !currentTimeStr) return "";
  const curMins = timeStringToMinutes(currentTimeStr);
  const startMins = timeStringToMinutes(slotStartStr);
  const diff = startMins - curMins;

  if (diff <= 0) {
    return "Starts now";
  }
  if (diff < 60) {
    return `In ${diff}m`;
  }
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `In ${h}h ${m}m` : `In ${h}h`;
}

/**
 * Computes weekly workload statistics (total sessions, theory count, lab count).
 */
export function getWeeklyWorkloadStats(weekData) {
  if (!weekData || !weekData.days) {
    return { totalSessions: 0, theoryCount: 0, labCount: 0 };
  }
  let totalSessions = 0;
  let theoryCount = 0;
  let labCount = 0;

  weekData.days.forEach(dayRow => {
    dayRow.cells.forEach(cell => {
      if (cell.entries && cell.entries.length > 0) {
        totalSessions += cell.entries.length;
        cell.entries.forEach(entry => {
          if (entry.type === "lab") {
            labCount++;
          } else {
            theoryCount++;
          }
        });
      }
    });
  });

  return { totalSessions, theoryCount, labCount };
}

/**
 * Returns the continuous chronological timeline for the TODAY screen.
 * Consolidates NOW, NEXT, BREAK, LATER TODAY, and DAY COMPLETE into one feed.
 * Pure function: accepts (data, date).
 */
export function getTodayTimeline(data, date) {
  const slotState = getSlotState(data, date);
  const { status, day, currentSlot, nextSlot, timeStr } = slotState;
  const isWorkingDay = data.days.includes(day);

  // Determine next working day
  const workingDays = data.days;
  let nextWorkingDay = "MON";
  const currentDayIdx = workingDays.indexOf(day);
  if (currentDayIdx === -1) {
    nextWorkingDay = workingDays[0];
  } else {
    nextWorkingDay = workingDays[(currentDayIdx + 1) % workingDays.length];
  }

  // Format human-readable date e.g. "Monday, 24 Sep"
  const weekdayNames = {
    SUN: "Sunday",
    MON: "Monday",
    TUE: "Tuesday",
    WED: "Wednesday",
    THU: "Thursday",
    FRI: "Friday",
    SAT: "Saturday"
  };
  const fullDayName = weekdayNames[day] || day;
  const nextFullDayName = weekdayNames[nextWorkingDay] || nextWorkingDay;

  const firstSlot = data.slots && data.slots.length > 0 ? data.slots[0] : null;
  const lastSlot = data.slots && data.slots.length > 0 ? data.slots[data.slots.length - 1] : null;

  // Build status summary text
  let statusSummary = "";
  if (!isWorkingDay) {
    statusSummary = `College is closed today (${fullDayName}). Classes resume on ${nextFullDayName} at ${firstSlot ? firstSlot.start : "09:45"}.`;
  } else if (status === "before") {
    statusSummary = `College has not started yet. First period begins at ${firstSlot ? firstSlot.start : "09:45"}.`;
  } else if (status === "after") {
    statusSummary = `Today's schedule is complete. Classes resume on ${nextFullDayName} at ${firstSlot ? firstSlot.start : "09:45"}.`;
  } else if (status === "break") {
    const breakSlot = currentSlot || nextSlot;
    const rem = breakSlot ? getTimeRemaining(breakSlot.end, timeStr) : null;
    statusSummary = `${breakSlot?.label || "Break"} active (${breakSlot?.start}–${breakSlot?.end}${rem ? " • " + rem.text : ""}).`;
  } else if (status === "in-period") {
    const rem = currentSlot ? getTimeRemaining(currentSlot.end, timeStr) : null;
    statusSummary = `Period ${currentSlot.label} active (${currentSlot.start}–${currentSlot.end}${rem ? " • " + rem.text : ""}).`;
  }

  if (!isWorkingDay || status === "closed") {
    return {
      status: "closed",
      day,
      fullDayName,
      timeStr,
      statusSummary,
      currentSlot: null,
      nextSlot: null,
      nextWorkingDay,
      nextFullDayName,
      isWorkingDay: false,
      nowSection: null,
      timelineItems: []
    };
  }

  if (status === "after") {
    return {
      status: "after",
      day,
      fullDayName,
      timeStr,
      statusSummary,
      currentSlot: null,
      nextSlot: null,
      nextWorkingDay,
      nextFullDayName,
      isWorkingDay: true,
      nowSection: null,
      timelineItems: [
        {
          id: "item-complete",
          type: "complete",
          label: "Day Schedule Concluded",
          timeSpan: `${lastSlot ? lastSlot.end : "16:30"}`,
          statusSummary: `College concluded at ${lastSlot ? lastSlot.end : "16:30"}. Next working day: ${nextFullDayName} at ${firstSlot ? firstSlot.start : "09:45"}.`,
          classes: []
        }
      ]
    };
  }

  const slotIndexMap = getSlotIndexMap(data.slots);
  const curMinutes = timeStringToMinutes(timeStr);
  const currentSlotIdx = currentSlot ? slotIndexMap.get(currentSlot.id) : -1;

  // Track multi-slot entries already rendered so they are consolidated to their start slot
  const seenEntries = new Set();
  const timelineItems = [];

  // Iterate through slots to construct the continuous chronological feed
  for (let idx = 0; idx < data.slots.length; idx++) {
    const slot = data.slots[idx];
    const sStart = timeStringToMinutes(slot.start);
    const sEnd = timeStringToMinutes(slot.end);

    // If slot has completely ended in the past, we skip it from the forward feed
    if (sEnd <= curMinutes && idx !== currentSlotIdx) {
      continue;
    }

    const isCurrent = idx === currentSlotIdx;
    const isImmediateNext = (status === "in-period" && idx === currentSlotIdx + 1) ||
                            (status === "break" && idx === (nextSlot ? slotIndexMap.get(nextSlot.id) : currentSlotIdx + 1)) ||
                            (status === "before" && idx === 0);

    let itemType = "later";
    if (isCurrent) {
      itemType = slot.kind === "break" ? "break" : "now";
    } else if (isImmediateNext) {
      itemType = "next";
    } else if (slot.kind === "break") {
      itemType = "break";
    }

    if (slot.kind === "break") {
      const isNowBreak = isCurrent;
      const breakRemaining = isNowBreak ? getTimeRemaining(slot.end, timeStr) : null;
      timelineItems.push({
        id: `slot-${slot.id}`,
        type: isNowBreak ? "now" : "break",
        isBreak: true,
        slot,
        label: slot.label,
        timeSpan: `${slot.start}–${slot.end}`,
        durationStr: formatDuration(slot.start, slot.end),
        timeRemaining: breakRemaining,
        relativeTime: !isNowBreak ? getRelativeSlotTime(slot.start, timeStr, false, day) : "",
        classes: []
      });
      continue;
    }

    // Teaching period: Gather classes scheduled in this slot
    const classResults = data.classes.map(c => {
      const coveringEntries = data.entries.filter(e => {
        return e.day === day && e.classId === c.id && entryCoversSlot(e, idx, slotIndexMap);
      });

      const visibleEntries = [];
      for (const entry of coveringEntries) {
        const startIdx = slotIndexMap.get(entry.startSlot);
        const endIdx = slotIndexMap.get(entry.endSlot);

        // Effective display slot for this entry:
        // If the entry started in a previous slot that is still active now, display it under 'now'
        const effectiveDisplayIdx = Math.max(startIdx, Math.max(0, currentSlotIdx));

        if (idx === effectiveDisplayIdx && !seenEntries.has(entry)) {
          seenEntries.add(entry);
          const spanStart = data.slots[startIdx];
          const spanEnd = data.slots[endIdx];
          visibleEntries.push({
            entry,
            spanStartSlot: spanStart,
            spanEndSlot: spanEnd,
            spanTimeStr: `${spanStart.start}–${spanEnd.end}`,
            duration: formatDuration(spanStart.start, spanEnd.end),
            isSpanStart: idx === startIdx
          });
        }
      }

      return {
        classId: c.id,
        branch: c.branch,
        sem: c.sem,
        isFree: visibleEntries.length === 0,
        entries: visibleEntries
      };
    });

    // Compute time countdown
    let timeRemaining = null;
    let relativeTime = "";
    if (itemType === "now") {
      timeRemaining = getTimeRemaining(slot.end, timeStr);
    } else {
      relativeTime = getRelativeSlotTime(slot.start, timeStr, false, day);
    }

    timelineItems.push({
      id: `slot-${slot.id}`,
      type: itemType,
      isBreak: false,
      slot,
      label: slot.label,
      timeSpan: `${slot.start}–${slot.end}`,
      durationStr: formatDuration(slot.start, slot.end),
      timeRemaining,
      relativeTime,
      classes: classResults
    });
  }

  // Append Day Complete marker at the end of the timeline
  timelineItems.push({
    id: "item-complete",
    type: "complete",
    isBreak: false,
    slot: null,
    label: "Day Complete",
    timeSpan: lastSlot ? lastSlot.end : "16:30",
    statusSummary: `College concludes at ${lastSlot ? lastSlot.end : "16:30"}. Next working day: ${nextFullDayName} at ${firstSlot ? firstSlot.start : "09:45"}.`,
    classes: []
  });

  return {
    status,
    day,
    fullDayName,
    timeStr,
    statusSummary,
    currentSlot,
    nextSlot,
    nextWorkingDay,
    nextFullDayName,
    isWorkingDay: true,
    nowSection: timelineItems.find(item => item.type === "now") || null,
    timelineItems
  };
}

/**
 * Filters the continuous timeline by branch and lecturer.
 * Returns a cloned timeline with filtered classes.
 */
export function filterTodayTimeline(timeline, filters) {
  if (!timeline || !timeline.timelineItems) return timeline;
  const branchFilter = filters?.branch || "ALL";
  const lecturerFilter = filters?.lecturer || "ALL";

  if (branchFilter === "ALL" && lecturerFilter === "ALL") {
    return timeline;
  }

  const filteredItems = timeline.timelineItems.map(item => {
    if (item.type === "complete" || item.isBreak) {
      return item;
    }

    const filteredClasses = item.classes.map(cls => {
      // Check branch
      if (branchFilter !== "ALL" && cls.branch !== branchFilter) {
        return null;
      }

      // Check lecturer across visible entries
      if (lecturerFilter === "ALL") {
        return cls;
      }

      const matchingEntries = cls.entries.filter(e => {
        return e.entry.lecturers && e.entry.lecturers.includes(lecturerFilter);
      });

      if (matchingEntries.length === 0) {
        return null;
      }

      return {
        ...cls,
        entries: matchingEntries,
        isFree: false
      };
    }).filter(Boolean);

    return {
      ...item,
      classes: filteredClasses
    };
  });

  return {
    ...timeline,
    timelineItems: filteredItems
  };
}
