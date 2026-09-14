import type { Attempt, Course, DemoUser, Exam, Role, Student } from "./types";
import {
  affiliationForScope,
  attempts,
  courses,
  demoUserById,
  demoUserForRole,
  enrollments,
  exams,
  orgScopeById,
  programNamesInScope,
  questions,
  students,
} from "./mock-data";
import { getActiveDemoRole, getActiveDemoUserId } from "./role-guards";

/**
 * Resolved view for the signed-in persona. Dashboards, reports and AI copy
 * all filter through this — never through a client-supplied college list.
 */
export interface ViewerScope {
  userId: string;
  role: Role;
  scopeId: string | null;
  programs: string[];
  courseIds: string[];
  courseCodes: string[];
  label: string;
  level: "university" | "sector" | "program" | "course" | "global";
}

export function viewerScopeFor(user: DemoUser): ViewerScope {
  const programs = programNamesInScope(user.scopeId);
  let courseList = courses.filter((c) => programs.includes(c.program));

  if (user.role === "professor" && user.courseIds?.length) {
    courseList = courses.filter((c) => user.courseIds!.includes(c.id));
  }

  if (user.role === "student") {
    const own = students.find((s) => s.id === user.studentId);
    courseList = own
      ? courses.filter((c) => c.program === own.program)
      : courseList;
  }

  const node = user.scopeId ? orgScopeById(user.scopeId) : undefined;
  let level: ViewerScope["level"] = "university";
  let label = "Benha National University · university-wide";

  if (user.role === "it_academic_integrity") {
    level = "global";
    label = "University-wide · live exam monitoring";
  } else if (user.role === "professor") {
    level = "course";
    label = courseList.length
      ? `${courseList.map((c) => c.code).join(", ")} · assigned curriculum`
      : "Assigned curriculum";
  } else if (node?.level === "sector") {
    level = "sector";
    label = `${node.name} · ${programs.length} colleges`;
  } else if (node?.level === "program") {
    level = "program";
    label = `${node.name} · college`;
  } else if (node?.level === "university" || !user.scopeId) {
    const aff = affiliationForScope(user.scopeId);
    level = "university";
    label = `${aff.university} · university-wide`;
  }

  return {
    userId: user.id,
    role: user.role,
    scopeId: user.scopeId,
    programs,
    courseIds: courseList.map((c) => c.id),
    courseCodes: courseList.map((c) => c.code),
    label,
    level,
  };
}

export function getActiveViewerScope(): ViewerScope {
  const userId = getActiveDemoUserId();
  const role = getActiveDemoRole();
  const user = userId
    ? (demoUserById(userId) ?? demoUserForRole(role || "senior_management"))
    : demoUserForRole("senior_management");
  return viewerScopeFor(user);
}

export function coursesInScope(scope: ViewerScope): Course[] {
  return courses.filter((c) => scope.courseIds.includes(c.id));
}

export function examsInScope(scope: ViewerScope): Exam[] {
  return exams.filter((e) => scope.courseIds.includes(e.courseId));
}

export function studentsInScope(scope: ViewerScope): Student[] {
  if (scope.role === "student") {
    const user = demoUserById(scope.userId);
    return students.filter((s) => s.id === user?.studentId);
  }
  if (scope.role === "professor") {
    const ids = new Set(
      enrollments
        .filter((e) => scope.courseIds.includes(e.courseId))
        .map((e) => e.studentId),
    );
    return students.filter((s) => ids.has(s.id));
  }
  return students.filter((s) => scope.programs.includes(s.program));
}

export function attemptsInScope(scope: ViewerScope): Attempt[] {
  const examIds = new Set(examsInScope(scope).map((e) => e.id));
  const studentIds = new Set(studentsInScope(scope).map((s) => s.id));
  return attempts.filter(
    (a) => examIds.has(a.examId) && studentIds.has(a.studentId),
  );
}

export function questionsInScope(scope: ViewerScope) {
  const examIds = new Set(examsInScope(scope).map((e) => e.id));
  return questions.filter((q) => examIds.has(q.examId));
}

export function studentInViewerScope(
  scope: ViewerScope,
  studentId: string,
): boolean {
  return studentsInScope(scope).some((s) => s.id === studentId);
}
