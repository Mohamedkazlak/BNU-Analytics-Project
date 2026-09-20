import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles } from "lucide-react";
import { getStudentProfile } from "@/lib/api";
import { openChat } from "@/lib/chat-bus";
import { useRole } from "@/components/role-context";
import {
  Badge,
  Panel,
  ScreenSkeleton,
  StatBlock,
  TableShell,
  Th,
  chartColors,
  tooltipStyle,
} from "@/components/dashboard/dashboard-ui";
import { FiltersRequiredNotice } from "@/components/dashboard/analytics-filters";
import { useFilteredQuery } from "@/components/dashboard/use-analytics-filters";
import { roleGuard } from "@/lib/auth/role-guards";

export const Route = createFileRoute("/students/$studentId")({
  beforeLoad: roleGuard("/students"),
  head: () => ({
    meta: [
      { title: "Student Profile — BNU" },
      {
        name: "description",
        content:
          "Full academic profile: yearly averages, GPA, course grades, attendance and exam history.",
      },
      { property: "og:title", content: "Student Profile — BNU" },
      {
        property: "og:description",
        content:
          "Full academic profile: yearly averages, GPA, course grades, attendance and exam history.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentProfile,
});

const standingTone = (standing: string) =>
  standing === "Excellent" || standing === "Good standing"
    ? "pass"
    : standing === "Watch list"
      ? "warn"
      : "fail";

/**
 * PERMISSION GATE — evaluated before the profile is fetched. Named student
 * records are readable by Senior Management and Faculty only; the equivalent
 * server-side check belongs in the server function + row-level policy.
 */
function StudentProfile() {
  const { studentId } = Route.useParams();
  const { role } = useRole();
  const allowed =
    role === "senior_management" ||
    role === "program_director" ||
    role === "academic_affairs" ||
    role === "professor";
  const { filters, filtersReady, queryKey, enabled } =
    useFilteredQuery("student-profile");
  const { data, isPending } = useQuery({
    queryKey: [...queryKey, studentId],
    queryFn: () => getStudentProfile(studentId, filters),
    enabled: allowed && enabled,
  });

  if (!allowed) {
    return (
      <Panel title="Restricted">
        <p className="text-[13px] text-ink-soft">
          Individual student records are available to Senior Management, Program
          Directors, Academic Affairs and Professors.
        </p>
      </Panel>
    );
  }

  if (!filtersReady) return <FiltersRequiredNotice />;
  if (isPending || !data) return <ScreenSkeleton cards={4} panels={3} />;

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="font-display grid size-14 place-items-center rounded-2xl bg-iris/15 text-lg font-extrabold text-iris">
              {data.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">{data.name}</h1>
              <p className="text-[12px] text-ink-soft">
                {data.program} · Section {data.section} · Rank {data.cohortRank}{" "}
                of {data.cohortSize}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={standingTone(data.standing)}>{data.standing}</Badge>
            <Link
              to="/students"
              className="text-[12px] font-semibold text-iris hover:underline"
            >
              ← All students
            </Link>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatBlock
          label="All-years average"
          value={`${data.overallAverage}`}
          sub={`Cohort ${data.classAverage}`}
          tone="iris"
        />
        <StatBlock
          label="Current GPA"
          value={`${data.gpa}`}
          sub="Cumulative GPA from transcript rules"
          tone="mint"
        />
        <StatBlock
          label="Attendance"
          value={`${data.attendance}%`}
          sub="Latest academic year"
        />
        <StatBlock
          label="Credits earned"
          value={`${data.totalCredits}`}
          sub={`${data.years.length} academic years`}
          tone="iris"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() =>
            openChat({
              context: `Ask about ${data.name}`,
              question: `What should I know about ${data.name} (${data.studentId})?`,
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-ai/40 bg-white/70 px-3.5 py-1.5 text-[12px] font-semibold text-ai transition-colors hover:bg-ai/10"
        >
          <Sparkles className="size-3.5" strokeWidth={2.4} /> Ask about this
          student
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Average by Academic Year" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.yearTrend}
                margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
              >
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chartColors.axis }}
                  axisLine={false}
                  tickLine={false}
                  domain={[30, 100]}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: chartColors.axis }}
                />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="student"
                  name={data.name}
                  stroke={chartColors.iris}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="cohort"
                  name="Cohort average"
                  stroke={chartColors.cyan}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Topic Strengths">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.topics} outerRadius="72%">
                <PolarGrid stroke={chartColors.grid} />
                <PolarAngleAxis
                  dataKey="topic"
                  tick={{ fontSize: 10, fill: chartColors.axis }}
                />
                <Radar
                  isAnimationActive={false}
                  dataKey="score"
                  stroke={chartColors.violet}
                  fill={chartColors.violet}
                  fillOpacity={0.28}
                />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Year by Year Record">
        <TableShell>
          <thead>
            <tr className="border-b border-black/5">
              <Th>Academic year</Th>
              <Th>Level</Th>
              <Th align="right">Average</Th>
              <Th align="right">GPA</Th>
              <Th align="right">Exams</Th>
              <Th align="right">Pass rate</Th>
              <Th align="right">Attendance</Th>
              <Th align="right">Credits</Th>
              <Th>Standing</Th>
            </tr>
          </thead>
          <tbody>
            {data.years.map((y) => (
              <tr
                key={y.year}
                className="border-b border-black/5 last:border-0"
              >
                <td className="px-4 py-2.5 font-semibold">{y.year}</td>
                <td className="px-4 py-2.5 text-ink-soft">{y.yearLabel}</td>
                <td className="px-4 py-2.5 text-right font-semibold">
                  {y.average}
                </td>
                <td className="px-4 py-2.5 text-right">{y.gpa}</td>
                <td className="px-4 py-2.5 text-right">{y.examsTaken}</td>
                <td className="px-4 py-2.5 text-right">{y.passRate}%</td>
                <td className="px-4 py-2.5 text-right">{y.attendance}%</td>
                <td className="px-4 py-2.5 text-right">{y.credits}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={standingTone(y.standing)}>{y.standing}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Course Averages per Year">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.courseMatrix.map((row) => {
                  const entry: Record<string, string | number> = {
                    course: row.course,
                  };
                  data.years.forEach((y, i) => {
                    entry[y.year] = row.values[i] ?? 0;
                  });
                  return entry;
                })}
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
                <Legend
                  wrapperStyle={{ fontSize: 11, color: chartColors.axis }}
                />
                {data.years.map((y, i) => (
                  <Bar
                    key={y.year}
                    isAnimationActive={false}
                    dataKey={y.year}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={26}
                    fill={
                      [chartColors.iris, chartColors.violet, chartColors.cyan][
                        i % 3
                      ]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Exam History (current year)">
          <TableShell>
            <thead>
              <tr className="border-b border-black/5">
                <Th>Exam</Th>
                <Th>Course</Th>
                <Th>Date</Th>
                <Th align="right">Score</Th>
                <Th align="right">Minutes</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody>
              {data.recentAttempts.map((a) => (
                <tr
                  key={`${a.course}-${a.exam}`}
                  className="border-b border-black/5 last:border-0"
                >
                  <td className="px-4 py-2.5 font-medium">{a.exam}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{a.course}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{a.date}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {a.status === "No attempt" ? "—" : a.score}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {a.status === "No attempt" ? "—" : a.minutes}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      tone={
                        a.status === "Pass"
                          ? "pass"
                          : a.status === "Fail"
                            ? "fail"
                            : "neutral"
                      }
                    >
                      {a.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Panel>
      </div>
    </>
  );
}
