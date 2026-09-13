import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getManagementOverview } from "@/lib/api";
import { AiInsight, Panel, ScreenSkeleton, StatBlock, chartColors, tooltipStyle } from "@/components/dashboard-ui";
import { roleGuard } from "@/lib/role-guards";
import { useRole } from "@/components/role-context";
import { ScopeBanner } from "@/components/scope-banner";

export const Route = createFileRoute("/exam-activity")({
  beforeLoad: roleGuard("/exam-activity"),
  head: () => ({
    meta: [
      { title: "Exam Activity Trends — BNU" },
      { name: "description", content: "Six-month trend of exams administered and participants across the institution." },
      { property: "og:title", content: "Exam Activity Trends — BNU" },
      {
        property: "og:description",
        content: "Six-month trend of exams administered and participants across the institution.",
      },
    ],
  }),
  component: ExamActivity,
});

function ExamActivity() {
  const { user, viewer } = useRole();
  const { data, isPending } = useQuery({
    queryKey: ["management-overview", user.id],
    queryFn: () => getManagementOverview(viewer),
  });
  if (isPending || !data) return <ScreenSkeleton cards={3} panels={2} />;

  const trend = data.activityTrend;
  const first = trend[0]!;
  const last = trend[trend.length - 1]!;
  const growth = (((last.exams - first.exams) / first.exams) * 100).toFixed(1);

  return (
    <>
      <ScopeBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBlock label="Exams last month" value={last.exams.toLocaleString()} sub={`${last.month} 2026`} />
        <StatBlock
          label="Participants last month"
          value={last.participants.toLocaleString()}
          sub="Unique sittings"
          tone="iris"
        />
        <StatBlock label="6-month growth" value={`${growth}%`} sub="Exams administered" tone="mint" />
      </div>

      <Panel title="Exams & Participants · Last 6 months">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: chartColors.axis }} />
              <Line isAnimationActive={false} type="monotone" dataKey="exams" name="Exams" stroke={chartColors.iris} strokeWidth={2.5} dot={false} />
              <Line
                type="monotone"
                dataKey="participants"
                name="Participants"
                stroke={chartColors.cyan}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <AiInsight>{data.insight}</AiInsight>
    </>
  );
}
