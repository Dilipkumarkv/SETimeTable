// Phase 1: Pure Timetable Data Layer
// NOTE: Until real data arrives, isSample is true and UI displays sample banner.

export const TIMETABLE = {
  meta: {
    isSample: true,
    term: "2025-26 ODD SEM",
    version: "1.0.0"
  },

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

  days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],

  classes: [
    { id: "CE-I", branch: "CE", sem: "I" },
    { id: "CE-III", branch: "CE", sem: "III" },
    { id: "CE-V", branch: "CE", sem: "V" },
    { id: "CS-I", branch: "CS", sem: "I" },
    { id: "CS-III", branch: "CS", sem: "III" },
    { id: "CS-V", branch: "CS", sem: "V" },
    { id: "EC-I", branch: "EC", sem: "I" },
    { id: "EC-III", branch: "EC", sem: "III" },
    { id: "EC-V", branch: "EC", sem: "V" },
    { id: "EE-I", branch: "EE", sem: "I" },
    { id: "EE-III", branch: "EE", sem: "III" },
    { id: "EE-V", branch: "EE", sem: "V" },
    { id: "ME-I", branch: "ME", sem: "I" },
    { id: "ME-III", branch: "ME", sem: "III" },
    { id: "ME-V", branch: "ME", sem: "V" }
  ],

  lecturers: {
    "VM": { name: "V. Mohan" },
    "KAR": { name: "K. A. Ramesh" },
    "SNK": { name: "S. N. Kumar" },
    "BR": { name: "B. R. Raghu" },
    "RBL": { name: "R. B. Lakshmi" },
    "SSY": { name: "S. S. Yogesh" },
    "DIL": { name: "Dilip Kumar" },
    "NKV": { name: "N. K. Vijay" },
    "MSN": { name: "M. S. Nagaraj" },
    "HST": { name: "H. S. Tejas" },
    "SMP": { name: "S. M. Prasad" }
  },

  // Sample contains 2 days (MON, TUE), at least 3 classes (CE-III, CS-III, ME-V),
  // includes:
  // 1) One multi-slot lab (CS-III on MON P3-P4)
  // 2) One 3-batch lab (CS-III on MON P3-P4 with batches B1, B2, B3)
  // 3) One LIB item (CE-III on TUE P1)
  // 4) Free period (CE-III has free period on MON P4)
  entries: [
    // --- MON: CE-III ---
    {
      day: "MON",
      classId: "CE-III",
      startSlot: "P1",
      endSlot: "P1",
      subject: "CT-T",
      type: "theory",
      batch: null,
      lecturers: ["VM"],
      room: "L16"
    },
    {
      day: "MON",
      classId: "CE-III",
      startSlot: "P2",
      endSlot: "P2",
      subject: "CT-T",
      type: "theory",
      batch: null,
      lecturers: ["VM"],
      room: "L16"
    },
    {
      day: "MON",
      classId: "CE-III",
      startSlot: "P3",
      endSlot: "P3",
      subject: "E M & SOM-LAB",
      type: "lab",
      batch: null,
      lecturers: ["KAR"],
      room: null
    },
    // Note: CE-III P4 is intentionally omitted -> Free period

    // --- MON: CS-III (3-batch lab spanning P3 to P4) ---
    {
      day: "MON",
      classId: "CS-III",
      startSlot: "P1",
      endSlot: "P1",
      subject: "DBMS",
      type: "theory",
      batch: null,
      lecturers: ["SMP"],
      room: null
    },
    {
      day: "MON",
      classId: "CS-III",
      startSlot: "P2",
      endSlot: "P2",
      subject: "DBMS",
      type: "theory",
      batch: null,
      lecturers: ["SMP"],
      room: null
    },
    // Multi-slot 3-batch lab spanning P3 to P4:
    {
      day: "MON",
      classId: "CS-III",
      startSlot: "P3",
      endSlot: "P4",
      subject: "DSP LAB",
      type: "lab",
      batch: "B1",
      lecturers: ["RBL"],
      room: "LAB1"
    },
    {
      day: "MON",
      classId: "CS-III",
      startSlot: "P3",
      endSlot: "P4",
      subject: "CN LAB",
      type: "lab",
      batch: "B2",
      lecturers: ["SSY"],
      room: "LAB2"
    },
    {
      day: "MON",
      classId: "CS-III",
      startSlot: "P3",
      endSlot: "P4",
      subject: "SNA LAB",
      type: "lab",
      batch: "B3",
      lecturers: ["DIL"],
      room: "LAB3"
    },

    // --- MON: ME-V ---
    {
      day: "MON",
      classId: "ME-V",
      startSlot: "P1",
      endSlot: "P2",
      subject: "AMT",
      type: "theory",
      batch: null,
      lecturers: ["MSN"],
      room: null
    },
    {
      day: "MON",
      classId: "ME-V",
      startSlot: "P5",
      endSlot: "P6",
      subject: "MOM(P)",
      type: "lab",
      batch: null,
      lecturers: ["MSN"],
      room: null
    },

    // --- TUE: CE-III ---
    {
      day: "TUE",
      classId: "CE-III",
      startSlot: "P1",
      endSlot: "P1",
      subject: "LIB",
      type: "other",
      batch: null,
      lecturers: [],
      room: null
    },
    {
      day: "TUE",
      classId: "CE-III",
      startSlot: "P2",
      endSlot: "P2",
      subject: "ADV SUR",
      type: "theory",
      batch: null,
      lecturers: ["KAR"],
      room: null
    },
    {
      day: "TUE",
      classId: "CE-III",
      startSlot: "P3",
      endSlot: "P3",
      subject: "B D P-T",
      type: "theory",
      batch: null,
      lecturers: ["KAR"],
      room: null
    },
    {
      day: "TUE",
      classId: "CE-III",
      startSlot: "P4",
      endSlot: "P4",
      subject: "CT-T",
      type: "theory",
      batch: null,
      lecturers: ["VM"],
      room: "L16"
    },

    // --- TUE: CS-III ---
    {
      day: "TUE",
      classId: "CS-III",
      startSlot: "P1",
      endSlot: "P2",
      subject: "DBMS, DSP, SNA LAB",
      type: "lab",
      batch: null,
      lecturers: ["RBL", "SSY", "DIL"],
      room: null
    },
    {
      day: "TUE",
      classId: "CS-III",
      startSlot: "P3",
      endSlot: "P3",
      subject: "CN",
      type: "theory",
      batch: null,
      lecturers: ["SSY"],
      room: null
    },
    {
      day: "TUE",
      classId: "CS-III",
      startSlot: "P4",
      endSlot: "P4",
      subject: "DSP",
      type: "theory",
      batch: null,
      lecturers: ["RBL"],
      room: null
    },

    // --- TUE: ME-V ---
    {
      day: "TUE",
      classId: "ME-V",
      startSlot: "P1",
      endSlot: "P1",
      subject: "THERMAL(T)",
      type: "theory",
      batch: null,
      lecturers: ["NKV"],
      room: null
    },
    {
      day: "TUE",
      classId: "ME-V",
      startSlot: "P2",
      endSlot: "P2",
      subject: "FPE",
      type: "theory",
      batch: null,
      lecturers: ["MSN"],
      room: null
    },
    {
      day: "TUE",
      classId: "ME-V",
      startSlot: "P5",
      endSlot: "P6",
      subject: "SPORTS",
      type: "other",
      batch: null,
      lecturers: [],
      room: null
    }
  ]
};
