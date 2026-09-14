import { fetchFromBackend } from "./api";

/**
 * Insights/predictions are now computed server-side (backend/services/ai_insights.py)
 * from the same real, RLS-scoped repository data the dashboards use — see the
 * fix plan's Phase 1. The role used to select a template is read from the
 * verified JWT on the backend, never from anything sent by this client.
 */

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

export function getInsight(): Promise<Insight | null> {
  return fetchFromBackend<Insight | null>("/api/insights");
}

export function getPrediction(): Promise<Prediction | null> {
  return fetchFromBackend<Prediction | null>("/api/predictions");
}
