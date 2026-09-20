import { describe, expect, it } from "vitest";
import { defaultVisible } from "@/lib/filter-types";
import {
  filterQueryKey,
  sanitizeFilters,
  setFilterCollege,
  setFilterCurriculum,
  setFilterProfessor,
  setFilterSector,
  setFilterStudent,
  toSearchParams,
} from "@/lib/filter-types";

describe("role-based-filter-visibility", () => {
  it("shows Sector, College and Professor for university senior management", () => {
    expect(defaultVisible("senior_management", "university")).toEqual([
      "sector",
      "college",
      "professor",
    ]);
  });

  it("hides Sector and shows College + Professor for a sector dean", () => {
    const visible = defaultVisible("senior_management", "sector");
    expect(visible).not.toContain("sector");
    expect(visible).toEqual(["college", "professor"]);
  });

  it("shows Curriculum, Professor and Student for program directors", () => {
    expect(defaultVisible("program_director")).toEqual([
      "curriculum",
      "professor",
      "student",
    ]);
  });

  it("matches program directors for academic affairs", () => {
    expect(defaultVisible("academic_affairs")).toEqual(
      defaultVisible("program_director"),
    );
  });

  it("shows Curriculum + Student for professors", () => {
    expect(defaultVisible("professor")).toEqual(["curriculum", "student"]);
  });

  it("shows exam-scoped filters for academic integrity", () => {
    expect(defaultVisible("it_academic_integrity")).toEqual([
      "sector",
      "college",
      "curriculum",
    ]);
  });
});

describe("analytics-filters parent clearing", () => {
  it("clears college, professor, curriculum and student when sector changes", () => {
    const next = setFilterSector("sec-b");
    expect(next).toEqual({ sectorId: "sec-b" });
    expect(next.collegeId).toBeUndefined();
    expect(next.professorId).toBeUndefined();
    expect(next.curriculumId).toBeUndefined();
    expect(next.studentId).toBeUndefined();
  });

  it("clears professor, curriculum and student when college changes", () => {
    const next = setFilterCollege(
      {
        sectorId: "sec-a",
        collegeId: "col-a",
        professorId: "p-prof",
        curriculumId: "c1",
        studentId: "s1",
      },
      "col-b",
    );
    expect(next).toEqual({ sectorId: "sec-a", collegeId: "col-b" });
  });

  it("clears curriculum and student when professor changes", () => {
    const next = setFilterProfessor(
      {
        sectorId: "sec-a",
        collegeId: "col-a",
        professorId: "p-a",
        curriculumId: "c1",
        studentId: "s1",
      },
      "p-b",
    );
    expect(next).toEqual({
      sectorId: "sec-a",
      collegeId: "col-a",
      professorId: "p-b",
    });
  });

  it("keeps professor when curriculum changes and clears student", () => {
    const next = setFilterCurriculum(
      {
        sectorId: "sec-a",
        collegeId: "col-a",
        professorId: "p-prof",
        curriculumId: "c1",
        studentId: "s1",
      },
      "c2",
    );
    expect(next).toEqual({
      sectorId: "sec-a",
      collegeId: "col-a",
      professorId: "p-prof",
      curriculumId: "c2",
    });
  });

  it("keeps ancestors when only student changes", () => {
    const next = setFilterStudent(
      {
        sectorId: "sec-a",
        collegeId: "col-a",
        professorId: "p-prof",
        curriculumId: "c1",
      },
      "s9",
    );
    expect(next.studentId).toBe("s9");
    expect(next.curriculumId).toBe("c1");
    expect(next.professorId).toBe("p-prof");
  });
});

describe("filter-query-keys", () => {
  it("includes user and every filter field", () => {
    const key = filterQueryKey("management-overview", "u1", {
      sectorId: "sec-a",
      collegeId: "col-a",
      curriculumId: "c1",
      studentId: "s7",
      professorId: "p-prof",
    });
    expect(key).toEqual([
      "management-overview",
      "u1",
      "sec-a",
      "col-a",
      "c1",
      "s7",
      "p-prof",
    ]);
  });

  it("serializes a stable query string", () => {
    expect(toSearchParams({ sectorId: "sec-a", collegeId: "col-a" })).toBe(
      "?sectorId=sec-a&collegeId=col-a",
    );
  });

  it("drops hidden fields when sanitizing for a role", () => {
    const next = sanitizeFilters(
      {
        sectorId: "sec-a",
        collegeId: "col-a",
        curriculumId: "c1",
        studentId: "s7",
        professorId: "p-prof",
      },
      ["college", "professor"],
    );
    expect(next).toEqual({ collegeId: "col-a", professorId: "p-prof" });
  });
});
