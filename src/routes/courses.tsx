import { createFileRoute } from "@tanstack/react-router";
import { AiDecisionSection } from "@/components/ai-insights";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getCoursePerformance } from "@/lib/api";
import {
  Badge,
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
import { FiltersRequiredNotice } from "@/components/analytics-filters";
import { useFilteredQuery } from "@/hooks/use-analytics-filters";
import { roleGuard } from "@/lib/role-guards";
import { ScopeBanner } from "@/components/scope-banner";

export const Route = createFileRoute("/courses")({
  beforeLoad: roleGuard("/courses"),
  head: () => ({
    meta: [
      { title: "Course & Instructor Performance — BNU" },
      {
        name: "description",
        content:
          "Average scores by course, section-by-section comparison and an assessment quality indicator.",
      },
      {
        property: "og:title",
        content: "Course & Instructor Performance — BNU",
      },
      {
        property: "og:description",
        content:
          "Average scores by course, section-by-section comparison and an assessment quality indicator.",
      },
    ],
  }),
  component: CoursePerformance,
});

const palette = [
  chartColors.iris,
  chartColors.cyan,
  chartColors.mint,
  chartColors.amber,
];

function CoursePerformance() {
  const { filters, filtersReady, queryKey, enabled } =
    useFilteredQuery("course-performance");
  const { data, isPending } = useQuery({
    queryKey,
    queryFn: () => getCoursePerformance(filters),
    enabled,
  });
  const [sort, setSort] = useState("average");
  if (!filtersReady) return <FiltersRequiredNotice />;
  if (isPending || !data) return <ScreenSkeleton cards={4} panels={2} />;

  const courseRows = data.averageByCourse;
  const sections = [...data.sections].sort((a, b) =>
    sort === "section"
      ? a.section.localeCompare(b.section)
      : sort === "passRate"
        ? b.passRate - a.passRate
        : b.average - a.average,
  );

  return (
    <>
      <ScopeBanner />

      <FilterBar>
        <Select
          label="Sort sections"
          value={sort}
          options={[
            { value: "average", label: "Average (high → low)" },
            { value: "passRate", label: "Pass rate (high → low)" },
            { value: "section", label: "Section name" },
          ]}
          onChange={setSort}
        />
      </FilterBar>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {courseRows.map((row, i) => (
          <div key={row.course} className="glass-panel p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-soft">
              {row.course}
            </div>
            <div className="font-display mt-2 text-3xl font-extrabold text-ink">
              {row.average}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Meter
                value={row.quality * 10}
                tone={(["iris", "cyan", "mint", "amber"] as const)[i % 4]!}
              />
              <span className="text-[11px] font-semibold text-ink-soft">
                Quality {row.quality}/10
              </span>
            </div>
          </div>
        ))}
      </div>

      <Panel title="Average Score per Course">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={courseRows}
              margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
            >
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="course"
                tick={{ fontSize: 11, fill: chartColors.axis }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: chartColors.axis }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                isAnimationActive={false}
                dataKey="average"
                name="Average score"
                radius={[10, 10, 0, 0]}
                maxBarSize={54}
              >
                {courseRows.map((row, i) => (
                  <Cell key={row.course} fill={palette[i % palette.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <AiDecisionSection />

      <Panel title="Section Comparison">
        <TableShell>
          <thead className="bg-iris/8">
            <tr>
              <Th>Section</Th>
              <Th>Course</Th>
              <Th>Average</Th>
              <Th align="right">Pass rate</Th>
              <Th align="right">Standing</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {sections.map((row) => (
              <tr key={row.section} className="bg-white/40">
                <td className="px-4 py-3 font-semibold text-ink">
                  {row.section}
                </td>
                <td className="px-4 py-3 text-ink-soft">{row.course}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Meter value={row.average} tone="iris" />
                    <span className="font-semibold text-ink">
                      {row.average}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-ink-soft">
                  {row.passRate}%
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge
                    tone={
                      row.passRate >= 75
                        ? "pass"
                        : row.passRate >= 60
                          ? "warn"
                          : "fail"
                    }
                  >
                    {row.passRate >= 75
                      ? "On track"
                      : row.passRate >= 60
                        ? "Watch"
                        : "Needs support"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>
    </>
  );
}
