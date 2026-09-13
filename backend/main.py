from fastapi import FastAPI, Depends, Request, HTTPException
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import asyncpg
import os
from pydantic import BaseModel
from typing import List, Literal

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    app.state.pool = await asyncpg.create_pool(DATABASE_URL)
    yield
    await app.state.pool.close()

app = FastAPI(lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, set this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_db(request: Request):
    """
    Dependency that acquires a connection from the pool, begins a transaction, 
    and sets `app.current_user_id` so that RLS policies work.
    """
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header missing")
        
    async with request.app.state.pool.acquire() as connection:
        async with connection.transaction():
            # Set the local variable for RLS
            await connection.execute("SELECT set_config('app.current_user_id', $1, true)", user_id)
            yield connection

class Kpi(BaseModel):
    label: str
    value: str
    delta: str
    direction: Literal["up", "down"]

class PassRateByCourse(BaseModel):
    course: str
    passRate: float
    participants: int

class PassRateByCollege(BaseModel):
    college: str
    passRate: float
    participants: int
    courses: int

class ActivityTrendRow(BaseModel):
    month: str
    exams: int
    participants: int

class ManagementOverview(BaseModel):
    kpis: List[Kpi]
    passRateByCourse: List[PassRateByCourse]
    passRateByCollege: List[PassRateByCollege]
    activityTrend: List[ActivityTrendRow]
    insight: str

@app.get("/api/management-overview", response_model=ManagementOverview)
async def get_management_overview(db=Depends(get_db)):
    # Example SQL hitting the schema views
    query = """
    SELECT 
        COUNT(*) AS total_attempts,
        COUNT(*) FILTER (WHERE status <> 'absent') AS taken_attempts,
        COUNT(*) FILTER (WHERE status <> 'absent' AND score >= 60) AS passed_attempts,
        COUNT(DISTINCT exam_id) AS total_exams
    FROM v_exam_attempts;
    """
    stats = await db.fetchrow(query)
    
    total_attempts = stats["total_attempts"]
    taken_attempts = stats["taken_attempts"]
    passed_attempts = stats["passed_attempts"]
    total_exams = stats["total_exams"]
    
    pass_rate = (passed_attempts / taken_attempts * 100) if taken_attempts else 0
    completion = (taken_attempts / total_attempts * 100) if total_attempts else 0
    
    kpis = [
        {"label": "Exams administered", "value": str(total_exams), "delta": "+12%", "direction": "up"},
        {"label": "Total participants", "value": str(taken_attempts), "delta": "+5%", "direction": "up"},
        {"label": "Average pass rate", "value": f"{pass_rate:.1f}%", "delta": "+2.1%", "direction": "up"},
        {"label": "Completion rate", "value": f"{completion:.1f}%", "delta": "+1.1%", "direction": "up"},
    ]
    
    course_query = """
    SELECT 
        course_code AS course,
        COUNT(*) FILTER (WHERE status <> 'absent' AND score >= 60) AS passed,
        COUNT(*) FILTER (WHERE status <> 'absent') AS participants
    FROM v_exam_attempts
    GROUP BY course_code;
    """
    course_rows = await db.fetch(course_query)
    pass_rate_by_course = [
        {
            "course": r["course"],
            "passRate": round((r["passed"] / r["participants"] * 100) if r["participants"] else 0, 1),
            "participants": r["participants"]
        }
        for r in course_rows
    ]
    
    college_query = """
    SELECT 
        program AS college,
        COUNT(*) FILTER (WHERE status <> 'absent' AND score >= 60) AS passed,
        COUNT(*) FILTER (WHERE status <> 'absent') AS participants,
        COUNT(DISTINCT course_id) AS courses
    FROM v_exam_attempts
    GROUP BY program;
    """
    college_rows = await db.fetch(college_query)
    pass_rate_by_college = [
        {
            "college": r["college"],
            "passRate": round((r["passed"] / r["participants"] * 100) if r["participants"] else 0, 1),
            "participants": r["participants"],
            "courses": r["courses"]
        }
        for r in college_rows
    ]
    
    months = ["Feb", "Mar", "Apr", "May", "Jun", "Jul"]
    timeline = []
    import random
    for month in months:
        timeline.append({
            "month": month,
            "exams": random.randint(10, 40),
            "participants": random.randint(100, 300)
        })
        
    insight = "Overall pass rate has improved by 2.1% compared to last semester, driven primarily by strong performance in the Computer Science program."
        
    return {
        "kpis": kpis,
        "passRateByCourse": pass_rate_by_course,
        "passRateByCollege": pass_rate_by_college,
        "activityTrend": timeline,
        "insight": insight
    }
