from pydantic import BaseModel
from typing import List, Literal, Optional

class Kpi(BaseModel):
    label: str
    value: str
    # No prior-term data exists yet to compute a real trend (course_offerings
    # only has current-term rows), so these are omitted rather than faked.
    # Populate once a prior period is available to compare against.
    delta: Optional[str] = None
    direction: Optional[Literal["up", "down"]] = None

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
    containsSynthetic: bool = False
