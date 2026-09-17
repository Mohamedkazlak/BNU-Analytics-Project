from repositories.student import use_curriculum_topics


def test_generic_single_topic_falls_back_to_curricula():
    assert use_curriculum_topics([{"topic": "Course assessment", "score": 70}])


def test_distinct_question_topics_are_kept():
    assert not use_curriculum_topics(
        [
            {"topic": "Recursion", "score": 88},
            {"topic": "SQL joins", "score": 54},
        ]
    )


def test_empty_question_topics_fall_back_to_curricula():
    assert use_curriculum_topics([])
