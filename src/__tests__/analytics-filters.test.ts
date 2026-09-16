import { describe, expect, it } from "vitest";
import { defaultVisible } from "@/components/analytics-filters";
import {
  filterQueryKey,
  setFilterCollege,
  setFilterCurriculum,
  setFilterSector,
  setFilterStudent,
  toSearchParams,
} from "@/lib/filter-types";

describe("role-based-filter-visibility", () => {
  it("shows Sector + College for university senior management", () => {
    const visible = defaultVisible("senior_management", "university");
    expect(visible).toContain("sector");
    expect(visible).toContain("college");
  });

  it("hides Sector and shows College for a sector dean", () => {
    const visible = defaultVisible("senior_management", "sector");
    expect(visible).not.toContain("sector");
    expect(visible).toContain("college");
  });

  it("shows Curriculum + Student for program directors", () => {
    expect(defaultVisible("program_director")).toEqual([
      "curriculum",
      "student",
    ]);
  });

  it("shows only Student for professors", () => {
    expect(defaultVisible("professor")).toEqual(["student"]);
  });
});

describe("analytics-filters parent clearing", () => {
  it("clears college, curriculum and student when sector changes", () => {
    const next = setFilterSector("sec-b");
    expect(next).toEqual({ sectorId: "sec-b" });
    expect(next.collegeId).toBeUndefined();
    expect(next.curriculumId).toBeUndefined();
    expect(next.studentId).toBeUndefined();
  });

  it("clears curriculum and student when college changes", () => {
    const next = setFilterCollege(
      {
        sectorId: "sec-a",
        collegeId: "col-a",
        curriculumId: "c1",
        studentId: "s1",
      },
      "col-b",
    );
    expect(next).toEqual({ sectorId: "sec-a", collegeId: "col-b" });
  });

  it("clears student when curriculum changes", () => {
    const next = setFilterCurriculum(
      {
        sectorId: "sec-a",
        collegeId: "col-a",
        curriculumId: "c1",
        studentId: "s1",
      },
      "c2",
    );
    expect(next).toEqual({
      sectorId: "sec-a",
      collegeId: "col-a",
      curriculumId: "c2",
    });
  });

  it("keeps ancestors when only student changes", () => {
    const next = setFilterStudent(
      { sectorId: "sec-a", collegeId: "col-a", curriculumId: "c1" },
      "s9",
    );
    expect(next.studentId).toBe("s9");
    expect(next.curriculumId).toBe("c1");
  });
});

describe("filter-query-keys", () => {
  it("includes user and every filter field", () => {
    const key = filterQueryKey("management-overview", "u1", {
      sectorId: "sec-a",
      collegeId: "col-a",
      curriculumId: "c1",
      studentId: "s7",
    });
    expect(key).toEqual([
      "management-overview",
      "u1",
      "sec-a",
      "col-a",
      "c1",
      "s7",
    ]);
  });

  it("serializes a stable query string", () => {
    expect(toSearchParams({ sectorId: "sec-a", collegeId: "col-a" })).toBe(
      "?sectorId=sec-a&collegeId=col-a",
    );
  });
});
