import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { DemoUser, Role } from "@/lib/types";
import { viewerScopeFor } from "@/lib/data-scope";
import {
  affiliationForScope,
  demoUserById,
  demoUserForRole,
  demoUsers,
  displayRoleLabel,
} from "@/lib/mock-data";
import {
  roleHome,
} from "@/lib/role-guards";
import { useRouterState } from "@tanstack/react-router";
import {
  getAuthToken,
  roleFromToken,
  scopeIdFromToken,
  studentIdFromToken,
  userIdFromToken,
} from "@/lib/auth-token";

export interface NavItem {
  to: string;
  label: string;
  title: string;
}

export const roleLabels: Record<Role, string> = {
  senior_management: "Senior Management",
  program_director: "Program Director",
  academic_affairs: "Academic Affairs",
  professor: "Professor",
  it_academic_integrity: "IT · Academic Integrity",
  student: "Student",
};

export const allRoles: Role[] = [
  "senior_management",
  "program_director",
  "academic_affairs",
  "professor",
  "it_academic_integrity",
  "student",
];

export const navByRole: Record<Role, { group: string; items: NavItem[] }[]> = {
  senior_management: [
    {
      group: "Overview",
      items: [
        {
          to: "/management",
          label: "Institution Overview",
          title: "Senior Management Overview",
        },
        {
          to: "/exam-activity",
          label: "Exam Activity",
          title: "Exam Activity & Enrollment Trends",
        },
        {
          to: "/courses",
          label: "Curriculum Performance",
          title: "Curriculum & Instructor Performance",
        },
      ],
    },
    {
      group: "Academic reports",
      items: [
        {
          to: "/performance",
          label: "Student Performance",
          title: "Student Performance Reports",
        },
        {
          to: "/students",
          label: "Student Profiles",
          title: "Student Profiles & Academic History",
        },
        {
          to: "/participation",
          label: "Participation",
          title: "Student Participation Reports",
        },
        {
          to: "/integrity",
          label: "Academic Integrity",
          title: "Academic Integrity & Exam Monitoring",
        },
      ],
    },
  ],
  program_director: [
    {
      group: "Overview",
      items: [
        {
          to: "/program-director",
          label: "College Dashboard",
          title: "Program Director · College Dashboard",
        },
        {
          to: "/exam-activity",
          label: "Exam Activity",
          title: "Exam Activity & Enrollment Trends",
        },
        {
          to: "/courses",
          label: "Curriculum Performance",
          title: "Curriculum & Instructor Performance",
        },
      ],
    },
    {
      group: "Academic reports",
      items: [
        {
          to: "/performance",
          label: "Student Performance",
          title: "Student Performance Reports",
        },
        {
          to: "/students",
          label: "Student Profiles",
          title: "Student Profiles & Academic History",
        },
        {
          to: "/participation",
          label: "Participation",
          title: "Student Participation Reports",
        },
        {
          to: "/item-analysis",
          label: "Item Analysis",
          title: "Item Analysis Reports",
        },
      ],
    },
  ],
  academic_affairs: [
    {
      group: "College performance",
      items: [
        {
          to: "/academic-affairs",
          label: "College Dashboard",
          title: "Academic Affairs · Student Performance & Attendance",
        },
        {
          to: "/performance",
          label: "Student Performance",
          title: "Student Performance Reports",
        },
        {
          to: "/participation",
          label: "Attendance",
          title: "Attendance & Participation Reports",
        },
        {
          to: "/courses",
          label: "Curricula",
          title: "Curriculum Performance",
        },
        {
          to: "/students",
          label: "Student Profiles",
          title: "Student Profiles & Academic History",
        },
      ],
    },
  ],
  professor: [
    {
      group: "My courses",
      items: [
        {
          to: "/professor",
          label: "Course Home",
          title: "Professor Course Dashboard",
        },
        {
          to: "/courses",
          label: "My Curricula",
          title: "Curriculum Performance",
        },
        {
          to: "/performance",
          label: "Student Performance",
          title: "Student Performance Reports",
        },
        {
          to: "/students",
          label: "Student Profiles",
          title: "Student Profiles & Academic History",
        },
        {
          to: "/item-analysis",
          label: "Item Analysis",
          title: "Item Analysis Reports",
        },
        {
          to: "/participation",
          label: "Participation",
          title: "Student Participation Reports",
        },
      ],
    },
    {
      group: "Live",
      items: [
        {
          to: "/real-time",
          label: "Real-Time View",
          title: "Real-Time Cohort View",
        },
      ],
    },
  ],
  it_academic_integrity: [
    {
      group: "Integrity",
      items: [
        {
          to: "/integrity",
          label: "Flagged Cases",
          title: "Academic Integrity & Exam Monitoring",
        },
        {
          to: "/real-time",
          label: "Live Exam Monitor",
          title: "Live Monitoring · Every University Exam",
        },
      ],
    },
  ],
  student: [
    {
      group: "My learning",
      items: [
        {
          to: "/my-progress",
          label: "My Progress",
          title: "My Personal Dashboard",
        },
      ],
    },
  ],
};

