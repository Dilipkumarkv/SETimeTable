// Phase 1: Timetable Data Validator
// Returns an array of diagnostic items: { level: 'error' | 'warn', message: string, entryIndex?: number }
// Rules:
// 1. Every day, classId, startSlot, endSlot, lecturer initial exists in the lists.
// 2. startSlot <= endSlot in slot order.
// 3. Entry must NOT span the LUNCH break (or any break).
// 4. Two entries for the same class overlapping in time are allowed ONLY if both are type: "lab" with different non-null batch values.
// 5. batch non-null => type is "lab".
// 6. No duplicate class ids, slot ids, or day ids.

export function validateTimetable(data) {
  const issues = [];

  if (!data || typeof data !== "object") {
    issues.push({ level: "error", message: "Timetable data is empty or invalid" });
    return issues;
  }

  // 1. Validate meta
  if (!data.meta || typeof data.meta.isSample !== "boolean" || typeof data.meta.version !== "string") {
    issues.push({ level: "error", message: "Missing or invalid meta object (must have isSample and version)" });
  }

  // 2. Validate days
  if (!Array.isArray(data.days) || data.days.length === 0) {
    issues.push({ level: "error", message: "Days must be a non-empty array" });
  } else {
    const seenDays = new Set();
    data.days.forEach(d => {
      if (seenDays.has(d)) {
        issues.push({ level: "error", message: `Duplicate day ID found: "${d}"` });
      }
      seenDays.add(d);
    });
  }

  // 3. Validate slots
  if (!Array.isArray(data.slots) || data.slots.length === 0) {
    issues.push({ level: "error", message: "Slots must be a non-empty array" });
  } else {
    const seenSlots = new Set();
    data.slots.forEach((s, idx) => {
      if (!s.id || !s.start || !s.end || !s.kind) {
        issues.push({ level: "error", message: `Slot at index ${idx} missing required fields (id, start, end, kind)` });
      }
      if (seenSlots.has(s.id)) {
        issues.push({ level: "error", message: `Duplicate slot ID found: "${s.id}"` });
      }
      seenSlots.add(s.id);
    });
  }

  // 4. Validate classes
  if (!Array.isArray(data.classes) || data.classes.length === 0) {
    issues.push({ level: "error", message: "Classes must be a non-empty array" });
  } else {
    const seenClasses = new Set();
    data.classes.forEach(c => {
      if (!c.id || !c.branch || !c.sem) {
        issues.push({ level: "error", message: `Class ${c.id || "unknown"} missing required fields (id, branch, sem)` });
      }
      if (seenClasses.has(c.id)) {
        issues.push({ level: "error", message: `Duplicate class ID found: "${c.id}"` });
      }
      seenClasses.add(c.id);
    });
  }

  // 5. Validate lecturers
  if (!data.lecturers || typeof data.lecturers !== "object") {
    issues.push({ level: "error", message: "Lecturers must be a valid object map" });
  }

  // Quick lookup indices
  const validDays = new Set(data.days || []);
  const validClasses = new Set((data.classes || []).map(c => c.id));
  const slotOrderMap = new Map();
  const breakSlotIndices = new Set();
  (data.slots || []).forEach((s, idx) => {
    slotOrderMap.set(s.id, idx);
    if (s.kind === "break") {
      breakSlotIndices.add(idx);
    }
  });
  const validLecturers = new Set(Object.keys(data.lecturers || {}));

  // 6. Validate entries
  if (!Array.isArray(data.entries)) {
    issues.push({ level: "error", message: "Entries must be an array" });
    return issues;
  }

  // Map to track class-time occupancy: day -> classId -> slotIdx -> list of entries
  const classOccupancy = new Map();

  data.entries.forEach((entry, entryIndex) => {
    let hasError = false;

    // Check day exists
    if (!validDays.has(entry.day)) {
      issues.push({ level: "error", message: `Entry has invalid day: "${entry.day}"`, entryIndex });
      hasError = true;
    }

    // Check class exists
    if (!validClasses.has(entry.classId)) {
      issues.push({ level: "error", message: `Entry has invalid classId: "${entry.classId}"`, entryIndex });
      hasError = true;
    }

    // Check startSlot & endSlot exist
    const startIdx = slotOrderMap.get(entry.startSlot);
    const endIdx = slotOrderMap.get(entry.endSlot);

    if (startIdx === undefined) {
      issues.push({ level: "error", message: `Entry has invalid startSlot: "${entry.startSlot}"`, entryIndex });
      hasError = true;
    }
    if (endIdx === undefined) {
      issues.push({ level: "error", message: `Entry has invalid endSlot: "${entry.endSlot}"`, entryIndex });
      hasError = true;
    }

    // Slot ordering
    if (startIdx !== undefined && endIdx !== undefined) {
      if (startIdx > endIdx) {
        issues.push({
          level: "error",
          message: `startSlot "${entry.startSlot}" (index ${startIdx}) is after endSlot "${entry.endSlot}" (index ${endIdx})`,
          entryIndex
        });
        hasError = true;
      }

      // Check if entry spans or touches break
      for (let sIdx = startIdx; sIdx <= endIdx; sIdx++) {
        if (breakSlotIndices.has(sIdx)) {
          const breakSlot = data.slots[sIdx];
          issues.push({
            level: "error",
            message: `Entry spans or coincides with break slot "${breakSlot ? breakSlot.id : sIdx}"`,
            entryIndex
          });
          hasError = true;
        }
      }
    }

    // Check batch non-null => type is "lab"
    if (entry.batch !== null && entry.batch !== undefined) {
      if (entry.type !== "lab") {
        issues.push({
          level: "error",
          message: `Entry with batch "${entry.batch}" must have type "lab", got "${entry.type}"`,
          entryIndex
        });
        hasError = true;
      }
    }

    // Check lecturers exist in lecturers map
    if (Array.isArray(entry.lecturers)) {
      entry.lecturers.forEach(initial => {
        if (!validLecturers.has(initial)) {
          issues.push({
            level: "error",
            message: `Entry references unknown lecturer initial "${initial}"`,
            entryIndex
          });
          hasError = true;
        }
      });
    } else {
      issues.push({ level: "error", message: `Entry lecturers must be an array`, entryIndex });
      hasError = true;
    }

    // Overlap checking if day, class, and slot range are valid
    if (!hasError && startIdx !== undefined && endIdx !== undefined) {
      const dayKey = entry.day;
      if (!classOccupancy.has(dayKey)) {
        classOccupancy.set(dayKey, new Map());
      }
      const dayMap = classOccupancy.get(dayKey);

      if (!dayMap.has(entry.classId)) {
        dayMap.set(entry.classId, new Map());
      }
      const classMap = dayMap.get(entry.classId);

      for (let sIdx = startIdx; sIdx <= endIdx; sIdx++) {
        if (!classMap.has(sIdx)) {
          classMap.set(sIdx, []);
        }
        const existingEntries = classMap.get(sIdx);

        for (const existing of existingEntries) {
          // Rule: two entries for the same class overlapping in time are allowed ONLY if both are type: "lab" with different non-null batch values
          const bothLab = entry.type === "lab" && existing.entry.type === "lab";
          const distinctNonNullBatches =
            entry.batch !== null &&
            entry.batch !== undefined &&
            existing.entry.batch !== null &&
            existing.entry.batch !== undefined &&
            entry.batch !== existing.entry.batch;

          if (!bothLab || !distinctNonNullBatches) {
            issues.push({
              level: "error",
              message: `Illegal schedule collision for class "${entry.classId}" on "${entry.day}" at slot index ${sIdx} between entries #${existing.entryIndex} and #${entryIndex}`,
              entryIndex
            });
          }
        }

        existingEntries.push({ entry, entryIndex });
      }
    }
  });

  return issues;
}
