import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "@/components/legacy-redirect";
import { legacyLeafGuard } from "@/lib/auth/role-guards";

export const Route = createFileRoute("/item-analysis")({
  beforeLoad: legacyLeafGuard("/item-analysis"),
  component: () => <LegacyRedirect leaf="/item-analysis" />,
});
