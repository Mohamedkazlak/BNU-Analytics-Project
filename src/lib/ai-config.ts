import type { Role } from "./types";

/**
 * Feature toggles for the AI layer.
 *
 * Current-standing rows are ON for staff roles. They are not forecasts.
 * Students only get recommendations.
 */
export const aiConfig: {
  showPredictions: Record<Role, boolean>;
  showInsights: Record<Role, boolean>;
  showWarnings: Record<Role, boolean>;
} = {
  showPredictions: {
    senior_management: true,
    program_director: true,
    academic_affairs: true,
    professor: true,
    it_academic_integrity: true,
    student: false,
  },
  showInsights: {
    senior_management: true,
    program_director: true,
    academic_affairs: true,
    professor: true,
    it_academic_integrity: true,
    student: false,
  },
  showWarnings: {
    senior_management: true,
    program_director: true,
    academic_affairs: true,
    professor: true,
    it_academic_integrity: true,
    student: false,
  },
};
