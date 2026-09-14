import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { roleRoutes, getActiveDemoRole } from "../lib/role-guards";
import { setAuthToken } from "../lib/auth-token";
import { BACKEND_URL } from "../lib/api";

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-900/5">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-gray-600">BNU Analytics Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            Demo Accounts
          </h3>
          <div className="space-y-3 text-xs text-gray-600">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-gray-900">u-president</span>
                <p>University President</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  /management
                </span>
                <p className="mt-1 text-gray-500">
                  Sees everything about everyone
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-gray-900">u-vp-aa</span>
                <p>VP for Academic Affairs</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  /management
                </span>
                <p className="mt-1 text-gray-500">
                  Sees everything about everyone
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-gray-900">u-dean-eng</span>
                <p>Sector Dean</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  /management
                </span>
                <p className="mt-1 text-gray-500">
                  Sees everything about colleges he supervises
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-gray-900">u-pd-cs</span>
                <p>Program Director</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                  /program-director
                </span>
                <p className="mt-1 text-gray-500">
                  Sees everything about his college
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-gray-900">u-aa-cs</span>
                <p>Academic Affairs</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                  /academic-affairs
                </span>
                <p className="mt-1 text-gray-500">
                  Sees everything about students of his college
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-gray-900">u-prof-cs</span>
                <p>Professor</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-md bg-pink-50 px-2 py-1 text-xs font-medium text-pink-700 ring-1 ring-inset ring-pink-700/10">
                  /professor
                </span>
                <p className="mt-1 text-gray-500">
                  Sees everything about his curriculums
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-gray-900">
                  u-it-integrity
                </span>
                <p>IT / Academic Integrity</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-700/10">
                  /integrity
                </span>
                <p className="mt-1 text-gray-500">
                  Sees live exam monitoring & flagged cases
                </p>
              </div>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="font-semibold text-gray-900">u-student</span>
                <p>Student</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                  /my-progress
                </span>
                <p className="mt-1 text-gray-500">
                  Sees his own performance & recommendations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
