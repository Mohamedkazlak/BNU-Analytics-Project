from pydantic import BaseModel
from typing import List, Literal

class AverageByExam(BaseModel):
    exam: str
    course: str
    average: float

class TopBottomAttempt(BaseModel):
    name: str
    score: float
    exam: str

class NameValue(BaseModel):
    name: str
    value: int

class DistributionBucket(BaseModel):
    bucket: str
    students: int

class RankedStudent(BaseModel):
    rank: int
    studentId: str
    name: str
    course: str
    average: float
    best: float
    trend: int
    status: Literal["Pass", "Fail"]

class SemesterComparisonRow(BaseModel):
    exam: str
    current: float
    previous: float

class StudentPerformanceReport(BaseModel):
    averageByExam: List[AverageByExam]
    highest: TopBottomAttempt
    lowest: TopBottomAttempt
    passFail: List[NameValue]
    distribution: List[DistributionBucket]
    ranked: List[RankedStudent]
    semesterComparison: List[SemesterComparisonRow]
    insight: str
