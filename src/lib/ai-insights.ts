import type { Role } from "./types";
import {
  assertCanRead,
  resolveScope,
  type Scope,
  type ScopeSession,
} from "./ai-scope";
import {
  currentStudentId,
  demoUserById,
  demoUserForRole,
  orgScopeById,
  programNamesInScope,
  courses,
} from "./mock-data";
import { getActiveDemoUserId } from "./role-guards";

function collegesFor(scope: Scope): string[] {
  return programNamesInScope(scope.scopeId);
}

function curriculaFor(scope: Scope) {
  const programs = collegesFor(scope);
  let list = courses.filter((c) => programs.includes(c.program));
  if (scope.role === "professor" && scope.courseIds?.length) {
    list = list.filter((c) => scope.courseIds!.includes(c.id));
  }
  return list;
}

function collegeName(scope: Scope): string {
  const node = scope.scopeId ? orgScopeById(scope.scopeId) : undefined;
  if (node?.level === "program") return node.name;
  return collegesFor(scope)[0] ?? "this college";
}

export interface InsightEvidence {
  label: string;
  detail: string;
  weight: number; // 0-100 contribution to the fused score
}

export interface RiskCase {
  id: string;
  subject: string;
  exam: string;
  level: "Low" | "Medium" | "High";
  score: number;
  evidence: InsightEvidence[];
}

export interface Insight {
  headline: string;
  body: string;
  action: { label: string; to: string } | null;
  /** Integrity: fused per-case risk instead of separate alerts. */
  cases?: RiskCase[];
  /** Staff warnings strip — omitted for students. */
  warnings?: { id: string; text: string; tone: "amber" | "rose" }[];
}

export interface Prediction {
  title: string;
  direction: "rising" | "stable" | "falling";
  summary: string;
  rows: {
    label: string;
    value: string;
    tone: "mint" | "amber" | "rose" | "iris";
  }[];
  action: { label: string; to: string } | null;
}

/** Simulated latency so the loading skeletons are exercised. */
function request<T>(payload: () => T, ms = 900): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(payload()), ms));
}

/**
 * Demo session. In production this is read from the verified auth cookie on the
 * server — never from a prop, query string or client-side store.
 */
export function demoSession(role: Role): ScopeSession {
  const active = demoUserById(getActiveDemoUserId());
  const user = active?.role === role ? active : demoUserForRole(role);
  switch (role) {
    case "student":
      return {
        role,
        studentId: user.studentId ?? currentStudentId,
        scopeId: user.scopeId,
      };
    case "professor":
      return {
        role,
        scopeId: user.scopeId,
        courseIds: user.courseIds ?? ["c1"],
        canSeeAllCourses: false,
      };
    case "it_academic_integrity":
      return { role, scopeId: null };
    default:
      return { role, scopeId: user.scopeId };
  }
}

export function getInsight(session: ScopeSession): Promise<Insight | null> {
  const scope = resolveScope(session);
  return request(() => buildInsight(scope));
}

export function getPrediction(
  session: ScopeSession,
): Promise<Prediction | null> {
  const scope = resolveScope(session);
  return request(() => buildPrediction(scope), 1200);
}

