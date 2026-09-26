// Phase 2: TODAY View — Principal's Live Timetable Assistant
// Continuous Chronological Timeline: NOW -> NEXT -> BREAK -> LATER TODAY -> DAY COMPLETE

import {
  getTodayTimeline,
  filterTodayTimeline
} from "./time.js";

/**
 * Formats faculty initials into full names where possible.
 */
function formatFaculty(initials, lecturersMap) {
  if (!initials || initials.length === 0) return "Self Study / Library";
  return initials.map(init => {
    const info = lecturersMap && lecturersMap[init];
    return info && info.name && info.name !== init ? `${info.name} (${init})` : init;
  }).join(", ");
}

/**
 * Formats class and semester display e.g. "CS • III Sem"
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
 * Renders the Today continuous timeline view into the container.
 */
export function renderTodayView(container, data, currentDate, filters = { branch: "ALL", lecturer: "ALL" }) {
  if (!container) return;

  const rawTimeline = getTodayTimeline(data, currentDate);
  const timeline = filterTodayTimeline(rawTimeline, filters);

  const {
    status,
    day,
    fullDayName,
    timeStr,
    statusSummary,
    nextFullDayName,
    isWorkingDay,
    timelineItems
  } = timeline;

  const isFiltered = (filters.branch && filters.branch !== "ALL") ||
                     (filters.lecturer && filters.lecturer !== "ALL");

  let html = `
    <div class="today-screen">
      <!-- Concise Header Summary -->
      <section class="today-summary-bar" aria-label="Today Schedule Status">
        <div class="today-summary-left">
          <span class="today-date-text">${fullDayName}, ${day}</span>
          <span class="today-clock-text">${timeStr}</span>
        </div>
        <div class="today-summary-right">
          <span class="today-status-chip status-${status}" role="status">${statusSummary}</span>
        </div>
      </section>
  `;

  // Closed / Sunday state
  if (!isWorkingDay || status === "closed") {
    html += `
      <div class="today-state-card today-closed-card" role="region" aria-label="College Closed">
        <div class="state-icon">🏛️</div>
        <h2 class="state-title">College Closed Today</h2>
        <p class="state-description">${statusSummary}</p>
        <p class="state-subtext">The master timetable operates Monday through Saturday. Classes resume on <strong>${nextFullDayName} at 09:45</strong>.</p>
      </div>
    </div>`;
    container.innerHTML = html;
    return;
  }

  // After college state
  if (status === "after") {
    html += `
      <div class="today-state-card today-concluded-card" role="region" aria-label="Timetable Concluded">
        <div class="state-icon">✅</div>
        <h2 class="state-title">Today's Schedule Complete</h2>
        <p class="state-description">${statusSummary}</p>
        <div class="next-day-preview-box">
          <span class="next-day-pill">Up Next</span>
          <p>Teaching sessions resume tomorrow (<strong>${nextFullDayName}</strong>) starting at <strong>09:45</strong>.</p>
        </div>
      </div>
    </div>`;
    container.innerHTML = html;
    return;
  }

  // Continuous Timeline Stream
  html += `<div class="timeline-stream" role="feed" aria-label="Chronological Today Feed">`;

  // Render each timeline block
  let activeBlockRendered = false;

  timelineItems.forEach((block) => {
    if (block.type === "complete") {
      html += `
        <div class="timeline-block block-complete" role="article" aria-label="Day Complete Marker">
          <div class="timeline-node node-complete"></div>
          <div class="timeline-block-content complete-content">
            <span class="complete-badge">🏁 Day Complete</span>
            <span class="complete-time">${block.timeSpan}</span>
            <p class="complete-note">${block.statusSummary}</p>
          </div>
        </div>
      `;
      return;
    }

    if (block.isBreak) {
      const isNowBreak = block.type === "now";
      html += `
        <div class="timeline-block block-break ${isNowBreak ? 'block-break-active' : ''}" role="article" aria-label="Break Period">
          <div class="timeline-node node-break"></div>
          <div class="timeline-block-content break-content">
            <div class="break-header">
              <span class="break-pill">${isNowBreak ? '☕ BREAK NOW' : '☕ BREAK'}</span>
              <span class="break-time">${block.timeSpan} (${block.durationStr})</span>
              ${block.timeRemaining ? `<span class="countdown-badge badge-now">${block.timeRemaining.text}</span>` : ''}
              ${block.relativeTime && !isNowBreak ? `<span class="countdown-badge badge-relative">${block.relativeTime}</span>` : ''}
            </div>
            <p class="break-title">${block.label}</p>
          </div>
        </div>
      `;
      return;
    }

    // Teaching Period Block
    const isNow = block.type === "now";
    const isNext = block.type === "next";
    const isLater = block.type === "later";

    let blockClass = "block-later";
    let badgeLabel = `Period ${block.label}`;
    let badgeClass = "badge-period";

    if (isNow) {
      blockClass = "block-now";
      badgeLabel = "🔴 NOW ACTIVE";
      badgeClass = "badge-now-pulse";
      activeBlockRendered = true;
    } else if (isNext) {
      blockClass = "block-next";
      badgeLabel = "⏳ UP NEXT";
      badgeClass = "badge-next";
    }

    // Collect all class entries in this block that have active teaching entries
    const activeClasses = block.classes.filter(c => c.entries && c.entries.length > 0);
    const freeClasses = block.classes.filter(c => c.isFree);

    html += `
      <div class="timeline-block ${blockClass}" role="article" aria-label="${badgeLabel}: Period ${block.label} ${block.timeSpan}">
        <div class="timeline-node node-${isNow ? 'now' : isNext ? 'next' : 'later'}"></div>
        <div class="timeline-block-content">
          
          <!-- Period Header -->
          <div class="period-timeline-header">
            <div class="period-title-group">
              <span class="period-phase-badge ${badgeClass}">${badgeLabel}</span>
              <span class="period-code-label">Period ${block.label}</span>
              <span class="period-time-range">${block.timeSpan}</span>
            </div>
            <div class="period-timing-right">
              ${block.timeRemaining ? `<span class="countdown-badge badge-countdown-now">${block.timeRemaining.text}</span>` : ''}
              ${block.relativeTime ? `<span class="countdown-badge badge-relative">${block.relativeTime}</span>` : ''}
            </div>
          </div>

          <!-- Entries List: Strict Hierarchy -->
          <!-- 1. Subject | 2. Branch • Sem • Class | 3. Faculty | 4. Time -->
          <div class="timeline-entries-list">
    `;

    if (activeClasses.length === 0) {
      html += `
        <div class="timeline-free-slot">
          <span class="free-icon">☕</span>
          <span class="free-text">No teaching sessions scheduled for this period ${isFiltered ? '(matching current filter)' : ''}.</span>
        </div>
      `;
    } else {
      activeClasses.forEach(classGroup => {
        classGroup.entries.forEach(entryItem => {
          const entry = entryItem.entry;
          const isLab = entry.type === "lab";
          const isMultiSlot = entry.startSlot !== entry.endSlot;
          const branchCode = classGroup.branch.toLowerCase();
          const facultyDisplay = formatFaculty(entry.lecturers, data.lecturers);
          const classBadgeText = formatClassBadge(classGroup.branch, classGroup.sem, classGroup.classId);

          html += `
            <div class="timeline-entry-card branch-${branchCode} ${isLab ? 'card-lab' : 'card-theory'}" data-class="${classGroup.classId}">
              <div class="card-indicator-strip"></div>
              <div class="card-main-body">
                
                <!-- 1. Subject / Activity -->
                <div class="entry-subject-row">
                  <h4 class="entry-subject-title">${entry.subject}</h4>
                  <span class="activity-type-tag type-${entry.type}">${isLab ? 'LAB' : 'THEORY'}</span>
                  ${entry.batch ? `<span class="batch-badge">Batch ${entry.batch}</span>` : ''}
                </div>

                <!-- 2. Branch • Semester • Class -->
                <div class="entry-meta-row">
                  <span class="class-hierarchy-pill branch-pill-${branchCode}">
                    ${classBadgeText} (${classGroup.classId})
                  </span>
                  <!-- 3. Faculty -->
                  <span class="entry-faculty-text">
                    <svg class="meta-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                    ${facultyDisplay}
                  </span>
                </div>

                <!-- 4. Time & Duration -->
                <div class="entry-time-footer">
                  <span class="entry-slot-duration">
                    <svg class="meta-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
                    ${entryItem.spanTimeStr} ${isMultiSlot ? `(${entryItem.duration})` : ''}
                  </span>
                  ${entry.room ? `<span class="room-subtle-tag" title="Optional room reference">${entry.room}</span>` : ''}
                </div>

              </div>
            </div>
          `;
        });
      });
    }

    html += `
          </div>
        </div>
      </div>
    `;
  });

  html += `
      </div> <!-- End timeline-stream -->
    </div> <!-- End today-screen -->
  `;

  container.innerHTML = html;
}
