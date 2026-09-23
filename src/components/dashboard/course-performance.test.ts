import { describe, expect, it } from "vitest";
import {
  coursesScopeMessage,
  coursesScopeReady,
  courseStanding,
  courseStandingLabel,
  filterByStanding,
  sortComparisonRows,
  toggleComparisonSort,
} from "./course-performance";

describe("course standing", () => {
  it("treats 75% and above as on track", () => {
    expect(courseStanding(75)).toBe("on_track");
    expect(courseStanding(90)).toBe("on_track");
    expect(courseStandingLabel("on_track")).toBe("On track");
  });

  it("treats below 75% as needs support", () => {
    expect(courseStanding(74.9)).toBe("needs_support");
    expect(courseStanding(0)).toBe("needs_support");
    expect(courseStandingLabel("needs_support")).toBe("Needs support");
  });

  it("filters comparison rows by standing", () => {
    const rows = [
      { course: "Algorithms", passRate: 82 },
      { course: "Calculus", passRate: 61 },
    ];
    expect(filterByStanding(rows, "all")).toHaveLength(2);
    expect(filterByStanding(rows, "on_track").map((row) => row.course)).toEqual([
      "Algorithms",
    ]);
    expect(
      filterByStanding(rows, "needs_support").map((row) => row.course),
    ).toEqual(["Calculus"]);
  });
});

describe("section comparison sort", () => {
  const rows = [
    { course: "Calculus", enrolled: 12, average: 81, passRate: 90 },
    { course: "Algorithms", enrolled: 40, average: 64, passRate: 55 },
    { course: "Biology", enrolled: 8, average: 70, passRate: 75 },
  ];

  it("sorts names A → Z and numbers high → low by default direction", () => {
    expect(
      sortComparisonRows(rows, "course", true).map((row) => row.course),
    ).toEqual(["Algorithms", "Biology", "Calculus"]);
    expect(
      sortComparisonRows(rows, "enrolled", false).map((row) => row.course),
    ).toEqual(["Algorithms", "Calculus", "Biology"]);
  });

  it("sorts standing with on track above needs support when descending", () => {
    expect(
      sortComparisonRows(rows, "standing", false).map((row) => row.course),
    ).toEqual(["Calculus", "Biology", "Algorithms"]);
  });

  it("flips direction on the same column and starts A → Z for course", () => {
    expect(toggleComparisonSort("average", false, "average")).toEqual({
      key: "average",
      asc: true,
    });
    expect(toggleComparisonSort("average", false, "course")).toEqual({
      key: "course",
      asc: true,
    });
    expect(toggleComparisonSort("course", true, "enrolled")).toEqual({
      key: "enrolled",
      asc: false,
    });
  });
});

describe("courses scope", () => {
  it("lets professors open their assigned curricula", () => {
    expect(coursesScopeReady("professor", {})).toBe(true);
  });

  it("requires a professor for college-scoped staff", () => {
    expect(coursesScopeReady("program_director", {})).toBe(false);
    expect(
      coursesScopeReady("academic_affairs", { professorId: "p-1" }),
    ).toBe(true);
  });

  it("requires college and professor for senior management", () => {
    expect(coursesScopeReady("senior_management", { collegeId: "col-a" })).toBe(
      false,
    );
    expect(
      coursesScopeReady("senior_management", {
        collegeId: "col-a",
        professorId: "p-1",
      }),
    ).toBe(true);
    expect(coursesScopeMessage("senior_management")).toContain("college");
  });
});
