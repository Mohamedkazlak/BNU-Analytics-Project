import { createFileRoute, Link } from "@tanstack/react-router";
import { AiDecisionSection } from "@/components/ai-insights";
import { ScopeBanner } from "@/components/dashboard/scope-banner";
import { useQuery } from "@tanstack/react-query";
import { getIntegrityReport } from "@/lib/api";
import {
  AiInsight,
  Badge,
  Panel,
  ScreenSkeleton,
  StatBlock,
  TableShell,
  Th,
} from "@/components/dashboard/dashboard-ui";
import { FiltersRequiredNotice } from "@/components/dashboard/analytics-filters";
import { useFilteredQuery } from "@/components/dashboard/use-analytics-filters";
import { roleGuard } from "@/lib/auth/role-guards";

export const Route = createFileRoute("/integrity")({
  beforeLoad: roleGuard("/integrity"),
  head: () => ({
    meta: [
      { title: "Academic Integrity & Exam Monitoring — BNU" },
      {
        name: "description",
        content:
          "Attempt-level monitoring with timings, IP addresses, devices and flagged suspicious patterns.",
      },
      {
        property: "og:title",
        content: "Academic Integrity & Exam Monitoring — BNU",
      },
      {
        property: "og:description",
        content:
          "Attempt-level monitoring with timings, IP addresses, devices and flagged suspicious patterns.",
      },
    ],
  }),
  component: Integrity,
});

function Integrity() {
  const { filters, filtersReady, queryKey, enabled } =
    useFilteredQuery("integrity");
  const { data, isPending } = useQuery({
    queryKey,
    queryFn: () => getIntegrityReport(filters),
    enabled,
  });
  if (!filtersReady) return <FiltersRequiredNotice />;
  if (isPending || !data) return <ScreenSkeleton cards={3} panels={2} />;

  const multi = data.rows.filter((r) => r.attempts > 1).length;

  return (
    <>
      <ScopeBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBlock
          label="Monitored attempts"
          value={`${data.totalAttempts}`}
          sub="This reporting period"
        />
        <StatBlock
          label="Flagged cases"
          value={`${data.flaggedCount}`}
          sub="At least one anomaly"
          tone="rose"
        />
        <StatBlock
          label="Multiple attempts"
          value={`${multi}`}
          sub="2 or more submissions"
          tone="iris"
        />
      </div>

      <AiDecisionSection />

      <Panel title="Resolution workflow">
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <span className="rounded-full bg-rose/12 px-3 py-1.5 font-semibold text-rosee">
            1 · Flagged queue
          </span>
          <span className="text-ink-soft">→</span>
          <span className="rounded-full bg-amber/12 px-3 py-1.5 font-semibold text-amberink">
            2 · Incident review
          </span>
          <span className="text-ink-soft">→</span>
          <span className="rounded-full bg-mint/12 px-3 py-1.5 font-semibold text-mintink">
            3 · Resolve / escalate
          </span>
          <Link
            to="/real-time"
            className="ml-auto text-[12px] font-semibold text-iris underline underline-offset-2"
          >
            Open live monitoring →
          </Link>
        </div>
      </Panel>

      <Panel title="Summary">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">
            {data.flaggedCount} of {data.totalAttempts}
          </span>{" "}
          monitored attempts were flagged this period — {multi} for repeat
          submissions, the remainder for unusual pacing, late starts or shared
          network addresses. Flagged rows below are highlighted for manual
          review.
        </p>
      </Panel>

      <AiInsight>{data.insight}</AiInsight>

      <Panel title="Exam Attempt Log">
        <TableShell>
          <thead className="bg-iris/8">
            <tr>
              <Th>Student</Th>
              <Th>Assessment</Th>
              <Th>Start</Th>
              <Th>End</Th>
              <Th>IP address</Th>
              <Th>Device</Th>
              <Th align="right">Attempts</Th>
              <Th align="right">Flags</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {data.rows.map((row) => (
              <tr
                key={row.id}
                className={row.flags.length ? "bg-rose/5" : "bg-white/40"}
              >
                <td className="px-4 py-3 font-semibold text-ink">
                  {row.student}
                </td>
                <td className="px-4 py-3 text-ink-soft">{row.exam}</td>
                <td className="px-4 py-3 text-ink-soft">{row.startedAt}</td>
                <td className="px-4 py-3 text-ink-soft">{row.endedAt}</td>
                <td className="px-4 py-3 text-ink-soft">{row.ip}</td>
                <td className="px-4 py-3 text-ink-soft">{row.device}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink">
                  {row.attempts}
                </td>
                <td className="px-4 py-3 text-right">
                  {row.flags.length ? (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {row.flags.map((flag) => (
                        <Badge key={flag} tone="fail">
                          ⚠ {flag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Badge tone="pass">Clear</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>
    </>
  );
}
