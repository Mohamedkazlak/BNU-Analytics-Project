import { createFileRoute, redirect } from "@tanstack/react-router";
import { LegacyStudentRedirect } from "@/components/legacy-redirect";
import { ROLE_SLUG, getActiveDemoRole } from "@/lib/auth/role-guards";

export const Route = createFileRoute("/students/$studentId")({
  beforeLoad: ({ params }) => {
    if (typeof window === "undefined") return;
    const role = getActiveDemoRole();
    if (!role) {
      throw redirect({ to: "/login" });
    }
    throw redirect({
      to: "/$role/students/$studentId",
      params: { role: ROLE_SLUG[role], studentId: params.studentId },
      search: {},
    });
  },
  component: LegacyStudentRedirect,
});
