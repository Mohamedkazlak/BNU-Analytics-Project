import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";
import {
  demoUsers,
  displayRoleLabel,
  affiliationForScope,
  navByRole,
  roleHome,
  useRole,
} from "./role-context";
import type { DemoUser } from "@/lib/types";
import bnuMark from "@/assets/bnu-mark.png.asset.json";
import { clearAuthToken } from "@/lib/auth-token";
import { rolesAllowedForPath } from "@/lib/role-guards";

function AffiliationParts({ user }: { user: DemoUser }) {
  const affiliation = affiliationForScope(user.scopeId);
  if (!affiliation.sector && !affiliation.college) {
    return <span className="text-ink-soft">{affiliation.label}</span>;
  }
  return (
    <span className="text-ink-soft">
      {affiliation.sector && <span>{affiliation.sector}</span>}
      {affiliation.sector && affiliation.college && (
        <span className="mx-1.5 text-ink-soft/50">·</span>
      )}
      {affiliation.college && <span>{affiliation.college}</span>}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setUser, user, displayRole, affiliation } = useRole();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const groups = navByRole[role];
  const ownerUser = demoUsers.find((u) =>
    navByRole[u.role].some((g) => g.items.some((item) => item.to === pathname)),
  );
  const owner = ownerUser?.role;
  const current = (owner ? navByRole[owner] : groups)
    .flatMap((g) => g.items)
    .find((item) => item.to === pathname);

  // Deep-linking into another role's report sends the user to their own home.
  useEffect(() => {
    const allowed = rolesAllowedForPath(pathname);
    if (allowed && !allowed.includes(role)) {
      void navigate({ to: roleHome[role] });
    }
  }, [navigate, pathname, role]);

  const switchUser = (next: DemoUser) => {
    setUser(next.id);
    setOpen(false);
    navigate({ to: roleHome[next.role] });
  };

  return (
    <div className="min-h-screen w-full text-ink">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 border-r border-white/70 bg-white/55 px-5 py-6 backdrop-blur-2xl md:flex">
          <div className="mb-6 flex items-center gap-2.5">
            <img
              className="size-10 shrink-0 object-contain"
              src={bnuMark.url}
              alt="BNU logo"
            />
            <div>
              <div className="font-display text-sm font-bold leading-none">
                BNU
              </div>
              <div className="mt-1 text-[10px] font-semibold text-ink-soft">
                AI-driven Dashboard
              </div>
            </div>
          </div>

          {groups.map((group) => (
            <div key={group.group} className="mb-2">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
                {group.group}
              </div>
              {group.items.map((item) => {
                const active = item.to === pathname;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-colors",
                      active
                        ? "bg-iris/12 font-semibold text-iris"
                        : "font-medium text-ink-soft hover:bg-white/60 hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        active ? "bg-iris" : "bg-ink-soft/40",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}

          <div className="mt-auto rounded-2xl border border-white/70 bg-white/60 p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="font-display grid size-9 place-items-center rounded-full bg-violet/15 text-[12px] font-bold text-plum">
                {user.initials}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold leading-tight">
                  {user.name}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold text-iris">
                  {displayRole}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-ink-soft">
                  <AffiliationParts user={user} />
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
                <span className="text-iris">{displayRole}</span>
                <span className="text-ink-soft/40" aria-hidden>
                  |
                </span>
                {!affiliation.sector && !affiliation.college ? (
                  <span className="text-ink-soft">{affiliation.label}</span>
                ) : (
                  <>
                    {affiliation.sector && (
                      <span className="text-ink-soft">
                        {affiliation.sector}
                      </span>
                    )}
                    {affiliation.sector && affiliation.college && (
                      <span className="text-ink-soft/40" aria-hidden>
                        ·
                      </span>
                    )}
                    {affiliation.college && (
                      <span className="text-ink-soft">
                        {affiliation.college}
                      </span>
                    )}
                  </>
                )}
              </div>
              <h1 className="font-display mt-1 text-2xl font-extrabold text-ink">
                {current?.title ?? "Reports"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  clearAuthToken();
                  window.location.href = "/login";
                }}
                className="flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-[12px] font-semibold text-iris backdrop-blur-xl hover:bg-white"
              >
                Log out
              </button>
              {role !== "student" && (
                <button className="rounded-full bg-iris px-4 py-2 text-[12px] font-semibold text-white shadow-lg shadow-iris/25">
                  Export Report
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">{children}</div>

          <nav className="mt-8 flex flex-wrap gap-2 md:hidden">
            {groups
              .flatMap((g) => g.items)
              .map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-[12px] font-medium text-ink-soft"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        </main>
      </div>
      {role !== "student" && <ChatPanel />}
    </div>
  );
}
