import { createFileRoute } from "@tanstack/react-router";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";
import { roleGuard } from "@/lib/auth/role-guards";
import { useRole } from "@/components/role-context";

export const Route = createFileRoute("/management")({
  beforeLoad: roleGuard("/management"),
  head: () => ({
    meta: [
      { title: "Senior Management Overview — BNU" },
      {
        name: "description",
        content:
          "Scoped exam volume, participation and pass-rate analytics for university leadership.",
      },
      { property: "og:title", content: "Senior Management Overview — BNU" },
      {
        property: "og:description",
        content:
          "Scoped exam volume, participation and pass-rate analytics for university leadership.",
      },
    ],
  }),
  component: ManagementShell,
});

function ManagementShell() {
  const { affiliation } = useRole();
  return (
    <OverviewDashboard
      role="senior_management"
      scopeLabel={affiliation.label}
    />
  );
}
