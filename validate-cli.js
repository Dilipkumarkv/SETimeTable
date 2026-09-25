#!/usr/bin/env node
// CLI Timetable Validator for Production Data Ingestion & Quality Control
// Usage: node validate-cli.js [path/to/data.js]

import path from "path";
import { pathToFileURL } from "url";
import { validateTimetable } from "./validate.js";

async function main() {
  const targetArg = process.argv[2] || "./data.js";
  const absolutePath = path.resolve(process.cwd(), targetArg);

  console.log("===============================================================");
  console.log("🏫 SET Polytechnic Timetable Production Data Validator");
  console.log(`📁 Validating: ${targetArg}`);
  console.log("===============================================================\n");

  let timetableData;
  try {
    const imported = await import(pathToFileURL(absolutePath).href);
    timetableData = imported.TIMETABLE || imported.default;
    if (!timetableData) {
      throw new Error(`No TIMETABLE export found in ${targetArg}`);
    }
  } catch (err) {
    console.error(`❌ FAILED TO IMPORT FILE: ${err.message}\n`);
    process.exit(1);
  }

  // Summary counts
  const isSampleFlag = !!(timetableData.meta?.isSample ?? timetableData.isSampleData);
  console.log("📊 Dataset Summary:");
  console.log(`   - Sample Data Flag: ${isSampleFlag ? "⚠️  YES (Sample Data)" : "✅ NO (Production Real Data)"}`);
  console.log(`   - Days of Week:     ${timetableData.days ? timetableData.days.length : 0} (${(timetableData.days || []).join(", ")})`);
  console.log(`   - Daily Slots:      ${timetableData.slots ? timetableData.slots.length : 0}`);
  console.log(`   - Academic Classes: ${timetableData.classes ? timetableData.classes.length : 0}`);
  console.log(`   - Faculty Members:  ${timetableData.lecturers ? Object.keys(timetableData.lecturers).length : 0}`);
  console.log(`   - Total Entries:    ${timetableData.entries ? timetableData.entries.length : 0}\n`);

  const diagnostics = validateTimetable(timetableData);
  const errors = diagnostics.filter(d => d.level === "error");
  const warnings = diagnostics.filter(d => d.level === "warning");

  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} Validation Warning(s):`);
    warnings.forEach((w, i) => {
      console.log(`   [${i + 1}] Entry ${w.entryIndex ?? "N/A"}: ${w.message}`);
    });
    console.log();
  }

  if (errors.length > 0) {
    console.error(`❌ VALIDATION FAILED: ${errors.length} fatal error(s) found!`);
    console.error("The timetable application will refuse to render until these errors are fixed:\n");
    errors.forEach((err, idx) => {
      console.error(`   [${idx + 1}] Entry ${err.entryIndex !== undefined ? err.entryIndex : "SCHEMA"}: ${err.message}`);
    });
    console.error("\n===============================================================");
    console.error("Please refer to DATA_HANDOFF.md for schema rules & fixes.");
    console.error("===============================================================\n");
    process.exit(1);
  }

  console.log("✅ VALIDATION SUCCESSFUL!");
  console.log("   - 0 schema violations");
  console.log("   - 0 referential integrity errors");
  console.log("   - 0 illegal schedule collisions");
  console.log("   - Dataset is 100% compliant with timetable execution engine.\n");
  process.exit(0);
}

main().catch(err => {
  console.error("Unexpected error during validation:", err);
  process.exit(1);
});
