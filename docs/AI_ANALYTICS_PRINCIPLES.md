# AI Analytics Principles & Architecture Contract

> **Purpose:** This document defines the core rules for how AI, analytics, recommendations, warnings, predictions, SQL, RAG, and LLMs must work in the BNU Analytics project.
>
> **Important:** Treat this document as an architectural contract. Any code change affecting analytics or AI must preserve these principles unless this document is intentionally updated first.

---

## 1. Core Principle

### Analytics First → AI Second

The database and deterministic analytics layer are the **source of truth**.

The AI/LLM layer is responsible for **interpreting, explaining, contextualizing, and presenting** verified data.

The LLM must never become the source of truth for university metrics.

```text
PostgreSQL
    ↓
SQL Queries / Analytics
    ↓
Verified Structured Data
    ↓
AI Intelligence Layer
    ↓
Insights / Warnings / Recommendations / Explanations
    ↓
User
```

The fundamental rule is:

> **SQL determines what is happening. RAG provides relevant context. The LLM explains what it means.**

---

# 2. Responsibilities of Each Layer

## 2.1 PostgreSQL — Source of Truth

PostgreSQL contains the authoritative application data available to the system.

Examples:

- Students
- Courses
- Programs
- Departments
- Exams
- Questions
- Attempts
- Answers
- Scores
- Attendance/activity data
- Integrity events
- Academic periods
- Enrollment information

The AI layer must not invent, modify, or independently establish these facts.

---

## 2.2 SQL / Analytics Layer — Facts and Calculations

SQL and the analytics/repository layer are responsible for calculating measurable facts.

Examples:

```text
Average Score = 64.2%
Pass Rate = 58%
Participation Rate = 81%
Previous Term Average = 72%
Score Change = -7.8%
```

SQL should handle:

- Aggregations
- Filtering
- Grouping
- Comparisons
- Percentages
- Trends
- Rankings when required by the product
- Threshold calculations
- Historical comparisons
- Scope-aware analytics

If a value can be calculated deterministically from structured database data, **calculate it before involving the LLM**.

### Rule

Do NOT ask the LLM to calculate facts that SQL can calculate reliably.

Bad:

```text
Send 500 student scores to the LLM and ask:
"What is the average?"
```

Good:

```text
SQL:
SELECT AVG(score) ...

Result:
average_score = 64.2%

LLM:
Explain what this result means.
```

---

# 3. AI Intelligence Layer

The AI layer sits above the analytics layer.

Its job is to transform verified analytical data into useful intelligence.

```text
SQL Analytics
     ↓
Structured Metrics
     ↓
AI Intelligence Layer
     ↓
Human-readable Intelligence
```

The AI layer can produce:

- Insights
- Warnings
- Recommendations
- Explanations
- Current standing
- Summaries
- Conversational answers

But these outputs must remain grounded in evidence.

---

# 4. Insights

An **insight** is an interpretation of verified analytical data.

Example:

```text
SQL Data:

Current average: 54%
Previous average: 71%
Change: -17 percentage points
Pass rate: 48%
```

The AI may produce:

> Course performance has declined significantly compared with the previous term. The average score decreased by 17 percentage points, while the pass rate is currently 48%.

The AI generated the explanation.

The underlying numbers came from SQL.

### Insight Rule

Every important factual statement in an AI-generated insight must be traceable to:

1. SQL-derived metrics,
2. retrieved contextual information,
3. or another explicitly defined trusted source.

---

# 5. Warnings

Warnings identify potentially concerning conditions.

Warnings should be based on **deterministic signals, thresholds, or analytical patterns**.

Example:

```text
Pass Rate = 42%
Warning Threshold = 50%
```

The analytics layer can produce:

```text
warning:
  type: LOW_PASS_RATE
  severity: HIGH
  value: 42
  threshold: 50
```

The AI can then explain:

> The course has a low pass rate of 42%, which is below the configured 50% threshold.

### Important

The LLM should not arbitrarily decide that:

```text
42% = dangerous
```

unless the system's rules or analytical logic define that condition.

The AI explains the warning; deterministic logic establishes the underlying signal.

---

# 6. Recommendations

Recommendations must be **evidence-based**.

They should be generated from:

```text
SQL Metrics
+
Analytical Signals
+
Relevant Context
+
Business/Academic Rules
```

