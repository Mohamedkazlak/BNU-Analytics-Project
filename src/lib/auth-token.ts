import { parseJwt } from "./parseJwt";
import type { Role } from "./types";

export const AUTH_TOKEN_KEY = "token";
export const AUTH_COOKIE_NAME = "bnu_token";
const TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60;

function readCookie(source: string, name: string): string | null {
  const parts = source.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1)) || null;
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(AUTH_TOKEN_KEY);
      if (stored) return stored;
    } catch {
      /* ignore */
    }
    return readCookie(document.cookie, AUTH_COOKIE_NAME);
  }
  return null;
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function roleFromToken(token: string | null): Role | null {
  if (!token) return null;
  const payload = parseJwt(token);
  return (payload?.role as Role | undefined) ?? null;
}

export function userIdFromToken(token: string | null): string | null {
  if (!token) return null;
  const payload = parseJwt(token);
  return (payload?.user_id as string | undefined) ?? null;
}
