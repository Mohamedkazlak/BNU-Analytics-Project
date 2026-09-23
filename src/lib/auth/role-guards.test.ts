import { describe, expect, it } from "vitest";
import {
  legacyRedirectTo,
  reportPath,
  roleHome,
  roleHref,
  roleNavigateTarget,
  roleRouteTo,
  roleSlug,
  rolesAllowedForPath,
} from "./role-guards";

describe("role urls", () => {
  it("puts the role slug in the home path", () => {
    expect(roleSlug("senior_management")).toBe("senior-management");
    expect(roleHome("senior_management")).toBe("/senior-management");
    expect(roleHref("senior_management", "/courses")).toBe(
      "/senior-management/courses",
    );
    expect(roleHref("professor", "/management")).toBe("/professor");
    expect(roleRouteTo("/courses")).toBe("/$role/courses");
    expect(roleRouteTo("/")).toBe("/$role");
    expect(roleRouteTo("/my-progress")).toBe("/$role");
  });

  it("strips the role slug when checking report access", () => {
    expect(reportPath("/senior-management/courses")).toBe("/courses");
    expect(reportPath("/senior-management")).toBe("/");
    expect(rolesAllowedForPath("/senior-management/courses")).toContain(
      "senior_management",
    );
    expect(rolesAllowedForPath("/student/courses")).not.toContain("student");
  });

  it("rewrites leftover unprefixed report urls", () => {
    expect(legacyRedirectTo("/courses", "senior_management")).toBe(
      "/senior-management/courses",
    );
    expect(legacyRedirectTo("/management", "senior_management")).toBe(
      "/senior-management",
    );
    expect(legacyRedirectTo("/students/s7", "professor")).toBe(
      "/professor/students/s7",
    );
    expect(
      legacyRedirectTo("/senior-management/courses", "senior_management"),
    ).toBeNull();
    expect(roleNavigateTarget("/senior-management/courses")).toEqual({
      to: "/$role/courses",
      params: { role: "senior-management" },
    });
  });
});
