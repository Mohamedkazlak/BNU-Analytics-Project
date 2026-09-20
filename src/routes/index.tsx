import { createFileRoute, redirect } from "@tanstack/react-router";
import { getActiveDemoRole, roleGuard, roleHome } from "@/lib/auth/role-guards";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const role = getActiveDemoRole();
    if (!role) {
      throw redirect({ to: "/login" });
    }
    throw redirect({ to: roleHome[role] });
  },
  component: () => null,
});
