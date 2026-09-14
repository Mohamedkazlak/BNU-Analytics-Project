from pydantic import BaseModel
from typing import List, Literal

class QuestionItem(BaseModel):
    id: str
    examId: str
    number: int
    exam: str
    topic: str
    prompt: str
    pctCorrect: float
    pctIncorrect: float
    difficultyIndex: float
    discriminationIndex: float
    flagged: bool

class ItemAnalysisReport(BaseModel):
    questions: List[QuestionItem]
    needsReview: List[QuestionItem]
    insight: str
