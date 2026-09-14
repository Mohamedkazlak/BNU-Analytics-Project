import { fetchFromBackend } from "./api";

/**
 * Recommendations are now computed server-side from the same real,
 * RLS-scoped data as the insight/prediction panels — see backend/services/
 * ai_insights.py (fix plan Phase 1). `action` blocks are UI navigation
 * wiring (route + confirmation copy); nothing auto-executes, matching the
 * original confirm-before-act design.
 */

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

export function getRecommendations(insightId: string): Promise<RecommendationSet | null> {
  return fetchFromBackend<RecommendationSet | null>(
    `/api/recommendations?insightId=${encodeURIComponent(insightId)}`,
  );
}
