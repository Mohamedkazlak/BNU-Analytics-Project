import { useRole } from "../role-context";
import { useAnalyticsFilters } from "./use-analytics-filters";

export function ScopeBanner() {
  const { viewer } = useRole();
  const { options, filters } = useAnalyticsFilters();
  const sector = options?.sectors.find((s) => s.id === filters.sectorId)?.name;
  const college = options?.colleges.find(
    (c) => c.id === filters.collegeId,
  )?.name;
  const professor = options?.professors?.find(
    (p) => p.id === filters.professorId,
  )?.name;
  const curriculum = options?.curricula.find(
    (c) => c.id === filters.curriculumId,
  );
  const parts = [
    viewer.label,
    sector,
    college,
    professor,
    curriculum ? `${curriculum.code}` : null,
  ].filter(Boolean);
  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-iris/20 bg-iris/8 px-4 py-2.5 text-[12px] font-medium text-iris">
        Viewing · {parts.join(" · ")}
      </div>
      {options?.containsSynthetic ? (
        <div className="rounded-2xl border border-amber/30 bg-amber/10 px-4 py-2.5 text-[12px] font-medium text-amberink">
          This scope includes synthetic demonstration assessment records. Do not
          treat these figures as official university statistics.
        </div>
      ) : null}
    </div>
  );
}
