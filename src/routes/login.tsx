import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { roleRoutes, getActiveDemoRole } from "../lib/role-guards";
import { setAuthToken } from "../lib/auth-token";
import { BACKEND_URL } from "../lib/api";

const DEMO_ACCOUNTS = [
  {
    id: "u-president",
    title: "University President",
    route: "/management",
    badge: "bg-blue-50 text-blue-700 ring-blue-700/10",
    description: "Sees everything about everyone",
  },
  {
    id: "u-vp-aa",
    title: "VP for Academic Affairs",
    route: "/management",
    badge: "bg-blue-50 text-blue-700 ring-blue-700/10",
    description: "Sees everything about everyone",
  },
  {
    id: "u-dean-eng",
    title: "Sector Dean",
    route: "/management",
    badge: "bg-blue-50 text-blue-700 ring-blue-700/10",
    description: "Sees everything about colleges he supervises",
  },
  {
    id: "u-pd-cs",
    title: "Program Director",
    route: "/program-director",
    badge: "bg-indigo-50 text-indigo-700 ring-indigo-700/10",
    description: "Sees everything about his college",
  },
  {
    id: "u-aa-cs",
    title: "Academic Affairs",
    route: "/academic-affairs",
    badge: "bg-purple-50 text-purple-700 ring-purple-700/10",
    description: "Sees everything about students of his college",
  },
  {
    id: "u-prof-cs",
    title: "Professor",
    route: "/professor",
    badge: "bg-pink-50 text-pink-700 ring-pink-700/10",
    description: "Sees everything about his curriculums",
  },
  {
    id: "u-it-integrity",
    title: "IT / Academic Integrity",
    route: "/integrity",
    badge: "bg-red-50 text-red-700 ring-red-700/10",
    description: "Sees live exam monitoring & flagged cases",
  },
  {
    id: "u-student",
    title: "Student",
    route: "/my-progress",
    badge: "bg-green-50 text-green-700 ring-green-700/10",
    description: "Sees his own performance & recommendations",
  },
] as const;

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const role = getActiveDemoRole();
    if (role) {
      throw redirect({ to: roleRoutes[role] || "/" });
    }
  },
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const role = getActiveDemoRole();
    if (role) {
      void navigate({ to: roleRoutes[role] || "/" });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await res.json();
      setAuthToken(data.access_token);

      const meRes = await fetch(`${BACKEND_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const me = await meRes.json();

      const role = me.role as keyof typeof roleRoutes;
      const targetRoute = roleRoutes[role] || "/my-progress";
      // Full navigation (not the SPA `navigate()`) so RoleProvider remounts
      // and re-reads the freshly-written token. RoleProvider's sync effect
      // only re-checks the token when its own derived role/user state
      // changes, so a client-side transition right after login would keep
      // showing the previous (default) role's nav until a manual reload.
      window.location.href = targetRoute;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-gray-50 p-4 sm:p-6">
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5 sm:max-h-[calc(100dvh-3rem)]">
        <div className="grid min-h-0 w-full grid-cols-1 overflow-y-auto md:grid-cols-[minmax(16rem,20rem)_1fr] md:overflow-hidden">
          <div className="flex flex-col justify-center p-6 sm:p-8 md:border-r md:border-gray-200">
            <div className="mb-6 text-center">
              <img
                src="/brand-logo.png"
                alt="BNU logo"
                className="mx-auto mb-4 h-14 w-auto object-contain"
              />
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Sign in
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                BNU Analytics Dashboard
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  User ID
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="e.g. u-president"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>

          <div className="flex min-h-0 flex-col border-t border-gray-200 p-5 sm:p-6 md:border-t-0 md:overflow-y-auto">
            <h3 className="mb-3 text-sm font-medium text-gray-900">
              Demo Accounts
            </h3>
            <div className="space-y-2 text-xs text-gray-600">
              {DEMO_ACCOUNTS.map((account) => (
                <div
                  key={account.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-gray-900">
                      {account.id}
                    </span>
                    <p>{account.title}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${account.badge}`}
                    >
                      {account.route}
                    </span>
                    <p className="mt-1 text-gray-500">{account.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
