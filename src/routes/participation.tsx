import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getParticipationReport } from "@/lib/api";
import {
  AiInsight,
  Badge,
  Panel,
  ScreenSkeleton,
  StatBlock,
  TableShell,
  Th,
  chartColors,
  tooltipStyle,
} from "@/components/dashboard-ui";
import { roleGuard } from "@/lib/role-guards";
import { useRole } from "@/components/role-context";
import { ScopeBanner } from "@/components/scope-banner";

export const Route = createFileRoute("/participation")({
  beforeLoad: roleGuard("/participation"),
  head: () => ({
    meta: [
      { title: "Student Participation Reports — BNU" },
      {
        name: "description",
        content: "Attempts per exam, completion rate, average time taken and a list of absent or late students.",
      },
      { property: "og:title", content: "Student Participation Reports — BNU" },
      {
        property: "og:description",
        content: "Attempts per exam, completion rate, average time taken and a list of absent or late students.",
      },
    ],
  }),
  component: Participation,
});

function Participation() {
  const { user, viewer } = useRole();
  const { data, isPending } = useQuery({
    queryKey: ["participation", user.id],
    queryFn: () => getParticipationReport(viewer),
  });
  if (isPending || !data) return <ScreenSkeleton cards={3} panels={3} />;

  const noShows = data.absentees.filter((a) => a.reason === "No attempt").length;

  return (
    <>
      <ScopeBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBlock label="Completion rate" value={`${data.completionRate}%`} sub="Of expected sittings" tone="mint" />
        <StatBlock label="Attendance" value={`${data.attendanceRate}%`} sub="On-time sittings" tone="iris" />
        <StatBlock label="Non-participants" value={`${noShows}`} sub="No attempt recorded" tone="rose" />
      </div>

      <Panel title="Attempts per Exam">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.attemptsPerExam} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis dataKey="exam" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: chartColors.axis }} />
              <Bar isAnimationActive={false} dataKey="expected" name="Enrolled" radius={[8, 8, 0, 0]} maxBarSize={40} fill={chartColors.violet} opacity={0.35} />
              <Bar isAnimationActive={false} dataKey="attempts" name="Attempted" radius={[8, 8, 0, 0]} maxBarSize={40} fill={chartColors.iris} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <AiInsight>{data.insight}</AiInsight>

      <Panel title="Average Time Taken per Exam">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.avgTimePerExam} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 30 }}>
              <CartesianGrid stroke={chartColors.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} unit=" min" />
              <YAxis type="category" dataKey="exam" tick={{ fontSize: 10, fill: chartColors.axis }} axisLine={false} tickLine={false} width={130} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} min`} />
              <Bar isAnimationActive={false} dataKey="minutes" name="Minutes" radius={[0, 8, 8, 0]} maxBarSize={22} fill={chartColors.cyan} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Attendance by curriculum">
        <TableShell>
          <thead className="bg-iris/8">
            <tr>
              <Th>Curriculum</Th>
              <Th align="right">Attendance</Th>
              <Th align="right">Absentees</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {data.attendanceByCurriculum.map((row) => (
              <tr key={row.course} className="bg-white/40">
                <td className="px-4 py-3 font-semibold text-ink">{row.course}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink">{row.attendance}%</td>
                <td className="px-4 py-3 text-right text-ink-soft">{row.absentees}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>

      <Panel title="Missing & Late Participants">
        <TableShell>
          <thead className="bg-iris/8">
            <tr>
              <Th>Student</Th>
              <Th>Assessment</Th>
              <Th>Reason</Th>
              <Th align="right">Minutes late</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {data.absentees.map((row, i) => (
              <tr key={`${row.student}-${i}`} className="bg-white/40">
                <td className="px-4 py-3 font-semibold text-ink">{row.student}</td>
                <td className="px-4 py-3 text-ink-soft">{row.exam}</td>
                <td className="px-4 py-3">
                  <Badge tone={row.reason === "No attempt" ? "fail" : "warn"}>{row.reason}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-ink-soft">{row.minutesLate || "—"}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>
    </>
  );
}