function buildInsight(scope: Scope): Insight | null {
  switch (scope.role) {
    case "student":
      return null;
    case "professor": {
      assertCanRead(scope, "item_analysis");
      const mine = curriculaFor(scope);
      const codes = mine.map((c) => c.code).join(", ") || "your courses";
      return {
        headline: `3 questions are drifting toward needs-review in ${codes}`,
        body: `Across the last 2 cohorts in ${codes}, Q7, Q12 and Q19 lost discrimination power while difficulty stayed flat — a sign the wording or the distractors are leaking the answer rather than the topic getting harder.`,
        action: { label: "Open flagged questions", to: "/item-analysis" },
        warnings: [
          {
            id: "w1",
            text: `Section B attendance in ${codes} dipped below 80% this week`,
            tone: "amber",
          },
          {
            id: "w2",
            text: `2 students in ${codes} are below the pass mark after Midterm II`,
            tone: "rose",
          },
        ],
      };
    }
    case "it_academic_integrity": {
      assertCanRead(scope, "integrity_monitoring");
      return {
        headline: "3 flagged cases across live university sittings",
        body: "Every in-progress exam at Benha National University is on the live monitor. Timing anomalies, shared IPs and answer similarity are combined into a single risk score per case, so overlapping alerts no longer read as separate incidents.",
        action: { label: "Open case detail", to: "/integrity" },
        warnings: [
          {
            id: "w1",
            text: "High-risk case S-018 still unreviewed — grade window closes 19 Sep",
            tone: "rose",
          },
          {
            id: "w2",
            text: "Remote-sitting IP overlap volume up 12% week over week university-wide",
            tone: "amber",
          },
        ],
        cases: [
          {
            id: "case-1",
            subject: "Student S-018",
            exam: "CS 201 · Midterm",
            level: "High",
            score: 86,
            evidence: [
              {
                label: "Timing anomaly",
                detail: "Submitted in 14 min vs 41 min cohort median",
                weight: 34,
              },
              {
                label: "IP overlap",
                detail: "Same IP as 2 other attempts within 9 minutes",
                weight: 30,
              },
              {
                label: "Answer similarity",
                detail:
                  "92% identical answer pattern, including 4 wrong answers",
                weight: 22,
              },
            ],
          },
          {
            id: "case-2",
            subject: "Student S-024",
            exam: "MED 110 · Lab Practical",
            level: "Medium",
            score: 58,
            evidence: [
              {
                label: "Timing anomaly",
                detail: "Two long idle gaps then a 90-second answer burst",
                weight: 26,
              },
              {
                label: "Device change",
                detail: "Switched device mid-attempt",
                weight: 18,
              },
              {
                label: "Answer similarity",
                detail: "71% pattern overlap with one peer",
                weight: 14,
              },
            ],
          },
          {
            id: "case-3",
            subject: "Student S-031",
            exam: "ENG 210 · Midterm",
            level: "Low",
            score: 24,
            evidence: [
              {
                label: "IP overlap",
                detail: "Shared campus lab IP — expected for on-site sittings",
                weight: 14,
              },
              {
                label: "Timing anomaly",
                detail: "Slightly fast finish, within one deviation",
                weight: 10,
              },
            ],
          },
        ],
      };
    }
    case "academic_affairs": {
      assertCanRead(scope, "institution_kpis");
      const college = collegeName(scope);
      const codes = curriculaFor(scope)
        .map((c) => c.code)
        .join(", ");
      return {
        headline: `Attendance and at-risk students concentrated in ${college}`,
        body: `Across every ${college} curriculum (${codes}), CS 201 Section B attendance is 78% and 4 students sit below the pass mark. The other curricula are holding — this is a student-performance and attendance issue, not a college-wide one.`,
        action: { label: "Open student performance", to: "/performance" },
        warnings: [
          {
            id: "w1",
            text: "4 students below pass mark after the latest sitting — follow up this week",
            tone: "rose",
          },
          {
            id: "w2",
            text: "CS 201 Section B attendance 78% vs 91% college average",
            tone: "amber",
          },
        ],
      };
    }
    case "program_director": {
      assertCanRead(scope, "institution_kpis");
      const college = collegeName(scope);
      const codes = curriculaFor(scope).map((c) => c.code);
      const lead = codes[0] ?? college;
      return {
        headline: `${college} pass-rate dip is concentrated in ${lead}`,
        body: `${college} pass rates are down 5% this term. Two-thirds of the drop sits in ${lead} — the same curriculum where item discrimination weakened — while ${codes.slice(1).join(" and ") || "the rest of the college"} held steady.`,
        action: { label: "Drill into curricula", to: "/courses" },
        warnings: [
          {
            id: "w1",
            text: `${lead} projected to finish 6 pts below college target`,
            tone: "rose",
          },
          {
            id: "w2",
            text: "3 items in Midterm II flagged for review before finals",
            tone: "amber",
          },
        ],
      };
    }
    case "senior_management": {
      assertCanRead(scope, "institution_kpis");
      const node = scope.scopeId ? orgScopeById(scope.scopeId) : undefined;
      const colleges = collegesFor(scope);
      if (node?.level === "sector") {
        const lead = colleges.includes("Computer Science")
          ? "Computer Science"
          : colleges[0]!;
        return {
          headline: `${lead} is pulling the sector pass rate down`,
          body: `Across the ${colleges.length} colleges you supervise (${colleges.join(", ")}), two-thirds of this term's dip sits in ${lead}. The other colleges in your sector are within 1 point of last term.`,
          action: { label: "Open college curricula", to: "/courses" },
          warnings: [
            {
              id: "w1",
              text: `${lead} forecast: 68% → 61% pass rate by term end`,
              tone: "rose",
            },
            {
              id: "w2",
              text: `Integrity flags +38% in ${lead} vs +8% in the rest of the sector`,
              tone: "amber",
            },
          ],
        };
      }
      return {
        headline: "The pass-rate dip is concentrated, not university-wide",
        body: "Pass rates are down 4% across Benha National University this term, but two-thirds of the drop sits in Engineering and Basic & Applied Sciences — the same sector where flagged integrity cases rose 38%. Health Sciences and Humanities are holding.",
        action: { label: "Drill into Engineering", to: "/courses" },
        warnings: [
          {
            id: "w1",
            text: "Engineering sector forecast: 68% → 61% pass rate by term end",
            tone: "rose",
          },
          {
            id: "w2",
            text: "Integrity flags +38% in Engineering vs +8% elsewhere",
            tone: "amber",
          },
        ],
      };
    }
  }
}

