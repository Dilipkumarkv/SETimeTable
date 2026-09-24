// Phase 4 & 5: Overview View Renderer with Day Filters
// Displays two matrix modes via segmented control:
// 1. Day Mode: Classes as rows (grouped by branch, sticky first column), slots as columns, for chosen day.
//    - Current slot column is highlighted ONLY when viewing today.
//    - Horizontal scroll container with NO page-level horizontal overflow.
//    - Lab batches stack inside the cell.
//    - Empty / non-scheduled slots display "Free".
//    - Filters: Branch and Lecturer filters wired into Day overview.
// 2. Week Mode: Days as rows, slots as columns, for one selected class OR one selected lecturer.
//    - Entity picker (toggle between Class and Lecturer, plus dropdown).
//    - Flags parallel collision prominently if a lecturer is assigned to multiple batches in the same slot.

import { getDayGrid, getClassWeek, getLecturerWeek, getSlotState, filterDayGrid } from "./time.js";

export function renderOverviewView(container, data, simDate, overviewState, onStateChange, filters = { branch: "ALL", lecturer: "ALL" }) {
  container.innerHTML = "";

  // Segmented control header for Day vs Week
  const modeHeader = document.createElement("div");
  modeHeader.className = "overview-mode-bar";

  const segmentedGroup = document.createElement("div");
  segmentedGroup.className = "segmented-group";

  const dayBtn = document.createElement("button");
  dayBtn.type = "button";
  dayBtn.className = `segmented-btn ${overviewState.mode === "day" ? "active" : ""}`;
  dayBtn.textContent = "Day Overview";
  dayBtn.addEventListener("click", () => {
    if (overviewState.mode !== "day") {
      onStateChange({ ...overviewState, mode: "day" });
    }
  });

  const weekBtn = document.createElement("button");
  weekBtn.type = "button";
  weekBtn.className = `segmented-btn ${overviewState.mode === "week" ? "active" : ""}`;
  weekBtn.textContent = "Week Overview";
  weekBtn.addEventListener("click", () => {
    if (overviewState.mode !== "week") {
      onStateChange({ ...overviewState, mode: "week" });
    }
  });

  segmentedGroup.appendChild(dayBtn);
  segmentedGroup.appendChild(weekBtn);
  modeHeader.appendChild(segmentedGroup);
  container.appendChild(modeHeader);

  if (overviewState.mode === "day") {
    renderDayOverview(container, data, simDate, overviewState, onStateChange, filters);
  } else {
    renderWeekOverview(container, data, simDate, overviewState, onStateChange);
  }
}

/**
 * Day Overview: classes as rows (sticky first column), slots as columns.
 */
