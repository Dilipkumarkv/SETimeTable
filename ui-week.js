// Phase 3: WEEK View — Mobile-First Weekly Exploration & Schedule Navigator
// Answers: "What does Wednesday look like?", "What is CS-III doing this week?", "What is Professor X's schedule?"

import {
  getDayFeed,
  getDayGrid,
  getClassWeek,
  getLecturerWeek,
  getWeeklyWorkloadStats,
  formatDuration
} from "./time.js";

/**
 * Format faculty names.
 */
function formatFaculty(initials, lecturersMap) {
  if (!initials || initials.length === 0) return "Self Study / Library";
  return initials.map(init => {
    const info = lecturersMap && lecturersMap[init];
    return info && info.name ? `${info.name} (${init})` : init;
  }).join(", ");
}

/**
 * Format branch name & sem.
 */
function formatClassBadge(branch, sem, classId) {
  const branchMap = {
    CE: "Civil",
    CS: "CSE",
    EC: "ECE",
    EE: "EEE",
    ME: "Mech"
  };
  const bName = branchMap[branch] || branch;
  return `${bName} • Sem ${sem}`;
}

/**
 * Main Week View Renderer.
 */
export function renderWeekView(container, data, currentDate, weekState, onStateChange, filters = { branch: "ALL", lecturer: "ALL" }) {
  if (!container) return;

  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const currentTodayDay = daysOfWeek[currentDate.getDay()];
  const defaultDay = currentTodayDay === "SUN" ? "MON" : currentTodayDay;

  // Normalise state
  const scope = weekState?.scope || "all"; // "all" | "class" | "lecturer"
  const selectedDay = weekState?.day || defaultDay;
  const layout = weekState?.layout || "feed"; // "feed" | "grid"
  const selectedClass = weekState?.selectedClass || "CS-III";
  const selectedLecturer = weekState?.selectedLecturer || Object.keys(data.lecturers)[0] || "VM";

  let html = `
    <div class="week-screen" role="region" aria-label="Weekly Timetable Exploration">
      
      <!-- Top Explorer Toolbar: Scope Selector & Global NOW Action -->
      <div class="week-toolbar">
        <div class="week-scope-group" role="tablist" aria-label="Exploration Scope">
          <button type="button" class="week-scope-btn ${scope === 'all' ? 'active' : ''}" data-scope="all" role="tab" aria-selected="${scope === 'all'}">
            🏛 All Classes
          </button>
          <button type="button" class="week-scope-btn ${scope === 'class' ? 'active' : ''}" data-scope="class" role="tab" aria-selected="${scope === 'class'}">
            🎓 By Class
          </button>
          <button type="button" class="week-scope-btn ${scope === 'lecturer' ? 'active' : ''}" data-scope="lecturer" role="tab" aria-selected="${scope === 'lecturer'}">
            👨‍🏫 By Faculty
          </button>
        </div>

        <div class="week-toolbar-actions">
          <!-- View Switcher (Feed vs Grid) -->
          <div class="week-layout-switcher" role="group" aria-label="Layout view">
            <button type="button" class="layout-toggle-btn ${layout === 'feed' ? 'active' : ''}" data-layout="feed" title="Mobile-first card feed">
              📱 Feed
            </button>
            <button type="button" class="layout-toggle-btn ${layout === 'grid' ? 'active' : ''}" data-layout="grid" title="Full table matrix">
              📊 Grid
            </button>
          </div>

          <button type="button" class="btn-now-shortcut" title="Jump to today's live state">
            ⚡ Live Now
          </button>
        </div>
      </div>
  `;

  // Secondary Entity Picker (When By Class or By Faculty is selected)
  if (scope === "class") {
    html += `
      <div class="week-entity-picker">
        <label class="entity-picker-label" for="week-class-select">Select Class:</label>
        <select id="week-class-select" class="entity-select" aria-label="Select class">
          ${data.classes.map(c => `
            <option value="${c.id}" ${c.id === selectedClass ? 'selected' : ''}>
              ${c.id} (${c.branch} Sem ${c.sem})
            </option>
          `).join("")}
        </select>
        <span class="entity-active-pill">${selectedClass}</span>
      </div>
    `;
  } else if (scope === "lecturer") {
    html += `
      <div class="week-entity-picker">
        <label class="entity-picker-label" for="week-lecturer-select">Select Faculty Member:</label>
        <select id="week-lecturer-select" class="entity-select" aria-label="Select faculty">
          ${Object.keys(data.lecturers).map(init => {
            const l = data.lecturers[init];
            const name = l && l.name ? `${l.name} (${init})` : init;
            return `<option value="${init}" ${init === selectedLecturer ? 'selected' : ''}>${name}</option>`;
          }).join("")}
        </select>
        <span class="entity-active-pill">${data.lecturers[selectedLecturer]?.name || selectedLecturer}</span>
      </div>
    `;
  }

  // Weekday Selector Tabs (MON – SAT)
  html += `
    <nav class="week-day-tabs" aria-label="Weekday selector">
      ${data.days.map(d => {
        const isSelected = d === selectedDay;
        const isToday = d === currentTodayDay;
        return `
          <button type="button" class="week-day-pill ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}" data-day="${d}" aria-pressed="${isSelected}">
            <span class="day-code">${d}</span>
            ${isToday ? '<span class="day-today-tag">Today</span>' : ''}
          </button>
        `;
      }).join("")}
    </nav>
  `;

  // Main Content: Feed or Grid
  if (layout === "feed") {
    html += renderFeedLayout(data, selectedDay, scope, selectedClass, selectedLecturer, filters);
  } else {
    html += renderGridLayout(data, selectedDay, scope, selectedClass, selectedLecturer, currentTodayDay, filters);
  }

  html += `</div>`; // End week-screen

  container.innerHTML = html;

  // Attach Event Handlers
  attachWeekEventListeners(container, weekState, onStateChange);
}

