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
import { getItemAnalysis } from "@/lib/api";
import {
  AiInsight,
  Badge,
  Meter,
  Panel,
  ScreenSkeleton,
  StatBlock,
  TableShell,
  Th,
  FilterBar,
  Select,
  Toggle,
  chartColors,
  tooltipStyle,
} from "@/components/dashboard/dashboard-ui";
import { FiltersRequiredNotice } from "@/components/dashboard/analytics-filters";
import { useFilteredQuery } from "@/components/dashboard/use-analytics-filters";
import { roleGuard } from "@/lib/auth/role-guards";
import { ScopeBanner } from "@/components/dashboard/scope-banner";

export const Route = createFileRoute("/$role/item-analysis")({
  beforeLoad: roleGuard("/item-analysis"),
  head: () => ({
    meta: [
      { title: "Item Analysis Reports — BNU" },
      {
        name: "description",
        content:
          "Per-question correct rates, difficulty index, discrimination index and flagged items needing review.",
      },
      { property: "og:title", content: "Item Analysis Reports — BNU" },
      {
        property: "og:description",
        content:
          "Per-question correct rates, difficulty index, discrimination index and flagged items needing review.",
      },
    ],
  }),
  component: ItemAnalysis,
});

function ItemAnalysis() {
  const { filters, filtersReady, queryKey, enabled } =
    useFilteredQuery("item-analysis");
  const { data, isPending } = useQuery({
    queryKey,
    queryFn: () => getItemAnalysis(filters),
    enabled,
  });
  const [examFilter, setExamFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  if (!filtersReady) return <FiltersRequiredNotice />;
  if (isPending || !data) return <ScreenSkeleton cards={3} panels={3} />;

  const examOptions = Array.from(new Set(data.questions.map((q) => q.exam)));
  const topicOptions = [
    { value: "all", label: "All topics" },
    ...Array.from(new Set(data.questions.map((q) => q.topic))).map((t) => ({
      value: t,
      label: t,
    })),
  ];
  const rows = data.questions.filter(
    (q) =>
      (examFilter === "all" || q.exam === examFilter) &&
      (topicFilter === "all" || q.topic === topicFilter) &&
      (!flaggedOnly || q.flagged),
  );
  const chartRows = rows.slice(0, 12).map((q) => ({
    label: `Q${q.number}`,
    correct: q.pctCorrect,
    flagged: q.flagged,
  }));
  const avgCorrect = rows.length
    ? (rows.reduce((a, b) => a + b.pctCorrect, 0) / rows.length).toFixed(1)
    : "—";
  const avgDiscrim = rows.length
    ? (
        rows.reduce((a, b) => a + b.discriminationIndex, 0) / rows.length
      ).toFixed(2)
    : "—";

  return (
    <>
      <ScopeBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBlock
          label="Items analysed"
          value={`${rows.length}`}
          sub={examFilter === "all" ? "All assessments" : examFilter}
        />
        <StatBlock
          label="Average % correct"
          value={avgCorrect === "—" ? "—" : `${avgCorrect}%`}
          sub="Across selected items"
          tone="iris"
        />
        <StatBlock
          label="Mean discrimination"
          value={avgDiscrim}
          sub="0.30+ is healthy"
          tone="mint"
        />
      </div>

      <AiDecisionSection />

      <Panel
        title="% Correct per Question"
        action={
          <FilterBar>
            <Select
              label="Assessment"
              value={examFilter}
              options={[
                { value: "all", label: "All assessments" },
                ...examOptions.map((e) => ({ value: e, label: e })),
              ]}
              onChange={setExamFilter}
            />
            <Select
              label="Topic"
              value={topicFilter}
              options={topicOptions}
              onChange={setTopicFilter}
            />
            <Toggle
              label="Flagged only"
              checked={flaggedOnly}
              onChange={setFlaggedOnly}
            />
          </FilterBar>
        }
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartRows}
              margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
            >
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: chartColors.axis }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: chartColors.axis }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => `${v}%`}
              />
              <Bar
                isAnimationActive={false}
                dataKey="correct"
                name="% correct"
                radius={[8, 8, 0, 0]}
                maxBarSize={38}
              >
                {chartRows.map((row) => (
                  <Cell
                    key={row.label}
                    fill={row.flagged ? chartColors.rose : chartColors.iris}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <AiInsight>{data.insight}</AiInsight>

      <Panel
        title="Questions Needing Review"
        action={<Badge tone="warn">{data.needsReview.length} flagged</Badge>}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.needsReview.map((q) => (
            <div
              key={q.id}
              className="rounded-2xl border border-amber/30 bg-amber/6 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-display text-[13px] font-bold text-ink">
                  Q{q.number} · {q.exam}
                </div>
                <Badge tone="warn">D {q.discriminationIndex}</Badge>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-soft">{q.prompt}</p>
              <div className="mt-2 text-[11px] font-semibold text-amberink">
                {q.pctCorrect}% correct · topic: {q.topic}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Full Item Table">
        <TableShell>
          <thead className="bg-iris/8">
            <tr>
              <Th>Question</Th>
              <Th>Assessment</Th>
              <Th>Topic</Th>
              <Th>% correct</Th>
              <Th align="right">% incorrect</Th>
              <Th>Difficulty</Th>
              <Th>Discrimination</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((q) => (
              <tr
                key={q.id}
                className={q.flagged ? "bg-rose/5" : "bg-white/40"}
              >
                <td className="px-4 py-3 font-semibold text-ink">
                  Q{q.number}
                </td>
                <td className="px-4 py-3 text-ink-soft">{q.exam}</td>
                <td className="px-4 py-3 text-ink-soft">{q.topic}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Meter
                      value={q.pctCorrect}
                      tone={q.flagged ? "rose" : "cyan"}
                    />
                    <span className="font-semibold text-ink">
                      {q.pctCorrect}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-ink-soft">
                  {q.pctIncorrect}%
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Meter value={q.difficultyIndex * 100} tone="amber" />
                    <span className="text-ink-soft">
                      {q.difficultyIndex.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Meter
                      value={Math.max(0, q.discriminationIndex) * 140}
                      tone={q.discriminationIndex < 0.15 ? "rose" : "mint"}
                    />
                    <span
                      className={
                        q.discriminationIndex < 0.15
                          ? "font-semibold text-rosee"
                          : "text-ink-soft"
                      }
                    >
                      {q.discriminationIndex.toFixed(2)}
                    </span>
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
