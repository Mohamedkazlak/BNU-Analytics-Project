from pydantic import BaseModel
from typing import List, Literal

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