function renderDayOverview(container, data, simDate, overviewState, onStateChange, filters = { branch: "ALL", lecturer: "ALL" }) {
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const currentTodayDay = daysOfWeek[simDate.getDay()];
  const selectedDay = overviewState.day || (currentTodayDay === "SUN" ? "MON" : currentTodayDay);

  // Day picker selector bar
  const pickerBar = document.createElement("div");
  pickerBar.className = "overview-picker-bar";

  const dayLabel = document.createElement("label");
  dayLabel.className = "overview-picker-label";
  dayLabel.textContent = "Select Day:";

  const daySelect = document.createElement("select");
  daySelect.className = "overview-select";
  data.days.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d === currentTodayDay ? `${d} (Today)` : d;
    if (d === selectedDay) opt.selected = true;
    daySelect.appendChild(opt);
  });
  daySelect.addEventListener("change", (e) => {
    onStateChange({ ...overviewState, day: e.target.value });
  });

  pickerBar.appendChild(dayLabel);
  pickerBar.appendChild(daySelect);
  container.appendChild(pickerBar);

  // Compute day grid
  const rawDayGrid = (window.TimetableApp && window.TimetableApp.getDayGrid)
    ? window.TimetableApp.getDayGrid(data, selectedDay)
    : getDayGrid(data, selectedDay);

  const dayGrid = filterDayGrid(rawDayGrid, filters);

  // Check if any rows match the filters
  if (!dayGrid.rows || dayGrid.rows.length === 0) {
    const isFiltered = (filters.branch && filters.branch !== "ALL") || (filters.lecturer && filters.lecturer !== "ALL");
    let filterDesc = [];
    if (filters.branch && filters.branch !== "ALL") filterDesc.push(`Branch: ${filters.branch}`);
    if (filters.lecturer && filters.lecturer !== "ALL") {
      const lName = data.lecturers[filters.lecturer]?.name || filters.lecturer;
      filterDesc.push(`Lecturer: ${lName} (${filters.lecturer})`);
    }
    const filterText = filterDesc.join(" • ");

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.style.margin = "16px 0";
    empty.innerHTML = `
      <div class="empty-state-title">Nothing matches</div>
      <p class="text-muted">No scheduled classes match the selected filters (${filterText || "active filters"}) on ${selectedDay}.</p>
      <button type="button" class="btn-secondary" style="margin-top: 12px;" id="overview-clear-filters-btn">Clear Filters</button>
    `;
    const clearBtn = empty.querySelector("#overview-clear-filters-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (window.TimetableApp && window.TimetableApp.resetFilters) {
          window.TimetableApp.resetFilters();
        }
      });
    }
    container.appendChild(empty);
    return;
  }

  // Determine if viewing today and which slot is active
  const isViewingToday = (selectedDay === currentTodayDay);
  const slotState = (window.TimetableApp && window.TimetableApp.getSlotState)
    ? window.TimetableApp.getSlotState(data, simDate)
    : getSlotState(data, simDate);

  const activeSlotId = (isViewingToday && slotState.currentSlot) ? slotState.currentSlot.id : null;

  // Grid wrapper with horizontal scrolling (page itself does NOT scroll horizontally)
  const gridScroll = document.createElement("div");
  gridScroll.className = "matrix-scroll-container";

  const table = document.createElement("table");
  table.className = "matrix-table";

  // Table header: Slot labels & times
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  // Sticky top-left corner
  const cornerTh = document.createElement("th");
  cornerTh.className = "matrix-th-sticky-corner";
  cornerTh.setAttribute("scope", "col");
  cornerTh.textContent = "Class";
  headerRow.appendChild(cornerTh);

  dayGrid.slots.forEach(slot => {
    const th = document.createElement("th");
    th.className = "matrix-th-slot";
    th.setAttribute("scope", "col");
    if (activeSlotId === slot.id) {
      th.classList.add("slot-current-col-header");
    }

    const labelDiv = document.createElement("div");
    labelDiv.className = "slot-th-label";
    labelDiv.textContent = slot.label;
    if (activeSlotId === slot.id) {
      const liveSpan = document.createElement("span");
      liveSpan.className = "slot-live-pill";
      liveSpan.textContent = "LIVE";
      labelDiv.appendChild(liveSpan);
    }
    th.appendChild(labelDiv);

    const timeDiv = document.createElement("div");
    timeDiv.className = "slot-th-time";
    timeDiv.textContent = `${slot.start}–${slot.end}`;
    th.appendChild(timeDiv);

    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table body: Grouped by branch
  const tbody = document.createElement("tbody");
  const branches = ["CE", "CS", "EC", "EE", "ME"];

  branches.forEach(branch => {
    const branchRows = dayGrid.rows.filter(r => r.branch === branch);
    if (branchRows.length === 0) return;

    // Branch group divider row
    const branchDividerRow = document.createElement("tr");
    branchDividerRow.className = "matrix-branch-divider-row";
    const dividerTd = document.createElement("td");
    dividerTd.colSpan = dayGrid.slots.length + 1;
    dividerTd.textContent = `Branch: ${branch}`;
    branchDividerRow.appendChild(dividerTd);
    tbody.appendChild(branchDividerRow);

    branchRows.forEach(row => {
      const tr = document.createElement("tr");

      // Sticky class label column
      const classTd = document.createElement("th");
      classTd.className = "matrix-td-sticky-class";
      classTd.setAttribute("scope", "row");
      const classBadge = document.createElement("span");
      classBadge.className = "class-badge";
      classBadge.textContent = row.classId;
      classTd.appendChild(classBadge);
      tr.appendChild(classTd);

      // Slot cells
      row.cells.forEach(cell => {
        const td = document.createElement("td");
        td.className = "matrix-cell";
        if (cell.slot.isBreak) {
          td.classList.add("matrix-break-cell");
        }
        if (activeSlotId === cell.slot.id) {
          td.classList.add("slot-current-col-cell");
        }

        if (cell.slot.isBreak) {
          td.innerHTML = `<span class="break-cell-text">${cell.slot.label}</span>`;
        } else if (!cell.entries || cell.entries.length === 0) {
          td.innerHTML = `<span class="free-cell-text">Free</span>`;
        } else {
          // Render entries (stack batches if multi-batch lab)
          const cellStack = document.createElement("div");
          cellStack.className = "cell-entry-stack";

          cell.entries.forEach(entry => {
            const entryItem = document.createElement("div");
            entryItem.className = "cell-entry-item";

            const topRow = document.createElement("div");
            topRow.className = "cell-top-row";

            if (entry.batch) {
              const bSpan = document.createElement("span");
              bSpan.className = "batch-badge";
              bSpan.textContent = entry.batch;
              topRow.appendChild(bSpan);
            }

            if (entry.type === "lab") {
              const labSpan = document.createElement("span");
              labSpan.className = "type-tag";
              labSpan.textContent = "LAB";
              topRow.appendChild(labSpan);
            }

            const subSpan = document.createElement("span");
            subSpan.className = "cell-subject";
            subSpan.textContent = entry.subject;
            topRow.appendChild(subSpan);

            entryItem.appendChild(topRow);

            // Lecturer and room line
            const botRow = document.createElement("div");
            botRow.className = "cell-bot-row";
            const lecturersStr = (entry.lecturers && entry.lecturers.length > 0)
              ? entry.lecturers.join(", ")
              : "—";
            botRow.textContent = entry.room ? `${lecturersStr} (${entry.room})` : lecturersStr;
            entryItem.appendChild(botRow);

            cellStack.appendChild(entryItem);
          });

          td.appendChild(cellStack);
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
  gridScroll.appendChild(table);
  container.appendChild(gridScroll);
}

/**
 * Week Overview: days as rows, slots as columns, for one selected class OR lecturer.
 */
function renderWeekOverview(container, data, simDate, overviewState, onStateChange) {
  const weekTargetType = overviewState.weekTargetType || "class"; // "class" or "lecturer"
  const selectedClass = overviewState.selectedClass || (data.classes[0] ? data.classes[0].id : "");
  const lecturerKeys = Object.keys(data.lecturers);
  const selectedLecturer = overviewState.selectedLecturer || (lecturerKeys[0] || "");

  // Entity picker bar
  const pickerBar = document.createElement("div");
  pickerBar.className = "overview-picker-bar";

  // Target toggle: Class vs Lecturer
  const toggleGroup = document.createElement("div");
  toggleGroup.className = "segmented-group";
  toggleGroup.style.marginRight = "10px";

  const classToggle = document.createElement("button");
  classToggle.type = "button";
  classToggle.className = `segmented-btn ${weekTargetType === "class" ? "active" : ""}`;
  classToggle.textContent = "By Class";
  classToggle.addEventListener("click", () => {
    if (weekTargetType !== "class") {
      onStateChange({ ...overviewState, weekTargetType: "class" });
    }
  });

  const lecturerToggle = document.createElement("button");
  lecturerToggle.type = "button";
  lecturerToggle.className = `segmented-btn ${weekTargetType === "lecturer" ? "active" : ""}`;
  lecturerToggle.textContent = "By Lecturer";
  lecturerToggle.addEventListener("click", () => {
    if (weekTargetType !== "lecturer") {
      onStateChange({ ...overviewState, weekTargetType: "lecturer" });
    }
  });

  toggleGroup.appendChild(classToggle);
  toggleGroup.appendChild(lecturerToggle);
  pickerBar.appendChild(toggleGroup);

  // Dropdown for selecting specific class or lecturer
  const entitySelect = document.createElement("select");
  entitySelect.className = "overview-select";

  if (weekTargetType === "class") {
    data.classes.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.id} (${c.branch} Sem ${c.sem})`;
      if (c.id === selectedClass) opt.selected = true;
      entitySelect.appendChild(opt);
    });
    entitySelect.addEventListener("change", (e) => {
      onStateChange({ ...overviewState, selectedClass: e.target.value });
    });
  } else {
    lecturerKeys.forEach(initials => {
      const l = data.lecturers[initials];
      const opt = document.createElement("option");
      opt.value = initials;
      opt.textContent = `${l.name} (${initials}) - ${l.dept}`;
      if (initials === selectedLecturer) opt.selected = true;
      entitySelect.appendChild(opt);
    });
    entitySelect.addEventListener("change", (e) => {
      onStateChange({ ...overviewState, selectedLecturer: e.target.value });
    });
  }

  pickerBar.appendChild(entitySelect);
  container.appendChild(pickerBar);

  // Fetch week matrix data
  let weekData;
  if (weekTargetType === "class") {
    weekData = (window.TimetableApp && window.TimetableApp.getClassWeek)
      ? window.TimetableApp.getClassWeek(data, selectedClass)
      : getClassWeek(data, selectedClass);
  } else {
    weekData = (window.TimetableApp && window.TimetableApp.getLecturerWeek)
      ? window.TimetableApp.getLecturerWeek(data, selectedLecturer)
      : getLecturerWeek(data, selectedLecturer);
  }

  // Active time detection for current slot highlight
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const currentTodayDay = daysOfWeek[simDate.getDay()];
  const slotState = (window.TimetableApp && window.TimetableApp.getSlotState)
    ? window.TimetableApp.getSlotState(data, simDate)
    : getSlotState(data, simDate);

  const activeSlotId = slotState.currentSlot ? slotState.currentSlot.id : null;

  // Grid wrapper with horizontal scrolling
  const gridScroll = document.createElement("div");
  gridScroll.className = "matrix-scroll-container";

  const table = document.createElement("table");
  table.className = "matrix-table";

  // Table header: Slot labels & times
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const cornerTh = document.createElement("th");
  cornerTh.className = "matrix-th-sticky-corner";
  cornerTh.setAttribute("scope", "col");
  cornerTh.textContent = "Day";
  headerRow.appendChild(cornerTh);

  weekData.slots.forEach(slot => {
    const th = document.createElement("th");
    th.className = "matrix-th-slot";
    th.setAttribute("scope", "col");

    const labelDiv = document.createElement("div");
    labelDiv.className = "slot-th-label";
    labelDiv.textContent = slot.label;
    th.appendChild(labelDiv);

    const timeDiv = document.createElement("div");
    timeDiv.className = "slot-th-time";
    timeDiv.textContent = `${slot.start}–${slot.end}`;
    th.appendChild(timeDiv);

    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Table body: Days as rows
  const tbody = document.createElement("tbody");

  weekData.days.forEach(dayRow => {
    const tr = document.createElement("tr");
    const isTodayRow = (dayRow.day === currentTodayDay);

    // Sticky day column
    const dayTd = document.createElement("th");
    dayTd.className = "matrix-td-sticky-class";
    dayTd.setAttribute("scope", "row");
    if (isTodayRow) {
      dayTd.innerHTML = `<strong>${dayRow.day}</strong> <span class="slot-live-pill" style="font-size: 0.65rem;">TODAY</span>`;
    } else {
      dayTd.textContent = dayRow.day;
    }
    tr.appendChild(dayTd);

    // Slot cells
    dayRow.cells.forEach(cell => {
      const td = document.createElement("td");
      td.className = "matrix-cell";

      const isCurrentSlotNow = (isTodayRow && activeSlotId === cell.slot.id);
      if (isCurrentSlotNow) {
        td.classList.add("slot-current-col-cell");
      }
      if (cell.slot.isBreak) {
        td.classList.add("matrix-break-cell");
      }

      // Check collision flag (lecturer week mode)
      if (cell.hasParallelCollision) {
        td.classList.add("cell-collision-flag");
      }

      if (cell.slot.isBreak) {
        td.innerHTML = `<span class="break-cell-text">${cell.slot.label}</span>`;
      } else if (!cell.entries || cell.entries.length === 0) {
        td.innerHTML = `<span class="free-cell-text">Free</span>`;
      } else {
        const cellStack = document.createElement("div");
        cellStack.className = "cell-entry-stack";

        // If collision flag detected, show warning banner inside the cell
        if (cell.hasParallelCollision) {
          const warningBadge = document.createElement("div");
          warningBadge.className = "collision-warning-badge";
          warningBadge.innerHTML = `⚠ PARALLEL COLLISION (${cell.entries.length} BATCHES)`;
          cellStack.appendChild(warningBadge);
        }

        cell.entries.forEach(entry => {
          const entryItem = document.createElement("div");
          entryItem.className = "cell-entry-item";

          const topRow = document.createElement("div");
          topRow.className = "cell-top-row";

          // If in lecturer view, show which class this entry belongs to!
          if (weekTargetType === "lecturer" && entry.classId) {
            const cBadge = document.createElement("span");
            cBadge.className = "class-badge";
            cBadge.style.fontSize = "0.75rem";
            cBadge.style.padding = "1px 5px";
            cBadge.textContent = entry.classId;
            topRow.appendChild(cBadge);
          }

          if (entry.batch) {
            const bSpan = document.createElement("span");
            bSpan.className = "batch-badge";
            bSpan.textContent = entry.batch;
            topRow.appendChild(bSpan);
          }

          if (entry.type === "lab") {
            const labSpan = document.createElement("span");
            labSpan.className = "type-tag";
            labSpan.textContent = "LAB";
            topRow.appendChild(labSpan);
          }

          const subSpan = document.createElement("span");
          subSpan.className = "cell-subject";
          subSpan.textContent = entry.subject;
          topRow.appendChild(subSpan);

          entryItem.appendChild(topRow);

          // Lecturer or room line
          const botRow = document.createElement("div");
          botRow.className = "cell-bot-row";
          if (weekTargetType === "class") {
            const lecturersStr = (entry.lecturers && entry.lecturers.length > 0)
              ? entry.lecturers.join(", ")
              : "—";
            botRow.textContent = entry.room ? `${lecturersStr} (${entry.room})` : lecturersStr;
          } else {
            botRow.textContent = entry.room ? `Room: ${entry.room}` : "Room: —";
          }
          entryItem.appendChild(botRow);

          cellStack.appendChild(entryItem);
        });

        td.appendChild(cellStack);
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  gridScroll.appendChild(table);
  container.appendChild(gridScroll);
}
