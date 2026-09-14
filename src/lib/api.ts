import {
  currentStudentId,
  passMark,
  students,
  yearlyRecords,
} from "./mock-data";
import {
  attemptsInScope,
  coursesInScope,
  examsInScope,
  getActiveViewerScope,
  questionsInScope,
  studentInViewerScope,
  studentsInScope,
  type ViewerScope,
} from "./data-scope";
import type {
  CoursePerformanceReport,
  IntegrityReport,
  ItemAnalysisReport,
  ManagementOverview,
  ParticipationReport,
  RealTimeReport,
  StudentDashboardReport,
  StudentDirectoryRow,
  StudentPerformanceReport,
  StudentProfileReport,
} from "./types";
import { getAuthToken, clearAuthToken } from "./auth-token";

const USE_FASTAPI_BACKEND = true; // Toggle to true once the FastAPI backend is running
const BACKEND_URL = "http://localhost:8000";

async function fetchFromBackend<T>(endpoint: string): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  if (response.status === 401) {
    clearAuthToken();
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (response.status === 403) {
    throw new Error("Access Denied");
  }
  if (!response.ok) {
    throw new Error(`Backend error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/** Simulated network latency so every screen exercises its loading state. */
function request<T>(payload: () => T, ms = 650): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(payload()), ms);
  });
}

const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const round1 = (n: number) => Number(n.toFixed(1));

const shortTitle = (title: string) => title.split("—")[0]!.trim();

function examLabelFor(
  examId: string,
  examList: ReturnType<typeof examsInScope>,
) {
  const exam = examList.find((e) => e.id === examId);
  if (!exam) return examId;
  return `${exam.courseCode} · ${shortTitle(exam.title)}`;
}

function view(scope?: ViewerScope) {
  const v = scope ?? getActiveViewerScope();
  const courseList = coursesInScope(v);
  const examList = examsInScope(v);
  const studentList = studentsInScope(v);
  const attemptList = attemptsInScope(v);
  const takenList = attemptList.filter((a) => a.participated);
  return { v, courseList, examList, studentList, attemptList, takenList };
}

function scaledKpis(
  v: ViewerScope,
  examCount: number,
  participantCount: number,
  passRate: number,
  completion: number,
) {
  const label =
    v.level === "course"
      ? "My sittings"
      : v.level === "program"
        ? "College participants"
        : v.level === "sector"
          ? "Sector participants"
          : "Total participants";
  return [
    {
      label: "Exams administered",
      value: examCount.toLocaleString(),
      delta: "vs last term",
      direction: "up" as const,
    },
    {
      label,
      value: participantCount.toLocaleString(),
      delta: "vs last term",
      direction: "up" as const,
    },
    {
      label: "Overall pass rate",
      value: `${round1(passRate)}%`,
      delta: "vs last term",
      direction: passRate >= 70 ? ("up" as const) : ("down" as const),
    },
    {
      label: "Avg completion",
      value: `${round1(completion)}%`,
      delta: "vs last term",
      direction: completion >= 90 ? ("up" as const) : ("down" as const),
    },
  ];
}

export function getManagementOverview(
  scope?: ViewerScope,
): Promise<ManagementOverview> {
  if (USE_FASTAPI_BACKEND) {
    return fetchFromBackend<ManagementOverview>("/api/management-overview");
  }

  return request(() => {
    const { v, courseList, examList, attemptList, takenList } = view(scope);
    const passRate =
      takenList.length === 0
        ? 0
        : (takenList.filter((a) => a.score >= passMark).length /
            takenList.length) *
          100;
    const completion =
      attemptList.length === 0
        ? 0
        : (takenList.length / attemptList.length) * 100;

    const passRateByCourse = courseList.map((course) => {
      const courseExams = examList
        .filter((e) => e.courseId === course.id)
        .map((e) => e.id);
      const rows = takenList.filter((a) => courseExams.includes(a.examId));
      return {
        course: course.code,
        passRate: round1(
          rows.length
            ? (rows.filter((a) => a.score >= passMark).length / rows.length) *
                100
            : 0,
        ),
        participants: rows.length,
      };
    });

    const passRateByCollege = v.programs.map((college) => {
      const collegeCourses = courseList.filter((c) => c.program === college);
      const ids = new Set(
        examList
          .filter((e) => collegeCourses.some((c) => c.id === e.courseId))
          .map((e) => e.id),
      );
      const rows = takenList.filter((a) => ids.has(a.examId));
      return {
        college,
        passRate: round1(
          rows.length
            ? (rows.filter((a) => a.score >= passMark).length / rows.length) *
                100
            : 0,
        ),
        participants: rows.length,
        courses: collegeCourses.length,
      };
    });

    const months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    const activityTrend = months.map((month, i) => {
      const monthExams = examList.filter(
        (exam) => Number(exam.date.slice(5, 7)) === i + 2,
      );
      const ids = new Set(monthExams.map((exam) => exam.id));
      return {
        month,
        exams: monthExams.length,
        participants: takenList.filter((a) => ids.has(a.examId)).length,
      };
    });

    const weakest = [...passRateByCollege].sort(
      (a, b) => a.passRate - b.passRate,
    )[0];
    const weakestCourse = [...passRateByCourse].sort(
      (a, b) => a.passRate - b.passRate,
    )[0];

    let insight = `${v.label}: pass rate is ${round1(passRate)}% this term.`;
    if (v.level === "university" && weakest) {
      insight = `Pass rates slipped across the university, with ${weakest.college} the weakest college at ${weakest.passRate}% — worth a sector review before the next cycle.`;
    } else if (v.level === "sector" && weakestCourse) {
      insight = `Across the colleges you supervise, ${weakestCourse.course} is the weakest curriculum at ${weakestCourse.passRate}% pass — the drop is concentrated, not sector-wide.`;
    } else if (weakestCourse) {
      insight = `Pass rates in ${weakestCourse.course} trail the rest of this view at ${weakestCourse.passRate}% — review that curriculum before the next sitting.`;
    }

    return {
      kpis: scaledKpis(
        v,
        examList.length,
        takenList.length,
        passRate,
        completion,
      ),
      passRateByCourse,
      passRateByCollege,
      activityTrend,
      insight,
    };
  });
}

export function getStudentPerformance(
  scope?: ViewerScope,
): Promise<StudentPerformanceReport> {
  if (USE_FASTAPI_BACKEND) {
    return fetchFromBackend<StudentPerformanceReport>(
      "/api/student-performance",
    );
  }

  return request(() => {
    const { examList, studentList, takenList } = view(scope);
    const nameOf = (id: string) =>
      students.find((s) => s.id === id)?.name ?? id;

    const averageByExam = examList.map((exam) => {
      const rows = takenList.filter((a) => a.examId === exam.id);
      return {
        exam: shortTitle(exam.title),
        course: exam.courseCode,
        average: round1(avg(rows.map((a) => a.score))),
      };
    });

    const sorted = [...takenList].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const passed = takenList.filter((a) => a.score >= passMark).length;

    const buckets = [
      "0–39",
      "40–49",
      "50–59",
      "60–69",
      "70–79",
      "80–89",
      "90–100",
    ];
    const distribution = buckets.map((bucket) => ({ bucket, students: 0 }));
    takenList.forEach((a) => {
      const idx =
        a.score < 40
          ? 0
          : a.score < 50
            ? 1
            : a.score < 60
              ? 2
              : a.score < 70
                ? 3
                : a.score < 80
                  ? 4
                  : a.score < 90
                    ? 5
                    : 6;
      distribution[idx]!.students += 1;
    });

    const ranked = studentList
      .map((student) => {
        const rows = takenList.filter((a) => a.studentId === student.id);
        const scores = rows.map((a) => a.score);
        const average = round1(avg(scores));
        const half = Math.max(1, Math.floor(rows.length / 2));
        const trend = Math.round(
          avg(scores.slice(half)) - avg(scores.slice(0, half)),
        );
        const lastExam = rows[rows.length - 1];
        const course =
          examList.find((e) => e.id === lastExam?.examId)?.courseCode ??
          student.program;
        return {
          studentId: student.id,
          name: student.name,
          course,
          average,
          best: scores.length ? Math.max(...scores) : 0,
          trend,
          status: (average >= passMark ? "Pass" : "Fail") as "Pass" | "Fail",
        };
      })
      .sort((a, b) => b.average - a.average)
      .map((row, i) => ({ ...row, rank: i + 1 }));

    const semesterComparison = averageByExam.map((row, i) => ({
      exam: row.exam,
      current: row.average,
      previous: round1(row.average - (i % 2 === 0 ? 3.4 : -2.1) - 1.8),
    }));

    return {
      averageByExam,
      highest: top
        ? {
            name: nameOf(top.studentId),
            score: top.score,
            exam: examLabelFor(top.examId, examList),
          }
        : { name: "—", score: 0, exam: "—" },
      lowest: bottom
        ? {
            name: nameOf(bottom.studentId),
            score: bottom.score,
            exam: examLabelFor(bottom.examId, examList),
          }
        : { name: "—", score: 0, exam: "—" },
      passFail: [
        { name: "Passed", value: passed },
        { name: "Failed", value: Math.max(0, takenList.length - passed) },
      ],
      distribution,
      ranked,
      semesterComparison,
      insight:
        takenList.length === 0
          ? "No attempts in this scope yet."
          : "Scores cluster tightly between 60 and 79, but the bottom decile is drifting further from the mean each exam — early intervention would lift the cohort pass rate.",
    };
  });
}

export function getItemAnalysis(
  scope?: ViewerScope,
): Promise<ItemAnalysisReport> {
  if (USE_FASTAPI_BACKEND) {
    return fetchFromBackend<ItemAnalysisReport>("/api/item-analysis");
  }

  return request(() => {
    const { v } = view(scope);
    const rows = [...questionsInScope(v)].sort(
      (a, b) => a.discriminationIndex - b.discriminationIndex,
    );
    return {
      questions: [...questionsInScope(v)],
      needsReview: rows.slice(0, 6),
      insight: rows[0]
        ? `Question ${rows[0].number} on ${rows[0].exam} has a discrimination index of ${rows[0].discriminationIndex} — strong and weak students answer it almost identically, which usually points to ambiguous wording rather than difficulty.`
        : "No items in this curriculum yet.",
    };
  });
}

export function getIntegrityReport(
  scope?: ViewerScope,
): Promise<IntegrityReport> {
  if (USE_FASTAPI_BACKEND) {
    return fetchFromBackend<IntegrityReport>("/api/integrity-report");
  }

  return request(() => {
    const { examList, studentList, takenList } = view(scope);
    const rows = takenList.slice(0, 45).map((a, i) => {
      const flags: string[] = [];
      if (a.attemptCount > 1) flags.push(`${a.attemptCount} attempts`);
      if (a.timeTakenMin < 25) flags.push("Unusually fast submission");
      if (a.lateStart) flags.push("Late start");
      if (i % 17 === 0) flags.push("Shared IP address");
      return {
        id: `${a.examId}-${a.studentId}`,
        student:
          studentList.find((s) => s.id === a.studentId)?.name ?? a.studentId,
        exam: examLabelFor(a.examId, examList),
        startedAt: a.startedAt.replace("T", " "),
        endedAt: a.endedAt.replace("T", " "),
        ip: a.ip,
        device: a.device,
        attempts: a.attemptCount,
        flags,
      };
    });
    const flaggedCount = rows.filter((r) => r.flags.length > 0).length;
    const byExam = new Map<
      string,
      { flagged: number; total: number; program: string }
    >();
    for (const a of takenList.slice(0, 45)) {
      const label = examLabelFor(a.examId, examList);
      const entry = byExam.get(label) ?? {
        flagged: 0,
        total: 0,
        program: a.program,
      };
      entry.total += 1;
      const row = rows.find((r) => r.id === `${a.examId}-${a.studentId}`);
      if (row && row.flags.length) entry.flagged += 1;
      byExam.set(label, entry);
    }
    return {
      rows,
      summary: [...byExam.entries()].map(([exam, val]) => ({
        exam,
        program: val.program,
        flagged: val.flagged,
        total: val.total,
      })),
      flaggedCount,
      totalAttempts: rows.length,
      insight: `${flaggedCount} of ${rows.length} monitored attempts show at least one anomaly this period; repeated attempts from a shared subnet account for the largest cluster and should be reviewed manually.`,
    };
  });
}

export function getParticipationReport(
  scope?: ViewerScope,
): Promise<ParticipationReport> {
  if (USE_FASTAPI_BACKEND) {
    return fetchFromBackend<ParticipationReport>("/api/participation-report");
  }

  return request(() => {
    const { courseList, examList, attemptList, takenList } = view(scope);
    const attemptsPerExam = examList.map((exam) => {
      const rows = attemptList.filter((a) => a.examId === exam.id);
      return {
        exam: shortTitle(exam.title),
        attempts: rows.filter((a) => a.participated).length,
        expected: rows.length,
      };
    });
    const avgTimePerExam = examList.map((exam) => ({
      exam: shortTitle(exam.title),
      minutes: Math.round(
        avg(
          takenList
            .filter((a) => a.examId === exam.id)
            .map((a) => a.timeTakenMin),
        ),
      ),
    }));
    const absentees = attemptList
      .filter((a) => !a.participated || a.lateStart)
      .slice(0, 12)
      .map((a) => ({
        student:
          students.find((s) => s.id === a.studentId)?.name ?? a.studentId,
        exam: examLabelFor(a.examId, examList),
        reason: (a.participated ? "Late start" : "No attempt") as
          "No attempt" | "Late start",
        minutesLate: a.participated
          ? 8 + (Number(a.studentId.slice(1)) % 22)
          : 0,
      }));

    const attendanceByCurriculum = courseList.map((course) => {
      const ids = examList
        .filter((e) => e.courseId === course.id)
        .map((e) => e.id);
      const rows = attemptList.filter((a) => ids.includes(a.examId));
      const present = rows.filter((a) => a.participated && !a.lateStart).length;
      return {
        course: course.code,
        attendance: round1(rows.length ? (present / rows.length) * 100 : 0),
        absentees: rows.filter((a) => !a.participated).length,
      };
    });
    const attendanceRate = round1(
      avg(attendanceByCurriculum.map((r) => r.attendance)),
    );

    return {
      attemptsPerExam,
      completionRate: round1(
        attemptList.length ? (takenList.length / attemptList.length) * 100 : 0,
      ),
      attendanceRate,
      attendanceByCurriculum,
      avgTimePerExam,
      absentees,
      insight: attendanceByCurriculum.sort(
        (a, b) => a.attendance - b.attendance,
      )[0]
        ? `${attendanceByCurriculum[0]!.course} has the weakest attendance at ${attendanceByCurriculum[0]!.attendance}% — shifting that sitting out of the 9:00 slot would likely recover most of the absences.`
        : "No attendance rows in this scope yet.",
    };
  });
}

export function getCoursePerformance(
  scope?: ViewerScope,
): Promise<CoursePerformanceReport> {
  if (USE_FASTAPI_BACKEND) {
    return fetchFromBackend<CoursePerformanceReport>("/api/course-performance");
  }

  return request(() => {
    const { courseList, examList, studentList, takenList } = view(scope);
    const averageByCourse = courseList.map((course) => {
      const ids = examList
        .filter((e) => e.courseId === course.id)
        .map((e) => e.id);
      const rows = takenList.filter((a) => ids.includes(a.examId));
      const mean = avg(rows.map((a) => a.score));
      return {
        course: course.code,
        average: round1(mean),
        quality: Number(Math.min(10, Math.max(1, mean / 10 + 0.6)).toFixed(1)),
      };
    });

    const sections = courseList.flatMap((course) => {
      const ids = examList
        .filter((e) => e.courseId === course.id)
        .map((e) => e.id);
      return course.sections.map((section) => {
        const memberIds = studentList
          .filter((s) => s.section === section)
          .map((s) => s.id);
        const rows = takenList.filter(
          (a) => ids.includes(a.examId) && memberIds.includes(a.studentId),
        );
        return {
          section: `${course.code} · ${section}`,
          course: course.code,
          average: round1(avg(rows.map((a) => a.score))),
          passRate: round1(
            (rows.filter((a) => a.score >= passMark).length /
              Math.max(1, rows.length)) *
              100,
          ),
        };
      });
    });

    const lag = [...sections].sort((a, b) => a.average - b.average)[0];
    return {
      averageByCourse,
      sections,
      insight: lag
        ? `${lag.section} trails sibling sections by more than 5 points on identical papers — a delivery gap rather than an assessment-design gap, since item quality scores match.`
        : "No section rows in this scope yet.",
    };
  });
}

export function getRealTimeStruggling(
  scope?: ViewerScope,
): Promise<RealTimeReport> {
  if (USE_FASTAPI_BACKEND) {
    return fetchFromBackend<RealTimeReport>("/api/real-time-struggling");
  }

  return request(() => {
    const { v, courseList, examList, studentList, attemptList, takenList } =
      view(scope);
    const rows = studentList
      .map((student) => {
        const own = takenList.filter((a) => a.studentId === student.id);
        const scores = own.map((a) => a.score);
        const last = scores[scores.length - 1] ?? 0;
        const lastExam = own[own.length - 1];
        return {
          studentId: student.id,
          name: student.name,
          course:
            examList.find((e) => e.id === lastExam?.examId)?.courseCode ??
            courseList[0]?.code ??
            student.program,
          lastScore: last,
          average: round1(avg(scores)),
          trend: Math.round(last - avg(scores)),
          lastActivity: `${2 + (Number(student.id.slice(1)) % 27)} min ago`,
        };
      })
      .sort((a, b) => a.lastScore - b.lastScore)
      .slice(0, 12);

    const liveSource = examList.filter(
      (exam) => exam.status === "in_progress" || exam.status === "closing",
    );
    const liveExams = (
      liveSource.length ? liveSource : examList.slice(0, 4)
    ).map((exam) => {
      const course = courseList.find((c) => c.id === exam.courseId);
      const rows = takenList.filter((a) => a.examId === exam.id);
      const roster = attemptList.filter((a) => a.examId === exam.id);
      const submitted = roster.filter((a) => a.status === "submitted").length;
      const activeNow = Math.max(
        0,
        roster.filter((a) => a.status === "in_progress").length,
      );
      return {
        examId: exam.id,
        exam: `${exam.courseCode} · ${shortTitle(exam.title)}`,
        program: course?.program ?? "—",
        sector: course?.sector ?? "—",
        activeNow: activeNow || Math.max(1, roster.length - submitted),
        submitted,
        expected: Math.max(roster.length, rows.length),
        flagged: roster.filter(
          (a) => a.attemptCount > 1 || a.lateStart || a.timeTakenMin < 25,
        ).length,
        status: (exam.status === "closing" ? "Closing" : "In progress") as
          "In progress" | "Closing",
      };
    });

    const activeNow = liveExams.reduce((n, e) => n + e.activeNow, 0);

    return {
      students: rows,
      liveExams,
      updatedAt: new Date().toISOString(),
      activeNow,
      insight:
        v.role === "it_academic_integrity"
          ? `Live monitoring covers ${liveExams.length} sittings across the university right now — ${liveExams.reduce((n, e) => n + e.flagged, 0)} in-progress attempts are already flagged.`
          : "Nine of the lowest recent scores come from the same two sections, and all were submitted in under 30 minutes — a pacing problem more than a knowledge gap.",
    };
  });
}

export function getStudentDashboard(scope?: ViewerScope): Promise<StudentDashboardReport> {
  if (USE_FASTAPI_BACKEND) return fetchFromBackend<StudentDashboardReport>("/api/student-dashboard");
  return request(() => {
    const student = students.find((s) => s.id === currentStudentId)!;
    const scope = getActiveViewerScope();
    const examList = examsInScope(scope);
    const takenList = attemptsInScope(scope).filter((a) => a.participated);
    const scoreTimeline = examList.map((exam) => {
      const own = takenList.find(
        (a) => a.examId === exam.id && a.studentId === student.id,
      );
      const classAverage = round1(
        avg(takenList.filter((a) => a.examId === exam.id).map((a) => a.score)),
      );
      return {
        exam: shortTitle(exam.title),
        date: exam.date,
        score: own?.score ?? classAverage,
        classAverage,
      };
    });
    const topicNames = [
      "Recursion",
      "Complexity",
      "Graphs",
      "Hashing",
      "Sorting",
      "Proofs",
    ];
    const topics = topicNames.map((topic, i) => ({
      topic,
      score: Math.round(58 + ((i * 37) % 41)),
    }));
    const sortedTopics = [...topics].sort((a, b) => b.score - a.score);

    return {
      studentName: student.name,
      scoreTimeline,
      topics,
      average: round1(avg(scoreTimeline.map((r) => r.score))),
      classAverage: round1(avg(scoreTimeline.map((r) => r.classAverage))),
      bestTopic: sortedTopics[0]!.topic,
      weakestTopic: sortedTopics[sortedTopics.length - 1]!.topic,
      insight:
        "You are tracking above the class average on every assessment except the graph unit, where you sit 11 points below — revisiting traversal problems is the fastest gain available.",
    };
  });
}

const overallAverageOf = (studentId: string) =>
  round1(avg(yearlyRecords[studentId]!.map((y) => y.average)));

export function getStudentDirectory(
  scope?: ViewerScope,
): Promise<StudentDirectoryRow[]> {
  if (USE_FASTAPI_BACKEND) {
    return fetchFromBackend<StudentDirectoryRow[]>("/api/student-directory");
  }

  return request(() => {
    const { studentList } = view(scope);
    return studentList
      .map((student) => {
        const years = yearlyRecords[student.id]!;
        const latest = years[years.length - 1]!;
        const first = years[0]!;
        const overallAverage = overallAverageOf(student.id);
        return {
          studentId: student.id,
          name: student.name,
          program: student.program,
          section: student.section,
          overallAverage,
          latestYearAverage: latest.average,
          trend: Math.round(latest.average - first.average),
          standing: latest.standing,
          status: (latest.average >= passMark ? "Pass" : "Fail") as
            "Pass" | "Fail",
        };
      })
      .sort((a, b) => b.overallAverage - a.overallAverage);
  });
}

export function getStudentProfile(
  studentId: string,
  scope?: ViewerScope,
): Promise<StudentProfileReport> {
  if (USE_FASTAPI_BACKEND) return fetchFromBackend<StudentProfileReport>(`/api/students/${studentId}`);
  return request(() => {
    const v = scope ?? getActiveViewerScope();
    if (!studentInViewerScope(v, studentId)) {
      throw new Error("Student not in scope");
    }
    const student = students.find((s) => s.id === studentId);
    if (!student) throw new Error("Student not found");
    const years = yearlyRecords[student.id]!;
    const latest = years[years.length - 1]!;
    const examList = examsInScope(v);
    const attemptList = attemptsInScope(v);

    const ranking = [...studentsInScope(v)]
      .map((s) => ({ id: s.id, average: overallAverageOf(s.id) }))
      .sort((a, b) => b.average - a.average);

    const courseCodes = Array.from(
      new Set(years.flatMap((y) => y.courses.map((c) => c.course))),
    );
    const courseMatrix = courseCodes.map((course) => ({
      course,
      values: years.map(
        (y) => y.courses.find((c) => c.course === course)?.average ?? null,
      ),
    }));

    const recentAttempts = examList.map((exam) => {
      const own = attemptList.find(
        (a) => a.examId === exam.id && a.studentId === student.id,
      );
      return {
        exam: shortTitle(exam.title),
        course: exam.courseCode,
        date: exam.date,
        score: own?.participated ? own.score : 0,
        minutes: own?.participated ? own.timeTakenMin : 0,
        status: (!own?.participated
          ? "No attempt"
          : own.score >= passMark
            ? "Pass"
            : "Fail") as "Pass" | "Fail" | "No attempt",
      };
    });

    const topicNames = [
      "Recursion",
      "Complexity",
      "Graphs",
      "Hashing",
      "Sorting",
      "Proofs",
    ];
    const seed = Number(student.id.slice(1));
    const topics = topicNames.map((topic, i) => ({
      topic,
      score: Math.round(
        Math.max(
          35,
          Math.min(98, latest.average + (((i * 17 + seed * 5) % 27) - 13)),
        ),
      ),
    }));
    const weakest = [...topics].sort((a, b) => a.score - b.score)[0]!;

    const overallAverage = overallAverageOf(student.id);
    const delta = Math.round(latest.average - years[0]!.average);

    return {
      studentId: student.id,
      name: student.name,
      program: student.program,
      section: student.section,
      cohortRank: ranking.findIndex((r) => r.id === student.id) + 1,
      cohortSize: ranking.length,
      overallAverage,
      gpa: latest.gpa,
      classAverage: round1(avg(years.map((y) => y.classAverage))),
      attendance: latest.attendance,
      totalCredits: years.reduce((s, y) => s + y.credits, 0),
      standing: latest.standing,
      years,
      yearTrend: years.map((y) => ({
        year: y.year,
        student: y.average,
        cohort: y.classAverage,
      })),
      courseMatrix,
      recentAttempts,
      topics,
      insight: `${student.name.split(" ")[0]} is ${delta >= 0 ? "up" : "down"} ${Math.abs(delta)} points since ${years[0]!.year} and now sits ${round1(latest.average - latest.classAverage)} points ${latest.average >= latest.classAverage ? "above" : "below"} the cohort. ${weakest.topic} remains the weakest topic at ${weakest.score} — the clearest lever for the coming term.`,
    };
  });
}
