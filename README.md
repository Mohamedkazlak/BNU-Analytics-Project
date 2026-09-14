# BNU Analytics Dashboard

Assessment reporting and analytics for Benha National University online testing programs. Role-scoped dashboards cover exam activity, student performance, participation, item analysis, academic integrity, and live exam monitoring.

**Live app**: https://visual-files.lovable.app

This project was built with [Lovable](https://lovable.dev). Continue in the [Lovable editor](https://lovable.dev/projects/9f949ac3-26a0-42dd-bf4b-c8597d91fb59) — commits on the connected branch sync both ways.

## Stack

| Layer    | Tech                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Frontend | React 19, TanStack Start / Router, TanStack Query, Tailwind CSS, Recharts |
| Backend  | FastAPI, asyncpg, Pydantic                                                |
| Data     | PostgreSQL (Row Level Security via `app.current_user_id`)                 |

The frontend talks to the FastAPI server at `http://localhost:8000` (see `src/lib/api.ts`). Most report screens hit live endpoints; a few still use mock data (noted below).

## Demo roles

The UI switches demo users from the app shell. Each request sends `X-User-Id` so Postgres RLS scopes the rows.

| Role                    | Home route          |
| ----------------------- | ------------------- |
| `senior_management`     | `/management`       |
| `program_director`      | `/program-director` |
| `academic_affairs`      | `/academic-affairs` |
| `professor`             | `/professor`        |
| `it_academic_integrity` | `/integrity`        |
| `student`               | `/my-progress`      |

Unauthorized paths redirect to that role’s home.

## Development

### Frontend

Requires Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

### Backend

Requires Python 3.9+ and a seeded PostgreSQL database (`db/schema.sql`, `db/seed.sql`).

```sh
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
DATABASE_URL="postgresql://user:pass@localhost:5432/postgres" uvicorn main:app --reload
```

Interactive OpenAPI docs: http://localhost:8000/docs

Every API below requires the `X-User-Id` header (demo user id from the frontend). Missing header → `401`.

---

## Frontend routes

File-based routes live in `src/routes/`. The generated tree is `src/routeTree.gen.ts`. Layout, 404, and error UI are in `src/routes/__root.tsx`. Access is enforced in `src/lib/role-guards.ts`.

| Path                   | File                      | Page                                        | Allowed roles                                                            | Data                                                                                                             |
| ---------------------- | ------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `/`                    | `index.tsx`               | Redirects to the active role’s home         | all                                                                      | —                                                                                                                |
| `/management`          | `management.tsx`          | Senior Management Overview                  | `senior_management`                                                      | `GET /api/management-overview`                                                                                   |
| `/program-director`    | `program-director.tsx`    | College Dashboard                           | `program_director`                                                       | `GET /api/management-overview`                                                                                   |
| `/academic-affairs`    | `academic-affairs.tsx`    | Academic Affairs · performance & attendance | `academic_affairs`                                                       | `GET /api/student-performance`, `/api/participation-report`, `/api/student-directory`, `/api/course-performance` |
| `/professor`           | `professor.tsx`           | Professor Course Dashboard                  | `professor`                                                              | `GET /api/student-performance`                                                                                   |
| `/exam-activity`       | `exam-activity.tsx`       | Exam Activity Trends                        | `senior_management`, `program_director`                                  | `GET /api/management-overview`                                                                                   |
| `/courses`             | `courses.tsx`             | Course & Instructor Performance             | `senior_management`, `program_director`, `academic_affairs`, `professor` | `GET /api/course-performance`                                                                                    |
| `/performance`         | `performance.tsx`         | Student Performance Reports                 | `senior_management`, `program_director`, `academic_affairs`, `professor` | `GET /api/student-performance`                                                                                   |
| `/students`            | `students.index.tsx`      | Student Profiles directory                  | `senior_management`, `program_director`, `academic_affairs`, `professor` | `GET /api/student-directory`                                                                                     |
| `/students/$studentId` | `students.$studentId.tsx` | Individual student profile                  | same as `/students`                                                      | mock `getStudentProfile` (no backend yet)                                                                        |
| `/participation`       | `participation.tsx`       | Student Participation Reports               | `senior_management`, `program_director`, `academic_affairs`, `professor` | `GET /api/participation-report`                                                                                  |
| `/item-analysis`       | `item-analysis.tsx`       | Item Analysis Reports                       | `program_director`, `professor`                                          | `GET /api/item-analysis`                                                                                         |
| `/integrity`           | `integrity.tsx`           | Academic Integrity & Exam Monitoring        | `it_academic_integrity`, `senior_management`                             | `GET /api/integrity-report`                                                                                      |
| `/real-time`           | `real-time.tsx`           | Live Exam Monitoring                        | `professor`, `it_academic_integrity`                                     | `GET /api/real-time-struggling`                                                                                  |
| `/my-progress`         | `my-progress.tsx`         | Student personal dashboard                  | `student`                                                                | mock `getStudentDashboard` (no backend yet)                                                                      |

The in-app chat (`ChatPanel`) calls the TanStack Start server function `askAssistant` (POST) in `src/lib/assistant.functions.ts`. That is not a FastAPI route; it classifies the question, enforces data-domain scope, and returns a scoped answer or refusal.

---

## Backend APIs

Defined in `backend/main.py`. The frontend client is `src/lib/api.ts` (`USE_FASTAPI_BACKEND = true`). All endpoints are `GET`, scoped by RLS after `set_config('app.current_user_id', …)`.

### `GET /api/management-overview`

Institution / college KPIs: exams administered, participants, pass rate, completion, pass rate by course and college, monthly activity trend, insight.

**Used by:** `/management`, `/program-director`, `/exam-activity`

**Response:** `ManagementOverview` — `kpis`, `passRateByCourse`, `passRateByCollege`, `activityTrend`, `insight`

### `GET /api/student-performance`

Averages by exam, highest/lowest attempts, pass/fail counts, score distribution, ranked students, semester comparison, insight.

**Used by:** `/performance`, `/professor`, `/academic-affairs`

**Response:** `StudentPerformanceReport` — `averageByExam`, `highest`, `lowest`, `passFail`, `distribution`, `ranked`, `semesterComparison`, `insight`

### `GET /api/course-performance`

Average and quality by course, section-level averages and pass rates, insight.

**Used by:** `/courses`, `/academic-affairs`

**Response:** `CoursePerformanceReport` — `averageByCourse`, `sections`, `insight`

### `GET /api/participation-report`

Attempts vs expected per exam, completion and attendance rates, attendance by curriculum, average time per exam, absentee list, insight.

**Used by:** `/participation`, `/academic-affairs`

**Response:** `ParticipationReport` — `attemptsPerExam`, `completionRate`, `attendanceRate`, `attendanceByCurriculum`, `avgTimePerExam`, `absentees`, `insight`

### `GET /api/item-analysis`

Per-question percent correct/incorrect, difficulty and discrimination indexes, flagged items, needs-review list, insight.

**Used by:** `/item-analysis`

**Response:** `ItemAnalysisReport` — `questions`, `needsReview`, `insight`

### `GET /api/integrity-report`

Flagged attempts (IP, device, late start, heuristics plus `integrity_flags`), per-exam summary counts, insight.

**Used by:** `/integrity`

**Response:** `IntegrityReport` — `rows`, `summary`, `flaggedCount`, `totalAttempts`, `insight`

### `GET /api/real-time-struggling`

Students with recent low scores, live sittings (active / submitted / expected / flagged), `updatedAt`, insight.

**Used by:** `/real-time`

**Response:** `RealTimeReport` — `students`, `liveExams`, `updatedAt`, `activeNow`, `insight`

### `GET /api/student-directory`

Directory of students with overall and latest-year averages, trend, standing, pass/fail.

**Used by:** `/students`, `/academic-affairs`

**Response:** `StudentDirectoryRow[]` — `studentId`, `name`, `program`, `section`, `overallAverage`, `latestYearAverage`, `trend`, `standing`, `status`

### Not yet on FastAPI

These client functions in `src/lib/api.ts` still compute from `src/lib/mock-data.ts`:

| Client function                | Route                  | Notes                                                    |
| ------------------------------ | ---------------------- | -------------------------------------------------------- |
| `getStudentDashboard()`        | `/my-progress`         | Student score timeline and topic breakdown               |
| `getStudentProfile(studentId)` | `/students/$studentId` | Transcript years, course matrix, recent attempts, topics |

Set `USE_FASTAPI_BACKEND` to `false` in `src/lib/api.ts` to run every report against mock data instead of FastAPI.
