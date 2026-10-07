// Phase 2: Developer-Only Excel Academic Calendar Importer
// Converts data/academic-calendar.xlsx -> academic-calendar.generated.js
// NEVER run in browser. Run strictly as a Node build/pre-build step.

import * as XLSXModule from "xlsx";
import fs from "fs";
import path from "path";

const XLSX = XLSXModule.default || XLSXModule;

const ALLOWED_TYPES = new Set([
  "holiday",
  "exam",
  "academic",
  "deadline",
  "meeting",
  "event",
  "semester",
  "other"
]);

/**
 * Checks if a given year, month (1-12), and day form a valid calendar date.
 * Handles leap years (e.g., 29 Feb 2028 is valid, 29 Feb 2026 is invalid).
 */
export function isValidCalendarDate(year, month, day) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;

  const isLeap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= daysInMonth[m - 1];
}

/**
 * Normalizes an Excel date value into YYYY-MM-DD.
 * Supports:
 * - ISO string: "2026-10-14"
 * - Indian/UK format: "14-10-2026", "14/10/2026"
 * - Excel date serial number: e.g. 46310
 * - JS Date object
 */
export function normalizeExcelDate(val, fieldName, rowNum) {
  if (val === undefined || val === null || val === "") {
    return "";
  }

  // Already a Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      throw new Error(`ERROR: Row ${rowNum}: Invalid date object in "${fieldName}".`);
    }
    const y = val.getFullYear();
    const m = val.getMonth() + 1;
    const d = val.getDate();
    if (!isValidCalendarDate(y, m, d)) {
      throw new Error(`ERROR: Row ${rowNum}: Impossible calendar date in "${fieldName}".`);
    }
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // Excel serial number (days since Dec 30, 1899)
  if (typeof val === "number") {
    const dateObj = XLSX.SSF.parse_date_code(val);
    if (!dateObj || !dateObj.y || !dateObj.m || !dateObj.d) {
      throw new Error(`ERROR: Row ${rowNum}: Unparseable numeric Excel date (${val}) in "${fieldName}".`);
    }
    const y = dateObj.y;
    const m = dateObj.m;
    const d = dateObj.d;
    if (!isValidCalendarDate(y, m, d)) {
      throw new Error(`ERROR: Row ${rowNum}: Impossible calendar date (${val}) in "${fieldName}".`);
    }
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const str = String(val).trim();
  if (!str) return "";

  // Check YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (!isValidCalendarDate(y, m, d)) {
      throw new Error(`ERROR: Row ${rowNum}: Impossible calendar date "${str}" in "${fieldName}".`);
    }
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // Check DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (!isValidCalendarDate(y, m, d)) {
      throw new Error(`ERROR: Row ${rowNum}: Impossible calendar date "${str}" in "${fieldName}".`);
    }
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  throw new Error(`ERROR: Row ${rowNum}: Unrecognized date format "${str}" in "${fieldName}". Expected YYYY-MM-DD or DD-MM-YYYY.`);
}

/**
 * Creates a deterministic, URL-friendly slug from title.
 */
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
}

/**
 * Validates and normalizes raw Excel rows into deterministic AcademicCalendarEvent array.
 */
