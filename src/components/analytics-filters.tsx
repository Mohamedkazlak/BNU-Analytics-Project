import { FilterBar, Select } from "@/components/dashboard-ui";
import { useAnalyticsFilters } from "@/hooks/use-analytics-filters";
import { useRole } from "@/components/role-context";

export function AnalyticsFilters() {
  const { role, viewer } = useRole();
  const {
    filters,
    options,
    setSectorId,
    setCollegeId,
    setCurriculumId,
    setStudentId,
    studentQuery,
    setStudentQuery,
    filtersReady,
  } = useAnalyticsFilters();

  if (role === "student") return null;

  const visible = options?.visible ?? defaultVisible(role, viewer.level);
  const required = options?.required ?? [];
  const showSector = visible.includes("sector");
  const showCollege = visible.includes("college");
  const showCurriculum = visible.includes("curriculum");
  const showStudent = visible.includes("student");

  const sectorOptions = [
    {
      value: "",
      label: required.includes("sectorId") ? "Select sector" : "All sectors",
    },
    ...(options?.sectors ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];
  const collegeOptions = [
    {
      value: "",
      label: required.includes("collegeId") ? "Select college" : "All colleges",
    },
    ...(options?.colleges ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];
  const curriculumOptions = [
    { value: "", label: "All curricula" },
    ...(options?.curricula ?? []).map((c) => ({
      value: c.id,
      label: `${c.code} · ${c.name}`,
    })),
  ];
  const studentOptions = [
    { value: "", label: "All students" },
    ...(options?.students ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="space-y-2">
      <FilterBar>
        {showSector ? (
          <Select
            label="Sector"
            value={filters.sectorId ?? ""}
            options={sectorOptions}
            onChange={setSectorId}
          />
        ) : null}
        {showCollege ? (
          <Select
            label="College"
            value={filters.collegeId ?? ""}
            options={collegeOptions}
            onChange={setCollegeId}
          />
        ) : null}
        {showCurriculum ? (
          <Select
            label="Curriculum"
            value={filters.curriculumId ?? ""}
            options={curriculumOptions}
            onChange={setCurriculumId}
          />
        ) : null}
        {showStudent ? (
          <>
            <Select
              label="Student"
              value={filters.studentId ?? ""}
              options={studentOptions}
              onChange={setStudentId}
            />
            <label className="flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 backdrop-blur-xl">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                Search
              </span>
              <input
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Name or number"
                className="w-28 bg-transparent text-[11px] font-semibold text-ink outline-none"
              />
            </label>
          </>
        ) : null}
      </FilterBar>
      {showStudent && options?.hasMoreStudents ? (
        <p className="text-[12px] text-ink-soft">
          Showing the first {options.studentPageSize ?? 150} matching students.
          Search to find others — this limit is not an access control.
        </p>
      ) : null}
      {!filtersReady ? (
        <p className="text-[12px] text-ink-soft">
          Select a sector and college to load analytics for that scope.
        </p>
      ) : null}
    </div>
  );
}

export function defaultVisible(
  role: string,
  scopeLevel?: string | null,
): string[] {
  if (role === "professor") return ["student"];
  if (role === "program_director" || role === "academic_affairs")
    return ["curriculum", "student"];
  if (role === "student") return [];
  if (role === "senior_management" && scopeLevel === "sector")
    return ["college", "curriculum", "student"];
  return ["sector", "college", "curriculum", "student"];
}

export function FiltersRequiredNotice() {
  return (
    <div className="rounded-2xl border border-iris/20 bg-iris/8 px-4 py-3 text-[13px] text-ink-soft">
      Select a sector and college to load analytics for that scope.
    </div>
  );
}
