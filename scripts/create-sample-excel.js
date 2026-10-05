import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const rows = [
  {
    "Date": "2026-01-05",
    "End Date": "2026-01-06",
    "Title": "Even Semester Commencement & Orientation",
    "Type": "semester",
    "Description": "Academic orientation and syllabus briefing for all diploma branches",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "College"
  },
  {
    "Date": "2026-02-16",
    "End Date": "2026-02-18",
    "Title": "Internal Assessment - I (CIE-1)",
    "Type": "exam",
    "Description": "Continuous Internal Evaluation - 1 (Even Semester)",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "Institution"
  },
  {
    "Date": "2026-02-27",
    "End Date": "",
    "Title": "Department Academic Review Meeting",
    "Type": "meeting",
    "Description": "Faculty syllabus completion and student attendance review",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "Faculty"
  },
  {
    "Date": "2026-03-23",
    "End Date": "2026-03-25",
    "Title": "Internal Assessment - II (CIE-2)",
    "Type": "exam",
    "Description": "Continuous Internal Evaluation - 2 (Even Semester)",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "Institution"
  },
  {
    "Date": "2026-04-10",
    "End Date": "",
    "Title": "Assignment & Lab Records Submission Deadline",
    "Type": "deadline",
    "Description": "Final submission of graded assignments and verified lab records",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "Students"
  },
  {
    "Date": "2026-04-17",
    "End Date": "",
    "Title": "Parent-Teacher Meeting (PTM)",
    "Type": "meeting",
    "Description": "Review of student attendance, IA marks, and board exam readiness",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "College"
  },
  {
    "Date": "2026-04-24",
    "End Date": "2026-04-25",
    "Title": "Annual Polytechnic Tech Fest & Project Expo",
    "Type": "event",
    "Description": "Inter-departmental student technical competition and working models expo",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "College"
  },
  {
    "Date": "2026-05-04",
    "End Date": "2026-05-09",
    "Title": "Board Practical Examinations",
    "Type": "exam",
    "Description": "Board of Technical Examinations (BTE) Karnataka Practical Exams",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "BTE"
  },
  {
    "Date": "2026-05-18",
    "End Date": "2026-06-05",
    "Title": "Board Theory Examinations",
    "Type": "exam",
    "Description": "BTE Karnataka Semester End Theory Examinations",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "BTE"
  },
  {
    "Date": "2026-06-15",
    "End Date": "2026-07-31",
    "Title": "Summer Vacation & Industrial Internship",
    "Type": "academic",
    "Description": "Mandatory industrial internship for students and faculty FDPs",
    "Branch": "All",
    "Semester": "IV/VI",
    "Section": "All",
    "Scope": "Academic"
  },
  {
    "Date": "2026-08-03",
    "End Date": "",
    "Title": "Odd Semester Academic Session Commencement",
    "Type": "semester",
    "Description": "Commencement of classes for Odd Semesters (I, III, V Sem)",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "College"
  },
  {
    "Date": "2026-09-15",
    "End Date": "",
    "Title": "Sir M. Visvesvaraya Engineers Day Celebration",
    "Type": "event",
    "Description": "Commemoration of Sir MV, expert keynote lecture & technical quiz",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "Institution"
  },
  {
    "Date": "2026-10-14",
    "End Date": "2026-10-16",
    "Title": "Internal Assessment - I (CIE-1)",
    "Type": "exam",
    "Description": "First Continuous Internal Assessment for Odd Semester",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "Institution"
  },
  {
    "Date": "2026-10-28",
    "End Date": "",
    "Title": "Diploma Project Phase-1 Progress Review",
    "Type": "deadline",
    "Description": "Submission of project synopsis and progress presentation for V sem",
    "Branch": "All",
    "Semester": "V",
    "Section": "All",
    "Scope": "Academic"
  },
  {
    "Date": "2026-11-16",
    "End Date": "2026-11-18",
    "Title": "Internal Assessment - II (CIE-2)",
    "Type": "exam",
    "Description": "Second Continuous Internal Assessment for Odd Semester",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "Institution"
  },
  {
    "Date": "2026-11-23",
    "End Date": "",
    "Title": "Academic Council & Exam Preparedness Meeting",
    "Type": "meeting",
    "Description": "Review of attendance eligibility, internal marks, and exam scheduling",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "Faculty"
  },
  {
    "Date": "2026-12-01",
    "End Date": "2026-12-08",
    "Title": "Board Practical Examinations",
    "Type": "exam",
    "Description": "Board of Technical Examinations Practical Labs (Odd Sem)",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "BTE"
  },
  {
    "Date": "2026-12-14",
    "End Date": "2026-12-31",
    "Title": "Board Theory Examinations",
    "Type": "exam",
    "Description": "Board of Technical Examinations Theory Exams (Odd Sem)",
    "Branch": "All",
    "Semester": "All",
    "Section": "All",
    "Scope": "BTE"
  }
];

const targetDir = path.resolve("data");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "AcademicCalendar2026");

const targetFile = path.join(targetDir, "academic-calendar.xlsx");
XLSX.writeFile(workbook, targetFile);

console.log(`[Sample Excel Generator] Created ${targetFile} with ${rows.length} institutional events.`);
