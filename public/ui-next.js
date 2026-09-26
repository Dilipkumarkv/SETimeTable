// Stage 2: Next View Renderer with Branch Color Tokens & Consolidated Spans
// Displays a vertically scrolling list of upcoming slots for today (or tomorrow if today has ended).
// Invariants enforced:
// - Chronological ordering of upcoming slots
// - Grouped by slot/time, then by branch
// - Lab spans shown once with full time range (start time of first slot to end time of last slot)
// - If today is over (or Sunday), rolls over to the next working day with a clear "Tomorrow" / "Next Working Day" header
// - Saturday after-hours rolls over directly to Monday morning
// - Filters: Branch and Lecturer applied to upcoming slots

import {
  getUpcomingEntries,
  getSlotState,
  filterUpcomingEntries,
  formatDuration,
  getRelativeSlotTime
} from "./time.js";

export function renderNextView(container, data, simDate, filters = { branch: "ALL", lecturer: "ALL" }) {
  container.innerHTML = "";

  // Query pure schedule engine for upcoming entries
  const rawUpcomingData = (window.TimetableApp && window.TimetableApp.getUpcomingEntries)
    ? window.TimetableApp.getUpcomingEntries(data, simDate)
    : getUpcomingEntries(data, simDate);

  const upcomingData = filterUpcomingEntries(rawUpcomingData, filters);

  const slotState = (window.TimetableApp && window.TimetableApp.getSlotState)
    ? window.TimetableApp.getSlotState(data, simDate)
    : getSlotState(data, simDate);

  // Header banner indicating target day and rollover context
  const headerBanner = document.createElement("div");
  headerBanner.className = "college-status-banner";

  if (upcomingData.isTomorrow) {
    headerBanner.classList.add("status-closed-banner");
    headerBanner.innerHTML = `
      <div class="college-status-title">
        <span class="tomorrow-badge">Tomorrow</span> ${upcomingData.displayDay} Schedule
      </div>
      <div class="college-status-desc">Today's classes have completed (or today is a non-working day). Showing upcoming schedule for ${upcomingData.displayDay}.</div>
    `;
  } else {
    headerBanner.classList.add("status-live-banner");
    const activeSlotLabel = slotState.currentSlot ? `Current: ${slotState.currentSlot.label}` : slotState.status;
    headerBanner.innerHTML = `
      <div class="college-status-title">Upcoming Today: ${upcomingData.displayDay}</div>
      <div class="college-status-desc">Clock at ${slotState.timeStr} (${activeSlotLabel}). Showing chronological remaining periods.</div>
    `;
  }
  container.appendChild(headerBanner);

  // Check if any slots exist with scheduled classes
  const hasClasses = upcomingData.slots && upcomingData.slots.some(s => s.classes && s.classes.length > 0);
  if (!hasClasses) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    const isFiltered = (filters.branch && filters.branch !== "ALL") || (filters.lecturer && filters.lecturer !== "ALL");
    let filterDesc = [];
    if (filters.branch && filters.branch !== "ALL") filterDesc.push(`Branch: ${filters.branch}`);
    if (filters.lecturer && filters.lecturer !== "ALL") {
      const lName = data.lecturers[filters.lecturer]?.name || filters.lecturer;
      filterDesc.push(`Lecturer: ${lName} (${filters.lecturer})`);
    }
    const filterText = filterDesc.join(" • ");

    if (isFiltered) {
      emptyState.innerHTML = `
        <div class="empty-state-title">Nothing matches</div>
        <p class="text-muted">No upcoming classes match the selected filters (${filterText}).</p>
        <button type="button" class="btn-secondary" style="margin-top: 12px;" id="next-clear-filters-btn">Clear Filters</button>
      `;
      const clearBtn = emptyState.querySelector("#next-clear-filters-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          if (window.TimetableApp && window.TimetableApp.resetFilters) {
            window.TimetableApp.resetFilters();
          }
        });
      }
    } else {
      emptyState.innerHTML = `
        <div class="empty-state-title">No Upcoming Classes</div>
        <p class="text-muted">There are no more scheduled classes remaining for ${upcomingData.isTomorrow ? "tomorrow (" + upcomingData.displayDay + ")" : "today"}.</p>
      `;
    }
    container.appendChild(emptyState);
    return;
  }

  // Render each upcoming slot group in chronological order
  const branches = ["CE", "CS", "EC", "EE", "ME"];

  upcomingData.slots.forEach(slotBlock => {
    const slot = slotBlock.slot;
    const classesInSlot = slotBlock.classes;

    if (!classesInSlot || classesInSlot.length === 0) return;

    // Group classes in this slot by branch
    const branchMap = new Map();
    branches.forEach(b => branchMap.set(b, []));

    classesInSlot.forEach(c => {
      if (!branchMap.has(c.branch)) {
        branchMap.set(c.branch, []);
      }
      branchMap.get(c.branch).push(c);
    });

    const slotSection = document.createElement("section");
    slotSection.className = "branch-section";

    // Compute relative time for slot start
    const relTime = getRelativeSlotTime(
      slot.start,
      slotState.timeStr,
      upcomingData.isTomorrow,
      upcomingData.displayDay
    );

    // Slot header
    const slotHeader = document.createElement("div");
    slotHeader.className = "next-slot-header";

    const slotTitleBox = document.createElement("div");
    slotTitleBox.style.display = "flex";
    slotTitleBox.style.alignItems = "center";
    slotTitleBox.style.gap = "8px";

    const slotTitle = document.createElement("h2");
    slotTitle.className = "next-slot-title";
    slotTitle.textContent = `Slot: ${slot.label}`;
    slotTitleBox.appendChild(slotTitle);

    if (relTime) {
      const relBadge = document.createElement("span");
      relBadge.className = "slot-rel-badge";
      relBadge.textContent = relTime;
      slotTitleBox.appendChild(relBadge);
    }
    slotHeader.appendChild(slotTitleBox);

    const slotTimeBadge = document.createElement("span");
    slotTimeBadge.className = "time-tag";
    slotTimeBadge.style.fontWeight = "700";
    slotTimeBadge.textContent = `${slot.start} – ${slot.end}`;
    slotHeader.appendChild(slotTimeBadge);

    slotSection.appendChild(slotHeader);

    // List of cards in this slot
    const cardList = document.createElement("div");
    cardList.className = "class-card-list";

    branches.forEach(branch => {
      const classList = branchMap.get(branch) || [];
      if (classList.length === 0) return;

      const branchDivider = document.createElement("div");
      branchDivider.className = "next-branch-header";
      branchDivider.innerHTML = `<span class="branch-pill branch-pill-${branch.toLowerCase()}">${branch}</span> ${branch} Department`;
      cardList.appendChild(branchDivider);

      classList.forEach(classItem => {
        const card = document.createElement("div");
        card.className = `class-card branch-${classItem.branch.toLowerCase()}`;
        card.setAttribute("data-branch", classItem.branch);

        const cardHeader = document.createElement("div");
        cardHeader.className = "class-card-header";

        const badgeWrapper = document.createElement("div");
        badgeWrapper.className = "class-badge-wrapper";
        badgeWrapper.innerHTML = `
          <span class="branch-pill branch-pill-${classItem.branch.toLowerCase()}">${classItem.branch}</span>
          <span class="class-badge">${classItem.classId}</span>
        `;
        cardHeader.appendChild(badgeWrapper);

        // Compute total span time for the entries if multi-slot
        const firstEntry = classItem.entries[0];
        const spanText = firstEntry
          ? `${firstEntry.spanStartSlot.start} – ${firstEntry.spanEndSlot.end}`
          : `${slot.start} – ${slot.end}`;

        const timeSpanTag = document.createElement("span");
        timeSpanTag.className = "time-tag";
        timeSpanTag.textContent = spanText;
        cardHeader.appendChild(timeSpanTag);

        card.appendChild(cardHeader);

        // Stack batches / entries
        const stack = document.createElement("div");
        stack.className = "batch-stack";

        classItem.entries.forEach(({ entry, spanStartSlot, spanEndSlot }) => {
          const row = document.createElement("div");
          row.className = "batch-row";

          const left = document.createElement("div");
          left.style.display = "flex";
          left.style.alignItems = "center";
          left.style.flexWrap = "wrap";
          left.style.gap = "6px";

          if (entry.batch) {
            const bBadge = document.createElement("span");
            bBadge.className = "batch-badge";
            bBadge.textContent = entry.batch;
            left.appendChild(bBadge);
          }

          if (entry.type === "lab") {
            const labTag = document.createElement("span");
            labTag.className = "type-tag";
            labTag.textContent = "LAB";
            left.appendChild(labTag);
          }

          const sub = document.createElement("span");
          sub.className = "subject-name";
          sub.textContent = entry.subject;
          left.appendChild(sub);

          if (spanStartSlot.id !== spanEndSlot.id) {
            const durationStr = formatDuration(spanStartSlot.start, spanEndSlot.end);
            const spanBadge = document.createElement("span");
            spanBadge.className = "span-tag";
            spanBadge.textContent = durationStr
              ? `[${spanStartSlot.label}–${spanEndSlot.label} · ${durationStr}]`
              : `[${spanStartSlot.label}–${spanEndSlot.label}]`;
            left.appendChild(spanBadge);
          }

          if (entry.room) {
            const room = document.createElement("span");
            room.className = "room-badge";
            room.textContent = entry.room;
            left.appendChild(room);
          }

          row.appendChild(left);

          const right = document.createElement("div");
          right.className = "lecturer-name";
          if (entry.lecturers && entry.lecturers.length > 0) {
            const lecturerDisplay = entry.lecturers.map(l => {
              const info = (data.lecturers && data.lecturers[l]) ? data.lecturers[l] : null;
              return info && info.name ? `${info.name} (${l})` : l;
            }).join(", ");
            right.textContent = lecturerDisplay;
          } else {
            right.textContent = "—";
          }
          row.appendChild(right);

          stack.appendChild(row);
        });

        card.appendChild(stack);
        cardList.appendChild(card);
      });
    });

    slotSection.appendChild(cardList);
    container.appendChild(slotSection);
  });
}