export { roleHome };

interface RoleContextValue {
  role: Role;
  user: DemoUser;
  setRole: (role: Role) => void;
  setUser: (userId: string) => void;
  scopeId: string | null;
  displayRole: string;
  affiliation: ReturnType<typeof affiliationForScope>;
  viewer: ReturnType<typeof viewerScopeFor>;
}

/**
 * Resolve the signed-in user's role/scope straight from the verified JWT
 * claims. Demo accounts (present in mock-data's directory) additionally get
 * their display name/title/initials/course assignments from that directory,
 * but the *role and scope that gate navigation and data access always come
 * from the token itself* — never from a directory lookup. This avoids a
 * real (non-demo) account silently inheriting the "senior_management"
 * default just because its user_id isn't in the mock directory.
 */
function userFromToken(token: string | null): DemoUser | null {
  const userId = userIdFromToken(token);
  const role = roleFromToken(token);
  if (!userId || !role) return null;

  const known = demoUserById(userId);
  if (known && known.role === role) return known;

  const scopeId = scopeIdFromToken(token);
  const studentId = studentIdFromToken(token);
  return {
    id: userId,
    name: userId,
    title: roleLabels[role],
    initials: userId.slice(0, 2).toUpperCase(),
    role,
    scopeId,
    ...(studentId ? { studentId } : {}),
  };
}

const defaultUser = demoUserForRole("senior_management");

const RoleContext = createContext<RoleContextValue>({
  role: "senior_management",
  user: defaultUser,
  setRole: () => {},
  setUser: () => {},
  scopeId: defaultUser.scopeId,
  displayRole: displayRoleLabel(defaultUser),
  affiliation: affiliationForScope(defaultUser.scopeId),
  viewer: viewerScopeFor(defaultUser),
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<DemoUser>(() => {
    return userFromToken(getAuthToken()) ?? demoUserForRole("senior_management");
  });
  const role = user.role;

  // Actually, we shouldn't allow changing users via demo UI anymore.
  // The user is fixed to the token payload.

  const setUser = (nextId: string) => {
    // Disabled in real auth mode, but kept for UI compatibility if needed.
    // In real auth, you must log in to change user.
  };

  const setRole = (next: Role) => {
    // Disabled
  };

  // Re-check the token on every route change, not just when `user` itself
  // changes. The previous version depended only on `user.id`/`user.role`,
  // which meant it could only ever re-fire in response to its own prior
  // update — a chicken-and-egg trap that silently kept stale (e.g. default
  // demo) role/nav state around after a same-tab client-side navigation
  // wrote a fresh token (login no longer hits this path since it now does
  // a full reload, but this keeps the provider self-correcting regardless).
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const token = getAuthToken();
    const next = userFromToken(token);
    if (next && (next.id !== user.id || next.role !== user.role)) {
      setUserState(next);
    }
    if (
      typeof window !== "undefined" &&
      !token &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
  }, [pathname, user.id, user.role]);

  return (
    <RoleContext.Provider
      value={{
        role,
        user,
        setRole,
        setUser,
        scopeId: user.scopeId,
        displayRole: displayRoleLabel(user),
        affiliation: affiliationForScope(user.scopeId),
        viewer: viewerScopeFor(user),
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}

export { demoUsers, displayRoleLabel, affiliationForScope };
