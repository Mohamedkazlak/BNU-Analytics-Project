import { redirect } from "@tanstack/react-router";
import type { Role } from "./types";

export const roleHome: Record<Role, string> = {
  senior_management: "/management",
  program_director: "/program-director",
  academic_affairs: "/academic-affairs",
  professor: "/professor",
  it_academic_integrity: "/integrity",
  student: "/my-progress",
};

/**
 * Client-readable demo session store. RoleProvider writes here on switch so
 * route `beforeLoad` guards can read the active role without React context.
 * In production this comes from the verified session cookie / JWT.
 */
let activeDemoRole: Role = "senior_management";
let activeDemoUserId = "u-president";

export function setActiveDemoRole(role: Role) {
  activeDemoRole = role;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem("bnu-demo-role", role);
    } catch {
      /* ignore */
    }
  }
}

export function setActiveDemoUserId(userId: string) {
  activeDemoUserId = userId;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem("bnu-demo-user", userId);
    } catch {
      /* ignore */
    }
  }
}

export function getActiveDemoRole(): Role {
  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(
        "bnu-demo-role",
      ) as Role | null;
      if (stored) return stored;
    } catch {
      /* ignore */
    }
  }
  return activeDemoRole;
}

export function getActiveDemoUserId(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem("bnu-demo-user");
      if (stored) return stored;
    } catch {
      /* ignore */
    }
  }
  return activeDemoUserId;
}

/** Paths each role_type may open. Homes are always included via roleHome. */
export const allowedRolesByPath: Record<string, Role[]> = {
  "/": [
    "senior_management",
    "program_director",
    "academic_affairs",
    "professor",
    "it_academic_integrity",
    "student",
  ],
  "/management": ["senior_management"],
  "/program-director": ["program_director"],
  "/academic-affairs": ["academic_affairs"],
  "/professor": ["professor"],
  "/integrity": ["it_academic_integrity", "senior_management"],
  "/my-progress": ["student"],
  "/exam-activity": [
    "senior_management",
    "program_director",
  ],
  "/courses": [
    "senior_management",
    "program_director",
    "academic_affairs",
    "professor",
  ],
  "/performance": [
    "senior_management",
    "program_director",
    "academic_affairs",
    "professor",
  ],
  "/students": [
    "senior_management",
    "program_director",
    "academic_affairs",
    "professor",
  ],
  "/participation": [
    "senior_management",
    "program_director",
    "academic_affairs",
    "professor",
  ],
  "/item-analysis": ["program_director", "professor"],
  "/real-time": ["professor", "it_academic_integrity"],
};

export function rolesAllowedForPath(pathname: string): Role[] | undefined {
  if (allowedRolesByPath[pathname]) return allowedRolesByPath[pathname];
  if (pathname.startsWith("/students/")) {
    return allowedRolesByPath["/students"];
  }
  return undefined;
}

export function assertRoleAccess(
  pathname: string,
  role: Role = getActiveDemoRole(),
) {
  const allowed = rolesAllowedForPath(pathname);
  if (!allowed) return;
  if (!allowed.includes(role)) {
    throw redirect({ to: roleHome[role] });
  }
}

/** Factory for route beforeLoad guards. */
export function roleGuard(pathname: string) {
  return () => {
    assertRoleAccess(pathname, getActiveDemoRole());
  };
}
