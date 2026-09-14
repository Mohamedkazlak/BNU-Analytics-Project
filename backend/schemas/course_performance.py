from pydantic import BaseModel
from typing import List, Literal

class AverageByCourse(BaseModel):
    course: str
    average: float
    quality: float

class SectionRow(BaseModel):
    section: str
    course: str
    average: float
    passRate: float

class CoursePerformanceReport(BaseModel):
    averageByCourse: List[AverageByCourse]
    sections: List[SectionRow]
    insight: str