export function validateAndNormalizeRows(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error("ERROR: The academic calendar worksheet is empty or contains no valid rows.");
  }

  const events = [];
  const seenKeys = new Map();
  const idCounts = new Map();

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // Row 1 is header in Excel

    // Find columns case-insensitively
    const getVal = (colNames) => {
      for (const name of colNames) {
        for (const key of Object.keys(row)) {
          if (key.trim().toLowerCase() === name.toLowerCase()) {
            return row[key];
          }
        }
      }
      return undefined;
    };

    const rawDate = getVal(["Date", "Start Date", "StartDate"]);
    const rawEndDate = getVal(["End Date", "EndDate", "End"]);
    const rawTitle = getVal(["Title", "Event", "Event Title", "Name"]);
    const rawType = getVal(["Type", "Category", "Event Type"]);
    const rawDesc = getVal(["Description", "Desc", "Details"]);
    const rawBranch = getVal(["Branch", "Department", "Dept"]);
    const rawSemester = getVal(["Semester", "Sem"]);
    const rawSection = getVal(["Section", "Sec"]);
    const rawScope = getVal(["Scope", "Level"]);

    // 1. Validate Date
    if (rawDate === undefined || rawDate === null || String(rawDate).trim() === "") {
      throw new Error(`ERROR: Row ${rowNum}: Missing required "Date" column.`);
    }
    const date = normalizeExcelDate(rawDate, "Date", rowNum);

    // 2. Validate Title
    if (rawTitle === undefined || rawTitle === null || String(rawTitle).trim() === "") {
      throw new Error(`ERROR: Row ${rowNum}: Missing required "Title" column.`);
    }
    const title = String(rawTitle).trim();

    // 3. Validate Type
    if (rawType === undefined || rawType === null || String(rawType).trim() === "") {
      throw new Error(`ERROR: Row ${rowNum}: Missing required "Type" column.`);
    }
    const type = String(rawType).trim().toLowerCase();
    if (!ALLOWED_TYPES.has(type)) {
      throw new Error(
        `ERROR: Row ${rowNum}: Unknown calendar event type "${rawType}". Allowed values: ${Array.from(ALLOWED_TYPES).join(", ")}.`
      );
    }

    // 4. Validate End Date (if present)
    let endDate = "";
    if (rawEndDate !== undefined && rawEndDate !== null && String(rawEndDate).trim() !== "") {
      endDate = normalizeExcelDate(rawEndDate, "End Date", rowNum);
      if (endDate < date) {
        throw new Error(
          `ERROR: Row ${rowNum}: End Date cannot be earlier than Date (precedes start Date: "${endDate}" < "${date}").`
        );
      }
      // If endDate is identical to startDate, normalize to empty
      if (endDate === date) {
        endDate = "";
      }
    }

    // 5. Duplicate Detection
    const duplicateKey = `${date}::${endDate}::${title.toLowerCase()}::${type}`;
    if (seenKeys.has(duplicateKey)) {
      const prevRow = seenKeys.get(duplicateKey);
      throw new Error(
        `ERROR: Row ${rowNum}: Exact duplicate event detected: "${title}" (${date}). Previously declared on row ${prevRow}.`
      );
    }
    seenKeys.set(duplicateKey, rowNum);

    // 6. Generate Deterministic ID
    const titleSlug = slugify(title) || "event";
    const baseId = `academic-${date}-${titleSlug}`;
    const count = (idCounts.get(baseId) || 0) + 1;
    idCounts.set(baseId, count);
    const id = count === 1 ? baseId : `${baseId}-${count}`;

    // 7. Construct Normalized Event Object
    const eventObj = {
      id,
      date,
      title,
      type,
      source: "academic-calendar",
      isHoliday: type === "holiday"
    };

    if (endDate) eventObj.endDate = endDate;
    if (rawDesc && String(rawDesc).trim()) eventObj.description = String(rawDesc).trim();
    if (rawBranch && String(rawBranch).trim()) eventObj.branch = String(rawBranch).trim();
    if (rawSemester && String(rawSemester).trim()) eventObj.semester = String(rawSemester).trim();
    if (rawSection && String(rawSection).trim()) eventObj.section = String(rawSection).trim();
    if (rawScope && String(rawScope).trim()) eventObj.scope = String(rawScope).trim();

    events.push(eventObj);
  }

  // Sort events chronologically by date, then title
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.title.localeCompare(b.title);
  });

  return events;
}

/**
 * Main importer CLI execution.
 */
export function importAcademicCalendar(excelFilePath = "data/academic-calendar.xlsx") {
  const fullPath = path.resolve(excelFilePath);
  console.log("===============================================================");
  console.log("📅 SET Polytechnic Academic Calendar Importer (Developer CLI)");
  console.log(`📁 Source: ${fullPath}`);
  console.log("===============================================================");

  if (!fs.existsSync(fullPath)) {
    throw new Error(`ERROR: Excel source file not found at: ${fullPath}`);
  }

  const workbook = XLSX.readFile(fullPath, { cellDates: false });
  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error("ERROR: The Excel workbook does not contain any sheets.");
  }

  const firstSheetName = sheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  const events = validateAndNormalizeRows(rawRows);

  const fileContent = `// Auto-generated by scripts/import-academic-calendar.js from ${path.basename(excelFilePath)}
// DO NOT EDIT DIRECTLY. Maintain data in ${excelFilePath} and run: npm run import-calendar

export const ACADEMIC_CALENDAR_EVENTS = ${JSON.stringify(events, null, 2)};

export default ACADEMIC_CALENDAR_EVENTS;
`;

  const outputTargets = [
    path.resolve("academic-calendar.generated.js"),
    path.resolve("public/academic-calendar.generated.js")
  ];

  for (const outPath of outputTargets) {
    const parentDir = path.dirname(outPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(outPath, fileContent, "utf-8");
    console.log(`✅ Generated: ${outPath} (${events.length} events)`);
  }

  // Summary by type
  const typeSummary = {};
  for (const ev of events) {
    typeSummary[ev.type] = (typeSummary[ev.type] || 0) + 1;
  }
  console.log("\n📊 Event Breakdown by Category:");
  for (const [t, count] of Object.entries(typeSummary)) {
    console.log(`   - ${t.toUpperCase().padEnd(12)}: ${count}`);
  }
  console.log(`\n🎉 Academic Calendar imported successfully (100% valid).\n`);
  return events;
}

// Execute when invoked directly from CLI
if (process.argv[1] && process.argv[1].endsWith("import-academic-calendar.js")) {
  try {
    const targetFile = process.argv[2] || "data/academic-calendar.xlsx";
    importAcademicCalendar(targetFile);
  } catch (err) {
    console.error(`\n❌ IMPORT FAILED: ${err.message}\n`);
    process.exit(1);
  }
}
