from services.gpa import (
    TranscriptCourse,
    compute_gpa,
    letter_from_percent,
    letter_to_points,
    standing_from_gpa,
)


def _course(**kwargs) -> TranscriptCourse:
    data = dict(
        course_id="c1",
        course="Algorithms",
        code="CS201",
        average=85,
        letter_grade="A",
        credits=3,
        counted_in_cumulative_gpa=True,
        pass_fail_subject=False,
    )
    data.update(kwargs)
    return TranscriptCourse(**data)


def test_letter_to_points_known_grades():
    assert letter_to_points("A") == 3.7
    assert letter_to_points("F") == 0.0
    assert letter_to_points("Q") is None


def test_weighted_gpa():
    result = compute_gpa(
        [
            _course(letter_grade="A", credits=3),
            _course(course_id="c2", letter_grade="B", credits=1),
        ]
    )
    assert result.gpa == round((3.7 * 3 + 3.0 * 1) / 4, 2)
    assert result.gpa_credits == 4


def test_pass_fail_excluded_from_gpa():
    result = compute_gpa(
        [
            _course(letter_grade="A", credits=3),
            _course(
                course_id="c-pf",
                letter_grade="P",
                credits=2,
                pass_fail_subject=True,
            ),
        ]
    )
    assert result.excluded_pass_fail == 1
    assert result.gpa_credits == 3
    assert result.gpa == 3.7


def test_not_counted_in_cumulative_gpa_excluded():
    result = compute_gpa(
        [
            _course(letter_grade="A", credits=3),
            _course(
                course_id="c-nc",
                letter_grade="A+",
                credits=4,
                counted_in_cumulative_gpa=False,
            ),
        ]
    )
    assert result.excluded_not_counted == 1
    assert result.gpa_credits == 3
    assert result.gpa == 3.7


def test_mixed_transcript_excludes_only_flagged_rows():
    result = compute_gpa(
        [
            _course(course_id="synth-gpa-counted", letter_grade="B+", credits=3),
            _course(
                course_id="synth-gpa-excluded",
                letter_grade="A+",
                credits=4,
                counted_in_cumulative_gpa=False,
            ),
            _course(
                course_id="synth-gpa-pass-fail",
                letter_grade="P",
                credits=2,
                pass_fail_subject=True,
            ),
            _course(
                course_id="synth-gpa-counted-2",
                letter_grade="A",
                credits=1,
            ),
        ]
    )
    assert result.excluded_not_counted == 1
    assert result.excluded_pass_fail == 1
    assert result.gpa_credits == 4
    assert result.gpa == round((3.3 * 3 + 3.7 * 1) / 4, 2)


def test_pass_fail_still_excluded_when_counted_flag_is_true():
    result = compute_gpa(
        [
            _course(
                course_id="synth-gpa-pass-fail-counted-flag",
                letter_grade="A",
                credits=3,
                counted_in_cumulative_gpa=True,
                pass_fail_subject=True,
            )
        ]
    )
    assert result.gpa is None
    assert result.gpa_credits == 0
    assert result.excluded_pass_fail == 1


def test_letter_from_percent_and_standing():
    assert letter_from_percent(92) == "A+"
    assert standing_from_gpa(3.7) == "Excellent"
    assert standing_from_gpa(2.1) == "Good standing"
    assert standing_from_gpa(1.6) == "Watch list"
    assert standing_from_gpa(1.0) == "At risk"
