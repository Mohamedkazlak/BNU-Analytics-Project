# Data Request Plan — Athena Analytics & AI Layer

**Purpose:** Before we can build the dashboard, AI insights, predictions, recommendations and chatbot, we need real data from the institution's existing systems. This document lists exactly what we're asking for — down to every attribute — and what we can realistically build depending on what we actually receive.

**Approach:** We send the checklist below → they send back whatever they have available → we build the features the overlap supports. We do not require a perfect or complete match — partial data still produces a working (if reduced) product.

---

## 1. Data Request Checklist

What we're asking the institution to provide, grouped by priority. Each dataset lists every attribute (column) we'd ideally like — the institution can send a subset if that's all they have.

> We don't require any specific file type — whatever export format is easiest for the institution to produce is fine (CSV, Excel, JSON, SQL export, PDF). We'll adapt on our end.

### 🔴 Must-have — without these, nothing works

#### 1. Student Roster

_Preferred format: CSV / Excel_

| Attribute       | Description                              | Example                |
| --------------- | ---------------------------------------- | ---------------------- |
| student_id      | Unique student identifier                | S-0182                 |
| full_name       | Student's full name                      | Amara Okonkwo          |
| program         | Degree/major                             | B.Sc. Computer Science |
| section         | Class/section label                      | B                      |
| enrollment_year | Year the student joined                  | 2023                   |
| email           | Contact email (optional)                 | amara.o@school.edu     |
| status          | Active / inactive / graduated (optional) | Active                 |

#### 2. Courses

_Preferred format: CSV / Excel_

| Attribute       | Description                            | Example                      |
| --------------- | -------------------------------------- | ---------------------------- |
| course_id       | Unique course identifier               | c1                           |
| course_code     | Course code                            | CS 201                       |
| course_name     | Full course title                      | Data Structures & Algorithms |
| instructor_name | Assigned instructor                    | Dr. Priya Raman              |
| department      | Department/faculty (optional)          | Computer Science             |
| sections        | List of sections offered               | A, B, C                      |
| credits         | Credit hours                           | 3                            |
| enrolled_count  | Number of enrolled students (optional) | 40                           |

#### 3. Exams

_Preferred format: CSV / Excel_

| Attribute        | Description                             | Example                       |
| ---------------- | --------------------------------------- | ----------------------------- |
| exam_id          | Unique exam identifier                  | e1                            |
| course_id        | Which course it belongs to              | c1                            |
| title            | Exam title                              | Midterm I — Recursion & Trees |
| exam_type        | Midterm / final / quiz / lab (optional) | Midterm                       |
| exam_date        | Date administered                       | 2026-02-18                    |
| question_count   | Number of questions                     | 24                            |
| pass_mark        | Minimum passing score                   | 60                            |
| duration_minutes | Allotted time (optional)                | 60                            |

#### 4. Attempt / Score Records

_Preferred format: CSV / Excel / SQL export_

| Attribute          | Description                         | Example          |
| ------------------ | ----------------------------------- | ---------------- |
| student_id         | Who took the exam                   | S-0182           |
| exam_id            | Which exam                          | e1               |
| score              | Score achieved                      | 78               |
| started_at         | Attempt start timestamp             | 2026-02-18 09:00 |
| ended_at           | Attempt end timestamp               | 2026-02-18 09:52 |
| time_taken_minutes | Duration of the attempt             | 52               |
| participated       | Whether the student attempted it    | Yes              |
| attempt_count      | Number of submissions for this exam | 1                |

### 🟡 Should-have — needed for the full dashboard experience

#### 5. Question-Level Stats

_Preferred format: CSV / JSON_

| Attribute            | Description                                      | Example                     |
| -------------------- | ------------------------------------------------ | --------------------------- |
| question_id          | Unique question identifier                       | e1-q7                       |
| exam_id              | Which exam it belongs to                         | e1                          |
| question_number      | Order within the exam                            | 7                           |
| topic                | Subject/topic tag                                | Recursion                   |
| prompt_text          | The question wording (optional)                  | "Which traversal visits..." |
| pct_correct          | % of students who answered correctly             | 66                          |
| pct_incorrect        | % who answered incorrectly                       | 34                          |
| difficulty_index     | Calculated difficulty (optional, if tracked)     | 0.66                        |
| discrimination_index | Calculated discrimination (optional, if tracked) | 0.34                        |

#### 6. Multi-Year Academic History

_Preferred format: CSV / Excel_

