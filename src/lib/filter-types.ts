export interface AnalyticsFilters {
  sectorId?: string;
  collegeId?: string;
  curriculumId?: string;
  studentId?: string;
}

export interface FilterOption {
  id: string;
  name: string;
  parentId?: string | null;
}

export interface CurriculumOption {
  id: string;
  code: string;
  name: string;
  collegeId: string;
}

export interface StudentOption {
  id: string;
  name: string;
  collegeId?: string | null;
}

export interface FilterOptionsResponse {
  role: string;
  scopeLevel: string | null;
  scopeLabel: string;
  visible: string[];
  required: string[];
  sectors: FilterOption[];
  colleges: FilterOption[];
  curricula: CurriculumOption[];
  students: StudentOption[];
}

export function toSearchParams(filters: AnalyticsFilters): string {
  const params = new URLSearchParams();
  if (filters.sectorId) params.set("sectorId", filters.sectorId);
  if (filters.collegeId) params.set("collegeId", filters.collegeId);
  if (filters.curriculumId) params.set("curriculumId", filters.curriculumId);
  if (filters.studentId) params.set("studentId", filters.studentId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function filterQueryKey(
  resource: string,
  userId: string,
  filters: AnalyticsFilters,
): unknown[] {
  return [
    resource,
    userId,
    filters.sectorId ?? null,
    filters.collegeId ?? null,
    filters.curriculumId ?? null,
    filters.studentId ?? null,
  ];
}

export function emptyFilters(): AnalyticsFilters {
  return {};
}

/** Parent changes drop invalid descendants: sector → college → curriculum → student. */
export function setFilterSector(sectorId: string): AnalyticsFilters {
  return sectorId ? { sectorId } : emptyFilters();
}

export function setFilterCollege(
  current: AnalyticsFilters,
  collegeId: string,
): AnalyticsFilters {
  const next: AnalyticsFilters = {};
  if (current.sectorId) next.sectorId = current.sectorId;
  if (collegeId) next.collegeId = collegeId;
  return next;
}

export function setFilterCurriculum(
  current: AnalyticsFilters,
  curriculumId: string,
): AnalyticsFilters {
  const next: AnalyticsFilters = {};
  if (current.sectorId) next.sectorId = current.sectorId;
  if (current.collegeId) next.collegeId = current.collegeId;
  if (curriculumId) next.curriculumId = curriculumId;
  return next;
}

export function setFilterStudent(
  current: AnalyticsFilters,
  studentId: string,
): AnalyticsFilters {
  const next: AnalyticsFilters = {};
  if (current.sectorId) next.sectorId = current.sectorId;
  if (current.collegeId) next.collegeId = current.collegeId;
  if (current.curriculumId) next.curriculumId = current.curriculumId;
  if (studentId) next.studentId = studentId;
  return next;
}
