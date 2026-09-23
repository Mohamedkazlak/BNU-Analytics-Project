import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "@/components/legacy-redirect";
import { legacyLeafGuard } from "@/lib/auth/role-guards";

export const Route = createFileRoute("/exam-activity")({
  beforeLoad: legacyLeafGuard("/exam-activity"),
  component: () => <LegacyRedirect leaf="/exam-activity" />,
});
