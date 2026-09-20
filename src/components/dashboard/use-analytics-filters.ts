import { useAnalyticsFilterContext } from "./analytics-filter-context";
import { useRole } from "@/components/role-context";
import { filterQueryKey } from "@/lib/filter-types";

export function useAnalyticsFilters() {
  return useAnalyticsFilterContext();
}

export function useFilteredQuery(resource: string) {
  const { user } = useRole();
  const { filters, filtersReady } = useAnalyticsFilterContext();
  return {
    user,
    filters,
    filtersReady,
    queryKey: filterQueryKey(resource, user.id, filters),
    enabled: Boolean(user.id) && filtersReady,
  };
}
