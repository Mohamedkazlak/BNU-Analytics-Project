import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getManagementOverview } from "@/lib/api";
import { AiDecisionSection } from "@/components/ai-insights";
import {
  AiInsight,
  FilterBar,
  Panel,
  ScreenSkeleton,
  Select,
  StatBlock,
  chartColors,
  tooltipStyle,
} from "@/components/dashboard/dashboard-ui";
import { FiltersRequiredNotice } from "@/components/dashboard/analytics-filters";
import { useFilteredQuery } from "@/components/dashboard/use-analytics-filters";
import { roleGuard } from "@/lib/auth/role-guards";
import {
  activityMonthOptions,
  activitySemesterOptions,
  examActivityInsight,
  examScoreRows,
  examsByCollege,
  filterActivityTrend,
  filterExamSummaries,
} from "@/components/dashboard/exam-activity-chart";

export const Route = createFileRoute("/$role/exam-activity")({
  beforeLoad: roleGuard("/exam-activity"),
  head: () => ({
    meta: [
      { title: "Exam Activity Trends — BNU" },
      {
        name: "description",
        content:
          "Exam volume, sitting outcomes and scores across months and semesters.",
      },
      { property: "og:title", content: "Exam Activity Trends — BNU" },
      {
        property: "og:description",
        content:
          "Exam volume, sitting outcomes and scores across months and semesters.",
      },
    ],
  }),
  component: ExamActivity,
});

function count(value: number) {
  return value.toLocaleString();
}

function chartHeight(rows: number, rowPx = 36, min = 240) {
  return Math.max(min, rows * rowPx + 48);
}

