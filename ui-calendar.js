// Phase 4: Academic Calendar View Component for SET Polytechnic Timetable
// Clean, streamlined hierarchy with strict boundary clamping:
// - Boundary: January 2026 – December 2026 (2026 Academic Session)
// - Prev button disabled at January 2026
// - Next button disabled at December 2026
// - Clamped navigation guarantees zero boundary overflow or unconfigured crashes
// - Theme-elevated aesthetic matching SET Polytechnic's parchment & terracotta style
// - Formal institutional page boundary limit footer terminating the layout cleanly

import {
  isConfiguredYear,
  getEventsForDate,
  getEventsForMonth,
  getUpcomingEvents,
  getDaysInMonth,
  getFirstDayOfWeek,
  formatCalendarDate,
  isHolidayDate
} from "./calendar.js";

export const CALENDAR_MIN_YEAR = 2026;
export const CALENDAR_MIN_MONTH = 1; // January 2026
export const CALENDAR_MAX_YEAR = 2026;
export const CALENDAR_MAX_MONTH = 12; // December 2026

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Returns icon and badge styling for a given event type.
 */
function getEventTypeBadge(type) {
  switch (type) {
    case "holiday":
      return { label: "Holiday", icon: "🌴", badgeClass: "badge-type-holiday" };
    case "exam":
      return { label: "Exam / CIE", icon: "📝", badgeClass: "badge-type-exam" };
    case "academic":
      return { label: "Academic", icon: "📚", badgeClass: "badge-type-academic" };
    case "deadline":
      return { label: "Deadline", icon: "⏳", badgeClass: "badge-type-deadline" };
    case "meeting":
      return { label: "Meeting", icon: "👥", badgeClass: "badge-type-meeting" };
    case "event":
      return { label: "College Event", icon: "🎉", badgeClass: "badge-type-event" };
    case "semester":
      return { label: "Semester Cycle", icon: "🏫", badgeClass: "badge-type-semester" };
    default:
      return { label: "Institutional", icon: "📌", badgeClass: "badge-type-other" };
  }
}

/**
 * Formats date to YYYY-MM-DD.
 */
