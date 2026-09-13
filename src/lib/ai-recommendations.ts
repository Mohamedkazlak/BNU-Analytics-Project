import type { Role } from "./types";
import { assertCanRead, resolveScope, type Scope, type ScopeSession } from "./ai-scope";

export interface Recommendation {
  id: string;
  /** "action" = actionable (circle-check outline). "guidance" = advice only (alert-circle). */
  kind: "action" | "guidance";
  text: string;
  /** The insight or prediction that produced this line, plus the raw data points behind it. */
  basedOn: {
    source: string;
    evidence: { label: string; detail: string }[];
  };
  /**
   * Nothing auto-executes. Every button opens the confirmation step below first;
   * only after the human confirms does `to` (or the export) actually run.
   */
  action: {
    label: string;
    to?: string;
    confirmTitle: string;
    confirmBody: string;
    confirmLabel: string;
    /** true = triggers the existing export instead of navigating. */
    exports?: boolean;
  } | null;
}

export interface RecommendationSet {
  /** Traces back to the insight/prediction this plan was derived from. */
  insightId: string;
  items: Recommendation[];
}

function request<T>(payload: () => T, ms = 1100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(payload()), ms));
}

export function getRecommendations(session: ScopeSession, insightId: string): Promise<RecommendationSet | null> {
  const scope = resolveScope(session);
  return request(() => build(scope, insightId));
}

/**
 * SERVER-SIDE ENFORCEMENT PLACEHOLDER
 * In production this whole builder runs on the server against the verified
 * session, and the permission gate below runs BEFORE any row is read — the
 * client never receives a recommendation it is not authorised to see.
 */
