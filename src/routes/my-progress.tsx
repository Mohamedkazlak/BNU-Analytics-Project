import { createFileRoute } from "@tanstack/react-router";
import { AiDecisionSection } from "@/components/ai-insights";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getStudentDashboard } from "@/lib/api";
import {
  Panel,
  ScreenSkeleton,
  StatBlock,
  chartColors,
  tooltipStyle,
} from "@/components/dashboard/dashboard-ui";
import { roleGuard } from "@/lib/auth/role-guards";
import { useRole } from "@/components/role-context";

export const Route = createFileRoute("/my-progress")({
  beforeLoad: roleGuard("/my-progress"),
  head: () => ({
    meta: [
      { title: "My Progress — BNU" },
      {
        name: "description",
        content:
          "Your exam scores over time against the class average, plus strengths by topic.",
      },
      { property: "og:title", content: "My Progress — BNU" },
      {
        property: "og:description",
        content:
          "Your exam scores over time against the class average, plus strengths by topic.",
      },
    ],
  }),
  component: MyProgress,
});

function MyProgress() {
  const { user } = useRole();
  const { data, isPending } = useQuery({
    queryKey: ["student-dashboard", user.id],
    queryFn: () => getStudentDashboard(),
  });
  if (isPending || !data) return <ScreenSkeleton cards={3} panels={2} />;

  const diff = (data.average - data.classAverage).toFixed(1);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBlock
          label="My average"
          value={`${data.average}`}
          sub={data.studentName}
          tone="iris"
        />
        <StatBlock
          label="Vs class average"
          value={`${Number(diff) >= 0 ? "+" : ""}${diff}`}
          sub={`Class: ${data.classAverage}`}
          tone={Number(diff) >= 0 ? "mint" : "rose"}
        />
        <StatBlock
          label="Strongest topic"
          value={data.bestTopic}
          sub={`Weakest: ${data.weakestTopic}`}
        />
      </div>

      <AiDecisionSection role="student" />

      <Panel title="My Scores vs Class Average">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.scoreTimeline}
              margin={{ top: 8, right: 12, bottom: 0, left: -18 }}
            >
              <CartesianGrid stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="exam"
                tick={{ fontSize: 10, fill: chartColors.axis }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: chartColors.axis }}
                axisLine={false}
                tickLine={false}
                domain={[40, 100]}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: chartColors.axis }}
              />
              <Line
                isAnimationActive={false}
                type="monotone"
                dataKey="score"
                name="My score"
                stroke={chartColors.iris}
                strokeWidth={2.5}
              />
              <Line
                type="monotone"
                dataKey="classAverage"
                name="Class average"
                stroke={chartColors.cyan}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Strengths & Weaknesses by Topic">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.topics}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 0, left: 20 }}
            >
              <CartesianGrid stroke={chartColors.grid} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: chartColors.axis }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="topic"
                tick={{ fontSize: 11, fill: chartColors.axis }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                isAnimationActive={false}
                dataKey="score"
                name="Score"
                radius={[0, 8, 8, 0]}
                maxBarSize={22}
              >
                {data.topics.map((t) => (
                  <Cell
                    key={t.topic}
                    fill={
                      t.score >= 75
                        ? chartColors.mint
                        : t.score >= 60
                          ? chartColors.iris
                          : chartColors.rose
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </>
  );
}
