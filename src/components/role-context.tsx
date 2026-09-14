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
import { getAuthToken, userIdFromToken } from "@/lib/auth-token";

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
  const [userId, setUserIdState] = useState<string>(() => {
    return userIdFromToken(getAuthToken()) ?? demoUserForRole("senior_management").id;
  });

  // Actually, we shouldn't allow changing users via demo UI anymore.
  // The user is fixed to the token payload.

  const user = demoUserById(userId) ?? demoUserForRole("senior_management");
  const role = user.role;

  const setUser = (nextId: string) => {
    // Disabled in real auth mode, but kept for UI compatibility if needed.
    // In real auth, you must log in to change user.
  };

  const setRole = (next: Role) => {
    // Disabled
  };

  useEffect(() => {
    const token = getAuthToken();
    const nextId = userIdFromToken(token);
    if (nextId && nextId !== userId) {
      setUserIdState(nextId);
    }
    if (
      typeof window !== "undefined" &&
      !token &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
  }, [user.id, user.role, userId]);

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
