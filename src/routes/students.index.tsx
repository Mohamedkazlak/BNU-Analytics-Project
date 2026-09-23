import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "@/components/legacy-redirect";
import { legacyLeafGuard } from "@/lib/auth/role-guards";

export const Route = createFileRoute("/students/")({
  beforeLoad: legacyLeafGuard("/students"),
  component: () => <LegacyRedirect leaf="/students" />,
});