function buildPrediction(scope: Scope): Prediction | null {
  switch (scope.role) {
    case "student":
      return null;
    case "professor": {
      assertCanRead(scope, "item_analysis");
      const codes = curriculaFor(scope).map((c) => c.code).join(", ");
      return {
        title: `Forecast · item-quality drift · ${codes}`,
        direction: "rising",
        summary:
          "These questions in your curricula are trending toward the needs-review threshold but haven't crossed it yet.",
        rows: [
          {
            label: "Q7 · Recursion",
            value: "Crosses in ~1 cohort",
            tone: "rose",
          },
          {
            label: "Q12 · Complexity",
            value: "Crosses in ~2 cohorts",
            tone: "amber",
          },
          { label: "Q19 · Pointers", value: "Borderline, watch", tone: "iris" },
        ],
        action: { label: "Review items", to: "/item-analysis" },
      };
    }
    case "it_academic_integrity":
      assertCanRead(scope, "integrity_monitoring");
      return {
        title: "Forecast · university composite risk",
        direction: "rising",
        summary:
          "Composite risk has risen for 3 consecutive sittings university-wide, driven mainly by IP overlap during remote exams.",
        rows: [
          { label: "Computer Science", value: "Rising · +12 pts", tone: "rose" },
          { label: "Medicine", value: "Stable", tone: "iris" },
          { label: "Engineering", value: "Falling · −6 pts", tone: "mint" },
        ],
        action: { label: "Open live monitoring", to: "/real-time" },
      };
    case "academic_affairs": {
      assertCanRead(scope, "institution_kpis");
      const college = collegeName(scope);
      const codes = curriculaFor(scope).map((c) => c.code);
      return {
        title: `Forecast · ${college} attendance & performance`,
        direction: "falling",
        summary: `Projected end-of-term attendance and pass rates for every ${college} curriculum.`,
        rows: [
          {
            label: codes[0] ?? college,
            value: "Attendance 91% → 78%",
            tone: "rose",
          },
          {
            label: codes[1] ?? "College overall",
            value: "Pass rate 76% → 71%",
            tone: "amber",
          },
          {
            label: codes[2] ?? "Upper-year",
            value: "Stable 82%",
            tone: "mint",
          },
        ],
        action: { label: "Open attendance", to: "/participation" },
      };
    }
    case "program_director": {
      assertCanRead(scope, "institution_kpis");
      const college = collegeName(scope);
      const codes = curriculaFor(scope).map((c) => c.code);
      return {
        title: `Forecast · ${college} pass rates`,
        direction: "falling",
        summary: `Projected end-of-term pass rates for every ${college} curriculum.`,
        rows: [
          { label: codes[0] ?? college, value: "72% → 64%", tone: "rose" },
          { label: `${college} overall`, value: "76% → 71%", tone: "amber" },
          {
            label: codes.slice(1).join(" · ") || "Other curricula",
            value: "81% → 82%",
            tone: "mint",
          },
        ],
        action: { label: "Open curriculum view", to: "/courses" },
      };
    }
    case "senior_management": {
      assertCanRead(scope, "institution_kpis");
      const node = scope.scopeId ? orgScopeById(scope.scopeId) : undefined;
      const colleges = collegesFor(scope);
      if (node?.level === "sector") {
        return {
          title: `Forecast · ${node.name} colleges`,
          direction: "falling",
          summary: `Projected end-of-term pass rates for the colleges you supervise.`,
          rows: colleges.slice(0, 3).map((college, i) => ({
            label: college,
            value:
              i === 0 ? "68% → 61%" : i === 1 ? "74% → 72%" : "81% → 82%",
            tone: (i === 0 ? "rose" : i === 1 ? "amber" : "mint") as
              | "rose"
              | "amber"
              | "mint",
          })),
          action: { label: "Open college view", to: "/courses" },
        };
      }
      return {
        title: "Forecast · sector pass rates",
        direction: "falling",
        summary:
          "Projected end-of-term pass rates by sector, based on this term's exam-by-exam trajectory.",
        rows: [
          {
            label: "Engineering & Applied Sciences",
            value: "68% → 61%",
            tone: "rose",
          },
          { label: "Health Sciences", value: "74% → 72%", tone: "amber" },
          {
            label: "Literature, Arts & Humanities",
            value: "81% → 82%",
            tone: "mint",
          },
        ],
        action: { label: "Open curriculum view", to: "/courses" },
      };
    }
  }
}
