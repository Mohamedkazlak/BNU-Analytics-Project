import { redirect } from "@tanstack/react-router";
import type { Role } from "../types";
import { getAuthToken, roleFromToken, userIdFromToken } from "./token";

export const roleHome: Record<Role, string> = {
  senior_management: "/management",
  program_director: "/program-director",
  academic_affairs: "/academic-affairs",
  professor: "/professor",
  it_academic_integrity: "/integrity",
  student: "/my-progress",
};

export const roleRoutes = roleHome;

/** Gets role from the JWT in localStorage or the auth cookie. */
export function getActiveDemoRole(): Role | null {
  return roleFromToken(getAuthToken());
}

export function getActiveDemoUserId(): string | null {
  return userIdFromToken(getAuthToken());
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
    "academic_affairs",
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
  "/item-analysis": [
    "senior_management",
    "program_director",
    "academic_affairs",
    "professor",
    "it_academic_integrity",
  ],
  "/real-time": ["senior_management", "professor", "it_academic_integrity"],
};

export function rolesAllowedForPath(pathname: string): Role[] | undefined {
  if (allowedRolesByPath[pathname]) return allowedRolesByPath[pathname];
  if (pathname.startsWith("/students/")) {
    return allowedRolesByPath["/students"];
  }
  return undefined;
}

export function assertRoleAccess(pathname: string, role: Role | null) {
  if (!role) {
    throw redirect({ to: "/login" });
  }

  const allowed = rolesAllowedForPath(pathname);
  if (!allowed) return;
  if (!allowed.includes(role)) {
    throw redirect({ to: roleHome[role] });
  }
}

/** Factory for route beforeLoad guards. */
export function roleGuard(pathname: string) {
  return () => {
    if (typeof window === "undefined") return;
    assertRoleAccess(pathname, getActiveDemoRole());
  };
}
