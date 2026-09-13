import { createFileRoute, redirect } from "@tanstack/react-router";
import { getActiveDemoRole, roleGuard, roleHome } from "@/lib/role-guards";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const role = getActiveDemoRole();
    throw redirect({ to: roleHome[role] });
  },
  component: () => null,
});
