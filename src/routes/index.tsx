import { createFileRoute, redirect } from "@tanstack/react-router";
import { getActiveDemoRole, ROLE_SLUG } from "@/lib/auth/role-guards";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const role = getActiveDemoRole();
    if (!role) {
      throw redirect({ to: "/login" });
    }
    throw redirect({ to: "/$role", params: { role: ROLE_SLUG[role] } });
  },
  component: () => null,
});
