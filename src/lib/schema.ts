/**
 * Row shapes for the PostgreSQL schema in `db/schema.sql`.
 * Dashboards still consume the denormalized view types in `types.ts`;
 * those views are projected from PostgreSQL via FastAPI.
 */
import type { AttemptStatus, ExamStatus, Role, ScopeLevel } from "./types";

export type AcademicStanding =
  "Excellent" | "Good standing" | "Watch list" | "At risk";

export interface OrgUnitRow {
  id: string;
  parentId: string | null;
  level: ScopeLevel;
  code: string;
  name: string;
  titleForRole: string;
}

export interface AcademicYearRow {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface TermRow {
  id: string;
  academicYearId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface PersonRow {
  id: string;
  fullName: string;
  email: string | null;
}

export interface StaffRow {
  personId: string;
  title: string;
  orgUnitId: string | null;
}

export interface StudentRow {
  id: string;
  personId: string;
  studentNumber: string;
  programId: string;
  section: string;
  cohortYear: number;
  status: "active" | "graduated" | "withdrawn";
}

export interface UserAccountRow {
  id: string;
  personId: string;
  role: Role;
  scopeId: string | null;
  studentId: string | null;
  isDemo: boolean;
}

export interface CourseRow {
  id: string;
  programId: string;
  code: string;
  name: string;
  credits: number;
  yearLevel: number;
}

export interface CourseOfferingRow {
  id: string;
  courseId: string;
  academicYearId: string;
  termId: string;
  instructorId: string;
}

export interface CourseSectionRow {
  id: string;
  offeringId: string;
  code: string;
}

export interface StaffCourseAssignmentRow {
  staffPersonId: string;
  courseId: string;
}

export interface EnrollmentRow {
  id: string;
  studentId: string;
  offeringId: string;
  sectionId: string;
}

export interface ExamRow {
  id: string;
  offeringId: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  questionCount: number;
  passMark: number;
  status: ExamStatus;
}

export interface QuestionRow {
  id: string;
  examId: string;
  number: number;
  topic: string;
  prompt: string;
  maxScore: number;
}

export interface ExamAttemptRow {
  id: string;
  examId: string;
  studentId: string;
  enrollmentId: string;
  score: number | null;
  timeTakenMin: number | null;
  startedAt: string | null;
  endedAt: string | null;
  ip: string | null;
  device: string | null;
  attemptCount: number;
  lateStart: boolean;
  status: AttemptStatus;
}

export interface TranscriptEntryRow {
  id: string;
  studentId: string;
  courseId: string;
  academicYearId: string;
  average: number;
  letterGrade: string;
  credits: number;
}

export interface IntegrityFlagRow {
  id: string;
  attemptId: string;
  flagType:
    | "multiple_attempts"
    | "fast_submission"
    | "late_start"
    | "shared_ip"
    | "similar_answers";
  detail: string;
}
