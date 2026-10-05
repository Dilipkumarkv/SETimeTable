// Unified Academic Calendar Engine for SET Polytechnic
// Merges Karnataka Government Holidays (Year-specific) + Institution-Specific Academic Events
// Separates Timetable ("What class is happening now?") from Calendar ("What event is on this date?")

import { KARNATAKA_HOLIDAYS_2026 } from "./calendar/holidays/2026.js";
import { KARNATAKA_HOLIDAYS_2027 } from "./calendar/holidays/2027.js";
import { ACADEMIC_CALENDAR_EVENTS } from "./academic-calendar.generated.js";

const HOLIDAYS_BY_YEAR = {
  2026: KARNATAKA_HOLIDAYS_2026,
  2027: KARNATAKA_HOLIDAYS_2027
};

/**
 * Checks if a specific year has configured calendar/holiday data.
 * @param {number|string} year 
 * @returns {boolean}
 */
export function isConfiguredYear(year) {
  const y = parseInt(year, 10);
  return Boolean(HOLIDAYS_BY_YEAR[y] || ACADEMIC_CALENDAR_EVENTS.some(e => e.date.startsWith(String(y))));
}

/**
 * Returns Karnataka Government Holidays for a specific year.
 * @param {number|string} year 
 * @returns {Array}
 */
export function getHolidaysForYear(year) {
  const y = parseInt(year, 10);
  return HOLIDAYS_BY_YEAR[y] || [];
}

/**
 * Returns Institution-specific Academic Events for a specific year.
 * @param {number|string} year 
 * @returns {Array}
 */
export function getAcademicEventsForYear(year) {
  const yStr = String(year);
  return ACADEMIC_CALENDAR_EVENTS.filter(e => {
    if (e.date.startsWith(yStr)) return true;
    if (e.endDate && e.endDate.startsWith(yStr)) return true;
    return false;
  });
}

/**
 * Returns unified, deduplicated calendar events for a specific year, sorted chronologically.
 * @param {number|string} year 
 * @returns {Array}
 */
export function getUnifiedCalendarEvents(year) {
  const y = parseInt(year, 10);
  const holidays = getHolidaysForYear(y);
  const academic = getAcademicEventsForYear(y);

  const combined = [...holidays, ...academic];

  // Sort by date, then by type (holidays first, then exams, etc.)
  combined.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.isHoliday && !b.isHoliday) return -1;
    if (!a.isHoliday && b.isHoliday) return 1;
    return a.title.localeCompare(b.title);
  });

  return combined;
}

/**
 * Checks if a given event covers a target YYYY-MM-DD date.
 * Handles both single-day and multi-day events.
 * @param {Object} event 
 * @param {string} targetDate YYYY-MM-DD
 * @returns {boolean}
 */
export function doesEventCoverDate(event, targetDate) {
  if (!event || !targetDate) return false;
  if (event.date === targetDate) return true;
  if (event.endDate && targetDate >= event.date && targetDate <= event.endDate) {
    return true;
  }
  return false;
}

/**
 * Returns all events occurring on a specific date (YYYY-MM-DD).
 * Multiple events on the same date are preserved.
 * @param {string} dateStr YYYY-MM-DD
 * @returns {Array}
 */
export function getEventsForDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return [];
  const year = parseInt(dateStr.slice(0, 4), 10);
  const allEvents = getUnifiedCalendarEvents(year);
  return allEvents.filter(e => doesEventCoverDate(e, dateStr));
}

/**
 * Checks whether any event is scheduled on a given date.
 * @param {string} dateStr YYYY-MM-DD
 * @returns {boolean}
 */
export function hasEventsOnDate(dateStr) {
  return getEventsForDate(dateStr).length > 0;
}

/**
 * Checks whether a given date is an official holiday.
 * @param {string} dateStr YYYY-MM-DD
 * @returns {boolean}
 */
export function isHolidayDate(dateStr) {
  const events = getEventsForDate(dateStr);
  return events.some(e => e.isHoliday || e.type === "holiday");
}

/**
 * Returns all events occurring within a specified month (1-12) of a given year.
 * @param {number|string} year 
 * @param {number} month 1-12
 * @returns {Array}
 */
export function getEventsForMonth(year, month) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const allEvents = getUnifiedCalendarEvents(y);
  const monthPrefix = `${y}-${String(m).padStart(2, "0")}`;

  return allEvents.filter(e => {
    if (e.date.startsWith(monthPrefix)) return true;
    if (e.endDate) {
      // Check if multi-day event spans across this month
      const startYM = e.date.slice(0, 7);
      const endYM = e.endDate.slice(0, 7);
      return monthPrefix >= startYM && monthPrefix <= endYM;
    }
    return false;
  });
}

/**
 * Returns upcoming academic events and holidays on or after referenceDate.
 * @param {string|Date} referenceDate YYYY-MM-DD or Date object
 * @param {number} limit Maximum number of upcoming events to return
 * @returns {Array}
 */
export function getUpcomingEvents(referenceDate = new Date(), limit = 5) {
  let refStr = "";
  if (referenceDate instanceof Date) {
    const y = referenceDate.getFullYear();
    const m = String(referenceDate.getMonth() + 1).padStart(2, "0");
    const d = String(referenceDate.getDate()).padStart(2, "0");
    refStr = `${y}-${m}-${d}`;
  } else {
    refStr = String(referenceDate).trim();
  }

  const currentYear = parseInt(refStr.slice(0, 4), 10);
  const candidates = [
    ...getUnifiedCalendarEvents(currentYear),
    ...getUnifiedCalendarEvents(currentYear + 1)
  ];

  // Filter events whose end date (or start date) is on or after refStr
  const upcoming = candidates.filter(e => {
    const effectiveEnd = e.endDate || e.date;
    return effectiveEnd >= refStr;
  });

  return upcoming.slice(0, limit);
}

/**
 * Helper to compute days in a month.
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Helper to get the 0-indexed day of week for the 1st day of a month (Monday = 0, Sunday = 6).
 */
export function getFirstDayOfWeek(year, month) {
  // JavaScript getDay() returns 0 for Sunday, 1 for Monday...
  const day = new Date(year, month - 1, 1).getDay();
  // Convert so Monday = 0, Tuesday = 1, ..., Sunday = 6
  return (day + 6) % 7;
}

/**
 * Formats a date string YYYY-MM-DD into a human-readable display e.g. "Wednesday, 14 Oct 2026"
 */
export function formatCalendarDate(dateStr, includeWeekday = true) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dateObj = new Date(y, m, d);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const monthName = months[m];
  const weekdayName = weekdays[dateObj.getDay()];

  if (includeWeekday) {
    return `${weekdayName}, ${d} ${monthName} ${y}`;
  }
  return `${d} ${monthName} ${y}`;
}

export default {
  isConfiguredYear,
  getHolidaysForYear,
  getAcademicEventsForYear,
  getUnifiedCalendarEvents,
  doesEventCoverDate,
  getEventsForDate,
  hasEventsOnDate,
  isHolidayDate,
  getEventsForMonth,
  getUpcomingEvents,
  getDaysInMonth,
  getFirstDayOfWeek,
  formatCalendarDate
};
