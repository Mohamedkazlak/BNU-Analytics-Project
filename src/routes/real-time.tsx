import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "@/components/legacy-redirect";
import { legacyLeafGuard } from "@/lib/auth/role-guards";

export const Route = createFileRoute("/real-time")({
  beforeLoad: legacyLeafGuard("/real-time"),
  component: () => <LegacyRedirect leaf="/real-time" />,
});
