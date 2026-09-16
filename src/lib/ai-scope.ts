import type { Role } from "./types";

/**
 * ---------------------------------------------------------------------------
 * ACCESS MATRIX — single source of truth for what the AI layer may read.
 * ---------------------------------------------------------------------------
 * This module is intentionally free of UI concerns so it can run on the server.
 * Every AI feature (insights, predictions, chatbot) resolves a scope here and
 * the data layer refuses to answer anything the scope does not allow.
 *
 * The scope is derived from the ROLE ON THE SESSION, never from a value the
 * browser sends, and never from a prompt instruction the model could ignore.
 */

export type DataDomain =
  | "own_performance" // the signed-in student's own attempts/scores
  | "anonymized_cohort" // aggregate/anonymized class or cohort comparisons
  | "named_students" // any other person's name, score or identity
  | "own_courses" // courses/sections the instructor owns
  | "all_courses" // every course on the platform
  | "item_analysis" // question-level quality data
  | "grading_rationale" // rubrics, marking notes, model answers
  | "exam_content" // raw question text / item bank
  | "integrity_monitoring" // login, IP, device, timing, similarity signals
  | "institution_kpis"; // department/platform-level KPIs and forecasts

export interface Scope {
  role: Role;
  /** Domains this role may read. */
  allow: DataDomain[];
  /** Org tree node. `null` / undefined = no org filter (IT or university-wide). */
  scopeId?: string | null;
  /** Set for students: rows must be filtered to this subject id. */
  subjectStudentId?: string | undefined;
  /** Set for instructors without the "all courses" permission flag. */
  courseIds?: string[] | undefined;
  /** Instructor permission flag — when true, widens reads to every course. */
  canSeeAllCourses: boolean;
}

export interface ScopeSession {
  role: Role;
  /** `null` = global / no filter (it_academic_integrity). */
  scopeId?: string | null;
  studentId?: string;
  courseIds?: string[];
  canSeeAllCourses?: boolean;
}

const staffKpiDomains: DataDomain[] = [
  "institution_kpis",
  "all_courses",
  "item_analysis",
  "exam_content",
  "grading_rationale",
  "integrity_monitoring",
  "named_students",
  "anonymized_cohort",
  "own_performance",
];

export function resolveScope(session: ScopeSession): Scope {
  const scopeId = session.scopeId ?? null;
  const base = {
    role: session.role,
    scopeId,
    canSeeAllCourses: Boolean(session.canSeeAllCourses),
  };

  switch (session.role) {
    case "student":
      return {
        ...base,
        allow: ["own_performance", "anonymized_cohort"],
        subjectStudentId: session.studentId,
        canSeeAllCourses: false,
      };
    case "professor":
      return {
        ...base,
        allow: [
          session.canSeeAllCourses ? "all_courses" : "own_courses",
          "item_analysis",
          "exam_content",
          "grading_rationale",
          "anonymized_cohort",
          "named_students",
        ],
        courseIds: session.canSeeAllCourses
          ? undefined
          : (session.courseIds ?? []),
      };
    case "it_academic_integrity":
      // Global scope (null) — monitoring signals across the university.
      return {
        ...base,
        scopeId: null,
        allow: [
          "integrity_monitoring",
          "named_students",
          "anonymized_cohort",
          "institution_kpis",
        ],
        canSeeAllCourses: true,
      };
    case "academic_affairs":
      return {
        ...base,
        allow: [
          "named_students",
          "anonymized_cohort",
          "own_courses",
          "all_courses",
          "institution_kpis",
          "item_analysis",
        ],
        canSeeAllCourses: true,
      };
    case "program_director":
      return {
        ...base,
        allow: staffKpiDomains,
        canSeeAllCourses: true,
      };
    case "senior_management":
      return {
        ...base,
        allow: staffKpiDomains,
        canSeeAllCourses: true,
      };
  }
}

export function canRead(scope: Scope, domain: DataDomain): boolean {
  return scope.allow.includes(domain);
}

export class ScopeError extends Error {
  constructor(public domain: DataDomain) {
    super(`Not authorized to read ${domain}`);
  }
}

/**
 * Hard gate. Call this BEFORE touching the data layer — not after building a
 * result, and never as a instruction inside a model prompt.
 *
 * SERVER-SIDE ENFORCEMENT POINT:
 *   In production, `session` comes from the verified auth cookie / JWT and this
 *   assertion runs inside the server function (see `assistant.functions.ts`)
 *   and again in the database policy (row-level security scoped to
 *   `auth.uid()`), so a forged client payload cannot widen the scope.
 */
export function assertCanRead(scope: Scope, domain: DataDomain): void {
  if (!canRead(scope, domain)) throw new ScopeError(domain);
}

/** Human-readable refusal, used when a question falls outside the scope. */
export function refusalFor(role: Role, domain: DataDomain): string {
  if (role === "student" && domain === "named_students")
    return "I can't share another student's name, score or personal data. I can compare you against the anonymized class average instead — want that?";
  if (role === "professor" && domain === "all_courses")
    return "That covers courses outside the sections assigned to you. Ask your administrator to enable platform-wide access if you need it.";
  if (
    role === "it_academic_integrity" &&
    (domain === "exam_content" || domain === "grading_rationale")
  )
    return "Integrity access covers monitoring signals only — raw exam content and grading rationale aren't available here.";
  return "That data is outside what your role is authorized to see, so I can't answer it.";
}
