export interface Recommendation {
  id: string;
  kind: "action" | "guidance";
  text: string;
  basedOn: {
    source: string;
    evidence: { label: string; detail: string }[];
  };
  action: {
    label: string;
    to?: string;
    confirmTitle: string;
    confirmBody: string;
    confirmLabel: string;
    exports?: boolean;
  } | null;
}

export interface RecommendationSet {
  insightId: string;
  items: Recommendation[];
}
