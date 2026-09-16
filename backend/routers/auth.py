from fastapi import APIRouter, Depends, HTTPException
from schemas.auth import LoginRequest, TokenResponse, UserContext, AssignedCourse
from db.pool import get_db_conn
from core.security import verify_password, create_access_token
from core.dependencies import get_live_user
import asyncpg

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: asyncpg.Connection = Depends(get_db_conn)):
    row = await db.fetchrow("SELECT * FROM get_user_for_login($1)", req.id)
    if not row:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not row["password_hash"] or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_ctx = {
        "user_id": row["id"],
        "role": row["role"],
        "scope_id": row["scope_id"],
        "person_id": row["person_id"],
        "student_id": row["student_id"],
    }
    access_token = create_access_token(data=user_ctx)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserContext)
async def get_me(
    current_user: UserContext = Depends(get_live_user),
    db: asyncpg.Connection = Depends(get_db_conn),
):
    name = current_user.name or current_user.user_id
    parts = [p for p in name.split() if p]
    initials = (
        f"{parts[0][0]}{parts[-1][0]}".upper()
        if len(parts) >= 2
        else name[:2].upper()
    )
    courses = []
    if current_user.role == "professor" and current_user.person_id:
        rows = await db.fetch(
            """
            SELECT
                c.id, c.code, c.name,
                (
                    SELECT COUNT(*)::int
                    FROM enrollments e
                    JOIN course_offerings o ON o.id = e.offering_id
                    WHERE o.course_id = c.id
                ) AS enrolled,
                ARRAY(
                    SELECT DISTINCT cs.code
                    FROM course_sections cs
                    JOIN course_offerings o ON o.id = cs.offering_id
                    WHERE o.course_id = c.id
                    ORDER BY cs.code
                ) AS sections
            FROM courses c
            JOIN staff_course_assignments sca
              ON sca.course_id = c.id AND sca.staff_person_id = $1
            ORDER BY c.code
            """,
            current_user.person_id,
        )
        courses = [
            AssignedCourse(
                id=r["id"],
                code=r["code"],
                name=r["name"],
                enrolled=r["enrolled"],
                sections=list(r["sections"] or []),
            )
            for r in rows
        ]
    current_user.initials = initials
    current_user.courses = courses
    current_user.course_ids = [c.id for c in courses] or current_user.course_ids
    return current_user
