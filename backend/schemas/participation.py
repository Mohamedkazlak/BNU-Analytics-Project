from pydantic import BaseModel
from typing import List, Literal

class AttemptsPerExam(BaseModel):
    exam: str
    attempts: int
    expected: int

class AttendanceByCurriculum(BaseModel):
    course: str
    attendance: float
    absentees: int

class AvgTimePerExam(BaseModel):
    exam: str
    minutes: int

class AbsenteeRow(BaseModel):
    student: str
    exam: str
    reason: Literal["No attempt", "Late start"]
    minutesLate: int

class ParticipationReport(BaseModel):
    attemptsPerExam: List[AttemptsPerExam]
    completionRate: float
    attendanceRate: float
    attendanceByCurriculum: List[AttendanceByCurriculum]
    avgTimePerExam: List[AvgTimePerExam]
    absentees: List[AbsenteeRow]
    insight: str