function build(scope: Scope, insightId: string): RecommendationSet | null {
  switch (scope.role) {
    case "student": {
      assertCanRead(scope, "own_performance");
      return {
        insightId,
        items: [
          {
            id: "s1",
            kind: "action",
            text: "Review stoichiometry — practice set available",
            basedOn: {
              source: "Your recent Chemistry performance",
              evidence: [
                { label: "Topic score", detail: "Stoichiometry 41% vs your overall 66%" },
                { label: "Trend", detail: "−15% across your last 3 Chemistry exams" },
              ],
            },
            action: {
              label: "Open practice set",
              to: "/my-progress",
              confirmTitle: "Start the stoichiometry practice set?",
              confirmBody: "This opens a 12-question practice set. It is not graded and does not affect your average.",
              confirmLabel: "Start practice",
            },
          },
          {
            id: "s2",
            kind: "guidance",
            text: "You average 18 seconds on this topic vs 45s platform-wide — slow down on your next attempt",
            basedOn: {
              source: "Your pacing vs anonymised cohort",
              evidence: [
                { label: "Your pace", detail: "18s median per stoichiometry question" },
                { label: "Anonymised platform pace", detail: "45s median on the same questions" },
              ],
            },
            action: null,
          },
          {
            id: "s3",
            kind: "action",
            text: "Retake available: your next attempt window opens 21 Sep",
            basedOn: {
              source: "Your attempt history",
              evidence: [
                { label: "Attempts used", detail: "1 of 2 for Chemistry Unit 4" },
                { label: "Window", detail: "Opens 21 Sep, closes 28 Sep" },
              ],
            },
            action: {
              label: "Add reminder",
              confirmTitle: "Add a reminder for 21 Sep?",
              confirmBody: "We'll add a calendar reminder for the day your retake window opens. Nothing is booked and no attempt is started.",
              confirmLabel: "Add reminder",
            },
          },
        ],
      };
    }
    case "professor": {
      assertCanRead(scope, "item_analysis");
      return {
        insightId,
        items: [
          {
            id: "f1",
            kind: "action",
            text: "3 questions flagged for review — low discrimination index",
            basedOn: {
              source: "Insight: 3 questions are drifting toward needs-review",
              evidence: [
                { label: "Q7 · Recursion", detail: "Discrimination 0.11, difficulty unchanged" },
                { label: "Q12 · Complexity", detail: "Discrimination 0.14 across 2 cohorts" },
                { label: "Q19 · Pointers", detail: "Discrimination 0.17, borderline" },
              ],
            },
            action: {
              label: "Open in Item Analysis",
              to: "/item-analysis",
              confirmTitle: "Open the 3 flagged questions?",
              confirmBody: "Item Analysis opens filtered to Q7, Q12 and Q19. Nothing is changed or published.",
              confirmLabel: "Open questions",
            },
          },
          {
            id: "f2",
            kind: "action",
            text: "Section B is 22% below Section A on material introduced in week 6 — consider a review session",
            basedOn: {
              source: "Insight: section drift",
              evidence: [
                { label: "Section A", detail: "Week 6 topics: 74% mean" },
                { label: "Section B", detail: "Week 6 topics: 52% mean" },
                { label: "Cohort size", detail: "A: 61 students · B: 58 students" },
              ],
            },
            action: {
              label: "Compare sections",
              to: "/performance",
              confirmTitle: "Open the section comparison?",
              confirmBody: "This opens Section A vs Section B for week 6 material. No message is sent to students.",
              confirmLabel: "Open comparison",
            },
          },
          {
            id: "f3",
            kind: "action",
            text: "Suggested question rewrite available for Q14 (poor distractor pattern)",
            basedOn: {
              source: "Insight: distractor analysis",
              evidence: [
                { label: "Distractor B", detail: "Chosen by 0% of students — non-functional" },
                { label: "Distractor D", detail: "Chosen by 44% of high scorers" },
              ],
            },
            action: {
              label: "Review rewrite",
              to: "/item-analysis",
              confirmTitle: "Open the suggested rewrite for Q14?",
              confirmBody: "The AI-suggested wording opens as a draft for you to approve or edit. It is never published to students automatically.",
              confirmLabel: "Open draft",
            },
          },
        ],
      };
    }
    case "it_academic_integrity": {
      assertCanRead(scope, "integrity_monitoring");
      return {
        insightId,
        items: [
          {
            id: "i1",
            kind: "action",
            text: "Recommended for review: open an investigation case for S-018 / CS 201 Midterm",
            basedOn: {
              source: "Insight: fused risk score 86/100 (High)",
              evidence: [
                { label: "Timing anomaly", detail: "Submitted in 14 min vs 41 min cohort median" },
                { label: "IP overlap", detail: "Same IP as 2 other attempts within 9 minutes" },
                { label: "Answer similarity", detail: "92% identical pattern, including 4 wrong answers" },
              ],
            },
            action: {
              label: "Create case",
              to: "/integrity",
              confirmTitle: "Create an investigation case?",
              confirmBody: "A case is opened with the three evidence items pre-attached and marked recommended for review. No finding is recorded and no one is notified.",
              confirmLabel: "Create case",
            },
          },
          {
            id: "i2",
            kind: "action",
            text: "Notify the CS 201 course instructor of the anomaly",
            basedOn: {
              source: "Insight: fused risk score 86/100 (High)",
              evidence: [
                { label: "Course owner", detail: "CS 201 · Midterm" },
                { label: "Signals shared", detail: "Monitoring signals only — no grading rationale or answer content" },
              ],
            },
            action: {
              label: "Draft notification",
              confirmTitle: "Draft a notification to the instructor?",
              confirmBody: "This creates a draft only. You review the wording and must confirm again before anything is sent.",
              confirmLabel: "Create draft",
            },
          },
          {
            id: "i3",
            kind: "guidance",
            text: "Suggested action: review before grades are finalised — window closes 19 Sep",
            basedOn: {
              source: "Prediction: composite risk trend",
              evidence: [
                { label: "Grade finalisation", detail: "CS 201 closes 19 Sep, 23:59" },
                { label: "Open cases", detail: "2 of 3 flagged cases still unreviewed" },
              ],
            },
            action: null,
          },
        ],
      };
    }
    case "academic_affairs": {
      assertCanRead(scope, "institution_kpis");
      return {
        insightId,
        items: [
          {
            id: "a1",
            kind: "action",
            text: "Follow up with 4 students below the pass mark in CS 201",
            basedOn: {
              source: "Insight: attendance and at-risk students",
              evidence: [
                { label: "Below pass", detail: "4 students after latest sitting" },
                { label: "Curriculum", detail: "CS 201 · Section B" },
              ],
            },
            action: {
              label: "Open student performance",
              to: "/performance",
              confirmTitle: "Open student performance?",
              confirmBody: "Opens the college performance view. No messages are sent to students.",
              confirmLabel: "Open",
            },
          },
          {
            id: "a2",
            kind: "action",
            text: "Review CS 201 Section B attendance (78% vs 91% college average)",
            basedOn: {
              source: "Warning: attendance gap",
              evidence: [
                { label: "Section B", detail: "78% attendance this week" },
                { label: "College", detail: "91% across other Computer Science curricula" },
              ],
            },
            action: {
              label: "Open attendance",
              to: "/participation",
              confirmTitle: "Open attendance?",
              confirmBody: "Opens participation and attendance for every curriculum in the college.",
              confirmLabel: "Open",
            },
          },
          {
            id: "a3",
            kind: "guidance",
            text: "CS 202 and CS 301 performance is holding — keep the intervention focused on CS 201",
            basedOn: {
              source: "Insight: concentrated, not college-wide",
              evidence: [{ label: "Other curricula", detail: "Pass rates within 1 pt of last term" }],
            },
            action: null,
          },
        ],
      };
    }
    case "program_director": {
      assertCanRead(scope, "institution_kpis");
      return {
        insightId,
        items: [
          {
            id: "p1",
            kind: "action",
            text: "CS 201 pass rates trending down — review calibration with course instructors",
            basedOn: {
              source: "Insight: program pass-rate dip concentrated in CS 201",
              evidence: [
                { label: "CS 201", detail: "Pass rate trajectory 72% → 64%" },
                { label: "Program", detail: "Overall −5% this term" },
              ],
            },
            action: {
              label: "Open curriculum",
              to: "/courses",
              confirmTitle: "Open curriculum performance?",
              confirmBody: "Opens the course performance view for your program. Nothing is shared externally.",
              confirmLabel: "Open",
            },
          },
          {
            id: "p2",
            kind: "action",
            text: "3 Midterm II items flagged — schedule an item-review with faculty",
            basedOn: {
              source: "Warning: items flagged for review",
              evidence: [{ label: "Items", detail: "Q7, Q12, Q19 · low discrimination" }],
            },
            action: {
              label: "Open item analysis",
              to: "/item-analysis",
              confirmTitle: "Open item analysis?",
              confirmBody: "Opens item analysis for flagged questions. No items are published or retired.",
              confirmLabel: "Open",
            },
          },
          {
            id: "p3",
            kind: "action",
            text: "Export college performance summary for the sector dean",
            basedOn: {
              source: "Prediction: college pass rates",
              evidence: [{ label: "Scope", detail: "Every curriculum in this college · current term" }],
            },
            action: {
              label: "Export report",
              exports: true,
              confirmTitle: "Export the program summary?",
              confirmBody: "Generates the same export as Export Report, scoped to your program.",
              confirmLabel: "Export",
            },
          },
        ],
      };
    }
    case "senior_management": {
      assertCanRead(scope, "institution_kpis");
      return {
        insightId,
        items: [
          {
            id: "m1",
            kind: "action",
            text: "Engineering pass rates trending down — recommend reviewing exam calibration with the department head",
            basedOn: {
              source: "Insight: the pass-rate dip is concentrated",
              evidence: [
                { label: "Engineering", detail: "Pass rate 68% → 61% projected this term" },
                { label: "Platform", detail: "−4% overall, two-thirds of it in Engineering" },
              ],
            },
            action: {
              label: "Open department drill-down",
              to: "/courses",
              confirmTitle: "Open the Engineering drill-down?",
              confirmBody: "This opens the department view filtered to Engineering. Nothing is shared with the department head.",
              confirmLabel: "Open drill-down",
            },
          },
          {
            id: "m2",
            kind: "action",
            text: "Integrity case volume up 30% in Engineering — recommend an audit",
            basedOn: {
              source: "Insight + integrity trend",
              evidence: [
                { label: "Flagged cases", detail: "+38% term over term in Engineering" },
                { label: "Platform baseline", detail: "+8% across all other departments" },
              ],
            },
            action: {
              label: "Open filtered cases",
              to: "/integrity",
              confirmTitle: "Open the filtered case list?",
              confirmBody: "The monitoring log opens filtered to Engineering cases. No audit is started and no case status changes.",
              confirmLabel: "Open case list",
            },
          },
          {
            id: "m3",
            kind: "action",
            text: "Export this quarter's flagged trends for board reporting",
            basedOn: {
              source: "Prediction: department pass rates",
              evidence: [
                { label: "Period", detail: "Q3 · all departments" },
                { label: "Contents", detail: "Pass-rate trajectory and flagged-case volume by department" },
              ],
            },
            action: {
              label: "Export report",
              exports: true,
              confirmTitle: "Export the quarterly trend report?",
              confirmBody: "This generates the same report as the Export Report button, scoped to this quarter's flagged trends.",
              confirmLabel: "Export",
            },
          },
        ],
      };
    }
  }
}

/** Convenience for callers that only have a role to hand. */
export type { Role };
