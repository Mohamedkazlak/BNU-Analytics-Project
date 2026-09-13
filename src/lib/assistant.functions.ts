import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ScopeError,
  assertCanRead,
  refusalFor,
  resolveScope,
  type DataDomain,
  type Scope,
} from "./ai-scope";
import type { Role } from "./types";
import { demoUserById, demoUserForRole } from "./mock-data";

const roleSchema = z.enum([
  "senior_management",
  "program_director",
  "academic_affairs",
  "professor",
  "it_academic_integrity",
  "student",
]);

const askSchema = z.object({
  role: roleSchema,
  userId: z.string().optional(),
  question: z.string().min(1).max(500),
});

export interface AssistantAnswer {
  text: string;
  blocked: boolean;
}

/** Names the assistant must never surface to a student, even if asked directly. */
const otherStudentNames = ["Amara", "Yusuf", "Lina", "Diego", "Noor", "Kwame", "Sofia", "Hiroshi"];

/**
 * Classify a question into the data domain it would have to read.
 * This runs on the raw text BEFORE any data access, so an out-of-scope question
 * is refused deterministically in code — it is never left to the model to obey.
 */
function classify(question: string, role: Role): DataDomain {
  const q = question.toLowerCase();
  const asksAboutPerson =
    otherStudentNames.some((n) => q.includes(n.toLowerCase())) ||
    /\b(who|whose|which student|student s-?\d+|top student|name of)\b/.test(q);

  if (/\b(ip|login|device|anomal|cheat|similar|flag|suspicio|monitor)\b/.test(q)) return "integrity_monitoring";
  if (/\b(rubric|marking|grading rationale|model answer|answer key)\b/.test(q)) return "grading_rationale";
  if (/\b(question text|item bank|exam content|show me the question)\b/.test(q)) return "exam_content";
  if (/\b(discrimination|difficulty|item analysis|distractor)\b/.test(q)) return "item_analysis";
  if (/\b(department|platform|institution|university-wide|term kpi)\b/.test(q)) return "institution_kpis";
  if (asksAboutPerson) return "named_students";
  if (/\b(class average|cohort|compared to others|peers)\b/.test(q)) return "anonymized_cohort";
  if (/\b(course|section|exam)\b/.test(q)) return role === "student" ? "own_performance" : "own_courses";
  return role === "student" ? "own_performance" : "own_courses";
}

/**
 * Answer builder. Every branch is reached only after `assertCanRead` passed for
 * the resolved scope, so the data it reads is already authorized.
 */
function answerWithin(scope: Scope, domain: DataDomain, question: string): string {
  switch (domain) {
    case "own_performance":
      return "Your average across this term is 74, which is 3.2 points above the class average. Chemistry is your weakest area — down 15% over your last 3 exams, mostly on stoichiometry items.";
    case "anonymized_cohort":
      return "Compared with the anonymized cohort, you sit in the top 35%. The class average is 70.8 and the median attempt takes 41 minutes; I can only show aggregates here, never individual classmates.";
    case "own_courses":
      return scope.canSeeAllCourses
        ? "Across courses in scope, CS 201 averages 72 and ENG 150 averages 64 — ENG 150 has slipped 8 points since the spring item bank went live."
        : "For your assigned sections (CS 201): CS 201 averages 72 with a 78% pass rate. Section B trails Section A by 6 points.";
    case "all_courses":
      return "Platform-wide, pass rates are down 4% this term. Engineering accounts for roughly two-thirds of the decline; Humanities is up 1%.";
    case "item_analysis":
      return "Three items are drifting toward needs-review: Q7 (discrimination 0.14), Q12 (0.19) and Q19 (0.21). Difficulty stayed flat, so wording is the likelier cause than content difficulty.";
    case "integrity_monitoring":
      return "There are 3 open flagged cases. The highest is scored 86/100 (High): a 14-minute submission against a 41-minute median, a shared IP with two attempts inside 9 minutes, and 92% answer-pattern similarity including 4 identical wrong answers.";
    case "institution_kpis":
      return "This term: 1,284 exams administered, 9,612 participants, overall pass rate down 3.2%. Engineering is forecast to fall from 68% to 61% by end of term, alongside a 38% rise in flagged integrity cases in the same department.";
    case "named_students":
      return "Here's the named breakdown you asked about, limited to the cohorts your role covers. Ask me for a specific exam and I'll list the attempts with scores and flags.";
    case "exam_content":
      return "I can show the item stems for exams in your courses — tell me the exam and question number.";
    case "grading_rationale":
      return `The marking scheme for that item is available in your course tools. ${question.length > 0 ? "" : ""}`.trim();
  }
}

/**
 * SERVER-SIDE PERMISSION ENFORCEMENT POINT.
 *
 * `role` is accepted from the client only because this demo has no auth yet.
 * In production, replace with the verified session.
 */
export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => askSchema.parse(data))
  .handler(async ({ data }): Promise<AssistantAnswer> => {
    // TODO(auth): derive the role from the verified session, not the payload.
    const role = data.role as Role;
    const user =
      (data.userId ? demoUserById(data.userId) : undefined) ??
      demoUserForRole(role);
    const scope = resolveScope({
      role: user.role,
      scopeId: user.role === "it_academic_integrity" ? null : user.scopeId,
      ...(user.studentId ? { studentId: user.studentId } : {}),
      ...(user.courseIds ? { courseIds: user.courseIds } : {}),
      canSeeAllCourses: user.role === "professor" ? false : true,
    });

    const domain = classify(data.question, user.role);

    try {
      // GATE: runs before the data layer is touched.
      assertCanRead(scope, domain);
    } catch (error) {
      if (error instanceof ScopeError) return { text: refusalFor(user.role, domain), blocked: true };
      throw error;
    }

    return { text: answerWithin(scope, domain, data.question), blocked: false };
  });
