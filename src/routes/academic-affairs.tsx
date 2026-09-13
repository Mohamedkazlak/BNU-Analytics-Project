import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AiDecisionSection } from "@/components/ai-insights";
import { ScopeBanner } from "@/components/scope-banner";
import {
  getCoursePerformance,
  getParticipationReport,
  getStudentDirectory,
  getStudentPerformance,
} from "@/lib/api";
import {
  Badge,
  Meter,
  Panel,
  ScreenSkeleton,
  StatBlock,
  TableShell,
  Th,
} from "@/components/dashboard-ui";
import { roleGuard } from "@/lib/role-guards";
import { useRole } from "@/components/role-context";

export const Route = createFileRoute("/academic-affairs")({
  beforeLoad: roleGuard("/academic-affairs"),
  head: () => ({
    meta: [
      { title: "Academic Affairs — Student Performance — BNU" },
      {
        name: "description",
        content:
          "College-level student performance, attendance and curriculum reports for academic affairs.",
      },
      { property: "og:title", content: "Academic Affairs — BNU" },
      {
        property: "og:description",
        content:
          "College-level student performance, attendance and curriculum reports for academic affairs.",
      },
    ],
  }),
  component: AcademicAffairsShell,
});

function AcademicAffairsShell() {
  const { user, viewer } = useRole();
  const performance = useQuery({
    queryKey: ["performance", user.id],
    queryFn: () => getStudentPerformance(viewer),
  });
  const participation = useQuery({
    queryKey: ["participation", user.id],
    queryFn: () => getParticipationReport(viewer),
  });
  const directory = useQuery({
    queryKey: ["students", user.id],
    queryFn: () => getStudentDirectory(viewer),
  });
  const courses = useQuery({
    queryKey: ["courses", user.id],
    queryFn: () => getCoursePerformance(viewer),
  });

  if (
    performance.isPending ||
    participation.isPending ||
    directory.isPending ||
    courses.isPending ||
    !performance.data ||
    !participation.data ||
    !directory.data ||
    !courses.data
  ) {
    return <ScreenSkeleton cards={4} panels={2} />;
  }

  const atRisk = directory.data.filter(
    (s) => s.standing === "At risk" || s.standing === "Watch list",
  );
  const passed = performance.data.passFail[0]?.value ?? 0;
  const failed = performance.data.passFail[1]?.value ?? 0;
  const passRate =
    passed + failed === 0 ? 0 : ((passed / (passed + failed)) * 100).toFixed(1);

  return (
    <>
      <ScopeBanner />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatBlock
          label="Students in college"
          value={`${directory.data.length}`}
          sub="Every curriculum"
          tone="iris"
        />
        <StatBlock
          label="Pass rate"
          value={`${passRate}%`}
          sub="Latest exam cycle"
          tone="mint"
        />
        <StatBlock
          label="Attendance"
          value={`${participation.data.attendanceRate}%`}
          sub="On-time sittings"
          tone="iris"
        />
        <StatBlock
          label="Needs attention"
          value={`${atRisk.length}`}
          sub="Watch list or at risk"
          tone="rose"
        />
      </div>

      <AiDecisionSection role="academic_affairs" />

      <Panel title="Performance by curriculum">
        <TableShell>
          <thead className="bg-iris/8">
            <tr>
              <Th>Curriculum</Th>
              <Th>Average</Th>
              <Th>Quality</Th>
              <Th align="right">Attendance</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {courses.data.averageByCourse.map((row) => {
              const att = participation.data.attendanceByCurriculum.find(
                (a) => a.course === row.course,
              );
              return (
                <tr key={row.course} className="bg-white/40">
                  <td className="px-4 py-3 font-semibold text-ink">{row.course}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Meter value={row.average} tone="iris" />
                      <span className="font-semibold text-ink">{row.average}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{row.quality}/10</td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">
                    {att ? `${att.attendance}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="Attendance alerts"
          action={
            <Link
              to="/participation"
              className="text-[12px] font-semibold text-iris underline underline-offset-2"
            >
              Full attendance →
            </Link>
          }
        >
          <ul className="space-y-2 text-[13px]">
            {participation.data.absentees.slice(0, 6).map((a, i) => (
              <li
                key={`${a.student}-${i}`}
                className="rounded-2xl bg-white/60 px-3.5 py-2.5"
              >
                <span className="font-semibold text-ink">{a.student}</span>
                <span className="text-ink-soft">
                  {" "}
                  · {a.exam} · {a.reason}
                  {a.minutesLate ? ` (${a.minutesLate} min late)` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Students needing follow-up"
          action={
            <Link
              to="/students"
              className="text-[12px] font-semibold text-iris underline underline-offset-2"
            >
              All profiles →
            </Link>
          }
        >
          <TableShell>
            <thead className="bg-iris/8">
              <tr>
                <Th>Student</Th>
                <Th>Standing</Th>
                <Th align="right">Average</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {(atRisk.length ? atRisk : directory.data.slice(-5)).map((row) => (
                <tr key={row.studentId} className="bg-white/40">
                  <td className="px-4 py-3 font-semibold text-ink">{row.name}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        row.standing === "Watch list" ? "warn" : "fail"
                      }
                    >
                      {row.standing}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">
                    {row.overallAverage}
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
