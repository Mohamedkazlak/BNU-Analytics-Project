import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { getFilterOptions } from "@/lib/api";
import {
  emptyFilters,
  setFilterCollege,
  setFilterCurriculum,
  setFilterSector,
  setFilterStudent,
  type AnalyticsFilters,
  type FilterOptionsResponse,
} from "@/lib/filter-types";
import { useRole } from "@/components/role-context";

interface AnalyticsFilterContextValue {
  filters: AnalyticsFilters;
  options: FilterOptionsResponse | undefined;
  setSectorId: (id: string) => void;
  setCollegeId: (id: string) => void;
  setCurriculumId: (id: string) => void;
  setStudentId: (id: string) => void;
  clear: () => void;
  filtersReady: boolean;
}

const AnalyticsFilterContext =
  createContext<AnalyticsFilterContextValue | null>(null);

function readStored(userId: string): AnalyticsFilters {
  if (typeof window === "undefined" || !userId) return emptyFilters();
  try {
    const raw = sessionStorage.getItem(`bnu.analyticsFilters.${userId}`);
    if (!raw) return emptyFilters();
    return JSON.parse(raw) as AnalyticsFilters;
  } catch {
    return emptyFilters();
  }
}

function writeStored(userId: string, filters: AnalyticsFilters) {
  if (typeof window === "undefined" || !userId) return;
  sessionStorage.setItem(
    `bnu.analyticsFilters.${userId}`,
    JSON.stringify(filters),
  );
}

export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
  const { user, role, viewer } = useRole();
  const [filters, setFilters] = useState<AnalyticsFilters>(() =>
    readStored(user.id),
  );

  useEffect(() => {
    setFilters(readStored(user.id));
  }, [user.id]);

  const persist = useCallback(
    (next: AnalyticsFilters) => {
      setFilters(next);
      writeStored(user.id, next);
    },
    [user.id],
  );

  const optionsQuery = useQuery({
    queryKey: [
      "filter-options",
      user.id,
      filters.sectorId ?? null,
      filters.collegeId ?? null,
      filters.curriculumId ?? null,
    ],
    queryFn: () => getFilterOptions(filters),
    enabled: Boolean(user.id) && role !== "student",
  });
  const options = optionsQuery.data;

  const setSectorId = useCallback(
    (id: string) => {
      persist(setFilterSector(id));
    },
    [persist],
  );
  const setCollegeId = useCallback(
    (id: string) => {
      persist(setFilterCollege(filters, id));
    },
    [persist, filters],
  );
  const setCurriculumId = useCallback(
    (id: string) => {
      persist(setFilterCurriculum(filters, id));
    },
    [persist, filters],
  );
  const setStudentId = useCallback(
    (id: string) => {
      persist(setFilterStudent(filters, id));
    },
    [persist, filters],
  );
  const clear = useCallback(() => persist(emptyFilters()), [persist]);

  const required =
    options?.required ??
    (role === "senior_management" && viewer.level === "university"
      ? ["sectorId", "collegeId"]
      : []);
  const filtersReady =
    role === "student" ||
    required.every((key) => {
      if (key === "sectorId") return Boolean(filters.sectorId);
      if (key === "collegeId") return Boolean(filters.collegeId);
      return true;
    });

  const value = useMemo(
    () => ({
      filters,
      options,
      setSectorId,
      setCollegeId,
      setCurriculumId,
      setStudentId,
      clear,
      filtersReady,
    }),
    [
      filters,
      options,
      setSectorId,
      setCollegeId,
      setCurriculumId,
      setStudentId,
      clear,
      filtersReady,
    ],
  );

  return (
    <AnalyticsFilterContext.Provider value={value}>
      {children}
    </AnalyticsFilterContext.Provider>
  );
}

export function useAnalyticsFilterContext() {
  const ctx = useContext(AnalyticsFilterContext);
  if (!ctx) {
    throw new Error(
      "useAnalyticsFilterContext must be used within AnalyticsFilterProvider",
    );
  }
  return ctx;
}