Example:

```text
Pass Rate: 42%
Average Score: 51%
Previous Average: 68%
Question Failure Concentration: High
```

Possible recommendation:

> Review the course's assessment content, particularly the questions with the highest failure rates, and compare them with the corresponding learning objectives.

The recommendation should be accompanied by evidence whenever possible.

Example:

```json
{
  "recommendation": "...",
  "basedOn": ["Pass rate: 42%", "Average score: 51%", "Previous average: 68%"]
}
```

### Recommendation Rule

The AI may recommend an action.

It must not pretend that the recommendation is an established fact.

---

# 7. Predictions

Predictions are different from insights and recommendations.

### A prediction must come from predictive logic.

The LLM itself should NOT be treated as a predictive model.

Correct architecture:

```text
Historical SQL Data
       ↓
Statistical / ML / Forecasting Model
       ↓
Prediction
       ↓
AI / LLM
       ↓
Human-readable Explanation
```

Example:

```text
Historical pass rates:
2024: 72%
2025: 64%
2026: 57%

Forecast model:
Expected next-term pass rate ≈ 52%
```

The LLM can explain:

> Based on the forecasting model, the projected pass rate for the next term is approximately 52%.

### Important distinction

Do NOT implement:

```text
LLM:
"Based on these numbers, I predict the pass rate will be 52%."
```

and call that a formal prediction.

Instead:

```text
Predictive Model:
52%

LLM:
Explain the prediction and its supporting factors.
```

Predictions must also clearly communicate uncertainty when the underlying model provides it.

---

# 8. SQL-to-Text

SQL-to-Text is the bridge between structured analytics and the LLM.

The system should convert analytical results into a structured, readable context representation.

Example:

```text
Course: Database Systems
Academic Term: Spring 2026

Average Score: 54%
Previous Term Average: 71%
Pass Rate: 48%
Participation Rate: 82%

Trend:
Average score decreased by 17 percentage points.

Signals:
- Low pass rate
- Significant decline from previous term
```

This context can then be supplied to the LLM.

### Important

SQL-to-Text does NOT mean:

```text
Database → LLM raw dump
```

It means:

```text
Database
    ↓
SQL Analytics
    ↓
Relevant Metrics
    ↓
Structured Context
    ↓
LLM
```

Only relevant data should be provided.

---

# 9. RAG

RAG is responsible for retrieving **contextual knowledge that is not necessarily stored as numerical analytics**.

Examples:

- Academic policies
- Course descriptions
- Assessment guidelines
- University regulations
- Definitions
- Documentation
- Program objectives
- Educational standards
- Other approved knowledge sources

RAG should NOT replace SQL for numerical analytics.

### Example

User asks:

> Why is the performance in Database Systems concerning?

SQL provides:

```text
Average Score: 54%
Pass Rate: 48%
Previous Average: 71%
```

RAG may provide:

```text
Course learning objectives
Assessment policy
Relevant academic guidelines
```

The LLM combines them:

```text
SQL Analytics
      +
RAG Context
      ↓
     LLM
      ↓
Grounded Explanation
```

---

# 10. SQL + RAG Hybrid

The intended intelligence architecture is:

```text
                         ┌── SQL Analytics ──→ Exact Facts
                         │
User Question ───────────┤
                         │
                         └── RAG ───────────→ Context / Knowledge
                                  ↓
                               LLM
                                  ↓
                       Grounded AI Response
```

### SQL is preferred for:

- Scores
- Averages
- Counts
- Percentages
- Trends
- Comparisons
- Student/course/exam metrics
- Historical analytical data
- Threshold signals

### RAG is preferred for:

- Policies
- Definitions
- Documentation
- Course context
- Academic guidelines
- Unstructured knowledge

### Both are used when:

The question requires numerical evidence **and** contextual interpretation.

---

# 11. Natural Language Questions

The future conversational assistant should be able to understand questions such as:

> "Why is College X performing poorly this semester?"

The system should not simply send this question directly to the LLM and expect an answer.

Preferred flow:

```text
User Question
     ↓
Question Understanding / Routing
     ↓
Determine Required Evidence
     ↓
┌───────────────────┐
│ SQL Analytics     │
│ RAG Context       │
└───────────────────┘
     ↓
Evidence Assembly
     ↓
LLM
     ↓
Grounded Answer
```

