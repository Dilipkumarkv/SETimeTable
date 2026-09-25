# SET Polytechnic Timetable — Real Data Handoff & Production Replacement Guide

This guide provides instructions for the Principal, Heads of Departments (HODs), and academic administrators to replace the sample timetable dataset with the official college semester schedule.

---

## 1. Quick Overview

- **Current Status:** The application is running in **Sample Data Mode** with an explicit high-visibility warning banner (`SAMPLE DATA – NOT THE REAL TIMETABLE`).
- **Data File Location:** `/data.js`
- **Clean Production Template:** `/data.template.js`
- **Command-Line Validator:** `npm run validate-data` (or `node validate-cli.js`)

---

## 2. Step-by-Step Data Replacement Protocol

Follow these 6 steps to replace the sample data safely without causing application downtime or breaking validation rules:

### Step 1: Back up the current file
Make a copy of `data.js`:
```bash
cp data.js data.sample.backup.js
```

### Step 2: Prepare your real data
You can start from the clean template:
```bash
cp data.template.js data.js
```

### Step 3: Update Faculty Roster (`lecturers`)
In `data.js`, add all teaching faculty members with their official initials and full names:
```javascript
lecturers: {
  "VM": { name: "V. Mohan", department: "Computer Science" },
  "DIL": { name: "Dilip Kumar", department: "Computer Science" },
  "KAR": { name: "K. A. Ramesh", department: "Computer Science" },
  "BR": { name: "B. R. Raghu", department: "Civil Engineering" },
  // Add additional faculty members here...
}
```

### Step 4: Enter Schedule Entries (`entries`)
Add class sessions following the schema rules in Section 3 below.

### Step 5: Run the Validator
Execute the validation script before deploying:
```bash
npm run validate-data
```
The validator checks:
- Referential integrity (every lecturer and class exists).
- Zero illegal overlaps (e.g. theory-theory collisions, un-batched lab overlaps).
- Bell schedule compliance (no entry spans across the lunch break).
- Start slot precedes or matches end slot.

### Step 6: Flip the Sample Flag & Build
Once all errors are resolved:
1. In `data.js`, set `isSample: false`:
   ```javascript
   meta: {
     isSample: false, // Disables the "SAMPLE DATA" warning banner
     term: "2025-26 ODD SEM",
     version: "1.0.0"
   }
   ```
2. Build for production:
   ```bash
   npm run build
   ```

---

## 3. Schema & Data Structure

### 3.1 Daily Bell Schedule (`slots`)
The standard institutional schedule has 7 teaching periods and 1 designated lunch break:

| Slot ID | Kind | Timing | Notes |
| :--- | :--- | :--- | :--- |
| `P1` | `period` | 09:45 – 10:40 | Morning Period 1 |
| `P2` | `period` | 10:40 – 11:35 | Morning Period 2 |
| `P3` | `period` | 11:35 – 12:30 | Morning Period 3 |
| `P4` | `period` | 12:30 – 13:25 | Morning Period 4 |
| `LUNCH` | `break` | 13:25 – 14:00 | Campus Lunch Interval (No classes allowed) |
| `P5` | `period` | 14:00 – 14:50 | Afternoon Period 5 |
| `P6` | `period` | 14:50 – 15:40 | Afternoon Period 6 |
| `P7` | `period` | 15:40 – 16:30 | Afternoon Period 7 |

*Note:* No single class entry is permitted to begin before lunch (`P1`–`P4`) and end after lunch (`P5`–`P7`). Entries spanning both sides must be split into two separate entries.

---

### 3.2 Working Days (`days`)
The application supports all 6 working days:
```javascript
days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
```
Sunday is treated automatically as the campus non-working day.

---

### 3.3 Academic Classes (`classes`)
The polytechnic operates 15 active class sections across 5 departments:
- **Civil Engineering:** `CE-I`, `CE-III`, `CE-V`
- **Computer Science & Engineering:** `CS-I`, `CS-III`, `CS-V`
- **Electronics & Communication:** `EC-I`, `EC-III`, `EC-V`
- **Electrical & Electronics:** `EE-I`, `EE-III`, `EE-V`
- **Mechanical Engineering:** `ME-I`, `ME-III`, `ME-V`

---

### 3.4 Entry Object Structure & Examples

Each entry in `entries: [...]` must have the following properties:

#### Example 1: Standard Single-Period Theory Lecture
```javascript
{
  day: "MON",
  classId: "CS-III",
  startSlot: "P1",
  endSlot: "P1",
  subject: "Data Structures Using C",
  type: "theory",
  batch: null,        // Must be null for whole-class lectures
  lecturers: ["VM"],  // Array of faculty initials from lecturers map
  room: "CS-LH1"      // Optional room code (or null)
}
```

#### Example 2: Multi-Slot Parallel Lab (3 Batches)
A 2-period lab spanning Periods P3 and P4 with 3 simultaneous laboratory batches:
```javascript
// Batch 1:
{
  day: "MON",
  classId: "CS-III",
  startSlot: "P3",
  endSlot: "P4",
  subject: "Data Structures Lab (B1)",
  type: "lab",
  batch: "B1",
  lecturers: ["VM"],
  room: "Lab 1"
},
// Batch 2:
{
  day: "MON",
  classId: "CS-III",
  startSlot: "P3",
  endSlot: "P4",
  subject: "Linux Administration Lab (B2)",
  type: "lab",
  batch: "B2",
  lecturers: ["KAR"],
  room: "Lab 2"
},
// Batch 3:
{
  day: "MON",
  classId: "CS-III",
  startSlot: "P3",
  endSlot: "P4",
  subject: "Web Programming Lab (B3)",
  type: "lab",
  batch: "B3",
  lecturers: ["DIL"],
  room: "Lab 3"
}
```

#### Example 3: Whole-Class Lab Session
```javascript
{
  day: "WED",
  classId: "ME-V",
  startSlot: "P5",
  endSlot: "P6",
  subject: "CAD / CAM Practice",
  type: "lab",
  batch: "A",          // Non-null batch indicator
  lecturers: ["SSY", "HST"],
  room: "CAD Center"
}
```

---

## 4. Common Validation Errors & Resolutions

If `npm run validate-data` reports errors, review the following guide:

1. **`UNKNOWN_CLASS: Class 'CS-IV' is not recognized`**
   - *Resolution:* Verify class code matches one of the 15 valid IDs (`CE-I`, `CE-III`, `CE-V`, `CS-I`, `CS-III`, `CS-V`, etc.).
2. **`UNKNOWN_LECTURER: Initial 'XYZ' not defined in lecturers`**
   - *Resolution:* Add `"XYZ": { name: "Full Name" }` to the `lecturers` map in `data.js`.
3. **`SPANS_BREAK: Entry spans across lunch break`**
   - *Resolution:* Classes cannot continue through the lunch break. Split into one morning entry (e.g. `P4`) and one afternoon entry (e.g. `P5`).
4. **`INVALID_BATCH: Batch must be non-null for lab entries`**
   - *Resolution:* Set `batch: "A"` or `batch: "B1"` for labs.
5. **`INVALID_BATCH: Batch must be null for non-lab entries`**
   - *Resolution:* Set `batch: null` for theory lectures.
6. **`PARALLEL_COLLISION: Lecturer is assigned to multiple classes simultaneously`**
   - *Resolution:* A single lecturer cannot be in two different theory classrooms at the exact same hour.

---

## 5. Contact & Support
For assistance with timetable data formatting, reach out to the College IT Coordinator or submit issues through the campus administrative portal.
