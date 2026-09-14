import os
import re

def generate_repo_and_router():
    with open("main.py", "r") as f:
        content = f.read()

    # Define endpoints and their required roles
    endpoints = {
        "student-performance": {
            "repo_name": "performance",
            "func_name": "get_student_performance",
            "schema_model": "StudentPerformanceReport",
            "roles": '"senior_management", "program_director", "academic_affairs", "professor"',
        },
        "course-performance": {
            "repo_name": "course_performance",
            "func_name": "get_course_performance",
            "schema_model": "CoursePerformanceReport",
            "roles": '"senior_management", "program_director", "academic_affairs", "professor"',
        },
        "participation-report": {
            "repo_name": "participation",
            "func_name": "get_participation_report",
            "schema_model": "ParticipationReport",
            "roles": '"senior_management", "program_director", "academic_affairs"',
        },
        "item-analysis": {
            "repo_name": "item_analysis",
            "func_name": "get_item_analysis",
            "schema_model": "ItemAnalysisReport",
            "roles": '"program_director", "professor"',
        },
        "integrity-report": {
            "repo_name": "integrity",
            "func_name": "get_integrity_report",
            "schema_model": "IntegrityReport",
            "roles": '"it_academic_integrity", "senior_management"',
        },
        "real-time-struggling": {
            "repo_name": "realtime",
            "func_name": "get_real_time_struggling",
            "schema_model": "RealTimeReport",
            "roles": '"professor", "it_academic_integrity"',
        },
        "student-directory": {
            "repo_name": "directory",
            "func_name": "get_student_directory",
            "schema_model": "List[StudentDirectoryRow]",
            "schema_import": "from schemas.directory import StudentDirectoryRow\nfrom typing import List",
            "roles": '"senior_management", "program_director", "academic_affairs", "professor"',
        },
    }

    # Extract function bodies using simple regex
    for route, config in endpoints.items():
        pattern = re.compile(f"@app.get\\(\"/api/{route}\".*?\\)\\s*async def {config['func_name']}\\(.*?\\):(.*?)(?=\\n# -|@app|$)", re.DOTALL)
        match = pattern.search(content)
        if match:
            body = match.group(1).strip()
            # Replace `db.fetch` with `db.fetch` (it already is)
            
            # Repo file
            repo_path = f"repositories/{config['repo_name']}.py"
            with open(repo_path, "w") as rf:
                rf.write(f"import asyncpg\n")
                rf.write(f"from schemas.auth import UserContext\n")
                rf.write(f"from core.utils import avg, round1, PASS_MARK\n\n")
                rf.write(f"async def {config['func_name']}(ctx: UserContext, db: asyncpg.Connection):\n")
                # indent body properly
                indented_body = "\n".join("    " + line for line in body.split("\n"))
                rf.write(indented_body)
                rf.write("\n")

            # Router file
            router_path = f"routers/{config['repo_name']}.py"
            schema_import = config.get("schema_import", f"from schemas.{config['repo_name']} import {config['schema_model']}")
            with open(router_path, "w") as rtf:
                rtf.write(f"from fastapi import APIRouter, Depends\n")
                rtf.write(f"{schema_import}\n")
                rtf.write(f"from schemas.auth import UserContext\n")
                rtf.write(f"from core.dependencies import require_role\n")
                rtf.write(f"from db.pool import get_db_conn\n")
                rtf.write(f"import asyncpg\n")
                rtf.write(f"from repositories.{config['repo_name']} import {config['func_name']}\n\n")
                
                rtf.write(f"router = APIRouter(prefix=\"/api/{route}\", tags=[\"{config['repo_name']}\"])\n\n")
                rtf.write(f"@router.get(\"\", response_model={config['schema_model']})\n")
                rtf.write(f"async def route_{config['func_name']}(\n")
                rtf.write(f"    ctx: UserContext = Depends(require_role({config['roles']})),\n")
                rtf.write(f"    db: asyncpg.Connection = Depends(get_db_conn)\n")
                rtf.write(f"):\n")
                rtf.write(f"    return await {config['func_name']}(ctx, db)\n")

if __name__ == "__main__":
    generate_repo_and_router()