function toDateStr(year, month, day) {
  const y = String(year);
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Clamps year and month to the supported academic calendar boundary range.
 */
export function clampCalendarBounds(year, month) {
  let y = parseInt(year, 10);
  let m = parseInt(month, 10);

  if (isNaN(y)) y = 2026;
  if (isNaN(m)) m = 10;

  if (y < CALENDAR_MIN_YEAR || (y === CALENDAR_MIN_YEAR && m < CALENDAR_MIN_MONTH)) {
    return { year: CALENDAR_MIN_YEAR, month: CALENDAR_MIN_MONTH };
  }
  if (y > CALENDAR_MAX_YEAR || (y === CALENDAR_MAX_YEAR && m > CALENDAR_MAX_MONTH)) {
    return { year: CALENDAR_MAX_YEAR, month: CALENDAR_MAX_MONTH };
  }
  return { year: y, month: m };
}

/**
 * Renders the clean, boundary-enforced Academic Calendar view into the container.
 * 
 * @param {HTMLElement} container 
 * @param {Date} effectiveDate Current effective date from time.js simulation
 * @param {Object} calendarState { year, month, selectedDate }
 * @param {Function} onStateChange Callback when user changes month/year/date
 */
export function renderCalendarView(container, effectiveDate, calendarState = {}, onStateChange) {
  if (!container) return;

  const currentYear = effectiveDate ? effectiveDate.getFullYear() : 2026;
  const currentMonth = effectiveDate ? (effectiveDate.getMonth() + 1) : 10;
  const todayDateStr = effectiveDate 
    ? toDateStr(effectiveDate.getFullYear(), effectiveDate.getMonth() + 1, effectiveDate.getDate())
    : "2026-10-14";

  // Clamp requested year and month strictly within session boundaries
  const clamped = clampCalendarBounds(
    calendarState.year || currentYear,
    calendarState.month || currentMonth
  );
  const viewYear = clamped.year;
  const viewMonth = clamped.month;
  const selectedDateStr = calendarState.selectedDate || todayDateStr;

  // Boundary checks for navigation buttons
  const isAtMinBoundary = (viewYear === CALENDAR_MIN_YEAR && viewMonth === CALENDAR_MIN_MONTH);
  const isAtMaxBoundary = (viewYear === CALENDAR_MAX_YEAR && viewMonth === CALENDAR_MAX_MONTH);

  // Check if requested year is configured
  const yearConfigured = isConfiguredYear(viewYear);

  let html = `<div class="calendar-screen">`;

  // If year is not configured, show polite notice
  if (!yearConfigured) {
    html += `
      <div class="calendar-unconfigured-card" role="region" aria-label="Calendar Not Configured">
        <div class="unconfigured-icon">📅</div>
        <h3>Academic calendar data for ${viewYear} has not been configured yet.</h3>
        <p>Institutional calendar events and Karnataka State Government holidays are currently configured for academic year 2026.</p>
        <button type="button" class="btn-reset-cal-year" data-target-year="2026">Switch to 2026 Calendar</button>
      </div>
    </div>`;
    container.innerHTML = html;
    attachListeners(container, viewYear, viewMonth, selectedDateStr, onStateChange);
    return;
  }

  // Calculate Month Grid Days
  const daysInCurrentMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOfWeek(viewYear, viewMonth); // 0 = Mon, 6 = Sun
  const prevMonthDays = viewMonth === 1 ? getDaysInMonth(viewYear - 1, 12) : getDaysInMonth(viewYear, viewMonth - 1);

  // Month event stats
  const monthEvents = getEventsForMonth ? getEventsForMonth(viewYear, viewMonth) : [];
  const monthEventCount = monthEvents.length;
  const holidayCount = monthEvents.filter(e => e.isHoliday || e.type === "holiday").length;

  html += `
    <!-- ================================================================= -->
    <!-- 1. Whole Calendar Month Grid (with Bounded Integrated Navigator)  -->
    <!-- ================================================================= -->
    <section class="calendar-grid-card" aria-label="Month View for ${MONTH_NAMES[viewMonth - 1]} ${viewYear}">
      
      <!-- Integrated Month / Year Navigator directly on the calendar (Themed & Elevated) -->
      <div class="calendar-integrated-nav">
        <button 
          type="button" 
          class="btn-cal-nav btn-cal-prev-month" 
          aria-label="Previous Month"
          ${isAtMinBoundary ? 'disabled aria-disabled="true" title="Minimum boundary reached (January 2026)"' : 'title="Previous Month"'}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        
        <div class="calendar-integrated-title">
          <div class="cal-session-pill">
            <span class="pill-seal">🏛️</span>
            <span class="pill-text">ACADEMIC SESSION 2026</span>
          </div>
          <h2 class="cal-month-name">${MONTH_NAMES[viewMonth - 1]} <span class="cal-month-year">${viewYear}</span></h2>
          <div class="cal-month-meta-strip">
            <span class="cal-month-badge">
              <span class="meta-dot"></span>${monthEventCount} Event${monthEventCount === 1 ? '' : 's'}${holidayCount > 0 ? ` (${holidayCount} Holiday${holidayCount === 1 ? '' : 's'})` : ''}
            </span>
            <span class="cal-meta-divider">•</span>
            <span class="cal-month-days-text">${daysInCurrentMonth} Days</span>
          </div>
        </div>

        <button 
          type="button" 
          class="btn-cal-nav btn-cal-next-month" 
          aria-label="Next Month"
          ${isAtMaxBoundary ? 'disabled aria-disabled="true" title="Maximum boundary reached (December 2026)"' : 'title="Next Month"'}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <!-- Weekday Headers -->
      <div class="cal-weekdays-header">
        ${WEEKDAY_NAMES.map((w, idx) => {
          const isWeekend = idx >= 5; // Sat, Sun
          return `<div class="cal-weekday-cell ${isWeekend ? 'is-weekend-col' : ''}">${w}</div>`;
        }).join("")}
      </div>

      <!-- Month Dates Grid -->
      <div class="cal-dates-grid" role="grid">
  `;

  // 1. Padding days from previous month
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    const padDay = prevMonthDays - i;
    html += `
      <div class="cal-day-cell is-pad-day" aria-hidden="true">
        <span class="day-number-text">${padDay}</span>
      </div>
    `;
  }

  // 2. Active days of current month
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dateStr = toDateStr(viewYear, viewMonth, day);
    const dayOfWeek = (firstDayOffset + (day - 1)) % 7; // 0 = Mon, 5 = Sat, 6 = Sun
    const isWeekend = dayOfWeek >= 5;
    const isSunday = dayOfWeek === 6;
    const isSaturday = dayOfWeek === 5;
    const isSelected = dateStr === selectedDateStr;
    const isToday = dateStr === todayDateStr;

    // Events on this date
    const rawDayEvents = getEventsForDate(dateStr);
    const hasEvents = rawDayEvents.length > 0;
    const isHoliday = rawDayEvents.some(e => e.isHoliday || e.type === "holiday");
    const hasExam = rawDayEvents.some(e => e.type === "exam");
    const hasMeeting = rawDayEvents.some(e => e.type === "meeting");
    const hasDeadline = rawDayEvents.some(e => e.type === "deadline");

    let cellClasses = ["cal-day-cell"];
    if (isWeekend) cellClasses.push("is-weekend");
    if (isSunday) cellClasses.push("is-sunday");
    if (isSaturday) cellClasses.push("is-saturday");
    if (isSelected) cellClasses.push("is-selected-day");
    if (isToday) cellClasses.push("is-today-day");
    if (isHoliday) cellClasses.push("is-holiday-day");

    html += `
      <button 
        type="button" 
        class="${cellClasses.join(" ")}" 
        data-date="${dateStr}"
        role="gridcell"
        aria-selected="${isSelected}"
        aria-label="${day} ${MONTH_NAMES[viewMonth - 1]} ${viewYear}${isHoliday ? ', Holiday' : ''}${hasEvents ? `, ${rawDayEvents.length} event(s)` : ''}">
        
        <span class="day-number-text">${day}</span>
        
        ${hasEvents ? `
          <div class="day-event-indicators">
            ${isHoliday ? `<span class="event-dot dot-holiday" title="Holiday"></span>` : ''}
            ${hasExam ? `<span class="event-dot dot-exam" title="Exam"></span>` : ''}
            ${hasDeadline ? `<span class="event-dot dot-deadline" title="Deadline"></span>` : ''}
            ${hasMeeting ? `<span class="event-dot dot-meeting" title="Meeting"></span>` : ''}
            ${!isHoliday && !hasExam && !hasDeadline && !hasMeeting ? `<span class="event-dot dot-other" title="Event"></span>` : ''}
          </div>
        ` : ''}
      </button>
    `;
  }

  // 3. Trailing padding days to fill grid row
  const totalCellsSoFar = firstDayOffset + daysInCurrentMonth;
  const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
  for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
    html += `
      <div class="cal-day-cell is-pad-day" aria-hidden="true">
        <span class="day-number-text">${nextDay}</span>
      </div>
    `;
  }

  html += `
      </div> <!-- End cal-dates-grid -->
    </section>

    <!-- ================================================================= -->
    <!-- 2. SELECTED DATE DETAIL (Themed & Elevated Inspection Card)       -->
    <!-- ================================================================= -->
    <section class="calendar-detail-section" aria-label="Events on ${selectedDateStr}">
  `;

  const selectedEvents = getEventsForDate(selectedDateStr);
  const isSelectedHoliday = isHolidayDate(selectedDateStr);
  const isSelectedToday = selectedDateStr === todayDateStr;

  html += `
    <div class="cal-detail-card">
      <div class="cal-detail-header-elevated">
        <div class="detail-header-top-row">
          <div class="detail-inspection-tag">
            <span class="tag-icon">🔍</span>
            <span class="tag-text">DATE INSPECTION</span>
          </div>
          <div class="detail-header-badges">
            ${isSelectedToday ? `<span class="cal-status-pill pill-today"><span class="pill-pulse"></span>TODAY</span>` : ''}
            ${isSelectedHoliday ? `<span class="cal-status-pill pill-holiday">🌴 General Holiday</span>` : ''}
            <span class="cal-event-count-badge ${selectedEvents.length > 0 ? 'badge-has-events' : ''}">
              ${selectedEvents.length === 0 ? 'Regular Day' : `${selectedEvents.length} Event${selectedEvents.length === 1 ? '' : 's'}`}
            </span>
          </div>
        </div>
        <h3 class="detail-date-title-elevated">${formatCalendarDate(selectedDateStr)}</h3>
      </div>

      <div class="cal-detail-body">
  `;

  if (selectedEvents.length === 0) {
    html += `
      <div class="cal-empty-state">
        <div class="empty-icon-box">📖</div>
        <div class="empty-text-group">
          <strong>Regular Polytechnic Academic Day</strong>
          <p>Standard lectures and practical laboratories operate on this day according to timetable schedule.</p>
        </div>
      </div>
    `;
  } else {
    html += `<div class="cal-events-list">`;
    selectedEvents.forEach(ev => {
      const badge = getEventTypeBadge(ev.type);
      const isMultiDay = Boolean(ev.endDate && ev.endDate !== ev.date);

      html += `
        <div class="cal-event-card type-${ev.type} ${ev.isHoliday ? 'is-holiday' : ''}">
          <div class="cal-event-type-strip"></div>
          <div class="cal-event-content">
            <div class="event-headline-row">
              <span class="cal-type-badge ${badge.badgeClass}">
                <span class="badge-icon">${badge.icon}</span>
                <span class="badge-text">${badge.label}</span>
              </span>
              ${ev.source === "karnataka-holiday" 
                ? `<span class="source-tag source-govt">Govt of Karnataka</span>` 
                : `<span class="source-tag source-college">SET Academic</span>`}
            </div>

            <h4 class="cal-event-title">${ev.title}</h4>

            ${isMultiDay ? `
              <div class="event-multi-day-row">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                <span>${formatCalendarDate(ev.date, false)} – ${formatCalendarDate(ev.endDate, false)}</span>
              </div>
            ` : ''}

            ${ev.description ? `
              <p class="cal-event-description">${ev.description}</p>
            ` : ''}

            ${(ev.branch || ev.semester || ev.scope) ? `
              <div class="cal-event-tags-row">
                ${ev.branch ? `<span class="cal-tag">Branch: ${ev.branch}</span>` : ''}
                ${ev.semester ? `<span class="cal-tag">Sem: ${ev.semester}</span>` : ''}
                ${ev.scope ? `<span class="cal-tag">Scope: ${ev.scope}</span>` : ''}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  html += `
      </div>
    </div>
  </section>

  <!-- ================================================================= -->
  <!-- 3. UPCOMING ACADEMIC MILESTONES (Themed & Elevated Roadmap)       -->
  <!-- ================================================================= -->
  <section class="calendar-upcoming-section" aria-label="Upcoming Milestones">
    <div class="cal-upcoming-card-elevated">
      <div class="upcoming-header-elevated">
        <div class="upcoming-header-badge">
          <span class="badge-icon">📌</span>
          <span class="badge-text">ACADEMIC ROADMAP</span>
        </div>
        <div class="upcoming-title-group">
          <h4 class="upcoming-title-text">Upcoming Academic Milestones</h4>
          <span class="upcoming-subtitle-text">Next institutional events, assessments & government holidays</span>
        </div>
      </div>
      <div class="upcoming-events-list">
  `;

  const rawUpcoming = getUpcomingEvents(effectiveDate || new Date(), 5);

  if (rawUpcoming.length === 0) {
    html += `<div class="upcoming-empty">No upcoming milestones currently listed.</div>`;
  } else {
    rawUpcoming.forEach(upEv => {
      const badge = getEventTypeBadge(upEv.type);
      const isMulti = Boolean(upEv.endDate && upEv.endDate !== upEv.date);

      html += `
        <div class="upcoming-item-elevated" data-date="${upEv.date}" role="button" tabindex="0" title="Inspect ${upEv.title}">
          <div class="upcoming-date-box-elevated">
            <span class="upcoming-date-month-elevated">${MONTH_NAMES[parseInt(upEv.date.slice(5, 7), 10) - 1].slice(0, 3)}</span>
            <span class="upcoming-date-day-elevated">${upEv.date.slice(8, 10)}</span>
          </div>
          <div class="upcoming-info-col">
            <span class="upcoming-item-title">${upEv.title}</span>
            <div class="upcoming-meta-row">
              <span class="upcoming-badge ${badge.badgeClass}">${badge.label}</span>
              ${isMulti ? `<span class="upcoming-span-text">Through ${formatCalendarDate(upEv.endDate, false)}</span>` : ''}
            </div>
          </div>
          <div class="upcoming-chevron-box" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      `;
    });
  }

  html += `
      </div>
    </div>
  </section>

  <!-- ================================================================= -->
  <!-- 4. OFFICIAL INSTITUTIONAL CALENDAR BOUNDARY LIMIT FOOTER         -->
  <!-- ================================================================= -->
  <footer class="cal-page-boundary-limit" role="contentinfo" aria-label="Academic Calendar Boundary Limit">
    <div class="cal-boundary-divider">
      <span class="boundary-line"></span>
      <span class="boundary-emblem">🏛️</span>
      <span class="boundary-line"></span>
    </div>
    <div class="cal-boundary-seal-card">
      <div class="boundary-seal-icon">🏫</div>
      <div class="boundary-seal-content">
        <strong class="boundary-institution-title">S.E.T. Polytechnic, Melukote</strong>
        <span class="boundary-affiliation-text">Department of Technical Education (DTE), Karnataka</span>
        <span class="boundary-scope-note">Academic Session 2026 • Master Calendar Boundary [Jan – Dec 2026]</span>
      </div>
      <div class="boundary-verified-badge" title="Official Institutional Schedule Verified">
        <span class="verified-dot"></span>
        <span class="verified-text">Active Session</span>
      </div>
    </div>
  </footer>

  </div> <!-- End calendar-screen -->
  `;

  container.innerHTML = html;
  attachListeners(container, viewYear, viewMonth, selectedDateStr, onStateChange);
}

/**
 * Attaches DOM interaction listeners for month and date clicks with strict boundary checking.
 */
function attachListeners(container, currentYear, currentMonth, selectedDate, onStateChange) {
  if (!onStateChange) return;

  // Previous Month
  const btnPrevMonth = container.querySelector(".btn-cal-prev-month");
  if (btnPrevMonth) {
    btnPrevMonth.addEventListener("click", () => {
      // Guard against navigating before minimum boundary
      if (currentYear === CALENDAR_MIN_YEAR && currentMonth <= CALENDAR_MIN_MONTH) {
        return;
      }
      let newM = currentMonth - 1;
      let newY = currentYear;
      if (newM < 1) {
        newM = 12;
        newY -= 1;
      }
      const clamped = clampCalendarBounds(newY, newM);
      onStateChange({ year: clamped.year, month: clamped.month, selectedDate });
    });
  }

  // Next Month
  const btnNextMonth = container.querySelector(".btn-cal-next-month");
  if (btnNextMonth) {
    btnNextMonth.addEventListener("click", () => {
      // Guard against navigating beyond maximum boundary
      if (currentYear === CALENDAR_MAX_YEAR && currentMonth >= CALENDAR_MAX_MONTH) {
        return;
      }
      let newM = currentMonth + 1;
      let newY = currentYear;
      if (newM > 12) {
        newM = 1;
        newY += 1;
      }
      const clamped = clampCalendarBounds(newY, newM);
      onStateChange({ year: clamped.year, month: clamped.month, selectedDate });
    });
  }

  // Reset to 2026 Year Button (from unconfigured screen)
  const btnResetYear = container.querySelector(".btn-reset-cal-year");
  if (btnResetYear) {
    btnResetYear.addEventListener("click", () => {
      onStateChange({ year: 2026, month: 10, selectedDate: "2026-10-14" });
    });
  }

  // Date Selection Cell Click
  container.querySelectorAll(".cal-day-cell[data-date]").forEach(cell => {
    cell.addEventListener("click", () => {
      const dateVal = cell.getAttribute("data-date");
      if (dateVal) {
        onStateChange({ year: currentYear, month: currentMonth, selectedDate: dateVal });
      }
    });
  });

  // Upcoming items click to select date
  container.querySelectorAll(".upcoming-item-elevated[data-date]").forEach(item => {
    item.addEventListener("click", () => {
      const dateVal = item.getAttribute("data-date");
      if (dateVal) {
        const itemYear = parseInt(dateVal.slice(0, 4), 10);
        const itemMonth = parseInt(dateVal.slice(5, 7), 10);
        const clamped = clampCalendarBounds(itemYear, itemMonth);
        onStateChange({ year: clamped.year, month: clamped.month, selectedDate: dateVal });
      }
    });
  });
}

export default {
  renderCalendarView,
  clampCalendarBounds,
  CALENDAR_MIN_YEAR,
  CALENDAR_MIN_MONTH,
  CALENDAR_MAX_YEAR,
  CALENDAR_MAX_MONTH
};
