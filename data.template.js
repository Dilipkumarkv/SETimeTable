/**
 * SET Polytechnic Melukote — Production Timetable Data Template
 * 
 * Instructions:
 * 1. Copy this file or edit `data.js`.
 * 2. Set `meta.isSample: false` to deactivate the "SAMPLE DATA" warning banner.
 * 3. Populate `lecturers` with all active faculty members and their initials.
 * 4. Populate `entries` with the official semester timetable schedule.
 * 5. Run `node validate-cli.js data.template.js` to verify 100% schema compliance.
 */

export const TIMETABLE = {
  meta: {
    isSample: false, // Set to false for official production deployment
    institution: "SET Polytechnic, Melukote",
    term: "2025-26 ODD SEMESTER",
    effectiveFrom: "2025-08-01",
    version: "1.0.0-PROD"
  },

  // Official Institutional Bell Schedule (7 Periods + Lunch Break)
  slots: [
    { id: "P1", label: "P1", start: "09:45", end: "10:40", kind: "period" },
    { id: "P2", label: "P2", start: "10:40", end: "11:35", kind: "period" },
    { id: "P3", label: "P3", start: "11:35", end: "12:30", kind: "period" },
    { id: "P4", label: "P4", start: "12:30", end: "13:25", kind: "period" },
    { id: "LUNCH", label: "Lunch", start: "13:25", end: "14:00", kind: "break" },
    { id: "P5", label: "P5", start: "14:00", end: "14:50", kind: "period" },
    { id: "P6", label: "P6", start: "14:50", end: "15:40", kind: "period" },
    { id: "P7", label: "P7", start: "15:40", end: "16:30", kind: "period" }
  ],

  // Working Days (Monday through Saturday)
  days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],

  // 15 Academic Classes (5 Branches x 3 Semesters)
  classes: [
    { id: "CE-I", branch: "CE", sem: "I", name: "Civil Engineering — 1st Semester" },
    { id: "CE-III", branch: "CE", sem: "III", name: "Civil Engineering — 3rd Semester" },
    { id: "CE-V", branch: "CE", sem: "V", name: "Civil Engineering — 5th Semester" },
    { id: "CS-I", branch: "CS", sem: "I", name: "Computer Science & Engineering — 1st Semester" },
    { id: "CS-III", branch: "CS", sem: "III", name: "Computer Science & Engineering — 3rd Semester" },
    { id: "CS-V", branch: "CS", sem: "V", name: "Computer Science & Engineering — 5th Semester" },
    { id: "EC-I", branch: "EC", sem: "I", name: "Electronics & Communication — 1st Semester" },
    { id: "EC-III", branch: "EC", sem: "III", name: "Electronics & Communication — 3rd Semester" },
    { id: "EC-V", branch: "EC", sem: "V", name: "Electronics & Communication — 5th Semester" },
    { id: "EE-I", branch: "EE", sem: "I", name: "Electrical & Electronics — 1st Semester" },
    { id: "EE-III", branch: "EE", sem: "III", name: "Electrical & Electronics — 3rd Semester" },
    { id: "EE-V", branch: "EE", sem: "V", name: "Electrical & Electronics — 5th Semester" },
    { id: "ME-I", branch: "ME", sem: "I", name: "Mechanical Engineering — 1st Semester" },
    { id: "ME-III", branch: "ME", sem: "III", name: "Mechanical Engineering — 3rd Semester" },
    { id: "ME-V", branch: "ME", sem: "V", name: "Mechanical Engineering — 5th Semester" }
  ],

  // Faculty Roster Keyed by Initials
  lecturers: {
    "VM": { name: "V. Mohan", department: "Computer Science" },
    "KAR": { name: "K. A. Ramesh", department: "Computer Science" },
    "SNK": { name: "S. N. Kumar", department: "Electronics" },
    "BR": { name: "B. R. Raghu", department: "Civil Engineering" },
    "RBL": { name: "R. B. Lakshmi", department: "Science & Humanities" },
    "SSY": { name: "S. S. Yogesh", department: "Mechanical Engineering" },
    "DIL": { name: "Dilip Kumar", department: "Computer Science" },
    "NKV": { name: "N. K. Vijay", department: "Electrical Engineering" },
    "MSN": { name: "M. S. Nagaraj", department: "Civil Engineering" },
    "HST": { name: "H. S. Tejas", department: "Mechanical Engineering" },
    "SMP": { name: "S. M. Prasad", department: "Electronics" }
  },

  /**
   * Schedule Entries Schema Rules:
   * 
   * Each entry object has:
   * - day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT"
   * - classId: Valid ID from classes array above (e.g. "CS-III")
   * - startSlot: ID of beginning slot (e.g. "P1" or "P3")
   * - endSlot: ID of ending slot (e.g. "P1" for single period, or "P4" for multi-slot lab)
   * - subject: String course title or activity name
   * - type: "theory" | "lab"
   * - batch: "A" | "B" | "C" | "B1" | "B2" | "B3" (MUST be non-null for lab batches; null for whole-class theory)
   * - lecturers: Array of faculty initials matching lecturers keys (e.g. ["VM", "DIL"])
   * - room: (Optional) room string, e.g. "Lab 2" or null
   */
  entries: [
    // --- Civil Engineering ---
    { day: "MON", classId: "CE-III", startSlot: "P1", endSlot: "P1", subject: "Surveying Practice Theory", type: "theory", batch: null, lecturers: ["BR"], room: "CR-101" },
    { day: "MON", classId: "CE-III", startSlot: "P2", endSlot: "P2", subject: "Building Materials & Construction", type: "theory", batch: null, lecturers: ["MSN"], room: "CR-101" },

    // --- Computer Science & Engineering ---
    { day: "MON", classId: "CS-III", startSlot: "P1", endSlot: "P1", subject: "Data Structures Using C", type: "theory", batch: null, lecturers: ["VM"], room: "CS-LH1" },
    { day: "MON", classId: "CS-III", startSlot: "P2", endSlot: "P2", subject: "Digital Computer Fundamentals", type: "theory", batch: null, lecturers: ["KAR"], room: "CS-LH1" },
    
    // Multi-slot Parallel Lab Example (P3 to P4 across 3 batches):
    { day: "MON", classId: "CS-III", startSlot: "P3", endSlot: "P4", subject: "Data Structures Lab (B1)", type: "lab", batch: "B1", lecturers: ["VM"], room: "Lab 1" },
    { day: "MON", classId: "CS-III", startSlot: "P3", endSlot: "P4", subject: "Linux Administration Lab (B2)", type: "lab", batch: "B2", lecturers: ["KAR"], room: "Lab 2" },
    { day: "MON", classId: "CS-III", startSlot: "P3", endSlot: "P4", subject: "Web Programming Lab (B3)", type: "lab", batch: "B3", lecturers: ["DIL"], room: "Lab 3" },

    // Afternoon Theory:
    { day: "MON", classId: "CS-III", startSlot: "P5", endSlot: "P5", subject: "Discrete Mathematics", type: "theory", batch: null, lecturers: ["RBL"], room: "CS-LH1" },
    { day: "MON", classId: "CS-III", startSlot: "P6", endSlot: "P6", subject: "Professional Ethics & Values", type: "theory", batch: null, lecturers: ["SNK"], room: "CS-LH1" },
    { day: "MON", classId: "CS-III", startSlot: "P7", endSlot: "P7", subject: "Library / Sports Mentorship", type: "theory", batch: null, lecturers: ["VM"], room: "Library" },

    // --- Mechanical Engineering ---
    { day: "MON", classId: "ME-V", startSlot: "P1", endSlot: "P1", subject: "Design of Machine Elements", type: "theory", batch: null, lecturers: ["SSY"], room: "ME-LH2" },
    { day: "MON", classId: "ME-V", startSlot: "P2", endSlot: "P2", subject: "Thermal Engineering II", type: "theory", batch: null, lecturers: ["HST"], room: "ME-LH2" }
  ]
};
