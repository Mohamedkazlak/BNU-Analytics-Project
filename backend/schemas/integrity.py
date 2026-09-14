from pydantic import BaseModel
from typing import List, Literal

class IntegrityRow(BaseModel):
    id: str
    student: str
    exam: str
    startedAt: str
    endedAt: str
    ip: str
    device: str
    attempts: int
    flags: List[str]

class IntegritySummaryRow(BaseModel):
    exam: str
    program: str
    flagged: int
    total: int

class IntegrityReport(BaseModel):
    rows: List[IntegrityRow]
    summary: List[IntegritySummaryRow]
    flaggedCount: int
    totalAttempts: int
    insight: str
