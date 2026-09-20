import { createFileRoute } from "@tanstack/react-router";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";
import { roleGuard } from "@/lib/auth/role-guards";
import { useRole } from "@/components/role-context";

export const Route = createFileRoute("/program-director")({
  beforeLoad: roleGuard("/program-director"),
  head: () => ({
    meta: [
      { title: "College Dashboard — BNU" },
      {
        name: "description",
        content:
          "College-scoped exam analytics, AI insights and recommendations for program directors.",
      },
      { property: "og:title", content: "College Dashboard — BNU" },
      {
        property: "og:description",
        content:
          "College-scoped exam analytics, AI insights and recommendations for program directors.",
      },
    ],
  }),
  component: ProgramDirectorShell,
});

function ProgramDirectorShell() {
  const { affiliation } = useRole();
  return (
    <OverviewDashboard role="program_director" scopeLabel={affiliation.label} />
  );
}
