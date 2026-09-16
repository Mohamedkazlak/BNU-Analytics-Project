from typing import Optional

from pydantic import BaseModel


class LetterConversion:
    """Documented 4.0 scale used until an official BNU table is supplied."""

    TABLE = {
        "A+": 4.0,
        "A": 3.7,
        "A-": 3.4,
        "B+": 3.3,
        "B": 3.0,
        "B-": 2.7,
        "C+": 2.3,
        "C": 2.0,
        "C-": 1.7,
        "D+": 1.3,
        "D": 1.0,
        "F": 0.0,
    }


def letter_to_points(letter: str) -> Optional[float]:
    if not letter:
        return None
    return LetterConversion.TABLE.get(letter.strip().upper())


def letter_from_percent(average: float) -> str:
    if average >= 90:
        return "A+"
    if average >= 85:
        return "A"
    if average >= 80:
        return "B+"
    if average >= 70:
        return "B"
    if average >= 60:
        return "C"
    if average >= 50:
        return "D"
    return "F"


class TranscriptCourse(BaseModel):
    course_id: str
    course: str
    code: str = ""
    average: float
    letter_grade: str
    credits: int
    counted_in_cumulative_gpa: bool = True
    pass_fail_subject: bool = False


class GpaResult(BaseModel):
    gpa: Optional[float]
    quality_points: float
    gpa_credits: int
    excluded_pass_fail: int
    excluded_not_counted: int


def compute_gpa(entries: list[TranscriptCourse]) -> GpaResult:
    """Cumulative GPA from course metadata flags only.

    A row contributes when counted_in_cumulative_gpa is true and
    pass_fail_subject is false. Eligibility is never inferred from year
    level, course code, course name, requirement level, or course ids.
    """
    quality_points = 0.0
    gpa_credits = 0
    excluded_pf = 0
    excluded_nc = 0
    for entry in entries:
        if not entry.counted_in_cumulative_gpa:
            excluded_nc += 1
            continue
        if entry.pass_fail_subject:
            excluded_pf += 1
            continue
        points = letter_to_points(entry.letter_grade)
        if points is None:
            continue
        quality_points += points * entry.credits
        gpa_credits += entry.credits
    gpa = round(quality_points / gpa_credits, 2) if gpa_credits else None
    return GpaResult(
        gpa=gpa,
        quality_points=round(quality_points, 2),
        gpa_credits=gpa_credits,
        excluded_pass_fail=excluded_pf,
        excluded_not_counted=excluded_nc,
    )


def standing_from_gpa(gpa: Optional[float], percent: Optional[float] = None) -> str:
    if gpa is not None:
        if gpa >= 3.6:
            return "Excellent"
        if gpa >= 2.0:
            return "Good standing"
        if gpa >= 1.5:
            return "Watch list"
        return "At risk"
    if percent is None:
        return "Watch list"
    if percent >= 85:
        return "Excellent"
    if percent >= 60:
        return "Good standing"
    if percent >= 50:
        return "Watch list"
    return "At risk"
