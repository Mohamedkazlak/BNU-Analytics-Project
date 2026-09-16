import { useRole } from "./role-context";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";

export function ScopeBanner() {
  const { viewer } = useRole();
  const { options, filters } = useAnalyticsFilters();
  const sector = options?.sectors.find((s) => s.id === filters.sectorId)?.name;
  const college = options?.colleges.find(
    (c) => c.id === filters.collegeId,
  )?.name;
  const curriculum = options?.curricula.find(
    (c) => c.id === filters.curriculumId,
  );
  const parts = [
    viewer.label,
    sector,
    college,
    curriculum ? `${curriculum.code}` : null,
  ].filter(Boolean);
  return (
    <div className="rounded-2xl border border-iris/20 bg-iris/8 px-4 py-2.5 text-[12px] font-medium text-iris">
      Viewing · {parts.join(" · ")}
    </div>
  );
}