The system should determine whether the question requires:

```text
SQL only
RAG only
SQL + RAG
```

---

# 12. Evidence Grounding

AI output should be traceable to evidence.

Whenever practical, the response should expose the data or context behind the conclusion.

Example:

```text
Insight:
Performance has declined significantly.

Based on:
- Average score: 54%
- Previous average: 71%
- Pass rate: 48%
```

This is preferable to:

```text
Performance is poor because students are struggling.
```

The second statement makes an unsupported causal claim.

---

# 13. Avoid Unsupported Causation

The system must distinguish between:

### What the data shows

```text
Average score decreased from 71% to 54%.
```

### What can reasonably be inferred

```text
The course is experiencing a significant performance decline.
```

### What requires additional evidence

```text
The decline was caused by difficult exam questions.
```

The third claim should not be made unless the system has supporting evidence.

The LLM must not manufacture explanations for correlations.

---

# 14. Authorization and Data Scope

AI must respect the same authorization and scope rules as the rest of the application.

The flow must remain:

```text
Authenticated User
      ↓
Role / Scope
      ↓
Authorized SQL Analytics
      ↓
Authorized RAG Retrieval
      ↓
AI Context
      ↓
LLM
```

Never:

```text
User
 ↓
LLM
 ↓
LLM accesses unrestricted university data
```

The LLM must only receive data the authenticated user is authorized to access.

---

# 15. LLM Responsibilities

The LLM is primarily responsible for:

- Understanding natural language
- Selecting/using the appropriate analytical context
- Explaining metrics
- Summarizing evidence
- Producing readable insights
- Explaining warnings
- Explaining recommendations
- Explaining model predictions
- Combining SQL evidence with RAG context
- Conversational interaction

The LLM is NOT responsible for:

- Being the source of truth
- Inventing database facts
- Calculating authoritative metrics when SQL can do it
- Bypassing authorization
- Making unsupported causal claims
- Creating formal predictions without a predictive model
- Fabricating evidence

---

# 16. Human-in-the-Loop

AI proposes.

Humans decide.

For actions that affect users, courses, academic processes, or system state:

```text
AI Recommendation
      ↓
Human Review
      ↓
User Confirmation
      ↓
Action
```

The AI should not silently execute consequential actions.

---

# 17. Implementation Rule for Cursor

When modifying the BNU Analytics codebase, always preserve the following architecture:

```text
PostgreSQL
   ↓
Repositories / SQL Analytics
   ↓
Structured Analytical Context
   ↓
AI Intelligence Layer
   ├── SQL-derived evidence
   ├── RAG context
   └── Predictive model output (when applicable)
   ↓
LLM
   ↓
Grounded AI Output
```

Before modifying AI-related code, determine:

1. **What data is needed?**
2. **Should that data come from SQL, RAG, or both?**
3. **Is the calculation deterministic?**
4. **Can SQL calculate it instead of the LLM?**
5. **Is the result an insight, warning, recommendation, or prediction?**
6. **What evidence supports it?**
7. **Does the current user's role/scope permit access to that evidence?**
8. **Could the generated statement be interpreted as an unsupported fact or causal claim?**

If any change violates these principles, reconsider the implementation.

---

# 18. Non-Negotiable Rules

### Rule 1

> **Database data is the source of truth.**

### Rule 2

> **SQL performs deterministic analytics.**

### Rule 3

> **The LLM interprets verified data; it does not invent it.**

### Rule 4

> **RAG provides contextual knowledge, not authoritative numerical analytics.**

### Rule 5

> **Predictions require predictive/forecasting logic, not an LLM guess.**

### Rule 6

> **AI outputs should be grounded in identifiable evidence.**

### Rule 7

> **AI must respect authentication, authorization, and data scope.**

### Rule 8

> **AI recommendations are suggestions, not automatic decisions.**

### Rule 9

> **Do not add unnecessary AI complexity when deterministic SQL logic is sufficient.**

### Rule 10

> **Keep the architecture simple enough for this project to remain a practical Proof of Concept.**

---

# 19. The One-Sentence Architecture

The BNU Analytics AI architecture can be summarized as:

> **SQL determines what is happening, RAG provides relevant context, predictive models produce forecasts when required, and the LLM explains the evidence in a useful human-readable form.**

This principle should remain true even as the AI implementation evolves.
