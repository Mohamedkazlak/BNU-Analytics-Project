from pydantic import BaseModel
from typing import Literal

class StudentDirectoryRow(BaseModel):
    studentId: str
    name: str
    program: str
    section: str
    overallAverage: float
    latestYearAverage: float
    trend: int
    standing: str
    status: Literal["Pass", "Fail"]