| Attribute         | Description                                       | Example           |
| ----------------- | ------------------------------------------------- | ----------------- |
| student_id        | Student identifier                                | S-0182            |
| academic_year     | Year label                                        | 2025/26           |
| gpa               | GPA for that year                                 | 3.4               |
| overall_average   | Overall score average that year                   | 78.5              |
| class_average     | Cohort average that year (optional)               | 70.8              |
| attendance_pct    | Attendance percentage                             | 91                |
| credits_earned    | Credits completed that year                       | 15                |
| standing          | Academic standing                                 | Good standing     |
| per_course_grades | Course, average, grade, credits (repeating group) | CS 201: 82, A-, 3 |

#### 7. Enrollment / Section Mapping

_Preferred format: CSV_

| Attribute       | Description              | Example     |
| --------------- | ------------------------ | ----------- |
| student_id      | Student identifier       | S-0182      |
| course_id       | Course identifier        | c1          |
| section         | Section assigned         | B           |
| academic_term   | Term/semester            | Spring 2026 |
| enrollment_date | Date enrolled (optional) | 2026-01-15  |

### 🟢 Nice-to-have — unlocks advanced features

#### 8. Attempt Monitoring Detail

_Preferred format: CSV / SQL export_

| Attribute     | Description                                 | Example                  |
| ------------- | ------------------------------------------- | ------------------------ |
| student_id    | Student identifier                          | S-0182                   |
| exam_id       | Exam identifier                             | e1                       |
| ip_address    | IP address used for the attempt             | 10.24.12.45              |
| device        | Device/browser info                         | MacBook Pro · Chrome 131 |
| login_time    | Precise login timestamp                     | 2026-02-18 08:58:12      |
| logout_time   | Precise logout timestamp                    | 2026-02-18 09:52:03      |
| attempt_count | Number of submissions                       | 1                        |
| late_start    | Whether the student started late (optional) | No                       |

#### 9. Live Activity / Session Logs

_Preferred format: JSON / API_

| Attribute       | Description                | Example             |
| --------------- | -------------------------- | ------------------- |
| session_id      | Unique session identifier  | sess-88213          |
| student_id      | Student identifier         | S-0182              |
| exam_id         | Exam identifier            | e1                  |
| event_type      | login / heartbeat / submit | heartbeat           |
| event_timestamp | When the event occurred    | 2026-02-18 09:15:00 |
| status          | active / idle / submitted  | active              |

#### 10. Reference Documents

_Preferred format: PDF / DOCX_

| Attribute   | Description                             | Example               |
| ----------- | --------------------------------------- | --------------------- |
| document_id | Unique document identifier              | doc-014               |
| title       | Document title                          | CS 201 Grading Rubric |
| doc_type    | Syllabus / rubric / policy / exam paper | Rubric                |
| course_id   | Related course (optional)               | c1                    |
| file        | The actual file                         | rubric_cs201.pdf      |
| upload_date | Date provided (optional)                | 2026-02-01            |

---

## 2. Capability Matrix — what each dataset unlocks

This sets honest expectations up front: the more complete the data, the more complete the product. Missing data doesn't break the system — the affected feature is simply unavailable or shown as "not enough data yet."

| If they provide...                                     | We can build                                                                           | If it's missing, what happens instead                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Students + Courses + Exams + Attempts (Must-have only) | Management KPIs, pass rates, rankings, participation tracking, basic student dashboard | N/A — this is the minimum for a working product                                                |
| + Question-level stats                                 | Item Analysis screen (question quality, flags for review)                              | Item Analysis screen is hidden/empty                                                           |
| + Multi-year academic records                          | Full Student Profile & Directory, year-over-year trend view                            | Student profile shows current term only, no historical trend                                   |
| + IP / device / timing detail                          | Academic Integrity monitoring, fraud/anomaly flags                                     | Integrity screen limited to basic score/attempt-count anomalies only, no IP/device-based flags |
| + Live session/heartbeat feed                          | True real-time "students active now" view                                              | Real-time screen falls back to periodic refresh of exam records (near-real-time, not live)     |
| + Reference documents (PDF/DOCX)                       | Chatbot can answer policy, rubric and syllabus questions                               | Chatbot restricted to quantitative/data-driven answers only                                    |

---

## Summary

- **Minimum viable product** only needs the 4 "Must-have" datasets.
- Each additional dataset we receive unlocks one more feature area — nothing is all-or-nothing.
- Next step: share the checklist in Section 1 with the institution and see what they're able to provide.
