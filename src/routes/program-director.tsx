import { createFileRoute } from "@tanstack/react-router";
import { OverviewDashboard } from "@/components/overview-dashboard";
import { roleGuard } from "@/lib/role-guards";
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
  const { viewer } = useRole();
  return (
    <OverviewDashboard role="program_director" scopeLabel={viewer.label} />
  );
}
