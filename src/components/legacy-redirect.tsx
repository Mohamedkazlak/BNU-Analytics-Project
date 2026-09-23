import { useLayoutEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ROLE_SLUG,
  getActiveDemoRole,
  roleRouteTo,
} from "@/lib/auth/role-guards";

export function LegacyRedirect({ leaf }: { leaf: string }) {
  const navigate = useNavigate();

  useLayoutEffect(() => {
    const role = getActiveDemoRole();
    if (!role) {
      window.location.href = "/login";
      return;
    }
    void navigate({
      to: roleRouteTo(leaf),
      params: { role: ROLE_SLUG[role] },
      search: {},
      replace: true,
    });
  }, [leaf, navigate]);

  return null;
}

export function LegacyStudentRedirect() {
  const navigate = useNavigate();
  const { studentId } = useParams({ strict: false });

  useLayoutEffect(() => {
    const role = getActiveDemoRole();
    if (!role) {
      window.location.href = "/login";
      return;
    }
    if (!studentId) return;
    void navigate({
      to: "/$role/students/$studentId",
      params: { role: ROLE_SLUG[role], studentId },
      search: {},
      replace: true,
    });
  }, [navigate, studentId]);

  return null;
}
