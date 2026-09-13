import { AiDecisionSection } from "@/components/ai-insights";
import { ScopeBanner } from "@/components/scope-banner";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getManagementOverview } from "@/lib/api";
import {
  AiInsight,
  KpiCard,
  Meter,
  Panel,
  ScreenSkeleton,
  TableShell,
  Th,
  FilterBar,
  Select,
  chartColors,
  tooltipStyle,
} from "@/components/dashboard-ui";
import { useRole } from "@/components/role-context";
import type { Role } from "@/lib/types";

const palette = [chartColors.iris, chartColors.cyan, chartColors.mint, chartColors.amber];

/** Shared KPI / chart overview used by senior_management and program_director shells. */
export function OverviewDashboard({
  role,
  scopeLabel,
}: {
  role: Role;
  scopeLabel?: string;
}) {
  const { user, viewer } = useRole();
  const { data, isPending } = useQuery({
    queryKey: ["management-overview", user.id],
    queryFn: () => getManagementOverview(viewer),
  });
  const [curriculum, setCurriculum] = useState("all");
  const [sort, setSort] = useState("passRate");

  if (isPending || !data) return <ScreenSkeleton cards={4} panels={2} />;

  const showColleges = data.passRateByCollege.length > 1;
  const courseOptions = [
    { value: "all", label: showColleges ? "All curricula in view" : "All college curricula" },
    ...data.passRateByCourse.map((row) => ({ value: row.course, label: row.course })),
  ];

  const filtered = data.passRateByCourse.filter(
    (row) => curriculum === "all" || row.course === curriculum,
  );
  const ordered = [...filtered].sort((a, b) =>
    sort === "course"
      ? a.course.localeCompare(b.course)
      : sort === "participants"
        ? b.participants - a.participants
        : b.passRate - a.passRate,
  );
  const colleges = [...data.passRateByCollege].sort((a, b) => b.passRate - a.passRate);

  return (
    <>
      <ScopeBanner />
      {scopeLabel && scopeLabel !== viewer.label ? (
        <div className="rounded-2xl border border-iris/20 bg-iris/8 px-4 py-2.5 text-[12px] font-medium text-iris">
          Scope · {scopeLabel}
        </div>
      ) : null}

      <FilterBar>
        <Select label="Curriculum" value={curriculum} options={courseOptions} onChange={setCurriculum} />
        <Select
          label="Sort by"
          value={sort}
          options={[
            { value: "passRate", label: "Pass rate (high → low)" },
            { value: "participants", label: "Participants (high → low)" },
            { value: "course", label: "Curriculum name" },
          ]}
          onChange={setSort}
        />
      </FilterBar>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <AiDecisionSection role={role} />

      {showColleges && (
        <Panel title="Pass rate by college">
          <TableShell>
            <thead className="bg-iris/8">
              <tr>
                <Th>College</Th>
                <Th>Curricula</Th>
                <Th>Participants</Th>
                <Th>Pass rate</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {colleges.map((row, i) => (
                <tr key={row.college} className="bg-white/40">
                  <td className="px-4 py-3 font-semibold text-ink">{row.college}</td>
                  <td className="px-4 py-3 text-ink-soft">{row.courses}</td>
                  <td className="px-4 py-3 text-ink-soft">{row.participants.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Meter value={row.passRate} tone={(["iris", "cyan", "mint", "amber"] as const)[i % 4]!} />
                      <span className="font-semibold text-ink">{row.passRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Pass rate by curriculum"
          className="lg:col-span-2"
          action={
            <span className="rounded-full bg-violet/12 px-2.5 py-1 text-[11px] font-semibold text-violet">
              Current term
            </span>
          }
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordered} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="course" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Bar isAnimationActive={false} dataKey="passRate" radius={[10, 10, 0, 0]} maxBarSize={54}>
                  {ordered.map((row, i) => (
                    <Cell key={row.course} fill={palette[i % palette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Exam activity · 6 mo">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.activityTrend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id={`activity-${role}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.iris} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={chartColors.violet} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: chartColors.axis }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="exams"
                  name="Exams"
                  stroke={chartColors.iris}
                  strokeWidth={2}
                  fill={`url(#activity-${role})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <AiInsight>{data.insight}</AiInsight>

      <Panel
        title="Participation by curriculum"
        action={<span className="text-[11px] font-medium text-ink-soft">Current term</span>}
      >
        <TableShell>
          <thead className="bg-iris/8">
            <tr>
              <Th>Curriculum</Th>
              <Th>Participants</Th>
              <Th>Pass rate</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {ordered.map((row, i) => (
              <tr key={row.course} className="bg-white/40">
                <td className="px-4 py-3 font-semibold text-ink">{row.course}</td>
                <td className="px-4 py-3 text-ink-soft">{row.participants.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Meter value={row.passRate} tone={(["iris", "cyan", "mint", "amber"] as const)[i % 4]!} />
                    <span className="font-semibold text-ink">{row.passRate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>
    </>
  );
}