/**
 * Mobile-First Chronological Feed Layout
 */
function renderFeedLayout(data, selectedDay, scope, selectedClass, selectedLecturer, filters) {
  let html = `<div class="week-feed-container" role="feed" aria-label="Feed for ${selectedDay}">`;

  if (scope === "all") {
    // All classes feed for selectedDay
    const dayFeed = getDayFeed(data, selectedDay, filters);

    html += `
      <div class="feed-day-header">
        <h3 class="feed-day-title">Schedule for ${selectedDay}</h3>
        <span class="feed-day-count">${dayFeed.totalEntries} scheduled session${dayFeed.totalEntries === 1 ? '' : 's'}</span>
      </div>
    `;

    if (dayFeed.totalEntries === 0) {
      html += `
        <div class="feed-empty-state">
          <span class="empty-icon">📅</span>
          <h4>No Sessions Scheduled</h4>
          <p>There are no classes scheduled for ${selectedDay} matching the active criteria.</p>
        </div>
      `;
    } else {
      dayFeed.slots.forEach(slotBlock => {
        if (slotBlock.isBreak) {
          html += `
            <div class="feed-break-item">
              <span class="break-tag">☕ BREAK</span>
              <span class="break-time">${slotBlock.label} (${slotBlock.timeSpan} • ${slotBlock.durationStr})</span>
            </div>
          `;
          return;
        }

        if (slotBlock.entries.length === 0) {
          return;
        }

        html += `
          <div class="feed-period-section">
            <div class="feed-period-bar">
              <span class="period-badge">Period ${slotBlock.label}</span>
              <span class="period-time">${slotBlock.timeSpan}</span>
            </div>
            <div class="feed-cards-grid">
        `;

        slotBlock.entries.forEach(item => {
          const entry = item.entry;
          const isLab = entry.type === "lab";
          const branchCode = item.branch.toLowerCase();
          const facultyDisplay = formatFaculty(entry.lecturers, data.lecturers);
          const classBadgeText = formatClassBadge(item.branch, item.sem, item.classId);

          html += `
            <div class="timeline-entry-card branch-${branchCode} ${isLab ? 'card-lab' : 'card-theory'}">
              <div class="card-indicator-strip"></div>
              <div class="card-main-body">
                <div class="entry-subject-row">
                  <h4 class="entry-subject-title">${entry.subject}</h4>
                  <span class="activity-type-tag type-${entry.type}">${isLab ? 'LAB' : 'THEORY'}</span>
                  ${entry.batch ? `<span class="batch-badge">Batch ${entry.batch}</span>` : ''}
                </div>
                <div class="entry-meta-row">
                  <span class="class-hierarchy-pill branch-pill-${branchCode}">
                    ${classBadgeText} (${item.classId})
                  </span>
                  <span class="entry-faculty-text">
                    <svg class="meta-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                    ${facultyDisplay}
                  </span>
                </div>
                <div class="entry-time-footer">
                  <span class="entry-slot-duration">
                    <svg class="meta-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                    ${item.spanTimeStr} ${item.isMultiSlot ? `(${item.duration})` : ''}
                  </span>
                  ${entry.room ? `<span class="room-subtle-tag">${entry.room}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });
    }

  } else if (scope === "class") {
    // Single class feed for selectedDay
    const classWeek = getClassWeek(data, selectedClass);
    const dayRow = classWeek.days.find(d => d.day === selectedDay);
    const activeSlots = dayRow ? dayRow.cells.filter(c => c.entries.length > 0) : [];

    html += `
      <div class="feed-day-header">
        <h3 class="feed-day-title">${selectedClass} • ${selectedDay} Schedule</h3>
        <span class="feed-day-count">${activeSlots.length} session${activeSlots.length === 1 ? '' : 's'}</span>
      </div>
    `;

    if (!dayRow || activeSlots.length === 0) {
      html += `
        <div class="feed-empty-state">
          <span class="empty-icon">🎉</span>
          <h4>No Scheduled Sessions</h4>
          <p>${selectedClass} has no scheduled lectures or labs on ${selectedDay}.</p>
        </div>
      `;
    } else {
      html += `<div class="feed-cards-grid">`;
      dayRow.cells.forEach(cell => {
        if (cell.entries.length === 0) {
          html += `
            <div class="feed-free-slot-card">
              <span class="free-period-badge">Period ${cell.slot.label} (${cell.slot.start}–${cell.slot.end})</span>
              <span class="free-label">Free Period / Self Study</span>
            </div>
          `;
          return;
        }

        cell.entries.forEach(entry => {
          const isLab = entry.type === "lab";
          const facultyDisplay = formatFaculty(entry.lecturers, data.lecturers);

          html += `
            <div class="timeline-entry-card ${isLab ? 'card-lab' : 'card-theory'}">
              <div class="card-indicator-strip"></div>
              <div class="card-main-body">
                <div class="entry-subject-row">
                  <h4 class="entry-subject-title">${entry.subject}</h4>
                  <span class="activity-type-tag type-${entry.type}">${isLab ? 'LAB' : 'THEORY'}</span>
                  ${entry.batch ? `<span class="batch-badge">Batch ${entry.batch}</span>` : ''}
                </div>
                <div class="entry-meta-row">
                  <span class="entry-faculty-text">
                    <svg class="meta-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                    ${facultyDisplay}
                  </span>
                </div>
                <div class="entry-time-footer">
                  <span class="entry-slot-duration">
                    Period ${cell.slot.label} • ${cell.slot.start}–${cell.slot.end}
                  </span>
                  ${entry.room ? `<span class="room-subtle-tag">${entry.room}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        });
      });
      html += `</div>`;
    }

  } else if (scope === "lecturer") {
    // Single lecturer feed for selectedDay
    const lecturerWeek = getLecturerWeek(data, selectedLecturer);
    const stats = getWeeklyWorkloadStats(lecturerWeek);
    const dayRow = lecturerWeek.days.find(d => d.day === selectedDay);
    const activeSlots = dayRow ? dayRow.cells.filter(c => c.entries.length > 0) : [];
    const hasCollisionOnDay = dayRow ? dayRow.cells.some(c => c.hasParallelCollision) : false;

    html += `
      <!-- Workload Statistics Bar -->
      <div class="workload-stats-card">
        <div class="workload-stats-header">
          <strong>Weekly Workload: ${lecturerWeek.lecturerName} (${lecturerWeek.initials})</strong>
        </div>
        <div class="workload-chips-row">
          <span class="workload-chip chip-total">Total: <strong>${stats.totalSessions}</strong> Sessions</span>
          <span class="workload-chip chip-theory">Theory: <strong>${stats.theoryCount}</strong></span>
          <span class="workload-chip chip-lab">Labs: <strong>${stats.labCount}</strong></span>
        </div>
      </div>
    `;

    if (hasCollisionOnDay) {
      html += `
        <div class="collision-alert-card" role="alert">
          <span class="alert-icon">⚠️</span>
          <div>
            <strong>Schedule Collision Warning</strong>
            <p>${lecturerWeek.lecturerName} is assigned to multiple parallel batches at the same time on ${selectedDay}.</p>
          </div>
        </div>
      `;
    }

    html += `
      <div class="feed-day-header">
        <h3 class="feed-day-title">${selectedDay} Teaching Sessions</h3>
        <span class="feed-day-count">${activeSlots.length} teaching period${activeSlots.length === 1 ? '' : 's'}</span>
      </div>
    `;

    if (!dayRow || activeSlots.length === 0) {
      html += `
        <div class="feed-empty-state">
          <span class="empty-icon">☕</span>
          <h4>No Teaching Sessions</h4>
          <p>${lecturerWeek.lecturerName} has no scheduled teaching periods on ${selectedDay}.</p>
        </div>
      `;
    } else {
      html += `<div class="feed-cards-grid">`;
      dayRow.cells.forEach(cell => {
        if (cell.entries.length === 0) return;

        cell.entries.forEach(entry => {
          const isLab = entry.type === "lab";

          html += `
            <div class="timeline-entry-card ${isLab ? 'card-lab' : 'card-theory'} ${cell.hasParallelCollision ? 'card-collision' : ''}">
              <div class="card-indicator-strip"></div>
              <div class="card-main-body">
                <div class="entry-subject-row">
                  <h4 class="entry-subject-title">${entry.subject}</h4>
                  <span class="activity-type-tag type-${entry.type}">${isLab ? 'LAB' : 'THEORY'}</span>
                  ${entry.batch ? `<span class="batch-badge">Batch ${entry.batch}</span>` : ''}
                </div>
                <div class="entry-meta-row">
                  <span class="class-hierarchy-pill">Class: ${entry.classId}</span>
                  ${cell.hasParallelCollision ? `<span class="collision-badge">Collision</span>` : ''}
                </div>
                <div class="entry-time-footer">
                  <span class="entry-slot-duration">
                    Period ${cell.slot.label} • ${cell.slot.start}–${cell.slot.end}
                  </span>
                  ${entry.room ? `<span class="room-subtle-tag">${entry.room}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        });
      });
      html += `</div>`;
    }
  }

  html += `</div>`; // End feed container
  return html;
}

/**
 * Grid Table Layout (Desktop / Tablet / Landscape Print)
 */
function renderGridLayout(data, selectedDay, scope, selectedClass, selectedLecturer, currentTodayDay, filters) {
  let html = `
    <div class="week-grid-container">
      <div class="grid-actions-bar">
        <span class="grid-title">Matrix Table View</span>
        <button type="button" class="btn-print-schedule" title="Print this matrix">
          🖨 Print Matrix
        </button>
      </div>
  `;

  if (scope === "all") {
    const rawGrid = getDayGrid(data, selectedDay);
    const dayGrid = rawGrid; // Filter already applied or displayed
    const periodSlots = data.slots.filter(s => s.kind === "period");

    html += `
      <div class="matrix-scroll-container">
        <table class="matrix-table" aria-label="Day Schedule Grid for ${selectedDay}">
          <thead>
            <tr>
              <th class="matrix-th-sticky-corner">Class</th>
              ${periodSlots.map(s => `<th>${s.label}<br/><small>${s.start}–${s.end}</small></th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${dayGrid.rows.map(row => `
              <tr>
                <td class="matrix-td-sticky-class">
                  <span class="branch-pill branch-pill-${row.branch.toLowerCase()}">${row.branch}</span>
                  <strong>${row.classId}</strong>
                </td>
                ${row.cells.map(cell => `
                  <td class="${cell.entries.length === 0 ? 'matrix-td-free' : ''}">
                    ${cell.entries.length === 0 ? '<span class="cell-free-text">Free</span>' : ''}
                    ${cell.entries.map(e => `
                      <div class="matrix-entry ${e.type === 'lab' ? 'matrix-entry-lab' : 'matrix-entry-theory'}">
                        <strong>${e.subject}</strong>
                        ${e.batch ? `<span class="cell-batch">(${e.batch})</span>` : ''}
                        <div class="cell-lecturer">${e.lecturers ? e.lecturers.join(", ") : ""}</div>
                      </div>
                    `).join("")}
                  </td>
                `).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  } else if (scope === "class") {
    const classWeek = getClassWeek(data, selectedClass);
    const periodSlots = data.slots.filter(s => s.kind === "period");

    html += `
      <div class="matrix-scroll-container">
        <table class="matrix-table" aria-label="Weekly Grid for ${selectedClass}">
          <thead>
            <tr>
              <th class="matrix-th-sticky-corner">Day</th>
              ${periodSlots.map(s => `<th>${s.label}<br/><small>${s.start}–${s.end}</small></th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${classWeek.days.map(dayRow => `
              <tr class="${dayRow.day === currentTodayDay ? 'row-today' : ''}">
                <td class="matrix-td-sticky-class">
                  <strong>${dayRow.day}</strong>
                  ${dayRow.day === currentTodayDay ? '<span class="day-today-tag">Today</span>' : ''}
                </td>
                ${dayRow.cells.map(cell => `
                  <td class="${cell.entries.length === 0 ? 'matrix-td-free' : ''}">
                    ${cell.entries.length === 0 ? '<span class="cell-free-text">Free</span>' : ''}
                    ${cell.entries.map(e => `
                      <div class="matrix-entry ${e.type === 'lab' ? 'matrix-entry-lab' : 'matrix-entry-theory'}">
                        <strong>${e.subject}</strong>
                        ${e.batch ? `<span class="cell-batch">(${e.batch})</span>` : ''}
                        <div class="cell-lecturer">${e.lecturers ? e.lecturers.join(", ") : ""}</div>
                      </div>
                    `).join("")}
                  </td>
                `).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  } else if (scope === "lecturer") {
    const lecturerWeek = getLecturerWeek(data, selectedLecturer);
    const periodSlots = data.slots.filter(s => s.kind === "period");

    html += `
      <div class="matrix-scroll-container">
        <table class="matrix-table" aria-label="Weekly Grid for ${lecturerWeek.lecturerName}">
          <thead>
            <tr>
              <th class="matrix-th-sticky-corner">Day</th>
              ${periodSlots.map(s => `<th>${s.label}<br/><small>${s.start}–${s.end}</small></th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${lecturerWeek.days.map(dayRow => `
              <tr class="${dayRow.day === currentTodayDay ? 'row-today' : ''}">
                <td class="matrix-td-sticky-class">
                  <strong>${dayRow.day}</strong>
                  ${dayRow.day === currentTodayDay ? '<span class="day-today-tag">Today</span>' : ''}
                </td>
                ${dayRow.cells.map(cell => `
                  <td class="${cell.hasParallelCollision ? 'matrix-td-collision' : ''}">
                    ${cell.entries.length === 0 ? '<span class="cell-free-text">—</span>' : ''}
                    ${cell.entries.map(e => `
                      <div class="matrix-entry ${e.type === 'lab' ? 'matrix-entry-lab' : 'matrix-entry-theory'}">
                        <strong>${e.subject}</strong>
                        <span class="cell-class-badge">${e.classId}</span>
                        ${e.batch ? `<span class="cell-batch">(${e.batch})</span>` : ''}
                      </div>
                    `).join("")}
                  </td>
                `).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  html += `</div>`; // End week-grid-container
  return html;
}

/**
 * Event Listeners for Week Screen
 */
function attachWeekEventListeners(container, weekState, onStateChange) {
  // Scope buttons
  const scopeBtns = container.querySelectorAll(".week-scope-btn");
  scopeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const scope = btn.getAttribute("data-scope");
      onStateChange({ ...weekState, scope });
    });
  });

  // Layout buttons (Feed vs Grid)
  const layoutBtns = container.querySelectorAll(".layout-toggle-btn");
  layoutBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const layout = btn.getAttribute("data-layout");
      onStateChange({ ...weekState, layout });
    });
  });

  // Day tabs
  const dayPills = container.querySelectorAll(".week-day-pill");
  dayPills.forEach(pill => {
    pill.addEventListener("click", () => {
      const day = pill.getAttribute("data-day");
      onStateChange({ ...weekState, day });
    });
  });

  // Entity selects
  const classSelect = container.querySelector("#week-class-select");
  if (classSelect) {
    classSelect.addEventListener("change", (e) => {
      onStateChange({ ...weekState, selectedClass: e.target.value });
    });
  }

  const lecSelect = container.querySelector("#week-lecturer-select");
  if (lecSelect) {
    lecSelect.addEventListener("change", (e) => {
      onStateChange({ ...weekState, selectedLecturer: e.target.value });
    });
  }

  // Live Now shortcut button (Global NOW Access)
  const nowBtn = container.querySelector(".btn-now-shortcut");
  if (nowBtn) {
    nowBtn.addEventListener("click", () => {
      const tabToday = document.getElementById("tab-today");
      if (tabToday) tabToday.click();
    });
  }

  // Print button
  const printBtn = container.querySelector(".btn-print-schedule");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}