function ExamActivity() {
  const { filters, filtersReady, queryKey, enabled } = useFilteredQuery(
    "management-overview",
  );
  const { data, isPending } = useQuery({
    queryKey,
    queryFn: () => getManagementOverview(filters),
    enabled,
  });
  const [semesterId, setSemesterId] = useState("all");
  const [monthKey, setMonthKey] = useState("all");

  const trend = data?.activityTrend ?? [];
  const examSummaries = data?.examSummaries ?? [];
  const periodRows = useMemo(
    () => [...trend, ...examSummaries],
    [trend, examSummaries],
  );
  const semesterOptions = useMemo(
    () => [
      { value: "all", label: "All semesters" },
      ...activitySemesterOptions(periodRows),
    ],
    [periodRows],
  );
  const monthOptions = useMemo(
    () => [
      { value: "all", label: "All months" },
      ...activityMonthOptions(periodRows, semesterId),
    ],
    [periodRows, semesterId],
  );
  const chartRows = useMemo(
    () => filterActivityTrend(trend, semesterId, monthKey),
    [trend, semesterId, monthKey],
  );
  const exams = useMemo(
    () => filterExamSummaries(examSummaries, semesterId, monthKey),
    [examSummaries, semesterId, monthKey],
  );
  const colleges = useMemo(() => examsByCollege(exams), [exams]);
  const scores = useMemo(() => examScoreRows(exams).slice(0, 16), [exams]);
  const angled = colleges.length > 5;

  useEffect(() => {
    if (
      semesterId !== "all" &&
      !semesterOptions.some((option) => option.value === semesterId)
    ) {
      setSemesterId("all");
    }
    if (
      monthKey !== "all" &&
      !monthOptions.some((option) => option.value === monthKey)
    ) {
      setMonthKey("all");
    }
  }, [monthKey, monthOptions, semesterId, semesterOptions]);

  if (!filtersReady) return <FiltersRequiredNotice />;
  if (isPending || !data) return <ScreenSkeleton cards={3} panels={3} />;

  const first = trend[0];
  const last = trend[trend.length - 1];
  const growth =
    first && last && first.exams
      ? (((last.exams - first.exams) / first.exams) * 100).toFixed(1)
      : "0.0";
  const insight = examActivityInsight(exams, chartRows, growth);

  function onSemesterChange(id: string) {
    setSemesterId(id);
    const nextMonths = activityMonthOptions(periodRows, id);
    if (monthKey !== "all" && !nextMonths.some((m) => m.value === monthKey)) {
      setMonthKey("all");
    }
  }

  const periodFilters = (
    <FilterBar>
      <Select
        label="Semester"
        value={semesterId}
        options={semesterOptions}
        onChange={onSemesterChange}
      />
      <Select
        label="Month"
        value={monthKey}
        options={monthOptions}
        onChange={setMonthKey}
      />
    </FilterBar>
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBlock
          label="Exams last month"
          value={(last?.exams ?? 0).toLocaleString()}
          sub={last ? `${last.month} ${last.year ?? ""}`.trim() : ""}
        />
        <StatBlock
          label="Participants last month"
          value={(last?.participants ?? 0).toLocaleString()}
          sub="Unique sittings"
          tone="iris"
        />
        <StatBlock
          label="6-month growth"
          value={`${growth}%`}
          sub="Exams administered"
          tone="mint"
        />
      </div>

      <AiInsight size="lg" headline={insight.headline}>
        {insight.body}
      </AiInsight>
      <AiDecisionSection />

      <Panel title="Exams & participants" action={periodFilters}>
        {chartRows.length ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartRows}
                margin={{ top: 8, right: 8, bottom: 0, left: -4 }}
              >
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="exams"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="participants"
                  orientation="right"
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => count(value)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [
                    count(value),
                    name,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: chartColors.axis }}
                />
                <Bar
                  yAxisId="exams"
                  isAnimationActive={false}
                  dataKey="exams"
                  name="Exams"
                  fill={chartColors.iris}
                  maxBarSize={48}
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  yAxisId="participants"
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="participants"
                  name="Participants"
                  stroke={chartColors.cyan}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: chartColors.cyan }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-10 text-center text-[13px] text-ink-soft">
            No exams in this month or semester.
          </p>
        )}
      </Panel>

      {colleges.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Exams administered by college">
            <p className="mb-3 text-[12px] text-ink-soft">
              Distinct exams in this view. A course with two sittings counts as
              two exams.
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={colleges}
                  margin={{
                    top: 12,
                    right: 12,
                    left: 8,
                    bottom: angled ? 48 : 8,
                  }}
                >
                  <CartesianGrid stroke={chartColors.grid} vertical={false} />
                  <XAxis
                    dataKey="college"
                    interval={0}
                    angle={angled ? -25 : 0}
                    textAnchor={angled ? "end" : "middle"}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [count(value), "Exams"]}
                  />
                  <Bar
                    isAnimationActive={false}
                    dataKey="exams"
                    name="Exams"
                    fill={chartColors.iris}
                    maxBarSize={64}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Exam sitting outcomes">
            <p className="mb-3 text-[12px] text-ink-soft">
              Passed, failed and absent sittings for the exams in this view.
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={colleges}
                  margin={{
                    top: 12,
                    right: 12,
                    left: 8,
                    bottom: angled ? 48 : 8,
                  }}
                >
                  <CartesianGrid stroke={chartColors.grid} vertical={false} />
                  <XAxis
                    dataKey="college"
                    interval={0}
                    angle={angled ? -25 : 0}
                    textAnchor={angled ? "end" : "middle"}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) => count(value)}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => [
                      count(value),
                      name,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: chartColors.axis }}
                  />
                  <Bar
                    isAnimationActive={false}
                    dataKey="passed"
                    name="Passed"
                    stackId="outcome"
                    fill={chartColors.mint}
                    maxBarSize={64}
                  />
                  <Bar
                    isAnimationActive={false}
                    dataKey="failed"
                    name="Failed"
                    stackId="outcome"
                    fill={chartColors.rose}
                    maxBarSize={64}
                  />
                  <Bar
                    isAnimationActive={false}
                    dataKey="absent"
                    name="Absent"
                    stackId="outcome"
                    fill={chartColors.amber}
                    maxBarSize={64}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      ) : null}

      {scores.length ? (
        <Panel title="Exam scores">
          <p className="mb-3 text-[12px] text-ink-soft">
            Mean sitting score, lowest first.
            {exams.length > scores.length
              ? ` Showing the ${scores.length} lowest-scoring exams.`
              : null}
          </p>
          <div style={{ height: chartHeight(scores.length, 34, 280) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={scores}
                layout="vertical"
                margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={72}
                  tick={{ fontSize: 10, fill: chartColors.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string, item) => {
                    const row = item?.payload as (typeof scores)[number];
                    if (name === "Average score") {
                      return [
                        `${Number(value).toFixed(1)}% · ${row.passRate}% passed · ${row.title}`,
                        name,
                      ];
                    }
                    return [value, name];
                  }}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="avgScore"
                  name="Average score"
                  fill={chartColors.violet}
                  maxBarSize={22}
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      ) : null}
    </>
  );
}
